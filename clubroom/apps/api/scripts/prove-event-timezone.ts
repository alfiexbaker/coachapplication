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
  user: { id: string; roles: string[] };
  tokens: { accessToken: string };
}

interface EventResponse {
  event: {
    id: string;
    date: string;
    startTime: string;
    endTime?: string;
    timeZone: string;
    status: string;
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

function assertStagingRuntime(): string {
  assert.equal(process.env.API_DATA_BACKEND, 'db', 'Event proof requires API_DATA_BACKEND=db.');
  assert.ok(process.env.DATABASE_URL, 'Event proof requires DATABASE_URL.');
  assert.equal(
    /\bprod(?:uction)?\b/i.test(process.env.DATABASE_URL ?? ''),
    false,
    'Refusing to run against a production-looking DATABASE_URL.',
  );
  const mode = fs.statSync(credentialsPath).mode & 0o777;
  assert.equal(mode & 0o077, 0, 'Staging credential file must not be group/world accessible.');

  const databaseUrl = new URL(process.env.DATABASE_URL);
  const projectRef = decodeURIComponent(databaseUrl.username).match(
    /^postgres\.([a-z0-9]+)$/i,
  )?.[1];
  assert.ok(projectRef, 'DATABASE_URL username does not identify a Supabase project.');
  const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8')) as {
    mcpServers?: { supabase?: { url?: string } };
  };
  const mcpProjectRef = new URL(mcpConfig.mcpServers?.supabase?.url ?? '').searchParams.get(
    'project_ref',
  );
  assert.equal(
    projectRef,
    mcpProjectRef,
    'DATABASE_URL and Supabase MCP target different projects.',
  );
  return projectRef;
}

async function main(): Promise<void> {
  const projectRef = assertStagingRuntime();
  const account = parseTestAccounts(fs.readFileSync(credentialsPath, 'utf8')).find(
    (candidate) =>
      candidate.roles.includes('coach') && candidate.attached.includes('coachProfile=yes'),
  );
  assert.ok(account, 'A staging coach account with a coach profile is required.');

  const app = buildApp({ allowTestAuthHeaders: false });
  const prisma = getPrismaClient();
  const title = `Codex event timezone proof ${crypto.randomUUID()}`;
  let eventId: string | undefined;

  try {
    await app.ready();
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: account.email, password: account.password },
    });
    assert.equal(loginResponse.statusCode, 200, 'Staging coach login failed.');
    const login = loginResponse.json() as LoginResponse;
    assert.ok(login.user.roles.includes('coach'), 'Staging account is not a coach.');

    const [user, membership] = await Promise.all([
      prisma.user.findFirst({
        where: { id: login.user.id, deletedAt: null },
        select: { timeZone: true },
      }),
      prisma.clubMembership.findFirst({
        where: {
          userId: login.user.id,
          active: true,
          deletedAt: null,
          role: { not: 'MEMBER' },
          club: { deletedAt: null },
        },
        select: { clubId: true },
      }),
    ]);
    assert.equal(user?.timeZone, 'Europe/London', 'Staging coach timezone is not authoritative.');
    assert.ok(membership, 'Staging coach has no active staff club membership.');

    const headers = {
      authorization: `Bearer ${login.tokens.accessToken}`,
      'x-acting-role': 'coach',
    };
    const auditStartedAt = new Date();
    const createPayload = {
      title,
      description: 'Isolated staging timezone proof.',
      eventType: 'MEETING',
      date: '2026-09-12',
      startTime: '10:00',
      endTime: '12:00',
      venue: 'Clubroom staging event pitch',
      targetAudience: 'ALL',
      price: 0,
      currency: 'GBP',
      rsvpRequired: true,
    };

    const gapResponse = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${membership.clubId}/events`,
      headers,
      payload: {
        ...createPayload,
        date: '2027-03-28',
        startTime: '01:30',
        endTime: '02:30',
      },
    });
    assert.equal(gapResponse.statusCode, 400, 'DST-gap event creation did not fail closed.');

    const createResponse = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${membership.clubId}/events`,
      headers,
      payload: createPayload,
    });
    assert.equal(createResponse.statusCode, 201, createResponse.body);
    const created = createResponse.json() as EventResponse;
    eventId = created.event.id;
    assert.deepEqual(
      {
        date: created.event.date,
        startTime: created.event.startTime,
        endTime: created.event.endTime,
        timeZone: created.event.timeZone,
        status: created.event.status,
      },
      {
        date: '2026-09-12',
        startTime: '10:00',
        endTime: '12:00',
        timeZone: 'Europe/London',
        status: 'DRAFT',
      },
    );

    const summerRow = await prisma.clubEvent.findUnique({
      where: { id: eventId },
      select: { startsAt: true, endsAt: true, metadataJson: true },
    });
    assert.equal(summerRow?.startsAt.toISOString(), '2026-09-12T09:00:00.000Z');
    assert.equal(summerRow?.endsAt?.toISOString(), '2026-09-12T11:00:00.000Z');
    assert.equal(
      (summerRow?.metadataJson as { timeZone?: unknown } | null)?.timeZone,
      'Europe/London',
    );

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/v1/events/${eventId}`,
      headers,
      payload: { date: '2027-01-15', startTime: '10:00', endTime: '12:00' },
    });
    assert.equal(updateResponse.statusCode, 200, updateResponse.body);
    const updated = updateResponse.json() as EventResponse;
    assert.equal(updated.event.date, '2027-01-15');
    assert.equal(updated.event.startTime, '10:00');
    assert.equal(updated.event.endTime, '12:00');
    assert.equal(updated.event.timeZone, 'Europe/London');

    const [winterRow, audits] = await Promise.all([
      prisma.clubEvent.findUnique({
        where: { id: eventId },
        select: { startsAt: true, endsAt: true, metadataJson: true },
      }),
      prisma.auditEvent.findMany({
        where: {
          occurredAt: { gte: auditStartedAt },
          actorUserId: login.user.id,
          resourceType: 'club_event',
          OR: [{ resourceId: eventId }, { result: 'DENY' }],
        },
        orderBy: { occurredAt: 'desc' },
        take: 10,
        select: { action: true, result: true },
      }),
    ]);
    assert.equal(winterRow?.startsAt.toISOString(), '2027-01-15T10:00:00.000Z');
    assert.equal(winterRow?.endsAt?.toISOString(), '2027-01-15T12:00:00.000Z');
    assert.ok(
      audits.some((audit) => audit.action === 'club_event.create' && audit.result === 'SUCCESS'),
      'Missing successful event-create audit.',
    );
    assert.ok(
      audits.some((audit) => audit.action === 'club_event.update' && audit.result === 'SUCCESS'),
      'Missing successful event-update audit.',
    );
    assert.ok(
      audits.some((audit) => audit.action === 'club_event.create' && audit.result === 'DENY'),
      'Missing denied DST-gap event-create audit.',
    );

    console.log(
      JSON.stringify(
        {
          projectRef,
          eventId,
          creatorTimeZone: user.timeZone,
          summerStoredStartsAt: summerRow?.startsAt.toISOString(),
          winterStoredStartsAt: winterRow?.startsAt.toISOString(),
          dstGapStatus: gapResponse.statusCode,
          auditResults: audits,
        },
        null,
        2,
      ),
    );
  } finally {
    if (eventId) {
      await prisma.clubEvent.updateMany({
        where: { id: eventId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          deletedByUserId: 'staging-timezone-proof',
          updatedByUserId: 'staging-timezone-proof',
        },
      });
    }
    await app.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
