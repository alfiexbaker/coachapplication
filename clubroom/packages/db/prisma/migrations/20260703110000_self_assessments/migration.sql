CREATE TABLE "SelfAssessmentPrompt" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "bookingId" TEXT,
    "sessionId" TEXT,
    "athleteName" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notificationSentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "SelfAssessmentPrompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SelfAssessmentEntry" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "bookingId" TEXT,
    "sessionId" TEXT,
    "promptId" TEXT,
    "submittedByUserId" TEXT NOT NULL,
    "mood" INTEGER NOT NULL,
    "energyLevel" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "SelfAssessmentEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SelfAssessmentPrompt_bookingId_athleteId_key" ON "SelfAssessmentPrompt"("bookingId", "athleteId");
CREATE INDEX "SelfAssessmentPrompt_athleteId_status_dueAt_idx" ON "SelfAssessmentPrompt"("athleteId", "status", "dueAt");
CREATE INDEX "SelfAssessmentPrompt_coachUserId_status_idx" ON "SelfAssessmentPrompt"("coachUserId", "status");

CREATE UNIQUE INDEX "SelfAssessmentEntry_athleteId_bookingId_key" ON "SelfAssessmentEntry"("athleteId", "bookingId");
CREATE INDEX "SelfAssessmentEntry_athleteId_createdAt_idx" ON "SelfAssessmentEntry"("athleteId", "createdAt");
CREATE INDEX "SelfAssessmentEntry_coachUserId_createdAt_idx" ON "SelfAssessmentEntry"("coachUserId", "createdAt");
CREATE INDEX "SelfAssessmentEntry_submittedByUserId_createdAt_idx" ON "SelfAssessmentEntry"("submittedByUserId", "createdAt");

ALTER TABLE "SelfAssessmentPrompt" ADD CONSTRAINT "SelfAssessmentPrompt_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SelfAssessmentPrompt" ADD CONSTRAINT "SelfAssessmentPrompt_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SelfAssessmentPrompt" ADD CONSTRAINT "SelfAssessmentPrompt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SelfAssessmentEntry" ADD CONSTRAINT "SelfAssessmentEntry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SelfAssessmentEntry" ADD CONSTRAINT "SelfAssessmentEntry_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SelfAssessmentEntry" ADD CONSTRAINT "SelfAssessmentEntry_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SelfAssessmentEntry" ADD CONSTRAINT "SelfAssessmentEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SelfAssessmentEntry" ADD CONSTRAINT "SelfAssessmentEntry_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "SelfAssessmentPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SelfAssessmentPrompt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SelfAssessmentEntry" ENABLE ROW LEVEL SECURITY;
