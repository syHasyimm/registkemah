import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import {
  CERTIFICATE_NUMBER,
  type CertificateRecipient,
} from "@/lib/camp/certificates";

type TextBox = { x: number; y: number; width: number; height: number };
const nameBox: TextBox = { x: 490, y: 533, width: 860, height: 90 };
const positionBox: TextBox = { x: 620, y: 711, width: 550, height: 91 };

function ribbonText(doc: PDFKit.PDFDocument, text: string, box: TextBox) {
  // These rectangles sit entirely inside the original solid ribbons (#640603).
  // The original PNG, number, signature, seal and ornaments remain untouched.
  doc.rect(box.x, box.y, box.width, box.height).fill("#640603");
  let size = 72;
  const options = { width: box.width - 20, align: "center" as const };
  doc.font("CertificateBold");
  do {
    doc.fontSize(size);
    if (doc.heightOfString(text, options) <= box.height - 6) break;
    size -= 0.5;
  } while (size > 16);
  const height = doc.heightOfString(text, options);
  doc
    .fillColor("#ffffff")
    .text(text, box.x + 10, box.y + (box.height - height) / 2, {
      ...options,
      height: box.height,
      lineGap: 0,
    });
}

export function renderCertificatesPdf(
  recipients: Pick<CertificateRecipient, "name" | "position">[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      autoFirstPage: false,
      margin: 0,
      size: "A4",
      layout: "landscape",
      info: {
        Title:
          "Piagam Penghargaan - Kemah Besar Penggalang Gelora Pahlawan 2026",
        Subject: `Nomor: ${CERTIFICATE_NUMBER}`,
        Author: "Kwartir Ranting Gerakan Pramuka 0803 Kepenuhan",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      doc.registerFont(
        "CertificateBold",
        path.join(process.cwd(), "assets", "fonts", "NotoSans-Bold.ttf"),
      );
      const template = path.join(
        process.cwd(),
        "public",
        "images",
        "Template Sertifikat.png",
      );
      for (const person of recipients) {
        doc.addPage();
        doc.image(template, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
        });
        doc.save().scale(doc.page.width / 2000, doc.page.height / 1414);
        ribbonText(doc, person.name, nameBox);
        ribbonText(doc, person.position, positionBox);
        doc.restore();
      }
      doc.end();
    } catch (error) {
      doc.destroy(
        error instanceof Error ? error : new Error("PDF gagal dibuat"),
      );
    }
  });
}
