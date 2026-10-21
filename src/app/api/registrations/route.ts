import { withOperatorSession } from "@/lib/api";
import { createRegistration } from "@/services/camp.service";
export function POST(request: Request) {
  return withOperatorSession(request, async (session) =>
    Response.json(
      { data: await createRegistration(session.user.id) },
      { status: 201 },
    ),
  );
}
