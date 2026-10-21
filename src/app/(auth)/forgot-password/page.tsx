import type { Metadata } from "next";
import { AuthAssistance } from "@/components/auth-assistance";
import { mailConfigured } from "@/lib/mail";
export const metadata: Metadata = { title: "Lupa password" };
export default function Page() {
  return <AuthAssistance mode="forgot" mailEnabled={mailConfigured()} />;
}
