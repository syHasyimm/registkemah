import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { registrations } from "./registrations";
export const participantPhotos = pgTable(
  "participant_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id").notNull(),
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
  (table) => [
    index("photos_registration_status_idx").on(
      table.registrationId,
      table.status,
    ),
    index("photos_participant_idx").on(table.participantId),
  ],
);
