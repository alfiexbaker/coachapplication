ALTER TABLE "AvailabilityTemplate"
ADD COLUMN "bufferMinutes" INTEGER,
ADD COLUMN "sessionTemplateId" TEXT;

ALTER TABLE "AvailabilityOverride"
ADD COLUMN "location" TEXT,
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "repeatUntil" TIMESTAMP(3),
ADD COLUMN "repeatDayOfWeek" INTEGER,
ADD COLUMN "repeatGroupId" TEXT;

ALTER TABLE "CancellationPolicyRule"
ADD COLUMN "description" TEXT,
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
