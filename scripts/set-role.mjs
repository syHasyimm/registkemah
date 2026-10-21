// Grants a role to an existing account: npm run role:set -- <email> <role>
// Roles are only meaningful if they exist in src/lib/permissions.ts. Signup
// never sets a role, so promoting the first admin happens here.
import { Pool } from "pg";
import { loadEnvironment } from "./lib.mjs";
import { databaseUrl, databaseError } from "./postgres.mjs";
import { isAppRole } from "../src/lib/role-policy.mjs";

const [email, role, extra] = process.argv.slice(2);
if (!email || !isAppRole(role) || extra !== undefined) {
  console.error(
    "Usage: npm run role:set -- <email> <role>\n" +
      "Choose exactly one role: user (operator sekolah), panitia, or admin.\n" +
      "The selected role replaces the previous role.",
  );
  process.exit(1);
}

await loadEnvironment();
const pool = new Pool({
  connectionString: databaseUrl(),
  max: 1,
  connectionTimeoutMillis: 5000,
});
pool.on("error", () => {});
try {
  const { rows } = await pool.query(
    'UPDATE "user" SET role = $1, updated_at = now() WHERE lower(email) = lower($2) RETURNING email, role',
    [role, email],
  );
  if (!rows.length) {
    console.error(`No account found for ${email}. Sign up first, then retry.`);
    process.exitCode = 1;
  } else {
    console.log(
      `${rows[0].email} now has role: ${rows[0].role ?? "(default)"}`,
    );
    console.log("Sign out and back in, or reload, to pick up the new access.");
  }
} catch (error) {
  console.error(databaseError(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
