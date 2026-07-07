ALTER TABLE "CoachProfile"
ADD COLUMN "travelRadiusMiles" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "acceptsTravelSessions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "acceptsRemoteSessions" BOOLEAN NOT NULL DEFAULT false;
