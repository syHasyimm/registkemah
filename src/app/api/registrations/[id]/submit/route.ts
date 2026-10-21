import { withOperatorSession } from "@/lib/api";
import { readCampJson } from "@/lib/camp/api-helpers";
import { campIdSchema, submitRegistrationSchema } from "@/validators/camp";
import { submitRegistration } from "@/services/camp.service";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withOperatorSession(request, async (session) => {
    const id = campIdSchema.parse((await context.params).id);
    const input = submitRegistrationSchema.parse(await readCampJson(request));
    return Response.json({
      data: await submitRegistration(session.user.id, id, input.revision),
    });
  });
}
