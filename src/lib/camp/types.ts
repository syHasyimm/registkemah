export const statuses = [
  "Draf",
  "Dikirim",
  "Perlu perbaikan",
  "Terverifikasi",
  "Ditolak",
] as const;
export type RegistrationStatus = (typeof statuses)[number];
export type Category = "Putri" | "Putra";
export type Participant = {
  photoId?: string | null;
  id: string;
  name: string;
  base: string;
  className: string;
  photo: string;
  zoom: number;
  x: number;
  y: number;
};
export type Patrol = {
  id: string;
  category: Category;
  name: string;
  companion: string;
  phone: string;
  leaderId: string;
  participants: Participant[];
};
export type School = {
  name: string;
  contact: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  npsn: string;
  girlNumber: string;
  boyNumber: string;
  address: string;
  notes: string;
};
export type HistoryItem = {
  status: RegistrationStatus;
  at: string;
  note: string;
  actor: string;
};
export type Registration = {
  documentError?: string;
  cardError?: string;
  emailError?: string;
  revision?: number;
  id: string;
  number: string;
  school: School;
  patrols: Patrol[];
  status: RegistrationStatus;
  savedAt: string;
  submittedAt: string;
  version: number;
  history: HistoryItem[];
  documentStatus: "Menyiapkan" | "Siap" | "Gagal";
  cardStatus?: "Menyiapkan" | "Siap" | "Gagal";
  emailStatus: "Menunggu" | "Diproses" | "Diterima layanan email" | "Gagal";
  emailAttemptAt: string;
};
export type EventSettings = {
  name: string;
  description: string;
  location: string;
  eventStart: string;
  eventEnd: string;
  opens: string;
  closes: string;
  timezone: string;
  contactName: string;
  contactPhone: string;
  pickup: string;
};
export type CampState = {
  overview?: {
    all: ReturnType<typeof totals>;
    verified: ReturnType<typeof totals>;
    statuses: { status: RegistrationStatus; total: number }[];
    dates: { day: string; total: number }[];
    pending: Registration[];
  };
  eventRevision?: number;
  schemaVersion: 1;
  registrations: Registration[];
  operatorId: string;
  event: EventSettings;
};
export function totals(registrations: Registration[]) {
  const patrols = registrations.flatMap((r) => r.patrols);
  const count = (category: Category) =>
    patrols
      .filter((p) => p.category === category)
      .reduce(
        (sum, p) =>
          sum + p.participants.filter((member) => member.name.trim()).length,
        0,
      );
  return {
    schools: registrations.filter((r) => r.status !== "Draf").length,
    patrols: patrols.length,
    girls: count("Putri"),
    boys: count("Putra"),
    participants: count("Putri") + count("Putra"),
  };
}
export function editable(status: RegistrationStatus) {
  return status === "Draf" || status === "Perlu perbaikan";
}
export function registrationErrors(reg: Registration) {
  const errors: string[] = [];
  if (!reg.school.name.trim()) errors.push("Nama sekolah wajib diisi.");
  if (!reg.school.contact.trim())
    errors.push("Nama penanggung jawab wajib diisi.");
  if (!/^(?:\+62|08)\d{7,13}$/.test(reg.school.phone.replace(/[\s()-]/g, "")))
    errors.push(
      "Nomor WhatsApp wajib menggunakan format 08… atau +62… yang valid.",
    );
  if (!reg.school.city.trim()) errors.push("Kabupaten/kota wajib diisi.");
  if (reg.school.npsn && !/^\d{8}$/.test(reg.school.npsn))
    errors.push("NPSN harus terdiri dari 8 angka atau dikosongkan.");
  if (!reg.patrols.length)
    errors.push("Tambahkan minimal satu regu putri atau putra.");
  for (const [i, p] of reg.patrols.entries()) {
    const label = p.name || `Regu ${p.category} ${i + 1}`;
    if (!p.name.trim()) errors.push(`${label}: nama regu wajib diisi.`);
    if (
      reg.patrols.some(
        (other) =>
          other.id !== p.id &&
          other.category === p.category &&
          other.name.trim().toLocaleLowerCase("id") ===
            p.name.trim().toLocaleLowerCase("id"),
      )
    )
      errors.push(
        `${label}: nama regu harus berbeda dalam kategori yang sama.`,
      );
    const named = p.participants.filter((m) => m.name.trim());
    if (named.length < 8 || p.participants.length > 15)
      errors.push(`${label}: wajib berisi 8–15 peserta bernama.`);
    if (p.participants.some((m) => !m.name.trim() || !m.base.trim()))
      errors.push(
        `${label}: lengkapi nama dan pangkalan setiap peserta, atau hapus baris kosong.`,
      );
    if (p.phone && !p.companion.trim())
      errors.push(`${label}: isi nama pembina pendamping jika WhatsApp diisi.`);
    if (
      p.phone &&
      !/^(?:\+62|08)\d{7,13}$/.test(p.phone.replace(/[\s()-]/g, ""))
    )
      errors.push(`${label}: nomor WhatsApp pembina belum valid.`);
  }
  return [...new Set(errors)];
}
export function duplicateNames(reg: Registration) {
  const names = reg.patrols
    .flatMap((p) => p.participants)
    .map((p) => p.name.trim().toLocaleLowerCase("id"))
    .filter(Boolean);
  return [
    ...new Set(names.filter((name, index) => names.indexOf(name) !== index)),
  ];
}
export function registrationOpen(event: EventSettings, now = new Date()) {
  const offset =
    event.timezone === "Asia/Makassar"
      ? "+08:00"
      : event.timezone === "Asia/Jayapura"
        ? "+09:00"
        : "+07:00";
  return Boolean(
    event.opens &&
    event.closes &&
    now >= new Date(event.opens + offset) &&
    now <= new Date(event.closes + offset),
  );
}
export function formatTime(value: string) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Belum tersedia";
}
