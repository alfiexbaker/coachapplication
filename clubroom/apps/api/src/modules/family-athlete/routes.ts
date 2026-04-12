import crypto from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  athleteIdSchema,
  consentsResponseSchema,
  consentTypeSchema,
  createInjuryRequestSchema,
  emergencyContactsResponseSchema,
  familyIdSchema,
  injuryIdSchema,
  injuriesResponseSchema,
  injuryRecordSchema,
  medicalRecordResponseSchema,
  upsertConsentsRequestSchema,
  updateEmergencyContactsRequestSchema,
  updateInjuryRequestSchema,
  updateMedicalRecordRequestSchema,
  type ConsentsResponse,
  type EmergencyContactsResponse,
  type InjuryRecord,
  type MedicalRecordResponse,
} from '@clubroom/shared-contracts';
import { forbidden, notFound } from '../../lib/http-errors.js';
import { resolveFamilyRepository } from '../../repositories/p0/family-repository.js';
import {
  assertCanReadAthleteHealth,
  assertCanReadAthleteMedical,
  assertCanWriteAthleteHealth,
  assertCanWriteAthleteMedical,
  isPrivilegedAdminAuth,
} from '../../lib/authz.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';

const injuriesByAthleteId = new Map<string, InjuryRecord[]>();
const injuriesById = new Map<string, InjuryRecord>();
const medicalByAthleteId = new Map<string, MedicalRecordResponse>();
const emergencyContactsByAthleteId = new Map<string, EmergencyContactsResponse>();
const consentsByAthleteId = new Map<string, ConsentsResponse>();
const athleteProfilesByAthleteId = new Map<string, AthleteProfileState>();

export function resetFamilyAthleteRouteStateForTests(): void {
  athleteProfilesByAthleteId.clear();
}

type SeedRow = Record<string, unknown>;

type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
type Relationship = 'SON' | 'DAUGHTER' | 'WARD' | 'GRANDCHILD' | 'OTHER';

interface DisabilityRecord {
  id: string;
  type: string;
  diagnosisDate?: string;
  description?: string;
  supportRequired?: string;
  communicationPreferences?: string[];
  triggers?: string[];
  calmingStrategies?: string[];
}

interface SpecialNeedRecord {
  id: string;
  category: 'PHYSICAL' | 'LEARNING' | 'SENSORY' | 'BEHAVIORAL' | 'MEDICAL' | 'OTHER';
  name: string;
  description?: string;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE';
  accommodationsNeeded?: string[];
  parentHints?: string;
}

interface AthleteProfileState {
  athleteId: string;
  familyId: string;
  parentId: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  dateOfBirth?: string;
  gender: Gender;
  relationship: Relationship;
  primaryPosition?: string | null;
  photoUrl?: string;
  disabilities: DisabilityRecord[];
  specialNeeds: SpecialNeedRecord[];
  communicationNotes?: string;
  behavioralNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

function removeRowsWhere(rows: SeedRow[], predicate: (row: SeedRow) => boolean): void {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (predicate(rows[index])) {
      rows.splice(index, 1);
    }
  }
}

const disabilitySchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1),
  diagnosisDate: z.string().optional(),
  description: z.string().optional(),
  supportRequired: z.string().optional(),
  communicationPreferences: z.array(z.string()).optional(),
  triggers: z.array(z.string()).optional(),
  calmingStrategies: z.array(z.string()).optional(),
});

const specialNeedSchema = z.object({
  id: z.string().optional(),
  category: z.enum(['PHYSICAL', 'LEARNING', 'SENSORY', 'BEHAVIORAL', 'MEDICAL', 'OTHER']),
  name: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE']).optional(),
  accommodationsNeeded: z.array(z.string()).optional(),
  parentHints: z.string().optional(),
});

