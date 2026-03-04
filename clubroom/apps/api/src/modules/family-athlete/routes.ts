import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import {
  athleteIdSchema,
  createInjuryRequestSchema,
  emergencyContactsResponseSchema,
  familyIdSchema,
  injuryIdSchema,
  injuriesResponseSchema,
  injuryRecordSchema,
  medicalRecordResponseSchema,
  updateEmergencyContactsRequestSchema,
  updateInjuryRequestSchema,
  updateMedicalRecordRequestSchema,
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
} from '../../lib/authz.js';

const injuriesByAthleteId = new Map<string, InjuryRecord[]>();
const injuriesById = new Map<string, InjuryRecord>();
const medicalByAthleteId = new Map<string, MedicalRecordResponse>();
const emergencyContactsByAthleteId = new Map<string, EmergencyContactsResponse>();

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
      },
    ],
    updatedAt: seedNow,
    updatedByUserId: 'usr_parent1',
  }),
);

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

const familyAthleteRoutes: FastifyPluginAsync = async (app) => {
  app.get('/families/:familyId', async (request, reply) => {
    const familyId = familyIdSchema.parse((request.params as { familyId: string }).familyId);
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const isClubAdmin =
      request.auth?.roles.includes('club_admin') || request.auth?.actingRole === 'club_admin';

    const repository = resolveFamilyRepository();
    const aggregate = await repository.getFamilyAggregate(familyId, authUserId, isClubAdmin);

    return reply.send({
      family: aggregate.family,
      memberships: aggregate.memberships,
      athletes: aggregate.athletes,
      seedVersion: aggregate.dataVersion,
      requestId: request.requestId,
    });
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
      contacts: body.contacts.map((contact) => ({
        ...contact,
        id: contact.id ?? newId('emc'),
      })),
      updatedAt: isoNow(),
      updatedByUserId: userId,
    });

    emergencyContactsByAthleteId.set(athleteId, updated);
    return reply.send(updated);
  });
};

export default familyAthleteRoutes;
