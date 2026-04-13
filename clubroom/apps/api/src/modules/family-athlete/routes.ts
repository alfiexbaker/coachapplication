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
  medicalRecordResponseSchema,
  updateEmergencyContactsRequestSchema,
  updateInjuryRequestSchema,
  updateMedicalRecordRequestSchema,
  upsertConsentsRequestSchema,
} from '@clubroom/shared-contracts';
import { forbidden, notFound } from '../../lib/http-errors.js';
import {
  assertCanReadAthleteHealth,
  assertCanReadAthleteMedical,
  assertCanWriteAthleteHealth,
  assertCanWriteAthleteMedical,
  isPrivilegedAdminAuth,
} from '../../lib/authz.js';
import {
  decorateFamilyAthleteRecord,
  resolveFamilyAthleteRepository,
} from '../../repositories/p0/family-athlete-repository.js';
import { resolveFamilyRepository } from '../../repositories/p0/family-repository.js';

type SeedRow = Record<string, unknown>;
type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
type Relationship = 'SON' | 'DAUGHTER' | 'WARD' | 'GRANDCHILD' | 'OTHER';

interface DisabilityRecord {
  id?: string;
  type: string;
  diagnosisDate?: string;
  description?: string;
  supportRequired?: string;
  communicationPreferences?: string[];
  triggers?: string[];
  calmingStrategies?: string[];
}

interface SpecialNeedRecord {
  id?: string;
  category: 'PHYSICAL' | 'LEARNING' | 'SENSORY' | 'BEHAVIORAL' | 'MEDICAL' | 'OTHER';
  name: string;
  description?: string;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE';
  accommodationsNeeded?: string[];
  parentHints?: string;
}

const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

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

function resolveParentIdFromAthlete(athlete: Record<string, unknown>): string | null {
  const guardians = Array.isArray(athlete.guardians) ? (athlete.guardians as SeedRow[]) : [];
  const primary = guardians.find((row) => row.isPrimary === true);
  return asString(primary?.guardianUserId) ?? asString(guardians[0]?.guardianUserId) ?? null;
}

function decorateAthlete(athlete: Record<string, unknown>): Record<string, unknown> {
  return decorateFamilyAthleteRecord(athlete, resolveParentIdFromAthlete(athlete));
}

async function ensureCanReadAthleteProfile(
  request: FastifyRequest,
  athleteId: string,
  familyId: string,
): Promise<void> {
  const authUserId = request.auth?.userId;
  if (!authUserId) {
    throw forbidden('Authenticated user is required');
  }
  if (isPrivilegedAdminAuth(request.auth)) {
    return;
  }

  const repository = resolveFamilyAthleteRepository();
  if (await repository.hasFamilyMembership(familyId, authUserId)) {
    return;
  }

  assertCanReadAthleteHealth(request, athleteId);
}

const ensureAuthUserId = (userId?: string) => {
  if (!userId) {
    throw forbidden('Authenticated user is required');
  }
  return userId;
};

