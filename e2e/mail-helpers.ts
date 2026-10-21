import { expect, type APIRequestContext } from "@playwright/test";
export async function testMail(email: string, subject: string) {
  const base = process.env.STARTER_TEST_MAIL_URL;
  if (!base)
    throw new Error("Run npm run test:e2e with its isolated email server.");
  let message: { Text: string; ID: string; Subject: string } | undefined;
  await expect
    .poll(
      async () => {
        const response = await fetch(
          `${base}/api/v1/search?query=${encodeURIComponent(`to:${email} subject:${subject}`)}`,
        );
        const result = await response.json();
        const messages = result.messages || result.Messages || [];
        const id = messages[0]?.ID;
        if (!id) return false;
        const detail = await fetch(`${base}/api/v1/message/${id}`);
        message = await detail.json();
        return Boolean(message?.Text);
      },
      { timeout: 30_000, intervals: [200, 500, 1000] },
    )
    .toBe(true);
  return message!;
}
export async function verificationLink(email: string) {
  const message = await testMail(email, "Verifikasi");
  const link = message.Text.match(/https?:\/\/[^\s<>]+/)?.[0];
  if (!link) throw new Error("Verification email did not contain its URL");
  return link;
}
export async function verifyAccount(client: APIRequestContext, email: string) {
  const link = await verificationLink(email);
  const response = await client.get(link);
  expect(response.ok()).toBe(true);
  const session = await (await client.get("/api/auth/get-session")).json();
  expect(session.user.emailVerified).toBe(true);
}
