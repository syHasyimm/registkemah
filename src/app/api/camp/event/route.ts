import { getEvent } from "@/services/camp.service";
export async function GET() {
  return Response.json(
    { data: (await getEvent()).settings },
    { headers: { "Cache-Control": "no-store" } },
  );
}
