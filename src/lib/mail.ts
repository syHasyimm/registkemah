import "server-only";
import nodemailer from "nodemailer";
import { ServiceError } from "./service-error";
export function mailConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.MAIL_FROM,
  );
}
export async function sendMail(
  payload: { to: string; subject: string; text: string },
  id: string,
) {
  if (!mailConfigured())
    throw new ServiceError(
      503,
      "MAIL_NOT_CONFIGURED",
      "Layanan email belum dikonfigurasi pengelola.",
    );
  const host = process.env.SMTP_HOST!;
  const local = ["localhost", "127.0.0.1", "::1"].includes(host);
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: !local && process.env.SMTP_SECURE !== "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || "" }
      : undefined,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: payload.to,
      subject: payload.subject.replace(/[\r\n]/g, " "),
      text: payload.text,
      messageId: `<${id}@registrasi-kemah.local>`,
    });
    if (!result.accepted.length || result.rejected.length)
      throw new Error("Recipient not accepted");
    return String(result.messageId);
  } finally {
    transport.close();
  }
}
