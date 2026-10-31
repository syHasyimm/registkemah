import { withApiPermission } from "@/lib/api";
import { campIdSchema } from "@/validators/camp";
import {
  listRegistrationCardsAny,
  listRegistrationCompanionCardsAny,
} from "@/services/camp-files.service";
import { z } from "zod";
export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiPermission(
    request,
    { registrations: ["read-any"] },
    async () => {
      const kind = z
        .enum(["participants", "companions"])
        .parse(new URL(request.url).searchParams.get("kind") || "participants");
      const id = campIdSchema.parse((await context.params).id);
      return Response.json(
        await (kind === "companions"
          ? listRegistrationCompanionCardsAny(id)
          : listRegistrationCardsAny(id)),
      );
    },
  );
}
