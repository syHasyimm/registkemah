import { withApiPermission } from "@/lib/api";
import { listRegistrationsSchema } from "@/validators/camp";
import { listRegistrationsAny } from "@/services/camp.service";
export function GET(request: Request) {
  return withApiPermission(request, { registrations: ["read-any"] }, async () =>
    Response.json(
      await listRegistrationsAny(
        listRegistrationsSchema.parse(
          Object.fromEntries(new URL(request.url).searchParams),
        ),
      ),
    ),
  );
}
