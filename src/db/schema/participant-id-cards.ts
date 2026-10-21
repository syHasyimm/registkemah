import { index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { registrationApprovals } from "./registration-approvals";
export const participantIdCards = pgTable(
  "participant_id_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    approvalId: uuid("approval_id")
      .notNull()
      .references(() => registrationApprovals.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id").notNull(),
    fileKey: text("file_key").notNull(),
  },
  (table) => [
    uniqueIndex("cards_approval_participant_unique").on(
      table.approvalId,
      table.participantId,
    ),
    index("cards_participant_idx").on(table.participantId),
  ],
);
