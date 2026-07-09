import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';

type SmokeStatus = 'pass' | 'warn' | 'fail';

interface SmokeResult {
  name: string;
  status: SmokeStatus;
  details?: unknown;
  error?: string;
}

interface LoginResult {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface ApiResponse<T> {
  statusCode: number;
  payload: T;
  raw: LightMyRequestResponse;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const defaultEnvPath = path.join(repoRoot, '.env.staging.local');
const results: SmokeResult[] = [];
const smokeBookingNotes = 'Created by apps/api/scripts/staging-smoke.ts';
const smokeDeliveryProofNote = 'Delivered and ready for launch-loop proof';
const smokeGuardianInviteMessage = 'Created by apps/api/scripts/staging-smoke.ts guardian invite';
const smokeTrustReportDescription = 'Created by apps/api/scripts/staging-smoke.ts trust report';
const smokeSafeguardingDetails =
  'Created by apps/api/scripts/staging-smoke.ts safeguarding incident';
const smokeClubNamePrefix = 'Codex smoke club';
const smokeMatchTitlePrefix = 'Codex smoke match';
const smokeDrillTitlePrefix = 'Codex smoke drill';
const defaultDatabaseConnectionLimit = '2';
const releaseOnlyReadinessCodes = new Set([
  'PASSWORD_RESET_EMAIL_DELIVERY_MISSING',
  'PASSWORD_RESET_EMAIL_WEBHOOK_MISSING',
  'PASSWORD_RESET_DEV_OUTBOX_ENABLED',
  'SENTRY_DSN_MISSING',
  'SENTRY_RELEASE_DEFAULT',
]);

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

function configureSmokeDatabaseUrl(): void {
  const rawDatabaseUrl = process.env.DATABASE_URL;
  if (!rawDatabaseUrl) {
    return;
  }

  try {
    const databaseUrl = new URL(rawDatabaseUrl);
    if (!databaseUrl.searchParams.has('connection_limit')) {
      databaseUrl.searchParams.set(
        'connection_limit',
        process.env.STAGING_SMOKE_DATABASE_CONNECTION_LIMIT ?? defaultDatabaseConnectionLimit,
      );
    }
    if (!databaseUrl.searchParams.has('pool_timeout')) {
      databaseUrl.searchParams.set('pool_timeout', '30');
    }
    process.env.DATABASE_URL = databaseUrl.toString();
  } catch {
    // The config parser will surface invalid DATABASE_URL values with the normal startup error.
  }
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function scheduledAtFromSlot(slot: { date: string; startTime: string }): string {
  return new Date(`${slot.date}T${slot.startTime}:00.000Z`).toISOString();
}

function jsonPayload(response: LightMyRequestResponse): unknown {
  try {
    return response.json();
  } catch {
    return response.payload;
  }
}

function authHeaders(login: LoginResult, actingRole?: string): Record<string, string> {
  return {
    authorization: `Bearer ${login.tokens.accessToken}`,
    ...(actingRole ? { 'x-acting-role': actingRole } : {}),
  };
}

async function requestJson<T>(
  app: FastifyInstance,
  input: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    payload?: unknown;
    expectedStatus?: number | number[];
  },
): Promise<ApiResponse<T>> {
  const expectedStatuses = Array.isArray(input.expectedStatus)
    ? input.expectedStatus
    : [input.expectedStatus ?? 200];
  const raw = await app.inject({
    method: input.method,
    url: input.url,
    headers: input.headers,
    payload: input.payload,
  });

  const payload = jsonPayload(raw);
  if (!expectedStatuses.includes(raw.statusCode)) {
    throw new Error(
      `${input.method} ${input.url} returned ${raw.statusCode}; expected ${expectedStatuses.join(
        ', ',
      )}; payload=${JSON.stringify(payload).slice(0, 800)}`,
    );
  }

  return {
    statusCode: raw.statusCode,
    payload: payload as T,
    raw,
  };
}

async function check<T>(
  name: string,
  run: () => Promise<T>,
  options: { warnOnly?: (value: T) => boolean } = {},
): Promise<T | undefined> {
  try {
    const value = await run();
    const status: SmokeStatus = options.warnOnly?.(value) ? 'warn' : 'pass';
    results.push({ name, status, details: value });
    return value;
  } catch (error) {
    results.push({
      name,
      status: 'fail',
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

async function main(): Promise<void> {
  loadEnvFile(defaultEnvPath);
  configureSmokeDatabaseUrl();
  process.env.PRISMA_CLIENT_ENGINE_TYPE = process.env.PRISMA_CLIENT_ENGINE_TYPE ?? 'binary';

  const [{ buildApp }, { getPrismaClient }, { createSignedReadUrl }] = await Promise.all([
    import('../src/app.js'),
    import('@clubroom/db'),
    import('../src/lib/storage-runtime.js'),
  ]);

  const prisma = getPrismaClient();
  const app = buildApp({ allowTestAuthHeaders: false });
  await app.ready();

  let coachLogin: LoginResult | undefined;
  let parentLogin: LoginResult | undefined;
  let spareGuardianLogin: LoginResult | undefined;
  let parentAthleteId: string | undefined;
  let parentFamilyId: string | undefined;
  let unrelatedAthleteId: string | undefined;
  let createdBookingId: string | undefined;
  let createdInvoiceId: string | undefined;
  let createdGroupSessionId: string | undefined;
  let createdRegistrationId: string | undefined;
  let createdPayoutMethodId: string | undefined;
  let createdWithdrawalId: string | undefined;
  let createdMatchId: string | undefined;
  let createdTrustReportId: string | undefined;
  let createdSafeguardingIncidentId: string | undefined;
  let createdSmokeClubId: string | undefined;
  let createdDrillId: string | undefined;
  let createdDrillAssignmentId: string | undefined;
  let createdSessionFeedbackId: string | undefined;
  let createdFeedbackHomeworkAssignmentId: string | undefined;

  try {
    const seedContext = await check('db seed context', async () => {
      const [users, clubs, athletes, bookings, mediaObjects] = await Promise.all([
        prisma.user.count(),
        prisma.club.count(),
        prisma.athlete.count(),
        prisma.booking.count(),
        prisma.mediaObject.count(),
      ]);
      const coach = await prisma.user.findUnique({
        where: { email: 'amelia.shaw@clubroom.demo' },
        select: { id: true, email: true },
      });
      const parent = await prisma.user.findUnique({
        where: { email: 'olivia.barton@clubroom.demo' },
        select: { id: true, email: true },
      });
      const guardianLink = parent
        ? await prisma.guardianChildLink.findFirst({
            where: { guardianUserId: parent.id },
            select: { athleteId: true, familyId: true },
          })
        : null;
      const unrelatedAthlete =
        parent && guardianLink
          ? await prisma.athlete.findFirst({
              where: {
                id: { not: guardianLink.athleteId },
                deletedAt: null,
                guardianLinks: {
                  none: {
                    guardianUserId: parent.id,
                    deletedAt: null,
                  },
                },
              },
              select: { id: true },
            })
          : null;

      if (!coach || !parent || !guardianLink || !unrelatedAthlete) {
        throw new Error(
          'Expected seeded coach, parent, guardian-child link, and unrelated athlete to exist',
        );
      }

      parentAthleteId = guardianLink.athleteId;
      parentFamilyId = guardianLink.familyId;
      unrelatedAthleteId = unrelatedAthlete.id;
      return {
        users,
        clubs,
        athletes,
        bookings,
        mediaObjects,
        coach: coach.email,
        parent: parent.email,
      };
    });

    await check(
      'readiness route',
      async () => {
        const response = await requestJson<{
          status: string;
          checks: Record<string, string>;
          issues?: Array<{ code?: string; check?: string }>;
        }>(app, {
          method: 'GET',
          url: '/v1/ready',
          expectedStatus: [200, 503],
        });
        const payload = response.payload;
        const blockingIssues = (payload.issues ?? []).filter(
          (issue) => !releaseOnlyReadinessCodes.has(issue.code ?? ''),
        );
        if (payload.checks.database !== 'ok' || payload.checks.objectStorage !== 'ok') {
          throw new Error(`DB/storage readiness failed: ${JSON.stringify(payload)}`);
        }
        if (blockingIssues.length > 0) {
          throw new Error(`Readiness has blocking issues: ${JSON.stringify(blockingIssues)}`);
        }
        return {
          status: payload.status,
          checks: payload.checks,
          warnings: payload.issues?.map((issue) => issue.code ?? issue.check) ?? [],
        };
      },
      {
        warnOnly: (value) => value.status !== 'ready',
      },
    );

    await check('coach login + bearer auth', async () => {
      const login = await requestJson<LoginResult>(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'amelia.shaw@clubroom.demo', password: 'coach' },
      });
      coachLogin = login.payload;
      await requestJson(app, {
        method: 'GET',
        url: '/v1/auth/me',
        headers: authHeaders(login.payload, 'coach'),
      });
      return {
        id: login.payload.user.id,
        email: login.payload.user.email,
        roles: login.payload.user.roles,
      };
    });

    await check('parent login + bearer auth', async () => {
      const login = await requestJson<LoginResult>(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'olivia.barton@clubroom.demo', password: 'user' },
      });
      parentLogin = login.payload;
      await requestJson(app, {
        method: 'GET',
        url: '/v1/me',
        headers: authHeaders(login.payload, 'parent'),
      });
      return {
        id: login.payload.user.id,
        email: login.payload.user.email,
        roles: login.payload.user.roles,
      };
    });

    await check('spare guardian login + bearer auth', async () => {
      const login = await requestJson<LoginResult>(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'ava.cole@clubroom.demo', password: 'user' },
      });
      spareGuardianLogin = login.payload;
      await requestJson(app, {
        method: 'GET',
        url: '/v1/me',
        headers: authHeaders(login.payload, 'parent'),
      });
      return {
        id: login.payload.user.id,
        email: login.payload.user.email,
        roles: login.payload.user.roles,
      };
    });

    if (
      !coachLogin ||
      !parentLogin ||
      !spareGuardianLogin ||
      !parentAthleteId ||
      !parentFamilyId ||
      !unrelatedAthleteId
    ) {
      throw new Error(
        'Cannot continue route smoke without coach, parent, spare guardian, family, athlete, and deny-test context',
      );
    }

