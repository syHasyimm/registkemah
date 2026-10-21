import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { AdminRegistrationList } from "@/components/camp/admin-list";
export const metadata: Metadata = { title: "Daftar pendaftaran" };
export default async function Page() {
  await requirePermission({ registrations: ["read-any"] });
  return <AdminRegistrationList />;
}
