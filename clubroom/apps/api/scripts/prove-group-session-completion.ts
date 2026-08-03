import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPrismaClient } from '@clubroom/db';
import { buildApp } from '../src/app.js';

interface TestAccount {
  email: string;
  password: string;
  roles: string[];
  attached: string;
}

interface LoginResponse {
  user: {
    id: string;
    roles: string[];
  };
  tokens: {
    accessToken: string;
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const credentialsPath = path.join(
  repoRoot,
  'docs/backend-api/test-data/TEST_ACCOUNTS.staging.local.txt',
);
const mcpConfigPath = path.join(repoRoot, '.mcp.json');

function parseTestAccounts(source: string): TestAccount[] {
  return source.split(/\n\s*\n/).flatMap((block) => {
    const values = new Map(
      block.split('\n').flatMap((line) => {
        const separator = line.indexOf(':');
        if (separator < 0) return [];
        return [[line.slice(0, separator).trim(), line.slice(separator + 1).trim()] as const];
      }),
    );
    const email = values.get('Email');
    const password = values.get('Password');
    if (!email || !password) return [];
    return [
      {
        email,
        password,
        roles: (values.get('Roles') ?? '')
          .split(',')
          .map((role) => role.trim())
          .filter(Boolean),
        attached: values.get('Attached') ?? '',
      },
    ];
  });
}

function assertStagingRuntime(): void {
  assert.equal(
    process.env.API_DATA_BACKEND,
    'db',
    'Group completion proof requires API_DATA_BACKEND=db.',
  );
  assert.ok(process.env.DATABASE_URL, 'Group completion proof requires DATABASE_URL.');
  assert.equal(
    /\bprod(?:uction)?\b/i.test(process.env.DATABASE_URL ?? ''),
    false,
    'Refusing to run against a production-looking DATABASE_URL.',
  );
  const mode = fs.statSync(credentialsPath).mode & 0o777;
  assert.equal(mode & 0o077, 0, 'Staging credential file must not be group/world accessible.');
}

function resolveConfiguredProjectRef(): string {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
  const usernameMatch = decodeURIComponent(databaseUrl.username).match(/^postgres\.([a-z0-9]+)$/i);
  assert.ok(usernameMatch?.[1], 'DATABASE_URL username does not identify a Supabase project.');
  const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8')) as {
    mcpServers?: { supabase?: { url?: string } };
  };
  const mcpProjectRef = new URL(mcpConfig.mcpServers?.supabase?.url ?? '').searchParams.get(
    'project_ref',
  );
  assert.equal(
    usernameMatch[1],
    mcpProjectRef,
    'DATABASE_URL and Supabase MCP target different projects.',
  );
  return usernameMatch[1];
}

async function main(): Promise<void> {
  assertStagingRuntime();
  const projectRef = resolveConfiguredProjectRef();
  const account = parseTestAccounts(fs.readFileSync(credentialsPath, 'utf8')).find(
    (candidate) =>
      candidate.roles.includes('coach') && candidate.attached.includes('coachProfile=yes'),
  );
  assert.ok(account, 'A staging coach account with a coach profile is required.');

  const app = buildApp({ allowTestAuthHeaders: false });
  const prisma = getPrismaClient();
  const suffix = crypto.randomUUID();
  const sessionId = `gse_stage_proof_${suffix}`;
  const registrationId = `gsr_stage_proof_${suffix}`;
  const bookingId = `bok_stage_proof_${suffix}`;
  const participantId = `bkp_stage_proof_${suffix}`;
  const rejectedSessionId = `gse_stage_rollback_${suffix}`;
  const rejectedRegistrationId = `gsr_stage_rollback_${suffix}`;
  const rejectedBookingId = `bok_stage_rollback_${suffix}`;
  const rejectedParticipantId = `bkp_stage_rollback_${suffix}`;
  let cleanupComplete = false;

  try {
    await app.ready();
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: account.email,
        password: account.password,
      },
    });
    assert.equal(loginResponse.statusCode, 200, 'Staging coach login failed.');
    const login = loginResponse.json() as LoginResponse;
    assert.ok(login.tokens.accessToken, 'Staging login did not return an access token.');
    assert.ok(login.user.roles.includes('coach'), 'Staging account is not a coach.');

    const guardianLink = await prisma.guardianChildLink.findFirst({
      where: {
        deletedAt: null,
        athlete: {
          deletedAt: null,
          status: 'active',
        },
      },
      select: {
        guardianUserId: true,
        athlete: {
          select: {
            id: true,
          },
        },
      },
    });
    assert.ok(
      guardianLink,
      'Staging database has no active guardian-child relationship for completion proof.',
    );

    const firstStartsAt = new Date();
    firstStartsAt.setUTCDate(firstStartsAt.getUTCDate() - 8);
    firstStartsAt.setUTCHours(10, 0, 0, 0);
    const firstEndsAt = new Date(firstStartsAt);
    firstEndsAt.setUTCHours(11, 0, 0, 0);
    const startsAt = new Date();
    startsAt.setUTCDate(startsAt.getUTCDate() - 1);
    startsAt.setUTCHours(10, 0, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setUTCHours(11, 0, 0, 0);
    const firstOccurrenceDate = firstStartsAt.toISOString().slice(0, 10);
    const occurrenceDate = startsAt.toISOString().slice(0, 10);

    await prisma.$transaction(async (tx) => {
      await tx.groupSession.create({
        data: {
          id: sessionId,
          coachUserId: login.user.id,
          title: 'Staging group completion proof',
          description: 'Isolated staging proof artifact.',
          sessionType: 'group_training',
          maxParticipants: 8,
          currentParticipants: 1,
          offPlatformParticipants: 0,
          waitlistEnabled: true,
          waitlistCount: 0,
          pricePerParticipantMinor: 0,
          currency: 'GBP',
          location: 'Staging proof pitch',
          isVirtual: false,
          status: 'PUBLISHED',
          scheduleJson: [
            { startsAt: firstStartsAt.toISOString(), endsAt: firstEndsAt.toISOString() },
            { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
          ],
          cancelledInstancesJson: [],
          focusJson: ['Passing'],
          equipmentJson: [],
          createdByUserId: login.user.id,
          updatedByUserId: login.user.id,
        },
      });
      await tx.groupSessionRegistration.create({
        data: {
          id: registrationId,
          groupSessionId: sessionId,
          athleteId: guardianLink.athlete.id,
          parentUserId: guardianLink.guardianUserId,
          status: 'REGISTERED',
          notes: 'Staging proof registration.',
          createdByUserId: login.user.id,
          updatedByUserId: login.user.id,
          registeredAt: new Date(firstStartsAt.getTime() - 60_000),
          rosterActiveAt: new Date(firstStartsAt.getTime() - 60_000),
        },
      });
      await tx.booking.create({
        data: {
          id: bookingId,
          coachUserId: login.user.id,
          bookedByUserId: guardianLink.guardianUserId,
          status: 'CONFIRMED',
          scheduledAt: firstStartsAt,
          durationMinutes: 60,
          location: 'Staging proof pitch',
          serviceType: 'group_training',
          notes: 'Staging group completion proof',
          objectivesJson: ['Passing'],
          priceMinor: 0,
          currency: 'GBP',
          confirmationMode: 'manual',
          confirmedAt: firstStartsAt,
          groupSessionId: sessionId,
          createdByUserId: login.user.id,
          updatedByUserId: login.user.id,
        },
      });
      await tx.bookingParticipant.create({
        data: {
          id: participantId,
          bookingId,
          athleteId: guardianLink.athlete.id,
          guardianUserId: guardianLink.guardianUserId,
          status: 'confirmed',
          createdByUserId: login.user.id,
          updatedByUserId: login.user.id,
        },
      });
    });

    const firstCompletionResponse = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: {
        authorization: `Bearer ${login.tokens.accessToken}`,
        'x-acting-role': 'coach',
      },
      payload: {
        occurrenceDate: firstOccurrenceDate,
        attendance: [
          {
            registrationId,
            status: 'ATTENDED',
            notes: 'Staging proof first occurrence.',
            effortRating: 4,
          },
        ],
      },
    });
    assert.equal(firstCompletionResponse.statusCode, 200);
    const [firstSessionState, firstRegistrationState, firstBookingState, firstLedgerCount] =
      await Promise.all([
        prisma.groupSession.findUnique({ where: { id: sessionId }, select: { status: true } }),
        prisma.groupSessionRegistration.findUnique({
          where: { id: registrationId },
          select: { status: true },
        }),
        prisma.booking.findUnique({ where: { id: bookingId }, select: { status: true } }),
        prisma.groupSessionOccurrenceCompletion.count({ where: { groupSessionId: sessionId } }),
      ]);
    assert.equal(firstSessionState?.status, 'PUBLISHED');
    assert.equal(firstRegistrationState?.status, 'REGISTERED');
    assert.equal(firstBookingState?.status, 'CONFIRMED');
    assert.equal(firstLedgerCount, 1);

    const immutableAttendanceResponse = await app.inject({
      method: 'PATCH',
      url: `/v1/group-session-registrations/${registrationId}/attendance`,
      headers: {
        authorization: `Bearer ${login.tokens.accessToken}`,
        'x-acting-role': 'coach',
      },
      payload: {
        date: firstOccurrenceDate,
        status: 'NO_SHOW',
      },
    });
    assert.equal(immutableAttendanceResponse.statusCode, 409);

    const retrospectiveCancellationResponse = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/instances/cancel`,
      headers: {
        authorization: `Bearer ${login.tokens.accessToken}`,
        'x-acting-role': 'coach',
      },
      payload: {
        date: firstOccurrenceDate,
      },
    });
    assert.equal(retrospectiveCancellationResponse.statusCode, 409);

    const deliveredSessionCancellationResponse = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/cancel`,
      headers: {
        authorization: `Bearer ${login.tokens.accessToken}`,
        'x-acting-role': 'coach',
      },
    });
    assert.equal(deliveredSessionCancellationResponse.statusCode, 409);

    const completionResponse = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/complete`,
      headers: {
        authorization: `Bearer ${login.tokens.accessToken}`,
        'x-acting-role': 'coach',
      },
      payload: {
        occurrenceDate,
        attendance: [
          {
            registrationId,
            status: 'NO_SHOW',
            notes: 'Staging proof no-show.',
            effortRating: 2,
          },
        ],
      },
    });
    assert.equal(
      completionResponse.statusCode,
      200,
      `Group completion returned ${completionResponse.statusCode}.`,
    );

    const [
      session,
      registration,
      booking,
      attendance,
      occurrenceLedgerCount,
      audit,
      statusEvent,
      notifications,
    ] =
      await Promise.all([
        prisma.groupSession.findUnique({
          where: { id: sessionId },
          select: { status: true },
        }),
        prisma.groupSessionRegistration.findUnique({
          where: { id: registrationId },
          select: { status: true },
        }),
        prisma.booking.findUnique({
          where: { id: bookingId },
          select: { status: true },
        }),
        prisma.attendanceRecord.findFirst({
          where: {
            groupSessionId: sessionId,
            bookingId,
            athleteId: guardianLink.athlete.id,
            recordedAt: {
              gte: new Date(`${occurrenceDate}T00:00:00.000Z`),
              lt: new Date(`${occurrenceDate}T23:59:59.999Z`),
            },
          },
          select: {
            status: true,
            notes: true,
            effortRating: true,
          },
        }),
        prisma.groupSessionOccurrenceCompletion.count({ where: { groupSessionId: sessionId } }),
        prisma.auditEvent.findFirst({
          where: {
            action: 'group_session.completed',
            resourceId: sessionId,
            result: 'SUCCESS',
          },
          select: { id: true },
        }),
        prisma.bookingStatusEvent.findFirst({
          where: {
            bookingId,
            toStatus: 'COMPLETED',
          },
          select: { id: true },
        }),
        prisma.notification.findMany({
          where: {
            userId: guardianLink.guardianUserId,
            sourceId: bookingId,
            sourceType: {
              in: ['booking_completed', 'booking_review_prompt'],
            },
          },
          select: {
            sourceType: true,
          },
          orderBy: {
            sourceType: 'asc',
          },
        }),
      ]);

    assert.equal(session?.status, 'COMPLETED');
    assert.equal(registration?.status, 'ATTENDED');
    assert.equal(booking?.status, 'COMPLETED');
    assert.equal(occurrenceLedgerCount, 2);
    assert.deepEqual(attendance, {
      status: 'NO_SHOW',
      notes: 'Staging proof no-show.',
      effortRating: 2,
    });
    assert.ok(audit, 'Completion success audit was not persisted.');
    assert.ok(statusEvent, 'Linked booking completion event was not persisted.');
    assert.deepEqual(
      notifications.map((notification) => notification.sourceType),
      ['booking_completed', 'booking_review_prompt'],
      'Linked booking completion notifications were not persisted.',
    );

    await prisma.$transaction(async (tx) => {
      await tx.groupSession.create({
        data: {
          id: rejectedSessionId,
          coachUserId: login.user.id,
          title: 'Staging group completion rollback proof',
          description: 'Isolated staging rollback artifact.',
          sessionType: 'group_training',
          maxParticipants: 8,
          currentParticipants: 1,
          offPlatformParticipants: 0,
          waitlistEnabled: true,
          waitlistCount: 0,
          pricePerParticipantMinor: 0,
          currency: 'GBP',
          location: 'Staging proof pitch',
          isVirtual: false,
          status: 'PUBLISHED',
          scheduleJson: [{ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }],
          cancelledInstancesJson: [],
          focusJson: ['Passing'],
          equipmentJson: [],
          createdByUserId: login.user.id,
          updatedByUserId: login.user.id,
        },
      });
      await tx.groupSessionRegistration.create({
        data: {
          id: rejectedRegistrationId,
          groupSessionId: rejectedSessionId,
          athleteId: guardianLink.athlete.id,
          parentUserId: guardianLink.guardianUserId,
          status: 'REGISTERED',
          notes: 'Staging rollback registration.',
          createdByUserId: login.user.id,
          updatedByUserId: login.user.id,
          registeredAt: new Date(startsAt.getTime() - 60_000),
          rosterActiveAt: new Date(startsAt.getTime() - 60_000),
        },
      });
      await tx.booking.create({
        data: {
          id: rejectedBookingId,
          coachUserId: login.user.id,
          bookedByUserId: guardianLink.guardianUserId,
          status: 'PENDING',
          scheduledAt: startsAt,
          durationMinutes: 60,
          location: 'Staging proof pitch',
          serviceType: 'group_training',
          notes: 'Staging group completion rollback proof',
          objectivesJson: ['Passing'],
          priceMinor: 0,
          currency: 'GBP',
          confirmationMode: 'manual',
          groupSessionId: rejectedSessionId,
          createdByUserId: login.user.id,
          updatedByUserId: login.user.id,
        },
      });
      await tx.bookingParticipant.create({
        data: {
          id: rejectedParticipantId,
          bookingId: rejectedBookingId,
          athleteId: guardianLink.athlete.id,
          guardianUserId: guardianLink.guardianUserId,
          status: 'confirmed',
          createdByUserId: login.user.id,
          updatedByUserId: login.user.id,
        },
      });
    });

    const rejectedCompletion = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${rejectedSessionId}/complete`,
      headers: {
        authorization: `Bearer ${login.tokens.accessToken}`,
        'x-acting-role': 'coach',
      },
      payload: {
        occurrenceDate,
        attendance: [
          {
            registrationId: rejectedRegistrationId,
            status: 'ATTENDED',
          },
        ],
      },
    });
    assert.equal(rejectedCompletion.statusCode, 409);
    const [
      rejectedSession,
      rejectedRegistration,
      rejectedBooking,
      rejectedAttendanceCount,
      rejectedOccurrenceLedgerCount,
      rejectedSuccessAuditCount,
      rejectedStatusEventCount,
      rejectedNotificationCount,
    ] = await Promise.all([
      prisma.groupSession.findUnique({
        where: { id: rejectedSessionId },
        select: { status: true },
      }),
      prisma.groupSessionRegistration.findUnique({
        where: { id: rejectedRegistrationId },
        select: { status: true },
      }),
      prisma.booking.findUnique({
        where: { id: rejectedBookingId },
        select: { status: true },
      }),
      prisma.attendanceRecord.count({ where: { groupSessionId: rejectedSessionId } }),
      prisma.groupSessionOccurrenceCompletion.count({
        where: { groupSessionId: rejectedSessionId },
      }),
      prisma.auditEvent.count({
        where: {
          action: 'group_session.completed',
          resourceId: rejectedSessionId,
          result: 'SUCCESS',
        },
      }),
      prisma.bookingStatusEvent.count({
        where: {
          bookingId: rejectedBookingId,
          toStatus: 'COMPLETED',
        },
      }),
      prisma.notification.count({ where: { sourceId: rejectedBookingId } }),
    ]);
    assert.equal(rejectedSession?.status, 'PUBLISHED');
    assert.equal(rejectedRegistration?.status, 'REGISTERED');
    assert.equal(rejectedBooking?.status, 'PENDING');
    assert.equal(rejectedAttendanceCount, 0);
    assert.equal(rejectedOccurrenceLedgerCount, 0);
    assert.equal(rejectedSuccessAuditCount, 0);
    assert.equal(rejectedStatusEventCount, 0);
    assert.equal(rejectedNotificationCount, 0);

    process.stdout.write(
      `${JSON.stringify({
        projectRef,
        route: 'POST /v1/group-sessions/:sessionId/complete',
        sessionStatus: session.status,
        registrationStatus: registration.status,
        linkedBookingStatus: booking.status,
        attendanceStatus: attendance.status,
        attendanceDetailsPersisted:
          attendance.notes === 'Staging proof no-show.' && attendance.effortRating === 2,
        successAuditPersisted: true,
        bookingStatusEventPersisted: true,
        bookingNotificationsPersisted: notifications.length === 2,
        firstOccurrenceKeptSeriesOpen: true,
        completedOccurrenceImmutable: true,
        retrospectiveCancellationRejected: true,
        occurrenceLedgerCount,
        rejectedCompletionStatus: rejectedCompletion.statusCode,
        rejectedCompletionRolledBack: true,
      })}\n`,
    );
  } finally {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.auditEvent.deleteMany({ where: { resourceId: sessionId } });
        await tx.auditEvent.deleteMany({ where: { resourceId: rejectedSessionId } });
        await tx.notification.deleteMany({ where: { sourceId: bookingId } });
        await tx.notification.deleteMany({ where: { sourceId: rejectedBookingId } });
        await tx.bookingStatusEvent.deleteMany({ where: { bookingId } });
        await tx.bookingStatusEvent.deleteMany({ where: { bookingId: rejectedBookingId } });
        await tx.attendanceRecord.deleteMany({ where: { groupSessionId: sessionId } });
        await tx.attendanceRecord.deleteMany({ where: { groupSessionId: rejectedSessionId } });
        await tx.groupSessionOccurrenceCompletion.deleteMany({ where: { groupSessionId: sessionId } });
        await tx.groupSessionOccurrenceCompletion.deleteMany({
          where: { groupSessionId: rejectedSessionId },
        });
        await tx.bookingParticipant.deleteMany({ where: { bookingId } });
        await tx.bookingParticipant.deleteMany({ where: { bookingId: rejectedBookingId } });
        await tx.booking.deleteMany({ where: { id: bookingId } });
        await tx.booking.deleteMany({ where: { id: rejectedBookingId } });
        await tx.groupSessionRegistration.deleteMany({ where: { id: registrationId } });
        await tx.groupSessionRegistration.deleteMany({ where: { id: rejectedRegistrationId } });
        await tx.groupSession.deleteMany({ where: { id: sessionId } });
        await tx.groupSession.deleteMany({ where: { id: rejectedSessionId } });
      });
      cleanupComplete = true;
    } finally {
      await app.close();
      await prisma.$disconnect();
    }
    if (cleanupComplete) {
      process.stdout.write('Staging proof artifacts cleaned up.\n');
    }
  }
}

await main();
