import crypto from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  athleteIdSchema,
  consentsResponseSchema,
  consentTypeSchema,
  createInjuryRequestSchema,
  createGuardianInviteRequestSchema,
  emergencyContactsResponseSchema,
  familyIdSchema,
  guardianInviteListResponseSchema,
  guardianInviteResponseSchema,
  injuryRecordSchema,
  injuryIdSchema,
  injuriesResponseSchema,
  medicalRecordResponseSchema,
  updateEmergencyContactsRequestSchema,
  updateInjuryRequestSchema,
  updateMedicalRecordRequestSchema,
  upsertConsentsRequestSchema,
} from '@clubroom/shared-contracts';
import {
  ApiProblemError,
  badRequest,
  conflict,
  forbidden,
  notFound,
} from '../../lib/http-errors.js';
import {
  assertCanReadAthleteHealth,
  assertCanReadAthleteMedical,
  assertCanWriteAthleteHealth,
  assertCanWriteAthleteMedical,
  isPrivilegedAdminAuth,
} from '../../lib/authz.js';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import {
  decorateFamilyAthleteRecord,
  resolveFamilyAthleteRepository,
} from '../../repositories/p0/family-athlete-repository.js';
import { resolveFamilyRepository } from '../../repositories/p0/family-repository.js';
import { resolveClubAuthorityRepository } from '../../repositories/p0/club-authority-repository.js';
type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
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
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
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
const updateAthleteRequestSchema = createAthleteRequestSchema
  .omit({
    familyId: true,
  })
  .partial();
const athleteSquadMembershipsResponseSchema = z.object({
  athleteId: athleteIdSchema,
  memberships: z.array(
    z.object({
      id: z.string(),
      athleteId: athleteIdSchema,
      squadId: z.string(),
      clubId: z.string(),
      squadName: z.string(),
      squadLevel: z.string(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']),
      joinedAt: z.string(),
    }),
  ),
});
const guardianInviteIdSchema = z.string().regex(/^ginv_[A-Za-z0-9-]+$/);
const familyGuardianIdSchema = z.string().trim().min(1);
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
  await assertCanReadAthleteHealth(request, athleteId);
}
const ensureAuthUserId = (userId?: string) => {
  if (!userId) {
    throw forbidden('Authenticated user is required');
  }
  return userId;
};
export function resetFamilyAthleteRouteStateForTests(): void {}
function auditResultForError(error: unknown): 'DENY' | 'ERROR' {
  if (error instanceof ApiProblemError && [400, 403, 409].includes(error.status)) {
    return 'DENY';
  }
  return 'ERROR';
}
function noShowProofKey(params: {
  athleteId?: string;
  bookingId?: string;
  groupSessionId?: string;
  fallbackId?: string;
}): string {
  if (params.bookingId) {
    return `booking:${params.bookingId}:${params.athleteId ?? ''}`;
  }
  if (params.groupSessionId) {
    return `group:${params.groupSessionId}:${params.athleteId ?? ''}`;
  }
  return `proof:${params.fallbackId ?? params.athleteId ?? 'unknown'}`;
}
function countNoShowsFromTables(tables: SeedTables, athleteIds: string[]) {
  const athleteIdSet = new Set(athleteIds);
  const proofKeys = new Set<string>();
  let attendanceRecordCount = 0;
  let groupRegistrationCount = 0;

  for (const row of asRows(tables.attendanceRecords)) {
    const athleteId = asString(row.athleteId);
    if (
      !athleteId ||
      !athleteIdSet.has(athleteId) ||
      asString(row.status)?.toUpperCase() !== 'NO_SHOW'
    ) {
      continue;
    }
    attendanceRecordCount += 1;
    proofKeys.add(
      noShowProofKey({
        athleteId,
        bookingId: asString(row.bookingId),
        groupSessionId: asString(row.groupSessionId),
        fallbackId: asString(row.id),
      }),
    );
  }

  for (const row of asRows(tables.groupSessionRegistrations)) {
    const athleteId = asString(row.athleteId);
    if (
      !athleteId ||
      !athleteIdSet.has(athleteId) ||
      asString(row.status)?.toUpperCase() !== 'NO_SHOW' ||
      asString(row.deletedAt)
    ) {
      continue;
    }
    groupRegistrationCount += 1;
    proofKeys.add(
      noShowProofKey({
        athleteId,
        groupSessionId: asString(row.groupSessionId),
        fallbackId: asString(row.id),
      }),
    );
  }

  return {
    count: proofKeys.size,
    attendanceRecordCount,
    groupRegistrationCount,
  };
}
async function countFamilyNoShows(athleteIds: string[]) {
  if (athleteIds.length === 0) {
    return {
      count: 0,
      attendanceRecordCount: 0,
      groupRegistrationCount: 0,
    };
  }

  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      return countNoShowsFromTables(getDbFixtureStore().tables as SeedTables, athleteIds);
    }

    const prisma = getPrismaClientOrThrow();
    const [attendanceRecords, groupRegistrations] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: {
          athleteId: { in: athleteIds },
          status: 'NO_SHOW',
        },
        select: {
          id: true,
          athleteId: true,
          bookingId: true,
          groupSessionId: true,
        },
      }),
      prisma.groupSessionRegistration.findMany({
        where: {
          athleteId: { in: athleteIds },
          status: 'NO_SHOW',
          deletedAt: null,
        },
        select: {
          id: true,
          athleteId: true,
          groupSessionId: true,
        },
      }),
    ]);
    const proofKeys = new Set<string>();
    for (const row of attendanceRecords) {
      proofKeys.add(
        noShowProofKey({
          athleteId: row.athleteId,
          bookingId: row.bookingId ?? undefined,
          groupSessionId: row.groupSessionId ?? undefined,
          fallbackId: row.id,
        }),
      );
    }
    for (const row of groupRegistrations) {
      proofKeys.add(
        noShowProofKey({
          athleteId: row.athleteId,
          groupSessionId: row.groupSessionId,
          fallbackId: row.id,
        }),
      );
    }
    return {
      count: proofKeys.size,
      attendanceRecordCount: attendanceRecords.length,
      groupRegistrationCount: groupRegistrations.length,
    };
  }

  return countNoShowsFromTables(getMarketplaceSeedStore().tables as SeedTables, athleteIds);
}

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const updateFamilyNoShowsRequestSchema = z
  .object({
    action: z.enum(['record', 'clear', 'reset']),
    athleteId: athleteIdSchema,
    bookingId: z.string().trim().min(1).optional(),
    groupSessionRegistrationId: z.string().trim().min(1).optional(),
    groupSessionId: z.string().trim().min(1).optional(),
    date: isoDateSchema.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    const proofFields = [
      value.bookingId,
      value.groupSessionRegistrationId,
      value.groupSessionId,
    ].filter(Boolean);
    if (proofFields.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Provide exactly one no-show proof: bookingId, groupSessionRegistrationId, or groupSessionId.',
        path: ['bookingId'],
      });
    }
  });
