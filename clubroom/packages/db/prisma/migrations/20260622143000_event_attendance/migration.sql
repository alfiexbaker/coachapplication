-- CreateTable
CREATE TABLE "EventAttendance" (
    "id" TEXT NOT NULL,
    "clubEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInByUserId" TEXT NOT NULL,
    "checkInMethod" TEXT NOT NULL,
    "guestsCheckedIn" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "locationJson" JSONB,
    "locationValidated" BOOLEAN,
    "distanceFromVenue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventAttendance_clubEventId_userId_key" ON "EventAttendance"("clubEventId", "userId");

-- CreateIndex
CREATE INDEX "EventAttendance_userId_idx" ON "EventAttendance"("userId");

-- CreateIndex
CREATE INDEX "EventAttendance_checkedInByUserId_idx" ON "EventAttendance"("checkedInByUserId");

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_clubEventId_fkey" FOREIGN KEY ("clubEventId") REFERENCES "ClubEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_checkedInByUserId_fkey" FOREIGN KEY ("checkedInByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
