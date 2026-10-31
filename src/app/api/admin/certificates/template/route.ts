import { withApiPermission } from "@/lib/api";
import { binaryResponse } from "@/lib/camp/api-helpers";
import { certificateCommitteeTemplate } from "@/services/camp-certificate-excel.service";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { certificates: ["generate"] }, async () =>
    binaryResponse(
      await certificateCommitteeTemplate(),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "template-panitia.xlsx",
    ),
  );
}