type UpdateFamilyNoShowsRequest = z.infer<typeof updateFamilyNoShowsRequestSchema>;
type NoShowMutationAction = 'record' | 'clear';
interface NoShowMutationParams {
  familyId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  isFamilyMember: boolean;
  athleteIds: Set<string>;
  action: NoShowMutationAction;
  body: UpdateFamilyNoShowsRequest;
}
interface NoShowMutationProof {
  kind: 'booking' | 'group_registration';
  athleteId: string;
  bookingId?: string | null;
  groupSessionId?: string | null;
  registrationId?: string | null;
  date: string;
  replayed: boolean;
  clearedRecords?: number;
}

function normalizeNoShowAction(action: UpdateFamilyNoShowsRequest['action']): NoShowMutationAction {
  return action === 'record' ? 'record' : 'clear';
}

function getNoShowSeedTables(): SeedTables {
  if (getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()) {
    return getDbFixtureStore().tables as SeedTables;
  }
  return getMarketplaceSeedStore().tables as SeedTables;
}

async function getFamilyNoShowAthleteIds(familyId: string): Promise<Set<string>> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const links = await prisma.guardianChildLink.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
      select: {
        athleteId: true,
      },
    });
    return new Set(links.map((link) => link.athleteId));
  }
  return new Set(
    asRows(getNoShowSeedTables().guardianChildLinks).flatMap((row) => {
      if (asString(row.familyId) !== familyId || asString(row.deletedAt)) {
        return [];
      }
      const athleteId = asString(row.athleteId);
      return athleteId ? [athleteId] : [];
    }),
  );
}

function ensureNoShowAthleteInFamily(athleteIds: Set<string>, athleteId: string): void {
  if (!athleteIds.has(athleteId)) {
    throw forbidden('Athlete is not linked to this family');
  }
}

function parseIsoDatePart(value: string | undefined): string | undefined {
  return value?.slice(0, 10);
}

function recordedAtForDate(date: string): string {
  return `${date}T12:00:00.000Z`;
}

function rowMatchesNoShowDate(row: SeedRow, date?: string): boolean {
  if (!date) {
    return true;
  }
  return parseIsoDatePart(asString(row.recordedAt) ?? asString(row.createdAt)) === date;
}

function canMutateNoShowProof(params: {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  isFamilyMember: boolean;
  coachUserId?: string | null;
  bookedByUserId?: string | null;
  guardianUserId?: string | null;
  parentUserId?: string | null;
}): boolean {
  return (
    params.isPrivilegedAdmin ||
    params.isFamilyMember ||
    params.coachUserId === params.authUserId ||
    params.bookedByUserId === params.authUserId ||
    params.guardianUserId === params.authUserId ||
    params.parentUserId === params.authUserId
  );
}

