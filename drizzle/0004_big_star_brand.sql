CREATE TABLE "camp_job_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"actor_id" text,
	"event" text NOT NULL,
	"note" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "camp_job_events" ADD CONSTRAINT "camp_job_events_job_id_camp_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."camp_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_job_events" ADD CONSTRAINT "camp_job_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_events_job_time_idx" ON "camp_job_events" USING btree ("job_id","at");--> statement-breakpoint
CREATE INDEX "job_events_actor_idx" ON "camp_job_events" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_one_active_per_registration" ON "registration_approvals" USING btree ("registration_id") WHERE "registration_approvals"."active" = true;