ALTER TABLE "EventAttendance"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedByUserId" TEXT;

CREATE INDEX "EventAttendance_clubEventId_deletedAt_idx"
ON "EventAttendance"("clubEventId", "deletedAt");
