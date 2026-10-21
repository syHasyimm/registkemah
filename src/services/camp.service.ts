import "server-only";
import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  campJobs,
  events,
  participantPhotos,
  participants,
  patrols,
  registrationApprovals,
  registrationDocuments,
  registrations,
  registrationStatusHistory,
  schools,
  user,
} from "@/db/schema";
import { defaultEvent } from "@/lib/camp/defaults";
import {
  editable,
  registrationErrors,
  registrationOpen,
  type CampState,
  type Registration,
} from "@/lib/camp/types";
import { ServiceError } from "@/lib/service-error";
import type {
  decisionSchema,
  ListRegistrationsInput,
  SaveRegistrationInput,
  saveEventSchema,
} from "@/validators/camp";
import type { z } from "zod";

export type CampExecutor = Pick<
  typeof db,
  "select" | "insert" | "update" | "delete" | "execute"
>;
export type RegistrationRow = typeof registrations.$inferSelect;
const missing = () =>
  new ServiceError(404, "NOT_FOUND", "Pendaftaran tidak ditemukan.");
const conflict = () =>
  new ServiceError(
    409,
    "STALE_REVISION",
    "Data berubah pada perangkat lain. Muat ulang halaman sebelum menyimpan kembali.",
  );

export async function getEvent() {
  const [row] = await db.select().from(events).where(eq(events.id, "main"));
  return {
    settings: row?.settings || defaultEvent,
    revision: row?.revision || 0,
  };
}
export async function saveEventAny(input: z.infer<typeof saveEventSchema>) {
  return db.transaction(async (tx) => {
    await tx
      .insert(events)
      .values({ id: "main", settings: defaultEvent })
      .onConflictDoNothing();
    const [row] = await tx
      .select()
      .from(events)
      .where(eq(events.id, "main"))
      .for("update");
    if (row.revision !== input.revision) throw conflict();
    const [updated] = await tx
      .update(events)
      .set({
        settings: input.settings,
        revision: row.revision + 1,
        updatedAt: new Date(),
      })
      .where(eq(events.id, "main"))
      .returning();
    return { settings: updated.settings, revision: updated.revision };
  });
}

export async function mapRegistrations(
  executor: CampExecutor,
  rows: RegistrationRow[],
  admin: boolean,
): Promise<Registration[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  // A transaction uses one PostgreSQL connection; finish each query before the next.
  const allPatrols = await executor
    .select()
    .from(patrols)
    .where(inArray(patrols.registrationId, ids))
    .orderBy(asc(patrols.position));
  const history = await executor
    .select()
    .from(registrationStatusHistory)
    .where(inArray(registrationStatusHistory.registrationId, ids))
    .orderBy(
      asc(registrationStatusHistory.at),
      asc(registrationStatusHistory.id),
    );
  const approvals = await executor
    .select()
    .from(registrationApprovals)
    .where(
      and(
        inArray(registrationApprovals.registrationId, ids),
        eq(registrationApprovals.active, true),
      ),
    );
  const members = allPatrols.length
    ? await executor
        .select()
        .from(participants)
        .where(
          inArray(
            participants.patrolId,
            allPatrols.map((p) => p.id),
          ),
        )
        .orderBy(asc(participants.position))
    : [];
  const jobs = approvals.length
    ? await executor
        .select()
        .from(campJobs)
        .where(
          inArray(
            campJobs.approvalId,
            approvals.map((a) => a.id),
          ),
        )
    : [];
  const documents = approvals.length
    ? await executor
        .select()
        .from(registrationDocuments)
        .where(
          inArray(
            registrationDocuments.approvalId,
            approvals.map((a) => a.id),
          ),
        )
    : [];
  return rows.map((row) => {
    const approval = approvals.find((a) => a.registrationId === row.id);
    const doc = documents.find((d) => d.approvalId === approval?.id);
    const cards = jobs.find(
      (j) => j.approvalId === approval?.id && j.kind === "cards",
    );
    const email = jobs.find(
      (j) => j.approvalId === approval?.id && j.kind === "email",
    );
    const result: Registration = {
      id: row.id,
      revision: row.revision,
      number: row.number || "",
      school: row.school,
      status: row.status,
      savedAt: row.updatedAt.toISOString(),
      submittedAt: row.submittedAt?.toISOString() || "",
      version: row.approvalVersion,
      patrols: allPatrols
        .filter((p) => p.registrationId === row.id)
        .map((p) => ({
          id: p.id,
          category: p.category,
          name: p.name,
          companion: p.companion,
          phone: p.phone,
          leaderId: p.leaderId || "",
          participants: members
            .filter((m) => m.patrolId === p.id)
            .map((m) => ({
              id: m.id,
              name: m.name,
              base: m.base,
              className: m.className,
              photoId: m.photoId,
              photo: m.photoId
                ? `${admin ? "/api/admin/registrations" : "/api/registrations"}/${row.id}/photos/${m.photoId}`
                : "",
              zoom: m.zoom,
              x: m.x,
              y: m.y,
            })),
        })),
      history: history
        .filter((h) => h.registrationId === row.id)
        .map((h) => ({
          status: h.status,
          at: h.at.toISOString(),
          actor: h.actor,
          note: h.note,
        })),
      documentStatus: doc?.status || "Menyiapkan",
      emailStatus:
        email?.status === "Done"
          ? "Diterima layanan email"
          : email?.status === "Failed"
            ? "Gagal"
            : email?.status === "Running"
              ? "Diproses"
              : "Menunggu",
      emailAttemptAt: email?.lastAttemptAt?.toISOString() || "",
    };
    if (admin) {
      result.documentError = doc?.safeError || "";
      result.cardError = cards?.safeError || "";
      result.emailError = email?.safeError || "";
      result.cardStatus =
        cards?.status === "Done"
          ? "Siap"
          : cards?.status === "Failed"
            ? "Gagal"
            : "Menyiapkan";
    }
    return result;
  });
}

