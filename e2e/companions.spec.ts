import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import sharp from "sharp";
import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
} from "@playwright/test";
import { verifyAccount } from "./mail-helpers";
import { draftPayload } from "@/lib/camp/payload";
import type { Companion, Registration } from "@/lib/camp/types";
import type { CertificateRecipient } from "@/lib/camp/certificates";

const origin = "http://localhost:3101";
const headers = { Origin: origin };
const certificateBase = "/api/admin/certificates";
test.use({ actionTimeout: 15_000 });
async function query(sql: string, values: unknown[] = []) {
  if (!process.env.STARTER_TEST_RUN?.startsWith("starter-pg-test-"))
    throw new Error("Isolated database required");
  const pool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
  });
  try {
    return await pool.query(sql, values);
  } finally {
    await pool.end();
  }
}
async function actor(browser: Browser, staff = false) {
  const context = await browser.newContext({ baseURL: origin });
  const email = `companion-${randomUUID()}@example.com`;
  const credentials = {
    name: "Pengujian Pembina",
    email,
    password: "Companions-test-123!",
  };
  let response = await context.request.post("/api/auth/sign-up/email", {
    headers,
    data: credentials,
  });
  if (response.status() === 429) {
    const seconds = Number(response.headers()["retry-after"] || 10);
    expect(seconds).toBeLessThanOrEqual(10);
    await delay((seconds + 0.1) * 1000);
    response = await context.request.post("/api/auth/sign-up/email", {
      headers,
      data: credentials,
    });
  }
  expect(response.status()).toBe(200);
  await verifyAccount(context.request, email);
  if (staff)
    await query('UPDATE "user" SET role = $1 WHERE email = $2', [
      "panitia",
      email,
    ]);
  return { context, client: context.request };
}
const companion = (name: string): Companion => ({
  id: randomUUID(),
  name,
  phone: "",
  photoId: null,
  photo: "",
  zoom: 1,
  x: 50,
  y: 50,
});
async function save(client: APIRequestContext, reg: Registration) {
  const response = await client.put(`/api/registrations/${reg.id}`, {
    headers,
    data: draftPayload(reg),
  });
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()).data as Registration;
}
async function reload(client: APIRequestContext, id: string) {
  return (await (await client.get(`/api/registrations/${id}`)).json())
    .data as Registration;
}
async function create(client: APIRequestContext) {
  const response = await client.post("/api/registrations", { headers });
  expect(response.status()).toBe(201);
  const reg = (await response.json()).data as Registration;
  reg.school = {
    ...reg.school,
    name: `SMP Pembina ${reg.id.slice(0, 8)}`,
    contact: "Kontak sekolah",
    phone: "081234567890",
    city: "Kepenuhan",
    district: "Kepenuhan",
  };
  const members = Array.from({ length: 8 }, (_, i) => ({
    id: randomUUID(),
    name: `Peserta ${i + 1}`,
    base: reg.school.name,
    className: "7A",
    photo: "",
    photoId: null,
    zoom: 1,
    x: 50,
    y: 50,
  }));
  reg.patrols = [
    {
      id: randomUUID(),
      category: "Putri",
      name: "Melati",
      companion: "",
      phone: "",
      companions: [
        companion("sATYA SATRIA shiddiqi"),
        companion("sITI aMINAH"),
      ],
      leaderId: members[0].id,
      participants: members,
    },
  ];
  return save(client, reg);
}
async function openEvent(client: APIRequestContext) {
  const workspace = (
    await (await client.get("/api/admin/camp/workspace")).json()
  ).data;
  const response = await client.put("/api/admin/camp/event", {
    headers,
    data: {
      revision: workspace.eventRevision,
      settings: {
        ...workspace.event,
        opens: "2020-01-01T00:00",
        closes: "2099-12-31T23:59",
      },
    },
  });
  expect(response.status()).toBe(200);
}
async function approve(
  owner: APIRequestContext,
  staff: APIRequestContext,
  reg: Registration,
) {
  const submit = await owner.post(`/api/registrations/${reg.id}/submit`, {
    headers,
    data: { revision: reg.revision, acknowledged: true },
  });
  expect(submit.status(), await submit.text()).toBe(200);
  const submitted = await reload(owner, reg.id);
  const decision = await staff.post(
    `/api/admin/registrations/${reg.id}/decision`,
    {
      headers,
      data: { revision: submitted.revision, status: "Terverifikasi", note: "" },
    },
  );
  expect(decision.status(), await decision.text()).toBe(200);
  return reload(owner, reg.id);
}
async function photoStart(
  client: APIRequestContext,
  reg: Registration,
  id = reg.patrols[0].companions![0].id,
) {
  const response = await client.post(
    `/api/registrations/${reg.id}/companion-photos`,
    { headers, data: { revision: reg.revision, companionId: id } },
  );
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).data.id as string;
}
async function photoBytes() {
  return sharp({
    create: { width: 360, height: 480, channels: 3, background: "#276d83" },
  })
    .png()
    .toBuffer();
}
type Cards = {
  version: number;
  status: string;
  data: { id: string; imageUrl: string; name: string }[];
};

