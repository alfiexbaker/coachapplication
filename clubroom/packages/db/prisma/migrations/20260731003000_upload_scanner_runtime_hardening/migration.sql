BEGIN;

ALTER TABLE "UploadSession"
  ADD COLUMN "stagingCleanupAttemptCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "RuntimeWorkerHeartbeat" (
  "id" TEXT NOT NULL,
  "workerType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "version" TEXT,
  "metadataJson" JSONB,
  "lastReadyAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RuntimeWorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RuntimeWorkerHeartbeat_workerType_status_expiresAt_idx"
  ON "RuntimeWorkerHeartbeat"("workerType", "status", "expiresAt");

ALTER TABLE "RuntimeWorkerHeartbeat" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "RuntimeWorkerHeartbeat" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "RuntimeWorkerHeartbeat" FROM authenticated;
  END IF;
END
$$;

UPDATE "UploadSession" us
SET "stagingStorageKey" = mo."storageKey",
    "stagingCleanupDueAt" = CURRENT_TIMESTAMP,
    "stagingCleanupCompletedAt" = NULL,
    "stagingCleanupNextAttemptAt" = NULL,
    "stagingCleanupLastError" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "MediaObject" mo
WHERE us."mediaObjectId" = mo."id"
  AND us."stagingStorageKey" IS NULL
  AND us."cleanScanResultId" IS NULL
  AND us."status" = 'REJECTED'
  AND mo."status" IN ('REJECTED', 'QUARANTINED');

COMMIT;
