import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { loadEnvironment, root } from "./lib.mjs";
import { databaseError, databaseUrl } from "./postgres.mjs";

// Connection checks only: never send mail, claim jobs, retry jobs, or change rows.
const flags = new Set(process.argv.slice(2));
if ([...flags].some((flag) => !["--skip-smtp", "--skip-db"].includes(flag))) {
  console.error(
    "Usage: node scripts/check-delivery.mjs [--skip-smtp] [--skip-db]",
  );
  process.exit(1);
}
await loadEnvironment();
let failures = 0;
const storage = path.resolve(
  process.env.PRIVATE_STORAGE_DIR || path.join(root, ".data", "camp"),
);

function safeCode(error) {
  const code = error?.cause?.code || error?.code;
  return typeof code === "string" && /^[A-Z0-9_]{1,60}$/.test(code)
    ? code
    : "CHECK_FAILED";
}
function problem(code, message) {
  return Object.assign(new Error(message), { code, safeMessage: message });
}
async function check(label, run) {
  try {
    const detail = await run();
    console.log(`[OK] ${label}${detail ? `: ${detail}` : ""}`);
  } catch (error) {
    failures++;
    // Do not print raw error messages, SMTP responses, URLs or credentials.
    console.error(
      `[FAIL] ${label}: ${safeCode(error)}${error?.safeMessage ? ` - ${error.safeMessage}` : ""}`,
    );
  }
}

console.log(
  "Pemeriksaan SMTP, PDF/kartu, storage, dan antrean. Tidak mengirim email.",
);
await check("Worker", () => {
  if (process.env.CAMP_WORKER_DISABLED === "true")
    throw problem(
      "WORKER_DISABLED",
      "Hapus CAMP_WORKER_DISABLED=true lalu restart aplikasi.",
    );
  return "diizinkan oleh environment; aktivitas diperiksa melalui antrean";
});
await check("Private storage bisa ditulis dan dibaca", async () => {
  const probe = path.join(storage, `.delivery-check-${randomUUID()}.tmp`);
  let created = false;
  try {
    await mkdir(storage, { recursive: true });
    await writeFile(probe, "delivery-check", { flag: "wx", mode: 0o600 });
    created = true;
    if ((await readFile(probe, "utf8")) !== "delivery-check")
      throw problem(
        "STORAGE_READ_FAILED",
        "Periksa volume PRIVATE_STORAGE_DIR.",
      );
  } finally {
    if (created) await unlink(probe);
  }
});
await check("Aset formulir, kartu dan avatar", async () => {
  for (const file of [
    "assets/fonts/NotoSans-Regular.ttf",
    "assets/fonts/NotoSans-Bold.ttf",
    "assets/registration-letterhead.png",
    "assets/id-card-reference.png",
    "public/images/participants/pramuka-putra.svg",
    "public/images/participants/pramuka-putri.svg",
  ])
    await access(path.join(root, file), constants.R_OK);
});
await check("Fontconfig Linux", async () => {
  if (process.platform !== "linux") return "pemeriksaan khusus Linux dilewati";
  try {
    await access("/etc/fonts/fonts.conf", constants.R_OK);
  } catch {
    throw problem(
      "FONTCONFIG_MISSING",
      "Deploy Dockerfile terbaru yang memasang fontconfig.",
    );
  }
});
await check("Render teks kartu dan avatar", async () => {
  const { default: sharp } = await import("sharp");
  await sharp({
    text: {
      text: "UJI KARTU PESERTA",
      font: "Noto Sans Bold",
      fontfile: path.join(root, "assets/fonts/NotoSans-Bold.ttf"),
      width: 470,
      height: 51,
      rgba: true,
    },
  })
    .png()
    .toBuffer();
  for (const category of ["putra", "putri"])
    await sharp(
      path.join(root, `public/images/participants/pramuka-${category}.svg`),
    )
      .resize(120, 120)
      .png()
      .toBuffer();
});
await check("PDFKit dan font formulir", async () => {
  const { default: PDFDocument } = await import("pdfkit");
  const doc = new PDFDocument({ autoFirstPage: false });
  const chunks = [];
  const completed = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.once("end", () => resolve(Buffer.concat(chunks)));
    doc.once("error", reject);
  });
  doc.registerFont(
    "Body",
    path.join(root, "assets/fonts/NotoSans-Regular.ttf"),
  );
  doc.font("Body").addPage().text("Uji formulir pendaftaran");
  doc.end();
  if ((await completed).subarray(0, 5).toString() !== "%PDF-")
    throw problem("PDF_INVALID", "Hasil render PDF tidak valid.");
});

