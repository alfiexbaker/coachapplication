-- AlterTable
ALTER TABLE "CoachingOffering"
ADD COLUMN "skillsFocus" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
