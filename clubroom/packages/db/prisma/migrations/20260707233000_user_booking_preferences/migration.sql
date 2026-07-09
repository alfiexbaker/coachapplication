CREATE TABLE "UserBookingPreference" (
    "userId" TEXT NOT NULL,
    "allowBookSelf" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBookingPreference_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserBookingPreference"
ADD CONSTRAINT "UserBookingPreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserBookingPreference" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "UserBookingPreference" FROM anon, authenticated;
