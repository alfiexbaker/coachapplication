BEGIN;

ALTER TABLE "UploadSession"
  ADD COLUMN "scanClaimedAt" TIMESTAMP(3),
  ADD COLUMN "scanClaimedBy" TEXT,
  ADD COLUMN "scanAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "scanNextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "scanLastError" TEXT;

ALTER TABLE "MalwareScanResult"
  ADD COLUMN "sourceResultId" TEXT;

CREATE INDEX "UploadSession_status_scanNextAttemptAt_scanClaimedAt_idx"
  ON "UploadSession"("status", "scanNextAttemptAt", "scanClaimedAt");

CREATE UNIQUE INDEX "MalwareScanResult_sourceResultId_key"
  ON "MalwareScanResult"("sourceResultId");

COMMIT;
