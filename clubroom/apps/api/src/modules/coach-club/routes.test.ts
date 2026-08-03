import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import {
  canManageClubMembers,
  canManageClubRole,
  canUseClubCapability,
  headCoachOversightResponseSchema,
  headCoachStandardResponseSchema,
  headCoachTaskResponseSchema,
  isClubStaffRole,
  joinClubResponseSchema,
  ownerDashboardResponseSchema,
  parseOrganizationRole,
  resolveClubJoinCodeResponseSchema,
  staffingConsoleResponseSchema,
  workAssignmentUpdateResponseSchema,
} from '@clubroom/shared-contracts';
import { buildApp } from '../../app.js';
import { getDbFixtureStore, resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';
import { resetCoachClubRouteStateForTests } from './routes.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const asRecord = (value: unknown): SeedRow | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : undefined;
function ensureTable(tables: SeedTables, key: string): SeedRow[] {
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

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

function getPrivilegedAdminOutsiderUserId(tables: SeedTables, clubId: string): string {
  const userId = asRows(tables.users)
    .map((row) => asString(row.id))
    .find((candidate): candidate is string => {
      if (!candidate || !rolesForUser(tables, candidate).includes('security_admin')) return false;
      return !asRows(tables.clubMemberships).some(
        (membership) =>
          asString(membership.clubId) === clubId &&
          asString(membership.userId) === candidate &&
          membership.active !== false,
      );
    });
  assert.ok(userId, 'expected privileged admin outsider');
  return userId;
}

function authHeaders(
  tables: SeedTables,
  userId: string,
  preferredRole?: string,
): Record<string, string> {
  const roles = rolesForUser(tables, userId);
  const actingRole = preferredRole ?? roles[0] ?? 'parent';
  return {
    'x-auth-user-id': userId,
    'x-auth-roles': roles.join(',') || actingRole,
    'x-acting-role': actingRole,
  };
}

function getSeededUserName(tables: SeedTables, userId: string): string {
  const user = asRows(tables.users).find((row) => asString(row.id) === userId);
  return asString(user?.name) ?? asString(user?.fullName) ?? asString(user?.email) ?? userId;
}

function getSeededCoachUserId(tables: SeedTables): string {
  const rulesRow = asRows(tables.schedulingRules)[0];
  const coachUserId = asString(rulesRow?.coachUserId);
  assert.ok(coachUserId, 'expected seeded coach user id');
  return coachUserId;
}

function getSeededNonCoachUserId(tables: SeedTables, excludedUserId: string): string {
  const userId = asRows(tables.users)
    .map((row) => asString(row.id))
    .find((candidateUserId): candidateUserId is string => {
      if (!candidateUserId || candidateUserId === excludedUserId) {
        return false;
      }
      return !rolesForUser(tables, candidateUserId).includes('coach');
    });
  assert.ok(userId, 'expected seeded non-coach user id');
  return userId;
}

function getSeededClubMembership(tables: SeedTables): { clubId: string; userId: string } {
  const membership = asRows(tables.clubMemberships).find((row) => row.active !== false);
  assert.ok(membership, 'expected seeded club membership');

  const clubId = asString(membership.clubId);
  const userId = asString(membership.userId);
  assert.ok(clubId, 'expected club id');
  assert.ok(userId, 'expected user id');

  return { clubId, userId };
}

function getSeededClubMatchActors(tables: SeedTables): {
  clubId: string;
  staffUserId: string;
  memberUserId: string;
  outsiderUserId: string;
} {
  const activeMemberships = asRows(tables.clubMemberships).filter(
    (row) => row.active !== false && !asString(row.deletedAt),
  );
  const privateClubs = asRows(tables.clubs).filter(
    (row) => asString(row.visibility) !== 'public' && !asString(row.deletedAt),
  );

  for (const club of privateClubs) {
    const clubId = asString(club.id);
    if (!clubId) {
      continue;
    }
    const memberships = activeMemberships.filter((row) => asString(row.clubId) === clubId);
    const staff = memberships.find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return role ? isClubStaffRole(role) : false;
    });
    const member = memberships.find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return role ? !isClubStaffRole(role) : false;
    });
    const outsider = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      if (!userId) {
        return false;
      }
      const isMember = activeMemberships.some(
        (membership) =>
          asString(membership.clubId) === clubId && asString(membership.userId) === userId,
      );
      const roles = rolesForUser(tables, userId);
      return !isMember && !roles.includes('club_admin') && !roles.includes('security_admin');
    });
    const staffUserId = asString(staff?.userId);
    const memberUserId = asString(member?.userId);
    const outsiderUserId = asString(outsider?.id);
    if (staffUserId && memberUserId && outsiderUserId) {
      return { clubId, staffUserId, memberUserId, outsiderUserId };
    }
  }

  throw new Error('expected private club with staff, member, and outsider actors');
}

function getSeededClubMemberManagementActors(tables: SeedTables): {
  clubId: string;
  managerUserId: string;
  targetUserId: string;
  outsiderUserId: string;
  newRole: string;
} {
  const activeMemberships = asRows(tables.clubMemberships).filter(
    (row) => row.active !== false && !asString(row.deletedAt),
  );
  const clubs = asRows(tables.clubs).filter((row) => !asString(row.deletedAt));

  for (const club of clubs) {
    const clubId = asString(club.id);
    if (!clubId) {
      continue;
    }
    const memberships = activeMemberships.filter((row) => asString(row.clubId) === clubId);
    const manager = memberships.find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return role ? canManageClubMembers(role) : false;
    });
    const managerRole = parseOrganizationRole(asString(manager?.role));
    if (!manager || !managerRole) {
      continue;
    }
    const target = memberships.find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return (
        asString(row.userId) !== asString(manager.userId) &&
        Boolean(role && canManageClubRole(managerRole, role))
      );
    });
    const targetRole = parseOrganizationRole(asString(target?.role));
    const outsider = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      if (!userId) {
        return false;
      }
      const isMember = activeMemberships.some(
        (membership) =>
          asString(membership.clubId) === clubId && asString(membership.userId) === userId,
      );
      const roles = rolesForUser(tables, userId);
      return !isMember && !roles.includes('club_admin') && !roles.includes('security_admin');
    });
    const managerUserId = asString(manager.userId);
    const targetUserId = asString(target?.userId);
    const outsiderUserId = asString(outsider?.id);
    if (managerUserId && targetUserId && targetRole && outsiderUserId) {
      return {
        clubId,
        managerUserId,
        targetUserId,
        outsiderUserId,
        newRole: targetRole === 'ASSISTANT' ? 'MEMBER' : 'ASSISTANT',
      };
    }
  }

  throw new Error('expected club with a member-management actor pair');
}

function getSeededClubIntegrationActors(tables: SeedTables): {
  clubId: string;
  adminUserId: string;
  outsiderUserId: string;
} {
  const activeMemberships = asRows(tables.clubMemberships).filter(
    (row) => row.active !== false && !asString(row.deletedAt),
  );
  const clubs = asRows(tables.clubs).filter((row) => !asString(row.deletedAt));

  for (const club of clubs) {
    const clubId = asString(club.id);
    if (!clubId) {
      continue;
    }
    const admin = activeMemberships.find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return asString(row.clubId) === clubId && (role === 'OWNER' || role === 'ADMIN');
    });
    const outsider = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      if (!userId) {
        return false;
      }
      const isMember = activeMemberships.some(
        (membership) =>
          asString(membership.clubId) === clubId && asString(membership.userId) === userId,
      );
      const roles = rolesForUser(tables, userId);
      return !isMember && !roles.includes('club_admin') && !roles.includes('security_admin');
    });
    const adminUserId = asString(admin?.userId);
    const outsiderUserId = asString(outsider?.id);
    if (adminUserId && outsiderUserId) {
      return { clubId, adminUserId, outsiderUserId };
    }
  }

  throw new Error('expected club with owner/admin and outsider actors');
}

function getSeededClubStaffingActors(tables: SeedTables): {
  clubId: string;
  managerUserId: string;
  deliveryCoachUserId: string;
  memberUserId: string;
  outsiderUserId: string;
} {
  const activeMemberships = asRows(tables.clubMemberships).filter(
    (row) => row.active !== false && !asString(row.deletedAt),
  );
  const clubs = asRows(tables.clubs).filter((row) => !asString(row.deletedAt));

  for (const club of clubs) {
    const clubId = asString(club.id);
    if (!clubId) {
      continue;
    }
    const memberships = activeMemberships.filter((row) => asString(row.clubId) === clubId);
    const manager = memberships.find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return Boolean(role && canUseClubCapability(role, 'assign_session_coach'));
    });
    const deliveryCoach = memberships.find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return (
        asString(row.userId) !== asString(manager?.userId) && Boolean(role && isClubStaffRole(role))
      );
    });
    const member = memberships.find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return Boolean(role && !isClubStaffRole(role));
    });
    const outsider = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      if (!userId) {
        return false;
      }
      const isMember = activeMemberships.some(
        (membership) =>
          asString(membership.clubId) === clubId && asString(membership.userId) === userId,
      );
      const roles = rolesForUser(tables, userId);
      return !isMember && !roles.includes('club_admin') && !roles.includes('security_admin');
    });
    const managerUserId = asString(manager?.userId);
    const deliveryCoachUserId = asString(deliveryCoach?.userId);
    const memberUserId = asString(member?.userId);
    const outsiderUserId = asString(outsider?.id);
    if (managerUserId && deliveryCoachUserId && memberUserId && outsiderUserId) {
      return {
        clubId,
        managerUserId,
        deliveryCoachUserId,
        memberUserId,
        outsiderUserId,
      };
    }
  }

  throw new Error('expected club with staffing manager, delivery coach, member, and outsider');
}

function getSeededClubHeadCoachActors(tables: SeedTables): {
  clubId: string;
  adminUserId: string;
  headCoachUserId: string;
  hiddenCoachUserId: string;
  memberUserId: string;
  scopedSquadId: string;
  hiddenSquadId: string;
} {
  const { clubId, managerUserId, deliveryCoachUserId, memberUserId } =
    getSeededClubStaffingActors(tables);
  const membership = asRows(tables.clubMemberships).find(
    (row) => asString(row.clubId) === clubId && asString(row.userId) === deliveryCoachUserId,
  );
  assert.ok(membership, 'expected delivery coach membership');
  membership.role = 'head_coach';

  const squads = asRows(tables.squads).filter(
    (row) => asString(row.clubId) === clubId && !asString(row.deletedAt),
  );
  assert.equal(squads.length >= 2, true, 'expected at least two seeded squads');
  const scopedSquad = squads[0];
  const hiddenSquad = squads[1];
  scopedSquad.ownerCoachUserId = deliveryCoachUserId;
  if (asString(hiddenSquad.ownerCoachUserId) === deliveryCoachUserId) {
    hiddenSquad.ownerCoachUserId = managerUserId;
  }

  return {
    clubId,
    adminUserId: managerUserId,
    headCoachUserId: deliveryCoachUserId,
    hiddenCoachUserId: asString(hiddenSquad.ownerCoachUserId) ?? managerUserId,
    memberUserId,
    scopedSquadId: asString(scopedSquad.id) as string,
    hiddenSquadId: asString(hiddenSquad.id) as string,
  };
}

function ensureLinkedAthleteForUser(tables: SeedTables, userId: string): string {
  const existing = asRows(tables.athletes).find(
    (row) => asString(row.userId) === userId && !asString(row.deletedAt),
  );
  const existingId = asString(existing?.id);
  if (existingId) {
    return existingId;
  }

  const now = new Date().toISOString();
  const athleteId = `ath_squad_${userId.replace(/[^A-Za-z0-9]/g, '_')}`;
  ensureTable(tables, 'athletes').push({
    id: athleteId,
    userId,
    displayName: `Linked athlete ${userId}`,
    status: 'active',
    createdByUserId: userId,
    updatedByUserId: userId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  });
  return athleteId;
}

function ensureClubSquadForTest(tables: SeedTables, clubId: string): string {
  const existing = asRows(tables.squads).find(
    (row) => asString(row.clubId) === clubId && !asString(row.deletedAt),
  );
  const existingId = asString(existing?.id);
  if (existingId) {
    return existingId;
  }

  const now = new Date().toISOString();
  const squadId = `sqd_test_${clubId.replace(/[^A-Za-z0-9]/g, '_')}`;
  ensureTable(tables, 'squads').push({
    id: squadId,
    clubId,
    name: 'API Test Squad',
    ageBandLabel: 'U15',
    createdByUserId: 'test',
    updatedByUserId: 'test',
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  });
  return squadId;
}

