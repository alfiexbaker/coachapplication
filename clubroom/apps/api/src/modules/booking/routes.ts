import crypto from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  bookingIdSchema,
  cancelBookingSeriesRequestSchema,
  cancelBookingRequestSchema,
  confirmBookingRequestSchema,
  completeBookingRequestSchema,
  createBookingRequestSchema,
  createBookingSeriesRequestSchema,
  inviteResponseRequestSchema,
  joinGroupSessionWaitlistRequestSchema,
  pauseBookingSeriesRequestSchema,
  reopenBookingRequestSchema,
  registerGroupSessionRequestSchema,
  resumeBookingSeriesRequestSchema,
  updateBookingRequestSchema,
  updateBookingSeriesRequestSchema,
  isClubStaffRole,
  parseOrganizationRole,
} from '@clubroom/shared-contracts';
import {
  ApiProblemError,
  badRequest,
  conflict,
  forbidden,
  notFound,
} from '../../lib/http-errors.js';
import {
  resolveCreateBookingIdempotency,
  resolveBookingRepository,
  type SeedTables,
} from '../../repositories/p0/booking-repository.js';
import { cancellationRecordRepository } from '../../repositories/p0/cancellation-record-repository.js';
import { resolveBookingReviewRepository } from '../../repositories/p0/booking-review-repository.js';
import {
  assertBookingSeriesCreateAccess,
  assertBookingSeriesOccurrencesValid,
  resolveCreateBookingSeriesIdempotency,
  resolveBookingSeriesRepository,
} from '../../repositories/p0/booking-series-repository.js';
import { resolveGroupSessionRepository } from '../../repositories/p0/group-session-repository.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from '../../repositories/p0/normalize.js';
import { generateInvoiceForBooking, getBookingInvoiceContext } from '../../lib/invoice-runtime.js';
import {
  assertCoachAvailabilitySlotOpen,
  resolveCoachAvailabilityTables,
  slotToScheduledAt,
} from '../coach-club/availability.js';
type SeedRow = Record<string, unknown>;
type InviteRuntimeBackend = 'seed' | 'db-fixture' | 'db';
type InviteRuntimeStore = {
  version: string | null;
  tables: SeedTables;
  backend: InviteRuntimeBackend;
};
type InviteRsvpStatus = 'going' | 'maybe' | 'cant_go';
type InviteRsvpResponseRow = {
  id: string;
  inviteId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  childId?: string;
  childName?: string;
  status: InviteRsvpStatus;
  respondedAt: string;
};
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
const asObject = (value: unknown): SeedRow | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : undefined;
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const bookingSeriesIdSchema = z.string().regex(/^rec_[A-Za-z0-9-]+$/);
const coachIdSchema = z.string().trim().min(1);
const inviteRsvpStatusSchema = z.enum(['going', 'maybe', 'cant_go']);
const inviteRsvpResponseRequestSchema = z.object({
  status: inviteRsvpStatusSchema,
  userId: z.string().trim().min(1).optional(),
  userName: z.string().trim().min(1).max(160).optional(),
  userPhotoUrl: z.string().trim().min(1).max(2048).optional(),
  childId: z.string().trim().min(1).optional(),
  childName: z.string().trim().min(1).max(160).optional(),
});
const bookingSessionNoteRequestSchema = z.object({
  summary: z.string().trim().max(4000),
  focus: z.array(z.string().trim().min(1).max(120)).max(24).default([]),
  improvements: z.string().trim().max(4000).default(''),
  homework: z.string().trim().max(4000).default(''),
  effort: z.number().int().min(1).max(5).default(3),
  attendance: z.string().trim().max(160).default(''),
  videoUrls: z.array(z.string().trim().min(1).max(2048)).max(24).optional(),
  imageUrls: z.array(z.string().trim().min(1).max(2048)).max(24).optional(),
});
const cancellationRecordsQuerySchema = z.object({
  coachId: z.string().trim().min(1).optional(),
});
const INVITE_CREATE_ENDPOINT_KEY = 'POST:/v1/invites';
const INVITE_IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_RUNTIME_TRANSACTION_OPTIONS = {
  maxWait: 5_000,
  timeout: 15_000,
};
async function recordInviteAudit(params: {
  request: FastifyRequest;
  action:
    | 'invite.create'
    | 'invite.cancel'
    | 'invite.remind'
    | 'invite.dismiss'
    | 'invite.respond'
    | 'invite.rsvp.read'
    | 'invite.rsvp.respond'
    | 'invite.rsvp.update';
  resourceId?: string | null;
  subjectUserId?: string | null;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: 'invite',
    resourceId: params.resourceId ?? null,
    subjectUserId: params.subjectUserId ?? null,
    result: params.result,
    metadata: params.metadata,
  });
}
async function recordSessionRsvpAudit(params: {
  request: FastifyRequest;
  action:
    | 'session_rsvp.create'
    | 'session_rsvp.read'
    | 'session_rsvp.respond'
    | 'session_rsvp.remind'
    | 'session_rsvp.remove';
  resourceId?: string | null;
  subjectUserId?: string | null;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: 'session_rsvp',
    resourceId: params.resourceId ?? null,
    subjectUserId: params.subjectUserId ?? null,
    result: params.result,
    metadata: params.metadata,
  });
}
async function generateRegistrationInvoiceIfBillable(params: {
  bookingId?: string | null;
  actorUserId: string;
}): Promise<SeedRow | null> {
  if (!params.bookingId) {
    return null;
  }
  const context = await getBookingInvoiceContext(params.bookingId);
  if (!context || context.totalMinor <= 0) {
    return null;
  }
  const generated = await generateInvoiceForBooking({
    bookingId: params.bookingId,
    actorUserId: params.actorUserId,
    notes: 'Generated from group session registration.',
  });
  return generated.invoice;
}
function toSeedRows<T>(values: T[]): SeedRow[] {
  return normalizeForJson(values) as unknown as SeedRow[];
}
function mergeInviteRuntimeTables(target: SeedTables, source: SeedTables): void {
  for (const [key, rows] of Object.entries(source)) {
    if (key === 'invites' || key === 'inviteTargets' || key === 'idempotencyKeys') {
      continue;
    }
    target[key] = rows;
  }
}
function toOptionalDate(value: unknown): Date | null {
  const stringValue = asString(value);
  if (!stringValue) {
    return null;
  }
  const time = Date.parse(stringValue);
  return Number.isFinite(time) ? new Date(time) : null;
}
function toInviteStatus(
  value: unknown,
): 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVOKED' {
  const normalized = asString(value)?.toUpperCase();
  if (
    normalized === 'ACCEPTED' ||
    normalized === 'DECLINED' ||
    normalized === 'EXPIRED' ||
    normalized === 'REVOKED'
  ) {
    return normalized;
  }
  return 'PENDING';
}
async function getInviteRuntimeStore(params?: {
  athleteIds?: string[];
  authUserId?: string;
  coachUserId?: string;
  existingSessionId?: string;
  inviteId?: string;
  parentUserId?: string;
}): Promise<InviteRuntimeStore> {
  if (getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()) {
    const store = getDbFixtureStore();
    return {
      version: store.version,
      tables: store.tables,
      backend: 'db-fixture',
    };
  }
  if (getApiDataBackend() === 'db') {
    const prisma = getPrismaClientOrThrow();
    const invites = await prisma.invite.findMany({
      where: {
        inviteType: 'session_invite',
        ...(params?.inviteId
          ? {
              id: params.inviteId,
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const inviteIds = invites.map((invite) => invite.id);
    const inviteTargets =
      inviteIds.length > 0
        ? await prisma.inviteTarget.findMany({
            where: {
              inviteId: {
                in: inviteIds,
              },
            },
          })
        : [];
    const groupSessionIds = Array.from(
      new Set(
        [
          params?.existingSessionId,
          ...invites.flatMap((invite) => (invite.groupSessionId ? [invite.groupSessionId] : [])),
        ].filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );
    const clubIds = Array.from(
      new Set(invites.flatMap((invite) => (invite.clubId ? [invite.clubId] : []))),
    );
    const userIds = Array.from(
      new Set(
        [
          params?.authUserId,
          params?.coachUserId,
          params?.parentUserId,
          ...invites.map((invite) => invite.senderUserId),
          ...inviteTargets.flatMap((target) => (target.targetUserId ? [target.targetUserId] : [])),
        ].filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );
    const athleteIds = Array.from(
      new Set(
        [
          ...(params?.athleteIds ?? []),
          ...inviteTargets.flatMap((target) =>
            target.targetAthleteId ? [target.targetAthleteId] : [],
          ),
        ].filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );
    const [users, guardianChildLinks, groupSessions, clubs, idempotencyKeys] = await Promise.all([
      userIds.length > 0
        ? prisma.user.findMany({
            where: {
              id: {
                in: userIds,
              },
            },
          })
        : Promise.resolve([]),
      athleteIds.length > 0 || params?.parentUserId
        ? prisma.guardianChildLink.findMany({
            where: {
              ...(athleteIds.length > 0
                ? {
                    athleteId: {
                      in: athleteIds,
                    },
                  }
                : {}),
              ...(params?.parentUserId
                ? {
                    guardianUserId: params.parentUserId,
                  }
                : {}),
              deletedAt: null,
            },
          })
        : Promise.resolve([]),
      groupSessionIds.length > 0
        ? prisma.groupSession.findMany({
            where: {
              id: {
                in: groupSessionIds,
              },
              deletedAt: null,
            },
          })
        : Promise.resolve([]),
      clubIds.length > 0
        ? prisma.club.findMany({
            where: {
              id: {
                in: clubIds,
              },
              deletedAt: null,
            },
          })
        : Promise.resolve([]),
      params?.authUserId || params?.coachUserId || params?.parentUserId
        ? prisma.idempotencyKey.findMany({
            where: {
              endpointKey: INVITE_CREATE_ENDPOINT_KEY,
              userId: {
                in: [params.authUserId, params.coachUserId, params.parentUserId].filter(
                  (id): id is string => typeof id === 'string' && id.length > 0,
                ),
              },
            },
          })
        : Promise.resolve([]),
    ]);
    const athletes =
      athleteIds.length > 0
        ? await prisma.athlete.findMany({
            where: {
              id: {
                in: athleteIds,
              },
              deletedAt: null,
            },
          })
        : [];
    return {
      version: null,
      backend: 'db',
      tables: {
        users: toSeedRows(users),
        guardianChildLinks: toSeedRows(guardianChildLinks),
        athletes: toSeedRows(athletes),
        groupSessions: toSeedRows(groupSessions),
        clubs: toSeedRows(clubs),
        invites: toSeedRows(invites),
        inviteTargets: toSeedRows(inviteTargets),
        idempotencyKeys: toSeedRows(idempotencyKeys),
      },
    };
  }
  const store = getMarketplaceSeedStore();
  return {
    version: store.version,
    tables: store.tables,
    backend: 'seed',
  };
}
async function commitInviteRuntimeStore(store: InviteRuntimeStore): Promise<void> {
  if (store.backend !== 'db') {
    return;
  }
  const prisma = getPrismaClientOrThrow();
  const invites = asRows(store.tables.invites);
  const targets = asRows(store.tables.inviteTargets);
  const idempotencyKeys = asRows(store.tables.idempotencyKeys);
  await prisma.$transaction(async (tx) => {
    await Promise.all(
      invites.map((invite) => {
        const inviteId = asString(invite.id);
        const senderUserId = asString(invite.senderUserId);
        if (!inviteId || !senderUserId || asString(invite.inviteType) !== 'session_invite') {
          return Promise.resolve();
        }
        const data = {
          inviteType: 'session_invite',
          senderUserId,
          clubId: asString(invite.clubId) ?? null,
          groupSessionId: asString(invite.groupSessionId) ?? null,
          bookingId: asString(invite.bookingId) ?? null,
          eventId: asString(invite.eventId) ?? null,
          status: toInviteStatus(invite.status),
          message: asString(invite.message) ?? null,
          expiresAt: toOptionalDate(invite.expiresAt),
          metadataJson: (asObject(invite.metadataJson) ?? {}) as never,
          revokedAt: toOptionalDate(invite.revokedAt),
          createdAt: toOptionalDate(invite.createdAt) ?? new Date(),
          updatedAt: toOptionalDate(invite.updatedAt) ?? new Date(),
        };
        return tx.invite.upsert({
          where: {
            id: inviteId,
          },
          create: {
            id: inviteId,
            ...data,
          },
          update: data,
        });
      }),
    )
      .then(() =>
        Promise.all(
          targets.map((target) => {
            const targetId = asString(target.id);
            const inviteId = asString(target.inviteId);
            if (!targetId || !inviteId) {
              return Promise.resolve();
            }
            const data = {
              inviteId,
              targetUserId: asString(target.targetUserId) ?? null,
              targetAthleteId: asString(target.targetAthleteId) ?? null,
              targetFamilyId: asString(target.targetFamilyId) ?? null,
              status: toInviteStatus(target.status),
              respondedAt: toOptionalDate(target.respondedAt),
              responsePayloadJson: (asObject(target.responsePayloadJson) ?? null) as never,
              createdAt: toOptionalDate(target.createdAt) ?? new Date(),
              updatedAt: toOptionalDate(target.updatedAt) ?? new Date(),
            };
            return tx.inviteTarget.upsert({
              where: {
                id: targetId,
              },
              create: {
                id: targetId,
                ...data,
              },
              update: data,
            });
          }),
        ),
      )
      .then(() =>
        Promise.all(
          idempotencyKeys.map((entry) => {
            const userId = asString(entry.userId);
            const endpointKey = asString(entry.endpointKey);
            const idempotencyKey = asString(entry.idempotencyKey);
            const requestHash = asString(entry.requestHash);
            if (!userId || !endpointKey || !idempotencyKey || !requestHash) {
              return Promise.resolve();
            }
            const data = {
              id: asString(entry.id) ?? newId('idk'),
              userId,
              endpointKey,
              idempotencyKey,
              requestHash,
              responseStatus: asNumber(entry.responseStatus) ?? 201,
              responseBodyJson: (asObject(entry.responseBodyJson) ?? {}) as never,
              expiresAt:
                toOptionalDate(entry.expiresAt) ?? new Date(Date.now() + INVITE_IDEMPOTENCY_TTL_MS),
            };
            return tx.idempotencyKey.upsert({
              where: {
                userId_endpointKey_idempotencyKey: {
                  userId,
                  endpointKey,
                  idempotencyKey,
                },
              },
              create: data,
              update: {
                requestHash: data.requestHash,
                responseStatus: data.responseStatus,
                responseBodyJson: data.responseBodyJson,
                expiresAt: data.expiresAt,
              },
            });
          }),
        ),
      );
  }, INVITE_RUNTIME_TRANSACTION_OPTIONS);
}
const eventRsvpRequestSchema = z.object({
  status: z.enum(['GOING', 'MAYBE', 'NOT_GOING']),
  guestCount: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(500).nullable().optional(),
});
type EventRsvpRequestBody = z.infer<typeof eventRsvpRequestSchema>;

const eventCheckinRequestSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  userRole: z.enum(['COACH', 'PARENT', 'ATHLETE']).default('PARENT'),
  checkInMethod: z.enum(['SELF', 'COACH', 'QR_CODE', 'LOCATION']).optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
    })
    .optional(),
  locationValidated: z.boolean().optional(),
  distanceFromVenue: z.number().int().min(0).optional(),
  guestsCheckedIn: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(500).nullable().optional(),
});
type EventCheckinRequestBody = z.infer<typeof eventCheckinRequestSchema>;
const clubEventTypeSchema = z.enum([
  'TOURNAMENT',
  'SOCIAL',
  'MEETING',
  'PRESENTATION',
  'FUNDRAISER',
  'TRIAL_DAY',
  'TRAINING_CAMP',
  'OTHER',
]);
const clubEventTargetAudienceSchema = z.enum(['ALL', 'COACHES', 'PARENTS', 'ATHLETES', 'SQUAD']);
const clubEventWriteSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().max(5000).optional(),
  eventType: clubEventTypeSchema.optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  venue: z.string().trim().min(1).max(240).optional(),
  address: z.string().max(500).optional(),
  isVirtual: z.boolean().optional(),
  meetingLink: z.string().url().optional(),
  targetAudience: clubEventTargetAudienceSchema.optional(),
  squadIds: z.array(z.string().trim().min(1)).optional(),
  athleteIds: z.array(z.string().trim().min(1)).max(200).optional(),
  maxAttendees: z.number().int().min(1).max(10000).optional(),
  price: z.number().min(0).max(100000).optional(),
  currency: z.string().trim().length(3).optional(),
  rsvpRequired: z.boolean().optional(),
  rsvpDeadline: z.string().optional(),
  imageUrl: z.string().url().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).optional(),
});
const createClubEventRequestSchema = clubEventWriteSchema.extend({
  title: z.string().trim().min(1).max(180),
  eventType: clubEventTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  venue: z.string().trim().min(1).max(240),
  targetAudience: clubEventTargetAudienceSchema,
});
const updateClubEventRequestSchema = clubEventWriteSchema.refine(
  (value) => Object.keys(value).length > 0,
  'At least one event field is required',
);
const eventSquadInviteRequestSchema = z.object({
  squadIds: z.array(z.string().trim().min(1)).min(1).max(100),
  excludeAthleteIds: z.array(z.string().trim().min(1)).max(1000).optional(),
  excludeMemberIds: z.array(z.string().trim().min(1)).max(1000).optional(),
});
const eventAthleteInviteRequestSchema = z.object({
  athleteIds: z.array(z.string().trim().min(1)).min(1).max(200),
});
type ClubEventWriteBody = z.infer<typeof clubEventWriteSchema>;
type CreateClubEventRequestBody = z.infer<typeof createClubEventRequestSchema>;

function toDbEventRsvpStatus(
  status: EventRsvpRequestBody['status'],
): 'GOING' | 'MAYBE' | 'DECLINED' {
  return status === 'NOT_GOING' ? 'DECLINED' : status;
}

function toApiEventRsvpStatus(status: unknown): EventRsvpRequestBody['status'] {
  const normalized = asString(status);
  if (normalized === 'GOING' || normalized === 'MAYBE' || normalized === 'NOT_GOING') {
    return normalized;
  }
  if (normalized === 'DECLINED') {
    return 'NOT_GOING';
  }
  return 'MAYBE';
}

function buildEventRsvpResponse(row: SeedRow): SeedRow {
  return {
    ...row,
    eventId: asString(row.clubEventId) ?? asString(row.eventId) ?? null,
    status: toApiEventRsvpStatus(row.status),
  };
}

async function recordEventRsvpReadAudit(params: {
  request: FastifyRequest;
  eventId: string;
  authUserId: string;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: 'event.rsvp.read',
    resourceType: 'club_event',
    resourceId: params.eventId,
    subjectUserId: params.authUserId,
    result: params.result,
    metadata: params.metadata,
  });
}

async function assertCanReadEventRsvps(params: {
  request: FastifyRequest;
  eventId: string;
  authUserId: string;
}): Promise<{ clubId: string }> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const event = await prisma.clubEvent.findFirst({
      where: {
        id: params.eventId,
        deletedAt: null,
      },
      select: {
        clubId: true,
      },
    });
    if (!event) {
      await recordEventRsvpReadAudit({
        request: params.request,
        eventId: params.eventId,
        authUserId: params.authUserId,
        result: 'DENY',
        metadata: { reason: 'event_not_found' },
      });
      throw notFound('Club event not found', { eventId: params.eventId });
    }
    const membership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: event.clubId,
          userId: params.authUserId,
        },
      },
      select: {
        active: true,
        deletedAt: true,
      },
    });
    if (
      !isPrivilegedAdminAuth(params.request.auth) &&
      (!membership?.active || membership.deletedAt)
    ) {
      await recordEventRsvpReadAudit({
        request: params.request,
        eventId: params.eventId,
        authUserId: params.authUserId,
        result: 'DENY',
        metadata: { reason: 'not_club_member', clubId: event.clubId },
      });
      throw forbidden('User is not a member of event club');
    }
    return { clubId: event.clubId };
  }

  const store =
    getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
      ? getDbFixtureStore()
      : getMarketplaceSeedStore();
  const event = asRows(store.tables.clubEvents).find(
    (row) => asString(row.id) === params.eventId && !asString(row.deletedAt),
  );
  if (!event) {
    await recordEventRsvpReadAudit({
      request: params.request,
      eventId: params.eventId,
      authUserId: params.authUserId,
      result: 'DENY',
      metadata: { reason: 'event_not_found' },
    });
    throw notFound('Club event not found', { eventId: params.eventId });
  }
  const clubId = asString(event.clubId) ?? '';
  const hasClubMembership = asRows(store.tables.clubMemberships).some(
    (row) =>
      asString(row.clubId) === clubId &&
      asString(row.userId) === params.authUserId &&
      row.active !== false &&
      !asString(row.deletedAt),
  );
  if (!isPrivilegedAdminAuth(params.request.auth) && !hasClubMembership) {
    await recordEventRsvpReadAudit({
      request: params.request,
      eventId: params.eventId,
      authUserId: params.authUserId,
      result: 'DENY',
      metadata: { reason: 'not_club_member', clubId },
    });
    throw forbidden('User is not a member of event club');
  }
  return { clubId };
}

function isActiveClubStaffMembership(row: SeedRow | null | undefined): boolean {
  const role = parseOrganizationRole(asString(row?.role));
  return Boolean(
    row && row.active !== false && !asString(row.deletedAt) && role && isClubStaffRole(role),
  );
}

async function recordEventRsvpReminderAudit(params: {
  request: FastifyRequest;
  eventId: string;
  authUserId: string;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: 'event.rsvp.remind',
    resourceType: 'club_event',
    resourceId: params.eventId,
    subjectUserId: params.authUserId,
    result: params.result,
    metadata: params.metadata,
  });
}

async function assertCanRemindEventRsvps(params: {
  request: FastifyRequest;
  eventId: string;
  authUserId: string;
}): Promise<{ clubId: string; eventTitle: string }> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const event = await prisma.clubEvent.findFirst({
      where: {
        id: params.eventId,
        deletedAt: null,
      },
      select: {
        clubId: true,
        title: true,
      },
    });
    if (!event) {
      await recordEventRsvpReminderAudit({
        request: params.request,
        eventId: params.eventId,
        authUserId: params.authUserId,
        result: 'DENY',
        metadata: { reason: 'event_not_found' },
      });
      throw notFound('Club event not found', { eventId: params.eventId });
    }
    const membership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: event.clubId,
          userId: params.authUserId,
        },
      },
      select: {
        active: true,
        deletedAt: true,
        role: true,
      },
    });
    const role = parseOrganizationRole(membership?.role);
    const canRemind =
      isPrivilegedAdminAuth(params.request.auth) ||
      Boolean(membership?.active && !membership.deletedAt && role && isClubStaffRole(role));
    if (!canRemind) {
      await recordEventRsvpReminderAudit({
        request: params.request,
        eventId: params.eventId,
        authUserId: params.authUserId,
        result: 'DENY',
        metadata: { reason: 'not_event_staff', clubId: event.clubId },
      });
      throw forbidden('Only event staff can send RSVP reminders');
    }
    return { clubId: event.clubId, eventTitle: event.title };
  }

  const store =
    getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
      ? getDbFixtureStore()
      : getMarketplaceSeedStore();
  const event = asRows(store.tables.clubEvents).find(
    (row) => asString(row.id) === params.eventId && !asString(row.deletedAt),
  );
  if (!event) {
    await recordEventRsvpReminderAudit({
      request: params.request,
      eventId: params.eventId,
      authUserId: params.authUserId,
      result: 'DENY',
      metadata: { reason: 'event_not_found' },
    });
    throw notFound('Club event not found', { eventId: params.eventId });
  }
  const clubId = asString(event.clubId) ?? '';
  const membership =
    asRows(store.tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === params.authUserId,
    ) ?? null;
  if (!isPrivilegedAdminAuth(params.request.auth) && !isActiveClubStaffMembership(membership)) {
    await recordEventRsvpReminderAudit({
      request: params.request,
      eventId: params.eventId,
      authUserId: params.authUserId,
      result: 'DENY',
      metadata: { reason: 'not_event_staff', clubId },
    });
    throw forbidden('Only event staff can send RSVP reminders');
  }
  return { clubId, eventTitle: asString(event.title) ?? 'this event' };
}

function buildEventRsvpReminderNotification(params: {
  eventId: string;
  clubId: string;
  eventTitle: string;
  userId: string;
  now: string;
}): SeedRow {
  return {
    id: newId('nfn'),
    userId: params.userId,
    type: 'EVENT_RSVP_REMINDER',
    title: 'Reminder: Event RSVP',
    body: `Please confirm attendance for "${params.eventTitle}".`,
    status: 'UNREAD',
    sourceType: 'club_event',
    sourceId: params.eventId,
    deepLink: `/events/${params.eventId}/rsvp`,
    metadataJson: {
      clubId: params.clubId,
      eventId: params.eventId,
    },
    createdAt: params.now,
    updatedAt: params.now,
    readAt: null,
    dismissedAt: null,
  };
}

function buildClubEventInviteNotification(params: {
  eventId: string;
  clubId: string;
  eventTitle: string;
  userId: string;
  now: string;
  squadIds?: string[];
  athleteIds?: string[];
}): SeedRow {
  return {
    id: newId('nfn'),
    userId: params.userId,
    type: 'CLUB_EVENT_INVITE',
    title: 'New club event',
    body: `You have been invited to "${params.eventTitle}".`,
    status: 'UNREAD',
    sourceType: 'club_event',
    sourceId: params.eventId,
    deepLink: `/events/${params.eventId}`,
    metadataJson: {
      clubId: params.clubId,
      eventId: params.eventId,
      ...(params.squadIds ? { squadIds: params.squadIds } : {}),
      ...(params.athleteIds ? { athleteIds: params.athleteIds } : {}),
    },
    createdAt: params.now,
    updatedAt: params.now,
    readAt: null,
    dismissedAt: null,
  };
}

type EventSquadInviteTargets = {
  squadIds: string[];
  missingSquadIds: string[];
  targetAthleteCount: number;
  recipientUserIds: string[];
};

type EventAthleteInviteTargets = {
  athleteIds: string[];
  missingAthleteIds: string[];
  targetAthleteCount: number;
  recipientUserIds: string[];
};

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function primaryGuardianUserIdFromRows(guardianRows: SeedRow[]): string | null {
  const sorted = [...guardianRows].sort((a, b) => {
    if (a.isPrimary === true && b.isPrimary !== true) return -1;
    if (b.isPrimary === true && a.isPrimary !== true) return 1;
    return Date.parse(asString(a.createdAt) ?? '') - Date.parse(asString(b.createdAt) ?? '');
  });
  return asString(sorted[0]?.guardianUserId) ?? null;
}

