import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { Pool } from "pg";
import { verifyPassword } from "better-auth/crypto";
import { expect, test } from "@playwright/test";

function testDatabase() {
  const url = process.env.STARTER_TEST_DATABASE_URL;
  if (!url || !process.env.STARTER_TEST_RUN?.startsWith("starter-pg-test-"))
    throw new Error("Use npm run test:e2e with its isolated database.");
  return url;
}
function seed(settings: Record<string, string>) {
  return new Promise<{ code: number | null; output: string }>(
    (resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/seed-panitia.mjs"], {
        env: {
          ...process.env,
          DATABASE_URL: testDatabase(),
          PANITIA_EMAIL: "",
          PANITIA_NAME: "",
          PANITIA_PASSWORD: "",
          ...settings,
        },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
      child.stderr.on("data", (chunk) => {
        output += chunk;
      });
      child.once("error", reject);
      child.once("close", (code) => resolve({ code, output }));
    },
  );
}

test("panitia seed is concurrent-safe, preserves credentials, and grants committee access without account administration", async ({
  page,
}) => {
  const email = `seed-${randomUUID()}@example.com`;
  const password = `Seed-${randomUUID()}-$!`;
  const settings = {
    PANITIA_EMAIL: ` ${email.toUpperCase()} `,
    PANITIA_NAME: "Panitia Seeder",
    PANITIA_PASSWORD: password,
  };
  const results = await Promise.all([seed(settings), seed(settings)]);
  for (const result of results) {
    expect(result.code, result.output).toBe(0);
    expect(result.output).not.toContain(password);
  }
  const pool = new Pool({ connectionString: testDatabase() });
  try {
    const { rows } = await pool.query('SELECT * FROM "user" WHERE email = $1', [
      email,
    ]);
    expect(rows).toHaveLength(1);
    const user = rows[0];
    expect(user.role).toBe("panitia");
    expect(user.email_verified).toBe(true);
    expect(user.name).toBe("Panitia Seeder");
    const { rows: accounts } = await pool.query(
      "SELECT * FROM account WHERE user_id = $1",
      [user.id],
    );
    expect(accounts).toHaveLength(1);
    expect(accounts[0].provider_id).toBe("credential");
    expect(accounts[0].account_id).toBe(user.id);
    expect(accounts[0].password).not.toBe(password);
    expect(await verifyPassword({ hash: accounts[0].password, password })).toBe(
      true,
    );
    const repeated = await seed({
      ...settings,
      PANITIA_NAME: "Nama baru tidak boleh menimpa",
      PANITIA_PASSWORD: "Password-baru-tidak-dipakai!",
    });
    expect(repeated.code, repeated.output).toBe(0);
    const {
      rows: [after],
    } = await pool.query(
      'SELECT u.name, a.password FROM "user" u JOIN account a ON a.user_id = u.id WHERE u.id = $1',
      [user.id],
    );
    expect(after.name).toBe(user.name);
    expect(after.password).toBe(accounts[0].password);
  } finally {
    await pool.end();
  }
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: false }).fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", {
      name: "Semua persiapan, dalam satu pandangan.",
    }),
  ).toBeVisible();
  expect((await page.request.get("/api/admin/camp/workspace")).status()).toBe(
    200,
  );
  expect((await page.request.get("/api/admin/notes")).status()).toBe(403);
  expect((await page.request.get("/api/auth/admin/list-users")).status()).toBe(
    403,
  );
  const session = await (
    await page.request.get("/api/auth/get-session")
  ).json();
  expect(
    (
      await page.request.post("/api/auth/admin/set-role", {
        headers: { Origin: "http://localhost:3101" },
        data: { userId: session.user.id, role: "admin" },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/admin/kegiatan");
  await expect(
    page.getByRole("heading", { name: "Pengaturan kegiatan" }),
  ).toBeVisible();
});

test("seeding replaces an existing Google admin role with panitia and preserves verification, bans, and login methods", async () => {
  const pool = new Pool({ connectionString: testDatabase() });
  const id = randomUUID(),
    email = `google-seed-${randomUUID()}@example.com`;
  try {
    await pool.query(
      'INSERT INTO "user" (id, name, email, role, email_verified, banned, ban_reason) VALUES ($1, $2, $3, $4, false, true, $5)',
      [id, "Akun Google", email, "admin", "Larangan pengujian"],
    );
    await pool.query(
      "INSERT INTO account (id, user_id, provider_id, account_id) VALUES ($1, $2, 'google', $3)",
      [randomUUID(), id, randomUUID()],
    );
    const result = await seed({ PANITIA_EMAIL: email });
    expect(result.code, result.output).toBe(0);
    const {
      rows: [user],
    } = await pool.query(
      'SELECT role, email_verified, banned, ban_reason, name FROM "user" WHERE id = $1',
      [id],
    );
    expect(user).toEqual({
      role: "panitia",
      email_verified: false,
      banned: true,
      ban_reason: "Larangan pengujian",
      name: "Akun Google",
    });
    const { rows: accounts } = await pool.query(
      "SELECT provider_id, password FROM account WHERE user_id = $1",
      [id],
    );
    expect(accounts).toEqual([{ provider_id: "google", password: null }]);
  } finally {
    await pool.end();
  }
});

test("invalid seed settings and a missing new-account password do not create users or expose secrets", async () => {
  const email = `missing-password-${randomUUID()}@example.com`;
  const absent = await seed({ PANITIA_EMAIL: email });
  expect(absent.code).toBe(1);
  expect(absent.output).toContain("PANITIA_PASSWORD");
  const secret = "secret";
  const invalid = await seed({
    PANITIA_EMAIL: "not-an-email",
    PANITIA_PASSWORD: secret,
  });
  expect(invalid.code).toBe(1);
  expect(invalid.output).toContain("PANITIA_EMAIL");
  expect(invalid.output).not.toContain(secret);
  const pool = new Pool({ connectionString: testDatabase() });
  try {
    expect(
      (await pool.query('SELECT id FROM "user" WHERE email = $1', [email]))
        .rows,
    ).toHaveLength(0);
  } finally {
    await pool.end();
  }
});
