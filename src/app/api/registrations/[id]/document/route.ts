import { withOperatorSession } from "@/lib/api";
import { binaryResponse } from "@/lib/camp/api-helpers";
import { campIdSchema } from "@/validators/camp";
import { getRegistrationDocument } from "@/services/camp-files.service";
export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withOperatorSession(request, async (session) => {
    const document = await getRegistrationDocument(
      session.user.id,
      campIdSchema.parse((await context.params).id),
    );
    return binaryResponse(document.bytes, "application/pdf", document.filename);
  });
}
