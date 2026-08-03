BEGIN;

ALTER TABLE "GroupSessionRegistration"
  ADD COLUMN "rosterActiveAt" TIMESTAMP(3),
  ADD COLUMN "rosterEndedAt" TIMESTAMP(3);

UPDATE "GroupSessionRegistration" AS registration
SET "rosterActiveAt" = registration."registeredAt"
WHERE registration."status" IN ('REGISTERED', 'ATTENDED', 'NO_SHOW')
   OR (
     registration."status" = 'CANCELLED'
     AND EXISTS (
       SELECT 1
       FROM "Booking" AS booking
       JOIN "BookingParticipant" AS participant
         ON participant."bookingId" = booking."id"
        AND participant."athleteId" = registration."athleteId"
       WHERE booking."groupSessionId" = registration."groupSessionId"
     )
   );

UPDATE "GroupSessionRegistration"
SET "rosterEndedAt" = "updatedAt"
WHERE "status" = 'CANCELLED';

CREATE INDEX "GroupSessionRegistration_groupSessionId_rosterActiveAt_rosterEndedAt_idx"
  ON "GroupSessionRegistration"("groupSessionId", "rosterActiveAt", "rosterEndedAt");

CREATE TABLE "GroupSessionOccurrenceCompletion" (
  "id" TEXT NOT NULL,
  "groupSessionId" TEXT NOT NULL,
  "occurrenceDate" DATE NOT NULL,
  "completedByUserId" TEXT NOT NULL,
  "rosterSize" INTEGER NOT NULL,
  "attendedCount" INTEGER NOT NULL,
  "noShowCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GroupSessionOccurrenceCompletion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GroupSessionOccurrenceCompletion_groupSessionId_fkey"
    FOREIGN KEY ("groupSessionId") REFERENCES "GroupSession"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GroupSessionOccurrenceCompletion_groupSessionId_occurrenceDate_key"
  ON "GroupSessionOccurrenceCompletion"("groupSessionId", "occurrenceDate");

CREATE INDEX "GroupSessionOccurrenceCompletion_completedByUserId_createdAt_idx"
  ON "GroupSessionOccurrenceCompletion"("completedByUserId", "createdAt");

INSERT INTO "GroupSessionOccurrenceCompletion" (
  "id",
  "groupSessionId",
  "occurrenceDate",
  "completedByUserId",
  "rosterSize",
  "attendedCount",
  "noShowCount",
  "createdAt",
  "updatedAt"
)
SELECT
  'goc_backfill_' || md5(session."id" || occurrence."occurrenceDate"::TEXT),
  session."id",
  occurrence."occurrenceDate",
  session."updatedByUserId",
  COUNT(DISTINCT registration."id")::INTEGER,
  COUNT(attendance."id") FILTER (WHERE attendance."status" = 'ATTENDED')::INTEGER,
  COUNT(attendance."id") FILTER (WHERE attendance."status" = 'NO_SHOW')::INTEGER,
  session."updatedAt",
  session."updatedAt"
FROM "GroupSession" AS session
CROSS JOIN LATERAL (
  SELECT CASE
    WHEN jsonb_typeof(session."scheduleJson") = 'array'
      AND jsonb_array_length(session."scheduleJson") = 1
      AND session."scheduleJson" -> 0 ->> 'startsAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
    THEN ((session."scheduleJson" -> 0 ->> 'startsAt')::TIMESTAMPTZ)::DATE
    ELSE NULL
  END AS "occurrenceDate"
) AS occurrence
LEFT JOIN "GroupSessionRegistration" AS registration
  ON registration."groupSessionId" = session."id"
 AND registration."deletedAt" IS NULL
LEFT JOIN "AttendanceRecord" AS attendance
  ON attendance."groupSessionId" = session."id"
 AND attendance."athleteId" = registration."athleteId"
 AND attendance."recordedAt"::DATE = occurrence."occurrenceDate"
 AND attendance."status" IN ('ATTENDED', 'NO_SHOW')
WHERE session."status" = 'COMPLETED'
  AND occurrence."occurrenceDate" IS NOT NULL
GROUP BY session."id", occurrence."occurrenceDate";

ALTER TABLE "GroupSessionOccurrenceCompletion" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "GroupSessionOccurrenceCompletion" FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "GroupSessionOccurrenceCompletion" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "GroupSessionOccurrenceCompletion" FROM authenticated;
  END IF;
END
$$;

COMMIT;
