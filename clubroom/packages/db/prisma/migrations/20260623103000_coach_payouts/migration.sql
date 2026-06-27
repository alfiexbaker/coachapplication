CREATE TABLE "CoachPayoutMethod" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "bankName" TEXT,
    "accountLastFour" TEXT,
    "paypalEmail" TEXT,
    "stripeAccountId" TEXT,
    "nickname" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'simulated',
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "CoachPayoutMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachWithdrawal" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "feeMinor" INTEGER NOT NULL DEFAULT 0,
    "netAmountMinor" INTEGER NOT NULL,
    "payoutMethodId" TEXT NOT NULL,
    "payoutMethodType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "reference" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'simulated',
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoachPayoutMethod_coachUserId_deletedAt_idx" ON "CoachPayoutMethod"("coachUserId", "deletedAt");
CREATE INDEX "CoachPayoutMethod_coachUserId_isDefault_idx" ON "CoachPayoutMethod"("coachUserId", "isDefault");
CREATE INDEX "CoachPayoutMethod_provider_providerRef_idx" ON "CoachPayoutMethod"("provider", "providerRef");
CREATE INDEX "CoachWithdrawal_coachUserId_status_idx" ON "CoachWithdrawal"("coachUserId", "status");
CREATE INDEX "CoachWithdrawal_payoutMethodId_idx" ON "CoachWithdrawal"("payoutMethodId");
CREATE INDEX "CoachWithdrawal_requestedAt_idx" ON "CoachWithdrawal"("requestedAt");
CREATE INDEX "CoachWithdrawal_provider_providerRef_idx" ON "CoachWithdrawal"("provider", "providerRef");

ALTER TABLE "CoachPayoutMethod" ADD CONSTRAINT "CoachPayoutMethod_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachWithdrawal" ADD CONSTRAINT "CoachWithdrawal_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachWithdrawal" ADD CONSTRAINT "CoachWithdrawal_payoutMethodId_fkey" FOREIGN KEY ("payoutMethodId") REFERENCES "CoachPayoutMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
