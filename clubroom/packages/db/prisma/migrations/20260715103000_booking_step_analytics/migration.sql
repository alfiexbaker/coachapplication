CREATE TABLE "BookingStepAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "actingAs" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "failureCode" TEXT,
    "coachUserId" TEXT,
    "ownerCoachUserId" TEXT,
    "assigneeCoachUserId" TEXT,
    "clubId" TEXT,
    "clientEventId" TEXT,
    "clientCreatedAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingStepAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingStepAnalyticsEvent_createdAt_idx" ON "BookingStepAnalyticsEvent"("createdAt");
CREATE INDEX "BookingStepAnalyticsEvent_userId_createdAt_idx" ON "BookingStepAnalyticsEvent"("userId", "createdAt");
CREATE INDEX "BookingStepAnalyticsEvent_coachUserId_createdAt_idx" ON "BookingStepAnalyticsEvent"("coachUserId", "createdAt");
CREATE INDEX "BookingStepAnalyticsEvent_clubId_createdAt_idx" ON "BookingStepAnalyticsEvent"("clubId", "createdAt");
CREATE INDEX "BookingStepAnalyticsEvent_step_status_createdAt_idx" ON "BookingStepAnalyticsEvent"("step", "status", "createdAt");

ALTER TABLE "BookingStepAnalyticsEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BookingStepAnalyticsEvent" FROM anon, authenticated;
