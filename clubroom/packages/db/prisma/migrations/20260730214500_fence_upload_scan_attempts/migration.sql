BEGIN;

ALTER TABLE "UploadSession"
  ADD COLUMN "activeScanAttemptId" TEXT,
  ADD COLUMN "scanLeaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "cleanScanResultId" TEXT;

ALTER TABLE "MalwareScanResult"
  ADD COLUMN "uploadSessionId" TEXT,
  ADD COLUMN "scanAttemptId" TEXT,
  ADD COLUMN "objectSizeBytes" BIGINT,
  ADD COLUMN "objectETag" TEXT,
  ADD COLUMN "sha256Hex" TEXT,
  ADD COLUMN "requestHash" TEXT;

CREATE UNIQUE INDEX "UploadSession_activeScanAttemptId_key"
  ON "UploadSession"("activeScanAttemptId");

CREATE UNIQUE INDEX "UploadSession_cleanScanResultId_key"
  ON "UploadSession"("cleanScanResultId");

CREATE UNIQUE INDEX "MalwareScanResult_scanAttemptId_key"
  ON "MalwareScanResult"("scanAttemptId");

CREATE INDEX "MalwareScanResult_uploadSessionId_createdAt_idx"
  ON "MalwareScanResult"("uploadSessionId", "createdAt");

ALTER TABLE "MalwareScanResult"
  ADD CONSTRAINT "MalwareScanResult_uploadSessionId_fkey"
  FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UploadSession"
  ADD CONSTRAINT "UploadSession_cleanScanResultId_fkey"
  FOREIGN KEY ("cleanScanResultId") REFERENCES "MalwareScanResult"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
