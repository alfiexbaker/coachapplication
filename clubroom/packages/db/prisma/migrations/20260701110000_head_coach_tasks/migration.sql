CREATE TABLE "HeadCoachTask" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "coachUserId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "title" TEXT NOT NULL,
  "details" TEXT,
  "dueAt" TIMESTAMP(3),
  "athleteId" TEXT,
  "athleteName" TEXT,
  "bookingId" TEXT,
  "offeringId" TEXT,
  "squadId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "completedByUserId" TEXT,
  "version" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedByUserId" TEXT,

  CONSTRAINT "HeadCoachTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HeadCoachStandard" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "version" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedByUserId" TEXT,

  CONSTRAINT "HeadCoachStandard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HeadCoachTask_clubId_status_deletedAt_idx"
  ON "HeadCoachTask"("clubId", "status", "deletedAt");

CREATE INDEX "HeadCoachTask_coachUserId_status_idx"
  ON "HeadCoachTask"("coachUserId", "status");

CREATE INDEX "HeadCoachTask_athleteId_idx"
  ON "HeadCoachTask"("athleteId");

CREATE INDEX "HeadCoachTask_bookingId_idx"
  ON "HeadCoachTask"("bookingId");

CREATE INDEX "HeadCoachTask_squadId_idx"
  ON "HeadCoachTask"("squadId");

CREATE INDEX "HeadCoachStandard_clubId_active_deletedAt_idx"
  ON "HeadCoachStandard"("clubId", "active", "deletedAt");

CREATE INDEX "HeadCoachStandard_category_idx"
  ON "HeadCoachStandard"("category");

ALTER TABLE "HeadCoachTask"
  ADD CONSTRAINT "HeadCoachTask_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Club"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HeadCoachTask"
  ADD CONSTRAINT "HeadCoachTask_coachUserId_fkey"
  FOREIGN KEY ("coachUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HeadCoachTask"
  ADD CONSTRAINT "HeadCoachTask_athleteId_fkey"
  FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HeadCoachTask"
  ADD CONSTRAINT "HeadCoachTask_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HeadCoachTask"
  ADD CONSTRAINT "HeadCoachTask_squadId_fkey"
  FOREIGN KEY ("squadId") REFERENCES "Squad"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HeadCoachStandard"
  ADD CONSTRAINT "HeadCoachStandard_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Club"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