const createAthleteRequestSchema = z.object({
  familyId: familyIdSchema,
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  nickname: z.string().trim().optional(),
  dateOfBirth: z.string().trim().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).default('PREFER_NOT_TO_SAY'),
  relationship: z.enum(['SON', 'DAUGHTER', 'WARD', 'GRANDCHILD', 'OTHER']).default('OTHER'),
  primaryPosition: z.string().trim().nullable().optional(),
  photoUrl: z.string().trim().optional(),
  disabilities: z.array(disabilitySchema).optional(),
  specialNeeds: z.array(specialNeedSchema).optional(),
  communicationNotes: z.string().trim().optional(),
  behavioralNotes: z.string().trim().optional(),
});

const updateAthleteRequestSchema = createAthleteRequestSchema.omit({ familyId: true }).partial();

const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const seedNow = isoNow();
const seededInjuries: InjuryRecord[] = [
  injuryRecordSchema.parse({
    id: 'inj_seed-user1-ankle',
    athleteId: 'ath_user1',
    title: 'Left ankle strain',
    type: 'LEFT_ANKLE',
    severity: 'medium',
    status: 'recovering',
    reportedAt: '2026-02-24T10:00:00.000Z',
    expectedRecoveryDate: '2026-03-10T00:00:00.000Z',
    resolvedAt: null,
    notes: 'Injury logged from group roster flow test fixture.',
    createdByUserId: 'usr_coach1',
    createdAt: '2026-02-24T10:00:00.000Z',
    updatedAt: '2026-02-27T09:00:00.000Z',
  }),
  injuryRecordSchema.parse({
    id: 'inj_seed-user2-knee',
    athleteId: 'ath_user2',
    title: 'Right knee impact',
    type: 'RIGHT_KNEE',
    severity: 'high',
    status: 'active',
    reportedAt: '2026-02-28T16:30:00.000Z',
    expectedRecoveryDate: '2026-03-18T00:00:00.000Z',
    resolvedAt: null,
    notes: 'Fixture injury for health dashboard and detail testing.',
    createdByUserId: 'usr_parent1',
    createdAt: '2026-02-28T16:30:00.000Z',
    updatedAt: '2026-02-28T16:30:00.000Z',
  }),
];

for (const injury of seededInjuries) {
  injuriesById.set(injury.id, injury);
  const list = injuriesByAthleteId.get(injury.athleteId) ?? [];
  list.push(injury);
  injuriesByAthleteId.set(injury.athleteId, list);
}

medicalByAthleteId.set(
  'ath_user1',
  medicalRecordResponseSchema.parse({
    athleteId: 'ath_user1',
    conditions: ['asthma'],
    allergies: ['nuts'],
    medications: ['inhaler'],
    restrictions: ['Carry inhaler pitch-side'],
    doctorName: 'Dr. Patel',
    doctorPhone: '+442071234567',
    insuranceProvider: 'Bupa',
    insuranceNumber: 'BUPA-12345',
    emergencyNotes: 'Carry inhaler on match days.',
    senNotes: null,
    updatedAt: seedNow,
    updatedByUserId: 'usr_parent1',
  }),
);

emergencyContactsByAthleteId.set(
  'ath_user1',
  emergencyContactsResponseSchema.parse({
    athleteId: 'ath_user1',
    contacts: [
      {
        id: 'emc_seed-parent1',
        name: 'Chris Barton',
        relationship: 'parent',
        phone: '+447700900100',
        email: 'chris.barton@email.com',
        isPrimary: true,
        canPickup: true,
      },
    ],
    updatedAt: seedNow,
    updatedByUserId: 'usr_parent1',
  }),
);

consentsByAthleteId.set(
  'ath_user1',
  consentsResponseSchema.parse({
    athleteId: 'ath_user1',
    consents: [
      {
        type: 'PHOTO',
        granted: true,
        grantedAt: '2026-02-20T10:00:00.000Z',
        grantedBy: 'Chris Barton',
        expiryAt: '2027-02-01T00:00:00.000Z',
      },
      {
        type: 'VIDEO',
        granted: true,
        grantedAt: '2026-02-20T10:00:00.000Z',
        grantedBy: 'Chris Barton',
        expiryAt: '2027-02-01T00:00:00.000Z',
      },
      {
        type: 'SOCIAL_MEDIA',
        granted: false,
        grantedBy: '',
      },
      {
        type: 'EMERGENCY_TREATMENT',
        granted: true,
        grantedAt: '2026-02-20T10:00:00.000Z',
        grantedBy: 'Chris Barton',
        expiryAt: '2027-02-01T00:00:00.000Z',
      },
    ],
    updatedAt: seedNow,
    updatedByUserId: 'usr_parent1',
  }),
);

