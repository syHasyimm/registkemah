import "server-only";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import PDFDocument from "pdfkit";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { participantPhotos } from "@/db/schema";
import { readPrivateFile } from "@/lib/private-storage";
import type {
  Category,
  EventSettings,
  Participant,
  Patrol,
  Registration,
} from "@/lib/camp/types";

// Stored in the PDF metadata so downloads can recognize an older layout.
export const REGISTRATION_PDF_LAYOUT = "registration-form-v3";

const fontPath = (bold = false) =>
  path.join(
    process.cwd(),
    "assets",
    "fonts",
    bold ? "NotoSans-Bold.ttf" : "NotoSans-Regular.ttf",
  );
export async function approvalPhotoSources(registration: Registration) {
  const ids = registration.patrols
    .flatMap((p) => p.participants)
    .map((p) => p.photoId)
    .filter((id): id is string => !!id);
  const rows = ids.length
    ? await db
        .select()
        .from(participantPhotos)
        .where(
          and(
            inArray(participantPhotos.id, ids),
            eq(participantPhotos.registrationId, registration.id),
            eq(participantPhotos.status, "Ready"),
          ),
        )
    : [];
  const sources = new Map<string, Buffer>();
  for (const id of ids) {
    const row = rows.find((photo) => photo.id === id);
    if (!row?.fileKey) throw new Error("Approved photo unavailable");
    sources.set(id, await readPrivateFile(row.fileKey));
  }
  return sources;
}
async function cropPhoto(
  source: Buffer,
  member: Participant,
  size: number,
  circle = false,
) {
  const info = await sharp(source).metadata();
  if (!info.width || !info.height) throw new Error("Invalid image dimensions");
  const minimum = Math.min(info.width, info.height);
  const side = Math.max(1, Math.floor(minimum / member.zoom));
  const left = Math.max(
    0,
    Math.min(
      info.width - side,
      Math.round(
        ((info.width - minimum) * member.x) / 100 + (minimum - side) / 2,
      ),
    ),
  );
  const top = Math.max(
    0,
    Math.min(
      info.height - side,
      Math.round(
        ((info.height - minimum) * member.y) / 100 + (minimum - side) / 2,
      ),
    ),
  );
  const output = await sharp(source)
    .extract({ left, top, width: side, height: side })
    .resize(size, size)
    .ensureAlpha()
    .png()
    .toBuffer();
  return circle
    ? sharp(output)
        .composite([
          {
            input: Buffer.from(
              `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
            ),
            blend: "dest-in",
          },
        ])
        .png()
        .toBuffer()
    : output;
}
const escapeMarkup = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
async function textLayer(
  text: string,
  width: number,
  height: number,
  bold: boolean,
) {
  return sharp({
    text: {
      text: escapeMarkup(text),
      font: bold ? "Noto Sans Bold" : "Noto Sans",
      fontfile: fontPath(bold),
      width,
      height,
      align: "center",
      rgba: true,
      wrap: "word-char",
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
}
export async function renderParticipantCard(
  member: Participant,
  sources: Map<string, Buffer>,
) {
  // Preserve the supplied source. Dynamic masks remove the example picture and labels.
  const clean = Buffer.from(
    '<svg width="650" height="1004"><circle cx="325" cy="432" r="173" fill="#e9e9e9"/><rect x="155" y="642" width="340" height="61" fill="#e9e9e9"/><rect x="155" y="713" width="340" height="37" fill="#e9e9e9"/></svg>',
  );
  const layers: OverlayOptions[] = [{ input: clean, top: 0, left: 0 }];
  if (member.photoId) {
    const source = sources.get(member.photoId);
    if (!source) throw new Error("Approved photo missing");
    layers.push({
      input: await cropPhoto(source, member, 346, true),
      top: 259,
      left: 152,
    });
  } else {
    const placeholder = await textLayer("Foto belum tersedia", 230, 36, false);
    layers.push({
      input: placeholder.data,
      left: Math.round((650 - placeholder.info.width) / 2),
      top: 415,
    });
  }
  const name = await textLayer(
    member.name.toLocaleUpperCase("id"),
    470,
    51,
    true,
  );
  const base = await textLayer(
    member.base.toLocaleUpperCase("id"),
    450,
    32,
    false,
  );
  // Wider opaque text bands contain all text and fully cover the source labels.
  layers.push({
    input: Buffer.from(
      '<svg width="650" height="1004"><rect x="80" y="642" width="490" height="61" fill="#e9e9e9"/><rect x="90" y="713" width="470" height="37" fill="#e9e9e9"/></svg>',
    ),
    top: 0,
    left: 0,
  });
  layers.push(
    {
      input: name.data,
      left: Math.round((650 - name.info.width) / 2),
      top: 646 + Math.round((51 - name.info.height) / 2),
    },
    {
      input: base.data,
      left: Math.round((650 - base.info.width) / 2),
      top: 716 + Math.round((32 - base.info.height) / 2),
    },
  );
  return sharp(path.join(process.cwd(), "assets", "id-card-reference.png"))
    .composite(layers)
    .resize(650, 1005, { fit: "fill" })
    .png()
    .toBuffer();
}

export async function renderRegistrationPdf(
  registration: Registration,
  event: EventSettings,
  sources: Map<string, Buffer>,
) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    autoFirstPage: false,
    bufferPages: true,
    info: {
      Title: `Formulir ${registration.number}`,
      Author: "Panitia Perkemahan",
      Subject: `Versi persetujuan ${registration.version}`,
      Keywords: REGISTRATION_PDF_LAYOUT,
    },
  });
  doc.registerFont("Body", fontPath());
  doc.registerFont("Bold", fontPath(true));
  doc.font("Body");
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const left = 40;
  const width = 595.28 - left * 2;
  const signatureWidth = 225;
  const signatureSpace = 90;
  const acknowledgment =
    "Saya telah memeriksa kebenaran data sekolah dan peserta pada formulir ini serta berwenang melakukan pendaftaran. Cetak dan serahkan formulir kepada panitia di lokasi untuk mengambil kartu fisik peserta.";
  const pages: { category: Category; contentBottom: number }[] = [];
  let bottom = 0;
  let y = 0;
  let bodyStart = 0;
  function summary(category: Category) {
    const patrols = registration.patrols.filter((p) => p.category === category);
    const participants = patrols.reduce(
      (sum, p) => sum + p.participants.length,
      0,
    );
    return `Rekap ${category.toLowerCase()}: ${patrols.length} regu | ${participants} peserta. Pembina tidak termasuk peserta.`;
  }
  function reserveSignatures(category: Category) {
    doc.font("Body").fontSize(8);
    const acknowledgmentHeight = doc.heightOfString(acknowledgment, { width });
    const nameHeight = Math.max(
      doc.heightOfString(registration.school.contact, {
        width: signatureWidth,
      }),
      doc.heightOfString("Diisi dan ditandatangani di lokasi", {
        width: signatureWidth,
      }),
    );
    doc.font("Bold");
    const summaryHeight = doc.heightOfString(summary(category), { width });
    // The recap follows the last row by 12pt; reserve the full signature area
    // even when a long name wraps, instead of fixing the recap near the footer.
    return (
      12 +
      summaryHeight +
      7 +
      acknowledgmentHeight +
      16 +
      signatureSpace +
      4 +
      nameHeight
    );
  }
  function paragraph(
    text: string,
    bold = false,
    size = 8,
    after = 5,
    align: "left" | "center" = "left",
  ) {
    doc.font(bold ? "Bold" : "Body").fontSize(size);
    const h = doc.heightOfString(text, { width });
    doc.fillColor("#111111").text(text, left, y, { width, align });
    y += h + after;
  }
  function field(label: string, value: string) {
    doc.font("Body").fontSize(8.5).fillColor("#111111");
    const text = value || "-";
    const h = Math.max(12, doc.heightOfString(text, { width: width - 116 }));
    doc.text(label, left, y, { width: 104 });
    doc.text(":", left + 105, y, { width: 10 });
    doc.text(text, left + 116, y, { width: width - 116 });
    y += h + 4;
  }

  function startPage(category: Category) {
    doc.addPage();
    pages.push({ category, contentBottom: 0 });
    bottom = doc.page.height - 40 - reserveSignatures(category);
    // Clip the original reference in PDF coordinates. Keep its logos, text,
    // proportions and double rule intact, without the surrounding screenshot space.
    const scale = width / 872;
    doc
      .save()
      .rect(left, 24, width, 174 * scale)
      .clip();
    doc.image(
      path.join(process.cwd(), "assets", "registration-letterhead.png"),
      left - 233 * scale,
      24 - 38 * scale,
      { width: 1332 * scale },
    );
    doc.restore();
    y = 24 + 174 * scale + 11;
    paragraph(
      `FORMULIR PENDAFTARAN ${category.toUpperCase()}`,
      true,
      12,
      3,
      "center",
    );
    paragraph(event.name, true, 9, 10, "center");
    field("Nama sekolah", registration.school.name);
    field("Penanggung jawab", registration.school.contact);
    y += 6;
    bodyStart = y;
    pages.at(-1)!.contentBottom = y;
  }

  const widths = [30, 210, 210, width - 450];
  const columns = ["NO", "Nama Lengkap", "Pangkalan", "Foto"];
  function tableHeader() {
    doc.font("Bold").fontSize(8);
    let x = left;
    const h = 20;
    doc.rect(left, y, width, h).fill("#eeeeee");
    columns.forEach((label, i) => {
      doc
        .fillColor("#111111")
        .text(label, x + 4, y + 4, { width: widths[i] - 8, lineBreak: false });
      x += widths[i];
    });
    y += h;
  }
  function patrolHeader(patrol: Patrol, continued = false) {
    paragraph(
      `Regu ${patrol.name}${continued ? " (lanjutan)" : ""} - ${patrol.participants.length} peserta`,
      true,
      9,
      3,
    );
    paragraph(
      `Pembina: ${patrol.companion || registration.school.contact}${patrol.phone ? ` | WhatsApp ${patrol.phone}` : ""}`,
      false,
      7.5,
      5,
    );
    tableHeader();
    pages.at(-1)!.contentBottom = y;
  }
  for (const category of ["Putra", "Putri"] as const) {
    const categoryPatrols = registration.patrols.filter(
      (p) => p.category === category,
    );
    if (!categoryPatrols.length) continue;
    startPage(category);
    for (const patrol of categoryPatrols) {
      const rows = patrol.participants.map((member, index) => {
        const values = [
          String(index + 1),
          member.name,
          member.base,
          member.photoId ? "" : "-",
        ];
        doc.font("Body").fontSize(8);
        const rowHeight = Math.max(
          22,
          ...values.map(
            (text, i) => doc.heightOfString(text, { width: widths[i] - 8 }) + 8,
          ),
        );
        return { member, values, rowHeight };
      });
      doc.font("Bold").fontSize(9);
      const titleHeight = doc.heightOfString(
        `Regu ${patrol.name} - ${patrol.participants.length} peserta`,
        { width },
      );
      doc.font("Body").fontSize(7.5);
      const companionHeight = doc.heightOfString(
        `Pembina: ${patrol.companion || registration.school.contact}${patrol.phone ? ` | WhatsApp ${patrol.phone}` : ""}`,
        { width },
      );
      const blockHeight =
        titleHeight +
        companionHeight +
        28 +
        rows.reduce((sum, row) => sum + row.rowHeight, 0);
      // Keep a normal 8-15 member patrol on one sheet. Large registrations
      // continue within their own category without hiding or shrinking any rows.
      if (
        y + Math.min(blockHeight, 100) > bottom ||
        (y + blockHeight > bottom && blockHeight <= bottom - bodyStart)
      ) {
        startPage(category);
      }
      patrolHeader(patrol);
      for (const { member, values, rowHeight } of rows) {
        if (y + rowHeight > bottom) {
          startPage(category);
          patrolHeader(patrol, true);
        }
        doc.font("Body").fontSize(8);
        let x = left;
        for (let i = 0; i < values.length; i++) {
          doc
            .fillColor("#222222")
            .text(values[i], x + 4, y + 4, { width: widths[i] - 8 });
          x += widths[i];
        }
        if (member.photoId) {
          const source = sources.get(member.photoId);
          if (!source) throw new Error("Approved photo missing");
          doc.image(
            await cropPhoto(source, member, 120, true),
            left + width - widths[3] + (widths[3] - 18) / 2,
            y + (rowHeight - 18) / 2,
            { width: 18, height: 18 },
          );
        }
        doc
          .moveTo(left, y + rowHeight)
          .lineTo(left + width, y + rowHeight)
          .strokeColor("#cccccc")
          .lineWidth(0.5)
          .stroke();
        y += rowHeight;
        pages.at(-1)!.contentBottom = y;
      }
      y += 10;
    }
  }
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const { category, contentBottom } = pages[i];
    y = contentBottom + 12;
    paragraph(summary(category), true, 8, 7);
    paragraph(acknowledgment, false, 8, 16);
    const signatureY = y;
    const right = left + width - signatureWidth;
    doc.font("Body").fontSize(8).fillColor("#111111");
    doc.text("Penanggung jawab sekolah", left, signatureY, {
      width: signatureWidth,
      align: "center",
    });
    doc.text("Penerima / panitia", right, signatureY, {
      width: signatureWidth,
      align: "center",
    });
    const signatureLine = signatureY + signatureSpace;
    doc.strokeColor("#555555").lineWidth(0.5);
    doc
      .moveTo(left, signatureLine)
      .lineTo(left + signatureWidth, signatureLine)
      .stroke();
    doc
      .moveTo(right, signatureLine)
      .lineTo(right + signatureWidth, signatureLine)
      .stroke();
    doc.text(registration.school.contact, left, signatureLine + 4, {
      width: signatureWidth,
      align: "center",
    });
    doc.text("Diisi dan ditandatangani di lokasi", right, signatureLine + 4, {
      width: signatureWidth,
      align: "center",
    });
  }
  doc.end();
  return completed;
}
