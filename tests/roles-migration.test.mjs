import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { root } from "../scripts/lib.mjs";

test("role migration normalizes legacy accounts, preserves school data, and refuses unknown or multiple roles", async () => {
  const url = process.env.STARTER_TEST_DATABASE_URL;
  assert.ok(
    url && process.env.STARTER_TEST_RUN?.startsWith("starter-pg-test-"),
    "Use npm test with its isolated PostgreSQL server.",
  );
  const name = `role_test_${randomBytes(8).toString("hex")}`;
  assert.match(name, /^role_test_[a-f0-9]{16}$/);
  const admin = new Pool({ connectionString: url, max: 1 });
  const folder = mkdtempSync(resolve(tmpdir(), "camp-role-migration-"));
  let pool;
  let created = false;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    const fixtureUrl = new URL(url);
    fixtureUrl.pathname = `/${name}`;
    pool = new Pool({ connectionString: fixtureUrl.href, max: 1 });
    const journal = JSON.parse(
      readFileSync(resolve(root, "drizzle/meta/_journal.json"), "utf8"),
    );
    const previous = journal.entries.filter((entry) => entry.idx < 5);
    assert.equal(previous.length, 5);
    mkdirSync(resolve(folder, "meta"));
    writeFileSync(
      resolve(folder, "meta/_journal.json"),
      JSON.stringify({ ...journal, entries: previous }),
    );
    for (const entry of previous)
      copyFileSync(
        resolve(root, "drizzle", `${entry.tag}.sql`),
        resolve(folder, `${entry.tag}.sql`),
      );
    const database = drizzle(pool);
    await migrate(database, { migrationsFolder: folder });
    for (const [id, role] of [
      ["empty", null],
      ["operator", "user"],
      ["staff", "user,panitia"],
      ["owner", "user,admin"],
      ["owner-staff", "admin,panitia"],
      ["spaces", " USER , PANITIA "],
      ["unknown", "unrecognized"],
    ])
      await pool.query(
        'INSERT INTO "user" (id, name, email, role) VALUES ($1, $1, $2, $3)',
        [id, `${id}@example.com`, role],
      );
    await pool.query("INSERT INTO schools (owner_id, name) VALUES ($1, $2)", [
      "staff",
      "Sekolah sebelum migrasi",
    ]);
    await assert.rejects(
      migrate(database, { migrationsFolder: resolve(root, "drizzle") }),
    );
    assert.equal(
      (await pool.query('SELECT role FROM "user" WHERE id = $1', ["staff"]))
        .rows[0].role,
      "user,panitia",
    );
    // The unknown assignment is reviewed explicitly; the migration never guesses it.
    await pool.query('UPDATE "user" SET role = $1 WHERE id = $2', [
      "user",
      "unknown",
    ]);
    await migrate(database, { migrationsFolder: resolve(root, "drizzle") });
    const actual = Object.fromEntries(
      (await pool.query('SELECT id, role FROM "user"')).rows.map((row) => [
        row.id,
        row.role,
      ]),
    );
    assert.deepEqual(actual, {
      empty: "user",
      operator: "user",
      staff: "panitia",
      owner: "admin",
      "owner-staff": "admin",
      spaces: "panitia",
      unknown: "user",
    });
    assert.equal(
      (
        await pool.query("SELECT name FROM schools WHERE owner_id = $1", [
          "staff",
        ])
      ).rows[0].name,
      "Sekolah sebelum migrasi",
    );
    for (const role of ["user,panitia", "unrecognized", null])
      await assert.rejects(
        pool.query('UPDATE "user" SET role = $1 WHERE id = $2', [
          role,
          "staff",
        ]),
      );
    await migrate(database, { migrationsFolder: resolve(root, "drizzle") });
    assert.equal(
      (await pool.query('SELECT count(*)::int AS total FROM "user"')).rows[0]
        .total,
      7,
    );
  } finally {
    await pool?.end();
    if (created && /^role_test_[a-f0-9]{16}$/.test(name))
      await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
    // Remove only the directory this test created under the OS temporary root.
    if (
      dirname(folder) === resolve(tmpdir()) &&
      basename(folder).startsWith("camp-role-migration-")
    )
      rmSync(folder, { recursive: true, force: true });
  }
});