function updateSeedAttendanceRowsForNoShow(params: {
  rows: SeedRow[];
  action: NoShowMutationAction;
  authUserId: string;
  athleteId: string;
  date: string;
  notes?: string;
  bookingId?: string | null;
  groupSessionId?: string | null;
}): { replayed: boolean; clearedRecords?: number } {
  const now = new Date().toISOString();
  const matching = params.rows.filter((row) => {
    if (asString(row.athleteId) !== params.athleteId) {
      return false;
    }
    if (params.bookingId) {
      return asString(row.bookingId) === params.bookingId;
    }
    if (params.groupSessionId) {
      return (
        asString(row.groupSessionId) === params.groupSessionId &&
        rowMatchesNoShowDate(row, params.date)
      );
    }
    return false;
  });
  if (params.action === 'clear') {
    const noShowRows = matching.filter((row) => asString(row.status)?.toUpperCase() === 'NO_SHOW');
    if (noShowRows.length === 0) {
      throw conflict('No no-show proof found to clear');
    }
    for (const row of noShowRows) {
      row.status = 'NO_SHOW_CLEARED';
      row.notes = params.notes ?? asString(row.notes) ?? 'No-show cleared.';
      row.updatedAt = now;
    }
    return { replayed: false, clearedRecords: noShowRows.length };
  }

  const existing = matching[0];
  if (existing) {
    const replayed = asString(existing.status)?.toUpperCase() === 'NO_SHOW';
    existing.status = 'NO_SHOW';
    existing.notes = params.notes ?? asString(existing.notes) ?? null;
    existing.recordedByUserId = params.authUserId;
    existing.recordedAt = asString(existing.recordedAt) ?? recordedAtForDate(params.date);
    existing.updatedAt = now;
    return { replayed };
  }

  params.rows.push({
    id: newId('att'),
    bookingId: params.bookingId ?? null,
    groupSessionId: params.groupSessionId ?? null,
    athleteId: params.athleteId,
    status: 'NO_SHOW',
    notes: params.notes ?? null,
    effortRating: null,
    focusAreasJson: [],
    recordedByUserId: params.authUserId,
    recordedAt: recordedAtForDate(params.date),
    createdAt: now,
    updatedAt: now,
  });
  return { replayed: false };
}

function mutateNoShowFromTables(
  tables: SeedTables,
  params: NoShowMutationParams,
): NoShowMutationProof {
  const athleteId = params.body.athleteId;
  ensureNoShowAthleteInFamily(params.athleteIds, athleteId);
  const attendanceRows = asRows(tables.attendanceRecords);

  if (params.body.bookingId) {
    const booking = asRows(tables.bookings).find(
      (row) => asString(row.id) === params.body.bookingId && !asString(row.deletedAt),
    );
    const participant = asRows(tables.bookingParticipants).find(
      (row) =>
        asString(row.bookingId) === params.body.bookingId &&
        asString(row.athleteId) === athleteId &&
        !asString(row.deletedAt),
    );
    if (!booking || !participant) {
      throw badRequest('No-show booking proof was not found for this family athlete');
    }
    if (
      !canMutateNoShowProof({
        authUserId: params.authUserId,
        isPrivilegedAdmin: params.isPrivilegedAdmin,
        isFamilyMember: params.isFamilyMember,
        coachUserId: asString(booking.coachUserId),
        bookedByUserId: asString(booking.bookedByUserId),
        guardianUserId: asString(participant.guardianUserId),
      })
    ) {
      throw forbidden('Not allowed to update no-show proof for this booking');
    }
    const date =
      params.body.date ??
      parseIsoDatePart(asString(booking.scheduledAt)) ??
      parseIsoDatePart(new Date().toISOString()) ??
      new Date().toISOString().slice(0, 10);
    const result = updateSeedAttendanceRowsForNoShow({
      rows: attendanceRows,
      action: params.action,
      authUserId: params.authUserId,
      athleteId,
      date,
      notes: params.body.notes,
      bookingId: params.body.bookingId,
      groupSessionId: asString(booking.groupSessionId) ?? null,
    });
    return {
      kind: 'booking',
      athleteId,
      bookingId: params.body.bookingId,
      groupSessionId: asString(booking.groupSessionId) ?? null,
      date,
      ...result,
    };
  }

  const registration = asRows(tables.groupSessionRegistrations).find((row) => {
    if (asString(row.deletedAt)) {
      return false;
    }
    if (params.body.groupSessionRegistrationId) {
      return asString(row.id) === params.body.groupSessionRegistrationId;
    }
    return (
      asString(row.groupSessionId) === params.body.groupSessionId &&
      asString(row.athleteId) === athleteId
    );
  });
  if (!registration || asString(registration.athleteId) !== athleteId) {
    throw badRequest('No-show group registration proof was not found for this family athlete');
  }
  const session = asRows(tables.groupSessions).find(
    (row) => asString(row.id) === asString(registration.groupSessionId),
  );
  if (!session) {
    throw badRequest('No-show group session proof was not found');
  }
  if (
    !canMutateNoShowProof({
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
      isFamilyMember: params.isFamilyMember,
      coachUserId: asString(session.coachUserId),
      parentUserId: asString(registration.parentUserId),
    })
  ) {
    throw forbidden('Not allowed to update no-show proof for this group session');
  }
  const previousStatus = asString(registration.status)?.toUpperCase() ?? 'REGISTERED';
  if (params.action === 'record' && ['CANCELLED', 'WAITLISTED'].includes(previousStatus)) {
    throw conflict('Only active registrations can be marked as no-show');
  }
  const now = new Date().toISOString();
  const date = params.body.date ?? parseIsoDatePart(now) ?? new Date().toISOString().slice(0, 10);
  if (params.action === 'record') {
    registration.status = 'NO_SHOW';
  } else if (previousStatus === 'NO_SHOW') {
    registration.status = 'REGISTERED';
  }
  registration.updatedAt = now;
  registration.updatedByUserId = params.authUserId;
  registration.version = (asNumber(registration.version) ?? 1) + 1;
  const result = updateSeedAttendanceRowsForNoShow({
    rows: attendanceRows,
    action: params.action,
    authUserId: params.authUserId,
    athleteId,
    date,
    notes: params.body.notes,
    groupSessionId: asString(registration.groupSessionId) ?? null,
  });
  return {
    kind: 'group_registration',
    athleteId,
    registrationId: asString(registration.id) ?? null,
    groupSessionId: asString(registration.groupSessionId) ?? null,
    date,
    ...result,
  };
}

