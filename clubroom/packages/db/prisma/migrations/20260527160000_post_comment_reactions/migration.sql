-- Add backend-owned reactions for post comments.
CREATE TABLE "PostCommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostCommentReaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostCommentReaction_userId_idx" ON "PostCommentReaction"("userId");

CREATE UNIQUE INDEX "PostCommentReaction_commentId_userId_reaction_key" ON "PostCommentReaction"("commentId", "userId", "reaction");

ALTER TABLE "PostCommentReaction" ADD CONSTRAINT "PostCommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "PostComment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PostCommentReaction" ADD CONSTRAINT "PostCommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
