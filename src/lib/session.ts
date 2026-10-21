import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Permissions } from "@/lib/permissions";
import { isAppRole, roleHome, type AppRole } from "@/lib/role-policy.mjs";

export const getSession = cache(async () =>
  auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  }),
);

// Use at the data boundary too: a layout alone doesn't protect actions or APIs.
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!isAppRole(session.user.role)) notFound();
  return session;
}

export async function requireRole(allowed: readonly AppRole[]) {
  const session = await requireSession();
  const home = roleHome(session.user.role);
  if (!home || !isAppRole(session.user.role)) notFound();
  if (!allowed.includes(session.user.role)) redirect(home);
  return session;
}

export async function redirectToRoleHome(): Promise<never> {
  const session = await requireSession();
  const home = roleHome(session.user.role);
  if (!home) notFound();
  redirect(home);
}

// Reads the stored role, so a revoked role takes effect on the next request
// instead of when the session expires.
export async function hasPermission(userId: string, permissions: Permissions) {
  const { success } = await auth.api.userHasPermission({
    body: { userId, permissions },
  });
  return success;
}

// Page and Server Action guard. Renders not-found rather than a "forbidden"
// screen so a signed-in user cannot map out the routes they lack access to.
export async function requirePermission(permissions: Permissions) {
  const session = await requireRole(["admin", "panitia"]);
  if (!(await hasPermission(session.user.id, permissions))) notFound();
  return session;
}
