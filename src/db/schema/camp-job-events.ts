import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { campJobs } from "./camp-jobs";
import { user } from "./user";
export const campJobEvents = pgTable(
  "camp_job_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => campJobs.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    event: text("event").notNull(),
    note: text("note").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("job_events_job_time_idx").on(table.jobId, table.at),
    index("job_events_actor_idx").on(table.actorId),
  ],
);
