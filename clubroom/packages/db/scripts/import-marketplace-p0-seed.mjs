import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const datasetPath = path.resolve(
  repoRoot,
  'docs/backend-api/test-data/marketplace/linked-dataset.json',
);

const prisma = new PrismaClient();

const asRows = (value) => (Array.isArray(value) ? value : []);
const asString = (value) => (typeof value === 'string' ? value : undefined);
const asNumber = (value, fallback = 0) => (typeof value === 'number' ? value : fallback);
const asBoolean = (value, fallback = false) => (typeof value === 'boolean' ? value : fallback);
const asArray = (value) => (Array.isArray(value) ? value : []);
const toDate = (value) => (typeof value === 'string' ? new Date(value) : null);
const toBigInt = (value, fallback = 1) => BigInt(asNumber(value, fallback));
const randomHex = (size = 16) => crypto.randomBytes(size).toString('hex');
const splitDisplayName = (value) => {
  const trimmed = asString(value)?.trim() ?? '';
  if (!trimmed) {
    return { firstName: null, lastName: null };
  }
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(' ') || parts[0] || null,
  };
};
const buildCodePrefix = (clubName) => {
  const normalized = String(clubName ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  return normalized.slice(0, 5) || 'CLUB';
};
const buildInviteCode = (clubName, role) => {
  const suffix =
    role === 'MEMBER'
      ? 'JOIN'
      : String(role)
          .replace(/[^A-Za-z]/g, '')
          .slice(0, 4) || 'TEAM';
  return `${buildCodePrefix(clubName)}-${suffix}`;
};
const buildDefaultInviteCode = (clubName, role, clubId) => {
  const clubSuffix =
    String(clubId ?? '')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(-4)
      .toUpperCase() || 'CLUB';
  return `${buildInviteCode(clubName, role)}-${clubSuffix}`;
};
const normalizeEmergencyContactId = (value) => {
  const id = asString(value);
  if (!id) {
    return `emc_${crypto.randomUUID()}`;
  }
  if (id.startsWith('emc_')) {
    return id;
  }
  if (id.startsWith('cec_')) {
    return `emc_${id.slice(4)}`;
  }
  return id;
};

function hashPassword(password) {
  const salt = randomHex(16);
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function passwordForRoles(roles) {
  if (roles.includes('club_admin') || roles.includes('security_admin')) {
    return 'admin';
  }
  if (roles.includes('coach')) {
    return 'coach';
  }
  return 'user';
}

async function main() {
  const raw = await fs.readFile(datasetPath, 'utf8');
  const dataset = JSON.parse(raw);
  const tables = dataset.tables ?? {};

  await prisma.$transaction(async (tx) => {
    await tx.messageReceipt.deleteMany();
    await tx.message.deleteMany();
    await tx.messageParticipant.deleteMany();
    await tx.messageThread.deleteMany();
    await tx.postReaction.deleteMany();
    await tx.postComment.deleteMany();
    await tx.post.deleteMany();
    await tx.communityGroupMembership.deleteMany();
    await tx.communityGroup.deleteMany();
    await tx.quietHours.deleteMany();
    await tx.mutedSource.deleteMany();
    await tx.notificationPreference.deleteMany();
    await tx.notification.deleteMany();
    await tx.videoAnnotation.deleteMany();
    await tx.videoShare.deleteMany();
    await tx.video.deleteMany();
    await tx.clubInviteCode.deleteMany();
    await tx.squad.deleteMany();
    await tx.clubMembership.deleteMany();
    await tx.club.deleteMany();
    await tx.passwordCredential.deleteMany();
    await tx.cancellationPolicyRule.deleteMany();
    await tx.schedulingRule.deleteMany();
    await tx.availabilityOverride.deleteMany();
    await tx.availabilityTemplate.deleteMany();
    await tx.coachingOffering.deleteMany();
    await tx.coachLocation.deleteMany();
    await tx.coachProfile.deleteMany();
    await tx.inviteTarget.deleteMany();
    await tx.invite.deleteMany();
    await tx.attendanceRecord.deleteMany();
    await tx.waitlistEntry.deleteMany();
    await tx.groupSessionRegistration.deleteMany();
    await tx.groupSession.deleteMany();
    await tx.bookingStatusEvent.deleteMany();
    await tx.bookingObjective.deleteMany();
    await tx.bookingParticipant.deleteMany();
    await tx.booking.deleteMany();
    await tx.athleteInjury.deleteMany();
    await tx.childConsent.deleteMany();
    await tx.childMedicalRecord.deleteMany();
    await tx.childEmergencyContact.deleteMany();
    await tx.childSenTag.deleteMany();
    await tx.guardianChildLink.deleteMany();
    await tx.athlete.deleteMany();
    await tx.familyMembership.deleteMany();
    await tx.family.deleteMany();
    await tx.userRoleMembership.deleteMany();
    await tx.userProfile.deleteMany();
    await tx.user.deleteMany();

    const users = asRows(tables.users).map((row) => ({
      id: row.id,
      authProvider: asString(row.authProvider) ?? 'auth0',
      authProviderSubject: asString(row.authProviderSubject) ?? `${row.id}`,
      email: asString(row.email) ?? null,
      name: asString(row.name) ?? 'Unknown User',
      avatarUrl: asString(row.avatarUrl) ?? null,
      locale: asString(row.locale) ?? null,
      timeZone: asString(row.timeZone) ?? null,
      accountStatus: asString(row.accountStatus) ?? 'active',
      isVerified: asBoolean(row.isVerified, false),
      isLive: typeof row.isLive === 'boolean' ? row.isLive : null,
      onboardingComplete: asBoolean(row.onboardingComplete, false),
      tokenEpoch: asNumber(row.tokenEpoch, 0),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
    }));
    if (users.length > 0) {
      await tx.user.createMany({ data: users });
    }

    const userProfiles = asRows(tables.userProfiles).map((row) => ({
      userId: row.userId,
      bio: asString(row.bio) ?? null,
      addressLine: asString(row.addressLine) ?? null,
      city: asString(row.city) ?? null,
      postcode: asString(row.postcode) ?? null,
      country: asString(row.country) ?? null,
      dateOfBirth: toDate(row.dateOfBirth),
      phoneE164: asString(row.phoneE164) ?? null,
      skillLevel: asString(row.skillLevel) ?? null,
      position: asString(row.position) ?? null,
      sport: asString(row.sport) ?? null,
      goals: asArray(row.goals).map((value) => String(value)),
      isOrganization: typeof row.isOrganization === 'boolean' ? row.isOrganization : null,
      organizationName: asString(row.organizationName) ?? null,
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
    if (userProfiles.length > 0) {
      await tx.userProfile.createMany({ data: userProfiles });
    }

    const roleMemberships = asRows(tables.userRoleMemberships).map((row) => ({
      id: row.id,
      userId: row.userId,
      role: row.role,
      source: asString(row.source) ?? null,
      clubId: asString(row.clubId) ?? null,
      active: asBoolean(row.active, true),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      revokedAt: toDate(row.revokedAt),
    }));
    if (roleMemberships.length > 0) {
      await tx.userRoleMembership.createMany({ data: roleMemberships });
    }

    const rolesByUserId = new Map();
    for (const membership of roleMemberships) {
      const existing = rolesByUserId.get(membership.userId) ?? [];
      existing.push(String(membership.role));
      rolesByUserId.set(membership.userId, existing);
    }

    const passwordCredentials = users
      .filter((user) => typeof user.email === 'string' && user.email.length > 0)
      .map((user) => ({
        userId: user.id,
        passwordHash: hashPassword(passwordForRoles(rolesByUserId.get(user.id) ?? [])),
      }));
    if (passwordCredentials.length > 0) {
      await tx.passwordCredential.createMany({ data: passwordCredentials });
    }

    const clubs = asRows(tables.clubs).map((row) => ({
      id: row.id,
      name: asString(row.name) ?? 'Club',
      slug: asString(row.slug) ?? null,
      visibility: asString(row.visibility) ?? 'private',
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.createdByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (clubs.length > 0) {
      await tx.club.createMany({ data: clubs });
    }

    const clubMemberships = asRows(tables.clubMemberships).map((row) => ({
      id: row.id,
      clubId: row.clubId,
      userId: row.userId,
      role: asString(row.role) ?? 'member',
      active: asBoolean(row.active, true),
      createdByUserId: asString(row.createdByUserId) ?? asString(row.userId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.userId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (clubMemberships.length > 0) {
      await tx.clubMembership.createMany({ data: clubMemberships });
    }

    const squads = asRows(tables.squads).map((row) => ({
      id: row.id,
      clubId: row.clubId,
      ownerCoachUserId: asString(row.ownerCoachUserId) ?? null,
      name: asString(row.name) ?? 'Squad',
      ageBandLabel: asString(row.ageBandLabel) ?? null,
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.createdByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (squads.length > 0) {
      await tx.squad.createMany({ data: squads });
    }

    const clubInviteCodes = clubs.flatMap((club) => {
      const createdAt = club.createdAt ?? new Date();
      return [
        {
          id: `cinv_${crypto.randomUUID()}`,
          clubId: club.id,
          code: buildDefaultInviteCode(club.name, 'MEMBER', club.id),
          role: 'MEMBER',
          remainingUses: 999,
          expiresAt: new Date(createdAt.getTime() + 365 * 24 * 60 * 60 * 1000),
          createdByUserId: club.createdByUserId,
          updatedByUserId: club.createdByUserId,
          version: 1n,
          createdAt,
          updatedAt: createdAt,
          deletedAt: null,
          deletedByUserId: null,
        },
        {
          id: `cinv_${crypto.randomUUID()}`,
          clubId: club.id,
          code: buildDefaultInviteCode(club.name, 'COACH', club.id),
          role: 'COACH',
          remainingUses: 25,
          expiresAt: new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000),
          createdByUserId: club.createdByUserId,
          updatedByUserId: club.createdByUserId,
          version: 1n,
          createdAt,
          updatedAt: createdAt,
          deletedAt: null,
          deletedByUserId: null,
        },
      ];
    });
    if (clubInviteCodes.length > 0) {
      await tx.clubInviteCode.createMany({ data: clubInviteCodes });
    }

    const coachProfiles = asRows(tables.coachProfiles).map((row) => ({
      userId: row.userId,
      bio: asString(row.bio) ?? null,
      yearsExperience: typeof row.yearsExperience === 'number' ? row.yearsExperience : null,
      sessionRateMinor: typeof row.sessionRateMinor === 'number' ? row.sessionRateMinor : null,
      currency: asString(row.currency) ?? 'GBP',
      dbsChecked: typeof row.dbsChecked === 'boolean' ? row.dbsChecked : null,
      specialties: asArray(row.specialties).map((value) => String(value)),
      qualifications: asArray(row.qualifications).map((value) => String(value)),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
    }));
    if (coachProfiles.length > 0) {
      await tx.coachProfile.createMany({ data: coachProfiles });
    }

    const coachLocations = asRows(tables.coachLocations).map((row) => ({
      id: row.id,
      coachUserId: row.coachUserId,
      label: asString(row.label) ?? 'Coach location',
      addressText: asString(row.addressText) ?? null,
      latLngJson: row.latLngJson ?? null,
      isDefault: asBoolean(row.isDefault, false),
      createdByUserId: asString(row.createdByUserId) ?? asString(row.coachUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.coachUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (coachLocations.length > 0) {
      await tx.coachLocation.createMany({ data: coachLocations });
    }

    const coachingOfferings = asRows(tables.coachingOfferings).map((row) => ({
      id: row.id,
      coachUserId: row.coachUserId,
      title: asString(row.title) ?? 'Coaching session',
      serviceType: asString(row.serviceType) ?? 'one_to_one',
      durationMinutes: asNumber(row.durationMinutes, 60),
      capacity: asNumber(row.capacity, 1),
      priceMinor: asNumber(row.priceMinor, 0),
      currency: asString(row.currency) ?? 'GBP',
      description: asString(row.description) ?? null,
      defaultLocation: asString(row.defaultLocation) ?? null,
      active: asBoolean(row.active, true),
      createdByUserId: asString(row.createdByUserId) ?? asString(row.coachUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.coachUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (coachingOfferings.length > 0) {
      await tx.coachingOffering.createMany({ data: coachingOfferings });
    }

    const availabilityTemplates = asRows(tables.availabilityTemplates).map((row) => ({
      id: row.id,
      coachUserId: row.coachUserId,
      dayOfWeek: asNumber(row.dayOfWeek, 0),
      startTimeLocal: asString(row.startTimeLocal) ?? '00:00',
      endTimeLocal: asString(row.endTimeLocal) ?? '00:00',
      location: asString(row.location) ?? null,
      maxConcurrent: typeof row.maxConcurrent === 'number' ? row.maxConcurrent : null,
      bufferMinutes: typeof row.bufferMinutes === 'number' ? row.bufferMinutes : null,
      sessionTemplateId: asString(row.sessionTemplateId) ?? null,
      active: asBoolean(row.active, true),
      createdByUserId: asString(row.createdByUserId) ?? asString(row.coachUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.coachUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (availabilityTemplates.length > 0) {
      await tx.availabilityTemplate.createMany({ data: availabilityTemplates });
    }

    const availabilityOverrides = asRows(tables.availabilityOverrides).map((row) => ({
      id: row.id,
      coachUserId: row.coachUserId,
      overrideDate: toDate(row.overrideDate) ?? new Date(),
      startTimeLocal: asString(row.startTimeLocal) ?? null,
      endTimeLocal: asString(row.endTimeLocal) ?? null,
      location: asString(row.location) ?? null,
      active: asBoolean(row.active, true),
      isBlocked: asBoolean(row.isBlocked, false),
      reason: asString(row.reason) ?? null,
      repeatUntil: toDate(row.repeatUntil),
      repeatDayOfWeek: typeof row.repeatDayOfWeek === 'number' ? row.repeatDayOfWeek : null,
      repeatGroupId: asString(row.repeatGroupId) ?? null,
      createdByUserId: asString(row.createdByUserId) ?? asString(row.coachUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.coachUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (availabilityOverrides.length > 0) {
      await tx.availabilityOverride.createMany({ data: availabilityOverrides });
    }

    const schedulingRules = asRows(tables.schedulingRules).map((row) => ({
      coachUserId: row.coachUserId,
      minimumAdvanceBookingHours: asNumber(row.minimumAdvanceBookingHours, 24),
      maxAdvanceBookingDays: asNumber(row.maxAdvanceBookingDays, 60),
      bufferMinutesDefault: asNumber(row.bufferMinutesDefault, 15),
      maxConcurrentDefault: asNumber(row.maxConcurrentDefault, 1),
      allowSameDayBookings: asBoolean(row.allowSameDayBookings, false),
      confirmationMode: asString(row.confirmationMode) ?? 'manual',
      cancellationPolicyId: asString(row.cancellationPolicyId) ?? null,
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
    if (schedulingRules.length > 0) {
      await tx.schedulingRule.createMany({ data: schedulingRules });
    }

    const cancellationPolicyRules = asRows(tables.cancellationPolicyRules).map((row) => ({
      id: row.id,
      coachUserId: row.coachUserId,
      name: asString(row.name) ?? 'Cancellation policy',
      description: asString(row.description) ?? null,
      noticeHoursMin: asNumber(row.noticeHoursMin, 0),
      refundPercent: typeof row.refundPercent === 'number' ? row.refundPercent : null,
      feeMinor: typeof row.feeMinor === 'number' ? row.feeMinor : null,
      currency: asString(row.currency) ?? 'GBP',
      appliesToNoShow: asBoolean(row.appliesToNoShow, false),
      sortOrder: asNumber(row.sortOrder, 0),
      isDefault: asBoolean(row.isDefault, false),
      active: asBoolean(row.active, true),
      createdByUserId: asString(row.createdByUserId) ?? asString(row.coachUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.coachUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (cancellationPolicyRules.length > 0) {
      await tx.cancellationPolicyRule.createMany({ data: cancellationPolicyRules });
    }

    const families = asRows(tables.families).map((row) => ({
      id: row.id,
      name: asString(row.name) ?? 'Family',
      primaryGuardianUserId: asString(row.primaryGuardianUserId) ?? '',
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (families.length > 0) {
      await tx.family.createMany({ data: families });
    }

    const familyMemberships = asRows(tables.familyMemberships).map((row) => ({
      id: row.id,
      familyId: row.familyId,
      userId: row.userId,
      role: asString(row.role) ?? 'guardian',
      permissions: asArray(row.permissions).map((value) => String(value)),
      relationshipLabel: asString(row.relationshipLabel) ?? null,
      childAccessAthleteIds: asArray(row.childAccessAthleteIds).map((value) => String(value)),
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (familyMemberships.length > 0) {
      await tx.familyMembership.createMany({ data: familyMemberships });
    }

    const athletes = asRows(tables.athletes).map((row) => {
      const splitName = splitDisplayName(row.displayName);
      return {
        id: row.id,
        userId: asString(row.userId) ?? null,
        displayName: asString(row.displayName) ?? 'Athlete',
        firstName: asString(row.firstName) ?? splitName.firstName,
        lastName: asString(row.lastName) ?? splitName.lastName,
        nickname: asString(row.nickname) ?? null,
        dateOfBirth: toDate(row.dateOfBirth),
        gender: asString(row.gender) ?? null,
        relationshipLabel: asString(row.relationshipLabel) ?? null,
        primaryPosition: asString(row.primaryPosition) ?? null,
        avatarUrl: asString(row.avatarUrl) ?? null,
        communicationNotes: asString(row.communicationNotes) ?? null,
        behavioralNotes: asString(row.behavioralNotes) ?? null,
        disabilitiesJson: Array.isArray(row.disabilitiesJson)
          ? row.disabilitiesJson
          : Array.isArray(row.disabilities)
            ? row.disabilities
            : [],
        specialNeedsJson: Array.isArray(row.specialNeedsJson)
          ? row.specialNeedsJson
          : Array.isArray(row.specialNeeds)
            ? row.specialNeeds
            : [],
        status: asString(row.status) ?? 'active',
        createdByUserId: asString(row.createdByUserId) ?? '',
        updatedByUserId: asString(row.updatedByUserId) ?? '',
        version: toBigInt(row.version, 1),
        createdAt: toDate(row.createdAt) ?? new Date(),
        updatedAt: toDate(row.updatedAt) ?? new Date(),
        deletedAt: toDate(row.deletedAt),
        deletedByUserId: asString(row.deletedByUserId) ?? null,
      };
    });
    if (athletes.length > 0) {
      await tx.athlete.createMany({ data: athletes });
    }

    const guardianLinks = asRows(tables.guardianChildLinks).map((row) => ({
      id: row.id,
      familyId: row.familyId,
      guardianUserId: row.guardianUserId,
      athleteId: row.athleteId,
      relationshipType: asString(row.relationshipType) ?? 'guardian',
      isPrimary: asBoolean(row.isPrimary, false),
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (guardianLinks.length > 0) {
      await tx.guardianChildLink.createMany({ data: guardianLinks });
    }

    const mediaObjects = asRows(tables.mediaObjects).map((row) => ({
      id: row.id,
      ownerUserId: asString(row.ownerUserId) ?? null,
      kind: asString(row.kind) ?? 'VIDEO',
      status: asString(row.status) ?? 'AVAILABLE',
      storageKey: asString(row.storageKey) ?? '',
      bucketName: asString(row.bucketName) ?? 'clubroom-private',
      contentType: asString(row.contentType) ?? 'application/octet-stream',
      sizeBytes: BigInt(asNumber(row.sizeBytes, 0)),
      sha256Hex: asString(row.sha256Hex) ?? null,
      originalFileName: asString(row.originalFileName) ?? null,
      widthPx: typeof row.widthPx === 'number' ? row.widthPx : null,
      heightPx: typeof row.heightPx === 'number' ? row.heightPx : null,
      durationMs: typeof row.durationMs === 'number' ? row.durationMs : null,
      visibilityScope: asString(row.visibilityScope) ?? 'private',
      consentRequired: asBoolean(row.consentRequired, false),
      metadataJson: row.metadataJson ?? null,
      createdByUserId: asString(row.createdByUserId) ?? asString(row.ownerUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.ownerUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (mediaObjects.length > 0) {
      await tx.mediaObject.createMany({ data: mediaObjects, skipDuplicates: true });
    }

    const uploadSessions = asRows(tables.uploadSessions).map((row) => ({
      id: row.id,
      requesterUserId: asString(row.requesterUserId) ?? '',
      mediaObjectId: asString(row.mediaObjectId) ?? null,
      targetResourceType: asString(row.targetResourceType) ?? null,
      targetResourceId: asString(row.targetResourceId) ?? null,
      expectedContentType: asString(row.expectedContentType) ?? null,
      expectedMaxBytes:
        typeof row.expectedMaxBytes === 'number' ? BigInt(row.expectedMaxBytes) : null,
      status: asString(row.status) ?? 'COMPLETED',
      uploadUrlExpiresAt: toDate(row.uploadUrlExpiresAt) ?? new Date(),
      completedAt: toDate(row.completedAt),
      metadataJson: row.metadataJson ?? null,
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
    if (uploadSessions.length > 0) {
      await tx.uploadSession.createMany({ data: uploadSessions, skipDuplicates: true });
    }

    const malwareScanResults = asRows(tables.malwareScanResults).map((row) => ({
      id: row.id,
      mediaObjectId: asString(row.mediaObjectId) ?? '',
      verdict: asString(row.verdict) ?? 'CLEAN',
      scanner: asString(row.scanner) ?? null,
      detailsJson: row.detailsJson ?? null,
      scannedAt: toDate(row.scannedAt),
      createdAt: toDate(row.createdAt) ?? new Date(),
    }));
    if (malwareScanResults.length > 0) {
      await tx.malwareScanResult.createMany({ data: malwareScanResults, skipDuplicates: true });
    }

    const videos = asRows(tables.videos).map((row) => ({
      id: row.id,
      mediaObjectId: row.mediaObjectId,
      athleteId: asString(row.athleteId) ?? null,
      coachUserId: asString(row.coachUserId) ?? null,
      title: asString(row.title) ?? null,
      description: asString(row.description) ?? null,
      visibility: asString(row.visibility) ?? 'PRIVATE',
      sourceContextType: asString(row.sourceContextType) ?? null,
      sourceContextId: asString(row.sourceContextId) ?? null,
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.createdByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
    }));
    if (videos.length > 0) {
      await tx.video.createMany({ data: videos });
    }

    const videoShares = asRows(tables.videos).flatMap((row) => {
      const videoId = asString(row.id);
      const createdByUserId = asString(row.createdByUserId) ?? '';
      const updatedByUserId = asString(row.updatedByUserId) ?? createdByUserId;
      const sharedWith = asArray(row.sharedWith)
        .map((value) => asString(value))
        .filter((value) => Boolean(value));

      if (!videoId || sharedWith.length === 0) {
        return [];
      }

      return sharedWith.map((sharedWithUserId) => ({
        id: `${videoId}:${sharedWithUserId}`,
        videoId,
        sharedWithUserId,
        createdByUserId,
        updatedByUserId,
        version: toBigInt(row.version, 1),
        createdAt: toDate(row.createdAt) ?? new Date(),
        updatedAt: toDate(row.updatedAt) ?? new Date(),
        deletedAt: toDate(row.deletedAt),
      }));
    });
    if (videoShares.length > 0) {
      await tx.videoShare.createMany({ data: videoShares });
    }

    const videoAnnotations = asRows(tables.videoAnnotations).map((row) => ({
      id: row.id,
      videoId: row.videoId,
      authorUserId: asString(row.authorUserId) ?? '',
      timestampMs: asNumber(row.timestampMs, 0),
      text: asString(row.text) ?? '',
      note: asString(row.note) ?? null,
      annotationType: asString(row.annotationType) ?? 'GENERAL',
      color: asString(row.color) ?? null,
      createdByUserId: asString(row.createdByUserId) ?? asString(row.authorUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.authorUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
    }));
    if (videoAnnotations.length > 0) {
      await tx.videoAnnotation.createMany({ data: videoAnnotations });
    }

    const communityGroups = asRows(tables.communityGroups).map((row) => ({
      id: row.id,
      clubId: asString(row.clubId) ?? null,
      ownerUserId: asString(row.ownerUserId) ?? '',
      name: asString(row.name) ?? 'Community Group',
      description: asString(row.description) ?? null,
      visibility: asString(row.visibility) ?? 'PRIVATE',
      createdByUserId: asString(row.createdByUserId) ?? asString(row.ownerUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.ownerUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (communityGroups.length > 0) {
      await tx.communityGroup.createMany({ data: communityGroups });
    }

    const communityGroupMemberships = asRows(tables.communityGroupMemberships).map((row) => ({
      id: row.id,
      communityGroupId: row.communityGroupId,
      userId: row.userId,
      role: asString(row.role) ?? 'member',
      active: asBoolean(row.active, true),
      createdByUserId: asString(row.createdByUserId) ?? asString(row.userId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.userId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
    }));
    if (communityGroupMemberships.length > 0) {
      await tx.communityGroupMembership.createMany({ data: communityGroupMemberships });
    }

    const posts = asRows(tables.posts).map((row) => ({
      id: row.id,
      authorUserId: asString(row.authorUserId) ?? '',
      clubId: asString(row.clubId) ?? null,
      communityGroupId: asString(row.communityGroupId) ?? null,
      visibility: asString(row.visibility) ?? 'PRIVATE',
      content: asString(row.content) ?? '',
      attachmentsJson: row.attachmentsJson ?? [],
      commentsCount: asNumber(row.commentsCount, 0),
      reactionsCount: asNumber(row.reactionsCount, 0),
      createdByUserId: asString(row.createdByUserId) ?? asString(row.authorUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.authorUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (posts.length > 0) {
      await tx.post.createMany({ data: posts });
    }

    const postComments = asRows(tables.postComments).map((row) => ({
      id: row.id,
      postId: row.postId,
      authorUserId: asString(row.authorUserId) ?? '',
      parentCommentId: asString(row.parentCommentId) ?? null,
      content: asString(row.content) ?? '',
      isDeleted: asBoolean(row.isDeleted, false),
      deletedAt: toDate(row.deletedAt),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
    if (postComments.length > 0) {
      await tx.postComment.createMany({ data: postComments });
    }

    const postReactions = asRows(tables.postReactions).map((row) => ({
      id: row.id,
      postId: row.postId,
      userId: row.userId,
      reaction: asString(row.reaction) ?? 'LIKE',
      createdAt: toDate(row.createdAt) ?? new Date(),
    }));
    if (postReactions.length > 0) {
      await tx.postReaction.createMany({ data: postReactions });
    }

    const messageThreads = asRows(tables.messageThreads).map((row) => ({
      id: row.id,
      threadType: asString(row.threadType) ?? 'GROUP',
      clubId: asString(row.clubId) ?? null,
      communityGroupId: asString(row.communityGroupId) ?? null,
      groupSessionId: asString(row.groupSessionId) ?? null,
      bookingId: asString(row.bookingId) ?? null,
      title: asString(row.title) ?? null,
      lastMessageAt: toDate(row.lastMessageAt),
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.createdByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
    }));
    if (messageThreads.length > 0) {
      await tx.messageThread.createMany({ data: messageThreads });
    }

    const messageParticipants = asRows(tables.messageParticipants).map((row) => ({
      id: row.id,
      messageThreadId: row.messageThreadId,
      userId: row.userId,
      role: asString(row.role) ?? null,
      lastReadAt: toDate(row.lastReadAt),
      muted: asBoolean(row.muted, false),
      joinedAt: toDate(row.joinedAt) ?? new Date(),
      leftAt: toDate(row.leftAt),
    }));
    if (messageParticipants.length > 0) {
      await tx.messageParticipant.createMany({ data: messageParticipants });
    }

    const messages = asRows(tables.messages).map((row) => ({
      id: row.id,
      messageThreadId: row.messageThreadId,
      senderUserId: asString(row.senderUserId) ?? '',
      content: asString(row.content) ?? '',
      attachmentsJson: row.attachmentsJson ?? [],
      editedAt: toDate(row.editedAt),
      deletedAt: toDate(row.deletedAt),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
    if (messages.length > 0) {
      await tx.message.createMany({ data: messages });
    }

    const messageReceipts = asRows(tables.messageReceipts).map((row) => ({
      id: row.id,
      messageId: row.messageId,
      userId: row.userId,
      deliveredAt: toDate(row.deliveredAt),
      readAt: toDate(row.readAt),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
    if (messageReceipts.length > 0) {
      await tx.messageReceipt.createMany({ data: messageReceipts });
    }

    const notifications = asRows(tables.notifications).map((row) => ({
      id: row.id,
      userId: row.userId,
      type: asString(row.type) ?? 'WELCOME',
      title: asString(row.title) ?? 'Notification',
      body: asString(row.body) ?? null,
      status: asString(row.status) ?? 'UNREAD',
      sourceType: asString(row.sourceType) ?? null,
      sourceId: asString(row.sourceId) ?? null,
      deepLink: asString(row.deepLink) ?? null,
      metadataJson: row.metadataJson ?? null,
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      readAt: toDate(row.readAt),
      dismissedAt: toDate(row.dismissedAt),
    }));
    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    const notificationPreferences = asRows(tables.notificationPreferences).map((row) => ({
      userId: row.userId,
      pushEnabled: asBoolean(row.pushEnabled, true),
      emailEnabled: asBoolean(row.emailEnabled, true),
      smsEnabled: asBoolean(row.smsEnabled, false),
      settingsJson: row.settingsJson ?? null,
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
    if (notificationPreferences.length > 0) {
      await tx.notificationPreference.createMany({ data: notificationPreferences });
    }

    const mutedSources = asRows(tables.mutedSources).map((row) => ({
      id: row.id,
      userId: row.userId,
      sourceType: asString(row.sourceType) ?? 'thread',
      sourceId: asString(row.sourceId) ?? '',
      reason: asString(row.reason) ?? null,
      mutedAt: toDate(row.mutedAt) ?? new Date(),
      unmutedAt: toDate(row.unmutedAt),
    }));
    if (mutedSources.length > 0) {
      await tx.mutedSource.createMany({ data: mutedSources });
    }

    const quietHours = asRows(tables.quietHours).map((row) => ({
      userId: row.userId,
      enabled: asBoolean(row.enabled, false),
      startTimeLocal: asString(row.startTimeLocal) ?? null,
      endTimeLocal: asString(row.endTimeLocal) ?? null,
      timeZone: asString(row.timeZone) ?? null,
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
    if (quietHours.length > 0) {
      await tx.quietHours.createMany({ data: quietHours });
    }

    const senTags = asRows(tables.childSenTags).map((row) => ({
      id: row.id,
      athleteId: row.athleteId,
      tag: asString(row.tag) ?? 'support',
      priority: asNumber(row.priority, 0),
      isCritical: asBoolean(row.isCritical, false),
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (senTags.length > 0) {
      await tx.childSenTag.createMany({ data: senTags });
    }

    const emergencyContacts = asRows(tables.childEmergencyContacts).map((row) => ({
      id: normalizeEmergencyContactId(row.id),
      athleteId: row.athleteId,
      name: asString(row.name) ?? '',
      relationshipLabel: asString(row.relationshipLabel) ?? '',
      phoneE164: asString(row.phoneE164) ?? '',
      email: asString(row.email) ?? null,
      isPrimary: asBoolean(row.isPrimary, false),
      canPickup: asBoolean(row.canPickup, false),
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (emergencyContacts.length > 0) {
      await tx.childEmergencyContact.createMany({ data: emergencyContacts });
    }

    const medicalRecords = asRows(tables.childMedicalRecords).map((row) => ({
      id: row.id,
      athleteId: row.athleteId,
      conditions: asArray(row.conditions).map((value) => String(value)),
      allergies: asArray(row.allergies).map((value) => String(value)),
      medications: asArray(row.medications).map((value) => String(value)),
      restrictions: asArray(row.restrictions).map((value) => String(value)),
      notesEncrypted: asString(row.notesEncrypted) ?? null,
      doctorName: asString(row.doctorName) ?? null,
      doctorPhoneE164: asString(row.doctorPhoneE164) ?? null,
      insuranceProvider: asString(row.insuranceProvider) ?? null,
      insuranceNumber: asString(row.insuranceNumber) ?? null,
      emergencyNotes: asString(row.emergencyNotes) ?? null,
      senNotes: asString(row.senNotes) ?? null,
      effectiveFrom: toDate(row.effectiveFrom) ?? new Date(),
      effectiveTo: toDate(row.effectiveTo),
      isCurrent: asBoolean(row.isCurrent, true),
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
    if (medicalRecords.length > 0) {
      await tx.childMedicalRecord.createMany({ data: medicalRecords });
    }

    const consents = asRows(tables.childConsents).map((row) => ({
      id: row.id,
      athleteId: row.athleteId,
      consentType: row.consentType,
      granted: asBoolean(row.granted, false),
      grantedByUserId: asString(row.grantedByUserId) ?? '',
      grantedAt: toDate(row.grantedAt),
      expiresAt: toDate(row.expiresAt),
      revokedAt: toDate(row.revokedAt),
      supersededById: asString(row.supersededById) ?? null,
      metadataJson: row.metadataJson ?? null,
      createdAt: toDate(row.createdAt) ?? new Date(),
    }));
    if (consents.length > 0) {
      await tx.childConsent.createMany({ data: consents });
    }

    const groupSessions = asRows(tables.groupSessions).map((row) => ({
      id: row.id,
      coachUserId: row.coachUserId,
      clubId: asString(row.clubId) ?? null,
      squadId: asString(row.squadId) ?? null,
      recurringSeriesId: asString(row.recurringSeriesId) ?? null,
      title: asString(row.title) ?? 'Group session',
      description: asString(row.description) ?? null,
      sessionType: asString(row.sessionType) ?? 'group_training',
      maxParticipants: asNumber(row.maxParticipants, 0),
      currentParticipants: asNumber(row.currentParticipants, 0),
      waitlistEnabled: asBoolean(row.waitlistEnabled, true),
      waitlistCount: asNumber(row.waitlistCount, 0),
      pricePerParticipantMinor:
        typeof row.pricePerParticipantMinor === 'number' ? row.pricePerParticipantMinor : null,
      currency: asString(row.currency) ?? 'GBP',
      ageMin: typeof row.ageMin === 'number' ? row.ageMin : null,
      ageMax: typeof row.ageMax === 'number' ? row.ageMax : null,
      skillLevel: asString(row.skillLevel) ?? null,
      location: asString(row.location) ?? null,
      isVirtual: asBoolean(row.isVirtual, false),
      status: asString(row.status) ?? 'DRAFT',
      registrationDeadlineAt: toDate(row.registrationDeadlineAt),
      inviteType: asString(row.inviteType) ?? null,
      scheduleJson: row.scheduleJson ?? [],
      focusJson: row.focusJson ?? [],
      equipmentJson: row.equipmentJson ?? [],
      createdByUserId: asString(row.createdByUserId) ?? asString(row.coachUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.coachUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (groupSessions.length > 0) {
      await tx.groupSession.createMany({ data: groupSessions });
    }

    const groupSessionRegistrations = asRows(tables.groupSessionRegistrations).map((row) => ({
      id: row.id,
      groupSessionId: row.groupSessionId,
      athleteId: row.athleteId,
      parentUserId: asString(row.parentUserId) ?? null,
      status: asString(row.status) ?? 'REGISTERED',
      paidAt: toDate(row.paidAt),
      notes: asString(row.notes) ?? null,
      createdByUserId: asString(row.createdByUserId) ?? asString(row.parentUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? asString(row.parentUserId) ?? '',
      version: toBigInt(row.version, 1),
      registeredAt: toDate(row.registeredAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (groupSessionRegistrations.length > 0) {
      await tx.groupSessionRegistration.createMany({ data: groupSessionRegistrations });
    }

    const waitlistEntries = asRows(tables.waitlistEntries).map((row) => ({
      id: row.id,
      groupSessionId: row.groupSessionId,
      athleteId: asString(row.athleteId) ?? null,
      userId: asString(row.userId) ?? null,
      coachUserId: asString(row.coachUserId) ?? null,
      position: asNumber(row.position, 1),
      autoBook: asBoolean(row.autoBook, false),
      status: asString(row.status) ?? 'WAITING',
      notes: asString(row.notes) ?? null,
      notifiedAt: toDate(row.notifiedAt),
      expiresAt: toDate(row.expiresAt),
      bookingId: asString(row.bookingId) ?? null,
      userResponse: asString(row.userResponse) ?? null,
      userRespondedAt: toDate(row.userRespondedAt),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
    }));
    if (waitlistEntries.length > 0) {
      await tx.waitlistEntry.createMany({ data: waitlistEntries });
    }

    const invites = asRows(tables.invites).map((row) => ({
      id: row.id,
      inviteType: asString(row.inviteType) ?? 'session_invite',
      senderUserId: asString(row.senderUserId) ?? '',
      clubId: asString(row.clubId) ?? null,
      groupSessionId: asString(row.groupSessionId) ?? null,
      bookingId: asString(row.bookingId) ?? null,
      eventId: asString(row.eventId) ?? null,
      status: asString(row.status) ?? 'PENDING',
      message: asString(row.message) ?? null,
      expiresAt: toDate(row.expiresAt),
      metadataJson: row.metadataJson ?? null,
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      revokedAt: toDate(row.revokedAt),
    }));
    if (invites.length > 0) {
      await tx.invite.createMany({ data: invites });
    }

    const inviteTargets = asRows(tables.inviteTargets).map((row) => ({
      id: row.id,
      inviteId: row.inviteId,
      targetUserId: asString(row.targetUserId) ?? null,
      targetAthleteId: asString(row.targetAthleteId) ?? null,
      targetFamilyId: asString(row.targetFamilyId) ?? null,
      status: asString(row.status) ?? 'PENDING',
      respondedAt: toDate(row.respondedAt),
      responsePayloadJson: row.responsePayloadJson ?? null,
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
    if (inviteTargets.length > 0) {
      await tx.inviteTarget.createMany({ data: inviteTargets });
    }

    const attendanceRecords = asRows(tables.attendanceRecords).map((row) => ({
      id: row.id,
      bookingId: asString(row.bookingId) ?? null,
      groupSessionId: asString(row.groupSessionId) ?? null,
      athleteId: row.athleteId,
      status: asString(row.status) ?? 'ATTENDED',
      notes: asString(row.notes) ?? null,
      effortRating: typeof row.effortRating === 'number' ? row.effortRating : null,
      focusAreasJson: row.focusAreasJson ?? null,
      recordedByUserId: asString(row.recordedByUserId) ?? '',
      recordedAt: toDate(row.recordedAt) ?? new Date(),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
    }));
    if (attendanceRecords.length > 0) {
      await tx.attendanceRecord.createMany({ data: attendanceRecords });
    }

    const bookings = asRows(tables.bookings).map((row) => ({
      id: row.id,
      coachUserId: row.coachUserId,
      bookedByUserId: asString(row.bookedByUserId) ?? null,
      clubId: asString(row.clubId) ?? null,
      coachingOfferingId: asString(row.coachingOfferingId) ?? null,
      status: row.status,
      scheduledAt: toDate(row.scheduledAt) ?? new Date(),
      durationMinutes: asNumber(row.durationMinutes, 60),
      location: asString(row.location) ?? 'TBD',
      serviceType: asString(row.serviceType) ?? null,
      notes: asString(row.notes) ?? null,
      objectivesJson: row.objectivesJson ?? null,
      priceMinor: typeof row.priceMinor === 'number' ? row.priceMinor : null,
      currency: asString(row.currency) ?? 'GBP',
      confirmationMode: asString(row.confirmationMode) ?? null,
      confirmedAt: toDate(row.confirmedAt),
      cancelledByUserId: asString(row.cancelledByUserId) ?? null,
      cancelledAt: toDate(row.cancelledAt),
      cancelReason: asString(row.cancelReason) ?? null,
      cancellationFeeMinor:
        typeof row.cancellationFeeMinor === 'number' ? row.cancellationFeeMinor : null,
      groupSessionId: asString(row.groupSessionId) ?? null,
      recurringSeriesId: asString(row.recurringSeriesId) ?? null,
      seriesIndex: typeof row.seriesIndex === 'number' ? row.seriesIndex : null,
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (bookings.length > 0) {
      await tx.booking.createMany({ data: bookings });
    }

    const bookingParticipants = asRows(tables.bookingParticipants).map((row) => ({
      id: row.id,
      bookingId: row.bookingId,
      athleteId: row.athleteId,
      guardianUserId: asString(row.guardianUserId) ?? null,
      status: asString(row.status) ?? 'confirmed',
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
    }));
    if (bookingParticipants.length > 0) {
      await tx.bookingParticipant.createMany({ data: bookingParticipants });
    }

    const bookingObjectives = asRows(tables.bookingObjectives).map((row) => ({
      id: row.id,
      bookingId: row.bookingId,
      objective: asString(row.objective) ?? '',
      sortOrder: asNumber(row.sortOrder, 0),
      createdAt: toDate(row.createdAt) ?? new Date(),
    }));
    if (bookingObjectives.length > 0) {
      await tx.bookingObjective.createMany({ data: bookingObjectives });
    }

    const bookingStatusEvents = asRows(tables.bookingStatusEvents).map((row) => ({
      id: row.id,
      bookingId: row.bookingId,
      fromStatus: asString(row.fromStatus) ?? null,
      toStatus: row.toStatus,
      actorUserId: asString(row.actorUserId) ?? null,
      reason: asString(row.reason) ?? null,
      metadataJson: row.metadataJson ?? null,
      requestId: asString(row.requestId) ?? null,
      occurredAt: toDate(row.occurredAt) ?? new Date(),
    }));
    if (bookingStatusEvents.length > 0) {
      await tx.bookingStatusEvent.createMany({ data: bookingStatusEvents });
    }
  });

  const summary = {
    version: dataset.version,
    users: asRows(tables.users).length,
    clubs: asRows(tables.clubs).length,
    families: asRows(tables.families).length,
    athletes: asRows(tables.athletes).length,
    bookings: asRows(tables.bookings).length,
  };

  console.log('[p0-seed-import] import=ok');
  console.log(`[p0-seed-import] version=${summary.version}`);
  console.log(
    `[p0-seed-import] users=${summary.users} clubs=${summary.clubs} families=${summary.families} athletes=${summary.athletes} bookings=${summary.bookings}`,
  );
}

main()
  .catch((error) => {
    console.error('[p0-seed-import] import=failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
