CREATE TABLE "UserPrivacySetting" (
    "userId" TEXT NOT NULL,
    "profileVisible" BOOLEAN NOT NULL DEFAULT true,
    "showLocation" BOOLEAN NOT NULL DEFAULT true,
    "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
    "showActivityStatus" BOOLEAN NOT NULL DEFAULT false,
    "shareAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "personalizedAds" BOOLEAN NOT NULL DEFAULT false,
    "shareWithPartners" BOOLEAN NOT NULL DEFAULT false,
    "showEarnings" BOOLEAN NOT NULL DEFAULT false,
    "showClientList" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPrivacySetting_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserPrivacySetting"
ADD CONSTRAINT "UserPrivacySetting_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserPrivacySetting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "UserPrivacySetting" FROM anon, authenticated;
