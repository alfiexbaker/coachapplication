CREATE TABLE "CoachPaymentInstruction" (
    "coachUserId" TEXT NOT NULL,
    "payeeName" TEXT NOT NULL DEFAULT '',
    "bankTransferDetails" TEXT NOT NULL DEFAULT '',
    "paymentNotes" TEXT NOT NULL DEFAULT '',
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachPaymentInstruction_pkey" PRIMARY KEY ("coachUserId")
);

CREATE INDEX "CoachPaymentInstruction_updatedAt_idx" ON "CoachPaymentInstruction"("updatedAt");

ALTER TABLE "CoachPaymentInstruction"
ADD CONSTRAINT "CoachPaymentInstruction_coachUserId_fkey"
FOREIGN KEY ("coachUserId") REFERENCES "CoachProfile"("userId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CoachPaymentInstruction" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "CoachPaymentInstruction" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE "CoachPaymentInstruction" FROM authenticated;
