import { expect, test } from "@playwright/test";
import { verificationLink, verifyAccount, testMail } from "./mail-helpers";
import { setTimeout as delay } from "node:timers/promises";

test("anonymous visitors cannot access the protected app", async ({
  page,
  request,
}) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Selamat datang kembali." }),
  ).toBeVisible();
  const session = await request.get("/api/auth/get-session");
  expect(await session.json()).toBeNull();
});

test("signup, persisted session, signout, rejected password, and signin work", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `builder-${Date.now()}@example.com`;
  const password = "A-long-test-password-123!";
  await page.goto("/sign-up");
  await page.getByLabel("Nama lengkap", { exact: false }).fill("Ada Builder");
  await page.getByLabel("Email", { exact: false }).fill(email);
  await page.locator("#password").fill(password);
  await page.getByLabel("Konfirmasi password*", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page).toHaveURL(/\/verify-email\?email=/);
  await page.goto(await verificationLink(email));
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Selamat datang, Pembina!" }),
  ).toBeVisible();
  await expect(page.getByText("Ada Builder", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  const cookies = await context.cookies();
  expect(
    cookies.some(
      (cookie) => cookie.name.includes("session_token") && cookie.httpOnly,
    ),
  ).toBe(true);
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByLabel("Email", { exact: false }).fill(email);
  await page.locator("#password").fill("incorrect-password");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Belum berhasil masuk" }),
  ).toContainText("Periksa email dan password");
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  expect(errors).toEqual([]);
});

test("auth rejects cross-origin requests and invalid signup data", async ({
  request,
}) => {
  const crossOrigin = await request.post("/api/auth/sign-up/email", {
    headers: { Origin: "https://untrusted.example" },
    data: {
      name: "Test",
      email: "cross-origin@example.com",
      password: "Test-password-123",
    },
  });
  expect(crossOrigin.status()).toBe(403);
  const invalid = await request.post("/api/auth/sign-up/email", {
    headers: { Origin: "http://localhost:3101" },
    data: { name: "Test", email: "not-an-email", password: "short" },
  });
  expect(invalid.status()).toBeGreaterThanOrEqual(400);
  expect(invalid.status()).toBeLessThan(500);
});

test("signup rejects password mismatch before sending an account request", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await page.getByLabel("Nama lengkap", { exact: false }).fill("Pembina");
  await page.getByLabel("Email", { exact: false }).fill("mismatch@example.com");
  await page.locator("#password").fill("Strong-password-123!");
  await page
    .getByLabel("Konfirmasi password*", { exact: true })
    .fill("Different-password-123!");
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/sign-up/email")) requests++;
  });
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Konfirmasi password belum sama" }),
  ).toContainText("Konfirmasi password belum sama");
  expect(requests).toBe(0);
});

test("welcome and auth pages fit a narrow screen and links work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Langkah kecil. Petualangan besar." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Daftarkan sekolah", exact: true })
    .click();
  await expect(page.getByLabel("Email", { exact: false })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("password recovery sends a private reset link and changes the password", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const email = `recovery-${Date.now()}@example.com`;
  const password = "Recovery-password-123!";
  const credentials = { name: "Pembina Pemulihan", email, password };
  let signup = await context.request.post("/api/auth/sign-up/email", {
    headers: { Origin: "http://localhost:3101" },
    data: credentials,
  });
  if (signup.status() === 429) {
    await delay((Number(signup.headers()["retry-after"] || 10) + 0.1) * 1000);
    signup = await context.request.post("/api/auth/sign-up/email", {
      headers: { Origin: "http://localhost:3101" },
      data: credentials,
    });
  }
  expect(signup.status()).toBe(200);
  await verifyAccount(context.request, email);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByRole("link", { name: "Lupa password?" }).click();
  await page.getByLabel("Email akun", { exact: false }).fill(email);
  await page.getByRole("button", { name: "Minta tautan pemulihan" }).click();
  await expect(
    page.getByText("Jika alamat tersebut terdaftar", { exact: false }),
  ).toBeVisible();
  const message = await testMail(email, "Atur");
  const link = message.Text.match(/https?:\/\/[^\s<>]+/)?.[0];
  expect(link).toBeTruthy();
  await page.goto(link!);
  await expect(page).toHaveURL(/\/reset-password\?token=/);
  await page.locator("#new-password").fill("Updated-recovery-password-123!");
  await page
    .getByLabel("Konfirmasi password baru", { exact: false })
    .fill("Updated-recovery-password-123!");
  await page.getByRole("button", { name: "Simpan password baru" }).click();
  await expect(
    page.getByRole("heading", { name: "Password diperbarui." }),
  ).toBeVisible();
  const login = await context.request.post("/api/auth/sign-in/email", {
    headers: { Origin: "http://localhost:3101" },
    data: { email, password: "Updated-recovery-password-123!" },
  });
  expect(login.status()).toBe(200);
});
