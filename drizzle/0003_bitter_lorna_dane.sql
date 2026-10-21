CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"settings" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"npsn" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schools_owner_id_unique" UNIQUE("owner_id"),
	CONSTRAINT "schools_npsn_unique" UNIQUE("npsn")
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"school_id" uuid NOT NULL,
	"event_id" text NOT NULL,
	"school" jsonb NOT NULL,
	"number" text,
	"status" text DEFAULT 'Draf' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"approval_version" integer DEFAULT 0 NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_number_unique" UNIQUE("number"),
	CONSTRAINT "registrations_status_check" CHECK ("registrations"."status" IN ('Draf', 'Dikirim', 'Perlu perbaikan', 'Terverifikasi', 'Ditolak')),
	CONSTRAINT "registrations_revision_check" CHECK ("registrations"."revision" >= 0 AND "registrations"."approval_version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "patrols" (
	"id" uuid PRIMARY KEY NOT NULL,
	"registration_id" uuid NOT NULL,
	"category" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"companion" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"leader_id" uuid,
	"position" integer NOT NULL,
	CONSTRAINT "patrols_category_check" CHECK ("patrols"."category" IN ('Putri', 'Putra'))
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"patrol_id" uuid NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"base" text DEFAULT '' NOT NULL,
	"class_name" text DEFAULT '' NOT NULL,
	"photo_id" uuid,
	"zoom" double precision DEFAULT 1 NOT NULL,
	"x" double precision DEFAULT 50 NOT NULL,
	"y" double precision DEFAULT 50 NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "participants_crop_check" CHECK ("participants"."zoom" BETWEEN 1 AND 2.5 AND "participants"."x" BETWEEN 0 AND 100 AND "participants"."y" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "participant_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"file_key" text,
	"width" integer,
	"height" integer,
	"bytes" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"actor_id" text,
	"actor" text NOT NULL,
	"from_status" text NOT NULL,
	"status" text NOT NULL,
	"note" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"snapshot" jsonb NOT NULL,
	"event_snapshot" jsonb NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_id" uuid NOT NULL,
	"status" text DEFAULT 'Menyiapkan' NOT NULL,
	"file_key" text,
	"safe_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registration_documents_approval_id_unique" UNIQUE("approval_id")
);
--> statement-breakpoint
CREATE TABLE "participant_id_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"file_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camp_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_id" uuid,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"payload" jsonb,
	"status" text DEFAULT 'Pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease_token" uuid,
	"leased_until" timestamp with time zone,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"safe_error" text,
	"message_id" text,
	"last_attempt_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "camp_jobs_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patrols" ADD CONSTRAINT "patrols_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_patrol_id_patrols_id_fk" FOREIGN KEY ("patrol_id") REFERENCES "public"."patrols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_photo_id_participant_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."participant_photos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_photos" ADD CONSTRAINT "participant_photos_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_status_history" ADD CONSTRAINT "registration_status_history_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_status_history" ADD CONSTRAINT "registration_status_history_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_approvals" ADD CONSTRAINT "registration_approvals_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_documents" ADD CONSTRAINT "registration_documents_approval_id_registration_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."registration_approvals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_id_cards" ADD CONSTRAINT "participant_id_cards_approval_id_registration_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."registration_approvals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_jobs" ADD CONSTRAINT "camp_jobs_approval_id_registration_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."registration_approvals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_owner_event_unique" ON "registrations" USING btree ("owner_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_school_event_unique" ON "registrations" USING btree ("school_id","event_id");--> statement-breakpoint
CREATE INDEX "registrations_event_status_submitted_idx" ON "registrations" USING btree ("event_id","status","submitted_at","id");--> statement-breakpoint
CREATE INDEX "patrols_registration_idx" ON "patrols" USING btree ("registration_id");--> statement-breakpoint
CREATE INDEX "participants_patrol_idx" ON "participants" USING btree ("patrol_id");--> statement-breakpoint
CREATE INDEX "participants_photo_idx" ON "participants" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX "photos_registration_status_idx" ON "participant_photos" USING btree ("registration_id","status");--> statement-breakpoint
CREATE INDEX "photos_participant_idx" ON "participant_photos" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "history_registration_time_idx" ON "registration_status_history" USING btree ("registration_id","at");--> statement-breakpoint
CREATE INDEX "history_actor_idx" ON "registration_status_history" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_registration_version_unique" ON "registration_approvals" USING btree ("registration_id","version");--> statement-breakpoint
CREATE INDEX "approvals_registration_active_idx" ON "registration_approvals" USING btree ("registration_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "cards_approval_participant_unique" ON "participant_id_cards" USING btree ("approval_id","participant_id");--> statement-breakpoint
CREATE INDEX "cards_participant_idx" ON "participant_id_cards" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "jobs_status_available_idx" ON "camp_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "jobs_approval_kind_idx" ON "camp_jobs" USING btree ("approval_id","kind");--> statement-breakpoint
CREATE INDEX "jobs_leased_until_idx" ON "camp_jobs" USING btree ("leased_until");