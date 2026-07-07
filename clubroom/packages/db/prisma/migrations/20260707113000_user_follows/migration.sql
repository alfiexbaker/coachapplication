CREATE TABLE "UserFollow" (
    "id" TEXT NOT NULL,
    "followerUserId" TEXT NOT NULL,
    "followedUserId" TEXT NOT NULL,
    "followerType" TEXT NOT NULL DEFAULT 'USER',
    "followingType" TEXT NOT NULL DEFAULT 'USER',
    "notifyOnPost" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnSession" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserFollowRequest" (
    "id" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "UserFollowRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserFollow_followerUserId_followedUserId_key"
ON "UserFollow"("followerUserId", "followedUserId");

CREATE INDEX "UserFollow_followedUserId_deletedAt_idx"
ON "UserFollow"("followedUserId", "deletedAt");

CREATE INDEX "UserFollow_followerUserId_deletedAt_idx"
ON "UserFollow"("followerUserId", "deletedAt");

CREATE INDEX "UserFollowRequest_requesterUserId_status_deletedAt_idx"
ON "UserFollowRequest"("requesterUserId", "status", "deletedAt");

CREATE INDEX "UserFollowRequest_targetUserId_status_deletedAt_idx"
ON "UserFollowRequest"("targetUserId", "status", "deletedAt");

CREATE UNIQUE INDEX "UserFollowRequest_requesterUserId_targetUserId_pending_key"
ON "UserFollowRequest"("requesterUserId", "targetUserId")
WHERE "status" = 'PENDING' AND "deletedAt" IS NULL;

ALTER TABLE "UserFollow"
ADD CONSTRAINT "UserFollow_followerUserId_fkey"
FOREIGN KEY ("followerUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserFollow"
ADD CONSTRAINT "UserFollow_followedUserId_fkey"
FOREIGN KEY ("followedUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserFollowRequest"
ADD CONSTRAINT "UserFollowRequest_requesterUserId_fkey"
FOREIGN KEY ("requesterUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserFollowRequest"
ADD CONSTRAINT "UserFollowRequest_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserFollow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserFollowRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "UserFollow" FROM anon, authenticated;
REVOKE ALL ON TABLE "UserFollowRequest" FROM anon, authenticated;
