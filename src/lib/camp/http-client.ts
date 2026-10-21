export class CampApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
export async function campRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const sourcePage =
    typeof window !== "undefined" ? window.location.pathname : "";
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options.body && typeof options.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  // Ignore responses from an unmounted workspace after logout or navigation.
  if (
    typeof window !== "undefined" &&
    window.location.pathname === sourcePage &&
    /^\/(?:app|admin)(?:\/|$)/.test(sourcePage) &&
    (response.status === 401 || body.error?.code === "FORBIDDEN_ROLE")
  )
    window.location.replace(
      response.status === 401 ? "/sign-in" : "/after-login",
    );
  if (!response.ok)
    throw new CampApiError(
      body.error?.message || "Permintaan belum berhasil. Coba lagi.",
      response.status,
      body.error?.code || "REQUEST_FAILED",
    );
  return body;
}
