import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { IdCards } from "@/components/camp/id-cards";
export const metadata: Metadata = { title: "ID card panitia" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission({ registrations: ["read-any"] });
  const { id } = await params;
  return <IdCards id={id} />;
}
