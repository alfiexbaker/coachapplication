CREATE TABLE "PracticeLog" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "PracticeLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PracticeLog_athleteId_authorUserId_dateKey_key" ON "PracticeLog"("athleteId", "authorUserId", "dateKey");
CREATE INDEX "PracticeLog_athleteId_dateKey_idx" ON "PracticeLog"("athleteId", "dateKey");
CREATE INDEX "PracticeLog_authorUserId_dateKey_idx" ON "PracticeLog"("authorUserId", "dateKey");

ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PracticeLog" ENABLE ROW LEVEL SECURITY;
