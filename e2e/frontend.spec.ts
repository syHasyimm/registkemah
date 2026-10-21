import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("draft persists, seven members are rejected, review approves and revision revokes artifacts", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto("/preview/pendaftaran");
  await page
    .getByLabel("Nama sekolah", { exact: false })
    .fill("SMP Contoh Uji");
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Nama sekolah", { exact: false })).toHaveValue(
    "SMP Contoh Uji",
  );
  await page.getByRole("button", { name: "Simpan & lanjutkan" }).click();
  const firstPatrol = page.locator("details.patrol-editor").first();
  await firstPatrol
    .getByRole("button", { name: "Hapus peserta 8 regu Melati", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Ya, hapus", exact: true })
    .click();
  await page.getByRole("button", { name: "Simpan & lanjutkan" }).click();
  await expect(page.getByRole("alert").first()).toContainText("8–15 peserta");
  await firstPatrol
    .getByRole("button", { name: "Tambah peserta", exact: true })
    .click();
  const lastParticipant = firstPatrol.locator(".participant-editor").last();
  await lastParticipant
    .getByLabel("Nama lengkap peserta", { exact: false })
    .fill("Peserta Pengganti");
  await page.getByRole("button", { name: "Simpan & lanjutkan" }).click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Kirim pendaftaran", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Ya, kirim simulasi" })
    .click();
  await expect(
    page.getByText("Data sudah dikirim dan terkunci.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tambah peserta", exact: true }),
  ).toHaveCount(0);
  await page.goto("/preview/admin/pendaftaran/sekolah-saya");
  await page
    .getByRole("button", { name: "Setujui pendaftaran", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Simpan keputusan" })
    .click();
  await expect(
    page.getByLabel("Status formulir", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Status formulir", { exact: true })
    .selectOption("Siap");
  await page.getByLabel("Status kartu", { exact: true }).selectOption("Siap");
  await page.goto("/preview/pendaftaran/bukti");
  await expect(
    page.getByRole("button", { name: "Cetak contoh tampilan" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Unduh Formulir Pendaftaran (PDF)" }),
  ).toBeDisabled();
  await expect(page.getByRole("link", { name: /ID card/ })).toHaveCount(0);
  await page.goto("/preview/admin/pendaftaran/sekolah-saya/id-card");
  await expect(page.locator(".participant-idcard")).toHaveCount(16);
  const size = await page.locator(".participant-idcard").first().boundingBox();
  expect(size?.width).toBeCloseTo((55 / 25.4) * 96, 0);
  expect(size?.height).toBeCloseTo((85 / 25.4) * 96, 0);
  await page.goto("/preview/admin/pendaftaran/sekolah-saya");
  await page.getByRole("button", { name: "Kembalikan untuk revisi" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Simpan keputusan" })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Catatan wajib diisi",
  );
  await page
    .getByLabel("Catatan untuk operator", { exact: false })
    .fill("Periksa kembali ejaan pangkalan.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Simpan keputusan" })
    .click();
  await page.goto("/preview/pendaftaran/bukti");
  await expect(page.getByText("Formulir menunggu persetujuan")).toBeVisible();
  await page.goto("/preview/admin/pendaftaran/sekolah-saya/id-card");
  await expect(page.getByText("Kartu belum aktif")).toBeVisible();
  await expect(page.locator(".participant-idcard")).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});

test("fifteenth member is the UI limit and photo errors preserve participant data", async ({
  page,
}) => {
  await page.goto("/preview/pendaftaran");
  await page.getByRole("button", { name: "Regu & peserta" }).click();
  const firstPatrol = page.locator("details.patrol-editor").first();
  const participant = firstPatrol.locator(".participant-editor").first();
  await participant
    .getByLabel("Foto peserta 1 regu Melati", { exact: true })
    .setInputFiles({
      name: "invalid.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
  await expect(participant.getByRole("alert")).toContainText(
    "JPG, PNG, atau WebP",
  );
  await expect(
    participant.getByLabel("Nama lengkap peserta", { exact: false }),
  ).toHaveValue("Aulia Putri");
  for (let i = 8; i < 15; i++)
    await firstPatrol
      .getByRole("button", { name: "Tambah peserta", exact: true })
      .click();
  await expect(
    firstPatrol.getByRole("button", { name: "Batas 15 peserta tercapai" }),
  ).toBeDisabled();
  await expect(firstPatrol.locator(".participant-editor")).toHaveCount(15);
});

test("participant rows preserve edits when collapsed and keep new members open", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/preview/pendaftaran");
  await page
    .getByRole("button", { name: "Regu & peserta", exact: true })
    .click();
  const patrol = page.locator("details.patrol-editor").first();
  const second = patrol.locator(".participant-editor").nth(1);
  const name = second.getByLabel("Nama lengkap peserta", { exact: false });
  await expect(name).toBeHidden();
  await second.getByRole("button", { name: /^Buka data peserta 2 / }).click();
  await name.fill("Nabila Putri Pramuka");
  await second.getByRole("button", { name: /^Tutup data peserta 2 / }).click();
  await expect(name).toBeHidden();
  await second.getByRole("button", { name: /^Buka data peserta 2 / }).click();
  await expect(name).toHaveValue("Nabila Putri Pramuka");
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  await expect(page.locator(".toast")).toContainText(
    "Draf tersimpan di browser ini.",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Regu & peserta", exact: true })
    .click();
  await second.getByRole("button", { name: /^Buka data peserta 2 / }).click();
  await expect(name).toHaveValue("Nabila Putri Pramuka");
  await patrol
    .getByRole("button", { name: "Tambah peserta", exact: true })
    .click();
  const newest = patrol.locator(".participant-editor").last();
  const newName = newest.getByLabel("Nama lengkap peserta", { exact: false });
  await expect(newName).toBeVisible();
  await newName.fill("Peserta Baru");
  await expect(newName).toBeVisible();
  await expect(newName).toHaveValue("Peserta Baru");
});

test("search and CSV export use all filtered records", async ({ page }) => {
  await page.goto("/preview/admin/pendaftaran");
  await page
    .getByLabel("Filter status pendaftaran")
    .selectOption("Terverifikasi");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV sekolah" }).click();
  const download = await downloadPromise;
  const text = await readFile((await download.path())!, "utf8");
  expect(text).toContain("MTs Al Hikmah");
  expect(text).toContain("SMP Cahaya Bangsa");
  expect(text).not.toContain("SMP Harapan Bangsa");
  await page
    .getByLabel("Cari sekolah atau nomor pendaftaran")
    .fill("Tidak ada sekolah ini");
  await expect(page.getByText("Sekolah belum ditemukan")).toBeVisible();
  await page.getByRole("button", { name: "Hapus filter" }).click();
  await expect(page.getByText("MTs Al Hikmah", { exact: true })).toBeVisible();
});

test("closed registration permits drafts but prevents submission", async ({
  page,
}) => {
  await page.goto("/preview/admin/kegiatan");
  await page
    .getByLabel("Pendaftaran dibuka", { exact: true })
    .fill("2020-01-01T00:00");
  await page
    .getByLabel("Pendaftaran ditutup", { exact: true })
    .fill("2020-01-02T00:00");
  await page
    .getByRole("button", { name: "Simpan pengaturan", exact: true })
    .click();
  await page.goto("/preview/pendaftaran");
  await page.getByRole("button", { name: "Tinjau & kirim" }).click();
  await expect(
    page.getByRole("button", { name: "Kirim pendaftaran", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Simpan draf", exact: true }),
  ).toBeEnabled();
});

test("mobile bottom navigation follows each role and keeps save controls visible", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/preview");
  const operatorNav = page.getByRole("navigation", {
    name: "Navigasi utama operator",
    exact: true,
  });
  await expect(operatorNav).toBeVisible();
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.getByRole("button", { name: "Buka navigasi" })).toHaveCount(
    0,
  );
  await expect(operatorNav.getByRole("link")).toHaveCount(3);
  await expect(
    operatorNav.getByRole("link", { name: "Beranda", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.screenshot({ path: testInfo.outputPath("operator-mobile.png") });

  await operatorNav
    .getByRole("link", { name: "Pendaftaran sekolah", exact: true })
    .click();
  await expect(page).toHaveURL("/preview/pendaftaran");
  await expect(operatorNav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(
    operatorNav.getByRole("link", { name: "Pendaftaran sekolah", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const save = page.getByRole("button", { name: "Simpan draf", exact: true });
  await save.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      const button = await save.boundingBox();
      const nav = await operatorNav.boundingBox();
      return !!button && !!nav && button.y + button.height <= nav.y;
    })
    .toBe(true);
  await save.click();
  await expect(page.locator(".toast")).toContainText(
    "Draf tersimpan di browser ini.",
  );
  await expect
    .poll(async () => {
      const toast = await page.locator(".toast").boundingBox();
      const nav = await operatorNav.boundingBox();
      return !!toast && !!nav && toast.y + toast.height <= nav.y;
    })
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("save-controls-mobile.png"),
  });
  const formLink = operatorNav.getByRole("link", {
    name: "Formulir pendaftaran",
    exact: true,
  });
  await formLink.focus();
  await expect(formLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/preview/pendaftaran/bukti");
  await expect(formLink).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(
    operatorNav.getByRole("link", { name: "Pendaftaran sekolah", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.goto("/preview/admin/pendaftaran/harapan-bangsa");
  const adminNav = page.getByRole("navigation", {
    name: "Navigasi utama panitia",
    exact: true,
  });
  await expect(
    adminNav.getByRole("link", { name: "Pendaftaran", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await adminNav
    .getByRole("link", { name: "Pengaturan kegiatan", exact: true })
    .click();
  await expect(page).toHaveURL("/preview/admin/kegiatan");
  await expect(
    adminNav.getByRole("link", { name: "Pengaturan kegiatan", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await adminNav.getByRole("link", { name: "Ringkasan", exact: true }).click();
  await expect(page).toHaveURL("/preview/admin");
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect
    .poll(async () => {
      const nav = await adminNav.boundingBox();
      return nav ? Math.abs(nav.y + nav.height - 844) : Infinity;
    })
    .toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("panitia-mobile.png") });

  await page.emulateMedia({ media: "print" });
  await expect(adminNav).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  for (const width of [768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(adminNav).toBeHidden();
  }
});

test("all frontend surfaces fit PRD viewport widths", async ({ page }) => {
  test.setTimeout(120_000);
  const routes = [
    "/",
    "/sign-in",
    "/sign-up",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/preview",
    "/preview/pendaftaran",
    "/preview/pendaftaran/bukti",
    "/preview/admin",
    "/preview/admin/pendaftaran",
    "/preview/admin/pendaftaran/harapan-bangsa",
    "/preview/admin/pendaftaran/al-hikmah/id-card",
    "/preview/admin/kegiatan",
  ];
  for (const width of [320, 360, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          { message: `${route} must fit ${width}px` },
        )
        .toBe(true);
    }
    await page.goto("/preview/pendaftaran");
    await page.getByRole("button", { name: "Regu & peserta" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `participant form at ${width}px`,
    ).toBe(true);
  }
});

test("reduced motion keeps offscreen content and form steps immediately readable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".closing-cta")).toHaveCSS("opacity", "1");
  await expect(page.locator(".closing-cta")).toHaveCSS("transform", "none");
  await page.goto("/sign-in");
  await expect(page.locator(".motion-page")).toHaveCSS("opacity", "1");
  await page.goto("/preview/pendaftaran");
  await page
    .getByRole("button", { name: "Regu & peserta", exact: true })
    .click();
  await expect(page.locator(".motion-step")).toHaveCSS("opacity", "1");
  await expect(page.locator(".motion-step")).toHaveCSS("transform", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/preview/admin/pendaftaran/al-hikmah/id-card");
  const card = page.locator(".participant-idcard").last();
  await expect(card).toBeVisible();
  await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
  await expect(page.locator(".motion-page")).toHaveCSS("opacity", "1");
  await expect(page.locator(".motion-page")).toHaveCSS("transform", "none");
  await expect(page.locator(".idcard-wrap").last()).toHaveCSS("opacity", "1");
  await expect(page.locator(".idcard-wrap").last()).toHaveCSS(
    "transform",
    "none",
  );
  const size = await card.boundingBox();
  expect(size?.width).toBeCloseTo((55 / 25.4) * 96, 0);
  expect(size?.height).toBeCloseTo((85 / 25.4) * 96, 0);
});

test("dashboard progress fills remain visible after their panels enter the viewport", async ({
  page,
}) => {
  await page.goto("/preview/admin");
  const track = page.locator(".distribution-row .progress-track").first();
  await track.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      const outer = await track.boundingBox();
      const fill = await track.locator(":scope > div").boundingBox();
      return outer && fill ? fill.width / outer.width : 0;
    })
    .toBeCloseTo(0.2, 2);
  await page.goto("/preview");
  const completion = page.getByRole("progressbar", {
    name: "Kelengkapan pendaftaran",
  });
  await completion.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      const outer = await completion.boundingBox();
      const fill = await completion.locator(":scope > div").boundingBox();
      const value =
        Number(await completion.getAttribute("aria-valuenow")) / 100;
      return outer && fill ? Math.abs(fill.width / outer.width - value) : 1;
    })
    .toBeLessThan(0.01);
});

test("animation styles have a server-rendered fallback without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(".hero-copy")).toHaveCSS("opacity", "1");
    await expect(page.locator(".hero-photo")).toHaveCSS("transform", "none");
    await expect(page.locator(".closing-cta")).toHaveCSS("opacity", "1");
  } finally {
    await context.close();
  }
});
