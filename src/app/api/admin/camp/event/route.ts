import { withApiPermission } from "@/lib/api";
import { readCampJson } from "@/lib/camp/api-helpers";
import { saveEventSchema } from "@/validators/camp";
import { saveEventAny } from "@/services/camp.service";
export function PUT(request: Request) {
  return withApiPermission(request, { event: ["manage"] }, async () =>
    Response.json({
      data: await saveEventAny(
        saveEventSchema.parse(await readCampJson(request)),
      ),
    }),
  );
}
