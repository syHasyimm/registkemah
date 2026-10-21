import type { Registration } from "./types";
function cell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function buildRegistrationCsv(
  registrations: Registration[],
  participants: boolean,
) {
  const rows = participants
    ? [
        [
          "Nomor pendaftaran",
          "Sekolah",
          "Status",
          "Kategori",
          "Regu",
          "Nama peserta",
          "Pangkalan",
          "Kelas",
          "Pemimpin regu",
          "Foto",
        ],
        ...registrations.flatMap((r) =>
          r.patrols.flatMap((p) =>
            p.participants
              .filter((m) => m.name.trim())
              .map((m) => [
                r.number,
                r.school.name,
                r.status,
                p.category,
                p.name,
                m.name,
                m.base,
                m.className,
                p.leaderId === m.id ? "Ya" : "Tidak",
                m.photo ? "Ada" : "Tidak diunggah",
              ]),
          ),
        ),
      ]
    : [
        [
          "Nomor pendaftaran",
          "Sekolah",
          "Status",
          "Wilayah",
          "Penanggung jawab",
          "WhatsApp",
          "Email",
          "Regu putri",
          "Regu putra",
          "Peserta putri",
          "Peserta putra",
        ],
        ...registrations.map((r) => [
          r.number,
          r.school.name,
          r.status,
          r.school.city,
          r.school.contact,
          r.school.phone,
          r.school.email,
          r.patrols.filter((p) => p.category === "Putri").length,
          r.patrols.filter((p) => p.category === "Putra").length,
          r.patrols
            .filter((p) => p.category === "Putri")
            .flatMap((p) => p.participants)
            .filter((m) => m.name.trim()).length,
          r.patrols
            .filter((p) => p.category === "Putra")
            .flatMap((p) => p.participants)
            .filter((m) => m.name.trim()).length,
        ]),
      ];
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
export function exportCsv(
  registrations: Registration[],
  participants: boolean,
) {
  const blob = new Blob([buildRegistrationCsv(registrations, participants)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = participants
    ? "contoh-rekap-peserta.csv"
    : "contoh-rekap-sekolah.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
