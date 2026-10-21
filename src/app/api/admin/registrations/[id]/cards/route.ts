import { withApiPermission } from "@/lib/api";
import { campIdSchema } from "@/validators/camp";
import { listRegistrationCardsAny } from "@/services/camp-files.service";
export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiPermission(request, { registrations: ["read-any"] }, async () =>
    Response.json(
      await listRegistrationCardsAny(
        campIdSchema.parse((await context.params).id),
      ),
    ),
  );
}
