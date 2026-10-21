import "server-only";
import { ApiError } from "@/lib/api";
export async function readLimitedBody(request: Request, maximum: number) {
  const size = Number(request.headers.get("content-length") || 0);
  if (size > maximum)
    throw new ApiError(413, "BODY_TOO_LARGE", "Ukuran kiriman melebihi batas.");
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new ApiError(
          413,
          "BODY_TOO_LARGE",
          "Ukuran kiriman melebihi batas.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function readCampJson(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Kirim data JSON.");
  try {
    return JSON.parse(
      (await readLimitedBody(request, 2 * 1024 * 1024)).toString("utf8"),
    ) as unknown;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "INVALID_JSON", "Data JSON belum valid.");
  }
}
export function binaryResponse(bytes: Buffer, mime: string, filename?: string) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(filename
        ? {
            "Content-Disposition": `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, "-")}"`,
          }
        : {}),
    },
  });
}
