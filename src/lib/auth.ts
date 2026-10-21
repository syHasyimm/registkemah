import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { siteConfig } from "@/config/site";
import { env } from "@/lib/env";
import { ac, ADMIN_ROLES, DEFAULT_ROLE, roles } from "@/lib/permissions";
import { enqueueAccountEmail } from "@/services/camp-jobs.service";
import { isAppRole } from "@/lib/role-policy.mjs";

export const auth = betterAuth({
  appName: siteConfig.name,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  advanced: { cookiePrefix: `ngodingpakeai-${siteConfig.id}` },
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          // Only the permission-guarded admin endpoint may provision staff.
          // Email signup and every social provider always create operators.
          const role =
            context?.path === "/admin/create-user"
              ? (("role" in user ? user.role : DEFAULT_ROLE) ?? DEFAULT_ROLE)
              : DEFAULT_ROLE;
          if (!isAppRole(role))
            throw new APIError("BAD_REQUEST", {
              code: "INVALID_ROLE",
              message: "Pilih tepat satu peran akun yang valid.",
            });
          return { data: { ...user, role } };
        },
      },
      update: {
        before: async (data) => {
          if ("role" in data && !isAppRole(data.role))
            throw new APIError("BAD_REQUEST", {
              code: "INVALID_ROLE",
              message: "Pilih tepat satu peran akun yang valid.",
            });
          return { data };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await enqueueAccountEmail({
        to: user.email,
        subject: "Atur ulang password Registrasi Kemah",
        text: `Halo ${user.name},\n\nBuka tautan berikut untuk mengatur password baru:\n${url}\n\nJika Anda tidak meminta pemulihan, abaikan pesan ini.`,
        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }) => {
      await enqueueAccountEmail({
        to: user.email,
        subject: "Verifikasi email Registrasi Kemah",
        text: `Halo ${user.name},\n\nVerifikasi kepemilikan email dengan membuka tautan berikut:\n${url}\n\nTautan berlaku selama satu jam. Jika Anda tidak membuat akun ini, abaikan pesan ini.`,
        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      });
    },
  },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
  plugins: [
    // Roles come from the access control in lib/permissions.ts. New accounts get
    // DEFAULT_ROLE; `role` is not accepted from signup input, so nobody can
    // grant themselves one. Use npm run role:set to promote an account.
    admin({
      ac,
      roles,
      defaultRole: DEFAULT_ROLE,
      adminRoles: ADMIN_ROLES,
    }),
    // Keep nextCookies() last so it observes every other plugin's cookies.
    nextCookies(),
  ],
});
