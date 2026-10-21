import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./user";
export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  npsn: text("npsn").unique(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
