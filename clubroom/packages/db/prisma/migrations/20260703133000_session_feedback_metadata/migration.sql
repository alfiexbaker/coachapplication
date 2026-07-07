ALTER TABLE "SessionFeedback" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "SessionFeedback" ADD COLUMN "metadataJson" JSONB;

CREATE INDEX "SessionFeedback_sessionId_idx" ON "SessionFeedback"("sessionId");
