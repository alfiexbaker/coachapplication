ALTER TABLE "GroupSession"
  ADD COLUMN "offPlatformParticipants" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "GroupSession"
  ADD CONSTRAINT "GroupSession_offPlatformParticipants_nonnegative"
  CHECK ("offPlatformParticipants" >= 0);
