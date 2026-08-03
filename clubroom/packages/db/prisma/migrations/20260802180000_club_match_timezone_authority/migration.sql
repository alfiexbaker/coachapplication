ALTER TABLE "ClubMatch"
ADD COLUMN "timeZone" TEXT;

-- Existing rows were written by interpreting wall-clock input as UTC.
UPDATE "ClubMatch"
SET "timeZone" = 'UTC'
WHERE "timeZone" IS NULL;

ALTER TABLE "ClubMatch"
ALTER COLUMN "timeZone" SET NOT NULL;
