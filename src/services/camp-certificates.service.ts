import "server-only";
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { registrations, registrationApprovals } from "@/db/schema";
import type { CertificateRecipient } from "@/lib/camp/certificates";
import { ServiceError } from "@/lib/service-error";
import type { GenerateCertificatesInput } from "@/validators/certificates";
import { patrolCompanions } from "@/lib/camp/types";

// Read the active, approved snapshot. Generating a certificate never edits a registration.
async function listCertificateRecipientsAny(
  kind: "participants" | "companions",
) {
  const recipients: CertificateRecipient[] = [];
  let cursor: string | undefined;
  for (;;) {
    const rows = await db
      .select({
        id: registrations.id,
        snapshot: registrationApprovals.snapshot,
      })
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
          eq(registrations.eventId, "main"),
          eq(registrations.status, "Terverifikasi"),
          cursor ? gt(registrations.id, cursor) : undefined,
        ),
      )
      .orderBy(asc(registrations.id))
      .limit(100);
    for (const { id, snapshot } of rows) {
      for (const patrol of snapshot.patrols) {
        for (const participant of kind === "companions"
          ? patrolCompanions(patrol)
          : patrol.participants) {
          if (!participant.name.trim()) continue;
          recipients.push({
            key: participant.id,
            name: participant.name,
            position: kind === "companions" ? "Pembina Pendamping" : "Peserta",
            registrationId: id,
            school: snapshot.school.name,
            patrolId: patrol.id,
            patrol: patrol.name,
            category: patrol.category,
          });
        }
      }
    }
    if (rows.length < 100) break;
    cursor = rows.at(-1)!.id;
  }
  return recipients;
}
export const listCertificateParticipantsAny = () =>
  listCertificateRecipientsAny("participants");
export const listCertificateCompanionsAny = () =>
  listCertificateRecipientsAny("companions");

export async function resolveCertificateRecipientsAny(
  input: GenerateCertificatesInput,
) {
  if (input.kind === "committee") return input.recipients;
  const available = new Map(
    (await listCertificateRecipientsAny(input.kind)).map((person) => [
      person.key,
      person,
    ]),
  );
  return input.ids.map((id) => {
    const person = available.get(id);
    if (!person)
      throw new ServiceError(
        409,
        "CERTIFICATE_PARTICIPANT_UNAVAILABLE",
        "Ada penerima yang tidak lagi terverifikasi. Muat ulang daftar dan pilih kembali.",
      );
    return person;
  });
}
