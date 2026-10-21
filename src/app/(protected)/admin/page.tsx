import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { AdminDashboard } from "@/components/camp/admin-dashboard";
export const metadata: Metadata = { title: "Ringkasan panitia" };
export default async function Page() {
  await requirePermission({ registrations: ["read-any"] });
  return <AdminDashboard />;
}
