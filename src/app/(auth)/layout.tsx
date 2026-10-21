import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { getSession } from "@/lib/session";
import { roleHome } from "@/lib/role-policy.mjs";
import { notFound } from "next/navigation";
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session) {
    const home = roleHome(session.user.role);
    if (!home) notFound();
    redirect(home);
  }
  return <AuthFrame>{children}</AuthFrame>;
}