async function mutateNoShowInDb(params: NoShowMutationParams): Promise<NoShowMutationProof> {
  const prisma = getPrismaClientOrThrow();
  const athleteId = params.body.athleteId;
  ensureNoShowAthleteInFamily(params.athleteIds, athleteId);

  if (params.body.bookingId) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.body.bookingId,
        deletedAt: null,
      },
      include: {
        participants: {
          where: {
            athleteId,
            deletedAt: null,
          },
        },
      },
    });
    const participant = booking?.participants[0];
    if (!booking || !participant) {
      throw badRequest('No-show booking proof was not found for this family athlete');
    }
    if (
      !canMutateNoShowProof({
        authUserId: params.authUserId,
        isPrivilegedAdmin: params.isPrivilegedAdmin,
        isFamilyMember: params.isFamilyMember,
        coachUserId: booking.coachUserId,
        bookedByUserId: booking.bookedByUserId,
        guardianUserId: participant.guardianUserId,
      })
    ) {
      throw forbidden('Not allowed to update no-show proof for this booking');
    }
    const date =
      params.body.date ??
      parseIsoDatePart(booking.scheduledAt.toISOString()) ??
      new Date().toISOString().slice(0, 10);
    if (params.action === 'clear') {
      const cleared = await prisma.attendanceRecord.updateMany({
        where: {
          bookingId: params.body.bookingId,
          athleteId,
          status: 'NO_SHOW',
        },
        data: {
          status: 'NO_SHOW_CLEARED',
          notes: params.body.notes ?? 'No-show cleared.',
        },
      });
      if (cleared.count === 0) {
        throw conflict('No no-show proof found to clear');
      }
      return {
        kind: 'booking',
        athleteId,
        bookingId: params.body.bookingId,
        groupSessionId: booking.groupSessionId,
        date,
        replayed: false,
        clearedRecords: cleared.count,
      };
    }

    const replayed = await prisma.$transaction(async (tx) => {
      const existing = await tx.attendanceRecord.findFirst({
        where: {
          bookingId: params.body.bookingId,
          athleteId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      if (existing) {
        const wasNoShow = existing.status.toUpperCase() === 'NO_SHOW';
        await tx.attendanceRecord.update({
          where: {
            id: existing.id,
          },
          data: {
            status: 'NO_SHOW',
            notes: params.body.notes ?? existing.notes,
            recordedByUserId: params.authUserId,
          },
        });
        return wasNoShow;
      }
      await tx.attendanceRecord.create({
        data: {
          id: newId('att'),
          bookingId: params.body.bookingId,
          groupSessionId: booking.groupSessionId,
          athleteId,
          status: 'NO_SHOW',
          notes: params.body.notes ?? null,
          effortRating: null,
          focusAreasJson: [],
          recordedByUserId: params.authUserId,
          recordedAt: new Date(recordedAtForDate(date)),
        },
      });
      return false;
    });
    return {
      kind: 'booking',
      athleteId,
      bookingId: params.body.bookingId,
      groupSessionId: booking.groupSessionId,
      date,
      replayed,
    };
  }

  const registration = await prisma.groupSessionRegistration.findFirst({
    where: params.body.groupSessionRegistrationId
      ? {
          id: params.body.groupSessionRegistrationId,
          deletedAt: null,
        }
      : {
          groupSessionId: params.body.groupSessionId,
          athleteId,
          deletedAt: null,
        },
    include: {
      groupSession: true,
    },
  });
  if (!registration || registration.athleteId !== athleteId) {
    throw badRequest('No-show group registration proof was not found for this family athlete');
  }
  if (
    !canMutateNoShowProof({
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
      isFamilyMember: params.isFamilyMember,
      coachUserId: registration.groupSession.coachUserId,
      parentUserId: registration.parentUserId,
    })
  ) {
    throw forbidden('Not allowed to update no-show proof for this group session');
  }
  const previousStatus = registration.status.toUpperCase();
  if (params.action === 'record' && ['CANCELLED', 'WAITLISTED'].includes(previousStatus)) {
    throw conflict('Only active registrations can be marked as no-show');
  }
  const date = params.body.date ?? new Date().toISOString().slice(0, 10);
  const result = await prisma.$transaction(async (tx) => {
    if (params.action === 'record') {
      await tx.groupSessionRegistration.update({
        where: {
          id: registration.id,
        },
        data: {
          status: 'NO_SHOW',
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
    } else if (previousStatus === 'NO_SHOW') {
      await tx.groupSessionRegistration.update({
        where: {
          id: registration.id,
        },
        data: {
          status: 'REGISTERED',
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
    }

    const existing = await tx.attendanceRecord.findMany({
      where: {
        groupSessionId: registration.groupSessionId,
        athleteId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    const matching = existing.filter((row) =>
      params.body.date ? parseIsoDatePart(row.recordedAt.toISOString()) === params.body.date : true,
    );
    if (params.action === 'clear') {
      const noShowIds = matching
        .filter((row) => row.status.toUpperCase() === 'NO_SHOW')
        .map((row) => row.id);
      if (noShowIds.length === 0 && previousStatus !== 'NO_SHOW') {
        throw conflict('No no-show proof found to clear');
      }
      if (noShowIds.length > 0) {
        await tx.attendanceRecord.updateMany({
          where: {
            id: {
              in: noShowIds,
            },
          },
          data: {
            status: 'NO_SHOW_CLEARED',
            notes: params.body.notes ?? 'No-show cleared.',
          },
        });
      }
      return { replayed: false, clearedRecords: noShowIds.length };
    }

    const attendance = matching[0];
    if (attendance) {
      const wasNoShow = attendance.status.toUpperCase() === 'NO_SHOW';
      await tx.attendanceRecord.update({
        where: {
          id: attendance.id,
        },
        data: {
          status: 'NO_SHOW',
          notes: params.body.notes ?? attendance.notes,
          recordedByUserId: params.authUserId,
        },
      });
      return { replayed: wasNoShow };
    }
    await tx.attendanceRecord.create({
      data: {
        id: newId('att'),
        bookingId: null,
        groupSessionId: registration.groupSessionId,
        athleteId,
        status: 'NO_SHOW',
        notes: params.body.notes ?? null,
        effortRating: null,
        focusAreasJson: [],
        recordedByUserId: params.authUserId,
        recordedAt: new Date(recordedAtForDate(date)),
      },
    });
    return { replayed: false };
  });
  return {
    kind: 'group_registration',
    athleteId,
    registrationId: registration.id,
    groupSessionId: registration.groupSessionId,
    date,
    ...result,
  };
}

async function mutateFamilyNoShow(params: NoShowMutationParams): Promise<NoShowMutationProof> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    return mutateNoShowInDb(params);
  }
  return mutateNoShowFromTables(getNoShowSeedTables(), params);
}
const familyAthleteRoutes: FastifyPluginAsync = async (app) => {
  app.get('/families/:familyId/no-shows', async (request, reply) => {
    const familyId = familyIdSchema.parse(
      (
        request.params as {
          familyId: string;
        }
      ).familyId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyRepository();
    try {
      const aggregate = await repository.getFamilyAggregate(
        familyId,
        authUserId,
        isPrivilegedAdminAuth(request.auth),
      );
      const athleteIds = aggregate.athletes
        .map((athlete) => asString(athlete.id))
        .filter((athleteId): athleteId is string => Boolean(athleteId));
      const counts = await countFamilyNoShows(athleteIds);
      await recordAuditEvent({
        request,
        action: 'family_no_shows.read',
        resourceType: 'family',
        resourceId: familyId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          athleteCount: athleteIds.length,
          count: counts.count,
          attendanceRecordCount: counts.attendanceRecordCount,
          groupRegistrationCount: counts.groupRegistrationCount,
        },
      });
      return reply.send({
        familyId,
        ...counts,
        seedVersion: aggregate.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'family_no_shows.read',
        resourceType: 'family',
        resourceId: familyId,
        result: auditResultForError(error),
        sensitiveRead: true,
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.patch('/families/:familyId/no-shows', async (request, reply) => {
    const familyId = familyIdSchema.parse(
      (
        request.params as {
          familyId: string;
        }
      ).familyId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    let body: UpdateFamilyNoShowsRequest | null = null;
    let action: NoShowMutationAction = 'record';
    try {
      body = updateFamilyNoShowsRequestSchema.parse(request.body ?? {});
      action = normalizeNoShowAction(body.action);
      const athleteIds = await getFamilyNoShowAthleteIds(familyId);
      ensureNoShowAthleteInFamily(athleteIds, body.athleteId);
      const isFamilyMember = await resolveFamilyAthleteRepository().hasFamilyMembership(
        familyId,
        authUserId,
      );
      const proof = await mutateFamilyNoShow({
        familyId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        isFamilyMember,
        athleteIds,
        action,
        body,
      });
      const counts = await countFamilyNoShows(Array.from(athleteIds));
      await recordAuditEvent({
        request,
        action: `family_no_shows.${action}`,
        resourceType: 'family',
        resourceId: familyId,
        result: 'SUCCESS',
        metadata: {
          athleteId: body.athleteId,
          requestedAction: body.action,
          proof,
          count: counts.count,
          attendanceRecordCount: counts.attendanceRecordCount,
          groupRegistrationCount: counts.groupRegistrationCount,
        },
      });
      return reply.send({
        familyId,
        action,
        ...counts,
        proof,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: `family_no_shows.${action}`,
        resourceType: 'family',
        resourceId: familyId,
        result: auditResultForError(error),
        metadata: {
          athleteId: body?.athleteId ?? null,
          requestedAction: body?.action ?? null,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.get('/families/:familyId', async (request, reply) => {
    const familyId = familyIdSchema.parse(
      (
        request.params as {
          familyId: string;
        }
      ).familyId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const isClubAdmin = isPrivilegedAdminAuth(request.auth);
    const repository = resolveFamilyRepository();
    const aggregate = await repository.getFamilyAggregate(familyId, authUserId, isClubAdmin);
    await recordAuditEvent({
      request,
      action: 'family.read',
      resourceType: 'family',
      resourceId: familyId,
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        athleteCount: aggregate.athletes.length,
      },
    });
    return reply.send({
      family: aggregate.family,
      memberships: aggregate.memberships,
      athletes: aggregate.athletes.flatMap((athlete) =>
        !asString(athlete.deletedAt) ? [decorateAthlete(athlete)] : [],
      ),
      guardianInvites: aggregate.guardianInvites,
      pendingGuardianInvites: aggregate.guardianInvites,
      seedVersion: aggregate.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get('/me/guardian-invites', async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyRepository();
    const invites = await repository.listGuardianInvitesForUser(authUserId);
    await recordAuditEvent({
      request,
      action: 'family_guardian_invite.list',
      resourceType: 'family_guardian_invite',
      resourceId: authUserId,
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        count: invites.length,
      },
    });
    return reply.send(
      guardianInviteListResponseSchema.parse({
        invites,
      }),
    );
  });
  app.post('/families/:familyId/guardians', async (request, reply) => {
    const familyId = familyIdSchema.parse(
      (
        request.params as {
          familyId: string;
        }
      ).familyId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const body = createGuardianInviteRequestSchema.parse(request.body);
    const repository = resolveFamilyRepository();
    try {
      const result = await repository.createGuardianInvite({
        familyId,
        inviterUserId: authUserId,
        inviteeEmail: body.inviteeEmail,
        inviteeName: body.inviteeName,
        role: body.role,
        relationship: body.relationship,
        childAccess: body.childAccess,
        message: body.message,
      });
      await recordAuditEvent({
        request,
        action: 'family_guardian_invite.create',
        resourceType: 'family_guardian_invite',
        resourceId: result.invite.id,
        subjectUserId: null,
        result: 'SUCCESS',
        metadata: {
          familyId,
          inviteeEmail: result.invite.inviteeEmail,
          role: result.invite.role,
          replayed: result.replayed,
        },
      });
      return reply
        .code(result.replayed ? 200 : 201)
        .send(guardianInviteResponseSchema.parse(result.invite));
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'family_guardian_invite.create',
        resourceType: 'family_guardian_invite',
        resourceId: null,
        result: auditResultForError(error),
        metadata: {
          familyId,
          inviteeEmail: body.inviteeEmail.toLowerCase(),
          role: body.role,
        },
      });
      throw error;
    }
  });
  app.post('/guardian-invites/:inviteId/accept', async (request, reply) => {
    const inviteId = guardianInviteIdSchema.parse(
      (
        request.params as {
          inviteId: string;
        }
      ).inviteId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyRepository();
    try {
      const result = await repository.respondGuardianInvite(inviteId, authUserId, 'ACCEPTED');
      await recordAuditEvent({
        request,
        action: 'family_guardian_invite.accept',
        resourceType: 'family_guardian_invite',
        resourceId: inviteId,
        result: 'SUCCESS',
        metadata: {
          familyId: result.familyId,
          replayed: result.replayed,
        },
      });
      return reply.send({
        ...guardianInviteResponseSchema.parse(result.invite),
        familyId: result.familyId,
        replayed: result.replayed,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'family_guardian_invite.accept',
        resourceType: 'family_guardian_invite',
        resourceId: inviteId,
        result: auditResultForError(error),
      });
      throw error;
    }
  });
  app.post('/guardian-invites/:inviteId/decline', async (request, reply) => {
    const inviteId = guardianInviteIdSchema.parse(
      (
        request.params as {
          inviteId: string;
        }
      ).inviteId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyRepository();
    try {
      const result = await repository.respondGuardianInvite(inviteId, authUserId, 'DECLINED');
      await recordAuditEvent({
        request,
        action: 'family_guardian_invite.decline',
        resourceType: 'family_guardian_invite',
        resourceId: inviteId,
        result: 'SUCCESS',
        metadata: {
          familyId: result.familyId,
          replayed: result.replayed,
        },
      });
      return reply.send({
        ...guardianInviteResponseSchema.parse(result.invite),
        familyId: result.familyId,
        replayed: result.replayed,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'family_guardian_invite.decline',
        resourceType: 'family_guardian_invite',
        resourceId: inviteId,
        result: auditResultForError(error),
      });
      throw error;
    }
  });
  app.delete('/families/:familyId/guardian-invites/:inviteId', async (request, reply) => {
    const familyId = familyIdSchema.parse(
      (
        request.params as {
          familyId: string;
        }
      ).familyId,
    );
    const inviteId = guardianInviteIdSchema.parse(
      (
        request.params as {
          inviteId: string;
        }
      ).inviteId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyRepository();
    try {
      const cancelled = await repository.cancelGuardianInvite(familyId, inviteId, authUserId);
      if (!cancelled) {
        throw notFound('Guardian invitation not found', {
          inviteId,
        });
      }
      await recordAuditEvent({
        request,
        action: 'family_guardian_invite.cancel',
        resourceType: 'family_guardian_invite',
        resourceId: inviteId,
        result: 'SUCCESS',
        metadata: {
          familyId,
        },
      });
      return reply.code(204).send();
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'family_guardian_invite.cancel',
        resourceType: 'family_guardian_invite',
        resourceId: inviteId,
        result: auditResultForError(error),
        metadata: {
          familyId,
        },
      });
      throw error;
    }
  });
  app.delete('/families/:familyId/guardians/:guardianId', async (request, reply) => {
    const familyId = familyIdSchema.parse(
      (
        request.params as {
          familyId: string;
        }
      ).familyId,
    );
    const guardianId = familyGuardianIdSchema.parse(
      (
        request.params as {
          guardianId: string;
        }
      ).guardianId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyRepository();
    try {
      const removed = await repository.removeGuardian(familyId, guardianId, authUserId);
      if (!removed) {
        throw notFound('Guardian not found', {
          guardianId,
        });
      }
      await recordAuditEvent({
        request,
        action: 'family_guardian.remove',
        resourceType: 'family_guardian',
        resourceId: guardianId,
        result: 'SUCCESS',
        metadata: {
          familyId,
        },
      });
      return reply.code(204).send();
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'family_guardian.remove',
        resourceType: 'family_guardian',
        resourceId: guardianId,
        result: auditResultForError(error),
        metadata: {
          familyId,
        },
      });
      throw error;
    }
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
    await recordAuditEvent({
      request,
      action: 'athlete.create',
      resourceType: 'athlete',
      resourceId: athlete.id as string,
      result: 'SUCCESS',
      metadata: {
        familyId: body.familyId,
      },
    });
    return reply.code(201).send({
      athleteId: athlete.id,
      ...athlete,
    });
  });
  app.get('/athletes/:athleteId', async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    const repository = resolveFamilyAthleteRepository();
    const familyId = await repository.resolveAthleteFamilyId(athleteId);
    if (familyId) {
      await ensureCanReadAthleteProfile(request, athleteId, familyId);
    } else {
      await assertCanReadAthleteHealth(request, athleteId);
    }
    const athlete = await repository.getAthlete(athleteId);
    if (!athlete) {
      throw notFound('Athlete not found', {
        athleteId,
      });
    }
    await recordAuditEvent({
      request,
      action: 'athlete.read',
      resourceType: 'athlete',
      resourceId: athleteId,
      result: 'SUCCESS',
      sensitiveRead: true,
    });
    return reply.send({
      athleteId,
      ...athlete,
    });
  });
  app.get('/athletes/:athleteId/squad-memberships', async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveClubAuthorityRepository();
    try {
      const memberships = await repository.listAthleteSquadMemberships({
        athleteId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordAuditEvent({
        request,
        action: 'athlete_squad_membership.list',
        resourceType: 'athlete',
        resourceId: athleteId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          count: memberships.length,
        },
      });
      return reply.send(
        athleteSquadMembershipsResponseSchema.parse({
          athleteId,
          memberships,
        }),
      );
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'athlete_squad_membership.list',
        resourceType: 'athlete',
        resourceId: athleteId,
        result: auditResultForError(error),
        sensitiveRead: true,
      });
      throw error;
    }
  });
  app.patch('/athletes/:athleteId', async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    const body = updateAthleteRequestSchema.parse(request.body);
    const repository = resolveFamilyAthleteRepository();
    const familyId = await repository.resolveAthleteFamilyId(athleteId);
    if (!familyId) {
      throw notFound('Athlete not found', {
        athleteId,
      });
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
      throw notFound('Athlete not found', {
        athleteId,
      });
    }
    await recordAuditEvent({
      request,
      action: 'athlete.update',
      resourceType: 'athlete',
      resourceId: athleteId,
      result: 'SUCCESS',
    });
    return reply.send({
      athleteId,
      ...athlete,
    });
  });
  app.delete('/athletes/:athleteId', async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    const repository = resolveFamilyAthleteRepository();
    let familyId: string | null = null;
    try {
      familyId = await repository.resolveAthleteFamilyId(athleteId);
      if (!familyId) {
        throw notFound('Athlete not found', {
          athleteId,
        });
      }
      if (!(await repository.hasFamilyMembership(familyId, authUserId))) {
        throw forbidden('Not allowed to manage this family');
      }
      const deleted = await repository.deleteAthlete(athleteId, authUserId);
      if (!deleted) {
        throw notFound('Athlete not found', {
          athleteId,
        });
      }
      await recordAuditEvent({
        request,
        action: 'athlete.remove',
        resourceType: 'athlete',
        resourceId: athleteId,
        result: 'SUCCESS',
        metadata: {
          familyId,
        },
      });
      return reply.code(204).send();
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'athlete.remove',
        resourceType: 'athlete',
        resourceId: athleteId,
        result: auditResultForError(error),
        metadata: {
          familyId,
        },
      });
      throw error;
    }
  });
  app.get('/athletes/:athleteId/injuries', async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanReadAthleteHealth(request, athleteId);
    const repository = resolveFamilyAthleteRepository();
    const injuries = await repository.listInjuries(athleteId);
    const payload = injuriesResponseSchema.parse({
      athleteId,
      injuries,
    });
    await recordAuditEvent({
      request,
      action: 'athlete_injury.read',
      resourceType: 'athlete_injury',
      resourceId: athleteId,
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        count: injuries.length,
      },
    });
    return reply.send(payload);
  });
  app.post('/athletes/:athleteId/injuries', async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanWriteAthleteHealth(request, athleteId);
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
    await recordAuditEvent({
      request,
      action: 'athlete_injury.create',
      resourceType: 'athlete_injury',
      resourceId: injury.id,
      result: 'SUCCESS',
      metadata: {
        athleteId,
      },
    });
    return reply.status(201).send(injury);
  });
  app.get('/injuries/:injuryId', async (request, reply) => {
    const injuryId = injuryIdSchema.parse(
      (
        request.params as {
          injuryId: string;
        }
      ).injuryId,
    );
    const repository = resolveFamilyAthleteRepository();
    let injury: Awaited<ReturnType<typeof repository.getInjury>> = null;
    try {
      injury = await repository.getInjury(injuryId);
      if (!injury) {
        throw notFound('Injury record not found', {
          injuryId,
        });
      }
      await assertCanReadAthleteHealth(request, injury.athleteId);
      await recordAuditEvent({
        request,
        action: 'athlete_injury.read',
        resourceType: 'athlete_injury',
        resourceId: injuryId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          athleteId: injury.athleteId,
        },
      });
      return reply.send(injuryRecordSchema.parse(injury));
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'athlete_injury.read',
        resourceType: 'athlete_injury',
        resourceId: injuryId,
        result: auditResultForError(error),
        sensitiveRead: true,
        metadata: {
          athleteId: injury?.athleteId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });
  app.patch('/injuries/:injuryId', async (request, reply) => {
    const injuryId = injuryIdSchema.parse(
      (
        request.params as {
          injuryId: string;
        }
      ).injuryId,
    );
    const body = updateInjuryRequestSchema.parse(request.body);
    const repository = resolveFamilyAthleteRepository();
    const current = await repository.getInjury(injuryId);
    if (!current) {
      throw notFound('Injury record not found', {
        injuryId,
      });
    }
    await assertCanWriteAthleteHealth(request, current.athleteId);
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
      throw notFound('Injury record not found', {
        injuryId,
      });
    }
    await recordAuditEvent({
      request,
      action: 'athlete_injury.update',
      resourceType: 'athlete_injury',
      resourceId: injuryId,
      result: 'SUCCESS',
      metadata: {
        athleteId: current.athleteId,
      },
    });
    return reply.send(updated);
  });
  app.get('/athletes/:athleteId/medical', async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanReadAthleteMedical(request, athleteId);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const record = await repository.getMedical(athleteId, userId);
    await recordAuditEvent({
      request,
      action: 'medical.read',
      resourceType: 'child_medical_record',
      resourceId: athleteId,
      result: 'SUCCESS',
      sensitiveRead: true,
    });
    return reply.send(medicalRecordResponseSchema.parse(record));
  });
  app.patch('/athletes/:athleteId/medical', async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanWriteAthleteMedical(request, athleteId);
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
    await recordAuditEvent({
      request,
      action: 'medical.update',
      resourceType: 'child_medical_record',
      resourceId: athleteId,
      result: 'SUCCESS',
    });
    return reply.send(medicalRecordResponseSchema.parse(updated));
  });
  app.get('/athletes/:athleteId/emergency-contacts', async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanReadAthleteMedical(request, athleteId);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const record = await repository.getEmergencyContacts(athleteId, userId);
    await recordAuditEvent({
      request,
      action: 'emergency_contacts.read',
      resourceType: 'child_emergency_contact',
      resourceId: athleteId,
      result: 'SUCCESS',
      sensitiveRead: true,
    });
    return reply.send(emergencyContactsResponseSchema.parse(record));
  });
  app.patch('/athletes/:athleteId/emergency-contacts', async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanWriteAthleteMedical(request, athleteId);
    const body = updateEmergencyContactsRequestSchema.parse(request.body);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const updated = await repository.replaceEmergencyContacts(
      athleteId,
      {
        contacts: body.contacts,
      },
      userId,
    );
    await recordAuditEvent({
      request,
      action: 'emergency_contacts.update',
      resourceType: 'child_emergency_contact',
      resourceId: athleteId,
      result: 'SUCCESS',
      metadata: {
        count: body.contacts.length,
      },
    });
    return reply.send(emergencyContactsResponseSchema.parse(updated));
  });
  app.get('/athletes/:athleteId/consents', async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanReadAthleteMedical(request, athleteId);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const record = await repository.getConsents(athleteId, userId);
    await recordAuditEvent({
      request,
      action: 'consents.read',
      resourceType: 'child_consent',
      resourceId: athleteId,
      result: 'SUCCESS',
      sensitiveRead: true,
    });
    return reply.send(consentsResponseSchema.parse(record));
  });
  app.put('/athletes/:athleteId/consents', async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanWriteAthleteMedical(request, athleteId);
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
    await recordAuditEvent({
      request,
      action: 'consents.update',
      resourceType: 'child_consent',
      resourceId: athleteId,
      result: 'SUCCESS',
      metadata: {
        count: body.consents.length,
      },
    });
    return reply.send(consentsResponseSchema.parse(updated));
  });
};
export default familyAthleteRoutes;
