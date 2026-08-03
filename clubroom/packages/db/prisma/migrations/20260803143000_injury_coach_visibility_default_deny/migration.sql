-- Default-deny the coach projection for existing and future injury records.
-- A guardian or athlete must explicitly share a record before a rostered coach
-- can read or update it through the Fastify API.
ALTER TABLE "AthleteInjury"
  ADD COLUMN "sharedWithCoach" BOOLEAN NOT NULL DEFAULT false;
