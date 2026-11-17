ALTER TABLE "review"
ADD COLUMN IF NOT EXISTS "step_count" integer;

ALTER TABLE "review"
ADD COLUMN IF NOT EXISTS "calories_burned" integer;