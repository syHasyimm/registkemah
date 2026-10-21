/** @typedef {'user' | 'panitia' | 'admin'} AppRole */

/** @type {readonly AppRole[]} */
export const APP_ROLES = ["user", "panitia", "admin"];

/** @param {unknown} value @returns {value is AppRole} */
export function isAppRole(value) {
  return APP_ROLES.some((role) => role === value);
}

/** @param {unknown} role @returns {'/app' | '/admin' | null} */
export function roleHome(role) {
  if (!isAppRole(role)) return null;
  return role === "user" ? "/app" : "/admin";
}
