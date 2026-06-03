-- CreateEnum
CREATE TYPE "ClubMatchStatus" AS ENUM ('SCHEDULED', 'LINEUP_SET', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClubMatchType" AS ENUM ('FRIENDLY', 'LEAGUE', 'CUP', 'TOURNAMENT');

-- CreateTable
CREATE TABLE "ClubMatch" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "squadId" TEXT,
    "coachUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "matchType" "ClubMatchType" NOT NULL,
    "opponent" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "kickoffTimeLocal" TEXT NOT NULL,
    "meetTimeLocal" TEXT,
    "venue" TEXT NOT NULL,
    "address" TEXT,
    "maxPlayers" INTEGER NOT NULL DEFAULT 14,
    "status" "ClubMatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "resultJson" JSONB,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "ClubMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubMatch_clubId_startsAt_idx" ON "ClubMatch"("clubId", "startsAt");

-- CreateIndex
CREATE INDEX "ClubMatch_squadId_startsAt_idx" ON "ClubMatch"("squadId", "startsAt");

-- CreateIndex
CREATE INDEX "ClubMatch_coachUserId_startsAt_idx" ON "ClubMatch"("coachUserId", "startsAt");

-- CreateIndex
CREATE INDEX "ClubMatch_status_startsAt_idx" ON "ClubMatch"("status", "startsAt");

-- AddForeignKey
ALTER TABLE "ClubMatch" ADD CONSTRAINT "ClubMatch_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMatch" ADD CONSTRAINT "ClubMatch_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
