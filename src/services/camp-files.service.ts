import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  campJobs,
  participantIdCards,
  registrationApprovals,
  registrationDocuments,
  registrations,
} from "@/db/schema";
import { readPrivateFile } from "@/lib/private-storage";
import { ServiceError } from "@/lib/service-error";
import {
  approvalPhotoSources,
  REGISTRATION_PDF_LAYOUT,
  renderRegistrationPdf,
} from "./camp-render.service";
const unavailable = () =>
  new ServiceError(
    404,
    "NOT_FOUND",
    "Dokumen tidak tersedia untuk versi persetujuan yang aktif.",
  );
async function activeApproval(id: string, userId?: string) {
  const [row] = await db
    .select({ approval: registrationApprovals, number: registrations.number })
    .from(registrations)
    .innerJoin(
      registrationApprovals,
      and(
        eq(registrationApprovals.registrationId, registrations.id),
        eq(registrationApprovals.version, registrations.approvalVersion),
        eq(registrationApprovals.active, true),
      ),
    )
    .where(
      and(
        eq(registrations.id, id),
        eq(registrations.status, "Terverifikasi"),
        userId ? eq(registrations.ownerId, userId) : undefined,
      ),
    );
  if (!row) throw unavailable();
  return row;
}
async function document(id: string, userId?: string) {
  const active = await activeApproval(id, userId);
  const [doc] = await db
    .select()
    .from(registrationDocuments)
    .where(eq(registrationDocuments.approvalId, active.approval.id));
  if (!doc || doc.status !== "Siap" || !doc.fileKey)
    throw new ServiceError(
      409,
      "DOCUMENT_NOT_READY",
      "Formulir masih disiapkan atau perlu dicoba ulang oleh panitia.",
    );
  let bytes: Buffer;
  try {
    bytes = await readPrivateFile(doc.fileKey);
    // Existing approvals retain their original snapshot, but must download the
    // current form layout without requiring another approval or sending email.
    if (!bytes.includes(Buffer.from(REGISTRATION_PDF_LAYOUT))) {
      bytes = await renderRegistrationPdf(
        active.approval.snapshot,
        active.approval.eventSnapshot,
        await approvalPhotoSources(active.approval.snapshot),
      );
    }
  } catch {
    throw new ServiceError(
      503,
      "FILE_UNAVAILABLE",
      "Berkas sementara tidak dapat dibaca. Hubungi panitia.",
    );
  }
  // Recheck after file I/O so a revision that completed during the read cannot expose an old version.
  const latest = await activeApproval(id, userId);
  if (latest.approval.id !== active.approval.id) throw unavailable();
  return {
    bytes,
    filename: `formulir-${active.number}-v${active.approval.version}.pdf`,
  };
}
export function getRegistrationDocument(userId: string, id: string) {
  return document(id, userId);
}
export function getRegistrationDocumentAny(id: string) {
  return document(id);
}
export async function listRegistrationCardsAny(id: string) {
  const { approval } = await activeApproval(id);
  const [job] = await db
    .select()
    .from(campJobs)
    .where(
      and(eq(campJobs.approvalId, approval.id), eq(campJobs.kind, "cards")),
    );
  const cards =
    job?.status === "Done"
      ? await db
          .select({
            id: participantIdCards.id,
            participantId: participantIdCards.participantId,
          })
          .from(participantIdCards)
          .where(eq(participantIdCards.approvalId, approval.id))
      : [];
  const members = approval.snapshot.patrols.flatMap((p) =>
    p.participants.map((m) => ({
      ...m,
      patrolId: p.id,
      patrolName: p.name,
      category: p.category,
    })),
  );
  return {
    version: approval.version,
    status:
      job?.status === "Done"
        ? "Siap"
        : job?.status === "Failed"
          ? "Gagal"
          : "Menyiapkan",
    data: cards.map((c) => {
      const m = members.find((m) => m.id === c.participantId)!;
      return {
        id: c.id,
        participantId: c.participantId,
        patrolId: m.patrolId,
        patrolName: m.patrolName,
        category: m.category,
        name: m.name.toLocaleUpperCase("id"),
        base: m.base.toLocaleUpperCase("id"),
        imageUrl: `/api/admin/registrations/${id}/cards/${c.id}`,
      };
    }),
  };
}
export async function getRegistrationCardAny(id: string, cardId: string) {
  const { approval } = await activeApproval(id);
  const [card] = await db
    .select()
    .from(participantIdCards)
    .where(
      and(
        eq(participantIdCards.id, cardId),
        eq(participantIdCards.approvalId, approval.id),
      ),
    );
  if (!card) throw unavailable();
  let bytes: Buffer;
  try {
    bytes = await readPrivateFile(card.fileKey);
  } catch {
    throw new ServiceError(
      503,
      "FILE_UNAVAILABLE",
      "Kartu sementara tidak dapat dibaca. Coba ulang proses kartu.",
    );
  }
  const latest = await activeApproval(id);
  if (latest.approval.id !== approval.id) throw unavailable();
  return bytes;
}
