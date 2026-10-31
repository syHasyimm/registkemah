import { withOperatorSession } from "@/lib/api";
import { readCampJson } from "@/lib/camp/api-helpers";
import { campIdSchema, companionPhotoInitSchema } from "@/validators/camp";
import { beginCompanionPhotoUpload } from "@/services/camp-companion-photos.service";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withOperatorSession(request, async (session) => {
    const id = campIdSchema.parse((await context.params).id);
    const input = companionPhotoInitSchema.parse(await readCampJson(request));
    return Response.json(
      {
        data: await beginCompanionPhotoUpload(
          session.user.id,
          id,
          input.companionId,
          input.revision,
        ),
      },
      { status: 201 },
    );
  });
}
