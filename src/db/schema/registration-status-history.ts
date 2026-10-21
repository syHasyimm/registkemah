import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { registrations } from "./registrations";
import { user } from "./user";
import type { RegistrationStatus } from "@/lib/camp/types";
export const registrationStatusHistory = pgTable(
  "registration_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actor: text("actor").notNull(),
    fromStatus: text("from_status").$type<RegistrationStatus>().notNull(),
    status: text("status").$type<RegistrationStatus>().notNull(),
    note: text("note").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("history_registration_time_idx").on(table.registrationId, table.at),
    index("history_actor_idx").on(table.actorId),
  ],
);
