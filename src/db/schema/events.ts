import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { EventSettings } from "@/lib/camp/types";
export const events = pgTable("events", {
  id: text("id").primaryKey(),
  settings: jsonb("settings").$type<EventSettings>().notNull(),
  revision: integer("revision").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
