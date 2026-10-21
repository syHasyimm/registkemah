import { withApiPermission } from "@/lib/api";
import { getWorkspaceAny } from "@/services/camp.service";
export function GET(request: Request) {
  return withApiPermission(
    request,
    { registrations: ["read-any"] },
    async (session) =>
      Response.json({ data: await getWorkspaceAny(session.user.id) }),
  );
}
