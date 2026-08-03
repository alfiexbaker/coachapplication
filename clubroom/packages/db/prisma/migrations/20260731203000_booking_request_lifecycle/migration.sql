BEGIN;

ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'DECLINED';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "Booking"
  ADD COLUMN "requestExpiresAt" TIMESTAMP(3),
  ADD COLUMN "requestResolvedAt" TIMESTAMP(3),
  ADD COLUMN "requestResolutionReason" TEXT;

UPDATE "Booking"
SET "requestExpiresAt" = LEAST(
  "scheduledAt",
  "createdAt" + INTERVAL '24 hours'
)
WHERE "status" IN ('PENDING', 'AWAITING_CONFIRMATION')
  AND "requestExpiresAt" IS NULL;

CREATE INDEX "Booking_status_requestExpiresAt_idx"
  ON "Booking"("status", "requestExpiresAt");

COMMIT;
