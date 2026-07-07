CREATE TABLE "ProgressChallenge" (
  "id" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "targetValue" INTEGER NOT NULL,
  "currentValue" INTEGER NOT NULL,
  "progress" INTEGER NOT NULL,
  "rewardBadgeId" TEXT NOT NULL,
  "rewardLabel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "assignedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "version" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedByUserId" TEXT,

  CONSTRAINT "ProgressChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProgressChallenge_athleteId_status_idx" ON "ProgressChallenge"("athleteId", "status");
CREATE INDEX "ProgressChallenge_athleteId_assignedAt_idx" ON "ProgressChallenge"("athleteId", "assignedAt");
CREATE INDEX "ProgressChallenge_expiresAt_status_idx" ON "ProgressChallenge"("expiresAt", "status");

ALTER TABLE "ProgressChallenge"
  ADD CONSTRAINT "ProgressChallenge_athleteId_fkey"
  FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProgressChallenge" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ProgressChallenge" FROM anon, authenticated;
