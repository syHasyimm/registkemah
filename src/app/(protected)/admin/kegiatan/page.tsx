import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { EventSettingsForm } from "@/components/camp/event-settings";
export const metadata: Metadata = { title: "Pengaturan kegiatan" };
export default async function Page() {
  await requirePermission({ event: ["manage"] });
  return <EventSettingsForm />;
}
