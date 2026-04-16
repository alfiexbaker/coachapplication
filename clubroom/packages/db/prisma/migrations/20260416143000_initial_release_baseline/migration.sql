-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('coach', 'parent', 'athlete', 'member', 'club_admin', 'club_staff', 'support', 'security_admin');

-- CreateEnum
CREATE TYPE "AccessGrantResourceType" AS ENUM ('coach_scope', 'athlete_progress', 'session_note', 'invoice_scope', 'club_scope', 'custom');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'AWAITING_CONFIRMATION', 'CONFIRMED', 'AWAITING_COMPLETION', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingChangeRequestType" AS ENUM ('RESCHEDULE', 'CANCELLATION');

-- CreateEnum
CREATE TYPE "BookingChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GroupSessionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'FULL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GroupRegistrationStatus" AS ENUM ('REGISTERED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "EventRsvpStatus" AS ENUM ('GOING', 'MAYBE', 'DECLINED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'VOID', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "InvoiceEventType" AS ENUM ('GENERATED', 'SENT', 'PAYMENT_SESSION_CREATED', 'MARKED_PAID', 'MARKED_UNPAID', 'WRITTEN_OFF', 'RESTORED', 'VOIDED', 'REMINDER_SENT');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'ACTION_REQUIRED', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('PHOTO', 'VIDEO', 'SOCIAL_MEDIA', 'EMERGENCY_TREATMENT', 'MEDICAL_DATA_SHARING');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('DBS', 'INSURANCE', 'CREDENTIAL', 'IDENTITY');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MediaObjectStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED_UNSCANNED', 'QUARANTINED', 'AVAILABLE', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "MediaObjectKind" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO');

-- CreateEnum
CREATE TYPE "MalwareScanVerdict" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "SessionNoteVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "MessageThreadType" AS ENUM ('DIRECT', 'GROUP', 'CLUB', 'SESSION');

