ALTER TABLE "CommunityGroup"
ADD COLUMN "groupType" TEXT NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "squadId" TEXT;

UPDATE "CommunityGroup"
SET "groupType" = CASE WHEN "clubId" IS NOT NULL THEN 'CLUB' ELSE 'GENERAL' END;

ALTER TABLE "CommunityGroup"
ADD CONSTRAINT "CommunityGroup_groupType_check"
CHECK ("groupType" IN ('GENERAL', 'CLUB', 'SQUAD'));

CREATE INDEX "CommunityGroup_groupType_idx" ON "CommunityGroup"("groupType");
CREATE INDEX "CommunityGroup_squadId_idx" ON "CommunityGroup"("squadId");
CREATE UNIQUE INDEX "CommunityGroup_squadId_active_key"
ON "CommunityGroup"("squadId")
WHERE "squadId" IS NOT NULL AND "deletedAt" IS NULL;

ALTER TABLE "CommunityGroup"
ADD CONSTRAINT "CommunityGroup_squadId_fkey"
FOREIGN KEY ("squadId") REFERENCES "Squad"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