export async function getRegistration(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(registrations)
    .where(and(eq(registrations.id, id), eq(registrations.ownerId, userId)));
  if (!row) throw missing();
  return (await mapRegistrations(db, [row], false))[0];
}
export async function getRegistrationAny(id: string) {
  const [row] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, id));
  if (!row) throw missing();
  return (await mapRegistrations(db, [row], true))[0];
}
export async function getWorkspace(userId: string): Promise<CampState> {
  const [event, rows] = await Promise.all([
    getEvent(),
    db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.ownerId, userId),
          eq(registrations.eventId, "main"),
        ),
      ),
  ]);
  return {
    schemaVersion: 1,
    event: event.settings,
    eventRevision: event.revision,
    operatorId: rows[0]?.id || "",
    registrations: await mapRegistrations(db, rows, false),
  };
}
export async function getWorkspaceAny(userId: string): Promise<CampState> {
  const [event, rows] = await Promise.all([
    getEvent(),
    db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, "main"),
          ne(registrations.status, "Draf"),
        ),
      )
      .orderBy(desc(registrations.submittedAt), desc(registrations.id))
      .limit(20),
  ]);
  return {
    schemaVersion: 1,
    event: event.settings,
    eventRevision: event.revision,
    operatorId: rows.find((r) => r.ownerId === userId)?.id || "",
    registrations: await mapRegistrations(db, rows, true),
    overview: await getOverviewAny(),
  };
}
export async function createRegistration(userId: string) {
  const id = await db.transaction(async (tx) => {
    const [owner] = await tx.select().from(user).where(eq(user.id, userId));
    if (!owner) throw missing();
    await tx
      .insert(events)
      .values({ id: "main", settings: defaultEvent })
      .onConflictDoNothing();
    const [existing] = await tx
      .select({ id: registrations.id })
      .from(registrations)
      .where(
        and(
          eq(registrations.ownerId, userId),
          eq(registrations.eventId, "main"),
        ),
      );
    if (existing) return existing.id;
    await tx
      .insert(schools)
      .values({ ownerId: userId })
      .onConflictDoNothing({ target: schools.ownerId });
    const [school] = await tx
      .select()
      .from(schools)
      .where(eq(schools.ownerId, userId));
    const schoolData = {
      name: "",
      contact: "",
      phone: "",
      email: owner.email,
      city: "",
      district: "",
      npsn: "",
      girlNumber: "",
      boyNumber: "",
      address: "",
      notes: "",
    };
    await tx
      .insert(registrations)
      .values({
        ownerId: userId,
        schoolId: school.id,
        eventId: "main",
        school: schoolData,
      })
      .onConflictDoNothing({
        target: [registrations.ownerId, registrations.eventId],
      });
    const [record] = await tx
      .select({ id: registrations.id })
      .from(registrations)
      .where(
        and(
          eq(registrations.ownerId, userId),
          eq(registrations.eventId, "main"),
        ),
      );
    return record.id;
  });
  return getRegistration(userId, id);
}

