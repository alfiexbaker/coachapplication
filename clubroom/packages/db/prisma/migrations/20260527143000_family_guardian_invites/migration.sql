CREATE TABLE "FamilyGuardianInvite" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "inviteeEmail" TEXT NOT NULL,
  "inviteeName" TEXT,
  "role" TEXT NOT NULL,
  "permissions" TEXT[] NOT NULL,
  "relationshipLabel" TEXT NOT NULL,
  "childAccessAthleteIds" TEXT[] NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "invitedByUserId" TEXT NOT NULL,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "respondedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedByUserId" TEXT,

  CONSTRAINT "FamilyGuardianInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FamilyGuardianInvite_familyId_status_deletedAt_idx"
ON "FamilyGuardianInvite"("familyId", "status", "deletedAt");

CREATE INDEX "FamilyGuardianInvite_inviteeEmail_status_deletedAt_idx"
ON "FamilyGuardianInvite"("inviteeEmail", "status", "deletedAt");

CREATE INDEX "FamilyGuardianInvite_invitedByUserId_idx"
ON "FamilyGuardianInvite"("invitedByUserId");

ALTER TABLE "FamilyGuardianInvite"
ADD CONSTRAINT "FamilyGuardianInvite_familyId_fkey"
FOREIGN KEY ("familyId") REFERENCES "Family"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "FamilyGuardianInvite"
ADD CONSTRAINT "FamilyGuardianInvite_invitedByUserId_fkey"
FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
