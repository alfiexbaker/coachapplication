ALTER TABLE "Video"
ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PRIVATE';

ALTER TABLE "VideoAnnotation"
ADD COLUMN "note" TEXT,
ADD COLUMN "annotationType" TEXT NOT NULL DEFAULT 'GENERAL';

CREATE TABLE "VideoShare" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "sharedWithUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "version" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "VideoShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoShare_videoId_sharedWithUserId_key"
ON "VideoShare"("videoId", "sharedWithUserId");

CREATE INDEX "VideoShare_sharedWithUserId_deletedAt_idx"
ON "VideoShare"("sharedWithUserId", "deletedAt");

ALTER TABLE "VideoShare"
ADD CONSTRAINT "VideoShare_videoId_fkey"
FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
