import { notFound } from "next/navigation";
import { OperatorDashboard } from "@/components/camp/operator-dashboard";
import { RegistrationForm } from "@/components/camp/registration-form";
import { RegistrationDocument } from "@/components/camp/registration-document";
import { AdminDashboard } from "@/components/camp/admin-dashboard";
import { AdminRegistrationList } from "@/components/camp/admin-list";
import { AdminRegistrationDetail } from "@/components/camp/admin-detail";
import { EventSettingsForm } from "@/components/camp/event-settings";
import { IdCards } from "@/components/camp/id-cards";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const route = path.join("/");
  if (!route) return <OperatorDashboard />;
  if (route === "pendaftaran") return <RegistrationForm />;
  if (route === "pendaftaran/bukti") return <RegistrationDocument />;
  if (route === "admin") return <AdminDashboard />;
  if (route === "admin/pendaftaran") return <AdminRegistrationList />;
  if (route === "admin/kegiatan") return <EventSettingsForm />;
  if (path[0] === "admin" && path[1] === "pendaftaran" && path[2]) {
    if (path.length === 3) return <AdminRegistrationDetail id={path[2]} />;
    if (path.length === 4 && path[3] === "id-card")
      return <IdCards id={path[2]} />;
  }
  notFound();
}