-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'CLUB', 'GROUP', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CommunityGroupVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "SafeguardingIncidentStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RetentionRunStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED', 'DRY_RUN');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authProvider" TEXT NOT NULL,
    "authProviderSubject" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "locale" TEXT,
    "timeZone" TEXT,
    "accountStatus" TEXT NOT NULL DEFAULT 'active',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isLive" BOOLEAN,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "tokenEpoch" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "phoneE164" TEXT,
    "skillLevel" TEXT,
    "position" TEXT,
    "sport" TEXT,
    "goals" TEXT[],
    "isOrganization" BOOLEAN,
    "organizationName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserRoleMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoleCode" NOT NULL,
    "source" TEXT,
    "clubId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserRoleMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "pushToken" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userDeviceId" TEXT,
    "jwtId" TEXT,
    "refreshTokenId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordCredential" (
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordCredential_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpointKey" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseBodyJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryGuardianUserId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMembership" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" TEXT[],
    "relationshipLabel" TEXT,
    "childAccessAthleteIds" TEXT[],
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "FamilyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "nickname" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "relationshipLabel" TEXT,
    "primaryPosition" TEXT,
    "avatarUrl" TEXT,
    "communicationNotes" TEXT,
    "behavioralNotes" TEXT,
    "disabilitiesJson" JSONB,
    "specialNeedsJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianChildLink" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "guardianUserId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "GuardianChildLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildEmergencyContact" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationshipLabel" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "canPickup" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "ChildEmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildMedicalRecord" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "conditions" TEXT[],
    "allergies" TEXT[],
    "medications" TEXT[],
    "restrictions" TEXT[],
    "notesEncrypted" TEXT,
    "doctorName" TEXT,
    "doctorPhoneE164" TEXT,
    "insuranceProvider" TEXT,
    "insuranceNumber" TEXT,
    "emergencyNotes" TEXT,
    "senNotes" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChildMedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteInjury" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "expectedRecoveryDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "AthleteInjury_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildSenTag" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "ChildSenTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildConsent" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedByUserId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "yearsExperience" INTEGER,
    "sessionRateMinor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "dbsChecked" BOOLEAN,
    "specialties" TEXT[],
    "qualifications" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CoachLocation" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "addressText" TEXT,
    "latLngJson" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "CoachLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachingOffering" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "description" TEXT,
    "defaultLocation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "CoachingOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityTemplate" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTimeLocal" TEXT NOT NULL,
    "endTimeLocal" TEXT NOT NULL,
    "location" TEXT,
    "maxConcurrent" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "AvailabilityTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityOverride" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "overrideDate" TIMESTAMP(3) NOT NULL,
    "startTimeLocal" TEXT,
    "endTimeLocal" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "AvailabilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulingRule" (
    "coachUserId" TEXT NOT NULL,
    "minimumAdvanceBookingHours" INTEGER NOT NULL DEFAULT 24,
    "maxAdvanceBookingDays" INTEGER NOT NULL DEFAULT 60,
    "bufferMinutesDefault" INTEGER NOT NULL DEFAULT 15,
    "maxConcurrentDefault" INTEGER NOT NULL DEFAULT 1,
    "allowSameDayBookings" BOOLEAN NOT NULL DEFAULT false,
    "confirmationMode" TEXT NOT NULL DEFAULT 'manual',
    "cancellationPolicyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingRule_pkey" PRIMARY KEY ("coachUserId")
);

-- CreateTable
CREATE TABLE "CancellationPolicyRule" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "noticeHoursMin" INTEGER NOT NULL,
    "refundPercent" INTEGER,
    "feeMinor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "appliesToNoShow" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "CancellationPolicyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMembership" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "ClubMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "ownerCoachUserId" TEXT,
    "name" TEXT NOT NULL,
    "ageBandLabel" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadMembership" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "SquadMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachVerification" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "verificationType" "VerificationType" NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDocument" (
    "id" TEXT NOT NULL,
    "coachVerificationId" TEXT NOT NULL,
    "mediaObjectId" TEXT NOT NULL,
    "fileLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "bookedByUserId" TEXT,
    "clubId" TEXT,
    "coachingOfferingId" TEXT,
    "status" "BookingStatus" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "serviceType" TEXT,
    "notes" TEXT,
    "objectivesJson" JSONB,
    "priceMinor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "confirmationMode" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "cancellationFeeMinor" INTEGER,
    "groupSessionId" TEXT,
    "recurringSeriesId" TEXT,
    "seriesIndex" INTEGER,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingParticipant" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "guardianUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "BookingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingObjective" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingStatusEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "actorUserId" TEXT,
    "reason" TEXT,
    "metadataJson" JSONB,
    "requestId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingChangeRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "requestType" "BookingChangeRequestType" NOT NULL,
    "status" "BookingChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" TEXT NOT NULL,
    "targetScheduledAt" TIMESTAMP(3),
    "reason" TEXT,
    "responseByUserId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "responseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringSeries" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "bookedByUserId" TEXT NOT NULL,
    "athleteId" TEXT,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "timeLocal" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "RecurringSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupSession" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "clubId" TEXT,
    "squadId" TEXT,
    "recurringSeriesId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sessionType" TEXT NOT NULL,
    "maxParticipants" INTEGER NOT NULL,
    "currentParticipants" INTEGER NOT NULL DEFAULT 0,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true,
    "waitlistCount" INTEGER NOT NULL DEFAULT 0,
    "pricePerParticipantMinor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "skillLevel" TEXT,
    "location" TEXT,
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "status" "GroupSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "registrationDeadlineAt" TIMESTAMP(3),
    "inviteType" TEXT,
    "scheduleJson" JSONB NOT NULL,
    "focusJson" JSONB,
    "equipmentJson" JSONB,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "GroupSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupSessionRegistration" (
    "id" TEXT NOT NULL,
    "groupSessionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "parentUserId" TEXT,
    "status" "GroupRegistrationStatus" NOT NULL,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "GroupSessionRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "groupSessionId" TEXT NOT NULL,
    "athleteId" TEXT,
    "userId" TEXT,
    "coachUserId" TEXT,
    "position" INTEGER NOT NULL,
    "autoBook" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "notes" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "bookingId" TEXT,
    "userResponse" TEXT,
    "userRespondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "inviteType" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "clubId" TEXT,
    "groupSessionId" TEXT,
    "bookingId" TEXT,
    "eventId" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteTarget" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetAthleteId" TEXT,
    "targetFamilyId" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "responsePayloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubEvent" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "creatorUserId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "visibility" TEXT NOT NULL DEFAULT 'club',
    "rsvpDeadlineAt" TIMESTAMP(3),
    "guestLimit" INTEGER,
    "metadataJson" JSONB,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "ClubEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRsvp" (
    "id" TEXT NOT NULL,
    "clubEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EventRsvpStatus" NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "groupSessionId" TEXT,
    "athleteId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "effortRating" INTEGER,
    "focusAreasJson" JSONB,
    "recordedByUserId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "bookingId" TEXT,
    "coachUserId" TEXT NOT NULL,
    "payerUserId" TEXT,
    "athleteId" TEXT,
    "status" "InvoiceStatus" NOT NULL,
    "sessionDate" TIMESTAMP(3),
    "sessionType" TEXT,
    "sessionLocation" TEXT,
    "sessionDurationMinutes" INTEGER,
    "subtotalMinor" INTEGER NOT NULL,
    "taxMinor" INTEGER NOT NULL,
    "taxRatePercent" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "dueDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "notes" TEXT,
    "coachBusinessName" TEXT,
    "coachBusinessEmail" TEXT,
    "billingAddress" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitAmountMinor" INTEGER NOT NULL,
    "lineSubtotalMinor" INTEGER NOT NULL,
    "taxRatePercent" INTEGER,
    "taxMinor" INTEGER,
    "totalMinor" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceEvent" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "eventType" "InvoiceEventType" NOT NULL,
    "actorUserId" TEXT,
    "reason" TEXT,
    "metadataJson" JSONB,
    "requestId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconcilerEntry" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "internalNote" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconcilerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInstructionTemplate" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "bodyTemplate" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "PaymentInstructionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReminder" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "sentByUserId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL,
    "messageSnapshot" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" JSONB,

    CONSTRAINT "PaymentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSessionId" TEXT,
    "idempotencyKey" TEXT,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "expiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureReason" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionNote" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "groupSessionId" TEXT,
    "athleteId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "visibility" "SessionNoteVisibility" NOT NULL,
    "noteText" TEXT,
    "privateNotesEncrypted" TEXT,
    "metadataJson" JSONB,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "SessionNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionFeedback" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "athleteId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "rating" INTEGER,
    "publicComment" TEXT,
    "privateCommentEncrypted" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SessionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "creatorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "targetDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalMilestone" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "GoalMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteSkillAssessment" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "skillDefinitionId" TEXT NOT NULL,
    "assessorUserId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "bookingId" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteSkillAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteBadge" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "badgeDefinitionId" TEXT NOT NULL,
    "awardedByUserId" TEXT NOT NULL,
    "bookingId" TEXT,
    "note" TEXT,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drill" (
    "id" TEXT NOT NULL,
    "authorUserId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Drill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillAssignment" (
    "id" TEXT NOT NULL,
    "drillId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "title" TEXT,
    "instructions" TEXT,
    "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DrillAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "drillAssignmentId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "mediaObjectId" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaObject" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "kind" "MediaObjectKind" NOT NULL,
    "status" "MediaObjectStatus" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "bucketName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "sha256Hex" TEXT,
    "originalFileName" TEXT,
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "durationMs" INTEGER,
    "visibilityScope" TEXT NOT NULL DEFAULT 'private',
    "consentRequired" BOOLEAN NOT NULL DEFAULT false,
    "metadataJson" JSONB,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "MediaObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadSession" (
    "id" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "mediaObjectId" TEXT,
    "targetResourceType" TEXT,
    "targetResourceId" TEXT,
    "expectedContentType" TEXT,
    "expectedMaxBytes" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "uploadUrlExpiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MalwareScanResult" (
    "id" TEXT NOT NULL,
    "mediaObjectId" TEXT NOT NULL,
    "verdict" "MalwareScanVerdict" NOT NULL,
    "scanner" TEXT,
    "detailsJson" JSONB,
    "scannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MalwareScanResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "mediaObjectId" TEXT NOT NULL,
    "athleteId" TEXT,
    "coachUserId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "sourceContextType" TEXT,
    "sourceContextId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAnnotation" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "timestampMs" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "color" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VideoAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityGroup" (
    "id" TEXT NOT NULL,
    "clubId" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "CommunityGroupVisibility" NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "CommunityGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityGroupMembership" (
    "id" TEXT NOT NULL,
    "communityGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "clubId" TEXT,
    "communityGroupId" TEXT,
    "visibility" "PostVisibility" NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentsJson" JSONB,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "reactionsCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "threadType" "MessageThreadType" NOT NULL,
    "clubId" TEXT,
    "communityGroupId" TEXT,
    "groupSessionId" TEXT,
    "bookingId" TEXT,
    "title" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageParticipant" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "lastReadAt" TIMESTAMP(3),
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "MessageParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentsJson" JSONB,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReceipt" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "deepLink" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "settingsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MutedSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "reason" TEXT,
    "mutedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unmutedAt" TIMESTAMP(3),

    CONSTRAINT "MutedSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuietHours" (
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "startTimeLocal" TEXT,
    "endTimeLocal" TEXT,
    "timeZone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuietHours_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AccessGrant" (
    "id" TEXT NOT NULL,
    "grantorUserId" TEXT NOT NULL,
    "granteeUserId" TEXT NOT NULL,
    "resourceType" "AccessGrantResourceType" NOT NULL,
    "resourceId" TEXT,
    "constraintsJson" JSONB,
    "metadataJson" JSONB,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessGrantScope" (
    "id" TEXT NOT NULL,
    "accessGrantId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessGrantScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafeguardingIncident" (
    "id" TEXT NOT NULL,
    "clubId" TEXT,
    "athleteId" TEXT,
    "bookingId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "reportedByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "status" "SafeguardingIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "severity" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detailsEncrypted" TEXT,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SafeguardingIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafeguardingIncidentAction" (
    "id" TEXT NOT NULL,
    "safeguardingIncidentId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "note" TEXT,
    "metadataJson" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafeguardingIncidentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT,
    "actorUserId" TEXT,
    "actingRole" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "subjectUserId" TEXT,
    "result" TEXT NOT NULL,
    "sensitiveRead" BOOLEAN NOT NULL DEFAULT false,
    "ipHash" TEXT,
    "metadataJson" JSONB,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT,
    "metadataJson" JSONB,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionPolicy" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "retentionDays" INTEGER,
    "archiveBeforeDelete" BOOLEAN NOT NULL DEFAULT true,
    "allowHardDelete" BOOLEAN NOT NULL DEFAULT false,
    "legalHoldAware" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionRun" (
    "id" TEXT NOT NULL,
    "retentionPolicyId" TEXT,
    "status" "RetentionRunStatus" NOT NULL,
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "summaryJson" JSONB,
    "errorText" TEXT,

    CONSTRAINT "RetentionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalHold" (
    "id" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT,
    "reason" TEXT NOT NULL,
    "placedByUserId" TEXT NOT NULL,
    "releasedByUserId" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "metadataJson" JSONB,

    CONSTRAINT "LegalHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledDeletionAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "reason" TEXT,
    "metadataJson" JSONB,

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "enabledByDefault" BOOLEAN NOT NULL DEFAULT false,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlagOverride" (
    "id" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT,
    "enabled" BOOLEAN NOT NULL,
    "configJson" JSONB,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FeatureFlagOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authProviderSubject_key" ON "User"("authProviderSubject");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_accountStatus_idx" ON "User"("accountStatus");

-- CreateIndex
CREATE INDEX "UserRoleMembership_userId_active_idx" ON "UserRoleMembership"("userId", "active");

-- CreateIndex
CREATE INDEX "UserRoleMembership_role_active_idx" ON "UserRoleMembership"("role", "active");

-- CreateIndex
CREATE INDEX "UserDevice_userId_idx" ON "UserDevice"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_jwtId_key" ON "AuthSession"("jwtId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenId_key" ON "AuthSession"("refreshTokenId");

-- CreateIndex
CREATE INDEX "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_userId_endpointKey_idempotencyKey_key" ON "IdempotencyKey"("userId", "endpointKey", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Family_primaryGuardianUserId_idx" ON "Family"("primaryGuardianUserId");

-- CreateIndex
CREATE INDEX "FamilyMembership_userId_idx" ON "FamilyMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMembership_familyId_userId_key" ON "FamilyMembership"("familyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_userId_key" ON "Athlete"("userId");

-- CreateIndex
CREATE INDEX "Athlete_status_idx" ON "Athlete"("status");

-- CreateIndex
CREATE INDEX "GuardianChildLink_familyId_idx" ON "GuardianChildLink"("familyId");

-- CreateIndex
CREATE INDEX "GuardianChildLink_athleteId_idx" ON "GuardianChildLink"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianChildLink_guardianUserId_athleteId_key" ON "GuardianChildLink"("guardianUserId", "athleteId");

-- CreateIndex
CREATE INDEX "ChildEmergencyContact_athleteId_idx" ON "ChildEmergencyContact"("athleteId");

-- CreateIndex
CREATE INDEX "ChildMedicalRecord_athleteId_isCurrent_idx" ON "ChildMedicalRecord"("athleteId", "isCurrent");

-- CreateIndex
CREATE INDEX "AthleteInjury_athleteId_status_idx" ON "AthleteInjury"("athleteId", "status");

-- CreateIndex
CREATE INDEX "AthleteInjury_reportedAt_idx" ON "AthleteInjury"("reportedAt");

-- CreateIndex
CREATE INDEX "ChildSenTag_athleteId_idx" ON "ChildSenTag"("athleteId");

-- CreateIndex
CREATE INDEX "ChildConsent_athleteId_consentType_idx" ON "ChildConsent"("athleteId", "consentType");

-- CreateIndex
CREATE INDEX "ChildConsent_expiresAt_idx" ON "ChildConsent"("expiresAt");

-- CreateIndex
CREATE INDEX "CoachLocation_coachUserId_idx" ON "CoachLocation"("coachUserId");

-- CreateIndex
CREATE INDEX "CoachingOffering_coachUserId_active_idx" ON "CoachingOffering"("coachUserId", "active");

-- CreateIndex
CREATE INDEX "AvailabilityTemplate_coachUserId_dayOfWeek_active_idx" ON "AvailabilityTemplate"("coachUserId", "dayOfWeek", "active");

-- CreateIndex
CREATE INDEX "AvailabilityOverride_coachUserId_overrideDate_idx" ON "AvailabilityOverride"("coachUserId", "overrideDate");

-- CreateIndex
CREATE INDEX "CancellationPolicyRule_coachUserId_active_idx" ON "CancellationPolicyRule"("coachUserId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "ClubMembership_userId_active_idx" ON "ClubMembership"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMembership_clubId_userId_key" ON "ClubMembership"("clubId", "userId");

-- CreateIndex
CREATE INDEX "Squad_clubId_idx" ON "Squad"("clubId");

-- CreateIndex
CREATE INDEX "Squad_ownerCoachUserId_idx" ON "Squad"("ownerCoachUserId");

-- CreateIndex
CREATE INDEX "SquadMembership_athleteId_idx" ON "SquadMembership"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadMembership_squadId_athleteId_key" ON "SquadMembership"("squadId", "athleteId");

-- CreateIndex
CREATE INDEX "CoachVerification_coachUserId_verificationType_idx" ON "CoachVerification"("coachUserId", "verificationType");

-- CreateIndex
CREATE INDEX "CoachVerification_status_expiresAt_idx" ON "CoachVerification"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "VerificationDocument_mediaObjectId_idx" ON "VerificationDocument"("mediaObjectId");

-- CreateIndex
CREATE INDEX "Booking_coachUserId_status_idx" ON "Booking"("coachUserId", "status");

-- CreateIndex
CREATE INDEX "Booking_bookedByUserId_status_idx" ON "Booking"("bookedByUserId", "status");

-- CreateIndex
CREATE INDEX "Booking_scheduledAt_idx" ON "Booking"("scheduledAt");

-- CreateIndex
CREATE INDEX "Booking_groupSessionId_idx" ON "Booking"("groupSessionId");

-- CreateIndex
CREATE INDEX "BookingParticipant_athleteId_idx" ON "BookingParticipant"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingParticipant_bookingId_athleteId_key" ON "BookingParticipant"("bookingId", "athleteId");

-- CreateIndex
CREATE INDEX "BookingObjective_bookingId_sortOrder_idx" ON "BookingObjective"("bookingId", "sortOrder");

-- CreateIndex
CREATE INDEX "BookingStatusEvent_bookingId_occurredAt_idx" ON "BookingStatusEvent"("bookingId", "occurredAt");

-- CreateIndex
CREATE INDEX "BookingChangeRequest_bookingId_status_idx" ON "BookingChangeRequest"("bookingId", "status");

-- CreateIndex
CREATE INDEX "RecurringSeries_coachUserId_status_idx" ON "RecurringSeries"("coachUserId", "status");

-- CreateIndex
CREATE INDEX "RecurringSeries_bookedByUserId_status_idx" ON "RecurringSeries"("bookedByUserId", "status");

-- CreateIndex
CREATE INDEX "GroupSession_coachUserId_status_idx" ON "GroupSession"("coachUserId", "status");

-- CreateIndex
CREATE INDEX "GroupSession_clubId_status_idx" ON "GroupSession"("clubId", "status");

-- CreateIndex
CREATE INDEX "GroupSession_squadId_idx" ON "GroupSession"("squadId");

-- CreateIndex
CREATE INDEX "GroupSessionRegistration_athleteId_status_idx" ON "GroupSessionRegistration"("athleteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GroupSessionRegistration_groupSessionId_athleteId_key" ON "GroupSessionRegistration"("groupSessionId", "athleteId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_groupSessionId_position_idx" ON "WaitlistEntry"("groupSessionId", "position");

-- CreateIndex
CREATE INDEX "WaitlistEntry_userId_idx" ON "WaitlistEntry"("userId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_athleteId_idx" ON "WaitlistEntry"("athleteId");

-- CreateIndex
CREATE INDEX "Invite_senderUserId_status_idx" ON "Invite"("senderUserId", "status");

-- CreateIndex
CREATE INDEX "Invite_clubId_idx" ON "Invite"("clubId");

-- CreateIndex
CREATE INDEX "Invite_groupSessionId_idx" ON "Invite"("groupSessionId");

-- CreateIndex
CREATE INDEX "InviteTarget_inviteId_status_idx" ON "InviteTarget"("inviteId", "status");

-- CreateIndex
CREATE INDEX "InviteTarget_targetUserId_idx" ON "InviteTarget"("targetUserId");

-- CreateIndex
CREATE INDEX "InviteTarget_targetAthleteId_idx" ON "InviteTarget"("targetAthleteId");

-- CreateIndex
CREATE INDEX "ClubEvent_clubId_startsAt_idx" ON "ClubEvent"("clubId", "startsAt");

-- CreateIndex
CREATE INDEX "EventRsvp_userId_idx" ON "EventRsvp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRsvp_clubEventId_userId_key" ON "EventRsvp"("clubEventId", "userId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_bookingId_idx" ON "AttendanceRecord"("bookingId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_groupSessionId_idx" ON "AttendanceRecord"("groupSessionId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_athleteId_idx" ON "AttendanceRecord"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_coachUserId_status_idx" ON "Invoice"("coachUserId", "status");

-- CreateIndex
CREATE INDEX "Invoice_payerUserId_idx" ON "Invoice"("payerUserId");

-- CreateIndex
CREATE INDEX "Invoice_bookingId_idx" ON "Invoice"("bookingId");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_sortOrder_idx" ON "InvoiceLineItem"("invoiceId", "sortOrder");

-- CreateIndex
CREATE INDEX "InvoiceEvent_invoiceId_occurredAt_idx" ON "InvoiceEvent"("invoiceId", "occurredAt");

-- CreateIndex
CREATE INDEX "ReconcilerEntry_coachUserId_state_idx" ON "ReconcilerEntry"("coachUserId", "state");

-- CreateIndex
CREATE INDEX "ReconcilerEntry_invoiceId_idx" ON "ReconcilerEntry"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentInstructionTemplate_coachUserId_isDefault_idx" ON "PaymentInstructionTemplate"("coachUserId", "isDefault");

-- CreateIndex
CREATE INDEX "PaymentReminder_invoiceId_sentAt_idx" ON "PaymentReminder"("invoiceId", "sentAt");

-- CreateIndex
CREATE INDEX "PaymentReminder_recipientUserId_idx" ON "PaymentReminder"("recipientUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_providerSessionId_key" ON "PaymentAttempt"("providerSessionId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_invoiceId_status_idx" ON "PaymentAttempt"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "PaymentAttempt_provider_providerSessionId_idx" ON "PaymentAttempt"("provider", "providerSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_invoiceId_idempotencyKey_key" ON "PaymentAttempt"("invoiceId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SessionNote_bookingId_idx" ON "SessionNote"("bookingId");

-- CreateIndex
CREATE INDEX "SessionNote_athleteId_coachUserId_idx" ON "SessionNote"("athleteId", "coachUserId");

-- CreateIndex
CREATE INDEX "SessionFeedback_bookingId_idx" ON "SessionFeedback"("bookingId");

-- CreateIndex
CREATE INDEX "SessionFeedback_athleteId_idx" ON "SessionFeedback"("athleteId");

-- CreateIndex
CREATE INDEX "Goal_athleteId_status_idx" ON "Goal"("athleteId", "status");

-- CreateIndex
CREATE INDEX "GoalMilestone_goalId_sortOrder_idx" ON "GoalMilestone"("goalId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SkillDefinition_code_key" ON "SkillDefinition"("code");

-- CreateIndex
CREATE INDEX "AthleteSkillAssessment_athleteId_skillDefinitionId_assessed_idx" ON "AthleteSkillAssessment"("athleteId", "skillDefinitionId", "assessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeDefinition_code_key" ON "BadgeDefinition"("code");

-- CreateIndex
CREATE INDEX "AthleteBadge_athleteId_awardedAt_idx" ON "AthleteBadge"("athleteId", "awardedAt");

-- CreateIndex
CREATE INDEX "DrillAssignment_athleteId_status_idx" ON "DrillAssignment"("athleteId", "status");

-- CreateIndex
CREATE INDEX "DrillAssignment_coachUserId_status_idx" ON "DrillAssignment"("coachUserId", "status");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_drillAssignmentId_submittedAt_idx" ON "AssignmentSubmission"("drillAssignmentId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaObject_storageKey_key" ON "MediaObject"("storageKey");

-- CreateIndex
CREATE INDEX "MediaObject_ownerUserId_idx" ON "MediaObject"("ownerUserId");

-- CreateIndex
CREATE INDEX "MediaObject_status_idx" ON "MediaObject"("status");

-- CreateIndex
CREATE INDEX "UploadSession_requesterUserId_createdAt_idx" ON "UploadSession"("requesterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "UploadSession_uploadUrlExpiresAt_idx" ON "UploadSession"("uploadUrlExpiresAt");

-- CreateIndex
CREATE INDEX "MalwareScanResult_mediaObjectId_createdAt_idx" ON "MalwareScanResult"("mediaObjectId", "createdAt");

-- CreateIndex
CREATE INDEX "Video_athleteId_idx" ON "Video"("athleteId");

-- CreateIndex
CREATE INDEX "Video_coachUserId_idx" ON "Video"("coachUserId");

-- CreateIndex
CREATE INDEX "VideoAnnotation_videoId_timestampMs_idx" ON "VideoAnnotation"("videoId", "timestampMs");

-- CreateIndex
CREATE INDEX "CommunityGroup_clubId_idx" ON "CommunityGroup"("clubId");

-- CreateIndex
CREATE INDEX "CommunityGroup_ownerUserId_idx" ON "CommunityGroup"("ownerUserId");

-- CreateIndex
CREATE INDEX "CommunityGroupMembership_userId_active_idx" ON "CommunityGroupMembership"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityGroupMembership_communityGroupId_userId_key" ON "CommunityGroupMembership"("communityGroupId", "userId");

-- CreateIndex
CREATE INDEX "Post_authorUserId_createdAt_idx" ON "Post"("authorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_clubId_createdAt_idx" ON "Post"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_communityGroupId_createdAt_idx" ON "Post"("communityGroupId", "createdAt");

-- CreateIndex
CREATE INDEX "PostComment_postId_createdAt_idx" ON "PostComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PostComment_parentCommentId_idx" ON "PostComment"("parentCommentId");

-- CreateIndex
CREATE INDEX "PostReaction_userId_idx" ON "PostReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostReaction_postId_userId_reaction_key" ON "PostReaction"("postId", "userId", "reaction");

-- CreateIndex
CREATE INDEX "MessageThread_threadType_updatedAt_idx" ON "MessageThread"("threadType", "updatedAt");

-- CreateIndex
CREATE INDEX "MessageThread_clubId_idx" ON "MessageThread"("clubId");

-- CreateIndex
CREATE INDEX "MessageThread_communityGroupId_idx" ON "MessageThread"("communityGroupId");

-- CreateIndex
CREATE INDEX "MessageParticipant_userId_idx" ON "MessageParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageParticipant_messageThreadId_userId_key" ON "MessageParticipant"("messageThreadId", "userId");

-- CreateIndex
CREATE INDEX "Message_messageThreadId_createdAt_idx" ON "Message"("messageThreadId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderUserId_createdAt_idx" ON "Message"("senderUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageReceipt_userId_readAt_idx" ON "MessageReceipt"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReceipt_messageId_userId_key" ON "MessageReceipt"("messageId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MutedSource_userId_mutedAt_idx" ON "MutedSource"("userId", "mutedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MutedSource_userId_sourceType_sourceId_key" ON "MutedSource"("userId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "AccessGrant_grantorUserId_idx" ON "AccessGrant"("grantorUserId");

-- CreateIndex
CREATE INDEX "AccessGrant_granteeUserId_idx" ON "AccessGrant"("granteeUserId");

-- CreateIndex
CREATE INDEX "AccessGrant_resourceType_resourceId_idx" ON "AccessGrant"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AccessGrant_expiresAt_idx" ON "AccessGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "AccessGrantScope_scope_idx" ON "AccessGrantScope"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "AccessGrantScope_accessGrantId_scope_key" ON "AccessGrantScope"("accessGrantId", "scope");

-- CreateIndex
CREATE INDEX "SafeguardingIncident_clubId_status_idx" ON "SafeguardingIncident"("clubId", "status");

-- CreateIndex
CREATE INDEX "SafeguardingIncident_athleteId_status_idx" ON "SafeguardingIncident"("athleteId", "status");

-- CreateIndex
CREATE INDEX "SafeguardingIncident_assignedToUserId_status_idx" ON "SafeguardingIncident"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "SafeguardingIncidentAction_safeguardingIncidentId_occurredA_idx" ON "SafeguardingIncidentAction"("safeguardingIncidentId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_occurredAt_idx" ON "AuditEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_occurredAt_idx" ON "AuditEvent"("actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_resourceType_resourceId_idx" ON "AuditEvent"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditEvent_action_occurredAt_idx" ON "AuditEvent"("action", "occurredAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_occurredAt_idx" ON "SecurityEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_eventType_occurredAt_idx" ON "SecurityEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_occurredAt_idx" ON "SecurityEvent"("severity", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicy_tableName_key" ON "RetentionPolicy"("tableName");

-- CreateIndex
CREATE INDEX "RetentionRun_status_startedAt_idx" ON "RetentionRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "LegalHold_scopeType_scopeId_idx" ON "LegalHold"("scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "LegalHold_releasedAt_idx" ON "LegalHold"("releasedAt");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_requesterUserId_status_idx" ON "DataDeletionRequest"("requesterUserId", "status");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_scheduledDeletionAt_idx" ON "DataDeletionRequest"("scheduledDeletionAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlagOverride_featureFlagId_idx" ON "FeatureFlagOverride"("featureFlagId");

-- CreateIndex
CREATE INDEX "FeatureFlagOverride_scopeType_scopeId_idx" ON "FeatureFlagOverride"("scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_nextAttemptAt_idx" ON "OutboxEvent"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleMembership" ADD CONSTRAINT "UserRoleMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userDeviceId_fkey" FOREIGN KEY ("userDeviceId") REFERENCES "UserDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordCredential" ADD CONSTRAINT "PasswordCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMembership" ADD CONSTRAINT "FamilyMembership_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMembership" ADD CONSTRAINT "FamilyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianChildLink" ADD CONSTRAINT "GuardianChildLink_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianChildLink" ADD CONSTRAINT "GuardianChildLink_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianChildLink" ADD CONSTRAINT "GuardianChildLink_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildEmergencyContact" ADD CONSTRAINT "ChildEmergencyContact_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildMedicalRecord" ADD CONSTRAINT "ChildMedicalRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteInjury" ADD CONSTRAINT "AthleteInjury_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildSenTag" ADD CONSTRAINT "ChildSenTag_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildConsent" ADD CONSTRAINT "ChildConsent_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachLocation" ADD CONSTRAINT "CoachLocation_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "CoachProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingOffering" ADD CONSTRAINT "CoachingOffering_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "CoachProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityTemplate" ADD CONSTRAINT "AvailabilityTemplate_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "CoachProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "CoachProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingRule" ADD CONSTRAINT "SchedulingRule_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "CoachProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationPolicyRule" ADD CONSTRAINT "CancellationPolicyRule_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "CoachProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadMembership" ADD CONSTRAINT "SquadMembership_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadMembership" ADD CONSTRAINT "SquadMembership_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachVerification" ADD CONSTRAINT "CoachVerification_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "CoachProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_coachVerificationId_fkey" FOREIGN KEY ("coachVerificationId") REFERENCES "CoachVerification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_mediaObjectId_fkey" FOREIGN KEY ("mediaObjectId") REFERENCES "MediaObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingObjective" ADD CONSTRAINT "BookingObjective_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingStatusEvent" ADD CONSTRAINT "BookingStatusEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingChangeRequest" ADD CONSTRAINT "BookingChangeRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSession" ADD CONSTRAINT "GroupSession_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSessionRegistration" ADD CONSTRAINT "GroupSessionRegistration_groupSessionId_fkey" FOREIGN KEY ("groupSessionId") REFERENCES "GroupSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSessionRegistration" ADD CONSTRAINT "GroupSessionRegistration_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_groupSessionId_fkey" FOREIGN KEY ("groupSessionId") REFERENCES "GroupSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteTarget" ADD CONSTRAINT "InviteTarget_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEvent" ADD CONSTRAINT "ClubEvent_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_clubEventId_fkey" FOREIGN KEY ("clubEventId") REFERENCES "ClubEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_groupSessionId_fkey" FOREIGN KEY ("groupSessionId") REFERENCES "GroupSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceEvent" ADD CONSTRAINT "InvoiceEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconcilerEntry" ADD CONSTRAINT "ReconcilerEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionNote" ADD CONSTRAINT "SessionNote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionNote" ADD CONSTRAINT "SessionNote_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalMilestone" ADD CONSTRAINT "GoalMilestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSkillAssessment" ADD CONSTRAINT "AthleteSkillAssessment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSkillAssessment" ADD CONSTRAINT "AthleteSkillAssessment_skillDefinitionId_fkey" FOREIGN KEY ("skillDefinitionId") REFERENCES "SkillDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteBadge" ADD CONSTRAINT "AthleteBadge_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteBadge" ADD CONSTRAINT "AthleteBadge_badgeDefinitionId_fkey" FOREIGN KEY ("badgeDefinitionId") REFERENCES "BadgeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillAssignment" ADD CONSTRAINT "DrillAssignment_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "Drill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillAssignment" ADD CONSTRAINT "DrillAssignment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_drillAssignmentId_fkey" FOREIGN KEY ("drillAssignmentId") REFERENCES "DrillAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_mediaObjectId_fkey" FOREIGN KEY ("mediaObjectId") REFERENCES "MediaObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_mediaObjectId_fkey" FOREIGN KEY ("mediaObjectId") REFERENCES "MediaObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MalwareScanResult" ADD CONSTRAINT "MalwareScanResult_mediaObjectId_fkey" FOREIGN KEY ("mediaObjectId") REFERENCES "MediaObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_mediaObjectId_fkey" FOREIGN KEY ("mediaObjectId") REFERENCES "MediaObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAnnotation" ADD CONSTRAINT "VideoAnnotation_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityGroupMembership" ADD CONSTRAINT "CommunityGroupMembership_communityGroupId_fkey" FOREIGN KEY ("communityGroupId") REFERENCES "CommunityGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityGroupMembership" ADD CONSTRAINT "CommunityGroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityGroupId_fkey" FOREIGN KEY ("communityGroupId") REFERENCES "CommunityGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_communityGroupId_fkey" FOREIGN KEY ("communityGroupId") REFERENCES "CommunityGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageParticipant" ADD CONSTRAINT "MessageParticipant_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "MessageThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageParticipant" ADD CONSTRAINT "MessageParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "MessageThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReceipt" ADD CONSTRAINT "MessageReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReceipt" ADD CONSTRAINT "MessageReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutedSource" ADD CONSTRAINT "MutedSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuietHours" ADD CONSTRAINT "QuietHours_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_grantorUserId_fkey" FOREIGN KEY ("grantorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_granteeUserId_fkey" FOREIGN KEY ("granteeUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrantScope" ADD CONSTRAINT "AccessGrantScope_accessGrantId_fkey" FOREIGN KEY ("accessGrantId") REFERENCES "AccessGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafeguardingIncidentAction" ADD CONSTRAINT "SafeguardingIncidentAction_safeguardingIncidentId_fkey" FOREIGN KEY ("safeguardingIncidentId") REFERENCES "SafeguardingIncident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionRun" ADD CONSTRAINT "RetentionRun_retentionPolicyId_fkey" FOREIGN KEY ("retentionPolicyId") REFERENCES "RetentionPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlagOverride" ADD CONSTRAINT "FeatureFlagOverride_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "FeatureFlag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