test("companion drafts and optional photos enforce validation, origin and ownership without losing siblings", async ({
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const regId = randomUUID(),
    photoId = randomUUID(),
    childId = randomUUID();
  const photoBase = `/api/registrations/${regId}/companion-photos`;
  for (const [method, url] of [
    ["POST", photoBase],
    ["GET", `${photoBase}/${photoId}`],
    ["PUT", `${photoBase}/${photoId}`],
    ["DELETE", `${photoBase}/${photoId}`],
    ["GET", `/api/admin/registrations/${regId}/companion-photos/${photoId}`],
    ["GET", `/api/admin/registrations/${regId}/companions/${childId}/card`],
    ["GET", `${certificateBase}/companions`],
  ]) {
    const response = await request.fetch(url, { method, headers });
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  const owner = await actor(browser),
    other = await actor(browser),
    staff = await actor(browser, true);
  await openEvent(staff.client);
  let reg = await create(owner.client);
  const otherReg = await create(other.client);
  const endpoint = `/api/registrations/${reg.id}`;
  const photos = `${endpoint}/companion-photos`;
  expect(reg.patrols[0].participants).toHaveLength(8);
  expect(reg.patrols[0].companions).toHaveLength(2);
  expect(reg.patrols[0].companion).toBe("sATYA SATRIA shiddiqi");
  for (const url of [
    `${certificateBase}/companions`,
    `/api/admin/registrations/${reg.id}/cards?kind=companions`,
    `/api/admin/registrations/${reg.id}/companions/${reg.patrols[0].companions![0].id}/card`,
  ])
    expect((await owner.client.get(url)).status()).toBe(403);
  expect(
    (
      await other.client.post(photos, {
        headers,
        data: {
          revision: reg.revision,
          companionId: reg.patrols[0].companions![0].id,
        },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await owner.client.post(photos, {
        headers: { Origin: "https://other.example" },
        data: {
          revision: reg.revision,
          companionId: reg.patrols[0].companions![0].id,
        },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await owner.client.post(photos, {
        headers,
        data: {
          revision: reg.revision,
          companionId: otherReg.patrols[0].companions![0].id,
        },
      })
    ).status(),
  ).toBe(404);
  const legacy = {
    ...draftPayload(reg),
    patrols: draftPayload(reg).patrols.map((p) => ({
      ...p,
      companions: undefined,
    })),
  };
  expect(
    (await owner.client.put(endpoint, { headers, data: legacy })).status(),
  ).toBe(409);
  const duplicate = structuredClone(reg);
  duplicate.patrols[0].companions![1].id =
    duplicate.patrols[0].companions![0].id;
  expect(
    (
      await owner.client.put(endpoint, {
        headers,
        data: draftPayload(duplicate),
      })
    ).status(),
  ).toBe(422);
  const tooMany = structuredClone(reg);
  tooMany.patrols[0].companions = Array.from({ length: 21 }, () =>
    companion("Pembina"),
  );
  expect(
    (
      await owner.client.put(endpoint, { headers, data: draftPayload(tooMany) })
    ).status(),
  ).toBe(422);
  const stolen = structuredClone(reg);
  stolen.patrols[0].companions![0].id = otherReg.patrols[0].companions![0].id;
  expect(
    (
      await owner.client.put(endpoint, { headers, data: draftPayload(stolen) })
    ).status(),
  ).toBe(422);
  expect((await reload(owner.client, reg.id)).patrols[0].companions).toEqual(
    reg.patrols[0].companions,
  );
  const pending = await photoStart(owner.client, reg);
  expect(
    (
      await owner.client.post(`${endpoint}/submit`, {
        headers,
        data: { revision: reg.revision, acknowledged: true },
      })
    ).status(),
  ).toBe(409);
  expect(
    (await other.client.delete(`${photos}/${pending}`, { headers })).status(),
  ).toBe(404);
  expect(
    (
      await owner.client.delete(`${photos}/${pending}`, {
        headers: { Origin: "https://other.example" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (await owner.client.delete(`${photos}/${pending}`, { headers })).status(),
  ).toBe(204);
  expect(
    (
      await owner.client.put(`${photos}/${pending}`, {
        headers,
        data: await photoBytes(),
      })
    ).status(),
  ).toBe(409);
  const invalid = await photoStart(owner.client, reg);
  expect(
    (
      await owner.client.put(`${photos}/${invalid}`, {
        headers,
        data: Buffer.from("not an image"),
      })
    ).status(),
  ).toBe(422);
  const valid = await photoStart(owner.client, reg);
  expect(
    (
      await other.client.put(`${photos}/${valid}`, {
        headers,
        data: await photoBytes(),
      })
    ).status(),
  ).toBe(404);
  const uploaded = await owner.client.put(`${photos}/${valid}`, {
    headers,
    data: await photoBytes(),
  });
  expect(uploaded.status(), await uploaded.text()).toBe(200);
  expect(
    (await owner.client.get(`${photos}/${valid}`)).headers()["content-type"],
  ).toBe("image/webp");
  expect((await other.client.get(`${photos}/${valid}`)).status()).toBe(404);
  expect(
    (
      await staff.client.get(
        `/api/admin/registrations/${reg.id}/companion-photos/${valid}`,
      )
    ).status(),
  ).toBe(200);
  const wrongChild = structuredClone(reg);
  wrongChild.patrols[0].companions![1].photoId = valid;
  expect(
    (
      await owner.client.put(endpoint, {
        headers,
        data: draftPayload(wrongChild),
      })
    ).status(),
  ).toBe(422);
  reg.patrols[0].companions![0] = {
    ...reg.patrols[0].companions![0],
    photoId: valid,
    zoom: 1.5,
    x: 30,
    y: 70,
    phone: "0812 3456 7890",
  };
  reg = await save(owner.client, reg);
  reg.school.notes = "Simpan kedua kali tidak menghilangkan foto pembina";
  reg = await save(owner.client, reg);
  expect(reg.patrols[0].companions![0]).toMatchObject({
    photoId: valid,
    zoom: 1.5,
    x: 30,
    y: 70,
    phone: "+6281234567890",
  });
  expect(reg.patrols[0].companions![1].photoId).toBeNull();
  // Blank rows may be kept in drafts, but cannot be submitted.
  reg.patrols[0].companions!.push(companion(""));
  reg = await save(owner.client, reg);
  expect(
    (
      await owner.client.post(`${endpoint}/submit`, {
        headers,
        data: { revision: reg.revision, acknowledged: true },
      })
    ).status(),
  ).toBe(422);
  reg.patrols[0].companions!.pop();
  reg = await save(owner.client, reg);
  reg = await approve(owner.client, staff.client, reg);
  expect(reg.version).toBe(1);
  expect(
    (
      await owner.client.post(photos, {
        headers,
        data: {
          revision: reg.revision,
          companionId: reg.patrols[0].companions![0].id,
        },
      })
    ).status(),
  ).toBe(409);
  await Promise.all([
    owner.context.close(),
    other.context.close(),
    staff.context.close(),
  ]);
});

test("form supports multiple companions and verified snapshots generate cards and certificates, then revoke on revision", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const owner = await actor(browser),
    staff = await actor(browser, true);
  await openEvent(staff.client);
  let reg = await create(owner.client);
  const page = await owner.context.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/app/pendaftaran");
  await page.getByRole("button", { name: "Simpan & lanjutkan" }).click();
  const section = page.getByRole("region", {
    name: "Pembina pendamping regu Melati",
  });
  await expect(section.getByLabel("Nama pembina 1")).toHaveValue(
    "sATYA SATRIA shiddiqi",
  );
  await section.getByRole("button", { name: "Tambah pembina" }).click();
  await section.getByLabel("Nama pembina 3").fill("Pembina sementara");
  await section
    .getByRole("button", { name: "Hapus pembina 3 regu Melati" })
    .click();
  await expect(section.getByLabel("Nama pembina 3")).toHaveCount(0);
  await section.getByLabel("WhatsApp pembina 1").fill("081234567890");
  await section
    .getByLabel("Foto pembina 1 regu Melati", { exact: true })
    .setInputFiles({
      name: "pembina.png",
      mimeType: "image/png",
      buffer: await photoBytes(),
    });
  await expect(
    section.getByLabel("Pembesaran foto pembina 1", { exact: true }),
  ).toBeVisible();
  const zoom = section.getByLabel("Pembesaran foto pembina 1", { exact: true });
  await zoom.focus();
  await zoom.press("ArrowRight");
  const saveResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/api/registrations/${reg.id}`) &&
      r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  expect((await saveResponse).status()).toBe(200);
  reg = await reload(owner.client, reg.id);
  expect(reg.patrols[0].companions).toHaveLength(2);
  expect(reg.patrols[0].companions![0]).toMatchObject({
    zoom: 1.05,
    phone: "+6281234567890",
  });
  expect(reg.patrols[0].companions![0].photoId).toBeTruthy();
  expect(reg.patrols[0].companions![1].photoId).toBeNull();
  expect(reg.patrols[0].participants).toHaveLength(8);
  await page.screenshot({
    path: testInfo.outputPath("pembina-form-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("pembina-form-mobile.png"),
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: "Simpan & lanjutkan" }).click();
  await expect(section.getByLabel("Nama pembina 2")).toHaveValue("sITI aMINAH");
  reg = await reload(owner.client, reg.id);
  const cardsUrl = `/api/admin/registrations/${reg.id}/cards?kind=companions`;
  expect((await staff.client.get(cardsUrl)).status()).toBe(404);
  expect(
    (
      (await (await staff.client.get(`${certificateBase}/companions`)).json())
        .data as CertificateRecipient[]
    ).filter((p) => p.registrationId === reg.id),
  ).toHaveLength(0);
  reg = await approve(owner.client, staff.client, reg);
  const before = await query(
    "SELECT snapshot FROM registration_approvals WHERE registration_id = $1 AND active",
    [reg.id],
  );
  expect(before.rows[0].snapshot.patrols[0].companions).toHaveLength(2);
  const cardsResponse = await staff.client.get(cardsUrl);
  expect(cardsResponse.status()).toBe(200);
  const cards = (await cardsResponse.json()) as Cards;
  expect(cards.data.map((c) => c.name)).toEqual([
    "Satya Satria Shiddiqi",
    "Siti Aminah",
  ]);
  const images: Buffer[] = [];
  for (const [i, card] of cards.data.entries()) {
    const response = await staff.client.get(card.imageUrl);
    expect(response.status(), await response.text()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const bytes = await response.body();
    const metadata = await sharp(bytes).metadata();
    expect([metadata.width, metadata.height]).toEqual([650, 1005]);
    expect(metadata.xmp?.toString()).toContain("companion-card-v1");
    images.push(bytes);
    await writeFile(testInfo.outputPath(`id-card-pembina-${i + 1}.png`), bytes);
  }
  // Uploaded portrait and optional-photo fallback must produce different portraits.
  const crops = await Promise.all(
    images.map((bytes) =>
      sharp(bytes)
        .extract({ left: 240, top: 340, width: 170, height: 170 })
        .raw()
        .toBuffer(),
    ),
  );
  expect(crops[0].equals(crops[1])).toBe(false);
  const recipients = (
    (await (await staff.client.get(`${certificateBase}/companions`)).json())
      .data as CertificateRecipient[]
  ).filter((p) => p.registrationId === reg.id);
  expect(recipients.map((p) => p.position)).toEqual([
    "Pembina Pendamping",
    "Pembina Pendamping",
  ]);
  const pdf = await staff.client.post(`${certificateBase}/generate`, {
    headers,
    data: { kind: "companions", ids: recipients.map((p) => p.key) },
  });
  expect(pdf.status(), await pdf.text()).toBe(200);
  const bytes = await pdf.body();
  expect(bytes.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(2);
  expect(bytes.toString("latin1")).toContain("001/0803/KBP/2026");
  expect(bytes.toString("latin1")).toContain("LeagueSpartan-Bold");
  await writeFile(testInfo.outputPath("sertifikat-pembina.pdf"), bytes);
  await expect
    .poll(
      async () =>
        (
          await owner.client.get(`/api/registrations/${reg.id}/document`)
        ).status(),
      { timeout: 60_000, intervals: [500, 1000] },
    )
    .toBe(200);
  const form = await owner.client.get(`/api/registrations/${reg.id}/document`);
  expect(
    (await form.body()).includes(
      Buffer.from("registration-form-v5-companions"),
    ),
  ).toBe(true);
  await writeFile(
    testInfo.outputPath("formulir-pembina.pdf"),
    await form.body(),
  );
  const adminPage = await staff.context.newPage();
  await adminPage.setViewportSize({ width: 1440, height: 1000 });
  await adminPage.goto(`/admin/pendaftaran/${reg.id}/id-card`);
  await expect(
    adminPage.getByRole("img", { name: /ID card peserta PESERTA 1/i }),
  ).toBeVisible();
  await expect(
    adminPage.getByRole("img", { name: /ID card pembina Satya Satria Shiddiqi/ }),
  ).toBeVisible();
  await expect(
    adminPage.getByRole("button", { name: "Cetak semua kartu" }),
  ).toBeEnabled();
  await adminPage.screenshot({
    path: testInfo.outputPath("id-card-pembina-desktop.png"),
    fullPage: true,
  });
  await adminPage.setViewportSize({ width: 390, height: 844 });
  expect(
    await adminPage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await adminPage.screenshot({
    path: testInfo.outputPath("id-card-pembina-mobile.png"),
    fullPage: true,
  });
  await adminPage.goto("/admin/sertifikat");
  await adminPage
    .getByRole("button", { name: "Sertifikat pembina", exact: true })
    .click();
  await adminPage.getByLabel("Sekolah", { exact: true }).selectOption(reg.id);
  await expect(
    adminPage.getByText("Satya Satria Shiddiqi", { exact: true }),
  ).toBeVisible();
  await adminPage
    .getByRole("button", { name: "Pilih hasil filter", exact: true })
    .click();
  const [download] = await Promise.all([
    adminPage.waitForEvent("download"),
    adminPage.getByRole("button", { name: "Unduh PDF (2)" }).click(),
  ]);
  await download.saveAs(testInfo.outputPath("sertifikat-pembina-ui.pdf"));
  await adminPage
    .getByRole("button", { name: "Pratinjau Siti Aminah", exact: true })
    .click();
  await expect(
    adminPage.locator("iframe[title='Sertifikat Siti Aminah']"),
  ).toHaveAttribute("src", /^blob:/);
  await adminPage.screenshot({
    path: testInfo.outputPath("sertifikat-pembina-mobile.png"),
    fullPage: true,
  });
  const after = await query(
    "SELECT snapshot FROM registration_approvals WHERE registration_id = $1 AND active",
    [reg.id],
  );
  expect(after.rows).toEqual(before.rows);
  const revise = await staff.client.post(
    `/api/admin/registrations/${reg.id}/decision`,
    {
      headers,
      data: {
        revision: reg.revision,
        status: "Perlu perbaikan",
        note: "Tambahkan pembina pendamping baru",
      },
    },
  );
  expect(revise.status(), await revise.text()).toBe(200);
  expect((await staff.client.get(cardsUrl)).status()).toBe(404);
  expect((await staff.client.get(cards.data[0].imageUrl)).status()).toBe(404);
  expect(
    (
      await staff.client.post(`${certificateBase}/generate`, {
        headers,
        data: { kind: "companions", ids: recipients.map((p) => p.key) },
      })
    ).status(),
  ).toBe(409);
  reg = await reload(owner.client, reg.id);
  reg.patrols[0].companions!.push(companion("Budi Santoso"));
  reg = await save(owner.client, reg);
  reg = await approve(owner.client, staff.client, reg);
  expect(reg.version).toBe(2);
  const current = (await (await staff.client.get(cardsUrl)).json()) as Cards;
  expect(current.version).toBe(2);
  expect(current.data).toHaveLength(3);
  expect((await staff.client.get(current.data[0].imageUrl)).status()).toBe(200);
  expect(
    (
      await query(
        "SELECT active FROM registration_approvals WHERE registration_id = $1 ORDER BY version",
        [reg.id],
      )
    ).rows.map((r) => r.active),
  ).toEqual([false, true]);
  await Promise.all([owner.context.close(), staff.context.close()]);
});

test("legacy approved snapshots keep one companion available without rewriting data or approving again", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const owner = await actor(browser),
    staff = await actor(browser, true);
  await openEvent(staff.client);
  let reg = await create(owner.client);
  reg.patrols[0].companions = [companion("pEMBINA LAMA")];
  reg = await save(owner.client, reg);
  reg = await approve(owner.client, staff.client, reg);
  const {
    rows: [approval],
  } = await query(
    "SELECT * FROM registration_approvals WHERE registration_id = $1 AND active",
    [reg.id],
  );
  const legacy = structuredClone(approval.snapshot) as Registration;
  legacy.patrols.forEach((p) => {
    delete p.companions;
  });
  await query("UPDATE registration_approvals SET snapshot = $1 WHERE id = $2", [
    JSON.stringify(legacy),
    approval.id,
  ]);
  const before = await query(
    "SELECT * FROM registration_approvals WHERE registration_id = $1",
    [reg.id],
  );
  const cards = (await (
    await staff.client.get(
      `/api/admin/registrations/${reg.id}/cards?kind=companions`,
    )
  ).json()) as Cards;
  expect(cards.data).toHaveLength(1);
  expect(cards.data[0]).toMatchObject({
    id: reg.patrols[0].id,
    name: "Pembina Lama",
  });
  expect((await staff.client.get(cards.data[0].imageUrl)).status()).toBe(200);
  const recipients = (
    (await (await staff.client.get(`${certificateBase}/companions`)).json())
      .data as CertificateRecipient[]
  ).filter((p) => p.registrationId === reg.id);
  expect(recipients.map((p) => p.key)).toEqual([reg.patrols[0].id]);
  expect(
    (
      await staff.client.post(`${certificateBase}/generate`, {
        headers,
        data: { kind: "companions", ids: [reg.patrols[0].id] },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await query(
        "SELECT * FROM registration_approvals WHERE registration_id = $1",
        [reg.id],
      )
    ).rows,
  ).toEqual(before.rows);
  // Legacy one-companion payloads remain valid and cannot erase its optional photo/crop.
  const revise = await staff.client.post(
    `/api/admin/registrations/${reg.id}/decision`,
    {
      headers,
      data: {
        revision: reg.revision,
        status: "Perlu perbaikan",
        note: "Periksa nama",
      },
    },
  );
  expect(revise.status()).toBe(200);
  reg = await reload(owner.client, reg.id);
  const payload = {
    ...draftPayload(reg),
    patrols: draftPayload(reg).patrols.map((p) => ({
      ...p,
      companions: undefined,
      companion: "Pembina Lama Diperbarui",
    })),
  };
  const saved = await owner.client.put(`/api/registrations/${reg.id}`, {
    headers,
    data: payload,
  });
  expect(saved.status(), await saved.text()).toBe(200);
  expect((await saved.json()).data.patrols[0].companions).toHaveLength(1);
  await Promise.all([owner.context.close(), staff.context.close()]);
});
