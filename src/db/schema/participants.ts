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
import { participantPhotos } from "./participant-photos";
export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey(),
    patrolId: uuid("patrol_id")
      .notNull()
      .references(() => patrols.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    base: text("base").notNull().default(""),
    className: text("class_name").notNull().default(""),
    photoId: uuid("photo_id").references(() => participantPhotos.id),
    zoom: doublePrecision("zoom").notNull().default(1),
    x: doublePrecision("x").notNull().default(50),
    y: doublePrecision("y").notNull().default(50),
    position: integer("position").notNull(),
  },
  (table) => [
    index("participants_patrol_idx").on(table.patrolId),
    index("participants_photo_idx").on(table.photoId),
    check(
      "participants_crop_check",
      sql`${table.zoom} BETWEEN 1 AND 2.5 AND ${table.x} BETWEEN 0 AND 100 AND ${table.y} BETWEEN 0 AND 100`,
    ),
  ],
);