function splitDisplayName(displayName: string | undefined): { firstName: string; lastName: string } {
  const trimmed = displayName?.trim() ?? '';
  if (!trimmed) {
    return { firstName: 'Young', lastName: 'Athlete' };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? 'Young',
    lastName: parts.slice(1).join(' ') || parts[0] || 'Athlete',
  };
}

function ensureSeedFamilyWriteAccess(familyId: string, authUserId: string): void {
  if (hasSeedFamilyMembership(familyId, authUserId)) {
    return;
  }

  throw forbidden('Not allowed to manage this family');
}

function hasSeedFamilyMembership(familyId: string, authUserId: string): boolean {
  const store = getMarketplaceSeedStore();
  const memberships = asRows(store.tables.familyMemberships);
  return memberships.some(
    (row) =>
      asString(row.familyId) === familyId
      && asString(row.userId) === authUserId
      && !asString(row.deletedAt),
  );
}

function ensureCanReadAthleteProfile(
  request: FastifyRequest,
  athleteId: string,
  familyId: string,
): void {
  const authUserId = request.auth?.userId;
  if (!authUserId) {
    throw forbidden('Authenticated user is required');
  }
  if (isPrivilegedAdminAuth(request.auth) || hasSeedFamilyMembership(familyId, authUserId)) {
    return;
  }

  assertCanReadAthleteHealth(request, athleteId);
}

function resolveAthleteFamilyId(athleteId: string): string | null {
  for (const profile of athleteProfilesByAthleteId.values()) {
    if (profile.athleteId === athleteId) {
      return profile.familyId;
    }
  }

  const store = getMarketplaceSeedStore();
  const links = asRows(store.tables.guardianChildLinks);
  return asString(links.find((row) => asString(row.athleteId) === athleteId)?.familyId) ?? null;
}

function resolveParentIdForAthlete(athlete: SeedRow, familyId: string): string {
  const existing = athleteProfilesByAthleteId.get(asString(athlete.id) ?? '');
  if (existing?.parentId) {
    return existing.parentId;
  }

  const guardian = Array.isArray(athlete.guardians)
    ? (athlete.guardians as SeedRow[]).find((row) => asString(row.guardianUserId))
    : null;
  if (guardian) {
    return asString(guardian.guardianUserId) ?? '';
  }

  const store = getMarketplaceSeedStore();
  const family = asRows(store.tables.families).find((row) => asString(row.id) === familyId);
  return asString(family?.primaryGuardianUserId) ?? '';
}

function profileStateFromAthleteRow(athlete: SeedRow, familyId: string): AthleteProfileState {
  const athleteId = asString(athlete.id) ?? '';
  const existing = athleteProfilesByAthleteId.get(athleteId);
  if (existing) {
    return existing;
  }

  const name = splitDisplayName(asString(athlete.displayName));
  const nextState: AthleteProfileState = {
    athleteId,
    familyId,
    parentId: resolveParentIdForAthlete(athlete, familyId),
    firstName: name.firstName,
    lastName: name.lastName,
    nickname: undefined,
    dateOfBirth: asString(athlete.dateOfBirth),
    gender: 'PREFER_NOT_TO_SAY',
    relationship: 'OTHER',
    primaryPosition: null,
    photoUrl: asString(athlete.avatarUrl),
    disabilities: [],
    specialNeeds: [],
    communicationNotes: undefined,
    behavioralNotes: undefined,
    createdAt: asString(athlete.createdAt) ?? isoNow(),
    updatedAt: asString(athlete.updatedAt) ?? asString(athlete.createdAt) ?? isoNow(),
  };
  athleteProfilesByAthleteId.set(athleteId, nextState);
  return nextState;
}

