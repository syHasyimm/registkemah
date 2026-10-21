import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import sharp from "sharp";
import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
} from "@playwright/test";
import { verifyAccount, testMail } from "./mail-helpers";
import { draftPayload } from "@/lib/camp/payload";
import type { Registration } from "@/lib/camp/types";
const origin = "http://localhost:3101";
const headers = { Origin: origin };

async function actor(browser: Browser, admin = false) {
  const context = await browser.newContext({ baseURL: origin });
  const client = context.request;
  const email = `camp-${randomUUID()}@example.com`,
    password = "Camp-test-password-123!";
  const credentials = {
    name: admin ? "Panitia Uji" : "Pembina Uji",
    email,
    password,
  };
  let signup = await client.post("/api/auth/sign-up/email", {
    headers,
    data: credentials,
  });
  if (signup.status() === 429) {
    const wait = Number(signup.headers()["retry-after"] || 10);
    expect(wait).toBeLessThanOrEqual(10);
    await delay((wait + 0.1) * 1000);
    signup = await client.post("/api/auth/sign-up/email", {
      headers,
      data: credentials,
    });
  }
  expect(signup.status()).toBe(200);
  await verifyAccount(client, email);
  if (admin) {
    const pool = new Pool({
      connectionString: process.env.STARTER_TEST_DATABASE_URL,
    });
    try {
      await pool.query('UPDATE "user" SET role = $1 WHERE email = $2', [
        "panitia",
        email,
      ]);
    } finally {
      await pool.end();
    }
  }
  return { context, client, email, password };
}
async function create(client: APIRequestContext) {
  const response = await client.post("/api/registrations", { headers });
  expect(response.status()).toBe(201);
  return (await response.json()).data as Registration;
}
function fill(registration: Registration, count = 8) {
  const reg = structuredClone(registration);
  reg.school = {
    ...reg.school,
    name: "SMP Pengujian Nusantara",
    contact: "Pembina Pengujian",
    phone: "081234567890",
    city: "Padang",
    district: "Kuranji",
    address: "Jalan Pendidikan No. 1",
    npsn: "",
    girlNumber: "01.001",
    notes: "Membawa formulir saat registrasi fisik.",
  };
  reg.patrols = [
    {
      id: randomUUID(),
      category: "Putri",
      name: "Melati",
      companion: "",
      phone: "",
      leaderId: "",
      participants: Array.from({ length: count }, (_, i) => ({
        id: randomUUID(),
        name: i ? `Peserta ${i + 1}` : "Aulia Putri Éléonore",
        base: "SMP Pengujian Nusantara",
        className: "7A",
        photo: "",
        photoId: null,
        zoom: 1,
        x: 50,
        y: 50,
      })),
    },
  ];
  reg.patrols[0].leaderId = reg.patrols[0].participants[0].id;
  return reg;
}
async function save(client: APIRequestContext, reg: Registration) {
  const response = await client.put(`/api/registrations/${reg.id}`, {
    headers,
    data: draftPayload(reg),
  });
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()).data as Registration;
}
async function eventPeriod(client: APIRequestContext, open = true) {
  const workspace = (
    await (await client.get("/api/admin/camp/workspace")).json()
  ).data;
  const response = await client.put("/api/admin/camp/event", {
    headers,
    data: {
      revision: workspace.eventRevision,
      settings: {
        ...workspace.event,
        name: "Perkemahan Pengujian",
        location: "Bumi Perkemahan Pengujian",
        opens: "2020-01-01T00:00",
        closes: open ? "2099-12-31T23:59" : "2020-02-01T00:00",
        contactName: "Panitia Pengujian",
        contactPhone: "081234567890",
      },
    },
  });
  expect(response.status()).toBe(200);
}

