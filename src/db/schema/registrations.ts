import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./user";
import { schools } from "./schools";
import { events } from "./events";
import type { RegistrationStatus, School } from "@/lib/camp/types";
export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    school: jsonb("school").$type<School>().notNull(),
    number: text("number").unique(),
    status: text("status")
      .$type<RegistrationStatus>()
      .notNull()
      .default("Draf"),
    revision: integer("revision").notNull().default(0),
    approvalVersion: integer("approval_version").notNull().default(0),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("registrations_owner_event_unique").on(
      table.ownerId,
      table.eventId,
    ),
    uniqueIndex("registrations_school_event_unique").on(
      table.schoolId,
      table.eventId,
    ),
    index("registrations_event_status_submitted_idx").on(
      table.eventId,
      table.status,
      table.submittedAt,
      table.id,
    ),
    check(
      "registrations_status_check",
      sql`${table.status} IN ('Draf', 'Dikirim', 'Perlu perbaikan', 'Terverifikasi', 'Ditolak')`,
    ),
    check(
      "registrations_revision_check",
      sql`${table.revision} >= 0 AND ${table.approvalVersion} >= 0`,
    ),
  ],
);