function decorateFamilyAthlete(athlete: SeedRow, familyId: string): SeedRow {
  const state = profileStateFromAthleteRow(athlete, familyId);
  return {
    ...athlete,
    parentId: state.parentId,
    firstName: state.firstName,
    lastName: state.lastName,
    nickname: state.nickname ?? null,
    gender: state.gender,
    relationship: state.relationship,
    primaryPosition: state.primaryPosition ?? null,
    photoUrl: state.photoUrl ?? null,
    disabilities: state.disabilities,
    specialNeeds: state.specialNeeds,
    hasSpecialNeeds: state.disabilities.length > 0 || state.specialNeeds.length > 0,
    communicationNotes: state.communicationNotes ?? null,
    behavioralNotes: state.behavioralNotes ?? null,
  };
}

function buildAthleteProfileState(
  athleteId: string,
  familyId: string,
  parentId: string,
  input: z.infer<typeof createAthleteRequestSchema> | z.infer<typeof updateAthleteRequestSchema>,
  previous?: AthleteProfileState,
): AthleteProfileState {
  return {
    athleteId,
    familyId,
    parentId,
    firstName: input.firstName?.trim() ?? previous?.firstName ?? 'Young',
    lastName: input.lastName?.trim() ?? previous?.lastName ?? 'Athlete',
    nickname: input.nickname?.trim() || previous?.nickname,
    dateOfBirth: input.dateOfBirth?.trim() || previous?.dateOfBirth,
    gender: input.gender ?? previous?.gender ?? 'PREFER_NOT_TO_SAY',
    relationship: input.relationship ?? previous?.relationship ?? 'OTHER',
    primaryPosition:
      input.primaryPosition !== undefined ? input.primaryPosition : (previous?.primaryPosition ?? null),
    photoUrl: input.photoUrl?.trim() || previous?.photoUrl,
    disabilities: input.disabilities?.map((entry) => ({
      ...entry,
      id: entry.id ?? newId('dis'),
    })) ?? previous?.disabilities ?? [],
    specialNeeds: input.specialNeeds?.map((entry) => ({
      ...entry,
      id: entry.id ?? newId('sn'),
    })) ?? previous?.specialNeeds ?? [],
    communicationNotes:
      input.communicationNotes !== undefined
        ? (input.communicationNotes.trim() || undefined)
        : previous?.communicationNotes,
    behavioralNotes:
      input.behavioralNotes !== undefined
        ? (input.behavioralNotes.trim() || undefined)
        : previous?.behavioralNotes,
    createdAt: previous?.createdAt ?? isoNow(),
    updatedAt: isoNow(),
  };
}

function appendCreatedAthletes(familyId: string, athletes: SeedRow[]): SeedRow[] {
  const existingIds = new Set(athletes.map((athlete) => asString(athlete.id)).filter(Boolean));
  const extras = Array.from(athleteProfilesByAthleteId.values())
    .filter((profile) => profile.familyId === familyId && !existingIds.has(profile.athleteId))
    .map<SeedRow>((profile) => ({
      id: profile.athleteId,
      userId: null,
      displayName: `${profile.firstName} ${profile.lastName}`.trim(),
      dateOfBirth: profile.dateOfBirth ?? null,
      avatarUrl: profile.photoUrl ?? null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      status: 'active',
      parentId: profile.parentId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      nickname: profile.nickname ?? null,
      gender: profile.gender,
      relationship: profile.relationship,
      primaryPosition: profile.primaryPosition ?? null,
      photoUrl: profile.photoUrl ?? null,
      disabilities: profile.disabilities,
      specialNeeds: profile.specialNeeds,
      hasSpecialNeeds: profile.disabilities.length > 0 || profile.specialNeeds.length > 0,
      communicationNotes: profile.communicationNotes ?? null,
      behavioralNotes: profile.behavioralNotes ?? null,
      guardians: [],
      senTags: [],
      consents: [],
    }));

  return athletes.concat(extras);
}

const ensureAuthUserId = (userId?: string) => {
  if (!userId) {
    throw forbidden('Authenticated user is required');
  }
  return userId;
};