test("camp APIs require a session and admin APIs separately require permissions", async ({
  request,
  browser,
}) => {
  const id = randomUUID();
  for (const [method, path] of [
    ["GET", "/api/camp/workspace"],
    ["POST", "/api/registrations"],
    ["GET", `/api/registrations/${id}`],
    ["PUT", `/api/registrations/${id}`],
    ["POST", `/api/registrations/${id}/submit`],
    ["GET", `/api/registrations/${id}/document`],
    ["GET", "/api/admin/registrations"],
    ["GET", `/api/admin/registrations/${id}/cards`],
  ]) {
    const response = await request.fetch(path, { method, headers });
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  const owner = await actor(browser);
  for (const path of [
    "/api/admin/camp/workspace",
    "/api/admin/registrations",
    "/api/admin/registrations/export?kind=participants",
    `/api/admin/registrations/${id}/cards`,
  ])
    expect((await owner.client.get(path)).status()).toBe(403);
  await owner.context.close();
});

test("persisted registration, private photos, approval jobs, PDF, email, card access and revision versions", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const owner = await actor(browser),
    other = await actor(browser),
    admin = await actor(browser, true);
  await eventPeriod(admin.client);
  const publicPage = await owner.client.get("/");
  expect(await publicPage.text()).toContain("Perkemahan Pengujian");
  const settings = (
    await (await admin.client.get("/api/admin/camp/workspace")).json()
  ).data;
  expect(
    (
      await admin.client.put("/api/admin/camp/event", {
        headers,
        data: {
          revision: settings.eventRevision,
          settings: {
            ...settings.event,
            eventStart: "2026-02-30",
            eventEnd: "2026-03-02",
          },
        },
      })
    ).status(),
  ).toBe(422);
  let reg = await create(owner.client);
  const again = await create(owner.client);
  expect(again.id).toBe(reg.id);
  expect(
    (await other.client.get(`/api/registrations/${reg.id}`)).status(),
  ).toBe(404);
  expect(
    (
      await other.client.put(`/api/registrations/${reg.id}`, {
        headers,
        data: draftPayload(fill(reg)),
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await other.client.post(`/api/registrations/${reg.id}/submit`, {
        headers,
        data: { revision: 0, acknowledged: true },
      })
    ).status(),
  ).toBe(404);
  const wrongOrigin = await owner.client.put(`/api/registrations/${reg.id}`, {
    headers: { Origin: "https://untrusted.example" },
    data: draftPayload(fill(reg)),
  });
  expect(wrongOrigin.status()).toBe(403);
  expect(
    (
      await owner.client.put(`/api/registrations/${reg.id}`, {
        headers,
        data: { ...draftPayload(fill(reg)), ownerId: "forged" },
      })
    ).status(),
  ).toBe(422);
  reg = await save(owner.client, fill(reg, 7));
  expect(
    (
      await owner.client.post(`/api/registrations/${reg.id}/submit`, {
        headers,
        data: { revision: reg.revision, acknowledged: true },
      })
    ).status(),
  ).toBe(422);
  reg = await save(owner.client, fill(reg, 8));
  // Exercise the real authenticated form, then confirm another request sees its save.
  const page = await owner.context.newPage();
  await page.goto("/app/pendaftaran");
  const schoolName = page.getByRole("textbox", {
    name: /^Nama sekolah/,
  });
  await expect(schoolName).toHaveValue(reg.school.name);
  await schoolName.fill("SMP Pengujian Nusantara UI");
  const savedInBrowser = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/registrations/${reg.id}`) &&
      response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  expect((await savedInBrowser).status()).toBe(200);
  await expect(
    page.getByText("Draf berhasil disimpan di server."),
  ).toBeVisible();
  await page.reload();
  await expect(schoolName).toHaveValue("SMP Pengujian Nusantara UI");
  reg = (await (await owner.client.get(`/api/registrations/${reg.id}`)).json())
    .data;
  expect(reg.school.name).toBe("SMP Pengujian Nusantara UI");
  await page.screenshot({
    path: testInfo.outputPath("formulir-live.png"),
    fullPage: true,
  });
  await page.close();
  const invalid = await owner.client.post(
    `/api/registrations/${reg.id}/photos`,
    {
      headers,
      data: {
        participantId: reg.patrols[0].participants[0].id,
        revision: reg.revision,
      },
    },
  );
  const badPhotoId = (await invalid.json()).data.id;
  expect(
    (
      await owner.client.put(
        `/api/registrations/${reg.id}/photos/${badPhotoId}`,
        {
          headers: { ...headers, "Content-Type": "image/png" },
          data: Buffer.from("not an image"),
        },
      )
    ).status(),
  ).toBe(422);
  const init = await owner.client.post(`/api/registrations/${reg.id}/photos`, {
    headers,
    data: {
      participantId: reg.patrols[0].participants[0].id,
      revision: reg.revision,
    },
  });
  const photoId = (await init.json()).data.id;
  expect(
    (
      await owner.client.post(`/api/registrations/${reg.id}/submit`, {
        headers,
        data: { revision: reg.revision, acknowledged: true },
      })
    ).status(),
  ).toBe(409);
  const image = await sharp({
    create: { width: 600, height: 400, channels: 3, background: "#99bb88" },
  })
    .png()
    .toBuffer();
  const uploaded = await owner.client.put(
    `/api/registrations/${reg.id}/photos/${photoId}`,
    { headers: { ...headers, "Content-Type": "image/png" }, data: image },
  );
  expect(uploaded.status()).toBe(200);
  const photo = (await uploaded.json()).data;
  reg.patrols[0].participants[0] = {
    ...reg.patrols[0].participants[0],
    ...photo,
    zoom: 1.2,
    x: 30,
    y: 60,
  };
  reg = await save(owner.client, reg);
  const readPhoto = await owner.client.get(photo.photo);
  expect(readPhoto.status()).toBe(200);
  expect(readPhoto.headers()["cache-control"]).toContain("no-store");
  expect((await other.client.get(photo.photo)).status()).toBe(404);
  const forged = await create(other.client);
  const forgedFilled = fill(forged);
  forgedFilled.patrols[0].participants[0].photoId = photoId;
  expect(
    (
      await other.client.put(`/api/registrations/${forged.id}`, {
        headers,
        data: draftPayload(forgedFilled),
      })
    ).status(),
  ).toBe(422);
  const submitted = await Promise.all(
    [1, 2].map(() =>
      owner.client.post(`/api/registrations/${reg.id}/submit`, {
        headers,
        data: { revision: reg.revision, acknowledged: true },
      }),
    ),
  );
  for (const response of submitted) expect(response.status()).toBe(200);
  const submissions = await Promise.all(
    submitted.map((response) => response.json()),
  );
  expect(submissions[0].data.number).toBe(submissions[1].data.number);
  reg = submissions[0].data;
  const query = new URLSearchParams({ q: reg.number, limit: "1" });
  const list = await admin.client.get(`/api/admin/registrations?${query}`);
  const listed = await list.json();
  expect(list.status()).toBe(200);
  expect(listed.meta.total).toBe(1);
  expect(listed.data[0].id).toBe(reg.id);
  const nextPage = await admin.client.get(
    `/api/admin/registrations?${query}&offset=1`,
  );
  expect((await nextPage.json()).data).toHaveLength(0);
  const exported = await admin.client.get(
    `/api/admin/registrations/export?kind=participants&q=${reg.number}`,
  );
  expect(exported.status()).toBe(200);
  const csv = await exported.text();
  expect(csv).toContain("Aulia Putri Éléonore");
  expect(csv).toContain("Peserta 8");
  expect(csv).not.toContain(other.email);
  expect(
    (
      await owner.client.put(`/api/registrations/${reg.id}`, {
        headers,
        data: draftPayload(reg),
      })
    ).status(),
  ).toBe(409);
  const decisions = await Promise.all(
    [1, 2].map(() =>
      admin.client.post(`/api/admin/registrations/${reg.id}/decision`, {
        headers,
        data: {
          revision: reg.revision,
          status: "Terverifikasi",
          note: "Data telah diperiksa.",
        },
      }),
    ),
  );
  for (const response of decisions) expect(response.status()).toBe(200);
  reg = (await decisions[0].json()).data;
  expect(reg.version).toBe(1);
  const pool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
  });
  try {
    const result = await pool.query(
      "SELECT count(*)::int AS total FROM camp_jobs j JOIN registration_approvals a ON a.id = j.approval_id WHERE a.registration_id = $1",
      [reg.id],
    );
    expect(result.rows[0].total).toBe(3);
  } finally {
    await pool.end();
  }
  await expect
    .poll(
      async () =>
        (
          await owner.client.get(`/api/registrations/${reg.id}/document`)
        ).status(),
      { timeout: 60_000, intervals: [500, 1000] },
    )
    .toBe(200);
  const pdf = await owner.client.get(`/api/registrations/${reg.id}/document`);
  const pdfBytes = await pdf.body();
  expect(pdfBytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdfBytes.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(1);
  expect(pdfBytes.includes(Buffer.from("registration-form-v4"))).toBe(true);
  await writeFile(testInfo.outputPath("formulir-v1.pdf"), pdfBytes);
  expect(
    (await other.client.get(`/api/registrations/${reg.id}/document`)).status(),
  ).toBe(404);
  const ownerView = (
    await (await owner.client.get(`/api/registrations/${reg.id}`)).json()
  ).data;
  expect(ownerView.cardStatus).toBeUndefined();
  expect(
    (
      await owner.client.get(`/api/admin/registrations/${reg.id}/cards`)
    ).status(),
  ).toBe(403);
  await expect
    .poll(
      async () =>
        (
          await (
            await admin.client.get(`/api/admin/registrations/${reg.id}/cards`)
          ).json()
        ).data.length,
      { timeout: 60_000, intervals: [500, 1000] },
    )
    .toBe(8);
  const cards = (
    await (
      await admin.client.get(`/api/admin/registrations/${reg.id}/cards`)
    ).json()
  ).data;
  const cardUrl = cards[0].imageUrl;
  const card = await admin.client.get(cardUrl);
  expect(card.status()).toBe(200);
  const uploadedCard = await card.body();
  const pixel = await sharp(uploadedCard)
    .extract({ left: 325, top: 430, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  for (const [index, value] of [153, 187, 136].entries())
    expect(Math.abs(pixel[index] - value)).toBeLessThan(4);
  await writeFile(testInfo.outputPath("kartu-v1.png"), uploadedCard);
  expect((await owner.client.get(cardUrl)).status()).toBe(403);
  const notification = await testMail(owner.email, "Disetujui");
  expect(notification.Text).toContain("/app/pendaftaran/bukti");
  expect(notification.Text).toContain("kartu fisik");
  expect(notification.Text).not.toContain("/cards/");
  // Persisted leases can be recovered after a worker stops; manual retries are audited.
  const jobsPool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
  });
  try {
    const {
      rows: [documentJob],
    } = await jobsPool.query(
      "UPDATE camp_jobs SET status = 'Running', attempts = 1, lease_token = $2, leased_until = now() - interval '1 minute' WHERE approval_id IN (SELECT id FROM registration_approvals WHERE registration_id = $1 AND active) AND kind = 'document' RETURNING id",
      [reg.id, randomUUID()],
    );
    await expect
      .poll(
        async () => {
          const {
            rows: [row],
          } = await jobsPool.query(
            "SELECT status, attempts FROM camp_jobs WHERE id = $1",
            [documentJob.id],
          );
          return row;
        },
        { timeout: 30_000 },
      )
      .toEqual({ status: "Done", attempts: 2 });
    const {
      rows: [emailJob],
    } = await jobsPool.query(
      "UPDATE camp_jobs SET status = 'Failed', last_attempt_at = now() - interval '2 minutes', safe_error = 'Gangguan SMTP untuk pengujian' WHERE approval_id IN (SELECT id FROM registration_approvals WHERE registration_id = $1 AND active) AND kind = 'email' RETURNING id",
      [reg.id],
    );
    const retryPath = `/api/admin/registrations/${reg.id}/retry`;
    expect(
      (
        await admin.client.post(retryPath, { headers, data: { kind: "email" } })
      ).status(),
    ).toBe(200);
    expect([409, 429]).toContain(
      (
        await admin.client.post(retryPath, { headers, data: { kind: "email" } })
      ).status(),
    );
    await expect
      .poll(
        async () => {
          const {
            rows: [row],
          } = await jobsPool.query(
            "SELECT status FROM camp_jobs WHERE id = $1",
            [emailJob.id],
          );
          return row.status;
        },
        { timeout: 30_000 },
      )
      .toBe("Done");
    const {
      rows: [audit],
    } = await jobsPool.query(
      "SELECT count(*)::int AS total FROM camp_job_events WHERE job_id = $1 AND event = 'Manual retry' AND actor_id IS NOT NULL",
      [emailJob.id],
    );
    expect(audit.total).toBe(1);
  } finally {
    await jobsPool.end();
  }
  reg = (
    await (await admin.client.get(`/api/admin/registrations/${reg.id}`)).json()
  ).data;
  expect(
    (
      await admin.client.post(`/api/admin/registrations/${reg.id}/decision`, {
        headers,
        data: { revision: reg.revision, status: "Perlu perbaikan", note: "" },
      })
    ).status(),
  ).toBe(422);
  const revision = await admin.client.post(
    `/api/admin/registrations/${reg.id}/decision`,
    {
      headers,
      data: {
        revision: reg.revision,
        status: "Perlu perbaikan",
        note: "Periksa kembali ejaan nama peserta.",
      },
    },
  );
  expect(revision.status()).toBe(200);
  expect(
    (await owner.client.get(`/api/registrations/${reg.id}/document`)).status(),
  ).toBe(404);
  expect((await admin.client.get(cardUrl)).status()).toBe(404);
  reg = (await (await owner.client.get(`/api/registrations/${reg.id}`)).json())
    .data;
  reg.patrols[0].participants[0].name = "Aulia Nama Diperbaiki";
  reg = await save(owner.client, reg);
  await eventPeriod(admin.client, false);
  expect(
    (
      await owner.client.post(`/api/registrations/${reg.id}/submit`, {
        headers,
        data: { revision: reg.revision, acknowledged: true },
      })
    ).status(),
  ).toBe(409);
  reg = await save(owner.client, reg);
  await eventPeriod(admin.client);
  reg = (
    await (
      await owner.client.post(`/api/registrations/${reg.id}/submit`, {
        headers,
        data: { revision: reg.revision, acknowledged: true },
      })
    ).json()
  ).data;
  const approvedAgain = await admin.client.post(
    `/api/admin/registrations/${reg.id}/decision`,
    {
      headers,
      data: {
        revision: reg.revision,
        status: "Terverifikasi",
        note: "Revisi telah diperiksa.",
      },
    },
  );
  expect(approvedAgain.status()).toBe(200);
  expect((await approvedAgain.json()).data.version).toBe(2);
  await expect
    .poll(
      async () =>
        (
          await owner.client.get(`/api/registrations/${reg.id}/document`)
        ).status(),
      { timeout: 60_000, intervals: [500, 1000] },
    )
    .toBe(200);
  const latestPdf = await owner.client.get(
    `/api/registrations/${reg.id}/document`,
  );
  expect(latestPdf.headers()["content-disposition"]).toContain("v2.pdf");
  expect((await admin.client.get(cardUrl)).status()).toBe(404);
  await owner.context.close();
  await other.context.close();
  await admin.context.close();
});

test("registration PDF separates fifteen boys and girls and refreshes a legacy approved form", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const owner = await actor(browser);
  const admin = await actor(browser, true);
  await eventPeriod(admin.client);
  let reg = fill(await create(owner.client), 15);
  const boys = structuredClone(reg.patrols[0]);
  boys.id = randomUUID();
  boys.category = "Putra";
  boys.name = "Rajawali";
  boys.participants = boys.participants.map((member, index) => ({
    ...member,
    id: randomUUID(),
    name: `Peserta Putra ${index + 1}`,
  }));
  boys.leaderId = boys.participants[0].id;
  reg.patrols.push(boys);
  reg = await save(owner.client, reg);
  const submitted = await owner.client.post(
    `/api/registrations/${reg.id}/submit`,
    {
      headers,
      data: { revision: reg.revision, acknowledged: true },
    },
  );
  expect(submitted.status()).toBe(200);
  reg = (await submitted.json()).data;
  const decision = await admin.client.post(
    `/api/admin/registrations/${reg.id}/decision`,
    {
      headers,
      data: { revision: reg.revision, status: "Terverifikasi", note: "" },
    },
  );
  expect(decision.status()).toBe(200);
  const url = `/api/registrations/${reg.id}/document`;
  await expect
    .poll(async () => (await owner.client.get(url)).status(), {
      timeout: 60_000,
      intervals: [500, 1000],
    })
    .toBe(200);
  const pdf = await owner.client.get(url);
  const bytes = await pdf.body();
  expect(bytes.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(2);
  expect(bytes.toString("latin1")).toContain("/Subtype /Image");
  await writeFile(testInfo.outputPath("formulir-putra-putri.pdf"), bytes);

  const pool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
  });
  try {
    await expect
      .poll(
        async () => {
          const response = await admin.client.get(
            `/api/admin/registrations/${reg.id}/cards`,
          );
          return (await response.json()).data.length;
        },
        { timeout: 60_000, intervals: [500, 1000] },
      )
      .toBe(30);
    const cards: {
      id: string;
      category: "Putra" | "Putri";
      imageUrl: string;
    }[] = (
      await (
        await admin.client.get(`/api/admin/registrations/${reg.id}/cards`)
      ).json()
    ).data;
    for (const category of ["Putra", "Putri"] as const) {
      const card = cards.find((card) => card.category === category)!;
      const response = await admin.client.get(card.imageUrl);
      expect(response.status()).toBe(200);
      const image = await response.body();
      const metadata = await sharp(image).metadata();
      expect(metadata.xmp?.toString()).toContain(
        category === "Putra" ? "boy_scout.svg" : "girl_guide.svg",
      );
      const actual = await sharp(image)
        .extract({ left: 215, top: 322, width: 220, height: 220 })
        .removeAlpha()
        .raw()
        .toBuffer();
      const expected = await sharp(
        `public/images/participants/pramuka-${category.toLowerCase()}.svg`,
      )
        .resize(346, 346)
        .extract({ left: 63, top: 63, width: 220, height: 220 })
        .removeAlpha()
        .raw()
        .toBuffer();
      const difference =
        actual.reduce(
          (sum, value, index) => sum + Math.abs(value - expected[index]),
          0,
        ) / actual.length;
      expect(difference).toBeLessThan(8);
      await writeFile(
        testInfo.outputPath(`kartu-ilustrasi-${category.toLowerCase()}.png`),
        image,
      );
      const {
        rows: [stored],
      } = await pool.query(
        "SELECT file_key FROM participant_id_cards WHERE id = $1",
        [card.id],
      );
      const cardFile = path.join(
        process.env.PRIVATE_STORAGE_DIR!,
        stored.file_key,
      );
      const original = await readFile(cardFile);
      const legacy = await sharp({
        create: {
          width: 650,
          height: 1005,
          channels: 3,
          background: "#e9e9e9",
        },
      })
        .png()
        .toBuffer();
      await writeFile(cardFile, legacy);
      try {
        const refreshed = await admin.client.get(card.imageUrl);
        expect(refreshed.status()).toBe(200);
        expect(
          (await sharp(await refreshed.body()).metadata()).xmp?.toString(),
        ).toContain("participant-card-v2-scout-avatar");
        expect((await readFile(cardFile)).equals(legacy)).toBe(true);
      } finally {
        await writeFile(cardFile, original);
      }
    }
    const {
      rows: [document],
    } = await pool.query(
      "SELECT d.file_key FROM registration_documents d JOIN registration_approvals a ON a.id = d.approval_id WHERE a.registration_id = $1 AND a.active",
      [reg.id],
    );
    const file = path.join(process.env.PRIVATE_STORAGE_DIR!, document.file_key);
    const original = await readFile(file);
    const legacy = Buffer.from(original);
    const marker = legacy.indexOf("registration-form-v4");
    expect(marker).toBeGreaterThanOrEqual(0);
    Buffer.from("registration-form-v3").copy(legacy, marker);
    await writeFile(file, legacy);
    try {
      for (const [client, endpoint] of [
        [owner.client, url],
        [admin.client, `/api/admin/registrations/${reg.id}/document`],
      ] as const) {
        const refreshed = await client.get(endpoint);
        expect(refreshed.status()).toBe(200);
        const current = await refreshed.body();
        expect(current.includes(Buffer.from("registration-form-v4"))).toBe(
          true,
        );
        expect(
          current.toString("latin1").match(/\/Type \/Page\b/g),
        ).toHaveLength(2);
      }
      const {
        rows: [approvals],
      } = await pool.query(
        "SELECT count(*)::int AS total FROM registration_approvals WHERE registration_id = $1",
        [reg.id],
      );
      expect(approvals.total).toBe(1);
    } finally {
      await writeFile(file, original);
    }
  } finally {
    await pool.end();
    await owner.context.close();
    await admin.context.close();
  }
});

test("server rejects a sixteenth member, stale concurrent drafts, reused NPSN and forged counters", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const one = await actor(browser),
    two = await actor(browser);
  let reg = await create(one.client);
  expect(
    (
      await one.client.put(`/api/registrations/${reg.id}`, {
        headers,
        data: draftPayload(fill(reg, 16)),
      })
    ).status(),
  ).toBe(422);
  reg = await save(one.client, fill(reg, 15));
  const first = draftPayload(reg);
  const second = {
    ...first,
    school: { ...first.school, name: "Nama perubahan kedua" },
  };
  const concurrent = await Promise.all([
    one.client.put(`/api/registrations/${reg.id}`, { headers, data: first }),
    one.client.put(`/api/registrations/${reg.id}`, { headers, data: second }),
  ]);
  expect(concurrent.map((r) => r.status()).sort()).toEqual([200, 409]);
  reg = (await (await one.client.get(`/api/registrations/${reg.id}`)).json())
    .data;
  reg.school.npsn = "12345678";
  reg = await save(one.client, reg);
  const other = fill(await create(two.client));
  other.school.npsn = "12345678";
  expect(
    (
      await two.client.put(`/api/registrations/${other.id}`, {
        headers,
        data: draftPayload(other),
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await one.client.put(`/api/registrations/${reg.id}`, {
        headers,
        data: { ...draftPayload(reg), participantsTotal: 99 },
      })
    ).status(),
  ).toBe(422);
  await one.context.close();
  await two.context.close();
});
