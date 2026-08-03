-- FamilyMembership child access and active guardian links are written together by
-- the API. Reconcile legacy/imported non-owner rows to the narrower relationship
-- proof so stale arrays cannot expose an unassigned child.
WITH "ReconciledAccess" AS (
  SELECT
    membership."id",
    COALESCE(
      array_agg(DISTINCT link."athleteId" ORDER BY link."athleteId")
        FILTER (WHERE link."athleteId" IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS "athleteIds"
  FROM "FamilyMembership" AS membership
  LEFT JOIN "GuardianChildLink" AS link
    ON link."familyId" = membership."familyId"
    AND link."guardianUserId" = membership."userId"
    AND link."deletedAt" IS NULL
    AND link."athleteId" = ANY(membership."childAccessAthleteIds")
  WHERE membership."deletedAt" IS NULL
    AND lower(membership."role") <> 'owner'
  GROUP BY membership."id"
)
UPDATE "FamilyMembership" AS membership
SET
  "childAccessAthleteIds" = access."athleteIds",
  "updatedAt" = NOW(),
  "version" = membership."version" + 1
FROM "ReconciledAccess" AS access
WHERE membership."id" = access."id"
  AND membership."childAccessAthleteIds" IS DISTINCT FROM access."athleteIds";
