import { withApiPermission } from "@/lib/api";
import { campIdSchema } from "@/validators/camp";
import { getRegistrationAny } from "@/services/camp.service";
export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiPermission(request, { registrations: ["read-any"] }, async () =>
    Response.json({
      data: await getRegistrationAny(
        campIdSchema.parse((await context.params).id),
      ),
    }),
  );
}
