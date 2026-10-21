import { withApiPermission } from "@/lib/api";
import { binaryResponse } from "@/lib/camp/api-helpers";
import { campIdSchema } from "@/validators/camp";
import { getPhotoAny } from "@/services/camp-photos.service";
export function GET(
  request: Request,
  context: { params: Promise<{ id: string; photoId: string }> },
) {
  return withApiPermission(
    request,
    { registrations: ["read-any"] },
    async () => {
      const p = await context.params;
      return binaryResponse(
        await getPhotoAny(
          campIdSchema.parse(p.id),
          campIdSchema.parse(p.photoId),
        ),
        "image/webp",
      );
    },
  );
}
