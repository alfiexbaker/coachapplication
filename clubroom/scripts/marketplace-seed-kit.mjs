#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT_DIR = path.join(ROOT, 'docs', 'backend-api', 'test-data', 'marketplace');
const DATASET_PATH = 'linked-dataset.json';
const MANIFEST_PATH = 'manifest.json';
const SUMMARY_PATH = 'summary.json';
const CSV_DIR_NAME = 'csv';
const DATASET_VERSION = '2026-03-03-marketplace-v2-edge-coverage';
const BASE_TIME = new Date('2026-03-03T09:00:00Z');

const PRIMARY_KEY_BY_TABLE = {
  userProfiles: 'userId',
  coachProfiles: 'userId',
  schedulingRules: 'coachUserId',
  notificationPreferences: 'userId',
  quietHours: 'userId',
};

const FK_FIELD_TO_TABLE = {
  userId: 'users',
  ownerUserId: 'users',
  createdByUserId: 'users',
  updatedByUserId: 'users',
  deletedByUserId: 'users',
  guardianUserId: 'users',
  grantedByUserId: 'users',
  grantorUserId: 'users',
  granteeUserId: 'users',
  actorUserId: 'users',
  assessorUserId: 'users',
  reportedByUserId: 'users',
  assignedToUserId: 'users',
  requesterUserId: 'users',
  senderUserId: 'users',
  authorUserId: 'users',
  sentByUserId: 'users',
  recipientUserId: 'users',
  payerUserId: 'users',
  bookedByUserId: 'users',
  coachUserId: 'users',
  coachUserIdRef: 'users',
  primaryGuardianUserId: 'users',
  ownerCoachUserId: 'users',
  creatorUserId: 'users',
  recordedByUserId: 'users',
  reviewedByUserId: 'users',
  cancelledByUserId: 'users',
  responseByUserId: 'users',
  revokedByUserId: 'users',
  placedByUserId: 'users',
  releasedByUserId: 'users',
  subjectUserId: 'users',
  requesterUserIdRef: 'users',
  sentByUserIdRef: 'users',
  athleteId: 'athletes',
  targetAthleteId: 'athletes',
  familyId: 'families',
  targetFamilyId: 'families',
  clubId: 'clubs',
  squadId: 'squads',
  bookingId: 'bookings',
  groupSessionId: 'groupSessions',
  recurringSeriesId: 'recurringSeries',
  coachingOfferingId: 'coachingOfferings',
  coachVerificationId: 'coachVerifications',
  mediaObjectId: 'mediaObjects',
  videoId: 'videos',
  skillDefinitionId: 'skillDefinitions',
  badgeDefinitionId: 'badgeDefinitions',
  goalId: 'goals',
  drillId: 'drills',
  drillAssignmentId: 'drillAssignments',
  invoiceId: 'invoices',
  messageThreadId: 'messageThreads',
  messageId: 'messages',
  postId: 'posts',
  parentCommentId: 'postComments',
  communityGroupId: 'communityGroups',
  accessGrantId: 'accessGrants',
  safeguardingIncidentId: 'safeguardingIncidents',
  retentionPolicyId: 'retentionPolicies',
  inviteId: 'invites',
  eventId: 'clubEvents',
  clubEventId: 'clubEvents',
  featureFlagId: 'featureFlags',
};

const TABLE_ORDER = [
  'users',
  'userProfiles',
  'userRoleMemberships',
  'userDevices',
  'authSessions',
  'idempotencyKeys',
  'families',
  'familyMemberships',
  'athletes',
  'guardianChildLinks',
  'childEmergencyContacts',
  'childMedicalRecords',
  'childSenTags',
  'childConsents',
  'coachProfiles',
  'coachLocations',
  'coachingOfferings',
  'availabilityTemplates',
  'availabilityOverrides',
  'schedulingRules',
  'cancellationPolicyRules',
  'clubs',
  'clubMemberships',
  'squads',
  'squadMemberships',
  'mediaObjects',
  'coachVerifications',
  'verificationDocuments',
  'bookings',
  'bookingParticipants',
  'bookingObjectives',
  'bookingStatusEvents',
  'bookingChangeRequests',
  'recurringSeries',
  'groupSessions',
  'groupSessionRegistrations',
  'waitlistEntries',
  'invites',
  'inviteTargets',
  'clubEvents',
  'eventRsvps',
  'attendanceRecords',
  'invoices',
  'invoiceLineItems',
  'invoiceEvents',
  'reconcilerEntries',
  'paymentInstructionTemplates',
  'paymentReminders',
  'sessionNotes',
  'sessionFeedback',
  'goals',
  'goalMilestones',
  'skillDefinitions',
  'athleteSkillAssessments',
  'badgeDefinitions',
  'athleteBadges',
  'drills',
  'drillAssignments',
  'assignmentSubmissions',
  'uploadSessions',
  'malwareScanResults',
  'videos',
  'videoAnnotations',
  'communityGroups',
  'communityGroupMemberships',
  'posts',
  'postComments',
  'postReactions',
  'messageThreads',
  'messageParticipants',
  'messages',
  'messageReceipts',
  'notifications',
  'notificationPreferences',
  'mutedSources',
  'quietHours',
  'accessGrants',
  'accessGrantScopes',
  'safeguardingIncidents',
  'safeguardingIncidentActions',
  'auditEvents',
  'securityEvents',
  'retentionPolicies',
  'retentionRuns',
  'legalHolds',
  'dataDeletionRequests',
  'featureFlags',
  'featureFlagOverrides',
  'outboxEvents',
];