const defaultMedicalRecord = (athleteId: string, userId: string): MedicalRecordResponse =>
  medicalRecordResponseSchema.parse({
    athleteId,
    conditions: [],
    allergies: [],
    medications: [],
    restrictions: [],
    doctorName: null,
    doctorPhone: null,
    insuranceProvider: null,
    insuranceNumber: null,
    emergencyNotes: null,
    senNotes: null,
    updatedAt: isoNow(),
    updatedByUserId: userId,
  });

const defaultEmergencyContacts = (athleteId: string, userId: string): EmergencyContactsResponse =>
  emergencyContactsResponseSchema.parse({
    athleteId,
    contacts: [],
    updatedAt: isoNow(),
    updatedByUserId: userId,
  });

const defaultConsents = (athleteId: string, userId: string): ConsentsResponse =>
  consentsResponseSchema.parse({
    athleteId,
    consents: consentTypeSchema.options.map((type) => ({
      type,
      granted: false,
      grantedBy: '',
    })),
    updatedAt: isoNow(),
    updatedByUserId: userId,
  });

function normalizeEmergencyContacts(
  contacts: Array<{
    id?: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    isPrimary?: boolean;
    canPickup?: boolean;
  }>,
) {
  const normalized = contacts.map((contact, index) => ({
    ...contact,
    id: contact.id ?? newId('emc'),
    isPrimary: contact.isPrimary ?? index === 0,
    canPickup: contact.canPickup ?? false,
  }));

  const primaryCount = normalized.filter((contact) => contact.isPrimary).length;
  if (normalized.length > 0 && primaryCount === 0) {
    normalized[0] = { ...normalized[0], isPrimary: true };
  }

  if (primaryCount > 1) {
    let foundPrimary = false;
    for (let index = 0; index < normalized.length; index += 1) {
      if (normalized[index].isPrimary && !foundPrimary) {
        foundPrimary = true;
        continue;
      }
      normalized[index] = { ...normalized[index], isPrimary: false };
    }
  }

  return normalized;
}

