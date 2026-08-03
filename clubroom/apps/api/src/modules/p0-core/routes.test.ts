import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import {
  canUseClubCapability,
  isClubStaffRole,
  parseOrganizationRole,
} from '@clubroom/shared-contracts';
import { buildApp } from '../../app.js';
import { resetAuthRuntimeForTests } from '../../lib/auth-runtime.js';
import { resetCoachClubRouteStateForTests } from '../coach-club/routes.js';
import { resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import {
  getMarketplaceSeedStore,
  resetMarketplaceSeedStoreForTests,
} from '../../lib/marketplace-seed-store.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const asRecord = (value: unknown): SeedRow | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : undefined;

function isActiveClubMembership(row: SeedRow | null | undefined): boolean {
  return Boolean(row && row.active !== false && !asString(row.deletedAt));
}

function isActiveClubStaffMembership(row: SeedRow | null | undefined): boolean {
  const role = parseOrganizationRole(asString(row?.role));
  return Boolean(isActiveClubMembership(row) && role && isClubStaffRole(role));
}

function canCreateClubSessionFromMembership(row: SeedRow | null | undefined): boolean {
  const role = parseOrganizationRole(asString(row?.role));
  return Boolean(
    isActiveClubMembership(row) &&
    role &&
    canUseClubCapability(role, 'create_org_sessions', { hasGrant: role === 'COACH' }),
  );
}

function canAssignClubSessionFromMembership(row: SeedRow | null | undefined): boolean {
  const role = parseOrganizationRole(asString(row?.role));
  return Boolean(
    isActiveClubMembership(row) && role && canUseClubCapability(role, 'assign_session_coach'),
  );
}

function ensureRows(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}

function auditEventsFor(
  tables: SeedTables,
  params: { action: string; resourceId?: string; result?: string },
): SeedRow[] {
  return asRows(tables.auditEvents).filter(
    (row) =>
      asString(row.action) === params.action &&
      (params.resourceId === undefined || asString(row.resourceId) === params.resourceId) &&
      (params.result === undefined || asString(row.result) === params.result),
  );
}

function resolveDatasetPath(): string {
  const primary = path.resolve(
    process.cwd(),
    'docs/backend-api/test-data/marketplace/linked-dataset.json',
  );
  if (fs.existsSync(primary)) {
    return primary;
  }

  const fallback = path.resolve(
    process.cwd(),
    '../../docs/backend-api/test-data/marketplace/linked-dataset.json',
  );
  if (fs.existsSync(fallback)) {
    return fallback;
  }

  throw new Error('Unable to locate linked marketplace dataset for API tests');
}

function loadTables(): SeedTables {
  const raw = fs.readFileSync(resolveDatasetPath(), 'utf8');
  const parsed = JSON.parse(raw) as { tables: SeedTables };
  return parsed.tables;
}

function rolesForUser(tables: SeedTables, userId: string): string[] {
  return asRows(tables.userRoleMemberships)
    .filter((row) => asString(row.userId) === userId)
    .map((row) => asString(row.role))
    .filter((role): role is string => Boolean(role));
}

function authHeaders(
  tables: SeedTables,
  userId: string,
  fallbackRole: string,
): Record<string, string> {
  const roles = rolesForUser(tables, userId);
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || fallbackRole,
    'x-acting-role': roles[0] ?? fallbackRole,
  };
}

function isVerifiedCoachInTables(tables: SeedTables, userId: string): boolean {
  const user = asRows(tables.users).find((row) => asString(row.id) === userId);
  if (user?.isVerified === true) {
    return true;
  }
  const profile = asRows(tables.coachProfiles).find((row) => asString(row.userId) === userId);
  if (profile?.dbsChecked === true) {
    return true;
  }
  return asRows(tables.coachVerifications).some((row) => {
    if (asString(row.coachUserId) !== userId) return false;
    if (asString(row.verificationType) !== 'DBS' || asString(row.status) !== 'APPROVED') {
      return false;
    }
    const expiresAt = asString(row.expiresAt);
    return !expiresAt || Date.parse(expiresAt) > Date.now();
  });
}

function coachAthleteIdsFromTables(tables: SeedTables, coachUserId: string): Set<string> {
  const bookingIds = new Set(
    asRows(tables.bookings)
      .filter((row) => asString(row.coachUserId) === coachUserId && !asString(row.deletedAt))
      .map((row) => asString(row.id))
      .filter((bookingId): bookingId is string => Boolean(bookingId)),
  );
  const groupSessionIds = new Set(
    asRows(tables.groupSessions)
      .filter((row) => asString(row.coachUserId) === coachUserId && !asString(row.deletedAt))
      .map((row) => asString(row.id))
      .filter((sessionId): sessionId is string => Boolean(sessionId)),
  );
  const squadIds = new Set(
    asRows(tables.squads)
      .filter((row) => asString(row.ownerCoachUserId) === coachUserId && !asString(row.deletedAt))
      .map((row) => asString(row.id))
      .filter((squadId): squadId is string => Boolean(squadId)),
  );
  const athleteIds = new Set<string>();
  for (const participant of asRows(tables.bookingParticipants)) {
    const athleteId = asString(participant.athleteId);
    if (athleteId && bookingIds.has(asString(participant.bookingId) ?? '')) {
      athleteIds.add(athleteId);
    }
  }
  for (const registration of asRows(tables.groupSessionRegistrations)) {
    const athleteId = asString(registration.athleteId);
    if (athleteId && groupSessionIds.has(asString(registration.groupSessionId) ?? '')) {
      athleteIds.add(athleteId);
    }
  }
  for (const membership of asRows(tables.squadMemberships)) {
    const athleteId = asString(membership.athleteId);
    if (athleteId && squadIds.has(asString(membership.squadId) ?? '')) {
      athleteIds.add(athleteId);
    }
  }
  return athleteIds;
}

