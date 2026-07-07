-- CreateTable
CREATE TABLE "TermlyReportSnapshot" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "rangeStart" TIMESTAMP(3) NOT NULL,
    "rangeEnd" TIMESTAMP(3) NOT NULL,
    "rangeLabel" TEXT NOT NULL,
    "reportJson" JSONB NOT NULL,
    "summaryJson" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "TermlyReportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TermlyReportSnapshot_athleteId_generatedAt_idx" ON "TermlyReportSnapshot"("athleteId", "generatedAt");

-- CreateIndex
CREATE INDEX "TermlyReportSnapshot_createdByUserId_createdAt_idx" ON "TermlyReportSnapshot"("createdByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "TermlyReportSnapshot" ADD CONSTRAINT "TermlyReportSnapshot_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
