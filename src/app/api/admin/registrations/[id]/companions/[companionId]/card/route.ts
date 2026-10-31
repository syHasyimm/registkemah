import { withApiPermission } from "@/lib/api";
import { binaryResponse } from "@/lib/camp/api-helpers";
import { campIdSchema } from "@/validators/camp";
import { getRegistrationCompanionCardAny } from "@/services/camp-files.service";

export function GET(
  request: Request,
  context: { params: Promise<{ id: string; companionId: string }> },
) {
  return withApiPermission(
    request,
    { registrations: ["read-any"] },
    async () => {
      const params = await context.params;
      return binaryResponse(
        await getRegistrationCompanionCardAny(
          campIdSchema.parse(params.id),
          campIdSchema.parse(params.companionId),
        ),
        "image/png",
      );
    },
  );
}
