import type {
  CampState,
  Registration,
  RegistrationStatus,
  School,
} from "./types";
export const emptySchool: School = {
  name: "",
  contact: "",
  phone: "",
  email: "",
  city: "",
  district: "",
  npsn: "",
  girlNumber: "",
  boyNumber: "",
  address: "",
  notes: "",
};
export function emptyRegistration(email = ""): Registration {
  return {
    id: "sekolah-saya",
    number: "",
    school: { ...emptySchool, email },
    patrols: [],
    status: "Draf",
    savedAt: "",
    submittedAt: "",
    version: 0,
    history: [],
    documentStatus: "Menyiapkan",
    cardStatus: "Menyiapkan",
    emailStatus: "Menunggu",
    emailAttemptAt: "",
  };
}
const girls = [
  "Aulia Putri",
  "Nadia Maharani",
  "Zahra Safitri",
  "Dewi Lestari",
  "Aisyah Ramadhani",
  "Intan Permatasari",
  "Salsabila Zahra",
  "Nabila Rahma",
];
const boys = [
  "Ahmad Fadilah",
  "Rizky Pratama",
  "Dimas Saputra",
  "Fajar Ramadhan",
  "Arif Hidayat",
  "Bima Mahendra",
  "Rafi Maulana",
  "Ilham Akbar",
];
function example(
  id: string,
  name: string,
  status: RegistrationStatus,
  city: string,
  index: number,
): Registration {
  const base = emptyRegistration(`operator${index}@example.com`);
  return {
    ...base,
    id,
    number:
      status === "Draf" ? "" : `KEM-2026-${String(index).padStart(4, "0")}`,
    school: {
      ...base.school,
      name,
      contact: "Pembina Sekolah",
      city,
      phone: "081234567890",
      district: "Kuranji",
      npsn: `1090000${index}`,
      girlNumber: "01.101",
      boyNumber: "01.102",
      address: "Jl. Pendidikan No. 12",
    },
    status,
    savedAt: "2026-10-20T09:30:00+07:00",
    submittedAt: status === "Draf" ? "" : "2026-10-20T10:00:00+07:00",
    version: status === "Terverifikasi" ? 1 : 0,
    patrols: ["Putri", "Putra"].map((category, group) => ({
      id: `${id}-regu-${group}`,
      category: category as "Putri" | "Putra",
      name: group === 0 ? "Melati" : "Rajawali",
      companion: "",
      phone: "",
      leaderId: `${id}-${group}-0`,
      participants: (group === 0 ? girls : boys).map((member, i) => ({
        id: `${id}-${group}-${i}`,
        name: member,
        base: name,
        className: "7A",
        photo: "",
        zoom: 1,
        x: 50,
        y: 50,
      })),
    })),
    history:
      status === "Draf"
        ? []
        : [
            {
              status: "Dikirim",
              at: "2026-10-20T10:00:00+07:00",
              note: "Data pendaftaran dikirim oleh operator sekolah.",
              actor: "Operator",
            },
            ...(status !== "Dikirim"
              ? [
                  {
                    status,
                    at: "2026-10-20T14:00:00+07:00",
                    note:
                      status === "Perlu perbaikan"
                        ? "Mohon periksa kembali ejaan nama peserta dan nomor gugus depan putri."
                        : status === "Ditolak"
                          ? "Pendaftaran kegiatan ini hanya untuk tingkat penggalang. Hubungi panitia untuk informasi lebih lanjut."
                          : "Data sekolah dan peserta telah diperiksa.",
                    actor: "Panitia",
                  },
                ]
              : []),
          ],
    documentStatus: status === "Terverifikasi" ? "Siap" : "Menyiapkan",
    cardStatus: status === "Terverifikasi" ? "Siap" : "Menyiapkan",
  };
}
export function initialState(preview: boolean, email = ""): CampState {
  return {
    schemaVersion: 1,
    operatorId: "sekolah-saya",
    event: {
      name: "Perkemahan Gugus Depan Sekolah",
      description:
        "Bersiap bersama, belajar mandiri, dan tumbuh dalam semangat persaudaraan Pramuka.",
      location: "",
      eventStart: "",
      eventEnd: "",
      opens: preview ? "2026-01-01T00:00" : "",
      closes: preview ? "2027-12-31T23:59" : "",
      timezone: "Asia/Jakarta",
      contactName: "",
      contactPhone: "",
      pickup:
        "Bawa formulir pendaftaran yang telah dicetak dan serahkan kepada panitia untuk mengambil kartu fisik peserta.",
    },
    registrations: preview
      ? [
          example("sekolah-saya", "SMP Tunas Nusantara", "Draf", "Padang", 1),
          example(
            "harapan-bangsa",
            "SMP Harapan Bangsa",
            "Dikirim",
            "Padang",
            2,
          ),
          example(
            "al-hikmah",
            "MTs Al Hikmah",
            "Terverifikasi",
            "Padang Pariaman",
            3,
          ),
          example(
            "bina-prestasi",
            "SMP Bina Prestasi",
            "Perlu perbaikan",
            "Bukittinggi",
            4,
          ),
          example(
            "cahaya-bangsa",
            "SMP Cahaya Bangsa",
            "Terverifikasi",
            "Padang",
            5,
          ),
          example("tunas-muda", "SMP Tunas Muda", "Ditolak", "Solok", 6),
        ]
      : [emptyRegistration(email)],
  };
}
