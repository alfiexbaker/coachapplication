CREATE TABLE "CoachTrialOffering" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "trialPriceMinor" INTEGER NOT NULL,
    "normalPriceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "durationMinutes" INTEGER NOT NULL,
    "limitPerFamily" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "CoachTrialOffering_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachTrialOffering_coachUserId_key" ON "CoachTrialOffering"("coachUserId");
CREATE INDEX "CoachTrialOffering_enabled_deletedAt_idx" ON "CoachTrialOffering"("enabled", "deletedAt");
CREATE INDEX "CoachTrialOffering_coachUserId_enabled_deletedAt_idx" ON "CoachTrialOffering"("coachUserId", "enabled", "deletedAt");

ALTER TABLE "CoachTrialOffering"
ADD CONSTRAINT "CoachTrialOffering_coachUserId_fkey"
FOREIGN KEY ("coachUserId") REFERENCES "CoachProfile"("userId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CoachTrialOffering" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "CoachTrialOffering" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE "CoachTrialOffering" FROM authenticated;
