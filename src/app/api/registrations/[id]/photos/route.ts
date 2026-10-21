import { withOperatorSession } from "@/lib/api";
import { readCampJson } from "@/lib/camp/api-helpers";
import { campIdSchema, photoInitSchema } from "@/validators/camp";
import { beginPhotoUpload } from "@/services/camp-photos.service";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withOperatorSession(request, async (session) => {
    const id = campIdSchema.parse((await context.params).id);
    const input = photoInitSchema.parse(await readCampJson(request));
    return Response.json(
      {
        data: await beginPhotoUpload(
          session.user.id,
          id,
          input.participantId,
          input.revision,
        ),
      },
      { status: 201 },
    );
  });
}
