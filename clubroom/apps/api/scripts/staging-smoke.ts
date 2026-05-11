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
  let parentAthleteId: string | undefined;
  let parentFamilyId: string | undefined;
  let createdBookingId: string | undefined;
  let createdInvoiceId: string | undefined;
  let createdGroupSessionId: string | undefined;
  let createdRegistrationId: string | undefined;

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

      if (!coach || !parent || !guardianLink) {
        throw new Error('Expected seeded coach, parent, and guardian-child link to exist');
      }

      parentAthleteId = guardianLink.athleteId;
      parentFamilyId = guardianLink.familyId;
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
          (issue) => issue.code !== 'SENTRY_DSN_MISSING',
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

    if (!coachLogin || !parentLogin || !parentAthleteId || !parentFamilyId) {
      throw new Error(
        'Cannot continue route smoke without coach, parent, family, and athlete context',
      );
    }

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
              notes: 'Created by apps/api/scripts/staging-smoke.ts',
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
      const [booking, invoice, groupSession, registration] = await Promise.all([
        createdBookingId ? prisma.booking.findUnique({ where: { id: createdBookingId } }) : null,
        createdInvoiceId ? prisma.invoice.findUnique({ where: { id: createdInvoiceId } }) : null,
        createdGroupSessionId
          ? prisma.groupSession.findUnique({ where: { id: createdGroupSessionId } })
          : null,
        createdRegistrationId
          ? prisma.groupSessionRegistration.findUnique({ where: { id: createdRegistrationId } })
          : null,
      ]);

      return {
        booking: booking?.status,
        invoice: invoice?.status,
        groupSession: groupSession?.status,
        registration: registration?.status,
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
