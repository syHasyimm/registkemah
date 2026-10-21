import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth-frame";
import { AuthAssistance } from "@/components/auth-assistance";
import { mailConfigured } from "@/lib/mail";
export const metadata: Metadata = { title: "Verifikasi email" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <AuthFrame>
      <AuthAssistance
        mode="verify"
        email={typeof email === "string" ? email : ""}
        mailEnabled={mailConfigured()}
      />
    </AuthFrame>
  );
}
