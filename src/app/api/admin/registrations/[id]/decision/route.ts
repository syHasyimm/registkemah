import { withApiPermission } from "@/lib/api";
import { readCampJson } from "@/lib/camp/api-helpers";
import { campIdSchema, decisionSchema } from "@/validators/camp";
import { decideRegistrationAny } from "@/services/camp.service";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiPermission(
    request,
    { registrations: ["review-any"] },
    async (session) => {
      const id = campIdSchema.parse((await context.params).id);
      const input = decisionSchema.parse(await readCampJson(request));
      return Response.json({
        data: await decideRegistrationAny(session.user.id, id, input),
      });
    },
  );
}
