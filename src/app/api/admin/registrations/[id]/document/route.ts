import { withApiPermission } from "@/lib/api";
import { binaryResponse } from "@/lib/camp/api-helpers";
import { campIdSchema } from "@/validators/camp";
import { getRegistrationDocumentAny } from "@/services/camp-files.service";
export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiPermission(
    request,
    { registrations: ["read-any"] },
    async () => {
      const document = await getRegistrationDocumentAny(
        campIdSchema.parse((await context.params).id),
      );
      return binaryResponse(
        document.bytes,
        "application/pdf",
        document.filename,
      );
    },
  );
}
