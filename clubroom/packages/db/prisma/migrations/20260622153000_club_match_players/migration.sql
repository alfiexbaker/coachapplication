CREATE TABLE "ClubMatchPlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "responseAt" TIMESTAMP(3),
    "parentNote" TEXT,
    "position" TEXT,
    "jerseyNumber" INTEGER,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "ClubMatchPlayer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubMatchPlayer_matchId_athleteId_key" ON "ClubMatchPlayer"("matchId", "athleteId");
CREATE INDEX "ClubMatchPlayer_athleteId_idx" ON "ClubMatchPlayer"("athleteId");
CREATE INDEX "ClubMatchPlayer_parentUserId_status_idx" ON "ClubMatchPlayer"("parentUserId", "status");

ALTER TABLE "ClubMatchPlayer" ADD CONSTRAINT "ClubMatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ClubMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubMatchPlayer" ADD CONSTRAINT "ClubMatchPlayer_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubMatchPlayer" ADD CONSTRAINT "ClubMatchPlayer_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