function passwordForRoles(roles: string[]): string {
  if (roles.includes('club_admin') || roles.includes('security_admin')) {
    return 'admin';
  }
  if (roles.includes('coach')) {
    return 'coach';
  }
  return 'user';
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function getFirstAvailableSlot(params: {
  app: ReturnType<typeof buildApp>;
  tables: SeedTables;
  authUserId: string;
  coachUserId: string;
  durationMinutes?: number;
  excludePendingInvites?: boolean;
  requireMaxBookings?: number;
}): Promise<{
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  maxBookings: number;
}> {
  const durationMinutes = params.durationMinutes ?? 60;
  const searchParams = new URLSearchParams({
    start: addDaysIso(1),
    end: addDaysIso(21),
    durationMinutes: String(durationMinutes),
    applySchedulingRules: 'true',
  });
  if (params.excludePendingInvites) {
    searchParams.set('excludePendingInvites', 'true');
  }

  const res = await params.app.inject({
    method: 'GET',
    url: `/v1/coaches/${params.coachUserId}/availability/slots?${searchParams.toString()}`,
    headers: {
      'x-auth-user-id': params.authUserId,
      'x-auth-roles': rolesForUser(params.tables, params.authUserId).join(','),
      'x-acting-role': rolesForUser(params.tables, params.authUserId)[0] ?? 'parent',
    },
  });
  assert.equal(res.statusCode, 200);

  const payload = res.json() as {
    slots: {
      date: string;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      location?: string;
      maxBookings: number;
    }[];
  };
  const slot = payload.slots.find(
    (candidate) =>
      candidate.isAvailable &&
      (params.requireMaxBookings === undefined ||
        candidate.maxBookings === params.requireMaxBookings),
  );
  assert.ok(slot, 'expected an available coach slot');
  return slot;
}

async function getAvailableSlots(params: {
  app: ReturnType<typeof buildApp>;
  tables: SeedTables;
  authUserId: string;
  coachUserId: string;
  durationMinutes?: number;
  minCount: number;
}): Promise<
  {
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    maxBookings: number;
  }[]
> {
  const durationMinutes = params.durationMinutes ?? 60;
  const searchParams = new URLSearchParams({
    start: addDaysIso(1),
    end: addDaysIso(35),
    durationMinutes: String(durationMinutes),
    applySchedulingRules: 'true',
  });

  const res = await params.app.inject({
    method: 'GET',
    url: `/v1/coaches/${params.coachUserId}/availability/slots?${searchParams.toString()}`,
    headers: authHeaders(params.tables, params.authUserId, 'parent'),
  });
  assert.equal(res.statusCode, 200);

  const payload = res.json() as {
    slots: {
      date: string;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      location?: string;
      maxBookings: number;
    }[];
  };
  const dates = new Set<string>();
  const selected = payload.slots.filter((candidate) => {
    if (!candidate.isAvailable || candidate.maxBookings !== 1 || dates.has(candidate.date)) {
      return false;
    }
    dates.add(candidate.date);
    return true;
  });
  assert.equal(
    selected.length >= params.minCount,
    true,
    `expected at least ${params.minCount} available coach slots`,
  );
  return selected.slice(0, params.minCount);
}

describe('p0 core routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetAuthRuntimeForTests();
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
    resetCoachClubRouteStateForTests();
  });

  after(async () => {
    await app.close();
  });

  it('returns /v1/me for a seeded user with linked memberships', async () => {
    const tables = loadTables();
    const roleMembership = asRows(tables.userRoleMemberships).find(
      (row) => asString(row.role) === 'parent',
    );
    assert.ok(roleMembership, 'expected at least one parent role membership');
    const userId = asString(roleMembership.userId) as string;

    const res = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: {
        'x-auth-user-id': userId,
        'x-auth-roles': rolesForUser(tables, userId).join(','),
        'x-acting-role': 'parent',
      },
    });

    assert.equal(res.statusCode, 200);
    const payload = res.json() as {
      user: { id: string };
      roles: string[];
      linkedFamilies: unknown[];
    };
    assert.equal(payload.user.id, userId);
    assert.equal(payload.roles.includes('parent'), true);
    assert.equal(payload.linkedFamilies.length >= 1, true);
  });

  it('lists and revokes auth sessions for the authenticated user', async () => {
    const tables = loadTables();
    const roleMembership = asRows(tables.userRoleMemberships).find(
      (row) => asString(row.role) === 'parent',
    );
    assert.ok(roleMembership, 'expected seeded parent role membership');
    const userId = asString(roleMembership.userId) as string;
    const roles = rolesForUser(tables, userId);
    const user = asRows(tables.users).find((row) => asString(row.id) === userId);
    assert.ok(user, 'expected seeded user for auth session');
    const email = asString(user?.email) as string;

    const firstLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email,
        password: passwordForRoles(roles),
      },
    });
    assert.equal(firstLogin.statusCode, 200);

    const secondLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email,
        password: passwordForRoles(roles),
      },
    });
    assert.equal(secondLogin.statusCode, 200);
    const secondLoginPayload = secondLogin.json() as {
      tokens: { accessToken: string };
    };

    const list = await app.inject({
      method: 'GET',
      url: '/v1/me/sessions',
      headers: {
        authorization: `Bearer ${secondLoginPayload.tokens.accessToken}`,
        'x-acting-role': roles[0] ?? 'parent',
      },
    });
    assert.equal(list.statusCode, 200);
    const listPayload = list.json() as {
      sessions: {
        id: string;
        current: boolean;
        issuedAt: string | null;
        revokedAt: string | null;
        device: { id: string | null; label: string | null } | null;
      }[];
      total: number;
    };
    assert.equal(listPayload.total, 2);
    const currentSession = listPayload.sessions.find((session) => session.current);
    assert.ok(currentSession, 'expected current session in list');
    const olderSession = listPayload.sessions.find((session) => !session.current);
    assert.ok(olderSession, 'expected non-current session in list');
    assert.equal(typeof olderSession?.issuedAt, 'string');
    const listAudits = auditEventsFor(getMarketplaceSeedStore().tables, {
      action: 'auth_session.list',
      result: 'SUCCESS',
    });
    assert.equal(listAudits.length, 1);
    assert.equal(asString(listAudits[0]?.subjectUserId), userId);
    assert.equal(listAudits[0]?.sensitiveRead, true);
    assert.equal(asNumber(asRecord(listAudits[0]?.metadataJson)?.sessionCount), 2);

    const revokeSingle = await app.inject({
      method: 'POST',
      url: `/v1/me/sessions/${encodeURIComponent(olderSession!.id)}/revoke`,
      headers: {
        authorization: `Bearer ${secondLoginPayload.tokens.accessToken}`,
        'x-acting-role': roles[0] ?? 'parent',
      },
    });
    assert.equal(revokeSingle.statusCode, 200);
    const revokeSinglePayload = revokeSingle.json() as {
      session: { id: string; revokedAt: string | null };
      currentSessionRevoked: boolean;
    };
    assert.equal(revokeSinglePayload.session.id, olderSession!.id);
    assert.equal(typeof revokeSinglePayload.session.revokedAt, 'string');
    assert.equal(revokeSinglePayload.currentSessionRevoked, false);
    const revokeSingleAudits = auditEventsFor(getMarketplaceSeedStore().tables, {
      action: 'auth_session.revoke',
      resourceId: olderSession!.id,
      result: 'SUCCESS',
    });
    assert.equal(revokeSingleAudits.length, 1);
    assert.equal(asString(revokeSingleAudits[0]?.subjectUserId), userId);

    const missingSessionId = 'ses_missing_revoke_test';
    const deniedRevoke = await app.inject({
      method: 'POST',
      url: `/v1/me/sessions/${missingSessionId}/revoke`,
      headers: {
        authorization: `Bearer ${secondLoginPayload.tokens.accessToken}`,
        'x-acting-role': roles[0] ?? 'parent',
      },
    });
    assert.equal(deniedRevoke.statusCode, 401);
    const deniedRevokeAudits = auditEventsFor(getMarketplaceSeedStore().tables, {
      action: 'auth_session.revoke',
      resourceId: missingSessionId,
      result: 'DENY',
    });
    assert.equal(deniedRevokeAudits.length, 1);
    assert.equal(asString(deniedRevokeAudits[0]?.subjectUserId), userId);

    const thirdLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email,
        password: passwordForRoles(roles),
      },
    });
    assert.equal(thirdLogin.statusCode, 200);
    const thirdLoginPayload = thirdLogin.json() as {
      tokens: { accessToken: string };
    };

    const currentList = await app.inject({
      method: 'GET',
      url: '/v1/me/sessions',
      headers: {
        authorization: `Bearer ${thirdLoginPayload.tokens.accessToken}`,
        'x-acting-role': roles[0] ?? 'parent',
      },
    });
    assert.equal(currentList.statusCode, 200);
    const currentListPayload = currentList.json() as {
      sessions: { id: string; current: boolean }[];
    };
    const currentRuntimeSession = currentListPayload.sessions.find((session) => session.current);
    assert.ok(currentRuntimeSession, 'expected current runtime session');

    const revokeAll = await app.inject({
      method: 'POST',
      url: '/v1/me/sessions/revoke-all',
      headers: {
        authorization: `Bearer ${thirdLoginPayload.tokens.accessToken}`,
        'x-acting-role': roles[0] ?? 'parent',
      },
    });
    assert.equal(revokeAll.statusCode, 200);
    const revokeAllPayload = revokeAll.json() as {
      revokedSessionIds: string[];
      revokedCount: number;
      retainedSessionId: string | null;
    };
    assert.equal(revokeAllPayload.revokedCount >= 1, true);
    assert.equal(revokeAllPayload.retainedSessionId, currentRuntimeSession!.id);
    const revokeAllAudits = auditEventsFor(getMarketplaceSeedStore().tables, {
      action: 'auth_session.revoke_all',
      result: 'SUCCESS',
    });
    assert.equal(revokeAllAudits.length, 1);
    assert.equal(asString(revokeAllAudits[0]?.subjectUserId), userId);
    assert.equal(
      asNumber(asRecord(revokeAllAudits[0]?.metadataJson)?.revokedCount),
      revokeAllPayload.revokedCount,
    );
  });

  it('exposes runtime backend mode in /v1/meta/version', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/meta/version',
    });

    assert.equal(res.statusCode, 200);
    const payload = res.json() as {
      version: string;
      apiVersion: string;
      apiStatus: string;
      minimumDeprecationDays: number;
      marketplaceSeedEnabled: boolean;
      apiDataBackend: string;
    };
    assert.equal(payload.version, '0.1.0');
    assert.equal(payload.apiVersion, 'v1');
    assert.equal(payload.apiStatus, 'preview');
    assert.equal(payload.minimumDeprecationDays, 180);
    assert.equal(payload.apiDataBackend, 'seed');
    assert.equal(typeof payload.marketplaceSeedEnabled, 'boolean');
  });

  it('returns family aggregate and blocks unrelated users', async () => {
    const tables = loadTables();
    const familyMembership = asRows(tables.familyMemberships)[0];
    assert.ok(familyMembership, 'expected seeded family membership');
    const familyId = asString(familyMembership.familyId) as string;
    const memberUserId = asString(familyMembership.userId) as string;
    const nonMemberCoach = asRows(tables.coachProfiles).find(
      (row) => asString(row.userId) !== memberUserId,
    );
    assert.ok(nonMemberCoach, 'expected seeded coach profile');
    const outsiderUserId = asString(nonMemberCoach.userId) as string;

    const allowed = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}`,
      headers: {
        'x-auth-user-id': memberUserId,
        'x-auth-roles': rolesForUser(tables, memberUserId).join(','),
        'x-acting-role': rolesForUser(tables, memberUserId)[0] ?? 'parent',
      },
    });
    assert.equal(allowed.statusCode, 200);
    const allowedPayload = allowed.json() as { athletes: unknown[] };
    assert.equal(allowedPayload.athletes.length >= 1, true);

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/families/${familyId}`,
      headers: {
        'x-auth-user-id': outsiderUserId,
        'x-auth-roles': rolesForUser(tables, outsiderUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(denied.statusCode, 403);
  });

  it('serves coach profile, offerings, verification docs, and club list', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const coachProfile = asRows(tables.coachProfiles)[0];
    assert.ok(coachProfile, 'expected seeded coach profile');
    const coachUserId = asString(coachProfile.userId) as string;
    const otherCoachProfile = asRows(tables.coachProfiles).find(
      (row) => asString(row.userId) && asString(row.userId) !== coachUserId,
    );
    assert.ok(otherCoachProfile, 'expected a second seeded coach profile');
    const otherCoachUserId = asString(otherCoachProfile.userId) as string;

    const profile = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/profile',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(profile.statusCode, 200);

    const offerings = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/offerings',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(offerings.statusCode, 200);
    const offeringsPayload = offerings.json() as { total: number };
    assert.equal(offeringsPayload.total >= 1, true);

    const verification = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/verifications/dbs/documents',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(verification.statusCode, 200);

    const mediaObjectId = 'med_verification_dbs_test';
    ensureRows(tables, 'mediaObjects').push({
      id: mediaObjectId,
      ownerUserId: coachUserId,
      kind: 'DOCUMENT',
      status: 'AVAILABLE',
      storageKey: 'test/verification/dbs-certificate.pdf',
      bucketName: 'clubroom-private',
      contentType: 'application/pdf',
      sizeBytes: 4096,
      visibilityScope: 'private',
      consentRequired: false,
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureRows(tables, 'malwareScanResults').push({
      id: 'scan_verification_dbs_test_clean',
      mediaObjectId,
      verdict: 'CLEAN',
      scanner: 'route-test',
      detailsJson: {},
      scannedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    const submittedVerification = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/verifications/dbs/documents',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        mediaObjectId,
        fileLabel: 'DBS certificate',
      },
    });
    assert.equal(submittedVerification.statusCode, 201);
    const submittedPayload = submittedVerification.json() as {
      type: string;
      verification: {
        id?: string;
        coachUserId?: string;
        verificationType?: string;
        status?: string;
      };
      document: { mediaObjectId?: string; fileLabel?: string | null };
      total: number;
    };
    assert.equal(submittedPayload.type, 'dbs');
    assert.equal(submittedPayload.verification.coachUserId, coachUserId);
    assert.equal(submittedPayload.verification.verificationType, 'DBS');
    assert.equal(submittedPayload.verification.status, 'PENDING');
    assert.equal(submittedPayload.document.mediaObjectId, mediaObjectId);
    assert.equal(submittedPayload.document.fileLabel, 'DBS certificate');
    assert.equal(submittedPayload.total >= 1, true);
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_verification_documents.submit',
        resourceId: `${coachUserId}:dbs`,
        result: 'SUCCESS',
      }).length,
      1,
    );

    const deniedSubmit = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/verifications/dbs/documents',
      headers: authHeaders(tables, otherCoachUserId, 'coach'),
      payload: {
        mediaObjectId,
        fileLabel: 'Not my DBS certificate',
      },
    });
    assert.equal(deniedSubmit.statusCode, 403);
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_verification_documents.submit',
        resourceId: `${otherCoachUserId}:dbs`,
        result: 'DENY',
      }).length,
      1,
    );

    const unsafeMediaObjectId = 'med_verification_unsafe_dbs_test';
    ensureRows(tables, 'mediaObjects').push({
      id: unsafeMediaObjectId,
      ownerUserId: coachUserId,
      kind: 'DOCUMENT',
      status: 'AVAILABLE',
      storageKey: 'test/verification/unsafe-dbs-certificate.pdf',
      bucketName: 'clubroom-private',
      contentType: 'application/pdf',
      sizeBytes: 4096,
      visibilityScope: 'private',
      consentRequired: false,
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureRows(tables, 'malwareScanResults').push({
      id: 'scan_verification_dbs_test_unsafe',
      mediaObjectId: unsafeMediaObjectId,
      verdict: 'INFECTED',
      scanner: 'route-test',
      detailsJson: {},
      scannedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    const unsafeMediaSubmit = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/verifications/dbs/documents',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        mediaObjectId: unsafeMediaObjectId,
        fileLabel: 'Unsafe DBS certificate',
      },
    });
    assert.equal(unsafeMediaSubmit.statusCode, 400);
    assert.match(unsafeMediaSubmit.body, /must pass malware scanning/i);
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_verification_documents.submit',
        resourceId: `${coachUserId}:dbs`,
        result: 'DENY',
      }).length,
      1,
    );

    const publicMediaObjectId = 'med_verification_public_dbs_test';
    ensureRows(tables, 'mediaObjects').push({
      id: publicMediaObjectId,
      ownerUserId: coachUserId,
      kind: 'DOCUMENT',
      status: 'AVAILABLE',
      storageKey: 'test/verification/public-dbs-certificate.pdf',
      bucketName: 'clubroom-public',
      contentType: 'application/pdf',
      sizeBytes: 4096,
      visibilityScope: 'public',
      consentRequired: false,
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureRows(tables, 'malwareScanResults').push({
      id: 'scan_verification_public_dbs_test_clean',
      mediaObjectId: publicMediaObjectId,
      verdict: 'CLEAN',
      scanner: 'route-test',
      detailsJson: {},
      scannedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    const publicMediaSubmit = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/verifications/dbs/documents',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        mediaObjectId: publicMediaObjectId,
        fileLabel: 'Public DBS certificate',
      },
    });
    assert.equal(publicMediaSubmit.statusCode, 400);
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_verification_documents.submit',
        resourceId: `${coachUserId}:dbs`,
        result: 'DENY',
      }).length,
      2,
    );

    const verificationStatus = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/verification-status`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(verificationStatus.statusCode, 200);
    const verificationStatusPayload = verificationStatus.json() as { status?: SeedRow };
    const status = asRecord(verificationStatusPayload.status);
    assert.equal(asString(status?.coachId), coachUserId);
    const backgroundCheck = asRecord(status?.backgroundCheck);
    assert.ok(backgroundCheck, 'expected background check verification status');
    assert.equal(asString(backgroundCheck.status), 'VERIFIED');
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'coach_verification_status.read',
        resourceId: coachUserId,
        result: 'SUCCESS',
      }).length,
      1,
    );

    const clubs = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(clubs.statusCode, 200);
    const clubsPayload = clubs.json() as {
      clubs: {
        id?: string;
        inviteCode?: string | null;
        viewerMembership?: { userId?: string; role?: string } | null;
        viewerGovernance: { role: string | null; canManageAssignments: boolean };
      }[];
    };
    const visibleClub = clubsPayload.clubs.find(
      (club) => club.viewerMembership?.userId === coachUserId,
    );
    assert.ok(visibleClub, 'expected a visible club membership for the seeded coach');
    assert.equal(typeof visibleClub?.viewerGovernance.canManageAssignments, 'boolean');
    if (visibleClub?.viewerMembership?.role === 'club_admin') {
      assert.equal(visibleClub.viewerGovernance.role, 'ADMIN');
    }
    if (visibleClub?.viewerMembership?.role === 'coach') {
      assert.equal(visibleClub.viewerGovernance.role, 'COACH');
    }
    assert.equal(visibleClub?.inviteCode, null);
  });

  it('allows the verification size limit and rejects unsafe evidence', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const coachProfile = asRows(tables.coachProfiles)[0];
    assert.ok(coachProfile, 'expected seeded coach profile');
    const coachUserId = asString(coachProfile.userId) as string;
    const now = new Date().toISOString();
    const cases = [
      {
        id: 'med_verification_svg_test',
        kind: 'IMAGE',
        contentType: 'image/svg+xml',
        sizeBytes: 4096,
        expectedMessage: /must be PDF, JPEG, PNG, WebP, or HEIC/i,
      },
      {
        id: 'med_verification_text_test',
        kind: 'DOCUMENT',
        contentType: 'text/plain',
        sizeBytes: 4096,
        expectedMessage: /must be PDF, JPEG, PNG, WebP, or HEIC/i,
      },
      {
        id: 'med_verification_kind_mismatch_test',
        kind: 'DOCUMENT',
        contentType: 'image/png',
        sizeBytes: 4096,
        expectedMessage: /kind does not match its content type/i,
      },
      {
        id: 'med_verification_oversized_test',
        kind: 'DOCUMENT',
        contentType: 'application/pdf',
        sizeBytes: 20 * 1024 * 1024 + 1,
        expectedMessage: /non-empty and 20 MB or smaller/i,
      },
      {
        id: 'med_verification_empty_test',
        kind: 'DOCUMENT',
        contentType: 'application/pdf',
        sizeBytes: 0,
        expectedMessage: /non-empty and 20 MB or smaller/i,
      },
    ] as const;

    const maxSizeMediaObjectId = 'med_verification_max_size_test';
    ensureRows(tables, 'mediaObjects').push({
      id: maxSizeMediaObjectId,
      ownerUserId: coachUserId,
      kind: 'DOCUMENT',
      status: 'AVAILABLE',
      storageKey: 'test/verification/max-size.pdf',
      bucketName: 'clubroom-private',
      contentType: 'application/pdf',
      sizeBytes: 20 * 1024 * 1024,
      visibilityScope: 'private',
      consentRequired: false,
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureRows(tables, 'malwareScanResults').push({
      id: 'scan_verification_max_size_test',
      mediaObjectId: maxSizeMediaObjectId,
      verdict: 'CLEAN',
      scanner: 'route-test',
      detailsJson: {},
      scannedAt: now,
      createdAt: now,
    });
    const maxSizeResponse = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/verifications/dbs/documents',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        mediaObjectId: maxSizeMediaObjectId,
        fileLabel: '20 MB verification evidence',
      },
    });
    assert.equal(maxSizeResponse.statusCode, 201);

    for (const testCase of cases) {
      ensureRows(tables, 'mediaObjects').push({
        id: testCase.id,
        ownerUserId: coachUserId,
        kind: testCase.kind,
        status: 'AVAILABLE',
        storageKey: `test/verification/${testCase.id}`,
        bucketName: 'clubroom-private',
        contentType: testCase.contentType,
        sizeBytes: testCase.sizeBytes,
        visibilityScope: 'private',
        consentRequired: false,
        createdByUserId: coachUserId,
        updatedByUserId: coachUserId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });
      ensureRows(tables, 'malwareScanResults').push({
        id: `scan_${testCase.id}`,
        mediaObjectId: testCase.id,
        verdict: 'CLEAN',
        scanner: 'route-test',
        detailsJson: {},
        scannedAt: now,
        createdAt: now,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/coaches/me/verifications/dbs/documents',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          mediaObjectId: testCase.id,
          fileLabel: 'Rejected verification evidence',
        },
      });
      assert.equal(response.statusCode, 400);
      assert.match(response.body, testCase.expectedMessage);
    }

    const rejectedIds = new Set<string>(cases.map((testCase) => testCase.id));
    assert.equal(
      asRows(tables.verificationDocuments).some(
        (row) => asString(row.mediaObjectId) === maxSizeMediaObjectId,
      ),
      true,
    );
    assert.equal(
      asRows(tables.verificationDocuments).some((row) =>
        rejectedIds.has(asString(row.mediaObjectId) ?? ''),
      ),
      false,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_verification_documents.submit',
        resourceId: `${coachUserId}:dbs`,
        result: 'DENY',
      }).length,
      cases.length,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_verification_documents.submit',
        resourceId: `${coachUserId}:dbs`,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('resolves join codes and joins members directly through /v1/clubs/join', async () => {
    const tables = loadTables();
    const memberUserIds = asRows(tables.userRoleMemberships)
      .filter((row) => asString(row.role) === 'member')
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId));
    const clubMemberUserIds = new Set(
      asRows(tables.clubMemberships)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const standaloneMemberId = memberUserIds.find((userId) => !clubMemberUserIds.has(userId));
    assert.ok(standaloneMemberId, 'expected standalone member for direct join');

    const inviteManagerMembership = asRows(tables.clubMemberships).find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return Boolean(
        isActiveClubMembership(row) &&
          role &&
          canUseClubCapability(role, 'manage_staff_and_invites'),
      );
    });
    assert.ok(inviteManagerMembership, 'expected club invite manager');
    const clubId = asString(inviteManagerMembership.clubId) as string;
    const inviteManagerUserId = asString(inviteManagerMembership.userId) as string;
    const inviteCodesRes = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/invite-codes`,
      headers: authHeaders(tables, inviteManagerUserId, 'coach'),
    });
    assert.equal(inviteCodesRes.statusCode, 200);
    const inviteCodesPayload = inviteCodesRes.json() as {
      inviteCodes: Array<{ code: string; role: string }>;
    };
    const inviteCode = inviteCodesPayload.inviteCodes.find(
      (candidate) => candidate.role === 'MEMBER',
    )?.code;
    assert.ok(inviteCode, 'expected primary club invite code');

    const resolveRes = await app.inject({
      method: 'GET',
      url: `/v1/clubs/join/resolve?code=${encodeURIComponent(inviteCode)}`,
      headers: {
        'x-auth-user-id': standaloneMemberId as string,
        'x-auth-roles': rolesForUser(tables, standaloneMemberId as string).join(',') || 'member',
        'x-acting-role': 'member',
      },
    });
    assert.equal(resolveRes.statusCode, 200);
    const resolvePayload = resolveRes.json() as {
      preview: { joinFlow: string; role: string; alreadyMember: boolean };
    };
    assert.equal(resolvePayload.preview.joinFlow, 'direct_join');
    assert.equal(resolvePayload.preview.role, 'MEMBER');
    assert.equal(resolvePayload.preview.alreadyMember, false);

    const joinRes = await app.inject({
      method: 'POST',
      url: '/v1/clubs/join',
      headers: {
        'x-auth-user-id': standaloneMemberId as string,
        'x-auth-roles': rolesForUser(tables, standaloneMemberId as string).join(',') || 'member',
        'x-acting-role': 'member',
      },
      payload: { code: inviteCode },
    });
    assert.equal(joinRes.statusCode, 201);
    const joinPayload = joinRes.json() as {
      outcome: string;
      membership: { role: string; clubId: string; userId: string };
    };
    assert.equal(joinPayload.outcome, 'joined');
    assert.equal(joinPayload.membership.role, 'MEMBER');
    assert.equal(joinPayload.membership.userId, standaloneMemberId);

    const joinedClubs = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: {
        'x-auth-user-id': standaloneMemberId as string,
        'x-auth-roles': rolesForUser(tables, standaloneMemberId as string).join(',') || 'member',
        'x-acting-role': 'member',
      },
    });
    const joinedPayload = joinedClubs.json() as { total: number };
    assert.equal(joinedPayload.total >= 1, true);
  });

  it('lets active club members leave themselves through an audited soft removal', async () => {
    const tables = loadTables();
    const membership = asRows(tables.clubMemberships).find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return isActiveClubMembership(row) && role && role !== 'OWNER';
    });
    assert.ok(membership, 'expected active non-owner club membership');
    const clubId = asString(membership.clubId) as string;
    const userId = asString(membership.userId) as string;

    const leaveRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/members/me/leave`,
      headers: authHeaders(tables, userId, 'member'),
      payload: { customReason: 'Moved to a different club' },
    });
    assert.equal(leaveRes.statusCode, 200);
    const leavePayload = leaveRes.json() as {
      removal: { clubId: string; userId: string; reason: string; removedBy: string };
    };
    assert.equal(leavePayload.removal.clubId, clubId);
    assert.equal(leavePayload.removal.userId, userId);
    assert.equal(leavePayload.removal.removedBy, userId);
    assert.equal(leavePayload.removal.reason, 'LEFT_CLUB');

    const storedMembership = asRows(getMarketplaceSeedStore().tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === userId,
    );
    assert.equal(storedMembership?.active, false);
    assert.ok(asString(storedMembership?.deletedAt), 'expected soft removal timestamp');
    assert.equal(asString(storedMembership?.deletedByUserId), userId);

    const afterLeaveClubs = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: authHeaders(tables, userId, 'member'),
    });
    assert.equal(afterLeaveClubs.statusCode, 200);
    const afterLeavePayload = afterLeaveClubs.json() as {
      clubs: { id: string; viewerMembership?: { userId?: string } | null }[];
    };
    assert.equal(
      afterLeavePayload.clubs.some(
        (club) => club.id === clubId && club.viewerMembership?.userId === userId,
      ),
      false,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_member.leave',
        resourceId: `${clubId}:${userId}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('denies owner self-leave so club ownership cannot be abandoned', async () => {
    const tables = loadTables();
    const coachUserId = asString(asRows(tables.coachProfiles)[0]?.userId) as string;
    assert.ok(coachUserId, 'expected seeded coach user');

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/clubs',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        name: `Owner Leave Guard ${Date.now()}`,
        city: 'London',
        visibility: 'private',
      },
    });
    assert.equal(createRes.statusCode, 201);
    const createPayload = createRes.json() as {
      club: { id: string };
      membership: { userId: string; role: string };
    };
    assert.equal(createPayload.membership.userId, coachUserId);
    assert.equal(createPayload.membership.role, 'OWNER');
    const clubId = createPayload.club.id;

    const leaveRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/members/me/leave`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(leaveRes.statusCode, 403);

    const storedMembership = asRows(getMarketplaceSeedStore().tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === coachUserId,
    );
    assert.equal(isActiveClubMembership(storedMembership), true);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_member.leave',
        resourceId: `${clubId}:${coachUserId}`,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('creates pending staff invites from coach links and accepts them via inbox', async () => {
    const tables = loadTables();
    const clubAdminMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.role) === 'club_admin',
    );
    assert.ok(clubAdminMembership, 'expected club admin membership');
    const coachUserId = asString(clubAdminMembership.userId) as string;
    const clubsRes = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'club_admin',
        'x-acting-role': 'club_admin',
      },
    });
    const clubsPayload = clubsRes.json() as {
      clubs: { id: string }[];
    };
    const clubId = clubsPayload.clubs[0]?.id;
    assert.ok(clubId, 'expected visible club id');

    const createInviteRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invite-codes`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'club_admin',
        'x-acting-role': 'club_admin',
      },
      payload: { role: 'COACH' },
    });
    assert.equal(createInviteRes.statusCode, 201);
    const createInvitePayload = createInviteRes.json() as { inviteCode: { code: string } };
    const coachCode = createInvitePayload.inviteCode.code;

    const existingClubUserIds = new Set(
      asRows(tables.clubMemberships)
        .filter((row) => asString(row.clubId) === clubId)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const otherCoachUserId = asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId))
      .find((userId) => userId !== coachUserId && !existingClubUserIds.has(userId));
    assert.ok(otherCoachUserId, 'expected second coach');
    const targetCoachUserId = otherCoachUserId as string;

    const joinRes = await app.inject({
      method: 'POST',
      url: '/v1/clubs/join',
      headers: {
        'x-auth-user-id': targetCoachUserId,
        'x-auth-roles': rolesForUser(tables, targetCoachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
      payload: { code: coachCode },
    });
    assert.equal(joinRes.statusCode, 202);
    const joinPayload = joinRes.json() as {
      outcome: string;
      invite: { id: string; status: string; role: string };
    };
    assert.equal(joinPayload.outcome, 'invite_pending');
    assert.equal(joinPayload.invite.status, 'pending');
    assert.equal(joinPayload.invite.role, 'COACH');

    const inboxRes = await app.inject({
      method: 'GET',
      url: '/v1/clubs/invites',
      headers: {
        'x-auth-user-id': otherCoachUserId,
        'x-auth-roles': rolesForUser(tables, otherCoachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
    });
    assert.equal(inboxRes.statusCode, 200);
    const inboxPayload = inboxRes.json() as {
      invites: { id: string; clubId: string }[];
    };
    assert.equal(inboxPayload.invites.length >= 1, true);

    const respondRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/invites/${inboxPayload.invites[0]?.id}/respond`,
      headers: {
        'x-auth-user-id': otherCoachUserId,
        'x-auth-roles': rolesForUser(tables, otherCoachUserId).join(',') || 'coach',
        'x-acting-role': 'coach',
      },
      payload: { response: 'accepted' },
    });
    assert.equal(respondRes.statusCode, 200);
    const respondPayload = respondRes.json() as {
      membership: { role: string; clubId: string; userId: string } | null;
      invite: { status: string };
    };
    assert.equal(respondPayload.invite.status, 'accepted');
    assert.equal(respondPayload.membership?.role, 'COACH');
    assert.equal(respondPayload.membership?.userId, otherCoachUserId);
  });

  it('creates direct member invites for existing users and accepts them via inbox', async () => {
    const tables = loadTables();
    const clubAdminMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.role) === 'club_admin' && isActiveClubMembership(row),
    );
    assert.ok(clubAdminMembership, 'expected club admin membership');
    const adminUserId = asString(clubAdminMembership.userId) as string;
    const clubId = asString(clubAdminMembership.clubId) as string;
    assert.ok(clubId, 'expected club id');

    const existingClubUserIds = new Set(
      asRows(tables.clubMemberships)
        .filter((row) => asString(row.clubId) === clubId && isActiveClubMembership(row))
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const targetMemberUserId = asRows(tables.userRoleMemberships)
      .filter((row) => asString(row.role) === 'member')
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId))
      .find((userId) => !existingClubUserIds.has(userId));
    assert.ok(targetMemberUserId, 'expected standalone member user');

    const inviteCountBeforeInvalidRequest = asRows(getMarketplaceSeedStore().tables.invites).length;
    const invalidCreateRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invites`,
      headers: authHeaders(tables, adminUserId, 'club_admin'),
      payload: {
        targetUserIds: [targetMemberUserId],
        role: 'MEMBER',
        source: 'local_override',
      },
    });
    assert.equal(invalidCreateRes.statusCode, 400);
    assert.equal(
      asRows(getMarketplaceSeedStore().tables.invites).length,
      inviteCountBeforeInvalidRequest,
    );

    const createRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invites`,
      headers: authHeaders(tables, adminUserId, 'club_admin'),
      payload: {
        targetUserIds: [targetMemberUserId],
        role: 'MEMBER',
      },
    });
    assert.equal(createRes.statusCode, 201);
    const createPayload = createRes.json() as {
      invites: { id: string; clubId: string; targetUserId: string; role: string; status: string }[];
      total: number;
    };
    assert.equal(createPayload.total, 1);
    assert.equal(createPayload.invites[0]?.clubId, clubId);
    assert.equal(createPayload.invites[0]?.targetUserId, targetMemberUserId);
    assert.equal(createPayload.invites[0]?.role, 'MEMBER');
    assert.equal(createPayload.invites[0]?.status, 'pending');

    const inboxRes = await app.inject({
      method: 'GET',
      url: '/v1/clubs/invites',
      headers: authHeaders(tables, targetMemberUserId, 'member'),
    });
    assert.equal(inboxRes.statusCode, 200);
    const inboxPayload = inboxRes.json() as {
      invites: { id: string; clubId: string; role: string }[];
    };
    assert.equal(
      inboxPayload.invites.some(
        (invite) =>
          invite.id === createPayload.invites[0]?.id &&
          invite.clubId === clubId &&
          invite.role === 'MEMBER',
      ),
      true,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite.list',
        resourceId: targetMemberUserId,
        result: 'SUCCESS',
      }).length,
      1,
    );

    const invalidRespondRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/invites/${createPayload.invites[0]?.id}/respond`,
      headers: authHeaders(tables, targetMemberUserId, 'member'),
      payload: { response: 'accepted', source: 'local_override' },
    });
    assert.equal(invalidRespondRes.statusCode, 400);
    assert.equal(
      asRows(getMarketplaceSeedStore().tables.clubMemberships).some(
        (membership) =>
          asString(membership.clubId) === clubId &&
          asString(membership.userId) === targetMemberUserId &&
          isActiveClubMembership(membership),
      ),
      false,
    );

    const respondRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/invites/${createPayload.invites[0]?.id}/respond`,
      headers: authHeaders(tables, targetMemberUserId, 'member'),
      payload: { response: 'accepted' },
    });
    assert.equal(respondRes.statusCode, 200);
    const respondPayload = respondRes.json() as {
      invite: { status: string };
      membership: { clubId: string; userId: string; role: string } | null;
    };
    assert.equal(respondPayload.invite.status, 'accepted');
    assert.equal(respondPayload.membership?.clubId, clubId);
    assert.equal(respondPayload.membership?.userId, targetMemberUserId);
    assert.equal(respondPayload.membership?.role, 'MEMBER');

    const storedMembership = asRows(getMarketplaceSeedStore().tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === targetMemberUserId,
    );
    assert.equal(isActiveClubMembership(storedMembership), true);
    assert.equal(asString(storedMembership?.role), 'member');
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite.create',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite.respond',
        resourceId: createPayload.invites[0]?.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('creates email-target member invites without storing raw email in response or audit', async () => {
    const tables = loadTables();
    const clubAdminMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.role) === 'club_admin' && isActiveClubMembership(row),
    );
    assert.ok(clubAdminMembership, 'expected club admin membership');
    const adminUserId = asString(clubAdminMembership.userId) as string;
    const clubId = asString(clubAdminMembership.clubId) as string;
    const inviteEmail = 'pending.member@example.com';

    const createRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invites`,
      headers: authHeaders(tables, adminUserId, 'club_admin'),
      payload: {
        targetEmails: [inviteEmail],
        role: 'MEMBER',
      },
    });
    assert.equal(createRes.statusCode, 201);
    const createPayload = createRes.json() as {
      invites: Array<{
        id: string;
        clubId: string;
        targetUserId?: string;
        targetKind?: string;
        targetEmailHint?: string;
        role: string;
        status: string;
      }>;
      total: number;
    };
    assert.equal(createPayload.total, 1);
    const invite = createPayload.invites[0];
    assert.ok(invite, 'expected created invite');
    assert.equal(invite.clubId, clubId);
    assert.equal(invite.targetUserId, undefined);
    assert.equal(invite.targetKind, 'email');
    assert.equal(invite.role, 'MEMBER');
    assert.equal(invite.status, 'pending');
    assert.equal(JSON.stringify(createPayload).includes(inviteEmail), false);

    const storedInvite = asRows(getMarketplaceSeedStore().tables.invites).find(
      (row) => asString(row.id) === invite.id,
    );
    const metadata = asRecord(storedInvite?.metadataJson);
    assert.equal(asString(metadata?.targetEmailHash)?.length, 64);
    assert.equal(asString(metadata?.targetEmailHint), invite.targetEmailHint);
    assert.equal(JSON.stringify(metadata).includes(inviteEmail), false);
    const storedTarget = asRows(getMarketplaceSeedStore().tables.inviteTargets).find(
      (row) => asString(row.inviteId) === invite.id,
    );
    assert.equal(asString(storedTarget?.targetUserId), undefined);

    const creatorInboxRes = await app.inject({
      method: 'GET',
      url: '/v1/clubs/invites',
      headers: authHeaders(tables, adminUserId, 'club_admin'),
    });
    assert.equal(creatorInboxRes.statusCode, 200);
    assert.equal(
      (creatorInboxRes.json() as { invites: Array<{ id: string }> }).invites.some(
        (candidate) => candidate.id === invite.id,
      ),
      false,
      'email-target invite must not be visible to a non-matching account',
    );

    const targetUserId = 'usr_pending-email-member';
    getMarketplaceSeedStore().tables.users.push({
      id: targetUserId,
      authProvider: 'test',
      authProviderSubject: targetUserId,
      email: inviteEmail,
      name: 'Pending Email Member',
      accountStatus: 'active',
      isVerified: true,
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });

    const inboxRes = await app.inject({
      method: 'GET',
      url: '/v1/clubs/invites',
      headers: authHeaders(tables, targetUserId, 'member'),
    });
    assert.equal(inboxRes.statusCode, 200);
    const inboxPayload = inboxRes.json() as {
      invites: Array<{ id: string; clubId: string; targetKind?: string; targetUserId?: string }>;
    };
    assert.equal(
      inboxPayload.invites.some(
        (candidate) =>
          candidate.id === invite.id &&
          candidate.clubId === clubId &&
          candidate.targetKind === 'email' &&
          candidate.targetUserId === undefined,
      ),
      true,
    );

    const respondRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/invites/${invite.id}/respond`,
      headers: authHeaders(tables, targetUserId, 'member'),
      payload: { response: 'accepted' },
    });
    assert.equal(respondRes.statusCode, 200);
    const respondPayload = respondRes.json() as {
      invite: { status: string; targetUserId?: string };
      membership: { clubId: string; userId: string; role: string } | null;
    };
    assert.equal(respondPayload.invite.status, 'accepted');
    assert.equal(respondPayload.invite.targetUserId, targetUserId);
    assert.equal(respondPayload.membership?.clubId, clubId);
    assert.equal(respondPayload.membership?.userId, targetUserId);
    assert.equal(respondPayload.membership?.role, 'MEMBER');
    assert.equal(asString(storedTarget?.targetUserId), targetUserId);
    assert.equal(
      JSON.stringify(
        auditEventsFor(getMarketplaceSeedStore().tables, {
          action: 'club_invite.create',
          resourceId: clubId,
          result: 'SUCCESS',
        }),
      ).includes(inviteEmail),
      false,
      'audit metadata must not persist raw invite email',
    );
  });

  it('delivers email-target club invites through the configured webhook', async () => {
    const tables = loadTables();
    const clubAdminMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.role) === 'club_admin' && isActiveClubMembership(row),
    );
    assert.ok(clubAdminMembership, 'expected club admin membership');
    const adminUserId = asString(clubAdminMembership.userId) as string;
    const clubId = asString(clubAdminMembership.clubId) as string;
    const inviteEmail = 'delivered.member@example.com';
    const deliveries: Array<{
      authorization?: string;
      body: Record<string, unknown>;
    }> = [];
    const deliveryServer = http.createServer((req, res) => {
      let raw = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        raw += chunk;
      });
      req.on('end', () => {
        deliveries.push({
          authorization: req.headers.authorization,
          body: raw ? (JSON.parse(raw) as Record<string, unknown>) : {},
        });
        res.statusCode = 202;
        res.end('accepted');
      });
    });

    await new Promise<void>((resolve) => deliveryServer.listen(0, '127.0.0.1', resolve));
    const address = deliveryServer.address() as AddressInfo;
    const previousWebhookUrl = env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL;
    const previousWebhookSecret = env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET;
    const previousFrom = env.API_PASSWORD_RESET_EMAIL_FROM;
    env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL = `http://127.0.0.1:${address.port}/club-invite`;
    env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET = 'invite-webhook-secret';
    env.API_PASSWORD_RESET_EMAIL_FROM = 'Clubroom Support <support@clubroom.test>';

    try {
      const createRes = await app.inject({
        method: 'POST',
        url: `/v1/clubs/${clubId}/invites`,
        headers: authHeaders(tables, adminUserId, 'club_admin'),
        payload: {
          targetEmails: [inviteEmail],
          role: 'MEMBER',
        },
      });
      assert.equal(createRes.statusCode, 201);
      const createPayload = createRes.json() as {
        emailDelivery?: {
          total: number;
          sent: number;
          skipped: number;
          failed: number;
          providers: string[];
        };
      };
      assert.deepEqual(createPayload.emailDelivery, {
        total: 1,
        sent: 1,
        skipped: 0,
        failed: 0,
        providers: ['webhook'],
      });
      assert.equal(deliveries.length, 1);
      assert.equal(deliveries[0]?.authorization, 'Bearer invite-webhook-secret');
      assert.equal(deliveries[0]?.body.type, 'club_invite');
      assert.equal(deliveries[0]?.body.to, inviteEmail);
      assert.equal(deliveries[0]?.body.from, 'Clubroom Support <support@clubroom.test>');
      assert.equal(deliveries[0]?.body.role, 'MEMBER');

      const deliveryAudits = auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite.email_delivery',
        resourceId: clubId,
        result: 'SUCCESS',
      });
      assert.equal(deliveryAudits.length, 1);
      assert.equal(JSON.stringify(deliveryAudits).includes(inviteEmail), false);
      assert.equal(
        (deliveryAudits[0]?.metadataJson as { delivery?: { sent?: number } } | undefined)?.delivery
          ?.sent,
        1,
      );
    } finally {
      env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL = previousWebhookUrl;
      env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET = previousWebhookSecret;
      env.API_PASSWORD_RESET_EMAIL_FROM = previousFrom;
      await new Promise<void>((resolve, reject) => {
        deliveryServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('creates direct coach invites for existing coach users and accepts them via inbox', async () => {
    const tables = loadTables();
    const clubAdminMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.role) === 'club_admin' && isActiveClubMembership(row),
    );
    assert.ok(clubAdminMembership, 'expected club admin membership');
    const adminUserId = asString(clubAdminMembership.userId) as string;
    const clubId = asString(clubAdminMembership.clubId) as string;
    assert.ok(clubId, 'expected club id');

    const existingClubUserIds = new Set(
      asRows(tables.clubMemberships)
        .filter((row) => asString(row.clubId) === clubId && isActiveClubMembership(row))
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const targetCoachUserId = asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId))
      .find((userId) => userId !== adminUserId && !existingClubUserIds.has(userId));
    assert.ok(targetCoachUserId, 'expected standalone coach user');

    const createRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invites`,
      headers: authHeaders(tables, adminUserId, 'club_admin'),
      payload: {
        targetUserIds: [targetCoachUserId],
        role: 'COACH',
      },
    });
    assert.equal(createRes.statusCode, 201);
    const createPayload = createRes.json() as {
      invites: { id: string; clubId: string; targetUserId: string; role: string; status: string }[];
      total: number;
    };
    assert.equal(createPayload.total, 1);
    assert.equal(createPayload.invites[0]?.clubId, clubId);
    assert.equal(createPayload.invites[0]?.targetUserId, targetCoachUserId);
    assert.equal(createPayload.invites[0]?.role, 'COACH');
    assert.equal(createPayload.invites[0]?.status, 'pending');
    assert.equal(
      asRows(getMarketplaceSeedStore().tables.clubMemberships).some(
        (row) =>
          asString(row.clubId) === clubId &&
          asString(row.userId) === targetCoachUserId &&
          isActiveClubMembership(row),
      ),
      false,
      'direct coach invite must stay pending until target acceptance',
    );

    const inboxRes = await app.inject({
      method: 'GET',
      url: '/v1/clubs/invites',
      headers: authHeaders(tables, targetCoachUserId, 'coach'),
    });
    assert.equal(inboxRes.statusCode, 200);
    const inboxPayload = inboxRes.json() as {
      invites: { id: string; clubId: string; role: string }[];
    };
    assert.equal(
      inboxPayload.invites.some(
        (invite) =>
          invite.id === createPayload.invites[0]?.id &&
          invite.clubId === clubId &&
          invite.role === 'COACH',
      ),
      true,
    );

    const respondRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/invites/${createPayload.invites[0]?.id}/respond`,
      headers: authHeaders(tables, targetCoachUserId, 'coach'),
      payload: { response: 'accepted' },
    });
    assert.equal(respondRes.statusCode, 200);
    const respondPayload = respondRes.json() as {
      invite: { status: string };
      membership: { clubId: string; userId: string; role: string } | null;
    };
    assert.equal(respondPayload.invite.status, 'accepted');
    assert.equal(respondPayload.membership?.clubId, clubId);
    assert.equal(respondPayload.membership?.userId, targetCoachUserId);
    assert.equal(respondPayload.membership?.role, 'COACH');

    const storedMembership = asRows(getMarketplaceSeedStore().tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === targetCoachUserId,
    );
    assert.equal(isActiveClubMembership(storedMembership), true);
    assert.equal(asString(storedMembership?.role), 'coach');
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite.create',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite.respond',
        resourceId: createPayload.invites[0]?.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('denies direct coach invites for non-coach targets', async () => {
    const tables = loadTables();
    const clubAdminMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.role) === 'club_admin' && isActiveClubMembership(row),
    );
    assert.ok(clubAdminMembership, 'expected club admin membership');
    const adminUserId = asString(clubAdminMembership.userId) as string;
    const clubId = asString(clubAdminMembership.clubId) as string;
    const existingClubUserIds = new Set(
      asRows(tables.clubMemberships)
        .filter((row) => asString(row.clubId) === clubId && isActiveClubMembership(row))
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const coachUserIds = new Set(
      asRows(tables.coachProfiles)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const targetMemberUserId = asRows(tables.userRoleMemberships)
      .filter((row) => asString(row.role) === 'member')
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId))
      .find((userId) => !coachUserIds.has(userId) && !existingClubUserIds.has(userId));
    assert.ok(targetMemberUserId, 'expected standalone non-coach member user');

    const createRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invites`,
      headers: authHeaders(tables, adminUserId, 'club_admin'),
      payload: {
        targetUserIds: [targetMemberUserId],
        role: 'COACH',
      },
    });
    assert.equal(createRes.statusCode, 400);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite.create',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('creates direct admin invites from club owners for existing staff users and accepts them via inbox', async () => {
    const tables = loadTables();
    const ownerUserId = asString(asRows(tables.coachProfiles)[0]?.userId) as string;
    assert.ok(ownerUserId, 'expected seeded coach owner user');
    const targetCoachUserId = asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId))
      .find((userId) => userId !== ownerUserId);
    assert.ok(targetCoachUserId, 'expected second coach user');

    const createClubRes = await app.inject({
      method: 'POST',
      url: '/v1/clubs',
      headers: authHeaders(tables, ownerUserId, 'coach'),
      payload: {
        name: `Direct Admin Invite ${Date.now()}`,
        city: 'London',
        visibility: 'private',
      },
    });
    assert.equal(createClubRes.statusCode, 201);
    const clubId = (createClubRes.json() as { club: { id: string } }).club.id;

    const createInviteRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invites`,
      headers: authHeaders(tables, ownerUserId, 'coach'),
      payload: {
        targetUserIds: [targetCoachUserId],
        role: 'ADMIN',
      },
    });
    assert.equal(createInviteRes.statusCode, 201);
    const createInvitePayload = createInviteRes.json() as {
      invites: { id: string; clubId: string; targetUserId: string; role: string; status: string }[];
      total: number;
    };
    assert.equal(createInvitePayload.total, 1);
    assert.equal(createInvitePayload.invites[0]?.clubId, clubId);
    assert.equal(createInvitePayload.invites[0]?.targetUserId, targetCoachUserId);
    assert.equal(createInvitePayload.invites[0]?.role, 'ADMIN');
    assert.equal(createInvitePayload.invites[0]?.status, 'pending');
    assert.equal(
      asRows(getMarketplaceSeedStore().tables.clubMemberships).some(
        (row) =>
          asString(row.clubId) === clubId &&
          asString(row.userId) === targetCoachUserId &&
          isActiveClubMembership(row),
      ),
      false,
      'direct admin invite must stay pending until target acceptance',
    );

    const respondRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/invites/${createInvitePayload.invites[0]?.id}/respond`,
      headers: authHeaders(tables, targetCoachUserId, 'coach'),
      payload: { response: 'accepted' },
    });
    assert.equal(respondRes.statusCode, 200);
    const respondPayload = respondRes.json() as {
      invite: { status: string };
      membership: { clubId: string; userId: string; role: string } | null;
    };
    assert.equal(respondPayload.invite.status, 'accepted');
    assert.equal(respondPayload.membership?.clubId, clubId);
    assert.equal(respondPayload.membership?.userId, targetCoachUserId);
    assert.equal(respondPayload.membership?.role, 'ADMIN');

    const storedMembership = asRows(getMarketplaceSeedStore().tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === targetCoachUserId,
    );
    assert.equal(isActiveClubMembership(storedMembership), true);
    assert.equal(asString(storedMembership?.role), 'club_admin');
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite.create',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite.respond',
        resourceId: createInvitePayload.invites[0]?.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('denies direct admin invites for non-staff targets', async () => {
    const tables = loadTables();
    const ownerUserId = asString(asRows(tables.coachProfiles)[0]?.userId) as string;
    assert.ok(ownerUserId, 'expected seeded coach owner user');
    const coachUserIds = new Set(
      asRows(tables.coachProfiles)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const adminUserIds = new Set(
      asRows(tables.userRoleMemberships)
        .filter((row) => asString(row.role) === 'club_admin')
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const targetMemberUserId = asRows(tables.userRoleMemberships)
      .filter((row) => asString(row.role) === 'member' || asString(row.role) === 'parent')
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId))
      .find((userId) => !coachUserIds.has(userId) && !adminUserIds.has(userId));
    assert.ok(targetMemberUserId, 'expected non-staff user');

    const createClubRes = await app.inject({
      method: 'POST',
      url: '/v1/clubs',
      headers: authHeaders(tables, ownerUserId, 'coach'),
      payload: {
        name: `Direct Admin Non Staff ${Date.now()}`,
        city: 'London',
        visibility: 'private',
      },
    });
    assert.equal(createClubRes.statusCode, 201);
    const clubId = (createClubRes.json() as { club: { id: string } }).club.id;

    const createInviteRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invites`,
      headers: authHeaders(tables, ownerUserId, 'coach'),
      payload: {
        targetUserIds: [targetMemberUserId],
        role: 'ADMIN',
      },
    });
    assert.equal(createInviteRes.statusCode, 400);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite.create',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('denies direct admin invites from equal-rank club admins', async () => {
    const tables = loadTables();
    const clubAdminMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.role) === 'club_admin' && isActiveClubMembership(row),
    );
    assert.ok(clubAdminMembership, 'expected club admin membership');
    const adminUserId = asString(clubAdminMembership.userId) as string;
    const clubId = asString(clubAdminMembership.clubId) as string;
    const existingClubUserIds = new Set(
      asRows(tables.clubMemberships)
        .filter((row) => asString(row.clubId) === clubId && isActiveClubMembership(row))
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const targetCoachUserId = asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId))
      .find((userId) => userId !== adminUserId && !existingClubUserIds.has(userId));
    assert.ok(targetCoachUserId, 'expected standalone coach user');

    const createRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invites`,
      headers: authHeaders(tables, adminUserId, 'club_admin'),
      payload: {
        targetUserIds: [targetCoachUserId],
        role: 'ADMIN',
      },
    });
    assert.equal(createRes.statusCode, 403);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite.create',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('denies direct member invites from club members without invite management', async () => {
    const tables = loadTables();
    const memberMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.role) === 'member' && isActiveClubMembership(row),
    );
    assert.ok(memberMembership, 'expected ordinary club member membership');
    const clubId = asString(memberMembership.clubId) as string;
    const memberUserId = asString(memberMembership.userId) as string;
    const existingClubUserIds = new Set(
      asRows(tables.clubMemberships)
        .filter((row) => asString(row.clubId) === clubId && isActiveClubMembership(row))
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const targetMemberUserId = asRows(tables.userRoleMemberships)
      .filter((row) => asString(row.role) === 'member')
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId))
      .find((userId) => userId !== memberUserId && !existingClubUserIds.has(userId));
    assert.ok(targetMemberUserId, 'expected target member outside club');

    const createRes = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invites`,
      headers: authHeaders(tables, memberUserId, 'member'),
      payload: {
        targetUserIds: [targetMemberUserId],
        role: 'MEMBER',
      },
    });
    assert.equal(createRes.statusCode, 403);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite.create',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('keeps the club authority flow working in db fixture mode', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = loadTables();
      const memberUserIds = asRows(tables.userRoleMemberships)
        .filter((row) => asString(row.role) === 'member')
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId));

      const clubAdminMembership = asRows(tables.clubMemberships).find(
        (row) => asString(row.role) === 'club_admin',
      );
      assert.ok(clubAdminMembership, 'expected seeded club admin membership');
      const adminUserId = asString(clubAdminMembership.userId) as string;

      const clubsRes = await app.inject({
        method: 'GET',
        url: '/v1/clubs',
        headers: {
          'x-auth-user-id': adminUserId,
          'x-auth-roles': rolesForUser(tables, adminUserId).join(',') || 'club_admin',
          'x-acting-role': 'club_admin',
        },
      });
      assert.equal(clubsRes.statusCode, 200);
      const clubsPayload = clubsRes.json() as {
        clubs: { id: string; inviteCode: string }[];
      };
      const clubId = clubsPayload.clubs[0]?.id;
      const inviteCode = clubsPayload.clubs[0]?.inviteCode;
      assert.ok(clubId, 'expected db-mode club id');
      assert.ok(inviteCode, 'expected db-mode member invite code');

      const existingClubUserIds = new Set(
        asRows(tables.clubMemberships)
          .filter((row) => asString(row.clubId) === clubId)
          .map((row) => asString(row.userId))
          .filter((userId): userId is string => Boolean(userId)),
      );
      const standaloneMemberId = memberUserIds.find((userId) => !existingClubUserIds.has(userId));
      assert.ok(standaloneMemberId, 'expected standalone member for db-mode club join');

      const resolveRes = await app.inject({
        method: 'GET',
        url: `/v1/clubs/join/resolve?code=${encodeURIComponent(inviteCode)}`,
        headers: {
          'x-auth-user-id': standaloneMemberId as string,
          'x-auth-roles': rolesForUser(tables, standaloneMemberId as string).join(',') || 'member',
          'x-acting-role': 'member',
        },
      });
      assert.equal(resolveRes.statusCode, 200);
      assert.equal(
        (resolveRes.json() as { preview: { joinFlow: string } }).preview.joinFlow,
        'direct_join',
      );

      const joinRes = await app.inject({
        method: 'POST',
        url: '/v1/clubs/join',
        headers: {
          'x-auth-user-id': standaloneMemberId as string,
          'x-auth-roles': rolesForUser(tables, standaloneMemberId as string).join(',') || 'member',
          'x-acting-role': 'member',
        },
        payload: { code: inviteCode },
      });
      assert.equal(joinRes.statusCode, 201);
      const joinPayload = joinRes.json() as {
        outcome: string;
        membership: { userId: string; role: string };
      };
      assert.equal(joinPayload.outcome, 'joined');
      assert.equal(joinPayload.membership.userId, standaloneMemberId);
      assert.equal(joinPayload.membership.role, 'MEMBER');

      const createCoachCodeRes = await app.inject({
        method: 'POST',
        url: `/v1/clubs/${clubId}/invite-codes`,
        headers: {
          'x-auth-user-id': adminUserId,
          'x-auth-roles': rolesForUser(tables, adminUserId).join(',') || 'club_admin',
          'x-acting-role': 'club_admin',
        },
        payload: { role: 'COACH' },
      });
      assert.equal(createCoachCodeRes.statusCode, 201);
      const coachCode = (createCoachCodeRes.json() as { inviteCode: { code: string } }).inviteCode
        .code;

      const targetCoachUserId = asRows(tables.coachProfiles)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId))
        .find((userId) => userId !== adminUserId && !existingClubUserIds.has(userId));
      assert.ok(targetCoachUserId, 'expected second coach for db-mode invite flow');

      const staffJoinRes = await app.inject({
        method: 'POST',
        url: '/v1/clubs/join',
        headers: {
          'x-auth-user-id': targetCoachUserId as string,
          'x-auth-roles': rolesForUser(tables, targetCoachUserId as string).join(',') || 'coach',
          'x-acting-role': 'coach',
        },
        payload: { code: coachCode },
      });
      assert.equal(staffJoinRes.statusCode, 202);
      const pendingInviteId = (staffJoinRes.json() as { invite: { id: string } }).invite.id;

      const inboxRes = await app.inject({
        method: 'GET',
        url: '/v1/clubs/invites',
        headers: {
          'x-auth-user-id': targetCoachUserId as string,
          'x-auth-roles': rolesForUser(tables, targetCoachUserId as string).join(',') || 'coach',
          'x-acting-role': 'coach',
        },
      });
      assert.equal(inboxRes.statusCode, 200);
      const inboxPayload = inboxRes.json() as { invites: { id: string; clubId: string }[] };
      assert.equal(
        inboxPayload.invites.some(
          (invite) => invite.id === pendingInviteId && invite.clubId === clubId,
        ),
        true,
      );

      const respondRes = await app.inject({
        method: 'POST',
        url: `/v1/clubs/invites/${pendingInviteId}/respond`,
        headers: {
          'x-auth-user-id': targetCoachUserId as string,
          'x-auth-roles': rolesForUser(tables, targetCoachUserId as string).join(',') || 'coach',
          'x-acting-role': 'coach',
        },
        payload: { response: 'accepted' },
      });
      assert.equal(respondRes.statusCode, 200);
      const respondPayload = respondRes.json() as {
        invite: { status: string };
        membership: { role: string; userId: string } | null;
      };
      assert.equal(respondPayload.invite.status, 'accepted');
      assert.equal(respondPayload.membership?.role, 'COACH');
      assert.equal(respondPayload.membership?.userId, targetCoachUserId);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
      resetCoachClubRouteStateForTests();
    }
  });

  it('allows security admins to view clubs without direct membership', async () => {
    const tables = loadTables();
    const securityAdminMembership = asRows(tables.userRoleMemberships).find(
      (row) => asString(row.role) === 'security_admin',
    );
    assert.ok(securityAdminMembership, 'expected seeded security admin role membership');
    const userId = asString(securityAdminMembership.userId) as string;

    const res = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: {
        'x-auth-user-id': userId,
        'x-auth-roles': rolesForUser(tables, userId).join(',') || 'security_admin',
        'x-acting-role': 'security_admin',
      },
    });
    assert.equal(res.statusCode, 200);

    const payload = res.json() as { clubs: { id: string }[] };
    assert.equal(payload.clubs.length >= 1, true);
  });

  it('proves db-mode booking lifecycle visibility and unrelated actor denials', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = loadTables();
      const guardianLink = asRows(tables.guardianChildLinks)[0];
      assert.ok(guardianLink, 'expected seeded guardian-child link');
      const bookedByUserId = asString(guardianLink.guardianUserId) as string;
      const athleteId = asString(guardianLink.athleteId) as string;
      const athlete = asRows(tables.athletes).find((row) => asString(row.id) === athleteId);
      assert.ok(athlete, 'expected seeded athlete for guardian-child link');
      const participantAthleteUserId = asString(athlete.userId) as string;
      const coachOffering = asRows(tables.coachingOfferings)[0];
      assert.ok(coachOffering, 'expected seeded coaching offering');
      const coachUserId = asString(coachOffering.coachUserId) as string;
      const availableSlot = await getFirstAvailableSlot({
        app,
        tables,
        authUserId: bookedByUserId,
        coachUserId,
        requireMaxBookings: 1,
      });

      const create = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: authHeaders(tables, bookedByUserId, 'parent'),
        payload: {
          coachUserId,
          athleteIds: [athleteId],
          bookedByUserId,
          scheduledAt: `${availableSlot.date}T${availableSlot.startTime}:00.000Z`,
          durationMinutes: 60,
          location: availableSlot.location ?? 'DB Lifecycle Test Pitch',
          serviceType: 'one_to_one',
          objectives: ['First touch under pressure'],
          notes: 'Created from db-mode lifecycle proof',
          priceMinor: 4200,
          currency: 'GBP',
          idempotencyKey: 'db-booking-lifecycle-proof',
        },
      });
      assert.equal(create.statusCode, 201);
      const created = create.json() as {
        id: string;
        coachUserId: string;
        bookedByUserId?: string;
        status: string;
        version: number;
      };
      assert.match(created.id, /^bok_/);
      assert.equal(created.coachUserId, coachUserId);
      assert.equal(created.bookedByUserId, bookedByUserId);
      assert.equal(created.status, 'AWAITING_CONFIRMATION');
      assert.equal(created.version, 1);

      const fixtureStore = getDbFixtureStore();
      const fixtureBookings = asRows(fixtureStore.tables.bookings).filter(
        (row) => asString(row.id) === created.id,
      );
      assert.equal(fixtureBookings.length, 1);
      assert.equal(asString(fixtureBookings[0]?.coachUserId), coachUserId);

      const coachList = await app.inject({
        method: 'GET',
        url: '/v1/bookings',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(coachList.statusCode, 200);
      const coachListPayload = coachList.json() as { bookings: { id: string }[] };
      assert.equal(
        coachListPayload.bookings.some((booking) => booking.id === created.id),
        true,
      );

      const coachDetail = await app.inject({
        method: 'GET',
        url: `/v1/bookings/${created.id}`,
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(coachDetail.statusCode, 200);
      assert.equal((coachDetail.json() as { id: string }).id, created.id);

      const familyDetail = await app.inject({
        method: 'GET',
        url: `/v1/bookings/${created.id}`,
        headers: authHeaders(tables, bookedByUserId, 'parent'),
      });
      assert.equal(familyDetail.statusCode, 200);

      const athleteDetail = await app.inject({
        method: 'GET',
        url: `/v1/bookings/${created.id}`,
        headers: authHeaders(tables, participantAthleteUserId, 'athlete'),
      });
      assert.equal(athleteDetail.statusCode, 200);

      const unrelatedParentId = asRows(tables.guardianChildLinks)
        .map((row) => asString(row.guardianUserId))
        .filter((userId): userId is string => Boolean(userId))
        .find((userId) => userId !== bookedByUserId);
      assert.ok(unrelatedParentId, 'expected unrelated parent user');

      const unrelatedCoachId = asRows(tables.coachProfiles)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId))
        .find((userId) => userId !== coachUserId);
      assert.ok(unrelatedCoachId, 'expected unrelated coach user');

      const unrelatedAthleteUserId = asRows(tables.athletes)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId))
        .find((userId) => userId !== participantAthleteUserId);
      assert.ok(unrelatedAthleteUserId, 'expected unrelated athlete user');

      const deniedActors: Array<{ actorUserId: string; role: string }> = [
        { actorUserId: unrelatedParentId, role: 'parent' },
        { actorUserId: unrelatedCoachId, role: 'coach' },
        { actorUserId: unrelatedAthleteUserId, role: 'athlete' },
      ];

      for (const actor of deniedActors) {
        const deniedDetail = await app.inject({
          method: 'GET',
          url: `/v1/bookings/${created.id}`,
          headers: authHeaders(tables, actor.actorUserId, actor.role),
        });
        assert.equal(deniedDetail.statusCode, 403);

        const deniedCancelResponse: Awaited<ReturnType<typeof app.inject>> = await app.inject({
          method: 'POST',
          url: `/v1/bookings/${created.id}/cancel`,
          headers: authHeaders(tables, actor.actorUserId, actor.role),
          payload: {
            reason: 'Should not be allowed',
            expectedVersion: created.version,
          },
        });
        assert.equal(deniedCancelResponse.statusCode, 403);
      }

      const bookingReadEvents = auditEventsFor(fixtureStore.tables, {
        action: 'booking.read',
        resourceId: created.id,
      });
      assert.equal(
        bookingReadEvents.filter((event) => asString(event.result) === 'SUCCESS').length,
        3,
      );
      assert.equal(
        bookingReadEvents.filter((event) => asString(event.result) === 'DENY').length,
        deniedActors.length,
      );
      assert.equal(
        bookingReadEvents.every((event) => event.sensitiveRead === true),
        true,
      );
      for (const event of bookingReadEvents) {
        const metadata = JSON.stringify(event.metadataJson ?? {});
        assert.doesNotMatch(metadata, /First touch under pressure|DB Lifecycle Test Pitch/i);
        assert.doesNotMatch(metadata, /price|notes|objectives|athleteId/i);
      }
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
      resetCoachClubRouteStateForTests();
    }
  });

  it('creates, cancels, reopens, and lists bookings for the booked-by user', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks)[0];
    assert.ok(guardianLink, 'expected seeded guardian-child link');
    const bookedByUserId = asString(guardianLink.guardianUserId) as string;
    const athleteId = asString(guardianLink.athleteId) as string;
    const coachOffering = asRows(tables.coachingOfferings)[0];
    assert.ok(coachOffering, 'expected seeded coaching offering');
    const coachUserId = asString(coachOffering.coachUserId) as string;
    const availableSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: bookedByUserId,
      coachUserId,
      requireMaxBookings: 1,
    });

    const create = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {
        coachUserId,
        athleteIds: [athleteId],
        bookedByUserId,
        scheduledAt: `${availableSlot.date}T${availableSlot.startTime}:00.000Z`,
        durationMinutes: 60,
        location: availableSlot.location ?? 'Integration Test Pitch',
        serviceType: 'one_to_one',
        objectives: ['Decision making'],
        notes: 'Created from p0 endpoint test',
        priceMinor: 4200,
        currency: 'GBP',
      },
    });
    assert.equal(create.statusCode, 201);
    const store = getMarketplaceSeedStore();
    const created = create.json() as { id: string; status: string; version: number };
    assert.match(created.id, /^bok_/);
    assert.equal(created.status, 'AWAITING_CONFIRMATION');
    assert.equal(created.version, 1);

    const confirmed = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/confirm`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        expectedVersion: created.version,
        idempotencyKey: 'booking-lifecycle-coach-confirm',
      },
    });
    assert.equal(confirmed.statusCode, 200, confirmed.body);
    const confirmedPayload = confirmed.json() as { status: string; version: number };
    assert.equal(confirmedPayload.status, 'CONFIRMED');
    assert.equal(confirmedPayload.version, created.version + 1);

    const listed = await app.inject({
      method: 'GET',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as { bookings: { id: string }[] };
    assert.equal(
      listedPayload.bookings.some((booking) => booking.id === created.id),
      true,
    );

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/bookings/${created.id}`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
    });
    assert.equal(detail.statusCode, 200);
    const detailPayload = detail.json() as { id: string; bookedByUserId?: string };
    assert.equal(detailPayload.id, created.id);
    assert.equal(detailPayload.bookedByUserId, bookedByUserId);

    const staleCancel = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/cancel`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {
        reason: 'Schedule change',
        expectedVersion: confirmedPayload.version + 1,
      },
    });
    assert.equal(staleCancel.statusCode, 409);

    const cancelPayload = {
      reason: 'Schedule change',
      note: 'Need to move the session to next week.',
      expectedVersion: confirmedPayload.version,
      idempotencyKey: 'booking-cancel-idempotency-test',
    };
    const cancelled = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/cancel`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: cancelPayload,
    });
    assert.equal(cancelled.statusCode, 200);
    const cancelledPayload = cancelled.json() as {
      id: string;
      status: string;
      cancelledAt: string | null;
      version: number;
    };
    assert.equal(cancelledPayload.id, created.id);
    assert.equal(cancelledPayload.status, 'CANCELLED');
    assert.equal(typeof cancelledPayload.cancelledAt, 'string');
    assert.equal(cancelledPayload.version, confirmedPayload.version + 1);

    const cancelledAgain = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/cancel`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: cancelPayload,
    });
    assert.equal(cancelledAgain.statusCode, 200);
    const cancelledAgainPayload = cancelledAgain.json() as { status: string; version: number };
    assert.equal(cancelledAgainPayload.status, 'CANCELLED');
    assert.equal(cancelledAgainPayload.version, cancelledPayload.version);

    const conflictingCancelReplay = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/cancel`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {
        ...cancelPayload,
        note: 'Different note under same key.',
      },
    });
    assert.equal(conflictingCancelReplay.statusCode, 409);

    const cancelEvents = asRows(store.tables.bookingStatusEvents).filter(
      (row) => asString(row.bookingId) === created.id && asString(row.toStatus) === 'CANCELLED',
    );
    assert.equal(cancelEvents.length, 1);

    const staleReopen = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/reopen`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {
        note: 'Keeping the original slot after all.',
        expectedVersion: confirmedPayload.version,
      },
    });
    assert.equal(staleReopen.statusCode, 409);

    const reopenPayload = {
      note: 'Keeping the original slot after all.',
      expectedVersion: cancelledPayload.version,
      idempotencyKey: 'booking-reopen-idempotency-test',
    };
    const reopened = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/reopen`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: reopenPayload,
    });
    assert.equal(reopened.statusCode, 200);
    const reopenedPayload = reopened.json() as {
      id: string;
      status: string;
      cancelledAt: string | null;
      version: number;
    };
    assert.equal(reopenedPayload.id, created.id);
    assert.equal(reopenedPayload.status, 'CONFIRMED');
    assert.equal(reopenedPayload.cancelledAt, null);
    assert.equal(reopenedPayload.version, cancelledPayload.version + 1);

    const reopenedReplay = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/reopen`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: reopenPayload,
    });
    assert.equal(reopenedReplay.statusCode, 200);
    const reopenedReplayPayload = reopenedReplay.json() as { status: string; version: number };
    assert.equal(reopenedReplayPayload.status, 'CONFIRMED');
    assert.equal(reopenedReplayPayload.version, reopenedPayload.version);

    const reopenEvents = asRows(store.tables.bookingStatusEvents).filter(
      (row) =>
        asString(row.bookingId) === created.id &&
        asString(row.fromStatus) === 'CANCELLED' &&
        asString(row.toStatus) === 'CONFIRMED',
    );
    assert.equal(reopenEvents.length, 1);

    const reopenedAgain = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/reopen`,
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {},
    });
    assert.equal(reopenedAgain.statusCode, 400);
  });

  it('replays direct booking create by idempotency key without duplicating the booking', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks)[0];
    assert.ok(guardianLink, 'expected seeded guardian-child link');
    const bookedByUserId = asString(guardianLink.guardianUserId) as string;
    const athleteId = asString(guardianLink.athleteId) as string;
    const coachOffering = asRows(tables.coachingOfferings)[0];
    assert.ok(coachOffering, 'expected seeded coaching offering');
    const coachUserId = asString(coachOffering.coachUserId) as string;
    const availableSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: bookedByUserId,
      coachUserId,
      requireMaxBookings: 1,
    });
    const store = getMarketplaceSeedStore();
    const headers = {
      'x-auth-user-id': bookedByUserId,
      'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
      'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
    };
    const payload = {
      coachUserId,
      athleteIds: [athleteId],
      bookedByUserId,
      scheduledAt: `${availableSlot.date}T${availableSlot.startTime}:00.000Z`,
      durationMinutes: 60,
      location: availableSlot.location ?? 'Idempotency Test Pitch',
      serviceType: 'one_to_one',
      objectives: ['Decision making'],
      notes: 'Created from idempotency test',
      priceMinor: 4200,
      currency: 'GBP',
      idempotencyKey: 'booking-create-idempotency-test',
    };

    const first = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers,
      payload,
    });
    assert.equal(first.statusCode, 201);
    const firstPayload = first.json() as { id: string };

    const replay = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers,
      payload,
    });
    assert.equal(replay.statusCode, 201);
    const replayPayload = replay.json() as { id: string };
    assert.equal(replayPayload.id, firstPayload.id);

    const matchingBookings = asRows(store.tables.bookings).filter(
      (row) => asString(row.id) === firstPayload.id,
    );
    const matchingStatusEvents = asRows(store.tables.bookingStatusEvents).filter(
      (row) => asString(row.bookingId) === firstPayload.id,
    );
    assert.equal(matchingBookings.length, 1);
    assert.equal(matchingStatusEvents.length, 1);

    const conflictingReplay = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers,
      payload: {
        ...payload,
        notes: 'Different payload under the same idempotency key',
      },
    });
    assert.equal(conflictingReplay.statusCode, 409);
  });

  it('creates db-mode booking series as backend authority and replays idempotently', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = loadTables();
      const guardianLink = asRows(tables.guardianChildLinks)[0];
      assert.ok(guardianLink, 'expected seeded guardian-child link');
      const bookedByUserId = asString(guardianLink.guardianUserId) as string;
      const athleteId = asString(guardianLink.athleteId) as string;
      const coachOffering = asRows(tables.coachingOfferings)[0];
      assert.ok(coachOffering, 'expected seeded coaching offering');
      const coachUserId = asString(coachOffering.coachUserId) as string;
      const availableSlots = await getAvailableSlots({
        app,
        tables,
        authUserId: bookedByUserId,
        coachUserId,
        minCount: 2,
      });
      const headers = authHeaders(tables, bookedByUserId, 'parent');
      const payload = {
        coachUserId,
        athleteIds: [athleteId],
        bookedByUserId,
        occurrences: availableSlots.map((slot) => ({
          scheduledAt: `${slot.date}T${slot.startTime}:00.000Z`,
          durationMinutes: 60,
          location: slot.location ?? 'Series Authority Test Pitch',
        })),
        location: availableSlots[0]?.location ?? 'Series Authority Test Pitch',
        serviceType: 'one_to_one',
        objectives: ['Progressive receiving'],
        notes: 'Created from db-mode booking series authority proof',
        priceMinor: 4000,
        currency: 'GBP',
        frequency: 'WEEKLY',
        patternLabel: 'Backend-owned two-week package',
        idempotencyKey: 'booking-series-authority-test',
      };

      const unrelatedGuardian = asRows(tables.guardianChildLinks).find(
        (row) =>
          asString(row.guardianUserId) !== bookedByUserId && asString(row.athleteId) !== athleteId,
      );
      assert.ok(unrelatedGuardian, 'expected unrelated guardian-child link');
      const deniedRes = await app.inject({
        method: 'POST',
        url: '/v1/booking-series',
        headers: authHeaders(
          tables,
          asString(unrelatedGuardian.guardianUserId) as string,
          'parent',
        ),
        payload: {
          ...payload,
          idempotencyKey: 'booking-series-denied-parent-test',
        },
      });
      assert.equal(deniedRes.statusCode, 403);
      assert.equal(
        asRows(getDbFixtureStore().tables.recurringSeries).some(
          (row) => asString(row.notes) === payload.notes,
        ),
        false,
      );

      const createdRes = await app.inject({
        method: 'POST',
        url: '/v1/booking-series',
        headers,
        payload,
      });
      assert.equal(createdRes.statusCode, 201);
      const created = createdRes.json() as {
        series: { id: string; bookingIds: string[]; totalPriceMinor: number; version: number };
        bookings: {
          id: string;
          recurringSeriesId?: string | null;
          groupSessionId?: string | null;
        }[];
      };
      assert.match(created.series.id, /^rec_/);
      assert.equal(created.series.bookingIds.length, 2);
      assert.equal(created.bookings.length, 2);
      assert.equal(
        created.bookings.every(
          (booking) =>
            booking.recurringSeriesId === created.series.id && booking.groupSessionId === null,
        ),
        true,
      );
      assert.equal(created.series.totalPriceMinor, 8000);
      assert.equal(created.series.version, 1);

      const fixtureStore = getDbFixtureStore();
      const seriesRows = asRows(fixtureStore.tables.recurringSeries).filter(
        (row) => asString(row.id) === created.series.id,
      );
      assert.equal(seriesRows.length, 1);
      const bookingRows = asRows(fixtureStore.tables.bookings).filter(
        (row) => asString(row.recurringSeriesId) === created.series.id,
      );
      assert.equal(bookingRows.length, 2);
      assert.deepEqual(bookingRows.map((row) => asNumber(row.seriesIndex)).sort(), [0, 1]);

      const coachList = await app.inject({
        method: 'GET',
        url: '/v1/bookings',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(coachList.statusCode, 200);
      const coachListPayload = coachList.json() as {
        bookings: { id: string; recurringSeriesId?: string | null }[];
      };
      for (const bookingId of created.series.bookingIds) {
        const listedBooking = coachListPayload.bookings.find((booking) => booking.id === bookingId);
        assert.ok(listedBooking);
        assert.equal(listedBooking.recurringSeriesId, created.series.id);
      }

      const parentSeriesDetail = await app.inject({
        method: 'GET',
        url: `/v1/booking-series/${created.series.id}`,
        headers,
      });
      assert.equal(parentSeriesDetail.statusCode, 200);
      assert.equal(parentSeriesDetail.json().id, created.series.id);

      const coachSeriesList = await app.inject({
        method: 'GET',
        url: '/v1/booking-series',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(coachSeriesList.statusCode, 200);
      assert.equal(
        (coachSeriesList.json() as { series: { id: string }[] }).series.some(
          (series) => series.id === created.series.id,
        ),
        true,
      );

      const unrelatedParentId = asString(unrelatedGuardian.guardianUserId) as string;
      const deniedParentDetail = await app.inject({
        method: 'GET',
        url: `/v1/booking-series/${created.series.id}`,
        headers: authHeaders(tables, unrelatedParentId, 'parent'),
      });
      assert.equal(deniedParentDetail.statusCode, 403);

      const unrelatedCoachUserId = asString(
        asRows(tables.coachingOfferings).find((row) => asString(row.coachUserId) !== coachUserId)
          ?.coachUserId,
      );
      assert.ok(unrelatedCoachUserId, 'expected unrelated coach');
      const deniedCoachDetail = await app.inject({
        method: 'GET',
        url: `/v1/booking-series/${created.series.id}`,
        headers: authHeaders(tables, unrelatedCoachUserId, 'coach'),
      });
      assert.equal(deniedCoachDetail.statusCode, 403);

      const unrelatedAthleteUserId = asString(
        asRows(tables.athletes).find(
          (row) => asString(row.id) !== athleteId && asString(row.userId),
        )?.userId,
      );
      assert.ok(unrelatedAthleteUserId, 'expected unrelated athlete user');
      const deniedAthleteDetail = await app.inject({
        method: 'GET',
        url: `/v1/booking-series/${created.series.id}`,
        headers: authHeaders(tables, unrelatedAthleteUserId, 'athlete'),
      });
      assert.equal(deniedAthleteDetail.statusCode, 403);

      const coachSeriesDetail = await app.inject({
        method: 'GET',
        url: `/v1/booking-series/${created.series.id}`,
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(coachSeriesDetail.statusCode, 200);
      const deniedCoachUpdate = await app.inject({
        method: 'PATCH',
        url: `/v1/booking-series/${created.series.id}`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          location: 'Coach should not mutate full family series',
          expectedVersion: created.series.version,
          idempotencyKey: 'booking-series-denied-coach-update-test',
        },
      });
      assert.equal(deniedCoachUpdate.statusCode, 403);

      const athleteUserId = asString(
        asRows(tables.athletes).find((row) => asString(row.id) === athleteId)?.userId,
      );
      assert.ok(athleteUserId, 'expected athlete user for linked series athlete');
      const athleteSeriesDetail = await app.inject({
        method: 'GET',
        url: `/v1/booking-series/${created.series.id}`,
        headers: authHeaders(tables, athleteUserId, 'athlete'),
      });
      assert.equal(athleteSeriesDetail.statusCode, 200);
      const deniedAthleteCancel = await app.inject({
        method: 'POST',
        url: `/v1/booking-series/${created.series.id}/cancel`,
        headers: authHeaders(tables, athleteUserId, 'athlete'),
        payload: {
          reason: 'Athlete should not mutate full family series',
          expectedVersion: created.series.version,
          idempotencyKey: 'booking-series-denied-athlete-cancel-test',
        },
      });
      assert.equal(deniedAthleteCancel.statusCode, 403);
      assert.equal(
        asRows(fixtureStore.tables.bookings).some(
          (row) =>
            asString(row.recurringSeriesId) === created.series.id &&
            asString(row.status) === 'CANCELLED',
        ),
        false,
      );

      const replayRes = await app.inject({
        method: 'POST',
        url: '/v1/booking-series',
        headers,
        payload,
      });
      assert.equal(replayRes.statusCode, 201);
      const replay = replayRes.json() as { series: { id: string; bookingIds: string[] } };
      assert.equal(replay.series.id, created.series.id);
      assert.deepEqual(replay.series.bookingIds, created.series.bookingIds);
      assert.equal(
        asRows(fixtureStore.tables.bookings).filter(
          (row) => asString(row.recurringSeriesId) === created.series.id,
        ).length,
        2,
      );

      const firstSeriesBookingId = created.series.bookingIds[0];
      fixtureStore.tables.invoices = [
        ...(fixtureStore.tables.invoices ?? []),
        {
          id: 'invc_booking_series_paid_update_block',
          invoiceNumber: 'INV-SERIES-PAID-UPDATE-BLOCK',
          bookingId: firstSeriesBookingId,
          coachUserId,
          payerUserId: bookedByUserId,
          athleteId,
          status: 'PAID',
          sessionDate: payload.occurrences[0].scheduledAt,
          sessionType: payload.serviceType,
          sessionLocation: payload.location,
          sessionDurationMinutes: 60,
          subtotalMinor: 4000,
          taxMinor: 0,
          taxRatePercent: 0,
          totalMinor: 4000,
          currency: 'GBP',
          paidAt: new Date().toISOString(),
          createdByUserId: coachUserId,
          updatedByUserId: coachUserId,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ];
      const invoiceBlockedUpdate = await app.inject({
        method: 'PATCH',
        url: `/v1/booking-series/${created.series.id}`,
        headers,
        payload: {
          location: 'Invoice Blocked Pitch',
          expectedVersion: created.series.version,
          idempotencyKey: 'booking-series-paid-invoice-blocked-update-test',
        },
      });
      assert.equal(invoiceBlockedUpdate.statusCode, 400);
      fixtureStore.tables.invoices = asRows(fixtureStore.tables.invoices).filter(
        (row) => asString(row.id) !== 'invc_booking_series_paid_update_block',
      );

      fixtureStore.tables.invoices = [
        ...(fixtureStore.tables.invoices ?? []),
        {
          id: 'invc_booking_series_update_sync',
          invoiceNumber: 'INV-SERIES-UPDATE-SYNC',
          bookingId: firstSeriesBookingId,
          coachUserId,
          payerUserId: bookedByUserId,
          athleteId,
          status: 'SENT',
          sessionDate: payload.occurrences[0].scheduledAt,
          sessionType: payload.serviceType,
          sessionLocation: payload.location,
          sessionDurationMinutes: 60,
          subtotalMinor: 4000,
          taxMinor: 0,
          taxRatePercent: 0,
          totalMinor: 4000,
          currency: 'GBP',
          createdByUserId: coachUserId,
          updatedByUserId: coachUserId,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ];
      fixtureStore.tables.invoiceLineItems = [
        ...(fixtureStore.tables.invoiceLineItems ?? []),
        {
          id: 'ili_booking_series_update_sync',
          invoiceId: 'invc_booking_series_update_sync',
          description: 'Old session description',
          quantity: 1,
          unitAmountMinor: 4000,
          lineSubtotalMinor: 4000,
          taxRatePercent: 0,
          taxMinor: 0,
          totalMinor: 4000,
          sortOrder: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const deniedUpdate = await app.inject({
        method: 'PATCH',
        url: `/v1/booking-series/${created.series.id}`,
        headers: authHeaders(tables, unrelatedParentId, 'parent'),
        payload: {
          location: 'Should not be allowed',
          expectedVersion: created.series.version,
          idempotencyKey: 'booking-series-denied-update-test',
        },
      });
      assert.equal(deniedUpdate.statusCode, 403);

      const lastCreatedBooking = asRows(fixtureStore.tables.bookings)
        .filter((row) => asString(row.recurringSeriesId) === created.series.id)
        .sort(
          (left, right) =>
            Date.parse(asString(left.scheduledAt) ?? '') -
            Date.parse(asString(right.scheduledAt) ?? ''),
        )
        .at(-1);
      const updateEndDate = new Date(
        Date.parse(asString(lastCreatedBooking?.scheduledAt) ?? '') + 24 * 60 * 60 * 1000,
      ).toISOString();
      const updatedRes = await app.inject({
        method: 'PATCH',
        url: `/v1/booking-series/${created.series.id}`,
        headers,
        payload: {
          time: '10:30',
          durationMinutes: 75,
          location: 'Rescheduled Series Pitch',
          notes: 'Updated through backend series authority',
          endDate: updateEndDate,
          expectedVersion: created.series.version,
          idempotencyKey: 'booking-series-update-test',
        },
      });
      assert.equal(updatedRes.statusCode, 200);
      const updated = updatedRes.json() as {
        series: { id: string; status: string; version: number; location: string; endDate: string };
        bookings: {
          scheduledAt: string;
          durationMinutes: number;
          location: string;
          notes: string;
        }[];
      };
      assert.equal(updated.series.id, created.series.id);
      assert.equal(updated.series.status, 'ACTIVE');
      assert.equal(updated.series.version, 2);
      assert.equal(updated.series.location, 'Rescheduled Series Pitch');
      assert.equal(updated.series.endDate, updateEndDate);
      const syncedInvoice = asRows(fixtureStore.tables.invoices).find(
        (row) => asString(row.id) === 'invc_booking_series_update_sync',
      );
      assert.equal(asString(syncedInvoice?.status), 'SENT');
      assert.equal(asString(syncedInvoice?.sessionLocation), 'Rescheduled Series Pitch');
      assert.equal(asNumber(syncedInvoice?.sessionDurationMinutes), 75);
      assert.equal(asString(syncedInvoice?.sessionDate)?.slice(11, 16), '10:30');
      assert.equal(asNumber(syncedInvoice?.version), 2);
      const syncedLineItem = asRows(fixtureStore.tables.invoiceLineItems).find(
        (row) => asString(row.id) === 'ili_booking_series_update_sync',
      );
      assert.equal(asString(syncedLineItem?.description), '1-on-1 Training');
      assert.equal(
        asRows(fixtureStore.tables.invoiceEvents).some((row) => {
          const metadata = row.metadataJson as { source?: string; bookingId?: string } | undefined;
          return (
            asString(row.invoiceId) === 'invc_booking_series_update_sync' &&
            asString(row.eventType) === 'SENT' &&
            metadata?.source === 'booking-series-update' &&
            metadata.bookingId === firstSeriesBookingId
          );
        }),
        true,
      );
      assert.deepEqual(
        updated.bookings.map((booking) => booking.scheduledAt.slice(11, 16)),
        ['10:30', '10:30'],
      );
      assert.deepEqual(
        updated.bookings.map((booking) => booking.durationMinutes),
        [75, 75],
      );
      assert.deepEqual(
        updated.bookings.map((booking) => booking.location),
        ['Rescheduled Series Pitch', 'Rescheduled Series Pitch'],
      );

      const staleUpdate = await app.inject({
        method: 'PATCH',
        url: `/v1/booking-series/${created.series.id}`,
        headers,
        payload: {
          location: 'Stale update',
          expectedVersion: created.series.version,
          idempotencyKey: 'booking-series-stale-update-test',
        },
      });
      assert.equal(staleUpdate.statusCode, 409);

      const updateReplay = await app.inject({
        method: 'PATCH',
        url: `/v1/booking-series/${created.series.id}`,
        headers,
        payload: {
          time: '10:30',
          durationMinutes: 75,
          location: 'Rescheduled Series Pitch',
          notes: 'Updated through backend series authority',
          endDate: updateEndDate,
          expectedVersion: created.series.version,
          idempotencyKey: 'booking-series-update-test',
        },
      });
      assert.equal(updateReplay.statusCode, 200);
      assert.equal(updateReplay.json().series.version, 2);

      const deniedResumeActive = await app.inject({
        method: 'POST',
        url: `/v1/booking-series/${created.series.id}/resume`,
        headers,
        payload: {
          expectedVersion: updated.series.version,
          idempotencyKey: 'booking-series-active-resume-test',
        },
      });
      assert.equal(deniedResumeActive.statusCode, 409);

      const deniedPause = await app.inject({
        method: 'POST',
        url: `/v1/booking-series/${created.series.id}/pause`,
        headers: authHeaders(tables, unrelatedParentId, 'parent'),
        payload: {
          reason: 'Should not be allowed',
          expectedVersion: updated.series.version,
          idempotencyKey: 'booking-series-denied-pause-test',
        },
      });
      assert.equal(deniedPause.statusCode, 403);

      const linkedGuardianUserId = asString(
        asRows(tables.guardianChildLinks).find((row) => {
          const guardianUserId = asString(row.guardianUserId);
          return (
            guardianUserId &&
            guardianUserId !== bookedByUserId &&
            guardianUserId !== unrelatedParentId
          );
        })?.guardianUserId,
      );
      assert.ok(linkedGuardianUserId, 'expected a second seeded parent for linked guardian proof');
      fixtureStore.tables.guardianChildLinks = [
        ...(fixtureStore.tables.guardianChildLinks ?? []),
        {
          id: 'gcl_booking_series_linked_guardian',
          guardianUserId: linkedGuardianUserId,
          athleteId,
          relationship: 'guardian',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      const linkedGuardianHeaders = authHeaders(
        fixtureStore.tables,
        linkedGuardianUserId,
        'parent',
      );
      const pausedRes = await app.inject({
        method: 'POST',
        url: `/v1/booking-series/${created.series.id}/pause`,
        headers: linkedGuardianHeaders,
        payload: {
          reason: 'Family holiday',
          expectedVersion: updated.series.version,
          idempotencyKey: 'booking-series-pause-test',
        },
      });
      assert.equal(pausedRes.statusCode, 200);
      const paused = pausedRes.json() as {
        series: { id: string; status: string; version: number };
        bookings: { status: string }[];
      };
      assert.equal(paused.series.id, created.series.id);
      assert.equal(paused.series.status, 'PAUSED');
      assert.equal(paused.series.version, 3);
      assert.deepEqual(
        paused.bookings.map((booking) => booking.status),
        ['CONFIRMED', 'CONFIRMED'],
      );

      const stalePause = await app.inject({
        method: 'POST',
        url: `/v1/booking-series/${created.series.id}/pause`,
        headers,
        payload: {
          reason: 'Stale pause',
          expectedVersion: updated.series.version,
          idempotencyKey: 'booking-series-stale-pause-test',
        },
      });
      assert.equal(stalePause.statusCode, 409);

      const pauseReplay = await app.inject({
        method: 'POST',
        url: `/v1/booking-series/${created.series.id}/pause`,
        headers: linkedGuardianHeaders,
        payload: {
          reason: 'Family holiday',
          expectedVersion: updated.series.version,
          idempotencyKey: 'booking-series-pause-test',
        },
      });
      assert.equal(pauseReplay.statusCode, 200);
      assert.equal(pauseReplay.json().series.status, 'PAUSED');

      const resumedRes = await app.inject({
        method: 'POST',
        url: `/v1/booking-series/${created.series.id}/resume`,
        headers,
        payload: {
          expectedVersion: paused.series.version,
          idempotencyKey: 'booking-series-resume-test',
        },
      });
      assert.equal(resumedRes.statusCode, 200);
      const resumed = resumedRes.json() as {
        series: { id: string; status: string; version: number };
        bookings: { status: string }[];
      };
      assert.equal(resumed.series.id, created.series.id);
      assert.equal(resumed.series.status, 'ACTIVE');
      assert.equal(resumed.series.version, 4);
      assert.deepEqual(
        resumed.bookings.map((booking) => booking.status),
        ['CONFIRMED', 'CONFIRMED'],
      );

      const resumeReplay = await app.inject({
        method: 'POST',
        url: `/v1/booking-series/${created.series.id}/resume`,
        headers,
        payload: {
          expectedVersion: paused.series.version,
          idempotencyKey: 'booking-series-resume-test',
        },
      });
      assert.equal(resumeReplay.statusCode, 200);
      assert.equal(resumeReplay.json().series.status, 'ACTIVE');

      const linkedBookingsForCompletion = asRows(fixtureStore.tables.bookings)
        .filter((row) => asString(row.recurringSeriesId) === created.series.id)
        .sort(
          (left, right) => (asNumber(left.seriesIndex) ?? 0) - (asNumber(right.seriesIndex) ?? 0),
        );
      const bookingToComplete = linkedBookingsForCompletion[0];
      assert.ok(bookingToComplete, 'expected linked booking to complete');
      const completedAt = new Date().toISOString();
      bookingToComplete.scheduledAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      bookingToComplete.updatedAt = bookingToComplete.scheduledAt;
      const completeExpectedVersion = asNumber(bookingToComplete.version) ?? 1;
      const attendanceCountBeforeCompletion = asRows(fixtureStore.tables.attendanceRecords).length;
      const sessionNoteCountBeforeCompletion = asRows(fixtureStore.tables.sessionNotes).filter(
        (row) => asString(row.bookingId) === asString(bookingToComplete.id),
      ).length;

      const deniedCompletionByParent = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/complete`,
        headers,
        payload: {
          note: 'Parent cannot complete delivery',
          completedAt,
          expectedVersion: completeExpectedVersion,
          idempotencyKey: 'booking-complete-denied-parent-test',
        },
      });
      assert.equal(deniedCompletionByParent.statusCode, 403);
      assert.equal(
        asRows(fixtureStore.tables.attendanceRecords).length,
        attendanceCountBeforeCompletion,
      );
      assert.equal(
        asRows(fixtureStore.tables.sessionNotes).filter(
          (row) => asString(row.bookingId) === asString(bookingToComplete.id),
        ).length,
        sessionNoteCountBeforeCompletion,
      );

      const futureBooking = linkedBookingsForCompletion[1];
      assert.ok(futureBooking, 'expected future linked booking for completion denial');
      const deniedFutureCompletion = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${asString(futureBooking.id)}/complete`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          note: 'Cannot complete before session starts',
          completedAt,
          expectedVersion: asNumber(futureBooking.version) ?? 1,
          idempotencyKey: 'booking-complete-future-denied-test',
        },
      });
      assert.equal(deniedFutureCompletion.statusCode, 400);
      assert.match(deniedFutureCompletion.body, /before their scheduled start time/i);
      assert.equal(
        asRows(fixtureStore.tables.sessionNotes).some(
          (row) => asString(row.bookingId) === asString(futureBooking.id),
        ),
        false,
      );

      const invalidAttendanceCompletion = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/complete`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          note: 'Invalid athlete should not create attendance proof',
          completedAt,
          expectedVersion: completeExpectedVersion,
          attendance: [
            {
              athleteId: 'ath_invalid-completion-test',
              status: 'ATTENDED',
            },
          ],
          idempotencyKey: 'booking-complete-invalid-athlete-test',
        },
      });
      assert.equal(invalidAttendanceCompletion.statusCode, 400);
      assert.match(invalidAttendanceCompletion.body, /not a booking participant/i);
      assert.equal(
        asRows(fixtureStore.tables.attendanceRecords).length,
        attendanceCountBeforeCompletion,
      );

      const completedRes = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/complete`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          note: 'Delivered and ready for proof follow-up',
          completedAt,
          expectedVersion: completeExpectedVersion,
          attendance: [
            {
              athleteId,
              status: 'ATTENDED',
              notes: 'Sharp delivery and focus',
              effortRating: 5,
            },
          ],
          idempotencyKey: 'booking-complete-series-test',
        },
      });
      assert.equal(completedRes.statusCode, 200);
      const completed = completedRes.json() as { status: string; version: number };
      assert.equal(completed.status, 'COMPLETED');
      assert.equal(completed.version, completeExpectedVersion + 1);
      const completedAttendanceRecords = asRows(fixtureStore.tables.attendanceRecords).filter(
        (row) => asString(row.bookingId) === asString(bookingToComplete.id),
      );
      assert.equal(completedAttendanceRecords.length, 1);
      assert.equal(asString(completedAttendanceRecords[0]?.status), 'ATTENDED');
      assert.equal(asString(completedAttendanceRecords[0]?.recordedByUserId), coachUserId);
      assert.equal(asString(completedAttendanceRecords[0]?.notes), 'Sharp delivery and focus');
      assert.equal(asNumber(completedAttendanceRecords[0]?.effortRating), 5);
      const completedSessionNotes = asRows(fixtureStore.tables.sessionNotes).filter(
        (row) => asString(row.bookingId) === asString(bookingToComplete.id),
      );
      assert.equal(completedSessionNotes.length, 1);
      assert.equal(asString(completedSessionNotes[0]?.athleteId), athleteId);
      assert.equal(asString(completedSessionNotes[0]?.coachUserId), coachUserId);
      assert.equal(asString(completedSessionNotes[0]?.visibility), 'PUBLIC');
      assert.equal(
        asString(completedSessionNotes[0]?.noteText),
        'Delivered and ready for proof follow-up',
      );
      const sessionNoteMetadata = completedSessionNotes[0]?.metadataJson as
        | { source?: string; attendanceRecordIds?: string[]; proofSource?: string }
        | undefined;
      assert.equal(sessionNoteMetadata?.source, 'booking-completion');
      assert.equal(sessionNoteMetadata?.proofSource, 'attendance-record');
      assert.deepEqual(
        sessionNoteMetadata?.attendanceRecordIds,
        completedAttendanceRecords.map((row) => asString(row.id)),
      );
      const completionStatusEvent = asRows(fixtureStore.tables.bookingStatusEvents)
        .filter(
          (row) =>
            asString(row.bookingId) === asString(bookingToComplete.id) &&
            asString(row.toStatus) === 'COMPLETED',
        )
        .at(-1);
      const completionMetadata = completionStatusEvent?.metadataJson as
        | {
            attendanceRecordIds?: string[];
            sessionNoteIds?: string[];
            proofSource?: string;
            proofSources?: string[];
          }
        | undefined;
      assert.deepEqual(
        completionMetadata?.attendanceRecordIds,
        completedAttendanceRecords.map((row) => asString(row.id)),
      );
      assert.deepEqual(
        completionMetadata?.sessionNoteIds,
        completedSessionNotes.map((row) => asString(row.id)),
      );
      assert.equal(completionMetadata?.proofSource, 'attendance-record');
      assert.deepEqual(completionMetadata?.proofSources, ['attendance-record', 'session-note']);

      const progressRes = await app.inject({
        method: 'GET',
        url: `/v1/athletes/${athleteId}/progress`,
        headers,
      });
      assert.equal(progressRes.statusCode, 200);
      const progressPayload = progressRes.json() as {
        sessionNotes: Array<{ bookingId?: string; noteText?: string }>;
      };
      assert.equal(
        progressPayload.sessionNotes.some(
          (row) =>
            row.bookingId === asString(bookingToComplete.id) &&
            row.noteText === 'Delivered and ready for proof follow-up',
        ),
        true,
      );

      const completeReplay = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/complete`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          note: 'Delivered and ready for proof follow-up',
          completedAt,
          expectedVersion: completeExpectedVersion,
          attendance: [
            {
              athleteId,
              status: 'ATTENDED',
              notes: 'Sharp delivery and focus',
              effortRating: 5,
            },
          ],
          idempotencyKey: 'booking-complete-series-test',
        },
      });
      assert.equal(completeReplay.statusCode, 200);
      assert.equal(completeReplay.json().version, completed.version);
      assert.equal(
        asRows(fixtureStore.tables.attendanceRecords).filter(
          (row) => asString(row.bookingId) === asString(bookingToComplete.id),
        ).length,
        1,
      );
      assert.equal(
        asRows(fixtureStore.tables.sessionNotes).filter(
          (row) => asString(row.bookingId) === asString(bookingToComplete.id),
        ).length,
        1,
      );

      const rebookContext = await app.inject({
        method: 'GET',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/rebook-context`,
        headers,
      });
      assert.equal(rebookContext.statusCode, 200);
      const rebookPayload = rebookContext.json() as {
        sourceBookingId: string;
        coachId: string;
        bookedByUserId: string | null;
        serviceType: string | null;
        durationMinutes: number;
        location: string;
        objectives: string[];
        priceMinor: number | null;
        athleteIds: string[];
      };
      assert.equal(rebookPayload.sourceBookingId, asString(bookingToComplete.id));
      assert.equal(rebookPayload.coachId, asString(bookingToComplete.coachUserId));
      assert.equal(rebookPayload.bookedByUserId, asString(bookingToComplete.bookedByUserId));
      assert.equal(rebookPayload.serviceType, asString(bookingToComplete.serviceType));
      assert.equal(rebookPayload.durationMinutes, asNumber(bookingToComplete.durationMinutes));
      assert.equal(rebookPayload.location, asString(bookingToComplete.location));
      assert.deepEqual(rebookPayload.objectives, payload.objectives);
      assert.equal(rebookPayload.priceMinor, asNumber(bookingToComplete.priceMinor));
      assert.deepEqual(rebookPayload.athleteIds, [athleteId]);

      const deniedCoachRebookContext = await app.inject({
        method: 'GET',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/rebook-context`,
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(deniedCoachRebookContext.statusCode, 403);
      const rebookReadEvents = auditEventsFor(fixtureStore.tables, {
        action: 'booking.rebook_context.read',
        resourceId: asString(bookingToComplete.id),
      });
      assert.deepEqual(rebookReadEvents.map((event) => asString(event.result)).sort(), [
        'DENY',
        'SUCCESS',
      ]);
      assert.equal(
        rebookReadEvents.every((event) => event.sensitiveRead === true),
        true,
      );

      const deniedFutureReview = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${asString(futureBooking.id)}/reviews`,
        headers,
        payload: {
          rating: 5,
          comment: 'Trying to review before delivery',
        },
      });
      assert.equal(deniedFutureReview.statusCode, 400);
      assert.match(deniedFutureReview.body, /only completed bookings/i);

      const noShowBookingId = 'bok_no-show-completion-test';
      const noShowScheduledAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const sourceParticipant = asRows(fixtureStore.tables.bookingParticipants).find(
        (row) => asString(row.bookingId) === asString(futureBooking.id),
      );
      assert.ok(sourceParticipant, 'expected source participant for no-show completion fixture');
      ensureRows(fixtureStore.tables, 'bookings').push({
        ...futureBooking,
        id: noShowBookingId,
        recurringSeriesId: null,
        seriesIndex: null,
        status: 'CONFIRMED',
        scheduledAt: noShowScheduledAt,
        updatedAt: noShowScheduledAt,
        version: 1,
      });
      ensureRows(fixtureStore.tables, 'bookingParticipants').push({
        ...sourceParticipant,
        id: 'bpa_no-show-completion-test',
        bookingId: noShowBookingId,
      });

      const noShowCompletion = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${noShowBookingId}/complete`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          note: 'No show follow-up required',
          completedAt,
          expectedVersion: 1,
          attendance: [
            {
              athleteId,
              status: 'NO_SHOW',
              notes: 'Athlete did not arrive',
              effortRating: 1,
            },
          ],
          idempotencyKey: 'booking-complete-no-show-test',
        },
      });
      assert.equal(noShowCompletion.statusCode, 200);
      const noShowAttendanceRecords = asRows(fixtureStore.tables.attendanceRecords).filter(
        (row) => asString(row.bookingId) === noShowBookingId,
      );
      assert.equal(noShowAttendanceRecords.length, 1);
      assert.equal(asString(noShowAttendanceRecords[0]?.status), 'NO_SHOW');
      assert.equal(asString(noShowAttendanceRecords[0]?.notes), 'Athlete did not arrive');
      assert.equal(asNumber(noShowAttendanceRecords[0]?.effortRating), 1);
      assert.equal(
        asRows(fixtureStore.tables.sessionNotes).filter(
          (row) => asString(row.bookingId) === noShowBookingId,
        ).length,
        0,
      );
      const noShowStatusEvent = asRows(fixtureStore.tables.bookingStatusEvents)
        .filter(
          (row) =>
            asString(row.bookingId) === noShowBookingId && asString(row.toStatus) === 'COMPLETED',
        )
        .at(-1);
      const noShowMetadata = noShowStatusEvent?.metadataJson as
        | {
            attendanceSummary?: { attended?: number; noShow?: number };
          }
        | undefined;
      assert.equal(noShowMetadata?.attendanceSummary?.attended, 0);
      assert.equal(noShowMetadata?.attendanceSummary?.noShow, 1);
      const noShowAuditEvent = asRows(fixtureStore.tables.auditEvents)
        .filter(
          (row) =>
            asString(row.action) === 'booking.complete' &&
            asString(row.resourceId) === noShowBookingId &&
            asString(row.result) === 'SUCCESS',
        )
        .at(-1);
      const noShowAuditMetadata = noShowAuditEvent?.metadataJson as
        | {
            attendanceSummary?: { attended?: number | null; noShow?: number | null };
          }
        | undefined;
      assert.equal(noShowAuditMetadata?.attendanceSummary?.attended, 0);
      assert.equal(noShowAuditMetadata?.attendanceSummary?.noShow, 1);

      const deniedCoachReview = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/reviews`,
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          rating: 5,
          comment: 'Coach cannot review their own delivery',
        },
      });
      assert.equal(deniedCoachReview.statusCode, 403);

      const deniedUnrelatedParentReview = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/reviews`,
        headers: authHeaders(tables, unrelatedParentId, 'parent'),
        payload: {
          rating: 5,
          comment: 'Unrelated family cannot review',
        },
      });
      assert.equal(deniedUnrelatedParentReview.statusCode, 403);

      const deniedUnrelatedReviewStatus = await app.inject({
        method: 'GET',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/reviews/me`,
        headers: authHeaders(tables, unrelatedParentId, 'parent'),
      });
      assert.equal(deniedUnrelatedReviewStatus.statusCode, 403);

      const initialReviewStatus = await app.inject({
        method: 'GET',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/reviews/me`,
        headers,
      });
      assert.equal(initialReviewStatus.statusCode, 200);
      assert.equal((initialReviewStatus.json() as { hasReviewed: boolean }).hasReviewed, false);

      const submittedReview = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/reviews`,
        headers,
        payload: {
          rating: 5,
          comment: 'Clear feedback and useful next steps.',
          categories: {
            communication: 5,
            punctuality: 4,
          },
        },
      });
      assert.equal(submittedReview.statusCode, 201);
      const reviewPayload = submittedReview.json() as {
        review: {
          id: string;
          bookingId: string;
          coachUserId: string;
          reviewerUserId: string;
          athleteId: string;
          rating: number;
          comment: string;
          categories: Record<string, number>;
          isVerifiedBooking: boolean;
        };
        reused: boolean;
      };
      assert.equal(reviewPayload.reused, false);
      assert.equal(reviewPayload.review.bookingId, asString(bookingToComplete.id));
      assert.equal(reviewPayload.review.coachUserId, coachUserId);
      assert.equal(reviewPayload.review.reviewerUserId, bookedByUserId);
      assert.equal(reviewPayload.review.athleteId, athleteId);
      assert.equal(reviewPayload.review.rating, 5);
      assert.equal(reviewPayload.review.comment, 'Clear feedback and useful next steps.');
      assert.deepEqual(reviewPayload.review.categories, {
        communication: 5,
        punctuality: 4,
      });
      assert.equal(reviewPayload.review.isVerifiedBooking, true);

      const feedbackRows = asRows(fixtureStore.tables.sessionFeedback).filter(
        (row) => asString(row.bookingId) === asString(bookingToComplete.id),
      );
      assert.equal(feedbackRows.length, 1);
      assert.equal(asString(feedbackRows[0]?.authorUserId), bookedByUserId);
      assert.equal(asNumber(feedbackRows[0]?.rating), 5);
      assert.equal(
        asString(feedbackRows[0]?.publicComment),
        'Clear feedback and useful next steps.',
      );
      const reviewMetadata = asRecord(feedbackRows[0]?.metadataJson);
      assert.equal(asString(reviewMetadata?.source), 'booking-review');
      assert.deepEqual(reviewMetadata?.categories, {
        communication: 5,
        punctuality: 4,
      });

      const submittedReviewStatus = await app.inject({
        method: 'GET',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/reviews/me`,
        headers,
      });
      assert.equal(submittedReviewStatus.statusCode, 200);
      const submittedReviewStatusPayload = submittedReviewStatus.json() as {
        hasReviewed: boolean;
        review: { id: string; bookingId: string; reviewerUserId: string } | null;
      };
      assert.equal(submittedReviewStatusPayload.hasReviewed, true);
      assert.equal(submittedReviewStatusPayload.review?.id, reviewPayload.review.id);
      assert.equal(submittedReviewStatusPayload.review?.bookingId, asString(bookingToComplete.id));
      assert.equal(submittedReviewStatusPayload.review?.reviewerUserId, bookedByUserId);
      const reviewReadEvents = auditEventsFor(fixtureStore.tables, {
        action: 'booking_review.read',
        resourceId: asString(bookingToComplete.id),
      });
      assert.deepEqual(reviewReadEvents.map((event) => asString(event.result)).sort(), [
        'DENY',
        'SUCCESS',
        'SUCCESS',
      ]);
      assert.equal(
        reviewReadEvents.every((event) => event.sensitiveRead === true),
        true,
      );

      const reviewReplay = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${asString(bookingToComplete.id)}/reviews`,
        headers,
        payload: {
          rating: 1,
          comment: 'Different content should not create a second review.',
        },
      });
      assert.equal(reviewReplay.statusCode, 200);
      const reviewReplayPayload = reviewReplay.json() as {
        review: { id: string; rating: number; comment: string };
        reused: boolean;
      };
      assert.equal(reviewReplayPayload.reused, true);
      assert.equal(reviewReplayPayload.review.id, reviewPayload.review.id);
      assert.equal(reviewReplayPayload.review.rating, 5);
      assert.equal(
        asRows(fixtureStore.tables.sessionFeedback).filter(
          (row) => asString(row.bookingId) === asString(bookingToComplete.id),
        ).length,
        1,
      );

      fixtureStore.tables.sessionFeedback = [
        ...(fixtureStore.tables.sessionFeedback ?? []),
        {
          id: 'sfb_coach_authored_profile_leak_probe',
          bookingId: asString(bookingToComplete.id),
          athleteId,
          authorUserId: coachUserId,
          coachUserId,
          rating: 1,
          publicComment: 'Coach-authored feedback must not appear as a public review.',
          privateCommentEncrypted: null,
          visibility: 'public',
          metadataJson: {
            source: 'booking-review',
            coachUserId,
            reviewerUserId: coachUserId,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ];

      const coachReviewList = await app.inject({
        method: 'GET',
        url: `/v1/coaches/${coachUserId}/reviews`,
      });
      assert.equal(coachReviewList.statusCode, 200);
      const coachReviewListPayload = coachReviewList.json() as {
        reviews: Array<{
          id: string;
          bookingId: string;
          coachUserId: string;
          reviewerUserId: string;
          reviewerName: string | null;
          athleteId: string;
          athleteName: string | null;
          rating: number;
          comment: string | null;
          sessionType: string | null;
          categories: Record<string, number>;
          isVerifiedBooking: boolean;
        }>;
      };
      const profileReview = coachReviewListPayload.reviews.find(
        (review) => review.id === reviewPayload.review.id,
      );
      assert.ok(profileReview);
      assert.equal(
        coachReviewListPayload.reviews.some(
          (review) => review.id === 'sfb_coach_authored_profile_leak_probe',
        ),
        false,
      );
      assert.equal(profileReview.bookingId, asString(bookingToComplete.id));
      assert.equal(profileReview.coachUserId, coachUserId);
      assert.equal(profileReview.reviewerUserId, bookedByUserId);
      assert.equal(profileReview.athleteId, athleteId);
      assert.equal(profileReview.rating, 5);
      assert.equal(profileReview.comment, 'Clear feedback and useful next steps.');
      assert.equal(profileReview.isVerifiedBooking, true);
      assert.deepEqual(profileReview.categories, {
        communication: 5,
        punctuality: 4,
      });

      const reviewSuccessAudit = auditEventsFor(fixtureStore.tables, {
        action: 'booking_review.create',
        resourceId: asString(bookingToComplete.id),
        result: 'SUCCESS',
      });
      assert.equal(reviewSuccessAudit.length >= 2, true);
      const reviewDeniedAudits = auditEventsFor(fixtureStore.tables, {
        action: 'booking_review.create',
        resourceId: asString(bookingToComplete.id),
        result: 'DENY',
      });
      assert.equal(reviewDeniedAudits.length >= 2, true);

      const seriesAfterCompletion = await app.inject({
        method: 'GET',
        url: `/v1/booking-series/${created.series.id}`,
        headers,
      });
      assert.equal(seriesAfterCompletion.statusCode, 200);
      assert.equal(seriesAfterCompletion.json().status, 'PARTIAL');

      const secondSeriesBookingId = created.series.bookingIds[1];
      fixtureStore.tables.invoices = [
        ...(fixtureStore.tables.invoices ?? []),
        {
          id: 'invc_booking_series_cancel_void',
          invoiceNumber: 'INV-SERIES-CANCEL-VOID',
          bookingId: secondSeriesBookingId,
          coachUserId,
          payerUserId: bookedByUserId,
          athleteId,
          status: 'SENT',
          sessionDate: payload.occurrences[1].scheduledAt,
          sessionType: payload.serviceType,
          sessionLocation: payload.location,
          sessionDurationMinutes: 60,
          subtotalMinor: 4000,
          taxMinor: 0,
          taxRatePercent: 0,
          totalMinor: 4000,
          currency: 'GBP',
          createdByUserId: coachUserId,
          updatedByUserId: coachUserId,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ];
      fixtureStore.tables.paymentAttempts = [
        ...(fixtureStore.tables.paymentAttempts ?? []),
        {
          id: 'pay_booking_series_cancel_void',
          invoiceId: 'invc_booking_series_cancel_void',
          actorUserId: bookedByUserId,
          provider: 'simulated',
          providerSessionId: 'hosted_cancel_void',
          idempotencyKey: 'booking-series-cancel-void-payment',
          status: 'ACTION_REQUIRED',
          amountMinor: 4000,
          currency: 'GBP',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          confirmedAt: null,
          failureCode: null,
          failureReason: null,
          metadataJson: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const deniedCancel = await app.inject({
        method: 'POST',
        url: `/v1/booking-series/${created.series.id}/cancel`,
        headers: authHeaders(tables, unrelatedParentId, 'parent'),
        payload: {
          reason: 'Should not be allowed',
          expectedVersion: resumed.series.version,
          idempotencyKey: 'booking-series-denied-cancel-test',
        },
      });
      assert.equal(deniedCancel.statusCode, 403);
      assert.equal(
        asString(
          asRows(fixtureStore.tables.invoices).find(
            (row) => asString(row.id) === 'invc_booking_series_cancel_void',
          )?.status,
        ),
        'SENT',
      );

      const cancelledRes = await app.inject({
        method: 'POST',
        url: `/v1/booking-series/${created.series.id}/cancel`,
        headers,
        payload: {
          reason: 'Parent cancelled package',
          expectedVersion: resumed.series.version,
          idempotencyKey: 'booking-series-cancel-test',
        },
      });
      assert.equal(cancelledRes.statusCode, 200);
      const cancelled = cancelledRes.json() as {
        series: { id: string; status: string; version: number };
        bookings: { status: string }[];
      };
      assert.equal(cancelled.series.id, created.series.id);
      assert.equal(cancelled.series.status, 'PARTIAL');
      assert.equal(cancelled.series.version, 5);
      assert.deepEqual(
        cancelled.bookings.map((booking) => booking.status),
        ['COMPLETED', 'CANCELLED'],
      );
      const voidedSeriesInvoice = asRows(fixtureStore.tables.invoices).find(
        (row) => asString(row.id) === 'invc_booking_series_cancel_void',
      );
      assert.equal(asString(voidedSeriesInvoice?.status), 'VOID');
      assert.equal(asString(voidedSeriesInvoice?.voidReason), 'Parent cancelled package');
      assert.equal(asNumber(voidedSeriesInvoice?.version), 2);
      const canceledAttempt = asRows(fixtureStore.tables.paymentAttempts).find(
        (row) => asString(row.id) === 'pay_booking_series_cancel_void',
      );
      assert.equal(asString(canceledAttempt?.status), 'CANCELED');
      assert.equal(
        asString(canceledAttempt?.failureReason),
        'Booking was cancelled before payment completion.',
      );
      assert.equal(
        asRows(fixtureStore.tables.invoiceEvents).some((row) => {
          const metadata = row.metadataJson as { source?: string; bookingId?: string } | undefined;
          return (
            asString(row.invoiceId) === 'invc_booking_series_cancel_void' &&
            asString(row.eventType) === 'VOIDED' &&
            metadata?.source === 'booking-cancellation' &&
            metadata.bookingId === secondSeriesBookingId
          );
        }),
        true,
      );

      const staleCancel = await app.inject({
        method: 'POST',
        url: `/v1/booking-series/${created.series.id}/cancel`,
        headers,
        payload: {
          reason: 'Stale update',
          expectedVersion: resumed.series.version,
          idempotencyKey: 'booking-series-stale-cancel-test',
        },
      });
      assert.equal(staleCancel.statusCode, 409);

      const cancelReplay = await app.inject({
        method: 'POST',
        url: `/v1/booking-series/${created.series.id}/cancel`,
        headers,
        payload: {
          reason: 'Parent cancelled package',
          expectedVersion: resumed.series.version,
          idempotencyKey: 'booking-series-cancel-test',
        },
      });
      assert.equal(cancelReplay.statusCode, 200);
      assert.equal(cancelReplay.json().series.id, created.series.id);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
    }
  });

  it('allows a guardian to create a booking for a linked athlete when bookedByUserId differs from the authenticated parent', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks)[0];
    assert.ok(guardianLink, 'expected seeded guardian-child link');
    const parentUserId = asString(guardianLink.guardianUserId) as string;
    const athleteId = asString(guardianLink.athleteId) as string;
    const athlete = asRows(tables.athletes).find((row) => asString(row.id) === athleteId);
    assert.ok(athlete, 'expected seeded athlete for guardian-child link');
    const athleteUserId = asString(athlete?.userId) as string;
    const coachOffering = asRows(tables.coachingOfferings)[0];
    assert.ok(coachOffering, 'expected seeded coaching offering');
    const coachUserId = asString(coachOffering.coachUserId) as string;
    const availableSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: parentUserId,
      coachUserId,
    });

    const create = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
      payload: {
        coachUserId,
        athleteIds: [athleteId],
        bookedByUserId: athleteUserId,
        scheduledAt: `${availableSlot.date}T${availableSlot.startTime}:00.000Z`,
        durationMinutes: 60,
        location: availableSlot.location ?? 'Delegated Booking Test Pitch',
        serviceType: 'one_to_one',
        objectives: ['Decision making'],
        priceMinor: 3800,
        currency: 'GBP',
      },
    });

    assert.equal(create.statusCode, 201);
    const created = create.json() as { id: string; bookedByUserId?: string };
    assert.match(created.id, /^bok_/);
    assert.equal(created.bookedByUserId, athleteUserId);
  });

  it('rejects a direct booking when the selected slot has already been taken', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks)[0];
    assert.ok(guardianLink, 'expected seeded guardian-child link');
    const bookedByUserId = asString(guardianLink.guardianUserId) as string;
    const athleteId = asString(guardianLink.athleteId) as string;
    const coachOffering = asRows(tables.coachingOfferings)[0];
    assert.ok(coachOffering, 'expected seeded coaching offering');
    const coachUserId = asString(coachOffering.coachUserId) as string;
    const store = getMarketplaceSeedStore();
    const date = addDaysIso(9);
    const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    if (!Array.isArray(store.tables.availabilityTemplates)) {
      store.tables.availabilityTemplates = [];
    }
    store.tables.availabilityTemplates.push({
      id: 'avt_booking_conflict_test',
      coachUserId,
      dayOfWeek,
      startTimeLocal: '05:00',
      endTimeLocal: '06:15',
      maxConcurrent: 1,
      bufferMinutes: 15,
      active: true,
      location: 'Conflict Test Pitch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });
    const bookingPayload = {
      coachUserId,
      athleteIds: [athleteId],
      bookedByUserId,
      scheduledAt: `${date}T05:00:00.000Z`,
      durationMinutes: 60,
      location: 'Conflict Test Pitch',
      serviceType: 'one_to_one',
      objectives: ['First touch'],
      priceMinor: 4200,
      currency: 'GBP',
    };

    const first = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: bookingPayload,
    });
    assert.equal(first.statusCode, 201);

    const second = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: bookingPayload,
    });
    assert.equal(second.statusCode, 400);
  });

  it('denies booking cancellation for an unrelated actor', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks)[0];
    assert.ok(guardianLink, 'expected seeded guardian-child link');
    const bookedByUserId = asString(guardianLink.guardianUserId) as string;
    const athleteId = asString(guardianLink.athleteId) as string;
    const coachOffering = asRows(tables.coachingOfferings)[0];
    assert.ok(coachOffering, 'expected seeded coaching offering');
    const coachUserId = asString(coachOffering.coachUserId) as string;
    const outsiderCoach = asRows(tables.coachProfiles).find(
      (row) => asString(row.userId) !== coachUserId,
    );
    assert.ok(outsiderCoach, 'expected a different seeded coach');
    const outsiderUserId = asString(outsiderCoach.userId) as string;
    const availableSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: bookedByUserId,
      coachUserId,
    });

    const create = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {
        coachUserId,
        athleteIds: [athleteId],
        bookedByUserId,
        scheduledAt: `${availableSlot.date}T${availableSlot.startTime}:00.000Z`,
        durationMinutes: 60,
        location: availableSlot.location ?? 'Cancellation Authz Test Pitch',
        serviceType: 'one_to_one',
        objectives: ['First touch'],
      },
    });
    assert.equal(create.statusCode, 201);
    const created = create.json() as { id: string };

    const denied = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${created.id}/cancel`,
      headers: {
        'x-auth-user-id': outsiderUserId,
        'x-auth-roles': rolesForUser(tables, outsiderUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, outsiderUserId)[0] ?? 'coach',
      },
      payload: {
        reason: 'Not my booking',
      },
    });
    assert.equal(denied.statusCode, 403);

    const deniedDetail = await app.inject({
      method: 'GET',
      url: `/v1/bookings/${created.id}`,
      headers: {
        'x-auth-user-id': outsiderUserId,
        'x-auth-roles': rolesForUser(tables, outsiderUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, outsiderUserId)[0] ?? 'coach',
      },
    });
    assert.equal(deniedDetail.statusCode, 403);
  });

  it('denies booking creation for an athlete not linked to the authenticated parent', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks)[0];
    assert.ok(guardianLink, 'expected seeded guardian-child link');
    const bookedByUserId = asString(guardianLink.guardianUserId) as string;
    const linkedAthleteIds = new Set(
      asRows(tables.guardianChildLinks)
        .filter((row) => asString(row.guardianUserId) === bookedByUserId)
        .map((row) => asString(row.athleteId))
        .filter((athleteId): athleteId is string => Boolean(athleteId)),
    );
    const unrelatedAthlete = asRows(tables.athletes).find((row) => {
      const athleteId = asString(row.id);
      return Boolean(athleteId && !linkedAthleteIds.has(athleteId));
    });
    assert.ok(unrelatedAthlete, 'expected an athlete outside the parent scope');
    const unrelatedAthleteId = asString(unrelatedAthlete?.id) as string;
    const coachOffering = asRows(tables.coachingOfferings)[0];
    assert.ok(coachOffering, 'expected seeded coaching offering');
    const coachUserId = asString(coachOffering.coachUserId) as string;
    const availableSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: bookedByUserId,
      coachUserId,
    });

    const create = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: {
        'x-auth-user-id': bookedByUserId,
        'x-auth-roles': rolesForUser(tables, bookedByUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, bookedByUserId)[0] ?? 'parent',
      },
      payload: {
        coachUserId,
        athleteIds: [unrelatedAthleteId],
        bookedByUserId,
        scheduledAt: `${availableSlot.date}T${availableSlot.startTime}:00.000Z`,
        durationMinutes: 60,
        location: availableSlot.location ?? 'Authz Test Pitch',
        serviceType: 'one_to_one',
        objectives: ['Decision making'],
        currency: 'GBP',
      },
    });

    assert.equal(create.statusCode, 403);
  });

  it('manages coach observations only for assigned coaches', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    let selection:
      | {
          coachUserId: string;
          athleteId: string;
        }
      | undefined;

    for (const profile of asRows(tables.coachProfiles)) {
      const coachUserId = asString(profile.userId);
      if (!coachUserId || !rolesForUser(tables, coachUserId).includes('coach')) {
        continue;
      }
      if (!isVerifiedCoachInTables(tables, coachUserId)) {
        continue;
      }
      const athleteId = [...coachAthleteIdsFromTables(tables, coachUserId)][0];
      if (athleteId) {
        selection = { coachUserId, athleteId };
        break;
      }
    }

    assert.ok(selection, 'expected assigned verified coach and athlete pair');
    const outsiderCoachUserId = asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId && userId !== selection?.coachUserId))
      .find((userId) => !coachAthleteIdsFromTables(tables, userId).has(selection?.athleteId ?? ''));
    assert.ok(outsiderCoachUserId, 'expected coach outside athlete scope');

    const initialList = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${selection?.athleteId}/coach-observations`,
      headers: authHeaders(tables, selection?.coachUserId ?? '', 'coach'),
    });
    assert.equal(initialList.statusCode, 200);

    const create = await app.inject({
      method: 'POST',
      url: `/v1/athletes/${selection?.athleteId}/coach-observations`,
      headers: authHeaders(tables, selection?.coachUserId ?? '', 'coach'),
      payload: {
        text: 'Needs a shorter instruction before the first drill.',
        category: 'COMMUNICATION',
        isPrivate: true,
      },
    });
    assert.equal(create.statusCode, 201);
    const createPayload = create.json() as {
      observation: {
        id: string;
        athleteId: string;
        coachId: string;
        category: string;
        text: string;
        isPrivate: boolean;
      };
    };
    const observationId = createPayload.observation.id;
    assert.match(observationId, /^snt_/);
    assert.equal(createPayload.observation.athleteId, selection?.athleteId);
    assert.equal(createPayload.observation.coachId, selection?.coachUserId);
    assert.equal(createPayload.observation.category, 'COMMUNICATION');
    assert.equal(createPayload.observation.isPrivate, true);

    const storedObservation = asRows(tables.sessionNotes).find(
      (row) => asString(row.id) === observationId,
    );
    assert.equal(asString(storedObservation?.visibility), 'PRIVATE');

    const listAfterCreate = await app.inject({
      method: 'GET',
      url: `/v1/athletes/${selection?.athleteId}/coach-observations`,
      headers: authHeaders(tables, selection?.coachUserId ?? '', 'coach'),
    });
    assert.equal(listAfterCreate.statusCode, 200);
    const listPayload = listAfterCreate.json() as {
      observations: Array<{ id: string; text: string }>;
    };
    assert.equal(
      listPayload.observations.some((observation) => observation.id === observationId),
      true,
    );

    const deniedUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/coach-observations/${observationId}`,
      headers: authHeaders(tables, outsiderCoachUserId, 'coach'),
      payload: {
        text: 'Should not be allowed',
      },
    });
    assert.equal(deniedUpdate.statusCode, 403);

    const update = await app.inject({
      method: 'PATCH',
      url: `/v1/coach-observations/${observationId}`,
      headers: authHeaders(tables, selection?.coachUserId ?? '', 'coach'),
      payload: {
        text: 'Use one cue, then ask the athlete to repeat it back.',
        category: 'PROGRESS',
        isPrivate: false,
      },
    });
    assert.equal(update.statusCode, 200);
    const updatePayload = update.json() as {
      observation: { text: string; category: string; isPrivate: boolean };
    };
    assert.equal(
      updatePayload.observation.text,
      'Use one cue, then ask the athlete to repeat it back.',
    );
    assert.equal(updatePayload.observation.category, 'PROGRESS');
    assert.equal(updatePayload.observation.isPrivate, false);
    assert.equal(asString(storedObservation?.visibility), 'PUBLIC');

    const remove = await app.inject({
      method: 'DELETE',
      url: `/v1/coach-observations/${observationId}`,
      headers: authHeaders(tables, selection?.coachUserId ?? '', 'coach'),
    });
    assert.equal(remove.statusCode, 200);
    assert.equal((remove.json() as { removed?: boolean }).removed, true);
    assert.equal(Boolean(asString(storedObservation?.deletedAt)), true);

    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_observation.create',
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_observation.update',
        resourceId: observationId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_observation.remove',
        resourceId: observationId,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('lists and reads visible session invites for coach and parent users', async () => {
    const tables = loadTables();
    const pendingTarget =
      asRows(tables.inviteTargets).find((row) => asString(row.status) === 'PENDING') ??
      asRows(tables.inviteTargets)[0];
    assert.ok(pendingTarget, 'expected seeded invite target');
    const inviteId = asString(pendingTarget.inviteId) as string;
    const parentUserId = asString(pendingTarget.targetUserId) as string;
    const invite = asRows(tables.invites).find((row) => asString(row.id) === inviteId);
    assert.ok(invite, 'expected seeded invite row');
    const coachUserId = asString(invite?.senderUserId) as string;

    const parentList = await app.inject({
      method: 'GET',
      url: `/v1/invites?parentUserId=${encodeURIComponent(parentUserId)}`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
    });
    assert.equal(parentList.statusCode, 200);
    const parentListPayload = parentList.json() as {
      invites: { id: string; parentId: string; athleteIds: string[] }[];
    };
    const parentInvite = parentListPayload.invites.find((row) => row.id === inviteId);
    assert.ok(parentInvite, 'expected invite in parent list');
    assert.equal(parentInvite?.parentId, parentUserId);
    assert.equal((parentInvite?.athleteIds.length ?? 0) >= 1, true);

    const coachList = await app.inject({
      method: 'GET',
      url: `/v1/invites?coachUserId=${encodeURIComponent(coachUserId)}`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
    });
    assert.equal(coachList.statusCode, 200);
    const coachListPayload = coachList.json() as {
      invites: { id: string; coachId: string; proposedSlots: { date: string }[] }[];
    };
    const coachInvite = coachListPayload.invites.find((row) => row.id === inviteId);
    assert.ok(coachInvite, 'expected invite in coach list');
    assert.equal(coachInvite?.coachId, coachUserId);
    assert.equal((coachInvite?.proposedSlots.length ?? 0) >= 1, true);

    const parentDetail = await app.inject({
      method: 'GET',
      url: `/v1/invites/${inviteId}`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
    });
    assert.equal(parentDetail.statusCode, 200);
    const parentDetailPayload = parentDetail.json() as {
      invite: { id: string; parentId: string; coachId: string };
    };
    assert.equal(parentDetailPayload.invite.id, inviteId);
    assert.equal(parentDetailPayload.invite.parentId, parentUserId);
    assert.equal(parentDetailPayload.invite.coachId, coachUserId);

    const outsiderUserId = asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId))
      .find((userId) => userId !== coachUserId && userId !== parentUserId);
    assert.ok(outsiderUserId, 'expected unrelated coach');

    const forbiddenDetail = await app.inject({
      method: 'GET',
      url: `/v1/invites/${inviteId}`,
      headers: {
        'x-auth-user-id': outsiderUserId,
        'x-auth-roles': rolesForUser(tables, outsiderUserId as string).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, outsiderUserId as string)[0] ?? 'coach',
      },
    });
    assert.equal(forbiddenDetail.statusCode, 403);
  });

  it('persists invite RSVP state through /v1 invite authority', async () => {
    const tables = loadTables();
    const store = getMarketplaceSeedStore();
    const pendingTarget =
      asRows(store.tables.inviteTargets).find((row) => asString(row.status) === 'PENDING') ??
      asRows(store.tables.inviteTargets)[0];
    assert.ok(pendingTarget, 'expected seeded invite target');
    const inviteId = asString(pendingTarget.inviteId) as string;
    const parentUserId = asString(pendingTarget.targetUserId) as string;
    const athleteId = asString(pendingTarget.targetAthleteId) as string;
    const invite = asRows(store.tables.invites).find((row) => asString(row.id) === inviteId);
    assert.ok(invite, 'expected seeded invite');
    const coachUserId = asString(invite.senderUserId) as string;

    const createRsvp = await app.inject({
      method: 'POST',
      url: `/v1/invites/${inviteId}/rsvps`,
      headers: authHeaders(tables, parentUserId, 'parent'),
      payload: {
        status: 'going',
        childId: athleteId,
        childName: 'API Test Athlete',
      },
    });
    assert.equal(createRsvp.statusCode, 200);
    const createPayload = createRsvp.json() as {
      response: {
        id: string;
        inviteId: string;
        userId: string;
        childId?: string;
        status: string;
      };
      counts: { going: number; maybe: number; cantGo: number };
    };
    assert.match(createPayload.response.id, /^irsvp:/);
    assert.equal(createPayload.response.inviteId, inviteId);
    assert.equal(createPayload.response.userId, parentUserId);
    assert.equal(createPayload.response.childId, athleteId);
    assert.equal(createPayload.response.status, 'going');
    assert.equal(createPayload.counts.going, 1);
    assert.equal(createPayload.counts.maybe, 0);

    const ownerRead = await app.inject({
      method: 'GET',
      url: `/v1/invites/${inviteId}/rsvps`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(ownerRead.statusCode, 200);
    const ownerReadPayload = ownerRead.json() as {
      responses: Array<{ id: string; status: string }>;
      counts: { going: number; maybe: number; cantGo: number };
    };
    assert.equal(ownerReadPayload.responses.length, 1);
    assert.equal(ownerReadPayload.counts.going, 1);

    const ownerDetail = await app.inject({
      method: 'GET',
      url: `/v1/invites/${inviteId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(ownerDetail.statusCode, 200);
    const ownerDetailPayload = ownerDetail.json() as {
      invite: {
        rsvpResponses: Array<{ id: string; status: string }>;
        rsvpCounts: { going: number; maybe: number; cantGo: number };
      };
    };
    assert.equal(ownerDetailPayload.invite.rsvpResponses.length, 1);
    assert.equal(ownerDetailPayload.invite.rsvpCounts.going, 1);

    const deniedOwnerRsvp = await app.inject({
      method: 'POST',
      url: `/v1/invites/${inviteId}/rsvps`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        status: 'maybe',
      },
    });
    assert.equal(deniedOwnerRsvp.statusCode, 403);

    const updateRsvp = await app.inject({
      method: 'PATCH',
      url: `/v1/invite-rsvps/${encodeURIComponent(createPayload.response.id)}`,
      headers: authHeaders(tables, parentUserId, 'parent'),
      payload: {
        status: 'maybe',
      },
    });
    assert.equal(updateRsvp.statusCode, 200);
    const updatePayload = updateRsvp.json() as {
      response: { id: string; status: string };
      counts: { going: number; maybe: number; cantGo: number };
    };
    assert.equal(updatePayload.response.id, createPayload.response.id);
    assert.equal(updatePayload.response.status, 'maybe');
    assert.equal(updatePayload.counts.going, 0);
    assert.equal(updatePayload.counts.maybe, 1);

    const maybeResponses = await app.inject({
      method: 'GET',
      url: `/v1/invites/${inviteId}/rsvps?status=maybe`,
      headers: authHeaders(tables, parentUserId, 'parent'),
    });
    assert.equal(maybeResponses.statusCode, 200);
    const maybePayload = maybeResponses.json() as {
      responses: Array<{ id: string; status: string }>;
      counts: { going: number; maybe: number; cantGo: number };
    };
    assert.equal(maybePayload.responses.length, 1);
    assert.equal(maybePayload.responses[0].id, createPayload.response.id);
    assert.equal(maybePayload.counts.maybe, 1);
    assert.equal(
      auditEventsFor(store.tables, {
        action: 'invite.rsvp.respond',
        resourceId: inviteId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(store.tables, {
        action: 'invite.rsvp.respond',
        resourceId: inviteId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(store.tables, {
        action: 'invite.rsvp.update',
        resourceId: inviteId,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('fails closed for session invite lists in db mode before fixture invite exposure', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    const previousDatabaseUrl = env.DATABASE_URL;

    try {
      env.API_DATA_BACKEND = 'db';
      env.DATABASE_URL = undefined;

      const tables = getDbFixtureStore().tables;
      const pendingTarget = asRows(tables.inviteTargets).find(
        (row) => asString(row.status) === 'PENDING',
      );
      assert.ok(pendingTarget, 'expected seeded invite target');
      const inviteId = asString(pendingTarget.inviteId) as string;
      const parentUserId = asString(pendingTarget.targetUserId) as string;

      const res = await app.inject({
        method: 'GET',
        url: `/v1/invites?parentUserId=${encodeURIComponent(parentUserId)}`,
        headers: authHeaders(tables, parentUserId, 'parent'),
      });

      assert.equal(res.statusCode, 503);
      assert.match(res.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(res.body.includes(inviteId), false);
      assert.equal(res.body.includes(parentUserId), false);
      const readAudit = auditEventsFor(tables, {
        action: 'invite.read',
        result: 'ERROR',
      }).at(-1);
      assert.equal(asString(readAudit?.actorUserId), parentUserId);
      assert.equal(asString(asRecord(readAudit?.metadataJson)?.reason), 'prisma_unavailable');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it('creates and manages direct session invites through /v1/invites writes', async () => {
    const tables = loadTables();
    const coachProfile = asRows(tables.coachProfiles)[0];
    assert.ok(coachProfile, 'expected seeded coach profile');
    const coachUserId = asString(coachProfile.userId) as string;

    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.guardianUserId) && asString(row.guardianUserId) !== coachUserId,
    );
    assert.ok(guardianLink, 'expected guardian-child link');
    const parentUserId = asString(guardianLink?.guardianUserId) as string;
    const athleteId = asString(guardianLink?.athleteId) as string;
    const store = getMarketplaceSeedStore();

    const createInvite = async (
      focus: string,
      proposedSlot: { date: string; startTime: string; endTime: string; location?: string },
      groupId?: string,
      idempotencyKey?: string,
    ) =>
      app.inject({
        method: 'POST',
        url: '/v1/invites',
        headers: {
          'x-auth-user-id': coachUserId,
          'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
          'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
        },
        payload: {
          coachUserId,
          athleteIds: [athleteId],
          parentUserId,
          proposedSlots: [proposedSlot],
          sessionType: '1:1 Coaching',
          focus,
          notes: `${focus} session`,
          inviteType: 'CLOSED',
          priceMinor: 3500,
          durationMinutes: 60,
          ...(groupId ? { groupId } : {}),
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
      });

    const firstSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: coachUserId,
      coachUserId,
      excludePendingInvites: true,
    });

    const deniedCreate = await app.inject({
      method: 'POST',
      url: '/v1/invites',
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
      payload: {
        coachUserId,
        athleteIds: [athleteId],
        parentUserId,
        proposedSlots: [firstSlot],
        sessionType: '1:1 Coaching',
        focus: 'Denied create',
        inviteType: 'CLOSED',
        priceMinor: 3500,
        durationMinutes: 60,
      },
    });
    assert.equal(deniedCreate.statusCode, 403);
    assert.equal(
      auditEventsFor(store.tables, { action: 'invite.create', result: 'DENY' }).some(
        (event) => asString(asRecord(event.metadataJson)?.reason) === 'coachUserId_mismatch',
      ),
      true,
    );

    const pendingCreate = await createInvite('First Touch', firstSlot, 'grp_direct_test');
    assert.equal(pendingCreate.statusCode, 201);
    const pendingPayload = pendingCreate.json() as {
      invite: {
        id: string;
        sessionType: string;
        focus: string;
        groupId?: string;
        parentId: string;
      };
    };
    assert.equal(pendingPayload.invite.sessionType, '1:1 Coaching');
    assert.equal(pendingPayload.invite.focus, 'First Touch');
    assert.equal(pendingPayload.invite.groupId, 'grp_direct_test');
    assert.equal(pendingPayload.invite.parentId, parentUserId);
    assert.equal(
      auditEventsFor(store.tables, {
        action: 'invite.create',
        resourceId: pendingPayload.invite.id,
        result: 'SUCCESS',
      }).length,
      1,
    );

    const idempotentSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: coachUserId,
      coachUserId,
      excludePendingInvites: true,
    });
    const inviteCountBeforeIdempotentCreate = asRows(store.tables.invites).length;
    const idempotentKey = 'session-invite-create-idempotency-test';
    const idempotentCreate = await createInvite(
      'Idempotent Create',
      idempotentSlot,
      undefined,
      idempotentKey,
    );
    assert.equal(idempotentCreate.statusCode, 201);
    const idempotentPayload = idempotentCreate.json() as { invite: { id: string } };
    assert.equal(asRows(store.tables.invites).length, inviteCountBeforeIdempotentCreate + 1);

    const idempotentReplay = await createInvite(
      'Idempotent Create',
      idempotentSlot,
      undefined,
      idempotentKey,
    );
    assert.equal(idempotentReplay.statusCode, 201);
    assert.equal(
      (idempotentReplay.json() as { invite: { id: string } }).invite.id,
      idempotentPayload.invite.id,
    );
    assert.equal(asRows(store.tables.invites).length, inviteCountBeforeIdempotentCreate + 1);

    const idempotentConflict = await createInvite(
      'Changed Idempotent Create',
      idempotentSlot,
      undefined,
      idempotentKey,
    );
    assert.equal(idempotentConflict.statusCode, 409);

    const groupList = await app.inject({
      method: 'GET',
      url: '/v1/invites?groupId=grp_direct_test',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
    });
    assert.equal(groupList.statusCode, 200);
    const groupListPayload = groupList.json() as {
      invites: { id: string; groupId?: string }[];
    };
    assert.equal(
      groupListPayload.invites.some((invite) => invite.id === pendingPayload.invite.id),
      true,
    );

    const squadMembership = asRows(tables.squadMemberships).find((row) => {
      const squad = asRows(tables.squads).find(
        (candidate) =>
          asString(candidate.id) === asString(row.squadId) &&
          asString(candidate.ownerCoachUserId) &&
          !asString(candidate.deletedAt),
      );
      const guardian = asRows(tables.guardianChildLinks).find(
        (link) =>
          asString(link.athleteId) === asString(row.athleteId) &&
          asString(link.guardianUserId) &&
          !asString(link.deletedAt),
      );
      return Boolean(squad && guardian && !asString(row.deletedAt));
    });
    assert.ok(squadMembership, 'expected a squad membership with guardian linkage');
    const squadId = asString(squadMembership?.squadId) as string;
    const squadAthleteId = asString(squadMembership?.athleteId) as string;
    const squad = asRows(tables.squads).find((row) => asString(row.id) === squadId);
    const squadCoachUserId = asString(squad?.ownerCoachUserId) as string;
    const squadGuardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.athleteId) === squadAthleteId && asString(row.guardianUserId),
    );
    const squadParentUserId = asString(squadGuardianLink?.guardianUserId) as string;
    const outsiderGuardianLink = asRows(tables.guardianChildLinks).find(
      (row) =>
        asString(row.guardianUserId) &&
        asString(row.guardianUserId) !== squadParentUserId &&
        !asRows(tables.squadMemberships).some(
          (membership) =>
            asString(membership.squadId) === squadId &&
            asString(membership.athleteId) === asString(row.athleteId) &&
            !asString(membership.deletedAt),
        ),
    );
    assert.ok(outsiderGuardianLink, 'expected unrelated guardian for squad visibility denial');
    const outsiderParentUserId = asString(outsiderGuardianLink?.guardianUserId) as string;
    const squadSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: squadCoachUserId,
      coachUserId: squadCoachUserId,
      excludePendingInvites: true,
    });

    const invalidSquadMetadataCreate = await app.inject({
      method: 'POST',
      url: '/v1/invites',
      headers: authHeaders(tables, squadCoachUserId, 'coach'),
      payload: {
        coachUserId: squadCoachUserId,
        athleteIds: [squadAthleteId],
        parentUserId: squadParentUserId,
        proposedSlots: [squadSlot],
        sessionType: 'Squad Training',
        focus: 'Squad metadata invalid',
        inviteType: 'CLOSED',
        squadIds: [squadId],
        priceMinor: 3500,
        durationMinutes: 60,
      },
    });
    assert.equal(invalidSquadMetadataCreate.statusCode, 400);

    const squadCreate = await app.inject({
      method: 'POST',
      url: '/v1/invites',
      headers: authHeaders(tables, squadCoachUserId, 'coach'),
      payload: {
        coachUserId: squadCoachUserId,
        athleteIds: [squadAthleteId],
        parentUserId: squadParentUserId,
        proposedSlots: [squadSlot],
        sessionType: 'Squad Training',
        focus: 'Squad metadata projection',
        inviteType: 'SQUAD_ONLY',
        squadIds: [squadId],
        groupId: 'grp_squad_metadata_test',
        priceMinor: 3500,
        durationMinutes: 60,
      },
    });
    assert.equal(squadCreate.statusCode, 201);
    const squadCreatePayload = squadCreate.json() as {
      invite: { id: string; inviteType?: string; squadIds?: string[]; groupId?: string };
    };
    assert.equal(squadCreatePayload.invite.inviteType, 'SQUAD_ONLY');
    assert.deepEqual(squadCreatePayload.invite.squadIds, [squadId]);
    assert.equal(squadCreatePayload.invite.groupId, 'grp_squad_metadata_test');

    const squadCoachList = await app.inject({
      method: 'GET',
      url: `/v1/invites?coachUserId=${encodeURIComponent(
        squadCoachUserId,
      )}&inviteType=SQUAD_ONLY&squadIds=${encodeURIComponent(squadId)}`,
      headers: authHeaders(tables, squadCoachUserId, 'coach'),
    });
    assert.equal(squadCoachList.statusCode, 200);
    const squadCoachListPayload = squadCoachList.json() as {
      invites: Array<{ id: string; squadIds?: string[] }>;
    };
    assert.equal(
      squadCoachListPayload.invites.some(
        (invite) =>
          invite.id === squadCreatePayload.invite.id && invite.squadIds?.includes(squadId),
      ),
      true,
    );

    const outsiderSquadList = await app.inject({
      method: 'GET',
      url: `/v1/invites?parentUserId=${encodeURIComponent(
        outsiderParentUserId,
      )}&inviteType=SQUAD_ONLY&squadIds=${encodeURIComponent(squadId)}`,
      headers: authHeaders(tables, outsiderParentUserId, 'parent'),
    });
    assert.equal(outsiderSquadList.statusCode, 200);
    assert.equal(
      (outsiderSquadList.json() as { invites: Array<{ id: string }> }).invites.some(
        (invite) => invite.id === squadCreatePayload.invite.id,
      ),
      false,
    );

    const deniedRemind = await app.inject({
      method: 'POST',
      url: `/v1/invites/${pendingPayload.invite.id}/remind`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
    });
    assert.equal(deniedRemind.statusCode, 403);
    assert.equal(
      auditEventsFor(store.tables, {
        action: 'invite.remind',
        resourceId: pendingPayload.invite.id,
        result: 'DENY',
      }).length,
      1,
    );

    const remind = await app.inject({
      method: 'POST',
      url: `/v1/invites/${pendingPayload.invite.id}/remind`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
    });
    assert.equal(remind.statusCode, 204);
    const remindAudit = auditEventsFor(store.tables, {
      action: 'invite.remind',
      resourceId: pendingPayload.invite.id,
      result: 'SUCCESS',
    }).at(-1);
    assert.equal(asNumber(asRecord(remindAudit?.metadataJson)?.reminderCount), 1);

    const deniedDismiss = await app.inject({
      method: 'POST',
      url: `/v1/invites/${pendingPayload.invite.id}/dismiss`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
    });
    assert.equal(deniedDismiss.statusCode, 403);
    assert.equal(
      auditEventsFor(store.tables, {
        action: 'invite.dismiss',
        resourceId: pendingPayload.invite.id,
        result: 'DENY',
      }).length,
      1,
    );

    const dismiss = await app.inject({
      method: 'POST',
      url: `/v1/invites/${pendingPayload.invite.id}/dismiss`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
    });
    assert.equal(dismiss.statusCode, 204);
    assert.equal(
      auditEventsFor(store.tables, {
        action: 'invite.dismiss',
        resourceId: pendingPayload.invite.id,
        result: 'SUCCESS',
      }).length,
      1,
    );

    const parentListAfterDismiss = await app.inject({
      method: 'GET',
      url: `/v1/invites?parentUserId=${encodeURIComponent(parentUserId)}`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
    });
    assert.equal(parentListAfterDismiss.statusCode, 200);
    const parentListPayload = parentListAfterDismiss.json() as {
      invites: { id: string }[];
    };
    assert.equal(
      parentListPayload.invites.some((invite) => invite.id === pendingPayload.invite.id),
      false,
    );

    const acceptedSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: coachUserId,
      coachUserId,
      excludePendingInvites: true,
    });

    const acceptedCreate = await createInvite('Finishing', acceptedSlot);
    assert.equal(acceptedCreate.statusCode, 201);
    const acceptedPayload = acceptedCreate.json() as {
      invite: { id: string };
    };

    const deniedRespond = await app.inject({
      method: 'POST',
      url: `/v1/invites/${acceptedPayload.invite.id}/respond`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
      payload: {
        response: 'ACCEPTED',
        selectedSlot: acceptedSlot,
      },
    });
    assert.equal(deniedRespond.statusCode, 403);
    assert.equal(
      auditEventsFor(store.tables, {
        action: 'invite.respond',
        resourceId: acceptedPayload.invite.id,
        result: 'DENY',
      }).length,
      1,
    );

    const acceptInvite = await app.inject({
      method: 'POST',
      url: `/v1/invites/${acceptedPayload.invite.id}/respond`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
      payload: {
        response: 'ACCEPTED',
        selectedSlot: acceptedSlot,
      },
    });
    assert.equal(acceptInvite.statusCode, 200);
    const acceptPayload = acceptInvite.json() as {
      invite: { id: string; status: string; bookingId?: string | null };
      bookingId?: string | null;
      booking?: { id: string } | null;
    };
    assert.equal(acceptPayload.invite.id, acceptedPayload.invite.id);
    assert.equal(acceptPayload.invite.status, 'ACCEPTED');
    assert.match(acceptPayload.bookingId ?? '', /^bok_/);
    assert.equal(acceptPayload.bookingId, acceptPayload.booking?.id ?? acceptPayload.bookingId);
    const acceptAudit = auditEventsFor(store.tables, {
      action: 'invite.respond',
      resourceId: acceptedPayload.invite.id,
      result: 'SUCCESS',
    }).at(-1);
    assert.equal(asString(asRecord(acceptAudit?.metadataJson)?.response), 'ACCEPTED');
    assert.equal(asString(asRecord(acceptAudit?.metadataJson)?.bookingId), acceptPayload.bookingId);

    const createdBooking = await app.inject({
      method: 'GET',
      url: `/v1/bookings/${acceptPayload.bookingId}`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
    });
    assert.equal(createdBooking.statusCode, 200);

    const declineAcceptedInvite = await app.inject({
      method: 'POST',
      url: `/v1/invites/${acceptedPayload.invite.id}/respond`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
      payload: {
        response: 'DECLINED',
      },
    });
    assert.equal(declineAcceptedInvite.statusCode, 409);
    assert.equal(
      auditEventsFor(store.tables, {
        action: 'invite.respond',
        resourceId: acceptedPayload.invite.id,
        result: 'DENY',
      }).some(
        (event) => asString(asRecord(event.metadataJson)?.reason) === 'response_already_recorded',
      ),
      true,
    );

    const declinedSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: coachUserId,
      coachUserId,
      excludePendingInvites: true,
    });
    const declinedCreate = await createInvite('Decision Making', declinedSlot);
    assert.equal(declinedCreate.statusCode, 201);
    const declinedPayload = declinedCreate.json() as {
      invite: { id: string };
    };
    const declineInvite = await app.inject({
      method: 'POST',
      url: `/v1/invites/${declinedPayload.invite.id}/respond`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
      payload: {
        response: 'DECLINED',
      },
    });
    assert.equal(declineInvite.statusCode, 200);
    assert.equal(
      (declineInvite.json() as { invite: { status: string } }).invite.status,
      'DECLINED',
    );

    const declineReplay = await app.inject({
      method: 'POST',
      url: `/v1/invites/${declinedPayload.invite.id}/respond`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
      payload: {
        response: 'DECLINED',
      },
    });
    assert.equal(declineReplay.statusCode, 200);
    const declineReplayAudit = auditEventsFor(store.tables, {
      action: 'invite.respond',
      resourceId: declinedPayload.invite.id,
      result: 'SUCCESS',
    }).at(-1);
    assert.equal(asRecord(declineReplayAudit?.metadataJson)?.replay, true);

    const acceptDeclinedInvite = await app.inject({
      method: 'POST',
      url: `/v1/invites/${declinedPayload.invite.id}/respond`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
      payload: {
        response: 'ACCEPTED',
        selectedSlot: declinedSlot,
      },
    });
    assert.equal(acceptDeclinedInvite.statusCode, 409);

    const cancelledSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: coachUserId,
      coachUserId,
      excludePendingInvites: true,
    });

    const cancelledCreate = await createInvite('Passing', cancelledSlot);
    assert.equal(cancelledCreate.statusCode, 201);
    const cancelledPayload = cancelledCreate.json() as {
      invite: { id: string };
    };

    const deniedCancelInvite = await app.inject({
      method: 'DELETE',
      url: `/v1/invites/${cancelledPayload.invite.id}`,
      headers: {
        'x-auth-user-id': parentUserId,
        'x-auth-roles': rolesForUser(tables, parentUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, parentUserId)[0] ?? 'parent',
      },
    });
    assert.equal(deniedCancelInvite.statusCode, 403);
    assert.equal(
      auditEventsFor(store.tables, {
        action: 'invite.cancel',
        resourceId: cancelledPayload.invite.id,
        result: 'DENY',
      }).length,
      1,
    );

    const cancelInvite = await app.inject({
      method: 'DELETE',
      url: `/v1/invites/${cancelledPayload.invite.id}`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
    });
    assert.equal(cancelInvite.statusCode, 204);
    assert.equal(
      auditEventsFor(store.tables, {
        action: 'invite.cancel',
        resourceId: cancelledPayload.invite.id,
        result: 'SUCCESS',
      }).length,
      1,
    );

    const cancelledDetail = await app.inject({
      method: 'GET',
      url: `/v1/invites/${cancelledPayload.invite.id}`,
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
    });
    assert.equal(cancelledDetail.statusCode, 200);
    const cancelledDetailPayload = cancelledDetail.json() as {
      invite: { status: string };
    };
    assert.equal(cancelledDetailPayload.invite.status, 'EXPIRED');
  });

  it('denies blocked invite creation and acceptance before booking side effects', async () => {
    const tables = loadTables();
    const coachProfile = asRows(tables.coachProfiles)[0];
    assert.ok(coachProfile, 'expected seeded coach profile');
    const coachUserId = asString(coachProfile.userId) as string;
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.guardianUserId) && asString(row.guardianUserId) !== coachUserId,
    );
    assert.ok(guardianLink, 'expected guardian-child link');
    const parentUserId = asString(guardianLink.guardianUserId) as string;
    const athleteId = asString(guardianLink.athleteId) as string;
    const store = getMarketplaceSeedStore();
    const slot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: coachUserId,
      coachUserId,
      excludePendingInvites: true,
    });
    const invitePayload = {
      coachUserId,
      athleteIds: [athleteId],
      parentUserId,
      proposedSlots: [slot],
      sessionType: '1:1 Coaching',
      focus: 'Blocked invite authority',
      inviteType: 'CLOSED',
      priceMinor: 3500,
      durationMinutes: 60,
    };
    const created = await app.inject({
      method: 'POST',
      url: '/v1/invites',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: invitePayload,
    });
    assert.equal(created.statusCode, 201, created.body);
    const inviteId = (created.json() as { invite: { id: string } }).invite.id;

    const now = new Date().toISOString();
    ensureRows(store.tables, 'userBlocks').push({
      id: 'ubl_invite_booking_denied',
      blockerUserId: parentUserId,
      blockedUserId: coachUserId,
      createdByUserId: parentUserId,
      updatedByUserId: parentUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    const countsBefore = {
      invites: asRows(store.tables.invites).length,
      bookings: asRows(store.tables.bookings).length,
      series: asRows(store.tables.recurringSeries).length,
    };

    const deniedCreate = await app.inject({
      method: 'POST',
      url: '/v1/invites',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        ...invitePayload,
        focus: 'Second blocked invite',
      },
    });
    assert.equal(deniedCreate.statusCode, 409, deniedCreate.body);
    assert.equal(asRows(store.tables.invites).length, countsBefore.invites);

    const deniedAccept = await app.inject({
      method: 'POST',
      url: `/v1/invites/${inviteId}/respond`,
      headers: authHeaders(tables, parentUserId, 'parent'),
      payload: {
        response: 'ACCEPTED',
        selectedSlot: slot,
      },
    });
    assert.equal(deniedAccept.statusCode, 409, deniedAccept.body);
    assert.equal(asRows(store.tables.bookings).length, countsBefore.bookings);
    assert.equal(asRows(store.tables.recurringSeries).length, countsBefore.series);
    const storedInvite = asRows(store.tables.invites).find((row) => asString(row.id) === inviteId);
    const storedTargets = asRows(store.tables.inviteTargets).filter(
      (row) => asString(row.inviteId) === inviteId,
    );
    assert.equal(asString(storedInvite?.bookingId), undefined);
    assert.equal(
      storedTargets.every((row) => asString(row.status) === 'PENDING'),
      true,
    );
    for (const action of ['invite.create', 'invite.respond']) {
      assert.equal(
        auditEventsFor(store.tables, { action, result: 'DENY' }).some(
          (event) => asString(asRecord(event.metadataJson)?.reason) === 'active_block_relationship',
        ),
        true,
      );
    }
  });

  it('accepts selected recurring invite weeks through /v1/invites respond', async () => {
    const tables = loadTables();
    const coachProfile = asRows(tables.coachProfiles)[0];
    assert.ok(coachProfile, 'expected seeded coach profile');
    const coachUserId = asString(coachProfile.userId) as string;
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.guardianUserId) && asString(row.guardianUserId) !== coachUserId,
    );
    assert.ok(guardianLink, 'expected guardian-child link');
    const parentUserId = asString(guardianLink?.guardianUserId) as string;
    const athleteId = asString(guardianLink?.athleteId) as string;
    const slots = await getAvailableSlots({
      app,
      tables,
      authUserId: coachUserId,
      coachUserId,
      minCount: 3,
    });
    const recurringSlots = slots.slice(0, 3);
    const store = getMarketplaceSeedStore();

    const created = await app.inject({
      method: 'POST',
      url: '/v1/invites',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        coachUserId,
        athleteIds: [athleteId],
        parentUserId,
        proposedSlots: recurringSlots,
        sessionType: '1:1 Coaching',
        focus: 'Recurring finishing block',
        notes: 'Recurring invite authority test',
        inviteType: 'CLOSED',
        priceMinor: 3500,
        durationMinutes: 60,
        isRecurring: true,
        recurrenceWeeks: 3,
      },
    });
    assert.equal(created.statusCode, 201, created.body);
    const createdPayload = created.json() as {
      invite: {
        id: string;
        weekSlots?: Array<{
          weekDate: string;
          startTime: string;
          endTime: string;
          location?: string;
          accepted: boolean;
        }>;
      };
    };
    assert.equal(createdPayload.invite.weekSlots?.length, 3);

    const weekResponses = (createdPayload.invite.weekSlots ?? []).map((week, index) => ({
      ...week,
      accepted: index < 2,
    }));
    const accepted = await app.inject({
      method: 'POST',
      url: `/v1/invites/${createdPayload.invite.id}/respond`,
      headers: authHeaders(tables, parentUserId, 'parent'),
      payload: {
        response: 'ACCEPTED',
        recurringWeekResponses: weekResponses,
      },
    });
    assert.equal(accepted.statusCode, 200, accepted.body);
    const acceptedPayload = accepted.json() as {
      invite: {
        id: string;
        status: string;
        acceptedWeeks?: string[];
        declinedWeeks?: string[];
        weekSlots?: Array<{ weekDate: string; accepted: boolean }>;
      };
      bookingSeriesId?: string | null;
      bookingIds?: string[];
      bookingId?: string | null;
      booking?: { id: string } | null;
    };
    assert.equal(acceptedPayload.invite.id, createdPayload.invite.id);
    assert.equal(acceptedPayload.invite.status, 'ACCEPTED');
    assert.match(acceptedPayload.bookingSeriesId ?? '', /^rec_/);
    assert.equal(acceptedPayload.bookingIds?.length, 2);
    assert.equal(
      acceptedPayload.bookingId,
      acceptedPayload.booking?.id ?? acceptedPayload.bookingId,
    );
    assert.deepEqual(
      acceptedPayload.invite.acceptedWeeks,
      weekResponses.filter((week) => week.accepted).map((week) => week.weekDate),
    );
    assert.deepEqual(
      acceptedPayload.invite.declinedWeeks,
      weekResponses.filter((week) => !week.accepted).map((week) => week.weekDate),
    );
    assert.deepEqual(
      acceptedPayload.invite.weekSlots?.map((week) => week.accepted),
      [true, true, false],
    );
    assert.equal(
      asRows(store.tables.recurringSeries).some(
        (row) => asString(row.id) === acceptedPayload.bookingSeriesId,
      ),
      true,
    );
    assert.equal(
      asRows(store.tables.bookings).filter(
        (row) => asString(row.recurringSeriesId) === acceptedPayload.bookingSeriesId,
      ).length,
      2,
    );
    const respondAudit = auditEventsFor(store.tables, {
      action: 'invite.respond',
      resourceId: createdPayload.invite.id,
      result: 'SUCCESS',
    }).at(-1);
    assert.equal(
      asString(asRecord(respondAudit?.metadataJson)?.bookingSeriesId),
      acceptedPayload.bookingSeriesId,
    );
    assert.deepEqual(asRecord(respondAudit?.metadataJson)?.bookingIds, acceptedPayload.bookingIds);
  });

  it('fails closed for session invite creation in db mode before fixture invite or booking side effects', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    const previousDatabaseUrl = env.DATABASE_URL;

    try {
      const tables = loadTables();
      const coachProfile = asRows(tables.coachProfiles)[0];
      assert.ok(coachProfile, 'expected seeded coach profile');
      const coachUserId = asString(coachProfile.userId) as string;
      const guardianLink = asRows(tables.guardianChildLinks).find(
        (row) => asString(row.guardianUserId) && asString(row.guardianUserId) !== coachUserId,
      );
      assert.ok(guardianLink, 'expected guardian-child link');
      const parentUserId = asString(guardianLink?.guardianUserId) as string;
      const athleteId = asString(guardianLink?.athleteId) as string;
      const acceptedSlot = await getFirstAvailableSlot({
        app,
        tables,
        authUserId: coachUserId,
        coachUserId,
        excludePendingInvites: true,
      });
      const fixtureStore = getDbFixtureStore();
      const dbInviteCountBefore = asRows(fixtureStore.tables.invites).length;
      const dbBookingCountBefore = asRows(fixtureStore.tables.bookings).length;

      env.API_DATA_BACKEND = 'db';
      env.DATABASE_URL = undefined;
      const created = await app.inject({
        method: 'POST',
        url: '/v1/invites',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          coachUserId,
          athleteIds: [athleteId],
          parentUserId,
          proposedSlots: [acceptedSlot],
          sessionType: '1:1 Coaching',
          focus: 'DB invite authority',
          notes: 'DB invite authority session',
          inviteType: 'CLOSED',
          priceMinor: 3500,
          durationMinutes: 60,
        },
      });
      assert.equal(created.statusCode, 503);
      assert.match(created.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(created.body.includes(parentUserId), false);
      assert.equal(created.body.includes(athleteId), false);
      assert.equal(asRows(fixtureStore.tables.invites).length, dbInviteCountBefore);
      assert.equal(asRows(fixtureStore.tables.bookings).length, dbBookingCountBefore);
      const createAudit = auditEventsFor(fixtureStore.tables, {
        action: 'invite.create',
        result: 'ERROR',
      }).at(-1);
      assert.equal(asString(createAudit?.actorUserId), coachUserId);
      assert.equal(asString(createAudit?.subjectUserId), parentUserId);
      assert.equal(asString(asRecord(createAudit?.metadataJson)?.reason), 'prisma_unavailable');
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      env.DATABASE_URL = previousDatabaseUrl;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
    }
  });

  it('rejects a direct session invite that reuses a still-held pending slot', async () => {
    const tables = loadTables();
    const coachProfile = asRows(tables.coachProfiles)[0];
    assert.ok(coachProfile, 'expected seeded coach profile');
    const coachUserId = asString(coachProfile.userId) as string;
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.guardianUserId) && asString(row.guardianUserId) !== coachUserId,
    );
    assert.ok(guardianLink, 'expected guardian-child link');
    const parentUserId = asString(guardianLink?.guardianUserId) as string;
    const athleteId = asString(guardianLink?.athleteId) as string;
    const proposedSlot = await getFirstAvailableSlot({
      app,
      tables,
      authUserId: coachUserId,
      coachUserId,
      excludePendingInvites: true,
    });
    const payload = {
      coachUserId,
      athleteIds: [athleteId],
      parentUserId,
      proposedSlots: [proposedSlot],
      sessionType: '1:1 Coaching',
      focus: 'Ball mastery',
      notes: 'Ball mastery session',
      inviteType: 'CLOSED',
      priceMinor: 3500,
      durationMinutes: 60,
    };

    const first = await app.inject({
      method: 'POST',
      url: '/v1/invites',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
      payload,
    });
    assert.equal(first.statusCode, 201);

    const second = await app.inject({
      method: 'POST',
      url: '/v1/invites',
      headers: {
        'x-auth-user-id': coachUserId,
        'x-auth-roles': rolesForUser(tables, coachUserId).join(',') || 'coach',
        'x-acting-role': rolesForUser(tables, coachUserId)[0] ?? 'coach',
      },
      payload,
    });
    assert.equal(second.statusCode, 400);
  });

  it('reads club event detail through v1 authority', async () => {
    const tables = loadTables();
    const staffClubMembership = asRows(tables.clubMemberships).find(isActiveClubStaffMembership);
    assert.ok(staffClubMembership, 'expected seeded club staff membership');
    const clubId = asString(staffClubMembership.clubId) as string;
    const staffUserId = asString(staffClubMembership.userId) as string;
    const memberClubMembership =
      asRows(tables.clubMemberships).find(
        (row) =>
          asString(row.clubId) === clubId &&
          asString(row.userId) !== staffUserId &&
          isActiveClubMembership(row),
      ) ?? staffClubMembership;
    const memberUserId = asString(memberClubMembership.userId) as string;
    const clubEvent = asRows(tables.clubEvents).find(
      (row) => asString(row.clubId) === clubId && asString(row.status) !== 'DRAFT',
    );
    assert.ok(clubEvent, 'expected seeded published event for member club');
    const eventId = asString(clubEvent.id) as string;

    const list = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/events`,
      headers: authHeaders(tables, memberUserId, 'parent'),
    });
    assert.equal(list.statusCode, 200);
    const listPayload = list.json() as {
      clubId: string;
      events: Array<{
        id: string;
        clubId: string;
        status: string;
        currentParticipants: number;
        rsvpSummary: {
          going: number;
          maybe: number;
          notGoing: number;
          totalGuests: number;
        };
      }>;
      total: number;
      requestId: string;
    };
    assert.deepEqual(Object.keys(listPayload).sort(), ['clubId', 'events', 'requestId', 'total']);
    assert.equal(listPayload.clubId, clubId);
    assert.equal(
      listPayload.events.some((event) => event.id === eventId),
      true,
    );
    assert.equal(
      listPayload.events.every((event) => event.clubId === clubId),
      true,
    );
    if (!isActiveClubStaffMembership(memberClubMembership)) {
      assert.equal(
        listPayload.events.some((event) => event.status === 'DRAFT'),
        false,
      );
    }
    assert.equal(listPayload.total, listPayload.events.length);
    const listedEvent = listPayload.events.find((event) => event.id === eventId);
    assert.ok(listedEvent, 'expected listed event projection');
    const eventRsvps = asRows(tables.eventRsvps).filter(
      (row) => asString(row.clubEventId) === eventId || asString(row.eventId) === eventId,
    );
    const expectedRsvpSummary = eventRsvps.reduce<{
      going: number;
      maybe: number;
      notGoing: number;
      totalGuests: number;
    }>(
      (summary, rsvp) => {
        const guestCount = Number(rsvp.guestCount ?? 0);
        if (asString(rsvp.status) === 'GOING') {
          summary.going += 1;
          summary.totalGuests += guestCount;
        } else if (asString(rsvp.status) === 'MAYBE') {
          summary.maybe += 1;
        } else {
          summary.notGoing += 1;
        }
        return summary;
      },
      { going: 0, maybe: 0, notGoing: 0, totalGuests: 0 },
    );
    assert.deepEqual(listedEvent.rsvpSummary, expectedRsvpSummary);
    assert.equal(
      listedEvent.currentParticipants,
      expectedRsvpSummary.going + expectedRsvpSummary.totalGuests,
    );
    assert.equal('attendees' in listedEvent, false);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}`,
      headers: authHeaders(tables, memberUserId, 'parent'),
    });
    assert.equal(detail.statusCode, 200);
    const detailPayload = detail.json() as {
      event: {
        id: string;
        clubId: string;
        title: string;
        currentParticipants: number;
        rsvpSummary: typeof expectedRsvpSummary;
      };
    };
    assert.equal(detailPayload.event.id, eventId);
    assert.equal(detailPayload.event.clubId, clubId);
    assert.equal(detailPayload.event.title, asString(clubEvent.title));
    assert.deepEqual(detailPayload.event.rsvpSummary, expectedRsvpSummary);
    assert.equal(
      detailPayload.event.currentParticipants,
      expectedRsvpSummary.going + expectedRsvpSummary.totalGuests,
    );
    assert.equal('attendees' in detailPayload.event, false);

    const outsiderUserId = asRows(tables.users)
      .map((row) => asString(row.id))
      .find((candidate): candidate is string => {
        if (!candidate || candidate === memberUserId || candidate === staffUserId) {
          return false;
        }
        if (rolesForUser(tables, candidate).includes('security_admin')) {
          return false;
        }
        return !asRows(tables.clubMemberships).some(
          (membership) =>
            asString(membership.clubId) === clubId &&
            asString(membership.userId) === candidate &&
            isActiveClubMembership(membership),
        );
      });
    assert.ok(outsiderUserId, 'expected user outside event club');
    const deniedList = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/events`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(deniedList.statusCode, 403);

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(denied.statusCode, 403);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_event.read',
        resourceId: eventId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_event.read',
        resourceId: eventId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_event.list',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_event.list',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      1,
    );

    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';
    try {
      const fixtureTables = getDbFixtureStore().tables;
      const fixtureDetail = await app.inject({
        method: 'GET',
        url: `/v1/events/${eventId}`,
        headers: authHeaders(fixtureTables, memberUserId, 'parent'),
      });
      assert.equal(fixtureDetail.statusCode, 200);
      assert.equal((fixtureDetail.json() as { event: { id: string } }).event.id, eventId);
      const fixtureList = await app.inject({
        method: 'GET',
        url: `/v1/clubs/${clubId}/events`,
        headers: authHeaders(fixtureTables, memberUserId, 'parent'),
      });
      assert.equal(fixtureList.statusCode, 200);
      assert.equal(
        (fixtureList.json() as { events: Array<{ id: string }> }).events.some(
          (event) => event.id === eventId,
        ),
        true,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
    }
  });

  it('creates, publishes, invites, and cancels club events through v1 authority', async () => {
    const tables = loadTables();
    const staffClubMembership = asRows(tables.clubMemberships).find(isActiveClubStaffMembership);
    assert.ok(staffClubMembership, 'expected seeded club staff membership');
    const clubId = asString(staffClubMembership.clubId) as string;
    const staffUserId = asString(staffClubMembership.userId) as string;
    const outsiderUserId = asRows(tables.users)
      .map((row) => asString(row.id))
      .find((candidate): candidate is string => {
        if (!candidate || candidate === staffUserId) {
          return false;
        }
        if (rolesForUser(tables, candidate).includes('security_admin')) {
          return false;
        }
        return !asRows(tables.clubMemberships).some(
          (membership) =>
            asString(membership.clubId) === clubId &&
            asString(membership.userId) === candidate &&
            isActiveClubMembership(membership),
        );
      });
    assert.ok(outsiderUserId, 'expected user outside event club');

    const createPayload = {
      title: 'API Cup Finals',
      description: 'Created through the v1 event authority.',
      eventType: 'TOURNAMENT',
      date: '2026-09-12',
      startTime: '10:00',
      endTime: '13:00',
      venue: 'Main Pitch',
      targetAudience: 'ALL',
      maxAttendees: 120,
      price: 4.5,
      currency: 'GBP',
      rsvpRequired: true,
    };
    const deniedCreate = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/events`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
      payload: createPayload,
    });
    assert.equal(deniedCreate.statusCode, 403);

    const invalidOwnershipCreate = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/events`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        ...createPayload,
        description: 'must-not-be-copied-to-event-audit',
        status: 'PUBLISHED',
      },
    });
    assert.equal(invalidOwnershipCreate.statusCode, 400);
    const invalidTimeCreate = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/events`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        ...createPayload,
        endTime: '09:00',
      },
    });
    assert.equal(invalidTimeCreate.statusCode, 400);

    const created = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/events`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: createPayload,
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      event: {
        id: string;
        clubId: string;
        title: string;
        status: string;
        price: number;
        date: string;
        startTime: string;
        endTime?: string;
        timeZone: string;
        currentParticipants: number;
        rsvpSummary: {
          going: number;
          maybe: number;
          notGoing: number;
          totalGuests: number;
        };
      };
      requestId: string;
    };
    assert.deepEqual(Object.keys(createdPayload).sort(), ['event', 'requestId']);
    assert.equal(createdPayload.event.clubId, clubId);
    assert.equal(createdPayload.event.title, createPayload.title);
    assert.equal(createdPayload.event.status, 'DRAFT');
    assert.equal(createdPayload.event.price, 4.5);
    assert.equal(createdPayload.event.date, createPayload.date);
    assert.equal(createdPayload.event.startTime, createPayload.startTime);
    assert.equal(createdPayload.event.endTime, createPayload.endTime);
    assert.equal(createdPayload.event.timeZone, 'Europe/London');
    assert.equal(createdPayload.event.currentParticipants, 0);
    assert.deepEqual(createdPayload.event.rsvpSummary, {
      going: 0,
      maybe: 0,
      notGoing: 0,
      totalGuests: 0,
    });
    assert.equal('attendees' in createdPayload.event, false);
    const eventId = createdPayload.event.id;
    const storedCreatedEvent = asRows(getMarketplaceSeedStore().tables.clubEvents).find(
      (row) => asString(row.id) === eventId,
    );
    assert.equal(asString(storedCreatedEvent?.startsAt), '2026-09-12T09:00:00.000Z');
    assert.equal(asString(storedCreatedEvent?.endsAt), '2026-09-12T12:00:00.000Z');
    assert.equal(asString(asRecord(storedCreatedEvent?.metadataJson)?.timeZone), 'Europe/London');

    const nonexistentLocalTime = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/events`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        ...createPayload,
        date: '2026-03-29',
        startTime: '01:30',
        endTime: '02:30',
      },
    });
    assert.equal(nonexistentLocalTime.statusCode, 400);

    const deniedPatch = await app.inject({
      method: 'PATCH',
      url: `/v1/events/${eventId}`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
      payload: { status: 'PUBLISHED' },
    });
    assert.equal(deniedPatch.statusCode, 403);

    const rescheduled = await app.inject({
      method: 'PATCH',
      url: `/v1/events/${eventId}`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        date: '2026-01-15',
        startTime: '10:00',
        endTime: '12:00',
      },
    });
    assert.equal(rescheduled.statusCode, 200);
    const rescheduledPayload = rescheduled.json() as {
      event: { date: string; startTime: string; endTime?: string; timeZone: string };
    };
    assert.equal(rescheduledPayload.event.date, '2026-01-15');
    assert.equal(rescheduledPayload.event.startTime, '10:00');
    assert.equal(rescheduledPayload.event.endTime, '12:00');
    assert.equal(rescheduledPayload.event.timeZone, 'Europe/London');
    assert.equal(asString(storedCreatedEvent?.startsAt), '2026-01-15T10:00:00.000Z');
    assert.equal(asString(storedCreatedEvent?.endsAt), '2026-01-15T12:00:00.000Z');

    const published = await app.inject({
      method: 'PATCH',
      url: `/v1/events/${eventId}`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: { status: 'PUBLISHED' },
    });
    assert.equal(published.statusCode, 200);
    assert.equal((published.json() as { event: { status: string } }).event.status, 'PUBLISHED');

    const expectedRecipients = asRows(tables.clubMemberships).filter(
      (membership) =>
        asString(membership.clubId) === clubId &&
        asString(membership.userId) !== staffUserId &&
        membership.active !== false &&
        !asString(membership.deletedAt),
    ).length;
    const invited = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/invites/club`,
      headers: authHeaders(tables, staffUserId, 'coach'),
    });
    assert.equal(invited.statusCode, 200);
    assert.equal((invited.json() as { inviteCount: number }).inviteCount, expectedRecipients);
    assert.equal(
      asRows(getMarketplaceSeedStore().tables.notifications).filter(
        (row) => asString(row.sourceId) === eventId && asString(row.type) === 'CLUB_EVENT_INVITE',
      ).length,
      expectedRecipients,
    );

    const squad = asRows(tables.squads).find(
      (row) => asString(row.clubId) === clubId && !asString(row.deletedAt),
    );
    assert.ok(squad, 'expected seeded squad for event club');
    const squadId = asString(squad.id) as string;
    const otherClubSquad = asRows(tables.squads).find(
      (row) => asString(row.clubId) !== clubId && !asString(row.deletedAt),
    );
    assert.ok(otherClubSquad, 'expected seeded squad outside event club');
    const otherClubSquadId = asString(otherClubSquad.id) as string;
    const squadAthleteIds = new Set(
      asRows(tables.squadMemberships)
        .filter(
          (membership) =>
            asString(membership.squadId) === squadId &&
            asString(membership.status) === 'active' &&
            !asString(membership.deletedAt),
        )
        .map((membership) => asString(membership.athleteId))
        .filter((athleteId): athleteId is string => Boolean(athleteId)),
    );
    const expectedSquadRecipients = new Set<string>();
    for (const athleteId of squadAthleteIds) {
      const guardian = asRows(tables.guardianChildLinks)
        .filter((row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt))
        .sort((a, b) => {
          if (a.isPrimary === true && b.isPrimary !== true) return -1;
          if (b.isPrimary === true && a.isPrimary !== true) return 1;
          return Date.parse(asString(a.createdAt) ?? '') - Date.parse(asString(b.createdAt) ?? '');
        })[0];
      const guardianUserId = asString(guardian?.guardianUserId);
      if (guardianUserId) {
        expectedSquadRecipients.add(guardianUserId);
      }
    }

    const deniedSquadInvite = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/invites/squads`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
      payload: { squadIds: [squadId] },
    });
    assert.equal(deniedSquadInvite.statusCode, 403);

    const invalidSquadInvite = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/invites/squads`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: { squadIds: [otherClubSquadId] },
    });
    assert.equal(invalidSquadInvite.statusCode, 400);

    const squadInvited = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/invites/squads`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: { squadIds: [squadId] },
    });
    assert.equal(squadInvited.statusCode, 200);
    const squadInvitePayload = squadInvited.json() as {
      inviteCount: number;
      targetAthleteCount: number;
      squadIds: string[];
    };
    assert.deepEqual(squadInvitePayload.squadIds, [squadId]);
    assert.equal(squadInvitePayload.inviteCount, expectedSquadRecipients.size);
    assert.equal(squadInvitePayload.targetAthleteCount, squadAthleteIds.size);
    assert.equal(
      asRows(getMarketplaceSeedStore().tables.notifications).filter((row) => {
        const metadata = asRecord(row.metadataJson);
        const metadataSquadIds = metadata?.squadIds;
        return (
          asString(row.sourceId) === eventId &&
          asString(row.type) === 'CLUB_EVENT_INVITE' &&
          Array.isArray(metadataSquadIds) &&
          metadataSquadIds.includes(squadId)
        );
      }).length,
      expectedSquadRecipients.size,
    );

    const athleteId = [...squadAthleteIds][0];
    assert.ok(athleteId, 'expected seeded athlete in event club squad');
    const athlete = asRows(tables.athletes).find((row) => asString(row.id) === athleteId);
    assert.ok(athlete, 'expected seeded target athlete');
    const expectedAthleteRecipients = new Set<string>();
    const athleteUserId = asString(athlete.userId);
    if (athleteUserId && athleteUserId !== staffUserId) {
      expectedAthleteRecipients.add(athleteUserId);
    }
    for (const link of asRows(tables.guardianChildLinks)) {
      if (asString(link.athleteId) === athleteId && !asString(link.deletedAt)) {
        const guardianUserId = asString(link.guardianUserId);
        if (guardianUserId && guardianUserId !== staffUserId) {
          expectedAthleteRecipients.add(guardianUserId);
        }
      }
    }
    assert.ok(expectedAthleteRecipients.size > 0, 'expected linked athlete invite recipients');
    const nonTargetMemberUserId = asRows(tables.clubMemberships)
      .filter(
        (membership) =>
          asString(membership.clubId) === clubId &&
          isActiveClubMembership(membership) &&
          !isActiveClubStaffMembership(membership),
      )
      .map((membership) => asString(membership.userId))
      .find((userId): userId is string => {
        if (!userId) return false;
        return !expectedAthleteRecipients.has(userId) && userId !== staffUserId;
      });
    assert.ok(nonTargetMemberUserId, 'expected active non-target club member');
    const otherClubAthleteId = asString(
      asRows(tables.squadMemberships).find(
        (membership) =>
          asString(membership.squadId) === otherClubSquadId &&
          asString(membership.status) === 'active' &&
          !asString(membership.deletedAt),
      )?.athleteId,
    );
    assert.ok(otherClubAthleteId, 'expected seeded athlete outside event club');

    const athleteCreated = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/events`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        ...createPayload,
        title: 'Targeted Athlete Event',
        targetAudience: 'ATHLETES',
        athleteIds: [athleteId],
      },
    });
    assert.equal(athleteCreated.statusCode, 201);
    const athleteEventPayload = athleteCreated.json() as {
      event: { id: string; athleteIds: string[] };
    };
    const athleteEventId = athleteEventPayload.event.id;
    assert.deepEqual(athleteEventPayload.event.athleteIds, [athleteId]);
    const athletePublished = await app.inject({
      method: 'PATCH',
      url: `/v1/events/${athleteEventId}`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: { status: 'PUBLISHED' },
    });
    assert.equal(athletePublished.statusCode, 200);

    const deniedAthleteInvite = await app.inject({
      method: 'POST',
      url: `/v1/events/${athleteEventId}/invites/athletes`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
      payload: { athleteIds: [athleteId] },
    });
    assert.equal(deniedAthleteInvite.statusCode, 403);

    const invalidAthleteInvite = await app.inject({
      method: 'POST',
      url: `/v1/events/${athleteEventId}/invites/athletes`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: { athleteIds: [otherClubAthleteId] },
    });
    assert.equal(invalidAthleteInvite.statusCode, 400);

    const athleteInvited = await app.inject({
      method: 'POST',
      url: `/v1/events/${athleteEventId}/invites/athletes`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: { athleteIds: [athleteId, athleteId] },
    });
    assert.equal(athleteInvited.statusCode, 200);
    const athleteInvitePayload = athleteInvited.json() as {
      athleteIds: string[];
      inviteCount: number;
      targetAthleteCount: number;
    };
    assert.deepEqual(athleteInvitePayload.athleteIds, [athleteId]);
    assert.equal(athleteInvitePayload.inviteCount, expectedAthleteRecipients.size);
    assert.equal(athleteInvitePayload.targetAthleteCount, 1);
    assert.equal(
      asRows(getMarketplaceSeedStore().tables.notifications).filter((row) => {
        const metadata = asRecord(row.metadataJson);
        const metadataAthleteIds = metadata?.athleteIds;
        return (
          asString(row.sourceId) === athleteEventId &&
          asString(row.type) === 'CLUB_EVENT_INVITE' &&
          Array.isArray(metadataAthleteIds) &&
          metadataAthleteIds.includes(athleteId)
        );
      }).length,
      expectedAthleteRecipients.size,
    );

    const linkedRecipientDetail = await app.inject({
      method: 'GET',
      url: `/v1/events/${athleteEventId}`,
      headers: authHeaders(tables, [...expectedAthleteRecipients][0], 'parent'),
    });
    assert.equal(linkedRecipientDetail.statusCode, 200);
    const nonTargetDetail = await app.inject({
      method: 'GET',
      url: `/v1/events/${athleteEventId}`,
      headers: authHeaders(tables, nonTargetMemberUserId, 'parent'),
    });
    assert.equal(nonTargetDetail.statusCode, 403);
    const nonTargetList = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/events`,
      headers: authHeaders(tables, nonTargetMemberUserId, 'parent'),
    });
    assert.equal(nonTargetList.statusCode, 200);
    assert.equal(
      (nonTargetList.json() as { events: Array<{ id: string }> }).events.some(
        (event) => event.id === athleteEventId,
      ),
      false,
    );

    const cancelled = await app.inject({
      method: 'PATCH',
      url: `/v1/events/${eventId}`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: { status: 'CANCELLED' },
    });
    assert.equal(cancelled.statusCode, 200);
    assert.equal((cancelled.json() as { event: { status: string } }).event.status, 'CANCELLED');
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_event.create',
        resourceId: eventId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    const validationAudits = asRows(getMarketplaceSeedStore().tables.auditEvents).filter((row) => {
      const metadata = asRecord(row.metadataJson);
      return (
        asString(row.action) === 'club_event.create' &&
        asString(row.actorUserId) === staffUserId &&
        asString(row.result) === 'DENY' &&
        asString(metadata?.errorCode) === 'VALIDATION_FAILED'
      );
    });
    assert.equal(validationAudits.length, 3);
    assert.equal(
      JSON.stringify(validationAudits).includes('must-not-be-copied-to-event-audit'),
      false,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_event.update',
        resourceId: eventId,
        result: 'SUCCESS',
      }).length,
      3,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_event.invite_club',
        resourceId: eventId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_event.invite_squads',
        resourceId: eventId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_event.invite_athletes',
        resourceId: athleteEventId,
        result: 'SUCCESS',
      }).length,
      1,
    );

    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';
    try {
      const fixtureTables = getDbFixtureStore().tables;
      const fixtureCreated = await app.inject({
        method: 'POST',
        url: `/v1/clubs/${clubId}/events`,
        headers: authHeaders(fixtureTables, staffUserId, 'coach'),
        payload: {
          ...createPayload,
          title: 'DB Fixture API Cup Finals',
        },
      });
      assert.equal(fixtureCreated.statusCode, 201);
      const fixtureEventId = (fixtureCreated.json() as { event: { id: string } }).event.id;
      const fixturePublished = await app.inject({
        method: 'PATCH',
        url: `/v1/events/${fixtureEventId}`,
        headers: authHeaders(fixtureTables, staffUserId, 'coach'),
        payload: { status: 'PUBLISHED' },
      });
      assert.equal(fixturePublished.statusCode, 200);
      assert.equal(
        (fixturePublished.json() as { event: { status: string } }).event.status,
        'PUBLISHED',
      );
      const fixtureSquad = asRows(fixtureTables.squads).find(
        (row) => asString(row.clubId) === clubId && !asString(row.deletedAt),
      );
      assert.ok(fixtureSquad, 'expected db-fixture squad for event club');
      const fixtureSquadInvite = await app.inject({
        method: 'POST',
        url: `/v1/events/${fixtureEventId}/invites/squads`,
        headers: authHeaders(fixtureTables, staffUserId, 'coach'),
        payload: {
          squadIds: [asString(fixtureSquad.id)],
        },
      });
      assert.equal(fixtureSquadInvite.statusCode, 200);
      assert.equal(
        (fixtureSquadInvite.json() as { squadIds: string[] }).squadIds[0],
        asString(fixtureSquad.id),
      );
      const fixtureAthleteId = asString(
        asRows(fixtureTables.squadMemberships).find(
          (membership) =>
            asString(membership.squadId) === asString(fixtureSquad.id) &&
            asString(membership.status) === 'active' &&
            !asString(membership.deletedAt),
        )?.athleteId,
      );
      assert.ok(fixtureAthleteId, 'expected db-fixture athlete for event club');
      const fixtureAthleteEvent = await app.inject({
        method: 'POST',
        url: `/v1/clubs/${clubId}/events`,
        headers: authHeaders(fixtureTables, staffUserId, 'coach'),
        payload: {
          ...createPayload,
          title: 'DB Fixture Targeted Athlete Event',
          targetAudience: 'ATHLETES',
          athleteIds: [fixtureAthleteId],
        },
      });
      assert.equal(fixtureAthleteEvent.statusCode, 201);
      const fixtureAthleteEventId = (fixtureAthleteEvent.json() as { event: { id: string } }).event
        .id;
      const fixtureAthleteInvite = await app.inject({
        method: 'POST',
        url: `/v1/events/${fixtureAthleteEventId}/invites/athletes`,
        headers: authHeaders(fixtureTables, staffUserId, 'coach'),
        payload: {
          athleteIds: [fixtureAthleteId],
        },
      });
      assert.equal(fixtureAthleteInvite.statusCode, 200);
      assert.deepEqual((fixtureAthleteInvite.json() as { athleteIds: string[] }).athleteIds, [
        fixtureAthleteId,
      ]);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
    }
  });

  it('responds to invites and creates/updates event RSVPs', async () => {
    const tables = loadTables();
    const target =
      asRows(tables.inviteTargets).find((row) => asString(row.status) === 'PENDING') ??
      asRows(tables.inviteTargets)[0];
    assert.ok(target, 'expected seeded invite target');
    const inviteId = asString(target.inviteId) as string;
    const targetUserId = asString(target.targetUserId) as string;

    const inviteResponse = await app.inject({
      method: 'POST',
      url: `/v1/invites/${inviteId}/respond`,
      headers: {
        'x-auth-user-id': targetUserId,
        'x-auth-roles': rolesForUser(tables, targetUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, targetUserId)[0] ?? 'parent',
      },
      payload: {
        response: 'ACCEPTED',
      },
    });
    assert.equal(inviteResponse.statusCode, 200);
    const invitePayload = inviteResponse.json() as {
      invite: { id: string; status: string; parentId: string };
      status: string;
      bookingId?: string | null;
      registrationId?: string | null;
      registrationStatus?: string | null;
      booking?: { id: string; status: string } | null;
    };
    assert.equal(invitePayload.status, 'ACCEPTED');
    assert.equal(invitePayload.invite.id, inviteId);
    assert.equal(invitePayload.invite.parentId, targetUserId);
    assert.equal(invitePayload.invite.status, 'ACCEPTED');
    assert.equal(typeof invitePayload.registrationId, 'string');
    assert.ok(['REGISTERED', 'WAITLISTED'].includes(invitePayload.registrationStatus ?? ''));
    if (invitePayload.registrationStatus === 'REGISTERED' && invitePayload.booking) {
      assert.match(invitePayload.booking?.id ?? '', /^bok_/);
      assert.equal(invitePayload.bookingId, invitePayload.booking.id);
    } else if (invitePayload.registrationStatus === 'WAITLISTED') {
      assert.equal(invitePayload.booking ?? null, null);
      assert.equal(invitePayload.bookingId ?? null, null);
    }

    const staffClubMembership = asRows(tables.clubMemberships).find(isActiveClubStaffMembership);
    assert.ok(staffClubMembership, 'expected seeded club staff membership');
    const clubId = asString(staffClubMembership.clubId) as string;
    const staffUserId = asString(staffClubMembership.userId) as string;
    const memberClubMembership =
      asRows(tables.clubMemberships).find(
        (row) =>
          asString(row.clubId) === clubId &&
          asString(row.userId) !== staffUserId &&
          isActiveClubMembership(row),
      ) ?? staffClubMembership;
    const memberUserId = asString(memberClubMembership.userId) as string;
    const clubEvent = asRows(tables.clubEvents).find((row) => asString(row.clubId) === clubId);
    assert.ok(clubEvent, 'expected seeded event for member club');
    const eventId = asString(clubEvent.id) as string;

    const rsvp = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/rsvp`,
      headers: {
        'x-auth-user-id': memberUserId,
        'x-auth-roles': rolesForUser(tables, memberUserId).join(',') || 'parent',
        'x-acting-role': rolesForUser(tables, memberUserId)[0] ?? 'parent',
      },
      payload: {
        status: 'GOING',
        guestCount: 1,
      },
    });
    assert.equal(rsvp.statusCode, 200);
    const rsvpPayload = rsvp.json() as { rsvp: { status: string; guestCount: number } };
    assert.equal(rsvpPayload.rsvp.status, 'GOING');
    assert.equal(rsvpPayload.rsvp.guestCount, 1);

    const rsvpList = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/rsvps`,
      headers: authHeaders(tables, memberUserId, 'parent'),
    });
    assert.equal(rsvpList.statusCode, 200);
    const rsvpListPayload = rsvpList.json() as {
      rsvps: Array<{ eventId: string; userId: string; status: string; guestCount: number }>;
      total: number;
    };
    assert.equal(rsvpListPayload.total >= 1, true);
    assert.equal(
      rsvpListPayload.rsvps.some(
        (item) =>
          item.eventId === eventId &&
          item.userId === memberUserId &&
          item.status === 'GOING' &&
          item.guestCount === 1,
      ),
      true,
    );

    const userRsvp = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/rsvps/${memberUserId}`,
      headers: authHeaders(tables, memberUserId, 'parent'),
    });
    assert.equal(userRsvp.statusCode, 200);
    const userRsvpPayload = userRsvp.json() as {
      rsvp: { eventId: string; userId: string; status: string } | null;
    };
    assert.equal(userRsvpPayload.rsvp?.eventId, eventId);
    assert.equal(userRsvpPayload.rsvp?.userId, memberUserId);
    assert.equal(userRsvpPayload.rsvp?.status, 'GOING');

    const maybeRsvp = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/rsvp`,
      headers: authHeaders(tables, memberUserId, 'parent'),
      payload: {
        status: 'MAYBE',
        guestCount: 1,
      },
    });
    assert.equal(maybeRsvp.statusCode, 200);

    const reminder = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/rsvps/remind`,
      headers: authHeaders(tables, staffUserId, 'coach'),
    });
    assert.equal(reminder.statusCode, 200);
    const reminderPayload = reminder.json() as { reminderCount: number };
    assert.equal(reminderPayload.reminderCount >= 1, true);
    assert.equal(
      asRows(getMarketplaceSeedStore().tables.notifications).some(
        (row) =>
          asString(row.userId) === memberUserId &&
          asString(row.type) === 'EVENT_RSVP_REMINDER' &&
          asString(row.sourceId) === eventId,
      ),
      true,
    );

    const outsiderUserId = asRows(tables.users)
      .map((row) => asString(row.id))
      .find((candidate): candidate is string => {
        if (!candidate || candidate === memberUserId) {
          return false;
        }
        if (rolesForUser(tables, candidate).includes('security_admin')) {
          return false;
        }
        return !asRows(tables.clubMemberships).some(
          (membership) =>
            asString(membership.clubId) === clubId &&
            asString(membership.userId) === candidate &&
            membership.active !== false &&
            !asString(membership.deletedAt),
        );
      });
    assert.ok(outsiderUserId, 'expected user outside event club');
    const deniedRead = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/rsvps`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(deniedRead.statusCode, 403);
    const deniedReminder = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/rsvps/remind`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(deniedReminder.statusCode, 403);
    const currentStore = getMarketplaceSeedStore();
    assert.equal(
      auditEventsFor(currentStore.tables, {
        action: 'event.rsvp.read',
        resourceId: eventId,
        result: 'SUCCESS',
      }).length >= 2,
      true,
    );
    assert.equal(
      auditEventsFor(currentStore.tables, {
        action: 'event.rsvp.read',
        resourceId: eventId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(currentStore.tables, {
        action: 'event.rsvp.remind',
        resourceId: eventId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(currentStore.tables, {
        action: 'event.rsvp.remind',
        resourceId: eventId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('fails closed for event RSVP writes in db mode before fixture RSVP side effects', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    const previousDatabaseUrl = env.DATABASE_URL;
    env.API_DATA_BACKEND = 'db';
    env.DATABASE_URL = undefined;

    try {
      const fixtureStore = getDbFixtureStore();
      const tables = fixtureStore.tables;
      const staffClubMembership = asRows(tables.clubMemberships).find(isActiveClubStaffMembership);
      assert.ok(staffClubMembership, 'expected db-fixture club staff membership');
      const clubId = asString(staffClubMembership.clubId) as string;
      const staffUserId = asString(staffClubMembership.userId) as string;
      const memberClubMembership =
        asRows(tables.clubMemberships).find(
          (row) =>
            asString(row.clubId) === clubId &&
            asString(row.userId) !== staffUserId &&
            isActiveClubMembership(row),
        ) ?? staffClubMembership;
      const memberUserId = asString(memberClubMembership.userId) as string;
      const clubEvent = asRows(tables.clubEvents).find((row) => asString(row.clubId) === clubId);
      assert.ok(clubEvent, 'expected db-fixture event for member club');
      const eventId = asString(clubEvent.id) as string;
      const rsvpCount = asRows(getDbFixtureStore().tables.eventRsvps).length;

      const rsvp = await app.inject({
        method: 'POST',
        url: `/v1/events/${eventId}/rsvp`,
        headers: authHeaders(tables, memberUserId, 'parent'),
        payload: {
          status: 'NOT_GOING',
          guestCount: 0,
          notes: 'Cannot attend this time.',
        },
      });
      assert.equal(rsvp.statusCode, 503);
      assert.match(rsvp.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(rsvp.body.includes(eventId), false);
      assert.equal(rsvp.body.includes(memberUserId), false);

      assert.equal(asRows(getDbFixtureStore().tables.eventRsvps).length, rsvpCount);
      assert.equal(
        auditEventsFor(getDbFixtureStore().tables, {
          action: 'event.rsvp',
          resourceId: eventId,
          result: 'ERROR',
        }).length,
        1,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it('reads event attendance through v1 authority', async () => {
    const tables = loadTables();
    const staffClubMembership = asRows(tables.clubMemberships).find(isActiveClubStaffMembership);
    assert.ok(staffClubMembership, 'expected seeded club staff membership');
    const clubId = asString(staffClubMembership.clubId) as string;
    const staffUserId = asString(staffClubMembership.userId) as string;
    const memberClubMembership =
      asRows(tables.clubMemberships).find(
        (row) =>
          asString(row.clubId) === clubId &&
          asString(row.userId) !== staffUserId &&
          isActiveClubMembership(row),
      ) ?? staffClubMembership;
    const memberUserId = asString(memberClubMembership.userId) as string;
    const clubEvent = asRows(tables.clubEvents).find((row) => asString(row.clubId) === clubId);
    assert.ok(clubEvent, 'expected seeded event for member club');
    const eventId = asString(clubEvent.id) as string;

    const checkin = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/checkins`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        userId: memberUserId,
        userRole: 'PARENT',
        checkInMethod: 'COACH',
        guestsCheckedIn: 1,
        notes: 'Checked in at the gate.',
        locationValidated: true,
        distanceFromVenue: 20,
      },
    });
    assert.equal(checkin.statusCode, 200);
    const checkinPayload = checkin.json() as {
      attendance: { eventId: string; userId: string; guestsCheckedIn: number };
    };
    assert.equal(checkinPayload.attendance.eventId, eventId);
    assert.equal(checkinPayload.attendance.userId, memberUserId);
    assert.equal(checkinPayload.attendance.guestsCheckedIn, 1);

    const list = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/attendance`,
      headers: authHeaders(tables, staffUserId, 'coach'),
    });
    assert.equal(list.statusCode, 200);
    const listPayload = list.json() as {
      attendance: Array<{ eventId: string; userId: string; guestsCheckedIn: number }>;
      total: number;
    };
    assert.equal(listPayload.total, 1);
    assert.equal(listPayload.attendance[0]?.eventId, eventId);
    assert.equal(listPayload.attendance[0]?.userId, memberUserId);
    assert.equal(listPayload.attendance[0]?.guestsCheckedIn, 1);

    const rsvp = await app.inject({
      method: 'POST',
      url: `/v1/events/${eventId}/rsvp`,
      headers: authHeaders(tables, memberUserId, 'parent'),
      payload: {
        status: 'GOING',
        guestCount: 2,
      },
    });
    assert.equal(rsvp.statusCode, 200);

    const stats = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/attendance/stats`,
      headers: authHeaders(tables, staffUserId, 'coach'),
    });
    assert.equal(stats.statusCode, 200);
    const statsPayload = stats.json() as {
      rsvpCounts: { going: number };
      expectedGuests: number;
      checkedInCount: number;
      guestsCheckedInCount: number;
      attendanceRate: number;
      byRole: { parents: { checkedIn: number } };
    };
    assert.equal(statsPayload.checkedInCount, 1);
    assert.equal(statsPayload.guestsCheckedInCount, 1);
    assert.equal(statsPayload.rsvpCounts.going >= 1, true);
    assert.equal(statsPayload.expectedGuests >= 2, true);
    assert.equal(statsPayload.attendanceRate >= 0, true);
    assert.equal(statsPayload.byRole.parents.checkedIn, 1);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/attendance/${memberUserId}`,
      headers: authHeaders(tables, memberUserId, 'parent'),
    });
    assert.equal(detail.statusCode, 200);
    const detailPayload = detail.json() as {
      attendance: { eventId: string; userId: string; checkInMethod: string } | null;
    };
    assert.equal(detailPayload.attendance?.eventId, eventId);
    assert.equal(detailPayload.attendance?.userId, memberUserId);
    assert.equal(detailPayload.attendance?.checkInMethod, 'COACH');

    const outsiderUserId = asRows(tables.users)
      .map((row) => asString(row.id))
      .find((candidate): candidate is string => {
        if (!candidate || candidate === memberUserId || candidate === staffUserId) {
          return false;
        }
        if (rolesForUser(tables, candidate).includes('security_admin')) {
          return false;
        }
        return !asRows(tables.clubMemberships).some(
          (membership) =>
            asString(membership.clubId) === clubId &&
            asString(membership.userId) === candidate &&
            isActiveClubMembership(membership),
        );
      });
    assert.ok(outsiderUserId, 'expected user outside event club');
    const deniedList = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/attendance`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(deniedList.statusCode, 403);
    const deniedStats = await app.inject({
      method: 'GET',
      url: `/v1/events/${eventId}/attendance/stats`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(deniedStats.statusCode, 403);
    const deniedRemove = await app.inject({
      method: 'DELETE',
      url: `/v1/events/${eventId}/checkins/${memberUserId}`,
      headers: authHeaders(tables, outsiderUserId, 'parent'),
    });
    assert.equal(deniedRemove.statusCode, 403);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'event.attendance.read',
        resourceId: eventId,
        result: 'SUCCESS',
      }).length >= 2,
      true,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'event.attendance.read',
        resourceId: eventId,
        result: 'DENY',
      }).length >= 2,
      true,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'event.attendance.checkin',
        resourceId: eventId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'event.attendance.remove',
        resourceId: eventId,
        result: 'DENY',
      }).length,
      1,
    );
    const removed = await app.inject({
      method: 'DELETE',
      url: `/v1/events/${eventId}/checkins/${memberUserId}`,
      headers: authHeaders(tables, staffUserId, 'coach'),
    });
    assert.equal(removed.statusCode, 204);
    const removedAttendance = asRows(getMarketplaceSeedStore().tables.eventAttendances).find(
      (row) => asString(row.clubEventId) === eventId && asString(row.userId) === memberUserId,
    );
    assert.equal(Boolean(asString(removedAttendance?.deletedAt)), true);
    assert.equal(asString(removedAttendance?.deletedByUserId), staffUserId);

    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';
    try {
      const fixtureTables = getDbFixtureStore().tables;
      ensureRows(fixtureTables, 'eventAttendances');
      const fixtureCheckin = await app.inject({
        method: 'POST',
        url: `/v1/events/${eventId}/checkins`,
        headers: authHeaders(fixtureTables, staffUserId, 'coach'),
        payload: {
          userId: memberUserId,
          userRole: 'PARENT',
          checkInMethod: 'COACH',
          guestsCheckedIn: 0,
        },
      });
      assert.equal(fixtureCheckin.statusCode, 200);
      const fixtureList = await app.inject({
        method: 'GET',
        url: `/v1/events/${eventId}/attendance`,
        headers: authHeaders(fixtureTables, staffUserId, 'coach'),
      });
      assert.equal(fixtureList.statusCode, 200);
      const fixturePayload = fixtureList.json() as {
        attendance: Array<{ eventId: string; userId: string }>;
      };
      assert.equal(
        fixturePayload.attendance.some(
          (attendance) => attendance.eventId === eventId && attendance.userId === memberUserId,
        ),
        true,
      );
      const fixtureStats = await app.inject({
        method: 'GET',
        url: `/v1/events/${eventId}/attendance/stats`,
        headers: authHeaders(fixtureTables, staffUserId, 'coach'),
      });
      assert.equal(fixtureStats.statusCode, 200);
      assert.equal((fixtureStats.json() as { checkedInCount: number }).checkedInCount >= 1, true);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
    }
  });

  it('requires club create permission for club-linked group sessions', async () => {
    const tables = getMarketplaceSeedStore().tables;
    const activeMemberships = asRows(tables.clubMemberships).filter(isActiveClubMembership);
    const creatorMembership = activeMemberships.find((row) => {
      const userId = asString(row.userId);
      return (
        Boolean(userId) &&
        canCreateClubSessionFromMembership(row) &&
        rolesForUser(tables, userId as string).includes('coach')
      );
    });
    assert.ok(creatorMembership, 'expected club creator membership');

    const clubId = asString(creatorMembership.clubId) as string;
    const creatorUserId = asString(creatorMembership.userId) as string;
    const squadId = asString(
      asRows(tables.squads).find(
        (row) => asString(row.clubId) === clubId && !asString(row.deletedAt),
      )?.id,
    );
    assert.ok(squadId, 'expected squad for creator club');
    const otherSquadId = asString(
      asRows(tables.squads).find(
        (row) => asString(row.clubId) !== clubId && !asString(row.deletedAt),
      )?.id,
    );
    assert.ok(otherSquadId, 'expected squad from another club');
    const outsiderCoachUserId = asRows(tables.coachProfiles)
      .map((row) => asString(row.userId))
      .find(
        (userId): userId is string =>
          Boolean(userId) &&
          userId !== creatorUserId &&
          !activeMemberships.some(
            (membership) =>
              asString(membership.clubId) === clubId && asString(membership.userId) === userId,
          ),
      );
    assert.ok(outsiderCoachUserId, 'expected coach outside club');

    const payload = {
      clubId,
      squadId,
      title: 'Club Linked Authority Session',
      sessionType: 'TRAINING',
      schedule: [
        {
          date: addDaysIso(10),
          startTime: '17:00',
          endTime: '18:00',
        },
      ],
      maxParticipants: 18,
      pricePerParticipant: 15,
      currency: 'GBP',
    };

    const allowed = await app.inject({
      method: 'POST',
      url: '/v1/group-sessions',
      headers: authHeaders(tables, creatorUserId, 'coach'),
      payload: {
        ...payload,
        coachId: creatorUserId,
      },
    });
    assert.equal(allowed.statusCode, 201);
    const allowedPayload = allowed.json() as {
      groupSession: { clubId?: string; squadId?: string };
    };
    assert.equal(allowedPayload.groupSession.clubId, clubId);
    assert.equal(allowedPayload.groupSession.squadId, squadId);

    const mismatchedSquad = await app.inject({
      method: 'POST',
      url: '/v1/group-sessions',
      headers: authHeaders(tables, creatorUserId, 'coach'),
      payload: {
        ...payload,
        coachId: creatorUserId,
        squadId: otherSquadId,
      },
    });
    assert.equal(mismatchedSquad.statusCode, 404);

    const denied = await app.inject({
      method: 'POST',
      url: '/v1/group-sessions',
      headers: authHeaders(tables, outsiderCoachUserId, 'coach'),
      payload: {
        ...payload,
        coachId: outsiderCoachUserId,
      },
    });
    assert.equal(denied.statusCode, 403);

    const coachProfileUserIds = new Set(
      asRows(tables.coachProfiles)
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const assignerMembership = activeMemberships.find(
      (row) => canCreateClubSessionFromMembership(row) && canAssignClubSessionFromMembership(row),
    );
    assert.ok(assignerMembership, 'expected club assignment manager membership');
    const assignmentClubId = asString(assignerMembership.clubId) as string;
    const assignerUserId = asString(assignerMembership.userId) as string;
    const assignedCoachMembership = activeMemberships.find((row) => {
      const userId = asString(row.userId);
      return (
        asString(row.clubId) === assignmentClubId &&
        userId !== assignerUserId &&
        Boolean(userId && coachProfileUserIds.has(userId)) &&
        isActiveClubStaffMembership(row)
      );
    });
    assert.ok(assignedCoachMembership, 'expected assignable club coach membership');
    const assignedCoachUserId = asString(assignedCoachMembership.userId) as string;
    const assignmentSquadId = asString(
      asRows(tables.squads).find(
        (row) => asString(row.clubId) === assignmentClubId && !asString(row.deletedAt),
      )?.id,
    );
    assert.ok(assignmentSquadId, 'expected assignment club squad');

    const assigned = await app.inject({
      method: 'POST',
      url: '/v1/group-sessions',
      headers: authHeaders(tables, assignerUserId, 'coach'),
      payload: {
        ...payload,
        clubId: assignmentClubId,
        squadId: assignmentSquadId,
        coachId: assignedCoachUserId,
        title: 'Assigned Club Authority Session',
      },
    });
    assert.equal(assigned.statusCode, 201);
    assert.equal(
      (assigned.json() as { groupSession: { coachId: string } }).groupSession.coachId,
      assignedCoachUserId,
    );
  });

  it('registers a visible athlete for a group session and creates a linked booking', async () => {
    const tables = loadTables();
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.guardianUserId) && asString(row.athleteId),
    );
    const coachUserId = asString(asRows(tables.coachingOfferings)[0]?.coachUserId);
    const parentUserId = asString(guardianLink?.guardianUserId);
    const athleteId = asString(guardianLink?.athleteId);
    assert.ok(parentUserId, 'expected guardian user id');
    assert.ok(athleteId, 'expected linked athlete id');
    assert.ok(coachUserId, 'expected coach user id');

    const createdSession = await app.inject({
      method: 'POST',
      url: '/v1/group-sessions',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        coachId: coachUserId,
        title: 'Future Registration Authority Session',
        sessionType: 'OPEN_SESSION',
        schedule: [
          {
            date: addDaysIso(12),
            startTime: '17:00',
            endTime: '18:00',
          },
        ],
        maxParticipants: 8,
        pricePerParticipant: 15,
        currency: 'GBP',
        waitlistEnabled: true,
        inviteType: 'OPEN',
      },
    });
    assert.equal(createdSession.statusCode, 201, createdSession.body);
    const sessionId = (createdSession.json() as { groupSession: { id: string } }).groupSession.id;

    const publishedSession = await app.inject({
      method: 'PATCH',
      url: `/v1/group-sessions/${sessionId}/publish`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(publishedSession.statusCode, 200, publishedSession.body);

    const response = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/register`,
      headers: authHeaders(tables, parentUserId, 'parent'),
      payload: {
        athleteId,
        parentUserId,
      },
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json() as {
      registration: {
        athleteId: string;
        parentUserId: string;
        status: string;
      };
      booking?: { id: string; status: string; groupSessionId?: string | null } | null;
      sessionStatus: string;
    };

    assert.equal(payload.registration.athleteId, athleteId);
    assert.equal(payload.registration.parentUserId, parentUserId);
    assert.equal(payload.registration.status, 'REGISTERED');
    assert.ok(['PUBLISHED', 'FULL'].includes(payload.sessionStatus));
    assert.match(payload.booking?.id ?? '', /^bok_/);
    assert.equal(payload.booking?.status, 'CONFIRMED');
    assert.equal(payload.booking?.groupSessionId, sessionId);
  });

  it('blocks registration for unassigned club sessions before creating registration or booking rows', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const guardianLink = asRows(tables.guardianChildLinks).find(
      (row) => asString(row.guardianUserId) && asString(row.athleteId),
    );
    const clubMembership = asRows(tables.clubMemberships).find((row) =>
      isActiveClubMembership(row),
    );
    const parentUserId = asString(guardianLink?.guardianUserId);
    const athleteId = asString(guardianLink?.athleteId);
    const clubId = asString(clubMembership?.clubId);
    const creatorUserId = asString(clubMembership?.userId);
    assert.ok(parentUserId, 'expected guardian user id');
    assert.ok(athleteId, 'expected athlete id');
    assert.ok(clubId, 'expected club id');
    assert.ok(creatorUserId, 'expected club creator user id');

    const startsAt = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.parse(startsAt) + 60 * 60 * 1000).toISOString();
    const sessionId = 'gse_p0_unassigned_register_denied';
    ensureRows(tables, 'groupSessions').push({
      id: sessionId,
      coachUserId: null,
      clubId,
      squadId: null,
      recurringSeriesId: null,
      title: 'Unassigned Registration Guard',
      description: 'Should not register before staffing assignment',
      sessionType: 'TEAM_TRAINING',
      maxParticipants: 8,
      currentParticipants: 0,
      waitlistEnabled: true,
      waitlistCount: 0,
      pricePerParticipantMinor: 2500,
      currency: 'GBP',
      location: 'Authority Pitch',
      isVirtual: false,
      status: 'PUBLISHED',
      scheduleJson: [{ startsAt, endsAt }],
      focusJson: ['Passing'],
      equipmentJson: [],
      createdByUserId: creatorUserId,
      updatedByUserId: creatorUserId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedByUserId: null,
    });

    const registrationCount = ensureRows(tables, 'groupSessionRegistrations').length;
    const bookingCount = ensureRows(tables, 'bookings').length;
    const response = await app.inject({
      method: 'POST',
      url: `/v1/group-sessions/${sessionId}/register`,
      headers: authHeaders(tables, parentUserId, 'parent'),
      payload: {
        athleteId,
        parentUserId,
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(ensureRows(tables, 'groupSessionRegistrations').length, registrationCount);
    assert.equal(ensureRows(tables, 'bookings').length, bookingCount);
  });
});
