import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";
import { z } from "zod";
import { loadEnvironment } from "./lib.mjs";
import { databaseError, databaseUrl } from "./postgres.mjs";

class SeedError extends Error {}

const settingsSchema = z.object({
  PANITIA_EMAIL: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  PANITIA_NAME: z.string().trim().min(1).max(120).default("Panitia Perkemahan"),
  PANITIA_PASSWORD: z.string().min(8).max(128).optional(),
});

async function main() {
  if (process.argv[2] === "--help") {
    console.log(
      "Jalankan: npm run seed:panitia\n" +
        "Atur PANITIA_EMAIL di .env.local atau environment.\n" +
        "Akun baru membutuhkan PANITIA_PASSWORD (8–128 karakter); PANITIA_NAME opsional.\n" +
        "Akun yang sudah ada diganti menjadi panitia; password, verifikasi, dan metode login tetap.\n" +
        "Password tidak diterima sebagai argumen dan tidak dicetak.",
    );
    return;
  }
  if (process.argv.length > 2)
    throw new SeedError(
      "Gunakan npm run seed:panitia tanpa argumen. Lihat --help.",
    );

  await loadEnvironment();
  const settings = settingsSchema.safeParse({
    PANITIA_EMAIL: process.env.PANITIA_EMAIL,
    PANITIA_NAME: process.env.PANITIA_NAME || undefined,
    PANITIA_PASSWORD: process.env.PANITIA_PASSWORD || undefined,
  });
  if (!settings.success) {
    const fields = [
      ...new Set(settings.error.issues.map((issue) => issue.path[0])),
    ].join(", ");
    throw new SeedError(
      `Periksa ${fields} di konfigurasi privat. Email harus valid, nama 1–120 karakter, dan password 8–128 karakter.`,
    );
  }
  const {
    PANITIA_EMAIL: email,
    PANITIA_NAME: name,
    PANITIA_PASSWORD: password,
  } = settings.data;
  // Hash with the same scrypt implementation as Better Auth, outside the transaction.
  const passwordHash = password ? await hashPassword(password) : null;
  const pool = new Pool({
    connectionString: databaseUrl(),
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  pool.on("error", () => {});
  try {
    const client = await pool.connect();
    let created = false;
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query("SET LOCAL statement_timeout = '10s'");
      const find = async () =>
        (
          await client.query(
            'SELECT id, role FROM "user" WHERE lower(email) = $1 FOR UPDATE',
            [email],
          )
        ).rows[0];
      let record = await find();
      if (!record) {
        if (!passwordHash)
          throw new SeedError(
            "PANITIA_PASSWORD wajib diisi untuk membuat akun panitia baru.",
          );
        const id = randomUUID();
        const inserted = await client.query(
          'INSERT INTO "user" (id, name, email, email_verified, role) VALUES ($1, $2, $3, true, $4) ON CONFLICT (email) DO NOTHING RETURNING id, role',
          [id, name, email, "panitia"],
        );
        record = inserted.rows[0];
        if (record) {
          await client.query(
            "INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES ($1, $2, $3, $2, $4)",
            [randomUUID(), id, "credential", passwordHash],
          );
          created = true;
        } else {
          // Another seed or signup may have created this email while we waited.
          record = await find();
          if (!record)
            throw new SeedError(
              "Akun berubah saat seeding. Jalankan ulang perintah.",
            );
        }
      }
      const nextRole = "panitia";
      if (record.role !== nextRole) {
        await client.query(
          'UPDATE "user" SET role = $1, updated_at = now() WHERE id = $2',
          [nextRole, record.id],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    console.log(
      created
        ? "Akun panitia baru berhasil dibuat. Email ditandai terverifikasi melalui provisioning CLI."
        : "Peran akun diganti menjadi panitia. Password, verifikasi email, dan metode login tetap dipertahankan.",
    );
    console.log(
      "Masuk melalui /sign-in, lalu buka /admin. Seeder aman dijalankan ulang.",
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof SeedError ? error.message : databaseError(error),
  );
  process.exitCode = 1;
});
