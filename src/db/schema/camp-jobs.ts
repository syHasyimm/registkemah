import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { registrationApprovals } from "./registration-approvals";
export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  expiresAt?: string;
};
export const campJobs = pgTable(
  "camp_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    approvalId: uuid("approval_id").references(() => registrationApprovals.id, {
      onDelete: "cascade",
    }),
    kind: text("kind")
      .$type<"document" | "cards" | "email" | "auth-email">()
      .notNull(),
    key: text("key").notNull().unique(),
    payload: jsonb("payload").$type<MailPayload>(),
    status: text("status")
      .$type<"Pending" | "Running" | "Done" | "Failed" | "Cancelled">()
      .notNull()
      .default("Pending"),
    attempts: integer("attempts").notNull().default(0),
    leaseToken: uuid("lease_token"),
    leasedUntil: timestamp("leased_until", { withTimezone: true }),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    safeError: text("safe_error"),
    messageId: text("message_id"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("jobs_status_available_idx").on(table.status, table.availableAt),
    index("jobs_approval_kind_idx").on(table.approvalId, table.kind),
    index("jobs_leased_until_idx").on(table.leasedUntil),
  ],
);
