import { z } from "zod";
const clean = (length: number) =>
  z
    .string()
    .max(length)
    .transform((value) => value.trim().replace(/\s+/g, " "));
export const campIdSchema = z.uuid();
export const revisionSchema = z.number().int().min(0).max(2147483646);
export const schoolInputSchema = z
  .object({
    name: clean(180),
    contact: clean(120),
    phone: clean(24).transform((value) =>
      value.replace(/[\s()-]/g, "").replace(/^0/, "+62"),
    ),
    city: clean(100),
    district: clean(100),
    npsn: z
      .string()
      .trim()
      .regex(/^(\d{8})?$/, "NPSN harus 8 angka atau kosong."),
    girlNumber: clean(40),
    boyNumber: clean(40),
    address: clean(500),
    notes: clean(1000),
  })
  .strict();
export const participantInputSchema = z
  .object({
    id: campIdSchema,
    name: clean(150),
    base: clean(180),
    className: clean(20),
    photoId: campIdSchema.nullable(),
    zoom: z.number().min(1).max(2.5),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  })
  .strict();
export const patrolInputSchema = z
  .object({
    id: campIdSchema,
    category: z.enum(["Putri", "Putra"]),
    name: clean(80),
    companion: clean(120),
    phone: clean(24).transform((v) =>
      v.replace(/[\s()-]/g, "").replace(/^0/, "+62"),
    ),
    leaderId: campIdSchema.nullable(),
    participants: z
      .array(participantInputSchema)
      .max(15, "Maksimal 15 peserta per regu."),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.leaderId &&
      !value.participants.some((p) => p.id === value.leaderId)
    )
      ctx.addIssue({
        code: "custom",
        path: ["leaderId"],
        message: "Pemimpin harus dipilih dari anggota regu.",
      });
  });
export const saveRegistrationSchema = z
  .object({
    revision: revisionSchema,
    school: schoolInputSchema,
    patrols: z.array(patrolInputSchema).max(100),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = [
      ...value.patrols.map((p) => p.id),
      ...value.patrols.flatMap((p) => p.participants.map((m) => m.id)),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        path: ["patrols"],
        message: "Identitas regu dan peserta tidak boleh berulang.",
      });
  });
export type SaveRegistrationInput = z.infer<typeof saveRegistrationSchema>;
export const submitRegistrationSchema = z
  .object({ revision: revisionSchema, acknowledged: z.literal(true) })
  .strict();
export const decisionSchema = z
  .object({
    revision: revisionSchema,
    status: z.enum(["Terverifikasi", "Perlu perbaikan", "Ditolak"]),
    note: clean(1000),
  })
  .strict()
  .refine((v) => v.status === "Terverifikasi" || v.note.length > 0, {
    path: ["note"],
    message: "Catatan keputusan wajib diisi.",
  });
export const photoInitSchema = z
  .object({ participantId: campIdSchema, revision: revisionSchema })
  .strict();
export const retryJobSchema = z
  .object({ kind: z.enum(["document", "cards", "email"]) })
  .strict();
export const listRegistrationsSchema = z
  .object({
    q: z.string().trim().max(180).default(""),
    status: z
      .enum(["Dikirim", "Perlu perbaikan", "Terverifikasi", "Ditolak"])
      .optional(),
    city: z.string().trim().max(100).default(""),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
export type ListRegistrationsInput = z.infer<typeof listRegistrationsSchema>;
function validCalendar(value: string) {
  if (!value) return true;
  const parsed = new Date(
    `${value.length === 10 ? `${value}T00:00` : value}:00Z`,
  );
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, value.length) === value
  );
}
const date = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/)
  .refine(validCalendar, "Tanggal tidak valid.");
const localTime = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/)
  .refine(validCalendar, "Tanggal atau waktu tidak valid.");
export const eventSettingsSchema = z
  .object({
    name: clean(160).pipe(z.string().min(1)),
    description: clean(1000),
    location: clean(250),
    eventStart: date,
    eventEnd: date,
    opens: localTime,
    closes: localTime,
    timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]),
    contactName: clean(100),
    contactPhone: clean(24).transform((v) =>
      v.replace(/[\s()-]/g, "").replace(/^0/, "+62"),
    ),
    pickup: clean(1000),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      !!v.eventStart !== !!v.eventEnd ||
      (v.eventStart &&
        (Number.isNaN(Date.parse(v.eventStart)) || v.eventEnd < v.eventStart))
    )
      ctx.addIssue({
        code: "custom",
        path: ["eventEnd"],
        message: "Tanggal kegiatan belum valid.",
      });
    if (
      !!v.opens !== !!v.closes ||
      (v.opens &&
        (Number.isNaN(Date.parse(v.opens)) ||
          Number.isNaN(Date.parse(v.closes)) ||
          v.closes <= v.opens))
    )
      ctx.addIssue({
        code: "custom",
        path: ["closes"],
        message: "Periode pendaftaran belum valid.",
      });
    if (
      v.contactPhone &&
      (!v.contactName || !/^\+62\d{8,13}$/.test(v.contactPhone))
    )
      ctx.addIssue({
        code: "custom",
        path: ["contactPhone"],
        message: "Isi nama kontak dan WhatsApp panitia yang valid.",
      });
  });
export const saveEventSchema = z
  .object({ revision: revisionSchema, settings: eventSettingsSchema })
  .strict();
