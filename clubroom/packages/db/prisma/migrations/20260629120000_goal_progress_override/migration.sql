ALTER TABLE "Goal"
ADD COLUMN "progress" INTEGER;

ALTER TABLE "Goal"
ADD CONSTRAINT "Goal_progress_check"
CHECK ("progress" IS NULL OR ("progress" >= 0 AND "progress" <= 100));
