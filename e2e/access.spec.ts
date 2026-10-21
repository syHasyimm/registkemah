import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { verificationLink } from "./mail-helpers";

const origin = "http://localhost:3101";
const headers = { Origin: origin };
const db = () =>
  new Pool({ connectionString: process.env.STARTER_TEST_DATABASE_URL });

async function signup(
  client: APIRequestContext,
  extra: Record<string, unknown> = {},
) {
  const email = `access-${randomUUID()}@example.com`;
  const data = {
    email,
    name: "Akun Akses",
    password: `Password-${randomUUID()}!`,
    callbackURL: "/after-login",
    ...extra,
  };
  let response = await client.post("/api/auth/sign-up/email", {
    headers,
    data,
  });
  if (response.status() === 429) {
    const wait = Number(response.headers()["retry-after"] || 10);
    expect(wait).toBeLessThanOrEqual(10);
    await delay((wait + 0.1) * 1000);
    response = await client.post("/api/auth/sign-up/email", { headers, data });
  }
  return { email, response };
}

async function setRole(email: string, role: string) {
  if (
    !process.env.STARTER_TEST_RUN?.startsWith("starter-pg-test-") ||
    !process.env.STARTER_TEST_DATABASE_URL
  )
    throw new Error("Use the isolated test runner.");
  return new Promise<number | null>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["scripts/set-role.mjs", email, role],
      {
        env: {
          ...process.env,
          DATABASE_URL: process.env.STARTER_TEST_DATABASE_URL,
        },
        stdio: "ignore",
        windowsHide: true,
      },
    );
    child.once("error", reject);
    child.once("close", resolve);
  });
}

for (const role of ["admin", "panitia"] as const) {
  test(`${role} goes directly to its dashboard and cannot use operator pages or APIs`, async ({
    page,
  }) => {
    const account = await signup(page.request);
    expect(account.response.status()).toBe(200);
    expect(await setRole(account.email, role)).toBe(0);
    await page.goto(await verificationLink(account.email));
    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("navigation", { name: "Navigasi panitia" }),
    ).toBeVisible();
    for (const path of [
      "/app",
      "/app/pendaftaran",
      "/app/pendaftaran/bukti",
      "/after-login",
      "/sign-in",
      "/sign-up",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin$/);
      await expect(
        page.getByRole("navigation", { name: "Navigasi operator" }),
      ).toHaveCount(0);
    }
    const id = randomUUID(),
      photoId = randomUUID();
    for (const [method, path] of [
      ["GET", "/api/camp/workspace"],
      ["POST", "/api/registrations"],
      ["GET", `/api/registrations/${id}`],
      ["PUT", `/api/registrations/${id}`],
      ["POST", `/api/registrations/${id}/submit`],
      ["GET", `/api/registrations/${id}/document`],
      ["POST", `/api/registrations/${id}/photos`],
      ["GET", `/api/registrations/${id}/photos/${photoId}`],
      ["PUT", `/api/registrations/${id}/photos/${photoId}`],
      ["DELETE", `/api/registrations/${id}/photos/${photoId}`],
      ["GET", "/api/notes"],
      ["POST", "/api/notes"],
    ]) {
      const response = await page.request.fetch(path, { method, headers });
      expect(response.status(), `${method} ${path}`).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN_ROLE");
      expect(response.headers()["cache-control"]).toContain("no-store");
    }
    expect((await page.request.get("/api/admin/camp/workspace")).status()).toBe(
      200,
    );
    if (role === "admin") {
      const session = await (
        await page.request.get("/api/auth/get-session")
      ).json();
      const combined = await page.request.post("/api/auth/admin/set-role", {
        headers,
        data: { userId: session.user.id, role: ["admin", "user"] },
      });
      expect(combined.status()).toBe(400);
      const staff = await page.request.post("/api/auth/admin/create-user", {
        headers,
        data: {
          email: `provisioned-${randomUUID()}@example.com`,
          name: "Panitia Internal",
          role: "panitia",
        },
      });
      expect(staff.status(), await staff.text()).toBe(200);
      expect((await staff.json()).user.role).toBe("panitia");
      const invalidEmail = `multiple-${randomUUID()}@example.com`;
      expect(
        (
          await page.request.post("/api/auth/admin/create-user", {
            headers,
            data: {
              email: invalidEmail,
              name: "Tidak Boleh Dibuat",
              role: ["user", "panitia"],
            },
          })
        ).status(),
      ).toBe(400);
      const pool = db();
      try {
        expect(
          (
            await pool.query('SELECT id FROM "user" WHERE email = $1', [
              invalidEmail,
            ])
          ).rows,
        ).toHaveLength(0);
      } finally {
        await pool.end();
      }
    }
    const pool = db();
    try {
      const {
        rows: [counts],
      } = await pool.query(
        'SELECT (SELECT count(*)::int FROM schools s JOIN "user" u ON u.id = s.owner_id WHERE u.email = $1) AS schools, (SELECT count(*)::int FROM registrations r JOIN "user" u ON u.id = r.owner_id WHERE u.email = $1) AS registrations',
        [account.email],
      );
      expect(counts).toEqual({ schools: 0, registrations: 0 });
    } finally {
      await pool.end();
    }
  });
}

