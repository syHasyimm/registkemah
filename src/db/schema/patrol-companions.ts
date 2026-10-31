import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { patrols } from "./patrols";
import { companionPhotos } from "./companion-photos";

export const patrolCompanions = pgTable(
  "patrol_companions",
  {
    id: uuid("id").primaryKey(),
    patrolId: uuid("patrol_id")
      .notNull()
      .references(() => patrols.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    photoId: uuid("photo_id").references(() => companionPhotos.id),
    zoom: doublePrecision("zoom").notNull().default(1),
    x: doublePrecision("x").notNull().default(50),
    y: doublePrecision("y").notNull().default(50),
    position: integer("position").notNull(),
  },
  (t) => [
    index("companions_patrol_idx").on(t.patrolId),
    index("companions_photo_idx").on(t.photoId),
    check(
      "companions_crop_check",
      sql`${t.zoom} BETWEEN 1 AND 2.5 AND ${t.x} BETWEEN 0 AND 100 AND ${t.y} BETWEEN 0 AND 100`,
    ),
  ],
);
