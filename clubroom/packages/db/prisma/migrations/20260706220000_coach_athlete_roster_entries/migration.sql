CREATE TABLE "CoachAthleteRosterEntry" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "primaryFocus" TEXT,
    "notificationPreference" TEXT NOT NULL DEFAULT 'ALL',
    "removalReason" TEXT,
    "customRemovalReason" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT true,
    "removedTotalSessions" INTEGER NOT NULL DEFAULT 0,
    "removedTotalRevenueMinor" INTEGER NOT NULL DEFAULT 0,
    "removedAt" TIMESTAMP(3),
    "restoredAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "CoachAthleteRosterEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachAthleteRosterEntry_coachUserId_athleteId_key" ON "CoachAthleteRosterEntry"("coachUserId", "athleteId");
CREATE INDEX "CoachAthleteRosterEntry_coachUserId_deletedAt_idx" ON "CoachAthleteRosterEntry"("coachUserId", "deletedAt");
CREATE INDEX "CoachAthleteRosterEntry_athleteId_deletedAt_idx" ON "CoachAthleteRosterEntry"("athleteId", "deletedAt");
CREATE INDEX "CoachAthleteRosterEntry_coachUserId_removedAt_idx" ON "CoachAthleteRosterEntry"("coachUserId", "removedAt");

ALTER TABLE "CoachAthleteRosterEntry" ADD CONSTRAINT "CoachAthleteRosterEntry_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "CoachProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachAthleteRosterEntry" ADD CONSTRAINT "CoachAthleteRosterEntry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachAthleteRosterEntry" ADD CONSTRAINT "CoachAthleteRosterEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachAthleteRosterEntry" ADD CONSTRAINT "CoachAthleteRosterEntry_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CoachAthleteRosterEntry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "CoachAthleteRosterEntry" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE "CoachAthleteRosterEntry" FROM authenticated;
