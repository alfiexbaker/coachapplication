import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import {
  athleteSkillHistoryResponseSchema,
  athleteSkillUpdateResponseSchema,
  practiceLogListResponseSchema,
  practiceLogMutationResponseSchema,
  practiceLogTodayResponseSchema,
} from '@clubroom/shared-contracts';
import { cleanupStagingSmokeArtifacts } from './staging-smoke-artifact-cleanup.js';
import { localDateTimeToUtc } from '../src/lib/time-zone.js';

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

interface StagingTestAccountCredential {
  email: string;
  password: string;
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
const stagingCredentialsPath = path.join(
  repoRoot,
  'docs/backend-api/test-data/TEST_ACCOUNTS.staging.local.txt',
);
const results: SmokeResult[] = [];
const smokeBookingNotes = 'Created by apps/api/scripts/staging-smoke.ts';
const smokeDeliveryProofNote = 'Delivered and ready for launch-loop proof';
const smokeGuardianInviteMessage = 'Created by apps/api/scripts/staging-smoke.ts guardian invite';
const smokeTrustReportDescription = 'Created by apps/api/scripts/staging-smoke.ts trust report';
const smokeSafeguardingDetails =
  'Created by apps/api/scripts/staging-smoke.ts safeguarding incident';
const smokeClubNamePrefix = 'Codex smoke club';
const smokeMatchTitlePrefix = 'Codex smoke match';
const smokeEventTitlePrefix = 'Codex smoke event';
const smokeDrillTitlePrefix = 'Codex smoke drill';
const defaultDatabaseConnectionLimit = '2';
const stagingEnvironment = 'staging';
const environmentKeys = [
  'APP_ENV',
  'API_ENV',
  'CLUBROOM_ENV',
  'EXPO_PUBLIC_ENV',
  'SENTRY_ENVIRONMENT',
  'VERCEL_ENV',
] as const;
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

function loadStagingTestAccountCredential(email: string): StagingTestAccountCredential {
  const mode = fs.statSync(stagingCredentialsPath).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new Error('Staging credential file must be owner-only (0600)');
  }
  const account = fs
    .readFileSync(stagingCredentialsPath, 'utf8')
    .split(/\n\s*\n/)
    .map((block) => ({
      email: /^Email:\s*(.+)$/m.exec(block)?.[1]?.trim(),
      password: /^Password:\s*(.+)$/m.exec(block)?.[1],
    }))
    .find((candidate) => candidate.email === email && candidate.password);
  if (!account?.email || !account.password) {
    throw new Error(`Missing staging test credential for ${email}`);
  }
  return {
    email: account.email,
    password: account.password,
  };
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

function normalizeEnvironment(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function assertStagingSmokeAllowed(): void {
  const target = normalizeEnvironment(
    process.env.EXPO_PUBLIC_ENV ?? process.env.SENTRY_ENVIRONMENT,
  );
  if (target !== stagingEnvironment) {
    throw new Error('Refusing to run staging smoke unless the configured target is staging');
  }

  const productionHint = environmentKeys.find(
    (key) => normalizeEnvironment(process.env[key]) === 'production',
  );
  if (productionHint) {
    throw new Error(`Refusing to run staging smoke with ${productionHint}=production`);
  }

  const rawDatabaseUrl = process.env.DATABASE_URL;
  if (!rawDatabaseUrl) {
    throw new Error('Refusing to run staging smoke without DATABASE_URL');
  }
  if (/\bprod(?:uction)?\b/i.test(rawDatabaseUrl)) {
    throw new Error('Refusing to run staging smoke against a production-looking DATABASE_URL');
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
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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
  assertStagingSmokeAllowed();
  configureSmokeDatabaseUrl();
  process.env.PRISMA_CLIENT_ENGINE_TYPE = process.env.PRISMA_CLIENT_ENGINE_TYPE ?? 'binary';

  const [
    { buildApp },
    { getPrismaClient },
    { createSignedReadUrl, deletePrivateStorageObject },
    {
      assertClamAvAvailable,
      claimPendingUploadScans,
      createProductionScanDependencies,
      processClaimedUploadScan,
      readUploadScannerWorkerConfig,
    },
    {
      removeUploadScannerHeartbeat,
      writeUploadScannerHeartbeat,
    },
  ] = await Promise.all([
    import('../src/app.js'),
    import('@clubroom/db'),
    import('../src/lib/storage-runtime.js'),
    import('../src/lib/upload-scanner-worker.js'),
    import('../src/lib/upload-scanner-heartbeat.js'),
  ]);

  const prisma = getPrismaClient();
  const scanConfig = readUploadScannerWorkerConfig();
  const scannerVersion = await assertClamAvAvailable({
    command: scanConfig.command,
    databaseDir: scanConfig.databaseDir,
    timeoutMs: Math.min(scanConfig.scanTimeoutMs, 120_000),
    maxDefinitionAgeHours: scanConfig.maxDefinitionAgeHours,
  });
  const scannerIdentity = `clamav:${scannerVersion}`.slice(0, 120);
  const smokeWorkerId = `staging-smoke:${process.pid}:${crypto.randomUUID()}`;
  await writeUploadScannerHeartbeat({
    prisma,
    workerId: smokeWorkerId,
    status: 'READY',
    version: scannerIdentity,
    metadata: { source: 'staging-smoke' },
  });
  const app = buildApp({ allowTestAuthHeaders: false });
  await app.ready();

  let coachLogin: LoginResult | undefined;
  let parentLogin: LoginResult | undefined;
  let spareGuardianLogin: LoginResult | undefined;
  let parentAthleteId: string | undefined;
  let parentFamilyId: string | undefined;
  let unrelatedAthleteId: string | undefined;
  let createdBookingId: string | undefined;
  let createdBookingStepAnalyticsEventId: string | undefined;
  let createdInvoiceId: string | undefined;
  let createdGroupSessionId: string | undefined;
  let createdRegistrationId: string | undefined;
  let createdGroupThreadId: string | undefined;
  let createdThreadMessageId: string | undefined;
  let createdPayoutMethodId: string | undefined;
  let createdWithdrawalId: string | undefined;
  let createdMatchId: string | undefined;
  let createdEventId: string | undefined;
  let createdEventRsvpId: string | undefined;
  let createdEventAttendanceId: string | undefined;
  let createdTrustReportId: string | undefined;
  let createdSafeguardingIncidentId: string | undefined;
  let createdSmokeClubId: string | undefined;
  let createdStaffingProofClubId: string | undefined;
  let createdDrillId: string | undefined;
  let createdDrillAssignmentId: string | undefined;
  let createdSessionFeedbackId: string | undefined;
  let createdFeedbackHomeworkAssignmentId: string | undefined;
  let uploadSmokeArtifact:
    | {
        uploadSessionId: string;
        mediaObjectId: string;
        bucketName: string;
        stagingStorageKey: string;
        sealedStorageKey?: string;
        videoId?: string;
        annotationId?: string;
      }
    | undefined;

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
      const credential = loadStagingTestAccountCredential('amelia.shaw@clubroom.demo');
      const login = await requestJson<LoginResult>(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: credential,
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
      const credential = loadStagingTestAccountCredential('olivia.barton@clubroom.demo');
      const login = await requestJson<LoginResult>(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: credential,
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
      const credential = loadStagingTestAccountCredential('ava.cole@clubroom.demo');
      const login = await requestJson<LoginResult>(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: credential,
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

    await check('family authority squad membership read + DB audit', async () => {
      const credential = loadStagingTestAccountCredential('daniel.reed@clubroom.demo');
      const login = await requestJson<LoginResult>(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: credential,
      });
      const familyMemberships = await prisma.familyMembership.findMany({
        where: {
          userId: login.payload.user.id,
          deletedAt: null,
          family: {
            deletedAt: null,
          },
        },
        select: {
          role: true,
          permissions: true,
          family: {
            select: {
              primaryGuardianUserId: true,
              guardianChildLinks: {
                where: {
                  deletedAt: null,
                },
                select: {
                  athleteId: true,
                  guardianUserId: true,
                },
              },
            },
          },
        },
      });
      const authorityMembership = familyMemberships.find((membership) => {
        const role = membership.role.toLowerCase();
        return (
          role === 'owner' ||
          role === 'admin' ||
          membership.family.primaryGuardianUserId === login.payload.user.id ||
          membership.permissions.some((permission) => permission.toLowerCase() === 'admin')
        );
      });
      if (!authorityMembership) {
        throw new Error('Expected an active family authority membership for the smoke actor');
      }
      const familyAthleteId = [
        ...new Set(authorityMembership.family.guardianChildLinks.map((link) => link.athleteId)),
      ].find(
        (athleteId) =>
          !authorityMembership.family.guardianChildLinks.some(
            (link) => link.athleteId === athleteId && link.guardianUserId === login.payload.user.id,
          ),
      );
      if (!familyAthleteId) {
        throw new Error('Expected a family athlete without a direct guardian link');
      }

      const auditStartedAt = new Date();
      const response = await requestJson<{
        athleteId: string;
        memberships: Array<{ id: string }>;
      }>(app, {
        method: 'GET',
        url: `/v1/athletes/${familyAthleteId}/squad-memberships`,
        headers: authHeaders(login.payload, 'parent'),
      });
      const [directLinkCount, audit] = await Promise.all([
        prisma.guardianChildLink.count({
          where: {
            athleteId: familyAthleteId,
            guardianUserId: login.payload.user.id,
            deletedAt: null,
          },
        }),
        prisma.auditEvent.findFirst({
          where: {
            occurredAt: { gte: auditStartedAt },
            actorUserId: login.payload.user.id,
            action: 'athlete_squad_membership.list',
            resourceId: familyAthleteId,
            result: 'SUCCESS',
            sensitiveRead: true,
          },
          select: {
            id: true,
          },
        }),
      ]);
      if (directLinkCount !== 0 || !audit) {
        throw new Error(
          `Family authority proof failed: directLinks=${directLinkCount} audit=${Boolean(audit)}`,
        );
      }
      return {
        status: response.statusCode,
        membershipCount: response.payload.memberships.length,
        directLinkCount,
        audited: true,
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

    await check('user directory privacy + audit readback', async () => {
      const auditStartedAt = new Date();
      const headers = authHeaders(parentLogin, 'parent');
      const search = await requestJson<{
        users: Array<Record<string, unknown> & { id: string; email?: string; role: string }>;
        total: number;
        seedVersion: string | null;
        requestId: string;
      }>(app, {
        method: 'GET',
        url: `/v1/users/search?q=${encodeURIComponent(coachLogin.user.email)}&limit=1`,
        headers,
      });
      const searchedCoach = search.payload.users[0];
      if (
        search.payload.total !== 1 ||
        search.payload.users.length !== 1 ||
        searchedCoach?.id !== coachLogin.user.id ||
        searchedCoach.email !== coachLogin.user.email ||
        'dateOfBirth' in searchedCoach
      ) {
        throw new Error(`Unexpected user search projection: ${JSON.stringify(search.payload)}`);
      }

      const profile = await requestJson<{
        user: Record<string, unknown> & { id: string; email?: string };
        seedVersion: string | null;
        requestId: string;
      }>(app, {
        method: 'GET',
        url: `/v1/users/${coachLogin.user.id}`,
        headers,
      });
      if (
        profile.payload.user.id !== coachLogin.user.id ||
        profile.payload.user.email !== undefined ||
        'dateOfBirth' in profile.payload.user
      ) {
        throw new Error(`Unexpected user profile projection: ${JSON.stringify(profile.payload)}`);
      }

      await requestJson(app, {
        method: 'GET',
        url: `/v1/users/search?q=${encodeURIComponent(coachLogin.user.email)}&actorUserId=usr_forged`,
        headers,
        expectedStatus: 400,
      });

      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          actorUserId: parentLogin.user.id,
          occurredAt: { gte: auditStartedAt },
          action: { in: ['users.search', 'users.profile.read'] },
        },
        select: { action: true, result: true, metadataJson: true },
      });
      const successfulSearches = auditEvents.filter(
        (event) => event.action === 'users.search' && event.result === 'SUCCESS',
      );
      const deniedSearches = auditEvents.filter((event) => {
        const metadata = event.metadataJson as { errorCode?: string } | null;
        return (
          event.action === 'users.search' &&
          event.result === 'DENY' &&
          metadata?.errorCode === 'VALIDATION_FAILED'
        );
      });
      const successfulProfiles = auditEvents.filter(
        (event) => event.action === 'users.profile.read' && event.result === 'SUCCESS',
      );
      if (
        successfulSearches.length !== 1 ||
        deniedSearches.length !== 1 ||
        successfulProfiles.length !== 1 ||
        auditEvents.some((event) =>
          JSON.stringify(event.metadataJson).includes(coachLogin.user.email),
        )
      ) {
        throw new Error(`Unexpected user directory audit proof: ${JSON.stringify(auditEvents)}`);
      }

      return {
        exactEmailLookup: true,
        profileEmailRedacted: true,
        dateOfBirthExcluded: true,
        validationDenied: true,
        rawQueryExcludedFromAudit: true,
        auditedActions: auditEvents.length,
      };
    });

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

        const auditResults = new Set(auditEvents.map((event) => `${event.action}:${event.result}`));
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

    await check('cleanup previous smoke artifacts', async () =>
      cleanupStagingSmokeArtifacts(prisma, coachLogin.user.id),
    );

    await check('direct message block scope db + audit readback', async () => {
      const suffix = crypto.randomUUID();
      const threadId = `thr_staging_block_scope_${suffix}`;
      const deniedIdempotencyKey = `staging-blocked-direct-${suffix}`;
      const sharedIdempotencyKey = `staging-shared-thread-${suffix}`;
      const startedAt = new Date();
      const originalBlock = await prisma.userBlock.findUnique({
        where: {
          blockerUserId_blockedUserId: {
            blockerUserId: parentLogin.user.id,
            blockedUserId: coachLogin.user.id,
          },
        },
      });

      try {
        await prisma.messageThread.create({
          data: {
            id: threadId,
            threadType: 'DIRECT',
            title: 'Staging block scope proof',
            createdByUserId: parentLogin.user.id,
            updatedByUserId: parentLogin.user.id,
            participants: {
              create: [
                {
                  id: `mpt_staging_parent_${suffix}`,
                  userId: parentLogin.user.id,
                  role: 'MEMBER',
                },
                {
                  id: `mpt_staging_coach_${suffix}`,
                  userId: coachLogin.user.id,
                  role: 'MEMBER',
                },
              ],
            },
          },
        });

        await requestJson(app, {
          method: 'POST',
          url: '/v1/blocks',
          headers: authHeaders(parentLogin, 'parent'),
          expectedStatus: 201,
          payload: { blockedUserId: coachLogin.user.id },
        });

        const denied = await requestJson(app, {
          method: 'POST',
          url: `/v1/message-threads/${threadId}/messages`,
          headers: authHeaders(parentLogin, 'parent'),
          expectedStatus: 409,
          payload: {
            body: 'This direct message must not be stored.',
            idempotencyKey: deniedIdempotencyKey,
          },
        });

        await prisma.messageThread.update({
          where: { id: threadId },
          data: { threadType: 'GROUP' },
        });
        const shared = await requestJson<{ message: { id: string; content: string } }>(app, {
          method: 'POST',
          url: `/v1/message-threads/${threadId}/messages`,
          headers: authHeaders(parentLogin, 'parent'),
          expectedStatus: 201,
          payload: {
            body: 'Shared group threads remain available to participants.',
            idempotencyKey: sharedIdempotencyKey,
          },
        });

        const [storedMessages, denyAudit, successAudit] = await Promise.all([
          prisma.message.findMany({
            where: { messageThreadId: threadId },
            select: { id: true, content: true },
          }),
          prisma.auditEvent.findFirst({
            where: {
              action: 'community.thread-message.create',
              resourceId: threadId,
              result: 'DENY',
              occurredAt: { gte: startedAt },
            },
            orderBy: { occurredAt: 'desc' },
          }),
          prisma.auditEvent.findFirst({
            where: {
              action: 'community.thread-message.create',
              resourceId: shared.payload.message.id,
              result: 'SUCCESS',
              occurredAt: { gte: startedAt },
            },
            orderBy: { occurredAt: 'desc' },
          }),
        ]);
        if (
          denied.statusCode !== 409 ||
          storedMessages.length !== 1 ||
          storedMessages[0]?.id !== shared.payload.message.id ||
          storedMessages[0]?.content !== shared.payload.message.content ||
          !denyAudit ||
          !successAudit
        ) {
          throw new Error(
            `Unexpected direct-message block scope proof: ${JSON.stringify({
              deniedStatus: denied.statusCode,
              storedMessages,
              denyAuditId: denyAudit?.id ?? null,
              successAuditId: successAudit?.id ?? null,
            })}`,
          );
        }

        return {
          deniedStatus: denied.statusCode,
          sharedStatus: shared.statusCode,
          storedMessageCount: storedMessages.length,
          auditActions: [denyAudit.action, successAudit.action],
        };
      } finally {
        await prisma.$transaction([
          prisma.messageReceipt.deleteMany({
            where: { message: { messageThreadId: threadId } },
          }),
          prisma.message.deleteMany({ where: { messageThreadId: threadId } }),
          prisma.messageParticipant.deleteMany({ where: { messageThreadId: threadId } }),
          prisma.messageThread.deleteMany({ where: { id: threadId } }),
          prisma.idempotencyKey.deleteMany({
            where: {
              userId: parentLogin.user.id,
              endpointKey: 'community.thread-message.create',
              idempotencyKey: { in: [deniedIdempotencyKey, sharedIdempotencyKey] },
            },
          }),
        ]);
        if (originalBlock) {
          await prisma.userBlock.update({
            where: { id: originalBlock.id },
            data: {
              deletedAt: originalBlock.deletedAt,
              deletedByUserId: originalBlock.deletedByUserId,
              updatedAt: originalBlock.updatedAt,
            },
          });
        } else {
          await prisma.userBlock.deleteMany({
            where: {
              blockerUserId: parentLogin.user.id,
              blockedUserId: coachLogin.user.id,
            },
          });
        }
      }
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
          bookedCount: number;
          maxBookings: number;
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
      await check('blocked booking paths denial + audit readback', async () => {
        const auditStartedAt = new Date();
        const scheduledAt = scheduledAtFromSlot(selectedSlot);
        let blockCreated = false;
        const bookingFilter = {
          coachUserId: coachLogin.user.id,
          bookedByUserId: parentLogin.user.id,
          notes: 'Codex staging blocked booking denial',
          createdAt: { gte: auditStartedAt },
        } as const;

        try {
          await requestJson(app, {
            method: 'POST',
            url: '/v1/blocks',
            headers: authHeaders(parentLogin, 'parent'),
            expectedStatus: 201,
            payload: { blockedUserId: coachLogin.user.id },
          });
          blockCreated = true;

          const deniedBooking = await requestJson(app, {
            method: 'POST',
            url: '/v1/bookings',
            headers: authHeaders(parentLogin, 'parent'),
            expectedStatus: 409,
            payload: {
              coachUserId: coachLogin.user.id,
              athleteIds: [parentAthleteId],
              bookedByUserId: parentLogin.user.id,
              scheduledAt,
              durationMinutes: 60,
              location: selectedSlot.location ?? 'Clubroom staging pitch',
              serviceType: 'one_to_one',
              objectives: ['Blocked relationship denial proof'],
              notes: bookingFilter.notes,
              priceMinor: 2500,
              currency: 'GBP',
              idempotencyKey: `staging-smoke-blocked-booking-${crypto.randomUUID()}`,
            },
          });
          const deniedSeries = await requestJson(app, {
            method: 'POST',
            url: '/v1/booking-series',
            headers: authHeaders(parentLogin, 'parent'),
            expectedStatus: 409,
            payload: {
              coachUserId: coachLogin.user.id,
              athleteIds: [parentAthleteId],
              bookedByUserId: parentLogin.user.id,
              occurrences: [
                {
                  scheduledAt,
                  durationMinutes: 60,
                  location: selectedSlot.location ?? 'Clubroom staging pitch',
                },
              ],
              location: selectedSlot.location ?? 'Clubroom staging pitch',
              serviceType: 'one_to_one',
              objectives: ['Blocked relationship series denial proof'],
              notes: 'Codex staging blocked booking series denial',
              priceMinor: 2500,
              currency: 'GBP',
              frequency: 'CUSTOM',
              idempotencyKey: `staging-smoke-blocked-series-${crypto.randomUUID()}`,
            },
          });
          const deniedInvite = await requestJson(app, {
            method: 'POST',
            url: '/v1/invites',
            headers: authHeaders(coachLogin, 'coach'),
            expectedStatus: 409,
            payload: {
              coachUserId: coachLogin.user.id,
              parentUserId: parentLogin.user.id,
              athleteIds: [parentAthleteId],
              proposedSlots: [selectedSlot],
              sessionType: 'one_to_one',
              focus: 'Blocked relationship invite denial proof',
              notes: 'Codex staging blocked invite denial',
              durationMinutes: 60,
              priceMinor: 2500,
              currency: 'GBP',
              idempotencyKey: `staging-smoke-blocked-invite-${crypto.randomUUID()}`,
            },
          });

          const [persistedBookingCount, persistedSeriesCount, persistedInviteCount, deniedAudits] =
            await Promise.all([
              prisma.booking.count({ where: bookingFilter }),
              prisma.recurringSeries.count({
                where: {
                  coachUserId: coachLogin.user.id,
                  bookedByUserId: parentLogin.user.id,
                  notes: 'Codex staging blocked booking series denial',
                  createdAt: { gte: auditStartedAt },
                },
              }),
              prisma.invite.count({
                where: {
                  senderUserId: coachLogin.user.id,
                  createdAt: { gte: auditStartedAt },
                },
              }),
              prisma.auditEvent.findMany({
                where: {
                  action: { in: ['booking.create', 'booking_series.create', 'invite.create'] },
                  result: 'DENY',
                  occurredAt: { gte: auditStartedAt },
                },
                orderBy: { occurredAt: 'desc' },
              }),
            ]);
          const auditActions = new Set(
            deniedAudits.flatMap((audit) => {
              const metadata = audit.metadataJson as { reason?: string } | null | undefined;
              return metadata?.reason === 'active_block_relationship' ? [audit.action] : [];
            }),
          );
          if (
            persistedBookingCount !== 0 ||
            persistedSeriesCount !== 0 ||
            persistedInviteCount !== 0 ||
            !['booking.create', 'booking_series.create', 'invite.create'].every((action) =>
              auditActions.has(action),
            )
          ) {
            throw new Error(
              `Blocked booking-path denials were not persisted correctly: ${JSON.stringify({
                statusCodes: [
                  deniedBooking.statusCode,
                  deniedSeries.statusCode,
                  deniedInvite.statusCode,
                ],
                persistedBookingCount,
                persistedSeriesCount,
                persistedInviteCount,
                auditActions: [...auditActions],
              })}`,
            );
          }

          return {
            statusCodes: {
              booking: deniedBooking.statusCode,
              bookingSeries: deniedSeries.statusCode,
              invite: deniedInvite.statusCode,
            },
            persistedBookingCount,
            persistedSeriesCount,
            persistedInviteCount,
            auditActions: [...auditActions].sort(),
          };
        } finally {
          if (blockCreated) {
            await requestJson(app, {
              method: 'DELETE',
              url: `/v1/blocks?blockedUserId=${encodeURIComponent(coachLogin.user.id)}`,
              headers: authHeaders(parentLogin, 'parent'),
            });
          }
        }
      });
    } else {
      results.push({
        name: 'blocked booking paths denial + audit readback',
        status: 'fail',
        error: 'Skipped because no available coach slot was resolved.',
      });
    }

    if (selectedSlot) {
      await check('booking request decline + withdraw + expiry', async () => {
        const scheduledAt = scheduledAtFromSlot(selectedSlot);
        const bookingPayload = {
          coachUserId: coachLogin.user.id,
          athleteIds: [parentAthleteId],
          bookedByUserId: parentLogin.user.id,
          scheduledAt,
          durationMinutes: 60,
          location: selectedSlot.location ?? 'Clubroom staging pitch',
          serviceType: 'one_to_one',
          objectives: ['Codex staging request lifecycle'],
          notes: smokeBookingNotes,
          priceMinor: 2500,
          currency: 'GBP',
        };
        const createRequest = async (label: string) => {
          const created = await requestJson<{
            id: string;
            status: string;
            version: number;
            requestExpiresAt: string | null;
          }>(app, {
            method: 'POST',
            url: '/v1/bookings',
            headers: authHeaders(parentLogin, 'parent'),
            expectedStatus: 201,
            payload: {
              ...bookingPayload,
              idempotencyKey: `staging-smoke-request-${label}-${crypto.randomUUID()}`,
            },
          });
          if (
            created.payload.status !== 'AWAITING_CONFIRMATION' ||
            created.payload.version !== 1 ||
            !created.payload.requestExpiresAt
          ) {
            throw new Error(
              `Unexpected ${label} request create state: ${JSON.stringify(created.payload)}`,
            );
          }
          return created.payload;
        };
        const assertPersistedResolution = async (params: {
          bookingId: string;
          status: 'DECLINED' | 'WITHDRAWN' | 'EXPIRED';
          sourceType: string;
          auditAction: string;
        }) => {
          const [persisted, notifications, audits, invoiceCount] = await Promise.all([
            prisma.booking.findUnique({
              where: { id: params.bookingId },
              include: { statusEvents: { orderBy: { occurredAt: 'asc' } } },
            }),
            prisma.notification.findMany({
              where: { sourceType: params.sourceType, sourceId: params.bookingId },
            }),
            prisma.auditEvent.findMany({
              where: {
                action: params.auditAction,
                resourceId: params.bookingId,
                result: 'SUCCESS',
              },
            }),
            prisma.invoice.count({ where: { bookingId: params.bookingId, deletedAt: null } }),
          ]);
          const resolutionEvent = persisted?.statusEvents.find(
            (event) => event.toStatus === params.status,
          );
          if (
            persisted?.status !== params.status ||
            !persisted.requestResolvedAt ||
            !persisted.requestResolutionReason ||
            persisted.cancelledAt ||
            persisted.cancelledByUserId ||
            persisted.cancelReason ||
            persisted.cancellationFeeMinor !== null ||
            !resolutionEvent ||
            notifications.length < 1 ||
            audits.length < 1 ||
            invoiceCount !== 0
          ) {
            throw new Error(
              `Booking request ${params.status.toLowerCase()} persistence proof failed: ${JSON.stringify(
                {
                  status: persisted?.status ?? null,
                  requestResolvedAt: persisted?.requestResolvedAt?.toISOString() ?? null,
                  requestResolutionReason: persisted?.requestResolutionReason ?? null,
                  cancelledAt: persisted?.cancelledAt?.toISOString() ?? null,
                  cancellationFeeMinor: persisted?.cancellationFeeMinor ?? null,
                  hasResolutionEvent: Boolean(resolutionEvent),
                  notificationCount: notifications.length,
                  auditCount: audits.length,
                  invoiceCount,
                },
              )}`,
            );
          }
          return {
            status: persisted.status,
            version: Number(persisted.version),
            notificationCount: notifications.length,
            auditCount: audits.length,
          };
        };
        const assertSlotReleased = async () => {
          const start = addDaysIso(2);
          const end = addDaysIso(21);
          const availability = await requestJson<{
            slots: Array<{
              date: string;
              startTime: string;
              bookedCount: number;
              isAvailable: boolean;
            }>;
          }>(app, {
            method: 'GET',
            url: `/v1/coaches/${coachLogin.user.id}/availability/slots?start=${start}&end=${end}&durationMinutes=60&applySchedulingRules=true&excludePendingInvites=true`,
            headers: authHeaders(parentLogin, 'parent'),
          });
          const slot = availability.payload.slots.find(
            (candidate) =>
              candidate.date === selectedSlot.date &&
              candidate.startTime === selectedSlot.startTime,
          );
          if (
            !slot ||
            !slot.isAvailable ||
            slot.bookedCount !== selectedSlot.bookedCount
          ) {
            throw new Error(
              `Resolved request did not release slot capacity: ${JSON.stringify({
                expectedBookedCount: selectedSlot.bookedCount,
                slot: slot ?? null,
              })}`,
            );
          }
        };

        const declinedRequest = await createRequest('decline');
        await requestJson(app, {
          method: 'POST',
          url: `/v1/bookings/${declinedRequest.id}/decline`,
          headers: authHeaders(parentLogin, 'parent'),
          expectedStatus: 403,
          payload: {
            reason: 'Parent cannot decline a coach-owned request',
            expectedVersion: declinedRequest.version,
            idempotencyKey: `staging-smoke-parent-decline-${crypto.randomUUID()}`,
          },
        });
        const declineIdempotencyKey = `staging-smoke-coach-decline-${crypto.randomUUID()}`;
        const declinePayload = {
          reason: 'Coach is unavailable for this request',
          note: 'Verified by Clubroom staging smoke.',
          expectedVersion: declinedRequest.version,
          idempotencyKey: declineIdempotencyKey,
        };
        const declined = await requestJson<{ id: string; status: string; version: number }>(app, {
          method: 'POST',
          url: `/v1/bookings/${declinedRequest.id}/decline`,
          headers: authHeaders(coachLogin, 'coach'),
          payload: declinePayload,
        });
        const declineReplay = await requestJson<{ id: string; status: string; version: number }>(
          app,
          {
            method: 'POST',
            url: `/v1/bookings/${declinedRequest.id}/decline`,
            headers: authHeaders(coachLogin, 'coach'),
            payload: declinePayload,
          },
        );
        if (
          declined.payload.status !== 'DECLINED' ||
          declined.payload.version !== 2 ||
          JSON.stringify(declineReplay.payload) !== JSON.stringify(declined.payload)
        ) {
          throw new Error(
            `Unexpected decline or replay response: ${JSON.stringify({
              declined: declined.payload,
              replay: declineReplay.payload,
            })}`,
          );
        }
        const declineProof = await assertPersistedResolution({
          bookingId: declinedRequest.id,
          status: 'DECLINED',
          sourceType: 'booking_request_declined',
          auditAction: 'booking.request.decline',
        });
        await assertSlotReleased();

        const withdrawnRequest = await createRequest('withdraw');
        await requestJson(app, {
          method: 'POST',
          url: `/v1/bookings/${withdrawnRequest.id}/withdraw`,
          headers: authHeaders(coachLogin, 'coach'),
          expectedStatus: 403,
          payload: {
            reason: 'Coach cannot withdraw a family request',
            expectedVersion: withdrawnRequest.version,
            idempotencyKey: `staging-smoke-coach-withdraw-${crypto.randomUUID()}`,
          },
        });
        const withdrawn = await requestJson<{ id: string; status: string; version: number }>(app, {
          method: 'POST',
          url: `/v1/bookings/${withdrawnRequest.id}/withdraw`,
          headers: authHeaders(parentLogin, 'parent'),
          payload: {
            reason: 'Family plans changed before confirmation',
            note: 'Verified by Clubroom staging smoke.',
            expectedVersion: withdrawnRequest.version,
            idempotencyKey: `staging-smoke-parent-withdraw-${crypto.randomUUID()}`,
          },
        });
        if (withdrawn.payload.status !== 'WITHDRAWN' || withdrawn.payload.version !== 2) {
          throw new Error(`Unexpected withdrawal response: ${JSON.stringify(withdrawn.payload)}`);
        }
        const withdrawProof = await assertPersistedResolution({
          bookingId: withdrawnRequest.id,
          status: 'WITHDRAWN',
          sourceType: 'booking_request_withdrawn',
          auditAction: 'booking.request.withdraw',
        });
        await assertSlotReleased();

        const expiringRequest = await createRequest('expire');
        await prisma.booking.update({
          where: { id: expiringRequest.id },
          data: { requestExpiresAt: new Date(Date.now() - 60_000) },
        });
        const expired = await requestJson<{
          id: string;
          status: string;
          version: number;
          requestResolutionReason: string | null;
        }>(app, {
          method: 'GET',
          url: `/v1/bookings/${expiringRequest.id}`,
          headers: authHeaders(parentLogin, 'parent'),
        });
        if (
          expired.payload.status !== 'EXPIRED' ||
          expired.payload.version !== 2 ||
          expired.payload.requestResolutionReason !== 'Coach confirmation window expired'
        ) {
          throw new Error(`Unexpected expiry response: ${JSON.stringify(expired.payload)}`);
        }
        const expiryProof = await assertPersistedResolution({
          bookingId: expiringRequest.id,
          status: 'EXPIRED',
          sourceType: 'booking_request_expired',
          auditAction: 'booking.request.expire',
        });
        await assertSlotReleased();

        return {
          decline: declineProof,
          withdraw: withdrawProof,
          expiry: expiryProof,
          slotCapacityReleased: true,
          invoiceOrCancellationSideEffects: false,
        };
      });

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
      ? await check('direct booking capacity + coach confirmation', async () => {
          const scheduledAt = scheduledAtFromSlot(selectedSlot);
          const remainingCapacity = selectedSlot.maxBookings - selectedSlot.bookedCount;
          if (!Number.isInteger(remainingCapacity) || remainingCapacity < 1) {
            throw new Error(`Selected slot has invalid capacity: ${JSON.stringify(selectedSlot)}`);
          }
          const bookingPayload = {
            coachUserId: coachLogin.user.id,
            athleteIds: [parentAthleteId],
            bookedByUserId: parentLogin.user.id,
            scheduledAt,
            durationMinutes: 60,
            location: selectedSlot.location ?? 'Clubroom staging pitch',
            serviceType: 'one_to_one',
            objectives: ['Codex staging smoke'],
            notes: smokeBookingNotes,
            priceMinor: 2500,
            currency: 'GBP',
          };
          for (let index = 1; index < remainingCapacity; index += 1) {
            await requestJson(app, {
              method: 'POST',
              url: '/v1/bookings',
              headers: authHeaders(parentLogin, 'parent'),
              expectedStatus: 201,
              payload: {
                ...bookingPayload,
                idempotencyKey: `staging-smoke-capacity-fill-${crypto.randomUUID()}`,
              },
            });
          }
          const attempts = await Promise.all(
            ['first', 'second'].map((label) =>
              requestJson<{ id?: string; status?: string; version?: number }>(app, {
                method: 'POST',
                url: '/v1/bookings',
                headers: authHeaders(parentLogin, 'parent'),
                expectedStatus: [201, 409],
                payload: {
                  ...bookingPayload,
                  idempotencyKey: `staging-smoke-capacity-race-${label}-${crypto.randomUUID()}`,
                },
              }),
            ),
          );
          const statusCodes = attempts.map((attempt) => attempt.statusCode).sort();
          if (statusCodes[0] !== 201 || statusCodes[1] !== 409) {
            throw new Error(
              `Concurrent booking requests were not serialized: ${JSON.stringify(
                attempts.map((attempt) => ({
                  statusCode: attempt.statusCode,
                  payload: attempt.payload,
                })),
              )}`,
            );
          }
          const created = attempts.find((attempt) => attempt.statusCode === 201);
          if (!created?.payload.id) {
            throw new Error('Concurrent booking winner did not return a booking id');
          }
          createdBookingId = created.payload.id;
          if (created.payload.status !== 'AWAITING_CONFIRMATION' || created.payload.version !== 1) {
            throw new Error(
              `Unexpected direct booking create state: ${JSON.stringify(created.payload)}`,
            );
          }
          const createdRead = await requestJson<{ status: string; version: number }>(app, {
            method: 'GET',
            url: `/v1/bookings/${created.payload.id}`,
            headers: authHeaders(parentLogin, 'parent'),
          });
          if (
            createdRead.payload.status !== 'AWAITING_CONFIRMATION' ||
            createdRead.payload.version !== 1
          ) {
            throw new Error(
              `Unexpected direct booking read state: ${JSON.stringify(createdRead.payload)}`,
            );
          }

          await requestJson(app, {
            method: 'POST',
            url: `/v1/bookings/${created.payload.id}/confirm`,
            headers: authHeaders(parentLogin, 'parent'),
            expectedStatus: 403,
            payload: {
              expectedVersion: 1,
              idempotencyKey: `codex-smoke-parent-confirm-denied-${created.payload.id}`,
            },
          });

          await requestJson(app, {
            method: 'POST',
            url: '/v1/invoices/generate',
            headers: authHeaders(coachLogin, 'coach'),
            expectedStatus: 400,
            payload: {
              bookingId: created.payload.id,
              notes: 'This must be rejected before coach confirmation.',
              taxRate: 0,
            },
          });

          const confirmed = await requestJson<{ id: string; status: string; version: number }>(
            app,
            {
              method: 'POST',
              url: `/v1/bookings/${created.payload.id}/confirm`,
              headers: authHeaders(coachLogin, 'coach'),
              payload: {
                note: 'Confirmed by Clubroom staging smoke.',
                expectedVersion: 1,
                idempotencyKey: `codex-smoke-coach-confirm-${created.payload.id}`,
              },
            },
          );
          if (confirmed.payload.status !== 'CONFIRMED' || confirmed.payload.version !== 2) {
            throw new Error(
              `Unexpected coach confirmation state: ${JSON.stringify(confirmed.payload)}`,
            );
          }

          const slotStartsAt = new Date(scheduledAt);
          const slotEndsAt = new Date(slotStartsAt.getTime() + 60 * 60_000);
          const [
            persisted,
            confirmationNotifications,
            confirmationAudits,
            overlapCandidates,
          ] = await Promise.all([
            prisma.booking.findUnique({
              where: { id: created.payload.id },
              include: {
                participants: true,
                statusEvents: { orderBy: { occurredAt: 'asc' } },
              },
            }),
            prisma.notification.findMany({
              where: {
                sourceType: 'booking_confirmed',
                sourceId: created.payload.id,
              },
            }),
            prisma.auditEvent.findMany({
              where: {
                action: 'booking.confirm',
                resourceId: created.payload.id,
              },
            }),
            prisma.booking.findMany({
              where: {
                coachUserId: coachLogin.user.id,
                deletedAt: null,
                status: {
                  notIn: ['CANCELLED', 'COMPLETED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'],
                },
                scheduledAt: { lt: slotEndsAt },
              },
              select: {
                scheduledAt: true,
                durationMinutes: true,
              },
            }),
          ]);
          const activeOverlapCount = overlapCandidates.filter(
            (candidate) =>
              candidate.scheduledAt.getTime() + candidate.durationMinutes * 60_000 >
              slotStartsAt.getTime(),
          ).length;
          const createEvent = persisted?.statusEvents.find(
            (event) => event.toStatus === 'AWAITING_CONFIRMATION',
          );
          const confirmEvent = persisted?.statusEvents.find(
            (event) => event.toStatus === 'CONFIRMED',
          );
          if (
            !persisted ||
            persisted.status !== 'CONFIRMED' ||
            persisted.bookedByUserId !== parentLogin.user.id ||
            persisted.coachUserId !== coachLogin.user.id ||
            !persisted.confirmedAt ||
            !persisted.participants.some(
              (participant) => participant.athleteId === parentAthleteId,
            ) ||
            createEvent?.fromStatus !== null ||
            createEvent?.actorUserId !== parentLogin.user.id ||
            confirmEvent?.fromStatus !== 'AWAITING_CONFIRMATION' ||
            confirmEvent?.actorUserId !== coachLogin.user.id ||
            !confirmationNotifications.some(
              (notification) =>
                notification.userId === parentLogin.user.id &&
                notification.type === 'BOOKING_CONFIRMED',
            ) ||
            !confirmationAudits.some(
              (audit) => audit.actorUserId === parentLogin.user.id && audit.result === 'DENY',
            ) ||
            !confirmationAudits.some(
              (audit) => audit.actorUserId === coachLogin.user.id && audit.result === 'SUCCESS',
            ) ||
            activeOverlapCount !== selectedSlot.maxBookings
          ) {
            throw new Error(
              `Direct booking lifecycle was not persisted correctly: ${JSON.stringify({
                id: persisted?.id ?? null,
                status: persisted?.status ?? null,
                bookedByUserId: persisted?.bookedByUserId ?? null,
                coachUserId: persisted?.coachUserId ?? null,
                confirmedAt: persisted?.confirmedAt?.toISOString() ?? null,
                participantCount: persisted?.participants.length ?? 0,
                statusEventCount: persisted?.statusEvents.length ?? 0,
                confirmationNotificationCount: confirmationNotifications.length,
                confirmationAuditCount: confirmationAudits.length,
                activeOverlapCount,
                maxBookings: selectedSlot.maxBookings,
              })}`,
            );
          }

          return {
            id: created.payload.id,
            createdStatus: created.payload.status,
            status: confirmed.payload.status,
            version: confirmed.payload.version,
            statusEventCount: persisted.statusEvents.length,
            confirmationNotificationCount: confirmationNotifications.length,
            confirmationAuditCount: confirmationAudits.length,
            concurrentStatusCodes: statusCodes,
            activeOverlapCount,
            maxBookings: selectedSlot.maxBookings,
            capacitySerialized: true,
            invoiceBlockedBeforeConfirmation: true,
          };
        })
      : undefined;

    if (!selectedSlot) {
      results.push({
        name: 'direct booking capacity + coach confirmation',
        status: 'fail',
        error: 'Skipped because no available coach slot was resolved.',
      });
    } else {
      await check('booking step analytics db write', async () => {
        const response = await requestJson<{
          event: {
            id: string;
            createdAt: string;
          };
          seedVersion?: string | null;
        }>(app, {
          method: 'POST',
          url: '/v1/booking-step-analytics',
          headers: authHeaders(parentLogin, 'parent'),
          expectedStatus: 201,
          payload: {
            id: `booking_step_evt_smoke_${Date.now()}`,
            createdAt: new Date().toISOString(),
            source: 'direct',
            role: 'parent',
            actingAs: 'self',
            step: 'confirm',
            status: booking?.id ? 'success' : 'validation_fail',
            coachId: coachLogin.user.id,
          },
        });
        createdBookingStepAnalyticsEventId = response.payload.event.id;
        if (
          response.payload.seedVersion !== undefined ||
          !createdBookingStepAnalyticsEventId.startsWith('bsa_')
        ) {
          throw new Error(
            `Unexpected booking step analytics response: ${JSON.stringify(response.payload)}`,
          );
        }
        const stored = await prisma.bookingStepAnalyticsEvent.findUnique({
          where: { id: createdBookingStepAnalyticsEventId },
          select: {
            userId: true,
            source: true,
            role: true,
            actingAs: true,
            step: true,
            status: true,
            coachUserId: true,
            clientEventId: true,
          },
        });
        if (
          !stored ||
          stored.userId !== parentLogin.user.id ||
          stored.source !== 'direct' ||
          stored.role !== 'parent' ||
          stored.actingAs !== 'self' ||
          stored.step !== 'confirm' ||
          stored.status !== (booking?.id ? 'success' : 'validation_fail') ||
          stored.coachUserId !== coachLogin.user.id ||
          !stored.clientEventId?.startsWith('booking_step_evt_smoke_')
        ) {
          throw new Error(
            `Unexpected stored booking step analytics row: ${JSON.stringify(stored)}`,
          );
        }
        return {
          eventId: createdBookingStepAnalyticsEventId,
          userId: stored.userId,
          step: stored.step,
          status: stored.status,
        };
      });
    }

    if (booking?.id) {
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
          throw new Error(
            `Unexpected payment instruction owner: ${JSON.stringify(initial.payload)}`,
          );
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
          throw new Error(
            `Unexpected saved payment instructions: ${JSON.stringify(saved.payload)}`,
          );
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
            event.action === 'coach_payment_instructions.update' && event.result === 'SUCCESS',
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
        const [coachIdentity, athleteIdentity] = await Promise.all([
          prisma.user.findUnique({
            where: { id: coachLogin.user.id },
            select: { name: true },
          }),
          prisma.athlete.findUnique({
            where: { id: parentAthleteId },
            select: { displayName: true },
          }),
        ]);
        const expectedCoachName = coachIdentity?.name.trim();
        const expectedAthleteName = athleteIdentity?.displayName.trim();
        if (!expectedCoachName || !expectedAthleteName) {
          throw new Error('Session feedback smoke identities are missing from Supabase');
        }
        const saved = await requestJson<{
          feedback: {
            id: string;
            sessionId: string;
            bookingId?: string;
            coachName: string;
            athleteName: string;
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
            coachName: 'Forged smoke coach label',
            athleteId: parentAthleteId,
            athleteName: 'Forged smoke athlete label',
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
        if (
          saved.payload.feedback.coachName !== expectedCoachName ||
          saved.payload.feedback.athleteName !== expectedAthleteName
        ) {
          throw new Error(
            `Session feedback trusted caller labels: ${JSON.stringify(saved.payload.feedback)}`,
          );
        }

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
              select: {
                id: true,
                bookingId: true,
                athleteId: true,
                authorUserId: true,
                metadataJson: true,
              },
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
        const storedFeedbackMetadata = storedFeedback.metadataJson as Record<string, unknown>;
        if (
          storedFeedbackMetadata.coachName !== expectedCoachName ||
          storedFeedbackMetadata.athleteName !== expectedAthleteName
        ) {
          throw new Error(
            `Session feedback metadata trusted caller labels: ${JSON.stringify(storedFeedbackMetadata)}`,
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

    await check('athlete skill update create + replay + db readback', async () => {
      if (!booking) {
        throw new Error('Skill update smoke requires the direct booking created earlier');
      }
      const auditStartedAt = new Date();
      const skillName = `Codex smoke skill ${auditStartedAt.toISOString()}`;
      const idempotencyKey = `staging-skill-update-${crypto.randomUUID()}`;
      const requestPayload = {
        skillName,
        score: 8,
        bookingId: booking.id,
        notes: 'Staging skill update persisted through the canonical v1 route.',
        idempotencyKey,
      };
      const created = await requestJson(app, {
        method: 'POST',
        url: `/v1/athletes/${parentAthleteId}/skill-updates`,
        headers: authHeaders(coachLogin, 'coach'),
        payload: requestPayload,
        expectedStatus: 201,
      });
      const createdPayload = athleteSkillUpdateResponseSchema.parse(created.payload);
      if (created.statusCode !== 201 || createdPayload.replayed) {
        throw new Error(`Unexpected skill update create: ${JSON.stringify(created.payload)}`);
      }

      const replay = await requestJson(app, {
        method: 'POST',
        url: `/v1/athletes/${parentAthleteId}/skill-updates`,
        headers: authHeaders(coachLogin, 'coach'),
        payload: requestPayload,
      });
      const replayPayload = athleteSkillUpdateResponseSchema.parse(replay.payload);
      if (
        replay.statusCode !== 200 ||
        !replayPayload.replayed ||
        replayPayload.skillAssessment.id !== createdPayload.skillAssessment.id
      ) {
        throw new Error(`Unexpected skill update replay: ${JSON.stringify(replay.payload)}`);
      }

      const [storedAssessment, assessmentCount, history, audits] = await Promise.all([
        prisma.athleteSkillAssessment.findUnique({
          where: { id: createdPayload.skillAssessment.id },
          include: { skillDefinition: true },
        }),
        prisma.athleteSkillAssessment.count({
          where: { id: createdPayload.skillAssessment.id },
        }),
        requestJson(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/skills/history?skillName=${encodeURIComponent(skillName)}`,
          headers: authHeaders(parentLogin, 'parent'),
        }),
        prisma.auditEvent.findMany({
          where: {
            action: 'athlete_skill_update.create',
            actorUserId: coachLogin.user.id,
            resourceId: createdPayload.skillAssessment.id,
            result: 'SUCCESS',
            occurredAt: { gte: auditStartedAt },
          },
          select: { id: true, metadataJson: true },
        }),
      ]);
      const historyPayload = athleteSkillHistoryResponseSchema.parse(history.payload);
      const historySkill = historyPayload.skills.find((skill) => skill.skillName === skillName);
      if (
        assessmentCount !== 1 ||
        !storedAssessment ||
        storedAssessment.athleteId !== parentAthleteId ||
        storedAssessment.assessorUserId !== coachLogin.user.id ||
        storedAssessment.bookingId !== booking.id ||
        storedAssessment.score !== 8 ||
        storedAssessment.skillDefinition.name !== skillName ||
        historySkill?.currentLevel !== 80 ||
        audits.length !== 2
      ) {
        throw new Error(
          `Skill update DB proof mismatch: ${JSON.stringify({
            assessmentCount,
            storedAssessment,
            historySkill,
            audits,
          })}`,
        );
      }

      return {
        assessmentId: storedAssessment.id,
        skillDefinitionId: storedAssessment.skillDefinitionId,
        bookingId: storedAssessment.bookingId,
        createdStatus: created.statusCode,
        replayStatus: replay.statusCode,
        persistedRows: assessmentCount,
        historyCurrentLevel: historySkill.currentLevel,
        successAudits: audits.length,
      };
    });

    await check('athlete skill history db authority + audit readback', async () => {
      const auditStartedAt = new Date();
      const assessmentCount = await prisma.athleteSkillAssessment.count({
        where: { athleteId: parentAthleteId },
      });
      const response = await requestJson(app, {
        method: 'GET',
        url: `/v1/athletes/${parentAthleteId}/skills/history`,
        headers: authHeaders(parentLogin, 'parent'),
      });
      const payload = athleteSkillHistoryResponseSchema.parse(response.payload);
      if (payload.athleteId !== parentAthleteId) {
        throw new Error(`Skill history athlete mismatch: ${payload.athleteId}`);
      }
      if (assessmentCount === 0 && payload.skills.length !== 0) {
        throw new Error('Skill history fabricated rows for a DB-empty athlete');
      }
      if (assessmentCount > 0 && payload.skills.length === 0) {
        throw new Error('Skill history omitted persisted athlete assessments');
      }

      const audit = await prisma.auditEvent.findFirst({
        where: {
          action: 'athlete_skill_history.read',
          resourceId: parentAthleteId,
          actorUserId: parentLogin.user.id,
          result: 'SUCCESS',
          occurredAt: { gte: auditStartedAt },
        },
        select: { id: true },
      });
      if (!audit) {
        throw new Error('Missing athlete skill-history sensitive-read audit event');
      }

      return {
        athleteId: payload.athleteId,
        persistedAssessments: assessmentCount,
        returnedSkills: payload.skills.length,
        emptyStateAuthoritative: assessmentCount === 0,
        auditId: audit.id,
      };
    });

    await check('athlete practice log create + accumulate + replay + db readback', async () => {
      const auditStartedAt = new Date();
      const note = `Codex smoke practice ${auditStartedAt.toISOString()}`;
      const createKey = `staging-practice-log-${crypto.randomUUID()}`;
      const accumulateKey = `staging-practice-log-${crypto.randomUUID()}`;
      const headers = authHeaders(parentLogin, 'parent');
      const endpointKey = `POST:/v1/athletes/${parentAthleteId}/practice-logs`;

      const created = await requestJson(app, {
        method: 'POST',
        url: `/v1/athletes/${parentAthleteId}/practice-logs`,
        headers,
        payload: {
          minutes: 20,
          note,
          idempotencyKey: createKey,
        },
        expectedStatus: 201,
      });
      const createdPayload = practiceLogMutationResponseSchema.parse(created.payload);
      if (!createdPayload.created || createdPayload.replayed || createdPayload.log.minutes !== 20) {
        throw new Error(`Unexpected practice log create: ${JSON.stringify(created.payload)}`);
      }

      const accumulated = await requestJson(app, {
        method: 'POST',
        url: `/v1/athletes/${parentAthleteId}/practice-logs`,
        headers,
        payload: {
          minutes: 15,
          idempotencyKey: accumulateKey,
        },
        expectedStatus: 200,
      });
      const accumulatedPayload = practiceLogMutationResponseSchema.parse(accumulated.payload);
      if (
        accumulatedPayload.created ||
        accumulatedPayload.replayed ||
        accumulatedPayload.log.id !== createdPayload.log.id ||
        accumulatedPayload.log.minutes !== 35
      ) {
        throw new Error(
          `Unexpected practice log accumulation: ${JSON.stringify(accumulated.payload)}`,
        );
      }

      const replay = await requestJson(app, {
        method: 'POST',
        url: `/v1/athletes/${parentAthleteId}/practice-logs`,
        headers,
        payload: {
          minutes: 15,
          idempotencyKey: accumulateKey,
        },
        expectedStatus: 200,
      });
      const replayPayload = practiceLogMutationResponseSchema.parse(replay.payload);
      if (
        !replayPayload.replayed ||
        replayPayload.log.id !== createdPayload.log.id ||
        replayPayload.log.minutes !== 35
      ) {
        throw new Error(`Unexpected practice log replay: ${JSON.stringify(replay.payload)}`);
      }

      const [listed, today, stored, storedCount, idempotencyCount, audits] = await Promise.all([
        requestJson(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/practice-logs?since=${createdPayload.log.dateKey}`,
          headers,
        }),
        requestJson(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/practice-logs/today`,
          headers,
        }),
        prisma.practiceLog.findUnique({ where: { id: createdPayload.log.id } }),
        prisma.practiceLog.count({
          where: {
            athleteId: parentAthleteId,
            authorUserId: parentLogin.user.id,
            dateKey: createdPayload.log.dateKey,
            deletedAt: null,
          },
        }),
        prisma.idempotencyKey.count({
          where: {
            userId: parentLogin.user.id,
            endpointKey,
            idempotencyKey: { in: [createKey, accumulateKey] },
          },
        }),
        prisma.auditEvent.findMany({
          where: {
            action: 'practice_logs.write',
            actorUserId: parentLogin.user.id,
            resourceId: createdPayload.log.id,
            result: 'SUCCESS',
            occurredAt: { gte: auditStartedAt },
          },
          select: { id: true, metadataJson: true },
        }),
      ]);
      const listedPayload = practiceLogListResponseSchema.parse(listed.payload);
      const todayPayload = practiceLogTodayResponseSchema.parse(today.payload);
      const listedLog = listedPayload.logs.find((log) => log.id === createdPayload.log.id);
      if (
        !stored ||
        stored.minutes !== 35 ||
        stored.note !== note ||
        storedCount !== 1 ||
        idempotencyCount !== 2 ||
        listedLog?.minutes !== 35 ||
        todayPayload.log?.id !== createdPayload.log.id ||
        todayPayload.log.minutes !== 35 ||
        audits.length !== 3
      ) {
        throw new Error(
          `Practice log DB proof mismatch: ${JSON.stringify({
            stored,
            storedCount,
            idempotencyCount,
            listedLog,
            today: todayPayload,
            audits,
          })}`,
        );
      }

      return {
        practiceLogId: stored.id,
        dateKey: stored.dateKey,
        timeZone: todayPayload.timeZone,
        totalMinutes: stored.minutes,
        persistedRows: storedCount,
        idempotencyRows: idempotencyCount,
        successAudits: audits.length,
      };
    });

    await check('injury lifecycle db + audit readback', async () => {
      const auditStartedAt = new Date();
      const headers = authHeaders(parentLogin, 'parent');
      const marker = `Staging injury ${auditStartedAt.toISOString()}`;
      const reportedAt = auditStartedAt.toISOString();
      const expectedRecoveryDate = new Date(
        auditStartedAt.getTime() + 7 * 24 * 60 * 60 * 1_000,
      ).toISOString();
      let injuryId: string | undefined;

      try {
        const activeBeforeInvalidCreate = await prisma.athleteInjury.count({
          where: { athleteId: parentAthleteId, deletedAt: null },
        });
        await requestJson(app, {
          method: 'POST',
          url: `/v1/athletes/${parentAthleteId}/injuries`,
          headers,
          expectedStatus: 400,
          payload: {
            title: marker,
            type: 'LEFT_ANKLE',
            severity: 'medium',
            createdByUserId: 'usr_forged',
          },
        });
        const activeAfterInvalidCreate = await prisma.athleteInjury.count({
          where: { athleteId: parentAthleteId, deletedAt: null },
        });
        if (activeAfterInvalidCreate !== activeBeforeInvalidCreate) {
          throw new Error('Invalid injury create changed Supabase authority rows');
        }

        const created = await requestJson<{
          id: string;
          athleteId: string;
          status: string;
          notes: string | null;
          resolvedAt: string | null;
        }>(app, {
          method: 'POST',
          url: `/v1/athletes/${parentAthleteId}/injuries`,
          headers,
          expectedStatus: 201,
          payload: {
            title: marker,
            type: 'LEFT_ANKLE',
            severity: 'medium',
            reportedAt,
            expectedRecoveryDate,
            notes: 'Preserve this injury note through status changes.',
          },
        });
        injuryId = created.payload.id;

        const [detail, listed] = await Promise.all([
          requestJson<{ id: string; athleteId: string; notes: string | null }>(app, {
            method: 'GET',
            url: `/v1/injuries/${injuryId}`,
            headers,
          }),
          requestJson<{ athleteId: string; injuries: Array<{ id: string }> }>(app, {
            method: 'GET',
            url: `/v1/athletes/${parentAthleteId}/injuries`,
            headers,
          }),
        ]);
        if (
          detail.payload.athleteId !== parentAthleteId ||
          detail.payload.notes !== 'Preserve this injury note through status changes.' ||
          !listed.payload.injuries.some((injury) => injury.id === injuryId)
        ) {
          throw new Error(
            `Injury readback mismatch: ${JSON.stringify({ detail: detail.payload, list: listed.payload })}`,
          );
        }

        const resolved = await requestJson<{
          status: string;
          resolvedAt: string | null;
          notes: string | null;
        }>(app, {
          method: 'PATCH',
          url: `/v1/injuries/${injuryId}`,
          headers,
          payload: { status: 'resolved' },
        });
        if (
          resolved.payload.status !== 'resolved' ||
          !resolved.payload.resolvedAt ||
          resolved.payload.notes !== 'Preserve this injury note through status changes.'
        ) {
          throw new Error(
            `Resolving injury did not preserve server-owned state: ${JSON.stringify(resolved.payload)}`,
          );
        }

        const beforeInvalidUpdate = await prisma.athleteInjury.findUnique({
          where: { id: injuryId },
          select: { status: true, resolvedAt: true, notes: true, version: true, updatedAt: true },
        });
        await requestJson(app, {
          method: 'PATCH',
          url: `/v1/injuries/${injuryId}`,
          headers,
          expectedStatus: 400,
          payload: { resolvedAt: reportedAt },
        });
        const afterInvalidUpdate = await prisma.athleteInjury.findUnique({
          where: { id: injuryId },
          select: { status: true, resolvedAt: true, notes: true, version: true, updatedAt: true },
        });
        if (
          !beforeInvalidUpdate ||
          !afterInvalidUpdate ||
          beforeInvalidUpdate.status !== afterInvalidUpdate.status ||
          beforeInvalidUpdate.resolvedAt?.getTime() !== afterInvalidUpdate.resolvedAt?.getTime() ||
          beforeInvalidUpdate.notes !== afterInvalidUpdate.notes ||
          beforeInvalidUpdate.version !== afterInvalidUpdate.version ||
          beforeInvalidUpdate.updatedAt.getTime() !== afterInvalidUpdate.updatedAt.getTime()
        ) {
          throw new Error('Invalid injury update changed Supabase authority rows');
        }

        const reopened = await requestJson<{
          status: string;
          resolvedAt: string | null;
          notes: string | null;
        }>(app, {
          method: 'PATCH',
          url: `/v1/injuries/${injuryId}`,
          headers,
          payload: { status: 'active' },
        });
        const [stored, auditEvents] = await Promise.all([
          prisma.athleteInjury.findUnique({
            where: { id: injuryId },
            select: { athleteId: true, status: true, resolvedAt: true, notes: true },
          }),
          prisma.auditEvent.findMany({
            where: {
              occurredAt: { gte: auditStartedAt },
              action: { in: ['athlete_injury.create', 'athlete_injury.read', 'athlete_injury.update'] },
              actorUserId: parentLogin.user.id,
              resourceId: { in: [parentAthleteId, injuryId] },
            },
            select: { action: true, resourceId: true, result: true, metadataJson: true },
          }),
        ]);
        if (
          reopened.payload.status !== 'active' ||
          reopened.payload.resolvedAt !== null ||
          reopened.payload.notes !== 'Preserve this injury note through status changes.' ||
          !stored ||
          stored.athleteId !== parentAthleteId ||
          stored.status !== 'active' ||
          stored.resolvedAt !== null ||
          stored.notes !== 'Preserve this injury note through status changes.'
        ) {
          throw new Error(
            `Reopened injury retained stale resolution state: ${JSON.stringify({ reopened: reopened.payload, stored })}`,
          );
        }
        const validationDenials = auditEvents.filter((event) => {
          const metadata = event.metadataJson as { errorCode?: string } | null;
          return event.result === 'DENY' && metadata?.errorCode === 'VALIDATION_FAILED';
        });
        if (validationDenials.length !== 2) {
          throw new Error(`Missing injury validation denial audits: ${JSON.stringify(auditEvents)}`);
        }

        return {
          injuryId,
          notesPreserved: true,
          resolutionTimestampServerOwned: true,
          reopenClearedResolution: true,
          strictInputDenials: validationDenials.length,
          auditedActions: auditEvents.length,
        };
      } finally {
        if (injuryId) {
          await prisma.athleteInjury.updateMany({
            where: { id: injuryId, deletedAt: null },
            data: {
              deletedAt: new Date(),
              deletedByUserId: parentLogin.user.id,
              updatedByUserId: parentLogin.user.id,
              version: { increment: 1 },
            },
          });
        }
      }
    });

    await check('family health write + DB audit readback', async () => {
      const auditStartedAt = new Date();
      const smokeMarker = `staging-smoke-${auditStartedAt.toISOString()}`;
      const headers = authHeaders(parentLogin, 'parent');
      const [originalMedical, originalEmergencyContacts, originalConsents] = await Promise.all([
        requestJson<{
          conditions: string[];
          allergies: string[];
          medications: string[];
          restrictions: string[];
          doctorName: string | null;
          doctorPhone: string | null;
          insuranceProvider: string | null;
          insuranceNumber: string | null;
          emergencyNotes: string | null;
          senNotes: string | null;
        }>(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/medical`,
          headers,
        }),
        requestJson<{
          contacts: Array<{
            name: string;
            relationship: string;
            phone: string;
            email?: string | null;
            isPrimary: boolean;
            canPickup: boolean;
          }>;
        }>(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/emergency-contacts`,
          headers,
        }),
        requestJson<{
          consents: Array<{
            type: string;
            granted: boolean;
            grantedBy: string;
            grantedAt?: string;
            expiryAt?: string;
          }>;
        }>(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/consents`,
          headers,
        }),
      ]);

      try {
      const captureCareRows = async () => {
        const [medical, contacts, consents] = await Promise.all([
          prisma.childMedicalRecord.findFirst({
            where: { athleteId: parentAthleteId, isCurrent: true },
            orderBy: { effectiveFrom: 'desc' },
            select: { id: true, updatedAt: true },
          }),
          prisma.childEmergencyContact.findMany({
            where: { athleteId: parentAthleteId, deletedAt: null },
            orderBy: { id: 'asc' },
            select: { id: true, updatedAt: true },
          }),
          prisma.childConsent.findMany({
            where: { athleteId: parentAthleteId, supersededById: null },
            orderBy: { id: 'asc' },
            select: { id: true, createdAt: true },
          }),
        ]);
        return JSON.stringify({ medical, contacts, consents });
      };
      const careRowsBeforeInvalidWrites = await captureCareRows();
      await Promise.all([
        requestJson(app, {
          method: 'PATCH',
          url: `/v1/athletes/${parentAthleteId}/medical`,
          headers,
          expectedStatus: 400,
          payload: {
            insuranceNumber: smokeMarker,
            updatedByUserId: 'usr_forged',
          },
        }),
        requestJson(app, {
          method: 'PATCH',
          url: `/v1/athletes/${parentAthleteId}/emergency-contacts`,
          headers,
          expectedStatus: 400,
          payload: {
            contacts: [
              {
                name: 'Smoke Guardian',
                relationship: 'parent',
                phone: '+447700900124',
                createdByUserId: 'usr_forged',
              },
            ],
          },
        }),
        requestJson(app, {
          method: 'PUT',
          url: `/v1/athletes/${parentAthleteId}/consents`,
          headers,
          expectedStatus: 400,
          payload: {
            consents: [
              { type: 'PHOTO', granted: true, grantedBy: 'Staging Smoke' },
              { type: 'PHOTO', granted: false, grantedBy: 'Staging Smoke' },
            ],
          },
        }),
      ]);
      const careRowsAfterInvalidWrites = await captureCareRows();
      if (careRowsAfterInvalidWrites !== careRowsBeforeInvalidWrites) {
        throw new Error('Invalid athlete-care writes changed Supabase authority rows');
      }

      const medicalPayload = {
        conditions: [`${smokeMarker}-condition`],
        allergies: [`${smokeMarker}-allergy`],
        medications: [`${smokeMarker}-medication`],
        restrictions: [`${smokeMarker}-restriction`],
        doctorName: 'Dr Smoke',
        doctorPhone: '+447700900123',
        insuranceProvider: 'Clubroom Smoke Cover',
        insuranceNumber: smokeMarker,
        emergencyNotes: `Emergency notes ${smokeMarker}`,
        senNotes: `SEN notes ${smokeMarker}`,
      };
      const emergencyPayload = {
        contacts: [
          {
            name: 'Smoke Guardian',
            relationship: 'parent',
            phone: '+447700900124',
            isPrimary: true,
            canPickup: true,
          },
        ],
      };
      const consentPayload = {
        consents: [
          {
            type: 'PHOTO',
            granted: true,
            grantedBy: 'Staging Smoke',
            grantedAt: auditStartedAt.toISOString(),
          },
          {
            type: 'VIDEO',
            granted: false,
            grantedBy: 'Staging Smoke',
          },
          {
            type: 'SOCIAL_MEDIA',
            granted: false,
            grantedBy: 'Staging Smoke',
          },
          {
            type: 'EMERGENCY_TREATMENT',
            granted: true,
            grantedBy: 'Staging Smoke',
            grantedAt: auditStartedAt.toISOString(),
          },
        ],
      };

      const [medical, emergencyContacts, consents] = await Promise.all([
        requestJson<{
          athleteId: string;
          conditions: string[];
          allergies: string[];
          medications: string[];
          restrictions: string[];
          insuranceNumber: string | null;
          emergencyNotes: string | null;
          senNotes: string | null;
        }>(app, {
          method: 'PATCH',
          url: `/v1/athletes/${parentAthleteId}/medical`,
          headers,
          payload: medicalPayload,
        }),
        requestJson<{
          contacts: Array<{
            name: string;
            phone: string;
            isPrimary: boolean;
            canPickup: boolean;
          }>;
        }>(app, {
          method: 'PATCH',
          url: `/v1/athletes/${parentAthleteId}/emergency-contacts`,
          headers,
          payload: emergencyPayload,
        }),
        requestJson<{
          consents: Array<{ type: string; granted: boolean; grantedBy: string }>;
        }>(app, {
          method: 'PUT',
          url: `/v1/athletes/${parentAthleteId}/consents`,
          headers,
          payload: consentPayload,
        }),
      ]);

      const [medicalReadback, emergencyReadback, consentReadback] = await Promise.all([
        requestJson<typeof medical.payload>(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/medical`,
          headers,
        }),
        requestJson<typeof emergencyContacts.payload>(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/emergency-contacts`,
          headers,
        }),
        requestJson<typeof consents.payload>(app, {
          method: 'GET',
          url: `/v1/athletes/${parentAthleteId}/consents`,
          headers,
        }),
      ]);

      const dbMedical = await prisma.childMedicalRecord.findFirst({
        where: {
          athleteId: parentAthleteId,
          insuranceNumber: smokeMarker,
          isCurrent: true,
        },
      });
      const dbEmergency = await prisma.childEmergencyContact.findFirst({
        where: {
          athleteId: parentAthleteId,
          phoneE164: '+447700900124',
          deletedAt: null,
        },
      });
      const dbConsents = await prisma.childConsent.findMany({
        where: {
          athleteId: parentAthleteId,
          supersededById: null,
        },
      });
      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          actorUserId: parentLogin.user.id,
          resourceId: parentAthleteId,
          occurredAt: {
            gte: auditStartedAt,
          },
          action: {
            in: [
              'medical.update',
              'medical.read',
              'emergency_contacts.update',
              'emergency_contacts.read',
              'consents.update',
              'consents.read',
            ],
          },
        },
        orderBy: {
          occurredAt: 'asc',
        },
      });

      if (!dbMedical || dbMedical.emergencyNotes !== medicalPayload.emergencyNotes) {
        throw new Error(
          `Medical write was not persisted: record=${dbMedical?.id ?? 'missing'} emergencyNotes=${
            dbMedical?.emergencyNotes ?? 'missing'
          }`,
        );
      }
      if (!dbEmergency || dbEmergency.name !== 'Smoke Guardian') {
        throw new Error(
          `Emergency contact write was not persisted: record=${
            dbEmergency?.id ?? 'missing'
          } name=${dbEmergency?.name ?? 'missing'}`,
        );
      }
      const consentByType = new Map(dbConsents.map((consent) => [consent.consentType, consent]));
      if (
        consentByType.get('PHOTO')?.granted !== true ||
        consentByType.get('VIDEO')?.granted !== false ||
        consentByType.get('EMERGENCY_TREATMENT')?.granted !== true
      ) {
        const consentSummary = dbConsents
          .map((consent) => `${consent.consentType}:${consent.granted}:${consent.id}`)
          .join(',');
        throw new Error(`Consent write was not persisted: ${consentSummary}`);
      }
      if (
        medicalReadback.payload.insuranceNumber !== smokeMarker ||
        medicalReadback.payload.emergencyNotes !== medicalPayload.emergencyNotes
      ) {
        throw new Error(`Medical API readback mismatch: ${JSON.stringify(medicalReadback.payload)}`);
      }
      if (emergencyReadback.payload.contacts[0]?.phone !== '+447700900124') {
        throw new Error(
          `Emergency contact API readback mismatch: ${JSON.stringify(emergencyReadback.payload)}`,
        );
      }
      if ('email' in (emergencyReadback.payload.contacts[0] ?? {})) {
        throw new Error(
          `Absent emergency contact email was not omitted: ${JSON.stringify(emergencyReadback.payload)}`,
        );
      }
      const readbackConsentByType = new Map(
        consentReadback.payload.consents.map((consent) => [consent.type, consent]),
      );
      if (
        readbackConsentByType.get('PHOTO')?.granted !== true ||
        readbackConsentByType.get('VIDEO')?.granted !== false ||
        readbackConsentByType.get('EMERGENCY_TREATMENT')?.granted !== true
      ) {
        throw new Error(`Consent API readback mismatch: ${JSON.stringify(consentReadback.payload)}`);
      }

      const auditResults = new Set(
        auditEvents.map((event) => `${event.action}:${event.result}:${event.sensitiveRead}`),
      );
      for (const expected of [
        'medical.update:SUCCESS:false',
        'emergency_contacts.update:SUCCESS:false',
        'consents.update:SUCCESS:false',
        'medical.read:SUCCESS:true',
        'emergency_contacts.read:SUCCESS:true',
        'consents.read:SUCCESS:true',
      ]) {
        if (!auditResults.has(expected)) {
          throw new Error(
            `Missing health audit event ${expected}: ${JSON.stringify(auditEvents)}`,
          );
        }
      }
      const deniedValidationActions = auditEvents
        .filter((event) => {
          const metadata = event.metadataJson as { errorCode?: string } | null;
          return event.result === 'DENY' && metadata?.errorCode === 'VALIDATION_FAILED';
        })
        .map((event) => event.action)
        .sort();
      if (
        JSON.stringify(deniedValidationActions) !==
        JSON.stringify(['consents.update', 'emergency_contacts.update', 'medical.update'])
      ) {
        throw new Error(
          `Missing athlete-care validation denial audits: ${JSON.stringify(auditEvents)}`,
        );
      }

      return {
        athleteId: parentAthleteId,
        medicalRecordId: dbMedical.id,
        emergencyContactId: dbEmergency.id,
        activeConsentRows: dbConsents.length,
        strictInputDenials: deniedValidationActions.length,
        auditedActions: auditEvents.length,
      };
      } finally {
        await Promise.all([
          requestJson(app, {
            method: 'PATCH',
            url: `/v1/athletes/${parentAthleteId}/medical`,
            headers,
            payload: {
              conditions: originalMedical.payload.conditions,
              allergies: originalMedical.payload.allergies,
              medications: originalMedical.payload.medications,
              restrictions: originalMedical.payload.restrictions,
              doctorName: originalMedical.payload.doctorName,
              doctorPhone: originalMedical.payload.doctorPhone,
              insuranceProvider: originalMedical.payload.insuranceProvider,
              insuranceNumber: originalMedical.payload.insuranceNumber,
              emergencyNotes: originalMedical.payload.emergencyNotes,
              senNotes: originalMedical.payload.senNotes,
            },
          }),
          requestJson(app, {
            method: 'PATCH',
            url: `/v1/athletes/${parentAthleteId}/emergency-contacts`,
            headers,
            payload: {
              contacts: originalEmergencyContacts.payload.contacts.map(
                ({ name, relationship, phone, email, isPrimary, canPickup }) => ({
                  name,
                  relationship,
                  phone,
                  email,
                  isPrimary,
                  canPickup,
                }),
              ),
            },
          }),
          requestJson(app, {
            method: 'PUT',
            url: `/v1/athletes/${parentAthleteId}/consents`,
            headers,
            payload: {
              consents: originalConsents.payload.consents,
            },
          }),
        ]);
      }
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
      const smokeProjectionSquadId = `sqd_smoke_projection_${Date.now()}`;
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

        await prisma.squad.create({
          data: {
            id: smokeProjectionSquadId,
            clubId: created.payload.club.id,
            ownerCoachUserId: coachLogin.user.id,
            name: 'Projection proof squad',
            ageBandLabel: 'U15',
            createdByUserId: coachLogin.user.id,
            updatedByUserId: coachLogin.user.id,
          },
        });

        const listedClubs = await requestJson<{
          clubs: Array<{
            id: string;
            squads: Array<Record<string, unknown>>;
            viewerGovernance: { role: string | null };
          }>;
        }>(app, {
          method: 'GET',
          url: '/v1/clubs',
          headers: authHeaders(coachLogin, 'coach'),
        });
        const listedClub = listedClubs.payload.clubs.find(
          (club) => club.id === created.payload.club.id,
        );
        const detail = await requestJson<{
          club: {
            id: string;
            squads: Array<Record<string, unknown>>;
            viewerGovernance: { role: string | null };
          };
        }>(app, {
          method: 'GET',
          url: `/v1/clubs/${created.payload.club.id}`,
          headers: authHeaders(coachLogin, 'coach'),
        });
        const updated = await requestJson<{
          club: {
            id: string;
            tagline: string | null;
            squads: Array<Record<string, unknown>>;
            viewerGovernance: { role: string | null };
          };
        }>(app, {
          method: 'PATCH',
          url: `/v1/clubs/${created.payload.club.id}`,
          headers: authHeaders(coachLogin, 'coach'),
          payload: {
            tagline: 'Updated by staging projection proof',
          },
        });
        for (const projection of [listedClub, detail.payload.club, updated.payload.club]) {
          if (
            !projection ||
            projection.viewerGovernance.role !== 'OWNER' ||
            projection.squads.length !== 1 ||
            projection.squads[0]?.id !== smokeProjectionSquadId ||
            Object.keys(projection.squads[0] ?? {}).length !== 1
          ) {
            throw new Error(
              `Club projection exposed an unexpected squad or governance shape: ${JSON.stringify(
                projection,
              )}`,
            );
          }
        }
        if (updated.payload.club.tagline !== 'Updated by staging projection proof') {
          throw new Error(`Unexpected club update response: ${JSON.stringify(updated.payload)}`);
        }

        await requestJson(app, {
          method: 'POST',
          url: `/v1/clubs/${created.payload.club.id}/invite-codes`,
          headers: authHeaders(coachLogin, 'coach'),
          expectedStatus: 400,
          payload: {
            role: 'HEAD_COACH',
          },
        });
        const invalidInviteCodeCount = await prisma.clubInviteCode.count({
          where: {
            clubId: created.payload.club.id,
            role: 'HEAD_COACH',
            deletedAt: null,
          },
        });
        if (invalidInviteCodeCount !== 0) {
          throw new Error('Invalid HEAD_COACH invite code reached Supabase');
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
                tagline: true,
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
          clubBeforeArchive.tagline !== 'Updated by staging projection proof' ||
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
                  'club.update',
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
          `club.update:SUCCESS:${coachLogin.user.id}`,
          `club_invite_code.read:SUCCESS:${coachLogin.user.id}`,
          `club_invite_code.create:DENY:${coachLogin.user.id}`,
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
          projectedSquadFields: ['id'],
          viewerGovernanceRole: updated.payload.club.viewerGovernance.role,
          invalidInviteRoleDenied: true,
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
      const matchTitle = `${smokeMatchTitlePrefix} ${Date.now()}`;
      const matchSquadId = `sqd_smoke_match_${staffMembership.clubId.replace(/[^A-Za-z0-9]/g, '_')}`;
      await prisma.squad.upsert({
        where: { id: matchSquadId },
        create: {
          id: matchSquadId,
          clubId: staffMembership.clubId,
          ownerCoachUserId: coachLogin.user.id,
          name: 'Staging smoke match squad',
          ageBandLabel: 'Smoke',
          createdByUserId: coachLogin.user.id,
          updatedByUserId: coachLogin.user.id,
        },
        update: {
          ownerCoachUserId: coachLogin.user.id,
          deletedAt: null,
          deletedByUserId: null,
          updatedByUserId: coachLogin.user.id,
        },
      });
      await prisma.squadMembership.upsert({
        where: {
          squadId_athleteId: {
            squadId: matchSquadId,
            athleteId: parentAthleteId,
          },
        },
        create: {
          id: `sqm_smoke_match_${parentAthleteId.replace(/[^A-Za-z0-9]/g, '_')}`,
          squadId: matchSquadId,
          athleteId: parentAthleteId,
          status: 'active',
          createdByUserId: coachLogin.user.id,
          updatedByUserId: coachLogin.user.id,
        },
        update: {
          status: 'active',
          deletedAt: null,
          deletedByUserId: null,
          updatedByUserId: coachLogin.user.id,
        },
      });
      const created = await requestJson<{
        match: {
          id: string;
          clubId: string;
          squadId?: string;
          coachId: string;
          selectedPlayers: unknown[];
        };
      }>(app, {
        method: 'POST',
        url: `/v1/clubs/${staffMembership.clubId}/matches`,
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 201,
        payload: {
          squadId: matchSquadId,
          title: matchTitle,
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
        created.payload.match.squadId !== matchSquadId ||
        created.payload.match.coachId !== coachLogin.user.id ||
        created.payload.match.selectedPlayers.length !== 0
      ) {
        throw new Error(`Unexpected created match payload: ${JSON.stringify(created.payload)}`);
      }

      const matchActivityId = `club_activity:match:${createdMatchId}`;
      const clubSchedule = await requestJson<{
        clubId: string;
        activities: Array<{
          id: string;
          source: string;
          sourceEntityId: string;
          title: string;
          opponent?: string;
        }>;
        seedVersion: string | null;
      }>(app, {
        method: 'GET',
        url: `/v1/clubs/${staffMembership.clubId}/schedule`,
        headers: authHeaders(coachLogin, 'coach'),
      });
      const scheduleMatch = clubSchedule.payload.activities.find(
        (activity) => activity.id === matchActivityId,
      );
      if (
        clubSchedule.payload.seedVersion !== null ||
        !scheduleMatch ||
        scheduleMatch.source !== 'match' ||
        scheduleMatch.sourceEntityId !== createdMatchId ||
        scheduleMatch.title !== matchTitle ||
        scheduleMatch.opponent !== 'Smoke Town FC'
      ) {
        throw new Error(
          `Club schedule did not project staged DB match: ${JSON.stringify(clubSchedule.payload)}`,
        );
      }

      const clubScheduleDetail = await requestJson<{
        clubId: string;
        activity: {
          id: string;
          source: string;
          sourceEntityId: string;
          title: string;
          opponent?: string;
        };
        seedVersion: string | null;
      }>(app, {
        method: 'GET',
        url: `/v1/clubs/${staffMembership.clubId}/schedule/${encodeURIComponent(matchActivityId)}`,
        headers: authHeaders(coachLogin, 'coach'),
      });
      if (
        clubScheduleDetail.payload.seedVersion !== null ||
        clubScheduleDetail.payload.activity.id !== matchActivityId ||
        clubScheduleDetail.payload.activity.source !== 'match' ||
        clubScheduleDetail.payload.activity.sourceEntityId !== createdMatchId ||
        clubScheduleDetail.payload.activity.title !== matchTitle ||
        clubScheduleDetail.payload.activity.opponent !== 'Smoke Town FC'
      ) {
        throw new Error(
          `Club schedule detail did not project staged DB match: ${JSON.stringify(
            clubScheduleDetail.payload,
          )}`,
        );
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

      const outsiderCoachInvites = await requestJson(app, {
        method: 'GET',
        url: `/v1/coaches/${coachLogin.user.id}/match-invites`,
        headers: authHeaders(spareGuardianLogin, 'parent'),
        expectedStatus: 403,
      });
      if (outsiderCoachInvites.statusCode !== 403) {
        throw new Error('Unrelated guardian could read coach match invite aggregates');
      }

      const coachInvites = await requestJson<{
        invites: Array<{
          squadId: string;
          targetId: string;
          targetType: string;
          invitedBy: string;
          memberCount: number;
          responses: { accepted: number; declined: number; pending: number };
        }>;
        total: number;
      }>(app, {
        method: 'GET',
        url: `/v1/coaches/${coachLogin.user.id}/match-invites`,
        headers: authHeaders(coachLogin, 'coach'),
      });
      const coachInvite = coachInvites.payload.invites.find(
        (invite) => invite.targetId === createdMatchId,
      );
      if (
        !coachInvite ||
        coachInvite.squadId !== matchSquadId ||
        coachInvite.targetType !== 'MATCH' ||
        coachInvite.invitedBy !== coachLogin.user.id ||
        coachInvite.memberCount !== 1 ||
        coachInvite.responses.accepted !== 1 ||
        coachInvite.responses.declined !== 0 ||
        coachInvite.responses.pending !== 0
      ) {
        throw new Error(
          `Coach match invite aggregate did not reflect DB match players: ${JSON.stringify(
            coachInvites.payload,
          )}`,
        );
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
                'club_match.invites.read',
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
        'club_match.invites.read',
      ]) {
        if (!auditEvents.some((event) => event.action === action && event.result === 'SUCCESS')) {
          throw new Error(
            `Missing successful match audit action ${action}: ${JSON.stringify(auditEvents)}`,
          );
        }
      }
      if (
        !auditEvents.some(
          (event) => event.action === 'club_match.invites.read' && event.result === 'DENY',
        )
      ) {
        throw new Error(`Missing denied coach match invite audit: ${JSON.stringify(auditEvents)}`);
      }

      return {
        clubId: staffMembership.clubId,
        squadId: matchSquadId,
        clubRole: staffMembership.role,
        clubVisibility: staffMembership.club.visibility,
        matchId: createdMatchId,
        scheduleProjected: true,
        cancelledPreviousSmokeMatches: previousSmokeMatches.count,
        parentAggregateCount: parentMatches.payload.total,
        coachAggregateCount: coachInvites.payload.total,
        outsiderHidden: true,
      };
    });

    await check('club event RSVP/check-in db readback', async () => {
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
      const previousSmokeEvents = await prisma.clubEvent.updateMany({
        where: {
          createdByUserId: coachLogin.user.id,
          title: {
            startsWith: smokeEventTitlePrefix,
          },
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          deletedByUserId: coachLogin.user.id,
          updatedByUserId: coachLogin.user.id,
        },
      });

      const eventSquadId = `sqd_smoke_event_${staffMembership.clubId.replace(/[^A-Za-z0-9]/g, '_')}`;
      await prisma.squad.upsert({
        where: { id: eventSquadId },
        create: {
          id: eventSquadId,
          clubId: staffMembership.clubId,
          ownerCoachUserId: coachLogin.user.id,
          name: 'Staging smoke event squad',
          ageBandLabel: 'Smoke',
          createdByUserId: coachLogin.user.id,
          updatedByUserId: coachLogin.user.id,
        },
        update: {
          ownerCoachUserId: coachLogin.user.id,
          name: 'Staging smoke event squad',
          deletedAt: null,
          deletedByUserId: null,
          updatedByUserId: coachLogin.user.id,
        },
      });
      await prisma.squadMembership.upsert({
        where: {
          squadId_athleteId: {
            squadId: eventSquadId,
            athleteId: parentAthleteId,
          },
        },
        create: {
          id: `sqm_smoke_event_${parentAthleteId.replace(/[^A-Za-z0-9]/g, '_')}`,
          squadId: eventSquadId,
          athleteId: parentAthleteId,
          status: 'active',
          createdByUserId: coachLogin.user.id,
          updatedByUserId: coachLogin.user.id,
        },
        update: {
          status: 'active',
          deletedAt: null,
          deletedByUserId: null,
          updatedByUserId: coachLogin.user.id,
        },
      });

      const auditStartedAt = new Date();
      const eventTitle = `${smokeEventTitlePrefix} ${Date.now()}`;
      const eventDate = addDaysIso(29);
      const created = await requestJson<{
        event: {
          id: string;
          clubId: string;
          title: string;
          status: string;
          date: string;
          startTime: string;
          endTime?: string;
          timeZone: string;
        };
      }>(app, {
        method: 'POST',
        url: `/v1/clubs/${staffMembership.clubId}/events`,
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 201,
        payload: {
          title: eventTitle,
          description: 'Created by staging smoke.',
          eventType: 'TRAINING_CAMP',
          date: eventDate,
          startTime: '10:00',
          endTime: '12:00',
          venue: 'Clubroom staging event pitch',
          targetAudience: 'ALL',
          maxAttendees: 50,
          price: 0,
          currency: 'GBP',
          rsvpRequired: true,
        },
      });
      createdEventId = created.payload.event.id;
      if (
        created.payload.event.clubId !== staffMembership.clubId ||
        created.payload.event.title !== eventTitle ||
        created.payload.event.status !== 'DRAFT' ||
        created.payload.event.date !== eventDate ||
        created.payload.event.startTime !== '10:00' ||
        created.payload.event.endTime !== '12:00' ||
        created.payload.event.timeZone !== 'Europe/London'
      ) {
        throw new Error(`Unexpected created event payload: ${JSON.stringify(created.payload)}`);
      }

      const published = await requestJson<{
        event: { id: string; clubId: string; title: string; status: string };
      }>(app, {
        method: 'PATCH',
        url: `/v1/events/${createdEventId}`,
        headers: authHeaders(coachLogin, 'coach'),
        payload: {
          status: 'PUBLISHED',
        },
      });
      if (
        published.payload.event.id !== createdEventId ||
        published.payload.event.status !== 'PUBLISHED'
      ) {
        throw new Error(`Unexpected published event payload: ${JSON.stringify(published.payload)}`);
      }

      const eventDetail = await requestJson<{
        event: {
          id: string;
          clubId: string;
          title: string;
          status: string;
          date: string;
          startTime: string;
          endTime?: string;
          timeZone: string;
        };
        seedVersion?: string | null;
      }>(app, {
        method: 'GET',
        url: `/v1/events/${createdEventId}`,
        headers: authHeaders(parentLogin, 'parent'),
      });
      if (
        eventDetail.payload.seedVersion !== undefined ||
        eventDetail.payload.event.id !== createdEventId ||
        eventDetail.payload.event.clubId !== staffMembership.clubId ||
        eventDetail.payload.event.status !== 'PUBLISHED' ||
        eventDetail.payload.event.date !== eventDate ||
        eventDetail.payload.event.startTime !== '10:00' ||
        eventDetail.payload.event.endTime !== '12:00' ||
        eventDetail.payload.event.timeZone !== 'Europe/London'
      ) {
        throw new Error(
          `Event detail did not read back from DB: ${JSON.stringify(eventDetail.payload)}`,
        );
      }

      const squadInvite = await requestJson<{
        eventId: string;
        squadIds: string[];
        inviteCount: number;
        targetAthleteCount: number;
        seedVersion?: string | null;
      }>(app, {
        method: 'POST',
        url: `/v1/events/${createdEventId}/invites/squads`,
        headers: authHeaders(coachLogin, 'coach'),
        payload: {
          squadIds: [eventSquadId],
        },
      });
      if (
        squadInvite.payload.seedVersion !== undefined ||
        squadInvite.payload.eventId !== createdEventId ||
        squadInvite.payload.squadIds.length !== 1 ||
        squadInvite.payload.squadIds[0] !== eventSquadId ||
        squadInvite.payload.inviteCount < 1 ||
        squadInvite.payload.targetAthleteCount !== 1
      ) {
        throw new Error(
          `Unexpected event squad invite payload: ${JSON.stringify(squadInvite.payload)}`,
        );
      }

      const rsvp = await requestJson<{
        rsvp: {
          id: string;
          eventId: string;
          userId: string;
          status: string;
          guestCount: number;
          notes?: string | null;
        };
      }>(app, {
        method: 'POST',
        url: `/v1/events/${createdEventId}/rsvp`,
        headers: authHeaders(parentLogin, 'parent'),
        payload: {
          status: 'GOING',
          guestCount: 1,
          notes: 'Going from staging smoke.',
        },
      });
      createdEventRsvpId = rsvp.payload.rsvp.id;
      if (
        rsvp.payload.rsvp.eventId !== createdEventId ||
        rsvp.payload.rsvp.userId !== parentLogin.user.id ||
        rsvp.payload.rsvp.status !== 'GOING' ||
        rsvp.payload.rsvp.guestCount !== 1
      ) {
        throw new Error(`Unexpected event RSVP payload: ${JSON.stringify(rsvp.payload)}`);
      }

      const checkin = await requestJson<{
        attendance: {
          id: string;
          eventId: string;
          userId: string;
          userRole: string;
          checkedInBy: string;
          checkInMethod: string;
          guestsCheckedIn: number;
          notes?: string | null;
        };
      }>(app, {
        method: 'POST',
        url: `/v1/events/${createdEventId}/checkins`,
        headers: authHeaders(coachLogin, 'coach'),
        payload: {
          userId: parentLogin.user.id,
          userRole: 'PARENT',
          checkInMethod: 'COACH',
          guestsCheckedIn: 1,
          notes: 'Checked in from staging smoke.',
        },
      });
      createdEventAttendanceId = checkin.payload.attendance.id;
      if (
        checkin.payload.attendance.eventId !== createdEventId ||
        checkin.payload.attendance.userId !== parentLogin.user.id ||
        checkin.payload.attendance.checkedInBy !== coachLogin.user.id ||
        checkin.payload.attendance.checkInMethod !== 'COACH' ||
        checkin.payload.attendance.guestsCheckedIn !== 1
      ) {
        throw new Error(`Unexpected event check-in payload: ${JSON.stringify(checkin.payload)}`);
      }

      const rsvps = await requestJson<{
        eventId: string;
        rsvps: Array<{
          id: string;
          eventId: string;
          userId: string;
          status: string;
          guestCount: number;
          notes?: string | null;
        }>;
        total: number;
        seedVersion?: string | null;
      }>(app, {
        method: 'GET',
        url: `/v1/events/${createdEventId}/rsvps`,
        headers: authHeaders(coachLogin, 'coach'),
      });
      const rsvpReadback = rsvps.payload.rsvps.find((entry) => entry.id === createdEventRsvpId);
      if (
        rsvps.payload.seedVersion !== undefined ||
        rsvps.payload.eventId !== createdEventId ||
        !rsvpReadback ||
        rsvpReadback.userId !== parentLogin.user.id ||
        rsvpReadback.status !== 'GOING' ||
        rsvpReadback.guestCount !== 1
      ) {
        throw new Error(
          `Event RSVP list did not read back DB row: ${JSON.stringify(rsvps.payload)}`,
        );
      }

      const eventInviteAggregates = await requestJson<{
        eventId: string;
        invites: Array<{
          squadId: string;
          targetId: string;
          invitedBy: string;
          memberCount: number;
          responses: { accepted: number; declined: number; pending: number };
        }>;
        total: number;
        seedVersion?: string | null;
      }>(app, {
        method: 'GET',
        url: `/v1/events/${createdEventId}/invites/squads`,
        headers: authHeaders(coachLogin, 'coach'),
      });
      const eventInviteAggregate = eventInviteAggregates.payload.invites.find(
        (invite) => invite.squadId === eventSquadId,
      );
      if (
        eventInviteAggregates.payload.seedVersion !== undefined ||
        eventInviteAggregates.payload.eventId !== createdEventId ||
        !eventInviteAggregate ||
        eventInviteAggregate.targetId !== createdEventId ||
        eventInviteAggregate.invitedBy !== coachLogin.user.id ||
        eventInviteAggregate.memberCount !== 1 ||
        eventInviteAggregate.responses.accepted !== 1 ||
        eventInviteAggregate.responses.declined !== 0 ||
        eventInviteAggregate.responses.pending !== 0
      ) {
        throw new Error(
          `Event invite aggregate did not read back DB truth: ${JSON.stringify(eventInviteAggregates.payload)}`,
        );
      }

      const organizerInviteAggregates = await requestJson<{
        organizerId: string;
        invites: Array<{
          squadId: string;
          targetId: string;
          responses: { accepted: number; declined: number; pending: number };
        }>;
        total: number;
        seedVersion?: string | null;
      }>(app, {
        method: 'GET',
        url: `/v1/organizers/${coachLogin.user.id}/event-invites`,
        headers: authHeaders(coachLogin, 'coach'),
      });
      const organizerInviteAggregate = organizerInviteAggregates.payload.invites.find(
        (invite) => invite.targetId === createdEventId && invite.squadId === eventSquadId,
      );
      if (
        organizerInviteAggregates.payload.seedVersion !== undefined ||
        organizerInviteAggregates.payload.organizerId !== coachLogin.user.id ||
        !organizerInviteAggregate ||
        organizerInviteAggregate.responses.accepted !== 1 ||
        organizerInviteAggregate.responses.pending !== 0
      ) {
        throw new Error(
          `Organizer event invite aggregate did not read back DB truth: ${JSON.stringify(organizerInviteAggregates.payload)}`,
        );
      }

      await requestJson(app, {
        method: 'GET',
        url: `/v1/events/${createdEventId}/invites/squads`,
        headers: authHeaders(spareGuardianLogin, 'parent'),
        expectedStatus: 403,
      });

      const attendance = await requestJson<{
        eventId: string;
        attendance: Array<{
          id: string;
          eventId: string;
          userId: string;
          checkedInBy: string;
          checkInMethod: string;
          guestsCheckedIn: number;
          notes?: string | null;
        }>;
        total: number;
        seedVersion?: string | null;
      }>(app, {
        method: 'GET',
        url: `/v1/events/${createdEventId}/attendance`,
        headers: authHeaders(coachLogin, 'coach'),
      });
      const attendanceReadback = attendance.payload.attendance.find(
        (entry) => entry.id === createdEventAttendanceId,
      );
      if (
        attendance.payload.seedVersion !== undefined ||
        attendance.payload.eventId !== createdEventId ||
        !attendanceReadback ||
        attendanceReadback.userId !== parentLogin.user.id ||
        attendanceReadback.checkedInBy !== coachLogin.user.id ||
        attendanceReadback.checkInMethod !== 'COACH' ||
        attendanceReadback.guestsCheckedIn !== 1
      ) {
        throw new Error(
          `Event attendance list did not read back DB row: ${JSON.stringify(attendance.payload)}`,
        );
      }

      const stats = await requestJson<{
        eventId: string;
        rsvpCounts: { going: number; notGoing: number; maybe: number; noResponse: number };
        expectedGuests: number;
        capacity?: number;
        checkedInCount: number;
        guestsCheckedInCount: number;
        attendanceRate: number;
      }>(app, {
        method: 'GET',
        url: `/v1/events/${createdEventId}/attendance/stats`,
        headers: authHeaders(coachLogin, 'coach'),
      });
      if (
        stats.payload.eventId !== createdEventId ||
        stats.payload.rsvpCounts.going !== 1 ||
        stats.payload.expectedGuests !== 1 ||
        stats.payload.capacity !== 50 ||
        stats.payload.checkedInCount !== 1 ||
        stats.payload.guestsCheckedInCount !== 1 ||
        stats.payload.attendanceRate !== 100
      ) {
        throw new Error(`Unexpected event attendance stats: ${JSON.stringify(stats.payload)}`);
      }

      const [storedEvent, storedRsvp, storedAttendance, auditEvents] = await Promise.all([
        prisma.clubEvent.findUnique({
          where: { id: createdEventId },
          select: {
            clubId: true,
            title: true,
            status: true,
            startsAt: true,
            endsAt: true,
            guestLimit: true,
            metadataJson: true,
            deletedAt: true,
          },
        }),
        prisma.eventRsvp.findUnique({
          where: { id: createdEventRsvpId },
          select: {
            clubEventId: true,
            userId: true,
            status: true,
            guestCount: true,
            notes: true,
          },
        }),
        prisma.eventAttendance.findUnique({
          where: { id: createdEventAttendanceId },
          select: {
            clubEventId: true,
            userId: true,
            checkedInByUserId: true,
            checkInMethod: true,
            guestsCheckedIn: true,
            notes: true,
            deletedAt: true,
          },
        }),
        prisma.auditEvent.findMany({
          where: {
            occurredAt: { gte: auditStartedAt },
            actorUserId: {
              in: [coachLogin.user.id, parentLogin.user.id, spareGuardianLogin.user.id],
            },
            resourceId: {
              in: [createdEventId, coachLogin.user.id],
            },
            action: {
              in: [
                'club_event.create',
                'club_event.update',
                'club_event.invite_squads',
                'club_event.invites.read',
                'club_event.organizer_invites.read',
                'event.rsvp',
                'event.rsvp.read',
                'event.attendance.checkin',
                'event.attendance.read',
              ],
            },
          },
          select: { action: true, actorUserId: true, result: true, sensitiveRead: true },
        }),
      ]);

      const storedEventMetadata = storedEvent?.metadataJson as {
        squadIds?: unknown;
        timeZone?: unknown;
      } | null;
      const storedEventSquadIds = Array.isArray(storedEventMetadata?.squadIds)
        ? storedEventMetadata.squadIds
        : [];
      const expectedStartsAt = localDateTimeToUtc(eventDate, '10:00', 'Europe/London');
      const expectedEndsAt = localDateTimeToUtc(eventDate, '12:00', 'Europe/London');
      if (
        !storedEvent ||
        !expectedStartsAt ||
        !expectedEndsAt ||
        storedEvent.clubId !== staffMembership.clubId ||
        storedEvent.title !== eventTitle ||
        storedEvent.status !== 'PUBLISHED' ||
        storedEvent.startsAt.getTime() !== expectedStartsAt.getTime() ||
        storedEvent.endsAt?.getTime() !== expectedEndsAt.getTime() ||
        storedEvent.guestLimit !== 50 ||
        storedEventMetadata?.timeZone !== 'Europe/London' ||
        !storedEventSquadIds.includes(eventSquadId) ||
        storedEvent.deletedAt
      ) {
        throw new Error(`Unexpected stored event row: ${JSON.stringify(storedEvent)}`);
      }
      if (
        !storedRsvp ||
        storedRsvp.clubEventId !== createdEventId ||
        storedRsvp.userId !== parentLogin.user.id ||
        storedRsvp.status !== 'GOING' ||
        storedRsvp.guestCount !== 1 ||
        storedRsvp.notes !== 'Going from staging smoke.'
      ) {
        throw new Error(`Unexpected stored event RSVP row: ${JSON.stringify(storedRsvp)}`);
      }
      if (
        !storedAttendance ||
        storedAttendance.clubEventId !== createdEventId ||
        storedAttendance.userId !== parentLogin.user.id ||
        storedAttendance.checkedInByUserId !== coachLogin.user.id ||
        storedAttendance.checkInMethod !== 'COACH' ||
        storedAttendance.guestsCheckedIn !== 1 ||
        storedAttendance.notes !== 'Checked in from staging smoke.' ||
        storedAttendance.deletedAt
      ) {
        throw new Error(
          `Unexpected stored event attendance row: ${JSON.stringify(storedAttendance)}`,
        );
      }
      for (const action of [
        'club_event.create',
        'club_event.update',
        'club_event.invite_squads',
        'club_event.invites.read',
        'club_event.organizer_invites.read',
        'event.rsvp',
        'event.rsvp.read',
        'event.attendance.checkin',
        'event.attendance.read',
      ]) {
        if (!auditEvents.some((event) => event.action === action && event.result === 'SUCCESS')) {
          throw new Error(
            `Missing successful event audit action ${action}: ${JSON.stringify(auditEvents)}`,
          );
        }
      }

      return {
        clubId: staffMembership.clubId,
        clubRole: staffMembership.role,
        clubVisibility: staffMembership.club.visibility,
        eventId: createdEventId,
        rsvpId: createdEventRsvpId,
        attendanceId: createdEventAttendanceId,
        cancelledPreviousSmokeEvents: previousSmokeEvents.count,
        eventTimeZone: created.payload.event.timeZone,
        storedStartsAt: storedEvent.startsAt.toISOString(),
        rsvpTotal: rsvps.payload.total,
        attendanceTotal: attendance.payload.total,
        attendanceRate: stats.payload.attendanceRate,
        auditedActions: auditEvents.length,
      };
    });

    await check('group session create/publish/register/roster', async () => {
      const auditStartedAt = new Date();
      const date = addDaysIso(24);
      const groupTitle = `Codex smoke group ${auditStartedAt.toISOString()}`;
      const staffingClub = await requestJson<{
        club: { id: string };
        membership: { role: string };
        primaryInvite: { code: string };
      }>(app, {
        method: 'POST',
        url: '/v1/clubs',
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 201,
        payload: {
          name: `Codex staffing proof club ${auditStartedAt.toISOString()}`,
          city: 'Manchester',
          country: 'UK',
          tagline: 'Created by apps/api/scripts/staging-smoke.ts assignment proof',
          visibility: 'private',
          commercialMode: 'ORG_OWNED',
          firstStaffRole: 'COACH',
        },
      });
      createdStaffingProofClubId = staffingClub.payload.club.id;
      await requestJson(app, {
        method: 'POST',
        url: '/v1/clubs/join',
        headers: authHeaders(parentLogin, 'parent'),
        expectedStatus: 201,
        payload: {
          code: staffingClub.payload.primaryInvite.code,
        },
      });
      const staffingMembership = {
        clubId: staffingClub.payload.club.id,
        role: staffingClub.payload.membership.role,
      };
      const created = await requestJson<{ groupSession: { id: string; status: string } }>(app, {
        method: 'POST',
        url: '/v1/group-sessions',
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 201,
        payload: {
          coachId: coachLogin.user.id,
          clubId: staffingMembership.clubId,
          title: groupTitle,
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

      await requestJson(app, {
        method: 'PATCH',
        url: `/v1/clubs/${staffingMembership.clubId}/work-assignments/${created.payload.groupSession.id}`,
        headers: authHeaders(coachLogin, 'coach'),
        payload: {
          assigneeCoachId: coachLogin.user.id,
        },
      });
      const assignmentHistory = await requestJson<{
        clubId: string;
        assignmentId: string;
        events: Array<{
          action: string;
          actorUserId?: string;
          toCoachId: string;
        }>;
        total: number;
        truncated: boolean;
      }>(app, {
        method: 'GET',
        url: `/v1/clubs/${staffingMembership.clubId}/work-assignments/${created.payload.groupSession.id}/history`,
        headers: authHeaders(coachLogin, 'coach'),
      });
      const deniedAssignmentHistory = await requestJson(app, {
        method: 'GET',
        url: `/v1/clubs/${staffingMembership.clubId}/work-assignments/${created.payload.groupSession.id}/history`,
        headers: authHeaders(parentLogin, 'parent'),
        expectedStatus: 403,
      });
      const latestAssignmentEvent = assignmentHistory.payload.events.at(-1);
      if (
        assignmentHistory.payload.clubId !== staffingMembership.clubId ||
        assignmentHistory.payload.assignmentId !== created.payload.groupSession.id ||
        assignmentHistory.payload.total < 1 ||
        assignmentHistory.payload.truncated !== false ||
        latestAssignmentEvent?.action !== 'UPDATED' ||
        latestAssignmentEvent.actorUserId !== coachLogin.user.id ||
        latestAssignmentEvent.toCoachId !== coachLogin.user.id
      ) {
        throw new Error(
          `Unexpected work assignment history: ${JSON.stringify(assignmentHistory.payload)}`,
        );
      }

      const blockedRegistrationProof = await (async () => {
        let blockCreated = false;
        const blockStartedAt = new Date();
        try {
          await requestJson(app, {
            method: 'POST',
            url: '/v1/blocks',
            headers: authHeaders(parentLogin, 'parent'),
            expectedStatus: 201,
            payload: { blockedUserId: coachLogin.user.id },
          });
          blockCreated = true;
          const denied = await requestJson(app, {
            method: 'POST',
            url: `/v1/group-sessions/${created.payload.groupSession.id}/register`,
            headers: authHeaders(parentLogin, 'parent'),
            expectedStatus: 409,
            payload: {
              athleteId: parentAthleteId,
              parentUserId: parentLogin.user.id,
            },
          });
          const [registrationCount, bookingCount, deniedAudit] = await Promise.all([
            prisma.groupSessionRegistration.count({
              where: {
                groupSessionId: created.payload.groupSession.id,
                athleteId: parentAthleteId,
                deletedAt: null,
              },
            }),
            prisma.booking.count({
              where: {
                groupSessionId: created.payload.groupSession.id,
                bookedByUserId: parentLogin.user.id,
                deletedAt: null,
              },
            }),
            prisma.auditEvent.findFirst({
              where: {
                action: 'group_session.registered',
                actorUserId: parentLogin.user.id,
                resourceId: created.payload.groupSession.id,
                result: 'DENY',
                occurredAt: { gte: blockStartedAt },
              },
              orderBy: { occurredAt: 'desc' },
            }),
          ]);
          const metadata = deniedAudit?.metadataJson as { reason?: string } | null | undefined;
          if (
            registrationCount !== 0 ||
            bookingCount !== 0 ||
            metadata?.reason !== 'active_block_relationship'
          ) {
            throw new Error(
              `Blocked group registration was not denied cleanly: ${JSON.stringify({
                statusCode: denied.statusCode,
                registrationCount,
                bookingCount,
                auditId: deniedAudit?.id ?? null,
                metadata: metadata ?? null,
              })}`,
            );
          }
          return {
            statusCode: denied.statusCode,
            registrationCount,
            bookingCount,
            auditId: deniedAudit?.id ?? null,
          };
        } finally {
          if (blockCreated) {
            await requestJson(app, {
              method: 'DELETE',
              url: `/v1/blocks?blockedUserId=${encodeURIComponent(coachLogin.user.id)}`,
              headers: authHeaders(parentLogin, 'parent'),
            });
          }
        }
      })();

      const registration = await requestJson<{
        registration: {
          id: string;
          sessionId: string;
          athleteId: string;
          parentUserId: string | null;
          status: string;
        };
        booking: { id: string; status: string; groupSessionId: string | null } | null;
        invoice: {
          id: string;
          bookingId: string | null;
          status: string;
          totalMinor: number | null;
          currency: string;
        } | null;
        sessionStatus: string;
      }>(app, {
        method: 'POST',
        url: `/v1/group-sessions/${created.payload.groupSession.id}/register`,
        headers: authHeaders(parentLogin, 'parent'),
        payload: {
          athleteId: parentAthleteId,
          parentUserId: parentLogin.user.id,
        },
      });
      createdRegistrationId = registration.payload.registration.id;

      const roster = await requestJson<{
        total: number;
        registrations: Array<{ id: string; status: string; athleteId: string }>;
      }>(app, {
        method: 'GET',
        url: `/v1/group-sessions/${created.payload.groupSession.id}/roster`,
        headers: authHeaders(coachLogin, 'coach'),
      });

      const linkedBookingId = registration.payload.booking?.id;
      const linkedInvoiceId = registration.payload.invoice?.id;
      const returnedInvoice = registration.payload.invoice;
      if (!linkedBookingId || !linkedInvoiceId || !returnedInvoice) {
        throw new Error(
          `Group registration did not return booking/invoice: ${JSON.stringify(
            registration.payload,
          )}`,
        );
      }

      const [
        dbSession,
        dbRegistration,
        dbBooking,
        dbInvoice,
        dbThread,
        auditEvents,
        assignmentAuditEvents,
      ] =
        await Promise.all([
          prisma.groupSession.findUnique({
            where: { id: created.payload.groupSession.id },
            select: {
              id: true,
              status: true,
              currentParticipants: true,
              title: true,
              clubId: true,
              updatedByUserId: true,
            },
          }),
          prisma.groupSessionRegistration.findUnique({
            where: { id: registration.payload.registration.id },
            select: {
              id: true,
              groupSessionId: true,
              athleteId: true,
              parentUserId: true,
              status: true,
              createdByUserId: true,
            },
          }),
          prisma.booking.findUnique({
            where: { id: linkedBookingId },
            select: {
              id: true,
              groupSessionId: true,
              bookedByUserId: true,
              coachUserId: true,
              status: true,
              priceMinor: true,
              currency: true,
              participants: {
                where: { deletedAt: null },
                select: { athleteId: true, guardianUserId: true, status: true },
              },
            },
          }),
          prisma.invoice.findUnique({
            where: { id: linkedInvoiceId },
            select: {
              id: true,
              bookingId: true,
              status: true,
              totalMinor: true,
              currency: true,
            },
          }),
          prisma.messageThread.findFirst({
            where: {
              groupSessionId: created.payload.groupSession.id,
              threadType: 'GROUP',
              deletedAt: null,
            },
            select: {
              id: true,
              title: true,
              participants: {
                select: {
                  userId: true,
                  role: true,
                  leftAt: true,
                },
              },
            },
          }),
          prisma.auditEvent.findMany({
            where: {
              occurredAt: { gte: auditStartedAt },
              action: 'group_session.registered',
              resourceId: created.payload.groupSession.id,
            },
            select: {
              action: true,
              result: true,
              resourceId: true,
              subjectUserId: true,
              metadataJson: true,
            },
          }),
          prisma.auditEvent.findMany({
            where: {
              occurredAt: { gte: auditStartedAt },
              action: {
                in: [
                  'club_work_assignment.update',
                  'club_work_assignment.history.read',
                ],
              },
              resourceId: created.payload.groupSession.id,
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
        published.payload.groupSession.status !== 'PUBLISHED' ||
        registration.payload.registration.status !== 'REGISTERED' ||
        registration.payload.sessionStatus !== 'PUBLISHED' ||
        roster.payload.total !== 1 ||
        !roster.payload.registrations.some(
          (item) => item.id === registration.payload.registration.id,
        )
      ) {
        throw new Error(
          `Unexpected group session API readback: ${JSON.stringify({
            published: published.payload,
            registration: registration.payload,
            roster: roster.payload,
          })}`,
        );
      }
      if (
        !dbSession ||
        dbSession.status !== 'PUBLISHED' ||
        dbSession.currentParticipants !== 1 ||
        dbSession.title !== groupTitle ||
        dbSession.clubId !== staffingMembership.clubId ||
        dbSession.updatedByUserId !== parentLogin.user.id
      ) {
        throw new Error(
          `Unexpected stored group session: ${JSON.stringify({
            id: dbSession?.id,
            status: dbSession?.status,
            currentParticipants: dbSession?.currentParticipants,
            title: dbSession?.title,
            clubId: dbSession?.clubId,
            updatedByUserId: dbSession?.updatedByUserId,
          })}`,
        );
      }
      if (
        !dbRegistration ||
        dbRegistration.groupSessionId !== created.payload.groupSession.id ||
        dbRegistration.athleteId !== parentAthleteId ||
        dbRegistration.parentUserId !== parentLogin.user.id ||
        dbRegistration.status !== 'REGISTERED' ||
        dbRegistration.createdByUserId !== parentLogin.user.id
      ) {
        throw new Error(`Unexpected stored registration: ${JSON.stringify(dbRegistration)}`);
      }
      if (
        !dbBooking ||
        dbBooking.groupSessionId !== created.payload.groupSession.id ||
        dbBooking.bookedByUserId !== parentLogin.user.id ||
        dbBooking.coachUserId !== coachLogin.user.id ||
        dbBooking.status !== 'CONFIRMED' ||
        dbBooking.participants.length !== 1 ||
        dbBooking.participants[0]?.athleteId !== parentAthleteId ||
        dbBooking.participants[0]?.guardianUserId !== parentLogin.user.id
      ) {
        throw new Error(
          `Unexpected linked group booking: ${JSON.stringify({
            id: dbBooking?.id,
            groupSessionId: dbBooking?.groupSessionId,
            bookedByUserId: dbBooking?.bookedByUserId,
            coachUserId: dbBooking?.coachUserId,
            status: dbBooking?.status,
            participants: dbBooking?.participants,
          })}`,
        );
      }
      if (
        !dbInvoice ||
        dbInvoice.bookingId !== linkedBookingId ||
        dbInvoice.status !== returnedInvoice.status ||
        dbInvoice.totalMinor !== returnedInvoice.totalMinor ||
        dbInvoice.currency !== returnedInvoice.currency
      ) {
        throw new Error(`Unexpected linked group invoice: ${JSON.stringify(dbInvoice)}`);
      }

      const activeThreadParticipants = new Set(
        (dbThread?.participants ?? [])
          .filter((participant) => !participant.leftAt)
          .map((participant) => participant.userId),
      );
      if (
        !dbThread ||
        dbThread.title !== groupTitle ||
        !activeThreadParticipants.has(coachLogin.user.id) ||
        !activeThreadParticipants.has(parentLogin.user.id)
      ) {
        throw new Error(
          `Unexpected linked group thread: ${JSON.stringify({
            id: dbThread?.id,
            title: dbThread?.title,
            participants: dbThread?.participants,
          })}`,
        );
      }
      createdGroupThreadId = dbThread.id;

      const registerAudit = auditEvents.find((event) => event.result === 'SUCCESS');
      const registerMetadata = registerAudit?.metadataJson as
        | { registrationId?: unknown; bookingId?: unknown; invoiceId?: unknown }
        | null
        | undefined;
      if (
        !registerAudit ||
        registerAudit.subjectUserId !== parentLogin.user.id ||
        registerMetadata?.registrationId !== registration.payload.registration.id ||
        registerMetadata?.bookingId !== linkedBookingId ||
        registerMetadata?.invoiceId !== linkedInvoiceId
      ) {
        throw new Error(`Missing group registration audit: ${JSON.stringify(auditEvents)}`);
      }
      if (
        !assignmentAuditEvents.some(
          (event) =>
            event.action === 'club_work_assignment.update' && event.result === 'SUCCESS',
        ) ||
        !assignmentAuditEvents.some(
          (event) =>
            event.action === 'club_work_assignment.history.read' &&
            event.result === 'SUCCESS' &&
            event.sensitiveRead === true,
        ) ||
        !assignmentAuditEvents.some(
          (event) =>
            event.action === 'club_work_assignment.history.read' &&
            event.result === 'DENY' &&
            event.sensitiveRead === true,
        )
      ) {
        throw new Error(
          `Missing work assignment audit proof: ${JSON.stringify(assignmentAuditEvents)}`,
        );
      }

      return {
        clubId: staffingMembership.clubId,
        clubRole: staffingMembership.role,
        sessionId: published.payload.groupSession.id,
        sessionStatus: published.payload.groupSession.status,
        registrationId: registration.payload.registration.id,
        registrationStatus: registration.payload.registration.status,
        bookingId: linkedBookingId,
        invoiceId: linkedInvoiceId,
        threadId: dbThread.id,
        rosterTotal: roster.payload.total,
        assignmentHistoryEvents: assignmentHistory.payload.total,
        deniedAssignmentHistoryStatus: deniedAssignmentHistory.statusCode,
        blockedRegistrationDenied: blockedRegistrationProof,
        auditedActions: auditEvents.length,
        assignmentAuditedActions: assignmentAuditEvents.length,
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

    await check('private upload scanner callback + completion db readback', async () => {
      const scannerToken = process.env.API_UPLOAD_SCAN_RESULT_TOKEN?.trim();
      if (!scannerToken) {
        throw new Error('API_UPLOAD_SCAN_RESULT_TOKEN is required for upload scanner smoke proof');
      }

      await writeUploadScannerHeartbeat({
        prisma,
        workerId: smokeWorkerId,
        status: 'READY',
        version: scannerIdentity,
        metadata: { source: 'staging-smoke' },
      });

      const auditStartedAt = new Date();
      const fileBody = Buffer.from('000000186674797069736f6d0000020069736f6d69736f32', 'hex');
      const sha256Hex = crypto.createHash('sha256').update(fileBody).digest('hex');
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
          kind: 'VIDEO',
          contentType: 'video/mp4',
          fileName: 'codex-api-smoke.mp4',
          sizeBytes: fileBody.length,
          metadata: { source: 'staging-smoke' },
        },
      });
      uploadSmokeArtifact = {
        uploadSessionId: upload.payload.uploadSessionId,
        mediaObjectId: upload.payload.mediaObjectId,
        bucketName: upload.payload.bucketName,
        stagingStorageKey: upload.payload.storageKey,
      };

      const put = await fetch(upload.payload.uploadUrl, {
        method: 'PUT',
        headers: upload.payload.uploadHeaders,
        body: fileBody,
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
      const body = Buffer.from(await get.arrayBuffer());
      if (!get.ok || !body.equals(fileBody)) {
        throw new Error(
          `Signed read failed: status=${get.status} bytes=${body.length} expected=${fileBody.length}`,
        );
      }

      const handoff = await requestJson<{
        mediaStatus: string;
        scanVerdict: string;
        pending: boolean;
      }>(app, {
        method: 'POST',
        url: `/v1/uploads/${upload.payload.uploadSessionId}/complete`,
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 202,
        payload: {
          mediaObjectId: upload.payload.mediaObjectId,
        },
      });
      if (
        handoff.payload.mediaStatus !== 'UPLOADED_UNSCANNED' ||
        handoff.payload.scanVerdict !== 'PENDING' ||
        handoff.payload.pending !== true
      ) {
        throw new Error(`Upload did not enter pending scan state: ${JSON.stringify(handoff.payload)}`);
      }

      const claims = await claimPendingUploadScans({
        prisma,
        workerId: smokeWorkerId,
        limit: 1,
        leaseMs: scanConfig.leaseMs,
        maxAttempts: scanConfig.maxAttempts,
        uploadSessionId: upload.payload.uploadSessionId,
      });
      if (claims.length !== 1) {
        throw new Error(`Expected one upload scan claim, received ${claims.length}`);
      }

      const dependencies = createProductionScanDependencies({
        prisma,
        workerId: smokeWorkerId,
        config: scanConfig,
      });
      dependencies.report = async ({ uploadSessionId, payload }) => {
        await requestJson(app, {
          method: 'POST',
          url: `/v1/uploads/${uploadSessionId}/scan-result`,
          headers: {
            'x-clubroom-upload-scan-token': scannerToken,
          },
          expectedStatus: 201,
          payload,
        });
      };
      const scanOutcome = await processClaimedUploadScan({
        claim: claims[0]!,
        config: scanConfig,
        scannerIdentity,
        dependencies,
      });
      if (scanOutcome.outcome !== 'CLEAN') {
        throw new Error(`Real scanner did not return CLEAN: ${JSON.stringify(scanOutcome)}`);
      }

      const storedScan = await prisma.malwareScanResult.findFirst({
        where: {
          uploadSessionId: upload.payload.uploadSessionId,
          sourceResultId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          mediaObjectId: true,
          verdict: true,
          scanner: true,
          objectSizeBytes: true,
          sha256Hex: true,
          sealedStorageKey: true,
          scannedAt: true,
        },
      });
      if (!storedScan?.sealedStorageKey) {
        throw new Error(`Scanner did not persist a sealed storage key: ${JSON.stringify(storedScan)}`);
      }
      uploadSmokeArtifact.sealedStorageKey = storedScan.sealedStorageKey;

      const completed = await requestJson<{
        uploadSessionId: string;
        mediaObjectId: string;
        mediaStatus: string;
        scanVerdict: string;
        scanner: string;
      }>(app, {
        method: 'POST',
        url: `/v1/uploads/${upload.payload.uploadSessionId}/complete`,
        headers: authHeaders(coachLogin, 'coach'),
        payload: {
          mediaObjectId: upload.payload.mediaObjectId,
          sha256Hex,
        },
      });

      const [storedUpload, storedMedia, auditEvents] = await Promise.all([
        prisma.uploadSession.findUnique({
          where: { id: upload.payload.uploadSessionId },
          select: {
            status: true,
            completedAt: true,
          },
        }),
        prisma.mediaObject.findUnique({
          where: { id: upload.payload.mediaObjectId },
          select: {
            kind: true,
            status: true,
            sha256Hex: true,
            bucketName: true,
            storageKey: true,
          },
        }),
        prisma.auditEvent.findMany({
          where: {
            resourceId: upload.payload.mediaObjectId,
            occurredAt: { gte: auditStartedAt },
            action: {
              in: ['upload.scan_result', 'upload.complete'],
            },
          },
          select: {
            actorUserId: true,
            action: true,
            result: true,
            metadataJson: true,
          },
        }),
      ]);
      if (!storedMedia) {
        throw new Error('Completed upload media row is missing');
      }
      const canonicalRead = createSignedReadUrl({
        bucketName: storedMedia.bucketName,
        storageKey: storedMedia.storageKey,
        expiresInSeconds: 60,
      });
      const canonicalGet = await fetch(canonicalRead.url);
      const canonicalBody = Buffer.from(await canonicalGet.arrayBuffer());

      if (
        storedScan.verdict !== 'CLEAN' ||
        storedScan.scanner !== scannerIdentity ||
        storedScan.objectSizeBytes !== BigInt(fileBody.length) ||
        storedScan.sha256Hex !== sha256Hex ||
        completed.payload.mediaStatus !== 'AVAILABLE' ||
        completed.payload.scanVerdict !== 'CLEAN' ||
        completed.payload.scanner !== scannerIdentity ||
        storedUpload?.status !== 'COMPLETED' ||
        !storedUpload.completedAt ||
        storedMedia.kind !== 'VIDEO' ||
        storedMedia.status !== 'AVAILABLE' ||
        storedMedia.sha256Hex !== sha256Hex ||
        storedMedia.storageKey !== storedScan.sealedStorageKey ||
        !canonicalGet.ok ||
        crypto.createHash('sha256').update(canonicalBody).digest('hex') !== sha256Hex ||
        storedScan.mediaObjectId !== upload.payload.mediaObjectId ||
        storedScan.verdict !== 'CLEAN' ||
        storedScan.scanner !== scannerIdentity ||
        !storedScan.scannedAt
      ) {
        throw new Error(
          `Unexpected completed upload state: ${JSON.stringify({
            scan: {
              ...storedScan,
              objectSizeBytes: storedScan.objectSizeBytes?.toString() ?? null,
            },
            completed: completed.payload,
            storedUpload,
            storedMedia,
          })}`,
        );
      }

      const auditResults = new Set(
        auditEvents.map((event) => `${event.action}:${event.result}:${event.actorUserId ?? 'system'}`),
      );
      if (
        !auditResults.has('upload.scan_result:SUCCESS:system') ||
        !auditResults.has(`upload.complete:SUCCESS:${coachLogin.user.id}`)
      ) {
        throw new Error(`Missing upload audit events: ${JSON.stringify(auditEvents)}`);
      }

      let wrongKindCreate: ApiResponse<unknown> | undefined;
      try {
        await prisma.mediaObject.update({
          where: { id: upload.payload.mediaObjectId },
          data: { kind: 'DOCUMENT' },
        });
        wrongKindCreate = await requestJson(app, {
          method: 'POST',
          url: '/v1/videos',
          headers: authHeaders(coachLogin, 'coach'),
          expectedStatus: 400,
          payload: {
            mediaObjectId: upload.payload.mediaObjectId,
            title: 'Wrong kind staging proof',
          },
        });
      } finally {
        await prisma.mediaObject.update({
          where: { id: upload.payload.mediaObjectId },
          data: { kind: 'VIDEO' },
        });
      }
      const videosAfterWrongKind = await prisma.video.count({
        where: { mediaObjectId: upload.payload.mediaObjectId },
      });
      if (
        !wrongKindCreate ||
        !/kind must be video/i.test(JSON.stringify(wrongKindCreate.payload)) ||
        videosAfterWrongKind !== 0
      ) {
        throw new Error(
          `Non-video media was not denied before persistence: ${JSON.stringify({
            response: wrongKindCreate?.payload,
            videosAfterWrongKind,
          })}`,
        );
      }

      const createdVideo = await requestJson<{
        video: {
          id: string;
          title: string;
          description?: string;
          mediaObjectId: string;
          uploadStatus: string;
        };
      }>(app, {
        method: 'POST',
        url: '/v1/videos',
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 201,
        payload: {
          mediaObjectId: upload.payload.mediaObjectId,
          title: 'Staging Technical Review',
          description: 'Supabase video lifecycle proof',
          durationSeconds: 2,
        },
      });
      uploadSmokeArtifact.videoId = createdVideo.payload.video.id;

      const updatedVideo = await requestJson<{
        video: { id: string; title: string; description?: string };
      }>(app, {
        method: 'PATCH',
        url: `/v1/videos/${createdVideo.payload.video.id}`,
        headers: authHeaders(coachLogin, 'coach'),
        payload: {
          title: 'Staging Technical Review Updated',
        },
      });
      if (updatedVideo.payload.video.description !== 'Supabase video lifecycle proof') {
        throw new Error(
          `Video PATCH cleared an omitted description: ${JSON.stringify(updatedVideo.payload)}`,
        );
      }

      const createdAnnotation = await requestJson<{
        annotation: { id: string; timestamp: number; label: string; note?: string; type: string };
      }>(app, {
        method: 'POST',
        url: `/v1/videos/${createdVideo.payload.video.id}/annotations`,
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 201,
        payload: {
          timestamp: 1,
          label: 'Footwork',
          note: 'Open up earlier',
          type: 'TECHNIQUE',
        },
      });
      uploadSmokeArtifact.annotationId = createdAnnotation.payload.annotation.id;

      const updatedAnnotation = await requestJson<{
        annotation: { id: string; timestamp: number; label: string; note?: string; type: string };
      }>(app, {
        method: 'PATCH',
        url: `/v1/videos/${createdVideo.payload.video.id}/annotations/${createdAnnotation.payload.annotation.id}`,
        headers: authHeaders(coachLogin, 'coach'),
        payload: {
          timestamp: 2,
          label: 'Body position',
          note: 'Receive on the back foot',
          type: 'IMPROVEMENT',
        },
      });

      const videoDetail = await requestJson<{
        video: {
          id: string;
          title: string;
          description?: string;
          annotations: Array<{ id: string; label: string; type: string }>;
        };
      }>(app, {
        method: 'GET',
        url: `/v1/videos/${createdVideo.payload.video.id}`,
        headers: authHeaders(coachLogin, 'coach'),
      });
      if (
        createdVideo.payload.video.mediaObjectId !== upload.payload.mediaObjectId ||
        createdVideo.payload.video.uploadStatus !== 'READY' ||
        updatedVideo.payload.video.title !== 'Staging Technical Review Updated' ||
        updatedAnnotation.payload.annotation.label !== 'Body position' ||
        updatedAnnotation.payload.annotation.type !== 'IMPROVEMENT' ||
        !videoDetail.payload.video.annotations.some(
          (annotation) =>
            annotation.id === createdAnnotation.payload.annotation.id &&
            annotation.label === 'Body position' &&
            annotation.type === 'IMPROVEMENT',
        )
      ) {
        throw new Error(
          `Unexpected video lifecycle response: ${JSON.stringify({
            created: createdVideo.payload,
            updated: updatedVideo.payload,
            annotation: updatedAnnotation.payload,
            detail: videoDetail.payload,
          })}`,
        );
      }

      await requestJson(app, {
        method: 'DELETE',
        url: `/v1/videos/${createdVideo.payload.video.id}/annotations/${createdAnnotation.payload.annotation.id}`,
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 204,
      });
      await requestJson(app, {
        method: 'DELETE',
        url: `/v1/videos/${createdVideo.payload.video.id}`,
        headers: authHeaders(coachLogin, 'coach'),
        expectedStatus: 204,
      });

      const [storedVideo, storedAnnotation, videoAuditEvents] = await Promise.all([
        prisma.video.findUnique({
          where: { id: createdVideo.payload.video.id },
          select: {
            mediaObjectId: true,
            title: true,
            description: true,
            deletedAt: true,
          },
        }),
        prisma.videoAnnotation.findUnique({
          where: { id: createdAnnotation.payload.annotation.id },
          select: {
            videoId: true,
            timestampMs: true,
            text: true,
            note: true,
            annotationType: true,
            deletedAt: true,
          },
        }),
        prisma.auditEvent.findMany({
          where: {
            occurredAt: { gte: auditStartedAt },
            resourceId: {
              in: [
                upload.payload.mediaObjectId,
                createdVideo.payload.video.id,
                createdAnnotation.payload.annotation.id,
              ],
            },
            action: {
              in: [
                'video.create',
                'video.update',
                'video.read',
                'video.annotation.create',
                'video.annotation.update',
                'video.annotation.archive',
                'video.archive',
              ],
            },
          },
          select: {
            actorUserId: true,
            action: true,
            resourceId: true,
            result: true,
          },
        }),
      ]);
      if (
        storedVideo?.mediaObjectId !== upload.payload.mediaObjectId ||
        storedVideo.title !== 'Staging Technical Review Updated' ||
        storedVideo.description !== 'Supabase video lifecycle proof' ||
        !storedVideo.deletedAt ||
        storedAnnotation?.videoId !== createdVideo.payload.video.id ||
        storedAnnotation.timestampMs !== 2000 ||
        storedAnnotation.text !== 'Body position' ||
        storedAnnotation.note !== 'Receive on the back foot' ||
        storedAnnotation.annotationType !== 'IMPROVEMENT' ||
        !storedAnnotation.deletedAt
      ) {
        throw new Error(
          `Video lifecycle DB readback failed: ${JSON.stringify({
            storedVideo,
            storedAnnotation,
          })}`,
        );
      }
      const videoAuditResults = new Set(
        videoAuditEvents.map(
          (event) => `${event.action}:${event.result}:${event.resourceId}:${event.actorUserId}`,
        ),
      );
      for (const [action, resourceId] of [
        ['video.create', createdVideo.payload.video.id],
        ['video.update', createdVideo.payload.video.id],
        ['video.read', createdVideo.payload.video.id],
        ['video.annotation.create', createdAnnotation.payload.annotation.id],
        ['video.annotation.update', createdAnnotation.payload.annotation.id],
        ['video.annotation.archive', createdAnnotation.payload.annotation.id],
        ['video.archive', createdVideo.payload.video.id],
      ]) {
        const expected = `${action}:SUCCESS:${resourceId}:${coachLogin.user.id}`;
        if (!videoAuditResults.has(expected)) {
          throw new Error(`Missing video audit ${expected}: ${JSON.stringify(videoAuditEvents)}`);
        }
      }
      const deniedCreateAudit = videoAuditEvents.some(
        (event) =>
          event.action === 'video.create' &&
          event.result === 'DENY' &&
          event.resourceId === upload.payload.mediaObjectId &&
          event.actorUserId === coachLogin.user.id,
      );
      if (!deniedCreateAudit) {
        throw new Error(`Missing non-video denial audit: ${JSON.stringify(videoAuditEvents)}`);
      }

      return {
        uploadSessionId: upload.payload.uploadSessionId,
        mediaObjectId: upload.payload.mediaObjectId,
        bucketName: upload.payload.bucketName,
        uploadedAndReadBack: true,
        scannerWorkerAuthenticated: true,
        scanVerdict: storedScan.verdict,
        mediaStatus: storedMedia.status,
        uploadStatus: storedUpload.status,
        checksumVerified: storedMedia.sha256Hex === sha256Hex,
        exactBytesScanned: storedScan.objectSizeBytes === BigInt(fileBody.length),
        sealedObjectAuthoritative: true,
        videoId: createdVideo.payload.video.id,
        annotationId: createdAnnotation.payload.annotation.id,
        videoPatchPreservedDescription: true,
        videoAndAnnotationSoftArchived: true,
        auditedActions: auditEvents.length + videoAuditEvents.length,
      };
    });

    await check('group session thread message db + audit readback', async () => {
      if (!createdGroupThreadId || !createdGroupSessionId) {
        throw new Error('Group session thread proof requires a created group session thread');
      }
      const auditStartedAt = new Date();
      const messageBody = `Staging smoke group thread ${auditStartedAt.toISOString()}`;
      const created = await requestJson<{
        message: {
          id: string;
          messageThreadId: string;
          senderUserId: string;
          content: string;
        };
        thread: {
          id: string;
          messages?: Array<{ id: string; content: string }>;
        };
      }>(app, {
        method: 'POST',
        url: `/v1/message-threads/${createdGroupThreadId}/messages`,
        headers: authHeaders(parentLogin, 'parent'),
        expectedStatus: 201,
        payload: {
          body: messageBody,
        },
      });
      createdThreadMessageId = created.payload.message.id;

      const read = await requestJson<{ thread: { id: string } }>(app, {
        method: 'POST',
        url: `/v1/message-threads/${createdGroupThreadId}/read`,
        headers: authHeaders(coachLogin, 'coach'),
      });

      const [dbThread, dbMessage, dbReceipts, dbParticipants, auditEvents] = await Promise.all([
        prisma.messageThread.findUnique({
          where: { id: createdGroupThreadId },
          select: {
            id: true,
            groupSessionId: true,
            lastMessageAt: true,
            updatedByUserId: true,
          },
        }),
        prisma.message.findUnique({
          where: { id: createdThreadMessageId },
          select: {
            id: true,
            messageThreadId: true,
            senderUserId: true,
            content: true,
            attachmentsJson: true,
            deletedAt: true,
            createdAt: true,
          },
        }),
        prisma.messageReceipt.findMany({
          where: { messageId: createdThreadMessageId },
          select: { userId: true, deliveredAt: true, readAt: true },
        }),
        prisma.messageParticipant.findMany({
          where: {
            messageThreadId: createdGroupThreadId,
            leftAt: null,
          },
          select: { userId: true, lastReadAt: true },
        }),
        prisma.auditEvent.findMany({
          where: {
            occurredAt: { gte: auditStartedAt },
            action: {
              in: ['community.thread-message.create', 'community.thread-message.read'],
            },
          },
          select: {
            action: true,
            resourceType: true,
            resourceId: true,
            result: true,
            actorUserId: true,
            metadataJson: true,
          },
        }),
      ]);

      if (
        created.payload.message.messageThreadId !== createdGroupThreadId ||
        created.payload.message.senderUserId !== parentLogin.user.id ||
        created.payload.message.content !== messageBody ||
        created.payload.thread.id !== createdGroupThreadId ||
        read.payload.thread.id !== createdGroupThreadId
      ) {
        throw new Error(
          `Unexpected group thread message API response: ${JSON.stringify({
            created: created.payload,
            read: read.payload,
          })}`,
        );
      }
      if (
        !dbThread ||
        dbThread.groupSessionId !== createdGroupSessionId ||
        dbThread.updatedByUserId !== parentLogin.user.id ||
        !dbThread.lastMessageAt
      ) {
        throw new Error(`Unexpected stored message thread: ${JSON.stringify(dbThread)}`);
      }
      if (
        !dbMessage ||
        dbMessage.messageThreadId !== createdGroupThreadId ||
        dbMessage.senderUserId !== parentLogin.user.id ||
        dbMessage.content !== messageBody ||
        dbMessage.deletedAt
      ) {
        throw new Error(`Unexpected stored thread message: ${JSON.stringify(dbMessage)}`);
      }
      const attachments = Array.isArray(dbMessage.attachmentsJson)
        ? dbMessage.attachmentsJson
        : [];
      if (attachments.length !== 0) {
        throw new Error(`Unexpected thread message attachments: ${JSON.stringify(attachments)}`);
      }

      const participantIds = new Set(dbParticipants.map((participant) => participant.userId));
      const receiptByUserId = new Map(dbReceipts.map((receipt) => [receipt.userId, receipt]));
      if (
        dbReceipts.length !== participantIds.size ||
        !participantIds.has(parentLogin.user.id) ||
        !participantIds.has(coachLogin.user.id)
      ) {
        throw new Error(
          `Unexpected thread participants/receipts: ${JSON.stringify({
            participants: dbParticipants,
            receipts: dbReceipts,
          })}`,
        );
      }
      for (const userId of participantIds) {
        if (!receiptByUserId.get(userId)?.deliveredAt) {
          throw new Error(`Missing delivered receipt for ${userId}: ${JSON.stringify(dbReceipts)}`);
        }
      }
      if (
        !receiptByUserId.get(parentLogin.user.id)?.readAt ||
        !receiptByUserId.get(coachLogin.user.id)?.readAt ||
        !dbParticipants.find((participant) => participant.userId === coachLogin.user.id)?.lastReadAt
      ) {
        throw new Error(
          `Thread read receipts did not persist: ${JSON.stringify({
            participants: dbParticipants,
            receipts: dbReceipts,
          })}`,
        );
      }

      const createdAudit = auditEvents.find(
        (event) =>
          event.action === 'community.thread-message.create' &&
          event.result === 'SUCCESS' &&
          event.resourceType === 'message' &&
          event.resourceId === createdThreadMessageId &&
          event.actorUserId === parentLogin.user.id,
      );
      const readAudit = auditEvents.find(
        (event) =>
          event.action === 'community.thread-message.read' &&
          event.result === 'SUCCESS' &&
          event.resourceType === 'message_thread' &&
          event.resourceId === createdGroupThreadId &&
          event.actorUserId === coachLogin.user.id,
      );
      const createdMetadata = createdAudit?.metadataJson as
        | { messageThreadId?: unknown; attachmentCount?: unknown }
        | null
        | undefined;
      if (
        !createdAudit ||
        !readAudit ||
        createdMetadata?.messageThreadId !== createdGroupThreadId ||
        createdMetadata?.attachmentCount !== 0
      ) {
        throw new Error(`Missing thread message audit: ${JSON.stringify(auditEvents)}`);
      }

      return {
        threadId: createdGroupThreadId,
        messageId: createdThreadMessageId,
        receiptCount: dbReceipts.length,
        auditedActions: auditEvents.length,
      };
    });

    await check('follow lifecycle db + audit readback', async () => {
      const followerUserId = parentLogin.user.id;
      const followedUserId = coachLogin.user.id;
      const auditStartedAt = new Date();
      const originalFollow = await prisma.userFollow.findUnique({
        where: {
          followerUserId_followedUserId: {
            followerUserId,
            followedUserId,
          },
        },
      });
      let followId: string | undefined;

      try {
        const created = await requestJson<{
          follow: {
            id: string;
            followerId: string;
            followingId: string;
            notifyOnPost: boolean;
            notifyOnSession: boolean;
          };
        }>(app, {
          method: 'POST',
          url: '/v1/follows',
          headers: authHeaders(parentLogin, 'parent'),
          expectedStatus: 201,
          payload: {
            followingId: followedUserId,
            notifyOnPost: false,
            notifyOnSession: false,
          },
        });
        followId = created.payload.follow.id;
        if (
          created.payload.follow.followerId !== followerUserId ||
          created.payload.follow.followingId !== followedUserId ||
          created.payload.follow.notifyOnPost !== false ||
          created.payload.follow.notifyOnSession !== false
        ) {
          throw new Error(`Unexpected follow create response: ${JSON.stringify(created.payload)}`);
        }

        const visible = await requestJson<{
          follow: { id: string } | null;
          following: boolean;
        }>(app, {
          method: 'GET',
          url: `/v1/follows?targetUserId=${encodeURIComponent(followedUserId)}`,
          headers: authHeaders(parentLogin, 'parent'),
        });
        if (!visible.payload.following || visible.payload.follow?.id !== followId) {
          throw new Error(`Follow status did not read back: ${JSON.stringify(visible.payload)}`);
        }

        const updated = await requestJson<{
          follow: {
            id: string;
            notifyOnPost: boolean;
            notifyOnSession: boolean;
          } | null;
          updated: boolean;
        }>(app, {
          method: 'PATCH',
          url: `/v1/follows?followingId=${encodeURIComponent(followedUserId)}`,
          headers: authHeaders(parentLogin, 'parent'),
          payload: {
            notifyOnPost: true,
            notifyOnSession: false,
          },
        });
        if (
          !updated.payload.updated ||
          updated.payload.follow?.id !== followId ||
          updated.payload.follow.notifyOnPost !== true ||
          updated.payload.follow.notifyOnSession !== false
        ) {
          throw new Error(`Unexpected follow preference update: ${JSON.stringify(updated.payload)}`);
        }

        const storedActive = await prisma.userFollow.findUnique({
          where: {
            followerUserId_followedUserId: {
              followerUserId,
              followedUserId,
            },
          },
        });
        if (
          storedActive?.id !== followId ||
          storedActive.deletedAt !== null ||
          storedActive.notifyOnPost !== true ||
          storedActive.notifyOnSession !== false
        ) {
          throw new Error(`Follow update was not persisted: ${JSON.stringify(storedActive)}`);
        }

        const removed = await requestJson<{
          follow: { id: string } | null;
          removed: boolean;
        }>(app, {
          method: 'DELETE',
          url: `/v1/follows?followingId=${encodeURIComponent(followedUserId)}`,
          headers: authHeaders(parentLogin, 'parent'),
        });
        if (!removed.payload.removed || removed.payload.follow?.id !== followId) {
          throw new Error(`Unexpected follow removal: ${JSON.stringify(removed.payload)}`);
        }

        const [storedRemoved, hidden, auditEvents] = await Promise.all([
          prisma.userFollow.findUnique({
            where: {
              followerUserId_followedUserId: {
                followerUserId,
                followedUserId,
              },
            },
          }),
          requestJson<{ follow: null; following: boolean }>(app, {
            method: 'GET',
            url: `/v1/follows?targetUserId=${encodeURIComponent(followedUserId)}`,
            headers: authHeaders(parentLogin, 'parent'),
          }),
          prisma.auditEvent.findMany({
            where: {
              actorUserId: followerUserId,
              occurredAt: { gte: auditStartedAt },
              action: {
                in: [
                  'users.follow.create',
                  'users.follow.read',
                  'users.follow.update',
                  'users.follow.remove',
                ],
              },
            },
            select: {
              action: true,
              resourceId: true,
              result: true,
            },
          }),
        ]);
        if (
          storedRemoved?.id !== followId ||
          !storedRemoved.deletedAt ||
          storedRemoved.deletedByUserId !== followerUserId ||
          hidden.payload.following !== false ||
          hidden.payload.follow !== null
        ) {
          throw new Error(
            `Follow soft removal was not authoritative: ${JSON.stringify({ storedRemoved, hidden: hidden.payload })}`,
          );
        }

        const auditedActions = new Set(
          auditEvents
            .filter((event) => event.result === 'SUCCESS')
            .map((event) => event.action),
        );
        for (const action of [
          'users.follow.create',
          'users.follow.read',
          'users.follow.update',
          'users.follow.remove',
        ]) {
          if (!auditedActions.has(action)) {
            throw new Error(`Missing follow audit action ${action}: ${JSON.stringify(auditEvents)}`);
          }
        }

        return {
          followId,
          preferencesPersisted: true,
          softRemoved: true,
          auditedActions: auditEvents.length,
        };
      } finally {
        if (originalFollow) {
          await prisma.userFollow.upsert({
            where: {
              followerUserId_followedUserId: {
                followerUserId,
                followedUserId,
              },
            },
            create: originalFollow,
            update: {
              followerType: originalFollow.followerType,
              followingType: originalFollow.followingType,
              notifyOnPost: originalFollow.notifyOnPost,
              notifyOnSession: originalFollow.notifyOnSession,
              createdAt: originalFollow.createdAt,
              updatedAt: originalFollow.updatedAt,
              deletedAt: originalFollow.deletedAt,
              deletedByUserId: originalFollow.deletedByUserId,
            },
          });
        } else {
          await prisma.userFollow.deleteMany({
            where: {
              followerUserId,
              followedUserId,
            },
          });
        }
        if (followId) {
          await prisma.notification.deleteMany({
            where: {
              sourceType: 'user_follow',
              sourceId: followId,
              createdAt: { gte: auditStartedAt },
            },
          });
        }
      }
    });

    await check('notification preferences persist through db authority', async () => {
      const userId = parentLogin.user.id;
      const auditStartedAt = new Date();
      const [originalPreferences, originalQuietHours] = await Promise.all([
        prisma.notificationPreference.findUnique({ where: { userId } }),
        prisma.quietHours.findUnique({ where: { userId } }),
      ]);
      const nextPushEnabled = !(originalPreferences?.pushEnabled ?? true);
      const nextQuietHoursEnabled = !(originalQuietHours?.enabled ?? false);

      try {
        const updated = await requestJson<{
          preferences: {
            userId: string;
            pushEnabled: boolean;
          };
          quietHours: {
            userId: string;
            enabled: boolean;
            startTimeLocal: string | null;
            endTimeLocal: string | null;
            timeZone: string | null;
          } | null;
        }>(app, {
          method: 'PATCH',
          url: '/v1/me/notifications/preferences',
          headers: authHeaders(parentLogin, 'parent'),
          payload: {
            channels: {
              push: nextPushEnabled,
            },
            quietHours: {
              enabled: nextQuietHoursEnabled,
              startTime: '21:15',
              endTime: '06:30',
              timezone: 'Europe/London',
            },
          },
        });
        const listed = await requestJson<{
          preferences: { userId: string; pushEnabled: boolean } | null;
          quietHours: {
            userId: string;
            enabled: boolean;
            startTimeLocal: string | null;
            endTimeLocal: string | null;
            timeZone: string | null;
          } | null;
        }>(app, {
          method: 'GET',
          url: '/v1/me/notifications',
          headers: authHeaders(parentLogin, 'parent'),
        });
        const [persistedPreferences, persistedQuietHours, audit] = await Promise.all([
          prisma.notificationPreference.findUnique({ where: { userId } }),
          prisma.quietHours.findUnique({ where: { userId } }),
          prisma.auditEvent.findFirst({
            where: {
              action: 'notification.preferences.update',
              resourceId: userId,
              result: 'SUCCESS',
              occurredAt: { gte: auditStartedAt },
            },
            orderBy: { occurredAt: 'desc' },
          }),
        ]);

        if (
          updated.payload.preferences.userId !== userId ||
          updated.payload.preferences.pushEnabled !== nextPushEnabled ||
          updated.payload.quietHours?.enabled !== nextQuietHoursEnabled ||
          listed.payload.preferences?.pushEnabled !== nextPushEnabled ||
          listed.payload.quietHours?.timeZone !== 'Europe/London' ||
          persistedPreferences?.pushEnabled !== nextPushEnabled ||
          persistedQuietHours?.startTimeLocal !== '21:15' ||
          persistedQuietHours?.endTimeLocal !== '06:30' ||
          persistedQuietHours?.timeZone !== 'Europe/London' ||
          !audit
        ) {
          throw new Error(
            `Notification preference authority proof failed: ${JSON.stringify({
              updated: updated.payload,
              listed: listed.payload,
              persistedPreferences,
              persistedQuietHours,
              auditId: audit?.id,
            })}`,
          );
        }

        return {
          userId,
          preferencePersisted: true,
          quietHoursPersisted: true,
          readAfterWriteMatched: true,
          auditId: audit.id,
        };
      } finally {
        if (originalPreferences) {
          await prisma.notificationPreference.upsert({
            where: { userId },
            create: {
              ...originalPreferences,
              settingsJson: originalPreferences.settingsJson as never,
            },
            update: {
              pushEnabled: originalPreferences.pushEnabled,
              emailEnabled: originalPreferences.emailEnabled,
              smsEnabled: originalPreferences.smsEnabled,
              settingsJson: originalPreferences.settingsJson as never,
              createdAt: originalPreferences.createdAt,
              updatedAt: originalPreferences.updatedAt,
            },
          });
        } else {
          await prisma.notificationPreference.deleteMany({ where: { userId } });
        }
        if (originalQuietHours) {
          await prisma.quietHours.upsert({
            where: { userId },
            create: originalQuietHours,
            update: {
              enabled: originalQuietHours.enabled,
              startTimeLocal: originalQuietHours.startTimeLocal,
              endTimeLocal: originalQuietHours.endTimeLocal,
              timeZone: originalQuietHours.timeZone,
              createdAt: originalQuietHours.createdAt,
              updatedAt: originalQuietHours.updatedAt,
            },
          });
        } else {
          await prisma.quietHours.deleteMany({ where: { userId } });
        }
      }
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
        requestJson<{ notifications: unknown[] }>(app, {
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
        notifications: notifications.payload.notifications.length,
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
        bookingStepAnalyticsEvent,
        event,
        eventRsvp,
        eventAttendance,
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
        createdBookingStepAnalyticsEventId
          ? prisma.bookingStepAnalyticsEvent.findUnique({
              where: { id: createdBookingStepAnalyticsEventId },
              select: { status: true },
            })
          : null,
        createdEventId
          ? prisma.clubEvent.findUnique({
              where: { id: createdEventId },
              select: { status: true, deletedAt: true },
            })
          : null,
        createdEventRsvpId
          ? prisma.eventRsvp.findUnique({
              where: { id: createdEventRsvpId },
              select: { status: true },
            })
          : null,
        createdEventAttendanceId
          ? prisma.eventAttendance.findUnique({
              where: { id: createdEventAttendanceId },
              select: { deletedAt: true },
            })
          : null,
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
        bookingStepAnalyticsEvent: bookingStepAnalyticsEvent?.status,
        event: event?.status,
        eventActive: Boolean(event && !event.deletedAt),
        eventRsvp: eventRsvp?.status,
        eventAttendanceActive: Boolean(eventAttendance && !eventAttendance.deletedAt),
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
    try {
      if (uploadSmokeArtifact) {
        const storedSealedKey =
          uploadSmokeArtifact.sealedStorageKey ??
          (
            await prisma.malwareScanResult.findFirst({
              where: { mediaObjectId: uploadSmokeArtifact.mediaObjectId },
              orderBy: { createdAt: 'desc' },
              select: { sealedStorageKey: true },
            })
          )?.sealedStorageKey ??
          undefined;
        const storedVideos = await prisma.video.findMany({
          where: { mediaObjectId: uploadSmokeArtifact.mediaObjectId },
          select: { id: true },
        });
        const videoIds = storedVideos.map((video) => video.id);
        const storedAnnotations = videoIds.length
          ? await prisma.videoAnnotation.findMany({
              where: { videoId: { in: videoIds } },
              select: { id: true },
            })
          : [];
        const videoResourceIds = [
          uploadSmokeArtifact.mediaObjectId,
          ...videoIds,
          ...storedAnnotations.map((annotation) => annotation.id),
        ];
        await deletePrivateStorageObject({
          bucketName: uploadSmokeArtifact.bucketName,
          storageKey: uploadSmokeArtifact.stagingStorageKey,
        }).catch(() => undefined);
        if (storedSealedKey) {
          await deletePrivateStorageObject({
            bucketName: uploadSmokeArtifact.bucketName,
            storageKey: storedSealedKey,
          }).catch(() => undefined);
        }
        await prisma.$transaction([
          prisma.auditEvent.deleteMany({
            where: {
              resourceId: { in: videoResourceIds },
              action: {
                in: [
                  'upload.init',
                  'upload.scan_pending',
                  'upload.scan_result',
                  'upload.complete',
                  'video.create',
                  'video.update',
                  'video.read',
                  'video.annotation.create',
                  'video.annotation.update',
                  'video.annotation.archive',
                  'video.archive',
                ],
              },
            },
          }),
          prisma.videoShare.deleteMany({
            where: { videoId: { in: videoIds } },
          }),
          prisma.videoAnnotation.deleteMany({
            where: { videoId: { in: videoIds } },
          }),
          prisma.video.deleteMany({
            where: { id: { in: videoIds } },
          }),
          prisma.uploadSession.deleteMany({
            where: { id: uploadSmokeArtifact.uploadSessionId },
          }),
          prisma.malwareScanResult.deleteMany({
            where: { mediaObjectId: uploadSmokeArtifact.mediaObjectId },
          }),
          prisma.mediaObject.deleteMany({
            where: { id: uploadSmokeArtifact.mediaObjectId },
          }),
        ]);
      }
      if (coachLogin) {
        await cleanupStagingSmokeArtifacts(prisma, coachLogin.user.id);
      }
      if (createdStaffingProofClubId && coachLogin) {
        await prisma.club.updateMany({
          where: {
            id: createdStaffingProofClubId,
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
            deletedByUserId: coachLogin.user.id,
            updatedByUserId: coachLogin.user.id,
          },
        });
      }
    } finally {
      await removeUploadScannerHeartbeat({
        prisma,
        workerId: smokeWorkerId,
      }).catch(() => undefined);
      await app.close();
      await prisma.$disconnect();
    }
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
