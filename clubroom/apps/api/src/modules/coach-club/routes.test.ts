import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import {
  canManageClubMembers,
  canManageClubRole,
  canUseClubCapability,
  isClubStaffRole,
  parseOrganizationRole,
} from '@clubroom/shared-contracts';
import { buildApp } from '../../app.js';
import { getDbFixtureStore, resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';
import { resetCoachClubRouteStateForTests } from './routes.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
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
  const primary = path.resolve(process.cwd(), 'docs/backend-api/test-data/marketplace/linked-dataset.json');
  if (fs.existsSync(primary)) {
    return primary;
  }

  const fallback = path.resolve(process.cwd(), '../../docs/backend-api/test-data/marketplace/linked-dataset.json');
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

function authHeaders(tables: SeedTables, userId: string, preferredRole?: string): Record<string, string> {
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
        (membership) => asString(membership.clubId) === clubId && asString(membership.userId) === userId,
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
        (membership) => asString(membership.clubId) === clubId && asString(membership.userId) === userId,
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
        asString(row.userId) !== asString(manager?.userId) &&
        Boolean(role && isClubStaffRole(role))
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
        (membership) => asString(membership.clubId) === clubId && asString(membership.userId) === userId,
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
    assert.equal(payload.activities.some((activity) => activity.source === 'club_event'), true);
    assert.equal(payload.activities.some((activity) => activity.source === 'group_session'), true);
    assert.equal(payload.activities.some((activity) => activity.kind === 'informational'), true);
    assert.equal(payload.activities.some((activity) => activity.kind === 'training'), true);

    const sorted = payload.activities.every((activity, index, items) => {
      if (index === 0) return true;
      return new Date(items[index - 1].startsAt).getTime() <= new Date(activity.startsAt).getTime();
    });
    assert.equal(sorted, true);
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
        (candidate) => asString(candidate.clubId) === clubId && asString(candidate.userId) === userId && candidate.active !== false,
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
        (candidate) => asString(candidate.clubId) === clubId && asString(candidate.userId) === userId && candidate.active !== false,
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
    const payload = res.json() as {
      club: { id: string };
      viewerMembership: { role: string };
      canManageAssignments: boolean;
      staff: Array<{ userId: string; upcomingLoad: number; nextSessionAt?: string }>;
      assignedWork: Array<{
        offeringId: string;
        assigneeCoachId?: string;
        linkedBookingCount: number;
        status: string;
      }>;
      unassignedWork: Array<{ offeringId: string }>;
      summary: { activeOrgSessions: number; unassignedCount: number };
    };
    assert.equal(payload.club.id, clubId);
    assert.notEqual(payload.viewerMembership.role, 'MEMBER');
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
    assert.equal(payload.unassignedWork.some((item) => item.offeringId === sessionId), false);
    assert.equal(payload.summary.activeOrgSessions >= 1, true);
    assert.equal(payload.summary.unassignedCount, 0);

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
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_staffing_console.read',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length >= 1,
      true,
    );
  });

  it('reassigns club work and linked bookings through governed v1 authority', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, managerUserId, deliveryCoachUserId, memberUserId } =
      getSeededClubStaffingActors(tables);
    const startsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.parse(startsAt) + 60 * 60 * 1000).toISOString();
    const sessionId = 'gse_staffing_reassign_test';
    const bookingId = 'book_staffing_reassign_test';

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

    const reassigned = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/work-assignments/${sessionId}`,
      headers: authHeaders(tables, managerUserId),
      payload: {
        assigneeCoachId: managerUserId,
      },
    });
    assert.equal(reassigned.statusCode, 200);
    const payload = reassigned.json() as {
      offering: { id: string; assigneeCoachId: string; coachId: string };
      updatedBookingIds: string[];
    };
    assert.equal(payload.offering.id, sessionId);
    assert.equal(payload.offering.assigneeCoachId, managerUserId);
    assert.equal(payload.offering.coachId, managerUserId);
    assert.deepEqual(payload.updatedBookingIds, [bookingId]);

    const session = asRows(tables.groupSessions).find((row) => asString(row.id) === sessionId);
    const booking = asRows(tables.bookings).find((row) => asString(row.id) === bookingId);
    assert.equal(asString(session?.coachUserId), managerUserId);
    assert.equal(asString(booking?.coachUserId), managerUserId);
    assert.equal(asString(booking?.coachName), getSeededUserName(tables, managerUserId));
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_work_assignment.update',
        resourceId: sessionId,
        result: 'SUCCESS',
      }).length,
      1,
    );
  });

  it('returns live head-coach oversight scoped to assigned squads', async () => {
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
    const adminPayload = adminView.json() as {
      scope: { type: string };
      completionQueue: Array<{ bookingId: string }>;
    };
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
    const headCoachPayload = headCoachView.json() as {
      scope: { type: string; squadIds: string[] };
      squads: Array<{ id: string }>;
      completionQueue: Array<{ bookingId: string; squadId?: string; coachId: string }>;
      coachHealth: Array<{ coachId: string }>;
      tasks: unknown[];
      standards: unknown[];
      watchlist: unknown[];
    };
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
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_head_coach_oversight.read',
        resourceId: clubId,
        result: 'SUCCESS',
      }).length,
      2,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_head_coach_oversight.read',
        resourceId: clubId,
        result: 'DENY',
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
    const payload = adminView.json() as {
      viewerMembership: { role: string };
      summary: {
        activeStaffCount: number;
        awaitingCompletionCount: number;
        supportIssueCount: number;
      };
      finance: {
        openTotal: number;
        orgCreditOpen: number;
        overdueCount: number;
        note: string;
      };
      completionQueue: Array<{ bookingId: string }>;
      supportIssues: Array<{ bookingId: string; status: string; category: string }>;
    };
    assert.equal(['OWNER', 'ADMIN'].includes(payload.viewerMembership.role), true);
    assert.equal(payload.summary.activeStaffCount > 0, true);
    assert.equal(
      payload.completionQueue.some((item) => item.bookingId === bookingId),
      true,
    );
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
      1,
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
    assert.equal(afterRemovePayload.members.some((member) => member.userId === targetUserId), false);

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
    const memberInviteCode = inviteCodesPayload.inviteCodes.find((code) => code.role === 'MEMBER')?.code;
    assert.ok(memberInviteCode, 'expected member invite code');

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
        code: memberInviteCode,
      },
    });
    assert.equal(bannedRejoin.statusCode, 403);

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
    assert.ok(ordinaryMemberUserId, 'expected ordinary club member without squad-management capability');

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
    assert.equal(memberListPayload.squads.every((squad) => squad.clubId === clubId), true);

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

    const storedSquad = asRows(tables.squads).find(
      (row) => asString(row.id) === createdPayload.squad.id,
    );
    assert.equal(asString(storedSquad?.name), 'U13 Pathway');
    assert.equal(asString(storedSquad?.ageBandLabel), 'U13 · Foundation');
    assert.equal(asString(storedSquad?.ownerCoachUserId), managerUserId);

    const fetched = await app.inject({
      method: 'GET',
      url: `/v1/squads/${createdPayload.squad.id}`,
      headers: authHeaders(tables, managerUserId),
    });
    assert.equal(fetched.statusCode, 200);
    const fetchedPayload = fetched.json() as {
      squad: { id: string; name: string };
    };
    assert.equal(fetchedPayload.squad.id, createdPayload.squad.id);

    const deniedUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/clubs/${clubId}/squads/${createdPayload.squad.id}`,
      headers: authHeaders(tables, ordinaryMemberUserId),
      payload: {
        name: 'Blocked Rename',
      },
    });
    assert.equal(deniedUpdate.statusCode, 403);

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
      1,
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
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad.delete',
        resourceId: `${clubId}:${createdPayload.squad.id}`,
        result: 'SUCCESS',
      }).length,
      1,
    );
    assert.equal(
      auditEventsFor(tables, {
        action: 'club_squad.delete',
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
              asString(membership.squadId) === squadId &&
              !asString(membership.deletedAt),
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
      assert.equal(payload.members.every((member) => member.squadId === squadId), true);
      assert.equal(payload.members.every((member) => Boolean(member.athleteId && member.parentId)), true);
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
      listedPayload.members.find((member) => member.userId === targetUserId)?.squadIds.includes(squadId),
      true,
    );

    const deniedRemove = await app.inject({
      method: 'DELETE',
      url: `/v1/clubs/${clubId}/squads/${squadId}/members/${targetUserId}`,
      headers: authHeaders(tables, targetUserId),
    });
    assert.equal(deniedRemove.statusCode, 403);

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
      1,
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

    const created = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/matches`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
        title: 'U15 Cup Fixture',
        matchType: 'CUP',
        opponent: 'Fixture Town',
        isHome: true,
        date: addDaysIso(8),
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
      match: { id: string; clubId: string; coachId: string; status: string; result?: unknown };
    };
    assert.equal(createdPayload.match.clubId, clubId);
    assert.equal(createdPayload.match.coachId, staffUserId);
    assert.equal(createdPayload.match.status, 'SCHEDULED');
    assert.ok(createdPayload.match.id.startsWith('mat_'));

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

  it('persists match player invites, availability responses, and lineup selection', async () => {
    const store = getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const { clubId, staffUserId, memberUserId, outsiderUserId } = getSeededClubMatchActors(tables);
    const athleteId = ensureLinkedAthleteForUser(tables, memberUserId);
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

    const created = await app.inject({
      method: 'POST',
      url: `/v1/clubs/${clubId}/matches`,
      headers: authHeaders(tables, staffUserId, 'coach'),
      payload: {
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
  });

  it('serves club schedules from the db fixture backend when API_DATA_BACKEND=db', async () => {
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
      assert.equal(res.statusCode, 200);

      const payload = res.json() as {
        activities: Array<{ id: string; source: string; title: string }>;
        seedVersion?: string | null;
      };
      assert.equal(payload.seedVersion, fixtureStore.version);
      assert.equal(
        payload.activities.some(
          (activity) =>
            activity.id === `club_activity:club_event:${fixtureOnlyEventId}` &&
            activity.source === 'club_event' &&
            activity.title === 'DB Fixture Planning Night',
        ),
        true,
      );
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
    const viewerUserId = asString(asRows(tables.guardianChildLinks)[0]?.guardianUserId) ?? coachUserId;
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
      slots: Array<{ date: string; startTime: string; isAvailable: boolean; bookedCount: number; location?: string }>;
    };
    const bookedSlot = listedPayload.slots.find((slot) => slot.date === targetDate && slot.startTime === '17:00');
    const heldSlot = listedPayload.slots.find((slot) => slot.date === targetDate && slot.startTime === '18:15');
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

  it('applies scheduling-rule filtering only when requested on bookable slot reads', async () => {
    const tables = loadTables();
    const coachUserId = getSeededCoachUserId(tables);
    const viewerUserId = asString(asRows(tables.guardianChildLinks)[0]?.guardianUserId) ?? coachUserId;
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

      const profile = await app.inject({
        method: 'GET',
        url: '/v1/coaches/me/profile',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(profile.statusCode, 200);
      const profilePayload = profile.json() as {
        locations: unknown[];
        availabilityTemplates: unknown[];
      };
      assert.equal(profilePayload.locations.length >= 1, true);
      assert.equal(profilePayload.availabilityTemplates.length >= 1, true);

      const offerings = await app.inject({
        method: 'GET',
        url: '/v1/coaches/me/offerings',
        headers: authHeaders(tables, coachUserId, 'coach'),
      });
      assert.equal(offerings.statusCode, 200);
      assert.equal((offerings.json() as { total: number }).total >= 1, true);

      const viewerUserId = getSeededNonCoachUserId(tables, coachUserId);
      const publicOfferingIndex = await app.inject({
        method: 'GET',
        url: '/v1/coaches/offerings',
        headers: authHeaders(tables, viewerUserId),
      });
      assert.equal(publicOfferingIndex.statusCode, 200);
      const publicOfferingIndexPayload = publicOfferingIndex.json() as {
        total: number;
        offerings: Array<{ coachUserId: string; active: boolean; deletedAt?: string | null }>;
      };
      assert.equal(publicOfferingIndexPayload.total >= 1, true);
      assert.equal(
        publicOfferingIndexPayload.offerings.every(
          (offering) => offering.active !== false && !offering.deletedAt,
        ),
        true,
      );

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
      assert.ok(storedTemplate, 'expected template persisted in db fixture store');
      assert.ok(storedOverride, 'expected override persisted in db fixture store');
      assert.ok(storedRules, 'expected scheduling rules persisted in db fixture store');
      assert.equal(Number(storedTemplate?.bufferMinutes), 20);
      assert.equal(asString(storedOverride?.repeatGroupId), 'grp_fixture_override');
      assert.equal(Number(storedRules?.minimumAdvanceBookingHours), 48);
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
        favourite: { id: string; userId: string; coachId: string; coachName?: string; note?: string };
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

    const activity = (list.json() as { activities: Array<{ id: string; source: string; sourceEntityId: string }> }).activities.find(
      (candidate) => candidate.source === 'club_event',
    );
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

    const activity = (list.json() as { activities: Array<{ id: string; source: string; sourceEntityId: string }> }).activities.find(
      (candidate) => candidate.source === 'group_session',
    );
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
        (candidate) => asString(candidate.clubId) === clubId && asString(candidate.userId) === outsiderUserId && candidate.active !== false,
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
    assert.equal(initialPayload.templates.every((template) => template.coachId === coachUserId), true);

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
    const updatedTemplate = updated.json() as { id: string; maxConcurrent: number; location?: string };
    assert.equal(updatedTemplate.id, createdTemplate.id);
    assert.equal(updatedTemplate.maxConcurrent, 1);
    assert.equal(updatedTemplate.location, 'Updated Dome');

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/me/availability/templates/${createdTemplate.id}`,
      headers,
    });
    assert.equal(deleted.statusCode, 204);

    const afterDelete = await app.inject({
      method: 'GET',
      url: '/v1/coaches/me/availability/templates',
      headers,
    });
    const finalPayload = afterDelete.json() as { templates: Array<{ id: string }> };
    assert.equal(finalPayload.templates.some((template) => template.id === createdTemplate.id), false);
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
    assert.equal(initialPayload.overrides.every((override) => override.coachId === coachUserId), true);
    assert.equal(initialPayload.overrides.every((override) => override.date >= '2026-03-01' && override.date <= '2026-03-31'), true);

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
    const createdOverride = created.json() as { id: string; date: string; customSlots?: Array<{ startTime: string }> };
    assert.equal(createdOverride.date, '2026-03-20');
    assert.equal(createdOverride.customSlots?.[0]?.startTime, '09:00');

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/v1/coaches/me/availability/overrides/${createdOverride.id}`,
      headers,
    });
    assert.equal(deleted.statusCode, 204);
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
  });
});
