import type { Metadata } from "next";
import { OperatorDashboard } from "@/components/camp/operator-dashboard";
import { requireRole } from "@/lib/session";
export const metadata: Metadata = { title: "Beranda sekolah" };
export default async function Page() {
  await requireRole(["user"]);
  return <OperatorDashboard />;
}