export function resetFamilyAthleteRouteStateForTests(): void {}

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
      athletes: aggregate.athletes
        .filter((athlete) => !asString(athlete.deletedAt))
        .map((athlete) => decorateAthlete(athlete)),
      seedVersion: aggregate.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/athletes', async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const body = createAthleteRequestSchema.parse(request.body);
    const repository = resolveFamilyAthleteRepository();

    if (!(await repository.hasFamilyMembership(body.familyId, authUserId))) {
      throw forbidden('Not allowed to manage this family');
    }

    const athlete = await repository.createAthlete(
      {
        familyId: body.familyId,
        firstName: body.firstName,
        lastName: body.lastName,
        nickname: body.nickname,
        dateOfBirth: body.dateOfBirth,
        gender: body.gender as Gender,
        relationship: body.relationship as Relationship,
        primaryPosition: body.primaryPosition,
        photoUrl: body.photoUrl,
        disabilities: body.disabilities as DisabilityRecord[] | undefined,
        specialNeeds: body.specialNeeds as SpecialNeedRecord[] | undefined,
        communicationNotes: body.communicationNotes,
        behavioralNotes: body.behavioralNotes,
      },
      authUserId,
    );

    return reply.code(201).send({
      athleteId: athlete.id,
      ...athlete,
    });
  });

  app.get('/athletes/:athleteId', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    const repository = resolveFamilyAthleteRepository();
    const familyId = await repository.resolveAthleteFamilyId(athleteId);

    if (familyId) {
      await ensureCanReadAthleteProfile(request, athleteId, familyId);
    } else {
      assertCanReadAthleteHealth(request, athleteId);
    }

    const athlete = await repository.getAthlete(athleteId);
    if (!athlete) {
      throw notFound('Athlete not found', { athleteId });
    }

    return reply.send({
      athleteId,
      ...athlete,
    });
  });

  app.patch('/athletes/:athleteId', async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    const body = updateAthleteRequestSchema.parse(request.body);
    const repository = resolveFamilyAthleteRepository();
    const familyId = await repository.resolveAthleteFamilyId(athleteId);

    if (!familyId) {
      throw notFound('Athlete not found', { athleteId });
    }
    if (!(await repository.hasFamilyMembership(familyId, authUserId))) {
      throw forbidden('Not allowed to manage this family');
    }

    const athlete = await repository.updateAthlete(
      athleteId,
      {
        firstName: body.firstName,
        lastName: body.lastName,
        nickname: body.nickname,
        dateOfBirth: body.dateOfBirth,
        gender: body.gender as Gender | undefined,
        relationship: body.relationship as Relationship | undefined,
        primaryPosition: body.primaryPosition,
        photoUrl: body.photoUrl,
        disabilities: body.disabilities as DisabilityRecord[] | undefined,
        specialNeeds: body.specialNeeds as SpecialNeedRecord[] | undefined,
        communicationNotes: body.communicationNotes,
        behavioralNotes: body.behavioralNotes,
      },
      authUserId,
    );

    if (!athlete) {
      throw notFound('Athlete not found', { athleteId });
    }

    return reply.send({
      athleteId,
      ...athlete,
    });
  });

  app.delete('/athletes/:athleteId', async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    const repository = resolveFamilyAthleteRepository();
    const familyId = await repository.resolveAthleteFamilyId(athleteId);

    if (!familyId) {
      throw notFound('Athlete not found', { athleteId });
    }
    if (!(await repository.hasFamilyMembership(familyId, authUserId))) {
      throw forbidden('Not allowed to manage this family');
    }

    const deleted = await repository.deleteAthlete(athleteId, authUserId);
    if (!deleted) {
      throw notFound('Athlete not found', { athleteId });
    }

    return reply.code(204).send();
  });

  app.get('/athletes/:athleteId/injuries', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanReadAthleteHealth(request, athleteId);

    const repository = resolveFamilyAthleteRepository();
    const injuries = await repository.listInjuries(athleteId);
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
    const repository = resolveFamilyAthleteRepository();

    const injury = await repository.createInjury(
      athleteId,
      {
        title: body.title,
        type: body.type,
        severity: body.severity,
        reportedAt: body.reportedAt,
        expectedRecoveryDate: body.expectedRecoveryDate,
        notes: body.notes ?? null,
      },
      createdByUserId,
    );

    return reply.status(201).send(injury);
  });

  app.patch('/injuries/:injuryId', async (request, reply) => {
    const injuryId = injuryIdSchema.parse((request.params as { injuryId: string }).injuryId);
    const body = updateInjuryRequestSchema.parse(request.body);
    const repository = resolveFamilyAthleteRepository();
    const current = await repository.getInjury(injuryId);
    if (!current) {
      throw notFound('Injury record not found', { injuryId });
    }
    assertCanWriteAthleteHealth(request, current.athleteId);

    const updated = await repository.updateInjury(
      injuryId,
      {
        title: body.title,
        type: body.type,
        severity: body.severity,
        status: body.status,
        expectedRecoveryDate: body.expectedRecoveryDate,
        resolvedAt: body.resolvedAt,
        notes: body.notes ?? null,
      },
      ensureAuthUserId(request.auth?.userId),
    );

    if (!updated) {
      throw notFound('Injury record not found', { injuryId });
    }

    return reply.send(updated);
  });

  app.get('/athletes/:athleteId/medical', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanReadAthleteMedical(request, athleteId);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const record = await repository.getMedical(athleteId, userId);
    return reply.send(medicalRecordResponseSchema.parse(record));
  });

  app.patch('/athletes/:athleteId/medical', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanWriteAthleteMedical(request, athleteId);
    const body = updateMedicalRecordRequestSchema.parse(request.body);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();

    const updated = await repository.upsertMedical(
      athleteId,
      {
        conditions: body.conditions,
        allergies: body.allergies,
        medications: body.medications,
        restrictions: body.restrictions,
        doctorName: body.doctorName,
        doctorPhone: body.doctorPhone,
        insuranceProvider: body.insuranceProvider,
        insuranceNumber: body.insuranceNumber,
        emergencyNotes: body.emergencyNotes,
        senNotes: body.senNotes,
      },
      userId,
    );

    return reply.send(medicalRecordResponseSchema.parse(updated));
  });

  app.get('/athletes/:athleteId/emergency-contacts', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanReadAthleteMedical(request, athleteId);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const record = await repository.getEmergencyContacts(athleteId, userId);
    return reply.send(emergencyContactsResponseSchema.parse(record));
  });

  app.patch('/athletes/:athleteId/emergency-contacts', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanWriteAthleteMedical(request, athleteId);
    const body = updateEmergencyContactsRequestSchema.parse(request.body);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();

    const updated = await repository.replaceEmergencyContacts(
      athleteId,
      { contacts: body.contacts },
      userId,
    );

    return reply.send(emergencyContactsResponseSchema.parse(updated));
  });

  app.get('/athletes/:athleteId/consents', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanReadAthleteMedical(request, athleteId);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const record = await repository.getConsents(athleteId, userId);
    return reply.send(consentsResponseSchema.parse(record));
  });

  app.put('/athletes/:athleteId/consents', async (request, reply) => {
    const athleteId = athleteIdSchema.parse((request.params as { athleteId: string }).athleteId);
    assertCanWriteAthleteMedical(request, athleteId);
    const body = upsertConsentsRequestSchema.parse(request.body);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();

    const updated = await repository.replaceConsents(
      athleteId,
      {
        consents: body.consents.map((consent) => ({
          type: consent.type as (typeof consentTypeSchema.options)[number],
          granted: consent.granted,
          grantedAt: consent.grantedAt,
          grantedBy: consent.grantedBy,
          expiryAt: consent.expiryAt,
        })),
      },
      userId,
    );

    return reply.send(consentsResponseSchema.parse(updated));
  });
};

export default familyAthleteRoutes;
