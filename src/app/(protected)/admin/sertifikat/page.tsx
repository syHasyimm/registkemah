import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { Certificates } from "@/components/camp/certificates";

export const metadata: Metadata = { title: "Sertifikat" };

export default async function Page() {
  await requirePermission({ certificates: ["generate"] });
  return <Certificates />;
}
