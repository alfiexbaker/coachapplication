CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blockerUserId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserBlock_blockerUserId_blockedUserId_key"
ON "UserBlock"("blockerUserId", "blockedUserId");

CREATE INDEX "UserBlock_blockedUserId_idx"
ON "UserBlock"("blockedUserId");

CREATE INDEX "UserBlock_blockerUserId_deletedAt_idx"
ON "UserBlock"("blockerUserId", "deletedAt");

ALTER TABLE "UserBlock"
ADD CONSTRAINT "UserBlock_blockerUserId_fkey"
FOREIGN KEY ("blockerUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserBlock"
ADD CONSTRAINT "UserBlock_blockedUserId_fkey"
FOREIGN KEY ("blockedUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserBlock" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "UserBlock" FROM anon, authenticated;
