BEGIN;

ALTER TABLE "MalwareScanResult"
  ADD COLUMN "sealedStorageKey" TEXT;

CREATE UNIQUE INDEX "MalwareScanResult_sealedStorageKey_key"
  ON "MalwareScanResult"("sealedStorageKey");

COMMIT;
