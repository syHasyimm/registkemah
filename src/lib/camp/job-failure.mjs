const knownCodes = new Set([
  "ENOENT",
  "EACCES",
  "EPERM",
  "EROFS",
  "ENOSPC",
  "EAUTH",
  "EENVELOPE",
  "EMESSAGE",
  "ETIMEDOUT",
  "ESOCKET",
  "ECONNECTION",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "MODULE_NOT_FOUND",
  "ERR_MODULE_NOT_FOUND",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "CERT_HAS_EXPIRED",
  "MAIL_NOT_CONFIGURED",
  "EMAIL_CHANGED",
  "APPROVED_PHOTO_UNAVAILABLE",
  "APPROVED_PHOTO_MISSING",
]);
const stages = new Set([
  "claim",
  "load-approval",
  "validate-approval",
  "read-photos",
  "render-pdf",
  "render-card",
  "write-pdf",
  "write-card",
  "save-result",
  "send-email",
  "save-mail-status",
]);
const commands = new Set([
  "CONN",
  "AUTH PLAIN",
  "AUTH LOGIN",
  "MAIL FROM",
  "RCPT TO",
  "DATA",
]);

/** Deliberately omit raw messages, SQL, SMTP responses, paths, payloads and recipients. */
export function jobFailureDetails(error, stage) {
  const result = {
    stage: stages.has(stage) ? stage : "unknown",
    code: "UNKNOWN",
  };
  if (
    [
      "Error",
      "TypeError",
      "RangeError",
      "ServiceError",
      "DrizzleQueryError",
    ].includes(error?.name)
  )
    result.errorType = error.name;
  if (typeof error?.stack === "string") {
    result.frames = error.stack
      .split("\n")
      .filter((line) => /^\s+at /.test(line))
      .flatMap((line) => {
        const match = line.match(
          /[/\\]([A-Za-z0-9_.\[\]-]+\.(?:[cm]?js|tsx?)):(\d+):(\d+)/,
        );
        return match ? [`${match[1]}:${match[2]}:${match[3]}`] : [];
      })
      .slice(0, 3);
  }
  const seen = new Set();
  let current = error;
  for (
    let depth = 0;
    current && typeof current === "object" && depth < 5;
    depth++
  ) {
    if (seen.has(current)) break;
    seen.add(current);
    const code = current.code;
    if (
      knownCodes.has(code) ||
      (typeof code === "string" &&
        /^(?:08|22|23|25|28|40|42|53|54|55|57|58|XX)[A-Z0-9]{3}$/.test(code))
    )
      result.code = code;
    if (
      Number.isInteger(current.responseCode) &&
      current.responseCode >= 400 &&
      current.responseCode <= 599
    )
      result.responseCode = current.responseCode;
    if (commands.has(current.command)) result.command = current.command;
    if (typeof current.response === "string") {
      const status = current.response.match(/\b[245]\.\d{1,3}\.\d{1,3}\b/)?.[0];
      if (status) result.smtpStatus = status;
    }
    if (result.code === "UNKNOWN" && typeof current.message === "string") {
      if (
        /extract_area|Expected integer for (?:left|top|width|height)/i.test(
          current.message,
        )
      )
        result.code = "PHOTO_CROP_INVALID";
      else if (
        /unsupported image format|corrupt|invalid image dimensions/i.test(
          current.message,
        )
      )
        result.code = "PHOTO_FORMAT_INVALID";
    }
    current = current.cause;
  }
  return result;
}

export function jobFailureMessage(details, kind) {
  const messages = {
    EACCES:
      "Penyimpanan menolak akses berkas. Periksa pemilik dan izin volume aplikasi.",
    EPERM:
      "Penyimpanan menolak akses berkas. Periksa pemilik dan izin volume aplikasi.",
    EROFS:
      "Volume penyimpanan hanya dapat dibaca. Aktifkan akses tulis pada mount aplikasi.",
    ENOSPC:
      "Penyimpanan VPS penuh. Sediakan ruang kosong sebelum mencoba ulang.",
    ENOENT:
      "Berkas foto, font, atau gambar sumber tidak ditemukan. Periksa volume dan aset image aplikasi.",
    EAUTH:
      "SMTP menolak autentikasi. Periksa akun dan sandi aplikasi yang dipakai container web.",
    EENVELOPE:
      "SMTP menolak alamat pengirim atau penerima. Periksa MAIL_FROM dan alamat email operator.",
    EMESSAGE:
      "SMTP menolak isi pesan. Periksa kebijakan pengiriman penyedia email.",
    MODULE_NOT_FOUND:
      "Dependensi pemrosesan berkas tidak tersedia. Deploy ulang image aplikasi terbaru.",
    ERR_MODULE_NOT_FOUND:
      "Dependensi pemrosesan berkas tidak tersedia. Deploy ulang image aplikasi terbaru.",
    PHOTO_CROP_INVALID:
      "Pengaturan potong foto pada versi persetujuan tidak valid. Minta revisi dan atur ulang foto peserta.",
    PHOTO_FORMAT_INVALID:
      "Foto sumber tidak dapat dibaca sebagai gambar. Pulihkan berkas atau minta unggah ulang melalui revisi.",
    "42P01":
      "Tabel pemrosesan belum tersedia di database. Periksa migrasi production.",
    42703:
      "Kolom pemrosesan belum tersedia di database. Periksa migrasi production.",
    42501: "Akun database tidak memiliki izin untuk menyimpan hasil proses.",
  };
  let message = messages[details.code];
  if (
    !message &&
    [
      "save-result",
      "save-mail-status",
      "validate-approval",
      "load-approval",
    ].includes(details.stage)
  )
    message =
      "Proses gagal saat membaca atau menyimpan status di database. Periksa log worker.";
  if (!message && ["email", "auth-email"].includes(kind))
    message =
      "Pengiriman email belum selesai. Periksa kode dan tahap kegagalan pada log worker.";
  if (!message)
    message =
      "Pemrosesan berkas belum selesai. Periksa kode dan tahap kegagalan pada log worker.";
  return `${message} [${details.stage}/${details.code}${details.responseCode ? `/${details.responseCode}` : ""}]`;
}
