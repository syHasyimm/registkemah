import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
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

test("companion migration preserves legacy rows and immutable approvals, backfills once, and retains partial drafts", async () => {
  const url = process.env.STARTER_TEST_DATABASE_URL;
  assert.ok(
    url && process.env.STARTER_TEST_RUN?.startsWith("starter-pg-test-"),
  );
  const name = `companion_test_${randomBytes(8).toString("hex")}`;
  const admin = new Pool({ connectionString: url, max: 1 });
  const folder = mkdtempSync(resolve(tmpdir(), "camp-companion-migration-"));
  let pool,
    created = false;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    const fixtureUrl = new URL(url);
    fixtureUrl.pathname = `/${name}`;
    pool = new Pool({ connectionString: fixtureUrl.href, max: 1 });
    const journal = JSON.parse(
      readFileSync(resolve(root, "drizzle/meta/_journal.json"), "utf8"),
    );
    const entries = journal.entries.filter((entry) => entry.idx < 6);
    assert.equal(entries.length, 6);
    mkdirSync(resolve(folder, "meta"));
    writeFileSync(
      resolve(folder, "meta/_journal.json"),
      JSON.stringify({ ...journal, entries }),
    );
    for (const entry of entries)
      copyFileSync(
        resolve(root, "drizzle", `${entry.tag}.sql`),
        resolve(folder, `${entry.tag}.sql`),
      );
    const database = drizzle(pool);
    await migrate(database, { migrationsFolder: folder });
    const school = randomUUID(),
      registration = randomUUID(),
      patrol = randomUUID(),
      partial = randomUUID(),
      empty = randomUUID(),
      participant = randomUUID();
    await pool.query('INSERT INTO "user" (id,name,email) VALUES ($1,$2,$3)', [
      "legacy",
      "Operator lama",
      "legacy@example.com",
    ]);
    await pool.query("INSERT INTO events (id, settings) VALUES ('main', '{}')");
    await pool.query(
      "INSERT INTO schools (id,owner_id,name) VALUES ($1,'legacy','Sekolah lama')",
      [school],
    );
    await pool.query(
      "INSERT INTO registrations (id,owner_id,school_id,event_id,school,status,approval_version) VALUES ($1,'legacy',$2,'main',$3,'Terverifikasi',1)",
      [registration, school, { name: "Sekolah lama" }],
    );
    for (const [id, name, phone, position] of [
      [patrol, "BUDI santoso", "+6281234567890", 0],
      [partial, "", "+6281234567891", 1],
      [empty, "", "", 2],
    ])
      await pool.query(
        "INSERT INTO patrols (id,registration_id,category,name,companion,phone,position) VALUES ($1,$2,'Putri','Melati',$3,$4,$5)",
        [id, registration, name, phone, position],
      );
    await pool.query(
      "INSERT INTO participants (id,patrol_id,name,position) VALUES ($1,$2,'Peserta lama',0)",
      [participant, patrol],
    );
    await pool.query(
      "INSERT INTO registration_approvals (registration_id,version,snapshot,event_snapshot) VALUES ($1,1,$2,'{}')",
      [
        registration,
        {
          id: registration,
          school: { name: "Sekolah lama" },
          patrols: [
            {
              id: patrol,
              companion: "BUDI santoso",
              phone: "+6281234567890",
              participants: [{ id: participant, name: "Peserta lama" }],
            },
          ],
        },
      ],
    );
    const tables = [
      "user",
      "schools",
      "events",
      "registrations",
      "patrols",
      "participants",
      "registration_approvals",
    ];
    const before = {};
    for (const table of tables)
      before[table] = (
        await pool.query(`SELECT * FROM "${table}" ORDER BY id`)
      ).rows;
    await migrate(database, { migrationsFolder: resolve(root, "drizzle") });
    for (const table of tables)
      assert.deepEqual(
        (await pool.query(`SELECT * FROM "${table}" ORDER BY id`)).rows,
        before[table],
      );
    const rows = (
      await pool.query(
        "SELECT id,patrol_id,name,phone,photo_id FROM patrol_companions ORDER BY name",
      )
    ).rows;
    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.find((r) => r.id === patrol),
      {
        id: patrol,
        patrol_id: patrol,
        name: "BUDI santoso",
        phone: "+6281234567890",
        photo_id: null,
      },
    );
    assert.equal(rows.find((r) => r.id === partial).phone, "+6281234567891");
    await migrate(database, { migrationsFolder: resolve(root, "drizzle") });
    assert.equal(
      (await pool.query("SELECT count(*)::int AS n FROM patrol_companions"))
        .rows[0].n,
      2,
    );
  } finally {
    await pool?.end();
    if (created && /^companion_test_[a-f0-9]{16}$/.test(name))
      await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
    if (
      dirname(folder) === resolve(tmpdir()) &&
      basename(folder).startsWith("camp-companion-migration-")
    )
      rmSync(folder, { recursive: true, force: true });
  }
});
