import { withOperatorSession } from "@/lib/api";
import { readCampJson } from "@/lib/camp/api-helpers";
import { campIdSchema, saveRegistrationSchema } from "@/validators/camp";
import { getRegistration, saveRegistration } from "@/services/camp.service";
type Context = { params: Promise<{ id: string }> };
export function GET(request: Request, context: Context) {
  return withOperatorSession(request, async (session) =>
    Response.json({
      data: await getRegistration(
        session.user.id,
        campIdSchema.parse((await context.params).id),
      ),
    }),
  );
}
export function PUT(request: Request, context: Context) {
  return withOperatorSession(request, async (session) => {
    const id = campIdSchema.parse((await context.params).id);
    const input = saveRegistrationSchema.parse(await readCampJson(request));
    return Response.json({
      data: await saveRegistration(session.user.id, id, input),
    });
  });
}