const familyAthleteRoutes: FastifyPluginAsync = async (app) => {
  app.get('/families/:familyId', async (request, reply) => {
    const familyId = familyIdSchema.parse((request.params as { familyId: string }).familyId);
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const isClubAdmin = isPrivilegedAdminAuth(request.auth);

    const repository = resolveFamilyRepository();
    const aggregate = await repository.getFamilyAggregate(familyId, authUserId, isClubAdmin);

    return reply.send({
      family: aggregate.family,
      memberships: aggregate.memberships,
      athletes: appendCreatedAthletes(
        familyId,
        aggregate.athletes.map((athlete) => decorateFamilyAthlete(athlete, familyId)),
      ),
      seedVersion: aggregate.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/athletes', async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const body = createAthleteRequestSchema.parse(request.body);
    ensureSeedFamilyWriteAccess(body.familyId, authUserId);

    const athleteId = newId('ath');
    const now = isoNow();
    const profile = buildAthleteProfileState(athleteId, body.familyId, authUserId, body);
    athleteProfilesByAthleteId.set(athleteId, profile);

    const store = getMarketplaceSeedStore();
    const athletes = asRows(store.tables.athletes);
    const guardianLinks = asRows(store.tables.guardianChildLinks);
    const childSenTags = asRows(store.tables.childSenTags);

    athletes.push({
      id: athleteId,
      userId: null,
      displayName: `${profile.firstName} ${profile.lastName}`.trim(),
      dateOfBirth: profile.dateOfBirth ?? null,
      avatarUrl: profile.photoUrl ?? null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });
    guardianLinks.push({
      id: newId('gcl'),
      familyId: body.familyId,
      guardianUserId: authUserId,
      athleteId,
      relationshipType: body.relationship.toLowerCase(),
      isPrimary: true,
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });
    for (const need of profile.specialNeeds) {
      childSenTags.push({
        id: newId('sen'),
        athleteId,
        tag: need.name,
        priority: 2,
        isCritical: need.severity === 'SEVERE',
        createdByUserId: authUserId,
        updatedByUserId: authUserId,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deletedAt: null,
        deletedByUserId: null,
      });
    }

    return reply.code(201).send({
      athleteId,
      ...decorateFamilyAthlete(
        {
          id: athleteId,
          userId: null,
          displayName: `${profile.firstName} ${profile.lastName}`.trim(),
          dateOfBirth: profile.dateOfBirth ?? null,
          avatarUrl: profile.photoUrl ?? null,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          status: 'active',
          guardians: [],
          senTags: [],
          consents: [],
        },
        body.familyId,
      ),
    });
  });

  app.get('/athletes/:athleteId', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    const familyId = resolveAthleteFamilyId(athleteId);
    if (familyId) {
      ensureCanReadAthleteProfile(request, athleteId, familyId);
    } else {
      assertCanReadAthleteHealth(request, athleteId);
    }

    const store = getMarketplaceSeedStore();
    const athletes = asRows(store.tables.athletes);
    const athlete = athletes.find((row) => asString(row.id) === athleteId);
    const profile = athleteProfilesByAthleteId.get(athleteId);
    if (!athlete && !profile && !familyId) {
      return reply.send({
        athleteId,
        ...decorateFamilyAthlete(
          {
            id: athleteId,
            userId: null,
            displayName: 'Young Athlete',
            dateOfBirth: null,
            avatarUrl: null,
            createdAt: isoNow(),
            updatedAt: isoNow(),
            status: 'active',
            guardians: [],
            senTags: [],
            consents: [],
          },
          'fam_scaffold',
        ),
      });
    }
    if (!athlete && !profile) {
      throw notFound('Athlete not found', { athleteId });
    }

    return reply.send({
      athleteId,
      ...decorateFamilyAthlete(
        athlete ?? {
          id: athleteId,
          userId: null,
          displayName: `${profile?.firstName ?? 'Young'} ${profile?.lastName ?? 'Athlete'}`.trim(),
          dateOfBirth: profile?.dateOfBirth ?? null,
          avatarUrl: profile?.photoUrl ?? null,
          createdAt: profile?.createdAt ?? isoNow(),
          updatedAt: profile?.updatedAt ?? isoNow(),
          status: 'active',
          guardians: [],
          senTags: [],
          consents: [],
        },
        familyId ?? 'fam_scaffold',
      ),
    });
  });

  app.patch('/athletes/:athleteId', async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    const body = updateAthleteRequestSchema.parse(request.body);
    const familyId = resolveAthleteFamilyId(athleteId);
    if (!familyId) {
      throw notFound('Athlete not found', { athleteId });
    }
    ensureSeedFamilyWriteAccess(familyId, authUserId);

    const store = getMarketplaceSeedStore();
    const athletes = asRows(store.tables.athletes);
    const athlete = athletes.find((row) => asString(row.id) === athleteId);
    const previous = athleteProfilesByAthleteId.get(athleteId) ?? (
      athlete ? profileStateFromAthleteRow(athlete, familyId) : undefined
    );
    if (!previous) {
      throw notFound('Athlete not found', { athleteId });
    }

    const nextProfile = buildAthleteProfileState(athleteId, familyId, previous.parentId, body, previous);
    athleteProfilesByAthleteId.set(athleteId, nextProfile);

    if (athlete) {
      athlete.displayName = `${nextProfile.firstName} ${nextProfile.lastName}`.trim();
      athlete.dateOfBirth = nextProfile.dateOfBirth ?? null;
      athlete.avatarUrl = nextProfile.photoUrl ?? null;
      athlete.updatedAt = nextProfile.updatedAt;
      athlete.updatedByUserId = authUserId;
      athlete.version = Number(athlete.version ?? 1) + 1;
    }

    return reply.send({
      athleteId,
      ...decorateFamilyAthlete(
        athlete ?? {
          id: athleteId,
          userId: null,
          displayName: `${nextProfile.firstName} ${nextProfile.lastName}`.trim(),
          dateOfBirth: nextProfile.dateOfBirth ?? null,
          avatarUrl: nextProfile.photoUrl ?? null,
          createdAt: nextProfile.createdAt,
          updatedAt: nextProfile.updatedAt,
          status: 'active',
          guardians: [],
          senTags: [],
          consents: [],
        },
        familyId,
      ),
    });
  });

  app.delete('/athletes/:athleteId', async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    const familyId = resolveAthleteFamilyId(athleteId);
    if (!familyId) {
      throw notFound('Athlete not found', { athleteId });
    }
    ensureSeedFamilyWriteAccess(familyId, authUserId);

    const store = getMarketplaceSeedStore();
    const athletes = asRows(store.tables.athletes);
    const guardianLinks = asRows(store.tables.guardianChildLinks);
    const childSenTags = asRows(store.tables.childSenTags);
    const hadAthleteProfile = athleteProfilesByAthleteId.delete(athleteId);
    const hadSeedAthlete = athletes.some((row) => asString(row.id) === athleteId);

    if (!hadAthleteProfile && !hadSeedAthlete) {
      throw notFound('Athlete not found', { athleteId });
    }

    removeRowsWhere(athletes, (row) => asString(row.id) === athleteId);
    removeRowsWhere(guardianLinks, (row) => asString(row.athleteId) === athleteId);
    removeRowsWhere(childSenTags, (row) => asString(row.athleteId) === athleteId);

    const injuries = injuriesByAthleteId.get(athleteId) ?? [];
    for (const injury of injuries) {
      injuriesById.delete(injury.id);
    }
    injuriesByAthleteId.delete(athleteId);
    medicalByAthleteId.delete(athleteId);
    emergencyContactsByAthleteId.delete(athleteId);
    consentsByAthleteId.delete(athleteId);

    return reply.code(204).send();
  });

  app.get('/athletes/:athleteId/injuries', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanReadAthleteHealth(request, athleteId);
    const injuries = injuriesByAthleteId.get(athleteId) ?? [];

    const payload = injuriesResponseSchema.parse({
      athleteId,
      injuries,
    });

    return reply.send(payload);
  });

  app.post('/athletes/:athleteId/injuries', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanWriteAthleteHealth(request, athleteId);
    const body = createInjuryRequestSchema.parse(request.body);
    const createdByUserId = ensureAuthUserId(request.auth?.userId);
    const now = isoNow();

    const injury = injuryRecordSchema.parse({
      id: newId('inj'),
      athleteId,
      title: body.title,
      type: body.type,
      severity: body.severity,
      status: 'active',
      reportedAt: body.reportedAt ?? now,
      expectedRecoveryDate: body.expectedRecoveryDate ?? null,
      resolvedAt: null,
      notes: body.notes ?? null,
      createdByUserId,
      createdAt: now,
      updatedAt: now,
    });

    const existing = injuriesByAthleteId.get(athleteId) ?? [];
    existing.unshift(injury);
    injuriesByAthleteId.set(athleteId, existing);
    injuriesById.set(injury.id, injury);

    return reply.status(201).send(injury);
  });

  app.patch('/injuries/:injuryId', async (request, reply) => {
    const injuryId = injuryIdSchema.parse((request.params as { injuryId: string }).injuryId);
    const body = updateInjuryRequestSchema.parse(request.body);

    const current = injuriesById.get(injuryId);
    if (!current) {
      throw notFound('Injury record not found', { injuryId });
    }
    assertCanWriteAthleteHealth(request, current.athleteId);

    const nextStatus = body.status ?? current.status;
    const now = isoNow();
    const updated = injuryRecordSchema.parse({
      ...current,
      ...body,
      status: nextStatus,
      resolvedAt:
        body.resolvedAt !== undefined
          ? body.resolvedAt
          : nextStatus === 'resolved'
            ? current.resolvedAt ?? now
            : current.resolvedAt,
      updatedAt: now,
    });

    injuriesById.set(injuryId, updated);
    const athleteInjuries = injuriesByAthleteId.get(updated.athleteId) ?? [];
    const idx = athleteInjuries.findIndex((item) => item.id === injuryId);
    if (idx >= 0) {
      athleteInjuries[idx] = updated;
      injuriesByAthleteId.set(updated.athleteId, athleteInjuries);
    }

    return reply.send(updated);
  });

  app.get('/athletes/:athleteId/medical', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanReadAthleteMedical(request, athleteId);
    const userId = ensureAuthUserId(request.auth?.userId);
    const record = medicalByAthleteId.get(athleteId) ?? defaultMedicalRecord(athleteId, userId);
    if (!medicalByAthleteId.has(athleteId)) {
      medicalByAthleteId.set(athleteId, record);
    }
    return reply.send(record);
  });

  app.patch('/athletes/:athleteId/medical', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanWriteAthleteMedical(request, athleteId);
    const body = updateMedicalRecordRequestSchema.parse(request.body);
    const userId = ensureAuthUserId(request.auth?.userId);
    const current = medicalByAthleteId.get(athleteId) ?? defaultMedicalRecord(athleteId, userId);
    const updated = medicalRecordResponseSchema.parse({
      ...current,
      ...body,
      restrictions: body.restrictions !== undefined ? body.restrictions : current.restrictions,
      doctorName: body.doctorName !== undefined ? body.doctorName : current.doctorName,
      doctorPhone: body.doctorPhone !== undefined ? body.doctorPhone : current.doctorPhone,
      insuranceProvider:
        body.insuranceProvider !== undefined ? body.insuranceProvider : current.insuranceProvider,
      insuranceNumber:
        body.insuranceNumber !== undefined ? body.insuranceNumber : current.insuranceNumber,
      emergencyNotes: body.emergencyNotes !== undefined ? body.emergencyNotes : current.emergencyNotes,
      senNotes: body.senNotes !== undefined ? body.senNotes : current.senNotes,
      updatedAt: isoNow(),
      updatedByUserId: userId,
    });
    medicalByAthleteId.set(athleteId, updated);
    return reply.send(updated);
  });

  app.get('/athletes/:athleteId/emergency-contacts', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanReadAthleteMedical(request, athleteId);
    const userId = ensureAuthUserId(request.auth?.userId);
    const record =
      emergencyContactsByAthleteId.get(athleteId) ?? defaultEmergencyContacts(athleteId, userId);
    if (!emergencyContactsByAthleteId.has(athleteId)) {
      emergencyContactsByAthleteId.set(athleteId, record);
    }
    return reply.send(record);
  });

  app.patch('/athletes/:athleteId/emergency-contacts', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanWriteAthleteMedical(request, athleteId);
    const body = updateEmergencyContactsRequestSchema.parse(request.body);
    const userId = ensureAuthUserId(request.auth?.userId);

    const updated = emergencyContactsResponseSchema.parse({
      athleteId,
      contacts: normalizeEmergencyContacts(body.contacts),
      updatedAt: isoNow(),
      updatedByUserId: userId,
    });

    emergencyContactsByAthleteId.set(athleteId, updated);
    return reply.send(updated);
  });

  app.get('/athletes/:athleteId/consents', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanReadAthleteMedical(request, athleteId);
    const userId = ensureAuthUserId(request.auth?.userId);
    const record = consentsByAthleteId.get(athleteId) ?? defaultConsents(athleteId, userId);
    if (!consentsByAthleteId.has(athleteId)) {
      consentsByAthleteId.set(athleteId, record);
    }
    return reply.send(record);
  });

  app.put('/athletes/:athleteId/consents', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanWriteAthleteMedical(request, athleteId);
    const body = upsertConsentsRequestSchema.parse(request.body);
    const userId = ensureAuthUserId(request.auth?.userId);
    const byType = new Map(body.consents.map((consent) => [consent.type, consent]));

    const updated = consentsResponseSchema.parse({
      athleteId,
      consents: consentTypeSchema.options.map((type) => {
        const next = byType.get(type);
        return next ?? { type, granted: false, grantedBy: '' };
      }),
      updatedAt: isoNow(),
      updatedByUserId: userId,
    });

    consentsByAthleteId.set(athleteId, updated);
    return reply.send(updated);
  });
};

export default familyAthleteRoutes;
