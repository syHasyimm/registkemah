import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { RegistrationDocument } from "@/components/camp/registration-document";
export const metadata: Metadata = { title: "Formulir pendaftaran" };
export default async function Page() {
  await requireRole(["user"]);
  return <RegistrationDocument />;
}
