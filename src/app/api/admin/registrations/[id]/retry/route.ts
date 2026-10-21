import { withApiPermission } from "@/lib/api";
import { readCampJson } from "@/lib/camp/api-helpers";
import { campIdSchema, retryJobSchema } from "@/validators/camp";
import { getRegistrationAny } from "@/services/camp.service";
import { retryJobAny } from "@/services/camp-jobs.service";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiPermission(
    request,
    { registrations: ["review-any"] },
    async (session) => {
      const id = campIdSchema.parse((await context.params).id);
      const input = retryJobSchema.parse(await readCampJson(request));
      await retryJobAny(session.user.id, id, input.kind);
      return Response.json({ data: await getRegistrationAny(id) });
    },
  );
}
