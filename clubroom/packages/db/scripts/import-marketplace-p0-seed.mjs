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
    await tx.passwordCredential.deleteMany();
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
      return ({
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
        : (Array.isArray(row.disabilities) ? row.disabilities : []),
      specialNeedsJson: Array.isArray(row.specialNeedsJson)
        ? row.specialNeedsJson
        : (Array.isArray(row.specialNeeds) ? row.specialNeeds : []),
      status: asString(row.status) ?? 'active',
      createdByUserId: asString(row.createdByUserId) ?? '',
      updatedByUserId: asString(row.updatedByUserId) ?? '',
      version: toBigInt(row.version, 1),
      createdAt: toDate(row.createdAt) ?? new Date(),
      updatedAt: toDate(row.updatedAt) ?? new Date(),
      deletedAt: toDate(row.deletedAt),
      deletedByUserId: asString(row.deletedByUserId) ?? null,
      });
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
      id: row.id,
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
      cancellationFeeMinor: typeof row.cancellationFeeMinor === 'number' ? row.cancellationFeeMinor : null,
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
    families: asRows(tables.families).length,
    athletes: asRows(tables.athletes).length,
    bookings: asRows(tables.bookings).length,
  };

  console.log('[p0-seed-import] import=ok');
  console.log(`[p0-seed-import] version=${summary.version}`);
  console.log(
    `[p0-seed-import] users=${summary.users} families=${summary.families} athletes=${summary.athletes} bookings=${summary.bookings}`,
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
