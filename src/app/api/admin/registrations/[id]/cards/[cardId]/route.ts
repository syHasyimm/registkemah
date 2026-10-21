import { withApiPermission } from "@/lib/api";
import { binaryResponse } from "@/lib/camp/api-helpers";
import { campIdSchema } from "@/validators/camp";
import { getRegistrationCardAny } from "@/services/camp-files.service";
export function GET(
  request: Request,
  context: { params: Promise<{ id: string; cardId: string }> },
) {
  return withApiPermission(
    request,
    { registrations: ["read-any"] },
    async () => {
      const p = await context.params;
      return binaryResponse(
        await getRegistrationCardAny(
          campIdSchema.parse(p.id),
          campIdSchema.parse(p.cardId),
        ),
        "image/png",
      );
    },
  );
}
