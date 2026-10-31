import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { registrations } from "./registrations";

export const companionPhotos = pgTable(
  "companion_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    companionId: uuid("companion_id").notNull(),
    status: text("status")
      .$type<"Pending" | "Ready" | "Failed" | "Cancelled">()
      .notNull()
      .default("Pending"),
    fileKey: text("file_key"),
    width: integer("width"),
    height: integer("height"),
    bytes: integer("bytes"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("companion_photos_registration_status_idx").on(
      t.registrationId,
      t.status,
    ),
    index("companion_photos_companion_idx").on(t.companionId),
  ],
);