test("signup creates only operators and cannot assign staff roles through public input", async ({
  page,
}) => {
  for (const role of ["admin", "panitia", "user,admin"]) {
    const forged = await signup(page.request, { role });
    expect(forged.response.status()).toBe(400);
    const pool = db();
    try {
      expect(
        (
          await pool.query('SELECT id FROM "user" WHERE email = $1', [
            forged.email,
          ])
        ).rows,
      ).toHaveLength(0);
    } finally {
      await pool.end();
    }
  }
  const account = await signup(page.request);
  expect(account.response.status()).toBe(200);
  expect((await account.response.json()).user.role).toBe("user");
  await page.goto(await verificationLink(account.email));
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/after-login");
  await expect(page).toHaveURL(/\/app$/);
  for (const path of ["/admin", "/admin/kegiatan", "/admin/pendaftaran"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/app$/);
  }
  for (const path of [
    "/api/admin/camp/workspace",
    "/api/admin/camp/overview",
    "/api/admin/registrations",
    "/api/admin/registrations/export?kind=schools",
  ]) {
    expect((await page.request.get(path)).status()).toBe(403);
  }
  expect(
    (
      await page.request.post("/api/auth/update-user", {
        headers,
        data: { role: "admin" },
      })
    ).status(),
  ).toBe(400);
});

test("active sessions lose the old area immediately when role changes and school drafts are preserved", async ({
  page,
}) => {
  const account = await signup(page.request);
  expect(account.response.status()).toBe(200);
  await page.goto(await verificationLink(account.email));
  await expect(page).toHaveURL(/\/app$/);
  await page
    .getByRole("link", { name: "Pendaftaran sekolah", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: /^Nama sekolah/ })
    .fill("Sekolah Tetap Tersimpan");
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  await expect(
    page.getByText("Draf berhasil disimpan di server."),
  ).toBeVisible();
  const workspace = (
    await (await page.request.get("/api/camp/workspace")).json()
  ).data;
  const id = workspace.operatorId;
  expect(await setRole(account.email, "panitia")).toBe(0);
  expect((await page.request.get(`/api/registrations/${id}`)).status()).toBe(
    403,
  );
  expect(
    (
      await page.request.put(`/api/registrations/${id}`, { headers, data: {} })
    ).status(),
  ).toBe(403);
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  expect(await setRole(account.email, "user,panitia")).toBe(1);
  expect(await setRole(account.email, "unknown-role")).toBe(1);
  expect(await setRole(account.email, "user")).toBe(0);
  expect((await page.request.get("/api/admin/camp/workspace")).status()).toBe(
    403,
  );
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/pendaftaran");
  await expect(
    page.getByRole("textbox", { name: /^Nama sekolah/ }),
  ).toHaveValue("Sekolah Tetap Tersimpan");
  const restored = (
    await (await page.request.get("/api/camp/workspace")).json()
  ).data;
  expect(restored.operatorId).toBe(id);
});
