import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPrismaClient } from '@clubroom/db';
import { parseOrganizationRole } from '@clubroom/shared-contracts';
import { buildApp } from '../src/app.js';

interface TestAccount {
  email: string;
  password: string;
  roles: string[];
}

interface LoginResponse {
  user: { id: string; roles: string[] };
  tokens: { accessToken: string };
}

interface MatchResponse {
  match: {
    id: string;
    clubId: string;
    date: string;
    kickoffTime: string;
    timeZone: string;
  };
}

interface ImportResponse {
  imported: Array<{
    id: string;
    date: string;
    kickoffTime: string;
    timeZone: string;
  }>;
  skipped: Array<{ source: string; externalId: string; matchId: string; reason: string }>;
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
      },
    ];
  });
}

function assertStagingRuntime(): string {
  assert.equal(process.env.API_DATA_BACKEND, 'db', 'Match proof requires API_DATA_BACKEND=db.');
  assert.ok(process.env.DATABASE_URL, 'Match proof requires DATABASE_URL.');
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
  const account = parseTestAccounts(fs.readFileSync(credentialsPath, 'utf8')).find((candidate) =>
    candidate.roles.includes('club_admin'),
  );
  assert.ok(account, 'A staging club-admin account is required.');

  const app = buildApp({ allowTestAuthHeaders: false });
  const prisma = getPrismaClient();
  const proofId = crypto.randomUUID();
  const source = 'codex-match-timezone-' + proofId;
  const createdIds: string[] = [];

  try {
    await app.ready();
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: account.email, password: account.password },
    });
    assert.equal(loginResponse.statusCode, 200, 'Staging club-admin login failed.');
    const login = loginResponse.json() as LoginResponse;
    assert.ok(login.user.roles.includes('club_admin'), 'Staging account is not a club admin.');

    const [user, memberships] = await Promise.all([
      prisma.user.findFirst({
        where: { id: login.user.id, deletedAt: null },
        select: { timeZone: true },
      }),
      prisma.clubMembership.findMany({
        where: {
          userId: login.user.id,
          active: true,
          deletedAt: null,
          club: { deletedAt: null },
        },
        select: { clubId: true, role: true },
      }),
    ]);
    const membership = memberships.find((candidate) => {
      const role = parseOrganizationRole(candidate.role);
      return role === 'OWNER' || role === 'ADMIN';
    });
    assert.equal(user?.timeZone, 'Europe/London', 'Staging admin timezone is not authoritative.');
    assert.ok(membership, 'Staging admin has no active owner/admin club membership.');

    const headers = {
      authorization: 'Bearer ' + login.tokens.accessToken,
      'x-acting-role': 'club_admin',
    };
    const auditStartedAt = new Date();
    const basePayload = {
      title: 'Codex match timezone proof ' + proofId,
      matchType: 'FRIENDLY',
      opponent: 'Timezone Athletic',
      isHome: true,
      date: '2026-09-12',
      kickoffTime: '10:00',
      venue: 'Clubroom staging pitch',
      maxPlayers: 14,
    };
    const matchesUrl = '/v1/clubs/' + membership.clubId + '/matches';

    const gapResponse = await app.inject({
      method: 'POST',
      url: matchesUrl,
      headers,
      payload: {
        ...basePayload,
        date: '2027-03-28',
        kickoffTime: '01:30',
      },
    });
    assert.equal(gapResponse.statusCode, 400, 'DST-gap match creation did not fail closed.');

    const createResponse = await app.inject({
      method: 'POST',
      url: matchesUrl,
      headers,
      payload: basePayload,
    });
    assert.equal(createResponse.statusCode, 201, createResponse.body);
    const created = createResponse.json() as MatchResponse;
    createdIds.push(created.match.id);
    assert.deepEqual(
      {
        clubId: created.match.clubId,
        date: created.match.date,
        kickoffTime: created.match.kickoffTime,
        timeZone: created.match.timeZone,
      },
      {
        clubId: membership.clubId,
        date: '2026-09-12',
        kickoffTime: '10:00',
        timeZone: 'Europe/London',
      },
    );

    const createdRow = await prisma.clubMatch.findUnique({
      where: { id: created.match.id },
      select: { startsAt: true, kickoffTimeLocal: true, timeZone: true },
    });
    assert.equal(createdRow?.startsAt.toISOString(), '2026-09-12T09:00:00.000Z');
    assert.equal(createdRow?.kickoffTimeLocal, '10:00');
    assert.equal(createdRow?.timeZone, 'Europe/London');

    const importPayload = {
      source,
      matches: [
        {
          externalId: proofId,
          title: 'Codex imported match timezone proof ' + proofId,
          matchType: 'LEAGUE',
          opponent: 'Winter Athletic',
          isHome: false,
          date: '2027-01-15',
          kickoffTime: '15:00',
          venue: 'Clubroom staging away pitch',
          maxPlayers: 16,
        },
      ],
    };
    const importResponse = await app.inject({
      method: 'POST',
      url: matchesUrl + '/import',
      headers,
      payload: importPayload,
    });
    assert.equal(importResponse.statusCode, 201, importResponse.body);
    const imported = importResponse.json() as ImportResponse;
    assert.equal(imported.imported.length, 1);
    assert.equal(imported.imported[0]?.timeZone, 'Europe/London');
    assert.equal(imported.imported[0]?.date, '2027-01-15');
    assert.equal(imported.imported[0]?.kickoffTime, '15:00');
    const importedId = imported.imported[0]?.id;
    assert.ok(importedId);
    createdIds.push(importedId);

    const importedRow = await prisma.clubMatch.findUnique({
      where: { id: importedId },
      select: { startsAt: true, kickoffTimeLocal: true, timeZone: true },
    });
    assert.equal(importedRow?.startsAt.toISOString(), '2027-01-15T15:00:00.000Z');
    assert.equal(importedRow?.kickoffTimeLocal, '15:00');
    assert.equal(importedRow?.timeZone, 'Europe/London');

    const replayResponse = await app.inject({
      method: 'POST',
      url: matchesUrl + '/import',
      headers,
      payload: importPayload,
    });
    assert.equal(replayResponse.statusCode, 200, replayResponse.body);
    const replayed = replayResponse.json() as ImportResponse;
    assert.equal(replayed.imported.length, 0);
    assert.deepEqual(replayed.skipped, [
      {
        source,
        externalId: proofId,
        matchId: importedId,
        reason: 'already_imported',
      },
    ]);

    const audits = await prisma.auditEvent.findMany({
      where: {
        occurredAt: { gte: auditStartedAt },
        actorUserId: login.user.id,
        resourceType: 'club_match',
        action: { in: ['club_match.create', 'club_match.import'] },
      },
      orderBy: { occurredAt: 'asc' },
      select: { action: true, result: true },
    });
    assert.ok(
      audits.some((audit) => audit.action === 'club_match.create' && audit.result === 'DENY'),
      'Missing denied DST-gap match-create audit.',
    );
    assert.ok(
      audits.some((audit) => audit.action === 'club_match.create' && audit.result === 'SUCCESS'),
      'Missing successful match-create audit.',
    );
    assert.equal(
      audits.filter((audit) => audit.action === 'club_match.import' && audit.result === 'SUCCESS')
        .length,
      2,
      'Missing import and idempotent-replay audits.',
    );

    console.log(
      JSON.stringify(
        {
          projectRef,
          creatorTimeZone: user.timeZone,
          summerStoredStartsAt: createdRow?.startsAt.toISOString(),
          winterStoredStartsAt: importedRow?.startsAt.toISOString(),
          dstGapStatus: gapResponse.statusCode,
          importReplayStatus: replayResponse.statusCode,
          auditResults: audits,
        },
        null,
        2,
      ),
    );
  } finally {
    if (createdIds.length > 0) {
      await prisma.clubMatch.updateMany({
        where: { id: { in: createdIds }, deletedAt: null },
        data: {
          deletedAt: new Date(),
          deletedByUserId: 'staging-match-timezone-proof',
          updatedByUserId: 'staging-match-timezone-proof',
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
