import { withOperatorSession } from "@/lib/api";
import { getWorkspace } from "@/services/camp.service";
export function GET(request: Request) {
  return withOperatorSession(request, async (session) =>
    Response.json({ data: await getWorkspace(session.user.id) }),
  );
}
