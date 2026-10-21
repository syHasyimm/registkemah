import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { AdminRegistrationDetail } from "@/components/camp/admin-detail";
export const metadata: Metadata = { title: "Pemeriksaan pendaftaran" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission({ registrations: ["read-any", "review-any"] });
  const { id } = await params;
  return <AdminRegistrationDetail id={id} />;
}