describe('coach-club routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
    resetCoachClubRouteStateForTests();
  });

  after(async () => {
    await app.close();
  });

  it('serves backend-owned coach verification status for DBS booking safety', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const approvedVerification = asRows(tables.coachVerifications).find(
      (row) => asString(row.verificationType) === 'DBS' && asString(row.status) === 'APPROVED',
    );
    assert.ok(approvedVerification, 'expected seeded approved DBS verification');
    const coachUserId = asString(approvedVerification.coachUserId) as string;

    const verified = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/verification-status`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(verified.statusCode, 200);
    const verifiedPayload = verified.json() as {
      status: {
        coachId: string;
        backgroundCheck: { status: string; expiresAt?: string };
      };
    };
    assert.equal(verifiedPayload.status.coachId, coachUserId);
    assert.equal(verifiedPayload.status.backgroundCheck.status, 'VERIFIED');
    assert.equal(typeof verifiedPayload.status.backgroundCheck.expiresAt, 'string');

    const expiredVerification = asRows(tables.coachVerifications).find(
      (row) =>
        asString(row.verificationType) === 'DBS' && asString(row.coachUserId) !== coachUserId,
    );
    assert.ok(expiredVerification, 'expected a second seeded DBS verification');
    const expiredCoachUserId = asString(expiredVerification.coachUserId) as string;
    expiredVerification.status = 'APPROVED';
    expiredVerification.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expiredVerification.updatedAt = new Date().toISOString();

    const deniedCrossCoachRead = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${expiredCoachUserId}/verification-status`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(deniedCrossCoachRead.statusCode, 403);

    const securityAdminUserId = asString(
      asRows(tables.userRoleMemberships).find(
        (row) => asString(row.role) === 'security_admin' && row.active !== false,
      )?.userId,
    );
    assert.ok(securityAdminUserId, 'expected seeded security admin');

    const expired = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${expiredCoachUserId}/verification-status`,
      headers: authHeaders(tables, securityAdminUserId, 'security_admin'),
    });
    assert.equal(expired.statusCode, 200);
    const expiredPayload = expired.json() as {
      status: { backgroundCheck: { status: string } };
    };
    assert.equal(expiredPayload.status.backgroundCheck.status, 'EXPIRED');

    const missing = await app.inject({
      method: 'GET',
      url: '/v1/coaches/usr_missing-coach/verification-status',
      headers: authHeaders(tables, securityAdminUserId, 'security_admin'),
    });
    assert.equal(missing.statusCode, 404);

    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_verification_status.read',
        resourceId: coachUserId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_verification_status.read',
        resourceId: expiredCoachUserId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_verification_status.read',
        resourceId: expiredCoachUserId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_verification_status.read',
        resourceId: 'usr_missing-coach',
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('lets security admins review coach verification evidence and audits denials', async () => {
    const tables = getMarketplaceSeedStore().tables as SeedTables;
    const coachProfile = asRows(tables.coachProfiles)[0];
    assert.ok(coachProfile, 'expected seeded coach profile');
    const coachUserId = asString(coachProfile.userId) as string;
    const securityAdminUserId = asString(
      asRows(tables.userRoleMemberships).find(
        (row) => asString(row.role) === 'security_admin' && row.active !== false,
      )?.userId,
    );
    const clubAdminUserId = asString(
      asRows(tables.userRoleMemberships).find(
        (row) => asString(row.role) === 'club_admin' && row.active !== false,
      )?.userId,
    );
    assert.ok(securityAdminUserId, 'expected seeded security admin');
    assert.ok(clubAdminUserId, 'expected seeded club admin');

    coachProfile.dbsChecked = false;
    const pendingDbsId = 'cvf_route_review_dbs';
    ensureTable(tables, 'coachVerifications').push({
      id: pendingDbsId,
      coachUserId,
      verificationType: 'DBS',
      status: 'PENDING',
      reviewedByUserId: null,
      reviewedAt: null,
      expiresAt: null,
      notes: null,
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      createdAt: '2026-07-03T12:00:00.000Z',
      updatedAt: '2026-07-03T12:00:00.000Z',
    });

    const coachDenied = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/${coachUserId}/verifications/dbs/review`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        status: 'APPROVED',
        verificationId: pendingDbsId,
      },
    });
    assert.equal(coachDenied.statusCode, 403);
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_verification.review',
        resourceId: `${coachUserId}:dbs`,
        result: 'DENY',
      }).length,
      1,
    );

    const clubAdminDenied = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/${coachUserId}/verifications/dbs/review`,
      headers: authHeaders(tables, clubAdminUserId, 'club_admin'),
      payload: {
        status: 'APPROVED',
        verificationId: pendingDbsId,
      },
    });
    assert.equal(clubAdminDenied.statusCode, 403);

    const approved = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/${coachUserId}/verifications/dbs/review`,
      headers: authHeaders(tables, securityAdminUserId, 'security_admin'),
      payload: {
        status: 'APPROVED',
        verificationId: pendingDbsId,
        expiresAt: '2029-07-03T12:00:00.000Z',
        notes: 'DBS evidence checked',
      },
    });
    assert.equal(approved.statusCode, 200);
    const approvedPayload = approved.json() as {
      verification: {
        id?: string;
        status?: string;
        reviewedByUserId?: string;
        notes?: string;
      };
      status: {
        backgroundCheck: { status: string; expiresAt?: string };
      };
    };
    assert.equal(approvedPayload.verification.id, pendingDbsId);
    assert.equal(approvedPayload.verification.status, 'APPROVED');
    assert.equal(approvedPayload.verification.reviewedByUserId, securityAdminUserId);
    assert.equal(approvedPayload.verification.notes, 'DBS evidence checked');
    assert.equal(approvedPayload.status.backgroundCheck.status, 'VERIFIED');
    assert.equal(approvedPayload.status.backgroundCheck.expiresAt, '2029-07-03T12:00:00.000Z');
    assert.equal(coachProfile.dbsChecked, true);
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_verification.review',
        resourceId: pendingDbsId,
        result: 'SUCCESS',
      }).length,
      1,
    );

    const pendingInsuranceId = 'cvf_route_review_insurance';
    ensureTable(tables, 'coachVerifications').push({
      id: pendingInsuranceId,
      coachUserId,
      verificationType: 'INSURANCE',
      status: 'PENDING',
      reviewedByUserId: null,
      reviewedAt: null,
      expiresAt: null,
      notes: null,
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      createdAt: '2026-07-03T12:05:00.000Z',
      updatedAt: '2026-07-03T12:05:00.000Z',
    });
    const rejected = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/${coachUserId}/verifications/insurance/review`,
      headers: authHeaders(tables, securityAdminUserId, 'security_admin'),
      payload: {
        status: 'REJECTED',
        verificationId: pendingInsuranceId,
        notes: 'Insurance document did not match coach identity',
      },
    });
    assert.equal(rejected.statusCode, 200);
    const rejectedPayload = rejected.json() as {
      verification: { status?: string; notes?: string };
      status: { insurance: { status: string } };
    };
    assert.equal(rejectedPayload.verification.status, 'REJECTED');
    assert.equal(
      rejectedPayload.verification.notes,
      'Insurance document did not match coach identity',
    );
    assert.equal(rejectedPayload.status.insurance.status, 'FAILED');
  });

  it('creates, updates, and soft-deletes clubs through governed v1 authority', async () => {
    const tables = loadTables();
    const ownerUserId = getSeededCoachUserId(tables);
    const outsiderUserId = getSeededNonCoachUserId(tables, ownerUserId);

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/clubs',
      headers: authHeaders(tables, ownerUserId, 'coach'),
      payload: {
        name: 'API United',
        city: 'Manchester',
        country: 'UK',
        tagline: 'Backend-owned club setup',
        joinPolicy: 'REQUEST_TO_JOIN',
        commercialMode: 'ORG_OWNED',
        firstStaffRole: 'COACH',
      },
    });
    assert.equal(createRes.statusCode, 201);
    const createdPayload = createRes.json() as {
      club: {
        id: string;
        name: string;
        city: string;
        country: string;
        tagline: string;
        commercialMode: string;
        joinPolicy: string;
        visibility: string;
      };
      membership: { clubId: string; userId: string; role: string };
      primaryInvite: { code: string; role: string };
      firstStaffInvite?: { code: string; role: string };
    };
    assert.equal(createdPayload.club.name, 'API United');
    assert.equal(createdPayload.club.city, 'Manchester');
    assert.equal(createdPayload.club.joinPolicy, 'REQUEST_TO_JOIN');
    assert.equal(createdPayload.club.commercialMode, 'ORG_OWNED');
    assert.equal(createdPayload.membership.role, 'OWNER');
    assert.equal(createdPayload.primaryInvite.role, 'MEMBER');
    assert.equal(createdPayload.firstStaffInvite?.role, 'COACH');

    const clubId = createdPayload.club.id;
    ensureTable(getMarketplaceSeedStore().tables as SeedTables, 'squads').push({
      id: 'sqd_core_club_projection',
      clubId,
      name: 'U15',
      ownerCoachUserId: ownerUserId,
      createdByUserId: ownerUserId,
      updatedByUserId: ownerUserId,
      version: 1,
      createdAt: '2026-07-31T12:00:00.000Z',
      updatedAt: '2026-07-31T12:00:00.000Z',
      deletedAt: null,
      deletedByUserId: null,
    });
    const listRes = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: authHeaders(tables, ownerUserId, 'coach'),
    });
    assert.equal(listRes.statusCode, 200);
    const listedClub = (
      listRes.json() as {
        clubs: {
          id: string;
          inviteCode: string | null;
          memberCount: number;
          coachCount: number;
          memberships?: unknown;
          squads: Record<string, unknown>[];
        }[];
      }
    ).clubs.find((club) => club.id === clubId);
    assert.deepEqual(listedClub?.squads, [{ id: 'sqd_core_club_projection' }]);
    assert.equal(listedClub?.inviteCode, createdPayload.primaryInvite.code);
    assert.equal(listedClub?.memberCount, 1);
    assert.equal(listedClub?.coachCount, 1);
    assert.equal(listedClub?.memberships, undefined);

    const detailRes = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}`,
      headers: authHeaders(tables, ownerUserId, 'coach'),
    });
    assert.equal(detailRes.statusCode, 200);
    const detailPayload = detailRes.json() as {
      club: {
        id: string;
        name: string;
        inviteCode: string | null;
        memberCount: number;
        coachCount: number;
        memberships?: unknown;
        squads: Record<string, unknown>[];
        viewerMembership?: { userId: string; role: string } | null;
        viewerGovernance?: { role: string | null };
      };
    };
    assert.equal(detailPayload.club.id, clubId);
    assert.equal(detailPayload.club.name, 'API United');
    assert.equal(detailPayload.club.inviteCode, createdPayload.primaryInvite.code);
    assert.equal(detailPayload.club.memberCount, 1);
    assert.equal(detailPayload.club.coachCount, 1);
    assert.equal(detailPayload.club.memberships, undefined);
    assert.equal(detailPayload.club.viewerMembership?.userId, ownerUserId);
    assert.equal(detailPayload.club.viewerGovernance?.role, 'OWNER');
    assert.deepEqual(detailPayload.club.squads, [{ id: 'sqd_core_club_projection' }]);

    const deniedDetail = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedDetail.statusCode, 404);

    const deniedPatch = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        city: 'Leeds',
      },
    });
    assert.equal(deniedPatch.statusCode, 403);

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}`,
      headers: authHeaders(tables, ownerUserId, 'coach'),
      payload: {
        name: 'API United FC',
        city: 'Liverpool',
        visibility: 'public',
        joinPolicy: 'OPEN',
        commercialMode: 'COACH_OWNED',
      },
    });
    assert.equal(patchRes.statusCode, 200);
    const updatedPayload = patchRes.json() as {
      club: {
        id: string;
        name: string;
        city: string;
        visibility: string;
        joinPolicy: string;
        commercialMode: string;
        squads: Record<string, unknown>[];
        viewerGovernance: { role: string | null };
      };
    };
    assert.equal(updatedPayload.club.id, clubId);
    assert.equal(updatedPayload.club.name, 'API United FC');
    assert.equal(updatedPayload.club.city, 'Liverpool');
    assert.equal(updatedPayload.club.visibility, 'public');
    assert.equal(updatedPayload.club.joinPolicy, 'OPEN');
    assert.equal(updatedPayload.club.commercialMode, 'COACH_OWNED');
    assert.deepEqual(updatedPayload.club.squads, [{ id: 'sqd_core_club_projection' }]);
    assert.equal(updatedPayload.club.viewerGovernance.role, 'OWNER');

    ensureTable(getMarketplaceSeedStore().tables as SeedTables, 'clubMemberships').push({
      id: 'clm_core_club_member_projection',
      clubId,
      userId: outsiderUserId,
      role: 'MEMBER',
      active: true,
      createdByUserId: ownerUserId,
      updatedByUserId: ownerUserId,
      version: 1,
      createdAt: '2026-07-31T12:05:00.000Z',
      updatedAt: '2026-07-31T12:05:00.000Z',
      deletedAt: null,
      deletedByUserId: null,
    });
    const memberListRes = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(memberListRes.statusCode, 200);
    const memberListedClub = (
      memberListRes.json() as {
        clubs: {
          id: string;
          inviteCode: string | null;
          memberCount: number;
          coachCount: number;
          memberships?: unknown;
          viewerMembership?: { userId: string; role: string } | null;
        }[];
      }
    ).clubs.find((club) => club.id === clubId);
    assert.equal(memberListedClub?.inviteCode, null);
    assert.equal(memberListedClub?.memberCount, 2);
    assert.equal(memberListedClub?.coachCount, 1);
    assert.equal(memberListedClub?.memberships, undefined);
    assert.equal(memberListedClub?.viewerMembership?.userId, outsiderUserId);

    const memberDetailRes = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(memberDetailRes.statusCode, 200);
    const memberDetailClub = (
      memberDetailRes.json() as {
        club: {
          inviteCode: string | null;
          memberCount: number;
          memberships?: unknown;
          viewerGovernance: { canManageMembers: boolean };
        };
      }
    ).club;
    assert.equal(memberDetailClub.inviteCode, null);
    assert.equal(memberDetailClub.memberCount, 2);
    assert.equal(memberDetailClub.memberships, undefined);
    assert.equal(memberDetailClub.viewerGovernance.canManageMembers, false);

    const deniedDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/clubs/${clubId}`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedDelete.statusCode, 403);

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/v1/clubs/${clubId}`,
      headers: authHeaders(tables, ownerUserId, 'coach'),
    });
    assert.equal(deleteRes.statusCode, 204);

    const listAfterDelete = await app.inject({
      method: 'GET',
      url: '/v1/clubs',
      headers: authHeaders(tables, ownerUserId, 'coach'),
    });
    assert.equal(listAfterDelete.statusCode, 200);
    const listPayload = listAfterDelete.json() as { clubs: Array<{ id: string }> };
    assert.equal(
      listPayload.clubs.some((club) => club.id === clubId),
      false,
    );

    const runtimeTables = getMarketplaceSeedStore().tables as SeedTables;
    assert.equal(
      auditEventsFor(runtimeTables, {
        action: 'club.create',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(runtimeTables, {
        action: 'club.update',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(runtimeTables, { action: 'club.update', resourceId: clubId, result: 'DENY' })
        .length,
      1,
    );
    assert.equal(
      auditEventsFor(runtimeTables, {
        action: 'club.archive',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(runtimeTables, { action: 'club.archive', resourceId: clubId, result: 'DENY' })
        .length,
      1,
    );
  });

  it('manages club integrations through admin-only v1 authority', async () => {
    const tables = loadTables();
    const { clubId, adminUserId, outsiderUserId } = getSeededClubIntegrationActors(tables);

    const deniedRead = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/integrations`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedRead.statusCode, 403);

    const emptyList = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/integrations`,
      headers: authHeaders(tables, adminUserId, 'coach'),
    });
    assert.equal(emptyList.statusCode, 200);
    assert.deepEqual((emptyList.json() as { integrations: unknown[] }).integrations, []);

    const secretPayload = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/integrations`,
      headers: authHeaders(tables, adminUserId, 'coach'),
      payload: {
        provider: 'matchday',
        metadataJson: {
          apiToken: 'do-not-store',
        },
      },
    });
    assert.equal(secretPayload.statusCode, 400);

    const created = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/integrations`,
      headers: authHeaders(tables, adminUserId, 'coach'),
      payload: {
        provider: 'matchday',
        status: 'DISCONNECTED',
        displayName: 'Matchday import',
        externalAccountId: 'club-123',
        metadataJson: {
          importMode: 'manual',
        },
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      integration: {
        id: string;
        clubId: string;
        provider: string;
        status: string;
        metadataJson?: { importMode?: string };
      };
    };
    assert.equal(createdPayload.integration.clubId, clubId);
    assert.equal(createdPayload.integration.provider, 'MATCHDAY');
    assert.equal(createdPayload.integration.status, 'DISCONNECTED');
    assert.equal(createdPayload.integration.metadataJson?.importMode, 'manual');

    const duplicate = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/integrations`,
      headers: authHeaders(tables, adminUserId, 'coach'),
      payload: {
        provider: 'MATCHDAY',
      },
    });
    assert.equal(duplicate.statusCode, 409);

    const deniedUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/integrations`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        provider: 'MATCHDAY',
        status: 'CONNECTED',
      },
    });
    assert.equal(deniedUpdate.statusCode, 403);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/integrations`,
      headers: authHeaders(tables, adminUserId, 'coach'),
      payload: {
        provider: 'MATCHDAY',
        status: 'NEEDS_REAUTH',
        displayName: 'Matchday sync',
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedPayload = updated.json() as {
      integration: { provider: string; status: string; displayName: string };
    };
    assert.equal(updatedPayload.integration.provider, 'MATCHDAY');
    assert.equal(updatedPayload.integration.status, 'NEEDS_REAUTH');
    assert.equal(updatedPayload.integration.displayName, 'Matchday sync');

    const runtimeTables = getMarketplaceSeedStore().tables as SeedTables;
    assert.equal(
      auditEventsFor(runtimeTables, {
        action: 'club_integration.read',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(runtimeTables, {
        action: 'club_integration.create',
        resourceId: `${clubId}:MATCHDAY`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(runtimeTables, {
        action: 'club_integration.update',
        resourceId: `${clubId}:MATCHDAY`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(runtimeTables, {
        action: 'club_integration.update',
        resourceId: `${clubId}:MATCHDAY`,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('returns a unified club schedule for an active member', async () => {
    const tables = loadTables();
    const { clubId, userId } = getSeededClubMembership(tables);

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(res.statusCode, 200);

    const payload = res.json() as {
      clubId: string;
      activities: Array<{ source: string; kind: string; startsAt: string }>;
      total: number;
    };
    assert.equal(payload.clubId, clubId);
    assert.equal(payload.total >= 2, true);
    assert.equal(
      payload.activities.some((activity) => activity.source === 'club_event'),
      true,
    );
    assert.equal(
      payload.activities.some((activity) => activity.source === 'group_session'),
      true,
    );
    assert.equal(
      payload.activities.some((activity) => activity.kind === 'informational'),
      true,
    );
    assert.equal(
      payload.activities.some((activity) => activity.kind === 'training'),
      true,
    );

    const sorted = payload.activities.every((activity, index, items) => {
      if (index === 0) return true;
      return new Date(items[index - 1].startsAt).getTime() <= new Date(activity.startsAt).getTime();
    });
    assert.equal(sorted, true);
  });

  it('keeps training-named club events separate from group sessions in club schedule', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, userId } = getSeededClubMembership(tables);
    const eventId = 'cle_training_named_event_not_session';

    ensureTable(tables, 'clubEvents').push({
      id: eventId,
      clubId,
      creatorUserId: userId,
      title: 'Holiday Training Camp Info',
      description: 'RSVP briefing for the holiday camp.',
      startsAt: `${addDaysIso(14)}T09:00:00.000Z`,
      endsAt: `${addDaysIso(14)}T10:00:00.000Z`,
      location: 'Clubhouse',
      status: 'PUBLISHED',
      visibility: 'club',
      metadataJson: { type: 'training_camp', priceMinor: 0, currency: 'GBP' },
      squadIdsJson: [],
      createdByUserId: userId,
      updatedByUserId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(res.statusCode, 200);

    const payload = res.json() as {
      activities: Array<{
        id: string;
        source: string;
        sourceEntityId: string;
        kind: string;
        typeLabel: string;
        participationMode: string;
        allowsExternalRegistration: boolean;
      }>;
    };
    const activity = payload.activities.find((candidate) => candidate.sourceEntityId === eventId);

    assert.ok(activity, 'expected training-named event in club schedule');
    assert.equal(activity.source, 'club_event');
    assert.equal(activity.kind, 'informational');
    assert.equal(activity.typeLabel, 'Training Camp');
    assert.equal(activity.participationMode, 'rsvp');
    assert.equal(activity.allowsExternalRegistration, false);
    assert.equal(
      payload.activities.some(
        (candidate) => candidate.source === 'group_session' && candidate.sourceEntityId === eventId,
      ),
      false,
    );
  });

  it('keeps non-RSVP club events info-only in club schedule', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, userId } = getSeededClubMembership(tables);
    const eventId = 'cle_info_only_schedule_event';

    ensureTable(tables, 'clubEvents').push({
      id: eventId,
      clubId,
      creatorUserId: userId,
      title: 'Boot Room Notice',
      description: 'Pitch access update.',
      startsAt: `${addDaysIso(15)}T18:00:00.000Z`,
      endsAt: `${addDaysIso(15)}T18:15:00.000Z`,
      location: 'Clubhouse',
      status: 'PUBLISHED',
      visibility: 'club',
      metadataJson: { type: 'presentation', rsvpRequired: false },
      squadIdsJson: [],
      createdByUserId: userId,
      updatedByUserId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(res.statusCode, 200);

    const payload = res.json() as {
      activities: Array<{
        sourceEntityId: string;
        participationMode: string;
        participationLabel: string;
        allowsExternalRegistration: boolean;
      }>;
    };
    const activity = payload.activities.find((candidate) => candidate.sourceEntityId === eventId);

    assert.ok(activity, 'expected info-only event in club schedule');
    assert.equal(activity.participationMode, 'none');
    assert.equal(activity.participationLabel, 'Info only');
    assert.equal(activity.allowsExternalRegistration, false);
  });

  it('denies club schedule access to non-members of a private club', async () => {
    const tables = loadTables();
    const { clubId } = getSeededClubMembership(tables);
    const outsider = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      if (!userId) {
        return false;
      }

      const roles = rolesForUser(tables, userId);
      const isMember = asRows(tables.clubMemberships).some(
        (candidate) =>
          asString(candidate.clubId) === clubId &&
          asString(candidate.userId) === userId &&
          candidate.active !== false,
      );
      return !isMember && !roles.includes('club_admin') && !roles.includes('security_admin');
    });
    assert.ok(outsider, 'expected non-member outsider');

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, asString(outsider.id) as string),
    });
    assert.equal(denied.statusCode, 403);
  });

  it('allows privileged admins to read club schedules without membership', async () => {
    const tables = loadTables();
    const { clubId } = getSeededClubMembership(tables);
    const privilegedAdmin = asRows(tables.users).find((row) => {
      const userId = asString(row.id);
      if (!userId) {
        return false;
      }
      const roles = rolesForUser(tables, userId);
      const isMember = asRows(tables.clubMemberships).some(
        (candidate) =>
          asString(candidate.clubId) === clubId &&
          asString(candidate.userId) === userId &&
          candidate.active !== false,
      );
      return !isMember && roles.includes('security_admin');
    });
    assert.ok(privilegedAdmin, 'expected privileged admin outsider');

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, asString(privilegedAdmin.id) as string, 'security_admin'),
    });
    assert.equal(res.statusCode, 200);
  });

  it('returns live staffing console work for assignment-capable club staff', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, managerUserId, deliveryCoachUserId, memberUserId, outsiderUserId } =
      getSeededClubStaffingActors(tables);
    const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.parse(startsAt) + 90 * 60 * 1000).toISOString();
    const sessionId = 'gse_staffing_console_test';

    ensureTable(tables, 'groupSessions').push({
      id: sessionId,
      coachUserId: deliveryCoachUserId,
      clubId,
      squadId: null,
      recurringSeriesId: null,
      title: 'Staffing Console Training',
      description: 'Route test session',
      sessionType: 'TEAM_TRAINING',
      maxParticipants: 16,
      currentParticipants: 3,
      waitlistEnabled: true,
      waitlistCount: 0,
      pricePerParticipantMinor: 0,
      currency: 'GBP',
      location: 'Main Pitch',
      isVirtual: false,
      status: 'PUBLISHED',
      scheduleJson: [{ startsAt, endsAt }],
      focusJson: [],
      equipmentJson: [],
      createdByUserId: managerUserId,
      updatedByUserId: managerUserId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(tables, 'bookings').push({
      id: 'book_staffing_console_test',
      coachUserId: deliveryCoachUserId,
      bookedByUserId: memberUserId,
      clubId,
      status: 'CONFIRMED',
      scheduledAt: startsAt,
      durationMinutes: 90,
      location: 'Main Pitch',
      serviceType: 'TEAM_TRAINING',
      groupSessionId: sessionId,
      createdByUserId: managerUserId,
      updatedByUserId: managerUserId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedByUserId: null,
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/staffing-console`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(res.statusCode, 200);
    const payload = staffingConsoleResponseSchema.parse(res.json());
    assert.equal(payload.club.id, clubId);
    assert.ok(payload.viewerMembership);
    assert.notEqual(payload.viewerMembership.role, 'MEMBER');
    assert.equal(
      payload.privilegedAdminAccess,
      rolesForUser(tables, managerUserId).some((role) =>
        ['club_admin', 'admin', 'security_admin'].includes(role),
      ),
    );
    assert.equal(payload.canManageAssignments, true);
    assert.equal(
      payload.staff.some(
        (member) =>
          member.userId === deliveryCoachUserId &&
          member.upcomingLoad >= 1 &&
          member.nextSessionAt === startsAt,
      ),
      true,
    );
    const assignedWork = payload.assignedWork.find((item) => item.offeringId === sessionId);
    assert.ok(assignedWork, 'expected staffing work item');
    assert.equal(assignedWork.assigneeCoachId, deliveryCoachUserId);
    assert.equal(assignedWork.linkedBookingCount, 1);
    assert.equal(assignedWork.status, 'active');
    assert.equal(
      payload.unassignedWork.some((item) => item.offeringId === sessionId),
      false,
    );
    assert.equal(payload.summary.activeOrgSessions >= 1, true);
    assert.equal(payload.summary.unassignedCount, 0);
    assert.equal('inviteCode' in payload.club, false);
    assert.equal('joinSource' in payload.viewerMembership, false);
    assert.equal('ownerCoachId' in assignedWork, false);

    const memberDenied = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/staffing-console`,
      headers: authHeaders(tables, memberUserId),
    });
    assert.equal(memberDenied.statusCode, 403);

    const outsiderDenied = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/staffing-console`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(outsiderDenied.statusCode, 403);

    const privilegedAdminUserId = getPrivilegedAdminOutsiderUserId(tables, clubId);
    const privilegedView = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/staffing-console`,
      headers: authHeaders(tables, privilegedAdminUserId, 'security_admin'),
    });
    assert.equal(privilegedView.statusCode, 200);
    const privilegedPayload = staffingConsoleResponseSchema.parse(privilegedView.json());
    assert.equal(privilegedPayload.viewerMembership, null);
    assert.equal(privilegedPayload.privilegedAdminAccess, true);
    assert.equal(privilegedPayload.canManageAssignments, true);
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_staffing_console.read',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
  });

  it('reassigns club work plus mutable linked bookings and invoices through governed v1 authority', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, managerUserId, deliveryCoachUserId, memberUserId } =
      getSeededClubStaffingActors(tables);
    const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.parse(startsAt) + 60 * 60 * 1000).toISOString();
    const sessionId = 'gse_staffing_reassign_test';
    const bookingId = 'book_staffing_reassign_test';
    const completedBookingId = 'book_staffing_reassign_completed_test';
    const invoiceId = 'invc_staffing_reassign_test';
    const completedInvoiceId = 'invc_staffing_reassign_completed_test';

    ensureTable(tables, 'groupSessions').push({
      id: sessionId,
      coachUserId: deliveryCoachUserId,
      clubId,
      squadId: null,
      recurringSeriesId: null,
      title: 'Reassignable Club Training',
      description: 'Route test reassignment session',
      sessionType: 'TEAM_TRAINING',
      maxParticipants: 14,
      currentParticipants: 2,
      waitlistEnabled: true,
      waitlistCount: 0,
      pricePerParticipantMinor: 0,
      currency: 'GBP',
      location: 'Training Pitch',
      isVirtual: false,
      status: 'PUBLISHED',
      scheduleJson: [{ startsAt, endsAt }],
      focusJson: [],
      equipmentJson: [],
      createdByUserId: managerUserId,
      updatedByUserId: managerUserId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(tables, 'bookings').push({
      id: bookingId,
      coachUserId: deliveryCoachUserId,
      coachName: 'Original Coach',
      bookedByUserId: memberUserId,
      clubId,
      status: 'CONFIRMED',
      scheduledAt: startsAt,
      durationMinutes: 60,
      location: 'Training Pitch',
      serviceType: 'TEAM_TRAINING',
      groupSessionId: sessionId,
      createdByUserId: managerUserId,
      updatedByUserId: managerUserId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(tables, 'bookings').push({
      id: completedBookingId,
      coachUserId: deliveryCoachUserId,
      coachName: 'Original Coach',
      bookedByUserId: memberUserId,
      clubId,
      status: 'COMPLETED',
      scheduledAt: startsAt,
      durationMinutes: 60,
      location: 'Training Pitch',
      serviceType: 'TEAM_TRAINING',
      groupSessionId: sessionId,
      createdByUserId: managerUserId,
      updatedByUserId: managerUserId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(tables, 'invoices').push(
      {
        id: invoiceId,
        invoiceNumber: 'INV-STAFFING-REASSIGN-TEST',
        bookingId,
        coachUserId: deliveryCoachUserId,
        payerUserId: memberUserId,
        athleteId: null,
        status: 'SENT',
        sessionDate: startsAt,
        sessionType: 'TEAM_TRAINING',
        sessionLocation: 'Training Pitch',
        sessionDurationMinutes: 60,
        subtotalMinor: 1000,
        taxMinor: 0,
        taxRatePercent: 0,
        totalMinor: 1000,
        currency: 'GBP',
        dueDate: endsAt,
        sentAt: null,
        paidAt: null,
        voidedAt: null,
        voidReason: null,
        notes: null,
        createdByUserId: managerUserId,
        updatedByUserId: managerUserId,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        deletedByUserId: null,
      },
      {
        id: completedInvoiceId,
        invoiceNumber: 'INV-STAFFING-REASSIGN-COMPLETED-TEST',
        bookingId: completedBookingId,
        coachUserId: deliveryCoachUserId,
        payerUserId: memberUserId,
        athleteId: null,
        status: 'PAID',
        sessionDate: startsAt,
        sessionType: 'TEAM_TRAINING',
        sessionLocation: 'Training Pitch',
        sessionDurationMinutes: 60,
        subtotalMinor: 1000,
        taxMinor: 0,
        taxRatePercent: 0,
        totalMinor: 1000,
        currency: 'GBP',
        dueDate: endsAt,
        sentAt: startsAt,
        paidAt: endsAt,
        voidedAt: null,
        voidReason: null,
        notes: null,
        createdByUserId: managerUserId,
        updatedByUserId: managerUserId,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        deletedByUserId: null,
      },
    );

    const deniedActor = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/work-assignments/${sessionId}`,
      headers: authHeaders(tables, memberUserId),
      payload: {
        assigneeCoachId: managerUserId,
      },
    });
    assert.equal(deniedActor.statusCode, 403);

    const deniedTarget = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/work-assignments/${sessionId}`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        assigneeCoachId: memberUserId,
      },
    });
    assert.equal(deniedTarget.statusCode, 403);

    const malformedHeaders = authHeaders(tables, managerUserId);
    malformedHeaders['content-type'] = 'application/json';
    const malformedOptions: {
      method: 'PATCH';
      url: string;
      headers: Record<string, string>;
      payload: string;
    } = {
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/work-assignments/${sessionId}`,
      headers: malformedHeaders,
      payload: JSON.stringify({
        assigneeCoachId: managerUserId,
        offering: {},
      }),
    };
    const malformedRequest = await app.inject(malformedOptions);
    assert.equal(malformedRequest.statusCode, 400);

    const reassigned = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/work-assignments/${sessionId}`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        assigneeCoachId: managerUserId,
      },
    });
    assert.equal(reassigned.statusCode, 200);
    const payload = workAssignmentUpdateResponseSchema.parse(reassigned.json());
    assert.equal(payload.clubId, clubId);
    assert.equal(payload.assignmentId, sessionId);
    assert.equal(payload.previousCoachUserId, deliveryCoachUserId);
    assert.equal(payload.assigneeCoachId, managerUserId);
    assert.deepEqual(payload.updatedBookingIds, [bookingId]);
    assert.ok(payload.requestId);

    const session = asRows(tables.groupSessions).find((row) => asString(row.id) === sessionId);
    const booking = asRows(tables.bookings).find((row) => asString(row.id) === bookingId);
    const completedBooking = asRows(tables.bookings).find(
      (row) => asString(row.id) === completedBookingId,
    );
    const invoice = asRows(tables.invoices).find((row) => asString(row.id) === invoiceId);
    const completedInvoice = asRows(tables.invoices).find(
      (row) => asString(row.id) === completedInvoiceId,
    );
    assert.equal(asString(session?.coachUserId), managerUserId);
    assert.equal(asString(booking?.coachUserId), managerUserId);
    assert.equal(asString(booking?.coachName), getSeededUserName(tables, managerUserId));
    assert.equal(asString(completedBooking?.coachUserId), deliveryCoachUserId);
    assert.equal(asString(completedBooking?.coachName), 'Original Coach');
    assert.equal(asString(invoice?.coachUserId), managerUserId);
    assert.equal(asNumber(invoice?.version), 2);
    assert.equal(asString(completedInvoice?.coachUserId), deliveryCoachUserId);
    assert.equal(asNumber(completedInvoice?.version), 1);
    const reassignmentEvent = asRows(tables.bookingStatusEvents).find(
      (row) =>
        asString(row.bookingId) === bookingId &&
        asRecord(row.metadataJson)?.source === 'club-work-assignment',
    );
    const reassignmentMetadata = asRecord(reassignmentEvent?.metadataJson);
    assert.equal(asString(reassignmentEvent?.fromStatus), 'CONFIRMED');
    assert.equal(asString(reassignmentEvent?.toStatus), 'CONFIRMED');
    assert.equal(asString(reassignmentEvent?.actorUserId), managerUserId);
    assert.equal(asString(reassignmentMetadata?.previousCoachUserId), deliveryCoachUserId);
    assert.equal(asString(reassignmentMetadata?.assigneeCoachId), managerUserId);
    assert.equal(asString(reassignmentMetadata?.groupSessionId), sessionId);
    assert.equal(
      asRows(tables.bookingStatusEvents).some(
        (row) =>
          asString(row.bookingId) === completedBookingId &&
          asRecord(row.metadataJson)?.source === 'club-work-assignment',
      ),
      false,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_work_assignment.update',
        resourceId: sessionId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_work_assignment.update',
        resourceId: sessionId,
        result: 'DENY',
      }).length,
      3,
    );

    const historyResponse = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/work-assignments/${sessionId}/history`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(historyResponse.statusCode, 200);
    const historyPayload = historyResponse.json() as {
      clubId: string;
      assignmentId: string;
      events: Array<{
        id: string;
        action: string;
        timestamp: string;
        actorUserId?: string;
        actorName?: string;
        actorRole?: string;
        fromCoachId?: string;
        toCoachId: string;
      }>;
      total: number;
      truncated: boolean;
      requestId: string;
    };
    assert.equal(historyPayload.clubId, clubId);
    assert.equal(historyPayload.assignmentId, sessionId);
    assert.equal(historyPayload.total, 1);
    assert.equal(historyPayload.truncated, false);
    assert.equal(historyPayload.events[0]?.action, 'REASSIGNED');
    assert.equal(historyPayload.events[0]?.actorUserId, managerUserId);
    assert.equal(historyPayload.events[0]?.actorName, getSeededUserName(tables, managerUserId));
    assert.equal(
      historyPayload.events[0]?.actorRole,
      rolesForUser(tables, managerUserId)[0]?.includes('admin') ? 'ADMIN' : 'COACH',
    );
    assert.equal(historyPayload.events[0]?.fromCoachId, deliveryCoachUserId);
    assert.equal(historyPayload.events[0]?.toCoachId, managerUserId);
    assert.equal(Number.isNaN(Date.parse(historyPayload.events[0]?.timestamp ?? '')), false);
    assert.ok(historyPayload.requestId);

    const historyDenied = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/work-assignments/${sessionId}/history`,
      headers: authHeaders(tables, memberUserId),
    });
    assert.equal(historyDenied.statusCode, 403);
    const successfulHistoryReadAudit = auditEventsFor(tables, {
      action: 'club_work_assignment.history.read',
      resourceId: sessionId,
      result: 'SUCCESS',
    });
    assert.equal(successfulHistoryReadAudit.length, 1);
    assert.equal(successfulHistoryReadAudit[0]?.sensitiveRead, true);
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_work_assignment.history.read',
        resourceId: sessionId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('assigns unassigned club work through governed v1 authority', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, managerUserId, deliveryCoachUserId, memberUserId } =
      getSeededClubStaffingActors(tables);
    const sessionId = 'gse_staffing_assign_unassigned_test';

    ensureTable(tables, 'groupSessions').push({
      id: sessionId,
      coachUserId: null,
      clubId,
      squadId: null,
      recurringSeriesId: null,
      title: 'Unassigned Club Training',
      description: 'Route test unassigned session',
      sessionType: 'TEAM_TRAINING',
      maxParticipants: 14,
      currentParticipants: 0,
      waitlistEnabled: true,
      waitlistCount: 0,
      pricePerParticipantMinor: 0,
      currency: 'GBP',
      location: null,
      isVirtual: false,
      status: 'PUBLISHED',
      scheduleJson: [],
      focusJson: [],
      equipmentJson: [],
      createdByUserId: managerUserId,
      updatedByUserId: managerUserId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedByUserId: null,
    });

    const consoleResponse = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/staffing-console`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(consoleResponse.statusCode, 200);
    const consolePayload = staffingConsoleResponseSchema.parse(consoleResponse.json());
    const unassignedItem = consolePayload.unassignedWork.find(
      (item) => item.offeringId === sessionId,
    );
    assert.ok(unassignedItem, 'expected unassigned work item');
    assert.equal(unassignedItem.assigneeCoachId, null);
    assert.equal(unassignedItem.scheduledAt, null);
    assert.equal(unassignedItem.location, null);
    assert.equal(consolePayload.summary.unassignedCount >= 1, true);

    const deniedActor = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/work-assignments/${sessionId}`,
      headers: authHeaders(tables, memberUserId),
      payload: {
        assigneeCoachId: deliveryCoachUserId,
      },
    });
    assert.equal(deniedActor.statusCode, 403);

    const assigned = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/work-assignments/${sessionId}`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        assigneeCoachId: deliveryCoachUserId,
      },
    });
    assert.equal(assigned.statusCode, 200);
    const assignedPayload = workAssignmentUpdateResponseSchema.parse(assigned.json());
    assert.equal(assignedPayload.clubId, clubId);
    assert.equal(assignedPayload.assignmentId, sessionId);
    assert.equal(assignedPayload.assigneeCoachId, deliveryCoachUserId);
    assert.equal(assignedPayload.previousCoachUserId, null);
    assert.deepEqual(assignedPayload.updatedBookingIds, []);
    assert.ok(assignedPayload.requestId);

    const session = asRows(tables.groupSessions).find((row) => asString(row.id) === sessionId);
    assert.equal(asString(session?.coachUserId), deliveryCoachUserId);
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_work_assignment.update',
        resourceId: sessionId,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('returns live head-coach oversight and persists scoped task/standard mutations', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const {
      clubId,
      adminUserId,
      headCoachUserId,
      hiddenCoachUserId,
      memberUserId,
      scopedSquadId,
      hiddenSquadId,
    } = getSeededClubHeadCoachActors(tables);
    const athleteRows = asRows(tables.athletes);
    const scopedAthleteId = asString(athleteRows[0]?.id);
    const hiddenAthleteId = asString(athleteRows[1]?.id);
    assert.ok(scopedAthleteId, 'expected scoped athlete');
    assert.ok(hiddenAthleteId, 'expected hidden athlete');
    const scheduledAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.parse(scheduledAt) + 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const scopedSessionId = 'gse_head_coach_scoped_test';
    const hiddenSessionId = 'gse_head_coach_hidden_test';
    const scopedBookingId = 'book_head_coach_scoped_test';
    const hiddenBookingId = 'book_head_coach_hidden_test';

    ensureTable(tables, 'groupSessions').push(
      {
        id: scopedSessionId,
        coachUserId: headCoachUserId,
        clubId,
        squadId: scopedSquadId,
        recurringSeriesId: null,
        title: 'Scoped U12 Completion',
        description: 'Head coach visible session',
        sessionType: 'TEAM_TRAINING',
        maxParticipants: 12,
        currentParticipants: 1,
        waitlistEnabled: true,
        waitlistCount: 0,
        location: 'Pitch 1',
        isVirtual: false,
        status: 'COMPLETED',
        scheduleJson: [{ startsAt: scheduledAt, endsAt }],
        focusJson: [],
        equipmentJson: [],
        createdByUserId: adminUserId,
        updatedByUserId: adminUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      },
      {
        id: hiddenSessionId,
        coachUserId: hiddenCoachUserId,
        clubId,
        squadId: hiddenSquadId,
        recurringSeriesId: null,
        title: 'Hidden U14 Completion',
        description: 'Head coach hidden session',
        sessionType: 'TEAM_TRAINING',
        maxParticipants: 12,
        currentParticipants: 1,
        waitlistEnabled: true,
        waitlistCount: 0,
        location: 'Pitch 2',
        isVirtual: false,
        status: 'COMPLETED',
        scheduleJson: [{ startsAt: scheduledAt, endsAt }],
        focusJson: [],
        equipmentJson: [],
        createdByUserId: adminUserId,
        updatedByUserId: adminUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      },
    );
    ensureTable(tables, 'bookings').push(
      {
        id: scopedBookingId,
        coachUserId: headCoachUserId,
        bookedByUserId: memberUserId,
        clubId,
        status: 'AWAITING_COMPLETION',
        scheduledAt,
        durationMinutes: 60,
        location: 'Pitch 1',
        serviceType: 'TEAM_TRAINING',
        groupSessionId: scopedSessionId,
        createdByUserId: adminUserId,
        updatedByUserId: adminUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      },
      {
        id: hiddenBookingId,
        coachUserId: hiddenCoachUserId,
        bookedByUserId: memberUserId,
        clubId,
        status: 'AWAITING_COMPLETION',
        scheduledAt,
        durationMinutes: 60,
        location: 'Pitch 2',
        serviceType: 'TEAM_TRAINING',
        groupSessionId: hiddenSessionId,
        createdByUserId: adminUserId,
        updatedByUserId: adminUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      },
    );
    ensureTable(tables, 'bookingParticipants').push(
      {
        id: 'bkp_head_coach_scoped_test',
        bookingId: scopedBookingId,
        athleteId: scopedAthleteId,
        status: 'confirmed',
        createdByUserId: adminUserId,
        updatedByUserId: adminUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      },
      {
        id: 'bkp_head_coach_hidden_test',
        bookingId: hiddenBookingId,
        athleteId: hiddenAthleteId,
        status: 'confirmed',
        createdByUserId: adminUserId,
        updatedByUserId: adminUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      },
    );

    const deniedMember = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/head-coach/oversight`,
      headers: authHeaders(tables, memberUserId),
    });
    assert.equal(deniedMember.statusCode, 403);

    const adminView = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/head-coach/oversight`,
      headers: authHeaders(tables, adminUserId),
    });
    assert.equal(adminView.statusCode, 200);
    const adminPayload = headCoachOversightResponseSchema.parse(adminView.json());
    assert.equal(adminPayload.scope.type, 'club');
    assert.equal(
      adminPayload.completionQueue.some((item) => item.bookingId === scopedBookingId),
      true,
    );
    assert.equal(
      adminPayload.completionQueue.some((item) => item.bookingId === hiddenBookingId),
      true,
    );

    const headCoachView = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/head-coach/oversight`,
      headers: authHeaders(tables, headCoachUserId),
    });
    assert.equal(headCoachView.statusCode, 200);
    const headCoachPayload = headCoachOversightResponseSchema.parse(headCoachView.json());
    assert.equal(headCoachPayload.scope.type, 'assigned_squads');
    assert.deepEqual(headCoachPayload.scope.squadIds, [scopedSquadId]);
    assert.deepEqual(
      headCoachPayload.completionQueue.map((item) => item.bookingId),
      [scopedBookingId],
    );
    assert.equal(headCoachPayload.completionQueue[0]?.squadId, scopedSquadId);
    assert.equal(
      headCoachPayload.squads.every((squad) => squad.id === scopedSquadId),
      true,
    );
    assert.equal(
      headCoachPayload.coachHealth.some((coach) => coach.coachId === hiddenCoachUserId),
      false,
    );
    assert.deepEqual(headCoachPayload.tasks, []);
    assert.deepEqual(headCoachPayload.standards, []);
    assert.deepEqual(headCoachPayload.watchlist, []);

    const deniedMemberTask = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/head-coach/tasks`,
      headers: authHeaders(tables, memberUserId),
      payload: {
        coachId: headCoachUserId,
        type: 'session_note_expectation',
        bookingId: scopedBookingId,
        title: 'Member should not create this',
      },
    });
    assert.equal(deniedMemberTask.statusCode, 403);

    const deniedHiddenTask = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/head-coach/tasks`,
      headers: authHeaders(tables, headCoachUserId),
      payload: {
        coachId: hiddenCoachUserId,
        type: 'session_note_expectation',
        bookingId: hiddenBookingId,
        title: 'Hidden task',
      },
    });
    assert.equal(deniedHiddenTask.statusCode, 403);

    const rejectedUnknownTaskField = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/head-coach/tasks`,
      headers: authHeaders(tables, headCoachUserId),
      payload: {
        coachId: headCoachUserId,
        type: 'session_note_expectation',
        bookingId: scopedBookingId,
        unsupported: true,
      },
    });
    assert.equal(rejectedUnknownTaskField.statusCode, 400);

    const createdTask = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/head-coach/tasks`,
      headers: authHeaders(tables, headCoachUserId),
      payload: {
        coachId: headCoachUserId,
        type: 'session_note_expectation',
        bookingId: scopedBookingId,
        title: 'Submit scoped session notes',
        details: 'Raised from route test',
      },
    });
    assert.equal(createdTask.statusCode, 201);
    const createdTaskPayload = headCoachTaskResponseSchema.parse(createdTask.json());
    assert.equal(createdTaskPayload.coachId, headCoachUserId);
    assert.equal(createdTaskPayload.status, 'open');
    assert.equal(createdTaskPayload.bookingId, scopedBookingId);
    assert.equal(createdTaskPayload.squadId, scopedSquadId);

    const storedTask = asRows(tables.headCoachTasks).find(
      (row) => asString(row.id) === createdTaskPayload.id,
    );
    assert.equal(asString(storedTask?.clubId), clubId);
    assert.equal(asString(storedTask?.createdByUserId), headCoachUserId);

    const createdFollowUpTask = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/head-coach/tasks`,
      headers: authHeaders(tables, headCoachUserId),
      payload: {
        coachId: headCoachUserId,
        type: 'required_follow_up',
        athleteId: scopedAthleteId,
        athleteName: 'Scoped Athlete',
        bookingId: scopedBookingId,
        dueAt: scheduledAt,
        title: 'Follow up with scoped athlete',
        details: 'Route test follow-up pressure',
      },
    });
    assert.equal(createdFollowUpTask.statusCode, 201);
    const createdFollowUpTaskPayload = headCoachTaskResponseSchema.parse(
      createdFollowUpTask.json(),
    );
    assert.equal(createdFollowUpTaskPayload.athleteId, scopedAthleteId);
    assert.equal(createdFollowUpTaskPayload.status, 'open');
    assert.equal(createdFollowUpTaskPayload.type, 'required_follow_up');

    const completedTask = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/head-coach/tasks/${createdTaskPayload.id}`,
      headers: authHeaders(tables, headCoachUserId),
      payload: {
        status: 'done',
      },
    });
    assert.equal(completedTask.statusCode, 200);
    const completedTaskPayload = headCoachTaskResponseSchema.parse(completedTask.json());
    assert.equal(completedTaskPayload.status, 'done');
    assert.equal(completedTaskPayload.completedByUserId, headCoachUserId);

    const createdStandard = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/head-coach/standards`,
      headers: authHeaders(tables, headCoachUserId),
      payload: {
        title: 'Session notes within 24 hours',
        description: 'All assigned-squad sessions need notes',
        category: 'session_notes',
      },
    });
    assert.equal(createdStandard.statusCode, 201);
    const createdStandardPayload = headCoachStandardResponseSchema.parse(createdStandard.json());
    assert.equal(createdStandardPayload.active, true);

    const pausedStandard = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/head-coach/standards/${createdStandardPayload.id}`,
      headers: authHeaders(tables, headCoachUserId),
      payload: {
        active: false,
      },
    });
    assert.equal(pausedStandard.statusCode, 200);
    assert.equal(headCoachStandardResponseSchema.parse(pausedStandard.json()).active, false);

    const refreshedHeadCoachView = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/head-coach/oversight`,
      headers: authHeaders(tables, headCoachUserId),
    });
    assert.equal(refreshedHeadCoachView.statusCode, 200);
    const refreshedPayload = headCoachOversightResponseSchema.parse(refreshedHeadCoachView.json());
    assert.equal(
      refreshedPayload.tasks.some(
        (task) => task.id === createdTaskPayload.id && task.status === 'done',
      ),
      true,
    );
    assert.equal(
      refreshedPayload.standards.some(
        (standard) => standard.id === createdStandardPayload.id && !standard.active,
      ),
      true,
    );
    assert.equal(refreshedPayload.summary.openTaskCount, 1);
    assert.equal(refreshedPayload.summary.activeStandardCount, 0);
    assert.equal(refreshedPayload.summary.watchAthleteCount, 1);
    assert.equal(refreshedPayload.summary.overdueFollowUpCount, 1);
    assert.equal(refreshedPayload.watchlist.length, 1);
    assert.equal(refreshedPayload.watchlist[0]?.athleteId, scopedAthleteId);
    assert.equal(refreshedPayload.watchlist[0]?.coachId, headCoachUserId);
    assert.equal(refreshedPayload.watchlist[0]?.risk, 'high');
    assert.equal(refreshedPayload.watchlist[0]?.overdueCount, 1);
    assert.deepEqual(refreshedPayload.watchlist[0]?.taskIds, [createdFollowUpTaskPayload.id]);
    assert.equal(
      refreshedPayload.coachHealth.find((coach) => coach.coachId === headCoachUserId)
        ?.watchAthleteCount,
      1,
    );
    assert.equal(
      refreshedPayload.coachHealth.find((coach) => coach.coachId === headCoachUserId)
        ?.overdueFollowUpCount,
      1,
    );

    assert.equal(
      auditEventsFor(tables, {
        action: 'club_head_coach_oversight.read',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      3,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_head_coach_oversight.read',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_head_coach_task.create',
        result: 'SUCCESS',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_head_coach_task.create',
        result: 'DENY',
      }).length,
      3,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_head_coach_task.update',
        resourceId: createdTaskPayload.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_head_coach_standard.create',
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_head_coach_standard.update',
        resourceId: createdStandardPayload.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('returns owner dashboard projection from governed backend sources', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, managerUserId, deliveryCoachUserId, memberUserId } =
      getSeededClubStaffingActors(tables);
    const managerMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === managerUserId,
    );
    assert.ok(managerMembership, 'expected manager membership');
    managerMembership.role = 'club_admin';

    const scheduledAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.parse(scheduledAt) + 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const sessionId = 'gse_owner_dashboard_completion_test';
    const bookingId = 'book_owner_dashboard_completion_test';
    const invoiceId = 'invc_owner_dashboard_open_test';
    const athleteId = asString(asRows(tables.athletes)[0]?.id) ?? 'ath_owner_dashboard_test';

    ensureTable(tables, 'groupSessions').push({
      id: sessionId,
      coachUserId: deliveryCoachUserId,
      clubId,
      squadId: ensureClubSquadForTest(tables, clubId),
      recurringSeriesId: null,
      title: 'Owner Dashboard Completion',
      description: 'Owner dashboard completion queue source',
      sessionType: 'TEAM_TRAINING',
      maxParticipants: 12,
      currentParticipants: 1,
      waitlistEnabled: true,
      waitlistCount: 0,
      location: 'Pitch 3',
      isVirtual: false,
      status: 'COMPLETED',
      scheduleJson: [{ startsAt: scheduledAt, endsAt }],
      focusJson: [],
      equipmentJson: [],
      createdByUserId: managerUserId,
      updatedByUserId: managerUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(tables, 'bookings').push({
      id: bookingId,
      coachUserId: deliveryCoachUserId,
      bookedByUserId: memberUserId,
      clubId,
      status: 'AWAITING_COMPLETION',
      scheduledAt,
      durationMinutes: 60,
      location: 'Pitch 3',
      serviceType: 'TEAM_TRAINING',
      groupSessionId: sessionId,
      createdByUserId: managerUserId,
      updatedByUserId: managerUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(tables, 'bookingParticipants').push({
      id: 'bpa_owner_dashboard_support_test',
      bookingId,
      athleteId,
      guardianUserId: memberUserId,
      status: 'confirmed',
      createdByUserId: managerUserId,
      updatedByUserId: managerUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(tables, 'invoices').push({
      id: invoiceId,
      invoiceNumber: 'INV-OWNER-DASHBOARD-TEST',
      bookingId,
      coachUserId: deliveryCoachUserId,
      payerUserId: memberUserId,
      athleteId,
      status: 'SENT',
      sessionDate: scheduledAt,
      sessionType: 'TEAM_TRAINING',
      sessionLocation: 'Pitch 3',
      sessionDurationMinutes: 60,
      subtotalMinor: 5000,
      taxMinor: 0,
      taxRatePercent: 0,
      totalMinor: 5000,
      currency: 'GBP',
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      sentAt: now,
      createdByUserId: managerUserId,
      updatedByUserId: managerUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(tables, 'safeguardingIncidents').push({
      id: 'saf_owner_dashboard_support_test',
      clubId,
      athleteId,
      bookingId,
      category: 'other',
      reportedByUserId: memberUserId,
      assignedToUserId: managerUserId,
      status: 'IN_REVIEW',
      severity: 'MEDIUM',
      title: 'Parent support issue',
      summary: 'Coach no-show reported from booking support flow',
      detailsEncrypted: 'Category: coach-noshow\n\nCoach did not arrive for the session.',
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      deletedAt: null,
    });

    const deniedMember = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/owner-dashboard`,
      headers: authHeaders(tables, memberUserId),
    });
    assert.equal(deniedMember.statusCode, 403);

    const adminView = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/owner-dashboard`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(adminView.statusCode, 200);
    const payload = ownerDashboardResponseSchema.parse(adminView.json());
    const viewerRole = payload.viewerMembership?.role;
    assert.ok(viewerRole);
    assert.equal(['OWNER', 'ADMIN'].includes(viewerRole), true);
    assert.equal(
      payload.privilegedAdminAccess,
      rolesForUser(tables, managerUserId).some((role) =>
        ['club_admin', 'admin', 'security_admin'].includes(role),
      ),
    );
    assert.equal(payload.summary.activeStaffCount > 0, true);
    assert.equal(
      payload.completionQueue.some((item) => item.bookingId === bookingId),
      true,
    );

    const privilegedAdminUserId = getPrivilegedAdminOutsiderUserId(tables, clubId);
    const privilegedView = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/owner-dashboard`,
      headers: authHeaders(tables, privilegedAdminUserId, 'security_admin'),
    });
    assert.equal(privilegedView.statusCode, 200);
    const privilegedPayload = ownerDashboardResponseSchema.parse(privilegedView.json());
    assert.equal(privilegedPayload.viewerMembership, null);
    assert.equal(privilegedPayload.privilegedAdminAccess, true);
    assert.equal(payload.summary.awaitingCompletionCount >= 1, true);
    assert.equal(payload.finance.openTotal >= 50, true);
    assert.equal(payload.finance.orgCreditOpen >= 50, true);
    assert.equal(payload.finance.overdueCount >= 1, true);
    assert.match(payload.finance.note, /Provider payouts remain simulated/);
    assert.equal(payload.summary.supportIssueCount >= 1, true);
    assert.equal(
      payload.supportIssues.some(
        (issue) =>
          issue.bookingId === bookingId &&
          issue.status === 'reviewed' &&
          issue.category === 'other',
      ),
      true,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_owner_dashboard.read',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_owner_dashboard.read',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('keeps coach payouts simulated while completing withdrawals through v1', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const coachUserId = getSeededCoachUserId(tables);
    const now = new Date().toISOString();

    ensureTable(tables, 'invoices').push({
      id: 'invc_simulated_payout_balance_test',
      invoiceNumber: 'INV-SIM-PAYOUT-TEST',
      coachUserId,
      payerUserId: asString(
        asRows(tables.users).find((row) => asString(row.id) !== coachUserId)?.id,
      ),
      bookingId: null,
      status: 'PAID',
      subtotalMinor: 10000,
      taxMinor: 0,
      totalMinor: 10000,
      amountDueMinor: 0,
      currency: 'GBP',
      dueAt: now,
      sentAt: now,
      paidAt: now,
      provider: 'simulated',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      metadataJson: {},
    });

    const createdMethod = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/payout-methods',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        type: 'BANK_ACCOUNT',
        isDefault: true,
        bankName: 'Test Bank',
        accountLastFour: '1234',
        sortCode: '12-34-56',
        nickname: 'Simulated test account',
      },
    });
    assert.equal(createdMethod.statusCode, 200);
    const methodPayload = createdMethod.json() as {
      payoutMethod: { id: string; isVerified: boolean; accountLastFour?: string };
      provider: string;
      providerConfigured: boolean;
    };
    assert.equal(methodPayload.provider, 'simulated');
    assert.equal(methodPayload.providerConfigured, false);
    assert.equal(methodPayload.payoutMethod.isVerified, true);
    assert.equal(methodPayload.payoutMethod.accountLastFour, '1234');

    const requested = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/withdrawals',
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        amount: 50,
        payoutMethodId: methodPayload.payoutMethod.id,
      },
    });
    assert.equal(requested.statusCode, 200);
    const requestedPayload = requested.json() as {
      withdrawal: { id: string; status: string; amount: number; reference?: string };
      provider: string;
      providerConfigured: boolean;
    };
    assert.equal(requestedPayload.provider, 'simulated');
    assert.equal(requestedPayload.providerConfigured, false);
    assert.equal(requestedPayload.withdrawal.status, 'PENDING');
    assert.equal(requestedPayload.withdrawal.amount, 50);
    assert.equal(requestedPayload.withdrawal.reference, undefined);

    const completed = await app.inject({
      method: 'POST',
      url: `/v1/coaches/me/withdrawals/${requestedPayload.withdrawal.id}/complete`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(completed.statusCode, 200);
    const completedPayload = completed.json() as {
      withdrawal: { id: string; status: string; reference?: string; completedAt?: string };
      provider: string;
      providerConfigured: boolean;
    };
    assert.equal(completedPayload.provider, 'simulated');
    assert.equal(completedPayload.providerConfigured, false);
    assert.equal(completedPayload.withdrawal.status, 'COMPLETED');
    assert.match(completedPayload.withdrawal.reference ?? '', /^SIM-WD-/);
    assert.equal(Boolean(completedPayload.withdrawal.completedAt), true);

    const storedWithdrawal = asRows(tables.coachWithdrawals).find(
      (row) => asString(row.id) === requestedPayload.withdrawal.id,
    );
    assert.equal(asString(storedWithdrawal?.provider), 'simulated');
    assert.match(asString(storedWithdrawal?.providerRef) ?? '', /^simwd_/);
    assert.equal(asString(storedWithdrawal?.status), 'COMPLETED');
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_withdrawals.create',
        resourceId: requestedPayload.withdrawal.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_withdrawals.complete',
        resourceId: requestedPayload.withdrawal.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('lists coach self invoices from v1 and audits sensitive reads', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const coachUserId = getSeededCoachUserId(tables);
    const payerUserId = getSeededNonCoachUserId(tables, coachUserId);
    const now = new Date().toISOString();

    ensureTable(tables, 'invoices').push(
      {
        id: 'invc_coach_self_paid_test',
        invoiceNumber: 'INV-COACH-SELF-PAID-TEST',
        coachUserId,
        payerUserId,
        bookingId: 'booking_coach_self_paid_test',
        status: 'PAID',
        sessionDate: now,
        sessionType: 'one_to_one',
        sessionLocation: 'Test pitch',
        sessionDurationMinutes: 60,
        subtotalMinor: 5000,
        taxMinor: 0,
        taxRatePercent: 0,
        totalMinor: 5000,
        currency: 'GBP',
        dueDate: now,
        sentAt: now,
        paidAt: now,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: 'invc_coach_self_sent_test',
        invoiceNumber: 'INV-COACH-SELF-SENT-TEST',
        coachUserId,
        payerUserId,
        bookingId: 'booking_coach_self_sent_test',
        status: 'SENT',
        sessionDate: now,
        sessionType: 'one_to_one',
        sessionLocation: 'Test pitch',
        sessionDurationMinutes: 60,
        subtotalMinor: 2500,
        taxMinor: 0,
        taxRatePercent: 0,
        totalMinor: 2500,
        currency: 'GBP',
        dueDate: now,
        sentAt: now,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: 'invc_other_coach_paid_test',
        invoiceNumber: 'INV-OTHER-COACH-PAID-TEST',
        coachUserId: 'coach_other_invoice_test',
        payerUserId: coachUserId,
        bookingId: 'booking_other_coach_paid_test',
        status: 'PAID',
        sessionDate: now,
        sessionType: 'one_to_one',
        sessionLocation: 'Test pitch',
        sessionDurationMinutes: 60,
        subtotalMinor: 7500,
        taxMinor: 0,
        taxRatePercent: 0,
        totalMinor: 7500,
        currency: 'GBP',
        dueDate: now,
        sentAt: now,
        paidAt: now,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    );

    const list = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/invoices?status=PAID',
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(list.statusCode, 200);
    const payload = list.json() as {
      total: number;
      invoices: Array<{ id: string; coachId: string; status: string; total: number }>;
    };
    assert.equal(payload.total >= 1, true);
    assert.equal(
      payload.invoices.some((invoice) => invoice.id === 'invc_coach_self_paid_test'),
      true,
    );
    assert.equal(
      payload.invoices.some((invoice) => invoice.id === 'invc_other_coach_paid_test'),
      false,
    );
    assert.equal(
      payload.invoices.every((invoice) => invoice.coachId === coachUserId),
      true,
    );
    assert.equal(
      payload.invoices.every((invoice) => invoice.status === 'PAID'),
      true,
    );
    assert.equal(
      payload.invoices.every((invoice) => typeof invoice.total === 'number'),
      true,
    );

    const auditEvents = auditEventsFor(tables, {
      action: 'coach_invoices.read',
      resourceId: coachUserId,
      result: 'SUCCESS',
    });
    assert.equal(auditEvents.length, 1);
    assert.equal(auditEvents[0]?.sensitiveRead, true);
  });

  it('fails closed for coach self invoices in db mode when Prisma is unavailable', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    const previousDatabaseUrl = env.DATABASE_URL;
    const fixtureTables = getDbFixtureStore().tables as SeedTables;
    const coachUserId = getSeededCoachUserId(fixtureTables);
    const payerUserId = getSeededNonCoachUserId(fixtureTables, coachUserId);
    const fixtureOnlyInvoiceId = 'invc_db_fixture_coach_self_should_not_leak';

    ensureTable(fixtureTables, 'invoices').push({
      id: fixtureOnlyInvoiceId,
      invoiceNumber: 'INV-DB-FIXTURE-COACH-SELF-NO-LEAK',
      coachUserId,
      payerUserId,
      bookingId: 'booking_db_fixture_coach_self_no_leak',
      status: 'PAID',
      sessionDate: new Date().toISOString(),
      sessionType: 'one_to_one',
      sessionLocation: 'Fixture pitch',
      sessionDurationMinutes: 60,
      subtotalMinor: 5000,
      taxMinor: 0,
      taxRatePercent: 0,
      totalMinor: 5000,
      currency: 'GBP',
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });

    env.API_DATA_BACKEND = 'db';
    env.DATABASE_URL = undefined;
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/coaches/me/invoices?status=PAID',
        headers: authHeaders(fixtureTables, coachUserId, 'coach'),
      });
      assert.equal(res.statusCode, 503);
      assert.match(res.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(res.body.includes(fixtureOnlyInvoiceId), false);
      assert.equal(res.body.includes('INV-DB-FIXTURE-COACH-SELF-NO-LEAK'), false);

      const auditEvents = auditEventsFor(fixtureTables, {
        action: 'coach_invoices.read',
        resourceId: coachUserId,
        result: 'ERROR',
      });
      assert.equal(auditEvents.length, 1);
      assert.equal(auditEvents[0]?.sensitiveRead, true);
      assert.equal(
        asString(asRecord(auditEvents[0]?.metadataJson)?.errorCode),
        'SERVICE_UNAVAILABLE',
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      env.DATABASE_URL = previousDatabaseUrl;
      resetDbFixtureStoreForTests();
      resetCoachClubRouteStateForTests();
    }
  });

  it('lists coach roster from booking participation and audits reads', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const coachUserId = getSeededCoachUserId(tables);
    const outsiderUserId = getSeededNonCoachUserId(tables, coachUserId);

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/roster`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(denied.statusCode, 403);

    const listed = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/roster`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(listed.statusCode, 200);
    const payload = listed.json() as {
      entries: Array<{
        athleteId: string;
        athleteName?: string;
        parentId: string;
        parentName?: string;
        totalSessions: number;
        totalRevenue: number;
        averageRating: number;
        notes: Array<{ id: string; content: string }>;
      }>;
      total: number;
    };
    assert.equal(payload.total, payload.entries.length);
    assert.equal(payload.entries.length >= 1, true);
    const entry = payload.entries.find((item) => item.notes.length > 0) ?? payload.entries[0];
    assert.ok(entry);
    assert.equal(Boolean(entry.athleteId), true);
    assert.equal(Boolean(entry.athleteName), true);
    assert.equal(Boolean(entry.parentId), true);
    assert.equal(Boolean(entry.parentName), true);
    assert.equal(entry.totalSessions >= 0, true);
    assert.equal(entry.totalRevenue >= 0, true);
    assert.equal(entry.averageRating >= 0, true);

    const visibleAthleteIds = new Set(payload.entries.map((item) => item.athleteId));
    const explicitAthleteId = asRows(tables.athletes)
      .map((row) => asString(row.id))
      .find(
        (athleteId): athleteId is string =>
          typeof athleteId === 'string' && !visibleAthleteIds.has(athleteId),
      );
    assert.ok(
      explicitAthleteId,
      'expected an athlete outside the coach roster for create coverage',
    );

    const deniedCreate = await app.inject({
      method: 'POST',
      url: `/v1/coaches/${coachUserId}/roster`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        athleteId: explicitAthleteId,
      },
    });
    assert.equal(deniedCreate.statusCode, 403);

    const createdRoster = await app.inject({
      method: 'POST',
      url: `/v1/coaches/${coachUserId}/roster`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        athleteId: explicitAthleteId,
        status: 'ACTIVE',
        tags: ['manual-link'],
        primaryFocus: 'Passing',
        notificationPreference: 'IMPORTANT',
      },
    });
    assert.equal(createdRoster.statusCode, 201);
    const createdRosterPayload = createdRoster.json() as {
      entry: {
        athleteId: string;
        status: string;
        tags: string[];
        primaryFocus?: string;
        notificationPreference: string;
        totalSessions: number;
      };
    };
    assert.equal(createdRosterPayload.entry.athleteId, explicitAthleteId);
    assert.equal(createdRosterPayload.entry.status, 'ACTIVE');
    assert.deepEqual(createdRosterPayload.entry.tags, ['manual-link']);
    assert.equal(createdRosterPayload.entry.primaryFocus, 'Passing');
    assert.equal(createdRosterPayload.entry.notificationPreference, 'IMPORTANT');
    assert.equal(createdRosterPayload.entry.totalSessions, 0);

    const createdRosterDetail = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/roster/${explicitAthleteId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(createdRosterDetail.statusCode, 200);
    const createdRosterDetailPayload = createdRosterDetail.json() as {
      entry: { athleteId: string; tags: string[] };
    };
    assert.equal(createdRosterDetailPayload.entry.athleteId, explicitAthleteId);
    assert.deepEqual(createdRosterDetailPayload.entry.tags, ['manual-link']);

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/roster/${entry.athleteId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(detail.statusCode, 200);
    const detailPayload = detail.json() as {
      entry: {
        athleteId: string;
        athleteName?: string;
        notes: Array<{ id: string; content: string }>;
      };
    };
    assert.equal(detailPayload.entry.athleteId, entry.athleteId);

    const deniedNoteCreate = await app.inject({
      method: 'POST',
      url: `/v1/coaches/${coachUserId}/roster/${entry.athleteId}/notes`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        content: 'Outsider cannot write roster notes',
      },
    });
    assert.equal(deniedNoteCreate.statusCode, 403);

    const createdNote = await app.inject({
      method: 'POST',
      url: `/v1/coaches/${coachUserId}/roster/${entry.athleteId}/notes`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        content: 'Keep receiving drill simple.',
      },
    });
    assert.equal(createdNote.statusCode, 201);
    const createdNotePayload = createdNote.json() as {
      note: { id: string; content: string; createdAt: string };
    };
    assert.match(createdNotePayload.note.id, /^snt_/);
    assert.equal(createdNotePayload.note.content, 'Keep receiving drill simple.');

    const updatedNote = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/${coachUserId}/roster/${entry.athleteId}/notes/${createdNotePayload.note.id}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        content: 'Keep first touch cue simple.',
      },
    });
    assert.equal(updatedNote.statusCode, 200);
    const updatedNotePayload = updatedNote.json() as {
      note: { id: string; content: string };
    };
    assert.equal(updatedNotePayload.note.id, createdNotePayload.note.id);
    assert.equal(updatedNotePayload.note.content, 'Keep first touch cue simple.');

    const detailAfterNote = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/roster/${entry.athleteId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(detailAfterNote.statusCode, 200);
    const detailAfterNotePayload = detailAfterNote.json() as {
      entry: { notes: Array<{ id: string; content: string }> };
    };
    assert.equal(
      detailAfterNotePayload.entry.notes.some(
        (note) =>
          note.id === createdNotePayload.note.id && note.content === 'Keep first touch cue simple.',
      ),
      true,
    );

    const removedNote = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/${coachUserId}/roster/${entry.athleteId}/notes/${createdNotePayload.note.id}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(removedNote.statusCode, 200);
    assert.equal((removedNote.json() as { removed: boolean }).removed, true);

    const detailAfterNoteRemove = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/roster/${entry.athleteId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(detailAfterNoteRemove.statusCode, 200);
    const detailAfterNoteRemovePayload = detailAfterNoteRemove.json() as {
      entry: { notes: Array<{ id: string }> };
    };
    assert.equal(
      detailAfterNoteRemovePayload.entry.notes.some(
        (note) => note.id === createdNotePayload.note.id,
      ),
      false,
    );

    const storedNote = asRows(tables.sessionNotes).find(
      (row) => asString(row.id) === createdNotePayload.note.id,
    );
    assert.equal(asString(storedNote?.visibility), 'PRIVATE');
    assert.equal(asString(storedNote?.deletedByUserId), coachUserId);
    assert.equal(Boolean(asString(storedNote?.deletedAt)), true);
    assert.equal(asString(asRecord(storedNote?.metadataJson)?.source), 'roster-note');

    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster.read',
        resourceId: coachUserId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster.read',
        resourceId: coachUserId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster.read',
        resourceId: `${coachUserId}:${entry.athleteId}`,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );

    const deniedUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/${coachUserId}/roster/${entry.athleteId}`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        status: 'PAUSED',
      },
    });
    assert.equal(deniedUpdate.statusCode, 403);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/${coachUserId}/roster/${entry.athleteId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        status: 'PAUSED',
        tags: ['priority', 'academy-track'],
        primaryFocus: 'Finishing',
        notificationPreference: 'IMPORTANT',
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedPayload = updated.json() as {
      entry: {
        athleteId: string;
        status: string;
        tags: string[];
        primaryFocus?: string;
        notificationPreference: string;
      };
    };
    assert.equal(updatedPayload.entry.athleteId, entry.athleteId);
    assert.equal(updatedPayload.entry.status, 'PAUSED');
    assert.deepEqual(updatedPayload.entry.tags, ['priority', 'academy-track']);
    assert.equal(updatedPayload.entry.primaryFocus, 'Finishing');
    assert.equal(updatedPayload.entry.notificationPreference, 'IMPORTANT');

    const removed = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/${coachUserId}/roster/${entry.athleteId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
      payload: {
        reason: 'INACTIVE',
        customReason: 'No recent attendance',
        archive: true,
      },
    });
    assert.equal(removed.statusCode, 200);
    const removedPayload = removed.json() as {
      removed: boolean;
      removal: {
        id: string;
        athleteId: string;
        reason: string;
        customReason?: string;
        archived: boolean;
      };
    };
    assert.equal(removedPayload.removed, true);
    assert.equal(removedPayload.removal.athleteId, entry.athleteId);
    assert.equal(removedPayload.removal.reason, 'INACTIVE');
    assert.equal(removedPayload.removal.customReason, 'No recent attendance');
    assert.equal(removedPayload.removal.archived, true);

    const removedDetail = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/roster/${entry.athleteId}`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(removedDetail.statusCode, 404);

    const removalHistory = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/roster/removals`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(removalHistory.statusCode, 200);
    const removalHistoryPayload = removalHistory.json() as {
      removals: Array<{ id: string; athleteId: string }>;
    };
    assert.equal(
      removalHistoryPayload.removals.some(
        (removal) =>
          removal.id === removedPayload.removal.id && removal.athleteId === entry.athleteId,
      ),
      true,
    );

    const restored = await app.inject({
      method: 'POST',
      url: `/v1/coaches/${coachUserId}/roster/removals/${removedPayload.removal.id}/undo`,
      headers: authHeaders(tables, coachUserId, 'coach'),
    });
    assert.equal(restored.statusCode, 200);
    const restoredPayload = restored.json() as {
      entry: { athleteId: string; status: string; tags: string[] };
    };
    assert.equal(restoredPayload.entry.athleteId, entry.athleteId);
    assert.equal(restoredPayload.entry.status, 'PAUSED');
    assert.deepEqual(restoredPayload.entry.tags, ['priority', 'academy-track']);

    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster.update',
        resourceId: `${coachUserId}:${entry.athleteId}`,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster.update',
        resourceId: `${coachUserId}:${entry.athleteId}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster.remove',
        resourceId: `${coachUserId}:${entry.athleteId}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster.restore',
        resourceId: `${coachUserId}:${entry.athleteId}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster.create',
        resourceId: `${coachUserId}:${explicitAthleteId}`,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster.create',
        resourceId: `${coachUserId}:${explicitAthleteId}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster_note.create',
        resourceId: `${coachUserId}:${entry.athleteId}`,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster_note.create',
        resourceId: createdNotePayload.note.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster_note.update',
        resourceId: createdNotePayload.note.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'coach_roster_note.remove',
        resourceId: createdNotePayload.note.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('lists and mutates club members through governed v1 authority', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, managerUserId, targetUserId, outsiderUserId, newRole } =
      getSeededClubMemberManagementActors(tables);

    const outsiderList = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/members`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(outsiderList.statusCode, 403);

    const memberList = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/members`,
      headers: authHeaders(tables, targetUserId),
    });
    assert.equal(memberList.statusCode, 200);
    const memberListPayload = memberList.json() as {
      total: number;
      members: Array<{ userId: string; userName: string; role: string; status: string }>;
    };
    assert.equal(memberListPayload.total >= 2, true);
    assert.equal(
      memberListPayload.members.some(
        (member) => member.userId === targetUserId && member.status === 'active',
      ),
      true,
    );

    const deniedRoleUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/members/${managerUserId}/role`,
      headers: authHeaders(tables, targetUserId),
      payload: {
        role: 'ASSISTANT',
      },
    });
    assert.equal(deniedRoleUpdate.statusCode, 403);

    const roleUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/members/${targetUserId}/role`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        role: newRole,
      },
    });
    assert.equal(roleUpdate.statusCode, 200);
    const roleUpdatePayload = roleUpdate.json() as {
      member: { userId: string; role: string; status: string };
    };
    assert.equal(roleUpdatePayload.member.userId, targetUserId);
    assert.equal(roleUpdatePayload.member.role, newRole);
    assert.equal(roleUpdatePayload.member.status, 'active');

    const deniedRemove = await app.inject({
      method: 'DELETE',
      url: `/v1/clubs/${clubId}/members/${managerUserId}`,
      headers: authHeaders(tables, targetUserId),
      payload: {
        reason: 'OTHER',
      },
    });
    assert.equal(deniedRemove.statusCode, 403);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/v1/clubs/${clubId}/members/${targetUserId}`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        reason: 'INACTIVE',
        customReason: 'API membership verification',
      },
    });
    assert.equal(removed.statusCode, 200);
    const removedPayload = removed.json() as {
      removal: {
        id: string;
        clubId: string;
        userId: string;
        userRole: string;
        reason: string;
        originalMembership: { active: boolean };
      };
    };
    assert.equal(removedPayload.removal.clubId, clubId);
    assert.equal(removedPayload.removal.userId, targetUserId);
    assert.equal(removedPayload.removal.userRole, newRole);
    assert.equal(removedPayload.removal.reason, 'INACTIVE');
    assert.equal(removedPayload.removal.originalMembership.active, true);

    const targetMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === targetUserId,
    );
    assert.equal(targetMembership?.active, false);
    assert.ok(asString(targetMembership?.deletedAt), 'expected membership soft-delete timestamp');

    const afterRemoveList = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/members`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(afterRemoveList.statusCode, 200);
    const afterRemovePayload = afterRemoveList.json() as {
      members: Array<{ userId: string }>;
    };
    assert.equal(
      afterRemovePayload.members.some((member) => member.userId === targetUserId),
      false,
    );

    const deniedRemovalHistory = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/members/removals`,
      headers: authHeaders(tables, targetUserId),
    });
    assert.equal(deniedRemovalHistory.statusCode, 403);

    const removalHistory = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/members/removals`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(removalHistory.statusCode, 200);
    const removalHistoryPayload = removalHistory.json() as {
      total: number;
      removals: Array<{
        id: string;
        userId: string;
        reason: string;
        customReason: string | null;
        originalMembership: { active: boolean };
      }>;
    };
    assert.equal(removalHistoryPayload.total, 1);
    assert.equal(removalHistoryPayload.removals[0]?.id, removedPayload.removal.id);
    assert.equal(removalHistoryPayload.removals[0]?.userId, targetUserId);
    assert.equal(removalHistoryPayload.removals[0]?.reason, 'INACTIVE');
    assert.equal(removalHistoryPayload.removals[0]?.customReason, 'API membership verification');
    assert.equal(removalHistoryPayload.removals[0]?.originalMembership.active, true);

    const deniedRestore = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/members/removals/${removedPayload.removal.id}/restore`,
      headers: authHeaders(tables, targetUserId),
    });
    assert.equal(deniedRestore.statusCode, 403);

    const restored = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/members/removals/${removedPayload.removal.id}/restore`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(restored.statusCode, 200);
    const restoredPayload = restored.json() as {
      member: { userId: string; role: string; status: string };
    };
    assert.equal(restoredPayload.member.userId, targetUserId);
    assert.equal(restoredPayload.member.role, newRole);
    assert.equal(restoredPayload.member.status, 'active');
    const restoredMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === targetUserId,
    );
    assert.equal(restoredMembership?.active, true);
    assert.equal(asString(restoredMembership?.deletedAt), undefined);

    const removalHistoryAfterRestore = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/members/removals`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(removalHistoryAfterRestore.statusCode, 200);
    assert.equal((removalHistoryAfterRestore.json() as { total: number }).total, 0);

    const deniedBan = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/members/${managerUserId}/ban`,
      headers: authHeaders(tables, targetUserId),
      payload: {
        reason: 'Unauthorized ban attempt',
      },
    });
    assert.equal(deniedBan.statusCode, 403);

    const inviteCodes = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/invite-codes`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(inviteCodes.statusCode, 200);
    const inviteCodesPayload = inviteCodes.json() as {
      inviteCodes: Array<{ code: string; role: string }>;
    };
    const memberInviteCode = inviteCodesPayload.inviteCodes.find(
      (code) => code.role === 'MEMBER',
    )?.code;
    assert.ok(memberInviteCode, 'expected member invite code');

    const invalidShortInviteCode = await app.inject({
      method: 'GET',
      url: '/v1/clubs/join/resolve?code=abc',
      headers: authHeaders(tables, targetUserId),
    });
    assert.equal(invalidShortInviteCode.statusCode, 400);
    assert.equal((invalidShortInviteCode.json() as { code?: string }).code, 'VALIDATION_FAILED');

    const resolvedInviteCode = await app.inject({
      method: 'GET',
      url: `/v1/clubs/join/resolve?code=${encodeURIComponent(memberInviteCode)}`,
      headers: authHeaders(tables, targetUserId),
    });
    assert.equal(resolvedInviteCode.statusCode, 200);
    resolveClubJoinCodeResponseSchema.parse(resolvedInviteCode.json());

    const deniedInviteCodeResolve = await app.inject({
      method: 'GET',
      url: '/v1/clubs/join/resolve?code=NOT-A-REAL-CODE',
      headers: authHeaders(tables, targetUserId),
    });
    assert.equal(deniedInviteCodeResolve.statusCode, 404);

    const invalidInviteCodeRole = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invite-codes`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        role: 'HEAD_COACH',
      },
    });
    assert.equal(invalidInviteCodeRole.statusCode, 400);
    assert.equal(
      asRows(tables.clubInviteCodes).some(
        (row) =>
          asString(row.clubId) === clubId &&
          asString(row.role) === 'HEAD_COACH' &&
          !asString(row.deletedAt),
      ),
      false,
    );

    const createdInviteCode = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/invite-codes`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        role: 'MEMBER',
      },
    });
    assert.equal(createdInviteCode.statusCode, 201);
    const createdInviteCodePayload = createdInviteCode.json() as {
      inviteCode: { code: string; role: string; remainingUses: number };
    };
    assert.equal(createdInviteCodePayload.inviteCode.role, 'MEMBER');
    assert.equal(createdInviteCodePayload.inviteCode.remainingUses > 0, true);
    const createdMemberInviteCode = createdInviteCodePayload.inviteCode.code;
    const remainingUsesBeforeInvalidJoin = Number(
      asRows(tables.clubInviteCodes).find((row) => asString(row.code) === createdMemberInviteCode)
        ?.remainingUses,
    );

    const invalidJoinPayload = await app.inject({
      method: 'POST',
      url: '/v1/clubs/join',
      headers: authHeaders(tables, targetUserId),
      payload: {
        code: createdMemberInviteCode,
        role: 'OWNER',
      },
    });
    assert.equal(invalidJoinPayload.statusCode, 400);
    assert.equal(
      Number(
        asRows(tables.clubInviteCodes).find((row) => asString(row.code) === createdMemberInviteCode)
          ?.remainingUses,
      ),
      remainingUsesBeforeInvalidJoin,
    );

    const joinedWithCode = await app.inject({
      method: 'POST',
      url: '/v1/clubs/join',
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        code: createdMemberInviteCode,
      },
    });
    assert.equal(joinedWithCode.statusCode, 201);
    assert.equal(joinClubResponseSchema.parse(joinedWithCode.json()).outcome, 'joined');

    const alreadyJoinedWithCode = await app.inject({
      method: 'POST',
      url: '/v1/clubs/join',
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        code: createdMemberInviteCode,
      },
    });
    assert.equal(alreadyJoinedWithCode.statusCode, 200);
    assert.equal(
      joinClubResponseSchema.parse(alreadyJoinedWithCode.json()).outcome,
      'already_member',
    );

    const banned = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/members/${targetUserId}/ban`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        reason: 'Safeguarding conduct ban',
      },
    });
    assert.equal(banned.statusCode, 200);
    const bannedPayload = banned.json() as {
      removal: { userId: string; reason: string; customReason: string };
    };
    assert.equal(bannedPayload.removal.userId, targetUserId);
    assert.equal(bannedPayload.removal.reason, 'CONDUCT');
    assert.equal(bannedPayload.removal.customReason, 'Safeguarding conduct ban');
    const bannedMembership = asRows(tables.clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === targetUserId,
    );
    assert.equal(bannedMembership?.active, false);
    assert.ok(asString(bannedMembership?.bannedAt), 'expected membership ban timestamp');

    const bannedRejoin = await app.inject({
      method: 'POST',
      url: '/v1/clubs/join',
      headers: authHeaders(tables, targetUserId),
      payload: {
        code: createdMemberInviteCode,
      },
    });
    assert.equal(bannedRejoin.statusCode, 403);

    const deletedInviteCode = await app.inject({
      method: 'DELETE',
      url: `/v1/clubs/${clubId}/invite-codes/${createdMemberInviteCode}`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(deletedInviteCode.statusCode, 204);

    assert.equal(
      auditEventsFor(tables, {
        action: 'club_member.role.update',
        resourceId: `${clubId}:${targetUserId}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_member.role.update',
        resourceId: `${clubId}:${managerUserId}`,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_member.remove',
        resourceId: `${clubId}:${targetUserId}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_member.remove',
        resourceId: `${clubId}:${managerUserId}`,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_member_removals.read',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_member_removals.read',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_member.restore',
        resourceId: `${clubId}:${removedPayload.removal.id}`,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_member.restore',
        resourceId: `${clubId}:${targetUserId}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_member.ban',
        resourceId: `${clubId}:${managerUserId}`,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_member.ban',
        resourceId: `${clubId}:${targetUserId}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite_code.read',
        resourceId: clubId,
        result: 'SUCCESS',
      }).some((row) => row.sensitiveRead === true),
      true,
    );
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'club_invite_code.create',
        resourceId: clubId,
        result: 'DENY',
      }).some(
        (row) =>
          (row.metadataJson as { errorCode?: string } | undefined)?.errorCode ===
          'VALIDATION_FAILED',
      ),
      true,
    );
    const createInviteAudit = auditEventsFor(getMarketplaceSeedStore().tables, {
      action: 'club_invite_code.create',
      result: 'SUCCESS',
    });
    assert.equal(createInviteAudit.length, 1);
    assert.match(
      asString(createInviteAudit[0]?.resourceId) ?? '',
      new RegExp(`^${clubId}:invite_code:[a-f0-9]{32}$`),
    );
    assert.match(
      asString(asRecord(createInviteAudit[0]?.metadataJson)?.codeReference) ?? '',
      /^invite_code:[a-f0-9]{32}$/,
    );

    const deniedJoinAudit = auditEventsFor(tables, {
      action: 'club.join',
      result: 'DENY',
    }).find((row) => asString(row.actorUserId) === targetUserId);
    assert.ok(deniedJoinAudit, 'expected denied join audit event');
    assert.match(
      asString(asRecord(deniedJoinAudit.metadataJson)?.codeReference) ?? '',
      /^invite_code:[a-f0-9]{32}$/,
    );

    const resolveInviteAudits = auditEventsFor(tables, {
      action: 'club.join.resolve',
    });
    assert.equal(resolveInviteAudits.length, 3);
    assert.equal(
      resolveInviteAudits.every((row) => row.sensitiveRead === true),
      true,
    );
    assert.equal(
      resolveInviteAudits.some((row) => asString(row.result) === 'SUCCESS'),
      true,
    );
    assert.equal(
      resolveInviteAudits.some((row) => asString(row.result) === 'DENY'),
      true,
    );
    assert.equal(
      resolveInviteAudits.every((row) =>
        /^invite_code:[a-f0-9]{32}$/.test(asString(row.resourceId) ?? ''),
      ),
      true,
    );

    const removeInviteAudit = auditEventsFor(getMarketplaceSeedStore().tables, {
      action: 'club_invite_code.remove',
      result: 'SUCCESS',
    });
    assert.equal(removeInviteAudit.length, 1);
    assert.match(
      asString(removeInviteAudit[0]?.resourceId) ?? '',
      new RegExp(`^${clubId}:invite_code:[a-f0-9]{32}$`),
    );

    const inviteAuditJson = JSON.stringify(
      asRows(tables.auditEvents).filter((row) =>
        [
          'club_invite_code.create',
          'club_invite_code.remove',
          'club.join.resolve',
          'club.join',
        ].includes(asString(row.action) ?? ''),
      ),
    );
    assert.equal(inviteAuditJson.includes(memberInviteCode), false);
    assert.equal(inviteAuditJson.includes(createdMemberInviteCode), false);
    assert.equal(inviteAuditJson.includes('NOT-A-REAL-CODE'), false);
  });

  it('lists, creates, and updates club squads through governed v1 authority', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, managerUserId, outsiderUserId } = getSeededClubMemberManagementActors(tables);
    const ordinaryMemberUserId = asString(
      asRows(tables.clubMemberships).find((row) => {
        const role = parseOrganizationRole(asString(row.role));
        return (
          asString(row.clubId) === clubId &&
          asString(row.userId) !== managerUserId &&
          row.active !== false &&
          !asString(row.deletedAt) &&
          !canManageClubMembers(role)
        );
      })?.userId,
    );
    assert.ok(
      ordinaryMemberUserId,
      'expected ordinary club member without squad-management capability',
    );

    const outsiderList = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/squads`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(outsiderList.statusCode, 403);

    const memberList = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/squads`,
      headers: authHeaders(tables, ordinaryMemberUserId),
    });
    assert.equal(memberList.statusCode, 200);
    const memberListPayload = memberList.json() as {
      squads: Array<{ id: string; clubId: string; name: string; memberCount: number }>;
    };
    assert.equal(
      memberListPayload.squads.every((squad) => squad.clubId === clubId),
      true,
    );
    assert.equal(
      memberListPayload.squads.every(
        (squad) =>
          !('description' in squad) && !('meetLocation' in squad) && !('tags' in squad),
      ),
      true,
    );

    const deniedCreate = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/squads`,
      headers: authHeaders(tables, ordinaryMemberUserId),
      payload: {
        name: 'U13 Pathway',
        level: 'U13 · Foundation',
      },
    });
    assert.equal(deniedCreate.statusCode, 403);

    const squadCountBeforeInvalidCreate = asRows(tables.squads).length;
    const invalidCreate = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/squads`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        name: 'Rejected Squad',
        ageGroup: 'U13',
        skillLevel: 'Foundation',
        meetingLocation: 'private-location-must-not-be-audited',
      },
    });
    assert.equal(invalidCreate.statusCode, 400);
    assert.equal(asRows(tables.squads).length, squadCountBeforeInvalidCreate);

    const created = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/squads`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        name: 'U13 Pathway',
        ageGroup: 'U13',
        skillLevel: 'Foundation',
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      squad: { id: string; clubId: string; name: string; level: string; memberCount: number };
    };
    assert.equal(createdPayload.squad.clubId, clubId);
    assert.equal(createdPayload.squad.name, 'U13 Pathway');
    assert.equal(createdPayload.squad.level, 'U13 · Foundation');
    assert.equal(createdPayload.squad.memberCount, 0);
    assert.equal((createdPayload.squad as { primaryCoach?: string }).primaryCoach, managerUserId);
    assert.equal('meetLocation' in createdPayload.squad, false);

    const storedSquad = asRows(tables.squads).find(
      (row) => asString(row.id) === createdPayload.squad.id,
    );
    assert.equal(asString(storedSquad?.name), 'U13 Pathway');
    assert.equal(asString(storedSquad?.ageBandLabel), 'U13 · Foundation');
    assert.equal(asString(storedSquad?.ownerCoachUserId), managerUserId);
    if (storedSquad) {
      storedSquad.ageBandLabel = null;
      storedSquad.ownerCoachUserId = null;
    }

    const fetched = await app.inject({
      method: 'GET',
      url: `/v1/squads/${createdPayload.squad.id}`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(fetched.statusCode, 200);
    const fetchedPayload = fetched.json() as {
      squad: { id: string; name: string; level?: string; primaryCoach?: string };
    };
    assert.equal(fetchedPayload.squad.id, createdPayload.squad.id);
    assert.equal('level' in fetchedPayload.squad, false);
    assert.equal('primaryCoach' in fetchedPayload.squad, false);
    assert.equal('meetLocation' in fetchedPayload.squad, false);

    const deniedUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/squads/${createdPayload.squad.id}`,
      headers: authHeaders(tables, ordinaryMemberUserId),
      payload: {
        name: 'Blocked Rename',
      },
    });
    assert.equal(deniedUpdate.statusCode, 403);

    const invalidUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/squads/${createdPayload.squad.id}`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        meetingLocation: 'private-location-must-not-be-audited',
      },
    });
    assert.equal(invalidUpdate.statusCode, 400);

    const emptyUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/squads/${createdPayload.squad.id}`,
      headers: authHeaders(tables, managerUserId),
      payload: {},
    });
    assert.equal(emptyUpdate.statusCode, 400);
    assert.equal(asString(storedSquad?.name), 'U13 Pathway');

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/squads/${createdPayload.squad.id}`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        name: 'U13 Matchday Group',
        level: 'U13 · Competitive',
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedPayload = updated.json() as {
      squad: { id: string; name: string; level: string };
    };
    assert.equal(updatedPayload.squad.name, 'U13 Matchday Group');
    assert.equal(updatedPayload.squad.level, 'U13 · Competitive');
    const updatedStoredSquad = asRows(tables.squads).find(
      (row) => asString(row.id) === createdPayload.squad.id,
    );
    assert.equal(asString(updatedStoredSquad?.name), 'U13 Matchday Group');
    assert.equal(asString(updatedStoredSquad?.ageBandLabel), 'U13 · Competitive');

    const deniedDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/clubs/${clubId}/squads/${createdPayload.squad.id}`,
      headers: authHeaders(tables, ordinaryMemberUserId),
    });
    assert.equal(deniedDelete.statusCode, 403);

    const linkedAthleteId = ensureLinkedAthleteForUser(tables, ordinaryMemberUserId);
    const blockingMembership: SeedRow = {
      id: `sqm_delete_block_${createdPayload.squad.id}`,
      squadId: createdPayload.squad.id,
      athleteId: linkedAthleteId,
      status: 'active',
      createdByUserId: managerUserId,
      updatedByUserId: managerUserId,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      deletedByUserId: null,
    };
    ensureTable(tables, 'squadMemberships').push(blockingMembership);

    const blockedDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/clubs/${clubId}/squads/${createdPayload.squad.id}`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(blockedDelete.statusCode, 409);

    blockingMembership.deletedAt = new Date().toISOString();
    blockingMembership.deletedByUserId = managerUserId;
    const deleted = await app.inject({
      method: 'DELETE',
      url: `/v1/clubs/${clubId}/squads/${createdPayload.squad.id}`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(deleted.statusCode, 204);
    assert.equal(typeof asString(updatedStoredSquad?.deletedAt), 'string');

    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad.create',
        resourceId: `${clubId}:${createdPayload.squad.id}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad.create',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      2,
    );
    const invalidCreateAudit = asRows(tables.auditEvents).find((row) => {
      const metadata = asRecord(row.metadataJson);
      return (
        asString(row.action) === 'club_squad.create' &&
        asString(row.actorUserId) === managerUserId &&
        asString(row.result) === 'DENY' &&
        asString(metadata?.errorCode) === 'VALIDATION_FAILED'
      );
    });
    assert.ok(invalidCreateAudit, 'expected invalid squad payload denial to be audited');
    assert.equal(
      JSON.stringify(asRecord(invalidCreateAudit?.metadataJson)).includes(
        'private-location-must-not-be-audited',
      ),
      false,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad.update',
        resourceId: `${clubId}:${createdPayload.squad.id}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad.update',
        resourceId: `${clubId}:${createdPayload.squad.id}`,
        result: 'DENY',
      }).length,
      3,
    );
    const invalidUpdateAudits = auditEventsFor(tables, {
      action: 'club_squad.update',
      resourceId: `${clubId}:${createdPayload.squad.id}`,
      result: 'DENY',
    }).filter(
      (row) => asString(asRecord(row.metadataJson)?.errorCode) === 'VALIDATION_FAILED',
    );
    assert.equal(invalidUpdateAudits.length, 2);
    assert.equal(
      JSON.stringify(invalidUpdateAudits).includes('private-location-must-not-be-audited'),
      false,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad.archive',
        resourceId: `${clubId}:${createdPayload.squad.id}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad.archive',
        resourceId: `${clubId}:${createdPayload.squad.id}`,
        result: 'DENY',
      }).length,
      2,
    );
  });

  it('lists squad rosters only for assigned coaches and club roster managers', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, managerUserId, outsiderUserId } = getSeededClubMemberManagementActors(tables);
    const ordinaryMemberUserId = asString(
      asRows(tables.clubMemberships).find((row) => {
        const role = parseOrganizationRole(asString(row.role));
        return (
          asString(row.clubId) === clubId &&
          asString(row.userId) !== managerUserId &&
          row.active !== false &&
          !asString(row.deletedAt) &&
          !canManageClubMembers(role)
        );
      })?.userId,
    );
    assert.ok(ordinaryMemberUserId, 'expected ordinary club member without roster access');

    const squadId = ensureClubSquadForTest(tables, clubId);
    const squad = asRows(tables.squads).find((row) => asString(row.id) === squadId);
    assert.ok(squad, 'expected squad');
    squad.ownerCoachUserId = managerUserId;

    const athleteId = ensureLinkedAthleteForUser(tables, ordinaryMemberUserId);
    const now = new Date().toISOString();
    if (
      !asRows(tables.guardianChildLinks).some(
        (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
      )
    ) {
      ensureTable(tables, 'guardianChildLinks').push({
        id: `gcl_roster_${athleteId}`,
        familyId: 'fam_roster_test',
        guardianUserId: ordinaryMemberUserId,
        athleteId,
        relationshipType: 'self',
        isPrimary: true,
        createdByUserId: ordinaryMemberUserId,
        updatedByUserId: ordinaryMemberUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });
    }
    if (
      !asRows(tables.squadMemberships).some(
        (row) =>
          asString(row.squadId) === squadId &&
          asString(row.athleteId) === athleteId &&
          !asString(row.deletedAt),
      )
    ) {
      ensureTable(tables, 'squadMemberships').push({
        id: `sqm_roster_${athleteId}`,
        squadId,
        athleteId,
        status: 'active',
        createdByUserId: managerUserId,
        updatedByUserId: managerUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });
    }

    const allowed = await app.inject({
      method: 'GET',
      url: `/v1/squads/${squadId}/members`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(allowed.statusCode, 200);
    const allowedPayload = allowed.json() as {
      members: Array<{ squadId: string; athleteId: string; parentId: string; status: string }>;
      total: number;
    };
    assert.equal(allowedPayload.total >= 1, true);
    assert.equal(
      allowedPayload.members.some(
        (member) =>
          member.squadId === squadId &&
          member.athleteId === athleteId &&
          member.parentId === ordinaryMemberUserId &&
          member.status === 'ACTIVE',
      ),
      true,
    );

    const deniedMember = await app.inject({
      method: 'GET',
      url: `/v1/squads/${squadId}/members`,
      headers: authHeaders(tables, ordinaryMemberUserId),
    });
    assert.equal(deniedMember.statusCode, 403);

    const deniedOutsider = await app.inject({
      method: 'GET',
      url: `/v1/squads/${squadId}/members`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(deniedOutsider.statusCode, 403);

    const deniedAnonymous = await app.inject({
      method: 'GET',
      url: `/v1/squads/${squadId}/members`,
    });
    assert.equal(deniedAnonymous.statusCode, 403);

    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad_roster.read',
        resourceId: squadId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad_roster.read',
        resourceId: squadId,
        result: 'DENY',
      }).length,
      3,
    );
  });

  it('serves squad rosters from the db fixture backend when API_DATA_BACKEND=db', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const store = getDbFixtureStore();
      const tables = store.tables as SeedTables;
      const squad = asRows(tables.squads).find((candidate) => {
        const squadId = asString(candidate.id);
        const clubId = asString(candidate.clubId);
        const ownerCoachUserId = asString(candidate.ownerCoachUserId);
        return (
          Boolean(squadId && clubId && ownerCoachUserId) &&
          asRows(tables.clubMemberships).some(
            (membership) =>
              asString(membership.clubId) === clubId &&
              asString(membership.userId) === ownerCoachUserId &&
              membership.active !== false &&
              !asString(membership.deletedAt),
          ) &&
          asRows(tables.squadMemberships).some(
            (membership) =>
              asString(membership.squadId) === squadId && !asString(membership.deletedAt),
          )
        );
      });
      const squadId = asString(squad?.id);
      const ownerCoachUserId = asString(squad?.ownerCoachUserId);
      assert.ok(squadId, 'expected db fixture squad with members');
      assert.ok(ownerCoachUserId, 'expected assigned db fixture squad coach');

      const response = await app.inject({
        method: 'GET',
        url: `/v1/squads/${squadId}/members`,
        headers: authHeaders(tables, ownerCoachUserId),
      });
      assert.equal(response.statusCode, 200);
      const payload = response.json() as {
        members: Array<{ squadId: string; athleteId: string; parentId: string }>;
        total: number;
      };
      assert.equal(payload.total >= 1, true);
      assert.equal(
        payload.members.every((member) => member.squadId === squadId),
        true,
      );
      assert.equal(
        payload.members.every((member) => Boolean(member.athleteId && member.parentId)),
        true,
      );
      assert.equal(
        auditEventsFor(tables, {
          action: 'club_squad_roster.read',
          resourceId: squadId,
          result: 'SUCCESS',
        }).length,
        1,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetDbFixtureStoreForTests();
      resetMarketplaceSeedStoreForTests();
    }
  });

  it('assigns and removes club members from squads through governed v1 authority', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, managerUserId, targetUserId } = getSeededClubMemberManagementActors(tables);
    const athleteId = ensureLinkedAthleteForUser(tables, targetUserId);
    const squadId = ensureClubSquadForTest(tables, clubId);

    const deniedAdd = await app.inject({
      method: 'PUT',
      url: `/v1/clubs/${clubId}/squads/${squadId}/members/${managerUserId}`,
      headers: authHeaders(tables, targetUserId),
    });
    assert.equal(deniedAdd.statusCode, 403);

    const invalidAdd = await app.inject({
      method: 'PUT',
      url: `/v1/clubs/${clubId}/squads/${squadId}/members/${targetUserId}`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        localMembership: 'must-not-be-accepted-or-audited',
      },
    });
    assert.equal(invalidAdd.statusCode, 400);
    assert.equal(
      asRows(tables.squadMemberships).some(
        (row) =>
          asString(row.squadId) === squadId &&
          asString(row.athleteId) === athleteId &&
          !asString(row.deletedAt),
      ),
      false,
    );

    const added = await app.inject({
      method: 'PUT',
      url: `/v1/clubs/${clubId}/squads/${squadId}/members/${targetUserId}`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(added.statusCode, 200);
    const addedPayload = added.json() as {
      member: { userId: string; squadIds: string[] };
    };
    assert.equal(addedPayload.member.userId, targetUserId);
    assert.equal(addedPayload.member.squadIds.includes(squadId), true);
    assert.equal(typeof (addedPayload as { requestId?: string }).requestId, 'string');
    assert.deepEqual(Object.keys(addedPayload).sort(), ['member', 'requestId']);

    const membership = asRows(tables.squadMemberships).find(
      (row) =>
        asString(row.squadId) === squadId &&
        asString(row.athleteId) === athleteId &&
        !asString(row.deletedAt),
    );
    assert.ok(membership, 'expected active squad membership after add');

    const listed = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/members`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as {
      members: Array<{ userId: string; squadIds: string[] }>;
    };
    assert.equal(
      listedPayload.members
        .find((member) => member.userId === targetUserId)
        ?.squadIds.includes(squadId),
      true,
    );

    const deniedRemove = await app.inject({
      method: 'DELETE',
      url: `/v1/clubs/${clubId}/squads/${squadId}/members/${targetUserId}`,
      headers: authHeaders(tables, targetUserId),
    });
    assert.equal(deniedRemove.statusCode, 403);

    const invalidRemove = await app.inject({
      method: 'DELETE',
      url: `/v1/clubs/${clubId}/squads/${squadId}/members/${targetUserId}`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        hardDelete: true,
      },
    });
    assert.equal(invalidRemove.statusCode, 400);
    assert.equal(asString(membership?.deletedAt), undefined);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/v1/clubs/${clubId}/squads/${squadId}/members/${targetUserId}`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(removed.statusCode, 200);
    const removedPayload = removed.json() as {
      member: { userId: string; squadIds: string[] };
    };
    assert.equal(removedPayload.member.userId, targetUserId);
    assert.equal(removedPayload.member.squadIds.includes(squadId), false);
    assert.equal(typeof (removedPayload as { requestId?: string }).requestId, 'string');
    assert.deepEqual(Object.keys(removedPayload).sort(), ['member', 'requestId']);

    const removedMembership = asRows(tables.squadMemberships).find(
      (row) => asString(row.squadId) === squadId && asString(row.athleteId) === athleteId,
    );
    assert.equal(asString(removedMembership?.deletedAt) !== undefined, true);

    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad_member.add',
        resourceId: `${clubId}:${squadId}:${targetUserId}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad_member.add',
        resourceId: `${clubId}:${squadId}:${managerUserId}`,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad_member.remove',
        resourceId: `${clubId}:${squadId}:${targetUserId}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad_member.remove',
        resourceId: `${clubId}:${squadId}:${targetUserId}`,
        result: 'DENY',
      }).length,
      2,
    );
    const validationAudits = asRows(tables.auditEvents).filter((row) => {
      const metadata = asRecord(row.metadataJson);
      return (
        ['club_squad_member.add', 'club_squad_member.remove'].includes(
          asString(row.action) ?? '',
        ) &&
        asString(row.actorUserId) === managerUserId &&
        asString(row.result) === 'DENY' &&
        asString(metadata?.errorCode) === 'VALIDATION_FAILED'
      );
    });
    assert.equal(validationAudits.length, 2);
    assert.equal(
      JSON.stringify(validationAudits).includes(
        'must-not-be-accepted-or-audited',
      ),
      false,
    );
  });

  it('persists club matches, gates staff writes, and projects results into club schedule', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, staffUserId, memberUserId, outsiderUserId } = getSeededClubMatchActors(tables);

    const outsiderList = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/matches`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(outsiderList.statusCode, 403);

    const memberCreate = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/matches`,
      headers: authHeaders(tables, memberUserId, 'parent'),
      payload: {
        title: 'U15 Cup Fixture',
        matchType: 'CUP',
        opponent: 'Fixture Town',
        isHome: true,
        date: addDaysIso(8),
        kickoffTime: '10:30',
        venue: 'Riverside Main Pitch',
        maxPlayers: 14,
      },
    });
    assert.equal(memberCreate.statusCode, 403);

    const matchCountBeforeInvalidCreate = asRows(tables.matches).length;
    const invalidCreate = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/matches`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        title: 'U15 Cup Fixture',
        matchType: 'CUP',
        opponent: 'Fixture Town',
        date: addDaysIso(8),
        kickoffTime: '10:30',
        venue: 'Riverside Main Pitch',
        clientOnlyStatus: 'COMPLETED',
      },
    });
    assert.equal(invalidCreate.statusCode, 400);
    assert.equal(asRows(tables.matches).length, matchCountBeforeInvalidCreate);

    const invalidDateCreate = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/matches`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        title: 'U15 Cup Fixture',
        matchType: 'CUP',
        opponent: 'Fixture Town',
        date: '2026-02-30',
        kickoffTime: '10:30',
        venue: 'Riverside Main Pitch',
      },
    });
    assert.equal(invalidDateCreate.statusCode, 400);
    assert.equal(asRows(tables.matches).length, matchCountBeforeInvalidCreate);

    const dstGapCreate = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/matches`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        title: 'U15 Cup Fixture',
        matchType: 'CUP',
        opponent: 'Fixture Town',
        date: '2027-03-28',
        kickoffTime: '01:30',
        venue: 'Riverside Main Pitch',
      },
    });
    assert.equal(dstGapCreate.statusCode, 400);
    assert.equal(asRows(tables.matches).length, matchCountBeforeInvalidCreate);

    const created = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/matches`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        title: 'U15 Cup Fixture',
        matchType: 'CUP',
        opponent: 'Fixture Town',
        isHome: true,
        date: '2026-08-22',
        kickoffTime: '10:30',
        meetTime: '09:45',
        venue: 'Riverside Main Pitch',
        address: '1 Riverside Way',
        maxPlayers: 14,
        notes: 'Cup quarter-final.',
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as {
      match: {
        id: string;
        clubId: string;
        coachId: string;
        status: string;
        timeZone: string;
        result?: unknown;
      };
    };
    assert.equal(createdPayload.match.clubId, clubId);
    assert.equal(createdPayload.match.coachId, staffUserId);
    assert.equal(createdPayload.match.status, 'SCHEDULED');
    assert.equal(createdPayload.match.timeZone, 'Europe/London');
    assert.ok(createdPayload.match.id.startsWith('mat_'));
    const storedCreatedMatch = asRows(tables.matches).find(
      (row) => asString(row.id) === createdPayload.match.id,
    );
    assert.equal(asString(storedCreatedMatch?.timeZone), 'Europe/London');
    assert.equal(asString(storedCreatedMatch?.startsAt), '2026-08-22T09:30:00.000Z');

    const memberDetail = await app.inject({
      method: 'GET',
      url: `/v1/matches/${createdPayload.match.id}`,
      headers: authHeaders(tables, memberUserId, 'parent'),
    });
    assert.equal(memberDetail.statusCode, 200);

    const memberResult = await app.inject({
      method: 'PATCH',
      url: `/v1/matches/${createdPayload.match.id}/result`,
      headers: authHeaders(tables, memberUserId, 'parent'),
      payload: {
        result: { home: 2, away: 1 },
      },
    });
    assert.equal(memberResult.statusCode, 403);

    const recorded = await app.inject({
      method: 'PATCH',
      url: `/v1/matches/${createdPayload.match.id}/result`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        result: { home: 2, away: 1 },
      },
    });
    assert.equal(recorded.statusCode, 200);
    const recordedPayload = recorded.json() as {
      match: { status: string; result?: { home: number; away: number } };
    };
    assert.equal(recordedPayload.match.status, 'COMPLETED');
    assert.deepEqual(recordedPayload.match.result, { home: 2, away: 1 });

    const memberCompletedList = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/matches?status=COMPLETED&limit=3`,
      headers: authHeaders(tables, memberUserId, 'parent'),
    });
    assert.equal(memberCompletedList.statusCode, 200);
    const completedPayload = memberCompletedList.json() as {
      total: number;
      matches: Array<{ id: string; status: string; result?: { home: number; away: number } }>;
    };
    assert.equal(completedPayload.total >= 1, true);
    assert.equal(
      completedPayload.matches.some(
        (match) =>
          match.id === createdPayload.match.id &&
          match.status === 'COMPLETED' &&
          match.result?.home === 2 &&
          match.result.away === 1,
      ),
      true,
    );

    const schedule = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, memberUserId, 'parent'),
    });
    assert.equal(schedule.statusCode, 200);
    const schedulePayload = schedule.json() as {
      activities: Array<{ source: string; sourceEntityId: string; resultLabel?: string }>;
    };
    assert.equal(
      schedulePayload.activities.some(
        (activity) =>
          activity.source === 'match' &&
          activity.sourceEntityId === createdPayload.match.id &&
          activity.resultLabel === '2-1',
      ),
      true,
    );

    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.create',
        resourceId: createdPayload.match.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.create',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      4,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.list',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.list',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.result.record',
        resourceId: createdPayload.match.id,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.result.record',
        resourceId: createdPayload.match.id,
        result: 'DENY',
      }).length,
      1,
    );
  });

  it('imports club matches through admin-only DB authority and skips repeated external fixtures', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, adminUserId } = getSeededClubIntegrationActors(tables);
    const nonAdminMembership = asRows(tables.clubMemberships).find((row) => {
      const role = parseOrganizationRole(asString(row.role));
      return (
        asString(row.clubId) === clubId &&
        asString(row.userId) !== adminUserId &&
        row.active !== false &&
        !asString(row.deletedAt) &&
        role !== 'OWNER' &&
        role !== 'ADMIN'
      );
    });
    const nonAdminUserId = asString(nonAdminMembership?.userId);
    assert.ok(nonAdminUserId, 'expected a non-admin club member for import denial');

    const importPayload = {
      source: 'league-fixtures',
      matches: [
        {
          externalId: 'fixture-import-001',
          title: 'Imported League Fixture',
          matchType: 'LEAGUE',
          opponent: 'Import Town',
          isHome: false,
          date: '2026-09-12',
          kickoffTime: '15:00',
          meetTime: '14:15',
          venue: 'Northbank Pitch',
          address: '7 Northbank Road',
          maxPlayers: 16,
          notes: 'Imported from league fixture feed.',
        },
      ],
    };

    const denied = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/matches/import`,
      headers: authHeaders(tables, nonAdminUserId),
      payload: importPayload,
    });
    assert.equal(denied.statusCode, 403);

    const matchCountBeforeInvalidImport = asRows(tables.matches).length;
    const invalidImport = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/matches/import`,
      headers: authHeaders(tables, adminUserId),
      payload: {
        ...importPayload,
        matches: importPayload.matches.map((match) => ({
          ...match,
          clientOnlyStatus: 'COMPLETED',
        })),
      },
    });
    assert.equal(invalidImport.statusCode, 400);
    assert.equal(asRows(tables.matches).length, matchCountBeforeInvalidImport);

    const imported = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/matches/import`,
      headers: authHeaders(tables, adminUserId),
      payload: importPayload,
    });
    assert.equal(imported.statusCode, 201);
    const importedPayload = imported.json() as {
      imported: Array<{
        id: string;
        clubId: string;
        title: string;
        opponent: string;
        status: string;
        timeZone: string;
      }>;
      skipped: Array<{ source: string; externalId: string; matchId: string; reason: string }>;
      total: number;
    };
    assert.equal(importedPayload.total, 1);
    assert.equal(importedPayload.imported.length, 1);
    assert.equal(importedPayload.skipped.length, 0);
    assert.equal(importedPayload.imported[0]?.clubId, clubId);
    assert.equal(importedPayload.imported[0]?.title, 'Imported League Fixture');
    assert.equal(importedPayload.imported[0]?.opponent, 'Import Town');
    assert.equal(importedPayload.imported[0]?.status, 'SCHEDULED');
    assert.equal(importedPayload.imported[0]?.timeZone, 'Europe/London');

    const storedMatch = asRows(tables.matches).find(
      (row) => asString(row.id) === importedPayload.imported[0]?.id,
    );
    assert.equal(asString(storedMatch?.importSource), 'league-fixtures');
    assert.equal(asString(storedMatch?.importExternalId), 'fixture-import-001');
    assert.equal(asString(storedMatch?.timeZone), 'Europe/London');
    assert.equal(asString(storedMatch?.startsAt), '2026-09-12T14:00:00.000Z');

    const repeated = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/matches/import`,
      headers: authHeaders(tables, adminUserId),
      payload: importPayload,
    });
    assert.equal(repeated.statusCode, 200);
    const repeatedPayload = repeated.json() as {
      imported: Array<{ id: string }>;
      skipped: Array<{ source: string; externalId: string; matchId: string; reason: string }>;
      total: number;
    };
    assert.equal(repeatedPayload.total, 1);
    assert.equal(repeatedPayload.imported.length, 0);
    assert.deepEqual(repeatedPayload.skipped, [
      {
        source: 'league-fixtures',
        externalId: 'fixture-import-001',
        matchId: importedPayload.imported[0]?.id ?? '',
        reason: 'already_imported',
      },
    ]);

    const listed = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/matches?limit=10`,
      headers: authHeaders(tables, adminUserId),
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as { matches: Array<{ id: string }> };
    assert.equal(
      listedPayload.matches.some((match) => match.id === importedPayload.imported[0]?.id),
      true,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.import',
        resourceId: clubId,
        result: 'DENY',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.import',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      2,
    );
  });

  it('persists match player invites, availability responses, and lineup selection', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, staffUserId, memberUserId, outsiderUserId } = getSeededClubMatchActors(tables);
    const athleteId = ensureLinkedAthleteForUser(tables, memberUserId);
    const squadId = ensureClubSquadForTest(tables, clubId);
    const now = new Date().toISOString();

    if (
      !asRows(tables.guardianChildLinks).some(
        (row) =>
          asString(row.athleteId) === athleteId &&
          asString(row.guardianUserId) === memberUserId &&
          !asString(row.deletedAt),
      )
    ) {
      ensureTable(tables, 'guardianChildLinks').push({
        id: `gcl_match_${athleteId}_${memberUserId}`,
        familyId: 'fam_match_test',
        guardianUserId: memberUserId,
        athleteId,
        relationshipType: 'parent',
        isPrimary: true,
        createdByUserId: memberUserId,
        updatedByUserId: memberUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });
    }
    if (
      !asRows(tables.squadMemberships).some(
        (row) =>
          asString(row.squadId) === squadId &&
          asString(row.athleteId) === athleteId &&
          asString(row.status) === 'active' &&
          !asString(row.deletedAt),
      )
    ) {
      ensureTable(tables, 'squadMemberships').push({
        id: `sqm_match_${squadId}_${athleteId}`,
        squadId,
        athleteId,
        status: 'active',
        createdByUserId: staffUserId,
        updatedByUserId: staffUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });
    }

    const created = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/matches`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        squadId,
        title: 'U15 League Fixture',
        matchType: 'LEAGUE',
        opponent: 'Availability Town',
        isHome: true,
        date: addDaysIso(10),
        kickoffTime: '11:00',
        venue: 'Riverside Main Pitch',
        maxPlayers: 14,
      },
    });
    assert.equal(created.statusCode, 201);
    const createdPayload = created.json() as { match: { id: string } };
    const matchId = createdPayload.match.id;

    const invitePayload = {
      players: [
        {
          athleteId,
          athleteName: 'Linked player',
          parentId: memberUserId,
          parentName: 'Linked guardian',
        },
      ],
    };

    const outsiderInvite = await app.inject({
      method: 'POST',
      url: `/v1/matches/${matchId}/players/invite`,
      headers: authHeaders(tables, outsiderUserId),
      payload: invitePayload,
    });
    assert.equal(outsiderInvite.statusCode, 403);

    const invited = await app.inject({
      method: 'POST',
      url: `/v1/matches/${matchId}/players/invite`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: invitePayload,
    });
    assert.equal(invited.statusCode, 200);
    const invitedPayload = invited.json() as {
      match: {
        selectedPlayers: Array<{ athleteId: string; parentId: string; status: string }>;
      };
    };
    assert.deepEqual(invitedPayload.match.selectedPlayers, [
      {
        athleteId,
        parentId: memberUserId,
        status: 'INVITED',
      },
    ]);
    assert.equal(
      asRows(tables.notifications).some(
        (row) =>
          asString(row.type) === 'MATCH_INVITE' &&
          asString(row.userId) === memberUserId &&
          asString(row.sourceId) === matchId,
      ),
      true,
    );

    const outsiderResponse = await app.inject({
      method: 'POST',
      url: `/v1/matches/${matchId}/players/respond`,
      headers: authHeaders(tables, outsiderUserId),
      payload: {
        athleteId,
        status: 'AVAILABLE',
      },
    });
    assert.equal(outsiderResponse.statusCode, 403);

    const responded = await app.inject({
      method: 'POST',
      url: `/v1/matches/${matchId}/players/respond`,
      headers: authHeaders(tables, memberUserId, 'parent'),
      payload: {
        athleteId,
        parentId: memberUserId,
        status: 'AVAILABLE',
        note: 'Can play full match.',
      },
    });
    assert.equal(responded.statusCode, 200);
    const respondedPayload = responded.json() as {
      match: {
        selectedPlayers: Array<{
          athleteId: string;
          status: string;
          parentNote?: string;
          responseAt?: string;
        }>;
      };
    };
    assert.equal(respondedPayload.match.selectedPlayers[0]?.status, 'AVAILABLE');
    assert.equal(respondedPayload.match.selectedPlayers[0]?.parentNote, 'Can play full match.');
    assert.ok(respondedPayload.match.selectedPlayers[0]?.responseAt);

    const memberLineup = await app.inject({
      method: 'PATCH',
      url: `/v1/matches/${matchId}/lineup`,
      headers: authHeaders(tables, memberUserId, 'parent'),
      payload: {
        lineup: [{ athleteId, position: 'ST', jerseyNumber: 9 }],
      },
    });
    assert.equal(memberLineup.statusCode, 403);

    const linedUp = await app.inject({
      method: 'PATCH',
      url: `/v1/matches/${matchId}/lineup`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        lineup: [{ athleteId, position: 'ST', jerseyNumber: 9 }],
      },
    });
    assert.equal(linedUp.statusCode, 200);
    const linedUpPayload = linedUp.json() as {
      match: {
        status: string;
        selectedPlayers: Array<{
          athleteId: string;
          status: string;
          position?: string;
          jerseyNumber?: number;
        }>;
      };
    };
    assert.equal(linedUpPayload.match.status, 'LINEUP_SET');
    assert.equal(linedUpPayload.match.selectedPlayers[0]?.status, 'SELECTED');
    assert.equal(linedUpPayload.match.selectedPlayers[0]?.position, 'ST');
    assert.equal(linedUpPayload.match.selectedPlayers[0]?.jerseyNumber, 9);

    assert.equal(
      asRows(tables.notifications).some(
        (row) =>
          asString(row.type) === 'MATCH_AVAILABILITY_RESPONSE' &&
          asString(row.userId) === staffUserId &&
          asString(row.sourceId) === matchId,
      ),
      true,
    );
    assert.equal(
      asRows(tables.notifications).some(
        (row) =>
          asString(row.type) === 'MATCH_LINEUP_SELECTION' &&
          asString(row.userId) === memberUserId &&
          asString(row.sourceId) === matchId,
      ),
      true,
    );

    const parentMatches = await app.inject({
      method: 'GET',
      url: '/v1/me/matches',
      headers: authHeaders(tables, memberUserId, 'parent'),
    });
    assert.equal(parentMatches.statusCode, 200);
    const parentMatchesPayload = parentMatches.json() as {
      matches: Array<{
        id: string;
        selectedPlayers: Array<{
          athleteId: string;
          parentId: string;
          status: string;
          position?: string;
          jerseyNumber?: number;
        }>;
      }>;
      total: number;
    };
    assert.equal(parentMatchesPayload.total >= 1, true);
    const parentMatch = parentMatchesPayload.matches.find((match) => match.id === matchId);
    assert.ok(parentMatch, 'expected invited guardian match in /v1/me/matches');
    assert.equal(parentMatch.selectedPlayers.length, 1);
    assert.equal(parentMatch.selectedPlayers[0]?.athleteId, athleteId);
    assert.equal(parentMatch.selectedPlayers[0]?.parentId, memberUserId);
    assert.equal(parentMatch.selectedPlayers[0]?.status, 'SELECTED');
    assert.equal(parentMatch.selectedPlayers[0]?.position, 'ST');
    assert.equal(parentMatch.selectedPlayers[0]?.jerseyNumber, 9);

    const outsiderCoachInvites = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${staffUserId}/match-invites`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(outsiderCoachInvites.statusCode, 403);

    const coachInvites = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${staffUserId}/match-invites`,
      headers: authHeaders(tables, staffUserId, 'coach'),
    });
    assert.equal(coachInvites.statusCode, 200);
    const coachInvitesPayload = coachInvites.json() as {
      invites: Array<{
        squadId: string;
        targetId: string;
        targetType: string;
        invitedBy: string;
        memberCount: number;
        responses: {
          accepted: number;
          declined: number;
          pending: number;
        };
      }>;
      total: number;
    };
    const coachMatchInvite = coachInvitesPayload.invites.find(
      (invite) => invite.targetId === matchId,
    );
    assert.ok(coachMatchInvite, 'expected coach match invite aggregate');
    assert.equal(coachMatchInvite.squadId, squadId);
    assert.equal(coachMatchInvite.targetType, 'MATCH');
    assert.equal(coachMatchInvite.invitedBy, staffUserId);
    assert.equal(coachMatchInvite.memberCount, 1);
    assert.deepEqual(coachMatchInvite.responses, {
      accepted: 1,
      declined: 0,
      pending: 0,
    });

    const outsiderMatches = await app.inject({
      method: 'GET',
      url: '/v1/me/matches',
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(outsiderMatches.statusCode, 200);
    const outsiderMatchesPayload = outsiderMatches.json() as {
      matches: Array<{ id: string }>;
    };
    assert.equal(
      outsiderMatchesPayload.matches.some((match) => match.id === matchId),
      false,
    );

    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.players.invite',
        resourceId: matchId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.players.invite',
        resourceId: matchId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.availability.respond',
        resourceId: matchId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.availability.respond',
        resourceId: matchId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.lineup.set',
        resourceId: matchId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.lineup.set',
        resourceId: matchId,
        result: 'DENY',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.me.read',
        resourceId: memberUserId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_match.me.read',
        resourceId: outsiderUserId,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('fails closed for club schedules in db mode when Prisma is unavailable', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = loadTables();
      const { clubId, userId } = getSeededClubMembership(tables);
      const fixtureStore = getDbFixtureStore();
      const fixtureOnlyEventId = 'cle_db_fixture_schedule_only';

      ensureTable(fixtureStore.tables, 'clubEvents').push({
        id: fixtureOnlyEventId,
        clubId,
        creatorUserId: userId,
        title: 'DB Fixture Planning Night',
        description: 'Only present in the db fixture store.',
        startsAt: `${addDaysIso(21)}T18:30:00.000Z`,
        endsAt: `${addDaysIso(21)}T19:15:00.000Z`,
        location: 'Fixture Room',
        status: 'PUBLISHED',
        visibility: 'club',
        createdByUserId: userId,
        updatedByUserId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await app.inject({
        method: 'GET',
        url: `/v1/clubs/${clubId}/schedule`,
        headers: authHeaders(tables, userId),
      });
      assert.equal(res.statusCode, 503);
      assert.match(res.body, /DATABASE_URL is not configured for db backend/);
      assert.equal(res.body.includes(fixtureOnlyEventId), false);
      assert.equal(res.body.includes('DB Fixture Planning Night'), false);
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
      resetCoachClubRouteStateForTests();
    }
  });

  it('returns authoritative coach availability slots and can exclude pending invite holds', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const viewerUserId =
      asString(asRows(tables.guardianChildLinks)[0]?.guardianUserId) ?? coachUserId;
    const targetDate = addDaysIso(10);
    const targetDayOfWeek = new Date(`${targetDate}T00:00:00.000Z`).getUTCDay();
    const store = getMarketplaceSeedStore();

    if (!Array.isArray(store.tables.availabilityTemplates)) {
      store.tables.availabilityTemplates = [];
    }
    if (!Array.isArray(store.tables.bookings)) {
      store.tables.bookings = [];
    }
    if (!Array.isArray(store.tables.invites)) {
      store.tables.invites = [];
    }
    if (!Array.isArray(store.tables.inviteTargets)) {
      store.tables.inviteTargets = [];
    }

    store.tables.availabilityTemplates.push({
      id: 'avt_authority_test',
      coachUserId,
      dayOfWeek: targetDayOfWeek,
      startTimeLocal: '17:00',
      endTimeLocal: '19:15',
      maxConcurrent: 1,
      bufferMinutes: 15,
      active: true,
      location: 'Authority Pitch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });
    store.tables.bookings.push({
      id: 'bok_authority_test',
      coachUserId,
      bookedByUserId: viewerUserId,
      status: 'CONFIRMED',
      scheduledAt: `${targetDate}T17:00:00.000Z`,
      durationMinutes: 60,
      location: 'Authority Pitch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: viewerUserId,
      updatedByUserId: viewerUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });
    store.tables.invites.push({
      id: 'inv_authority_test',
      senderUserId: coachUserId,
      inviteType: 'session_invite',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadataJson: {
        proposedSlots: [
          {
            date: targetDate,
            startTime: '18:15',
            endTime: '19:15',
          },
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revokedAt: null,
    });
    store.tables.inviteTargets.push({
      id: 'ivt_authority_test',
      inviteId: 'inv_authority_test',
      targetUserId: viewerUserId,
      status: 'PENDING',
      responsePayloadJson: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const listed = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/slots?start=${targetDate}&end=${targetDate}&durationMinutes=60`,
      headers: authHeaders(tables, viewerUserId),
    });
    assert.equal(listed.statusCode, 200);
    const listedPayload = listed.json() as {
      slots: Array<{
        date: string;
        startTime: string;
        isAvailable: boolean;
        bookedCount: number;
        location?: string;
      }>;
    };
    const bookedSlot = listedPayload.slots.find(
      (slot) => slot.date === targetDate && slot.startTime === '17:00',
    );
    const heldSlot = listedPayload.slots.find(
      (slot) => slot.date === targetDate && slot.startTime === '18:15',
    );
    assert.ok(bookedSlot, 'expected booked availability slot');
    assert.ok(heldSlot, 'expected held availability slot');
    assert.equal(bookedSlot.isAvailable, false);
    assert.equal(bookedSlot.bookedCount >= 1, true);
    assert.equal(heldSlot.isAvailable, true);
    assert.equal(heldSlot.location, 'Authority Pitch');

    const heldExcluded = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/slots?start=${targetDate}&end=${targetDate}&durationMinutes=60&excludePendingInvites=true`,
      headers: authHeaders(tables, viewerUserId),
    });
    assert.equal(heldExcluded.statusCode, 200);
    const heldExcludedPayload = heldExcluded.json() as {
      slots: Array<{ date: string; startTime: string; isAvailable: boolean }>;
    };
    const heldSlotAfterExclusion = heldExcludedPayload.slots.find(
      (slot) => slot.date === targetDate && slot.startTime === '18:15',
    );
    assert.ok(heldSlotAfterExclusion, 'expected held slot in exclusion response');
    assert.equal(heldSlotAfterExclusion.isAvailable, false);
  });

  it('returns authoritative availability conflicts for time-off checks', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const viewerUserId =
      asString(asRows(tables.guardianChildLinks)[0]?.guardianUserId) ?? coachUserId;
    const targetDate = addDaysIso(12);
    const store = getMarketplaceSeedStore();

    ensureTable(store.tables, 'bookings').push({
      id: 'bok_conflict_test',
      coachUserId,
      bookedByUserId: viewerUserId,
      status: 'CONFIRMED',
      scheduledAt: `${targetDate}T17:30:00.000Z`,
      durationMinutes: 60,
      location: 'Conflict Pitch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: viewerUserId,
      updatedByUserId: viewerUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });
    ensureTable(store.tables, 'invites').push({
      id: 'inv_conflict_test',
      senderUserId: coachUserId,
      inviteType: 'session_invite',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadataJson: {
        proposedSlots: [
          {
            date: targetDate,
            startTime: '18:45',
            endTime: '19:45',
          },
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revokedAt: null,
    });
    ensureTable(store.tables, 'inviteTargets').push({
      id: 'ivt_conflict_test',
      inviteId: 'inv_conflict_test',
      targetUserId: viewerUserId,
      status: 'PENDING',
      responsePayloadJson: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/conflicts?dates=${targetDate}`,
      headers: authHeaders(tables, viewerUserId),
    });
    assert.equal(res.statusCode, 200);
    const payload = res.json() as {
      bookingCount: number;
      holdCount: number;
      bookings: Array<{ id: string; date: string; time: string; location?: string }>;
      holds: Array<{ date: string; time: string; inviteId: string }>;
    };
    assert.equal(payload.bookingCount, 1);
    assert.equal(payload.holdCount, 1);
    assert.deepEqual(payload.bookings, [
      {
        id: 'bok_conflict_test',
        date: targetDate,
        time: '17:30',
        location: 'Conflict Pitch',
      },
    ]);
    assert.deepEqual(payload.holds, [
      {
        date: targetDate,
        time: '18:45',
        inviteId: 'inv_conflict_test',
      },
    ]);
  });

  it('applies scheduling-rule filtering only when requested on bookable slot reads', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const viewerUserId =
      asString(asRows(tables.guardianChildLinks)[0]?.guardianUserId) ?? coachUserId;
    const targetDate = addDaysIso(5);
    const targetDayOfWeek = new Date(`${targetDate}T00:00:00.000Z`).getUTCDay();
    const store = getMarketplaceSeedStore();

    if (!Array.isArray(store.tables.availabilityTemplates)) {
      store.tables.availabilityTemplates = [];
    }

    const schedulingRule = asRows(store.tables.schedulingRules).find(
      (row) => asString(row.coachUserId) === coachUserId,
    );
    assert.ok(schedulingRule, 'expected scheduling rule row');
    schedulingRule.minimumAdvanceBookingHours = 999;

    store.tables.availabilityTemplates.push({
      id: 'avt_rules_filter_test',
      coachUserId,
      dayOfWeek: targetDayOfWeek,
      startTimeLocal: '10:00',
      endTimeLocal: '11:00',
      maxConcurrent: 1,
      bufferMinutes: 0,
      active: true,
      location: 'Rules Pitch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });

    const raw = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/slots?start=${targetDate}&end=${targetDate}&durationMinutes=60`,
      headers: authHeaders(tables, viewerUserId),
    });
    assert.equal(raw.statusCode, 200);
    const rawPayload = raw.json() as {
      slots: Array<{ date: string; startTime: string }>;
    };
    assert.equal(
      rawPayload.slots.some((slot) => slot.date === targetDate && slot.startTime === '10:00'),
      true,
    );

    const filtered = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/slots?start=${targetDate}&end=${targetDate}&durationMinutes=60&applySchedulingRules=true`,
      headers: authHeaders(tables, viewerUserId),
    });
    assert.equal(filtered.statusCode, 200);
    const filteredPayload = filtered.json() as {
      slots: Array<{ date: string; startTime: string }>;
    };
    assert.equal(
      filteredPayload.slots.some((slot) => slot.date === targetDate && slot.startTime === '10:00'),
      false,
    );
  });

  it('keeps coach self profile, availability, and scheduling writes working in db fixture mode', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = loadTables();
      const coachUserId = getSeededCoachUserId(tables);
      const viewerUserId = getSeededNonCoachUserId(tables, coachUserId);

      const profile = await app.inject({
        method: 'GET',
        url: '/v1/coaches/me/profile',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(profile.statusCode, 200);
      const profilePayload = profile.json() as {
        profile: { userId: string };
        locations?: unknown[];
        availabilityTemplates?: unknown[];
        availabilityOverrides?: unknown[];
        schedulingRules?: unknown[];
        cancellationPolicyRules?: unknown[];
      };
      assert.equal(profilePayload.profile.userId, coachUserId);
      assert.equal(profilePayload.locations, undefined);
      assert.equal(profilePayload.availabilityTemplates, undefined);
      assert.equal(profilePayload.availabilityOverrides, undefined);
      assert.equal(profilePayload.schedulingRules, undefined);
      assert.equal(profilePayload.cancellationPolicyRules, undefined);

      const nonCoachProfile = await app.inject({
        method: 'GET',
        url: '/v1/coaches/me/profile',
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(nonCoachProfile.statusCode, 404);

      const lookalikeSocialLinkPatch = await app.inject({
        method: 'PATCH',
        url: '/v1/coaches/me/profile',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: { socialLinks: { instagram: 'https://evilinstagram.com/coach' } },
      });
      assert.equal(lookalikeSocialLinkPatch.statusCode, 400);

      const unsafeWebsitePatch = await app.inject({
        method: 'PATCH',
        url: '/v1/coaches/me/profile',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: { website: 'javascript:alert(1)' },
      });
      assert.equal(unsafeWebsitePatch.statusCode, 400);

      const duplicateWebsitePatch = await app.inject({
        method: 'PATCH',
        url: '/v1/coaches/me/profile',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: { socialLinks: { website: 'https://coach.example.com' } },
      });
      assert.equal(duplicateWebsitePatch.statusCode, 400);

      const profilePatch = await app.inject({
        method: 'PATCH',
        url: '/v1/coaches/me/profile',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          bio: 'DB-backed coach profile update',
          yearsExperience: 12,
          sessionRateMinor: 7250,
          priceMaxMinor: 9500,
          currency: 'gbp',
          website: 'https://coach.example.com',
          socialLinks: {
            instagram: 'https://instagram.com/coach.example',
          },
          experiences: [
            {
              id: 'exp_fixture',
              title: 'Academy coach',
              organization: 'North London FC',
              startDate: '2020',
              current: true,
            },
          ],
          languages: [
            {
              id: 'lang_fixture',
              name: 'Spanish',
              proficiency: 'Conversational',
            },
          ],
          specialties: ['Finishing', 'First touch'],
          qualifications: ['UEFA B'],
        },
      });
      assert.equal(profilePatch.statusCode, 200);
      const profilePatchPayload = profilePatch.json() as {
        profile: {
          bio?: string;
          yearsExperience?: number;
          sessionRateMinor?: number;
          priceMaxMinor?: number;
          currency?: string;
          website?: string;
          socialLinksJson?: { instagram?: string; website?: string };
          experiencesJson?: Array<{ title?: string; organization?: string }>;
          languagesJson?: Array<{ name?: string; proficiency?: string }>;
          specialties?: string[];
          qualifications?: string[];
        };
      };
      assert.equal(profilePatchPayload.profile.bio, 'DB-backed coach profile update');
      assert.equal(profilePatchPayload.profile.yearsExperience, 12);
      assert.equal(profilePatchPayload.profile.sessionRateMinor, 7250);
      assert.equal(profilePatchPayload.profile.priceMaxMinor, 9500);
      assert.equal(profilePatchPayload.profile.currency, 'GBP');
      assert.equal(profilePatchPayload.profile.website, 'https://coach.example.com');
      assert.equal(
        profilePatchPayload.profile.socialLinksJson?.instagram,
        'https://instagram.com/coach.example',
      );
      assert.equal(profilePatchPayload.profile.experiencesJson?.[0]?.title, 'Academy coach');
      assert.equal(profilePatchPayload.profile.languagesJson?.[0]?.name, 'Spanish');
      assert.deepEqual(profilePatchPayload.profile.specialties, ['Finishing', 'First touch']);
      assert.deepEqual(profilePatchPayload.profile.qualifications, ['UEFA B']);

      const searchFixtureTables = getDbFixtureStore().tables as SeedTables;
      const searchReviewAthleteId = asString(asRows(searchFixtureTables.athletes)[0]?.id);
      assert.ok(searchReviewAthleteId, 'expected athlete for public coach search aggregate');
      ensureTable(searchFixtureTables, 'bookings').push({
        id: 'booking_public_coach_search_rating',
        coachUserId,
        bookedByUserId: viewerUserId,
        status: 'COMPLETED',
        scheduledAt: '2026-07-03T12:00:00.000Z',
        durationMinutes: 60,
        location: 'API pitch',
        serviceType: '1-to-1',
        priceMinor: 7250,
        currency: 'GBP',
        createdByUserId: viewerUserId,
        updatedByUserId: viewerUserId,
        version: 1,
        createdAt: '2026-07-03T12:00:00.000Z',
        updatedAt: '2026-07-03T12:00:00.000Z',
      });
      ensureTable(searchFixtureTables, 'sessionFeedback').push({
        id: 'sfb_public_coach_search_rating',
        bookingId: 'booking_public_coach_search_rating',
        athleteId: searchReviewAthleteId,
        authorUserId: viewerUserId,
        rating: 5,
        publicComment: 'Excellent public feedback',
        visibility: 'public',
        createdAt: '2026-07-03T12:10:00.000Z',
        updatedAt: '2026-07-03T12:10:00.000Z',
      });
      for (const location of asRows(searchFixtureTables.coachLocations)) {
        if (asString(location.coachUserId) === coachUserId) {
          location.isDefault = false;
        }
      }
      ensureTable(searchFixtureTables, 'coachLocations').push({
        id: 'loc_public_coach_search_distance',
        coachUserId,
        label: 'Public Search Pitch',
        addressText: 'Hidden full address must not leak',
        latLngJson: {
          lat: 51.49,
          lng: -0.12,
        },
        isDefault: true,
        createdAt: '2026-07-03T12:00:00.000Z',
        updatedAt: '2026-07-03T12:00:00.000Z',
        createdByUserId: coachUserId,
        updatedByUserId: coachUserId,
        version: 1,
        deletedAt: null,
        deletedByUserId: null,
      });

      const nonCoachProfilePatch = await app.inject({
        method: 'PATCH',
        url: '/v1/coaches/me/profile',
        headers: authHeaders(tables, viewerUserId),
        payload: {
          bio: 'Should not write',
        },
      });
      assert.equal(nonCoachProfilePatch.statusCode, 404);

      const offerings = await app.inject({
        method: 'GET',
        url: '/v1/coaches/me/offerings',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(offerings.statusCode, 200);
      assert.equal((offerings.json() as { total: number }).total >= 1, true);

      const publicOfferingIndex = await app.inject({
        method: 'GET',
        url: '/v1/coaches/offerings',
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(publicOfferingIndex.statusCode, 200);
      const publicOfferingIndexPayload = publicOfferingIndex.json() as {
        total: number;
        offerings: Array<{
          coachUserId: string;
          active: boolean;
          deletedAt?: string | null;
          coachProfile?: {
            userId?: string;
            displayName?: string | null;
            priceMaxMinor?: number | null;
            website?: string | null;
            socialLinks?: Record<string, string>;
            experiences?: Array<{ title?: string }>;
            languages?: Array<{ name?: string }>;
          };
        }>;
      };
      assert.equal(publicOfferingIndexPayload.total >= 1, true);
      assert.equal(
        publicOfferingIndexPayload.offerings.every(
          (offering) => offering.active !== false && !offering.deletedAt,
        ),
        true,
      );
      const patchedPublicOffering = publicOfferingIndexPayload.offerings.find(
        (offering) => offering.coachUserId === coachUserId,
      );
      assert.equal(patchedPublicOffering?.coachProfile?.userId, coachUserId);
      assert.equal(
        patchedPublicOffering?.coachProfile?.displayName,
        getSeededUserName(tables, coachUserId),
      );
      assert.equal(patchedPublicOffering?.coachProfile?.priceMaxMinor, 9500);
      assert.equal(patchedPublicOffering?.coachProfile?.website, 'https://coach.example.com');
      assert.equal(
        patchedPublicOffering?.coachProfile?.socialLinks?.instagram,
        'https://instagram.com/coach.example',
      );
      assert.equal(patchedPublicOffering?.coachProfile?.experiences?.[0]?.title, 'Academy coach');
      assert.equal(patchedPublicOffering?.coachProfile?.languages?.[0]?.name, 'Spanish');

      const publicProfile = await app.inject({
        method: 'GET',
        url: `/v1/coaches/${coachUserId}/profile`,
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(publicProfile.statusCode, 200);
      const publicProfilePayload = publicProfile.json() as {
        coachId: string;
        total: number;
        coachProfile: {
          userId?: string;
          displayName?: string | null;
          priceMaxMinor?: number | null;
          website?: string | null;
          socialLinks?: Record<string, string>;
          experiences?: Array<{ title?: string }>;
          languages?: Array<{ name?: string }>;
          qualifications?: string[];
        };
        offerings: Array<{ coachUserId: string; active: boolean; deletedAt?: string | null }>;
      };
      assert.equal(publicProfilePayload.coachId, coachUserId);
      assert.equal(publicProfilePayload.coachProfile.userId, coachUserId);
      assert.equal(
        publicProfilePayload.coachProfile.displayName,
        getSeededUserName(tables, coachUserId),
      );
      assert.equal(publicProfilePayload.coachProfile.priceMaxMinor, 9500);
      assert.equal(publicProfilePayload.coachProfile.website, 'https://coach.example.com');
      assert.equal(
        publicProfilePayload.coachProfile.socialLinks?.instagram,
        'https://instagram.com/coach.example',
      );
      assert.equal(publicProfilePayload.coachProfile.experiences?.[0]?.title, 'Academy coach');
      assert.equal(publicProfilePayload.coachProfile.languages?.[0]?.name, 'Spanish');
      assert.deepEqual(publicProfilePayload.coachProfile.qualifications, ['UEFA B']);
      assert.equal(publicProfilePayload.total >= 1, true);
      assert.equal(
        publicProfilePayload.offerings.every(
          (offering) =>
            offering.coachUserId === coachUserId &&
            offering.active !== false &&
            !offering.deletedAt,
        ),
        true,
      );

      const publicSearch = await app.inject({
        method: 'GET',
        url: '/v1/coaches/search?query=Finishing&priceMax=100&focuses=Finishing&languages=Spanish&pageSize=5',
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(publicSearch.statusCode, 200);
      const publicSearchPayload = publicSearch.json() as {
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
        results: Array<{
          coachId: string;
          relevanceScore: number;
          matchedTerms: string[];
          minPriceMinor: number;
          maxPriceMinor: number;
          ratingAverage: number;
          reviewCount: number;
          coachProfile: {
            userId?: string;
            dbsChecked?: boolean;
            qualifications?: string[];
            publicLocations?: Array<{
              label: string;
              lat: number;
              lng: number;
              addressText?: string;
            }>;
          };
          offerings: Array<{ coachUserId: string; active: boolean; deletedAt?: string | null }>;
          focuses: string[];
          languages: string[];
          publicLocation?: {
            label: string;
            lat: number;
            lng: number;
            addressText?: string;
          };
          distanceKm?: number;
          distanceMiles?: number;
        }>;
        offerings: Array<{ coachUserId: string }>;
        filterOptions: {
          totalCount: number;
          focuses: Array<{ value: string; selected?: boolean }>;
          languages: Array<{ value: string; selected?: boolean }>;
          priceRange: { minMinor: number; maxMinor: number };
        };
      };
      assert.equal(publicSearchPayload.total >= 1, true);
      assert.equal(publicSearchPayload.page, 1);
      assert.equal(publicSearchPayload.pageSize, 5);
      assert.equal(typeof publicSearchPayload.hasMore, 'boolean');
      const publicSearchResult = publicSearchPayload.results.find(
        (result) => result.coachId === coachUserId,
      );
      assert.ok(publicSearchResult, 'expected patched coach in public search results');
      assert.equal(publicSearchResult.coachProfile.userId, coachUserId);
      assert.equal(publicSearchResult.coachProfile.dbsChecked, undefined);
      assert.deepEqual(publicSearchResult.coachProfile.qualifications, ['UEFA B']);
      assert.equal(publicSearchResult.publicLocation?.label, 'Public Search Pitch');
      assert.equal(publicSearchResult.publicLocation?.addressText, undefined);
      assert.equal(
        publicSearchResult.coachProfile.publicLocations?.[0]?.label,
        'Public Search Pitch',
      );
      assert.equal(publicSearchResult.coachProfile.publicLocations?.[0]?.addressText, undefined);
      assert.equal(publicSearchResult.relevanceScore > 0, true);
      assert.ok(publicSearchResult.matchedTerms.includes('finishing'));
      assert.equal(publicSearchResult.minPriceMinor, 7250);
      assert.equal(publicSearchResult.maxPriceMinor, 9500);
      assert.equal(publicSearchResult.ratingAverage > 0, true);
      assert.equal(publicSearchResult.reviewCount >= 1, true);
      assert.equal(publicSearchResult.focuses.includes('Finishing'), true);
      assert.equal(publicSearchResult.languages.includes('Spanish'), true);
      assert.equal(
        publicSearchResult.offerings.every(
          (offering) =>
            offering.coachUserId === coachUserId &&
            offering.active !== false &&
            !offering.deletedAt,
        ),
        true,
      );
      assert.equal(
        publicSearchPayload.offerings.every((offering) => offering.coachUserId === coachUserId),
        true,
      );
      assert.equal(publicSearchPayload.filterOptions.totalCount >= 1, true);
      assert.equal(publicSearchPayload.filterOptions.priceRange.minMinor > 0, true);
      assert.equal(
        publicSearchPayload.filterOptions.focuses.some(
          (focus) => focus.value === 'Finishing' && focus.selected === true,
        ),
        true,
      );
      assert.equal(
        publicSearchPayload.filterOptions.languages.some(
          (language) => language.value === 'Spanish' && language.selected === true,
        ),
        true,
      );

      const publicLocationTextSearch = await app.inject({
        method: 'GET',
        url: '/v1/coaches/search?query=Public%20Search%20Pitch&pageSize=5',
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(publicLocationTextSearch.statusCode, 200);
      const publicLocationTextPayload = publicLocationTextSearch.json() as {
        total: number;
        results: Array<{
          coachId: string;
          matchedTerms: string[];
          publicLocation?: { label: string; addressText?: string };
        }>;
      };
      const publicLocationTextResult = publicLocationTextPayload.results.find(
        (result) => result.coachId === coachUserId,
      );
      assert.ok(publicLocationTextResult, 'expected public location label to be searchable text');
      assert.equal(publicLocationTextResult.publicLocation?.label, 'Public Search Pitch');
      assert.equal(publicLocationTextResult.publicLocation?.addressText, undefined);
      assert.deepEqual(publicLocationTextResult.matchedTerms, ['public', 'search', 'pitch']);

      const privateAddressTextSearch = await app.inject({
        method: 'GET',
        url: '/v1/coaches/search?query=Hidden%20full%20address',
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(privateAddressTextSearch.statusCode, 200);
      assert.equal((privateAddressTextSearch.json() as { total: number }).total, 0);

      const locationPublicSearch = await app.inject({
        method: 'GET',
        url: '/v1/coaches/search?lat=51.49&lng=-0.12&radiusKm=2&sortBy=distance&pageSize=5',
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(locationPublicSearch.statusCode, 200);
      const locationPayload = locationPublicSearch.json() as {
        results: Array<{
          coachId: string;
          distanceKm?: number;
          distanceMiles?: number;
          publicLocation?: { label: string; addressText?: string };
        }>;
        total: number;
      };
      const locationResult = locationPayload.results.find(
        (result) => result.coachId === coachUserId,
      );
      assert.ok(locationResult, 'expected patched coach in distance search results');
      assert.equal((locationResult.distanceKm ?? 999) <= 0.1, true);
      assert.equal((locationResult.distanceMiles ?? 999) <= 0.1, true);
      assert.equal(locationResult.publicLocation?.label, 'Public Search Pitch');
      assert.equal(locationResult.publicLocation?.addressText, undefined);

      const farLocationPublicSearch = await app.inject({
        method: 'GET',
        url: '/v1/coaches/search?lat=0&lng=0&radiusKm=1&sortBy=distance&pageSize=5',
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(farLocationPublicSearch.statusCode, 200);
      assert.equal((farLocationPublicSearch.json() as { total: number }).total, 0);

      const invalidLocationPublicSearch = await app.inject({
        method: 'GET',
        url: '/v1/coaches/search?lat=51.49&radiusKm=2',
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(invalidLocationPublicSearch.statusCode, 400);

      const ratedPublicSearch = await app.inject({
        method: 'GET',
        url: '/v1/coaches/search?rating=4&pageSize=5',
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(ratedPublicSearch.statusCode, 200);
      const ratedPayload = ratedPublicSearch.json() as {
        results: Array<{ coachId: string; ratingAverage: number; reviewCount: number }>;
      };
      const ratedResult = ratedPayload.results.find((result) => result.coachId === coachUserId);
      assert.ok(ratedResult, 'expected public rating aggregate to satisfy rating filter');
      assert.equal(ratedResult.ratingAverage >= 4, true);
      assert.equal(ratedResult.reviewCount >= 1, true);

      const emptyPublicSearch = await app.inject({
        method: 'GET',
        url: '/v1/coaches/search?query=DefinitelyNoCoachMatchesThis',
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(emptyPublicSearch.statusCode, 200);
      assert.equal((emptyPublicSearch.json() as { total: number }).total, 0);

      const unauthenticatedSearch = await app.inject({
        method: 'GET',
        url: '/v1/coaches/search',
      });
      assert.equal(unauthenticatedSearch.statusCode, 403);

      const unauthenticatedProfile = await app.inject({
        method: 'GET',
        url: `/v1/coaches/${coachUserId}/profile`,
      });
      assert.equal(unauthenticatedProfile.statusCode, 403);

      const unauthenticatedOfferingIndex = await app.inject({
        method: 'GET',
        url: '/v1/coaches/offerings',
      });
      assert.equal(unauthenticatedOfferingIndex.statusCode, 403);

      const publicOfferings = await app.inject({
        method: 'GET',
        url: `/v1/coaches/${coachUserId}/offerings`,
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(publicOfferings.statusCode, 200);
      const publicOfferingsPayload = publicOfferings.json() as {
        coachId: string;
        total: number;
        offerings: Array<{ coachUserId: string; active: boolean; deletedAt?: string | null }>;
      };
      assert.equal(publicOfferingsPayload.coachId, coachUserId);
      assert.equal(publicOfferingsPayload.total >= 1, true);
      assert.equal(
        publicOfferingsPayload.offerings.every(
          (offering) =>
            offering.coachUserId === coachUserId &&
            offering.active !== false &&
            !offering.deletedAt,
        ),
        true,
      );

      const unauthenticatedOfferings = await app.inject({
        method: 'GET',
        url: `/v1/coaches/${coachUserId}/offerings`,
      });
      assert.equal(unauthenticatedOfferings.statusCode, 403);

      const templateCreate = await app.inject({
        method: 'POST',
        url: '/v1/coaches/me/availability/templates',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          dayOfWeek: 2,
          startTime: '10:00',
          endTime: '12:00',
          maxConcurrent: 2,
          bufferMinutes: 20,
          location: 'DB Fixture Dome',
        },
      });
      assert.equal(templateCreate.statusCode, 201);
      const createdTemplate = templateCreate.json() as {
        id: string;
        bufferMinutes: number;
        location?: string;
      };
      assert.equal(createdTemplate.bufferMinutes, 20);
      assert.equal(createdTemplate.location, 'DB Fixture Dome');

      const overrideDate = addDaysIso(20);
      const overrideCreate = await app.inject({
        method: 'POST',
        url: '/v1/coaches/me/availability/overrides',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          date: overrideDate,
          isBlocked: false,
          customSlots: [{ startTime: '13:00', endTime: '14:00', location: 'Indoor 3G' }],
          repeatUntil: addDaysIso(27),
          repeatDayOfWeek: new Date(`${overrideDate}T00:00:00.000Z`).getUTCDay(),
          repeatGroupId: 'grp_fixture_override',
        },
      });
      assert.equal(overrideCreate.statusCode, 201);
      const createdOverride = overrideCreate.json() as {
        id: string;
        customSlots?: Array<{ location?: string }>;
        repeatGroupId?: string;
      };
      assert.equal(createdOverride.customSlots?.[0]?.location, 'Indoor 3G');
      assert.equal(createdOverride.repeatGroupId, 'grp_fixture_override');

      const rulesPatch = await app.inject({
        method: 'PATCH',
        url: '/v1/coaches/me/scheduling-rules',
        headers: authHeaders(tables, coachUserId, 'coach'),
        payload: {
          minimumAdvanceBookingHours: 48,
          bufferMinutesDefault: 30,
          allowSameDayBookings: false,
          cancellationPolicy: {
            name: 'Fixture policy',
            description: 'DB fixture policy',
            tiers: [
              { hoursBeforeSession: 24, refundPercentage: 100, description: 'Full refund' },
              { hoursBeforeSession: 0, refundPercentage: 0, description: 'No refund' },
            ],
            minimumNoticeHours: 0,
            allowCancellations: true,
            isDefault: false,
          },
        },
      });
      assert.equal(rulesPatch.statusCode, 200);
      const rulesPayload = rulesPatch.json() as {
        rules: { minimumAdvanceBookingHours: number; bufferMinutesDefault: number };
        cancellationPolicy: { name: string; tiers: unknown[] } | null;
      };
      assert.equal(rulesPayload.rules.minimumAdvanceBookingHours, 48);
      assert.equal(rulesPayload.rules.bufferMinutesDefault, 30);
      assert.equal(rulesPayload.cancellationPolicy?.name, 'Fixture policy');
      assert.equal(rulesPayload.cancellationPolicy?.tiers.length, 2);

      const fixtureTables = getDbFixtureStore().tables;
      const storedTemplate = asRows(fixtureTables.availabilityTemplates).find(
        (row) => asString(row.id) === createdTemplate.id,
      );
      const storedOverride = asRows(fixtureTables.availabilityOverrides).find(
        (row) => asString(row.id) === createdOverride.id,
      );
      const storedRules = asRows(fixtureTables.schedulingRules).find(
        (row) => asString(row.coachUserId) === coachUserId,
      );
      const storedProfile = asRows(fixtureTables.coachProfiles).find(
        (row) => asString(row.userId) === coachUserId,
      );
      assert.ok(storedTemplate, 'expected template persisted in db fixture store');
      assert.ok(storedOverride, 'expected override persisted in db fixture store');
      assert.ok(storedRules, 'expected scheduling rules persisted in db fixture store');
      assert.ok(storedProfile, 'expected coach profile persisted in db fixture store');
      assert.equal(Number(storedTemplate?.bufferMinutes), 20);
      assert.equal(asString(storedOverride?.repeatGroupId), 'grp_fixture_override');
      assert.equal(Number(storedRules?.minimumAdvanceBookingHours), 48);
      assert.equal(asString(storedProfile?.bio), 'DB-backed coach profile update');
      assert.equal(Number(storedProfile?.sessionRateMinor), 7250);
      assert.equal(Number(storedProfile?.priceMaxMinor), 9500);
      assert.equal(asString(storedProfile?.website), 'https://coach.example.com');
      assert.equal(
        (storedProfile?.socialLinksJson as { instagram?: string } | undefined)?.instagram,
        'https://instagram.com/coach.example',
      );
      assert.equal(
        (storedProfile?.experiencesJson as Array<{ title?: string }> | undefined)?.[0]?.title,
        'Academy coach',
      );
      assert.equal(
        (storedProfile?.languagesJson as Array<{ name?: string }> | undefined)?.[0]?.name,
        'Spanish',
      );
      assert.equal(
        auditEventsFor(fixtureTables, {
          action: 'coach_profile.read',
          resourceId: coachUserId,
          result: 'SUCCESS',
        }).filter((row) => row.sensitiveRead === true).length,
        1,
      );
      assert.equal(
        auditEventsFor(fixtureTables, {
          action: 'coach_profile.read',
          resourceId: viewerUserId,
          result: 'DENY',
        }).filter((row) => row.sensitiveRead === true).length,
        1,
      );
      assert.equal(
        auditEventsFor(fixtureTables, {
          action: 'coach_profile.update',
          resourceId: coachUserId,
          result: 'SUCCESS',
        }).length,
        1,
      );
      assert.equal(
        auditEventsFor(fixtureTables, {
          action: 'coach_profile.update',
          resourceId: viewerUserId,
          result: 'DENY',
        }).length,
        1,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
      resetCoachClubRouteStateForTests();
    }
  });

  it('keeps favourite coaches self-scoped and backend-authoritative in db fixture mode', async () => {
    const previousBackend = env.API_DATA_BACKEND;
    env.API_DATA_BACKEND = 'db';

    try {
      const tables = loadTables();
      const coachUserId = getSeededCoachUserId(tables);
      const parentUserId = asString(asRows(tables.guardianChildLinks)[0]?.guardianUserId);
      assert.ok(parentUserId, 'expected seeded guardian user');
      const maliciousUserId = asString(
        asRows(tables.users).find((row) => asString(row.id) !== parentUserId)?.id,
      );
      assert.ok(maliciousUserId, 'expected another user id for forged body proof');

      const unauthenticated = await app.inject({
        method: 'GET',
        url: '/v1/me/favourite-coaches',
      });
      assert.equal(unauthenticated.statusCode, 403);

      const saved = await app.inject({
        method: 'POST',
        url: `/v1/me/favourite-coaches/${coachUserId}`,
        headers: authHeaders(tables, parentUserId, 'parent'),
        payload: {
          userId: maliciousUserId,
          note: 'Preferred for repeat technical sessions',
        },
      });
      assert.equal(saved.statusCode, 201);
      const savedPayload = saved.json() as {
        isFavourite: boolean;
        favourite: {
          id: string;
          userId: string;
          coachId: string;
          coachName?: string;
          note?: string;
        };
      };
      assert.equal(savedPayload.isFavourite, true);
      assert.equal(savedPayload.favourite.userId, parentUserId);
      assert.equal(savedPayload.favourite.coachId, coachUserId);
      assert.equal(typeof savedPayload.favourite.coachName, 'string');
      assert.equal(savedPayload.favourite.note, 'Preferred for repeat technical sessions');

      const store = getDbFixtureStore();
      const storedFavourite = asRows(store.tables.coachFavourites).find(
        (row) => asString(row.id) === savedPayload.favourite.id,
      );
      assert.ok(storedFavourite, 'expected favourite persisted in db fixture store');
      assert.equal(asString(storedFavourite.userId), parentUserId);
      assert.equal(asString(storedFavourite.userId) === maliciousUserId, false);
      assert.equal(asString(storedFavourite.coachUserId), coachUserId);

      const list = await app.inject({
        method: 'GET',
        url: '/v1/me/favourite-coaches',
        headers: authHeaders(tables, parentUserId, 'parent'),
      });
      assert.equal(list.statusCode, 200);
      const listPayload = list.json() as { total: number; favourites: Array<{ id: string }> };
      assert.equal(listPayload.total, 1);
      assert.equal(listPayload.favourites[0]?.id, savedPayload.favourite.id);

      const status = await app.inject({
        method: 'GET',
        url: `/v1/me/favourite-coaches/${coachUserId}`,
        headers: authHeaders(tables, parentUserId, 'parent'),
      });
      assert.equal(status.statusCode, 200);
      assert.equal((status.json() as { isFavourite: boolean }).isFavourite, true);

      const deniedSelfSave = await app.inject({
        method: 'POST',
        url: `/v1/me/favourite-coaches/${coachUserId}`,
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(deniedSelfSave.statusCode, 403);
      assert.equal(
        asRows(store.tables.coachFavourites).some(
          (row) =>
            asString(row.userId) === coachUserId &&
            asString(row.coachUserId) === coachUserId &&
            row.isFavourite === true,
        ),
        false,
      );

      const removed = await app.inject({
        method: 'DELETE',
        url: `/v1/me/favourite-coaches/${coachUserId}`,
        headers: authHeaders(tables, parentUserId, 'parent'),
      });
      assert.equal(removed.statusCode, 200);
      assert.equal((removed.json() as { isFavourite: boolean }).isFavourite, false);
      assert.equal(asString(storedFavourite.deletedByUserId), parentUserId);
      assert.equal(storedFavourite.isFavourite, false);

      const removedStatus = await app.inject({
        method: 'GET',
        url: `/v1/me/favourite-coaches/${coachUserId}`,
        headers: authHeaders(tables, parentUserId, 'parent'),
      });
      assert.equal(removedStatus.statusCode, 200);
      assert.equal((removedStatus.json() as { isFavourite: boolean }).isFavourite, false);

      const deniedRepeatRemove = await app.inject({
        method: 'DELETE',
        url: `/v1/me/favourite-coaches/${coachUserId}`,
        headers: authHeaders(tables, parentUserId, 'parent'),
      });
      assert.equal(deniedRepeatRemove.statusCode, 404);

      const saveAudit = auditEventsFor(store.tables, {
        action: 'coach_favourite.save',
        resourceId: coachUserId,
        result: 'SUCCESS',
      }).at(-1);
      assert.equal(asString(saveAudit?.actorUserId), parentUserId);
      assert.equal(asString(asRecord(saveAudit?.metadataJson)?.ignoredBodyUserId), maliciousUserId);
      assert.equal(
        auditEventsFor(store.tables, {
          action: 'coach_favourite.save',
          resourceId: coachUserId,
          result: 'DENY',
        }).some((row) => asString(row.actorUserId) === coachUserId),
        true,
      );
      assert.equal(
        auditEventsFor(store.tables, {
          action: 'coach_favourite.remove',
          resourceId: coachUserId,
          result: 'SUCCESS',
        }).some((row) => asString(row.actorUserId) === parentUserId),
        true,
      );
      assert.equal(
        auditEventsFor(store.tables, {
          action: 'coach_favourite.remove',
          resourceId: coachUserId,
          result: 'DENY',
        }).some((row) => asString(row.actorUserId) === parentUserId),
        true,
      );
    } finally {
      env.API_DATA_BACKEND = previousBackend;
      resetMarketplaceSeedStoreForTests();
      resetDbFixtureStoreForTests();
      resetCoachClubRouteStateForTests();
    }
  });

  it('returns club event detail for an authorized member', async () => {
    const tables = loadTables();
    const { clubId, userId } = getSeededClubMembership(tables);

    const list = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(list.statusCode, 200);

    const activity = (
      list.json() as { activities: Array<{ id: string; source: string; sourceEntityId: string }> }
    ).activities.find((candidate) => candidate.source === 'club_event');
    assert.ok(activity, 'expected club event activity');

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule/${activity.id}`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(detail.statusCode, 200);

    const payload = detail.json() as {
      clubId: string;
      activity: { id: string; source: string; sourceEntityId: string };
    };
    assert.equal(payload.clubId, clubId);
    assert.equal(payload.activity.id, activity.id);
    assert.equal(payload.activity.source, 'club_event');
    assert.equal(payload.activity.sourceEntityId, activity.sourceEntityId);
  });

  it('returns group session detail for an authorized member', async () => {
    const tables = loadTables();
    const { clubId, userId } = getSeededClubMembership(tables);

    const list = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(list.statusCode, 200);

    const activity = (
      list.json() as { activities: Array<{ id: string; source: string; sourceEntityId: string }> }
    ).activities.find((candidate) => candidate.source === 'group_session');
    assert.ok(activity, 'expected group session activity');

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule/${activity.id}`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(detail.statusCode, 200);

    const payload = detail.json() as {
      clubId: string;
      activity: { id: string; source: string; sourceEntityId: string };
    };
    assert.equal(payload.clubId, clubId);
    assert.equal(payload.activity.id, activity.id);
    assert.equal(payload.activity.source, 'group_session');
    assert.equal(payload.activity.sourceEntityId, activity.sourceEntityId);
  });

  it('returns match detail for an authorized member when a match exists for the club', async () => {
    const tables = loadTables();
    const { clubId, userId } = getSeededClubMembership(tables);
    const store = getMarketplaceSeedStore();
    if (!Array.isArray(store.tables.matches)) {
      store.tables.matches = [];
    }

    store.tables.matches.push({
      id: 'match_test_club_schedule_detail',
      clubId,
      title: 'Sunday Fixture',
      startsAt: '2026-04-20T10:00:00.000Z',
      status: 'SCHEDULED',
      matchType: 'league',
      venue: 'Main Pitch',
      opponent: 'Riverside FC',
      isHome: true,
    });

    const detail = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule/club_activity:match:match_test_club_schedule_detail`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(detail.statusCode, 200);

    const payload = detail.json() as {
      clubId: string;
      activity: { id: string; source: string; sourceEntityId: string; title: string };
    };
    assert.equal(payload.clubId, clubId);
    assert.equal(payload.activity.id, 'club_activity:match:match_test_club_schedule_detail');
    assert.equal(payload.activity.source, 'match');
    assert.equal(payload.activity.sourceEntityId, 'match_test_club_schedule_detail');
    assert.equal(payload.activity.title, 'Sunday Fixture');
  });

  it('denies club activity detail to non-members of a private club', async () => {
    const tables = loadTables();
    const { clubId, userId } = getSeededClubMembership(tables);
    const list = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(list.statusCode, 200);

    const activity = (list.json() as { activities: Array<{ id: string }> }).activities[0];
    assert.ok(activity, 'expected seeded activity');

    const outsider = asRows(tables.users).find((row) => {
      const outsiderUserId = asString(row.id);
      if (!outsiderUserId) {
        return false;
      }

      const roles = rolesForUser(tables, outsiderUserId);
      const isMember = asRows(tables.clubMemberships).some(
        (candidate) =>
          asString(candidate.clubId) === clubId &&
          asString(candidate.userId) === outsiderUserId &&
          candidate.active !== false,
      );
      return !isMember && !roles.includes('club_admin') && !roles.includes('security_admin');
    });
    assert.ok(outsider, 'expected non-member outsider');

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule/${activity.id}`,
      headers: authHeaders(tables, asString(outsider.id) as string),
    });
    assert.equal(denied.statusCode, 403);
  });

  it('returns 404 for a stale club activity id', async () => {
    const tables = loadTables();
    const { clubId, userId } = getSeededClubMembership(tables);

    const res = await app.inject({
      method: 'GET',
      url: `/v1/clubs/${clubId}/schedule/club_activity:club_event:missing`,
      headers: authHeaders(tables, userId),
    });
    assert.equal(res.statusCode, 404);
  });

  it('denies and audits every self-availability route for a non-coach account', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const nonCoachUserId = getSeededNonCoachUserId(tables, coachUserId);
    const headers = authHeaders(tables, nonCoachUserId);
    const attempts = [
      {
        method: 'GET',
        url: '/v1/coaches/me/availability/templates',
        action: 'coach_availability_template.read',
      },
      {
        method: 'POST',
        url: '/v1/coaches/me/availability/templates',
        action: 'coach_availability_template.create',
        payload: {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '10:00',
        },
      },
      {
        method: 'PATCH',
        url: '/v1/coaches/me/availability/templates/tmpl_denied',
        action: 'coach_availability_template.update',
        payload: {
          startTime: '10:00',
        },
      },
      {
        method: 'DELETE',
        url: '/v1/coaches/me/availability/templates/tmpl_denied',
        action: 'coach_availability_template.remove',
      },
      {
        method: 'GET',
        url: '/v1/coaches/me/availability/overrides',
        action: 'coach_availability_override.read',
      },
      {
        method: 'POST',
        url: '/v1/coaches/me/availability/overrides',
        action: 'coach_availability_override.create',
        payload: {
          date: '2026-03-20',
          isBlocked: true,
        },
      },
      {
        method: 'PATCH',
        url: '/v1/coaches/me/availability/overrides/ovr_denied',
        action: 'coach_availability_override.update',
        payload: {
          isBlocked: false,
        },
      },
      {
        method: 'DELETE',
        url: '/v1/coaches/me/availability/overrides/ovr_denied',
        action: 'coach_availability_override.remove',
      },
    ] as const;

    for (const attempt of attempts) {
      const response = await app.inject({
        method: attempt.method,
        url: attempt.url,
        headers,
        ...('payload' in attempt ? { payload: attempt.payload } : {}),
      });
      assert.equal(response.statusCode, 404, `${attempt.method} ${attempt.url}`);
    }

    const auditTables = getMarketplaceSeedStore().tables;
    for (const attempt of attempts) {
      const matching = auditEventsFor(auditTables, {
        action: attempt.action,
        result: 'DENY',
      }).filter((row) => asString(row.actorUserId) === nonCoachUserId);
      assert.equal(matching.length, 1, `expected one denied audit for ${attempt.action}`);
      assert.equal(matching[0]?.sensitiveRead === true, attempt.action.endsWith('.read'));
    }
  });

  it('lets a coach manage self availability templates via v1 routes', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const headers = authHeaders(tables, coachUserId, 'coach');

    const list = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/availability/templates',
      headers,
    });
    assert.equal(list.statusCode, 200);
    const initialPayload = list.json() as { templates: Array<{ coachId: string }> };
    assert.equal(initialPayload.templates.length > 0, true);
    assert.equal(
      initialPayload.templates.every((template) => template.coachId === coachUserId),
      true,
    );

    const created = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/availability/templates',
      headers,
      payload: {
        coachId: coachUserId,
        dayOfWeek: 5,
        startTime: '18:00',
        endTime: '20:00',
        isRecurring: true,
        maxConcurrent: 3,
        bufferMinutes: 10,
        location: 'Test Dome',
      },
    });
    assert.equal(created.statusCode, 201);
    const createdTemplate = created.json() as {
      id: string;
      coachId: string;
      dayOfWeek: number;
      maxConcurrent: number;
      location?: string;
    };
    assert.equal(createdTemplate.coachId, coachUserId);
    assert.equal(createdTemplate.dayOfWeek, 5);
    assert.equal(createdTemplate.maxConcurrent, 3);
    assert.equal(createdTemplate.location, 'Test Dome');

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/me/availability/templates/${createdTemplate.id}`,
      headers,
      payload: {
        coachId: coachUserId,
        dayOfWeek: 5,
        startTime: '18:30',
        endTime: '20:30',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 20,
        location: 'Updated Dome',
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedTemplate = updated.json() as {
      id: string;
      maxConcurrent: number;
      location?: string;
    };
    assert.equal(updatedTemplate.id, createdTemplate.id);
    assert.equal(updatedTemplate.maxConcurrent, 1);
    assert.equal(updatedTemplate.location, 'Updated Dome');

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/me/availability/templates/${createdTemplate.id}`,
      headers,
    });
    assert.equal(deleted.statusCode, 204);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'coach_availability_template.remove',
        resourceId: createdTemplate.id,
        result: 'SUCCESS',
      }).length,
      1,
    );

    const afterDelete = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/availability/templates',
      headers,
    });
    const finalPayload = afterDelete.json() as { templates: Array<{ id: string }> };
    assert.equal(
      finalPayload.templates.some((template) => template.id === createdTemplate.id),
      false,
    );

    const auditTables = getMarketplaceSeedStore().tables;
    assert.equal(
      auditEventsFor(auditTables, {
        action: 'coach_availability_template.read',
        result: 'SUCCESS',
      }).filter((row) => asString(row.actorUserId) === coachUserId).length,
      2,
    );
    assert.equal(
      auditEventsFor(auditTables, {
        action: 'coach_availability_template.read',
        result: 'SUCCESS',
      }).every((row) => row.sensitiveRead === true),
      true,
    );
    for (const action of [
      'coach_availability_template.create',
      'coach_availability_template.update',
      'coach_availability_template.remove',
    ]) {
      assert.equal(
        auditEventsFor(auditTables, {
          action,
          resourceId: createdTemplate.id,
          result: 'SUCCESS',
        }).length,
        1,
      );
    }
    const templateAuditJson = JSON.stringify(
      asRows(auditTables.auditEvents).filter((row) =>
        (asString(row.action) ?? '').startsWith('coach_availability_template.'),
      ),
    );
    assert.equal(templateAuditJson.includes('Test Dome'), false);
    assert.equal(templateAuditJson.includes('Updated Dome'), false);
  });

  it('lets a coach manage self availability overrides with date filtering', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const headers = authHeaders(tables, coachUserId, 'coach');

    const list = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/availability/overrides?start=2026-03-01&end=2026-03-31',
      headers,
    });
    assert.equal(list.statusCode, 200);
    const initialPayload = list.json() as { overrides: Array<{ coachId: string; date: string }> };
    assert.equal(
      initialPayload.overrides.every((override) => override.coachId === coachUserId),
      true,
    );
    assert.equal(
      initialPayload.overrides.every(
        (override) => override.date >= '2026-03-01' && override.date <= '2026-03-31',
      ),
      true,
    );

    const created = await app.inject({
      method: 'POST',
      url: '/v1/coaches/me/availability/overrides',
      headers,
      payload: {
        coachId: coachUserId,
        date: '2026-03-20',
        isBlocked: false,
        reason: 'Extra session window',
        customSlots: [
          {
            date: '2026-03-20',
            startTime: '09:00',
            endTime: '10:30',
            location: 'Training Annex',
          },
        ],
      },
    });
    assert.equal(created.statusCode, 201);
    const createdOverride = created.json() as {
      id: string;
      date: string;
      customSlots?: Array<{ startTime: string }>;
    };
    assert.equal(createdOverride.date, '2026-03-20');
    assert.equal(createdOverride.customSlots?.[0]?.startTime, '09:00');

    const updated = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/me/availability/overrides/${createdOverride.id}`,
      headers,
      payload: {
        reason: 'Updated extra session window',
      },
    });
    assert.equal(updated.statusCode, 200);
    assert.equal((updated.json() as { reason?: string }).reason, 'Updated extra session window');

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/me/availability/overrides/${createdOverride.id}`,
      headers,
    });
    assert.equal(deleted.statusCode, 204);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables, {
        action: 'coach_availability_override.remove',
        resourceId: createdOverride.id,
        result: 'SUCCESS',
      }).length,
      1,
    );

    const auditTables = getMarketplaceSeedStore().tables;
    for (const action of [
      'coach_availability_override.read',
      'coach_availability_override.create',
      'coach_availability_override.update',
      'coach_availability_override.remove',
    ]) {
      const matching = auditEventsFor(auditTables, {
        action,
        result: 'SUCCESS',
      }).filter((row) => asString(row.actorUserId) === coachUserId);
      assert.equal(matching.length, 1, `expected one successful audit for ${action}`);
      if (action === 'coach_availability_override.read') {
        assert.equal(matching[0]?.sensitiveRead, true);
      } else {
        assert.equal(asString(matching[0]?.resourceId), createdOverride.id);
      }
    }
    const overrideAuditJson = JSON.stringify(
      asRows(auditTables.auditEvents).filter((row) =>
        (asString(row.action) ?? '').startsWith('coach_availability_override.'),
      ),
    );
    assert.equal(overrideAuditJson.includes('Extra session window'), false);
    assert.equal(overrideAuditJson.includes('Updated extra session window'), false);
    assert.equal(overrideAuditJson.includes('Training Annex'), false);
  });

  it('lets privileged admins manage delegated coach availability with audits and soft removal', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const adminMembership = asRows(tables.userRoleMemberships).find((row) => {
      const role = asString(row.role);
      return role === 'security_admin' || role === 'club_admin' || role === 'admin';
    });
    const adminUserId = asString(adminMembership?.userId);
    const adminRole = asString(adminMembership?.role);
    assert.ok(adminUserId, 'expected seeded privileged admin user');
    assert.ok(adminRole, 'expected seeded privileged admin role');

    const outsiderUserId = asRows(tables.users)
      .map((row) => asString(row.id))
      .find((candidate): candidate is string => {
        if (!candidate || candidate === coachUserId || candidate === adminUserId) {
          return false;
        }
        return !rolesForUser(tables, candidate).some(
          (role) => role === 'security_admin' || role === 'club_admin' || role === 'admin',
        );
      });
    assert.ok(outsiderUserId, 'expected non-privileged outsider');

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/templates`,
      headers: authHeaders(tables, outsiderUserId),
    });
    assert.equal(denied.statusCode, 403);

    const adminHeaders = authHeaders(tables, adminUserId, adminRole);
    const templateCreate = await app.inject({
      method: 'POST',
      url: `/v1/coaches/${coachUserId}/availability/templates`,
      headers: adminHeaders,
      payload: {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00',
        maxConcurrent: 2,
        bufferMinutes: 15,
        location: 'Delegated Dome',
      },
    });
    assert.equal(templateCreate.statusCode, 201);
    const createdTemplate = templateCreate.json() as {
      id: string;
      coachId: string;
      maxConcurrent: number;
      location?: string;
    };
    assert.equal(createdTemplate.coachId, coachUserId);
    assert.equal(createdTemplate.location, 'Delegated Dome');

    const templateUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/${coachUserId}/availability/templates/${createdTemplate.id}`,
      headers: adminHeaders,
      payload: {
        maxConcurrent: 1,
        bufferMinutes: 30,
        location: 'Delegated Dome Updated',
      },
    });
    assert.equal(templateUpdate.statusCode, 200);
    const updatedTemplate = templateUpdate.json() as {
      id: string;
      maxConcurrent: number;
      location?: string;
    };
    assert.equal(updatedTemplate.id, createdTemplate.id);
    assert.equal(updatedTemplate.maxConcurrent, 1);
    assert.equal(updatedTemplate.location, 'Delegated Dome Updated');

    const templateList = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/templates`,
      headers: adminHeaders,
    });
    assert.equal(templateList.statusCode, 200);
    const templateListPayload = templateList.json() as {
      templates: Array<{ id: string; coachId: string }>;
    };
    assert.equal(
      templateListPayload.templates.some(
        (template) => template.id === createdTemplate.id && template.coachId === coachUserId,
      ),
      true,
    );

    const templateDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/${coachUserId}/availability/templates/${createdTemplate.id}`,
      headers: adminHeaders,
    });
    assert.equal(templateDelete.statusCode, 204);

    const overrideCreate = await app.inject({
      method: 'POST',
      url: `/v1/coaches/${coachUserId}/availability/overrides`,
      headers: adminHeaders,
      payload: {
        date: '2026-03-22',
        isBlocked: false,
        reason: 'Delegated exception window',
        customSlots: [
          {
            startTime: '14:00',
            endTime: '15:30',
            location: 'Delegated Pitch',
          },
        ],
      },
    });
    assert.equal(overrideCreate.statusCode, 201);
    const createdOverride = overrideCreate.json() as {
      id: string;
      coachId: string;
      reason?: string;
      customSlots?: Array<{ startTime: string }>;
    };
    assert.equal(createdOverride.coachId, coachUserId);
    assert.equal(createdOverride.reason, 'Delegated exception window');
    assert.equal(createdOverride.customSlots?.[0]?.startTime, '14:00');

    const overrideUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/coaches/${coachUserId}/availability/overrides/${createdOverride.id}`,
      headers: adminHeaders,
      payload: {
        reason: 'Delegated exception updated',
      },
    });
    assert.equal(overrideUpdate.statusCode, 200);
    assert.equal(
      (overrideUpdate.json() as { reason?: string }).reason,
      'Delegated exception updated',
    );

    const overrideList = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/availability/overrides?start=2026-03-01&end=2026-03-31`,
      headers: adminHeaders,
    });
    assert.equal(overrideList.statusCode, 200);
    const overrideListPayload = overrideList.json() as {
      overrides: Array<{ id: string; coachId: string }>;
    };
    assert.equal(
      overrideListPayload.overrides.some(
        (override) => override.id === createdOverride.id && override.coachId === coachUserId,
      ),
      true,
    );

    const overrideDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/${coachUserId}/availability/overrides/${createdOverride.id}`,
      headers: adminHeaders,
    });
    assert.equal(overrideDelete.statusCode, 204);

    const liveTables = getMarketplaceSeedStore().tables;
    const storedTemplate = asRows(liveTables.availabilityTemplates).find(
      (row) => asString(row.id) === createdTemplate.id,
    );
    const storedOverride = asRows(liveTables.availabilityOverrides).find(
      (row) => asString(row.id) === createdOverride.id,
    );
    assert.ok(storedTemplate, 'expected delegated template row');
    assert.ok(storedOverride, 'expected delegated override row');
    assert.equal(asString(storedTemplate.coachUserId), coachUserId);
    assert.equal(asString(storedTemplate.createdByUserId), adminUserId);
    assert.equal(asString(storedTemplate.updatedByUserId), adminUserId);
    assert.equal(asString(storedTemplate.deletedByUserId), adminUserId);
    assert.equal(storedTemplate.active, false);
    assert.equal(asString(storedOverride.coachUserId), coachUserId);
    assert.equal(asString(storedOverride.createdByUserId), adminUserId);
    assert.equal(asString(storedOverride.updatedByUserId), adminUserId);
    assert.equal(asString(storedOverride.deletedByUserId), adminUserId);
    assert.equal(storedOverride.active, false);
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'coach_availability_template.delegated_read',
        result: 'DENY',
      }).some((row) => asString(row.actorUserId) === outsiderUserId),
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'coach_availability_template.delegated_create',
        resourceId: createdTemplate.id,
        result: 'SUCCESS',
      }).some((row) => asString(row.actorUserId) === adminUserId),
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'coach_availability_template.delegated_update',
        resourceId: createdTemplate.id,
        result: 'SUCCESS',
      }).some((row) => asString(row.actorUserId) === adminUserId),
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'coach_availability_template.delegated_remove',
        resourceId: createdTemplate.id,
        result: 'SUCCESS',
      }).some((row) => asString(row.actorUserId) === adminUserId),
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'coach_availability_override.delegated_create',
        resourceId: createdOverride.id,
        result: 'SUCCESS',
      }).some((row) => asString(row.actorUserId) === adminUserId),
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'coach_availability_override.delegated_update',
        resourceId: createdOverride.id,
        result: 'SUCCESS',
      }).some((row) => asString(row.actorUserId) === adminUserId),
      true,
    );
    assert.equal(
      auditEventsFor(liveTables, {
        action: 'coach_availability_override.delegated_remove',
        resourceId: createdOverride.id,
        result: 'SUCCESS',
      }).some((row) => asString(row.actorUserId) === adminUserId),
      true,
    );
  });

  it('lets a coach update self scheduling rules and cancellation policy via v1 routes', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const headers = authHeaders(tables, coachUserId, 'coach');

    const existing = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/scheduling-rules',
      headers,
    });
    assert.equal(existing.statusCode, 200);
    const existingPayload = existing.json() as {
      rules: { coachId: string; minimumAdvanceBookingHours: number };
      cancellationPolicy: { tiers: Array<{ hoursBeforeSession: number }> } | null;
    };
    assert.equal(existingPayload.rules.coachId, coachUserId);
    assert.equal(existingPayload.rules.minimumAdvanceBookingHours > 0, true);
    assert.equal((existingPayload.cancellationPolicy?.tiers.length ?? 0) > 0, true);

    const viewerUserId = getSeededNonCoachUserId(tables, coachUserId);
    const publicRead = await app.inject({
      method: 'GET',
      url: `/v1/coaches/${coachUserId}/scheduling-rules`,
      headers: authHeaders(tables, viewerUserId, 'parent'),
    });
    assert.equal(publicRead.statusCode, 200);
    const publicPayload = publicRead.json() as {
      rules: { coachId: string; minimumAdvanceBookingHours: number };
      cancellationPolicy: { tiers: Array<{ hoursBeforeSession: number }> } | null;
    };
    assert.equal(publicPayload.rules.coachId, coachUserId);
    assert.equal(
      publicPayload.rules.minimumAdvanceBookingHours,
      existingPayload.rules.minimumAdvanceBookingHours,
    );
    assert.equal((publicPayload.cancellationPolicy?.tiers.length ?? 0) > 0, true);
    assert.equal(
      auditEventsFor(getMarketplaceSeedStore().tables as SeedTables, {
        action: 'coach_scheduling_rules.read',
        resourceId: coachUserId,
        result: 'SUCCESS',
      }).length,
      1,
    );

    const updated = await app.inject({
      method: 'PATCH',
      url: '/v1/coaches/me/scheduling-rules',
      headers,
      payload: {
        minimumAdvanceBookingHours: 36,
        maxAdvanceBookingDays: 45,
        bufferMinutesDefault: 20,
        maxConcurrentDefault: 2,
        allowSameDayBookings: false,
        cancellationPolicy: {
          name: 'Coach custom',
          description: 'Custom policy',
          minimumNoticeHours: 6,
          allowCancellations: true,
          isDefault: false,
          tiers: [
            { hoursBeforeSession: 24, refundPercentage: 100, description: 'Full refund' },
            { hoursBeforeSession: 6, refundPercentage: 50, description: 'Half refund' },
            { hoursBeforeSession: 0, refundPercentage: 0, description: 'No refund' },
          ],
        },
      },
    });
    assert.equal(updated.statusCode, 200);
    const updatedPayload = updated.json() as {
      rules: {
        minimumAdvanceBookingHours: number;
        maxAdvanceBookingDays: number;
        bufferMinutesDefault: number;
        maxConcurrentDefault: number;
        allowSameDayBookings: boolean;
      };
      cancellationPolicy: {
        name: string;
        tiers: Array<{ hoursBeforeSession: number; refundPercentage: number }>;
      } | null;
    };
    assert.equal(updatedPayload.rules.minimumAdvanceBookingHours, 36);
    assert.equal(updatedPayload.rules.maxAdvanceBookingDays, 45);
    assert.equal(updatedPayload.rules.bufferMinutesDefault, 20);
    assert.equal(updatedPayload.rules.maxConcurrentDefault, 2);
    assert.equal(updatedPayload.rules.allowSameDayBookings, false);
    assert.equal(updatedPayload.cancellationPolicy?.name, 'Coach custom');
    assert.deepEqual(
      updatedPayload.cancellationPolicy?.tiers.map((tier) => ({
        hoursBeforeSession: tier.hoursBeforeSession,
        refundPercentage: tier.refundPercentage,
      })),
      [
        { hoursBeforeSession: 24, refundPercentage: 100 },
        { hoursBeforeSession: 6, refundPercentage: 50 },
        { hoursBeforeSession: 0, refundPercentage: 0 },
      ],
    );

    const invalidUpdate = await app.inject({
      method: 'PATCH',
      url: '/v1/coaches/me/scheduling-rules',
      headers,
      payload: {
        minimumAdvanceBookingHours: -1,
      },
    });
    assert.equal(invalidUpdate.statusCode, 400);

    const afterInvalidUpdate = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/scheduling-rules',
      headers,
    });
    assert.equal(afterInvalidUpdate.statusCode, 200);
    assert.equal(
      (afterInvalidUpdate.json() as { rules: { minimumAdvanceBookingHours: number } }).rules
        .minimumAdvanceBookingHours,
      36,
    );

    const auditRows = getMarketplaceSeedStore().tables as SeedTables;
    assert.equal(
      auditEventsFor(auditRows, {
        action: 'coach_scheduling_rules.update',
        resourceId: coachUserId,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(auditRows, {
        action: 'coach_scheduling_rules.update',
        resourceId: coachUserId,
        result: 'DENY',
      }).length,
      1,
    );
  });
});
