import { withApiPermission } from "@/lib/api";
import { getOverviewAny } from "@/services/camp.service";
export function GET(request: Request) {
  return withApiPermission(request, { registrations: ["read-any"] }, async () =>
    Response.json({ data: await getOverviewAny() }),
  );
}
