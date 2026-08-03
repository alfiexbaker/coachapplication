BEGIN;

ALTER TABLE "UploadSession"
  ADD COLUMN "stagingStorageKey" TEXT,
  ADD COLUMN "stagingCleanupDueAt" TIMESTAMP(3),
  ADD COLUMN "stagingCleanupClaimedAt" TIMESTAMP(3),
  ADD COLUMN "stagingCleanupClaimedBy" TEXT,
  ADD COLUMN "stagingCleanupLeaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "stagingCleanupCompletedAt" TIMESTAMP(3),
  ADD COLUMN "stagingCleanupNextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "stagingCleanupLastError" TEXT;

UPDATE "UploadSession" us
SET "stagingStorageKey" = mo."storageKey",
    "stagingCleanupDueAt" = us."uploadUrlExpiresAt",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "MediaObject" mo
WHERE us."mediaObjectId" = mo."id"
  AND us."cleanScanResultId" IS NULL
  AND us."status" IN ('INITIATED', 'UPLOADED', 'SCAN_RETRY', 'SCANNING')
  AND mo."status" IN ('PENDING_UPLOAD', 'UPLOADED_UNSCANNED');

CREATE INDEX "UploadSession_stagingCleanupCompletedAt_stagingCleanupDueAt_stagingCleanupNextAttemptAt_idx"
  ON "UploadSession"(
    "stagingCleanupCompletedAt",
    "stagingCleanupDueAt",
    "stagingCleanupNextAttemptAt"
  );

COMMIT;
