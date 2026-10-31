import { ApiError, withApiPermission } from "@/lib/api";
import { readLimitedBody } from "@/lib/camp/api-helpers";
import { MAX_CERTIFICATE_EXCEL_BYTES } from "@/lib/camp/certificates";
import { importCertificateCommittee } from "@/services/camp-certificate-excel.service";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiPermission(
    request,
    { certificates: ["generate"] },
    async () => {
      const type = request.headers.get("content-type")?.split(";")[0];
      if (
        ![
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/octet-stream",
        ].includes(type || "")
      )
        throw new ApiError(
          415,
          "UNSUPPORTED_MEDIA_TYPE",
          "Unggah file Excel .xlsx.",
        );
      const bytes = await readLimitedBody(request, MAX_CERTIFICATE_EXCEL_BYTES);
      return Response.json({ data: await importCertificateCommittee(bytes) });
    },
  );
}