async function resolveDbEventSquadInviteTargets(params: {
  clubId: string;
  squadIds: string[];
  excludeAthleteIds: string[];
}): Promise<EventSquadInviteTargets> {
  const prisma = getPrismaClientOrThrow();
  const squadIds = dedupeStrings(params.squadIds);
  const squads = await prisma.squad.findMany({
    where: {
      id: {
        in: squadIds,
      },
      clubId: params.clubId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
  const validSquadIds = new Set(squads.map((squad) => squad.id));
  const missingSquadIds = squadIds.filter((squadId) => !validSquadIds.has(squadId));
  if (missingSquadIds.length > 0) {
    return {
      squadIds,
      missingSquadIds,
      targetAthleteCount: 0,
      recipientUserIds: [],
    };
  }

  const excludedAthletes = new Set(params.excludeAthleteIds);
  const memberships = await prisma.squadMembership.findMany({
    where: {
      squadId: {
        in: squadIds,
      },
      status: 'active',
      deletedAt: null,
      ...(excludedAthletes.size > 0
        ? {
            athleteId: {
              notIn: [...excludedAthletes],
            },
          }
        : {}),
    },
    include: {
      athlete: {
        select: {
          id: true,
          guardianLinks: {
            where: {
              deletedAt: null,
            },
            select: {
              guardianUserId: true,
              isPrimary: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  const athleteIds = new Set<string>();
  const recipientUserIds = new Set<string>();
  for (const membership of memberships) {
    athleteIds.add(membership.athlete.id);
    const primaryGuardian =
      membership.athlete.guardianLinks.find((link) => link.isPrimary) ??
      [...membership.athlete.guardianLinks].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      )[0];
    if (primaryGuardian?.guardianUserId) {
      recipientUserIds.add(primaryGuardian.guardianUserId);
    }
  }

  return {
    squadIds,
    missingSquadIds: [],
    targetAthleteCount: athleteIds.size,
    recipientUserIds: [...recipientUserIds],
  };
}

function resolveStoreEventSquadInviteTargets(params: {
  tables: SeedTables;
  clubId: string;
  squadIds: string[];
  excludeAthleteIds: string[];
}): EventSquadInviteTargets {
  const squadIds = dedupeStrings(params.squadIds);
  const validSquadIds = new Set(
    asRows(params.tables.squads)
      .filter(
        (row) =>
          squadIds.includes(asString(row.id) ?? '') &&
          asString(row.clubId) === params.clubId &&
          !asString(row.deletedAt),
      )
      .map((row) => asString(row.id))
      .filter((squadId): squadId is string => Boolean(squadId)),
  );
  const missingSquadIds = squadIds.filter((squadId) => !validSquadIds.has(squadId));
  if (missingSquadIds.length > 0) {
    return {
      squadIds,
      missingSquadIds,
      targetAthleteCount: 0,
      recipientUserIds: [],
    };
  }

  const excludedAthletes = new Set(params.excludeAthleteIds);
  const athleteIds = new Set<string>();
  const recipientUserIds = new Set<string>();
  for (const membership of asRows(params.tables.squadMemberships)) {
    const squadId = asString(membership.squadId);
    const athleteId = asString(membership.athleteId);
    if (
      !squadId ||
      !athleteId ||
      !validSquadIds.has(squadId) ||
      excludedAthletes.has(athleteId) ||
      asString(membership.status) !== 'active' ||
      asString(membership.deletedAt)
    ) {
      continue;
    }
    athleteIds.add(athleteId);
    const guardianUserId = primaryGuardianUserIdFromRows(
      asRows(params.tables.guardianChildLinks).filter(
        (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
      ),
    );
    if (guardianUserId) {
      recipientUserIds.add(guardianUserId);
    }
  }

  return {
    squadIds,
    missingSquadIds: [],
    targetAthleteCount: athleteIds.size,
    recipientUserIds: [...recipientUserIds],
  };
}

async function resolveDbEventAthleteInviteTargets(params: {
  clubId: string;
  athleteIds: string[];
}): Promise<EventAthleteInviteTargets> {
  const prisma = getPrismaClientOrThrow();
  const athleteIds = dedupeStrings(params.athleteIds);
  const memberships = await prisma.squadMembership.findMany({
    where: {
      athleteId: {
        in: athleteIds,
      },
      status: 'active',
      deletedAt: null,
      squad: {
        clubId: params.clubId,
        deletedAt: null,
      },
    },
    include: {
      athlete: {
        select: {
          id: true,
          userId: true,
          status: true,
          deletedAt: true,
          guardianLinks: {
            where: {
              deletedAt: null,
            },
            select: {
              guardianUserId: true,
            },
          },
        },
      },
    },
  });

  const validAthleteIds = new Set<string>();
  const recipientUserIds = new Set<string>();
  for (const membership of memberships) {
    if (membership.athlete.status !== 'active' || membership.athlete.deletedAt) {
      continue;
    }
    validAthleteIds.add(membership.athlete.id);
    if (membership.athlete.userId) {
      recipientUserIds.add(membership.athlete.userId);
    }
    for (const link of membership.athlete.guardianLinks) {
      recipientUserIds.add(link.guardianUserId);
    }
  }

  return {
    athleteIds,
    missingAthleteIds: athleteIds.filter((athleteId) => !validAthleteIds.has(athleteId)),
    targetAthleteCount: validAthleteIds.size,
    recipientUserIds: [...recipientUserIds],
  };
}

function resolveStoreEventAthleteInviteTargets(params: {
  tables: SeedTables;
  clubId: string;
  athleteIds: string[];
}): EventAthleteInviteTargets {
  const athleteIds = dedupeStrings(params.athleteIds);
  const eventClubSquadIds = new Set(
    asRows(params.tables.squads)
      .filter((row) => asString(row.clubId) === params.clubId && !asString(row.deletedAt))
      .map((row) => asString(row.id))
      .filter((squadId): squadId is string => Boolean(squadId)),
  );
  const activeAthletes = new Map(
    asRows(params.tables.athletes)
      .filter((row) => asString(row.status) !== 'inactive' && !asString(row.deletedAt))
      .map((row) => [asString(row.id), row])
      .filter((entry): entry is [string, SeedRow] => Boolean(entry[0])),
  );
  const validAthleteIds = new Set<string>();
  for (const membership of asRows(params.tables.squadMemberships)) {
    const squadId = asString(membership.squadId);
    const athleteId = asString(membership.athleteId);
    if (
      !squadId ||
      !athleteId ||
      !athleteIds.includes(athleteId) ||
      !eventClubSquadIds.has(squadId) ||
      !activeAthletes.has(athleteId) ||
      asString(membership.status) !== 'active' ||
      asString(membership.deletedAt)
    ) {
      continue;
    }
    validAthleteIds.add(athleteId);
  }

  const recipientUserIds = new Set<string>();
  for (const athleteId of validAthleteIds) {
    const athleteUserId = asString(activeAthletes.get(athleteId)?.userId);
    if (athleteUserId) {
      recipientUserIds.add(athleteUserId);
    }
    for (const link of asRows(params.tables.guardianChildLinks)) {
      if (asString(link.athleteId) === athleteId && !asString(link.deletedAt)) {
        const guardianUserId = asString(link.guardianUserId);
        if (guardianUserId) {
          recipientUserIds.add(guardianUserId);
        }
      }
    }
  }

  return {
    athleteIds,
    missingAthleteIds: athleteIds.filter((athleteId) => !validAthleteIds.has(athleteId)),
    targetAthleteCount: validAthleteIds.size,
    recipientUserIds: [...recipientUserIds],
  };
}

async function resolveEventAthleteInviteTargets(params: {
  clubId: string;
  athleteIds: string[];
}): Promise<EventAthleteInviteTargets> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    return resolveDbEventAthleteInviteTargets(params);
  }
  return resolveStoreEventAthleteInviteTargets({
    tables:
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore().tables
        : getMarketplaceSeedStore().tables,
    clubId: params.clubId,
    athleteIds: params.athleteIds,
  });
}

async function assertClubEventAthleteTargetsValid(params: {
  request: FastifyRequest;
  action: 'club_event.create' | 'club_event.update' | 'club_event.invite_athletes';
  eventId?: string | null;
  clubId: string;
  authUserId: string;
  athleteIds: string[];
}): Promise<EventAthleteInviteTargets> {
  const targets = await resolveEventAthleteInviteTargets({
    clubId: params.clubId,
    athleteIds: dedupeStrings(params.athleteIds),
  });
  if (targets.missingAthleteIds.length > 0) {
    await recordClubEventWriteAudit({
      request: params.request,
      action: params.action,
      eventId: params.eventId,
      clubId: params.clubId,
      authUserId: params.authUserId,
      result: 'DENY',
      metadata: {
        reason: 'invalid_athlete',
        athleteIds: targets.athleteIds,
        missingAthleteIds: targets.missingAthleteIds,
      },
    });
    throw badRequest('Athlete event targeting requires athletes from the event club');
  }
  return targets;
}

function eventTargetAthleteIds(row: SeedRow): string[] {
  const metadata = asObject(row.metadataJson) ?? {};
  return dedupeStrings(asStringArray(metadata.athleteIds));
}

function isAthleteTargetedClubEvent(row: SeedRow): boolean {
  return asString(row.visibility) === 'athlete' || eventTargetAthleteIds(row).length > 0;
}

function canReadPublishedEventForAthleteTargets(
  row: SeedRow,
  linkedAthleteIds: Set<string>,
): boolean {
  const targetAthleteIds = eventTargetAthleteIds(row);
  if (targetAthleteIds.length === 0) {
    return asString(row.visibility) !== 'athlete';
  }
  return targetAthleteIds.some((athleteId) => linkedAthleteIds.has(athleteId));
}

function canReadPublishedClubEventForUser(params: {
  event: SeedRow;
  isActiveMember: boolean;
  linkedAthleteIds: Set<string>;
}): boolean {
  if (isAthleteTargetedClubEvent(params.event)) {
    return canReadPublishedEventForAthleteTargets(params.event, params.linkedAthleteIds);
  }
  return params.isActiveMember;
}

async function resolveDbUserLinkedAthleteIds(authUserId: string): Promise<Set<string>> {
  const prisma = getPrismaClientOrThrow();
  const [selfAthletes, guardianLinks] = await Promise.all([
    prisma.athlete.findMany({
      where: {
        userId: authUserId,
        status: 'active',
        deletedAt: null,
      },
      select: {
        id: true,
      },
    }),
    prisma.guardianChildLink.findMany({
      where: {
        guardianUserId: authUserId,
        deletedAt: null,
        athlete: {
          status: 'active',
          deletedAt: null,
        },
      },
      select: {
        athleteId: true,
      },
    }),
  ]);
  return new Set([
    ...selfAthletes.map((athlete) => athlete.id),
    ...guardianLinks.map((link) => link.athleteId),
  ]);
}

function resolveStoreUserLinkedAthleteIds(tables: SeedTables, authUserId: string): Set<string> {
  const linkedAthleteIds = new Set<string>();
  for (const athlete of asRows(tables.athletes)) {
    const athleteId = asString(athlete.id);
    if (
      athleteId &&
      asString(athlete.userId) === authUserId &&
      asString(athlete.status) !== 'inactive' &&
      !asString(athlete.deletedAt)
    ) {
      linkedAthleteIds.add(athleteId);
    }
  }
  for (const link of asRows(tables.guardianChildLinks)) {
    const athleteId = asString(link.athleteId);
    if (athleteId && asString(link.guardianUserId) === authUserId && !asString(link.deletedAt)) {
      linkedAthleteIds.add(athleteId);
    }
  }
  return linkedAthleteIds;
}

function buildEventAttendanceResponse(row: SeedRow): SeedRow {
  return {
    id: asString(row.id) ?? null,
    eventId: asString(row.clubEventId) ?? asString(row.eventId) ?? null,
    userId: asString(row.userId) ?? null,
    userRole: asString(row.userRole) ?? 'PARENT',
    checkedInAt:
      asString(row.checkedInAt) ?? asString(row.recordedAt) ?? asString(row.createdAt) ?? isoNow(),
    checkedInBy: asString(row.checkedInByUserId) ?? asString(row.checkedInBy) ?? null,
    checkInMethod: asString(row.checkInMethod) ?? 'COACH',
    checkInLocation: asObject(row.locationJson) ?? asObject(row.checkInLocation) ?? null,
    locationValidated: asBoolean(row.locationValidated) ?? null,
    distanceFromVenue: asNumber(row.distanceFromVenue) ?? null,
    guestsCheckedIn: asNumber(row.guestsCheckedIn) ?? 0,
    notes: asString(row.notes) ?? null,
  };
}

function isActiveEventAttendanceRow(row: SeedRow): boolean {
  return row.deletedAt == null;
}

function incrementAttendanceRoleBucket(
  byRole: {
    coaches: { rsvp: number; checkedIn: number };
    parents: { rsvp: number; checkedIn: number };
    athletes: { rsvp: number; checkedIn: number };
  },
  roleValue: unknown,
  field: 'rsvp' | 'checkedIn',
): void {
  const role = asString(roleValue);
  if (role === 'COACH') {
    byRole.coaches[field] += 1;
    return;
  }
  if (role === 'ATHLETE') {
    byRole.athletes[field] += 1;
    return;
  }
  if (role === 'PARENT') {
    byRole.parents[field] += 1;
  }
}

function buildEventAttendanceStatsResponse(params: {
  eventId: string;
  capacity?: number | null;
  rsvps: SeedRow[];
  attendance: SeedRow[];
}): SeedRow {
  const rsvpCounts = {
    going: 0,
    notGoing: 0,
    maybe: 0,
    noResponse: 0,
  };
  const byRole = {
    coaches: { rsvp: 0, checkedIn: 0 },
    parents: { rsvp: 0, checkedIn: 0 },
    athletes: { rsvp: 0, checkedIn: 0 },
  };
  let expectedGuests = 0;
  for (const rsvp of params.rsvps) {
    const status = toApiEventRsvpStatus(rsvp.status);
    if (status === 'GOING') {
      rsvpCounts.going += 1;
      expectedGuests += asNumber(rsvp.guestCount) ?? 0;
      incrementAttendanceRoleBucket(byRole, rsvp.userRole, 'rsvp');
    } else if (status === 'NOT_GOING') {
      rsvpCounts.notGoing += 1;
    } else {
      rsvpCounts.maybe += 1;
    }
  }
  let guestsCheckedInCount = 0;
  for (const attendance of params.attendance) {
    guestsCheckedInCount += asNumber(attendance.guestsCheckedIn) ?? 0;
    incrementAttendanceRoleBucket(byRole, attendance.userRole, 'checkedIn');
  }
  const checkedInCount = params.attendance.length;
  return {
    eventId: params.eventId,
    rsvpCounts,
    expectedGuests,
    capacity: params.capacity ?? undefined,
    checkedInCount,
    guestsCheckedInCount,
    attendanceRate:
      rsvpCounts.going > 0 ? Math.round((checkedInCount / rsvpCounts.going) * 100) : 0,
    byRole,
    updatedAt: isoNow(),
  };
}

const CLUB_EVENT_TYPES = new Set([
  'TOURNAMENT',
  'SOCIAL',
  'MEETING',
  'PRESENTATION',
  'FUNDRAISER',
  'TRIAL_DAY',
  'TRAINING_CAMP',
  'OTHER',
]);
const CLUB_EVENT_TARGET_AUDIENCES = new Set(['ALL', 'COACHES', 'PARENTS', 'ATHLETES', 'SQUAD']);

function isoTimePart(value: string | undefined): string {
  if (!value) {
    return '';
  }
  const match = value.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? value.slice(11, 16);
}

function toClubEventType(value: unknown): string {
  const normalized = asString(value)
    ?.replace(/[-\s]+/g, '_')
    .toUpperCase();
  return normalized && CLUB_EVENT_TYPES.has(normalized) ? normalized : 'OTHER';
}

function toClubEventTargetAudience(value: unknown, visibility: unknown): string {
  const normalized = asString(value)
    ?.replace(/[-\s]+/g, '_')
    .toUpperCase();
  if (normalized && CLUB_EVENT_TARGET_AUDIENCES.has(normalized)) {
    return normalized;
  }
  return asString(visibility) === 'squad' ? 'SQUAD' : 'ALL';
}

function buildClubEventResponse(row: SeedRow): SeedRow {
  const metadata = asObject(row.metadataJson) ?? {};
  const startsAt = asString(row.startsAt) ?? asString(row.startDate) ?? isoNow();
  const endsAt = asString(row.endsAt) ?? asString(row.endDate);
  const date = startsAt.slice(0, 10);
  const capacity = asNumber(row.guestLimit) ?? asNumber(row.maxAttendees);
  const targetAudience = toClubEventTargetAudience(metadata.targetAudience, row.visibility);
  const priceMinor = asNumber(row.priceMinor) ?? asNumber(metadata.priceMinor);
  return {
    id: asString(row.id) ?? null,
    clubId: asString(row.clubId) ?? null,
    createdBy:
      asString(row.creatorUserId) ?? asString(row.createdByUserId) ?? asString(row.createdBy) ?? '',
    title: asString(row.title) ?? 'Club event',
    description: asString(row.description) ?? '',
    eventType: toClubEventType(metadata.type ?? row.eventType),
    date,
    startDate: date,
    startTime: isoTimePart(startsAt),
    endTime: isoTimePart(endsAt),
    venue: asString(row.location) ?? asString(metadata.venue) ?? 'Club venue',
    location: asString(row.location) ?? asString(metadata.venue) ?? 'Club venue',
    address: asString(metadata.address),
    isVirtual: asBoolean(metadata.isVirtual) ?? false,
    meetingLink: asString(metadata.meetingLink),
    targetAudience,
    squadIds: asStringArray(row.squadIdsJson).length
      ? asStringArray(row.squadIdsJson)
      : asStringArray(metadata.squadIds),
    athleteIds: asStringArray(metadata.athleteIds),
    allClub: targetAudience === 'ALL',
    maxAttendees: capacity,
    maxParticipants: capacity,
    price: asNumber(row.price) ?? (typeof priceMinor === 'number' ? priceMinor / 100 : 0),
    currency: asString(row.currency) ?? asString(metadata.currency) ?? 'GBP',
    rsvpRequired: asBoolean(metadata.rsvpRequired) ?? true,
    rsvpDeadline: asString(row.rsvpDeadlineAt) ?? asString(metadata.rsvpDeadline),
    attendees: [],
    status: asString(row.status) ?? 'DRAFT',
    imageUrl: asString(metadata.imageUrl),
    createdAt: asString(row.createdAt) ?? isoNow(),
  };
}

function eventWriteDateTime(date: string | undefined, time: string | undefined): Date | null {
  if (!date || !time) {
    return null;
  }
  const parsed = new Date(`${date}T${time}:00.000Z`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function eventWriteIso(date: string | undefined, time: string | undefined): string | null {
  return eventWriteDateTime(date, time)?.toISOString() ?? null;
}

function toEventMetadata(body: ClubEventWriteBody, existing?: SeedRow): SeedRow {
  const metadata = {
    ...(asObject(existing?.metadataJson) ?? {}),
  };
  if (body.eventType !== undefined) metadata.type = body.eventType.toLowerCase();
  if (body.targetAudience !== undefined) metadata.targetAudience = body.targetAudience;
  if (body.address !== undefined) metadata.address = body.address;
  if (body.isVirtual !== undefined) metadata.isVirtual = body.isVirtual;
  if (body.meetingLink !== undefined) metadata.meetingLink = body.meetingLink;
  if (body.price !== undefined) metadata.priceMinor = Math.round(body.price * 100);
  if (body.currency !== undefined) metadata.currency = body.currency.toUpperCase();
  if (body.rsvpRequired !== undefined) metadata.rsvpRequired = body.rsvpRequired;
  if (body.rsvpDeadline !== undefined) metadata.rsvpDeadline = body.rsvpDeadline;
  if (body.imageUrl !== undefined) metadata.imageUrl = body.imageUrl;
  if (body.squadIds !== undefined) metadata.squadIds = body.squadIds;
  if (body.athleteIds !== undefined) metadata.athleteIds = dedupeStrings(body.athleteIds);
  return metadata;
}

function eventVisibilityForBody(body: ClubEventWriteBody, existing?: SeedRow): string {
  const metadata = toEventMetadata(body, existing);
  const squadIds = body.squadIds ?? asStringArray(metadata.squadIds);
  const athleteIds = body.athleteIds ?? asStringArray(metadata.athleteIds);
  if (athleteIds.length > 0) {
    return 'athlete';
  }
  return body.targetAudience === 'SQUAD' || squadIds.length > 0 ? 'squad' : 'club';
}

function buildSeedClubEventRow(params: {
  clubId: string;
  authUserId: string;
  body: CreateClubEventRequestBody;
  now: string;
}): SeedRow {
  const startsAt = eventWriteIso(params.body.date, params.body.startTime);
  if (!startsAt) {
    throw badRequest('Event start date and time must be valid');
  }
  const endsAt = eventWriteIso(params.body.date, params.body.endTime);
  const metadata = toEventMetadata(params.body);
  return {
    id: newId('evt'),
    clubId: params.clubId,
    creatorUserId: params.authUserId,
    createdByUserId: params.authUserId,
    updatedByUserId: params.authUserId,
    title: params.body.title,
    description: params.body.description ?? null,
    startsAt,
    endsAt,
    location: params.body.venue,
    status: 'DRAFT',
    visibility: eventVisibilityForBody(params.body),
    rsvpDeadlineAt: params.body.rsvpDeadline ?? null,
    guestLimit: params.body.maxAttendees ?? null,
    priceMinor: Math.round((params.body.price ?? 0) * 100),
    currency: params.body.currency?.toUpperCase() ?? 'GBP',
    squadIdsJson: params.body.squadIds ?? [],
    metadataJson: metadata,
    createdAt: params.now,
    updatedAt: params.now,
    deletedAt: null,
  };
}

async function recordClubEventReadAudit(params: {
  request: FastifyRequest;
  eventId: string;
  authUserId: string;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: 'club_event.read',
    resourceType: 'club_event',
    resourceId: params.eventId,
    subjectUserId: params.authUserId,
    result: params.result,
    metadata: params.metadata,
  });
}

async function recordClubEventListAudit(params: {
  request: FastifyRequest;
  clubId: string;
  authUserId: string;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: 'club_event.list',
    resourceType: 'club_event',
    resourceId: params.clubId,
    subjectUserId: params.authUserId,
    result: params.result,
    metadata: params.metadata,
  });
}

async function recordClubEventWriteAudit(params: {
  request: FastifyRequest;
  action:
    | 'club_event.create'
    | 'club_event.update'
    | 'club_event.invite_club'
    | 'club_event.invite_squads'
    | 'club_event.invite_athletes';
  eventId?: string | null;
  clubId?: string | null;
  authUserId: string;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: 'club_event',
    resourceId: params.eventId ?? params.clubId ?? null,
    subjectUserId: params.authUserId,
    result: params.result,
    metadata: {
      ...(params.metadata ?? {}),
      clubId: params.clubId ?? null,
    },
  });
}

async function assertCanWriteClubEvent(params: {
  request: FastifyRequest;
  clubId: string;
  authUserId: string;
  action:
    | 'club_event.create'
    | 'club_event.update'
    | 'club_event.invite_club'
    | 'club_event.invite_squads'
    | 'club_event.invite_athletes';
  eventId?: string | null;
}): Promise<void> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const membership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: params.clubId,
          userId: params.authUserId,
        },
      },
      select: {
        active: true,
        deletedAt: true,
        role: true,
      },
    });
    const role = parseOrganizationRole(membership?.role);
    const canWrite =
      isPrivilegedAdminAuth(params.request.auth) ||
      Boolean(membership?.active && !membership.deletedAt && role && isClubStaffRole(role));
    if (!canWrite) {
      await recordClubEventWriteAudit({
        request: params.request,
        action: params.action,
        eventId: params.eventId,
        clubId: params.clubId,
        authUserId: params.authUserId,
        result: 'DENY',
        metadata: { reason: 'not_event_staff' },
      });
      throw forbidden('Only event staff or admins can manage club events');
    }
    return;
  }

  const store =
    getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
      ? getDbFixtureStore()
      : getMarketplaceSeedStore();
  const membership =
    asRows(store.tables.clubMemberships).find(
      (row) => asString(row.clubId) === params.clubId && asString(row.userId) === params.authUserId,
    ) ?? null;
  const canWrite =
    isPrivilegedAdminAuth(params.request.auth) || isActiveClubStaffMembership(membership);
  if (!canWrite) {
    await recordClubEventWriteAudit({
      request: params.request,
      action: params.action,
      eventId: params.eventId,
      clubId: params.clubId,
      authUserId: params.authUserId,
      result: 'DENY',
      metadata: { reason: 'not_event_staff' },
    });
    throw forbidden('Only event staff or admins can manage club events');
  }
}

async function listReadableClubEvents(params: {
  request: FastifyRequest;
  clubId: string;
  authUserId: string;
}): Promise<{ events: SeedRow[]; seedVersion?: string | null }> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const membership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: params.clubId,
          userId: params.authUserId,
        },
      },
      select: {
        active: true,
        deletedAt: true,
        role: true,
      },
    });
    const role = parseOrganizationRole(membership?.role);
    const isActiveMember = Boolean(membership?.active && !membership.deletedAt);
    const isStaff = Boolean(isActiveMember && role && isClubStaffRole(role));
    const canReadDrafts = isPrivilegedAdminAuth(params.request.auth) || isStaff;
    const linkedAthleteIds = canReadDrafts
      ? new Set<string>()
      : await resolveDbUserLinkedAthleteIds(params.authUserId);
    const canRead =
      isPrivilegedAdminAuth(params.request.auth) || isActiveMember || linkedAthleteIds.size > 0;
    if (!canRead) {
      throw forbidden('Only club members or targeted athlete links can read club events');
    }
    const events = await prisma.clubEvent.findMany({
      where: {
        clubId: params.clubId,
        deletedAt: null,
        ...(canReadDrafts ? {} : { status: { not: 'DRAFT' } }),
      },
      orderBy: { startsAt: 'desc' },
    });
    const normalizedEvents = events.map((event) => normalizeForJson(event) as SeedRow);
    if (!canReadDrafts) {
      return {
        events: normalizedEvents.filter((event) =>
          canReadPublishedClubEventForUser({
            event,
            isActiveMember,
            linkedAthleteIds,
          }),
        ),
      };
    }
    return {
      events: normalizedEvents,
    };
  }

  const store =
    getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
      ? getDbFixtureStore()
      : getMarketplaceSeedStore();
  const membership =
    asRows(store.tables.clubMemberships).find(
      (row) => asString(row.clubId) === params.clubId && asString(row.userId) === params.authUserId,
    ) ?? null;
  const isActiveMember = Boolean(
    membership && membership.active !== false && !asString(membership.deletedAt),
  );
  const isStaff = isActiveClubStaffMembership(membership);
  const canReadDrafts = isPrivilegedAdminAuth(params.request.auth) || isStaff;
  const linkedAthleteIds = canReadDrafts
    ? new Set<string>()
    : resolveStoreUserLinkedAthleteIds(store.tables, params.authUserId);
  const canRead =
    isPrivilegedAdminAuth(params.request.auth) || isActiveMember || linkedAthleteIds.size > 0;
  if (!canRead) {
    throw forbidden('Only club members or targeted athlete links can read club events');
  }
  const events = asRows(store.tables.clubEvents)
    .filter((row) => {
      if (asString(row.clubId) !== params.clubId || asString(row.deletedAt)) {
        return false;
      }
      if (canReadDrafts) {
        return true;
      }
      if (asString(row.status) === 'DRAFT') {
        return false;
      }
      return canReadPublishedClubEventForUser({
        event: row,
        isActiveMember,
        linkedAthleteIds,
      });
    })
    .sort(
      (left, right) =>
        new Date(asString(right.startsAt) ?? asString(right.createdAt) ?? isoNow()).getTime() -
        new Date(asString(left.startsAt) ?? asString(left.createdAt) ?? isoNow()).getTime(),
    );
  return { events, seedVersion: store.version };
}

