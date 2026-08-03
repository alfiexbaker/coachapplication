ALTER TABLE "ClubMatch"
ADD COLUMN "importSource" TEXT,
ADD COLUMN "importExternalId" TEXT;

CREATE INDEX "ClubMatch_clubId_importSource_idx"
ON "ClubMatch"("clubId", "importSource");

CREATE UNIQUE INDEX "ClubMatch_clubId_importSource_importExternalId_active_key"
ON "ClubMatch"("clubId", "importSource", "importExternalId")
WHERE "deletedAt" IS NULL
  AND "importSource" IS NOT NULL
  AND "importExternalId" IS NOT NULL;
