import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { registrations } from "./registrations";
import type { Category } from "@/lib/camp/types";
export const patrols = pgTable(
  "patrols",
  {
    id: uuid("id").primaryKey(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    category: text("category").$type<Category>().notNull(),
    name: text("name").notNull().default(""),
    companion: text("companion").notNull().default(""),
    phone: text("phone").notNull().default(""),
    leaderId: uuid("leader_id"),
    position: integer("position").notNull(),
  },
  (table) => [
    index("patrols_registration_idx").on(table.registrationId),
    check(
      "patrols_category_check",
      sql`${table.category} IN ('Putri', 'Putra')`,
    ),
  ],
);