async function resolveReadableClubEvent(params: {
  request: FastifyRequest;
  eventId: string;
  authUserId: string;
}): Promise<{ clubId: string; event: SeedRow; seedVersion?: string | null }> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const event = await prisma.clubEvent.findFirst({
      where: {
        id: params.eventId,
        deletedAt: null,
      },
    });
    if (!event) {
      await recordClubEventReadAudit({
        request: params.request,
        eventId: params.eventId,
        authUserId: params.authUserId,
        result: 'DENY',
        metadata: { reason: 'event_not_found' },
      });
      throw notFound('Club event not found', { eventId: params.eventId });
    }
    const membership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: event.clubId,
          userId: params.authUserId,
        },
      },
      select: {
        active: true,
        deletedAt: true,
        role: true,
      },
    });
    const role = parseOrganizationRole(membership?.role);
    const isActiveMember = Boolean(membership?.active && !membership.deletedAt);
    const isStaff = Boolean(isActiveMember && role && isClubStaffRole(role));
    const isDraft = event.status === 'DRAFT';
    const normalizedEvent = normalizeForJson(event) as SeedRow;
    let canRead = isPrivilegedAdminAuth(params.request.auth) || isStaff;
    if (!canRead && !isDraft) {
      canRead = canReadPublishedClubEventForUser({
        event: normalizedEvent,
        isActiveMember,
        linkedAthleteIds: await resolveDbUserLinkedAthleteIds(params.authUserId),
      });
    }
    if (!canRead) {
      await recordClubEventReadAudit({
        request: params.request,
        eventId: params.eventId,
        authUserId: params.authUserId,
        result: 'DENY',
        metadata: {
          reason: isDraft ? 'draft_event_requires_staff' : 'not_event_club_member',
          clubId: event.clubId,
        },
      });
      throw forbidden(
        isDraft
          ? 'Only event staff or admins can read draft club events'
          : 'Only club members or targeted athlete links can read this club event',
      );
    }
    return {
      clubId: event.clubId,
      event: normalizedEvent,
    };
  }

  const store =
    getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
      ? getDbFixtureStore()
      : getMarketplaceSeedStore();
  const event = asRows(store.tables.clubEvents).find(
    (row) => asString(row.id) === params.eventId && !asString(row.deletedAt),
  );
  if (!event) {
    await recordClubEventReadAudit({
      request: params.request,
      eventId: params.eventId,
      authUserId: params.authUserId,
      result: 'DENY',
      metadata: { reason: 'event_not_found' },
    });
    throw notFound('Club event not found', { eventId: params.eventId });
  }
  const clubId = asString(event.clubId) ?? '';
  const membership =
    asRows(store.tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === params.authUserId,
    ) ?? null;
  const isActiveMember = Boolean(
    membership && membership.active !== false && !asString(membership.deletedAt),
  );
  const isDraft = asString(event.status) === 'DRAFT';
  let canRead =
    isPrivilegedAdminAuth(params.request.auth) || isActiveClubStaffMembership(membership);
  if (!canRead && !isDraft) {
    canRead = canReadPublishedClubEventForUser({
      event,
      isActiveMember,
      linkedAthleteIds: resolveStoreUserLinkedAthleteIds(store.tables, params.authUserId),
    });
  }
  if (!canRead) {
    await recordClubEventReadAudit({
      request: params.request,
      eventId: params.eventId,
      authUserId: params.authUserId,
      result: 'DENY',
      metadata: {
        reason: isDraft ? 'draft_event_requires_staff' : 'not_event_club_member',
        clubId,
      },
    });
    throw forbidden(
      isDraft
        ? 'Only event staff or admins can read draft club events'
        : 'Only club members or targeted athlete links can read this club event',
    );
  }
  return { clubId, event, seedVersion: store.version };
}

async function recordEventAttendanceReadAudit(params: {
  request: FastifyRequest;
  eventId: string;
  authUserId: string;
  targetUserId?: string | null;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: 'event.attendance.read',
    resourceType: 'club_event',
    resourceId: params.eventId,
    subjectUserId: params.targetUserId ?? params.authUserId,
    result: params.result,
    metadata: params.metadata,
  });
}

async function assertCanReadEventAttendance(params: {
  request: FastifyRequest;
  eventId: string;
  authUserId: string;
  targetUserId?: string | null;
}): Promise<{ clubId: string }> {
  const targetUserId = params.targetUserId ?? null;
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const event = await prisma.clubEvent.findFirst({
      where: {
        id: params.eventId,
        deletedAt: null,
      },
      select: {
        clubId: true,
      },
    });
    if (!event) {
      await recordEventAttendanceReadAudit({
        request: params.request,
        eventId: params.eventId,
        authUserId: params.authUserId,
        targetUserId,
        result: 'DENY',
        metadata: { reason: 'event_not_found' },
      });
      throw notFound('Club event not found', { eventId: params.eventId });
    }
    const membership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: event.clubId,
          userId: params.authUserId,
        },
      },
      select: {
        active: true,
        deletedAt: true,
        role: true,
      },
    });
    const role = parseOrganizationRole(membership?.role);
    const isActiveMember = Boolean(membership?.active && !membership.deletedAt);
    const isStaff = Boolean(isActiveMember && role && isClubStaffRole(role));
    const canRead =
      isPrivilegedAdminAuth(params.request.auth) ||
      isStaff ||
      (targetUserId === params.authUserId && isActiveMember);
    if (!canRead) {
      await recordEventAttendanceReadAudit({
        request: params.request,
        eventId: params.eventId,
        authUserId: params.authUserId,
        targetUserId,
        result: 'DENY',
        metadata: {
          reason: targetUserId ? 'not_self_or_event_staff' : 'not_event_staff',
          clubId: event.clubId,
        },
      });
      throw forbidden(
        targetUserId
          ? 'Only the attendee, event staff, or admins can read event attendance'
          : 'Only event staff can read event attendance',
      );
    }
    return { clubId: event.clubId };
  }

  const store =
    getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
      ? getDbFixtureStore()
      : getMarketplaceSeedStore();
  const event = asRows(store.tables.clubEvents).find(
    (row) => asString(row.id) === params.eventId && !asString(row.deletedAt),
  );
  if (!event) {
    await recordEventAttendanceReadAudit({
      request: params.request,
      eventId: params.eventId,
      authUserId: params.authUserId,
      targetUserId,
      result: 'DENY',
      metadata: { reason: 'event_not_found' },
    });
    throw notFound('Club event not found', { eventId: params.eventId });
  }
  const clubId = asString(event.clubId) ?? '';
  const membership =
    asRows(store.tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === params.authUserId,
    ) ?? null;
  const isActiveMember = Boolean(
    membership && membership.active !== false && !asString(membership.deletedAt),
  );
  const canRead =
    isPrivilegedAdminAuth(params.request.auth) ||
    isActiveClubStaffMembership(membership) ||
    (targetUserId === params.authUserId && isActiveMember);
  if (!canRead) {
    await recordEventAttendanceReadAudit({
      request: params.request,
      eventId: params.eventId,
      authUserId: params.authUserId,
      targetUserId,
      result: 'DENY',
      metadata: { reason: targetUserId ? 'not_self_or_event_staff' : 'not_event_staff', clubId },
    });
    throw forbidden(
      targetUserId
        ? 'Only the attendee, event staff, or admins can read event attendance'
        : 'Only event staff can read event attendance',
    );
  }
  return { clubId };
}

function toDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }
  return toOptionalDate(value);
}

function isEventCheckinWindowOpen(startsAtValue: unknown, endsAtValue: unknown): boolean {
  const startsAt = toDateValue(startsAtValue);
  if (!startsAt) {
    return false;
  }
  const endsAt = toDateValue(endsAtValue) ?? new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);
  const opensAt = new Date(startsAt.getTime() - 2 * 60 * 60 * 1000);
  const now = new Date();
  return now >= opensAt && now <= endsAt;
}

async function recordEventAttendanceWriteAudit(params: {
  request: FastifyRequest;
  action: 'event.attendance.checkin' | 'event.attendance.remove';
  eventId: string;
  authUserId: string;
  targetUserId: string;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: 'club_event',
    resourceId: params.eventId,
    subjectUserId: params.targetUserId,
    result: params.result,
    metadata: params.metadata,
  });
}

async function assertCanWriteEventCheckin(params: {
  request: FastifyRequest;
  action: 'event.attendance.checkin' | 'event.attendance.remove';
  eventId: string;
  authUserId: string;
  targetUserId: string;
}): Promise<{ clubId: string }> {
  const isRemoval = params.action === 'event.attendance.remove';
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const event = await prisma.clubEvent.findFirst({
      where: {
        id: params.eventId,
        deletedAt: null,
      },
      select: {
        clubId: true,
        startsAt: true,
        endsAt: true,
      },
    });
    if (!event) {
      await recordEventAttendanceWriteAudit({
        request: params.request,
        action: params.action,
        eventId: params.eventId,
        authUserId: params.authUserId,
        targetUserId: params.targetUserId,
        result: 'DENY',
        metadata: { reason: 'event_not_found' },
      });
      throw notFound('Club event not found', { eventId: params.eventId });
    }
    const membership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: event.clubId,
          userId: params.authUserId,
        },
      },
      select: {
        active: true,
        deletedAt: true,
        role: true,
      },
    });
    const role = parseOrganizationRole(membership?.role);
    const isActiveMember = Boolean(membership?.active && !membership.deletedAt);
    const isStaff = Boolean(isActiveMember && role && isClubStaffRole(role));
    const isPrivilegedAdmin = isPrivilegedAdminAuth(params.request.auth);
    const isSelf = params.targetUserId === params.authUserId;
    const windowOpen = isEventCheckinWindowOpen(event.startsAt, event.endsAt);
    const canWrite =
      isPrivilegedAdmin || isStaff || (!isRemoval && isSelf && isActiveMember && windowOpen);
    if (!canWrite) {
      await recordEventAttendanceWriteAudit({
        request: params.request,
        action: params.action,
        eventId: params.eventId,
        authUserId: params.authUserId,
        targetUserId: params.targetUserId,
        result: 'DENY',
        metadata: {
          reason: isRemoval ? 'not_event_staff' : 'not_self_or_event_staff_or_window_closed',
          clubId: event.clubId,
          windowOpen,
        },
      });
      throw forbidden(
        isRemoval
          ? 'Only event staff can remove check-ins'
          : 'Only the attendee during check-in time, event staff, or admins can check in',
      );
    }
    return { clubId: event.clubId };
  }

  const store =
    getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
      ? getDbFixtureStore()
      : getMarketplaceSeedStore();
  const event = asRows(store.tables.clubEvents).find(
    (row) => asString(row.id) === params.eventId && !asString(row.deletedAt),
  );
  if (!event) {
    await recordEventAttendanceWriteAudit({
      request: params.request,
      action: params.action,
      eventId: params.eventId,
      authUserId: params.authUserId,
      targetUserId: params.targetUserId,
      result: 'DENY',
      metadata: { reason: 'event_not_found' },
    });
    throw notFound('Club event not found', { eventId: params.eventId });
  }
  const clubId = asString(event.clubId) ?? '';
  const membership =
    asRows(store.tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === params.authUserId,
    ) ?? null;
  const isActiveMember = Boolean(
    membership && membership.active !== false && !asString(membership.deletedAt),
  );
  const isPrivilegedAdmin = isPrivilegedAdminAuth(params.request.auth);
  const isStaff = isActiveClubStaffMembership(membership);
  const isSelf = params.targetUserId === params.authUserId;
  const windowOpen = isEventCheckinWindowOpen(event.startsAt, event.endsAt);
  const canWrite =
    isPrivilegedAdmin || isStaff || (!isRemoval && isSelf && isActiveMember && windowOpen);
  if (!canWrite) {
    await recordEventAttendanceWriteAudit({
      request: params.request,
      action: params.action,
      eventId: params.eventId,
      authUserId: params.authUserId,
      targetUserId: params.targetUserId,
      result: 'DENY',
      metadata: {
        reason: isRemoval ? 'not_event_staff' : 'not_self_or_event_staff_or_window_closed',
        clubId,
        windowOpen,
      },
    });
    throw forbidden(
      isRemoval
        ? 'Only event staff can remove check-ins'
        : 'Only the attendee during check-in time, event staff, or admins can check in',
    );
  }
  return { clubId };
}

