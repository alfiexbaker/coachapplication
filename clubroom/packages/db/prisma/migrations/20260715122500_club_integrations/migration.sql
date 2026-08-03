CREATE TABLE "ClubIntegration" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
  "displayName" TEXT,
  "externalAccountId" TEXT,
  "metadataJson" JSONB,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "version" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedByUserId" TEXT,

  CONSTRAINT "ClubIntegration_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ClubIntegration"
ADD CONSTRAINT "ClubIntegration_clubId_fkey"
FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClubIntegration"
ADD CONSTRAINT "ClubIntegration_status_check"
CHECK ("status" IN ('DISCONNECTED', 'CONNECTED', 'NEEDS_REAUTH', 'DISABLED'));

CREATE INDEX "ClubIntegration_clubId_status_deletedAt_idx"
ON "ClubIntegration"("clubId", "status", "deletedAt");

CREATE INDEX "ClubIntegration_provider_deletedAt_idx"
ON "ClubIntegration"("provider", "deletedAt");

CREATE UNIQUE INDEX "ClubIntegration_clubId_provider_active_key"
ON "ClubIntegration"("clubId", "provider")
WHERE "deletedAt" IS NULL;

ALTER TABLE "ClubIntegration" ENABLE ROW LEVEL SECURITY;