    await check('self-booking preference db + audit readback', async () => {
      const auditStartedAt = new Date();
      const originalPreference = await prisma.userBookingPreference.findUnique({
        where: { userId: parentLogin.user.id },
        select: {
          allowBookSelf: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      try {
        const saved = await requestJson<{
          preferences: {
            userId: string;
            allowBookSelf: boolean;
          };
        }>(app, {
          method: 'PATCH',
          url: '/v1/me/booking-preferences',
          headers: authHeaders(parentLogin, 'parent'),
          payload: {
            allowBookSelf: true,
          },
        });
        if (
          saved.payload.preferences.userId !== parentLogin.user.id ||
          saved.payload.preferences.allowBookSelf !== true
        ) {
          throw new Error(`Unexpected booking preference save: ${JSON.stringify(saved.payload)}`);
        }

        const read = await requestJson<{
          preferences: {
            userId: string;
            allowBookSelf: boolean;
          };
        }>(app, {
          method: 'GET',
          url: '/v1/me/booking-preferences',
          headers: authHeaders(parentLogin, 'parent'),
        });
        if (
          read.payload.preferences.userId !== parentLogin.user.id ||
          read.payload.preferences.allowBookSelf !== true
        ) {
          throw new Error(`Unexpected booking preference read: ${JSON.stringify(read.payload)}`);
        }

        const [storedPreference, auditEvents] = await Promise.all([
          prisma.userBookingPreference.findUnique({
            where: { userId: parentLogin.user.id },
            select: {
              userId: true,
              allowBookSelf: true,
            },
          }),
          prisma.auditEvent.findMany({
            where: {
              actorUserId: parentLogin.user.id,
              occurredAt: { gte: auditStartedAt },
              action: {
                in: ['booking_preferences.read', 'booking_preferences.update'],
              },
            },
            select: {
              action: true,
              result: true,
              sensitiveRead: true,
              metadataJson: true,
            },
          }),
        ]);

        if (
          storedPreference?.userId !== parentLogin.user.id ||
          storedPreference.allowBookSelf !== true
        ) {
          throw new Error(
            `Unexpected stored booking preference: ${JSON.stringify(storedPreference)}`,
          );
        }

        const auditResults = new Set(
          auditEvents.map((event) => `${event.action}:${event.result}`),
        );
        for (const action of ['booking_preferences.read', 'booking_preferences.update']) {
          if (!auditResults.has(`${action}:SUCCESS`)) {
            throw new Error(
              `Missing booking preference audit action ${action}: ${JSON.stringify(auditEvents)}`,
            );
          }
        }
        if (
          !auditEvents.some(
            (event) => event.action === 'booking_preferences.read' && event.sensitiveRead,
          )
        ) {
          throw new Error(
            `Booking preference read was not sensitive: ${JSON.stringify(auditEvents)}`,
          );
        }

        return {
          allowBookSelf: storedPreference.allowBookSelf,
          auditedActions: auditEvents.length,
        };
      } finally {
        if (originalPreference) {
          await prisma.userBookingPreference.update({
            where: { userId: parentLogin.user.id },
            data: {
              allowBookSelf: originalPreference.allowBookSelf,
              createdAt: originalPreference.createdAt,
              updatedAt: originalPreference.updatedAt,
            },
          });
        } else {
          await prisma.userBookingPreference
            .delete({
              where: { userId: parentLogin.user.id },
            })
            .catch(() => undefined);
        }
      }
    });

    await check('coach profile + offerings', async () => {
      const [profile, offerings, rules] = await Promise.all([
        requestJson<{ profile: unknown }>(app, {
          method: 'GET',
          url: '/v1/coaches/me/profile',
          headers: authHeaders(coachLogin, 'coach'),
        }),
        requestJson<{ offerings: unknown[]; total: number }>(app, {
          method: 'GET',
          url: '/v1/coaches/me/offerings',
          headers: authHeaders(coachLogin, 'coach'),
        }),
        requestJson<{ rules: unknown }>(app, {
          method: 'GET',
          url: '/v1/coaches/me/scheduling-rules',
          headers: authHeaders(coachLogin, 'coach'),
        }),
      ]);
      if (!profile.payload.profile) {
        throw new Error('Coach profile bundle is empty');
      }
      return { offerings: offerings.payload.total, hasRules: Boolean(rules.payload.rules) };
    });

    await check('cleanup previous smoke bookings', async () => {
      const result = await prisma.booking.updateMany({
        where: {
          coachUserId: coachLogin.user.id,
          bookedByUserId: parentLogin.user.id,
          notes: smokeBookingNotes,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedByUserId: coachLogin.user.id,
          updatedByUserId: coachLogin.user.id,
        },
      });
      return { softDeletedBookings: result.count };
    });

    const selectedSlot = await check('discover availability slots', async () => {
      const start = addDaysIso(2);
      const end = addDaysIso(21);
      const response = await requestJson<{
        slots: Array<{
          date: string;
          startTime: string;
          endTime: string;
          isAvailable: boolean;
          location?: string;
        }>;
      }>(app, {
        method: 'GET',
        url: `/v1/coaches/${coachLogin.user.id}/availability/slots?start=${start}&end=${end}&durationMinutes=60&applySchedulingRules=true&excludePendingInvites=true`,
        headers: authHeaders(parentLogin, 'parent'),
      });
      const slot = response.payload.slots.find((candidate) => candidate.isAvailable);
      if (!slot) {
        throw new Error('No available slot found for seeded coach');
      }
      return slot;
    });

    if (selectedSlot) {
      await check('session invite create + list + dismiss + cancel', async () => {
        const created = await requestJson<{
          invite: {
            id: string;
            coachId: string;
            parentId: string;
            status: string;
            proposedSlots: Array<{ date: string; startTime: string; endTime: string }>;
          };
        }>(app, {
          method: 'POST',
          url: '/v1/invites',
          headers: authHeaders(coachLogin, 'coach'),
          expectedStatus: 201,
          payload: {
            coachUserId: coachLogin.user.id,
            parentUserId: parentLogin.user.id,
            athleteIds: [parentAthleteId],
            proposedSlots: [selectedSlot],
            sessionType: 'one_to_one',
            focus: 'Codex staging smoke invite',
            notes: smokeBookingNotes,
            durationMinutes: 60,
            priceMinor: 0,
            currency: 'GBP',
            idempotencyKey: `staging-smoke-session-invite-${Date.now()}`,
          },
        });
        if (created.payload.invite.status !== 'PENDING') {
          throw new Error(`Session invite was not pending: ${JSON.stringify(created.payload)}`);
        }

        const [coachList, parentList, parentDetail] = await Promise.all([
          requestJson<{ invites: Array<{ id: string; coachId: string }> }>(app, {
            method: 'GET',
            url: `/v1/invites?coachUserId=${encodeURIComponent(coachLogin.user.id)}`,
            headers: authHeaders(coachLogin, 'coach'),
          }),
          requestJson<{ invites: Array<{ id: string; parentId: string }> }>(app, {
            method: 'GET',
            url: `/v1/invites?parentUserId=${encodeURIComponent(parentLogin.user.id)}`,
            headers: authHeaders(parentLogin, 'parent'),
          }),
          requestJson<{ invite: { id: string; parentId: string; coachId: string } }>(app, {
            method: 'GET',
            url: `/v1/invites/${created.payload.invite.id}`,
            headers: authHeaders(parentLogin, 'parent'),
          }),
        ]);
        if (!coachList.payload.invites.some((invite) => invite.id === created.payload.invite.id)) {
          throw new Error('Created session invite was not visible in coach list');
        }
        if (!parentList.payload.invites.some((invite) => invite.id === created.payload.invite.id)) {
          throw new Error('Created session invite was not visible in parent list');
        }
        if (parentDetail.payload.invite.id !== created.payload.invite.id) {
          throw new Error('Created session invite detail did not round-trip');
        }

        await requestJson(app, {
          method: 'POST',
          url: `/v1/invites/${created.payload.invite.id}/dismiss`,
          headers: authHeaders(parentLogin, 'parent'),
          expectedStatus: 204,
        });
        await requestJson(app, {
          method: 'DELETE',
          url: `/v1/invites/${created.payload.invite.id}`,
          headers: authHeaders(coachLogin, 'coach'),
          expectedStatus: 204,
        });

        const dbInvite = await prisma.invite.findUnique({
          where: {
            id: created.payload.invite.id,
          },
          include: {
            targets: true,
          },
        });
        if (!dbInvite || dbInvite.status !== 'EXPIRED' || !dbInvite.revokedAt) {
          throw new Error(`Session invite was not cancelled in DB: ${JSON.stringify(dbInvite)}`);
        }

        return {
          inviteId: created.payload.invite.id,
          coachListVisible: true,
          parentListVisible: true,
          dismissedAndCancelled: true,
          targetCount: dbInvite.targets.length,
        };
      });

      await check('session invite accept creates booking rows', async () => {
        const slotsResponse = await requestJson<{
          slots: Array<{
            date: string;
            startTime: string;
            endTime: string;
            isAvailable: boolean;
            location?: string;
          }>;
        }>(app, {
          method: 'GET',
          url: `/v1/coaches/${coachLogin.user.id}/availability/slots?start=${addDaysIso(2)}&end=${addDaysIso(21)}&durationMinutes=60&applySchedulingRules=true&excludePendingInvites=true`,
          headers: authHeaders(parentLogin, 'parent'),
        });
        const selectedScheduledAt = scheduledAtFromSlot(selectedSlot);
        const acceptSlot = slotsResponse.payload.slots.find(
          (candidate) =>
            candidate.isAvailable && scheduledAtFromSlot(candidate) !== selectedScheduledAt,
        );
        if (!acceptSlot) {
          throw new Error('No second available slot found for invite accept smoke');
        }

        const auditStartedAt = new Date();
        const created = await requestJson<{
          invite: {
            id: string;
            coachId: string;
            parentId: string;
            status: string;
          };
        }>(app, {
          method: 'POST',
          url: '/v1/invites',
          headers: authHeaders(coachLogin, 'coach'),
          expectedStatus: 201,
          payload: {
            coachUserId: coachLogin.user.id,
            parentUserId: parentLogin.user.id,
            athleteIds: [parentAthleteId],
            proposedSlots: [acceptSlot],
            sessionType: 'one_to_one',
            focus: 'Codex staging smoke accepted invite',
            notes: smokeBookingNotes,
            durationMinutes: 60,
            priceMinor: 0,
            currency: 'GBP',
            idempotencyKey: `staging-smoke-session-invite-accept-${Date.now()}`,
          },
        });

        const accepted = await requestJson<{
          inviteId: string;
          status: string;
          targetStatus: string;
          bookingId: string | null;
          booking: { id: string; status: string } | null;
        }>(app, {
          method: 'POST',
          url: `/v1/invites/${created.payload.invite.id}/respond`,
          headers: authHeaders(parentLogin, 'parent'),
          payload: {
            response: 'ACCEPTED',
            selectedSlot: acceptSlot,
          },
        });
        if (
          accepted.payload.status !== 'ACCEPTED' ||
          accepted.payload.targetStatus !== 'ACCEPTED' ||
          !accepted.payload.bookingId
        ) {
          throw new Error(
            `Invite accept did not return booking: ${JSON.stringify(accepted.payload)}`,
          );
        }

        const replay = await requestJson<{
          status: string;
          targetStatus: string;
          bookingId: string | null;
        }>(app, {
          method: 'POST',
          url: `/v1/invites/${created.payload.invite.id}/respond`,
          headers: authHeaders(parentLogin, 'parent'),
          payload: {
            response: 'ACCEPTED',
            selectedSlot: acceptSlot,
          },
        });
        if (
          replay.payload.status !== 'ACCEPTED' ||
          replay.payload.targetStatus !== 'ACCEPTED' ||
          replay.payload.bookingId !== accepted.payload.bookingId
        ) {
          throw new Error(
            `Invite accept replay was not idempotent: ${JSON.stringify(replay.payload)}`,
          );
        }

        const [dbInvite, dbBooking, auditEvents] = await Promise.all([
          prisma.invite.findUnique({
            where: { id: created.payload.invite.id },
            include: { targets: true },
          }),
          prisma.booking.findUnique({
            where: { id: accepted.payload.bookingId },
            include: { participants: true },
          }),
          prisma.auditEvent.findMany({
            where: {
              action: 'invite.respond',
              resourceId: created.payload.invite.id,
              occurredAt: { gte: auditStartedAt },
            },
            select: { action: true, resourceId: true, result: true, metadataJson: true },
          }),
        ]);
        const dbTarget = dbInvite?.targets.find(
          (target) => target.targetUserId === parentLogin.user.id,
        );
        if (
          !dbInvite ||
          dbInvite.status !== 'ACCEPTED' ||
          dbInvite.bookingId !== accepted.payload.bookingId ||
          dbTarget?.status !== 'ACCEPTED' ||
          !dbTarget.respondedAt
        ) {
          throw new Error(
            `Accepted invite was not persisted correctly: ${JSON.stringify(dbInvite)}`,
          );
        }
        if (
          !dbBooking ||
          dbBooking.coachUserId !== coachLogin.user.id ||
          dbBooking.bookedByUserId !== parentLogin.user.id ||
          !dbBooking.participants.some((participant) => participant.athleteId === parentAthleteId)
        ) {
          throw new Error(
            `Invite-created booking was not persisted correctly: ${JSON.stringify(dbBooking)}`,
          );
        }
        if (!auditEvents.some((event) => event.result === 'SUCCESS')) {
          throw new Error('Accepted invite did not write a success audit event');
        }

        return {
          inviteId: created.payload.invite.id,
          bookingId: accepted.payload.bookingId,
          replayedBookingId: replay.payload.bookingId,
          participantCount: dbBooking.participants.length,
          auditCount: auditEvents.length,
        };
      });
    } else {
      results.push({
        name: 'session invite create + list + dismiss + cancel',
        status: 'fail',
        error: 'Skipped because no available coach slot was resolved.',
      });
      results.push({
        name: 'session invite accept creates booking rows',
        status: 'fail',
        error: 'Skipped because no available coach slot was resolved.',
      });
    }

    const booking = selectedSlot
      ? await check('direct booking create + read', async () => {
          const created = await requestJson<{ id: string; status: string }>(app, {
            method: 'POST',
            url: '/v1/bookings',
            headers: authHeaders(parentLogin, 'parent'),
            expectedStatus: 201,
            payload: {
              coachUserId: coachLogin.user.id,
              athleteIds: [parentAthleteId],
              bookedByUserId: parentLogin.user.id,
              scheduledAt: scheduledAtFromSlot(selectedSlot),
              durationMinutes: 60,
              location: selectedSlot.location ?? 'Clubroom staging pitch',
              serviceType: 'one_to_one',
              objectives: ['Codex staging smoke'],
              notes: smokeBookingNotes,
              priceMinor: 2500,
              currency: 'GBP',
            },
          });
          createdBookingId = created.payload.id;
          await requestJson(app, {
            method: 'GET',
            url: `/v1/bookings/${created.payload.id}`,
            headers: authHeaders(parentLogin, 'parent'),
          });
          return { id: created.payload.id, status: created.payload.status };
        })
      : undefined;

    if (!selectedSlot) {
      results.push({
        name: 'direct booking create + read',
        status: 'fail',
        error: 'Skipped because no available coach slot was resolved.',
      });
    } else if (booking?.id) {
      const invoice = await check('invoice generate + simulated payment', async () => {
        const generated = await requestJson<{ invoice: { id: string; status: string } }>(app, {
          method: 'POST',
          url: '/v1/invoices/generate',
          headers: authHeaders(coachLogin, 'coach'),
          expectedStatus: [200, 201],
          payload: {
            bookingId: booking.id,
            notes: 'Generated by staging smoke',
            taxRate: 0,
          },
        });
        createdInvoiceId = generated.payload.invoice.id;

        const payment = await requestJson<{
          paymentSession: {
            attemptId: string;
            status: string;
            nextAction: { url: string };
          };
        }>(app, {
          method: 'POST',
          url: `/v1/invoices/${generated.payload.invoice.id}/payments`,
          headers: authHeaders(parentLogin, 'parent'),
          expectedStatus: [200, 201],
          payload: {
            method: 'card',
            idempotencyKey: `codex-smoke-${booking.id}`,
            returnUrl: 'clubroom://invoices/smoke',
          },
        });

        const hostedUrl = new URL(
          payment.payload.paymentSession.nextAction.url,
          'http://clubroom.local',
        );
        const token = hostedUrl.searchParams.get('token');
        if (!token) {
          throw new Error('Payment hosted URL did not contain a simulated token');
        }

        const completion = await requestJson<{ invoiceStatus: string }>(app, {
          method: 'POST',
          url: `/v1/payment-attempts/${payment.payload.paymentSession.attemptId}/simulated-complete`,
          payload: { token },
        });
        if (completion.payload.invoiceStatus !== 'PAID') {
          throw new Error(
            `Expected invoice PAID after simulated completion, got ${completion.payload.invoiceStatus}`,
          );
        }

        return {
          invoiceId: generated.payload.invoice.id,
          attemptId: payment.payload.paymentSession.attemptId,
          status: completion.payload.invoiceStatus,
        };
      });
      createdInvoiceId = invoice?.invoiceId ?? createdInvoiceId;
    }

    if (createdInvoiceId) {
      await check('payout simulated provider lifecycle', async () => {
        const paidInvoice = await prisma.invoice.findUnique({
          where: { id: createdInvoiceId },
          select: { id: true, status: true, totalMinor: true, coachUserId: true },
        });
        if (
          !paidInvoice ||
          paidInvoice.status !== 'PAID' ||
          paidInvoice.coachUserId !== coachLogin.user.id
        ) {
          throw new Error(
            `Expected a paid coach invoice before payout smoke: ${JSON.stringify(paidInvoice)}`,
          );
        }

        const earningsBefore = await requestJson<{
          earnings: { availableBalance: number; totalEarned: number; totalWithdrawn: number };
        }>(app, {
          method: 'GET',
          url: '/v1/coaches/me/earnings',
          headers: authHeaders(coachLogin, 'coach'),
        });
        if (earningsBefore.payload.earnings.availableBalance < 1) {
          throw new Error(
            `Expected at least GBP 1.00 available before payout smoke: ${JSON.stringify(earningsBefore.payload.earnings)}`,
          );
        }

        const auditStartedAt = new Date();
        const rawSortCode = '98-76-54';
        const createdMethod = await requestJson<{
          payoutMethod: {
            id: string;
            type: string;
            isDefault: boolean;
            isVerified: boolean;
            accountLastFour?: string;
            sortCode?: string;
          };
          provider: string;
          providerConfigured: boolean;
        }>(app, {
          method: 'POST',
          url: '/v1/coaches/me/payout-methods',
          headers: authHeaders(coachLogin, 'coach'),
          payload: {
            type: 'BANK_ACCOUNT',
            isDefault: true,
            bankName: 'Smoke Bank',
            accountLastFour: '6789',
            sortCode: rawSortCode,
            nickname: `Smoke payout ${Date.now()}`,
          },
        });
        createdPayoutMethodId = createdMethod.payload.payoutMethod.id;
        if (
          createdMethod.payload.provider !== 'simulated' ||
          createdMethod.payload.providerConfigured !== false ||
          createdMethod.payload.payoutMethod.sortCode !== undefined
        ) {
          throw new Error(
            `Unexpected payout method response: ${JSON.stringify(createdMethod.payload)}`,
          );
        }

        const storedMethod = await prisma.coachPayoutMethod.findUnique({
          where: { id: createdPayoutMethodId },
          select: {
            id: true,
            coachUserId: true,
            provider: true,
            providerRef: true,
            accountLastFour: true,
            paypalEmail: true,
            stripeAccountId: true,
            deletedAt: true,
            deletedByUserId: true,
          },
        });
        if (
          !storedMethod ||
          storedMethod.coachUserId !== coachLogin.user.id ||
          storedMethod.provider !== 'simulated' ||
          !storedMethod.providerRef?.startsWith('simpm_') ||
          storedMethod.accountLastFour !== '6789' ||
          storedMethod.paypalEmail !== null ||
          storedMethod.stripeAccountId !== null
        ) {
          throw new Error(`Unexpected stored payout method: ${JSON.stringify(storedMethod)}`);
        }

        const requestedWithdrawal = await requestJson<{
          withdrawal: { id: string; status: string; amount: number; reference?: string };
          provider: string;
          providerConfigured: boolean;
        }>(app, {
          method: 'POST',
          url: '/v1/coaches/me/withdrawals',
          headers: authHeaders(coachLogin, 'coach'),
          payload: {
            amount: 1,
            payoutMethodId: createdPayoutMethodId,
          },
        });
        createdWithdrawalId = requestedWithdrawal.payload.withdrawal.id;
        if (
          requestedWithdrawal.payload.provider !== 'simulated' ||
          requestedWithdrawal.payload.providerConfigured !== false ||
          requestedWithdrawal.payload.withdrawal.status !== 'PENDING' ||
          requestedWithdrawal.payload.withdrawal.reference !== undefined
        ) {
          throw new Error(
            `Unexpected withdrawal request response: ${JSON.stringify(requestedWithdrawal.payload)}`,
          );
        }

        const completedWithdrawal = await requestJson<{
          withdrawal: { id: string; status: string; completedAt?: string; reference?: string };
          provider: string;
          providerConfigured: boolean;
        }>(app, {
          method: 'POST',
          url: `/v1/coaches/me/withdrawals/${createdWithdrawalId}/complete`,
          headers: authHeaders(coachLogin, 'coach'),
        });
        if (
          completedWithdrawal.payload.provider !== 'simulated' ||
          completedWithdrawal.payload.providerConfigured !== false ||
          completedWithdrawal.payload.withdrawal.status !== 'COMPLETED' ||
          !completedWithdrawal.payload.withdrawal.completedAt ||
          !completedWithdrawal.payload.withdrawal.reference?.startsWith('SIM-WD-')
        ) {
          throw new Error(
            `Unexpected withdrawal completion response: ${JSON.stringify(completedWithdrawal.payload)}`,
          );
        }

        await requestJson(app, {
          method: 'DELETE',
          url: `/v1/coaches/me/payout-methods/${createdPayoutMethodId}`,
          headers: authHeaders(coachLogin, 'coach'),
        });

        const [storedWithdrawal, removedMethod, auditEvents] = await Promise.all([
          prisma.coachWithdrawal.findUnique({
            where: { id: createdWithdrawalId },
            select: {
              coachUserId: true,
              amountMinor: true,
              status: true,
              completedAt: true,
              reference: true,
              provider: true,
              providerRef: true,
            },
          }),
          prisma.coachPayoutMethod.findUnique({
            where: { id: createdPayoutMethodId },
            select: { deletedAt: true, deletedByUserId: true },
          }),
          prisma.auditEvent.findMany({
            where: {
              actorUserId: coachLogin.user.id,
              occurredAt: { gte: auditStartedAt },
              action: {
                in: [
                  'coach_payout_methods.create',
                  'coach_payout_methods.remove',
                  'coach_withdrawals.create',
                  'coach_withdrawals.complete',
                ],
              },
            },
            select: { action: true, resourceId: true, result: true, metadataJson: true },
          }),
        ]);

        if (
          !storedWithdrawal ||
          storedWithdrawal.coachUserId !== coachLogin.user.id ||
          storedWithdrawal.amountMinor !== 100 ||
          storedWithdrawal.status !== 'COMPLETED' ||
          !storedWithdrawal.completedAt ||
          !storedWithdrawal.reference?.startsWith('SIM-WD-') ||
          storedWithdrawal.provider !== 'simulated' ||
          !storedWithdrawal.providerRef?.startsWith('simwd_')
        ) {
          throw new Error(`Unexpected stored withdrawal: ${JSON.stringify(storedWithdrawal)}`);
        }
        if (!removedMethod?.deletedAt || removedMethod.deletedByUserId !== coachLogin.user.id) {
          throw new Error(`Payout method was not soft-removed: ${JSON.stringify(removedMethod)}`);
        }

        const actionResults = new Map(
          auditEvents.map((event) => [`${event.action}:${event.result}`, event.resourceId]),
        );
        for (const action of [
          'coach_payout_methods.create',
          'coach_payout_methods.remove',
          'coach_withdrawals.create',
          'coach_withdrawals.complete',
        ]) {
          if (!actionResults.has(`${action}:SUCCESS`)) {
            throw new Error(
              `Missing successful payout audit action ${action}: ${JSON.stringify(auditEvents)}`,
            );
          }
        }

        const auditJson = JSON.stringify(auditEvents);
        if (
          auditJson.includes(rawSortCode) ||
          auditJson.includes('Smoke Bank') ||
          auditJson.includes('6789')
        ) {
          throw new Error(`Payout audit leaked raw payout details: ${auditJson}`);
        }
        if (
          JSON.stringify([
            createdMethod.payload,
            requestedWithdrawal.payload,
            completedWithdrawal.payload,
          ]).includes(rawSortCode)
        ) {
          throw new Error('Payout API response leaked raw sort code');
        }

        return {
          payoutMethodId: createdPayoutMethodId,
          withdrawalId: createdWithdrawalId,
          methodProvider: storedMethod.provider,
          withdrawalProvider: storedWithdrawal.provider,
          completed: storedWithdrawal.status,
          softRemovedMethod: true,
          auditedActions: auditEvents.length,
        };
      });
    } else {
      results.push({
        name: 'payout simulated provider lifecycle',
        status: 'fail',
        error: 'Skipped because no paid smoke invoice was created.',
      });
    }

    await check('direct payment instructions db + audit readback', async () => {
      const auditStartedAt = new Date();
      const payeeName = 'Codex Smoke Direct Payments';
      const bankTransferDetails = `Smoke sort code 22-22-22 account 9876 ${auditStartedAt.toISOString()}`;
      const paymentNotes = `Use staging smoke reference ${auditStartedAt.toISOString()}`;
      const originalInstruction = await prisma.coachPaymentInstruction.findUnique({
        where: { coachUserId: coachLogin.user.id },
        select: {
          payeeName: true,
          bankTransferDetails: true,
          paymentNotes: true,
          createdByUserId: true,
          updatedByUserId: true,
        },
      });

      try {
        const initial = await requestJson<{
          instructions: {
            coachId: string;
            payeeName: string;
            bankTransferDetails: string;
            paymentNotes: string;
          };
        }>(app, {
          method: 'GET',
          url: '/v1/coaches/me/payment-instructions',
          headers: authHeaders(coachLogin, 'coach'),
        });
        if (initial.payload.instructions.coachId !== coachLogin.user.id) {
          throw new Error(`Unexpected payment instruction owner: ${JSON.stringify(initial.payload)}`);
        }

        const saved = await requestJson<{
          instructions: {
            coachId: string;
            payeeName: string;
            bankTransferDetails: string;
            paymentNotes: string;
          };
        }>(app, {
          method: 'PATCH',
          url: '/v1/coaches/me/payment-instructions',
          headers: authHeaders(coachLogin, 'coach'),
          payload: {
            payeeName,
            bankTransferDetails,
            paymentNotes,
          },
        });
        if (
          saved.payload.instructions.coachId !== coachLogin.user.id ||
          saved.payload.instructions.payeeName !== payeeName ||
          saved.payload.instructions.bankTransferDetails !== bankTransferDetails ||
          saved.payload.instructions.paymentNotes !== paymentNotes
        ) {
          throw new Error(`Unexpected saved payment instructions: ${JSON.stringify(saved.payload)}`);
        }

        const [storedInstruction, auditEvents] = await Promise.all([
          prisma.coachPaymentInstruction.findUnique({
            where: { coachUserId: coachLogin.user.id },
            select: {
              coachUserId: true,
              payeeName: true,
              bankTransferDetails: true,
              paymentNotes: true,
              updatedByUserId: true,
            },
          }),
          prisma.auditEvent.findMany({
            where: {
              actorUserId: coachLogin.user.id,
              resourceType: 'coach_payment_instructions',
              occurredAt: { gte: auditStartedAt },
              action: {
                in: ['coach_payment_instructions.read', 'coach_payment_instructions.update'],
              },
            },
            select: {
              action: true,
              result: true,
              sensitiveRead: true,
              metadataJson: true,
            },
          }),
        ]);

        if (
          !storedInstruction ||
          storedInstruction.coachUserId !== coachLogin.user.id ||
          storedInstruction.payeeName !== payeeName ||
          storedInstruction.bankTransferDetails !== bankTransferDetails ||
          storedInstruction.paymentNotes !== paymentNotes ||
          storedInstruction.updatedByUserId !== coachLogin.user.id
        ) {
          throw new Error(
            `Unexpected stored payment instructions: ${JSON.stringify(storedInstruction)}`,
          );
        }

        const readAudit = auditEvents.find(
          (event) =>
            event.action === 'coach_payment_instructions.read' &&
            event.result === 'SUCCESS' &&
            event.sensitiveRead === true,
        );
        const updateAudit = auditEvents.find(
          (event) =>
            event.action === 'coach_payment_instructions.update' &&
            event.result === 'SUCCESS',
        );
        const changedFields = Array.isArray(
          (updateAudit?.metadataJson as { changedFields?: unknown } | null)?.changedFields,
        )
          ? ((updateAudit?.metadataJson as { changedFields: string[] }).changedFields ?? [])
          : [];
        for (const field of ['payeeName', 'bankTransferDetails', 'paymentNotes']) {
          if (!changedFields.includes(field)) {
            throw new Error(
              `Payment instruction audit did not include changed field ${field}: ${JSON.stringify(auditEvents)}`,
            );
          }
        }
        if (!readAudit || !updateAudit) {
          throw new Error(`Missing payment instruction audit rows: ${JSON.stringify(auditEvents)}`);
        }

        const auditJson = JSON.stringify(auditEvents);
        if (
          auditJson.includes(bankTransferDetails) ||
          auditJson.includes(paymentNotes) ||
          auditJson.includes(payeeName)
        ) {
          throw new Error(`Payment instruction audit leaked raw copy: ${auditJson}`);
        }

        return {
          coachUserId: coachLogin.user.id,
          stored: true,
          auditedActions: auditEvents.length,
          rawAuditCopyRedacted: true,
        };
      } finally {
        if (originalInstruction) {
          await prisma.coachPaymentInstruction.update({
            where: { coachUserId: coachLogin.user.id },
            data: {
              payeeName: originalInstruction.payeeName,
              bankTransferDetails: originalInstruction.bankTransferDetails,
              paymentNotes: originalInstruction.paymentNotes,
              createdByUserId: originalInstruction.createdByUserId,
              updatedByUserId: originalInstruction.updatedByUserId,
            },
          });
        } else {
          await prisma.coachPaymentInstruction
            .delete({
              where: { coachUserId: coachLogin.user.id },
            })
            .catch(() => undefined);
        }
      }
    });

    if (booking?.id) {
      await check('coach delivery completion + proof readback', async () => {
        const scheduledAt = new Date(Date.now() - 60 * 60 * 1000);
        const preparedBooking = await prisma.booking.update({
          where: { id: booking.id },
          data: {
            scheduledAt,
            updatedByUserId: coachLogin.user.id,
          },
          select: { version: true },
        });
        const completed = await requestJson<{ id: string; status: string; version: number }>(app, {
          method: 'POST',
          url: `/v1/bookings/${booking.id}/complete`,
          headers: authHeaders(coachLogin, 'coach'),
          payload: {
            note: smokeDeliveryProofNote,
            completedAt: new Date().toISOString(),
            expectedVersion: Number(preparedBooking.version),
            idempotencyKey: `codex-smoke-complete-${booking.id}`,
          },
        });
        if (completed.payload.status !== 'COMPLETED') {
          throw new Error(`Expected booking COMPLETED, got ${completed.payload.status}`);
        }

        const [attendanceRecords, sessionNotes, completionEvent, progress] = await Promise.all([
          prisma.attendanceRecord.findMany({
            where: {
              bookingId: booking.id,
              athleteId: parentAthleteId,
            },
            select: {
              id: true,
              status: true,
              notes: true,
              recordedByUserId: true,
            },
          }),
          prisma.sessionNote.findMany({
            where: {
              bookingId: booking.id,
              athleteId: parentAthleteId,
              coachUserId: coachLogin.user.id,
              deletedAt: null,
            },
            select: {
              id: true,
              noteText: true,
              visibility: true,
              metadataJson: true,
            },
          }),
          prisma.bookingStatusEvent.findFirst({
            where: {
              bookingId: booking.id,
              toStatus: 'COMPLETED',
            },
            orderBy: {
              occurredAt: 'desc',
            },
            select: {
              metadataJson: true,
            },
          }),
          requestJson<{
            sessionNotes: Array<{
              bookingId?: string;
              noteText?: string | null;
            }>;
          }>(app, {
            method: 'GET',
            url: `/v1/athletes/${parentAthleteId}/progress`,
            headers: authHeaders(parentLogin, 'parent'),
          }),
        ]);

        const attendanceRecord = attendanceRecords[0];
        if (
          attendanceRecords.length !== 1 ||
          attendanceRecord?.status !== 'ATTENDED' ||
          attendanceRecord.recordedByUserId !== coachLogin.user.id ||
          attendanceRecord.notes !== smokeDeliveryProofNote
        ) {
          throw new Error(`Unexpected attendance proof: ${JSON.stringify(attendanceRecords)}`);
        }

        const sessionNote = sessionNotes[0];
        const sessionNoteMetadata = sessionNote?.metadataJson as
          | {
              source?: string;
              proofSource?: string;
              attendanceRecordIds?: string[];
            }
          | null
          | undefined;
        if (
          sessionNotes.length !== 1 ||
          sessionNote?.visibility !== 'PUBLIC' ||
          sessionNote.noteText !== smokeDeliveryProofNote ||
          sessionNoteMetadata?.source !== 'booking-completion' ||
          sessionNoteMetadata.proofSource !== 'attendance-record' ||
          !sessionNoteMetadata.attendanceRecordIds?.includes(attendanceRecord.id)
        ) {
          throw new Error(`Unexpected session-note proof: ${JSON.stringify(sessionNotes)}`);
        }

        const completionMetadata = completionEvent?.metadataJson as
          | {
              attendanceRecordIds?: string[];
              sessionNoteIds?: string[];
              proofSources?: string[];
            }
          | null
          | undefined;
        if (
          !completionMetadata?.attendanceRecordIds?.includes(attendanceRecord.id) ||
          !completionMetadata.sessionNoteIds?.includes(sessionNote.id) ||
          !completionMetadata.proofSources?.includes('attendance-record') ||
          !completionMetadata.proofSources.includes('session-note')
        ) {
          throw new Error(
            `Unexpected completion proof metadata: ${JSON.stringify(completionMetadata)}`,
          );
        }

        const parentCanReadProof = progress.payload.sessionNotes.some(
          (note) => note.bookingId === booking.id && note.noteText === smokeDeliveryProofNote,
        );
        if (!parentCanReadProof) {
          throw new Error(
            'Parent progress proof readback did not include the completed session note',
          );
        }

        return {
          bookingId: completed.payload.id,
          bookingStatus: completed.payload.status,
          attendanceRecordId: attendanceRecord.id,
          sessionNoteId: sessionNote.id,
          parentProgressProofVisible: true,
        };
      });

      await check('session feedback homework db + parent completion readback', async () => {
        const auditStartedAt = new Date();
        const homework = `Codex smoke homework ${auditStartedAt.toISOString()}`;
        const completionNote = `Codex smoke homework completed ${auditStartedAt.toISOString()}`;
        const saved = await requestJson<{
          feedback: {
            id: string;
            sessionId: string;
            bookingId?: string;
            homework: string;
            visibility: string;
          };
        }>(app, {
          method: 'POST',
          url: '/v1/session-feedback',
          headers: authHeaders(coachLogin, 'coach'),
          payload: {
            sessionId: booking.id,
            bookingId: booking.id,
            coachId: coachLogin.user.id,
            coachName: coachLogin.user.email,
            athleteId: parentAthleteId,
            athleteName: 'Codex Smoke Athlete',
            publicSummary: 'Smoke feedback homework persisted through v1.',
            skillsWorkedOn: ['First touch'],
            skillRatings: [{ skill: 'First touch', rating: 4 }],
            improvements: 'Open body shape earlier.',
            homework,
            effortRating: 4,
            overallPerformance: 4,
            visibility: 'parent',
          },
        });
        createdSessionFeedbackId = saved.payload.feedback.id;
        createdFeedbackHomeworkAssignmentId = `dra_feedback_${createdSessionFeedbackId}`;

        const parentTasks = await requestJson<{
          tasks: Array<{ id: string; description: string; status: string; source: string }>;
        }>(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/practice-tasks?viewerRole=parent`,
          headers: authHeaders(parentLogin, 'parent'),
        });
        const taskId = `practice_task_drill_${createdFeedbackHomeworkAssignmentId}`;
        const homeworkTask = parentTasks.payload.tasks.find((task) => task.id === taskId);
        if (
          !homeworkTask ||
          homeworkTask.source !== 'drill_assignment' ||
          homeworkTask.description !== homework ||
          homeworkTask.status !== 'pending'
        ) {
          throw new Error(
            `Feedback homework task was not visible to parent: ${JSON.stringify(homeworkTask)}`,
          );
        }

        const completed = await requestJson<{
          task: { id: string; status: string; completionNote?: string };
        }>(app, {
          method: 'POST',
          url: `/v1/practice-tasks/${taskId}/completion`,
          headers: authHeaders(parentLogin, 'parent'),
          payload: {
            completed: true,
            completionNote,
          },
        });
        if (
          completed.payload.task.id !== taskId ||
          completed.payload.task.status !== 'completed' ||
          completed.payload.task.completionNote !== completionNote
        ) {
          throw new Error(
            `Unexpected homework completion payload: ${JSON.stringify(completed.payload)}`,
          );
        }

        const [storedFeedback, storedDrill, storedAssignment, storedSubmission, auditEvents] =
          await Promise.all([
            prisma.sessionFeedback.findUnique({
              where: { id: createdSessionFeedbackId },
              select: { id: true, bookingId: true, athleteId: true, authorUserId: true },
            }),
            prisma.drill.findUnique({
              where: { id: `drl_feedback_${createdSessionFeedbackId}` },
              select: { active: true, description: true, metadataJson: true },
            }),
            prisma.drillAssignment.findUnique({
              where: { id: createdFeedbackHomeworkAssignmentId },
              select: { status: true, instructions: true, coachUserId: true, athleteId: true },
            }),
            prisma.assignmentSubmission.findFirst({
              where: { drillAssignmentId: createdFeedbackHomeworkAssignmentId },
              select: { status: true, notes: true, submittedByUserId: true },
            }),
            prisma.auditEvent.findMany({
              where: {
                occurredAt: { gte: auditStartedAt },
                action: {
                  in: [
                    'session_feedback.save',
                    'practice_tasks.read',
                    'practice_task.completion_update',
                  ],
                },
                actorUserId: {
                  in: [coachLogin.user.id, parentLogin.user.id],
                },
              },
              select: { action: true, result: true, actorUserId: true, resourceId: true },
            }),
          ]);

        if (
          !storedFeedback ||
          storedFeedback.bookingId !== booking.id ||
          storedFeedback.athleteId !== parentAthleteId ||
          storedFeedback.authorUserId !== coachLogin.user.id
        ) {
          throw new Error(
            `Session feedback was not persisted correctly: ${JSON.stringify(storedFeedback)}`,
          );
        }
        if (!storedDrill || storedDrill.active !== true || storedDrill.description !== homework) {
          throw new Error(
            `Feedback homework drill was not persisted correctly: ${JSON.stringify(storedDrill)}`,
          );
        }
        if (
          !storedAssignment ||
          storedAssignment.status !== 'SUBMITTED' ||
          storedAssignment.instructions !== homework ||
          storedAssignment.coachUserId !== coachLogin.user.id ||
          storedAssignment.athleteId !== parentAthleteId
        ) {
          throw new Error(
            `Feedback homework assignment was not persisted/completed correctly: ${JSON.stringify(storedAssignment)}`,
          );
        }
        if (
          !storedSubmission ||
          storedSubmission.status !== 'SUBMITTED' ||
          storedSubmission.notes !== completionNote ||
          storedSubmission.submittedByUserId !== parentLogin.user.id
        ) {
          throw new Error(
            `Feedback homework submission was not persisted correctly: ${JSON.stringify(storedSubmission)}`,
          );
        }

        const auditResults = new Set(
          auditEvents.map((event) => `${event.action}:${event.result}:${event.actorUserId}`),
        );
        for (const expected of [
          `session_feedback.save:SUCCESS:${coachLogin.user.id}`,
          `practice_tasks.read:SUCCESS:${parentLogin.user.id}`,
          `practice_task.completion_update:SUCCESS:${parentLogin.user.id}`,
        ]) {
          if (!auditResults.has(expected)) {
            throw new Error(
              `Missing homework audit event ${expected}: ${JSON.stringify(auditEvents)}`,
            );
          }
        }

        return {
          feedbackId: createdSessionFeedbackId,
          homeworkAssignmentId: createdFeedbackHomeworkAssignmentId,
          parentTaskVisible: true,
          parentCompleted: true,
          auditedActions: auditEvents.length,
        };
      });
    }

    await check('family + athlete sensitive reads', async () => {
      const [family, athlete, medical, emergencyContacts, consents] = await Promise.all([
        requestJson(app, {
          method: 'GET',
          url: `/v1/families/${parentFamilyId}`,
          headers: authHeaders(parentLogin, 'parent'),
        }),
        requestJson(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}`,
          headers: authHeaders(parentLogin, 'parent'),
        }),
        requestJson(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/medical`,
          headers: authHeaders(parentLogin, 'parent'),
        }),
        requestJson(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/emergency-contacts`,
          headers: authHeaders(parentLogin, 'parent'),
        }),
        requestJson(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/consents`,
          headers: authHeaders(parentLogin, 'parent'),
        }),
      ]);

      return {
        familyStatus: family.statusCode,
        athleteStatus: athlete.statusCode,
        medicalStatus: medical.statusCode,
        emergencyContactsStatus: emergencyContacts.statusCode,
        consentsStatus: consents.statusCode,
      };
    });

    await check('report auto-block + audit readback', async () => {
      const auditStartedAt = new Date();
      const description = `${smokeTrustReportDescription} ${auditStartedAt.toISOString()}`;
      let apiUnblocked = false;

      try {
        const created = await requestJson<{
          report: {
            id: string;
            reportedUserId: string;
            reportedByUserId: string;
            type: string;
            context: string;
            description?: string;
            status: string;
          };
          autoBlocked: boolean;
        }>(app, {
          method: 'POST',
          url: '/v1/reports',
          headers: authHeaders(parentLogin, 'parent'),
          expectedStatus: 201,
          payload: {
            reportedUserId: spareGuardianLogin.user.id,
            type: 'safety_concern',
            context: 'profile',
            description,
          },
        });
        createdTrustReportId = created.payload.report.id;

        if (
          !created.payload.autoBlocked ||
          created.payload.report.reportedUserId !== spareGuardianLogin.user.id ||
          created.payload.report.reportedByUserId !== parentLogin.user.id ||
          created.payload.report.type !== 'safety_concern' ||
          created.payload.report.context !== 'profile' ||
          created.payload.report.description !== description ||
          created.payload.report.status !== 'pending'
        ) {
          throw new Error(`Unexpected report response: ${JSON.stringify(created.payload)}`);
        }

        const [storedReport, activeBlock, ownReports, blockStatus] = await Promise.all([
          prisma.safeguardingIncident.findUnique({
            where: { id: created.payload.report.id },
            select: {
              id: true,
              category: true,
              reportedByUserId: true,
              status: true,
              severity: true,
              detailsEncrypted: true,
            },
          }),
          prisma.userBlock.findUnique({
            where: {
              blockerUserId_blockedUserId: {
                blockerUserId: parentLogin.user.id,
                blockedUserId: spareGuardianLogin.user.id,
              },
            },
            select: {
              id: true,
              blockerUserId: true,
              blockedUserId: true,
              deletedAt: true,
            },
          }),
          requestJson<{
            reports: Array<{ id: string; reportedUserId: string; status: string }>;
            total: number;
          }>(app, {
            method: 'GET',
            url: '/v1/reports',
            headers: authHeaders(parentLogin, 'parent'),
          }),
          requestJson<{
            blockedUserIds: string[];
            status: {
              relationship: string;
              blocked: boolean;
              blockerId: string | null;
              blockedId: string | null;
            } | null;
          }>(app, {
            method: 'GET',
            url: `/v1/blocks?targetUserId=${encodeURIComponent(spareGuardianLogin.user.id)}`,
            headers: authHeaders(parentLogin, 'parent'),
          }),
        ]);

        if (
          !storedReport ||
          storedReport.category !== 'other' ||
          storedReport.reportedByUserId !== parentLogin.user.id ||
          storedReport.status !== 'OPEN' ||
          storedReport.severity !== 'HIGH' ||
          typeof storedReport.detailsEncrypted !== 'string'
        ) {
          throw new Error(`Unexpected stored report: ${JSON.stringify(storedReport)}`);
        }
        const reportDetails = JSON.parse(storedReport.detailsEncrypted) as Record<string, unknown>;
        if (
          reportDetails.source !== 'generic-report' ||
          reportDetails.reportedUserId !== spareGuardianLogin.user.id ||
          reportDetails.type !== 'safety_concern' ||
          reportDetails.context !== 'profile' ||
          reportDetails.description !== description
        ) {
          throw new Error(`Unexpected stored report details: ${JSON.stringify(reportDetails)}`);
        }
        if (
          !activeBlock ||
          activeBlock.blockerUserId !== parentLogin.user.id ||
          activeBlock.blockedUserId !== spareGuardianLogin.user.id ||
          activeBlock.deletedAt
        ) {
          throw new Error(`Expected active auto-block row: ${JSON.stringify(activeBlock)}`);
        }
        if (
          !ownReports.payload.reports.some((report) => report.id === created.payload.report.id) ||
          blockStatus.payload.status?.relationship !== 'blocked_by_actor' ||
          !blockStatus.payload.blockedUserIds.includes(spareGuardianLogin.user.id)
        ) {
          throw new Error(
            `Report/block readback failed: ${JSON.stringify({
              reports: ownReports.payload,
              blocks: blockStatus.payload,
            })}`,
          );
        }

        const removed = await requestJson<{
          status: { relationship: string; blocked: boolean; blockerId: string | null };
        }>(app, {
          method: 'DELETE',
          url: `/v1/blocks?blockedUserId=${encodeURIComponent(spareGuardianLogin.user.id)}`,
          headers: authHeaders(parentLogin, 'parent'),
        });
        apiUnblocked = true;
        if (
          removed.payload.status.relationship === 'blocked_by_actor' ||
          removed.payload.status.relationship === 'mutual' ||
          removed.payload.status.blockerId === parentLogin.user.id
        ) {
          throw new Error(`Auto-block was not removed: ${JSON.stringify(removed.payload)}`);
        }

        const [removedBlock, auditEvents] = await Promise.all([
          prisma.userBlock.findUnique({
            where: {
              blockerUserId_blockedUserId: {
                blockerUserId: parentLogin.user.id,
                blockedUserId: spareGuardianLogin.user.id,
              },
            },
            select: {
              deletedAt: true,
              deletedByUserId: true,
            },
          }),
          prisma.auditEvent.findMany({
            where: {
              actorUserId: parentLogin.user.id,
              occurredAt: { gte: auditStartedAt },
              action: {
                in: [
                  'reports.create',
                  'reports.read',
                  'users.block.create',
                  'users.block.read',
                  'users.block.remove',
                ],
              },
            },
            select: { action: true, resourceId: true, result: true, sensitiveRead: true },
          }),
        ]);
        if (!removedBlock?.deletedAt || removedBlock.deletedByUserId !== parentLogin.user.id) {
          throw new Error(`Auto-block was not soft-removed: ${JSON.stringify(removedBlock)}`);
        }

        const auditResults = new Set(auditEvents.map((event) => `${event.action}:${event.result}`));
        for (const action of [
          'reports.create',
          'reports.read',
          'users.block.create',
          'users.block.read',
          'users.block.remove',
        ]) {
          if (!auditResults.has(`${action}:SUCCESS`)) {
            throw new Error(
              `Missing trust report audit action ${action}: ${JSON.stringify(auditEvents)}`,
            );
          }
        }
        if (
          !auditEvents.some(
            (event) => event.action === 'users.block.read' && event.sensitiveRead === true,
          )
        ) {
          throw new Error(`Block read was not marked sensitive: ${JSON.stringify(auditEvents)}`);
        }

        return {
          reportId: created.payload.report.id,
          autoBlocked: true,
          softRemovedBlock: true,
          auditedActions: auditEvents.length,
        };
      } finally {
        if (!apiUnblocked) {
          await prisma.userBlock.updateMany({
            where: {
              blockerUserId: parentLogin.user.id,
              blockedUserId: spareGuardianLogin.user.id,
              deletedAt: null,
            },
            data: {
              deletedAt: new Date(),
              deletedByUserId: parentLogin.user.id,
            },
          });
        }
      }
    });

    await check('safeguarding incident denied read + action audit readback', async () => {
      const auditStartedAt = new Date();
      const details = `${smokeSafeguardingDetails} ${auditStartedAt.toISOString()}`;
      const actionNotes = `${smokeSafeguardingDetails} note ${auditStartedAt.toISOString()}`;

      const created = await requestJson<{
        id: string;
        athleteId: string | null;
        category: string;
        severity: string;
        status: string;
        summary: string;
        details: string | null;
        reportedByUserId: string;
        actions: unknown[];
      }>(app, {
        method: 'POST',
        url: '/v1/safeguarding/incidents',
        headers: authHeaders(parentLogin, 'parent'),
        expectedStatus: 201,
        payload: {
          athleteId: parentAthleteId,
          category: 'session_conduct',
          severity: 'high',
          summary: 'Codex smoke safeguarding incident',
          details,
        },
      });
      createdSafeguardingIncidentId = created.payload.id;

      if (
        created.payload.athleteId !== parentAthleteId ||
        created.payload.category !== 'session_conduct' ||
        created.payload.severity !== 'high' ||
        created.payload.status !== 'open' ||
        created.payload.details !== details ||
        created.payload.reportedByUserId !== parentLogin.user.id
      ) {
        throw new Error(
          `Unexpected safeguarding create response: ${JSON.stringify(created.payload)}`,
        );
      }

      const deniedRead = await requestJson(app, {
        method: 'GET',
        url: `/v1/safeguarding/incidents/${created.payload.id}`,
        headers: authHeaders(spareGuardianLogin, 'parent'),
        expectedStatus: [403, 404],
      });
      if (deniedRead.statusCode !== 403) {
        throw new Error(
          `Expected denied safeguarding read to be 403, got ${deniedRead.statusCode}`,
        );
      }

      const readback = await requestJson<{
        id: string;
        actions: Array<{ id: string; actionType: string }>;
      }>(app, {
        method: 'GET',
        url: `/v1/safeguarding/incidents/${created.payload.id}`,
        headers: authHeaders(parentLogin, 'parent'),
      });
      if (readback.payload.id !== created.payload.id || readback.payload.actions.length !== 0) {
        throw new Error(`Unexpected safeguarding readback: ${JSON.stringify(readback.payload)}`);
      }

      const listReadback = await requestJson<{
        incidents: Array<{ id: string; athleteId: string | null; status: string }>;
        total: number;
      }>(app, {
        method: 'GET',
        url: `/v1/safeguarding/incidents?athleteId=${parentAthleteId}&status=open&reportedBy=me`,
        headers: authHeaders(parentLogin, 'parent'),
      });
      if (
        !listReadback.payload.incidents.some(
          (incident) =>
            incident.id === created.payload.id &&
            incident.athleteId === parentAthleteId &&
            incident.status === 'open',
        )
      ) {
        throw new Error(
          `Safeguarding list readback did not include created incident: ${JSON.stringify(
            listReadback.payload,
          )}`,
        );
      }

      const action = await requestJson<{
        id: string;
        incidentId: string;
        actionType: string;
        notes: string;
        performedByUserId: string;
      }>(app, {
        method: 'POST',
        url: `/v1/safeguarding/incidents/${created.payload.id}/actions`,
        headers: authHeaders(parentLogin, 'parent'),
        expectedStatus: 201,
        payload: {
          actionType: 'note_added',
          notes: actionNotes,
        },
      });
      if (
        action.payload.incidentId !== created.payload.id ||
        action.payload.actionType !== 'note_added' ||
        action.payload.notes !== actionNotes ||
        action.payload.performedByUserId !== parentLogin.user.id
      ) {
        throw new Error(
          `Unexpected safeguarding action response: ${JSON.stringify(action.payload)}`,
        );
      }

      const afterAction = await requestJson<{
        id: string;
        status: string;
        actions: Array<{ id: string; actionType: string; notes: string }>;
      }>(app, {
        method: 'GET',
        url: `/v1/safeguarding/incidents/${created.payload.id}`,
        headers: authHeaders(parentLogin, 'parent'),
      });
      if (
        afterAction.payload.status !== 'open' ||
        !afterAction.payload.actions.some(
          (item) =>
            item.id === action.payload.id &&
            item.actionType === 'note_added' &&
            item.notes === actionNotes,
        )
      ) {
        throw new Error(
          `Safeguarding action readback failed: ${JSON.stringify(afterAction.payload)}`,
        );
      }

      const [storedIncident, storedActions, auditEvents] = await Promise.all([
        prisma.safeguardingIncident.findUnique({
          where: { id: created.payload.id },
          select: {
            id: true,
            athleteId: true,
            category: true,
            severity: true,
            status: true,
            summary: true,
            detailsEncrypted: true,
            reportedByUserId: true,
          },
        }),
        prisma.safeguardingIncidentAction.findMany({
          where: { safeguardingIncidentId: created.payload.id },
          select: {
            id: true,
            actionType: true,
            note: true,
            actorUserId: true,
          },
        }),
        prisma.auditEvent.findMany({
          where: {
            occurredAt: { gte: auditStartedAt },
            action: {
              in: [
                'safeguarding_incident.create',
                'safeguarding_incident.list',
                'safeguarding_incident.read',
                'safeguarding_incident.action',
              ],
            },
            OR: [{ actorUserId: parentLogin.user.id }, { actorUserId: spareGuardianLogin.user.id }],
          },
          select: {
            action: true,
            actorUserId: true,
            resourceId: true,
            result: true,
            sensitiveRead: true,
            metadataJson: true,
          },
        }),
      ]);

      if (
        !storedIncident ||
        storedIncident.athleteId !== parentAthleteId ||
        storedIncident.category !== 'session_conduct' ||
        storedIncident.severity !== 'HIGH' ||
        storedIncident.status !== 'OPEN' ||
        storedIncident.summary !== 'Codex smoke safeguarding incident' ||
        storedIncident.detailsEncrypted !== details ||
        storedIncident.reportedByUserId !== parentLogin.user.id
      ) {
        throw new Error(
          `Unexpected stored safeguarding incident: ${JSON.stringify(storedIncident)}`,
        );
      }
      if (
        storedActions.length !== 1 ||
        storedActions[0]?.id !== action.payload.id ||
        storedActions[0].actionType !== 'NOTE_ADDED' ||
        storedActions[0].note !== actionNotes ||
        storedActions[0].actorUserId !== parentLogin.user.id
      ) {
        throw new Error(`Unexpected stored safeguarding actions: ${JSON.stringify(storedActions)}`);
      }

      const auditResults = new Set(
        auditEvents.map((event) => `${event.action}:${event.result}:${event.actorUserId}`),
      );
      for (const expected of [
        `safeguarding_incident.create:SUCCESS:${parentLogin.user.id}`,
        `safeguarding_incident.list:SUCCESS:${parentLogin.user.id}`,
        `safeguarding_incident.read:SUCCESS:${parentLogin.user.id}`,
        `safeguarding_incident.read:DENY:${spareGuardianLogin.user.id}`,
        `safeguarding_incident.action:SUCCESS:${parentLogin.user.id}`,
      ]) {
        if (!auditResults.has(expected)) {
          throw new Error(
            `Missing safeguarding audit event ${expected}: ${JSON.stringify(auditEvents)}`,
          );
        }
      }
      if (
        !auditEvents.some(
          (event) =>
            event.action === 'safeguarding_incident.read' &&
            event.result === 'DENY' &&
            event.resourceId === created.payload.id &&
            event.sensitiveRead === true,
        )
      ) {
        throw new Error(
          `Denied safeguarding read was not audited as sensitive: ${JSON.stringify(auditEvents)}`,
        );
      }
      if (
        !auditEvents.some(
          (event) =>
            event.action === 'safeguarding_incident.list' &&
            event.result === 'SUCCESS' &&
            event.resourceId === parentAthleteId &&
            event.sensitiveRead === true,
        )
      ) {
        throw new Error(
          `Safeguarding list was not audited as sensitive: ${JSON.stringify(auditEvents)}`,
        );
      }

      return {
        incidentId: created.payload.id,
        deniedReadStatus: deniedRead.statusCode,
        listedIncidents: listReadback.payload.total,
        actionId: action.payload.id,
        storedActions: storedActions.length,
        auditedActions: auditEvents.length,
      };
    });

    await check('guardian invite create + inbox + decline', async () => {
      const inviteeEmail = spareGuardianLogin.user.email.trim().toLowerCase();
      const now = new Date();
      const previousSmokeInvites = await prisma.familyGuardianInvite.updateMany({
        where: {
          familyId: parentFamilyId,
          inviteeEmail,
          status: 'PENDING',
          deletedAt: null,
          message: {
            startsWith: smokeGuardianInviteMessage,
          },
        },
        data: {
          status: 'CANCELLED',
          respondedAt: now,
          updatedAt: now,
        },
      });
      const existingMembership = await prisma.familyMembership.findFirst({
        where: {
          familyId: parentFamilyId,
          userId: spareGuardianLogin.user.id,
          deletedAt: null,
        },
      });
      if (existingMembership) {
        throw new Error('Spare guardian account already has family access before invite smoke');
      }

      const create = await requestJson<{
        id: string;
        familyId: string;
        inviteeEmail: string;
        status: string;
        childAccess: string[];
      }>(app, {
        method: 'POST',
        url: `/v1/families/${parentFamilyId}/guardians`,
        headers: authHeaders(parentLogin, 'parent'),
        expectedStatus: 201,
        payload: {
          inviteeEmail,
          inviteeName: spareGuardianLogin.user.email,
          role: 'VIEWER',
          relationship: 'Smoke verifier',
          childAccess: [parentAthleteId],
          message: `${smokeGuardianInviteMessage} ${now.toISOString()}`,
        },
      });
      if (create.payload.status !== 'PENDING') {
        throw new Error(`Guardian invite was not pending: ${JSON.stringify(create.payload)}`);
      }

      const inbox = await requestJson<{ invites: Array<{ id: string; familyId: string }> }>(app, {
        method: 'GET',
        url: '/v1/me/guardian-invites',
        headers: authHeaders(spareGuardianLogin, 'parent'),
      });
      if (!inbox.payload.invites.some((invite) => invite.id === create.payload.id)) {
        throw new Error('Created guardian invite was not visible in invitee inbox');
      }

      const decline = await requestJson<{ id: string; status: string; familyId: string }>(app, {
        method: 'POST',
        url: `/v1/guardian-invites/${create.payload.id}/decline`,
        headers: authHeaders(spareGuardianLogin, 'parent'),
      });
      if (decline.payload.status !== 'DECLINED') {
        throw new Error(`Guardian invite was not declined: ${JSON.stringify(decline.payload)}`);
      }

      const grantedMembership = await prisma.familyMembership.findFirst({
        where: {
          familyId: parentFamilyId,
          userId: spareGuardianLogin.user.id,
          deletedAt: null,
        },
      });
      if (grantedMembership) {
        throw new Error('Declined guardian invite unexpectedly granted family access');
      }

      return {
        inviteId: create.payload.id,
        cancelledPreviousSmokeInvites: previousSmokeInvites.count,
        inboxCount: inbox.payload.invites.length,
        declined: true,
      };
    });

    await check('unrelated athlete sensitive reads denied', async () => {
      const [medical, emergencyContacts, consents] = await Promise.all([
        requestJson(app, {
          method: 'GET',
          url: `/v1/athletes/${unrelatedAthleteId}/medical`,
          headers: authHeaders(parentLogin, 'parent'),
          expectedStatus: [403, 404],
        }),
        requestJson(app, {
          method: 'GET',
          url: `/v1/athletes/${unrelatedAthleteId}/emergency-contacts`,
          headers: authHeaders(parentLogin, 'parent'),
          expectedStatus: [403, 404],
        }),
        requestJson(app, {
          method: 'GET',
          url: `/v1/athletes/${unrelatedAthleteId}/consents`,
          headers: authHeaders(parentLogin, 'parent'),
          expectedStatus: [403, 404],
        }),
      ]);

      return {
        athleteId: unrelatedAthleteId,
        medicalStatus: medical.statusCode,
        emergencyContactsStatus: emergencyContacts.statusCode,
        consentsStatus: consents.statusCode,
      };
    });

    await check('club create + invite code join + archive audit readback', async () => {
      const auditStartedAt = new Date();
      const smokeClubName = `${smokeClubNamePrefix} ${auditStartedAt.toISOString()}`;
      let apiArchived = false;

      try {
        const created = await requestJson<{
          club: {
            id: string;
            name: string;
            city: string | null;
            country: string | null;
            commercialMode: string;
            visibility: string;
          };
          membership: { clubId: string; userId: string; role: string };
          primaryInvite: { code: string; role: string };
        }>(app, {
          method: 'POST',
          url: '/v1/clubs',
          headers: authHeaders(coachLogin, 'coach'),
          expectedStatus: 201,
          payload: {
            name: smokeClubName,
            city: 'Manchester',
            country: 'UK',
            tagline: 'Created by apps/api/scripts/staging-smoke.ts',
            visibility: 'private',
            commercialMode: 'ORG_OWNED',
            firstStaffRole: 'COACH',
          },
        });
        createdSmokeClubId = created.payload.club.id;
        if (
          created.payload.club.name !== smokeClubName ||
          created.payload.club.commercialMode !== 'ORG_OWNED' ||
          created.payload.club.visibility !== 'private' ||
          created.payload.membership.userId !== coachLogin.user.id ||
          created.payload.membership.role !== 'OWNER' ||
          created.payload.primaryInvite.role !== 'MEMBER'
        ) {
          throw new Error(`Unexpected club create response: ${JSON.stringify(created.payload)}`);
        }

        const listedCodes = await requestJson<{
          inviteCodes: Array<{ code: string; role: string }>;
        }>(app, {
          method: 'GET',
          url: `/v1/clubs/${created.payload.club.id}/invite-codes`,
          headers: authHeaders(coachLogin, 'coach'),
        });
        if (
          !listedCodes.payload.inviteCodes.some(
            (inviteCode) =>
              inviteCode.code === created.payload.primaryInvite.code &&
              inviteCode.role === 'MEMBER',
          )
        ) {
          throw new Error(
            `Primary invite code was not listed: ${JSON.stringify(listedCodes.payload)}`,
          );
        }

        const explicitInvite = await requestJson<{
          inviteCode: {
            id: string;
            code: string;
            role: string;
            remainingUses: number;
          };
        }>(app, {
          method: 'POST',
          url: `/v1/clubs/${created.payload.club.id}/invite-codes`,
          headers: authHeaders(coachLogin, 'coach'),
          expectedStatus: 201,
          payload: {
            role: 'MEMBER',
          },
        });
        if (
          explicitInvite.payload.inviteCode.role !== 'MEMBER' ||
          explicitInvite.payload.inviteCode.remainingUses <= 0
        ) {
          throw new Error(
            `Unexpected explicit invite code: ${JSON.stringify(explicitInvite.payload)}`,
          );
        }

        const resolved = await requestJson<{
          preview: {
            clubId: string;
            inviteCode: string;
            role: string;
            joinFlow: string;
            alreadyMember: boolean;
          };
        }>(app, {
          method: 'GET',
          url: `/v1/clubs/join/resolve?code=${encodeURIComponent(explicitInvite.payload.inviteCode.code)}`,
          headers: authHeaders(spareGuardianLogin, 'parent'),
        });
        if (
          resolved.payload.preview.clubId !== created.payload.club.id ||
          resolved.payload.preview.role !== 'MEMBER' ||
          resolved.payload.preview.joinFlow !== 'direct_join' ||
          resolved.payload.preview.alreadyMember !== false
        ) {
          throw new Error(`Unexpected join preview: ${JSON.stringify(resolved.payload)}`);
        }

        const joined = await requestJson<{
          outcome: string;
          club: { id: string };
          membership: { id: string; clubId: string; userId: string; role: string } | null;
        }>(app, {
          method: 'POST',
          url: '/v1/clubs/join',
          headers: authHeaders(spareGuardianLogin, 'parent'),
          expectedStatus: 201,
          payload: {
            code: explicitInvite.payload.inviteCode.code,
          },
        });
        if (
          joined.payload.outcome !== 'joined' ||
          joined.payload.club.id !== created.payload.club.id ||
          joined.payload.membership?.clubId !== created.payload.club.id ||
          joined.payload.membership.userId !== spareGuardianLogin.user.id ||
          joined.payload.membership.role !== 'MEMBER'
        ) {
          throw new Error(`Unexpected club join response: ${JSON.stringify(joined.payload)}`);
        }

        const [clubBeforeArchive, ownerMembership, joinedMembership, inviteCodeAfterJoin] =
          await Promise.all([
            prisma.club.findUnique({
              where: { id: created.payload.club.id },
              select: {
                id: true,
                name: true,
                commercialMode: true,
                visibility: true,
                createdByUserId: true,
                deletedAt: true,
              },
            }),
            prisma.clubMembership.findUnique({
              where: {
                clubId_userId: {
                  clubId: created.payload.club.id,
                  userId: coachLogin.user.id,
                },
              },
              select: { id: true, role: true, active: true, deletedAt: true },
            }),
            prisma.clubMembership.findUnique({
              where: {
                clubId_userId: {
                  clubId: created.payload.club.id,
                  userId: spareGuardianLogin.user.id,
                },
              },
              select: { id: true, role: true, active: true, deletedAt: true },
            }),
            prisma.clubInviteCode.findUnique({
              where: { code: explicitInvite.payload.inviteCode.code },
              select: { id: true, clubId: true, role: true, remainingUses: true, deletedAt: true },
            }),
          ]);

        if (
          !clubBeforeArchive ||
          clubBeforeArchive.name !== smokeClubName ||
          clubBeforeArchive.commercialMode !== 'ORG_OWNED' ||
          clubBeforeArchive.visibility !== 'private' ||
          clubBeforeArchive.createdByUserId !== coachLogin.user.id ||
          clubBeforeArchive.deletedAt
        ) {
          throw new Error(
            `Unexpected stored club before archive: ${JSON.stringify(clubBeforeArchive)}`,
          );
        }
        if (
          ownerMembership?.role !== 'OWNER' ||
          ownerMembership.active !== true ||
          ownerMembership.deletedAt
        ) {
          throw new Error(`Unexpected owner membership: ${JSON.stringify(ownerMembership)}`);
        }
        if (
          joinedMembership?.role.toUpperCase() !== 'MEMBER' ||
          joinedMembership.active !== true ||
          joinedMembership.deletedAt
        ) {
          throw new Error(`Unexpected joined membership: ${JSON.stringify(joinedMembership)}`);
        }
        if (
          !inviteCodeAfterJoin ||
          inviteCodeAfterJoin.clubId !== created.payload.club.id ||
          inviteCodeAfterJoin.role !== 'MEMBER' ||
          inviteCodeAfterJoin.remainingUses !==
            explicitInvite.payload.inviteCode.remainingUses - 1 ||
          inviteCodeAfterJoin.deletedAt
        ) {
          throw new Error(
            `Unexpected invite code after join: ${JSON.stringify(inviteCodeAfterJoin)}`,
          );
        }

        await requestJson(app, {
          method: 'DELETE',
          url: `/v1/clubs/${created.payload.club.id}`,
          headers: authHeaders(coachLogin, 'coach'),
          expectedStatus: 204,
        });
        apiArchived = true;

        const [archivedClub, auditEvents] = await Promise.all([
          prisma.club.findUnique({
            where: { id: created.payload.club.id },
            select: { deletedAt: true, deletedByUserId: true },
          }),
          prisma.auditEvent.findMany({
            where: {
              occurredAt: { gte: auditStartedAt },
              action: {
                in: [
                  'club.create',
                  'club_invite_code.read',
                  'club_invite_code.create',
                  'club.join',
                  'club.archive',
                ],
              },
              OR: [
                { actorUserId: coachLogin.user.id },
                { actorUserId: spareGuardianLogin.user.id },
              ],
            },
            select: {
              action: true,
              actorUserId: true,
              resourceId: true,
              result: true,
              sensitiveRead: true,
              metadataJson: true,
            },
          }),
        ]);

        if (!archivedClub?.deletedAt || archivedClub.deletedByUserId !== coachLogin.user.id) {
          throw new Error(`Smoke club was not archived: ${JSON.stringify(archivedClub)}`);
        }
        const auditResults = new Set(
          auditEvents.map((event) => `${event.action}:${event.result}:${event.actorUserId}`),
        );
        for (const expected of [
          `club.create:SUCCESS:${coachLogin.user.id}`,
          `club_invite_code.read:SUCCESS:${coachLogin.user.id}`,
          `club_invite_code.create:SUCCESS:${coachLogin.user.id}`,
          `club.join:SUCCESS:${spareGuardianLogin.user.id}`,
          `club.archive:SUCCESS:${coachLogin.user.id}`,
        ]) {
          if (!auditResults.has(expected)) {
            throw new Error(`Missing club audit event ${expected}: ${JSON.stringify(auditEvents)}`);
          }
        }
        if (
          !auditEvents.some(
            (event) =>
              event.action === 'club_invite_code.read' &&
              event.resourceId === created.payload.club.id &&
              event.sensitiveRead === true,
          )
        ) {
          throw new Error(
            `Invite code read was not audited as sensitive: ${JSON.stringify(auditEvents)}`,
          );
        }

        return {
          clubId: created.payload.club.id,
          inviteCodeId: explicitInvite.payload.inviteCode.id,
          joinedMembershipId: joined.payload.membership.id,
          archived: true,
          auditedActions: auditEvents.length,
        };
      } finally {
        if (createdSmokeClubId && !apiArchived) {
          await prisma.club.updateMany({
            where: { id: createdSmokeClubId, deletedAt: null },
            data: {
              deletedAt: new Date(),
              deletedByUserId: coachLogin.user.id,
              updatedByUserId: coachLogin.user.id,
            },
          });
        }
      }
    });

    await check('club match invite + parent aggregate', async () => {
      const staffMembership = await prisma.clubMembership.findFirst({
        where: {
          userId: coachLogin.user.id,
          active: true,
          deletedAt: null,
          role: { not: 'MEMBER' },
          club: {
            deletedAt: null,
            memberships: {
              some: {
                userId: parentLogin.user.id,
                active: true,
                deletedAt: null,
              },
            },
          },
        },
        select: {
          clubId: true,
          role: true,
          club: {
            select: {
              name: true,
              visibility: true,
            },
          },
        },
      });
      if (!staffMembership) {
        throw new Error('Expected staged coach and parent to share an active club membership');
      }

      const now = new Date();
      const previousSmokeMatches = await prisma.clubMatch.updateMany({
        where: {
          coachUserId: coachLogin.user.id,
          title: {
            startsWith: smokeMatchTitlePrefix,
          },
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          deletedByUserId: coachLogin.user.id,
          updatedByUserId: coachLogin.user.id,
        },
      });

      const auditStartedAt = new Date();
      const created = await requestJson<{
        match: { id: string; clubId: string; coachId: string; selectedPlayers: unknown[] };
      }>(app, {
        method: 'POST',
        url: `/v1/clubs/${staffMembership.clubId}/matches`,
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 201,
        payload: {
          title: `${smokeMatchTitlePrefix} ${Date.now()}`,
          matchType: 'FRIENDLY',
          opponent: 'Smoke Town FC',
          isHome: true,
          date: addDaysIso(28),
          kickoffTime: '10:00',
          meetTime: '09:30',
          venue: 'Clubroom staging pitch',
          maxPlayers: 14,
          notes: smokeBookingNotes,
        },
      });
      createdMatchId = created.payload.match.id;
      if (
        created.payload.match.clubId !== staffMembership.clubId ||
        created.payload.match.coachId !== coachLogin.user.id ||
        created.payload.match.selectedPlayers.length !== 0
      ) {
        throw new Error(`Unexpected created match payload: ${JSON.stringify(created.payload)}`);
      }

      await requestJson(app, {
        method: 'POST',
        url: `/v1/matches/${createdMatchId}/players/invite`,
        headers: authHeaders(coachLogin, 'coach'),
        payload: {
          players: [
            {
              athleteId: parentAthleteId,
              athleteName: 'Staged smoke athlete',
              parentId: parentLogin.user.id,
              parentName: parentLogin.user.email,
            },
          ],
        },
      });

      const parentMatches = await requestJson<{
        matches: Array<{
          id: string;
          selectedPlayers: Array<{ athleteId: string; parentId: string; status: string }>;
        }>;
        total: number;
      }>(app, {
        method: 'GET',
        url: '/v1/me/matches',
        headers: authHeaders(parentLogin, 'parent'),
      });
      const parentMatch = parentMatches.payload.matches.find(
        (match) => match.id === createdMatchId,
      );
      if (
        !parentMatch ||
        parentMatch.selectedPlayers.length !== 1 ||
        parentMatch.selectedPlayers[0]?.athleteId !== parentAthleteId ||
        parentMatch.selectedPlayers[0]?.parentId !== parentLogin.user.id ||
        parentMatch.selectedPlayers[0]?.status !== 'INVITED'
      ) {
        throw new Error(
          `Parent aggregate did not include narrowed match invite: ${JSON.stringify(parentMatches.payload)}`,
        );
      }

      const responded = await requestJson<{
        match: {
          selectedPlayers: Array<{ athleteId: string; status: string; parentNote?: string }>;
        };
      }>(app, {
        method: 'POST',
        url: `/v1/matches/${createdMatchId}/players/respond`,
        headers: authHeaders(parentLogin, 'parent'),
        payload: {
          athleteId: parentAthleteId,
          status: 'AVAILABLE',
          note: 'Available from staging smoke.',
        },
      });
      const respondedPlayer = responded.payload.match.selectedPlayers.find(
        (player) => player.athleteId === parentAthleteId,
      );
      if (
        respondedPlayer?.status !== 'AVAILABLE' ||
        respondedPlayer.parentNote !== 'Available from staging smoke.'
      ) {
        throw new Error(`Unexpected match response payload: ${JSON.stringify(responded.payload)}`);
      }

      const outsiderMatches = await requestJson<{ matches: Array<{ id: string }> }>(app, {
        method: 'GET',
        url: '/v1/me/matches',
        headers: authHeaders(spareGuardianLogin, 'parent'),
      });
      if (outsiderMatches.payload.matches.some((match) => match.id === createdMatchId)) {
        throw new Error('Uninvited guardian could see staged match invite');
      }

      const [storedPlayer, inviteNotification, auditEvents] = await Promise.all([
        prisma.clubMatchPlayer.findUnique({
          where: {
            matchId_athleteId: {
              matchId: createdMatchId,
              athleteId: parentAthleteId,
            },
          },
          select: {
            parentUserId: true,
            status: true,
            parentNote: true,
            responseAt: true,
            deletedAt: true,
          },
        }),
        prisma.notification.findFirst({
          where: {
            userId: parentLogin.user.id,
            type: 'MATCH_INVITE',
            sourceId: createdMatchId,
          },
          select: { id: true },
        }),
        prisma.auditEvent.findMany({
          where: {
            actorUserId: {
              in: [coachLogin.user.id, parentLogin.user.id, spareGuardianLogin.user.id],
            },
            occurredAt: { gte: auditStartedAt },
            action: {
              in: [
                'club_match.create',
                'club_match.players.invite',
                'club_match.availability.respond',
                'club_match.me.read',
              ],
            },
          },
          select: { action: true, resourceId: true, result: true },
        }),
      ]);

      if (
        !storedPlayer ||
        storedPlayer.parentUserId !== parentLogin.user.id ||
        storedPlayer.status !== 'AVAILABLE' ||
        storedPlayer.parentNote !== 'Available from staging smoke.' ||
        !storedPlayer.responseAt ||
        storedPlayer.deletedAt
      ) {
        throw new Error(`Unexpected stored match player: ${JSON.stringify(storedPlayer)}`);
      }
      if (!inviteNotification) {
        throw new Error('Match invite notification was not written for the linked guardian');
      }
      for (const action of [
        'club_match.create',
        'club_match.players.invite',
        'club_match.availability.respond',
        'club_match.me.read',
      ]) {
        if (!auditEvents.some((event) => event.action === action && event.result === 'SUCCESS')) {
          throw new Error(
            `Missing successful match audit action ${action}: ${JSON.stringify(auditEvents)}`,
          );
        }
      }

      return {
        clubId: staffMembership.clubId,
        clubRole: staffMembership.role,
        clubVisibility: staffMembership.club.visibility,
        matchId: createdMatchId,
        cancelledPreviousSmokeMatches: previousSmokeMatches.count,
        parentAggregateCount: parentMatches.payload.total,
        outsiderHidden: true,
      };
    });

    await check('group session create/publish/register/roster', async () => {
      const date = addDaysIso(24);
      const created = await requestJson<{ groupSession: { id: string; status: string } }>(app, {
        method: 'POST',
        url: '/v1/group-sessions',
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 201,
        payload: {
          coachId: coachLogin.user.id,
          title: `Codex smoke group ${Date.now()}`,
          description: 'Created by staging smoke.',
          sessionType: 'TRAINING',
          schedule: [{ date, startTime: '17:00', endTime: '18:00' }],
          maxParticipants: 12,
          pricePerParticipant: 10,
          currency: 'GBP',
          ageMin: 7,
          ageMax: 13,
          skillLevel: 'ALL',
          location: 'Clubroom staging pitch',
          waitlistEnabled: true,
          inviteType: 'OPEN',
        },
      });
      createdGroupSessionId = created.payload.groupSession.id;

      const published = await requestJson<{ groupSession: { id: string; status: string } }>(app, {
        method: 'PATCH',
        url: `/v1/group-sessions/${created.payload.groupSession.id}/publish`,
        headers: authHeaders(coachLogin, 'coach'),
      });

      const registration = await requestJson<{ registration: { id: string; status: string } }>(
        app,
        {
          method: 'POST',
          url: `/v1/group-sessions/${created.payload.groupSession.id}/register`,
          headers: authHeaders(parentLogin, 'parent'),
          payload: {
            athleteId: parentAthleteId,
            parentUserId: parentLogin.user.id,
          },
        },
      );
      createdRegistrationId = registration.payload.registration.id;

      const roster = await requestJson<{ total: number }>(app, {
        method: 'GET',
        url: `/v1/group-sessions/${created.payload.groupSession.id}/roster`,
        headers: authHeaders(coachLogin, 'coach'),
      });

      return {
        sessionId: published.payload.groupSession.id,
        sessionStatus: published.payload.groupSession.status,
        registrationId: registration.payload.registration.id,
        registrationStatus: registration.payload.registration.status,
        rosterTotal: roster.payload.total,
      };
    });

    await check('drill lifecycle db + audit readback', async () => {
      const auditStartedAt = new Date();
      const drillTitle = `${smokeDrillTitlePrefix} ${auditStartedAt.toISOString()}`;
      const updatedDrillTitle = `${drillTitle} updated`;
      const completionNote = `Completed by staging smoke ${auditStartedAt.toISOString()}`;

      const previousSmokeDrills = await prisma.drill.updateMany({
        where: {
          authorUserId: coachLogin.user.id,
          title: {
            startsWith: smokeDrillTitlePrefix,
          },
          deletedAt: null,
        },
        data: {
          active: false,
          deletedAt: auditStartedAt,
        },
      });

      await requestJson(app, {
        method: 'POST',
        url: '/v1/drills',
        headers: authHeaders(parentLogin, 'parent'),
        expectedStatus: 403,
        payload: {
          title: `${smokeDrillTitlePrefix} denied parent ${Date.now()}`,
          description: 'Parents must not author coach drill library rows.',
          category: 'TECHNIQUE',
          duration: 10,
          difficulty: 'BEGINNER',
        },
      });

      const created = await requestJson<{
        drill: { id: string; title: string; authorUserId: string; category?: string };
      }>(app, {
        method: 'POST',
        url: '/v1/drills',
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 201,
        payload: {
          coachId: coachLogin.user.id,
          title: drillTitle,
          description: 'Created by staging smoke drill lifecycle.',
          category: 'TECHNIQUE',
          duration: 16,
          difficulty: 'INTERMEDIATE',
          equipment: ['ball', 'cones'],
          tags: ['first-touch', 'smoke'],
        },
      });
      createdDrillId = created.payload.drill.id;
      if (
        created.payload.drill.authorUserId !== coachLogin.user.id ||
        created.payload.drill.title !== drillTitle
      ) {
        throw new Error(`Unexpected created drill payload: ${JSON.stringify(created.payload)}`);
      }

      const updated = await requestJson<{
        drill: { id: string; title: string; duration?: number; tags?: string[] };
      }>(app, {
        method: 'PATCH',
        url: `/v1/drills/${createdDrillId}`,
        headers: authHeaders(coachLogin, 'coach'),
        payload: {
          title: updatedDrillTitle,
          duration: 20,
          tags: ['updated', 'smoke'],
        },
      });
      if (updated.payload.drill.title !== updatedDrillTitle) {
        throw new Error(`Unexpected updated drill payload: ${JSON.stringify(updated.payload)}`);
      }

      const assigned = await requestJson<{
        assignment: {
          id: string;
          drillId: string;
          athleteId: string;
          coachUserId: string;
          status: string;
        };
      }>(app, {
        method: 'POST',
        url: '/v1/drill-assignments',
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 201,
        payload: {
          drillId: createdDrillId,
          athleteId: parentAthleteId,
          dueDate: addDaysIso(10),
          instructions: 'Complete the smoke drill and mark it done.',
          requiresEvidence: false,
        },
      });
      createdDrillAssignmentId = assigned.payload.assignment.id;
      if (
        assigned.payload.assignment.drillId !== createdDrillId ||
        assigned.payload.assignment.athleteId !== parentAthleteId ||
        assigned.payload.assignment.coachUserId !== coachLogin.user.id
      ) {
        throw new Error(`Unexpected drill assignment payload: ${JSON.stringify(assigned.payload)}`);
      }

      const completed = await requestJson<{
        assignment: { id: string; status: string };
        task: { drillAssignmentId?: string; status?: string };
      }>(app, {
        method: 'PATCH',
        url: `/v1/drill-assignments/${createdDrillAssignmentId}/completion`,
        headers: authHeaders(parentLogin, 'parent'),
        payload: {
          completed: true,
          completionNote,
        },
      });
      if (
        completed.payload.assignment.id !== createdDrillAssignmentId ||
        completed.payload.assignment.status !== 'SUBMITTED'
      ) {
        throw new Error(`Unexpected completion payload: ${JSON.stringify(completed.payload)}`);
      }

      const removedAssignment = await requestJson<{ removed: boolean }>(app, {
        method: 'DELETE',
        url: `/v1/drill-assignments/${createdDrillAssignmentId}`,
        headers: authHeaders(coachLogin, 'coach'),
      });
      if (removedAssignment.payload.removed !== true) {
        throw new Error(
          `Drill assignment removal did not return removed=true: ${JSON.stringify(
            removedAssignment.payload,
          )}`,
        );
      }

      const removedDrill = await requestJson<{ removed: boolean }>(app, {
        method: 'DELETE',
        url: `/v1/drills/${createdDrillId}`,
        headers: authHeaders(coachLogin, 'coach'),
      });
      if (removedDrill.payload.removed !== true) {
        throw new Error(
          `Drill removal did not return removed=true: ${JSON.stringify(removedDrill.payload)}`,
        );
      }

      const [storedDrill, storedAssignment, storedSubmission, auditEvents] = await Promise.all([
        prisma.drill.findUnique({
          where: { id: createdDrillId },
          select: { title: true, active: true, deletedAt: true },
        }),
        prisma.drillAssignment.findUnique({
          where: { id: createdDrillAssignmentId },
          select: { status: true, deletedAt: true, coachUserId: true, athleteId: true },
        }),
        prisma.assignmentSubmission.findFirst({
          where: { drillAssignmentId: createdDrillAssignmentId },
          select: { status: true, notes: true, submittedByUserId: true },
        }),
        prisma.auditEvent.findMany({
          where: {
            occurredAt: { gte: auditStartedAt },
            action: {
              in: [
                'drill.create',
                'drill.update',
                'drill.remove',
                'drill_assignment.create',
                'drill_assignment.completion_update',
                'drill_assignment.remove',
              ],
            },
            actorUserId: {
              in: [coachLogin.user.id, parentLogin.user.id],
            },
          },
          select: {
            action: true,
            resourceId: true,
            result: true,
            actorUserId: true,
            sensitiveRead: true,
          },
        }),
      ]);

      if (
        !storedDrill ||
        storedDrill.title !== updatedDrillTitle ||
        storedDrill.active !== false ||
        !storedDrill.deletedAt
      ) {
        throw new Error(`Drill was not soft-removed in DB: ${JSON.stringify(storedDrill)}`);
      }
      if (
        !storedAssignment ||
        storedAssignment.status !== 'SUBMITTED' ||
        !storedAssignment.deletedAt ||
        storedAssignment.coachUserId !== coachLogin.user.id ||
        storedAssignment.athleteId !== parentAthleteId
      ) {
        throw new Error(
          `Drill assignment was not completed and soft-removed in DB: ${JSON.stringify(
            storedAssignment,
          )}`,
        );
      }
      if (
        !storedSubmission ||
        storedSubmission.status !== 'SUBMITTED' ||
        storedSubmission.notes !== completionNote ||
        storedSubmission.submittedByUserId !== parentLogin.user.id
      ) {
        throw new Error(
          `Assignment submission did not persist guardian completion proof: ${JSON.stringify(
            storedSubmission,
          )}`,
        );
      }

      const auditResults = new Set(
        auditEvents.map((event) => `${event.action}:${event.result}:${event.actorUserId}`),
      );
      for (const expected of [
        `drill.create:DENY:${parentLogin.user.id}`,
        `drill.create:SUCCESS:${coachLogin.user.id}`,
        `drill.update:SUCCESS:${coachLogin.user.id}`,
        `drill.remove:SUCCESS:${coachLogin.user.id}`,
        `drill_assignment.create:SUCCESS:${coachLogin.user.id}`,
        `drill_assignment.completion_update:SUCCESS:${parentLogin.user.id}`,
        `drill_assignment.remove:SUCCESS:${coachLogin.user.id}`,
      ]) {
        if (!auditResults.has(expected)) {
          throw new Error(`Missing drill audit event ${expected}: ${JSON.stringify(auditEvents)}`);
        }
      }

      return {
        drillId: createdDrillId,
        assignmentId: createdDrillAssignmentId,
        completedByGuardian: true,
        drillSoftRemoved: true,
        assignmentSoftRemoved: true,
        cleanedPreviousSmokeDrills: previousSmokeDrills.count,
        auditedActions: auditEvents.length,
      };
    });

    await check('private upload signed write/read', async () => {
      const upload = await requestJson<{
        uploadSessionId: string;
        mediaObjectId: string;
        bucketName: string;
        storageKey: string;
        uploadUrl: string;
        uploadHeaders: Record<string, string>;
      }>(app, {
        method: 'POST',
        url: '/v1/uploads/init',
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 201,
        payload: {
          kind: 'DOCUMENT',
          contentType: 'text/plain',
          fileName: 'codex-api-smoke.txt',
          sizeBytes: 2,
          metadata: { source: 'staging-smoke' },
        },
      });

      const put = await fetch(upload.payload.uploadUrl, {
        method: 'PUT',
        headers: upload.payload.uploadHeaders,
        body: Buffer.from('ok'),
      });
      if (!put.ok) {
        throw new Error(`Signed upload failed: ${put.status} ${await put.text()}`);
      }

      const read = createSignedReadUrl({
        bucketName: upload.payload.bucketName,
        storageKey: upload.payload.storageKey,
        expiresInSeconds: 60,
      });
      const get = await fetch(read.url);
      const body = await get.text();
      if (!get.ok || body !== 'ok') {
        throw new Error(`Signed read failed: status=${get.status} body=${body}`);
      }

      return {
        uploadSessionId: upload.payload.uploadSessionId,
        mediaObjectId: upload.payload.mediaObjectId,
        bucketName: upload.payload.bucketName,
        uploadedAndReadBack: true,
      };
    });

    await check('community/media read surfaces', async () => {
      const [groups, posts, notifications, videos] = await Promise.all([
        requestJson<{ total: number }>(app, {
          method: 'GET',
          url: '/v1/community-groups',
          headers: authHeaders(parentLogin, 'parent'),
        }),
        requestJson<{ total: number }>(app, {
          method: 'GET',
          url: '/v1/posts',
          headers: authHeaders(parentLogin, 'parent'),
        }),
        requestJson<{ total: number }>(app, {
          method: 'GET',
          url: '/v1/me/notifications',
          headers: authHeaders(parentLogin, 'parent'),
        }),
        requestJson<{ total: number }>(app, {
          method: 'GET',
          url: `/v1/videos?athleteId=${encodeURIComponent(parentAthleteId)}`,
          headers: authHeaders(parentLogin, 'parent'),
        }),
      ]);
      return {
        groups: groups.payload.total,
        posts: posts.payload.total,
        notifications: notifications.payload.total,
        videos: videos.payload.total,
      };
    });

    await check('post-smoke db writes present', async () => {
      const [
        booking,
        invoice,
        groupSession,
        registration,
        payoutMethod,
        withdrawal,
        match,
        trustReport,
        safeguardingIncident,
        smokeClub,
        drill,
        drillAssignment,
        assignmentSubmission,
        sessionFeedback,
        feedbackHomeworkAssignment,
        feedbackHomeworkSubmission,
      ] = await Promise.all([
        createdBookingId ? prisma.booking.findUnique({ where: { id: createdBookingId } }) : null,
        createdInvoiceId ? prisma.invoice.findUnique({ where: { id: createdInvoiceId } }) : null,
        createdGroupSessionId
          ? prisma.groupSession.findUnique({ where: { id: createdGroupSessionId } })
          : null,
        createdRegistrationId
          ? prisma.groupSessionRegistration.findUnique({ where: { id: createdRegistrationId } })
          : null,
        createdPayoutMethodId
          ? prisma.coachPayoutMethod.findUnique({ where: { id: createdPayoutMethodId } })
          : null,
        createdWithdrawalId
          ? prisma.coachWithdrawal.findUnique({ where: { id: createdWithdrawalId } })
          : null,
        createdMatchId ? prisma.clubMatch.findUnique({ where: { id: createdMatchId } }) : null,
        createdTrustReportId
          ? prisma.safeguardingIncident.findUnique({ where: { id: createdTrustReportId } })
          : null,
        createdSafeguardingIncidentId
          ? prisma.safeguardingIncident.findUnique({
              where: { id: createdSafeguardingIncidentId },
            })
          : null,
        createdSmokeClubId ? prisma.club.findUnique({ where: { id: createdSmokeClubId } }) : null,
        createdDrillId
          ? prisma.drill.findUnique({
              where: { id: createdDrillId },
              select: { active: true, deletedAt: true },
            })
          : null,
        createdDrillAssignmentId
          ? prisma.drillAssignment.findUnique({
              where: { id: createdDrillAssignmentId },
              select: { status: true, deletedAt: true },
            })
          : null,
        createdDrillAssignmentId
          ? prisma.assignmentSubmission.findFirst({
              where: { drillAssignmentId: createdDrillAssignmentId },
              select: { status: true },
            })
          : null,
        createdSessionFeedbackId
          ? prisma.sessionFeedback.findUnique({
              where: { id: createdSessionFeedbackId },
              select: { id: true },
            })
          : null,
        createdFeedbackHomeworkAssignmentId
          ? prisma.drillAssignment.findUnique({
              where: { id: createdFeedbackHomeworkAssignmentId },
              select: { status: true },
            })
          : null,
        createdFeedbackHomeworkAssignmentId
          ? prisma.assignmentSubmission.findFirst({
              where: { drillAssignmentId: createdFeedbackHomeworkAssignmentId },
              select: { status: true },
            })
          : null,
      ]);

      return {
        booking: booking?.status,
        invoice: invoice?.status,
        groupSession: groupSession?.status,
        registration: registration?.status,
        payoutMethodSoftRemoved: Boolean(payoutMethod?.deletedAt),
        withdrawal: withdrawal?.status,
        match: match?.status,
        trustReport: trustReport?.status,
        safeguardingIncident: safeguardingIncident?.status,
        smokeClubArchived: Boolean(smokeClub?.deletedAt),
        drillSoftRemoved: Boolean(drill?.deletedAt) && drill?.active === false,
        drillAssignment: drillAssignment?.status,
        drillAssignmentSoftRemoved: Boolean(drillAssignment?.deletedAt),
        assignmentSubmission: assignmentSubmission?.status,
        sessionFeedback: Boolean(sessionFeedback),
        feedbackHomeworkAssignment: feedbackHomeworkAssignment?.status,
        feedbackHomeworkSubmission: feedbackHomeworkSubmission?.status,
        seedContext,
      };
    });
  } finally {
    await app.close();
    await prisma.$disconnect();
  }

  const summary = {
    status: results.some((result) => result.status === 'fail')
      ? 'failed'
      : results.some((result) => result.status === 'warn')
        ? 'passed-with-warnings'
        : 'passed',
    passed: results.filter((result) => result.status === 'pass').length,
    warnings: results.filter((result) => result.status === 'warn').length,
    failed: results.filter((result) => result.status === 'fail').length,
    results,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

void main();
