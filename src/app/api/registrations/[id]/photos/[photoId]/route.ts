import { withOperatorSession } from "@/lib/api";
import { binaryResponse, readLimitedBody } from "@/lib/camp/api-helpers";
import { campIdSchema } from "@/validators/camp";
import {
  cancelPhotoUpload,
  completePhotoUpload,
  getPhoto,
} from "@/services/camp-photos.service";
type Context = { params: Promise<{ id: string; photoId: string }> };
async function ids(context: Context) {
  const p = await context.params;
  return {
    id: campIdSchema.parse(p.id),
    photoId: campIdSchema.parse(p.photoId),
  };
}
export function GET(request: Request, context: Context) {
  return withOperatorSession(request, async (session) => {
    const { id, photoId } = await ids(context);
    return binaryResponse(
      await getPhoto(session.user.id, id, photoId),
      "image/webp",
    );
  });
}
export function PUT(request: Request, context: Context) {
  return withOperatorSession(request, async (session) => {
    const { id, photoId } = await ids(context);
    return Response.json({
      data: await completePhotoUpload(
        session.user.id,
        id,
        photoId,
        await readLimitedBody(request, 5 * 1024 * 1024),
      ),
    });
  });
}
export function DELETE(request: Request, context: Context) {
  return withOperatorSession(request, async (session) => {
    const { id, photoId } = await ids(context);
    await cancelPhotoUpload(session.user.id, id, photoId);
    return new Response(null, { status: 204 });
  });
}
