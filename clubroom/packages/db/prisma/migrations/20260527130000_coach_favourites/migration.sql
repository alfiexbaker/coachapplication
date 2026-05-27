CREATE TABLE "CoachFavourite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "coachUserId" TEXT NOT NULL,
  "isFavourite" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "version" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedByUserId" TEXT,

  CONSTRAINT "CoachFavourite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachFavourite_userId_coachUserId_key"
ON "CoachFavourite"("userId", "coachUserId");

CREATE INDEX "CoachFavourite_userId_isFavourite_deletedAt_idx"
ON "CoachFavourite"("userId", "isFavourite", "deletedAt");

CREATE INDEX "CoachFavourite_coachUserId_isFavourite_deletedAt_idx"
ON "CoachFavourite"("coachUserId", "isFavourite", "deletedAt");

ALTER TABLE "CoachFavourite"
ADD CONSTRAINT "CoachFavourite_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "CoachFavourite"
ADD CONSTRAINT "CoachFavourite_coachUserId_fkey"
FOREIGN KEY ("coachUserId") REFERENCES "CoachProfile"("userId")
ON DELETE RESTRICT
ON UPDATE CASCADE;
