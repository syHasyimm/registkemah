import { z } from "zod";
import { MAX_CERTIFICATES_PER_PDF } from "@/lib/camp/certificates";

const text = (maximum: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(maximum, `${label} maksimal ${maximum} karakter.`)
    .transform((value) => value.replace(/\s+/gu, " "));

export const committeeCertificateSchema = z
  .object({ name: text(150, "Nama"), position: text(120, "Jabatan") })
  .strict();

export const generateCertificatesSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("participants"),
      ids: z
        .array(z.uuid())
        .min(1)
        .max(MAX_CERTIFICATES_PER_PDF)
        .refine((ids) => new Set(ids).size === ids.length, {
          message: "Peserta yang dipilih tidak boleh berulang.",
        }),
    })
    .strict(),
  z
    .object({
      kind: z.literal("committee"),
      recipients: z
        .array(committeeCertificateSchema)
        .min(1)
        .max(MAX_CERTIFICATES_PER_PDF),
    })
    .strict(),
]);

export type GenerateCertificatesInput = z.infer<
  typeof generateCertificatesSchema
>;
