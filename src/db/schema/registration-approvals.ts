import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { registrations } from "./registrations";
import type { EventSettings, Registration } from "@/lib/camp/types";
import { sql } from "drizzle-orm";
export const registrationApprovals = pgTable(
  "registration_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    active: boolean("active").notNull().default(true),
    snapshot: jsonb("snapshot").$type<Registration>().notNull(),
    eventSnapshot: jsonb("event_snapshot").$type<EventSettings>().notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("approvals_one_active_per_registration")
      .on(table.registrationId)
      .where(sql`${table.active} = true`),
    uniqueIndex("approvals_registration_version_unique").on(
      table.registrationId,
      table.version,
    ),
    index("approvals_registration_active_idx").on(
      table.registrationId,
      table.active,
    ),
  ],
);
