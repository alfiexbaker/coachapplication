CREATE TYPE "SessionRsvpStatus" AS ENUM ('PENDING', 'GOING', 'MAYBE', 'NOT_GOING');

CREATE TABLE "SessionRsvp" (
  "id" TEXT NOT NULL,
  "groupSessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "athleteId" TEXT,
  "status" "SessionRsvpStatus" NOT NULL DEFAULT 'PENDING',
  "respondedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "version" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedByUserId" TEXT,

  CONSTRAINT "SessionRsvp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionRsvp_groupSessionId_userId_athleteId_key"
  ON "SessionRsvp"("groupSessionId", "userId", "athleteId");

CREATE INDEX "SessionRsvp_groupSessionId_status_idx"
  ON "SessionRsvp"("groupSessionId", "status");

CREATE INDEX "SessionRsvp_userId_status_idx"
  ON "SessionRsvp"("userId", "status");

CREATE INDEX "SessionRsvp_athleteId_idx"
  ON "SessionRsvp"("athleteId");

ALTER TABLE "SessionRsvp"
  ADD CONSTRAINT "SessionRsvp_groupSessionId_fkey"
  FOREIGN KEY ("groupSessionId") REFERENCES "GroupSession"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SessionRsvp"
  ADD CONSTRAINT "SessionRsvp_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SessionRsvp"
  ADD CONSTRAINT "SessionRsvp_athleteId_fkey"
  FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
