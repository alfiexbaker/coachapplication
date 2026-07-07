CREATE TABLE "SessionMediaAsset" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "coachUserId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "mediaObjectId" TEXT NOT NULL,
  "thumbnailMediaObjectId" TEXT,
  "widthPx" INTEGER,
  "heightPx" INTEGER,
  "durationMs" INTEGER,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedByUserId" TEXT,

  CONSTRAINT "SessionMediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SessionMediaAsset_sessionId_idx" ON "SessionMediaAsset"("sessionId");
CREATE INDEX "SessionMediaAsset_athleteId_idx" ON "SessionMediaAsset"("athleteId");
CREATE INDEX "SessionMediaAsset_coachUserId_idx" ON "SessionMediaAsset"("coachUserId");
CREATE INDEX "SessionMediaAsset_mediaObjectId_idx" ON "SessionMediaAsset"("mediaObjectId");

ALTER TABLE "SessionMediaAsset"
  ADD CONSTRAINT "SessionMediaAsset_athleteId_fkey"
  FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SessionMediaAsset"
  ADD CONSTRAINT "SessionMediaAsset_mediaObjectId_fkey"
  FOREIGN KEY ("mediaObjectId") REFERENCES "MediaObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SessionMediaAsset"
  ADD CONSTRAINT "SessionMediaAsset_thumbnailMediaObjectId_fkey"
  FOREIGN KEY ("thumbnailMediaObjectId") REFERENCES "MediaObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SessionMediaAsset" ENABLE ROW LEVEL SECURITY;