export async function lockRegistration(
  executor: CampExecutor,
  id: string,
  userId?: string,
) {
  const [row] = await executor
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.id, id),
        userId ? eq(registrations.ownerId, userId) : undefined,
      ),
    )
    .for("update");
  if (!row) throw missing();
  return row;
}
export function assertEditable(row: RegistrationRow, revision: number) {
  if (!editable(row.status))
    throw new ServiceError(
      409,
      "REGISTRATION_LOCKED",
      "Data pendaftaran terkunci. Tunggu permintaan perbaikan dari panitia.",
    );
  if (row.revision !== revision) throw conflict();
}
async function assertNoPendingUploads(tx: CampExecutor, id: string) {
  const [pending] = await tx
    .select({ id: participantPhotos.id })
    .from(participantPhotos)
    .where(
      and(
        eq(participantPhotos.registrationId, id),
        eq(participantPhotos.status, "Pending"),
        sql`${participantPhotos.expiresAt} > now()`,
      ),
    )
    .limit(1);
  if (pending)
    throw new ServiceError(
      409,
      "UPLOAD_PENDING",
      "Tunggu unggahan foto selesai atau batalkan unggahan sebelum mengirim.",
    );
}
export async function saveRegistration(
  userId: string,
  id: string,
  input: SaveRegistrationInput,
) {
  try {
    await db.transaction(async (tx) => {
      const row = await lockRegistration(tx, id, userId);
      assertEditable(row, input.revision);
      const [owner] = await tx
        .select({ email: user.email })
        .from(user)
        .where(eq(user.id, userId));
      const photoIds = input.patrols
        .flatMap((p) => p.participants)
        .map((p) => p.photoId)
        .filter((id): id is string => !!id);
      const photos = photoIds.length
        ? await tx
            .select()
            .from(participantPhotos)
            .where(
              and(
                inArray(participantPhotos.id, photoIds),
                eq(participantPhotos.registrationId, id),
                eq(participantPhotos.status, "Ready"),
              ),
            )
        : [];
      for (const m of input.patrols.flatMap((p) => p.participants))
        if (
          m.photoId &&
          !photos.some(
            (photo) => photo.id === m.photoId && photo.participantId === m.id,
          )
        )
          throw new ServiceError(
            422,
            "INVALID_PHOTO",
            "Foto peserta tidak tersedia atau bukan milik peserta tersebut.",
          );
      const patrolIds = input.patrols.map((p) => p.id);
      const memberIds = input.patrols.flatMap((p) =>
        p.participants.map((m) => m.id),
      );
      if (patrolIds.length) {
        const conflicting = await tx
          .select({ id: patrols.id })
          .from(patrols)
          .where(
            and(inArray(patrols.id, patrolIds), ne(patrols.registrationId, id)),
          )
          .limit(1);
        if (conflicting.length)
          throw new ServiceError(
            422,
            "INVALID_ID",
            "Identitas regu tidak valid.",
          );
      }
      if (memberIds.length) {
        const conflicting = await tx
          .select({ id: participants.id })
          .from(participants)
          .innerJoin(patrols, eq(patrols.id, participants.patrolId))
          .where(
            and(
              inArray(participants.id, memberIds),
              ne(patrols.registrationId, id),
            ),
          )
          .limit(1);
        if (conflicting.length)
          throw new ServiceError(
            422,
            "INVALID_ID",
            "Identitas peserta tidak valid.",
          );
      }
      await tx
        .update(schools)
        .set({
          name: input.school.name,
          npsn: input.school.npsn || null,
          updatedAt: new Date(),
        })
        .where(and(eq(schools.id, row.schoolId), eq(schools.ownerId, userId)));
      await tx.delete(patrols).where(eq(patrols.registrationId, id));
      if (input.patrols.length)
        await tx.insert(patrols).values(
          input.patrols.map((p, position) => ({
            id: p.id,
            registrationId: id,
            category: p.category,
            name: p.name,
            companion: p.companion,
            phone: p.phone,
            leaderId: p.leaderId,
            position,
          })),
        );
      const memberValues = input.patrols.flatMap((p) =>
        p.participants.map((m, position) => ({
          ...m,
          patrolId: p.id,
          position,
        })),
      );
      if (memberValues.length)
        await tx.insert(participants).values(memberValues);
      await tx
        .update(registrations)
        .set({
          school: { ...input.school, email: owner.email },
          revision: row.revision + 1,
          updatedAt: new Date(),
        })
        .where(
          and(eq(registrations.id, id), eq(registrations.ownerId, userId)),
        );
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new ServiceError(
        409,
        "SCHOOL_CONFLICT",
        "NPSN atau identitas data sudah digunakan. Periksa isian atau hubungi panitia tanpa membuat pendaftaran baru.",
      );
    throw error;
  }
  return getRegistration(userId, id);
}
function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (
    ("code" in error && error.code === "23505") ||
    ("cause" in error && isUniqueViolation(error.cause))
  );
}

export async function submitRegistration(
  userId: string,
  id: string,
  revision: number,
) {
  await db.transaction(async (tx) => {
    const row = await lockRegistration(tx, id, userId);
    if (row.status === "Dikirim") return;
    assertEditable(row, revision);
    const [event] = await tx
      .select()
      .from(events)
      .where(eq(events.id, row.eventId))
      .for("share");
    if (!event || !registrationOpen(event.settings))
      throw new ServiceError(
        409,
        "REGISTRATION_CLOSED",
        "Periode pendaftaran belum dibuka atau sudah ditutup. Draf tetap dapat disimpan.",
      );
    const [owner] = await tx.select().from(user).where(eq(user.id, userId));
    if (!owner.emailVerified)
      throw new ServiceError(
        403,
        "EMAIL_NOT_VERIFIED",
        "Verifikasi email akun sebelum mengirim pendaftaran.",
      );
    await assertNoPendingUploads(tx, id);
    const snapshot = (await mapRegistrations(tx, [row], false))[0];
    const errors = registrationErrors(snapshot);
    if (errors.length)
      throw new ServiceError(422, "INCOMPLETE_REGISTRATION", errors.join(" "));
    const now = new Date();
    await tx
      .update(registrations)
      .set({
        status: "Dikirim",
        number:
          row.number ||
          `KEM-${now.getUTCFullYear()}-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
        school: { ...row.school, email: owner.email },
        acknowledgedAt: now,
        submittedAt: now,
        updatedAt: now,
        revision: row.revision + 1,
      })
      .where(and(eq(registrations.id, id), eq(registrations.ownerId, userId)));
    await tx.insert(registrationStatusHistory).values({
      registrationId: id,
      actorId: userId,
      actor: "Operator",
      fromStatus: row.status,
      status: "Dikirim",
      note: "Data pendaftaran dan pernyataan kebenaran data dikirim oleh operator sekolah.",
    });
  });
  return getRegistration(userId, id);
}

export async function decideRegistrationAny(
  actorId: string,
  id: string,
  input: z.infer<typeof decisionSchema>,
) {
  await db.transaction(async (tx) => {
    const row = await lockRegistration(tx, id);
    if (row.status === input.status) return;
    if (row.revision !== input.revision) throw conflict();
    const allowed =
      row.status === "Dikirim" ||
      ((row.status === "Terverifikasi" || row.status === "Ditolak") &&
        input.status === "Perlu perbaikan");
    if (!allowed)
      throw new ServiceError(
        409,
        "INVALID_TRANSITION",
        "Perubahan status tersebut tidak diizinkan.",
      );
    const now = new Date();
    if (input.status === "Terverifikasi") {
      const [owner] = await tx
        .select()
        .from(user)
        .where(eq(user.id, row.ownerId));
      if (!owner?.emailVerified)
        throw new ServiceError(
          422,
          "EMAIL_NOT_VERIFIED",
          "Email operator harus terverifikasi sebelum persetujuan.",
        );
      const snapshot = (await mapRegistrations(tx, [row], true))[0];
      const errors = registrationErrors(snapshot);
      if (errors.length)
        throw new ServiceError(
          422,
          "INCOMPLETE_REGISTRATION",
          errors.join(" "),
        );
      await assertNoPendingUploads(tx, id);
      const [event] = await tx
        .select()
        .from(events)
        .where(eq(events.id, row.eventId));
      const version = row.approvalVersion + 1;
      const [approval] = await tx
        .insert(registrationApprovals)
        .values({
          registrationId: id,
          version,
          snapshot: {
            ...snapshot,
            version,
            status: "Terverifikasi",
            school: { ...snapshot.school, email: owner.email },
          },
          eventSnapshot: event.settings,
        })
        .returning();
      await tx
        .insert(registrationDocuments)
        .values({ approvalId: approval.id });
      await tx.insert(campJobs).values(
        (["document", "cards", "email"] as const).map((kind) => ({
          approvalId: approval.id,
          kind,
          key: `${id}:${version}:${kind}`,
        })),
      );
      await tx
        .update(registrations)
        .set({
          status: input.status,
          school: { ...row.school, email: owner.email },
          approvalVersion: version,
          revision: row.revision + 1,
          updatedAt: now,
        })
        .where(eq(registrations.id, id));
    } else {
      const old = await tx
        .select({ id: registrationApprovals.id })
        .from(registrationApprovals)
        .where(
          and(
            eq(registrationApprovals.registrationId, id),
            eq(registrationApprovals.active, true),
          ),
        );
      await tx
        .update(registrationApprovals)
        .set({ active: false })
        .where(eq(registrationApprovals.registrationId, id));
      if (old.length)
        await tx
          .update(campJobs)
          .set({
            status: "Cancelled",
            leaseToken: null,
            leasedUntil: null,
            payload: null,
          })
          .where(
            and(
              inArray(
                campJobs.approvalId,
                old.map((a) => a.id),
              ),
              ne(campJobs.status, "Done"),
            ),
          );
      await tx
        .update(registrations)
        .set({
          status: input.status,
          revision: row.revision + 1,
          updatedAt: now,
        })
        .where(eq(registrations.id, id));
    }
    await tx.insert(registrationStatusHistory).values({
      registrationId: id,
      actorId,
      actor: "Panitia",
      fromStatus: row.status,
      status: input.status,
      note:
        input.note || "Data sekolah dan peserta telah diperiksa dan disetujui.",
    });
  });
  return getRegistrationAny(id);
}

function listWhere(
  input: Pick<ListRegistrationsInput, "q" | "status" | "city">,
) {
  const filters: (SQL | undefined)[] = [
    eq(registrations.eventId, "main"),
    ne(registrations.status, "Draf"),
  ];
  if (input.status) filters.push(eq(registrations.status, input.status));
  if (input.city)
    filters.push(sql`${registrations.school}->>'city' = ${input.city}`);
  if (input.q) {
    const literal = input.q.replace(/[\\%_]/g, "\\$&");
    filters.push(
      or(
        sql`${registrations.school}->>'name' ILIKE ${`%${literal}%`}`,
        ilike(registrations.number, `%${literal}%`),
      ),
    );
  }
  return and(...filters);
}
export async function listRegistrationsAny(input: ListRegistrationsInput) {
  const where = listWhere(input);
  const [rows, total, cities] = await Promise.all([
    db
      .select()
      .from(registrations)
      .where(where)
      .orderBy(desc(registrations.submittedAt), desc(registrations.id))
      .limit(input.limit)
      .offset(input.offset),
    db.select({ total: count() }).from(registrations).where(where),
    db
      .selectDistinct({ city: sql<string>`${registrations.school}->>'city'` })
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, "main"),
          ne(registrations.status, "Draf"),
        ),
      ),
  ]);
  return {
    data: await mapRegistrations(db, rows, true),
    meta: {
      total: total[0].total,
      limit: input.limit,
      offset: input.offset,
      cities: cities
        .map((c) => c.city)
        .filter(Boolean)
        .sort(),
    },
  };
}
export async function getOverviewAny() {
  const [statusCounts, reguCounts, participantCounts, event] =
    await Promise.all([
      db
        .select({ status: registrations.status, total: count() })
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, "main"),
            ne(registrations.status, "Draf"),
          ),
        )
        .groupBy(registrations.status),
      db
        .select({ status: registrations.status, total: count() })
        .from(patrols)
        .innerJoin(registrations, eq(registrations.id, patrols.registrationId))
        .where(
          and(
            eq(registrations.eventId, "main"),
            ne(registrations.status, "Draf"),
          ),
        )
        .groupBy(registrations.status),
      db
        .select({
          status: registrations.status,
          category: patrols.category,
          total: count(),
        })
        .from(participants)
        .innerJoin(patrols, eq(patrols.id, participants.patrolId))
        .innerJoin(registrations, eq(registrations.id, patrols.registrationId))
        .where(
          and(
            eq(registrations.eventId, "main"),
            ne(registrations.status, "Draf"),
            sql`length(trim(${participants.name})) > 0`,
          ),
        )
        .groupBy(registrations.status, patrols.category),
      getEvent(),
    ]);
  const dates = await db
    .select({
      day: sql<string>`to_char(${registrations.submittedAt} AT TIME ZONE ${event.settings.timezone}, 'YYYY-MM-DD')`.as(
        "day",
      ),
      total: count(),
    })
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, "main"),
        sql`${registrations.submittedAt} >= now() - interval '8 days'`,
      ),
    )
    .groupBy(sql`"day"`);
  const summary = (verified: boolean) => {
    const keep = (status: string) => !verified || status === "Terverifikasi";
    const girls = participantCounts
      .filter((p) => keep(p.status) && p.category === "Putri")
      .reduce((a, p) => a + p.total, 0);
    const boys = participantCounts
      .filter((p) => keep(p.status) && p.category === "Putra")
      .reduce((a, p) => a + p.total, 0);
    return {
      schools: statusCounts
        .filter((r) => keep(r.status))
        .reduce((a, p) => a + p.total, 0),
      patrols: reguCounts
        .filter((r) => keep(r.status))
        .reduce((a, p) => a + p.total, 0),
      girls,
      boys,
      participants: girls + boys,
    };
  };
  const pending = await db
    .select()
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, "main"),
        eq(registrations.status, "Dikirim"),
      ),
    )
    .orderBy(asc(registrations.submittedAt), asc(registrations.id))
    .limit(5);
  return {
    all: summary(false),
    verified: summary(true),
    statuses: statusCounts,
    dates,
    pending: await mapRegistrations(db, pending, true),
  };
}

export async function exportRegistrationsAny(
  input: Pick<ListRegistrationsInput, "q" | "status" | "city">,
) {
  // Keyset batches avoid silently truncating CSVs and avoid OFFSET scans during export.
  const output: Registration[] = [];
  let cursor = "";
  for (;;) {
    const rows = await db
      .select()
      .from(registrations)
      .where(
        and(
          listWhere(input),
          cursor ? sql`${registrations.id} > ${cursor}::uuid` : undefined,
        ),
      )
      .orderBy(asc(registrations.id))
      .limit(100);
    if (!rows.length) break;
    output.push(...(await mapRegistrations(db, rows, true)));
    cursor = rows.at(-1)!.id;
  }
  return output;
}
