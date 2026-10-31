import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { writeFile } from "node:fs/promises";
import { Pool } from "pg";
import { readSheet } from "read-excel-file/node";
import writeXlsxFile, { type SheetData } from "write-excel-file/node";
import {
  expect,
  test,
  type Browser,
  type APIRequestContext,
} from "@playwright/test";
import { verifyAccount } from "./mail-helpers";
import { draftPayload } from "@/lib/camp/payload";
import type { Registration } from "@/lib/camp/types";
import type {
  CertificateImport,
  CertificateRecipient,
} from "@/lib/camp/certificates";
import { formatCertificateName } from "@/lib/camp/certificates";

const origin = "http://localhost:3101";
const headers = { Origin: origin };
const xlsxHeaders = {
  ...headers,
  "Content-Type":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
const base = "/api/admin/certificates";

async function actor(browser: Browser, staff = false) {
  const context = await browser.newContext({ baseURL: origin });
  const email = `certificate-${randomUUID()}@example.com`;
  const credentials = {
    name: "Pengujian Sertifikat",
    email,
    password: "Certificates-test-123!",
  };
  let signup = await context.request.post("/api/auth/sign-up/email", {
    headers,
    data: credentials,
  });
  if (signup.status() === 429) {
    const seconds = Number(signup.headers()["retry-after"] || 10);
    expect(seconds).toBeLessThanOrEqual(10);
    await delay((seconds + 0.1) * 1000);
    signup = await context.request.post("/api/auth/sign-up/email", {
      headers,
      data: credentials,
    });
  }
  expect(signup.status()).toBe(200);
  await verifyAccount(context.request, email);
  if (staff) await role(email, "panitia");
  return { context, client: context.request, email };
}

async function query(sql: string, values: unknown[] = []) {
  const pool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
  });
  try {
    return await pool.query(sql, values);
  } finally {
    await pool.end();
  }
}

async function role(email: string, value: string) {
  await query('UPDATE "user" SET role = $1 WHERE email = $2', [value, email]);
}

function workbook(rows: SheetData) {
  return writeXlsxFile(rows).toBuffer();
}

function checkPdf(bytes: Buffer, pages: number) {
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(
    pages,
  );
  expect(bytes.toString("latin1")).toContain("001/0803/KBP/2026");
  expect(bytes.toString("latin1")).toContain("LeagueSpartan-Bold");
}

test("certificate names capitalize each word while keeping spaces and Unicode", () => {
  for (const [input, expected] of [
    ["sATYA SATRIA shiddiqi", "Satya Satria Shiddiqi"],
    ["  siti   aMINAH  ", "Siti Aminah"],
    ["ÉLÉONORE pUtRi", "Éléonore Putri"],
    ["ahmad al-faruq o'NEILL", "Ahmad Al-Faruq O'Neill"],
  ])
    expect(formatCertificateName(input)).toBe(expected);
});