function parseBooleanish(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function isSeedingEnabled() {
  const firstDefined = [
    process.env.API_MARKETPLACE_SEED_ENABLED,
    process.env.CLUBROOM_MARKETPLACE_DATA_ENABLED,
  ].find((value) => value !== undefined);
  return parseBooleanish(firstDefined, true);
}

function tableToCsvFileName(table) {
  return `${table.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)}.csv`;
}

function toIso({
  days = 0,
  hours = 0,
  minutes = 0,
}) {
  const date = new Date(BASE_TIME.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(date.getUTCHours() + hours, date.getUTCMinutes() + minutes, 0, 0);
  return date.toISOString();
}

function toLocalTime(hour, minute = 0) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function deterministicId(prefix, seed) {
  const digest = crypto.createHash('sha256').update(`${prefix}:${seed}`).digest('hex');
  const part1 = digest.slice(0, 8);
  const part2 = digest.slice(8, 12);
  const part3 = `7${digest.slice(13, 16)}`;
  const variant = ['8', '9', 'a', 'b'][parseInt(digest.slice(16, 17), 16) % 4];
  const part4 = `${variant}${digest.slice(17, 20)}`;
  const part5 = digest.slice(20, 32);
  return `${prefix}_${part1}-${part2}-${part3}-${part4}-${part5}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function push(tables, table, row) {
  if (!tables[table]) {
    tables[table] = [];
  }
  tables[table].push(row);
}

function userIdFromSlug(slug) {
  return deterministicId('usr', slug);
}

function athleteIdFromSlug(slug) {
  return deterministicId('ath', slug);
}

function familyIdFromSlug(slug) {
  return deterministicId('fam', slug);
}

function coachUserIdFromSlug(slug) {
  return userIdFromSlug(slug);
}

function clubIdFromSlug(slug) {
  return deterministicId('clb', slug);
}

function squadIdFromSlug(slug) {
  return deterministicId('sqd', slug);
}

function offeringIdFromSeed(seed) {
  return deterministicId('off', seed);
}

function bookingIdFromSeed(seed) {
  return deterministicId('bok', seed);
}

function groupSessionIdFromSeed(seed) {
  return deterministicId('gse', seed);
}

function invoiceIdFromSeed(seed) {
  return deterministicId('invc', seed);
}

function mediaIdFromSeed(seed) {
  return deterministicId('med', seed);
}

function buildLinkedDataset() {
  const tables = Object.fromEntries(TABLE_ORDER.map((table) => [table, []]));

  const coachBlueprints = [
    {
      slug: 'coach-amelia',
      name: 'Amelia Shaw',
      email: 'amelia.shaw@clubroom.demo',
      yearsExperience: 9,
      rateMinor: 4500,
      specialties: ['Finishing', 'Decision Making'],
      qualifications: ['UEFA C', 'FA Safeguarding'],
    },
    {
      slug: 'coach-liam',
      name: 'Liam Turner',
      email: 'liam.turner@clubroom.demo',
      yearsExperience: 11,
      rateMinor: 5000,
      specialties: ['Ball Mastery', 'Positioning'],
      qualifications: ['UEFA B', 'Emergency First Aid'],
    },
    {
      slug: 'coach-sophia',
      name: 'Sophia Reed',
      email: 'sophia.reed@clubroom.demo',
      yearsExperience: 7,
      rateMinor: 4300,
      specialties: ['Goalkeeping', 'Confidence'],
      qualifications: ['UEFA C', 'DBS Checked'],
    },
    {
      slug: 'coach-noah',
      name: 'Noah Patel',
      email: 'noah.patel@clubroom.demo',
      yearsExperience: 6,
      rateMinor: 4000,
      specialties: ['Defending', 'Transition Play'],
      qualifications: ['UEFA C'],
    },
    {
      slug: 'coach-chloe',
      name: 'Chloe Morgan',
      email: 'chloe.morgan@clubroom.demo',
      yearsExperience: 8,
      rateMinor: 4400,
      specialties: ['Speed', 'Attacking Movement'],
      qualifications: ['UEFA B'],
    },
    {
      slug: 'coach-maya',
      name: 'Maya Collins',
      email: 'maya.collins@clubroom.demo',
      yearsExperience: 10,
      rateMinor: 4700,
      specialties: ['First Touch', 'Composure'],
      qualifications: ['UEFA A', 'FA Safeguarding'],
    },
    {
      slug: 'coach-elliot',
      name: 'Elliot Hayes',
      email: 'elliot.hayes@clubroom.demo',
      yearsExperience: 12,
      rateMinor: 5200,
      specialties: ['Transition Defense', 'Decision Speed'],
      qualifications: ['UEFA B', 'Emergency First Aid'],
    },
    {
      slug: 'coach-harriet',
      name: 'Harriet Lowe',
      email: 'harriet.lowe@clubroom.demo',
      yearsExperience: 7,
      rateMinor: 4600,
      specialties: ['Youth Development', 'Technical Foundation'],
      qualifications: ['UEFA C', 'DBS Checked'],
    },
  ];

  const parentBlueprints = [
    { slug: 'parent-olivia', name: 'Olivia Barton', email: 'olivia.barton@clubroom.demo' },
    { slug: 'parent-james', name: 'James Barton', email: 'james.barton@clubroom.demo' },
    { slug: 'parent-priya', name: 'Priya Kapoor', email: 'priya.kapoor@clubroom.demo' },
    { slug: 'parent-daniel', name: 'Daniel Reed', email: 'daniel.reed@clubroom.demo' },
    { slug: 'parent-lucy', name: 'Lucy Reed', email: 'lucy.reed@clubroom.demo' },
    { slug: 'parent-marcus', name: 'Marcus Diaz', email: 'marcus.diaz@clubroom.demo' },
  ];

  const athleteAccountBlueprints = [
    { slug: 'athlete-alex', name: 'Alex Barton', email: 'alex.barton@clubroom.demo' },
    { slug: 'athlete-mia', name: 'Mia Kapoor', email: 'mia.kapoor@clubroom.demo' },
    { slug: 'athlete-ethan', name: 'Ethan Reed', email: 'ethan.reed@clubroom.demo' },
    { slug: 'athlete-zara', name: 'Zara Diaz', email: 'zara.diaz@clubroom.demo' },
  ];

  const adminBlueprints = [
    { slug: 'admin-clara', name: 'Clara Finch', email: 'clara.finch@clubroom.demo' },
    { slug: 'admin-henry', name: 'Henry Cole', email: 'henry.cole@clubroom.demo' },
  ];

  const supportBlueprints = [
    { slug: 'support-jules', name: 'Jules Harper', email: 'jules.harper@clubroom.demo' },
    { slug: 'security-lead', name: 'Ivy Grant', email: 'ivy.grant@clubroom.demo' },
  ];

  const edgeUserBlueprints = [
    {
      slug: 'user-no-kids',
      name: 'Mason Clarke',
      email: 'mason.clarke@clubroom.demo',
      roles: ['member'],
    },
    {
      slug: 'user-club-linked',
      name: 'Leah Ford',
      email: 'leah.ford@clubroom.demo',
      roles: ['member'],
    },
    {
      slug: 'parent-no-kids',
      name: 'Ava Cole',
      email: 'ava.cole@clubroom.demo',
      roles: ['parent'],
    },
    {
      slug: 'child-user1-a',
      name: 'Freya Barton',
      email: 'freya.barton@clubroom.demo',
      roles: ['athlete'],
    },
    {
      slug: 'child-user1-b',
      name: 'Luca Barton',
      email: 'luca.barton@clubroom.demo',
      roles: ['athlete'],
    },
  ];

  const allUsers = [
    ...coachBlueprints.map((item) => ({ ...item, roles: ['coach'] })),
    ...parentBlueprints.map((item) => ({ ...item, roles: ['parent'] })),
    ...athleteAccountBlueprints.map((item) => ({ ...item, roles: ['athlete'] })),
    ...adminBlueprints.map((item) => ({ ...item, roles: ['club_admin'] })),
    ...supportBlueprints.map((item) => ({
      ...item,
      roles: item.slug === 'security-lead' ? ['security_admin'] : ['support'],
    })),
    ...edgeUserBlueprints,
  ];

  for (const [index, user] of allUsers.entries()) {
    const id = userIdFromSlug(user.slug);
    const createdAt = toIso({ days: -120 + index, hours: index % 6 });
    const updatedAt = toIso({ days: -1, hours: index % 4 });

    push(tables, 'users', {
      id,
      authProvider: 'auth0',
      authProviderSubject: `auth0|${user.slug}`,
      email: user.email,
      name: user.name,
      avatarUrl: `https://cdn.clubroom.demo/avatar/${user.slug}.jpg`,
      locale: 'en-GB',
      timeZone: 'Europe/London',
      accountStatus: 'active',
      tokenEpoch: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
    });

    push(tables, 'userProfiles', {
      userId: id,
      bio: `${user.name} profile for linked API seed data.`,
      postcode: 'SW1A 1AA',
      dateOfBirth: toIso({ days: -9000 + index * 20 }),
      phoneE164: `+44770090${String(100 + index).padStart(3, '0')}`,
      createdAt,
      updatedAt,
    });

    for (const role of user.roles) {
      push(tables, 'userRoleMemberships', {
        id: deterministicId('uro', `${user.slug}-${role}`),
        userId: id,
        role,
        source: 'seed',
        clubId: null,
        active: true,
        createdAt,
        updatedAt,
        revokedAt: null,
      });
    }

    push(tables, 'userDevices', {
      id: deterministicId('udv', user.slug),
      userId: id,
      platform: 'ios',
      deviceLabel: `${user.name} iPhone`,
      pushToken: `expo-push-${user.slug}`,
      lastSeenAt: toIso({ days: -1, hours: index % 8 }),
      revokedAt: null,
      createdAt,
      updatedAt,
    });

    push(tables, 'authSessions', {
      id: deterministicId('ses', user.slug),
      userId: id,
      userDeviceId: deterministicId('udv', user.slug),
      jwtId: deterministicId('jwt', user.slug),
      refreshTokenId: deterministicId('rfr', user.slug),
      issuedAt: toIso({ days: -4, hours: index % 6 }),
      expiresAt: toIso({ days: 10, hours: index % 6 }),
      lastSeenAt: toIso({ days: -1, hours: index % 8 }),
      ipHash: deterministicId('iph', `${user.slug}-ip`),
      userAgent: 'ClubroomMobile/1.0',
      revokedAt: null,
      revokeReason: null,
      createdAt,
      updatedAt,
    });

    push(tables, 'notificationPreferences', {
      userId: id,
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      settingsJson: {
        bookingReminders: true,
        progressWeekly: true,
        marketing: false,
      },
      createdAt,
      updatedAt,
    });

    if (user.roles.includes('parent')) {
      push(tables, 'quietHours', {
        userId: id,
        enabled: true,
        startTimeLocal: '21:30',
        endTimeLocal: '07:00',
        timeZone: 'Europe/London',
        createdAt,
        updatedAt,
      });
    }
  }

  const families = [
    {
      slug: 'barton-family',
      name: 'Barton Family',
      primaryGuardianSlug: 'parent-olivia',
      memberSlugs: ['parent-olivia', 'parent-james'],
    },
    {
      slug: 'kapoor-family',
      name: 'Kapoor Family',
      primaryGuardianSlug: 'parent-priya',
      memberSlugs: ['parent-priya'],
    },
    {
      slug: 'reed-family',
      name: 'Reed Family',
      primaryGuardianSlug: 'parent-daniel',
      memberSlugs: ['parent-daniel', 'parent-lucy'],
    },
    {
      slug: 'diaz-family',
      name: 'Diaz Family',
      primaryGuardianSlug: 'parent-marcus',
      memberSlugs: ['parent-marcus'],
    },
    {
      slug: 'ford-family',
      name: 'Ford Family',
      primaryGuardianSlug: 'user-club-linked',
      memberSlugs: ['user-club-linked'],
    },
  ];

  const athletes = [
    {
      slug: 'alfie-barton',
      displayName: 'Alfie Barton',
      dateOfBirth: '2014-02-18T00:00:00.000Z',
      familySlug: 'barton-family',
      guardianSlugs: ['parent-olivia', 'parent-james'],
      linkedUserSlug: 'athlete-alex',
      primaryCoachSlug: 'coach-amelia',
      squadSlug: 'riverside-u11',
      notes: 'Explosive attacker, works on finishing consistency.',
    },
    {
      slug: 'maisie-barton',
      displayName: 'Maisie Barton',
      dateOfBirth: '2015-07-22T00:00:00.000Z',
      familySlug: 'barton-family',
      guardianSlugs: ['parent-olivia'],
      linkedUserSlug: null,
      primaryCoachSlug: 'coach-amelia',
      squadSlug: 'riverside-u11',
      notes: 'Wide player improving weak-foot confidence.',
    },
    {
      slug: 'arjun-kapoor',
      displayName: 'Arjun Kapoor',
      dateOfBirth: '2013-11-09T00:00:00.000Z',
      familySlug: 'kapoor-family',
      guardianSlugs: ['parent-priya'],
      linkedUserSlug: 'athlete-mia',
      primaryCoachSlug: 'coach-liam',
      squadSlug: 'riverside-u14',
      notes: 'Strong technical base and positional awareness.',
    },
    {
      slug: 'nisha-kapoor',
      displayName: 'Nisha Kapoor',
      dateOfBirth: '2016-05-01T00:00:00.000Z',
      familySlug: 'kapoor-family',
      guardianSlugs: ['parent-priya'],
      linkedUserSlug: null,
      primaryCoachSlug: 'coach-liam',
      squadSlug: 'riverside-u14',
      notes: 'Beginner stage, focusing on coordination and confidence.',
    },
    {
      slug: 'leo-reed',
      displayName: 'Leo Reed',
      dateOfBirth: '2012-08-12T00:00:00.000Z',
      familySlug: 'reed-family',
      guardianSlugs: ['parent-daniel', 'parent-lucy'],
      linkedUserSlug: 'athlete-ethan',
      primaryCoachSlug: 'coach-noah',
      squadSlug: 'northbridge-u12',
      notes: 'Defensive midfielder working on scanning and passing speed.',
    },
    {
      slug: 'isla-reed',
      displayName: 'Isla Reed',
      dateOfBirth: '2014-10-17T00:00:00.000Z',
      familySlug: 'reed-family',
      guardianSlugs: ['parent-lucy'],
      linkedUserSlug: null,
      primaryCoachSlug: 'coach-noah',
      squadSlug: 'northbridge-u12',
      notes: 'Improving first touch under pressure.',
    },
    {
      slug: 'camila-diaz',
      displayName: 'Camila Diaz',
      dateOfBirth: '2013-03-03T00:00:00.000Z',
      familySlug: 'diaz-family',
      guardianSlugs: ['parent-marcus'],
      linkedUserSlug: null,
      primaryCoachSlug: 'coach-chloe',
      squadSlug: 'northbridge-u15',
      notes: 'Fast winger, developing movement timing.',
    },
    {
      slug: 'zara-diaz',
      displayName: 'Zara Diaz',
      dateOfBirth: '2011-12-14T00:00:00.000Z',
      familySlug: 'diaz-family',
      guardianSlugs: ['parent-marcus'],
      linkedUserSlug: 'athlete-zara',
      primaryCoachSlug: 'coach-sophia',
      squadSlug: 'northbridge-u15',
      notes: 'Goalkeeper focusing on handling and distribution.',
    },
    {
      slug: 'kid-f-barton',
      displayName: 'Freya Barton',
      dateOfBirth: '2013-04-06T00:00:00.000Z',
      familySlug: 'ford-family',
      guardianSlugs: ['user-club-linked'],
      linkedUserSlug: 'child-user1-a',
      primaryCoachSlug: 'coach-maya',
      squadSlug: 'riverside-u11',
      notes: 'Early stage player focused on control and confidence.',
    },
    {
      slug: 'kid-l-barton',
      displayName: 'Luca Barton',
      dateOfBirth: '2012-10-23T00:00:00.000Z',
      familySlug: 'ford-family',
      guardianSlugs: ['user-club-linked'],
      linkedUserSlug: 'child-user1-b',
      primaryCoachSlug: 'coach-harriet',
      squadSlug: 'northbridge-u12',
      notes: 'Developing recovery runs and defensive shape.',
    },
  ];

  for (const [index, family] of families.entries()) {
    const id = familyIdFromSlug(family.slug);
    const primaryGuardianUserId = userIdFromSlug(family.primaryGuardianSlug);
    const createdAt = toIso({ days: -100 + index * 3 });
    const updatedAt = toIso({ days: -2 + index });

    push(tables, 'families', {
      id,
      name: family.name,
      primaryGuardianUserId,
      createdByUserId: primaryGuardianUserId,
      updatedByUserId: primaryGuardianUserId,
      version: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      deletedByUserId: null,
    });

    for (const [memberIndex, memberSlug] of family.memberSlugs.entries()) {
      const memberUserId = userIdFromSlug(memberSlug);
      push(tables, 'familyMemberships', {
        id: deterministicId('fmb', `${family.slug}-${memberSlug}`),
        familyId: id,
        userId: memberUserId,
        role: memberIndex === 0 ? 'owner' : 'guardian',
        permissions: memberIndex === 0 ? ['book', 'medical', 'payments', 'messages'] : ['book', 'messages'],
        relationshipLabel: memberIndex === 0 ? 'Primary guardian' : 'Guardian',
        childAccessAthleteIds: [],
        createdByUserId: primaryGuardianUserId,
        updatedByUserId: primaryGuardianUserId,
        version: 1,
        createdAt,
        updatedAt,
        deletedAt: null,
        deletedByUserId: null,
      });
    }
  }

  for (const [index, athlete] of athletes.entries()) {
    const id = athleteIdFromSlug(athlete.slug);
    const linkedUserId = athlete.linkedUserSlug ? userIdFromSlug(athlete.linkedUserSlug) : null;
    const familyId = familyIdFromSlug(athlete.familySlug);
    const creatorUserId = userIdFromSlug(athlete.guardianSlugs[0]);
    const createdAt = toIso({ days: -90 + index * 2, hours: 1 });
    const updatedAt = toIso({ days: -2 + Math.floor(index / 2), hours: 2 });

    push(tables, 'athletes', {
      id,
      userId: linkedUserId,
      displayName: athlete.displayName,
      dateOfBirth: athlete.dateOfBirth,
      avatarUrl: `https://cdn.clubroom.demo/athletes/${athlete.slug}.jpg`,
      status: 'active',
      createdByUserId: creatorUserId,
      updatedByUserId: creatorUserId,
      version: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      deletedByUserId: null,
    });

    for (const [guardianIndex, guardianSlug] of athlete.guardianSlugs.entries()) {
      const guardianUserId = userIdFromSlug(guardianSlug);
      push(tables, 'guardianChildLinks', {
        id: deterministicId('gcl', `${guardianSlug}-${athlete.slug}`),
        familyId,
        guardianUserId,
        athleteId: id,
        relationshipType: guardianIndex === 0 ? 'parent' : 'guardian',
        isPrimary: guardianIndex === 0,
        createdByUserId: creatorUserId,
        updatedByUserId: creatorUserId,
        version: 1,
        createdAt,
        updatedAt,
        deletedAt: null,
        deletedByUserId: null,
      });
    }

    push(tables, 'childEmergencyContacts', {
      id: deterministicId('cec', athlete.slug),
      athleteId: id,
      name: `Emergency ${athlete.displayName.split(' ')[0]}`,
      relationshipLabel: 'Family Contact',
      phoneE164: `+44770091${String(200 + index).padStart(3, '0')}`,
      email: `emergency.${athlete.slug.replace('-', '.')}@clubroom.demo`,
      isPrimary: true,
      canPickup: true,
      createdByUserId: creatorUserId,
      updatedByUserId: creatorUserId,
      version: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'childMedicalRecords', {
      id: deterministicId('cmr', athlete.slug),
      athleteId: id,
      conditions: index % 3 === 0 ? ['asthma'] : [],
      allergies: index % 2 === 0 ? ['nuts'] : [],
      medications: index % 3 === 0 ? ['inhaler'] : [],
      restrictions: index % 4 === 0 ? ['limit-high-intensity-when-unwell'] : [],
      notesEncrypted: `enc_medical_${athlete.slug}`,
      doctorName: 'Dr. Smith',
      doctorPhoneE164: '+442071231111',
      insuranceProvider: 'Demo Mutual',
      insuranceNumber: `DM-${10000 + index}`,
      effectiveFrom: toIso({ days: -120 + index }),
      effectiveTo: null,
      isCurrent: true,
      createdByUserId: creatorUserId,
      updatedByUserId: creatorUserId,
      version: 1,
      createdAt,
      updatedAt,
    });

    if (index % 3 === 0) {
      push(tables, 'childSenTags', {
        id: deterministicId('sen', athlete.slug),
        athleteId: id,
        tag: index % 2 === 0 ? 'ADHD' : 'Dyslexia',
        priority: 2,
        isCritical: false,
        createdByUserId: creatorUserId,
        updatedByUserId: creatorUserId,
        version: 1,
        createdAt,
        updatedAt,
        deletedAt: null,
        deletedByUserId: null,
      });
    }

    for (const consentType of ['PHOTO', 'VIDEO', 'MEDICAL_DATA_SHARING']) {
      push(tables, 'childConsents', {
        id: deterministicId('cns', `${athlete.slug}-${consentType}`),
        athleteId: id,
        consentType,
        granted: consentType === 'VIDEO' ? index % 2 === 0 : true,
        grantedByUserId: creatorUserId,
        grantedAt: toIso({ days: -80 + index }),
        expiresAt: toIso({ days: 365 }),
        revokedAt: null,
        supersededById: null,
        metadataJson: {
          source: 'seed',
          actor: creatorUserId,
        },
        createdAt,
      });
    }
  }

  const clubs = [
    {
      slug: 'riverside-fc',
      name: 'Riverside FC',
      createdBy: 'admin-clara',
      coaches: ['coach-amelia', 'coach-liam', 'coach-sophia', 'coach-maya'],
      parents: ['parent-olivia', 'parent-james', 'parent-priya', 'user-club-linked'],
      squads: [
        { slug: 'riverside-u11', name: 'Riverside U11 Development', ownerCoachSlug: 'coach-amelia' },
        { slug: 'riverside-u14', name: 'Riverside U14 Performance', ownerCoachSlug: 'coach-liam' },
      ],
    },
    {
      slug: 'northbridge-united',
      name: 'Northbridge United',
      createdBy: 'admin-henry',
      coaches: ['coach-noah', 'coach-chloe', 'coach-elliot', 'coach-harriet'],
      parents: ['parent-daniel', 'parent-lucy', 'parent-marcus'],
      squads: [
        { slug: 'northbridge-u12', name: 'Northbridge U12', ownerCoachSlug: 'coach-noah' },
        { slug: 'northbridge-u15', name: 'Northbridge U15', ownerCoachSlug: 'coach-chloe' },
      ],
    },
  ];

  const coachClubMap = {};
  const squadToCoachMap = {};
  const squadToClubMap = {};

  for (const [index, club] of clubs.entries()) {
    const clubId = clubIdFromSlug(club.slug);
    const creatorUserId = userIdFromSlug(club.createdBy);
    const createdAt = toIso({ days: -110 + index * 7, hours: 1 });
    const updatedAt = toIso({ days: -1, hours: 2 + index });

    push(tables, 'clubs', {
      id: clubId,
      name: club.name,
      slug: club.slug,
      visibility: 'private',
      createdByUserId: creatorUserId,
      updatedByUserId: creatorUserId,
      version: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'clubMemberships', {
      id: deterministicId('cmb', `${club.slug}-admin`),
      clubId,
      userId: creatorUserId,
      role: 'club_admin',
      active: true,
      createdByUserId: creatorUserId,
      updatedByUserId: creatorUserId,
      version: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      deletedByUserId: null,
    });

    for (const coachSlug of club.coaches) {
      const coachId = userIdFromSlug(coachSlug);
      coachClubMap[coachSlug] = club.slug;
      push(tables, 'clubMemberships', {
        id: deterministicId('cmb', `${club.slug}-${coachSlug}`),
        clubId,
        userId: coachId,
        role: 'coach',
        active: true,
        createdByUserId: creatorUserId,
        updatedByUserId: creatorUserId,
        version: 1,
        createdAt,
        updatedAt,
        deletedAt: null,
        deletedByUserId: null,
      });
    }

    for (const parentSlug of club.parents) {
      push(tables, 'clubMemberships', {
        id: deterministicId('cmb', `${club.slug}-${parentSlug}`),
        clubId,
        userId: userIdFromSlug(parentSlug),
        role: 'member',
        active: true,
        createdByUserId: creatorUserId,
        updatedByUserId: creatorUserId,
        version: 1,
        createdAt,
        updatedAt,
        deletedAt: null,
        deletedByUserId: null,
      });
    }

    for (const [squadIndex, squad] of club.squads.entries()) {
      const squadId = squadIdFromSlug(squad.slug);
      const ownerCoachUserId = userIdFromSlug(squad.ownerCoachSlug);
      squadToCoachMap[squad.slug] = squad.ownerCoachSlug;
      squadToClubMap[squad.slug] = club.slug;

      push(tables, 'squads', {
        id: squadId,
        clubId,
        ownerCoachUserId,
        name: squad.name,
        ageBandLabel: squad.slug.includes('u11') ? 'U11' : squad.slug.includes('u12') ? 'U12' : 'U15',
        createdByUserId: creatorUserId,
        updatedByUserId: creatorUserId,
        version: 1,
        createdAt: toIso({ days: -108 + index * 7, hours: squadIndex }),
        updatedAt,
        deletedAt: null,
        deletedByUserId: null,
      });
    }
  }

  for (const [index, coach] of coachBlueprints.entries()) {
    const userId = coachUserIdFromSlug(coach.slug);
    const createdAt = toIso({ days: -100 + index * 2 });
    const updatedAt = toIso({ days: -1, hours: 3 + index });
    const primaryStartHour = 6 + (index % 5) * 2;
    const primaryEndHour = primaryStartHour + 2 + (index % 2);
    const secondaryStartHour = 15 + (index % 4);
    const secondaryEndHour = secondaryStartHour + 2;
    const primaryDayOfWeek = [1, 2, 3, 4, 5, 6, 1, 2][index % 8];
    const secondaryDayOfWeek = [3, 4, 5, 1, 2, 6, 4, 5][index % 8];

    push(tables, 'coachProfiles', {
      userId,
      bio: `${coach.name} runs player-focused football sessions for grassroots athletes.`,
      yearsExperience: coach.yearsExperience,
      sessionRateMinor: coach.rateMinor,
      currency: 'GBP',
      dbsChecked: true,
      specialties: coach.specialties,
      qualifications: coach.qualifications,
      createdAt,
      updatedAt,
      deletedAt: null,
    });

    push(tables, 'coachLocations', {
      id: deterministicId('loc', `${coach.slug}-main`),
      coachUserId: userId,
      label: `${coach.name.split(' ')[0]} Main Pitch`,
      addressText: `${index + 10} Football Lane, London`,
      latLngJson: {
        lat: 51.49 + index * 0.01,
        lng: -0.12 - index * 0.01,
      },
      isDefault: true,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'coachLocations', {
      id: deterministicId('loc', `${coach.slug}-indoor`),
      coachUserId: userId,
      label: `${coach.name.split(' ')[0]} Indoor Dome`,
      addressText: `${index + 20} Indoor Park, London`,
      latLngJson: {
        lat: 51.47 + index * 0.01,
        lng: -0.11 - index * 0.01,
      },
      isDefault: false,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      deletedByUserId: null,
    });

    for (const [offerIndex, offerType] of ['one_to_one', 'small_group'].entries()) {
      push(tables, 'coachingOfferings', {
        id: offeringIdFromSeed(`${coach.slug}-${offerType}`),
        coachUserId: userId,
        title: offerType === 'one_to_one' ? '1:1 Technical Session' : 'Small Group Development',
        serviceType: offerType,
        durationMinutes: offerType === 'one_to_one' ? 60 : 75,
        capacity: offerType === 'one_to_one' ? 1 : 6,
        priceMinor: offerType === 'one_to_one' ? coach.rateMinor : Math.round(coach.rateMinor * 0.7),
        currency: 'GBP',
        description: `${offerType === 'one_to_one' ? 'Personalized' : 'Group-based'} football coaching.`,
        defaultLocation: `${coach.name.split(' ')[0]} Main Pitch`,
        active: true,
        createdByUserId: userId,
        updatedByUserId: userId,
        version: 1,
        createdAt,
        updatedAt: toIso({ days: -1, hours: offerIndex }),
        deletedAt: null,
        deletedByUserId: null,
      });
    }

    push(tables, 'availabilityTemplates', {
      id: deterministicId('avt', `${coach.slug}-mon`),
      coachUserId: userId,
      dayOfWeek: primaryDayOfWeek,
      startTimeLocal: toLocalTime(primaryStartHour, 0),
      endTimeLocal: toLocalTime(primaryEndHour, 0),
      location: `${coach.name.split(' ')[0]} Main Pitch`,
      maxConcurrent: 2,
      active: true,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'availabilityTemplates', {
      id: deterministicId('avt', `${coach.slug}-wed`),
      coachUserId: userId,
      dayOfWeek: secondaryDayOfWeek,
      startTimeLocal: toLocalTime(secondaryStartHour, 30),
      endTimeLocal: toLocalTime(secondaryEndHour, 30),
      location: `${coach.name.split(' ')[0]} Indoor Dome`,
      maxConcurrent: 1,
      active: true,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'availabilityOverrides', {
      id: deterministicId('avo', `${coach.slug}-holiday`),
      coachUserId: userId,
      overrideDate: toIso({ days: 12 + index }),
      startTimeLocal: null,
      endTimeLocal: null,
      isBlocked: true,
      reason: 'Half-term break',
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'schedulingRules', {
      coachUserId: userId,
      minimumAdvanceBookingHours: 12,
      maxAdvanceBookingDays: 60,
      bufferMinutesDefault: 15,
      maxConcurrentDefault: 1,
      allowSameDayBookings: index % 2 === 0,
      confirmationMode: 'manual',
      cancellationPolicyId: deterministicId('cpr', `${coach.slug}-standard`),
      createdAt,
      updatedAt,
    });

    push(tables, 'cancellationPolicyRules', {
      id: deterministicId('cpr', `${coach.slug}-standard`),
      coachUserId: userId,
      name: 'Standard 24h Notice',
      noticeHoursMin: 24,
      refundPercent: 100,
      feeMinor: null,
      currency: 'GBP',
      appliesToNoShow: false,
      sortOrder: 1,
      active: true,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'cancellationPolicyRules', {
      id: deterministicId('cpr', `${coach.slug}-late`),
      coachUserId: userId,
      name: 'Late Cancellation',
      noticeHoursMin: 4,
      refundPercent: 0,
      feeMinor: 1500,
      currency: 'GBP',
      appliesToNoShow: true,
      sortOrder: 2,
      active: true,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'coachVerifications', {
      id: deterministicId('vrf', `${coach.slug}-dbs`),
      coachUserId: userId,
      verificationType: 'DBS',
      status: 'APPROVED',
      reviewedByUserId: userIdFromSlug('security-lead'),
      reviewedAt: toIso({ days: -40 + index }),
      expiresAt: toIso({ days: 300 }),
      notes: 'Background check approved.',
      createdByUserId: userId,
      updatedByUserId: userIdFromSlug('security-lead'),
      version: 1,
      createdAt,
      updatedAt,
    });
  }

  const athleteBySlug = Object.fromEntries(athletes.map((athlete) => [athlete.slug, athlete]));

  for (const athlete of athletes) {
    const squadId = squadIdFromSlug(athlete.squadSlug);
    const coachSlug = athlete.primaryCoachSlug;
    const coachId = userIdFromSlug(coachSlug);
    const athleteId = athleteIdFromSlug(athlete.slug);

    push(tables, 'squadMemberships', {
      id: deterministicId('sqm', `${athlete.squadSlug}-${athlete.slug}`),
      squadId,
      athleteId,
      status: 'active',
      createdByUserId: coachId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -75 }),
      updatedAt: toIso({ days: -2 }),
      deletedAt: null,
      deletedByUserId: null,
    });

    const familyId = familyIdFromSlug(athlete.familySlug);
    for (const membership of tables.familyMemberships) {
      if (membership.familyId === familyId) {
        const nextSet = new Set(membership.childAccessAthleteIds);
        nextSet.add(athleteId);
        membership.childAccessAthleteIds = Array.from(nextSet);
      }
    }
  }

  const mediaVerificationByCoach = {};
  for (const coach of coachBlueprints) {
    const mediaId = mediaIdFromSeed(`verification-${coach.slug}`);
    mediaVerificationByCoach[coach.slug] = mediaId;

    push(tables, 'mediaObjects', {
      id: mediaId,
      ownerUserId: userIdFromSlug(coach.slug),
      kind: 'DOCUMENT',
      status: 'AVAILABLE',
      storageKey: `verification/${coach.slug}/dbs.pdf`,
      bucketName: 'clubroom-private',
      contentType: 'application/pdf',
      sizeBytes: 523000,
      sha256Hex: deterministicId('sha', `${coach.slug}-verification`),
      originalFileName: `${coach.slug}-dbs.pdf`,
      widthPx: null,
      heightPx: null,
      durationMs: null,
      visibilityScope: 'private',
      consentRequired: false,
      metadataJson: {
        category: 'verification',
      },
      createdByUserId: userIdFromSlug(coach.slug),
      updatedByUserId: userIdFromSlug(coach.slug),
      version: 1,
      createdAt: toIso({ days: -50 }),
      updatedAt: toIso({ days: -20 }),
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'verificationDocuments', {
      id: deterministicId('vrd', coach.slug),
      coachVerificationId: deterministicId('vrf', `${coach.slug}-dbs`),
      mediaObjectId: mediaId,
      fileLabel: 'DBS Certificate',
      createdAt: toIso({ days: -45 }),
    });
  }

  const bookingSeeds = [];

  for (const [index, athlete] of athletes.entries()) {
    const athleteId = athleteIdFromSlug(athlete.slug);
    const coachUserId = coachUserIdFromSlug(athlete.primaryCoachSlug);
    const coachClubSlug = coachClubMap[athlete.primaryCoachSlug];
    const clubId = clubIdFromSlug(coachClubSlug);
    const bookedByUserId = athlete.linkedUserSlug && index % 2 === 0
      ? userIdFromSlug(athlete.linkedUserSlug)
      : userIdFromSlug(athlete.guardianSlugs[0]);
    const completedBookingId = bookingIdFromSeed(`${athlete.slug}-completed`);
    const upcomingBookingId = bookingIdFromSeed(`${athlete.slug}-upcoming`);
    const cancelledBookingId = bookingIdFromSeed(`${athlete.slug}-cancelled`);
    const oneToOneOfferingId = offeringIdFromSeed(`${athlete.primaryCoachSlug}-one_to_one`);

    push(tables, 'bookings', {
      id: completedBookingId,
      coachUserId,
      bookedByUserId,
      clubId,
      coachingOfferingId: oneToOneOfferingId,
      status: 'COMPLETED',
      scheduledAt: toIso({ days: -18 + index, hours: 8 }),
      durationMinutes: 60,
      location: `${clubs.find((club) => club.slug === coachClubSlug)?.name ?? 'Club'} Main Pitch`,
      serviceType: 'one_to_one',
      notes: `Completed technical session for ${athlete.displayName}.`,
      objectivesJson: {
        primary: 'Ball mastery under pressure',
        secondary: 'First touch direction',
      },
      priceMinor: 3800 + (index % 3) * 200,
      currency: 'GBP',
      confirmationMode: 'manual',
      confirmedAt: toIso({ days: -19 + index }),
      cancelledByUserId: null,
      cancelledAt: null,
      cancelReason: null,
      cancellationFeeMinor: null,
      groupSessionId: null,
      recurringSeriesId: null,
      seriesIndex: null,
      createdByUserId: bookedByUserId,
      updatedByUserId: coachUserId,
      version: 2,
      createdAt: toIso({ days: -25 + index }),
      updatedAt: toIso({ days: -17 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'bookingParticipants', {
      id: deterministicId('bkp', `${completedBookingId}-${athlete.slug}`),
      bookingId: completedBookingId,
      athleteId,
      guardianUserId: userIdFromSlug(athlete.guardianSlugs[0]),
      status: 'confirmed',
      createdByUserId: bookedByUserId,
      updatedByUserId: bookedByUserId,
      version: 1,
      createdAt: toIso({ days: -25 + index }),
      updatedAt: toIso({ days: -17 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'bookingObjectives', {
      id: deterministicId('boj', `${completedBookingId}-1`),
      bookingId: completedBookingId,
      objective: 'Improve first touch and awareness in transition.',
      sortOrder: 1,
      createdAt: toIso({ days: -25 + index }),
    });
    push(tables, 'bookingObjectives', {
      id: deterministicId('boj', `${completedBookingId}-2`),
      bookingId: completedBookingId,
      objective: 'Increase confidence in 1v1 situations.',
      sortOrder: 2,
      createdAt: toIso({ days: -25 + index }),
    });

    push(tables, 'bookingStatusEvents', {
      id: deterministicId('bse', `${completedBookingId}-confirm`),
      bookingId: completedBookingId,
      fromStatus: 'PENDING',
      toStatus: 'CONFIRMED',
      actorUserId: coachUserId,
      reason: 'Coach accepted booking.',
      metadataJson: {
        source: 'seed',
      },
      requestId: deterministicId('req', `${completedBookingId}-confirm`),
      occurredAt: toIso({ days: -19 + index }),
    });
    push(tables, 'bookingStatusEvents', {
      id: deterministicId('bse', `${completedBookingId}-complete`),
      bookingId: completedBookingId,
      fromStatus: 'CONFIRMED',
      toStatus: 'COMPLETED',
      actorUserId: coachUserId,
      reason: 'Session marked complete.',
      metadataJson: {
        source: 'seed',
      },
      requestId: deterministicId('req', `${completedBookingId}-complete`),
      occurredAt: toIso({ days: -18 + index, hours: 2 }),
    });

    push(tables, 'attendanceRecords', {
      id: deterministicId('att', `${completedBookingId}-${athlete.slug}`),
      bookingId: completedBookingId,
      groupSessionId: null,
      athleteId,
      status: 'ATTENDED',
      notes: 'Arrived on time and completed all drills.',
      effortRating: 4 + (index % 2),
      focusAreasJson: ['touch', 'decision-making'],
      recordedByUserId: coachUserId,
      recordedAt: toIso({ days: -18 + index, hours: 2 }),
      createdAt: toIso({ days: -18 + index, hours: 2 }),
      updatedAt: toIso({ days: -18 + index, hours: 2 }),
    });

    push(tables, 'bookings', {
      id: upcomingBookingId,
      coachUserId,
      bookedByUserId,
      clubId,
      coachingOfferingId: oneToOneOfferingId,
      status: 'CONFIRMED',
      scheduledAt: toIso({ days: 4 + index, hours: 9 }),
      durationMinutes: 60,
      location: `${clubs.find((club) => club.slug === coachClubSlug)?.name ?? 'Club'} Main Pitch`,
      serviceType: 'one_to_one',
      notes: `Upcoming focused session for ${athlete.displayName}.`,
      objectivesJson: {
        primary: 'Scanning before receive',
        secondary: 'Movement timing',
      },
      priceMinor: 4000 + (index % 3) * 200,
      currency: 'GBP',
      confirmationMode: 'manual',
      confirmedAt: toIso({ days: 2 + index }),
      cancelledByUserId: null,
      cancelledAt: null,
      cancelReason: null,
      cancellationFeeMinor: null,
      groupSessionId: null,
      recurringSeriesId: null,
      seriesIndex: null,
      createdByUserId: bookedByUserId,
      updatedByUserId: coachUserId,
      version: 1,
      createdAt: toIso({ days: -4 + index }),
      updatedAt: toIso({ days: -1 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'bookingParticipants', {
      id: deterministicId('bkp', `${upcomingBookingId}-${athlete.slug}`),
      bookingId: upcomingBookingId,
      athleteId,
      guardianUserId: userIdFromSlug(athlete.guardianSlugs[0]),
      status: 'confirmed',
      createdByUserId: bookedByUserId,
      updatedByUserId: bookedByUserId,
      version: 1,
      createdAt: toIso({ days: -4 + index }),
      updatedAt: toIso({ days: -1 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'bookingObjectives', {
      id: deterministicId('boj', `${upcomingBookingId}-1`),
      bookingId: upcomingBookingId,
      objective: 'Improve body shape before receiving.',
      sortOrder: 1,
      createdAt: toIso({ days: -4 + index }),
    });

    push(tables, 'bookingStatusEvents', {
      id: deterministicId('bse', `${upcomingBookingId}-confirm`),
      bookingId: upcomingBookingId,
      fromStatus: 'PENDING',
      toStatus: 'CONFIRMED',
      actorUserId: coachUserId,
      reason: 'Coach confirmed availability.',
      metadataJson: {
        source: 'seed',
      },
      requestId: deterministicId('req', `${upcomingBookingId}-confirm`),
      occurredAt: toIso({ days: 2 + index }),
    });

    if (index % 2 === 0) {
      push(tables, 'bookings', {
        id: cancelledBookingId,
        coachUserId,
        bookedByUserId,
        clubId,
        coachingOfferingId: oneToOneOfferingId,
        status: 'CANCELLED',
        scheduledAt: toIso({ days: 10 + index, hours: 9 }),
        durationMinutes: 60,
        location: `${clubs.find((club) => club.slug === coachClubSlug)?.name ?? 'Club'} Main Pitch`,
        serviceType: 'one_to_one',
        notes: 'Cancelled due to family travel.',
        objectivesJson: {
          primary: 'Recovery session',
        },
        priceMinor: 3900,
        currency: 'GBP',
        confirmationMode: 'manual',
        confirmedAt: toIso({ days: 6 + index }),
        cancelledByUserId: bookedByUserId,
        cancelledAt: toIso({ days: 8 + index }),
        cancelReason: 'Family unavailable',
        cancellationFeeMinor: 0,
        groupSessionId: null,
        recurringSeriesId: null,
        seriesIndex: null,
        createdByUserId: bookedByUserId,
        updatedByUserId: bookedByUserId,
        version: 2,
        createdAt: toIso({ days: -2 + index }),
        updatedAt: toIso({ days: 8 + index }),
        deletedAt: null,
        deletedByUserId: null,
      });

      push(tables, 'bookingParticipants', {
        id: deterministicId('bkp', `${cancelledBookingId}-${athlete.slug}`),
        bookingId: cancelledBookingId,
        athleteId,
        guardianUserId: userIdFromSlug(athlete.guardianSlugs[0]),
        status: 'cancelled',
        createdByUserId: bookedByUserId,
        updatedByUserId: bookedByUserId,
        version: 1,
        createdAt: toIso({ days: -2 + index }),
        updatedAt: toIso({ days: 8 + index }),
        deletedAt: null,
        deletedByUserId: null,
      });

      push(tables, 'bookingStatusEvents', {
        id: deterministicId('bse', `${cancelledBookingId}-cancel`),
        bookingId: cancelledBookingId,
        fromStatus: 'CONFIRMED',
        toStatus: 'CANCELLED',
        actorUserId: bookedByUserId,
        reason: 'Family cancelled with notice.',
        metadataJson: {
          source: 'seed',
        },
        requestId: deterministicId('req', `${cancelledBookingId}-cancel`),
        occurredAt: toIso({ days: 8 + index }),
      });
    }

    bookingSeeds.push({
      athlete,
      completedBookingId,
      upcomingBookingId,
      clubId,
      bookedByUserId,
      coachUserId,
      oneToOneOfferingId,
    });
  }

  const recurringSeriesId = deterministicId('rec', 'alfie-weekly');
  const alfie = athleteBySlug['alfie-barton'];
  push(tables, 'recurringSeries', {
    id: recurringSeriesId,
    coachUserId: userIdFromSlug(alfie.primaryCoachSlug),
    bookedByUserId: userIdFromSlug(alfie.guardianSlugs[0]),
    athleteId: athleteIdFromSlug(alfie.slug),
    frequency: 'WEEKLY',
    dayOfWeek: 2,
    timeLocal: '17:30',
    startDate: toIso({ days: -20 }),
    endDate: toIso({ days: 140 }),
    status: 'ACTIVE',
    notes: 'Weekly long-term technical development block.',
    createdByUserId: userIdFromSlug(alfie.guardianSlugs[0]),
    updatedByUserId: userIdFromSlug(alfie.primaryCoachSlug),
    version: 1,
    createdAt: toIso({ days: -20 }),
    updatedAt: toIso({ days: -1 }),
    deletedAt: null,
    deletedByUserId: null,
  });

  push(tables, 'bookingChangeRequests', {
    id: deterministicId('bcr', 'alfie-upcoming-reschedule'),
    bookingId: bookingIdFromSeed('alfie-barton-upcoming'),
    requestType: 'RESCHEDULE',
    status: 'PENDING',
    requestedByUserId: userIdFromSlug('parent-olivia'),
    targetScheduledAt: toIso({ days: 8, hours: 11 }),
    reason: 'School event clash.',
    responseByUserId: null,
    respondedAt: null,
    responseReason: null,
    createdAt: toIso({ days: -1 }),
    updatedAt: toIso({ days: -1 }),
  });

  const squadToAthleteSlugs = athletes.reduce((acc, athlete) => {
    if (!acc[athlete.squadSlug]) {
      acc[athlete.squadSlug] = [];
    }
    acc[athlete.squadSlug].push(athlete.slug);
    return acc;
  }, {});

  for (const [index, [squadSlug, athleteSlugs]] of Object.entries(squadToAthleteSlugs).entries()) {
    const coachSlug = squadToCoachMap[squadSlug];
    const coachId = userIdFromSlug(coachSlug);
    const clubId = clubIdFromSlug(squadToClubMap[squadSlug]);
    const squadId = squadIdFromSlug(squadSlug);

    const upcomingGroupSessionId = groupSessionIdFromSeed(`${squadSlug}-upcoming`);
    const completedGroupSessionId = groupSessionIdFromSeed(`${squadSlug}-completed`);

    push(tables, 'groupSessions', {
      id: upcomingGroupSessionId,
      coachUserId: coachId,
      clubId,
      squadId,
      recurringSeriesId: null,
      title: `${squadSlug.toUpperCase()} Tactical Block`,
      description: 'Structured session with tactical and technical phases.',
      sessionType: 'group_training',
      maxParticipants: 12,
      currentParticipants: athleteSlugs.length,
      waitlistEnabled: true,
      waitlistCount: index === 0 ? 1 : 0,
      pricePerParticipantMinor: 1800,
      currency: 'GBP',
      ageMin: 10,
      ageMax: 16,
      skillLevel: 'intermediate',
      location: 'Club Training Ground',
      isVirtual: false,
      status: 'PUBLISHED',
      registrationDeadlineAt: toIso({ days: 2 + index }),
      inviteType: 'squad',
      scheduleJson: [
        {
          startsAt: toIso({ days: 5 + index, hours: 9 }),
          endsAt: toIso({ days: 5 + index, hours: 10, minutes: 30 }),
        },
      ],
      focusJson: ['pressing', 'passing-lanes'],
      equipmentJson: ['cones', 'small-goals'],
      createdByUserId: coachId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -3 + index }),
      updatedAt: toIso({ days: -1 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'groupSessions', {
      id: completedGroupSessionId,
      coachUserId: coachId,
      clubId,
      squadId,
      recurringSeriesId: null,
      title: `${squadSlug.toUpperCase()} Match Readiness`,
      description: 'Completed prep session with transitions and finishing.',
      sessionType: 'group_training',
      maxParticipants: 12,
      currentParticipants: athleteSlugs.length,
      waitlistEnabled: false,
      waitlistCount: 0,
      pricePerParticipantMinor: 1700,
      currency: 'GBP',
      ageMin: 10,
      ageMax: 16,
      skillLevel: 'intermediate',
      location: 'Club Training Ground',
      isVirtual: false,
      status: 'COMPLETED',
      registrationDeadlineAt: toIso({ days: -4 + index }),
      inviteType: 'squad',
      scheduleJson: [
        {
          startsAt: toIso({ days: -6 + index, hours: 9 }),
          endsAt: toIso({ days: -6 + index, hours: 10, minutes: 30 }),
        },
      ],
      focusJson: ['finishing', 'transition'],
      equipmentJson: ['balls', 'mannequins'],
      createdByUserId: coachId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -10 + index }),
      updatedAt: toIso({ days: -5 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    for (const athleteSlug of athleteSlugs) {
      const athleteId = athleteIdFromSlug(athleteSlug);
      const familyGuardian = athleteBySlug[athleteSlug].guardianSlugs[0];
      const parentUserId = userIdFromSlug(familyGuardian);

      push(tables, 'groupSessionRegistrations', {
        id: deterministicId('gsr', `${upcomingGroupSessionId}-${athleteSlug}`),
        groupSessionId: upcomingGroupSessionId,
        athleteId,
        parentUserId,
        status: 'REGISTERED',
        paidAt: null,
        notes: 'Registered via squad invite.',
        createdByUserId: parentUserId,
        updatedByUserId: parentUserId,
        version: 1,
        registeredAt: toIso({ days: -2 + index }),
        updatedAt: toIso({ days: -1 + index }),
        deletedAt: null,
        deletedByUserId: null,
      });

      push(tables, 'groupSessionRegistrations', {
        id: deterministicId('gsr', `${completedGroupSessionId}-${athleteSlug}`),
        groupSessionId: completedGroupSessionId,
        athleteId,
        parentUserId,
        status: 'ATTENDED',
        paidAt: toIso({ days: -7 + index }),
        notes: 'Attended full group session.',
        createdByUserId: parentUserId,
        updatedByUserId: coachId,
        version: 1,
        registeredAt: toIso({ days: -9 + index }),
        updatedAt: toIso({ days: -5 + index }),
        deletedAt: null,
        deletedByUserId: null,
      });

      push(tables, 'attendanceRecords', {
        id: deterministicId('att', `${completedGroupSessionId}-${athleteSlug}`),
        bookingId: null,
        groupSessionId: completedGroupSessionId,
        athleteId,
        status: 'ATTENDED',
        notes: 'Completed all tactical activities.',
        effortRating: 4,
        focusAreasJson: ['positioning', 'team-shape'],
        recordedByUserId: coachId,
        recordedAt: toIso({ days: -6 + index, hours: 2 }),
        createdAt: toIso({ days: -6 + index, hours: 2 }),
        updatedAt: toIso({ days: -6 + index, hours: 2 }),
      });

      const inviteId = deterministicId('inv', `${upcomingGroupSessionId}-${athleteSlug}`);
      const inviteAccepted = athleteSlugs.indexOf(athleteSlug) % 2 === 0;

      push(tables, 'invites', {
        id: inviteId,
        inviteType: 'group_session',
        senderUserId: coachId,
        clubId,
        groupSessionId: upcomingGroupSessionId,
        bookingId: null,
        eventId: null,
        status: inviteAccepted ? 'ACCEPTED' : 'PENDING',
        message: 'Join this squad group session.',
        expiresAt: toIso({ days: 4 + index }),
        metadataJson: {
          squadId,
        },
        createdAt: toIso({ days: -2 + index }),
        updatedAt: toIso({ days: -1 + index }),
        revokedAt: null,
      });

      push(tables, 'inviteTargets', {
        id: deterministicId('ivt', `${inviteId}-athlete`),
        inviteId,
        targetUserId: parentUserId,
        targetAthleteId: athleteId,
        targetFamilyId: familyIdFromSlug(athleteBySlug[athleteSlug].familySlug),
        status: inviteAccepted ? 'ACCEPTED' : 'PENDING',
        respondedAt: inviteAccepted ? toIso({ days: -1 + index }) : null,
        responsePayloadJson: inviteAccepted
          ? { response: 'accepted', source: 'mobile' }
          : null,
        createdAt: toIso({ days: -2 + index }),
        updatedAt: toIso({ days: -1 + index }),
      });
    }

    if (index === 0) {
      push(tables, 'waitlistEntries', {
        id: deterministicId('wle', `${upcomingGroupSessionId}-waitlist`),
        groupSessionId: upcomingGroupSessionId,
        athleteId: athleteIdFromSlug('zara-diaz'),
        userId: userIdFromSlug('parent-marcus'),
        coachUserId: coachId,
        position: 1,
        autoBook: true,
        status: 'WAITING',
        notes: 'Priority waitlist entry.',
        notifiedAt: null,
        expiresAt: null,
        bookingId: null,
        userResponse: null,
        userRespondedAt: null,
        createdAt: toIso({ days: -1 }),
        updatedAt: toIso({ days: -1 }),
        deletedAt: null,
      });
    }
  }

  for (const [clubIndex, club] of clubs.entries()) {
    const clubId = clubIdFromSlug(club.slug);
    const creatorUserId = userIdFromSlug(club.createdBy);

    const eventUpcomingId = deterministicId('evt', `${club.slug}-upcoming-open-day`);
    const eventReviewId = deterministicId('evt', `${club.slug}-review-night`);

    push(tables, 'clubEvents', {
      id: eventUpcomingId,
      clubId,
      creatorUserId,
      title: `${club.name} Open Day`,
      description: 'Open training and parent Q&A for new families.',
      startsAt: toIso({ days: 9 + clubIndex, hours: 8 }),
      endsAt: toIso({ days: 9 + clubIndex, hours: 11 }),
      location: 'Main Club Ground',
      status: 'PUBLISHED',
      visibility: 'club',
      rsvpDeadlineAt: toIso({ days: 8 + clubIndex }),
      guestLimit: 150,
      metadataJson: {
        type: 'community',
      },
      createdByUserId: creatorUserId,
      updatedByUserId: creatorUserId,
      version: 1,
      createdAt: toIso({ days: -3 + clubIndex }),
      updatedAt: toIso({ days: -1 + clubIndex }),
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'clubEvents', {
      id: eventReviewId,
      clubId,
      creatorUserId,
      title: `${club.name} Season Review`,
      description: 'Coaches share player development summary.',
      startsAt: toIso({ days: -14 + clubIndex, hours: 8 }),
      endsAt: toIso({ days: -14 + clubIndex, hours: 10 }),
      location: 'Club Hall',
      status: 'COMPLETED',
      visibility: 'club',
      rsvpDeadlineAt: toIso({ days: -16 + clubIndex }),
      guestLimit: 80,
      metadataJson: {
        type: 'operations',
      },
      createdByUserId: creatorUserId,
      updatedByUserId: creatorUserId,
      version: 1,
      createdAt: toIso({ days: -20 + clubIndex }),
      updatedAt: toIso({ days: -14 + clubIndex }),
      deletedAt: null,
      deletedByUserId: null,
    });

    const eventMembers = tables.clubMemberships
      .filter((membership) => membership.clubId === clubId && membership.role !== 'club_admin')
      .slice(0, 6);

    for (const [memberIndex, member] of eventMembers.entries()) {
      push(tables, 'eventRsvps', {
        id: deterministicId('rsv', `${eventUpcomingId}-${member.userId}`),
        clubEventId: eventUpcomingId,
        userId: member.userId,
        status: memberIndex % 3 === 0 ? 'MAYBE' : 'GOING',
        guestCount: memberIndex % 2,
        notes: memberIndex % 3 === 0 ? 'Will confirm closer to date.' : null,
        respondedAt: toIso({ days: -1 }),
        createdAt: toIso({ days: -1 }),
        updatedAt: toIso({ days: -1 }),
      });
    }
  }

  const paidInvoiceIds = [];
  const unpaidInvoiceIds = [];

  for (const [index, bookingSeed] of bookingSeeds.entries()) {
    const bookingId = bookingSeed.completedBookingId;
    const invoiceId = invoiceIdFromSeed(bookingId);
    const paid = index % 2 === 0;
    if (paid) {
      paidInvoiceIds.push(invoiceId);
    } else {
      unpaidInvoiceIds.push(invoiceId);
    }

    const subtotalMinor = 3800 + (index % 3) * 200;
    const taxMinor = 0;
    const totalMinor = subtotalMinor + taxMinor;
    const invoiceNumber = `INV-2026-${String(1001 + index).padStart(4, '0')}`;

    push(tables, 'invoices', {
      id: invoiceId,
      invoiceNumber,
      bookingId,
      coachUserId: bookingSeed.coachUserId,
      payerUserId: bookingSeed.bookedByUserId,
      athleteId: athleteIdFromSlug(bookingSeed.athlete.slug),
      status: paid ? 'PAID' : 'SENT',
      sessionDate: toIso({ days: -18 + index, hours: 8 }),
      sessionType: 'one_to_one',
      sessionLocation: 'Main Club Pitch',
      sessionDurationMinutes: 60,
      subtotalMinor,
      taxMinor,
      taxRatePercent: 0,
      totalMinor,
      currency: 'GBP',
      dueDate: toIso({ days: -11 + index }),
      sentAt: toIso({ days: -17 + index }),
      paidAt: paid ? toIso({ days: -12 + index }) : null,
      voidedAt: null,
      voidReason: null,
      notes: 'Direct-to-coach payment instruction.',
      coachBusinessName: `${bookingSeed.athlete.primaryCoachSlug.replace('coach-', '').toUpperCase()} Coaching Ltd`,
      coachBusinessEmail: `${bookingSeed.athlete.primaryCoachSlug}@clubroom.demo`,
      billingAddress: '10 Demo Road, London',
      createdByUserId: bookingSeed.coachUserId,
      updatedByUserId: bookingSeed.coachUserId,
      version: 1,
      createdAt: toIso({ days: -17 + index }),
      updatedAt: paid ? toIso({ days: -12 + index }) : toIso({ days: -10 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'invoiceLineItems', {
      id: deterministicId('invl', invoiceId),
      invoiceId,
      description: 'Football coaching session',
      quantity: 1,
      unitAmountMinor: subtotalMinor,
      lineSubtotalMinor: subtotalMinor,
      taxRatePercent: 0,
      taxMinor,
      totalMinor,
      sortOrder: 1,
      createdAt: toIso({ days: -17 + index }),
      updatedAt: toIso({ days: -17 + index }),
    });

    push(tables, 'invoiceEvents', {
      id: deterministicId('ine', `${invoiceId}-generated`),
      invoiceId,
      eventType: 'GENERATED',
      actorUserId: bookingSeed.coachUserId,
      reason: 'Auto-generated after booking completion.',
      metadataJson: {
        source: 'seed',
      },
      requestId: deterministicId('req', `${invoiceId}-generated`),
      occurredAt: toIso({ days: -17 + index }),
    });

    if (paid) {
      push(tables, 'invoiceEvents', {
        id: deterministicId('ine', `${invoiceId}-paid`),
        invoiceId,
        eventType: 'MARKED_PAID',
        actorUserId: bookingSeed.coachUserId,
        reason: 'Payment reconciled.',
        metadataJson: {
          source: 'seed',
        },
        requestId: deterministicId('req', `${invoiceId}-paid`),
        occurredAt: toIso({ days: -12 + index }),
      });
    }

    push(tables, 'reconcilerEntries', {
      id: deterministicId('rec', invoiceId),
      invoiceId,
      coachUserId: bookingSeed.coachUserId,
      state: paid ? 'PAID' : 'OUTSTANDING',
      internalNote: paid ? 'Matched to transfer.' : 'Awaiting family payment.',
      createdByUserId: bookingSeed.coachUserId,
      updatedByUserId: bookingSeed.coachUserId,
      version: 1,
      createdAt: toIso({ days: -17 + index }),
      updatedAt: toIso({ days: -10 + index }),
    });
  }

  for (const coach of coachBlueprints) {
    const coachId = userIdFromSlug(coach.slug);
    push(tables, 'paymentInstructionTemplates', {
      id: deterministicId('pit', coach.slug),
      coachUserId: coachId,
      name: 'Default bank transfer instructions',
      isDefault: true,
      bodyTemplate:
        'Please transfer payment within 7 days. Include invoice number as reference.',
      createdByUserId: coachId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -30 }),
      updatedAt: toIso({ days: -2 }),
      deletedAt: null,
      deletedByUserId: null,
    });
  }

  for (const invoiceId of unpaidInvoiceIds.slice(0, 4)) {
    const invoice = tables.invoices.find((item) => item.id === invoiceId);
    if (!invoice) continue;
    push(tables, 'paymentReminders', {
      id: deterministicId('pmr', invoiceId),
      invoiceId,
      recipientUserId: invoice.payerUserId,
      sentByUserId: invoice.coachUserId,
      channel: 'in_app',
      deliveryStatus: 'sent',
      messageSnapshot: `Reminder: invoice ${invoice.invoiceNumber} is due.`,
      sentAt: toIso({ days: -2 }),
      metadataJson: {
        source: 'seed',
      },
    });
  }

  const skillDefs = [
    { code: 'FIRST_TOUCH', name: 'First Touch', category: 'Technical' },
    { code: 'PASSING', name: 'Passing', category: 'Technical' },
    { code: 'SHOOTING', name: 'Shooting', category: 'Technical' },
    { code: 'POSITIONING', name: 'Positioning', category: 'Tactical' },
    { code: 'COMMUNICATION', name: 'Communication', category: 'Mental' },
  ];
  for (const skill of skillDefs) {
    push(tables, 'skillDefinitions', {
      id: deterministicId('skd', skill.code),
      code: skill.code,
      name: skill.name,
      category: skill.category,
      description: `${skill.name} definition for seeded marketplace testing.`,
      active: true,
      createdAt: toIso({ days: -180 }),
      updatedAt: toIso({ days: -30 }),
    });
  }

  const badgeDefs = [
    { code: 'CONSISTENT_ATTENDER', name: 'Consistent Attender', category: 'Commitment' },
    { code: 'TRAINING_LEADER', name: 'Training Leader', category: 'Leadership' },
    { code: 'SKILL_BREAKTHROUGH', name: 'Skill Breakthrough', category: 'Development' },
  ];
  for (const badge of badgeDefs) {
    push(tables, 'badgeDefinitions', {
      id: deterministicId('abd', badge.code),
      code: badge.code,
      name: badge.name,
      category: badge.category,
      description: `${badge.name} awarded when milestone criteria are met.`,
      active: true,
      createdAt: toIso({ days: -180 }),
      updatedAt: toIso({ days: -20 }),
    });
  }

  for (const [index, bookingSeed] of bookingSeeds.entries()) {
    const athlete = bookingSeed.athlete;
    const athleteId = athleteIdFromSlug(athlete.slug);
    const coachId = bookingSeed.coachUserId;
    const completedBookingId = bookingSeed.completedBookingId;

    push(tables, 'sessionNotes', {
      id: deterministicId('snt', completedBookingId),
      bookingId: completedBookingId,
      groupSessionId: null,
      athleteId,
      coachUserId: coachId,
      visibility: 'PUBLIC',
      noteText: `${athlete.displayName}: strong effort and improved scanning.`,
      privateNotesEncrypted: null,
      metadataJson: {
        focus: ['touch', 'awareness'],
      },
      createdByUserId: coachId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -17 + index }),
      updatedAt: toIso({ days: -17 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'sessionFeedback', {
      id: deterministicId('sfb', completedBookingId),
      bookingId: completedBookingId,
      athleteId,
      authorUserId: bookingSeed.bookedByUserId,
      rating: 4 + (index % 2),
      publicComment: 'Great structure and communication from coach.',
      privateCommentEncrypted: null,
      visibility: 'public',
      createdAt: toIso({ days: -16 + index }),
      updatedAt: toIso({ days: -16 + index }),
      deletedAt: null,
    });

    const goalId = deterministicId('gol', athlete.slug);
    push(tables, 'goals', {
      id: goalId,
      athleteId,
      ownerUserId: athlete.linkedUserSlug ? userIdFromSlug(athlete.linkedUserSlug) : null,
      creatorUserId: bookingSeed.bookedByUserId,
      title: `Improve ${index % 2 === 0 ? 'first touch' : 'decision speed'}`,
      category: 'Technical',
      status: index % 3 === 0 ? 'COMPLETED' : 'ACTIVE',
      targetDate: toIso({ days: 45 + index }),
      notes: athlete.notes,
      createdByUserId: bookingSeed.bookedByUserId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -30 + index }),
      updatedAt: toIso({ days: -2 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'goalMilestones', {
      id: deterministicId('glm', `${athlete.slug}-m1`),
      goalId,
      title: 'Complete 4 focused drills per week',
      status: 'COMPLETED',
      dueDate: toIso({ days: 10 + index }),
      completedAt: toIso({ days: -5 + index }),
      sortOrder: 1,
      createdByUserId: coachId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -25 + index }),
      updatedAt: toIso({ days: -5 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'goalMilestones', {
      id: deterministicId('glm', `${athlete.slug}-m2`),
      goalId,
      title: 'Show improvement in training-game transition',
      status: index % 2 === 0 ? 'IN_PROGRESS' : 'PENDING',
      dueDate: toIso({ days: 25 + index }),
      completedAt: null,
      sortOrder: 2,
      createdByUserId: coachId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -20 + index }),
      updatedAt: toIso({ days: -2 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    const skillA = skillDefs[index % skillDefs.length];
    const skillB = skillDefs[(index + 1) % skillDefs.length];

    push(tables, 'athleteSkillAssessments', {
      id: deterministicId('ska', `${athlete.slug}-${skillA.code}`),
      athleteId,
      skillDefinitionId: deterministicId('skd', skillA.code),
      assessorUserId: coachId,
      score: 2 + (index % 4),
      notes: `${skillA.name} progressing steadily.`,
      bookingId: completedBookingId,
      assessedAt: toIso({ days: -16 + index }),
      createdAt: toIso({ days: -16 + index }),
    });

    push(tables, 'athleteSkillAssessments', {
      id: deterministicId('ska', `${athlete.slug}-${skillB.code}`),
      athleteId,
      skillDefinitionId: deterministicId('skd', skillB.code),
      assessorUserId: coachId,
      score: 2 + ((index + 1) % 4),
      notes: `${skillB.name} needs consistency under pressure.`,
      bookingId: completedBookingId,
      assessedAt: toIso({ days: -15 + index }),
      createdAt: toIso({ days: -15 + index }),
    });

    push(tables, 'athleteBadges', {
      id: deterministicId('aba', athlete.slug),
      athleteId,
      badgeDefinitionId: deterministicId('abd', badgeDefs[index % badgeDefs.length].code),
      awardedByUserId: coachId,
      bookingId: completedBookingId,
      note: 'Awarded for consistent effort and session attendance.',
      awardedAt: toIso({ days: -15 + index }),
      createdAt: toIso({ days: -15 + index }),
    });
  }

  const drillSeeds = [
    { slug: 'drill-touch-box', title: 'Touch Box Circuit', coachSlug: 'coach-amelia' },
    { slug: 'drill-scan-pass', title: 'Scan + Pass Triangle', coachSlug: 'coach-liam' },
    { slug: 'drill-transition-press', title: 'Transition Press Trigger', coachSlug: 'coach-noah' },
  ];

  for (const drill of drillSeeds) {
    push(tables, 'drills', {
      id: deterministicId('drl', drill.slug),
      authorUserId: userIdFromSlug(drill.coachSlug),
      title: drill.title,
      description: `${drill.title} for weekly practice homework.`,
      difficulty: 'intermediate',
      active: true,
      metadataJson: {
        tags: ['technical', 'homework'],
      },
      createdAt: toIso({ days: -30 }),
      updatedAt: toIso({ days: -5 }),
      deletedAt: null,
    });
  }

  const assignmentAthletes = athletes.slice(0, 6);
  for (const [index, athlete] of assignmentAthletes.entries()) {
    const assignmentId = deterministicId('dra', athlete.slug);
    const drill = drillSeeds[index % drillSeeds.length];
    const coachId = userIdFromSlug(athlete.primaryCoachSlug);
    const athleteId = athleteIdFromSlug(athlete.slug);

    push(tables, 'drillAssignments', {
      id: assignmentId,
      drillId: deterministicId('drl', drill.slug),
      athleteId,
      coachUserId: coachId,
      title: `${drill.title} Homework`,
      instructions: 'Record 3 sets and upload best attempt.',
      requiresEvidence: true,
      dueDate: toIso({ days: 7 + index }),
      status: index % 2 === 0 ? 'SUBMITTED' : 'ASSIGNED',
      createdByUserId: coachId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -3 + index }),
      updatedAt: toIso({ days: -1 + index }),
      deletedAt: null,
    });

    if (athlete.linkedUserSlug) {
      const submissionMediaId = mediaIdFromSeed(`assignment-${athlete.slug}`);
      push(tables, 'mediaObjects', {
        id: submissionMediaId,
        ownerUserId: userIdFromSlug(athlete.linkedUserSlug),
        kind: 'VIDEO',
        status: 'AVAILABLE',
        storageKey: `assignments/${athlete.slug}/submission.mp4`,
        bucketName: 'clubroom-private',
        contentType: 'video/mp4',
        sizeBytes: 1_200_000,
        sha256Hex: deterministicId('sha', `${athlete.slug}-assignment-video`),
        originalFileName: `${athlete.slug}-submission.mp4`,
        widthPx: 1280,
        heightPx: 720,
        durationMs: 45000,
        visibilityScope: 'coach',
        consentRequired: false,
        metadataJson: {
          source: 'drill_assignment',
        },
        createdByUserId: userIdFromSlug(athlete.linkedUserSlug),
        updatedByUserId: userIdFromSlug(athlete.linkedUserSlug),
        version: 1,
        createdAt: toIso({ days: -1 + index }),
        updatedAt: toIso({ days: -1 + index }),
        deletedAt: null,
        deletedByUserId: null,
      });

      push(tables, 'assignmentSubmissions', {
        id: deterministicId('das', athlete.slug),
        drillAssignmentId: assignmentId,
        athleteId,
        submittedByUserId: userIdFromSlug(athlete.linkedUserSlug),
        mediaObjectId: submissionMediaId,
        notes: 'Completed all sets with improved control.',
        status: 'SUBMITTED',
        submittedAt: toIso({ days: -1 + index }),
        createdAt: toIso({ days: -1 + index }),
        updatedAt: toIso({ days: -1 + index }),
      });
    }
  }

  const videoAthletes = athletes.filter((athlete) => athlete.linkedUserSlug).slice(0, 3);
  for (const [index, athlete] of videoAthletes.entries()) {
    const mediaId = mediaIdFromSeed(`video-${athlete.slug}`);
    const coachId = userIdFromSlug(athlete.primaryCoachSlug);
    const athleteUserId = userIdFromSlug(athlete.linkedUserSlug);

    push(tables, 'mediaObjects', {
      id: mediaId,
      ownerUserId: athleteUserId,
      kind: 'VIDEO',
      status: 'AVAILABLE',
      storageKey: `videos/${athlete.slug}/session-${index + 1}.mp4`,
      bucketName: 'clubroom-private',
      contentType: 'video/mp4',
      sizeBytes: 2_500_000 + index * 200_000,
      sha256Hex: deterministicId('sha', `${athlete.slug}-training-video`),
      originalFileName: `${athlete.slug}-training.mp4`,
      widthPx: 1920,
      heightPx: 1080,
      durationMs: 92_000,
      visibilityScope: 'private',
      consentRequired: true,
      metadataJson: {
        athleteId: athleteIdFromSlug(athlete.slug),
      },
      createdByUserId: athleteUserId,
      updatedByUserId: athleteUserId,
      version: 1,
      createdAt: toIso({ days: -4 + index }),
      updatedAt: toIso({ days: -2 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    push(tables, 'videos', {
      id: deterministicId('vid', athlete.slug),
      mediaObjectId: mediaId,
      athleteId: athleteIdFromSlug(athlete.slug),
      coachUserId: coachId,
      title: `${athlete.displayName} Training Clip`,
      description: 'Technical review clip.',
      sourceContextType: 'booking',
      sourceContextId: bookingIdFromSeed(`${athlete.slug}-completed`),
      createdByUserId: athleteUserId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -3 + index }),
      updatedAt: toIso({ days: -2 + index }),
      deletedAt: null,
    });

    push(tables, 'videoAnnotations', {
      id: deterministicId('van', `${athlete.slug}-1`),
      videoId: deterministicId('vid', athlete.slug),
      authorUserId: coachId,
      timestampMs: 12400,
      text: 'Excellent body shape before first touch.',
      color: '#2D6A4F',
      createdByUserId: coachId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -2 + index }),
      updatedAt: toIso({ days: -2 + index }),
      deletedAt: null,
    });

    push(tables, 'videoAnnotations', {
      id: deterministicId('van', `${athlete.slug}-2`),
      videoId: deterministicId('vid', athlete.slug),
      authorUserId: coachId,
      timestampMs: 40200,
      text: 'Scan left shoulder earlier here.',
      color: '#E76F51',
      createdByUserId: coachId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -2 + index }),
      updatedAt: toIso({ days: -2 + index }),
      deletedAt: null,
    });
  }

  for (const [index, media] of tables.mediaObjects.entries()) {
    push(tables, 'uploadSessions', {
      id: deterministicId('upl', media.id),
      requesterUserId: media.ownerUserId ?? media.createdByUserId,
      mediaObjectId: media.id,
      targetResourceType: media.kind === 'DOCUMENT' ? 'verification' : 'media',
      targetResourceId: media.id,
      expectedContentType: media.contentType,
      expectedMaxBytes: media.sizeBytes + 200000,
      status: 'COMPLETED',
      uploadUrlExpiresAt: toIso({ days: -40 + index }),
      completedAt: toIso({ days: -40 + index, hours: 1 }),
      metadataJson: {
        source: 'seed',
      },
      createdAt: toIso({ days: -40 + index }),
      updatedAt: toIso({ days: -40 + index, hours: 1 }),
    });

    push(tables, 'malwareScanResults', {
      id: deterministicId('msr', media.id),
      mediaObjectId: media.id,
      verdict: 'CLEAN',
      scanner: 'seed-av',
      detailsJson: {
        signatureVersion: '2026.03',
      },
      scannedAt: toIso({ days: -39 + index }),
      createdAt: toIso({ days: -39 + index }),
    });
  }

  for (const [index, club] of clubs.entries()) {
    const groupId = deterministicId('grp', `${club.slug}-community`);
    const ownerUserId = userIdFromSlug(club.coaches[0]);
    const clubId = clubIdFromSlug(club.slug);

    push(tables, 'communityGroups', {
      id: groupId,
      clubId,
      ownerUserId,
      name: `${club.name} Community`,
      description: 'Clubwide updates and parent communication.',
      visibility: 'PRIVATE',
      createdByUserId: ownerUserId,
      updatedByUserId: ownerUserId,
      version: 1,
      createdAt: toIso({ days: -60 + index }),
      updatedAt: toIso({ days: -1 + index }),
      deletedAt: null,
      deletedByUserId: null,
    });

    const groupMembers = [
      ...club.coaches.slice(0, 2),
      ...club.parents.slice(0, 2),
    ];

    for (const [memberIndex, memberSlug] of groupMembers.entries()) {
      push(tables, 'communityGroupMemberships', {
        id: deterministicId('cgm', `${groupId}-${memberSlug}`),
        communityGroupId: groupId,
        userId: userIdFromSlug(memberSlug),
        role: memberIndex === 0 ? 'owner' : memberSlug.startsWith('coach-') ? 'coach' : 'member',
        active: true,
        createdByUserId: ownerUserId,
        updatedByUserId: ownerUserId,
        version: 1,
        createdAt: toIso({ days: -58 + memberIndex }),
        updatedAt: toIso({ days: -1 }),
        deletedAt: null,
      });
    }

    const postId = deterministicId('pst', `${club.slug}-weekly-update`);
    push(tables, 'posts', {
      id: postId,
      authorUserId: ownerUserId,
      clubId,
      communityGroupId: groupId,
      visibility: 'CLUB',
      content: 'Weekly training highlights and reminders for families.',
      attachmentsJson: [],
      commentsCount: 2,
      reactionsCount: 3,
      createdByUserId: ownerUserId,
      updatedByUserId: ownerUserId,
      version: 1,
      createdAt: toIso({ days: -3 }),
      updatedAt: toIso({ days: -2 }),
      deletedAt: null,
      deletedByUserId: null,
    });

    const commenterA = userIdFromSlug(groupMembers[2]);
    const commenterB = userIdFromSlug(groupMembers[3]);

    push(tables, 'postComments', {
      id: deterministicId('cmt', `${postId}-a`),
      postId,
      authorUserId: commenterA,
      parentCommentId: null,
      content: 'Thanks, this schedule works for us.',
      isDeleted: false,
      deletedAt: null,
      createdAt: toIso({ days: -2, hours: 2 }),
      updatedAt: toIso({ days: -2, hours: 2 }),
    });

    push(tables, 'postComments', {
      id: deterministicId('cmt', `${postId}-b`),
      postId,
      authorUserId: commenterB,
      parentCommentId: null,
      content: 'Can we get goalkeeper-specific drills next week?',
      isDeleted: false,
      deletedAt: null,
      createdAt: toIso({ days: -2, hours: 3 }),
      updatedAt: toIso({ days: -2, hours: 3 }),
    });

    for (const [reactionIndex, memberSlug] of groupMembers.slice(0, 3).entries()) {
      push(tables, 'postReactions', {
        id: deterministicId('rea', `${postId}-${memberSlug}`),
        postId,
        userId: userIdFromSlug(memberSlug),
        reaction: reactionIndex === 0 ? 'LIKE' : reactionIndex === 1 ? 'CLAP' : 'LOVE',
        createdAt: toIso({ days: -2, hours: reactionIndex }),
      });
    }

    const threadId = deterministicId('thr', `${club.slug}-community-thread`);
    push(tables, 'messageThreads', {
      id: threadId,
      threadType: 'GROUP',
      clubId,
      communityGroupId: groupId,
      groupSessionId: null,
      bookingId: null,
      title: `${club.name} Parent Chat`,
      lastMessageAt: toIso({ days: -1 }),
      createdByUserId: ownerUserId,
      updatedByUserId: ownerUserId,
      version: 1,
      createdAt: toIso({ days: -20 }),
      updatedAt: toIso({ days: -1 }),
      deletedAt: null,
    });

    for (const [participantIndex, memberSlug] of groupMembers.entries()) {
      push(tables, 'messageParticipants', {
        id: deterministicId('mpr', `${threadId}-${memberSlug}`),
        messageThreadId: threadId,
        userId: userIdFromSlug(memberSlug),
        role: participantIndex === 0 ? 'owner' : 'member',
        lastReadAt: toIso({ days: -1 }),
        muted: false,
        joinedAt: toIso({ days: -20 }),
        leftAt: null,
      });
    }

    for (const [messageIndex, memberSlug] of groupMembers.slice(0, 3).entries()) {
      const messageId = deterministicId('msg', `${threadId}-${messageIndex}`);
      push(tables, 'messages', {
        id: messageId,
        messageThreadId: threadId,
        senderUserId: userIdFromSlug(memberSlug),
        content: messageIndex === 0
          ? 'Reminder: sessions start 15 minutes early tomorrow.'
          : messageIndex === 1
            ? 'Thanks coach, we will be there.'
            : 'Could you share the drill PDF again?',
        attachmentsJson: [],
        editedAt: null,
        deletedAt: null,
        createdAt: toIso({ days: -1, hours: messageIndex }),
        updatedAt: toIso({ days: -1, hours: messageIndex }),
      });

      for (const recipientSlug of groupMembers) {
        push(tables, 'messageReceipts', {
          id: deterministicId('mrc', `${messageId}-${recipientSlug}`),
          messageId,
          userId: userIdFromSlug(recipientSlug),
          deliveredAt: toIso({ days: -1, hours: messageIndex, minutes: 1 }),
          readAt: recipientSlug === memberSlug ? null : toIso({ days: -1, hours: messageIndex, minutes: 20 }),
          createdAt: toIso({ days: -1, hours: messageIndex, minutes: 1 }),
          updatedAt: toIso({ days: -1, hours: messageIndex, minutes: 20 }),
        });
      }
    }
  }

  const directThreadSeed = [
    { parentSlug: 'parent-olivia', coachSlug: 'coach-amelia' },
    { parentSlug: 'parent-priya', coachSlug: 'coach-liam' },
    { parentSlug: 'parent-daniel', coachSlug: 'coach-noah' },
    { parentSlug: 'parent-marcus', coachSlug: 'coach-chloe' },
  ];

  for (const [index, seed] of directThreadSeed.entries()) {
    const threadId = deterministicId('thr', `${seed.parentSlug}-${seed.coachSlug}`);
    const parentId = userIdFromSlug(seed.parentSlug);
    const coachId = userIdFromSlug(seed.coachSlug);

    push(tables, 'messageThreads', {
      id: threadId,
      threadType: 'DIRECT',
      clubId: null,
      communityGroupId: null,
      groupSessionId: null,
      bookingId: bookingIdFromSeed(`${athletes[index].slug}-upcoming`),
      title: null,
      lastMessageAt: toIso({ days: -1, hours: 1 }),
      createdByUserId: parentId,
      updatedByUserId: coachId,
      version: 1,
      createdAt: toIso({ days: -12 }),
      updatedAt: toIso({ days: -1 }),
      deletedAt: null,
    });

    push(tables, 'messageParticipants', {
      id: deterministicId('mpr', `${threadId}-${seed.parentSlug}`),
      messageThreadId: threadId,
      userId: parentId,
      role: 'member',
      lastReadAt: toIso({ days: -1, hours: 2 }),
      muted: false,
      joinedAt: toIso({ days: -12 }),
      leftAt: null,
    });

    push(tables, 'messageParticipants', {
      id: deterministicId('mpr', `${threadId}-${seed.coachSlug}`),
      messageThreadId: threadId,
      userId: coachId,
      role: 'member',
      lastReadAt: toIso({ days: -1, hours: 2 }),
      muted: false,
      joinedAt: toIso({ days: -12 }),
      leftAt: null,
    });

    const parentMessageId = deterministicId('msg', `${threadId}-p`);
    const coachMessageId = deterministicId('msg', `${threadId}-c`);

    push(tables, 'messages', {
      id: parentMessageId,
      messageThreadId: threadId,
      senderUserId: parentId,
      content: 'Can we review progress before next session?',
      attachmentsJson: [],
      editedAt: null,
      deletedAt: null,
      createdAt: toIso({ days: -1, hours: 1 }),
      updatedAt: toIso({ days: -1, hours: 1 }),
    });

    push(tables, 'messages', {
      id: coachMessageId,
      messageThreadId: threadId,
      senderUserId: coachId,
      content: 'Yes, I will send notes and targets tonight.',
      attachmentsJson: [],
      editedAt: null,
      deletedAt: null,
      createdAt: toIso({ days: -1, hours: 2 }),
      updatedAt: toIso({ days: -1, hours: 2 }),
    });

    for (const recipientId of [parentId, coachId]) {
      push(tables, 'messageReceipts', {
        id: deterministicId('mrc', `${parentMessageId}-${recipientId}`),
        messageId: parentMessageId,
        userId: recipientId,
        deliveredAt: toIso({ days: -1, hours: 1, minutes: 1 }),
        readAt: recipientId === parentId ? null : toIso({ days: -1, hours: 1, minutes: 10 }),
        createdAt: toIso({ days: -1, hours: 1, minutes: 1 }),
        updatedAt: toIso({ days: -1, hours: 1, minutes: 10 }),
      });

      push(tables, 'messageReceipts', {
        id: deterministicId('mrc', `${coachMessageId}-${recipientId}`),
        messageId: coachMessageId,
        userId: recipientId,
        deliveredAt: toIso({ days: -1, hours: 2, minutes: 1 }),
        readAt: toIso({ days: -1, hours: 2, minutes: 12 }),
        createdAt: toIso({ days: -1, hours: 2, minutes: 1 }),
        updatedAt: toIso({ days: -1, hours: 2, minutes: 12 }),
      });
    }
  }

  for (const [index, user] of tables.users.entries()) {
    push(tables, 'notifications', {
      id: deterministicId('nfn', `${user.id}-welcome`),
      userId: user.id,
      type: 'WELCOME',
      title: 'Marketplace data seed active',
      body: 'Your environment contains linked marketplace test data.',
      status: 'READ',
      sourceType: 'system',
      sourceId: DATASET_VERSION,
      deepLink: '/notifications',
      metadataJson: {
        seedVersion: DATASET_VERSION,
      },
      createdAt: toIso({ days: -1, hours: index % 5 }),
      updatedAt: toIso({ days: -1, hours: index % 5 }),
      readAt: toIso({ days: -1, hours: (index % 5) + 1 }),
      dismissedAt: null,
    });
  }

  for (const bookingSeed of bookingSeeds.slice(0, 5)) {
    push(tables, 'notifications', {
      id: deterministicId('nfn', `${bookingSeed.upcomingBookingId}-reminder`),
      userId: bookingSeed.bookedByUserId,
      type: 'BOOKING_REMINDER',
      title: 'Upcoming session reminder',
      body: `${bookingSeed.athlete.displayName} has a session tomorrow.`,
      status: 'UNREAD',
      sourceType: 'booking',
      sourceId: bookingSeed.upcomingBookingId,
      deepLink: `/bookings/${bookingSeed.upcomingBookingId}`,
      metadataJson: {
        athleteId: athleteIdFromSlug(bookingSeed.athlete.slug),
      },
      createdAt: toIso({ days: 1 }),
      updatedAt: toIso({ days: 1 }),
      readAt: null,
      dismissedAt: null,
    });
  }

  for (const [index, thread] of tables.messageThreads.slice(0, 3).entries()) {
    const parentParticipants = tables.messageParticipants
      .filter((participant) => participant.messageThreadId === thread.id)
      .map((participant) => participant.userId)
      .filter((id) => tables.userRoleMemberships.some((role) => role.userId === id && role.role === 'parent'));
    if (parentParticipants.length === 0) continue;

    push(tables, 'mutedSources', {
      id: deterministicId('mut', thread.id),
      userId: parentParticipants[0],
      sourceType: 'thread',
      sourceId: thread.id,
      reason: index === 0 ? 'high-volume-thread' : 'temporary-focus-mode',
      mutedAt: toIso({ days: -1 }),
      unmutedAt: null,
    });
  }

  push(tables, 'accessGrants', {
    id: deterministicId('grt', 'amelia-to-sophia-session-note'),
    grantorUserId: userIdFromSlug('coach-amelia'),
    granteeUserId: userIdFromSlug('coach-sophia'),
    resourceType: 'session_note',
    resourceId: deterministicId('snt', bookingIdFromSeed('alfie-barton-completed')),
    constraintsJson: {
      athleteId: athleteIdFromSlug('alfie-barton'),
    },
    metadataJson: {
      reason: 'Coach shadowing handover',
    },
    expiresAt: toIso({ days: 60 }),
    revokedAt: null,
    revokedByUserId: null,
    revokeReason: null,
    createdAt: toIso({ days: -3 }),
    updatedAt: toIso({ days: -3 }),
  });

  push(tables, 'accessGrantScopes', {
    id: deterministicId('grs', 'amelia-to-sophia-scope-1'),
    accessGrantId: deterministicId('grt', 'amelia-to-sophia-session-note'),
    scope: 'session_note:read',
    createdAt: toIso({ days: -3 }),
  });
  push(tables, 'accessGrantScopes', {
    id: deterministicId('grs', 'amelia-to-sophia-scope-2'),
    accessGrantId: deterministicId('grt', 'amelia-to-sophia-session-note'),
    scope: 'athlete_progress:read',
    createdAt: toIso({ days: -3 }),
  });

  push(tables, 'safeguardingIncidents', {
    id: deterministicId('saf', 'incident-open-1'),
    clubId: clubIdFromSlug('riverside-fc'),
    athleteId: athleteIdFromSlug('maisie-barton'),
    reportedByUserId: userIdFromSlug('coach-amelia'),
    assignedToUserId: userIdFromSlug('security-lead'),
    status: 'IN_REVIEW',
    severity: 'HIGH',
    title: 'Unsafe challenge reported during training game',
    summary: 'Athlete reported repeated unsafe contact from peer during drill.',
    detailsEncrypted: 'enc_incident_open_1',
    occurredAt: toIso({ days: -2, hours: 1 }),
    createdAt: toIso({ days: -2, hours: 2 }),
    updatedAt: toIso({ days: -1 }),
    closedAt: null,
    deletedAt: null,
  });

  push(tables, 'safeguardingIncidents', {
    id: deterministicId('saf', 'incident-closed-1'),
    clubId: clubIdFromSlug('northbridge-united'),
    athleteId: athleteIdFromSlug('isla-reed'),
    reportedByUserId: userIdFromSlug('coach-noah'),
    assignedToUserId: userIdFromSlug('security-lead'),
    status: 'RESOLVED',
    severity: 'MEDIUM',
    title: 'Medical inhaler protocol reminder',
    summary: 'Guardian and coach aligned on pre-session inhaler checks.',
    detailsEncrypted: 'enc_incident_closed_1',
    occurredAt: toIso({ days: -20 }),
    createdAt: toIso({ days: -20 }),
    updatedAt: toIso({ days: -10 }),
    closedAt: toIso({ days: -10 }),
    deletedAt: null,
  });

  push(tables, 'safeguardingIncidentActions', {
    id: deterministicId('sac', 'incident-open-action-1'),
    safeguardingIncidentId: deterministicId('saf', 'incident-open-1'),
    actorUserId: userIdFromSlug('security-lead'),
    actionType: 'ASSIGNED_REVIEW',
    note: 'Safeguarding lead assigned and guardian notified.',
    metadataJson: {
      notifyGuardian: true,
    },
    occurredAt: toIso({ days: -1, hours: 1 }),
  });
  push(tables, 'safeguardingIncidentActions', {
    id: deterministicId('sac', 'incident-closed-action-1'),
    safeguardingIncidentId: deterministicId('saf', 'incident-closed-1'),
    actorUserId: userIdFromSlug('security-lead'),
    actionType: 'CLOSED',
    note: 'Resolution confirmed with family and coach.',
    metadataJson: {
      closureReason: 'protocol-updated',
    },
    occurredAt: toIso({ days: -10 }),
  });

  for (const [index, booking] of tables.bookings.slice(0, 12).entries()) {
    push(tables, 'auditEvents', {
      id: deterministicId('aev', `booking-${booking.id}`),
      occurredAt: toIso({ days: -5 + index }),
      requestId: deterministicId('req', `audit-${booking.id}`),
      actorUserId: booking.updatedByUserId,
      actingRole: 'coach',
      action: 'booking.update',
      resourceType: 'booking',
      resourceId: booking.id,
      subjectUserId: booking.bookedByUserId,
      result: 'SUCCESS',
      sensitiveRead: false,
      ipHash: deterministicId('iph', `audit-${booking.id}`),
      metadataJson: {
        status: booking.status,
      },
    });
  }

  push(tables, 'securityEvents', {
    id: deterministicId('sev', 'login-anomaly'),
    occurredAt: toIso({ days: -1 }),
    requestId: deterministicId('req', 'security-login-anomaly'),
    userId: userIdFromSlug('parent-olivia'),
    sessionId: deterministicId('ses', 'parent-olivia'),
    eventType: 'LOGIN_GEO_MISMATCH',
    severity: 'medium',
    message: 'Login location differs from recent pattern.',
    metadataJson: {
      country: 'GB',
    },
  });
  push(tables, 'securityEvents', {
    id: deterministicId('sev', 'rate-limit-trigger'),
    occurredAt: toIso({ days: -1, hours: 1 }),
    requestId: deterministicId('req', 'security-rate-limit'),
    userId: null,
    sessionId: null,
    eventType: 'RATE_LIMIT_TRIGGERED',
    severity: 'low',
    message: 'Burst write attempts throttled.',
    metadataJson: {
      route: '/v1/bookings',
    },
  });

  push(tables, 'retentionPolicies', {
    id: deterministicId('rtp', 'audit-events-policy'),
    tableName: 'audit_events',
    retentionDays: 2555,
    archiveBeforeDelete: true,
    allowHardDelete: false,
    legalHoldAware: true,
    active: true,
    configJson: {
      partitioning: 'monthly',
    },
    createdAt: toIso({ days: -90 }),
    updatedAt: toIso({ days: -2 }),
  });
  push(tables, 'retentionPolicies', {
    id: deterministicId('rtp', 'notifications-policy'),
    tableName: 'notifications',
    retentionDays: 365,
    archiveBeforeDelete: true,
    allowHardDelete: false,
    legalHoldAware: true,
    active: true,
    configJson: {
      archiveOnlyUnread: false,
    },
    createdAt: toIso({ days: -90 }),
    updatedAt: toIso({ days: -2 }),
  });

  push(tables, 'retentionRuns', {
    id: deterministicId('rtr', 'retention-run-1'),
    retentionPolicyId: deterministicId('rtp', 'audit-events-policy'),
    status: 'COMPLETED',
    dryRun: true,
    startedAt: toIso({ days: -1, hours: 4 }),
    finishedAt: toIso({ days: -1, hours: 4, minutes: 30 }),
    summaryJson: {
      eligibleRows: 0,
      archivedRows: 0,
    },
    errorText: null,
  });

  push(tables, 'legalHolds', {
    id: deterministicId('lgh', 'hold-incident-open'),
    scopeType: 'incident',
    scopeId: deterministicId('saf', 'incident-open-1'),
    reason: 'Safeguarding review in progress',
    placedByUserId: userIdFromSlug('security-lead'),
    releasedByUserId: null,
    placedAt: toIso({ days: -1 }),
    releasedAt: null,
    metadataJson: {
      caseOwner: userIdFromSlug('security-lead'),
    },
  });

  push(tables, 'dataDeletionRequests', {
    id: deterministicId('ddr', 'request-parent-james'),
    requesterUserId: userIdFromSlug('parent-james'),
    status: 'PENDING',
    requestedAt: toIso({ days: -3 }),
    scheduledDeletionAt: toIso({ days: 27 }),
    cancelledAt: null,
    reason: 'Parent requested account review for data export/deletion.',
    metadataJson: {
      exportRequested: true,
    },
  });

  push(tables, 'featureFlags', {
    id: deterministicId('flg', 'marketplace-seed-mode'),
    key: 'marketplace_seed_mode',
    description: 'Enables linked marketplace seed workflows for API testing.',
    enabledByDefault: true,
    configJson: {
      source: 'seed-kit',
      version: DATASET_VERSION,
    },
    createdAt: toIso({ days: -7 }),
    updatedAt: toIso({ days: -1 }),
  });
  push(tables, 'featureFlags', {
    id: deterministicId('flg', 'csv-roundtrip-enabled'),
    key: 'csv_roundtrip_enabled',
    description: 'Allows CSV edits to be written back into linked dataset JSON.',
    enabledByDefault: true,
    configJson: {
      command: 'seed:marketplace:write-back',
    },
    createdAt: toIso({ days: -7 }),
    updatedAt: toIso({ days: -1 }),
  });

  push(tables, 'featureFlagOverrides', {
    id: deterministicId('fov', 'marketplace-seed-dev'),
    featureFlagId: deterministicId('flg', 'marketplace-seed-mode'),
    scopeType: 'env',
    scopeId: 'development',
    enabled: true,
    configJson: {
      region: 'local',
    },
    createdByUserId: userIdFromSlug('admin-clara'),
    updatedByUserId: userIdFromSlug('admin-clara'),
    version: 1,
    createdAt: toIso({ days: -2 }),
    updatedAt: toIso({ days: -1 }),
    deletedAt: null,
  });

  push(tables, 'outboxEvents', {
    id: deterministicId('obx', 'booking-confirmed-1'),
    aggregateType: 'booking',
    aggregateId: bookingIdFromSeed('alfie-barton-upcoming'),
    eventType: 'BOOKING_CONFIRMED',
    payloadJson: {
      bookingId: bookingIdFromSeed('alfie-barton-upcoming'),
      coachUserId: userIdFromSlug('coach-amelia'),
    },
    status: 'PENDING',
    attempts: 0,
    nextAttemptAt: toIso({ days: 0, hours: 1 }),
    lastError: null,
    createdAt: toIso({ days: 0 }),
    updatedAt: toIso({ days: 0 }),
    processedAt: null,
  });

  push(tables, 'outboxEvents', {
    id: deterministicId('obx', 'invite-accepted-1'),
    aggregateType: 'invite',
    aggregateId: deterministicId('inv', `${groupSessionIdFromSeed('riverside-u11-upcoming')}-alfie-barton`),
    eventType: 'INVITE_ACCEPTED',
    payloadJson: {
      inviteId: deterministicId('inv', `${groupSessionIdFromSeed('riverside-u11-upcoming')}-alfie-barton`),
      athleteId: athleteIdFromSlug('alfie-barton'),
    },
    status: 'PENDING',
    attempts: 0,
    nextAttemptAt: toIso({ days: 0, hours: 2 }),
    lastError: null,
    createdAt: toIso({ days: 0 }),
    updatedAt: toIso({ days: 0 }),
    processedAt: null,
  });

  for (const [parentIndex, parent] of parentBlueprints.entries()) {
    const athleteSeed = athletes[parentIndex % athletes.length];
    push(tables, 'idempotencyKeys', {
      id: deterministicId('idk', `${parent.slug}-booking`),
      userId: userIdFromSlug(parent.slug),
      endpointKey: 'POST:/v1/bookings',
      idempotencyKey: deterministicId('key', `${parent.slug}-booking`),
      requestHash: deterministicId('hsh', `${parent.slug}-booking`),
      responseStatus: 201,
      responseBodyJson: {
        bookingId: bookingIdFromSeed(`${athleteSeed.slug}-upcoming`),
      },
      createdAt: toIso({ days: -2 }),
      expiresAt: toIso({ days: 5 }),
    });
  }

  return {
    version: DATASET_VERSION,
    generatedAt: new Date().toISOString(),
    timezone: 'UTC',
    tableOrder: TABLE_ORDER,
    tables,
  };
}

function getPrimaryKeyField(tableName) {
  return PRIMARY_KEY_BY_TABLE[tableName] ?? 'id';
}

function isNullLike(value) {
  return value === null || value === undefined || value === '';
}

function validateDataset(dataset) {
  const errors = [];
  const tableRecords = dataset.tables;
  const pkSets = {};

  for (const tableName of dataset.tableOrder) {
    const rows = tableRecords[tableName] ?? [];
    const pkField = getPrimaryKeyField(tableName);
    const seen = new Set();
    for (const row of rows) {
      const pk = row[pkField];
      if (isNullLike(pk)) {
        errors.push(`[${tableName}] missing primary key field "${pkField}"`);
        continue;
      }
      if (seen.has(pk)) {
        errors.push(`[${tableName}] duplicate primary key "${pk}"`);
      }
      seen.add(pk);
    }
    pkSets[tableName] = seen;
  }

  for (const tableName of dataset.tableOrder) {
    const rows = tableRecords[tableName] ?? [];
    for (const row of rows) {
      for (const [fieldName, refTable] of Object.entries(FK_FIELD_TO_TABLE)) {
        if (!(fieldName in row)) continue;
        const value = row[fieldName];
        if (isNullLike(value)) continue;
        const targetSet = pkSets[refTable];
        if (!targetSet) continue;
        if (!targetSet.has(value)) {
          const idField = getPrimaryKeyField(tableName);
          const rowId = row[idField] ?? '<unknown>';
          errors.push(
            `[${tableName}] ${fieldName}="${value}" on row "${rowId}" does not exist in ${refTable}`,
          );
        }
      }
    }
  }

  errors.push(...validateSemanticCoverage(dataset));

  return {
    ok: errors.length === 0,
    errors,
  };
}

function validateSemanticCoverage(dataset) {
  const errors = [];
  const tableRecords = dataset.tables ?? {};
  const users = Array.isArray(tableRecords.users) ? tableRecords.users : [];
  const roleMemberships = Array.isArray(tableRecords.userRoleMemberships)
    ? tableRecords.userRoleMemberships
    : [];
  const familyMemberships = Array.isArray(tableRecords.familyMemberships)
    ? tableRecords.familyMemberships
    : [];
  const guardianChildLinks = Array.isArray(tableRecords.guardianChildLinks)
    ? tableRecords.guardianChildLinks
    : [];
  const clubMemberships = Array.isArray(tableRecords.clubMemberships)
    ? tableRecords.clubMemberships
    : [];
  const coachProfiles = Array.isArray(tableRecords.coachProfiles) ? tableRecords.coachProfiles : [];
  const coachingOfferings = Array.isArray(tableRecords.coachingOfferings)
    ? tableRecords.coachingOfferings
    : [];
  const availabilityTemplates = Array.isArray(tableRecords.availabilityTemplates)
    ? tableRecords.availabilityTemplates
    : [];
  const availabilityOverrides = Array.isArray(tableRecords.availabilityOverrides)
    ? tableRecords.availabilityOverrides
    : [];
  const invoices = Array.isArray(tableRecords.invoices) ? tableRecords.invoices : [];

  const rolesByUserId = new Map();
  for (const row of roleMemberships) {
    const userId = row.userId;
    const role = row.role;
    if (isNullLike(userId) || isNullLike(role)) {
      continue;
    }
    if (!rolesByUserId.has(userId)) {
      rolesByUserId.set(userId, new Set());
    }
    rolesByUserId.get(userId).add(role);
  }

  const parentUserIds = [...rolesByUserId.entries()]
    .filter(([, roles]) => roles.has('parent'))
    .map(([userId]) => userId);
  const parentUserIdsWithKids = new Set(
    guardianChildLinks
      .map((row) => row.guardianUserId)
      .filter((userId) => !isNullLike(userId)),
  );
  const parentsWithKids = parentUserIds.filter((userId) => parentUserIdsWithKids.has(userId)).length;
  const parentsWithoutKids = parentUserIds.length - parentsWithKids;

  if (parentUserIds.length === 0) {
    errors.push('[coverage] expected at least one parent user');
  }
  if (parentsWithKids === 0) {
    errors.push('[coverage] expected at least one parent linked to athlete(s)');
  }
  if (parentsWithoutKids === 0) {
    errors.push('[coverage] expected at least one parent with no linked athletes');
  }

  const familyMemberUserIds = new Set(
    familyMemberships
      .map((row) => row.userId)
      .filter((userId) => !isNullLike(userId)),
  );
  const clubMemberUserIds = new Set(
    clubMemberships
      .map((row) => row.userId)
      .filter((userId) => !isNullLike(userId)),
  );
  const memberUserIds = [...rolesByUserId.entries()]
    .filter(([, roles]) => roles.has('member'))
    .map(([userId]) => userId);

  const standaloneMembers = memberUserIds.filter(
    (userId) => !familyMemberUserIds.has(userId) && !clubMemberUserIds.has(userId),
  ).length;
  const clubLinkedMembers = memberUserIds.filter((userId) => clubMemberUserIds.has(userId)).length;

  if (standaloneMembers === 0) {
    errors.push('[coverage] expected at least one standalone member (no family and no club)');
  }
  if (clubLinkedMembers === 0) {
    errors.push('[coverage] expected at least one club-linked member user');
  }

  const coachUserIds = new Set(
    coachProfiles
      .map((row) => row.userId)
      .filter((userId) => !isNullLike(userId)),
  );
  if (coachUserIds.size < 4) {
    errors.push(`[coverage] expected at least 4 coaches, found ${coachUserIds.size}`);
  }

  const coachOfferingCounts = new Map();
  for (const row of coachingOfferings) {
    const coachUserId = row.coachUserId;
    if (isNullLike(coachUserId)) {
      continue;
    }
    coachOfferingCounts.set(coachUserId, (coachOfferingCounts.get(coachUserId) ?? 0) + 1);
  }

  const coachAvailabilityWindows = new Map();
  for (const row of availabilityTemplates) {
    const coachUserId = row.coachUserId;
    const dayOfWeek = row.dayOfWeek;
    const startTimeLocal = row.startTimeLocal;
    const endTimeLocal = row.endTimeLocal;
    if (
      isNullLike(coachUserId)
      || isNullLike(dayOfWeek)
      || isNullLike(startTimeLocal)
      || isNullLike(endTimeLocal)
    ) {
      continue;
    }
    const key = `${dayOfWeek}:${startTimeLocal}-${endTimeLocal}`;
    if (!coachAvailabilityWindows.has(coachUserId)) {
      coachAvailabilityWindows.set(coachUserId, new Set());
    }
    coachAvailabilityWindows.get(coachUserId).add(key);
  }

  for (const coachUserId of coachUserIds) {
    if ((coachOfferingCounts.get(coachUserId) ?? 0) < 1) {
      errors.push(`[coverage] coach ${coachUserId} has no offerings`);
    }
    if ((coachAvailabilityWindows.get(coachUserId)?.size ?? 0) < 1) {
      errors.push(`[coverage] coach ${coachUserId} has no availability windows`);
    }
  }

  const coachesWithMultipleOfferings = [...coachUserIds].filter(
    (coachUserId) => (coachOfferingCounts.get(coachUserId) ?? 0) >= 2,
  ).length;
  const coachesWithMultipleAvailabilityWindows = [...coachUserIds].filter(
    (coachUserId) => (coachAvailabilityWindows.get(coachUserId)?.size ?? 0) >= 2,
  ).length;
  const coachesWithOverrides = new Set(
    availabilityOverrides
      .map((row) => row.coachUserId)
      .filter((coachUserId) => !isNullLike(coachUserId)),
  ).size;

  if (coachesWithMultipleOfferings === 0) {
    errors.push('[coverage] expected at least one coach with multiple offerings');
  }
  if (coachesWithMultipleAvailabilityWindows === 0) {
    errors.push('[coverage] expected at least one coach with multiple availability windows');
  }
  if (coachesWithOverrides === 0) {
    errors.push('[coverage] expected at least one coach with availability overrides');
  }

  const offeringServiceTypes = new Set(
    coachingOfferings
      .map((row) => row.serviceType)
      .filter((serviceType) => !isNullLike(serviceType)),
  );
  const offeringDurations = new Set(
    coachingOfferings
      .map((row) => row.durationMinutes)
      .filter((duration) => !isNullLike(duration)),
  );
  const availabilityWindowSet = new Set(
    availabilityTemplates
      .map((row) => {
        if (isNullLike(row.dayOfWeek) || isNullLike(row.startTimeLocal) || isNullLike(row.endTimeLocal)) {
          return null;
        }
        return `${row.dayOfWeek}:${row.startTimeLocal}-${row.endTimeLocal}`;
      })
      .filter((value) => !isNullLike(value)),
  );
  const availabilityDays = new Set(
    availabilityTemplates
      .map((row) => row.dayOfWeek)
      .filter((dayOfWeek) => !isNullLike(dayOfWeek)),
  );

  if (offeringServiceTypes.size < 2) {
    errors.push(`[coverage] expected at least 2 offering service types, found ${offeringServiceTypes.size}`);
  }
  if (offeringDurations.size < 2) {
    errors.push(`[coverage] expected at least 2 offering durations, found ${offeringDurations.size}`);
  }
  if (availabilityWindowSet.size < 8) {
    errors.push(`[coverage] expected at least 8 unique availability windows, found ${availabilityWindowSet.size}`);
  }
  if (availabilityDays.size < 5) {
    errors.push(`[coverage] expected availability coverage across at least 5 days, found ${availabilityDays.size}`);
  }

  const paidInvoiceCount = invoices.filter((row) => row.status === 'PAID').length;
  const outstandingInvoiceCount = invoices.filter((row) => row.status === 'SENT').length;
  if (paidInvoiceCount === 0) {
    errors.push('[coverage] expected at least one paid invoice');
  }
  if (outstandingInvoiceCount === 0) {
    errors.push('[coverage] expected at least one outstanding (SENT) invoice');
  }

  const userIdSet = new Set(
    users
      .map((row) => row.id)
      .filter((id) => !isNullLike(id)),
  );
  if (userIdSet.size === 0) {
    errors.push('[coverage] expected non-empty users table');
  }

  return errors;
}

function detectColumnType(rows, column) {
  for (const row of rows) {
    const value = row[column];
    if (value === null || value === undefined) continue;
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value) || typeof value === 'object') return 'json';
    return 'string';
  }
  return 'string';
}

function buildManifest(dataset) {
  const tables = {};
  for (const tableName of dataset.tableOrder) {
    const rows = dataset.tables[tableName] ?? [];
    const columnsSet = new Set();
    for (const row of rows) {
      for (const key of Object.keys(row)) columnsSet.add(key);
    }
    const columns = Array.from(columnsSet).sort((a, b) => a.localeCompare(b));
    const nullable = [];
    const typeHints = {};

    for (const column of columns) {
      typeHints[column] = detectColumnType(rows, column);
      if (rows.some((row) => row[column] === null || row[column] === undefined)) {
        nullable.push(column);
      }
    }

    tables[tableName] = {
      csvFile: path.posix.join(CSV_DIR_NAME, tableToCsvFileName(tableName)),
      primaryKey: getPrimaryKeyField(tableName),
      columns,
      typeHints,
      nullable,
    };
  }

  return {
    version: dataset.version,
    generatedAt: dataset.generatedAt,
    tableOrder: dataset.tableOrder,
    tables,
  };
}

function toCsvCell(value) {
  if (value === null || value === undefined) return '';
  const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/["\n,\r]/.test(serialized)) {
    return `"${serialized.replace(/"/g, '""')}"`;
  }
  return serialized;
}

function tableToCsv(columns, rows) {
  const lines = [];
  lines.push(columns.map(toCsvCell).join(','));
  for (const row of rows) {
    lines.push(columns.map((column) => toCsvCell(row[column])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

async function writeDatasetFiles(dataset, outputDir) {
  const manifest = buildManifest(dataset);
  const csvDir = path.join(outputDir, CSV_DIR_NAME);
  await fs.mkdir(csvDir, { recursive: true });

  for (const tableName of dataset.tableOrder) {
    const rows = dataset.tables[tableName] ?? [];
    const columns = manifest.tables[tableName].columns;
    const csv = tableToCsv(columns, rows);
    await fs.writeFile(path.join(outputDir, manifest.tables[tableName].csvFile), csv, 'utf8');
  }

  await fs.writeFile(path.join(outputDir, DATASET_PATH), `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outputDir, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const summary = {
    version: dataset.version,
    generatedAt: dataset.generatedAt,
    tableCount: dataset.tableOrder.length,
    rowCount: dataset.tableOrder.reduce((sum, table) => sum + (dataset.tables[table]?.length ?? 0), 0),
    rowsByTable: Object.fromEntries(
      dataset.tableOrder.map((table) => [table, dataset.tables[table]?.length ?? 0]),
    ),
  };
  await fs.writeFile(path.join(outputDir, SUMMARY_PATH), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  return summary;
}

function parseCsv(content) {
  const rows = [];
  let cell = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some((cellValue) => cellValue !== ''));
}

function decodeCell(rawValue, typeHint, nullable) {
  if (rawValue === '') {
    return nullable ? null : '';
  }
  if (typeHint === 'boolean') {
    return parseBooleanish(rawValue, false);
  }
  if (typeHint === 'number') {
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) return parsed;
    return rawValue;
  }
  if (typeHint === 'json') {
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }
  return rawValue;
}

async function readDatasetFromCsv(outputDir) {
  const manifestRaw = await fs.readFile(path.join(outputDir, MANIFEST_PATH), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const tables = {};

  for (const tableName of manifest.tableOrder) {
    const tableManifest = manifest.tables[tableName];
    const csvPath = path.join(outputDir, tableManifest.csvFile);
    const csvRaw = await fs.readFile(csvPath, 'utf8');
    const rows = parseCsv(csvRaw);
    if (rows.length === 0) {
      tables[tableName] = [];
      continue;
    }

    const [header, ...body] = rows;
    const rowsForTable = body.map((cells) => {
      const row = {};
      for (let index = 0; index < header.length; index += 1) {
        const column = header[index];
        const value = cells[index] ?? '';
        row[column] = decodeCell(
          value,
          tableManifest.typeHints[column] ?? 'string',
          tableManifest.nullable.includes(column),
        );
      }
      return row;
    });

    tables[tableName] = rowsForTable;
  }

  return {
    version: manifest.version,
    generatedAt: new Date().toISOString(),
    timezone: 'UTC',
    tableOrder: manifest.tableOrder,
    tables,
  };
}

async function loadJsonDataset(outputDir) {
  const raw = await fs.readFile(path.join(outputDir, DATASET_PATH), 'utf8');
  return JSON.parse(raw);
}

function printSummary(summary) {
  const tablePreview = Object.entries(summary.rowsByTable)
    .filter(([, count]) => count > 0)
    .slice(0, 12)
    .map(([table, count]) => `${table}:${count}`)
    .join(', ');

  console.log(`[marketplace-seed-kit] version=${summary.version}`);
  console.log(`[marketplace-seed-kit] tables=${summary.tableCount}, rows=${summary.rowCount}`);
  console.log(`[marketplace-seed-kit] sample=${tablePreview}`);
}

function parseCli() {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'generate';

  const outFlagIndex = args.findIndex((arg) => arg === '--out');
  const outputDir = outFlagIndex >= 0 && args[outFlagIndex + 1]
    ? path.resolve(args[outFlagIndex + 1])
    : DEFAULT_OUTPUT_DIR;

  return {
    command,
    outputDir,
  };
}

async function runGenerate(outputDir) {
  const dataset = buildLinkedDataset();
  const validation = validateDataset(dataset);
  if (!validation.ok) {
    throw new Error(`Validation failed:\n${validation.errors.join('\n')}`);
  }
  const summary = await writeDatasetFiles(dataset, outputDir);
  printSummary(summary);
}

async function runValidate(outputDir) {
  const dataset = await loadJsonDataset(outputDir);
  const validation = validateDataset(dataset);
  if (!validation.ok) {
    throw new Error(`Validation failed:\n${validation.errors.join('\n')}`);
  }
  const summaryRaw = await fs.readFile(path.join(outputDir, SUMMARY_PATH), 'utf8');
  printSummary(JSON.parse(summaryRaw));
  console.log('[marketplace-seed-kit] validation=ok');
}

async function runWriteBack(outputDir) {
  const dataset = await readDatasetFromCsv(outputDir);
  const validation = validateDataset(dataset);
  if (!validation.ok) {
    throw new Error(`Validation failed after CSV write-back:\n${validation.errors.join('\n')}`);
  }
  const summary = await writeDatasetFiles(dataset, outputDir);
  printSummary(summary);
  console.log('[marketplace-seed-kit] write-back=ok');
}

async function main() {
  const { command, outputDir } = parseCli();

  if (!isSeedingEnabled()) {
    console.log('[marketplace-seed-kit] skipped because API_MARKETPLACE_SEED_ENABLED is false');
    return;
  }

  if (!['generate', 'validate', 'write-back'].includes(command)) {
    throw new Error(`Unknown command "${command}". Use generate | validate | write-back.`);
  }

  if (command === 'generate') {
    await runGenerate(outputDir);
    return;
  }

  if (command === 'validate') {
    await runValidate(outputDir);
    return;
  }

  if (command === 'write-back') {
    await runWriteBack(outputDir);
  }
}

main().catch((error) => {
  console.error('[marketplace-seed-kit] failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
