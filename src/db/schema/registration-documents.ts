import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { registrationApprovals } from "./registration-approvals";
export const registrationDocuments = pgTable("registration_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  approvalId: uuid("approval_id")
    .notNull()
    .unique()
    .references(() => registrationApprovals.id, { onDelete: "cascade" }),
  status: text("status")
    .$type<"Menyiapkan" | "Siap" | "Gagal">()
    .notNull()
    .default("Menyiapkan"),
  fileKey: text("file_key"),
  safeError: text("safe_error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
