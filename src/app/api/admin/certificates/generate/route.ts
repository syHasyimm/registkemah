import { withApiPermission } from "@/lib/api";
import { binaryResponse, readCampJson } from "@/lib/camp/api-helpers";
import { generateCertificatesSchema } from "@/validators/certificates";
import { resolveCertificateRecipientsAny } from "@/services/camp-certificates.service";
import { renderCertificatesPdf } from "@/services/camp-certificate-render.service";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiPermission(
    request,
    { certificates: ["generate"] },
    async () => {
      const input = generateCertificatesSchema.parse(
        await readCampJson(request),
      );
      const people = await resolveCertificateRecipientsAny(input);
      return binaryResponse(
        await renderCertificatesPdf(people),
        "application/pdf",
        input.kind === "participants"
          ? "sertifikat-peserta.pdf"
          : "sertifikat-panitia.pdf",
      );
    },
  );
}
