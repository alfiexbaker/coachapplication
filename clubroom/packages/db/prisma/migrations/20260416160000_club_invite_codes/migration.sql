CREATE TABLE "ClubInviteCode" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "remainingUses" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "ClubInviteCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubInviteCode_code_key" ON "ClubInviteCode"("code");
CREATE INDEX "ClubInviteCode_clubId_role_deletedAt_idx" ON "ClubInviteCode"("clubId", "role", "deletedAt");

ALTER TABLE "ClubInviteCode"
ADD CONSTRAINT "ClubInviteCode_clubId_fkey"
FOREIGN KEY ("clubId") REFERENCES "Club"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
