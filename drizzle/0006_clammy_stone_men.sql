CREATE TABLE "patrol_companions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"patrol_id" uuid NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"photo_id" uuid,
	"zoom" double precision DEFAULT 1 NOT NULL,
	"x" double precision DEFAULT 50 NOT NULL,
	"y" double precision DEFAULT 50 NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "companions_crop_check" CHECK ("patrol_companions"."zoom" BETWEEN 1 AND 2.5 AND "patrol_companions"."x" BETWEEN 0 AND 100 AND "patrol_companions"."y" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "companion_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"companion_id" uuid NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"file_key" text,
	"width" integer,
	"height" integer,
	"bytes" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patrol_companions" ADD CONSTRAINT "patrol_companions_patrol_id_patrols_id_fk" FOREIGN KEY ("patrol_id") REFERENCES "public"."patrols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patrol_companions" ADD CONSTRAINT "patrol_companions_photo_id_companion_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."companion_photos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companion_photos" ADD CONSTRAINT "companion_photos_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companions_patrol_idx" ON "patrol_companions" USING btree ("patrol_id");--> statement-breakpoint
CREATE INDEX "companions_photo_idx" ON "patrol_companions" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX "companion_photos_registration_status_idx" ON "companion_photos" USING btree ("registration_id","status");--> statement-breakpoint
CREATE INDEX "companion_photos_companion_idx" ON "companion_photos" USING btree ("companion_id");
--> statement-breakpoint
-- Copy the legacy companion without changing any existing patrol or approval.
-- Reusing the patrol UUID in this separate table gives legacy snapshots a stable identity.
INSERT INTO "patrol_companions" ("id", "patrol_id", "name", "phone", "position")
SELECT "id", "id", "companion", "phone", 0
FROM "patrols"
WHERE length(trim("companion")) > 0 OR length(trim("phone")) > 0
ON CONFLICT ("id") DO NOTHING;
