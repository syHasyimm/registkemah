import "server-only";
import { readSheet, type SheetData } from "read-excel-file/node";
import writeXlsxFile from "write-excel-file/node";
import {
  MAX_CERTIFICATE_EXCEL_BYTES,
  MAX_CERTIFICATE_EXCEL_ROWS,
  type CertificateImport,
} from "@/lib/camp/certificates";
import { ServiceError } from "@/lib/service-error";
import { committeeCertificateSchema } from "@/validators/certificates";

const invalid = () =>
  new ServiceError(
    422,
    "INVALID_CERTIFICATE_EXCEL",
    "File tidak dapat dibaca. Unggah file .xlsx dengan kolom Nama dan Jabatan pada baris pertama lembar pertama.",
  );

// Bound the expanded ZIP size before the XLSX parser allocates worksheet data.
function checkWorkbookSize(bytes: Buffer) {
  if (bytes.length > MAX_CERTIFICATE_EXCEL_BYTES)
    throw new ServiceError(
      413,
      "EXCEL_TOO_LARGE",
      "Ukuran Excel maksimal 2 MB.",
    );
  if (bytes.length < 22 || bytes.readUInt32LE(0) !== 0x04034b50)
    throw invalid();
  let end = bytes.length - 22;
  const minimum = Math.max(0, end - 65535);
  while (end >= minimum && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < minimum) throw invalid();
  const entries = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);
  let expanded = 0;
  if (entries > 100 || entries === 0) throw invalid();
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > end || bytes.readUInt32LE(offset) !== 0x02014b50)
      throw invalid();
    expanded += bytes.readUInt32LE(offset + 24);
    if (expanded > 20 * 1024 * 1024)
      throw new ServiceError(
        413,
        "EXCEL_TOO_LARGE",
        "Isi Excel terlalu besar. Gunakan file sederhana berisi Nama dan Jabatan saja.",
      );
    offset +=
      46 +
      bytes.readUInt16LE(offset + 28) +
      bytes.readUInt16LE(offset + 30) +
      bytes.readUInt16LE(offset + 32);
  }
}

export async function importCertificateCommittee(bytes: Buffer) {
  checkWorkbookSize(bytes);
  let rows: SheetData;
  try {
    rows = await readSheet(bytes);
  } catch {
    throw invalid();
  }
  const headers = rows[0]?.map((cell) =>
    typeof cell === "string" ? cell.trim().toLocaleLowerCase("id") : "",
  );
  if (
    !headers ||
    headers.filter((name) => name === "nama").length !== 1 ||
    headers.filter((name) => name === "jabatan").length !== 1
  )
    throw invalid();
  if (rows.length - 1 > MAX_CERTIFICATE_EXCEL_ROWS)
    throw new ServiceError(
      422,
      "TOO_MANY_EXCEL_ROWS",
      `Maksimal ${MAX_CERTIFICATE_EXCEL_ROWS} baris per Excel. Pisahkan menjadi beberapa file.`,
    );
  const nameColumn = headers.indexOf("nama");
  const positionColumn = headers.indexOf("jabatan");
  const result: CertificateImport = { recipients: [], issues: [] };
  rows.slice(1).forEach((row, index) => {
    if (row.every((cell) => cell === null || cell === "")) return;
    const parsed = committeeCertificateSchema.safeParse({
      name: row[nameColumn],
      position: row[positionColumn],
    });
    if (!parsed.success) {
      result.issues.push({
        row: index + 2,
        message:
          "Isi Nama (maks. 150 karakter) dan Jabatan (maks. 120 karakter) sebagai teks.",
      });
      return;
    }
    result.recipients.push({
      key: `excel-${index + 2}`,
      row: index + 2,
      ...parsed.data,
    });
  });
  if (!result.recipients.length && !result.issues.length)
    throw new ServiceError(
      422,
      "EMPTY_EXCEL",
      "Excel belum berisi data panitia.",
    );
  return result;
}

export function certificateCommitteeTemplate() {
  return writeXlsxFile(
    [
      [
        { value: "Nama", fontWeight: "bold" },
        { value: "Jabatan", fontWeight: "bold" },
      ],
    ],
    { sheet: "Panitia", columns: [{ width: 48 }, { width: 48 }] },
  ).toBuffer();
}
