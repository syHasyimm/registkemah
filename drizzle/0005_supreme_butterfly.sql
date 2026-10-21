-- Stop before changing any accounts if a legacy role needs manual review.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "user" u,
      LATERAL unnest(string_to_array(coalesce(u.role, ''), ',')) AS tokens(value)
    WHERE btrim(tokens.value) <> ''
      AND lower(btrim(tokens.value)) NOT IN ('user', 'panitia', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unrecognized account roles; review role assignments before applying this migration';
  END IF;
END $$;
--> statement-breakpoint
-- Keep accounts and their school records. Staff roles take precedence over operator.
WITH normalized AS (
  SELECT id, CASE
    WHEN 'admin' = ANY(regexp_split_to_array(lower(btrim(coalesce(role, ''))), '[[:space:]]*,[[:space:]]*')) THEN 'admin'
    WHEN 'panitia' = ANY(regexp_split_to_array(lower(btrim(coalesce(role, ''))), '[[:space:]]*,[[:space:]]*')) THEN 'panitia'
    ELSE 'user'
  END AS role
  FROM "user"
)
UPDATE "user" u SET role = n.role, updated_at = now()
FROM normalized n WHERE u.id = n.id AND u.role IS DISTINCT FROM n.role;
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_single_role_check" CHECK ("user"."role" IN ('user', 'panitia', 'admin'));
