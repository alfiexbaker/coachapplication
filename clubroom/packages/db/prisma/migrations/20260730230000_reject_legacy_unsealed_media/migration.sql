BEGIN;

WITH legacy_unsealed_media AS (
  SELECT mo."id", mo."status"
  FROM "MediaObject" mo
  WHERE mo."status" = 'AVAILABLE'
    AND mo."deletedAt" IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "UploadSession" us
      INNER JOIN "MalwareScanResult" ms ON ms."id" = us."cleanScanResultId"
      WHERE us."mediaObjectId" = mo."id"
        AND ms."verdict" = 'CLEAN'
        AND ms."sealedStorageKey" = mo."storageKey"
    )
)
INSERT INTO "AuditEvent" (
  "id",
  "occurredAt",
  "action",
  "resourceType",
  "resourceId",
  "result",
  "sensitiveRead",
  "metadataJson"
)
SELECT
  'aud_' || MD5('legacy-unsealed-media:' || legacy."id"),
  CURRENT_TIMESTAMP,
  'upload.legacy_unsealed_rejected',
  'media_object',
  legacy."id",
  'SUCCESS',
  FALSE,
  jsonb_build_object(
    'previousStatus', legacy."status",
    'reason', 'missing_sealed_clean_scan_authority',
    'migration', '20260730230000_reject_legacy_unsealed_media'
  )
FROM legacy_unsealed_media legacy;

UPDATE "UploadSession" us
SET "status" = 'REJECTED',
    "completedAt" = NULL,
    "scanClaimedAt" = NULL,
    "scanClaimedBy" = NULL,
    "activeScanAttemptId" = NULL,
    "scanLeaseExpiresAt" = NULL,
    "scanNextAttemptAt" = NULL,
    "scanLastError" = 'LEGACY_UNSEALED_MEDIA',
    "updatedAt" = CURRENT_TIMESTAMP
FROM "MediaObject" mo
WHERE us."mediaObjectId" = mo."id"
  AND mo."status" = 'AVAILABLE'
  AND mo."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "UploadSession" clean_us
    INNER JOIN "MalwareScanResult" ms ON ms."id" = clean_us."cleanScanResultId"
    WHERE clean_us."mediaObjectId" = mo."id"
      AND ms."verdict" = 'CLEAN'
      AND ms."sealedStorageKey" = mo."storageKey"
  );

UPDATE "MediaObject" mo
SET "status" = 'REJECTED',
    "updatedByUserId" = 'system_upload_scan_migration',
    "version" = mo."version" + 1,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE mo."status" = 'AVAILABLE'
  AND mo."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "UploadSession" us
    INNER JOIN "MalwareScanResult" ms ON ms."id" = us."cleanScanResultId"
    WHERE us."mediaObjectId" = mo."id"
      AND ms."verdict" = 'CLEAN'
      AND ms."sealedStorageKey" = mo."storageKey"
  );

COMMIT;
