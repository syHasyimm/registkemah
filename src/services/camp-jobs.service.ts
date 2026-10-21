import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq, lte, or } from "drizzle-orm";
import { db } from "@/db";
import {
  campJobs,
  campJobEvents,
  participantIdCards,
  registrationApprovals,
  registrationDocuments,
  user,
  type MailPayload,
} from "@/db/schema";
import { sendMail } from "@/lib/mail";
import { ServiceError } from "@/lib/service-error";
import { writePrivateFile } from "@/lib/private-storage";
import {
  approvalPhotoSources,
  renderParticipantCard,
  renderRegistrationPdf,
} from "./camp-render.service";
import { lockRegistration, type CampExecutor } from "./camp.service";

type Job = typeof campJobs.$inferSelect;
export async function enqueueAccountEmail(payload: MailPayload) {
  const key = createHash("sha256")
    .update(`${payload.to}:${payload.subject}:${payload.text}`)
    .digest("hex");
  await db
    .insert(campJobs)
    .values({ key: `account:${key}`, kind: "auth-email", payload })
    .onConflictDoNothing({ target: campJobs.key });
}
async function claim() {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(campJobs)
      .where(
        or(
          and(
            eq(campJobs.status, "Pending"),
            lte(campJobs.availableAt, new Date()),
          ),
          and(
            eq(campJobs.status, "Running"),
            lte(campJobs.leasedUntil, new Date()),
          ),
        ),
      )
      .orderBy(asc(campJobs.availableAt))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!job) return;
    const [updated] = await tx
      .update(campJobs)
      .set({
        status: "Running",
        attempts: job.attempts + 1,
        leaseToken: randomUUID(),
        leasedUntil: new Date(Date.now() + 5 * 60_000),
        lastAttemptAt: new Date(),
        safeError: null,
      })
      .where(eq(campJobs.id, job.id))
      .returning();
    await tx.insert(campJobEvents).values({
      jobId: job.id,
      event: "Started",
      note: `Percobaan ${updated.attempts} dimulai.`,
    });
    return updated;
  });
}
async function activeJob(tx: CampExecutor, job: Job) {
  const [approval] = await tx
    .select()
    .from(registrationApprovals)
    .where(eq(registrationApprovals.id, job.approvalId!));
  if (!approval) return;
  const reg = await lockRegistration(tx, approval.registrationId);
  const [current] = await tx
    .select()
    .from(campJobs)
    .where(eq(campJobs.id, job.id))
    .for("update");
  if (
    !approval.active ||
    reg.status !== "Terverifikasi" ||
    reg.approvalVersion !== approval.version ||
    current.status !== "Running" ||
    current.leaseToken !== job.leaseToken
  )
    return;
  return { approval, reg };
}
async function done(tx: CampExecutor, job: Job, messageId?: string) {
  await tx.insert(campJobEvents).values({
    jobId: job.id,
    event: "Completed",
    note: messageId
      ? "Pesan diterima layanan SMTP."
      : "Berkas berhasil diproses.",
  });
  await tx
    .update(campJobs)
    .set({
      status: "Done",
      leaseToken: null,
      leasedUntil: null,
      safeError: null,
      payload: null,
      messageId: messageId || null,
    })
    .where(
      and(eq(campJobs.id, job.id), eq(campJobs.leaseToken, job.leaseToken!)),
    );
}
async function process(job: Job) {
  if (job.kind === "auth-email") {
    if (
      !job.payload ||
      (job.payload.expiresAt && new Date(job.payload.expiresAt) <= new Date())
    ) {
      await db
        .update(campJobs)
        .set({
          status: "Cancelled",
          payload: null,
          leaseToken: null,
          leasedUntil: null,
        })
        .where(
          and(
            eq(campJobs.id, job.id),
            eq(campJobs.leaseToken, job.leaseToken!),
          ),
        );
      return;
    }
    const messageId = await sendMail(job.payload, job.id);
    await done(db, job, messageId);
    return;
  }
  const [approval] = await db
    .select()
    .from(registrationApprovals)
    .where(
      and(
        eq(registrationApprovals.id, job.approvalId!),
        eq(registrationApprovals.active, true),
      ),
    );
  if (!approval) {
    await db
      .update(campJobs)
      .set({ status: "Cancelled", leaseToken: null, leasedUntil: null })
      .where(
        and(eq(campJobs.id, job.id), eq(campJobs.leaseToken, job.leaseToken!)),
      );
    return;
  }
  if (job.kind === "email") {
    // Serialize dispatch against revision so an obsolete version cannot be sent after revision commits.
    // SMTP calls have bounded timeouts; image/PDF processing stays outside transactions.
    await db.transaction(async (tx) => {
      const active = await activeJob(tx, job);
      if (!active) return;
      const [owner] = await tx
        .select()
        .from(user)
        .where(eq(user.id, active.reg.ownerId));
      if (
        !owner?.emailVerified ||
        owner.email !== approval.snapshot.school.email
      )
        throw new ServiceError(
          422,
          "EMAIL_CHANGED",
          "Email operator perlu diverifikasi kembali sebelum pemberitahuan dikirim.",
        );
      const event = approval.eventSnapshot;
      const messageId = await sendMail(
        {
          to: owner.email,
          subject: `Pendaftaran ${approval.snapshot.number} Disetujui - Bawa Formulir untuk Mengambil ID Card`,
          text: `Yth. ${approval.snapshot.school.contact} dari ${approval.snapshot.school.name},\n\nPendaftaran Anda telah disetujui (versi ${approval.version}).\n\nSilakan unduh dan cetak formulir pendaftaran terbaru. Bawa dan serahkan formulir kepada panitia di lokasi perkemahan untuk mengambil ID card fisik peserta.\n\nBuka Formulir Pendaftaran: ${processEnvOrigin()}/app/pendaftaran/bukti\n\n${event.pickup}\n${event.location ? `Lokasi: ${event.location}\n` : ""}${event.contactName ? `Kontak: ${event.contactName} ${event.contactPhone}\n` : ""}\nPanitia ${event.name}`,
        },
        job.id,
      );
      await done(tx, job, messageId);
    });
    return;
  }
  const sources = await approvalPhotoSources(approval.snapshot);
  if (job.kind === "document") {
    const bytes = await renderRegistrationPdf(
      approval.snapshot,
      approval.eventSnapshot,
      sources,
    );
    const fileKey = await writePrivateFile(bytes, "pdf");
    await db.transaction(async (tx) => {
      if (!(await activeJob(tx, job))) return;
      await tx
        .update(registrationDocuments)
        .set({ status: "Siap", fileKey, safeError: null })
        .where(eq(registrationDocuments.approvalId, approval.id));
      await done(tx, job);
    });
  } else {
    const rendered: {
      participantId: string;
      approvalId: string;
      fileKey: string;
    }[] = [];
    for (const { member, category } of approval.snapshot.patrols.flatMap((p) =>
      p.participants.map((member) => ({ member, category: p.category })),
    ))
      rendered.push({
        participantId: member.id,
        approvalId: approval.id,
        fileKey: await writePrivateFile(
          await renderParticipantCard(member, sources, category),
          "png",
        ),
      });
    await db.transaction(async (tx) => {
      if (!(await activeJob(tx, job))) return;
      await tx
        .delete(participantIdCards)
        .where(eq(participantIdCards.approvalId, approval.id));
      if (rendered.length) await tx.insert(participantIdCards).values(rendered);
      await done(tx, job);
    });
  }
}
function processEnvOrigin() {
  return new URL(
    globalThis.process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ).origin;
}
async function fail(job: Job, error: unknown) {
  const safeError =
    error instanceof ServiceError
      ? error.message
      : job.kind === "email" || job.kind === "auth-email"
        ? "Layanan SMTP belum menerima pesan. Periksa pengaturan atau coba lagi."
        : "Berkas atau foto sumber belum dapat diproses. Periksa penyimpanan dan coba lagi.";
  const final = job.attempts >= 3;
  await db.transaction(async (tx) => {
    if (job.approvalId && !(await activeJob(tx, job))) return;
    const [updated] = await tx
      .update(campJobs)
      .set({
        status: final ? "Failed" : "Pending",
        availableAt: new Date(Date.now() + job.attempts * 10_000),
        leasedUntil: null,
        leaseToken: null,
        safeError,
        ...(final && job.kind === "auth-email" ? { payload: null } : {}),
      })
      .where(
        and(eq(campJobs.id, job.id), eq(campJobs.leaseToken, job.leaseToken!)),
      )
      .returning({ id: campJobs.id });
    if (updated)
      await tx.insert(campJobEvents).values({
        jobId: job.id,
        event: final ? "Failed" : "Retry scheduled",
        note: safeError,
      });
    if (updated && final && job.kind === "document")
      await tx
        .update(registrationDocuments)
        .set({ status: "Gagal", safeError })
        .where(eq(registrationDocuments.approvalId, job.approvalId!));
  });
}
let running = false;
export async function processJobsAny() {
  if (running) return;
  running = true;
  try {
    for (let i = 0; i < 6; i++) {
      const job = await claim();
      if (!job) break;
      try {
        await process(job);
      } catch (error) {
        await fail(job, error);
      }
    }
  } finally {
    running = false;
  }
}
export function startCampWorker() {
  const state = globalThis as typeof globalThis & {
    campWorkerTimer?: ReturnType<typeof setInterval>;
  };
  if (state.campWorkerTimer) return;
  const tick = () => {
    void processJobsAny().catch(() =>
      console.error("Camp worker could not reach its database; it will retry."),
    );
  };
  state.campWorkerTimer = setInterval(tick, 3000);
  state.campWorkerTimer.unref();
  tick();
}
export async function retryJobAny(
  actorId: string,
  registrationId: string,
  kind: "document" | "cards" | "email",
) {
  await db.transaction(async (tx) => {
    const reg = await lockRegistration(tx, registrationId);
    if (reg.status !== "Terverifikasi")
      throw new ServiceError(
        409,
        "INACTIVE_APPROVAL",
        "Pendaftaran belum terverifikasi atau sedang direvisi.",
      );
    const [approval] = await tx
      .select()
      .from(registrationApprovals)
      .where(
        and(
          eq(registrationApprovals.registrationId, registrationId),
          eq(registrationApprovals.active, true),
          eq(registrationApprovals.version, reg.approvalVersion),
        ),
      );
    if (!approval)
      throw new ServiceError(404, "NOT_FOUND", "Persetujuan tidak ditemukan.");
    const [job] = await tx
      .select()
      .from(campJobs)
      .where(and(eq(campJobs.approvalId, approval.id), eq(campJobs.kind, kind)))
      .for("update");
    if (
      !job ||
      job.status === "Running" ||
      (job.status === "Pending" && job.attempts === 0)
    )
      throw new ServiceError(
        409,
        "JOB_PENDING",
        "Proses masih menunggu atau sedang berjalan.",
      );
    if (job.lastAttemptAt && Date.now() - job.lastAttemptAt.getTime() < 60_000)
      throw new ServiceError(
        429,
        "RETRY_LIMIT",
        "Tunggu 60 detik sebelum mencoba ulang.",
      );
    if (kind !== "email" && job.status === "Done") return;
    await tx.insert(campJobEvents).values({
      jobId: job.id,
      actorId,
      event: "Manual retry",
      note: "Panitia meminta pengulangan proses untuk versi aktif.",
    });
    await tx
      .update(campJobs)
      .set({
        status: "Pending",
        attempts: 0,
        availableAt: new Date(),
        lastAttemptAt: new Date(),
        safeError: null,
        leaseToken: null,
        leasedUntil: null,
      })
      .where(eq(campJobs.id, job.id));
    if (kind === "document")
      await tx
        .update(registrationDocuments)
        .set({ status: "Menyiapkan", safeError: null })
        .where(eq(registrationDocuments.approvalId, approval.id));
  });
}
