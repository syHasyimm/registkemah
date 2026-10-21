import type { Metadata } from "next";
import { AuthAssistance } from "@/components/auth-assistance";
export const metadata: Metadata = { title: "Password baru" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthAssistance
      mode="reset"
      token={typeof token === "string" ? token : ""}
    />
  );
}