const groupSessionQuerySchema = z.object({
  status: z.string().optional(),
  coachUserId: z.string().optional(),
  clubId: z.string().optional(),
  squadId: z.string().optional(),
  athleteId: z.string().optional(),
  sessionType: z.string().optional(),
  skillLevel: z.string().optional(),
  discover: z.coerce.boolean().optional(),
});
const groupSessionScheduleEntrySchema = z.object({
  date: z.string().trim().min(1),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
});
const inviteAudienceTypeSchema = z.enum(['OPEN', 'CLOSED', 'SQUAD_ONLY']);
const createGroupSessionRequestSchema = z.object({
  coachId: z.string().trim().min(1),
  clubId: z.string().trim().min(1).optional(),
  squadId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional(),
  sessionType: z.enum(['CAMP', 'CLINIC', 'TEAM_TRAINING', 'OPEN_SESSION', 'TRIAL', 'TRAINING']),
  schedule: z.array(groupSessionScheduleEntrySchema).min(1),
  maxParticipants: z.number().int().min(1).max(500),
  pricePerParticipant: z.number().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  ageMin: z.number().int().min(0).max(99).optional(),
  ageMax: z.number().int().min(0).max(99).optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL']).optional(),
  location: z.string().trim().min(1).max(200).optional(),
  isVirtual: z.boolean().optional(),
  focus: z.array(z.string().trim().min(1)).optional(),
  equipment: z.array(z.string().trim().min(1)).optional(),
  waitlistEnabled: z.boolean().optional(),
  inviteType: inviteAudienceTypeSchema.optional(),
  registrationDeadline: z.string().datetime().optional(),
});
const updateGroupSessionOffPlatformRequestSchema = z.object({
  offPlatformParticipants: z.number().int().min(0).max(500),
});
const cancelGroupSessionInstanceRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const endGroupSessionSeriesRequestSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const bookingReviewRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).nullable().optional(),
  categories: z.record(z.number().min(1).max(5)).optional(),
});
const markGroupSessionAttendanceRequestSchema = z.object({
  date: z.string().trim().min(1),
  attended: z.boolean(),
});
const sessionRsvpStatusSchema = z.enum(['pending', 'going', 'maybe', 'not_going']);
const sessionRsvpMemberSchema = z.object({
  userId: z.string().trim().min(1),
  childId: z.string().trim().min(1).optional(),
});
const createSessionRsvpsRequestSchema = z.object({
  members: z.array(sessionRsvpMemberSchema).min(1).max(200),
});
const respondSessionRsvpRequestSchema = z.object({
  status: z.enum(['going', 'maybe', 'not_going']),
});
const sessionRsvpsQuerySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  status: sessionRsvpStatusSchema.optional(),
});
const sessionRsvpBatchCountsQuerySchema = z.object({
  sessionIds: z.string().trim().min(1),
});
const groupSessionRegistrationsQuerySchema = z.object({
  athleteIds: z.string().optional(),
});
const invitesQuerySchema = z.object({
  coachUserId: z.string().optional(),
  parentUserId: z.string().optional(),
  groupId: z.string().optional(),
  inviteType: inviteAudienceTypeSchema.optional(),
  squadIds: z.string().optional(),
});
function getScheduleWindow(session: SeedRow): {
  startsAt: string;
  durationMinutes: number;
} {
  const schedule = asRows(session.scheduleJson);
  const firstWindow = schedule[0];
  const startsAt = asString(firstWindow?.startsAt);
  const endsAt = asString(firstWindow?.endsAt);
  const startTime = startsAt ? Date.parse(startsAt) : Number.NaN;
  const endTime = endsAt ? Date.parse(endsAt) : Number.NaN;
  const durationMinutes =
    Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime
      ? Math.max(15, Math.round((endTime - startTime) / 60000))
      : 60;
  return {
    startsAt: startsAt ?? isoNow(),
    durationMinutes,
  };
}
function humanizeSessionValue(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  return value
    .split(/[_-]/)
    .flatMap((item) => (Boolean(item) ? [item.charAt(0).toUpperCase() + item.slice(1)] : []))
    .join(' ');
}
function normalizeInviteAudienceType(
  value: string | undefined,
): 'OPEN' | 'CLOSED' | 'SQUAD_ONLY' | undefined {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'OPEN') {
    return 'OPEN';
  }
  if (normalized === 'CLOSED') {
    return 'CLOSED';
  }
  if (normalized === 'SQUAD' || normalized === 'SQUAD_ONLY') {
    return 'SQUAD_ONLY';
  }
  return undefined;
}
function mapSessionInviteAudienceType(
  session: SeedRow | undefined,
): 'OPEN' | 'CLOSED' | 'SQUAD_ONLY' | undefined {
  return normalizeInviteAudienceType(asString(session?.inviteType));
}
function buildInviteProposedSlots(session: SeedRow | undefined): {
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}[] {
  const location = asString(session?.location);
  return asRows(session?.scheduleJson).flatMap((entry) => {
    const mapped = (() => {
      const startsAt = asString(entry.startsAt);
      const endsAt = asString(entry.endsAt);
      if (!startsAt || !endsAt) {
        return null;
      }
      const start = new Date(startsAt);
      const end = new Date(endsAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
      }
      return {
        date: start.toISOString().slice(0, 10),
        startTime: start.toISOString().slice(11, 16),
        endTime: end.toISOString().slice(11, 16),
        ...(location
          ? {
              location,
            }
          : {}),
      };
    })();
    return mapped ? [mapped] : [];
  });
}
function buildInviteProposedSlotsFromMetadata(metadata: SeedRow | undefined): {
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}[] {
  return asRows(metadata?.proposedSlots).flatMap((entry) => {
    const mapped = (() => {
      const date = asString(entry.date);
      const startTime = asString(entry.startTime);
      const endTime = asString(entry.endTime);
      const location = asString(entry.location);
      if (!date || !startTime || !endTime) {
        return null;
      }
      return {
        date,
        startTime,
        endTime,
        ...(location
          ? {
              location,
            }
          : {}),
      };
    })();
    return mapped ? [mapped] : [];
  });
}
function addWeeksToDateString(date: string, weeks: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  parsed.setUTCDate(parsed.getUTCDate() + weeks * 7);
  return parsed.toISOString().slice(0, 10);
}
function buildInviteRecurringWeekSlotsFromMetadata(metadata: SeedRow | undefined): {
  weekDate: string;
  startTime: string;
  endTime: string;
  location?: string;
  accepted: boolean;
}[] {
  const storedWeekSlots = asRows(metadata?.weekSlots).flatMap((entry) => {
    const weekDate = asString(entry.weekDate);
    const startTime = asString(entry.startTime);
    const endTime = asString(entry.endTime);
    const location = asString(entry.location);
    const accepted = asBoolean(entry.accepted);
    return weekDate && startTime && endTime
      ? [
          {
            weekDate,
            startTime,
            endTime,
            ...(location ? { location } : {}),
            accepted: accepted !== false,
          },
        ]
      : [];
  });
  if (storedWeekSlots.length > 0) {
    return storedWeekSlots;
  }
  const proposedSlots = buildInviteProposedSlotsFromMetadata(metadata);
  const recurrenceWeeks = asNumber(metadata?.recurrenceWeeks) ?? proposedSlots.length;
  const baseSlot = proposedSlots[0];
  if (asBoolean(metadata?.isRecurring) !== true || !baseSlot || recurrenceWeeks <= 0) {
    return [];
  }
  return Array.from({ length: Math.min(recurrenceWeeks, 52) }, (_, index) => {
    const slot = proposedSlots[index] ?? {
      ...baseSlot,
      date: addWeeksToDateString(baseSlot.date, index),
    };
    return {
      weekDate: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      ...(slot.location ? { location: slot.location } : {}),
      accepted: true,
    };
  });
}
function buildInviteLocationCoordinates(metadata: SeedRow | undefined):
  | {
      latitude: number;
      longitude: number;
    }
  | undefined {
  const locationCoordinates = asObject(metadata?.locationCoordinates);
  const latitude = asNumber(locationCoordinates?.latitude);
  const longitude = asNumber(locationCoordinates?.longitude);
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return undefined;
  }
  return {
    latitude,
    longitude,
  };
}
function splitCsvQueryValue(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value.split(',').flatMap((entry) => {
    const trimmed = entry.trim();
    return trimmed ? [trimmed] : [];
  });
}
function calculateSlotDurationMinutes(slot: {
  startTime: string;
  endTime: string;
}): number | undefined {
  const [startHour, startMinute] = slot.startTime.split(':').map(Number);
  const [endHour, endMinute] = slot.endTime.split(':').map(Number);
  if (
    !Number.isFinite(startHour) ||
    !Number.isFinite(startMinute) ||
    !Number.isFinite(endHour) ||
    !Number.isFinite(endMinute)
  ) {
    return undefined;
  }
  const duration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return duration > 0 ? duration : undefined;
}
function areMatchingInviteSlots(
  left: {
    date: string;
    startTime: string;
    endTime: string;
  },
  right: {
    date: string;
    startTime: string;
    endTime: string;
  },
): boolean {
  return (
    left.date === right.date && left.startTime === right.startTime && left.endTime === right.endTime
  );
}
function weekResponseToSlot(week: {
  weekDate: string;
  startTime: string;
  endTime: string;
  location?: string;
}): {
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
} {
  return {
    date: week.weekDate,
    startTime: week.startTime,
    endTime: week.endTime,
    ...(week.location ? { location: week.location } : {}),
  };
}
function areMatchingInviteWeeks(
  left: {
    weekDate: string;
    startTime: string;
    endTime: string;
  },
  right: {
    weekDate: string;
    startTime: string;
    endTime: string;
  },
): boolean {
  return (
    left.weekDate === right.weekDate &&
    left.startTime === right.startTime &&
    left.endTime === right.endTime
  );
}
function isInviteDismissed(target: SeedRow | undefined): boolean {
  const responsePayload = asObject(target?.responsePayloadJson);
  return asBoolean(responsePayload?.dismissed) === true;
}
function isTerminalInviteResponseStatus(
  status: string | undefined,
): status is 'ACCEPTED' | 'DECLINED' {
  return status === 'ACCEPTED' || status === 'DECLINED';
}
function normalizeInviteRsvpStatus(value: unknown): InviteRsvpStatus | undefined {
  if (value === 'going' || value === 'maybe' || value === 'cant_go') {
    return value;
  }
  return undefined;
}
function buildInviteRsvpResponseId(params: {
  inviteId: string;
  userId: string;
  childId?: string;
}): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${params.inviteId}\0${params.userId}\0${params.childId ?? ''}`)
    .digest('hex')
    .slice(0, 20);
  return `irsvp:${encodeURIComponent(params.inviteId)}:${hash}`;
}
function parseInviteIdFromRsvpResponseId(responseId: string): string | undefined {
  const match = /^irsvp:(.+):[a-f0-9]{20}$/.exec(responseId);
  if (!match?.[1]) {
    return undefined;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}
function readInviteRsvpResponses(invite: SeedRow): InviteRsvpResponseRow[] {
  const metadata = asObject(invite.metadataJson);
  return asRows(metadata?.inviteRsvpResponses)
    .flatMap((entry) => {
      const id = asString(entry.id);
      const inviteId = asString(entry.inviteId);
      const userId = asString(entry.userId);
      const userName = asString(entry.userName);
      const status = normalizeInviteRsvpStatus(entry.status);
      const respondedAt = asString(entry.respondedAt);
      if (!id || !inviteId || !userId || !userName || !status || !respondedAt) {
        return [];
      }
      return [
        {
          id,
          inviteId,
          userId,
          userName,
          ...(asString(entry.userPhotoUrl) ? { userPhotoUrl: asString(entry.userPhotoUrl) } : {}),
          ...(asString(entry.childId) ? { childId: asString(entry.childId) } : {}),
          ...(asString(entry.childName) ? { childName: asString(entry.childName) } : {}),
          status,
          respondedAt,
        },
      ];
    })
    .sort((left, right) => Date.parse(right.respondedAt) - Date.parse(left.respondedAt));
}
function buildInviteRsvpCounts(responses: InviteRsvpResponseRow[]): {
  going: number;
  maybe: number;
  cantGo: number;
} {
  return {
    going: responses.filter((response) => response.status === 'going').length,
    maybe: responses.filter((response) => response.status === 'maybe').length,
    cantGo: responses.filter((response) => response.status === 'cant_go').length,
  };
}
function writeInviteRsvpResponses(invite: SeedRow, responses: InviteRsvpResponseRow[]): void {
  invite.metadataJson = {
    ...(asObject(invite.metadataJson) ?? {}),
    inviteRsvpResponses: responses,
  };
  invite.updatedAt = isoNow();
}
function resolveInviteRsvpDisplayName(params: {
  tables: SeedTables;
  userId: string;
  fallback?: string;
}): string {
  const user = asRows(params.tables.users).find((row) => asString(row.id) === params.userId);
  const firstName = asString(user?.firstName);
  const lastName = asString(user?.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return (
    asString(user?.displayName) ??
    asString(user?.fullName) ??
    asString(user?.name) ??
    (fullName.length > 0 ? fullName : undefined) ??
    params.fallback ??
    asString(user?.email) ??
    'User'
  );
}
function resolveInviteRsvpPhotoUrl(params: {
  tables: SeedTables;
  userId: string;
  fallback?: string;
}): string | undefined {
  const user = asRows(params.tables.users).find((row) => asString(row.id) === params.userId);
  return (
    asString(user?.avatarUrl) ??
    asString(user?.photoUrl) ??
    asString(user?.userPhotoUrl) ??
    params.fallback
  );
}
function getInviteRsvpAccess(params: {
  tables: SeedTables;
  invite: SeedRow;
  targets: SeedRow[];
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): {
  audienceType: 'OPEN' | 'CLOSED' | 'SQUAD_ONLY' | undefined;
  isOwner: boolean;
  isTarget: boolean;
  isOpen: boolean;
  canRead: boolean;
  canRespond: boolean;
} {
  const metadata = asObject(params.invite.metadataJson);
  const linkedSession = asRows(params.tables.groupSessions).find(
    (row) => asString(row.id) === asString(params.invite.groupSessionId),
  );
  const audienceType =
    mapSessionInviteAudienceType(linkedSession) ??
    normalizeInviteAudienceType(asString(metadata?.inviteAudienceType));
  const isOwner = asString(params.invite.senderUserId) === params.authUserId;
  const isTarget = params.targets.some(
    (target) => asString(target.targetUserId) === params.authUserId,
  );
  const isOpen = audienceType === 'OPEN';
  return {
    audienceType,
    isOwner,
    isTarget,
    isOpen,
    canRead: params.isPrivilegedAdmin || isOwner || isTarget || isOpen,
    canRespond: !isOwner && (isTarget || isOpen),
  };
}
function assertInviteRsvpChildAccess(params: {
  tables: SeedTables;
  authUserId: string;
  childId?: string;
  targets: SeedRow[];
}): void {
  if (!params.childId) {
    return;
  }
  const isTargetedChild = params.targets.some(
    (target) =>
      asString(target.targetUserId) === params.authUserId &&
      asString(target.targetAthleteId) === params.childId,
  );
  const isGuardianChild = asRows(params.tables.guardianChildLinks).some(
    (link) =>
      asString(link.guardianUserId) === params.authUserId &&
      asString(link.athleteId) === params.childId &&
      !asString(link.deletedAt),
  );
  if (!isTargetedChild && !isGuardianChild) {
    throw forbidden('childId does not belong to authenticated user');
  }
}
function buildSessionInviteView(params: {
  tables: SeedTables;
  invite: SeedRow;
  targets: SeedRow[];
}) {
  const { tables, invite, targets } = params;
  const primaryTarget = targets[0];
  const metadata = asObject(invite.metadataJson);
  const inviteId = asString(invite.id) ?? '';
  const linkedSession = asRows(tables.groupSessions).find(
    (row) => asString(row.id) === asString(invite.groupSessionId),
  );
  const clubId = asString(invite.clubId) ?? asString(linkedSession?.clubId);
  const club = asRows(tables.clubs).find((row) => asString(row.id) === clubId);
  const focusParts = asStringArray(linkedSession?.focusJson);
  const proposedSlots = buildInviteProposedSlots(linkedSession);
  const metadataProposedSlots = buildInviteProposedSlotsFromMetadata(metadata);
  const durationMinutes = linkedSession
    ? getScheduleWindow(linkedSession).durationMinutes
    : (asNumber(metadata?.durationMinutes) ?? 60);
  const responsePayload = asObject(primaryTarget?.responsePayloadJson);
  const selectedSlotPayload = responsePayload?.selectedSlot;
  const selectedSlot = asObject(selectedSlotPayload);
  const responseWeekSlots = asRows(responsePayload?.recurringWeekResponses).flatMap((entry) => {
    const weekDate = asString(entry.weekDate);
    const startTime = asString(entry.startTime);
    const endTime = asString(entry.endTime);
    const location = asString(entry.location);
    const accepted = asBoolean(entry.accepted);
    return weekDate && startTime && endTime
      ? [
          {
            weekDate,
            startTime,
            endTime,
            ...(location ? { location } : {}),
            accepted: accepted === true,
          },
        ]
      : [];
  });
  const recurringWeekSlots =
    responseWeekSlots.length > 0
      ? responseWeekSlots
      : buildInviteRecurringWeekSlotsFromMetadata(metadata);
  const acceptedWeeks = asStringArray(responsePayload?.acceptedWeeks);
  const declinedWeeks = asStringArray(responsePayload?.declinedWeeks);
  const athleteIds = Array.from(
    new Set(
      targets.flatMap((target): string[] => {
        const mapped = asString(target.targetAthleteId);
        return mapped ? [mapped] : [];
      }),
    ),
  );
  const squadIds = Array.from(
    new Set(
      [
        asString(linkedSession?.squadId),
        asString(metadata?.squadId),
        ...asStringArray(metadata?.squadIds),
      ].filter((squadId): squadId is string => Boolean(squadId)),
    ),
  );
  const targetStatus = asString(invite.revokedAt)
    ? 'EXPIRED'
    : (asString(primaryTarget?.status) ?? asString(invite.status) ?? 'PENDING');
  const inviteAudienceType =
    mapSessionInviteAudienceType(linkedSession) ??
    normalizeInviteAudienceType(asString(metadata?.inviteAudienceType));
  const locationCoordinates = buildInviteLocationCoordinates(metadata);
  const rsvpResponses = readInviteRsvpResponses(invite);
  const coachId = asString(invite.senderUserId) ?? '';
  const parentId = asString(primaryTarget?.targetUserId) ?? '';
  const athleteNameById = new Map(
    asRows(tables.athletes)
      .map((athlete) => {
        const id = asString(athlete.id);
        const name =
          asString(athlete.displayName) ??
          [asString(athlete.firstName), asString(athlete.lastName)].filter(Boolean).join(' ');
        return id && name ? ([id, name] as const) : null;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry)),
  );
  const athleteNames = athleteIds.flatMap((athleteId) => {
    const name = athleteNameById.get(athleteId);
    return name ? [name] : [];
  });
  return {
    id: inviteId,
    coachId,
    ...(coachId
      ? {
          coachName: resolveInviteRsvpDisplayName({
            tables,
            userId: coachId,
            fallback: 'Coach',
          }),
        }
      : {}),
    ...((asString(metadata?.clubName) ?? asString(club?.name))
      ? {
          clubName: asString(metadata?.clubName) ?? asString(club?.name),
        }
      : {}),
    ...(inviteAudienceType
      ? {
          inviteType: inviteAudienceType,
        }
      : {}),
    ...(squadIds.length > 0
      ? {
          squadIds,
        }
      : {}),
    athleteIds,
    ...(athleteNames.length > 0 ? { athleteNames } : {}),
    parentId,
    ...(parentId
      ? {
          parentName: resolveInviteRsvpDisplayName({
            tables,
            userId: parentId,
            fallback: 'Parent',
          }),
        }
      : {}),
    proposedSlots: proposedSlots.length > 0 ? proposedSlots : metadataProposedSlots,
    sessionType:
      asString(metadata?.sessionType) ??
      humanizeSessionValue(
        asString(linkedSession?.sessionType) ?? asString(invite.inviteType),
        'Session',
      ),
    ...(asString(metadata?.sessionTemplateId)
      ? {
          sessionTemplateId: asString(metadata?.sessionTemplateId),
        }
      : {}),
    focus:
      focusParts.length > 0
        ? focusParts.join(', ')
        : (asString(metadata?.focus) ?? asString(invite.message) ?? 'Session'),
    notes:
      asString(metadata?.notes) ??
      asString(invite.message) ??
      asString(linkedSession?.description) ??
      null,
    ...(typeof asNumber(linkedSession?.pricePerParticipantMinor) === 'number'
      ? {
          price: (asNumber(linkedSession?.pricePerParticipantMinor) ?? 0) / 100,
        }
      : typeof asNumber(metadata?.priceMinor) === 'number'
        ? {
            price: (asNumber(metadata?.priceMinor) ?? 0) / 100,
          }
        : {}),
    duration: durationMinutes,
    status: targetStatus,
    expiresAt: asString(invite.expiresAt) ?? isoNow(),
    createdAt: asString(invite.createdAt) ?? isoNow(),
    ...(asString(primaryTarget?.respondedAt)
      ? {
          respondedAt: asString(primaryTarget?.respondedAt),
        }
      : {}),
    ...(selectedSlot
      ? {
          selectedSlot: {
            date: asString(selectedSlot.date) ?? '',
            startTime: asString(selectedSlot.startTime) ?? '',
            endTime: asString(selectedSlot.endTime) ?? '',
            ...(asString(selectedSlot.location)
              ? {
                  location: asString(selectedSlot.location),
                }
              : {}),
          },
        }
      : {}),
    ...(asString(invite.groupSessionId) || asString(metadata?.existingSessionId)
      ? {
          existingSessionId:
            asString(invite.groupSessionId) ?? asString(metadata?.existingSessionId),
        }
      : {}),
    ...(asString(metadata?.groupId)
      ? {
          groupId: asString(metadata?.groupId),
        }
      : {}),
    ...(asString(invite.bookingId)
      ? {
          bookingId: asString(invite.bookingId),
        }
      : {}),
    ...(isInviteDismissed(primaryTarget)
      ? {
          dismissed: true,
        }
      : {}),
    ...(asBoolean(metadata?.isRecurring) === true
      ? {
          isRecurring: true,
        }
      : {}),
    ...(typeof asNumber(metadata?.recurrenceWeeks) === 'number'
      ? {
          recurrenceWeeks: asNumber(metadata?.recurrenceWeeks),
        }
      : {}),
    ...(recurringWeekSlots.length > 0
      ? {
          weekSlots: recurringWeekSlots,
        }
      : {}),
    ...(acceptedWeeks.length > 0
      ? {
          acceptedWeeks,
        }
      : {}),
    ...(declinedWeeks.length > 0
      ? {
          declinedWeeks,
        }
      : {}),
    ...(asString(metadata?.coverImageUrl)
      ? {
          coverImageUrl: asString(metadata?.coverImageUrl),
        }
      : {}),
    ...(locationCoordinates
      ? {
          locationCoordinates,
        }
      : {}),
    rsvpResponses,
    rsvpCounts: buildInviteRsvpCounts(rsvpResponses),
  };
}

function isActiveSquadMembership(row: SeedRow | null | undefined): boolean {
  return Boolean(
    row &&
      !asString(row.deletedAt) &&
      row.active !== false &&
      asString(row.status) !== 'INACTIVE',
  );
}

function userCanReadSquadInvite(tables: SeedTables, userId: string, squadIds: string[]): boolean {
  if (squadIds.length === 0) return false;
  const readableSquadIds = new Set(squadIds);
  const linkedAthleteIds = new Set(
    asRows(tables.guardianChildLinks)
      .filter(
        (row) =>
          asString(row.guardianUserId) === userId &&
          !asString(row.deletedAt) &&
          row.active !== false,
      )
      .map((row) => asString(row.athleteId))
      .filter((athleteId): athleteId is string => Boolean(athleteId)),
  );
  for (const athlete of asRows(tables.athletes)) {
    if (asString(athlete.userId) === userId) {
      const athleteId = asString(athlete.id);
      if (athleteId) linkedAthleteIds.add(athleteId);
    }
  }
  if (linkedAthleteIds.size === 0) return false;
  return asRows(tables.squadMemberships).some((row) => {
    const squadId = asString(row.squadId);
    const athleteId = asString(row.athleteId);
    return (
      Boolean(squadId && athleteId) &&
      readableSquadIds.has(squadId ?? '') &&
      linkedAthleteIds.has(athleteId ?? '') &&
      isActiveSquadMembership(row)
    );
  });
}

function assertCanCreateSquadInvite(params: {
  tables: SeedTables;
  coachUserId: string;
  athleteIds: string[];
  squadIds: string[];
  isPrivilegedAdmin: boolean;
}): void {
  const requestedSquadIds = [...new Set(params.squadIds)];
  if (requestedSquadIds.length === 0) {
    throw badRequest('SQUAD_ONLY invites require at least one squadId');
  }

  const squads = asRows(params.tables.squads);
  const memberships = asRows(params.tables.clubMemberships);
  for (const squadId of requestedSquadIds) {
    const squad = squads.find((row) => asString(row.id) === squadId && !asString(row.deletedAt));
    if (!squad) {
      throw badRequest('Each squadId must reference an active squad');
    }

    const ownerCoachUserId = asString(squad.ownerCoachUserId) ?? asString(squad.primaryCoach);
    const clubId = asString(squad.clubId);
    const canManageSquad =
      params.isPrivilegedAdmin ||
      ownerCoachUserId === params.coachUserId ||
      Boolean(
        clubId &&
          memberships.some(
            (row) =>
              asString(row.clubId) === clubId &&
              asString(row.userId) === params.coachUserId &&
              isActiveClubStaffMembership(row),
          ),
      );
    if (!canManageSquad) {
      throw forbidden('Coach is not allowed to create invites for this squad');
    }
  }

  const squadIdSet = new Set(requestedSquadIds);
  const memberAthleteIds = new Set(
    asRows(params.tables.squadMemberships)
      .filter((row) => {
        const squadId = asString(row.squadId);
        return Boolean(squadId && squadIdSet.has(squadId) && isActiveSquadMembership(row));
      })
      .map((row) => asString(row.athleteId))
      .filter((athleteId): athleteId is string => Boolean(athleteId)),
  );
  const missingAthleteIds = params.athleteIds.filter(
    (athleteId) => !memberAthleteIds.has(athleteId),
  );
  if (missingAthleteIds.length > 0) {
    throw badRequest('Each athleteId must belong to at least one requested squadId');
  }
}

const inviteProposedSlotSchema = z.object({
  date: z.string().trim().min(1),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  location: z.string().trim().min(1).optional(),
});
const createInviteRequestSchema = z.object({
  coachUserId: z.string().trim().min(1),
  clubName: z.string().trim().min(1).max(160).optional(),
  inviteType: inviteAudienceTypeSchema.optional(),
  squadIds: z.array(z.string().trim().min(1)).optional(),
  athleteIds: z.array(z.string().trim().min(1)).min(1),
  parentUserId: z.string().trim().min(1),
  proposedSlots: z.array(inviteProposedSlotSchema).min(1),
  sessionType: z.string().trim().min(1).max(120),
  sessionTemplateId: z.string().trim().min(1).optional(),
  focus: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(4000).optional(),
  priceMinor: z.number().int().min(0).optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  expiresInDays: z.number().int().min(1).max(90).optional(),
  groupId: z.string().trim().min(1).optional(),
  existingSessionId: z.string().trim().min(1).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceWeeks: z.number().int().min(1).max(52).optional(),
  coverImageUrl: z.string().trim().url().optional(),
  locationCoordinates: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  currency: z.string().trim().length(3).optional(),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
});
type CreateInviteRequest = z.infer<typeof createInviteRequestSchema>;
function getMutableRows(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}
function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeJson(entry)]),
    );
  }
  return value;
}
function hashCreateInviteRequest(body: CreateInviteRequest): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalizeJson(body)))
    .digest('hex');
}
function assertMatchingInviteIdempotencyRequest(entry: SeedRow, requestHash: string): void {
  if (asString(entry.requestHash) !== requestHash) {
    throw conflict('Idempotency key was already used with a different invite payload');
  }
}
function findSeedCreateInviteIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: CreateInviteRequest;
}): {
  invite: SeedRow;
  targets: SeedRow[];
  responseStatus: number;
} | null {
  if (!params.body.idempotencyKey) {
    return null;
  }
  const requestHash = hashCreateInviteRequest(params.body);
  const entry = asRows(params.tables.idempotencyKeys).find(
    (row) =>
      asString(row.userId) === params.authUserId &&
      asString(row.endpointKey) === INVITE_CREATE_ENDPOINT_KEY &&
      asString(row.idempotencyKey) === params.body.idempotencyKey,
  );
  if (!entry) {
    return null;
  }
  assertMatchingInviteIdempotencyRequest(entry, requestHash);
  const responseBody = asObject(entry.responseBodyJson);
  const inviteId = asString(responseBody?.inviteId) ?? asString(asObject(responseBody?.invite)?.id);
  if (!inviteId) {
    throw conflict('Stored invite idempotency response is no longer valid');
  }
  const invite = asRows(params.tables.invites).find((row) => asString(row.id) === inviteId);
  if (!invite) {
    throw conflict('Stored invite idempotency response is no longer valid');
  }
  return {
    invite,
    targets: asRows(params.tables.inviteTargets).filter(
      (target) => asString(target.inviteId) === inviteId,
    ),
    responseStatus: asNumber(entry.responseStatus) ?? 201,
  };
}
function recordSeedCreateInviteIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: CreateInviteRequest;
  inviteId: string;
  now: string;
}): void {
  if (!params.body.idempotencyKey) {
    return;
  }
  getMutableRows(params.tables, 'idempotencyKeys').push({
    id: newId('idk'),
    userId: params.authUserId,
    endpointKey: INVITE_CREATE_ENDPOINT_KEY,
    idempotencyKey: params.body.idempotencyKey,
    requestHash: hashCreateInviteRequest(params.body),
    responseStatus: 201,
    responseBodyJson: {
      inviteId: params.inviteId,
    },
    createdAt: params.now,
    expiresAt: new Date(Date.parse(params.now) + INVITE_IDEMPOTENCY_TTL_MS).toISOString(),
  });
}

function applyBookingSeriesRouteTime(scheduledAt: string, timeLocal?: string): string {
  if (!timeLocal) {
    return scheduledAt;
  }
  const [hoursValue, minutesValue] = timeLocal.split(':').map(Number);
  const date = new Date(scheduledAt);
  if (
    Number.isNaN(date.getTime()) ||
    !Number.isInteger(hoursValue) ||
    !Number.isInteger(minutesValue) ||
    hoursValue < 0 ||
    hoursValue > 23 ||
    minutesValue < 0 ||
    minutesValue > 59
  ) {
    throw badRequest('Booking series update has an invalid time value', {
      time: timeLocal,
    });
  }
  date.setUTCHours(hoursValue, minutesValue, 0, 0);
  return date.toISOString();
}

async function assertBookingSeriesReassignmentAvailability(params: {
  repository: ReturnType<typeof resolveBookingSeriesRepository>;
  authUserId: string;
  seriesId: string;
  body: z.infer<typeof updateBookingSeriesRequestSchema>;
}): Promise<void> {
  if (!params.body.coachUserId) {
    return;
  }
  const currentSeries = await params.repository.getVisibleBookingSeriesById({
    authUserId: params.authUserId,
    seriesId: params.seriesId,
  });
  if (currentSeries.coachUserId === params.body.coachUserId) {
    return;
  }
  const availability = await resolveCoachAvailabilityTables(params.body.coachUserId);
  const durationMinutes = params.body.durationMinutes ?? currentSeries.durationMinutes ?? 60;
  const nowMs = Date.now();
  for (const scheduledAt of currentSeries.scheduledDates) {
    const nextScheduledAt = applyBookingSeriesRouteTime(scheduledAt, params.body.time);
    const scheduledMs = Date.parse(nextScheduledAt);
    if (!Number.isFinite(scheduledMs) || scheduledMs <= nowMs) {
      continue;
    }
    assertCoachAvailabilitySlotOpen({
      tables: availability.tables,
      coachUserId: params.body.coachUserId,
      scheduledAt: nextScheduledAt,
      durationMinutes,
      applySchedulingRules: true,
    });
  }
}

type BookingUpdateBody = z.infer<typeof updateBookingRequestSchema>;
type CompleteBookingBody = z.infer<typeof completeBookingRequestSchema>;
type RouteBookingSummary = {
  coachUserId: string;
  bookedByUserId?: string;
  participants: Array<{
    athleteId: string;
    guardianUserId?: string;
  }>;
};
function bookingUpdateChangedFields(body: BookingUpdateBody): string[] {
  return [
    'scheduledAt',
    'durationMinutes',
    'location',
    'serviceType',
    'objectives',
    'notes',
    'priceMinor',
    'currency',
  ].filter((field) => body[field as keyof BookingUpdateBody] !== undefined);
}
function bookingCompletionAttendanceSummary(body: CompleteBookingBody): {
  attended: number | null;
  noShow: number | null;
  provided: boolean;
} {
  const attendance = body.attendance ?? [];
  if (attendance.length === 0) {
    return {
      attended: null,
      noShow: null,
      provided: false,
    };
  }
  return {
    attended: attendance.filter((row) => row.status === 'ATTENDED').length,
    noShow: attendance.filter((row) => row.status === 'NO_SHOW').length,
    provided: true,
  };
}
function canActorUpdateBookingDetails(booking: RouteBookingSummary, authUserId: string): boolean {
  if (booking.coachUserId === authUserId || booking.bookedByUserId === authUserId) {
    return true;
  }
  const athleteIds = Array.from(
    new Set(booking.participants.map((participant) => participant.athleteId)),
  );
  return (
    athleteIds.length > 0 &&
    athleteIds.every((athleteId) =>
      booking.participants.some(
        (participant) =>
          participant.athleteId === athleteId && participant.guardianUserId === authUserId,
      ),
    )
  );
}

const bookingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/coaches/:coachId/reviews', async (request, reply) => {
    const coachId = coachIdSchema.parse(
      (
        request.params as
          | {
              coachId?: string;
            }
          | undefined
      )?.coachId,
    );
    const repository = resolveBookingReviewRepository();
    const result = await repository.listCoachReviews({
      coachUserId: coachId,
    });
    return reply.send({
      reviews: result.reviews,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get('/cancellation-records', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const query = cancellationRecordsQuerySchema.parse(request.query ?? {});
    try {
      const result = await cancellationRecordRepository.listCancellationRecords({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        coachId: query.coachId,
      });
      await recordAuditEvent({
        request,
        action: 'cancellation_records.read',
        resourceType: 'cancellation_records',
        resourceId: query.coachId ?? null,
        subjectUserId: query.coachId ?? null,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          coachId: query.coachId ?? null,
          recordCount: result.records.length,
        },
      });
      return reply.send({
        records: result.records,
        total: result.records.length,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'cancellation_records.read',
        resourceType: 'cancellation_records',
        resourceId: query.coachId ?? null,
        subjectUserId: query.coachId ?? null,
        result: error instanceof ApiProblemError && error.status === 403 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          coachId: query.coachId ?? null,
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });
  app.get('/cancellation-records/:bookingId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const bookingId = bookingIdSchema.parse(
      (
        request.params as
          | {
              bookingId?: string;
            }
          | undefined
      )?.bookingId,
    );
    try {
      const record = await cancellationRecordRepository.getCancellationRecordByBooking({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        bookingId,
      });
      await recordAuditEvent({
        request,
        action: 'cancellation_record.read',
        resourceType: 'cancellation_record',
        resourceId: bookingId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          found: Boolean(record),
        },
      });
      return reply.send({
        record,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'cancellation_record.read',
        resourceType: 'cancellation_record',
        resourceId: bookingId,
        result: error instanceof ApiProblemError && error.status === 403 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });
  app.get('/bookings', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const repository = resolveBookingRepository();
    const statusFilter = asString(
      (
        request.query as
          | {
              status?: string;
            }
          | undefined
      )?.status,
    );
    const result = await repository.listVisibleBookings({
      authUserId,
      statusFilter,
    });
    return reply.send({
      bookings: result.bookings,
      total: result.bookings.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get('/bookings/:bookingId/rebook-context', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const bookingId = bookingIdSchema.parse(
      (
        request.params as
          | {
              bookingId?: string;
            }
          | undefined
      )?.bookingId,
    );
    const repository = resolveBookingRepository();
    const booking = await repository.getVisibleBookingById({
      authUserId,
      bookingId,
    });
    const actorIsBookedFamily =
      booking.bookedByUserId === authUserId ||
      booking.participants.some((participant) => participant.guardianUserId === authUserId);
    const actorIsCoachOnly = booking.coachUserId === authUserId && !actorIsBookedFamily;
    if (actorIsCoachOnly) {
      throw forbidden('Only the booked family or athlete can rebook from this booking context');
    }
    return reply.send({
      sourceBookingId: booking.id,
      coachId: booking.coachUserId,
      bookedByUserId: booking.bookedByUserId ?? null,
      status: booking.status,
      serviceType: booking.serviceType ?? null,
      sessionTemplateId: booking.sessionTemplateId ?? null,
      durationMinutes: booking.durationMinutes,
      location: booking.location,
      objectives: booking.objectives,
      priceMinor: booking.priceMinor ?? null,
      currency: booking.currency,
      athleteIds: booking.participants.flatMap((participant) =>
        participant.status !== 'cancelled' ? [participant.athleteId] : [],
      ),
      requestId: request.requestId,
    });
  });
  app.get('/bookings/:bookingId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const bookingId = bookingIdSchema.parse(
      (
        request.params as
          | {
              bookingId?: string;
            }
          | undefined
      )?.bookingId,
    );
    const repository = resolveBookingRepository();
    const booking = await repository.getVisibleBookingById({
      authUserId,
      bookingId,
    });
    return reply.send(booking);
  });
  app.patch('/bookings/:bookingId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const bookingId = bookingIdSchema.parse(
      (
        request.params as
          | {
              bookingId?: string;
            }
          | undefined
      )?.bookingId,
    );
    const body = updateBookingRequestSchema.parse(request.body ?? {});
    const changedFields = bookingUpdateChangedFields(body);
    const repository = resolveBookingRepository();
    try {
      const currentBooking = await repository.getVisibleBookingById({
        authUserId,
        bookingId,
      });
      if (!canActorUpdateBookingDetails(currentBooking, authUserId)) {
        throw forbidden(
          'Only the assigned coach, booking owner, or participant guardian can update this booking',
        );
      }
      if (body.scheduledAt !== undefined || body.durationMinutes !== undefined) {
        const nextScheduledAt = body.scheduledAt ?? currentBooking.scheduledAt;
        const nextDurationMinutes = body.durationMinutes ?? currentBooking.durationMinutes;
        const availability = await resolveCoachAvailabilityTables(currentBooking.coachUserId);
        assertCoachAvailabilitySlotOpen({
          tables: availability.tables,
          coachUserId: currentBooking.coachUserId,
          scheduledAt: nextScheduledAt,
          durationMinutes: nextDurationMinutes,
          excludeBookingId: bookingId,
          applySchedulingRules: true,
        });
      }
      const response = await repository.updateBooking({
        authUserId,
        requestId: request.requestId,
        bookingId,
        body,
      });
      await recordAuditEvent({
        request,
        action: 'booking.update',
        resourceType: 'booking',
        resourceId: bookingId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          changedFields,
          status: response.status,
        },
      });
      return reply.send(response);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'booking.update',
        resourceType: 'booking',
        resourceId: bookingId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status === 403 ? 'DENY' : 'ERROR',
        metadata: {
          changedFields,
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });
  app.post('/bookings', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = createBookingRequestSchema.parse(request.body);
    const idempotentResponse = await resolveCreateBookingIdempotency({
      authUserId,
      body,
    });
    if (idempotentResponse) {
      return reply.status(idempotentResponse.responseStatus).send(idempotentResponse.response);
    }
    const availability = await resolveCoachAvailabilityTables(body.coachUserId);
    assertCoachAvailabilitySlotOpen({
      tables: availability.tables,
      coachUserId: body.coachUserId,
      scheduledAt: body.scheduledAt,
      durationMinutes: body.durationMinutes,
      applySchedulingRules: true,
    });
    const repository = resolveBookingRepository();
    const response = await repository.createBooking({
      authUserId,
      requestId: request.requestId,
      body,
    });
    return reply.status(201).send(response);
  });
  app.get('/booking-series', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const repository = resolveBookingSeriesRepository();
    const result = await repository.listVisibleBookingSeries({
      authUserId,
    });
    return reply.send({
      series: result.series,
      total: result.series.length,
      seedVersion: result.seedVersion,
      requestId: request.requestId,
    });
  });
  app.get('/booking-series/:seriesId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const seriesId = bookingSeriesIdSchema.parse(
      (
        request.params as
          | {
              seriesId?: string;
            }
          | undefined
      )?.seriesId,
    );
    const repository = resolveBookingSeriesRepository();
    const series = await repository.getVisibleBookingSeriesById({
      authUserId,
      seriesId,
    });
    return reply.send(series);
  });
  app.post('/booking-series', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = createBookingSeriesRequestSchema.parse(request.body);
    const idempotentResponse = await resolveCreateBookingSeriesIdempotency({
      authUserId,
      body,
    });
    if (idempotentResponse) {
      return reply.status(idempotentResponse.responseStatus).send(idempotentResponse.response);
    }
    assertBookingSeriesOccurrencesValid(body);
    await assertBookingSeriesCreateAccess({
      authUserId,
      body,
    });
    const availability = await resolveCoachAvailabilityTables(body.coachUserId);
    for (const occurrence of body.occurrences) {
      assertCoachAvailabilitySlotOpen({
        tables: availability.tables,
        coachUserId: body.coachUserId,
        scheduledAt: occurrence.scheduledAt,
        durationMinutes: occurrence.durationMinutes,
        applySchedulingRules: true,
      });
    }
    const repository = resolveBookingSeriesRepository();
    const response = await repository.createBookingSeries({
      authUserId,
      requestId: request.requestId,
      body,
    });
    return reply.status(201).send(response);
  });
  app.post('/booking-series/:seriesId/cancel', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const seriesId = bookingSeriesIdSchema.parse(
      (
        request.params as
          | {
              seriesId?: string;
            }
          | undefined
      )?.seriesId,
    );
    const body = cancelBookingSeriesRequestSchema.parse(request.body);
    const repository = resolveBookingSeriesRepository();
    const response = await repository.cancelBookingSeries({
      authUserId,
      requestId: request.requestId,
      seriesId,
      body,
    });
    return reply.send(response);
  });
  app.post('/booking-series/:seriesId/pause', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const seriesId = bookingSeriesIdSchema.parse(
      (
        request.params as
          | {
              seriesId?: string;
            }
          | undefined
      )?.seriesId,
    );
    const body = pauseBookingSeriesRequestSchema.parse(request.body);
    const repository = resolveBookingSeriesRepository();
    const response = await repository.pauseBookingSeries({
      authUserId,
      requestId: request.requestId,
      seriesId,
      body,
    });
    return reply.send(response);
  });
  app.post('/booking-series/:seriesId/resume', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const seriesId = bookingSeriesIdSchema.parse(
      (
        request.params as
          | {
              seriesId?: string;
            }
          | undefined
      )?.seriesId,
    );
    const body = resumeBookingSeriesRequestSchema.parse(request.body);
    const repository = resolveBookingSeriesRepository();
    const response = await repository.resumeBookingSeries({
      authUserId,
      requestId: request.requestId,
      seriesId,
      body,
    });
    return reply.send(response);
  });
  app.patch('/booking-series/:seriesId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const seriesId = bookingSeriesIdSchema.parse(
      (
        request.params as
          | {
              seriesId?: string;
            }
          | undefined
      )?.seriesId,
    );
    const body = updateBookingSeriesRequestSchema.parse(request.body);
    const repository = resolveBookingSeriesRepository();
    await assertBookingSeriesReassignmentAvailability({
      repository,
      authUserId,
      seriesId,
      body,
    });
    const response = await repository.updateBookingSeries({
      authUserId,
      requestId: request.requestId,
      seriesId,
      body,
    });
    return reply.send(response);
  });
  app.post('/bookings/:bookingId/cancel', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const bookingId = bookingIdSchema.parse(
      (
        request.params as
          | {
              bookingId?: string;
            }
          | undefined
      )?.bookingId,
    );
    const body = cancelBookingRequestSchema.parse(request.body);
    const repository = resolveBookingRepository();
    const response = await repository.cancelBooking({
      authUserId,
      requestId: request.requestId,
      bookingId,
      body,
    });
    return reply.send(response);
  });
  app.post('/bookings/:bookingId/reopen', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const bookingId = bookingIdSchema.parse(
      (
        request.params as
          | {
              bookingId?: string;
            }
          | undefined
      )?.bookingId,
    );
    const body = reopenBookingRequestSchema.parse(request.body ?? {});
    const repository = resolveBookingRepository();
    const response = await repository.reopenBooking({
      authUserId,
      requestId: request.requestId,
      bookingId,
      body,
    });
    return reply.send(response);
  });
  app.post('/bookings/:bookingId/confirm', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const bookingId = bookingIdSchema.parse(
      (
        request.params as
          | {
              bookingId?: string;
            }
          | undefined
      )?.bookingId,
    );
    const body = confirmBookingRequestSchema.parse(request.body ?? {});
    const repository = resolveBookingRepository();
    const response = await repository.confirmBooking({
      authUserId,
      requestId: request.requestId,
      bookingId,
      body,
    });
    return reply.send(response);
  });
  app.post('/bookings/:bookingId/complete', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const bookingId = bookingIdSchema.parse(
      (
        request.params as
          | {
              bookingId?: string;
            }
          | undefined
      )?.bookingId,
    );
    const body = completeBookingRequestSchema.parse(request.body ?? {});
    const repository = resolveBookingRepository();
    const attendanceSummary = bookingCompletionAttendanceSummary(body);
    try {
      const response = await repository.completeBooking({
        authUserId,
        requestId: request.requestId,
        bookingId,
        body,
      });
      await recordAuditEvent({
        request,
        action: 'booking.complete',
        resourceType: 'booking',
        resourceId: bookingId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          status: response.status,
          completedAt: body.completedAt ?? null,
          attendanceSummary,
          hasNote: Boolean(body.note?.trim()),
        },
      });
      return reply.send(response);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'booking.complete',
        resourceType: 'booking',
        resourceId: bookingId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          attendanceSummary,
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
  app.get('/bookings/:bookingId/session-note', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const bookingId = bookingIdSchema.parse(
      (
        request.params as
          | {
              bookingId?: string;
            }
          | undefined
      )?.bookingId,
    );
    const repository = resolveBookingRepository();
    try {
      const result = await repository.getBookingSessionNote({
        authUserId,
        bookingId,
      });
      await recordAuditEvent({
        request,
        action: 'booking_session_note.read',
        resourceType: 'booking',
        resourceId: bookingId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          noteId: result.note?.id ?? null,
        },
      });
      return reply.send({
        note: result.note,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'booking_session_note.read',
        resourceType: 'booking',
        resourceId: bookingId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
  app.put('/bookings/:bookingId/session-note', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const bookingId = bookingIdSchema.parse(
      (
        request.params as
          | {
              bookingId?: string;
            }
          | undefined
      )?.bookingId,
    );
    const body = bookingSessionNoteRequestSchema.parse(request.body ?? {});
    const repository = resolveBookingRepository();
    try {
      const result = await repository.saveBookingSessionNote({
        authUserId,
        bookingId,
        input: body,
      });
      await recordAuditEvent({
        request,
        action: 'booking_session_note.save',
        resourceType: 'booking',
        resourceId: bookingId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          noteId: result.note?.id ?? null,
          focusCount: result.note?.focus.length ?? 0,
        },
      });
      return reply.send({
        note: result.note,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'booking_session_note.save',
        resourceType: 'booking',
        resourceId: bookingId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
  app.get('/bookings/:bookingId/reviews/me', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const bookingId = bookingIdSchema.parse(
      (
        request.params as
          | {
              bookingId?: string;
            }
          | undefined
      )?.bookingId,
    );
    const repository = resolveBookingReviewRepository();
    const result = await repository.getBookingReviewForActor({
      authUserId,
      bookingId,
    });
    return reply.send({
      hasReviewed: Boolean(result.review),
      review: result.review,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.post('/bookings/:bookingId/reviews', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const bookingId = bookingIdSchema.parse(
      (
        request.params as
          | {
              bookingId?: string;
            }
          | undefined
      )?.bookingId,
    );
    const body = bookingReviewRequestSchema.parse(request.body ?? {});
    const repository = resolveBookingReviewRepository();
    try {
      const result = await repository.createBookingReview({
        authUserId,
        bookingId,
        input: body,
      });
      await recordAuditEvent({
        request,
        action: 'booking_review.create',
        resourceType: 'booking',
        resourceId: bookingId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          reviewId: result.review.id,
          reused: result.reused,
          rating: result.review.rating,
          verifiedBooking: result.review.isVerifiedBooking,
        },
      });
      reply.code(result.reused ? 200 : 201);
      return reply.send({
        review: result.review,
        reused: result.reused,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'booking_review.create',
        resourceType: 'booking',
        resourceId: bookingId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
  app.get('/group-sessions', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const query = groupSessionQuerySchema.parse(request.query ?? {});
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const repository = resolveGroupSessionRepository();
    const result = await repository.listVisibleSessions({
      authUserId,
      isPrivilegedAdmin,
      statusFilter: query.status?.toUpperCase(),
      coachUserId: asString(query.coachUserId),
      clubId: asString(query.clubId),
      squadId: asString(query.squadId),
      athleteId: asString(query.athleteId),
      sessionType: asString(query.sessionType),
      skillLevel: asString(query.skillLevel),
      discover: query.discover,
    });
    return reply.send({
      groupSessions: result.sessions,
      total: result.sessions.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get('/group-sessions/:sessionId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    const result = await resolveGroupSessionRepository().getVisibleSessionById({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      sessionId,
    });
    return reply.send({
      groupSession: result.session,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.post('/group-sessions', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const result = await resolveGroupSessionRepository().createSession({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      body: createGroupSessionRequestSchema.parse(request.body ?? {}),
    });
    return reply.status(201).send({
      groupSession: result.session,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.patch('/group-sessions/:sessionId/publish', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    const result = await resolveGroupSessionRepository().publishSession({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      sessionId,
    });
    return reply.send({
      groupSession: result.session,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.patch('/group-sessions/:sessionId/off-platform-attendees', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    const body = updateGroupSessionOffPlatformRequestSchema.parse(request.body ?? {});
    try {
      const result = await resolveGroupSessionRepository().updateOffPlatformParticipants({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        sessionId,
        count: body.offPlatformParticipants,
      });
      await recordAuditEvent({
        request,
        action: 'group_session.off_platform_attendees_update',
        resourceType: 'group_session',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          offPlatformParticipants: body.offPlatformParticipants,
          sessionStatus: result.session.status,
        },
      });
      return reply.send({
        groupSession: result.session,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'group_session.off_platform_attendees_update',
        resourceType: 'group_session',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          offPlatformParticipants: body.offPlatformParticipants,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
  app.patch('/group-sessions/:sessionId/instances/cancel', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    const body = cancelGroupSessionInstanceRequestSchema.parse(request.body ?? {});
    try {
      const result = await resolveGroupSessionRepository().cancelInstance({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        sessionId,
        date: body.date,
      });
      await recordAuditEvent({
        request,
        action: 'group_session.instance_cancelled',
        resourceType: 'group_session',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          date: body.date,
          cancelledInstances: result.session.cancelledInstances ?? [],
        },
      });
      return reply.send({
        groupSession: result.session,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'group_session.instance_cancelled',
        resourceType: 'group_session',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          date: body.date,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
  app.patch('/group-sessions/:sessionId/series/end', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    const body = endGroupSessionSeriesRequestSchema.parse(request.body ?? {});
    try {
      const result = await resolveGroupSessionRepository().endSeries({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        sessionId,
        fromDate: body.fromDate,
      });
      await recordAuditEvent({
        request,
        action: 'group_session.series_ended',
        resourceType: 'group_session',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          fromDate: body.fromDate,
          cancelledInstances: result.session.cancelledInstances ?? [],
        },
      });
      return reply.send({
        groupSession: result.session,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'group_session.series_ended',
        resourceType: 'group_session',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          fromDate: body.fromDate,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
  app.patch('/group-sessions/:sessionId/cancel', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    const result = await resolveGroupSessionRepository().cancelSession({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      sessionId,
      requestId: request.requestId,
    });
    return reply.send({
      groupSession: result.session,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  const registerGroupSessionAthlete = async (
    request: FastifyRequest,
    intent: 'register' | 'waitlist',
  ) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    const action =
      intent === 'waitlist' ? 'group_session.waitlist_joined' : 'group_session.registered';
    let athleteId: string | undefined;
    let parentUserId: string | undefined;
    try {
      const body =
        intent === 'waitlist'
          ? joinGroupSessionWaitlistRequestSchema.parse(request.body)
          : registerGroupSessionRequestSchema.parse(request.body);
      athleteId = body.athleteId;
      parentUserId = body.parentUserId;
      const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
      if (!isPrivilegedAdmin && parentUserId && parentUserId !== authUserId) {
        throw forbidden('parentUserId must match authenticated user');
      }
      const result = await resolveGroupSessionRepository().registerAthlete({
        authUserId,
        isPrivilegedAdmin,
        requestId: request.requestId,
        sessionId,
        athleteId,
        bookedByUserId: parentUserId ?? authUserId,
        note:
          intent === 'waitlist'
            ? 'Joined waitlist via /v1/group-sessions/:sessionId/waitlist'
            : 'Registered via /v1/group-sessions/:sessionId/register',
        waitlistOnly: intent === 'waitlist',
      });
      const invoice = await generateRegistrationInvoiceIfBillable({
        bookingId: result.booking?.id,
        actorUserId: authUserId,
      });
      await recordAuditEvent({
        request,
        action,
        resourceType: 'group_session',
        resourceId: sessionId,
        subjectUserId: result.registration.parentId || parentUserId || authUserId,
        result: 'SUCCESS',
        metadata: {
          athleteId: result.registration.athleteId,
          parentUserId: result.registration.parentId,
          registrationId: result.registration.id,
          registrationStatus: result.registration.status,
          bookingId: result.booking?.id ?? null,
          invoiceId: asString(invoice?.id) ?? null,
        },
      });
      return {
        registration: {
          id: result.registration.id,
          sessionId: result.registration.sessionId,
          athleteId: result.registration.athleteId,
          parentUserId: result.registration.parentId,
          status: result.registration.status,
          registeredAt: result.registration.registeredAt,
          paidAt: result.registration.paidAt ?? null,
          notes: result.registration.notes ?? null,
        },
        booking: result.booking,
        invoice: invoice
          ? {
              id: asString(invoice.id) ?? '',
              bookingId: asString(invoice.bookingId) ?? null,
              status: asString(invoice.status) ?? 'SENT',
              totalMinor: asNumber(invoice.totalMinor) ?? null,
              currency: asString(invoice.currency) ?? 'GBP',
            }
          : null,
        sessionStatus: result.sessionStatus,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      };
    } catch (error) {
      await recordAuditEvent({
        request,
        action,
        resourceType: 'group_session',
        resourceId: sessionId,
        subjectUserId: parentUserId ?? authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          athleteId: athleteId ?? null,
          parentUserId: parentUserId ?? null,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  };
  app.post('/group-sessions/:sessionId/register', async (request, reply) => {
    return reply.send(await registerGroupSessionAthlete(request, 'register'));
  });
  app.post('/group-sessions/:sessionId/waitlist', async (request, reply) => {
    return reply.send(await registerGroupSessionAthlete(request, 'waitlist'));
  });
  app.get('/group-sessions/:sessionId/roster', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    const result = await resolveGroupSessionRepository().listSessionRoster({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      sessionId,
    });
    return reply.send({
      session: result.session,
      registrations: result.registrations,
      total: result.registrations.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.delete('/group-session-registrations/:registrationId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const registrationId = asString(
      (
        request.params as
          | {
              registrationId?: string;
            }
          | undefined
      )?.registrationId,
    );
    if (!registrationId) {
      throw notFound('Registration id is required');
    }
    try {
      const result = await resolveGroupSessionRepository().cancelRegistration({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        registrationId,
      });
      await recordAuditEvent({
        request,
        action: 'group_session.registration_cancelled',
        resourceType: 'group_session_registration',
        resourceId: registrationId,
        subjectUserId: result.registration.parentId || authUserId,
        result: 'SUCCESS',
        metadata: {
          sessionId: result.registration.sessionId,
          athleteId: result.registration.athleteId,
          parentId: result.registration.parentId,
        },
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'group_session.registration_cancelled',
        resourceType: 'group_session_registration',
        resourceId: registrationId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
    return reply.status(204).send();
  });
  app.patch('/group-session-registrations/:registrationId/attendance', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const registrationId = asString(
      (
        request.params as
          | {
              registrationId?: string;
            }
          | undefined
      )?.registrationId,
    );
    if (!registrationId) {
      throw notFound('Registration id is required');
    }
    const body = markGroupSessionAttendanceRequestSchema.parse(request.body ?? {});
    const result = await resolveGroupSessionRepository().markAttendance({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      registrationId,
      date: body.date,
      attended: body.attended,
    });
    await recordAuditEvent({
      request,
      action: body.attended
        ? 'group_session.attendance_marked'
        : 'group_session.attendance_cleared',
      resourceType: 'group_session_registration',
      resourceId: registrationId,
      result: 'SUCCESS',
      metadata: {
        sessionId: result.registration.sessionId,
        athleteId: result.registration.athleteId,
        attendanceDate: body.date,
        attended: body.attended,
        registrationStatus: result.registration.status,
      },
    });
    return reply.send({
      registration: result.registration,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get('/group-session-registrations', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const query = groupSessionRegistrationsQuerySchema.parse(request.query ?? {});
    const athleteIds = splitCsvQueryValue(asString(query.athleteIds));
    if (athleteIds.length === 0) {
      throw badRequest('athleteIds is required');
    }
    const result = await resolveGroupSessionRepository().listRegistrationsForAthleteIds({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      athleteIds,
    });
    return reply.send({
      registrations: result.registrations,
      total: result.registrations.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.post('/group-sessions/:sessionId/rsvps', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    const body = createSessionRsvpsRequestSchema.parse(request.body ?? {});
    try {
      const result = await resolveGroupSessionRepository().createSessionRsvps({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        sessionId,
        members: body.members,
      });
      await recordSessionRsvpAudit({
        request,
        action: 'session_rsvp.create',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: { count: result.rsvps.length },
      });
      return reply.status(201).send({
        rsvps: result.rsvps,
        total: result.rsvps.length,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordSessionRsvpAudit({
        request,
        action: 'session_rsvp.create',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
  app.get('/group-sessions/:sessionId/rsvps', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    try {
      const result = await resolveGroupSessionRepository().listSessionRsvps({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        sessionId,
      });
      await recordSessionRsvpAudit({
        request,
        action: 'session_rsvp.read',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: { count: result.rsvps.length },
      });
      return reply.send({
        rsvps: result.rsvps,
        total: result.rsvps.length,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordSessionRsvpAudit({
        request,
        action: 'session_rsvp.read',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
  app.get('/group-sessions/:sessionId/rsvps/counts', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    const result = await resolveGroupSessionRepository().getSessionRsvpCounts({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      sessionId,
    });
    return reply.send({
      counts: result.counts,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.post('/group-sessions/:sessionId/rsvps/remind', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    try {
      const result = await resolveGroupSessionRepository().remindSessionRsvps({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        sessionId,
      });
      await recordSessionRsvpAudit({
        request,
        action: 'session_rsvp.remind',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: { reminded: result.reminded },
      });
      return reply.send({
        reminded: result.reminded,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordSessionRsvpAudit({
        request,
        action: 'session_rsvp.remind',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
  app.delete('/group-sessions/:sessionId/rsvps', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const sessionId = asString(
      (
        request.params as
          | {
              sessionId?: string;
            }
          | undefined
      )?.sessionId,
    );
    if (!sessionId) {
      throw notFound('Group session id is required');
    }
    try {
      const result = await resolveGroupSessionRepository().deleteSessionRsvpsForSession({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        sessionId,
      });
      const removed = result.reminded;
      await recordSessionRsvpAudit({
        request,
        action: 'session_rsvp.remove',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: { removed },
      });
      return reply.send({
        removed,
        deleted: removed,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordSessionRsvpAudit({
        request,
        action: 'session_rsvp.remove',
        resourceId: sessionId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
  app.get('/session-rsvps/counts', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const query = sessionRsvpBatchCountsQuerySchema.parse(request.query ?? {});
    const sessionIds = splitCsvQueryValue(query.sessionIds);
    const result = await resolveGroupSessionRepository().getBatchSessionRsvpCounts({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      sessionIds,
    });
    return reply.send({
      countsBySessionId: result.countsBySessionId,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get('/session-rsvps/:rsvpId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const rsvpId = asString(
      (
        request.params as
          | {
              rsvpId?: string;
            }
          | undefined
      )?.rsvpId,
    );
    if (!rsvpId) {
      throw notFound('Session RSVP id is required');
    }
    const result = await resolveGroupSessionRepository().getSessionRsvpById({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      rsvpId,
    });
    return reply.send({
      rsvp: result.rsvp,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.patch('/session-rsvps/:rsvpId/respond', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const rsvpId = asString(
      (
        request.params as
          | {
              rsvpId?: string;
            }
          | undefined
      )?.rsvpId,
    );
    if (!rsvpId) {
      throw notFound('Session RSVP id is required');
    }
    const body = respondSessionRsvpRequestSchema.parse(request.body ?? {});
    try {
      const result = await resolveGroupSessionRepository().respondSessionRsvp({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        rsvpId,
        status: body.status,
      });
      await recordSessionRsvpAudit({
        request,
        action: 'session_rsvp.respond',
        resourceId: rsvpId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          sessionId: result.rsvp.sessionId,
          status: result.rsvp.status,
        },
      });
      return reply.send({
        rsvp: result.rsvp,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordSessionRsvpAudit({
        request,
        action: 'session_rsvp.respond',
        resourceId: rsvpId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });
  app.get('/session-rsvps', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const query = sessionRsvpsQuerySchema.parse(request.query ?? {});
    const userId = query.userId ?? authUserId;
    const result = await resolveGroupSessionRepository().listSessionRsvpsForUser({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      userId,
      status: query.status,
    });
    return reply.send({
      rsvps: result.rsvps,
      total: result.rsvps.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get('/invites', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const query = invitesQuerySchema.parse(request.query ?? {});
    const requestedCoachUserId = asString(query.coachUserId);
    const requestedParentUserId = asString(query.parentUserId);
    const requestedGroupId = asString(query.groupId);
    const requestedInviteType = normalizeInviteAudienceType(asString(query.inviteType));
    const requestedSquadIds = splitCsvQueryValue(asString(query.squadIds));
    const requestedSquadIdSet = new Set(requestedSquadIds);
    if (
      !requestedCoachUserId &&
      !requestedParentUserId &&
      !requestedGroupId &&
      !requestedInviteType
    ) {
      throw badRequest('coachUserId, parentUserId, groupId, or inviteType is required');
    }
    if (requestedCoachUserId && requestedParentUserId) {
      throw badRequest('coachUserId and parentUserId cannot be combined');
    }
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const store = await getInviteRuntimeStore({
      coachUserId: requestedCoachUserId,
      parentUserId: requestedParentUserId,
    });
    const invites = asRows(store.tables.invites);
    const targets = asRows(store.tables.inviteTargets);
    if (requestedCoachUserId) {
      if (!isPrivilegedAdmin && requestedCoachUserId !== authUserId) {
        throw forbidden('coachUserId must match authenticated user');
      }
      const rows = invites
        .flatMap((invite) => {
          if (asString(invite.senderUserId) !== requestedCoachUserId) {
            return [];
          }
          const inviteId = asString(invite.id);
          const inviteTargets = targets.filter((target) => asString(target.inviteId) === inviteId);
          const view = buildSessionInviteView({
            tables: store.tables,
            invite,
            targets: inviteTargets,
          });
          if (
            !view.id ||
            (requestedGroupId && view.groupId !== requestedGroupId) ||
            (requestedInviteType && view.inviteType !== requestedInviteType) ||
            (requestedSquadIds.length > 0 &&
              !view.squadIds?.some((squadId) => requestedSquadIdSet.has(squadId)))
          ) {
            return [];
          }
          return [view];
        })
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      return reply.send({
        invites: rows,
        total: rows.length,
        seedVersion: store.version,
        requestId: request.requestId,
      });
    }
    if (requestedParentUserId && !isPrivilegedAdmin && requestedParentUserId !== authUserId) {
      throw forbidden('parentUserId must match authenticated user');
    }
    const rowMap = new Map<string, ReturnType<typeof buildSessionInviteView>>();
    const addInviteRow = (params: {
      invite: SeedRow;
      inviteTargets: SeedRow[];
      overrideParentUserId?: string;
    }) => {
      const row = buildSessionInviteView({
        tables: store.tables,
        invite: params.invite,
        targets: params.inviteTargets,
      });
      if (!row.id) {
        return;
      }
      if (requestedGroupId && row.groupId !== requestedGroupId) {
        return;
      }
      if (requestedInviteType && row.inviteType !== requestedInviteType) {
        return;
      }
      if (
        requestedSquadIds.length > 0 &&
        (!row.squadIds || !row.squadIds.some((squadId) => requestedSquadIdSet.has(squadId)))
      ) {
        return;
      }
      rowMap.set(
        row.id,
        params.overrideParentUserId
          ? {
              ...row,
              parentId: params.overrideParentUserId,
              dismissed: undefined,
            }
          : row,
      );
    };
    const visibleParentUserId = requestedParentUserId ?? authUserId;
    for (const invite of invites) {
      const inviteId = asString(invite.id);
      if (!inviteId) {
        continue;
      }
      const inviteTargets = targets.filter((target) => asString(target.inviteId) === inviteId);
      const targetedRows = inviteTargets.filter(
        (target) => asString(target.targetUserId) === visibleParentUserId,
      );
      const inviteView = buildSessionInviteView({
        tables: store.tables,
        invite,
        targets: inviteTargets,
      });
      if (requestedParentUserId) {
        if (targetedRows.length > 0) {
          if (!isInviteDismissed(targetedRows[0])) {
            addInviteRow({
              invite,
              inviteTargets: targetedRows,
            });
          }
          continue;
        }
        if (
          requestedInviteType === 'SQUAD_ONLY' &&
          requestedSquadIds.length > 0 &&
          inviteView.squadIds?.some((squadId) => requestedSquadIdSet.has(squadId)) &&
          userCanReadSquadInvite(
            store.tables,
            visibleParentUserId,
            inviteView.squadIds.filter((squadId) => requestedSquadIdSet.has(squadId)),
          )
        ) {
          addInviteRow({
            invite,
            inviteTargets:
              inviteTargets.length > 0
                ? inviteTargets
                : [
                    {
                      targetUserId: visibleParentUserId,
                    },
                  ],
            overrideParentUserId: visibleParentUserId,
          });
        }
        continue;
      }
      const isOwner = asString(invite.senderUserId) === authUserId;
      if (isOwner) {
        addInviteRow({
          invite,
          inviteTargets,
        });
        continue;
      }
      if (targetedRows.length > 0) {
        if (!isInviteDismissed(targetedRows[0])) {
          addInviteRow({
            invite,
            inviteTargets: targetedRows,
          });
        }
        continue;
      }
      if (requestedInviteType === 'OPEN') {
        addInviteRow({
          invite,
          inviteTargets:
            inviteTargets.length > 0
              ? inviteTargets
              : [
                  {
                    targetUserId: authUserId,
                  },
                ],
          overrideParentUserId: authUserId,
        });
      }
    }
    const rows = Array.from(rowMap.values()).sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    return reply.send({
      invites: rows,
      total: rows.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });
  app.post('/invites', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = createInviteRequestSchema.parse(request.body ?? {});
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isPrivilegedAdmin && body.coachUserId !== authUserId) {
      await recordInviteAudit({
        request,
        action: 'invite.create',
        result: 'DENY',
        subjectUserId: body.parentUserId,
        metadata: {
          reason: 'coachUserId_mismatch',
          coachUserId: body.coachUserId,
          parentUserId: body.parentUserId,
          athleteIds: body.athleteIds,
        },
      });
      throw forbidden('coachUserId must match authenticated user');
    }
    const store = await getInviteRuntimeStore({
      athleteIds: body.athleteIds,
      authUserId,
      coachUserId: body.coachUserId,
      existingSessionId: body.existingSessionId,
      parentUserId: body.parentUserId,
    });
    const idempotentResponse = findSeedCreateInviteIdempotency({
      tables: store.tables,
      authUserId,
      body,
    });
    if (idempotentResponse) {
      return reply.status(idempotentResponse.responseStatus).send({
        invite: buildSessionInviteView({
          tables: store.tables,
          invite: idempotentResponse.invite,
          targets: idempotentResponse.targets,
        }),
        seedVersion: store.version,
        requestId: request.requestId,
      });
    }
    const groupSessionRepository = resolveGroupSessionRepository();
    const users = asRows(store.tables.users);
    const coachExists = users.some((row) => asString(row.id) === body.coachUserId);
    if (!coachExists) {
      throw notFound('Coach user not found', {
        coachUserId: body.coachUserId,
      });
    }
    const parentExists = users.some((row) => asString(row.id) === body.parentUserId);
    if (!parentExists) {
      throw notFound('Parent user not found', {
        parentUserId: body.parentUserId,
      });
    }
    const now = isoNow();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (body.expiresInDays ?? 7));
    const guardianLinks = asRows(store.tables.guardianChildLinks);
    const linkedGroupSession = body.existingSessionId
      ? await groupSessionRepository.findSessionById(body.existingSessionId)
      : null;
    const targetsToCreate = body.athleteIds.map((athleteId) => {
      const guardianLink = guardianLinks.find(
        (row) =>
          asString(row.athleteId) === athleteId &&
          asString(row.guardianUserId) === body.parentUserId,
      );
      if (!guardianLink) {
        throw badRequest('Each athleteId must belong to the provided parentUserId');
      }
      return {
        athleteId,
        familyId: asString(guardianLink.familyId) ?? null,
      };
    });
    if ((body.squadIds?.length ?? 0) > 0 && body.inviteType !== 'SQUAD_ONLY') {
      throw badRequest('squadIds require inviteType SQUAD_ONLY');
    }
    if (body.inviteType === 'SQUAD_ONLY') {
      assertCanCreateSquadInvite({
        tables: store.tables,
        coachUserId: body.coachUserId,
        athleteIds: body.athleteIds,
        squadIds: body.squadIds ?? [],
        isPrivilegedAdmin,
      });
    }
    const seenSlots = new Set<string>();
    for (const slot of body.proposedSlots) {
      const slotKey = `${slot.date}_${slot.startTime}_${slot.endTime}`;
      if (seenSlots.has(slotKey)) {
        throw badRequest('proposedSlots must not contain duplicate slots');
      }
      seenSlots.add(slotKey);
    }
    if (!linkedGroupSession) {
      const availability = await resolveCoachAvailabilityTables(body.coachUserId);
      mergeInviteRuntimeTables(store.tables, availability.tables);
      for (const slot of body.proposedSlots) {
        const durationMinutes = calculateSlotDurationMinutes(slot) ?? body.durationMinutes ?? 60;
        assertCoachAvailabilitySlotOpen({
          tables: store.tables,
          coachUserId: body.coachUserId,
          scheduledAt: slotToScheduledAt(slot),
          durationMinutes,
          sessionTemplateId: body.sessionTemplateId ?? undefined,
          excludePendingInvites: true,
          applySchedulingRules: true,
        });
      }
    }
    const inviteId = newId('inv');
    const inviteRow: SeedRow = {
      id: inviteId,
      senderUserId: body.coachUserId,
      clubId: linkedGroupSession?.clubId ?? null,
      eventId: null,
      groupSessionId: linkedGroupSession ? body.existingSessionId : null,
      bookingId: null,
      inviteType: 'session_invite',
      message: body.notes ?? body.focus,
      metadataJson: {
        clubName: body.clubName,
        inviteAudienceType: body.inviteType ?? 'OPEN',
        squadIds: body.squadIds ?? [],
        proposedSlots: body.proposedSlots,
        sessionType: body.sessionType,
        sessionTemplateId: body.sessionTemplateId ?? null,
        focus: body.focus,
        notes: body.notes ?? null,
        priceMinor: body.priceMinor ?? null,
        durationMinutes: body.durationMinutes ?? null,
        groupId: body.groupId ?? null,
        existingSessionId: body.existingSessionId ?? null,
        isRecurring: body.isRecurring ?? false,
        recurrenceWeeks: body.recurrenceWeeks ?? null,
        coverImageUrl: body.coverImageUrl ?? null,
        locationCoordinates: body.locationCoordinates ?? null,
        currency: body.currency ?? 'GBP',
      },
      status: 'PENDING',
      revokedAt: null,
      expiresAt: expiresAt.toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    asRows(store.tables.invites).push(inviteRow);
    const inviteTargets = asRows(store.tables.inviteTargets);
    const createdTargets = targetsToCreate.map(({ athleteId, familyId }) => {
      const targetRow: SeedRow = {
        id: newId('ivt'),
        inviteId,
        targetUserId: body.parentUserId,
        targetAthleteId: athleteId,
        targetFamilyId: familyId,
        status: 'PENDING',
        respondedAt: null,
        responsePayloadJson: null,
        createdAt: now,
        updatedAt: now,
      };
      inviteTargets.push(targetRow);
      return targetRow;
    });
    await recordInviteAudit({
      request,
      action: 'invite.create',
      resourceId: inviteId,
      subjectUserId: body.parentUserId,
      result: 'SUCCESS',
      metadata: {
        coachUserId: body.coachUserId,
        parentUserId: body.parentUserId,
        athleteIds: body.athleteIds,
        inviteAudienceType: body.inviteType ?? 'OPEN',
        groupId: body.groupId ?? null,
        existingSessionId: body.existingSessionId ?? null,
        targetIds: createdTargets.flatMap((target) => {
          const targetId = asString(target.id);
          return targetId ? [targetId] : [];
        }),
      },
    });
    recordSeedCreateInviteIdempotency({
      tables: store.tables,
      authUserId,
      body,
      inviteId,
      now,
    });
    await commitInviteRuntimeStore(store);
    return reply.status(201).send({
      invite: buildSessionInviteView({
        tables: store.tables,
        invite: inviteRow,
        targets: createdTargets,
      }),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });
  app.get('/invites/:inviteId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const inviteId = asString(
      (
        request.params as
          | {
              inviteId?: string;
            }
          | undefined
      )?.inviteId,
    );
    if (!inviteId) {
      throw notFound('Invite id is required');
    }
    const store = await getInviteRuntimeStore({
      inviteId,
    });
    const invites = asRows(store.tables.invites);
    const targets = asRows(store.tables.inviteTargets);
    const invite = invites.find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', {
        inviteId,
      });
    }
    const inviteTargets = targets.filter((row) => asString(row.inviteId) === inviteId);
    const isOwner = asString(invite.senderUserId) === authUserId;
    const visibleTargets = inviteTargets.filter((row) => asString(row.targetUserId) === authUserId);
    if (!isOwner && visibleTargets.length === 0) {
      throw forbidden('Invite does not belong to authenticated user');
    }
    return reply.send({
      invite: buildSessionInviteView({
        tables: store.tables,
        invite,
        targets: isOwner ? inviteTargets : visibleTargets,
      }),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });
  app.get('/invites/:inviteId/rsvps', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const inviteId = asString(
      (
        request.params as
          | {
              inviteId?: string;
            }
          | undefined
      )?.inviteId,
    );
    if (!inviteId) {
      throw notFound('Invite id is required');
    }
    const requestedStatus = normalizeInviteRsvpStatus(
      asString((request.query as { status?: string } | undefined)?.status),
    );
    const store = await getInviteRuntimeStore({
      inviteId,
      parentUserId: authUserId,
    });
    const invite = asRows(store.tables.invites).find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', {
        inviteId,
      });
    }
    const inviteTargets = asRows(store.tables.inviteTargets).filter(
      (row) => asString(row.inviteId) === inviteId,
    );
    const access = getInviteRsvpAccess({
      tables: store.tables,
      invite,
      targets: inviteTargets,
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });
    if (!access.canRead) {
      await recordInviteAudit({
        request,
        action: 'invite.rsvp.read',
        resourceId: inviteId,
        subjectUserId: authUserId,
        result: 'DENY',
        metadata: {
          reason: 'not_invite_visible',
          audienceType: access.audienceType ?? null,
          status: asString(invite.status) ?? null,
        },
      });
      throw forbidden('Invite RSVP state is not visible to authenticated user');
    }
    const responses = readInviteRsvpResponses(invite);
    const filtered = requestedStatus
      ? responses.filter((response) => response.status === requestedStatus)
      : responses;
    await recordInviteAudit({
      request,
      action: 'invite.rsvp.read',
      resourceId: inviteId,
      subjectUserId: authUserId,
      result: 'SUCCESS',
      metadata: {
        audienceType: access.audienceType ?? null,
        requestedStatus: requestedStatus ?? null,
        total: responses.length,
      },
    });
    return reply.send({
      inviteId,
      responses: filtered,
      counts: buildInviteRsvpCounts(responses),
      total: filtered.length,
      requestId: request.requestId,
    });
  });
  app.post('/invites/:inviteId/rsvps', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const inviteId = asString(
      (
        request.params as
          | {
              inviteId?: string;
            }
          | undefined
      )?.inviteId,
    );
    if (!inviteId) {
      throw notFound('Invite id is required');
    }
    const body = inviteRsvpResponseRequestSchema.parse(request.body ?? {});
    if (body.userId && body.userId !== authUserId) {
      await recordInviteAudit({
        request,
        action: 'invite.rsvp.respond',
        resourceId: inviteId,
        subjectUserId: authUserId,
        result: 'DENY',
        metadata: {
          reason: 'userId_mismatch',
          requestedUserId: body.userId,
          status: body.status,
        },
      });
      throw forbidden('userId must match authenticated user');
    }
    const store = await getInviteRuntimeStore({
      inviteId,
      parentUserId: authUserId,
      athleteIds: body.childId ? [body.childId] : undefined,
    });
    const invite = asRows(store.tables.invites).find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', {
        inviteId,
      });
    }
    const inviteTargets = asRows(store.tables.inviteTargets).filter(
      (row) => asString(row.inviteId) === inviteId,
    );
    const access = getInviteRsvpAccess({
      tables: store.tables,
      invite,
      targets: inviteTargets,
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });
    if (!access.canRespond) {
      await recordInviteAudit({
        request,
        action: 'invite.rsvp.respond',
        resourceId: inviteId,
        subjectUserId: authUserId,
        result: 'DENY',
        metadata: {
          reason: access.isOwner ? 'owner_cannot_social_rsvp' : 'not_invite_target_or_open',
          audienceType: access.audienceType ?? null,
          status: asString(invite.status) ?? null,
          requestedStatus: body.status,
        },
      });
      throw forbidden('Invite RSVP state does not belong to authenticated user');
    }
    if (asString(invite.revokedAt) || asString(invite.status) === 'EXPIRED') {
      await recordInviteAudit({
        request,
        action: 'invite.rsvp.respond',
        resourceId: inviteId,
        subjectUserId: authUserId,
        result: 'DENY',
        metadata: {
          reason: 'invite_expired',
          requestedStatus: body.status,
        },
      });
      throw badRequest('Invite has expired');
    }
    try {
      assertInviteRsvpChildAccess({
        tables: store.tables,
        authUserId,
        childId: body.childId,
        targets: inviteTargets,
      });
    } catch (error) {
      await recordInviteAudit({
        request,
        action: 'invite.rsvp.respond',
        resourceId: inviteId,
        subjectUserId: authUserId,
        result: 'DENY',
        metadata: {
          reason: 'child_not_owned',
          childId: body.childId ?? null,
          requestedStatus: body.status,
        },
      });
      throw error;
    }
    const now = isoNow();
    const existingResponses = readInviteRsvpResponses(invite);
    const existingIndex = existingResponses.findIndex(
      (response) =>
        response.userId === authUserId && (response.childId ?? null) === (body.childId ?? null),
    );
    const userPhotoUrl = resolveInviteRsvpPhotoUrl({
      tables: store.tables,
      userId: authUserId,
      fallback: body.userPhotoUrl,
    });
    const response: InviteRsvpResponseRow = {
      id:
        existingIndex >= 0
          ? existingResponses[existingIndex].id
          : buildInviteRsvpResponseId({
              inviteId,
              userId: authUserId,
              childId: body.childId,
            }),
      inviteId,
      userId: authUserId,
      userName: resolveInviteRsvpDisplayName({
        tables: store.tables,
        userId: authUserId,
        fallback: body.userName,
      }),
      ...(userPhotoUrl ? { userPhotoUrl } : {}),
      ...(body.childId ? { childId: body.childId } : {}),
      ...(body.childName ? { childName: body.childName } : {}),
      status: body.status,
      respondedAt: now,
    };
    const nextResponses = [...existingResponses];
    if (existingIndex >= 0) {
      nextResponses[existingIndex] = response;
    } else {
      nextResponses.push(response);
    }
    writeInviteRsvpResponses(invite, nextResponses);
    await recordInviteAudit({
      request,
      action: 'invite.rsvp.respond',
      resourceId: inviteId,
      subjectUserId: authUserId,
      result: 'SUCCESS',
      metadata: {
        responseId: response.id,
        status: response.status,
        childId: response.childId ?? null,
        audienceType: access.audienceType ?? null,
      },
    });
    await commitInviteRuntimeStore(store);
    const persistedResponses = readInviteRsvpResponses(invite);
    return reply.send({
      inviteId,
      response,
      responses: persistedResponses,
      counts: buildInviteRsvpCounts(persistedResponses),
      requestId: request.requestId,
    });
  });
  app.patch('/invite-rsvps/:responseId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const responseId = asString(
      (
        request.params as
          | {
              responseId?: string;
            }
          | undefined
      )?.responseId,
    );
    if (!responseId) {
      throw notFound('Invite RSVP response id is required');
    }
    const inviteId = parseInviteIdFromRsvpResponseId(responseId);
    if (!inviteId) {
      throw notFound('Invite RSVP response not found', {
        responseId,
      });
    }
    const body = inviteRsvpResponseRequestSchema.pick({ status: true }).parse(request.body ?? {});
    const store = await getInviteRuntimeStore({
      inviteId,
      parentUserId: authUserId,
    });
    const invite = asRows(store.tables.invites).find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', {
        inviteId,
      });
    }
    const inviteTargets = asRows(store.tables.inviteTargets).filter(
      (row) => asString(row.inviteId) === inviteId,
    );
    const access = getInviteRsvpAccess({
      tables: store.tables,
      invite,
      targets: inviteTargets,
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });
    const responses = readInviteRsvpResponses(invite);
    const existingIndex = responses.findIndex((response) => response.id === responseId);
    const existing = existingIndex >= 0 ? responses[existingIndex] : undefined;
    if (!existing) {
      throw notFound('Invite RSVP response not found', {
        responseId,
      });
    }
    if (!access.canRespond || existing.userId !== authUserId) {
      await recordInviteAudit({
        request,
        action: 'invite.rsvp.update',
        resourceId: inviteId,
        subjectUserId: authUserId,
        result: 'DENY',
        metadata: {
          reason:
            existing.userId !== authUserId ? 'not_response_owner' : 'not_invite_target_or_open',
          responseId,
          status: asString(invite.status) ?? null,
          requestedStatus: body.status,
        },
      });
      throw forbidden('Invite RSVP response does not belong to authenticated user');
    }
    if (asString(invite.revokedAt) || asString(invite.status) === 'EXPIRED') {
      await recordInviteAudit({
        request,
        action: 'invite.rsvp.update',
        resourceId: inviteId,
        subjectUserId: authUserId,
        result: 'DENY',
        metadata: {
          reason: 'invite_expired',
          responseId,
          requestedStatus: body.status,
        },
      });
      throw badRequest('Invite has expired');
    }
    const response: InviteRsvpResponseRow = {
      ...existing,
      status: body.status,
      respondedAt: isoNow(),
    };
    const nextResponses = [...responses];
    nextResponses[existingIndex] = response;
    writeInviteRsvpResponses(invite, nextResponses);
    await recordInviteAudit({
      request,
      action: 'invite.rsvp.update',
      resourceId: inviteId,
      subjectUserId: authUserId,
      result: 'SUCCESS',
      metadata: {
        responseId,
        status: body.status,
      },
    });
    await commitInviteRuntimeStore(store);
    const persistedResponses = readInviteRsvpResponses(invite);
    return reply.send({
      inviteId,
      response,
      responses: persistedResponses,
      counts: buildInviteRsvpCounts(persistedResponses),
      requestId: request.requestId,
    });
  });
  app.delete('/invites/:inviteId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const inviteId = asString(
      (
        request.params as
          | {
              inviteId?: string;
            }
          | undefined
      )?.inviteId,
    );
    if (!inviteId) {
      throw notFound('Invite id is required');
    }
    const store = await getInviteRuntimeStore({
      inviteId,
    });
    const invites = asRows(store.tables.invites);
    const targets = asRows(store.tables.inviteTargets);
    const invite = invites.find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', {
        inviteId,
      });
    }
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const isOwner = asString(invite.senderUserId) === authUserId;
    if (!isOwner && !isPrivilegedAdmin) {
      await recordInviteAudit({
        request,
        action: 'invite.cancel',
        resourceId: inviteId,
        subjectUserId: asString(
          targets.find((target) => asString(target.inviteId) === inviteId)?.targetUserId,
        ),
        result: 'DENY',
        metadata: {
          reason: 'not_owner_or_admin',
          senderUserId: asString(invite.senderUserId) ?? null,
          status: asString(invite.status) ?? null,
        },
      });
      throw forbidden('Invite does not belong to authenticated user');
    }
    const now = isoNow();
    const previousStatus = asString(invite.status) ?? null;
    invite.status = 'EXPIRED';
    invite.revokedAt = now;
    invite.updatedAt = now;
    const inviteTargets = targets.filter((target) => asString(target.inviteId) === inviteId);
    inviteTargets.forEach((target) => {
      if (asString(target.status) === 'PENDING') {
        target.status = 'EXPIRED';
      }
      target.updatedAt = now;
    });
    await recordInviteAudit({
      request,
      action: 'invite.cancel',
      resourceId: inviteId,
      subjectUserId: asString(inviteTargets[0]?.targetUserId) ?? null,
      result: 'SUCCESS',
      metadata: {
        previousStatus,
        status: asString(invite.status) ?? null,
        targetIds: inviteTargets.flatMap((target) => {
          const targetId = asString(target.id);
          return targetId ? [targetId] : [];
        }),
        targetUserIds: inviteTargets.flatMap((target) => {
          const targetUserId = asString(target.targetUserId);
          return targetUserId ? [targetUserId] : [];
        }),
      },
    });
    await commitInviteRuntimeStore(store);
    return reply.status(204).send();
  });
  app.post('/invites/:inviteId/remind', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const inviteId = asString(
      (
        request.params as
          | {
              inviteId?: string;
            }
          | undefined
      )?.inviteId,
    );
    if (!inviteId) {
      throw notFound('Invite id is required');
    }
    const store = await getInviteRuntimeStore({
      inviteId,
    });
    const invites = asRows(store.tables.invites);
    const invite = invites.find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', {
        inviteId,
      });
    }
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const isOwner = asString(invite.senderUserId) === authUserId;
    if (!isOwner && !isPrivilegedAdmin) {
      await recordInviteAudit({
        request,
        action: 'invite.remind',
        resourceId: inviteId,
        result: 'DENY',
        metadata: {
          reason: 'not_owner_or_admin',
          senderUserId: asString(invite.senderUserId) ?? null,
          status: asString(invite.status) ?? null,
        },
      });
      throw forbidden('Invite does not belong to authenticated user');
    }
    if (asString(invite.revokedAt) || asString(invite.status) !== 'PENDING') {
      throw badRequest('Only pending invites can be reminded');
    }
    const now = isoNow();
    const metadata = asObject(invite.metadataJson) ?? {};
    invite.metadataJson = {
      ...metadata,
      lastRemindedAt: now,
      reminderCount: (asNumber(metadata.reminderCount) ?? 0) + 1,
    };
    invite.updatedAt = now;
    await recordInviteAudit({
      request,
      action: 'invite.remind',
      resourceId: inviteId,
      result: 'SUCCESS',
      metadata: {
        status: asString(invite.status) ?? null,
        reminderCount: asNumber((asObject(invite.metadataJson) ?? {}).reminderCount) ?? null,
        lastRemindedAt: now,
      },
    });
    await commitInviteRuntimeStore(store);
    return reply.status(204).send();
  });
  app.post('/invites/:inviteId/dismiss', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const inviteId = asString(
      (
        request.params as
          | {
              inviteId?: string;
            }
          | undefined
      )?.inviteId,
    );
    if (!inviteId) {
      throw notFound('Invite id is required');
    }
    const store = await getInviteRuntimeStore({
      inviteId,
    });
    const invite = asRows(store.tables.invites).find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', {
        inviteId,
      });
    }
    const visibleTargets = asRows(store.tables.inviteTargets).filter(
      (row) => asString(row.inviteId) === inviteId && asString(row.targetUserId) === authUserId,
    );
    if (visibleTargets.length === 0) {
      await recordInviteAudit({
        request,
        action: 'invite.dismiss',
        resourceId: inviteId,
        result: 'DENY',
        metadata: {
          reason: 'not_invite_target',
          status: asString(invite.status) ?? null,
        },
      });
      throw forbidden('Invite does not belong to authenticated user');
    }
    const now = isoNow();
    visibleTargets.forEach((target) => {
      const responsePayload = asObject(target.responsePayloadJson) ?? {};
      target.responsePayloadJson = {
        ...responsePayload,
        dismissed: true,
        dismissedAt: now,
      };
      target.updatedAt = now;
    });
    await recordInviteAudit({
      request,
      action: 'invite.dismiss',
      resourceId: inviteId,
      subjectUserId: authUserId,
      result: 'SUCCESS',
      metadata: {
        status: asString(invite.status) ?? null,
        targetIds: visibleTargets.flatMap((target) => {
          const targetId = asString(target.id);
          return targetId ? [targetId] : [];
        }),
      },
    });
    await commitInviteRuntimeStore(store);
    return reply.status(204).send();
  });
  app.post('/invites/:inviteId/respond', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const inviteId = asString(
      (
        request.params as {
          inviteId?: string;
        }
      ).inviteId,
    );
    if (!inviteId) {
      throw notFound('Invite id is required');
    }
    const body = inviteResponseRequestSchema.parse(request.body);
    const store = await getInviteRuntimeStore({
      inviteId,
      parentUserId: authUserId,
    });
    const invites = asRows(store.tables.invites);
    const targets = asRows(store.tables.inviteTargets);
    const invite = invites.find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', {
        inviteId,
      });
    }
    if (asString(invite.revokedAt) || asString(invite.status) === 'EXPIRED') {
      throw badRequest('Invite has expired');
    }
    const visibleTargets = targets.filter(
      (row) => asString(row.inviteId) === inviteId && asString(row.targetUserId) === authUserId,
    );
    if (visibleTargets.length === 0) {
      await recordInviteAudit({
        request,
        action: 'invite.respond',
        resourceId: inviteId,
        result: 'DENY',
        metadata: {
          reason: 'not_invite_target',
          requestedResponse: body.response,
          status: asString(invite.status) ?? null,
        },
      });
      throw forbidden('Invite does not belong to authenticated user');
    }
    const now = isoNow();
    const existingBookingId = asString(invite.bookingId);
    const visibleTargetStatuses = visibleTargets.map(
      (target) => asString(target.status)?.toUpperCase() ?? 'PENDING',
    );
    const allVisibleTargetsAlreadyMatch =
      visibleTargetStatuses.length > 0 &&
      visibleTargetStatuses.every((status) => status === body.response);
    const hasTerminalVisibleTarget = visibleTargetStatuses.some(isTerminalInviteResponseStatus);
    if (allVisibleTargetsAlreadyMatch) {
      const existingBooking = existingBookingId
        ? await resolveBookingRepository().getVisibleBookingById({
            authUserId,
            bookingId: existingBookingId,
          })
        : null;
      const replayInvite = buildSessionInviteView({
        tables: store.tables,
        invite,
        targets: visibleTargets,
      });
      await recordInviteAudit({
        request,
        action: 'invite.respond',
        resourceId: inviteId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          replay: true,
          response: body.response,
          status: asString(invite.status) ?? body.response,
          targetStatus: asString(visibleTargets[0]?.status) ?? body.response,
          bookingId: existingBooking?.id ?? existingBookingId ?? null,
        },
      });
      return reply.send({
        invite: replayInvite,
        inviteId,
        response: body.response,
        status: asString(invite.status) ?? body.response,
        targetStatus: asString(visibleTargets[0]?.status) ?? body.response,
        respondedAt: asString(visibleTargets[0]?.respondedAt) ?? now,
        selectedSlot: body.selectedSlot ?? replayInvite.selectedSlot,
        bookingId: existingBooking?.id ?? existingBookingId ?? null,
        registrationId: null,
        registrationStatus: null,
        booking: existingBooking,
        requestId: request.requestId,
      });
    }
    if (hasTerminalVisibleTarget) {
      await recordInviteAudit({
        request,
        action: 'invite.respond',
        resourceId: inviteId,
        subjectUserId: authUserId,
        result: 'DENY',
        metadata: {
          reason: 'response_already_recorded',
          requestedResponse: body.response,
          status: asString(invite.status) ?? null,
          targetStatuses: visibleTargetStatuses,
          bookingId: existingBookingId ?? null,
        },
      });
      throw conflict('Invite response has already been recorded');
    }
    let registrationId: string | null = null;
    let registrationStatus:
      | 'REGISTERED'
      | 'WAITLISTED'
      | 'CANCELLED'
      | 'ATTENDED'
      | 'NO_SHOW'
      | null = null;
    let booking = null;
    let bookingSeriesId: string | null = null;
    let bookingIds: string[] = [];
    let responseSelectedSlot = body.selectedSlot;
    const groupSessionId = asString(invite.groupSessionId);
    const metadata = asObject(invite.metadataJson);
    const recurringWeekResponses = body.recurringWeekResponses ?? [];
    const acceptedWeekResponses = recurringWeekResponses.filter((week) => week.accepted);
    const declinedWeekResponses = recurringWeekResponses.filter((week) => !week.accepted);
    if (body.response === 'DECLINED' && acceptedWeekResponses.length > 0) {
      throw badRequest('Declined recurring invite responses cannot include accepted weeks');
    }
    if (body.response === 'ACCEPTED') {
      if (recurringWeekResponses.length > 0) {
        if (asBoolean(metadata?.isRecurring) !== true) {
          throw badRequest('Recurring week responses are only valid for recurring invites');
        }
        if (acceptedWeekResponses.length === 0) {
          throw badRequest('At least one recurring week must be accepted');
        }
        const allowedWeekSlots = buildInviteRecurringWeekSlotsFromMetadata(metadata);
        if (
          allowedWeekSlots.length > 0 &&
          !recurringWeekResponses.every((week) =>
            allowedWeekSlots.some((candidate) => areMatchingInviteWeeks(candidate, week)),
          )
        ) {
          throw badRequest('Recurring week responses must match the invite week slots');
        }
        const athleteIds = visibleTargets.flatMap((target) => {
          const mapped = asString(target.targetAthleteId);
          return mapped ? [mapped] : [];
        });
        if (athleteIds.length === 0) {
          throw badRequest('Invite is missing athlete targets');
        }
        const coachUserId = asString(invite.senderUserId) ?? '';
        const firstAcceptedWeek = acceptedWeekResponses[0];
        if (!firstAcceptedWeek) {
          throw badRequest('At least one recurring week must be accepted');
        }
        responseSelectedSlot = responseSelectedSlot ?? weekResponseToSlot(firstAcceptedWeek);
        const seriesBody = createBookingSeriesRequestSchema.parse({
          coachUserId,
          athleteIds,
          bookedByUserId: authUserId,
          occurrences: acceptedWeekResponses.map((week) => {
            const slot = weekResponseToSlot(week);
            return {
              scheduledAt: slotToScheduledAt(slot),
              durationMinutes:
                calculateSlotDurationMinutes(slot) ?? asNumber(metadata?.durationMinutes) ?? 60,
              ...(slot.location ? { location: slot.location } : {}),
            };
          }),
          location:
            firstAcceptedWeek.location ??
            asString(buildInviteProposedSlotsFromMetadata(metadata)[0]?.location) ??
            'Coach preferred location',
          serviceType: asString(metadata?.sessionType) ?? 'Session',
          ...(asString(metadata?.sessionTemplateId)
            ? { sessionTemplateId: asString(metadata?.sessionTemplateId) }
            : {}),
          objectives: [asString(metadata?.focus) ?? asString(invite.message) ?? 'Session'],
          ...(asString(metadata?.notes) ? { notes: asString(metadata?.notes) } : {}),
          ...(typeof asNumber(metadata?.priceMinor) === 'number'
            ? { priceMinor: asNumber(metadata?.priceMinor) }
            : {}),
          currency: asString(metadata?.currency) ?? 'GBP',
          frequency: 'CUSTOM',
          patternLabel: `${acceptedWeekResponses.length} of ${recurringWeekResponses.length} weeks`,
          idempotencyKey: `invite-recurring-${inviteId}-${authUserId}`,
        });
        assertBookingSeriesOccurrencesValid(seriesBody);
        await assertBookingSeriesCreateAccess({
          authUserId,
          body: seriesBody,
        });
        const availability = await resolveCoachAvailabilityTables(coachUserId);
        mergeInviteRuntimeTables(store.tables, availability.tables);
        for (const occurrence of seriesBody.occurrences) {
          assertCoachAvailabilitySlotOpen({
            tables: store.tables,
            coachUserId,
            scheduledAt: occurrence.scheduledAt,
            durationMinutes: occurrence.durationMinutes,
            applySchedulingRules: true,
          });
        }
        const seriesResponse = await resolveBookingSeriesRepository().createBookingSeries({
          authUserId,
          requestId: request.requestId,
          body: seriesBody,
        });
        bookingSeriesId = seriesResponse.series.id;
        bookingIds = seriesResponse.bookings.map((item) => item.id);
        booking = seriesResponse.bookings[0] ?? null;
        invite.bookingId = booking?.id ?? null;
        invite.metadataJson = {
          ...(metadata ?? {}),
          recurringSeriesId: bookingSeriesId,
          bookingIds,
          weekSlots: recurringWeekResponses,
        };
      } else if (groupSessionId) {
        const groupSessionRepository = resolveGroupSessionRepository();
        const linkedSession = await groupSessionRepository.findSessionById(groupSessionId);
        if (!linkedSession) {
          throw notFound('Linked group session not found', {
            groupSessionId,
          });
        }
        const targetAthleteIds = visibleTargets.flatMap((visibleTarget) => {
          const targetAthleteId = asString(visibleTarget.targetAthleteId);
          return targetAthleteId ? [targetAthleteId] : [];
        });
        const registrationResults: Array<
          Awaited<ReturnType<typeof groupSessionRepository.registerAthlete>>
        > = [];
        await targetAthleteIds.reduce(
          (chain, targetAthleteId) =>
            chain.then(() =>
              groupSessionRepository
                .registerAthlete({
                  authUserId,
                  isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
                  requestId: request.requestId,
                  sessionId: groupSessionId,
                  athleteId: targetAthleteId,
                  bookedByUserId: authUserId,
                  note: 'Accepted via /v1/invites/:inviteId/respond',
                })
                .then((registrationResult) => {
                  registrationResults.push(registrationResult);
                }),
            ),
          Promise.resolve(),
        );
        const firstRegistration = registrationResults[0];
        if (firstRegistration) {
          registrationId = firstRegistration.registration.id;
          registrationStatus = firstRegistration.registration.status;
        }
        booking = registrationResults.find((result) => result.booking)?.booking ?? null;
        invite.bookingId = booking?.id ?? null;
      } else {
        const athleteIds = visibleTargets.flatMap((target) => {
          const mapped = asString(target.targetAthleteId);
          return Boolean(mapped) ? [mapped] : [];
        });
        if (athleteIds.length === 0) {
          throw badRequest('Invite is missing athlete targets');
        }
        const selectedSlot = body.selectedSlot ?? buildInviteProposedSlotsFromMetadata(metadata)[0];
        if (!selectedSlot) {
          throw badRequest('A selected slot is required to accept an invite');
        }
        const proposedSlots = buildInviteProposedSlotsFromMetadata(metadata);
        if (
          proposedSlots.length > 0 &&
          !proposedSlots.some((candidate) => areMatchingInviteSlots(candidate, selectedSlot))
        ) {
          throw badRequest('Selected slot must match one of the invite proposed slots');
        }
        const durationMinutes =
          calculateSlotDurationMinutes(selectedSlot) ?? asNumber(metadata?.durationMinutes) ?? 60;
        const coachUserId = asString(invite.senderUserId) ?? '';
        const availability = await resolveCoachAvailabilityTables(coachUserId);
        mergeInviteRuntimeTables(store.tables, availability.tables);
        assertCoachAvailabilitySlotOpen({
          tables: store.tables,
          coachUserId,
          scheduledAt: slotToScheduledAt(selectedSlot),
          durationMinutes,
          applySchedulingRules: true,
        });
        booking = await resolveBookingRepository().createBooking({
          authUserId,
          requestId: request.requestId,
          body: createBookingRequestSchema.parse({
            coachUserId: asString(invite.senderUserId),
            athleteIds,
            bookedByUserId: authUserId,
            scheduledAt: slotToScheduledAt(selectedSlot),
            durationMinutes,
            location: asString(selectedSlot.location) ?? 'Coach preferred location',
            serviceType: asString(metadata?.sessionType) ?? 'Session',
            objectives: [asString(metadata?.focus) ?? asString(invite.message) ?? 'Session'],
            notes: asString(metadata?.notes) ?? null,
            priceMinor: asNumber(metadata?.priceMinor) ?? 0,
            currency: asString(metadata?.currency) ?? 'GBP',
            idempotencyKey: `invite-accept-${inviteId}-${authUserId}`,
          }),
          bookingRowOverrides: {
            clubId: asString(invite.clubId) ?? null,
          },
        });
        invite.bookingId = booking.id;
      }
    }
    visibleTargets.forEach((target) => {
      const responsePayload = asObject(target.responsePayloadJson) ?? {};
      target.status = body.response;
      target.respondedAt = now;
      target.responsePayloadJson = {
        ...responsePayload,
        response: body.response.toLowerCase(),
        source: 'api-runtime',
        dismissed: false,
        ...(responseSelectedSlot
          ? {
              selectedSlot: responseSelectedSlot,
            }
          : {}),
        ...(recurringWeekResponses.length > 0
          ? {
              recurringWeekResponses,
              acceptedWeeks: acceptedWeekResponses.map((week) => week.weekDate),
              declinedWeeks: declinedWeekResponses.map((week) => week.weekDate),
              recurringSeriesId: bookingSeriesId,
              bookingIds,
            }
          : {}),
      };
      target.updatedAt = now;
    });
    invite.status = body.response;
    invite.updatedAt = now;
    await recordInviteAudit({
      request,
      action: 'invite.respond',
      resourceId: inviteId,
      subjectUserId: authUserId,
      result: 'SUCCESS',
      metadata: {
        replay: false,
        response: body.response,
        status: asString(invite.status) ?? body.response,
        targetStatus: asString(visibleTargets[0]?.status) ?? body.response,
        selectedSlot: responseSelectedSlot ?? null,
        bookingId: asString(invite.bookingId) ?? booking?.id ?? null,
        bookingSeriesId,
        bookingIds,
        registrationId,
        registrationStatus,
        targetIds: visibleTargets.flatMap((target) => {
          const targetId = asString(target.id);
          return targetId ? [targetId] : [];
        }),
      },
    });
    await commitInviteRuntimeStore(store);
    return reply.send({
      invite: buildSessionInviteView({
        tables: store.tables,
        invite,
        targets: visibleTargets,
      }),
      inviteId,
      response: body.response,
      status: asString(invite.status) ?? body.response,
      targetStatus: asString(visibleTargets[0]?.status) ?? body.response,
      respondedAt: now,
      selectedSlot: responseSelectedSlot,
      bookingId: asString(invite.bookingId) ?? booking?.id ?? null,
      bookingSeriesId,
      bookingIds,
      registrationId,
      registrationStatus,
      booking,
      requestId: request.requestId,
    });
  });
  app.get('/events/:eventId/rsvps', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const eventId = asString(
      (
        request.params as {
          eventId?: string;
        }
      ).eventId,
    );
    if (!eventId) {
      throw notFound('Event id is required');
    }
    const { clubId } = await assertCanReadEventRsvps({
      request,
      eventId,
      authUserId,
    });
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const rsvps = await prisma.eventRsvp.findMany({
        where: {
          clubEventId: eventId,
        },
        orderBy: {
          respondedAt: 'desc',
        },
      });
      await recordEventRsvpReadAudit({
        request,
        eventId,
        authUserId,
        result: 'SUCCESS',
        metadata: { clubId, count: rsvps.length },
      });
      return reply.send({
        eventId,
        rsvps: normalizeForJson(rsvps).map((row) => buildEventRsvpResponse(row as SeedRow)),
        total: rsvps.length,
        requestId: request.requestId,
      });
    }
    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    const rsvps = asRows(store.tables.eventRsvps)
      .filter((row) => asString(row.clubEventId) === eventId || asString(row.eventId) === eventId)
      .map(buildEventRsvpResponse);
    await recordEventRsvpReadAudit({
      request,
      eventId,
      authUserId,
      result: 'SUCCESS',
      metadata: { clubId, count: rsvps.length },
    });
    return reply.send({
      eventId,
      rsvps,
      total: rsvps.length,
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.post('/events/:eventId/rsvps/remind', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const eventId = asString(
      (
        request.params as {
          eventId?: string;
        }
      ).eventId,
    );
    if (!eventId) {
      throw notFound('Event id is required');
    }
    const { clubId, eventTitle } = await assertCanRemindEventRsvps({
      request,
      eventId,
      authUserId,
    });
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const maybeRsvps = await prisma.eventRsvp.findMany({
        where: {
          clubEventId: eventId,
          status: 'MAYBE',
        },
        select: {
          userId: true,
        },
      });
      const now = new Date();
      if (maybeRsvps.length > 0) {
        await prisma.notification.createMany({
          data: maybeRsvps.map((rsvp) => ({
            id: newId('nfn'),
            userId: rsvp.userId,
            type: 'EVENT_RSVP_REMINDER',
            title: 'Reminder: Event RSVP',
            body: `Please confirm attendance for "${eventTitle}".`,
            status: 'UNREAD',
            sourceType: 'club_event',
            sourceId: eventId,
            deepLink: `/events/${eventId}/rsvp`,
            metadataJson: {
              clubId,
              eventId,
            },
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
      await recordEventRsvpReminderAudit({
        request,
        eventId,
        authUserId,
        result: 'SUCCESS',
        metadata: { clubId, reminderCount: maybeRsvps.length },
      });
      return reply.send({
        eventId,
        reminderCount: maybeRsvps.length,
        requestId: request.requestId,
      });
    }

    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    if (!Array.isArray(store.tables.notifications)) {
      store.tables.notifications = [];
    }
    const now = isoNow();
    const maybeRsvps = asRows(store.tables.eventRsvps).filter(
      (row) =>
        (asString(row.clubEventId) === eventId || asString(row.eventId) === eventId) &&
        toApiEventRsvpStatus(row.status) === 'MAYBE' &&
        Boolean(asString(row.userId)),
    );
    for (const rsvp of maybeRsvps) {
      const userId = asString(rsvp.userId);
      if (!userId) {
        continue;
      }
      store.tables.notifications.push(
        buildEventRsvpReminderNotification({
          eventId,
          clubId,
          eventTitle,
          userId,
          now,
        }),
      );
    }
    await recordEventRsvpReminderAudit({
      request,
      eventId,
      authUserId,
      result: 'SUCCESS',
      metadata: { clubId, reminderCount: maybeRsvps.length },
    });
    return reply.send({
      eventId,
      reminderCount: maybeRsvps.length,
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.get('/clubs/:clubId/events', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const clubId = asString(
      (
        request.params as {
          clubId?: string;
        }
      ).clubId,
    );
    if (!clubId) {
      throw notFound('Club id is required');
    }
    try {
      const { events, seedVersion } = await listReadableClubEvents({
        request,
        clubId,
        authUserId,
      });
      await recordClubEventListAudit({
        request,
        clubId,
        authUserId,
        result: 'SUCCESS',
        metadata: { total: events.length },
      });
      return reply.send({
        clubId,
        events: events.map(buildClubEventResponse),
        total: events.length,
        requestId: request.requestId,
        seedVersion,
      });
    } catch (error) {
      await recordClubEventListAudit({
        request,
        clubId,
        authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/clubs/:clubId/events', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const clubId = asString(
      (
        request.params as {
          clubId?: string;
        }
      ).clubId,
    );
    if (!clubId) {
      throw notFound('Club id is required');
    }
    const body = createClubEventRequestSchema.parse(request.body ?? {});
    await assertCanWriteClubEvent({
      request,
      action: 'club_event.create',
      clubId,
      authUserId,
    });
    const bodyForWrite: CreateClubEventRequestBody =
      body.athleteIds !== undefined
        ? {
            ...body,
            athleteIds: dedupeStrings(body.athleteIds),
          }
        : body;
    if ((bodyForWrite.athleteIds ?? []).length > 0) {
      await assertClubEventAthleteTargetsValid({
        request,
        action: 'club_event.create',
        clubId,
        authUserId,
        athleteIds: bodyForWrite.athleteIds ?? [],
      });
    }
    const startsAt = eventWriteDateTime(bodyForWrite.date, bodyForWrite.startTime);
    if (!startsAt) {
      throw badRequest('Event start date and time must be valid');
    }
    const endsAt = bodyForWrite.endTime
      ? eventWriteDateTime(bodyForWrite.date, bodyForWrite.endTime)
      : null;
    if (bodyForWrite.endTime && !endsAt) {
      throw badRequest('Event end time must be valid');
    }
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const event = await prisma.clubEvent.create({
        data: {
          id: newId('evt'),
          clubId,
          creatorUserId: authUserId,
          title: bodyForWrite.title,
          description: bodyForWrite.description ?? null,
          startsAt,
          endsAt,
          location: bodyForWrite.venue,
          status: 'DRAFT',
          visibility: eventVisibilityForBody(bodyForWrite),
          rsvpDeadlineAt: bodyForWrite.rsvpDeadline
            ? toOptionalDate(bodyForWrite.rsvpDeadline)
            : null,
          guestLimit: bodyForWrite.maxAttendees ?? null,
          metadataJson: toEventMetadata(bodyForWrite) as never,
          createdByUserId: authUserId,
          updatedByUserId: authUserId,
        },
      });
      await recordClubEventWriteAudit({
        request,
        action: 'club_event.create',
        eventId: event.id,
        clubId,
        authUserId,
        result: 'SUCCESS',
        metadata: { status: event.status },
      });
      return reply.status(201).send({
        event: buildClubEventResponse(normalizeForJson(event) as SeedRow),
        requestId: request.requestId,
      });
    }

    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    if (!Array.isArray(store.tables.clubEvents)) {
      store.tables.clubEvents = [];
    }
    const event = buildSeedClubEventRow({
      clubId,
      authUserId,
      body: bodyForWrite,
      now: isoNow(),
    });
    store.tables.clubEvents.push(event);
    await recordClubEventWriteAudit({
      request,
      action: 'club_event.create',
      eventId: asString(event.id),
      clubId,
      authUserId,
      result: 'SUCCESS',
      metadata: { status: asString(event.status) },
    });
    return reply.status(201).send({
      event: buildClubEventResponse(event),
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.get('/events/:eventId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const eventId = asString(
      (
        request.params as {
          eventId?: string;
        }
      ).eventId,
    );
    if (!eventId) {
      throw notFound('Event id is required');
    }
    const { clubId, event, seedVersion } = await resolveReadableClubEvent({
      request,
      eventId,
      authUserId,
    });
    await recordClubEventReadAudit({
      request,
      eventId,
      authUserId,
      result: 'SUCCESS',
      metadata: { clubId, status: asString(event.status) ?? null },
    });
    return reply.send({
      event: buildClubEventResponse(event),
      requestId: request.requestId,
      seedVersion,
    });
  });

  app.patch('/events/:eventId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const eventId = asString(
      (
        request.params as {
          eventId?: string;
        }
      ).eventId,
    );
    if (!eventId) {
      throw notFound('Event id is required');
    }
    const body = updateClubEventRequestSchema.parse(request.body ?? {});
    const bodyForWrite: ClubEventWriteBody =
      body.athleteIds !== undefined
        ? {
            ...body,
            athleteIds: dedupeStrings(body.athleteIds),
          }
        : body;
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const existing = await prisma.clubEvent.findFirst({
        where: {
          id: eventId,
          deletedAt: null,
        },
      });
      if (!existing) {
        throw notFound('Club event not found', { eventId });
      }
      await assertCanWriteClubEvent({
        request,
        action: 'club_event.update',
        clubId: existing.clubId,
        authUserId,
        eventId,
      });
      if (bodyForWrite.athleteIds !== undefined && bodyForWrite.athleteIds.length > 0) {
        await assertClubEventAthleteTargetsValid({
          request,
          action: 'club_event.update',
          eventId,
          clubId: existing.clubId,
          authUserId,
          athleteIds: bodyForWrite.athleteIds,
        });
      }
      const existingDate = existing.startsAt.toISOString().slice(0, 10);
      const existingStartTime = existing.startsAt.toISOString().slice(11, 16);
      const existingEndTime = existing.endsAt?.toISOString().slice(11, 16);
      const startsAt =
        bodyForWrite.date !== undefined || bodyForWrite.startTime !== undefined
          ? eventWriteDateTime(
              bodyForWrite.date ?? existingDate,
              bodyForWrite.startTime ?? existingStartTime,
            )
          : undefined;
      const endsAt =
        bodyForWrite.date !== undefined || bodyForWrite.endTime !== undefined
          ? bodyForWrite.endTime === undefined && !existingEndTime
            ? null
            : eventWriteDateTime(
                bodyForWrite.date ?? existingDate,
                bodyForWrite.endTime ?? existingEndTime,
              )
          : undefined;
      if (startsAt === null || endsAt === null) {
        throw badRequest('Event date and time must be valid');
      }
      const normalizedExisting = normalizeForJson(existing) as SeedRow;
      const event = await prisma.clubEvent.update({
        where: {
          id: eventId,
        },
        data: {
          ...(bodyForWrite.title !== undefined ? { title: bodyForWrite.title } : {}),
          ...(bodyForWrite.description !== undefined
            ? { description: bodyForWrite.description }
            : {}),
          ...(startsAt !== undefined ? { startsAt } : {}),
          ...(endsAt !== undefined ? { endsAt } : {}),
          ...(bodyForWrite.venue !== undefined ? { location: bodyForWrite.venue } : {}),
          ...(bodyForWrite.status !== undefined ? { status: bodyForWrite.status } : {}),
          ...(bodyForWrite.targetAudience !== undefined ||
          bodyForWrite.squadIds !== undefined ||
          bodyForWrite.athleteIds !== undefined
            ? { visibility: eventVisibilityForBody(bodyForWrite, normalizedExisting) }
            : {}),
          ...(bodyForWrite.rsvpDeadline !== undefined
            ? { rsvpDeadlineAt: toOptionalDate(bodyForWrite.rsvpDeadline) }
            : {}),
          ...(bodyForWrite.maxAttendees !== undefined
            ? { guestLimit: bodyForWrite.maxAttendees }
            : {}),
          metadataJson: toEventMetadata(bodyForWrite, normalizedExisting) as never,
          updatedByUserId: authUserId,
        },
      });
      await recordClubEventWriteAudit({
        request,
        action: 'club_event.update',
        eventId,
        clubId: existing.clubId,
        authUserId,
        result: 'SUCCESS',
        metadata: { status: event.status },
      });
      return reply.send({
        event: buildClubEventResponse(normalizeForJson(event) as SeedRow),
        requestId: request.requestId,
      });
    }

    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    const event = asRows(store.tables.clubEvents).find(
      (row) => asString(row.id) === eventId && !asString(row.deletedAt),
    );
    if (!event) {
      throw notFound('Club event not found', { eventId });
    }
    const clubId = asString(event.clubId) ?? '';
    await assertCanWriteClubEvent({
      request,
      action: 'club_event.update',
      clubId,
      authUserId,
      eventId,
    });
    if (bodyForWrite.athleteIds !== undefined && bodyForWrite.athleteIds.length > 0) {
      await assertClubEventAthleteTargetsValid({
        request,
        action: 'club_event.update',
        eventId,
        clubId,
        authUserId,
        athleteIds: bodyForWrite.athleteIds,
      });
    }
    const current = buildClubEventResponse(event);
    const startsAt =
      bodyForWrite.date !== undefined || bodyForWrite.startTime !== undefined
        ? eventWriteIso(
            bodyForWrite.date ?? asString(current.date),
            bodyForWrite.startTime ?? asString(current.startTime),
          )
        : undefined;
    const endsAt =
      bodyForWrite.date !== undefined || bodyForWrite.endTime !== undefined
        ? bodyForWrite.endTime === undefined && !asString(current.endTime)
          ? null
          : eventWriteIso(
              bodyForWrite.date ?? asString(current.date),
              bodyForWrite.endTime ?? asString(current.endTime),
            )
        : undefined;
    if (startsAt === null || endsAt === null) {
      throw badRequest('Event date and time must be valid');
    }
    if (bodyForWrite.title !== undefined) event.title = bodyForWrite.title;
    if (bodyForWrite.description !== undefined) event.description = bodyForWrite.description;
    if (startsAt !== undefined) event.startsAt = startsAt;
    if (endsAt !== undefined) event.endsAt = endsAt;
    if (bodyForWrite.venue !== undefined) event.location = bodyForWrite.venue;
    if (bodyForWrite.status !== undefined) event.status = bodyForWrite.status;
    if (
      bodyForWrite.targetAudience !== undefined ||
      bodyForWrite.squadIds !== undefined ||
      bodyForWrite.athleteIds !== undefined
    ) {
      event.visibility = eventVisibilityForBody(bodyForWrite, event);
    }
    if (bodyForWrite.rsvpDeadline !== undefined) event.rsvpDeadlineAt = bodyForWrite.rsvpDeadline;
    if (bodyForWrite.maxAttendees !== undefined) event.guestLimit = bodyForWrite.maxAttendees;
    if (bodyForWrite.price !== undefined) event.priceMinor = Math.round(bodyForWrite.price * 100);
    if (bodyForWrite.currency !== undefined) event.currency = bodyForWrite.currency.toUpperCase();
    if (bodyForWrite.squadIds !== undefined) event.squadIdsJson = bodyForWrite.squadIds;
    event.metadataJson = toEventMetadata(bodyForWrite, event);
    event.updatedByUserId = authUserId;
    event.updatedAt = isoNow();
    await recordClubEventWriteAudit({
      request,
      action: 'club_event.update',
      eventId,
      clubId,
      authUserId,
      result: 'SUCCESS',
      metadata: { status: asString(event.status) },
    });
    return reply.send({
      event: buildClubEventResponse(event),
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.post('/events/:eventId/invites/club', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const eventId = asString(
      (
        request.params as {
          eventId?: string;
        }
      ).eventId,
    );
    if (!eventId) {
      throw notFound('Event id is required');
    }
    const { clubId, event } = await resolveReadableClubEvent({
      request,
      eventId,
      authUserId,
    });
    await assertCanWriteClubEvent({
      request,
      action: 'club_event.invite_club',
      clubId,
      authUserId,
      eventId,
    });
    const eventTitle = asString(event.title) ?? 'Club event';
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const memberships = await prisma.clubMembership.findMany({
        where: {
          clubId,
          active: true,
          deletedAt: null,
          userId: {
            not: authUserId,
          },
        },
        select: {
          userId: true,
        },
      });
      const now = new Date();
      await prisma.notification.createMany({
        data: memberships.map((membership) => ({
          id: newId('nfn'),
          userId: membership.userId,
          type: 'CLUB_EVENT_INVITE',
          title: 'New club event',
          body: `You have been invited to "${eventTitle}".`,
          status: 'UNREAD',
          sourceType: 'club_event',
          sourceId: eventId,
          deepLink: `/events/${eventId}`,
          metadataJson: { clubId, eventId } as never,
          createdAt: now,
          updatedAt: now,
        })),
      });
      await recordClubEventWriteAudit({
        request,
        action: 'club_event.invite_club',
        eventId,
        clubId,
        authUserId,
        result: 'SUCCESS',
        metadata: { inviteCount: memberships.length },
      });
      return reply.send({
        eventId,
        inviteCount: memberships.length,
        requestId: request.requestId,
      });
    }

    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    if (!Array.isArray(store.tables.notifications)) {
      store.tables.notifications = [];
    }
    const now = isoNow();
    const recipients = asRows(store.tables.clubMemberships).flatMap((membership) => {
      const userId = asString(membership.userId);
      if (
        asString(membership.clubId) !== clubId ||
        !userId ||
        userId === authUserId ||
        membership.active === false ||
        asString(membership.deletedAt)
      ) {
        return [];
      }
      return [userId];
    });
    for (const userId of recipients) {
      store.tables.notifications.push(
        buildClubEventInviteNotification({
          eventId,
          clubId,
          eventTitle,
          userId,
          now,
        }),
      );
    }
    await recordClubEventWriteAudit({
      request,
      action: 'club_event.invite_club',
      eventId,
      clubId,
      authUserId,
      result: 'SUCCESS',
      metadata: { inviteCount: recipients.length },
    });
    return reply.send({
      eventId,
      inviteCount: recipients.length,
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.post('/events/:eventId/invites/squads', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const eventId = asString(
      (
        request.params as {
          eventId?: string;
        }
      ).eventId,
    );
    if (!eventId) {
      throw notFound('Event id is required');
    }
    const body = eventSquadInviteRequestSchema.parse(request.body ?? {});
    const squadIds = dedupeStrings(body.squadIds);
    const excludeAthleteIds = dedupeStrings([
      ...(body.excludeAthleteIds ?? []),
      ...(body.excludeMemberIds ?? []),
    ]);
    const { clubId, event } = await resolveReadableClubEvent({
      request,
      eventId,
      authUserId,
    });
    await assertCanWriteClubEvent({
      request,
      action: 'club_event.invite_squads',
      clubId,
      authUserId,
      eventId,
    });

    const eventTitle = asString(event.title) ?? 'Club event';
    const targets =
      getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()
        ? await resolveDbEventSquadInviteTargets({
            clubId,
            squadIds,
            excludeAthleteIds,
          })
        : resolveStoreEventSquadInviteTargets({
            tables:
              getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
                ? getDbFixtureStore().tables
                : getMarketplaceSeedStore().tables,
            clubId,
            squadIds,
            excludeAthleteIds,
          });

    if (targets.missingSquadIds.length > 0) {
      await recordClubEventWriteAudit({
        request,
        action: 'club_event.invite_squads',
        eventId,
        clubId,
        authUserId,
        result: 'DENY',
        metadata: {
          reason: 'invalid_squad',
          squadIds,
          missingSquadIds: targets.missingSquadIds,
        },
      });
      throw badRequest('Squad event invites require squads from the event club');
    }

    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const now = new Date();
      if (targets.recipientUserIds.length > 0) {
        await prisma.notification.createMany({
          data: targets.recipientUserIds.map((userId) => ({
            id: newId('nfn'),
            userId,
            type: 'CLUB_EVENT_INVITE',
            title: 'New club event',
            body: `You have been invited to "${eventTitle}".`,
            status: 'UNREAD',
            sourceType: 'club_event',
            sourceId: eventId,
            deepLink: `/events/${eventId}`,
            metadataJson: { clubId, eventId, squadIds: targets.squadIds } as never,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
      await recordClubEventWriteAudit({
        request,
        action: 'club_event.invite_squads',
        eventId,
        clubId,
        authUserId,
        result: 'SUCCESS',
        metadata: {
          squadIds: targets.squadIds,
          inviteCount: targets.recipientUserIds.length,
          targetAthleteCount: targets.targetAthleteCount,
          excludedAthleteCount: excludeAthleteIds.length,
        },
      });
      return reply.send({
        eventId,
        squadIds: targets.squadIds,
        inviteCount: targets.recipientUserIds.length,
        targetAthleteCount: targets.targetAthleteCount,
        requestId: request.requestId,
      });
    }

    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    if (!Array.isArray(store.tables.notifications)) {
      store.tables.notifications = [];
    }
    const now = isoNow();
    for (const userId of targets.recipientUserIds) {
      store.tables.notifications.push(
        buildClubEventInviteNotification({
          eventId,
          clubId,
          eventTitle,
          userId,
          now,
          squadIds: targets.squadIds,
        }),
      );
    }
    await recordClubEventWriteAudit({
      request,
      action: 'club_event.invite_squads',
      eventId,
      clubId,
      authUserId,
      result: 'SUCCESS',
      metadata: {
        squadIds: targets.squadIds,
        inviteCount: targets.recipientUserIds.length,
        targetAthleteCount: targets.targetAthleteCount,
        excludedAthleteCount: excludeAthleteIds.length,
      },
    });
    return reply.send({
      eventId,
      squadIds: targets.squadIds,
      inviteCount: targets.recipientUserIds.length,
      targetAthleteCount: targets.targetAthleteCount,
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.post('/events/:eventId/invites/athletes', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const eventId = asString(
      (
        request.params as {
          eventId?: string;
        }
      ).eventId,
    );
    if (!eventId) {
      throw notFound('Event id is required');
    }
    const body = eventAthleteInviteRequestSchema.parse(request.body ?? {});
    const athleteIds = dedupeStrings(body.athleteIds);
    const { clubId, event } = await resolveReadableClubEvent({
      request,
      eventId,
      authUserId,
    });
    await assertCanWriteClubEvent({
      request,
      action: 'club_event.invite_athletes',
      clubId,
      authUserId,
      eventId,
    });

    const targets = await assertClubEventAthleteTargetsValid({
      request,
      action: 'club_event.invite_athletes',
      eventId,
      clubId,
      authUserId,
      athleteIds,
    });
    const recipientUserIds = targets.recipientUserIds.filter((userId) => userId !== authUserId);
    const eventTitle = asString(event.title) ?? 'Club event';

    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const now = new Date();
      await prisma.clubEvent.update({
        where: {
          id: eventId,
        },
        data: {
          visibility: 'athlete',
          metadataJson: {
            ...(asObject(event.metadataJson) ?? {}),
            targetAudience: 'ATHLETES',
            athleteIds: targets.athleteIds,
          } as never,
          updatedByUserId: authUserId,
        },
      });
      if (recipientUserIds.length > 0) {
        await prisma.notification.createMany({
          data: recipientUserIds.map((userId) => ({
            id: newId('nfn'),
            userId,
            type: 'CLUB_EVENT_INVITE',
            title: 'New club event',
            body: `You have been invited to "${eventTitle}".`,
            status: 'UNREAD',
            sourceType: 'club_event',
            sourceId: eventId,
            deepLink: `/events/${eventId}`,
            metadataJson: { clubId, eventId, athleteIds: targets.athleteIds } as never,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
      await recordClubEventWriteAudit({
        request,
        action: 'club_event.invite_athletes',
        eventId,
        clubId,
        authUserId,
        result: 'SUCCESS',
        metadata: {
          athleteIds: targets.athleteIds,
          inviteCount: recipientUserIds.length,
          targetAthleteCount: targets.targetAthleteCount,
        },
      });
      return reply.send({
        eventId,
        athleteIds: targets.athleteIds,
        inviteCount: recipientUserIds.length,
        targetAthleteCount: targets.targetAthleteCount,
        requestId: request.requestId,
      });
    }

    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    if (!Array.isArray(store.tables.notifications)) {
      store.tables.notifications = [];
    }
    event.visibility = 'athlete';
    event.metadataJson = {
      ...(asObject(event.metadataJson) ?? {}),
      targetAudience: 'ATHLETES',
      athleteIds: targets.athleteIds,
    };
    event.updatedByUserId = authUserId;
    event.updatedAt = isoNow();
    const now = isoNow();
    for (const userId of recipientUserIds) {
      store.tables.notifications.push(
        buildClubEventInviteNotification({
          eventId,
          clubId,
          eventTitle,
          userId,
          now,
          athleteIds: targets.athleteIds,
        }),
      );
    }
    await recordClubEventWriteAudit({
      request,
      action: 'club_event.invite_athletes',
      eventId,
      clubId,
      authUserId,
      result: 'SUCCESS',
      metadata: {
        athleteIds: targets.athleteIds,
        inviteCount: recipientUserIds.length,
        targetAthleteCount: targets.targetAthleteCount,
      },
    });
    return reply.send({
      eventId,
      athleteIds: targets.athleteIds,
      inviteCount: recipientUserIds.length,
      targetAthleteCount: targets.targetAthleteCount,
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.get('/events/:eventId/attendance', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const eventId = asString(
      (
        request.params as {
          eventId?: string;
        }
      ).eventId,
    );
    if (!eventId) {
      throw notFound('Event id is required');
    }
    const { clubId } = await assertCanReadEventAttendance({
      request,
      eventId,
      authUserId,
    });
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const attendance = await prisma.eventAttendance.findMany({
        where: {
          clubEventId: eventId,
          deletedAt: null,
        },
        orderBy: {
          checkedInAt: 'desc',
        },
      });
      await recordEventAttendanceReadAudit({
        request,
        eventId,
        authUserId,
        result: 'SUCCESS',
        metadata: { clubId, count: attendance.length },
      });
      return reply.send({
        eventId,
        attendance: normalizeForJson(attendance).map((row) =>
          buildEventAttendanceResponse(row as SeedRow),
        ),
        total: attendance.length,
        requestId: request.requestId,
      });
    }

    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    const attendance = asRows(store.tables.eventAttendances)
      .filter(
        (row) =>
          isActiveEventAttendanceRow(row) &&
          (asString(row.clubEventId) === eventId || asString(row.eventId) === eventId),
      )
      .map(buildEventAttendanceResponse);
    await recordEventAttendanceReadAudit({
      request,
      eventId,
      authUserId,
      result: 'SUCCESS',
      metadata: { clubId, count: attendance.length },
    });
    return reply.send({
      eventId,
      attendance,
      total: attendance.length,
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.get('/events/:eventId/attendance/stats', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const eventId = asString(
      (
        request.params as {
          eventId?: string;
        }
      ).eventId,
    );
    if (!eventId) {
      throw notFound('Event id is required');
    }
    const { clubId } = await assertCanReadEventAttendance({
      request,
      eventId,
      authUserId,
    });
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const [event, rsvps, attendance] = await Promise.all([
        prisma.clubEvent.findFirst({
          where: {
            id: eventId,
            deletedAt: null,
          },
          select: {
            guestLimit: true,
          },
        }),
        prisma.eventRsvp.findMany({
          where: {
            clubEventId: eventId,
          },
        }),
        prisma.eventAttendance.findMany({
          where: {
            clubEventId: eventId,
            deletedAt: null,
          },
        }),
      ]);
      const stats = buildEventAttendanceStatsResponse({
        eventId,
        capacity: event?.guestLimit ?? null,
        rsvps: normalizeForJson(rsvps) as SeedRow[],
        attendance: normalizeForJson(attendance) as SeedRow[],
      });
      await recordEventAttendanceReadAudit({
        request,
        eventId,
        authUserId,
        result: 'SUCCESS',
        metadata: { clubId, stats: true, checkedInCount: stats.checkedInCount },
      });
      return reply.send({
        ...stats,
        requestId: request.requestId,
      });
    }

    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    const event = asRows(store.tables.clubEvents).find(
      (row) => asString(row.id) === eventId && !asString(row.deletedAt),
    );
    const rsvps = asRows(store.tables.eventRsvps).filter(
      (row) => asString(row.clubEventId) === eventId || asString(row.eventId) === eventId,
    );
    const attendance = asRows(store.tables.eventAttendances).filter(
      (row) =>
        isActiveEventAttendanceRow(row) &&
        (asString(row.clubEventId) === eventId || asString(row.eventId) === eventId),
    );
    const stats = buildEventAttendanceStatsResponse({
      eventId,
      capacity: asNumber(event?.guestLimit) ?? asNumber(event?.maxAttendees) ?? null,
      rsvps,
      attendance,
    });
    await recordEventAttendanceReadAudit({
      request,
      eventId,
      authUserId,
      result: 'SUCCESS',
      metadata: { clubId, stats: true, checkedInCount: stats.checkedInCount },
    });
    return reply.send({
      ...stats,
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.get('/events/:eventId/attendance/:userId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = request.params as {
      eventId?: string;
      userId?: string;
    };
    const eventId = asString(params.eventId);
    const userId = asString(params.userId);
    if (!eventId || !userId) {
      throw notFound('Event attendance is required');
    }
    const { clubId } = await assertCanReadEventAttendance({
      request,
      eventId,
      authUserId,
      targetUserId: userId,
    });
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const attendance = await prisma.eventAttendance.findFirst({
        where: {
          clubEventId: eventId,
          userId,
          deletedAt: null,
        },
      });
      await recordEventAttendanceReadAudit({
        request,
        eventId,
        authUserId,
        targetUserId: userId,
        result: 'SUCCESS',
        metadata: { clubId, found: Boolean(attendance) },
      });
      return reply.send({
        eventId,
        userId,
        attendance: attendance
          ? buildEventAttendanceResponse(normalizeForJson(attendance) as SeedRow)
          : null,
        requestId: request.requestId,
      });
    }

    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    const attendance =
      asRows(store.tables.eventAttendances).find(
        (row) =>
          isActiveEventAttendanceRow(row) &&
          (asString(row.clubEventId) === eventId || asString(row.eventId) === eventId) &&
          asString(row.userId) === userId,
      ) ?? null;
    await recordEventAttendanceReadAudit({
      request,
      eventId,
      authUserId,
      targetUserId: userId,
      result: 'SUCCESS',
      metadata: { clubId, found: Boolean(attendance) },
    });
    return reply.send({
      eventId,
      userId,
      attendance: attendance ? buildEventAttendanceResponse(attendance) : null,
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.post('/events/:eventId/checkins', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const eventId = asString(
      (
        request.params as {
          eventId?: string;
        }
      ).eventId,
    );
    if (!eventId) {
      throw notFound('Event id is required');
    }
    const body = eventCheckinRequestSchema.parse(request.body ?? {});
    const targetUserId = body.userId ?? authUserId;
    const { clubId } = await assertCanWriteEventCheckin({
      request,
      action: 'event.attendance.checkin',
      eventId,
      authUserId,
      targetUserId,
    });
    const checkInMethod = body.checkInMethod ?? (targetUserId === authUserId ? 'SELF' : 'COACH');
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const now = new Date();
      const attendance = await prisma.eventAttendance.upsert({
        where: {
          clubEventId_userId: {
            clubEventId: eventId,
            userId: targetUserId,
          },
        },
        create: {
          id: newId('eat'),
          clubEventId: eventId,
          userId: targetUserId,
          userRole: body.userRole,
          checkedInAt: now,
          checkedInByUserId: authUserId,
          checkInMethod,
          guestsCheckedIn: body.guestsCheckedIn ?? 0,
          notes: body.notes ?? null,
          locationJson: body.location ?? undefined,
          locationValidated: body.locationValidated ?? null,
          distanceFromVenue: body.distanceFromVenue ?? null,
        },
        update: {
          userRole: body.userRole,
          checkedInAt: now,
          checkedInByUserId: authUserId,
          checkInMethod,
          guestsCheckedIn: body.guestsCheckedIn ?? 0,
          notes: body.notes ?? null,
          locationJson: body.location ?? undefined,
          locationValidated: body.locationValidated ?? null,
          distanceFromVenue: body.distanceFromVenue ?? null,
          deletedAt: null,
          deletedByUserId: null,
        },
      });
      await recordEventAttendanceWriteAudit({
        request,
        action: 'event.attendance.checkin',
        eventId,
        authUserId,
        targetUserId,
        result: 'SUCCESS',
        metadata: { clubId, checkInMethod, guestsCheckedIn: body.guestsCheckedIn ?? 0 },
      });
      return reply.send({
        attendance: buildEventAttendanceResponse(normalizeForJson(attendance) as SeedRow),
        requestId: request.requestId,
      });
    }

    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    if (!Array.isArray(store.tables.eventAttendances)) {
      store.tables.eventAttendances = [];
    }
    const now = isoNow();
    let attendance = store.tables.eventAttendances.find(
      (row) => asString(row.clubEventId) === eventId && asString(row.userId) === targetUserId,
    );
    if (!attendance) {
      attendance = {
        id: newId('eat'),
        clubEventId: eventId,
        userId: targetUserId,
        createdAt: now,
      };
      store.tables.eventAttendances.push(attendance);
    }
    attendance.userRole = body.userRole;
    attendance.checkedInAt = now;
    attendance.checkedInByUserId = authUserId;
    attendance.checkInMethod = checkInMethod;
    attendance.guestsCheckedIn = body.guestsCheckedIn ?? 0;
    attendance.notes = body.notes ?? null;
    attendance.locationJson = body.location ?? null;
    attendance.locationValidated = body.locationValidated ?? null;
    attendance.distanceFromVenue = body.distanceFromVenue ?? null;
    attendance.deletedAt = null;
    attendance.deletedByUserId = null;
    attendance.updatedAt = now;
    await recordEventAttendanceWriteAudit({
      request,
      action: 'event.attendance.checkin',
      eventId,
      authUserId,
      targetUserId,
      result: 'SUCCESS',
      metadata: { clubId, checkInMethod, guestsCheckedIn: body.guestsCheckedIn ?? 0 },
    });
    return reply.send({
      attendance: buildEventAttendanceResponse(attendance),
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.delete('/events/:eventId/checkins/:userId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = request.params as {
      eventId?: string;
      userId?: string;
    };
    const eventId = asString(params.eventId);
    const targetUserId = asString(params.userId);
    if (!eventId || !targetUserId) {
      throw notFound('Event check-in is required');
    }
    const { clubId } = await assertCanWriteEventCheckin({
      request,
      action: 'event.attendance.remove',
      eventId,
      authUserId,
      targetUserId,
    });
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const existing = await prisma.eventAttendance.findUnique({
        where: {
          clubEventId_userId: {
            clubEventId: eventId,
            userId: targetUserId,
          },
        },
      });
      const found = Boolean(existing && existing.deletedAt == null);
      if (found) {
        await prisma.eventAttendance.update({
          where: {
            clubEventId_userId: {
              clubEventId: eventId,
              userId: targetUserId,
            },
          },
          data: {
            deletedAt: new Date(),
            deletedByUserId: authUserId,
          },
        });
      }
      await recordEventAttendanceWriteAudit({
        request,
        action: 'event.attendance.remove',
        eventId,
        authUserId,
        targetUserId,
        result: 'SUCCESS',
        metadata: { clubId, found, effect: 'soft_remove' },
      });
      return reply.status(204).send();
    }

    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    const attendance = asRows(store.tables.eventAttendances);
    const existingIndex = attendance.findIndex(
      (row) =>
        isActiveEventAttendanceRow(row) &&
        asString(row.clubEventId) === eventId &&
        asString(row.userId) === targetUserId,
    );
    if (existingIndex >= 0) {
      attendance[existingIndex].deletedAt = isoNow();
      attendance[existingIndex].deletedByUserId = authUserId;
      attendance[existingIndex].updatedAt = attendance[existingIndex].deletedAt;
    }
    await recordEventAttendanceWriteAudit({
      request,
      action: 'event.attendance.remove',
      eventId,
      authUserId,
      targetUserId,
      result: 'SUCCESS',
      metadata: { clubId, found: existingIndex >= 0, effect: 'soft_remove' },
    });
    return reply.status(204).send();
  });

  app.get('/events/:eventId/rsvps/:userId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = request.params as {
      eventId?: string;
      userId?: string;
    };
    const eventId = asString(params.eventId);
    const userId = asString(params.userId);
    if (!eventId || !userId) {
      throw notFound('Event RSVP is required');
    }
    const { clubId } = await assertCanReadEventRsvps({
      request,
      eventId,
      authUserId,
    });
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const rsvp = await prisma.eventRsvp.findUnique({
        where: {
          clubEventId_userId: {
            clubEventId: eventId,
            userId,
          },
        },
      });
      await recordEventRsvpReadAudit({
        request,
        eventId,
        authUserId,
        result: 'SUCCESS',
        metadata: { clubId, targetUserId: userId, found: Boolean(rsvp) },
      });
      return reply.send({
        eventId,
        userId,
        rsvp: rsvp ? buildEventRsvpResponse(normalizeForJson(rsvp) as SeedRow) : null,
        requestId: request.requestId,
      });
    }
    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    const rsvp =
      asRows(store.tables.eventRsvps).find(
        (row) =>
          (asString(row.clubEventId) === eventId || asString(row.eventId) === eventId) &&
          asString(row.userId) === userId,
      ) ?? null;
    await recordEventRsvpReadAudit({
      request,
      eventId,
      authUserId,
      result: 'SUCCESS',
      metadata: { clubId, targetUserId: userId, found: Boolean(rsvp) },
    });
    return reply.send({
      eventId,
      userId,
      rsvp: rsvp ? buildEventRsvpResponse(rsvp) : null,
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.post('/events/:eventId/rsvp', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const eventId = asString(
      (
        request.params as {
          eventId?: string;
        }
      ).eventId,
    );
    if (!eventId) {
      throw notFound('Event id is required');
    }
    const body = eventRsvpRequestSchema.parse(request.body);
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const event = await prisma.clubEvent.findFirst({
        where: {
          id: eventId,
          deletedAt: null,
        },
        select: {
          id: true,
          clubId: true,
        },
      });
      if (!event) {
        await recordAuditEvent({
          request,
          action: 'event.rsvp',
          resourceType: 'club_event',
          resourceId: eventId,
          subjectUserId: authUserId,
          result: 'DENY',
          metadata: { reason: 'event_not_found' },
        });
        throw notFound('Club event not found', { eventId });
      }

      const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
      const membership = await prisma.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId: event.clubId,
            userId: authUserId,
          },
        },
        select: {
          active: true,
          deletedAt: true,
        },
      });
      if (!isPrivilegedAdmin && (!membership?.active || membership.deletedAt)) {
        await recordAuditEvent({
          request,
          action: 'event.rsvp',
          resourceType: 'club_event',
          resourceId: eventId,
          subjectUserId: authUserId,
          result: 'DENY',
          metadata: { reason: 'not_club_member', clubId: event.clubId },
        });
        throw forbidden('User is not a member of event club');
      }

      const now = new Date();
      const rsvp = await prisma.eventRsvp.upsert({
        where: {
          clubEventId_userId: {
            clubEventId: eventId,
            userId: authUserId,
          },
        },
        create: {
          id: newId('rsv'),
          clubEventId: eventId,
          userId: authUserId,
          status: toDbEventRsvpStatus(body.status),
          guestCount: body.guestCount ?? 0,
          notes: body.notes ?? null,
          respondedAt: now,
        },
        update: {
          status: toDbEventRsvpStatus(body.status),
          guestCount: body.guestCount ?? 0,
          notes: body.notes ?? null,
          respondedAt: now,
        },
      });

      await recordAuditEvent({
        request,
        action: 'event.rsvp',
        resourceType: 'club_event',
        resourceId: eventId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          clubId: event.clubId,
          status: body.status,
          guestCount: body.guestCount ?? 0,
        },
      });

      return reply.send({
        rsvp: buildEventRsvpResponse(normalizeForJson(rsvp) as SeedRow),
        requestId: request.requestId,
      });
    }

    const store =
      getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()
        ? getDbFixtureStore()
        : getMarketplaceSeedStore();
    const events = asRows(store.tables.clubEvents);
    const rsvps = asRows(store.tables.eventRsvps);
    const memberships = asRows(store.tables.clubMemberships);
    const event = events.find((row) => asString(row.id) === eventId);
    if (!event) {
      throw notFound('Club event not found', {
        eventId,
      });
    }
    const eventClubId = asString(event.clubId);
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const hasClubMembership = memberships.some(
      (row) =>
        asString(row.clubId) === eventClubId &&
        asString(row.userId) === authUserId &&
        row.active !== false &&
        !asString(row.deletedAt),
    );
    if (!isPrivilegedAdmin && !hasClubMembership) {
      await recordAuditEvent({
        request,
        action: 'event.rsvp',
        resourceType: 'club_event',
        resourceId: eventId,
        subjectUserId: authUserId,
        result: 'DENY',
        metadata: { reason: 'not_club_member', clubId: eventClubId ?? null },
      });
      throw forbidden('User is not a member of event club');
    }
    const now = isoNow();
    let row = rsvps.find(
      (item) => asString(item.clubEventId) === eventId && asString(item.userId) === authUserId,
    );
    if (!row) {
      row = {
        id: newId('rsv'),
        clubEventId: eventId,
        userId: authUserId,
        status: body.status,
        guestCount: body.guestCount ?? 0,
        notes: body.notes ?? null,
        respondedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      rsvps.push(row);
    } else {
      row.status = body.status;
      row.guestCount = body.guestCount ?? asNumber(row.guestCount) ?? 0;
      row.notes = body.notes ?? row.notes ?? null;
      row.respondedAt = now;
      row.updatedAt = now;
    }
    await recordAuditEvent({
      request,
      action: 'event.rsvp',
      resourceType: 'club_event',
      resourceId: eventId,
      subjectUserId: authUserId,
      result: 'SUCCESS',
      metadata: {
        clubId: eventClubId ?? null,
        status: body.status,
        guestCount: body.guestCount ?? 0,
      },
    });
    return reply.send({
      rsvp: buildEventRsvpResponse(row),
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });
};
export default bookingRoutes;