if (!flags.has("--skip-db"))
  await check("Database, antrean dan foto sumber", async () => {
    const pool = new Pool({
      connectionString: databaseUrl(),
      max: 1,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    });
    pool.on("error", () => {});
    try {
      const { rows } = await pool.query(
        "SELECT kind,status,count(*)::int AS total,max(attempts) AS attempts,max(last_attempt_at) AS last_attempt_at FROM camp_jobs GROUP BY kind,status ORDER BY kind,status",
      );
      console.log(
        "Antrean (tanpa isi email/data peserta):",
        JSON.stringify(rows),
      );
      const photos = await pool.query(
        "SELECT file_key FROM participant_photos WHERE status = 'Ready' ORDER BY created_at DESC LIMIT 20",
      );
      let missing = 0;
      for (const photo of photos.rows) {
        if (!/^[a-f0-9-]{36}\.(webp|png)$/.test(photo.file_key || "")) {
          missing++;
          continue;
        }
        try {
          await access(path.join(storage, photo.file_key), constants.R_OK);
        } catch {
          missing++;
        }
      }
      if (missing)
        throw problem(
          "SOURCE_PHOTOS_MISSING",
          `${missing} dari ${photos.rowCount} foto sampel tidak terbaca. Periksa volume/backup PRIVATE_STORAGE_DIR.`,
        );
      if (rows.some((row) => row.status === "Failed"))
        console.log(
          "Pekerjaan Failed perlu dicoba ulang dari detail pendaftaran setelah penyebab diperbaiki.",
        );
    } catch (error) {
      if (error.safeMessage) throw error;
      throw problem(safeCode(error), databaseError(error));
    } finally {
      await pool.end();
    }
  });

if (!flags.has("--skip-smtp"))
  await check("SMTP: koneksi, TLS dan autentikasi", async () => {
    const missing = ["SMTP_HOST", "SMTP_PORT", "MAIL_FROM"].filter(
      (key) => !process.env[key],
    );
    if (missing.length)
      throw problem(
        "MAIL_NOT_CONFIGURED",
        `Isi ${missing.join(", ")} pada Runtime environment.`,
      );
    const port = Number(process.env.SMTP_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw problem(
        "SMTP_INVALID_PORT",
        "SMTP_PORT harus angka 1 sampai 65535.",
      );
    const secure = process.env.SMTP_SECURE === "true";
    if (port === 465 && !secure)
      throw problem(
        "SMTP_TLS_MISMATCH",
        "Port 465 memerlukan SMTP_SECURE=true.",
      );
    const { default: nodemailer } = await import("nodemailer");
    const local = ["localhost", "127.0.0.1", "::1"].includes(
      process.env.SMTP_HOST,
    );
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      requireTLS: !local && !secure,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || "" }
        : undefined,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    try {
      await transport.verify();
    } catch (error) {
      const hints = {
        EAUTH:
          "Kredensial ditolak. Gmail memerlukan sandi aplikasi yang valid dan Verifikasi 2 Langkah.",
        ETIMEDOUT:
          "Koneksi timeout. Periksa firewall dan akses SMTP keluar dari VPS.",
        ECONNECTION:
          "Koneksi SMTP gagal. Periksa host, port, dan akses jaringan VPS.",
        ESOCKET:
          "Koneksi/TLS SMTP gagal. Periksa port, mode TLS, dan sertifikat.",
      };
      throw problem(
        safeCode(error),
        hints[error.code] || "Periksa pengaturan SMTP dan sertifikat server.",
      );
    } finally {
      transport.close();
    }
  });
console.log(
  `Selesai: ${failures} pemeriksaan gagal. Tidak ada pekerjaan antrean yang diubah.`,
);
process.exitCode = failures ? 1 : 0;
