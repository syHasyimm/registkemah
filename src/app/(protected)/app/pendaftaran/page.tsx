import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { RegistrationForm } from "@/components/camp/registration-form";
export const metadata: Metadata = { title: "Pendaftaran sekolah" };
export default async function Page() {
  await requireRole(["user"]);
  return <RegistrationForm />;
}
