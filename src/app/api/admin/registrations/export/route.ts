import { z } from "zod";
import { withApiPermission } from "@/lib/api";
import { binaryResponse } from "@/lib/camp/api-helpers";
import { buildRegistrationCsv } from "@/lib/camp/export";
import { listRegistrationsSchema } from "@/validators/camp";
import { exportRegistrationsAny } from "@/services/camp.service";
export function GET(request: Request) {
  return withApiPermission(
    request,
    { registrations: ["read-any"] },
    async () => {
      const params = Object.fromEntries(new URL(request.url).searchParams);
      const kind = z.enum(["schools", "participants"]).parse(params.kind);
      delete params.kind;
      const input = listRegistrationsSchema.parse(params);
      const rows = await exportRegistrationsAny(input);
      return binaryResponse(
        Buffer.from(buildRegistrationCsv(rows, kind === "participants")),
        "text/csv; charset=utf-8",
        kind === "participants" ? "rekap-peserta.csv" : "rekap-sekolah.csv",
      );
    },
  );
}