test("certificate APIs require staff permissions, origin, and an active session", async ({
  request,
  browser,
}) => {
  const endpoints = [
    ["GET", "participants"],
    ["GET", "template"],
    ["POST", "import"],
    ["POST", "generate"],
  ] as const;
  for (const [method, endpoint] of endpoints) {
    const response = await request.fetch(`${base}/${endpoint}`, {
      method,
      headers,
    });
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  const user = await actor(browser);
  for (const [method, endpoint] of endpoints)
    expect(
      (
        await user.client.fetch(`${base}/${endpoint}`, { method, headers })
      ).status(),
    ).toBe(403);
  await role(user.email, "panitia");
  expect((await user.client.get(`${base}/participants`)).status()).toBe(200);
  expect(
    (
      await user.client.post(`${base}/generate`, {
        headers: { Origin: "https://other.example" },
        data: {
          kind: "committee",
          recipients: [{ name: "Uji", position: "Panitia" }],
        },
      })
    ).status(),
  ).toBe(403);
  await role(user.email, "admin");
  expect((await user.client.get(`${base}/template`)).status()).toBe(200);
  await role(user.email, "user");
  expect((await user.client.get(`${base}/participants`)).status()).toBe(403);
  await user.client.post("/api/auth/sign-out", { headers, data: {} });
  expect((await user.client.get(`${base}/template`)).status()).toBe(401);
  await user.context.close();
});

test("committee Excel validates rows, previews and downloads PDFs without saving people", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const staff = await actor(browser, true);
  const before = await query('SELECT count(*)::int AS total FROM "user"');
  const template = await staff.client.get(`${base}/template`);
  expect(template.status()).toBe(200);
  expect(await readSheet(await template.body())).toEqual([["Nama", "Jabatan"]]);
  const longName =
    "Muhammad Abdullah Al Faruq Pratama Putra Wijaya Kusuma Adinata";
  const longPosition =
    "Koordinator Seksi Perlengkapan, Sarana Prasarana dan Dokumentasi Kegiatan Perkemahan";
  const bytes = await workbook([
    [" Jabatan ", "NAMA"],
    ["Ketua Panitia", "ÉLÉONORE pUtRi"],
    ["Sekretaris", "élÉONORE PUTRI"],
    [longPosition, longName],
  ]);
  const imported = await staff.client.post(`${base}/import`, {
    headers: xlsxHeaders,
    data: bytes,
  });
  expect(imported.status(), await imported.text()).toBe(200);
  const data = (await imported.json()).data as CertificateImport;
  expect(data.issues).toEqual([]);
  expect(data.recipients).toHaveLength(3);
  expect(new Set(data.recipients.map((p) => p.key)).size).toBe(3);
  expect(data.recipients[0]).toMatchObject({
    name: "ÉLÉONORE pUtRi",
    position: "Ketua Panitia",
    row: 2,
  });

  const invalidRows = await staff.client.post(`${base}/import`, {
    headers: xlsxHeaders,
    data: await workbook([
      ["Nama", "Jabatan"],
      ["Lengkap", "Panitia"],
      [null, null],
      ["Tanpa jabatan", null],
      [123, "Bendahara"],
    ]),
  });
  expect(invalidRows.status()).toBe(200);
  expect(
    (await invalidRows.json()).data.issues.map(
      (issue: { row: number }) => issue.row,
    ),
  ).toEqual([4, 5]);
  for (const invalidBytes of [
    Buffer.from("not xlsx"),
    await workbook([
      ["Nama", "Role"],
      ["Nama", "Ketua"],
    ]),
  ])
    expect(
      (
        await staff.client.post(`${base}/import`, {
          headers: xlsxHeaders,
          data: invalidBytes,
        })
      ).status(),
    ).toBe(422);
  expect(
    (
      await staff.client.post(`${base}/import`, {
        headers: xlsxHeaders,
        data: await template.body(),
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await staff.client.post(`${base}/import`, {
        headers: xlsxHeaders,
        data: Buffer.alloc(2 * 1024 * 1024 + 1),
      })
    ).status(),
  ).toBe(413);
  const bomb = Buffer.from(bytes);
  const central = bomb.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  expect(central).toBeGreaterThan(0);
  bomb.writeUInt32LE(40 * 1024 * 1024, central + 24);
  expect(
    (
      await staff.client.post(`${base}/import`, {
        headers: xlsxHeaders,
        data: bomb,
      })
    ).status(),
  ).toBe(413);
  expect(
    (
      await staff.client.post(`${base}/import`, {
        headers: xlsxHeaders,
        data: await workbook([
          ["Nama", "Jabatan"],
          ...Array.from({ length: 1001 }, () => ["Uji", "Panitia"]),
        ]),
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await staff.client.post(`${base}/generate`, {
        headers,
        data: {
          kind: "committee",
          recipients: [{ name: "", position: "Ketua" }],
        },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await staff.client.post(`${base}/generate`, {
        headers,
        data: {
          kind: "committee",
          number: "002",
          recipients: [{ name: "Uji", position: "Ketua" }],
        },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await staff.client.post(`${base}/generate`, {
        headers,
        data: {
          kind: "committee",
          recipients: Array.from({ length: 201 }, () => ({
            name: "Uji",
            position: "Panitia",
          })),
        },
      })
    ).status(),
  ).toBe(422);

  const page = await staff.context.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/sertifikat");
  await page
    .getByRole("button", { name: "Sertifikat panitia", exact: true })
    .click();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "invalid.xlsx",
    mimeType: xlsxHeaders["Content-Type"],
    buffer: await workbook([
      ["Nama", "Jabatan"],
      ["Belum lengkap", null],
    ]),
  });
  await expect(page.getByText("1 baris perlu diperbaiki")).toBeVisible();
  await expect(page.getByRole("button", { name: /Unduh PDF/ })).toBeDisabled();
  await fileInput.setInputFiles({
    name: "panitia.xlsx",
    mimeType: xlsxHeaders["Content-Type"],
    buffer: bytes,
  });
  await expect(page.getByText(longName, { exact: true })).toBeVisible();
  await expect(page.getByText("1 baris perlu diperbaiki")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Pilih hasil filter", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unduh PDF (3)" }),
  ).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("sertifikat-panitia-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("sertifikat-panitia-mobile.png"),
    fullPage: true,
  });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Unduh PDF (3)" }).click(),
  ]);
  await download.saveAs(testInfo.outputPath("sertifikat-panitia.pdf"));
  const pdf = await staff.client.post(`${base}/generate`, {
    headers,
    data: {
      kind: "committee",
      recipients: data.recipients.map(({ name, position }) => ({
        name,
        position,
      })),
    },
  });
  expect(pdf.status(), await pdf.text()).toBe(200);
  checkPdf(await pdf.body(), 3);
  expect(pdf.headers()["cache-control"]).toContain("no-store");
  const previewResponse = page.waitForResponse((response) =>
    response.url().endsWith(`${base}/generate`),
  );
  await page
    .getByRole("button", {
      name: "Pratinjau Éléonore Putri baris 2",
      exact: true,
    })
    .click();
  const preview = await previewResponse;
  expect(preview.status()).toBe(200);
  await expect(
    page.locator("iframe[title='Sertifikat Éléonore Putri']"),
  ).toHaveAttribute("src", /^blob:/);
  // Chromium's PDF viewer can consume the network body before CDP exposes it.
  // Check the actual browser Blob used by the preview instead.
  const previewContent = await page.evaluate(async () => {
    const frame = document.querySelector("iframe")!;
    const response = await fetch(frame.src.split("#")[0]);
    const text = await response.text();
    return {
      prefix: text.slice(0, 5),
      pages: (text.match(/\/Type \/Page\b/g) || []).length,
      number: text.includes("001/0803/KBP/2026"),
    };
  });
  expect(previewContent).toEqual({ prefix: "%PDF-", pages: 1, number: true });
  const after = await query('SELECT count(*)::int AS total FROM "user"');
  expect(after.rows).toEqual(before.rows);
  await staff.context.close();
});

async function completeRegistration(client: APIRequestContext) {
  const created = await client.post("/api/registrations", { headers });
  expect(created.status()).toBe(201);
  const reg = (await created.json()).data as Registration;
  reg.school = {
    ...reg.school,
    name: `Sekolah Sertifikat ${reg.id.slice(0, 8)}`,
    contact: "Pembina Uji",
    phone: "081234567890",
    city: "Kepenuhan",
    district: "Kepenuhan",
  };
  reg.patrols = (["Putri", "Putra"] as const).map((category) => {
    const members = Array.from({ length: 15 }, (_, i) => ({
      id: randomUUID(),
      name: i < 2 ? "NAMA keMbAr" : `Peserta ${category} ${i + 1}`,
      base: reg.school.name,
      className: "7A",
      photo: "",
      photoId: null,
      zoom: 1,
      x: 50,
      y: 50,
    }));
    return {
      id: randomUUID(),
      category,
      name: category === "Putri" ? "Melati" : "Elang",
      companion: "",
      phone: "",
      leaderId: members[0].id,
      participants: members,
    };
  });
  const saved = await client.put(`/api/registrations/${reg.id}`, {
    headers,
    data: draftPayload(reg),
  });
  expect(saved.status(), await saved.text()).toBe(200);
  return (await saved.json()).data as Registration;
}

test("participant certificates use verified snapshots, include all pages, and preserve registration data", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const staff = await actor(browser, true),
    owner = await actor(browser),
    draftOwner = await actor(browser);
  const workspace = (
    await (await staff.client.get("/api/admin/camp/workspace")).json()
  ).data;
  expect(
    (
      await staff.client.put("/api/admin/camp/event", {
        headers,
        data: {
          revision: workspace.eventRevision,
          settings: {
            ...workspace.event,
            opens: "2020-01-01T00:00",
            closes: "2099-12-31T23:59",
          },
        },
      })
    ).status(),
  ).toBe(200);
  const reg = await completeRegistration(owner.client);
  const draft = await completeRegistration(draftOwner.client);
  expect(
    (
      await owner.client.post(`/api/registrations/${reg.id}/submit`, {
        headers,
        data: { revision: reg.revision, acknowledged: true },
      })
    ).status(),
  ).toBe(200);
  const submitted = (
    await (await owner.client.get(`/api/registrations/${reg.id}`)).json()
  ).data as Registration;
  const decision = await staff.client.post(
    `/api/admin/registrations/${reg.id}/decision`,
    {
      headers,
      data: { revision: submitted.revision, status: "Terverifikasi", note: "" },
    },
  );
  expect(decision.status(), await decision.text()).toBe(200);
  const before = await query(
    "SELECT to_jsonb(r) AS data FROM registrations r WHERE id = $1",
    [reg.id],
  );
  const listed = await staff.client.get(`${base}/participants`);
  const people = ((await listed.json()).data as CertificateRecipient[]).filter(
    (p) => p.registrationId === reg.id,
  );
  expect(people).toHaveLength(30);
  expect(people.filter((p) => p.name === "NAMA keMbAr")).toHaveLength(4);
  expect(new Set(people.map((p) => p.key)).size).toBe(30);
  expect(people.every((p) => p.position === "Peserta")).toBe(true);
  const pdf = await staff.client.post(`${base}/generate`, {
    headers,
    data: { kind: "participants", ids: people.map((p) => p.key) },
  });
  expect(pdf.status(), await pdf.text()).toBe(200);
  checkPdf(await pdf.body(), 30);
  await writeFile(
    testInfo.outputPath("sertifikat-peserta.pdf"),
    await pdf.body(),
  );
  for (const ids of [[draft.patrols[0].participants[0].id], [randomUUID()]])
    expect(
      (
        await staff.client.post(`${base}/generate`, {
          headers,
          data: { kind: "participants", ids },
        })
      ).status(),
    ).toBe(409);
  expect(
    (
      await staff.client.post(`${base}/generate`, {
        headers,
        data: { kind: "participants", ids: [people[0].key, people[0].key] },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await staff.client.post(`${base}/generate`, {
        headers,
        data: {
          kind: "participants",
          ids: [people[0].key],
          name: "Nama palsu",
        },
      })
    ).status(),
  ).toBe(422);
  const after = await query(
    "SELECT to_jsonb(r) AS data FROM registrations r WHERE id = $1",
    [reg.id],
  );
  expect(after.rows).toEqual(before.rows);

  const page = await staff.context.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/sertifikat");
  await page
    .locator(".certificate-filters select")
    .first()
    .selectOption(reg.id);
  await expect(
    page.getByText("30 penerima sesuai filter · 0 dipilih"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pilih hasil filter", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unduh PDF (30)" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Berikutnya", exact: true }).click();
  await expect(page.locator(".certificate-table tbody tr")).toHaveCount(10);
  await expect(
    page.locator('.certificate-table input[type="checkbox"]:checked'),
  ).toHaveCount(10);
  await page
    .locator(".certificate-filters select")
    .nth(1)
    .selectOption(reg.patrols[1].id);
  await expect(
    page.getByText("15 penerima sesuai filter · 30 dipilih"),
  ).toBeVisible();
  await expect(page.getByText("Nama Kembar", { exact: true })).toHaveCount(2);
  await page.screenshot({
    path: testInfo.outputPath("sertifikat-peserta-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("sertifikat-peserta-mobile.png"),
    fullPage: true,
  });
  const current = (
    await (await staff.client.get(`/api/admin/registrations/${reg.id}`)).json()
  ).data;
  expect(
    (
      await staff.client.post(`/api/admin/registrations/${reg.id}/decision`, {
        headers,
        data: {
          revision: current.revision,
          status: "Perlu perbaikan",
          note: "Perbaiki nama",
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await staff.client.post(`${base}/generate`, {
        headers,
        data: { kind: "participants", ids: [people[0].key] },
      })
    ).status(),
  ).toBe(409);
  await staff.context.close();
  await owner.context.close();
  await draftOwner.context.close();
});
