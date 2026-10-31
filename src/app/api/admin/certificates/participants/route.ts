import { withApiPermission } from "@/lib/api";
import { listCertificateParticipantsAny } from "@/services/camp-certificates.service";

export function GET(request: Request) {
  return withApiPermission(request, { certificates: ["generate"] }, async () =>
    Response.json({ data: await listCertificateParticipantsAny() }),
  );
}
