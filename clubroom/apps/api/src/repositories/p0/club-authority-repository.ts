import { randomUUID } from 'node:crypto';
import {
  canManageClubRole,
  canUseClubCapability,
  parseOrganizationRole,
} from '@clubroom/shared-contracts';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';
type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const asIsoString = (value: unknown, fallback = new Date().toISOString()): string =>
  typeof value === 'string'
    ? value
    : value instanceof Date
      ? value.toISOString()
      : fallback;
const isTruthy = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;
export interface ClubMembershipSummary {
  id: string;
  clubId: string;
  userId: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface ClubSummary {
  id: string;
  name: string;
  slug?: string | null;
  visibility?: string | null;
  createdByUserId?: string;
  inviteCode: string | null;
}
export interface VisibleClub extends ClubSummary {
  memberships: ClubMembershipSummary[];
  viewerMembership: ClubMembershipSummary | null;
  squads: Array<Record<string, unknown>>;
}
export interface ClubMemberRecord {
  userId: string;
  userName: string;
  userPhotoUrl?: string | null;
  role: string;
  status: 'active' | 'pending' | 'banned';
  joinedAt: string;
  squadIds: string[];
}
export interface ClubSquadRecord {
  id: string;
  clubId: string;
  name: string;
  level: string;
  description?: string;
  memberCount: number;
  primaryCoach: string;
  meetLocation: string;
  tags?: string[];
}
export interface SquadMemberRecord {
  id: string;
  squadId: string;
  athleteId: string;
  parentId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  joinedAt: string;
  position?: string;
}
export interface AthleteSquadMembershipRecord {
  id: string;
  athleteId: string;
  squadId: string;
  clubId: string;
  squadName: string;
  squadLevel: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  joinedAt: string;
}
export interface ClubMemberRemovalRecord {
  id: string;
  clubId: string;
  userId: string;
  userName: string;
  userRole: string;
  reason: string;
  customReason?: string | null;
  removedBy: string;
  removedByName: string;
  removedAt: string;
  originalMembership: ClubMembershipSummary;
}
export interface ClubInviteCodeRecord {
  id: string;
  clubId: string;
  code: string;
  role: string;
  createdByUserId: string;
  createdAt: string;
  expiresAt: string;
  remainingUses: number;
}
export interface ClubJoinPreview {
  clubId: string;
  clubName: string;
  clubSlug?: string | null;
  visibility?: string | null;
  inviteCode: string;
  role: string;
  joinFlow: 'direct_join' | 'invite_review';
  expiresAt: string;
  alreadyMember: boolean;
}
export interface PendingClubInvite {
  id: string;
  clubId: string;
  clubName: string;
  targetUserId: string;
  inviteCode: string;
  role: string;
  invitedByUserId: string;
  invitedByLabel: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt: string;
  respondedAt?: string | null;
}
export interface JoinWithCodeResult {
  outcome: 'joined' | 'invite_pending' | 'already_member';
  club: ClubSummary;
  membership: ClubMembershipSummary | null;
  invite: PendingClubInvite | null;
}
export interface RespondToInviteResult {
  invite: PendingClubInvite;
  membership: ClubMembershipSummary | null;
  club: ClubSummary;
}
export interface ClubAuthorityRepository {
  listVisibleClubs(params: {
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<VisibleClub[]>;
  listClubMembers(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord[]>;
  listClubSquads(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubSquadRecord[]>;
  getClubSquad(params: {
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubSquadRecord>;
  listSquadMembers(params: {
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<SquadMemberRecord[]>;
  listAthleteSquadMemberships(params: {
    athleteId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<AthleteSquadMembershipRecord[]>;
  createClubSquad(params: {
    clubId: string;
    name: string;
    level?: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubSquadRecord>;
  updateClubSquad(params: {
    clubId: string;
    squadId: string;
    name?: string;
    level?: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubSquadRecord>;
  deleteClubSquad(params: {
    clubId: string;
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<void>;
  updateClubMemberRole(params: {
    clubId: string;
    userId: string;
    role: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord>;
  removeClubMember(params: {
    clubId: string;
    userId: string;
    reason: string;
    customReason?: string | null;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRemovalRecord>;
  banClubMember(params: {
    clubId: string;
    userId: string;
    reason: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRemovalRecord>;
  restoreRemovedClubMember(params: {
    clubId: string;
    removalId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord>;
  addClubMemberToSquad(params: {
    clubId: string;
    userId: string;
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord>;
  removeClubMemberFromSquad(params: {
    clubId: string;
    userId: string;
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord>;
  listInviteCodes(params: { clubId: string; authUserId: string }): Promise<ClubInviteCodeRecord[]>;
  createInviteCode(params: {
    clubId: string;
    authUserId: string;
    role: string;
  }): Promise<ClubInviteCodeRecord>;
  deleteInviteCode(params: { clubId: string; authUserId: string; code: string }): Promise<void>;
  resolveJoinCode(params: { authUserId: string; code: string }): Promise<ClubJoinPreview>;
  joinWithCode(params: {
    authUserId: string;
    code: string;
    actingAuthCanUseStaffLinks: boolean;
  }): Promise<JoinWithCodeResult>;
  listPendingInvites(params: { authUserId: string }): Promise<PendingClubInvite[]>;
  respondToInvite(params: {
    authUserId: string;
    inviteId: string;
    response: 'accepted' | 'declined';
  }): Promise<RespondToInviteResult>;
}
function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}
function toStoreRole(role: string): string {
  if (role === 'ADMIN') {
    return 'club_admin';
  }
  return role.toLowerCase();
}
function buildCodePrefix(clubName: string): string {
  const normalized = clubName.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return normalized.slice(0, 5) || 'CLUB';
}
function buildInviteCode(clubName: string, role: string): string {
  const suffix = role === 'MEMBER' ? 'JOIN' : role.replace(/[^A-Za-z]/g, '').slice(0, 4) || 'TEAM';
  return `${buildCodePrefix(clubName)}-${suffix}`;
}
function buildDefaultInviteCode(clubName: string, role: string, clubId: string): string {
  const clubSuffix =
    clubId
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(-4)
      .toUpperCase() || 'CLUB';
  return `${buildInviteCode(clubName, role)}-${clubSuffix}`;
}
function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
function isActiveStoreRow(row: SeedRow): boolean {
  return row.active !== false && !asString(row.deletedAt);
}
function isPendingInviteStatus(
  status: string | undefined,
): status is 'pending' | 'accepted' | 'declined' {
  return status === 'pending' || status === 'accepted' || status === 'declined';
}
function toPendingInviteStatus(value: string | undefined): 'pending' | 'accepted' | 'declined' {
  const normalized = value?.toLowerCase();
  if (isPendingInviteStatus(normalized)) {
    return normalized;
  }
  return 'pending';
}
function toMembershipSummary(row: {
  id: string;
  clubId: string;
  userId: string;
  role: string;
  active?: boolean;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}): ClubMembershipSummary {
  const createdAt =
    typeof row.createdAt === 'string'
      ? row.createdAt
      : row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date().toISOString();
  const updatedAt =
    typeof row.updatedAt === 'string'
      ? row.updatedAt
      : row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : createdAt;
  return {
    id: row.id,
    clubId: row.clubId,
    userId: row.userId,
    role: row.role,
    active: row.active !== false,
    createdAt,
    updatedAt,
  };
}
function requireManageInvites(membershipRole: string | undefined): void {
  const viewerRole = parseOrganizationRole(membershipRole);
  if (!viewerRole || !canUseClubCapability(viewerRole, 'manage_staff_and_invites')) {
    throw forbidden('You do not have permission to manage club invites');
  }
}
function requireManageMembers(membershipRole: string | undefined): NonNullable<
  ReturnType<typeof parseOrganizationRole>
> {
  const viewerRole = parseOrganizationRole(membershipRole);
  if (!viewerRole || !canUseClubCapability(viewerRole, 'manage_staff_and_invites')) {
    throw forbidden('You do not have permission to manage club members');
  }
  return viewerRole;
}
function requireManageClubSquads(membershipRole: string | undefined): void {
  const viewerRole = parseOrganizationRole(membershipRole);
  if (!viewerRole || !canUseClubCapability(viewerRole, 'manage_staff_and_invites')) {
    throw forbidden('You do not have permission to manage club squads');
  }
}
function toContractRoleString(role: unknown): string {
  return parseOrganizationRole(role) ?? 'MEMBER';
}
function membershipStatus(row: SeedRow): 'active' | 'pending' | 'banned' {
  if (asString(row.bannedAt)) {
    return 'banned';
  }
  if (asString(row.deletedAt) || row.active === false) {
    return 'pending';
  }
  return 'active';
}
function buildClubMemberRecord(params: {
  membership: SeedRow;
  user?: SeedRow | null;
  squadIds?: string[];
}): ClubMemberRecord {
  const createdAt = asIsoString(params.membership.createdAt);
  return {
    userId: asString(params.membership.userId) ?? '',
    userName:
      asString(params.user?.name) ??
      asString(params.user?.fullName) ??
      asString(params.user?.email) ??
      asString(params.membership.userId) ??
      'Club member',
    userPhotoUrl: asString(params.user?.avatarUrl) ?? null,
    role: toContractRoleString(params.membership.role),
    status: membershipStatus(params.membership),
    joinedAt: createdAt,
    squadIds: params.squadIds ?? [],
  };
}
function buildClubSquadRecord(params: {
  squad: SeedRow;
  memberCount?: number;
}): ClubSquadRecord {
  const tags = Array.isArray(params.squad.tags)
    ? params.squad.tags.filter((tag): tag is string => typeof tag === 'string')
    : undefined;
  return {
    id: asString(params.squad.id) ?? '',
    clubId: asString(params.squad.clubId) ?? '',
    name: asString(params.squad.name) ?? 'Squad',
    level: asString(params.squad.ageBandLabel) ?? asString(params.squad.level) ?? 'Squad',
    description: asString(params.squad.description),
    memberCount: params.memberCount ?? Number(params.squad.memberCount ?? 0),
    primaryCoach:
      asString(params.squad.ownerCoachUserId) ??
      asString(params.squad.primaryCoach) ??
      asString(params.squad.createdByUserId) ??
      '',
    meetLocation:
      asString(params.squad.meetLocation) ??
      asString(params.squad.meetingLocation) ??
      'TBD',
    tags,
  };
}
function buildSquadMemberRecord(params: {
  membership: SeedRow;
  athlete?: SeedRow | null;
  parentId?: string | null;
}): SquadMemberRecord {
  const status = asString(params.membership.status)?.toUpperCase();
  return {
    id: asString(params.membership.id) ?? '',
    squadId: asString(params.membership.squadId) ?? '',
    athleteId: asString(params.membership.athleteId) ?? '',
    parentId: params.parentId ?? asString(params.athlete?.userId) ?? '',
    status: status === 'INACTIVE' || status === 'PENDING' ? status : 'ACTIVE',
    joinedAt: asIsoString(params.membership.createdAt),
    position: asString(params.athlete?.primaryPosition),
  };
}
function buildAthleteSquadMembershipRecord(params: {
  membership: SeedRow;
  squad: SeedRow;
}): AthleteSquadMembershipRecord {
  const status = asString(params.membership.status)?.toUpperCase();
  return {
    id: asString(params.membership.id) ?? '',
    athleteId: asString(params.membership.athleteId) ?? '',
    squadId: asString(params.membership.squadId) ?? asString(params.squad.id) ?? '',
    clubId: asString(params.squad.clubId) ?? '',
    squadName: asString(params.squad.name) ?? 'Squad',
    squadLevel: asString(params.squad.ageBandLabel) ?? asString(params.squad.level) ?? 'Squad',
    status: status === 'INACTIVE' || status === 'PENDING' ? status : 'ACTIVE',
    joinedAt: asIsoString(params.membership.createdAt),
  };
}
function buildMembershipSummaryFromRow(row: SeedRow): ClubMembershipSummary {
  const createdAt = asIsoString(row.createdAt);
  return toMembershipSummary({
    id: asString(row.id) ?? '',
    clubId: asString(row.clubId) ?? '',
    userId: asString(row.userId) ?? '',
    role: toContractRoleString(row.role),
    active: row.active !== false && !asString(row.deletedAt),
    createdAt,
    updatedAt: asIsoString(row.updatedAt, createdAt),
  });
}
function assertCanManageTargetRole(params: {
  managerRole: string | undefined;
  targetRole: string | undefined;
  requestedRole?: string | undefined;
}): void {
  const manager = requireManageMembers(params.managerRole);
  const target = parseOrganizationRole(params.targetRole);
  if (!target || !canManageClubRole(manager, target)) {
    throw forbidden('You do not have permission to manage this member');
  }
  if (params.requestedRole) {
    const requested = parseOrganizationRole(params.requestedRole);
    if (!requested) {
      throw badRequest('Unsupported club role');
    }
    if (!canManageClubRole(manager, requested)) {
      throw forbidden('You cannot assign that club role');
    }
  }
}
function assertPrivilegedCanManageTargetRole(params: {
  targetRole: string | undefined;
  requestedRole?: string | undefined;
}): void {
  const target = parseOrganizationRole(params.targetRole);
  if (!target || target === 'OWNER') {
    throw forbidden('Club ownership cannot be changed through member management');
  }
  if (params.requestedRole) {
    const requested = parseOrganizationRole(params.requestedRole);
    if (!requested) {
      throw badRequest('Unsupported club role');
    }
    if (requested === 'OWNER') {
      throw forbidden('Club ownership cannot be assigned through member management');
    }
  }
}
function buildClubSummary(
  club: {
    id: string;
    name: string;
    slug?: string | null;
    visibility?: string | null;
    createdByUserId?: string | null;
  },
  inviteCode: string | null,
): ClubSummary {
  return {
    id: club.id,
    name: club.name,
    slug: club.slug ?? null,
    visibility: club.visibility ?? null,
    createdByUserId: club.createdByUserId ?? undefined,
    inviteCode,
  };
}
function ensureTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}
function ensureStoreInviteCodesTable(tables: SeedTables): SeedRow[] {
  const existing = ensureTable(tables, 'clubInviteCodes');
  if (existing.length > 0) {
    return existing;
  }
  const clubs = asRows(tables.clubs);
  const generated = clubs.flatMap((club) => {
    const clubId = asString(club.id);
    const clubName = asString(club.name);
    const createdByUserId = asString(club.createdByUserId);
    if (!clubId || !clubName || !createdByUserId) {
      return [];
    }
    const createdAt = asString(club.createdAt) ?? new Date().toISOString();
    return [
      {
        id: `cinv_${randomUUID()}`,
        clubId,
        code: buildDefaultInviteCode(clubName, 'MEMBER', clubId),
        role: 'MEMBER',
        remainingUses: 999,
        expiresAt: addDaysIso(365),
        createdByUserId,
        updatedByUserId: createdByUserId,
        version: 1,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
        deletedByUserId: null,
      },
      {
        id: `cinv_${randomUUID()}`,
        clubId,
        code: buildDefaultInviteCode(clubName, 'COACH', clubId),
        role: 'COACH',
        remainingUses: 25,
        expiresAt: addDaysIso(30),
        createdByUserId,
        updatedByUserId: createdByUserId,
        version: 1,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
        deletedByUserId: null,
      },
    ];
  });
  tables.clubInviteCodes = generated;
  return tables.clubInviteCodes;
}
function getStoreActiveMemberships(tables: SeedTables, clubId?: string): SeedRow[] {
  return asRows(tables.clubMemberships).filter((row) => {
    if (!isActiveStoreRow(row)) {
      return false;
    }
    return !clubId || asString(row.clubId) === clubId;
  });
}
function getStoreViewerMembership(
  tables: SeedTables,
  clubId: string,
  authUserId: string,
): SeedRow | null {
  return (
    getStoreActiveMemberships(tables, clubId).find((row) => asString(row.userId) === authUserId) ??
    null
  );
}
function hasStoreClubMemberBanEvent(tables: SeedTables, clubId: string, userId: string): boolean {
  return asRows(tables.auditEvents).some(
    (row) =>
      asString(row.action) === 'club_member.ban' &&
      asString(row.resourceId) === `${clubId}:${userId}` &&
      asString(row.result) === 'SUCCESS',
  );
}
function assertStoreClubMemberCanJoin(tables: SeedTables, clubId: string, userId: string): void {
  if (hasStoreClubMemberBanEvent(tables, clubId, userId)) {
    throw forbidden('This account is banned from joining this club');
  }
}
function getActiveStoreInviteCodeRows(tables: SeedTables): SeedRow[] {
  return ensureStoreInviteCodesTable(tables).filter((row) => {
    const expiresAt = asString(row.expiresAt);
    return (
      !asString(row.deletedAt) &&
      Number(row.remainingUses ?? 0) > 0 &&
      Boolean(expiresAt && new Date(expiresAt).getTime() > Date.now())
    );
  });
}
function mapInviteCodeRecordFromRow(row: SeedRow): ClubInviteCodeRecord {
  return {
    id: asString(row.id) ?? '',
    clubId: asString(row.clubId) ?? '',
    code: asString(row.code) ?? '',
    role: asString(row.role) ?? 'MEMBER',
    createdByUserId: asString(row.createdByUserId) ?? '',
    createdAt: asString(row.createdAt) ?? new Date().toISOString(),
    expiresAt: asString(row.expiresAt) ?? new Date().toISOString(),
    remainingUses: Number(row.remainingUses ?? 0),
  };
}
function findStoreClubById(tables: SeedTables, clubId: string): SeedRow | null {
  return (
    asRows(tables.clubs).find((row) => asString(row.id) === clubId && !asString(row.deletedAt)) ??
    null
  );
}
function findStoreSquadByGlobalId(tables: SeedTables, squadId: string): SeedRow | null {
  return (
    asRows(tables.squads).find((row) => asString(row.id) === squadId && !asString(row.deletedAt)) ??
    null
  );
}
function findStoreSquadById(tables: SeedTables, clubId: string, squadId: string): SeedRow | null {
  return (
    asRows(tables.squads).find(
      (row) =>
        asString(row.id) === squadId &&
        asString(row.clubId) === clubId &&
        !asString(row.deletedAt),
    ) ?? null
  );
}
function findStoreLinkedAthleteForUser(tables: SeedTables, userId: string): SeedRow | null {
  return (
    asRows(tables.athletes).find(
      (row) =>
        asString(row.userId) === userId &&
        asString(row.status)?.toLowerCase() !== 'inactive' &&
        !asString(row.deletedAt),
    ) ?? null
  );
}
function requireStoreAthleteSquadMembershipReadContext(params: {
  tables: SeedTables;
  athleteId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): SeedRow {
  const athlete = asRows(params.tables.athletes).find(
    (row) =>
      asString(row.id) === params.athleteId &&
      asString(row.status)?.toLowerCase() !== 'inactive' &&
      !asString(row.deletedAt),
  );
  if (!athlete) {
    throw notFound('Athlete not found');
  }
  if (params.isPrivilegedAdmin || asString(athlete.userId) === params.authUserId) {
    return athlete;
  }
  const isLinkedGuardian = asRows(params.tables.guardianChildLinks).some(
    (row) =>
      asString(row.athleteId) === params.athleteId &&
      asString(row.guardianUserId) === params.authUserId &&
      !asString(row.deletedAt),
  );
  if (!isLinkedGuardian) {
    throw forbidden('You do not have permission to view this athlete squad membership');
  }
  return athlete;
}
function isActiveSquadMembership(row: SeedRow): boolean {
  const status = asString(row.status)?.toLowerCase();
  return !asString(row.deletedAt) && (!status || status === 'active');
}
function getStoreSquadMemberCount(tables: SeedTables, squadId: string): number {
  return asRows(tables.squadMemberships).filter(
    (row) => asString(row.squadId) === squadId && isActiveSquadMembership(row),
  ).length;
}
function requireStoreClubReadContext(params: {
  tables: SeedTables;
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): { club: SeedRow; viewerMembership: SeedRow | null } {
  const club = findStoreClubById(params.tables, params.clubId);
  if (!club) {
    throw notFound('Club not found');
  }
  const viewerMembership = getStoreViewerMembership(
    params.tables,
    params.clubId,
    params.authUserId,
  );
  if (!params.isPrivilegedAdmin && !viewerMembership) {
    throw forbidden('You do not have permission to view club squads');
  }
  return { club, viewerMembership };
}
function requireStoreClubSquadManageContext(params: {
  tables: SeedTables;
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): { club: SeedRow; viewerMembership: SeedRow | null } {
  const context = requireStoreClubReadContext(params);
  if (!params.isPrivilegedAdmin) {
    requireManageClubSquads(asString(context.viewerMembership?.role));
  }
  return context;
}
function isTerminalStoreSquadActivity(row: SeedRow): boolean {
  const status = asString(row.status)?.toLowerCase();
  return status === 'cancelled' || status === 'canceled' || status === 'completed';
}
function assertStoreSquadCanBeDeleted(tables: SeedTables, squadId: string): void {
  const activeMembershipCount = asRows(tables.squadMemberships).filter(
    (row) => asString(row.squadId) === squadId && isActiveSquadMembership(row),
  ).length;
  const activeSessionCount = asRows(tables.groupSessions).filter(
    (row) =>
      asString(row.squadId) === squadId &&
      !asString(row.deletedAt) &&
      !isTerminalStoreSquadActivity(row),
  ).length;
  const activeMatchCount = asRows(tables.clubMatches).filter(
    (row) =>
      asString(row.squadId) === squadId &&
      !asString(row.deletedAt) &&
      !isTerminalStoreSquadActivity(row),
  ).length;
  if (activeMembershipCount > 0 || activeSessionCount > 0 || activeMatchCount > 0) {
    throw conflict('Squad has active dependencies and cannot be archived', {
      activeMembershipCount,
      activeSessionCount,
      activeMatchCount,
    });
  }
}
function requireStoreSquadRosterReadContext(params: {
  tables: SeedTables;
  squadId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): SeedRow {
  const squad = findStoreSquadByGlobalId(params.tables, params.squadId);
  const clubId = asString(squad?.clubId);
  if (!squad || !clubId) {
    throw notFound('Squad not found');
  }
  const context = requireStoreClubReadContext({
    tables: params.tables,
    clubId,
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
  });
  if (
    !params.isPrivilegedAdmin &&
    asString(squad.ownerCoachUserId) !== params.authUserId
  ) {
    requireManageClubSquads(asString(context.viewerMembership?.role));
  }
  return squad;
}
function findStoreSquadMemberParentId(tables: SeedTables, athleteId: string): string | null {
  const guardianLinks = asRows(tables.guardianChildLinks).filter(
    (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
  );
  return (
    asString(guardianLinks.find((row) => row.isPrimary === true)?.guardianUserId) ??
    asString(guardianLinks[0]?.guardianUserId) ??
    null
  );
}
function getStoreSquadIdsForUser(tables: SeedTables, clubId: string, userId: string): string[] {
  const athleteId = asString(findStoreLinkedAthleteForUser(tables, userId)?.id);
  if (!athleteId) {
    return [];
  }
  const clubSquadIds = new Set(
    asRows(tables.squads).flatMap((row) => {
      const squadId = asString(row.id);
      return squadId && asString(row.clubId) === clubId && !asString(row.deletedAt)
        ? [squadId]
        : [];
    }),
  );
  return asRows(tables.squadMemberships).flatMap((row) => {
    const squadId = asString(row.squadId);
    return squadId &&
      clubSquadIds.has(squadId) &&
      asString(row.athleteId) === athleteId &&
      isActiveSquadMembership(row)
      ? [squadId]
      : [];
  });
}
function requireStoreSquadAssignmentContext(params: {
  tables: SeedTables;
  clubId: string;
  userId: string;
  squadId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): {
  targetMembership: SeedRow;
  squad: SeedRow;
  athlete: SeedRow;
} {
  const club = findStoreClubById(params.tables, params.clubId);
  if (!club) {
    throw notFound('Club not found');
  }
  const squad = findStoreSquadById(params.tables, params.clubId, params.squadId);
  if (!squad) {
    throw notFound('Squad not found');
  }
  const viewerMembership = getStoreViewerMembership(
    params.tables,
    params.clubId,
    params.authUserId,
  );
  const targetMembership = getStoreActiveMemberships(params.tables, params.clubId).find(
    (row) => asString(row.userId) === params.userId,
  );
  if (!targetMembership) {
    throw notFound('Club member not found');
  }
  if (!params.isPrivilegedAdmin) {
    assertCanManageTargetRole({
      managerRole: asString(viewerMembership?.role),
      targetRole: asString(targetMembership.role),
    });
  }
  const athlete = findStoreLinkedAthleteForUser(params.tables, params.userId);
  if (!athlete) {
    throw badRequest('Club member must have a linked athlete profile before squad assignment');
  }
  return {
    targetMembership,
    squad,
    athlete,
  };
}
function mapPendingInviteFromRows(params: {
  invite: SeedRow;
  target: SeedRow;
  clubName: string;
}): PendingClubInvite {
  const metadata = asObject(params.invite.metadataJson);
  return {
    id: asString(params.invite.id) ?? '',
    clubId: asString(params.invite.clubId) ?? '',
    clubName: params.clubName,
    targetUserId: asString(params.target.targetUserId) ?? '',
    inviteCode: asString(metadata?.inviteCode) ?? '',
    role: asString(metadata?.role) ?? 'COACH',
    invitedByUserId: asString(params.invite.senderUserId) ?? '',
    invitedByLabel: asString(metadata?.invitedByLabel) ?? 'Club staff',
    status: toPendingInviteStatus(asString(params.target.status) ?? asString(params.invite.status)),
    createdAt: asString(params.invite.createdAt) ?? new Date().toISOString(),
    expiresAt: asString(params.invite.expiresAt) ?? new Date().toISOString(),
    respondedAt: asString(params.target.respondedAt) ?? null,
  };
}
function getStoreClubStaffInvitePairs(tables: SeedTables): Array<{
  invite: SeedRow;
  target: SeedRow;
}> {
  const invites = asRows(tables.invites).filter(
    (invite) => asString(invite.inviteType) === 'club_staff_join',
  );
  const inviteTargets = asRows(tables.inviteTargets);
  return invites.flatMap((invite) =>
    inviteTargets.flatMap((target) =>
      asString(target.inviteId) === asString(invite.id)
        ? [
            {
              invite,
              target,
            },
          ]
        : [],
    ),
  );
}
function findStorePendingInvitePair(
  tables: SeedTables,
  inviteId: string,
  authUserId: string,
): {
  invite: SeedRow;
  target: SeedRow;
} | null {
  return (
    getStoreClubStaffInvitePairs(tables).find(
      ({ invite, target }) =>
        asString(invite.id) === inviteId &&
        asString(target.targetUserId) === authUserId &&
        !asString(invite.revokedAt),
    ) ?? null
  );
}
function createOrReviveStoreMembership(params: {
  tables: SeedTables;
  clubId: string;
  userId: string;
  role: string;
  actorUserId: string;
}): ClubMembershipSummary {
  const memberships = ensureTable(params.tables, 'clubMemberships');
  const now = new Date().toISOString();
  const existing = memberships.find(
    (row) => asString(row.clubId) === params.clubId && asString(row.userId) === params.userId,
  );
  if (existing) {
    assertStoreClubMemberCanJoin(params.tables, params.clubId, params.userId);
    existing.role = toStoreRole(params.role);
    existing.active = true;
    existing.updatedAt = now;
    existing.updatedByUserId = params.actorUserId;
    existing.deletedAt = null;
    existing.deletedByUserId = null;
    existing.version = Number(existing.version ?? 1) + 1;
    return toMembershipSummary({
      id: asString(existing.id) ?? '',
      clubId: params.clubId,
      userId: params.userId,
      role: asString(existing.role) ?? toStoreRole(params.role),
      active: existing.active !== false,
      createdAt: asString(existing.createdAt) ?? now,
      updatedAt: asString(existing.updatedAt) ?? now,
    });
  }
  const created: SeedRow = {
    id: `cmb_${randomUUID()}`,
    clubId: params.clubId,
    userId: params.userId,
    role: toStoreRole(params.role),
    active: true,
    createdByUserId: params.actorUserId,
    updatedByUserId: params.actorUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  };
  memberships.push(created);
  return toMembershipSummary({
    id: asString(created.id) ?? '',
    clubId: params.clubId,
    userId: params.userId,
    role: asString(created.role) ?? toStoreRole(params.role),
    active: true,
    createdAt: now,
    updatedAt: now,
  });
}
class SeedClubAuthorityRepository implements ClubAuthorityRepository {
  constructor(private readonly getTables: () => SeedTables) {}
  async listVisibleClubs(params: {
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<VisibleClub[]> {
    const tables = this.getTables();
    const clubs = asRows(tables.clubs).filter((row) => !asString(row.deletedAt));
    const memberships = getStoreActiveMemberships(tables);
    const squads = asRows(tables.squads).filter((row) => !asString(row.deletedAt));
    const memberInviteCodes = getActiveStoreInviteCodeRows(tables).filter(
      (row) => asString(row.role) === 'MEMBER',
    );
    const allowedClubIds = new Set(
      memberships.flatMap((row) => {
        if (!(asString(row.userId) === params.authUserId)) return [];
        const mapped = asString(row.clubId);
        return isTruthy(mapped) ? [mapped] : [];
      }),
    );
    const visibleClubs = clubs.filter((club) => {
      if (params.isPrivilegedAdmin) {
        return true;
      }
      const clubId = asString(club.id);
      return Boolean(clubId && allowedClubIds.has(clubId));
    });
    return visibleClubs.map((club) => {
      const clubId = asString(club.id) ?? '';
      const clubMemberships = memberships.flatMap((row) =>
        asString(row.clubId) === clubId
          ? [
              toMembershipSummary({
                id: asString(row.id) ?? '',
                clubId,
                userId: asString(row.userId) ?? '',
                role: asString(row.role) ?? '',
                active: row.active !== false,
                createdAt: asString(row.createdAt),
                updatedAt: asString(row.updatedAt),
              }),
            ]
          : [],
      );
      const viewerMembership =
        clubMemberships.find((membership) => membership.userId === params.authUserId) ?? null;
      const primaryInviteCode = memberInviteCodes.find((row) => asString(row.clubId) === clubId)
        ?.code as string | undefined;
      return {
        ...buildClubSummary(
          {
            id: clubId,
            name: asString(club.name) ?? 'Club',
            slug: asString(club.slug) ?? null,
            visibility: asString(club.visibility) ?? null,
            createdByUserId: asString(club.createdByUserId) ?? null,
          },
          primaryInviteCode ?? null,
        ),
        memberships: clubMemberships,
        viewerMembership,
        squads: squads.filter((row) => asString(row.clubId) === clubId),
      };
    });
  }
  async listClubMembers(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord[]> {
    const tables = this.getTables();
    const club = findStoreClubById(tables, params.clubId);
    if (!club) {
      throw notFound('Club not found');
    }
    const viewerMembership = getStoreViewerMembership(tables, params.clubId, params.authUserId);
    if (!params.isPrivilegedAdmin && !viewerMembership) {
      throw forbidden('You do not have permission to view club members');
    }
    const users = asRows(tables.users);
    return getStoreActiveMemberships(tables, params.clubId).map((membership) =>
      buildClubMemberRecord({
        membership,
        user: users.find((row) => asString(row.id) === asString(membership.userId)) ?? null,
        squadIds: getStoreSquadIdsForUser(
          tables,
          params.clubId,
          asString(membership.userId) ?? '',
        ),
      }),
    );
  }
  async listClubSquads(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubSquadRecord[]> {
    const tables = this.getTables();
    requireStoreClubReadContext({
      tables,
      clubId: params.clubId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
    return asRows(tables.squads)
      .filter((row) => asString(row.clubId) === params.clubId && !asString(row.deletedAt))
      .map((squad) =>
        buildClubSquadRecord({
          squad,
          memberCount: getStoreSquadMemberCount(tables, asString(squad.id) ?? ''),
        }),
      );
  }
  async getClubSquad(params: {
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubSquadRecord> {
    const tables = this.getTables();
    const squad = findStoreSquadByGlobalId(tables, params.squadId);
    const clubId = asString(squad?.clubId);
    if (!squad || !clubId) {
      throw notFound('Squad not found');
    }
    requireStoreClubReadContext({
      tables,
      clubId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
    return buildClubSquadRecord({
      squad,
      memberCount: getStoreSquadMemberCount(tables, params.squadId),
    });
  }
  async listSquadMembers(params: {
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<SquadMemberRecord[]> {
    const tables = this.getTables();
    requireStoreSquadRosterReadContext({
      tables,
      squadId: params.squadId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
    const athletes = asRows(tables.athletes);
    return asRows(tables.squadMemberships)
      .filter(
        (row) =>
          asString(row.squadId) === params.squadId &&
          isActiveSquadMembership(row),
      )
      .map((membership) => {
        const athleteId = asString(membership.athleteId) ?? '';
        const athlete =
          athletes.find(
            (row) => asString(row.id) === athleteId && !asString(row.deletedAt),
          ) ?? null;
        return buildSquadMemberRecord({
          membership,
          athlete,
          parentId: findStoreSquadMemberParentId(tables, athleteId),
        });
      });
  }
  async listAthleteSquadMemberships(params: {
    athleteId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<AthleteSquadMembershipRecord[]> {
    const tables = this.getTables();
    requireStoreAthleteSquadMembershipReadContext({
      tables,
      athleteId: params.athleteId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
    return asRows(tables.squadMemberships).flatMap((membership) => {
      if (
        asString(membership.athleteId) !== params.athleteId ||
        !isActiveSquadMembership(membership)
      ) {
        return [];
      }
      const squad = findStoreSquadByGlobalId(tables, asString(membership.squadId) ?? '');
      return squad
        ? [
            buildAthleteSquadMembershipRecord({
              membership,
              squad,
            }),
          ]
        : [];
    });
  }
  async createClubSquad(params: {
    clubId: string;
    name: string;
    level?: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubSquadRecord> {
    const tables = this.getTables();
    requireStoreClubSquadManageContext({
      tables,
      clubId: params.clubId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
    const name = params.name.trim();
    if (!name) {
      throw badRequest('Squad name is required');
    }
    const now = new Date().toISOString();
    const squad: SeedRow = {
      id: `sqd_${randomUUID()}`,
      clubId: params.clubId,
      ownerCoachUserId: params.authUserId,
      name,
      ageBandLabel: params.level?.trim() || null,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    ensureTable(tables, 'squads').push(squad);
    return buildClubSquadRecord({ squad, memberCount: 0 });
  }
  async updateClubSquad(params: {
    clubId: string;
    squadId: string;
    name?: string;
    level?: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubSquadRecord> {
    const tables = this.getTables();
    requireStoreClubSquadManageContext({
      tables,
      clubId: params.clubId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
    const squads = ensureTable(tables, 'squads');
    const index = squads.findIndex(
      (row) =>
        asString(row.id) === params.squadId &&
        asString(row.clubId) === params.clubId &&
        !asString(row.deletedAt),
    );
    if (index < 0) {
      throw notFound('Squad not found');
    }
    const existing = squads[index];
    const nextName = params.name?.trim();
    if (params.name !== undefined && !nextName) {
      throw badRequest('Squad name is required');
    }
    const now = new Date().toISOString();
    squads[index] = {
      ...existing,
      name: nextName ?? existing.name,
      ageBandLabel: params.level !== undefined ? params.level.trim() || null : existing.ageBandLabel,
      updatedAt: now,
      updatedByUserId: params.authUserId,
      version: Number(existing.version ?? 1) + 1,
    };
    return buildClubSquadRecord({
      squad: squads[index],
      memberCount: getStoreSquadMemberCount(tables, params.squadId),
    });
  }
  async deleteClubSquad(params: {
    clubId: string;
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<void> {
    const tables = this.getTables();
    requireStoreClubSquadManageContext({
      tables,
      clubId: params.clubId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
    const squad = findStoreSquadById(tables, params.clubId, params.squadId);
    if (!squad) {
      throw notFound('Squad not found');
    }
    assertStoreSquadCanBeDeleted(tables, params.squadId);
    const now = new Date().toISOString();
    squad.deletedAt = now;
    squad.deletedByUserId = params.authUserId;
    squad.updatedAt = now;
    squad.updatedByUserId = params.authUserId;
    squad.version = Number(squad.version ?? 1) + 1;
  }
  async updateClubMemberRole(params: {
    clubId: string;
    userId: string;
    role: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord> {
    const tables = this.getTables();
    const club = findStoreClubById(tables, params.clubId);
    if (!club) {
      throw notFound('Club not found');
    }
    const memberships = ensureTable(tables, 'clubMemberships');
    const viewerMembership = getStoreViewerMembership(tables, params.clubId, params.authUserId);
    const targetMembership = getStoreActiveMemberships(tables, params.clubId).find(
      (row) => asString(row.userId) === params.userId,
    );
    if (!targetMembership) {
      throw notFound('Club member not found');
    }
    if (!params.isPrivilegedAdmin) {
      assertCanManageTargetRole({
        managerRole: asString(viewerMembership?.role),
        targetRole: asString(targetMembership.role),
        requestedRole: params.role,
      });
    } else {
      assertPrivilegedCanManageTargetRole({
        targetRole: asString(targetMembership.role),
        requestedRole: params.role,
      });
    }
    const now = new Date().toISOString();
    const rowIndex = memberships.findIndex((row) => asString(row.id) === asString(targetMembership.id));
    const nextRole = toStoreRole(toContractRoleString(params.role));
    memberships[rowIndex] = {
      ...targetMembership,
      role: nextRole,
      updatedAt: now,
      updatedByUserId: params.authUserId,
      version: Number(targetMembership.version ?? 1) + 1,
    };
    const users = asRows(tables.users);
    return buildClubMemberRecord({
      membership: memberships[rowIndex],
      user: users.find((row) => asString(row.id) === params.userId) ?? null,
      squadIds: getStoreSquadIdsForUser(tables, params.clubId, params.userId),
    });
  }
  async removeClubMember(params: {
    clubId: string;
    userId: string;
    reason: string;
    customReason?: string | null;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRemovalRecord> {
    const tables = this.getTables();
    const club = findStoreClubById(tables, params.clubId);
    if (!club) {
      throw notFound('Club not found');
    }
    const memberships = ensureTable(tables, 'clubMemberships');
    const viewerMembership = getStoreViewerMembership(tables, params.clubId, params.authUserId);
    const targetMembership = getStoreActiveMemberships(tables, params.clubId).find(
      (row) => asString(row.userId) === params.userId,
    );
    if (!targetMembership) {
      throw notFound('Club member not found');
    }
    if (!params.isPrivilegedAdmin) {
      assertCanManageTargetRole({
        managerRole: asString(viewerMembership?.role),
        targetRole: asString(targetMembership.role),
      });
    } else {
      assertPrivilegedCanManageTargetRole({
        targetRole: asString(targetMembership.role),
      });
    }
    const now = new Date().toISOString();
    const rowIndex = memberships.findIndex((row) => asString(row.id) === asString(targetMembership.id));
    memberships[rowIndex] = {
      ...targetMembership,
      active: false,
      deletedAt: now,
      deletedByUserId: params.authUserId,
      updatedAt: now,
      updatedByUserId: params.authUserId,
      version: Number(targetMembership.version ?? 1) + 1,
    };
    const linkedAthleteId = asString(findStoreLinkedAthleteForUser(tables, params.userId)?.id);
    if (linkedAthleteId) {
      const clubSquadIds = new Set(
        asRows(tables.squads).flatMap((row) => {
          const squadId = asString(row.id);
          return squadId && asString(row.clubId) === params.clubId && !asString(row.deletedAt)
            ? [squadId]
            : [];
        }),
      );
      ensureTable(tables, 'squadMemberships').forEach((row) => {
        if (
          asString(row.athleteId) === linkedAthleteId &&
          clubSquadIds.has(asString(row.squadId) ?? '') &&
          isActiveSquadMembership(row)
        ) {
          row.status = 'inactive';
          row.deletedAt = now;
          row.deletedByUserId = params.authUserId;
          row.updatedAt = now;
          row.updatedByUserId = params.authUserId;
          row.version = Number(row.version ?? 1) + 1;
        }
      });
    }
    const users = asRows(tables.users);
    const user = users.find((row) => asString(row.id) === params.userId) ?? null;
    const removedByUser = users.find((row) => asString(row.id) === params.authUserId) ?? null;
    return {
      id: asString(targetMembership.id) ?? params.userId,
      clubId: params.clubId,
      userId: params.userId,
      userName:
        asString(user?.name) ?? asString(user?.fullName) ?? asString(user?.email) ?? params.userId,
      userRole: toContractRoleString(targetMembership.role),
      reason: params.reason,
      customReason: params.customReason ?? null,
      removedBy: params.authUserId,
      removedByName:
        asString(removedByUser?.name) ??
        asString(removedByUser?.fullName) ??
        asString(removedByUser?.email) ??
        params.authUserId,
      removedAt: now,
      originalMembership: buildMembershipSummaryFromRow(targetMembership),
    };
  }
  async banClubMember(params: {
    clubId: string;
    userId: string;
    reason: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRemovalRecord> {
    const tables = this.getTables();
    const club = findStoreClubById(tables, params.clubId);
    if (!club) {
      throw notFound('Club not found');
    }
    const memberships = ensureTable(tables, 'clubMemberships');
    const viewerMembership = getStoreViewerMembership(tables, params.clubId, params.authUserId);
    const targetMembership = getStoreActiveMemberships(tables, params.clubId).find(
      (row) => asString(row.userId) === params.userId,
    );
    if (!targetMembership) {
      throw notFound('Club member not found');
    }
    if (!params.isPrivilegedAdmin) {
      assertCanManageTargetRole({
        managerRole: asString(viewerMembership?.role),
        targetRole: asString(targetMembership.role),
      });
    } else {
      assertPrivilegedCanManageTargetRole({
        targetRole: asString(targetMembership.role),
      });
    }
    const now = new Date().toISOString();
    const rowIndex = memberships.findIndex((row) => asString(row.id) === asString(targetMembership.id));
    memberships[rowIndex] = {
      ...targetMembership,
      active: false,
      bannedAt: now,
      bannedByUserId: params.authUserId,
      banReason: params.reason,
      deletedAt: now,
      deletedByUserId: params.authUserId,
      updatedAt: now,
      updatedByUserId: params.authUserId,
      version: Number(targetMembership.version ?? 1) + 1,
    };
    const linkedAthleteId = asString(findStoreLinkedAthleteForUser(tables, params.userId)?.id);
    if (linkedAthleteId) {
      const clubSquadIds = new Set(
        asRows(tables.squads).flatMap((row) => {
          const squadId = asString(row.id);
          return squadId && asString(row.clubId) === params.clubId && !asString(row.deletedAt)
            ? [squadId]
            : [];
        }),
      );
      ensureTable(tables, 'squadMemberships').forEach((row) => {
        if (
          asString(row.athleteId) === linkedAthleteId &&
          clubSquadIds.has(asString(row.squadId) ?? '') &&
          isActiveSquadMembership(row)
        ) {
          row.status = 'inactive';
          row.deletedAt = now;
          row.deletedByUserId = params.authUserId;
          row.updatedAt = now;
          row.updatedByUserId = params.authUserId;
          row.version = Number(row.version ?? 1) + 1;
        }
      });
    }
    const users = asRows(tables.users);
    const user = users.find((row) => asString(row.id) === params.userId) ?? null;
    const bannedByUser = users.find((row) => asString(row.id) === params.authUserId) ?? null;
    return {
      id: asString(targetMembership.id) ?? params.userId,
      clubId: params.clubId,
      userId: params.userId,
      userName:
        asString(user?.name) ?? asString(user?.fullName) ?? asString(user?.email) ?? params.userId,
      userRole: toContractRoleString(targetMembership.role),
      reason: 'CONDUCT',
      customReason: params.reason,
      removedBy: params.authUserId,
      removedByName:
        asString(bannedByUser?.name) ??
        asString(bannedByUser?.fullName) ??
        asString(bannedByUser?.email) ??
        params.authUserId,
      removedAt: now,
      originalMembership: buildMembershipSummaryFromRow(targetMembership),
    };
  }
  async restoreRemovedClubMember(params: {
    clubId: string;
    removalId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord> {
    const tables = this.getTables();
    const club = findStoreClubById(tables, params.clubId);
    if (!club) {
      throw notFound('Club not found');
    }
    const memberships = ensureTable(tables, 'clubMemberships');
    const targetMembership = memberships.find(
      (row) =>
        asString(row.clubId) === params.clubId &&
        (asString(row.id) === params.removalId || asString(row.userId) === params.removalId),
    );
    if (!targetMembership || (targetMembership.active !== false && !asString(targetMembership.deletedAt))) {
      throw notFound('Removed club member not found');
    }
    if (hasStoreClubMemberBanEvent(tables, params.clubId, asString(targetMembership.userId) ?? '')) {
      throw forbidden('Banned club members cannot be restored through removal undo');
    }
    const viewerMembership = getStoreViewerMembership(tables, params.clubId, params.authUserId);
    if (!params.isPrivilegedAdmin) {
      assertCanManageTargetRole({
        managerRole: asString(viewerMembership?.role),
        targetRole: asString(targetMembership.role),
      });
    } else {
      assertPrivilegedCanManageTargetRole({
        targetRole: asString(targetMembership.role),
      });
    }
    const now = new Date().toISOString();
    const rowIndex = memberships.findIndex((row) => asString(row.id) === asString(targetMembership.id));
    memberships[rowIndex] = {
      ...targetMembership,
      active: true,
      deletedAt: null,
      deletedByUserId: null,
      updatedAt: now,
      updatedByUserId: params.authUserId,
      version: Number(targetMembership.version ?? 1) + 1,
    };
    const users = asRows(tables.users);
    return buildClubMemberRecord({
      membership: memberships[rowIndex],
      user: users.find((row) => asString(row.id) === asString(targetMembership.userId)) ?? null,
      squadIds: getStoreSquadIdsForUser(tables, params.clubId, asString(targetMembership.userId) ?? ''),
    });
  }
  async addClubMemberToSquad(params: {
    clubId: string;
    userId: string;
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord> {
    const tables = this.getTables();
    const { targetMembership, athlete } = requireStoreSquadAssignmentContext({
      tables,
      clubId: params.clubId,
      userId: params.userId,
      squadId: params.squadId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
    const squadMemberships = ensureTable(tables, 'squadMemberships');
    const now = new Date().toISOString();
    const athleteId = asString(athlete.id) ?? '';
    const existingIndex = squadMemberships.findIndex(
      (row) =>
        asString(row.squadId) === params.squadId && asString(row.athleteId) === athleteId,
    );
    if (existingIndex >= 0) {
      const existing = squadMemberships[existingIndex];
      if (!isActiveSquadMembership(existing)) {
        squadMemberships[existingIndex] = {
          ...existing,
          status: 'active',
          deletedAt: null,
          deletedByUserId: null,
          updatedAt: now,
          updatedByUserId: params.authUserId,
          version: Number(existing.version ?? 1) + 1,
        };
      }
    } else {
      squadMemberships.push({
        id: `sqm_${randomUUID()}`,
        squadId: params.squadId,
        athleteId,
        status: 'active',
        createdByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });
    }
    const users = asRows(tables.users);
    return buildClubMemberRecord({
      membership: targetMembership,
      user: users.find((row) => asString(row.id) === params.userId) ?? null,
      squadIds: getStoreSquadIdsForUser(tables, params.clubId, params.userId),
    });
  }
  async removeClubMemberFromSquad(params: {
    clubId: string;
    userId: string;
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord> {
    const tables = this.getTables();
    const { targetMembership, athlete } = requireStoreSquadAssignmentContext({
      tables,
      clubId: params.clubId,
      userId: params.userId,
      squadId: params.squadId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
    const squadMemberships = ensureTable(tables, 'squadMemberships');
    const now = new Date().toISOString();
    const athleteId = asString(athlete.id) ?? '';
    const existingIndex = squadMemberships.findIndex(
      (row) =>
        asString(row.squadId) === params.squadId &&
        asString(row.athleteId) === athleteId &&
        isActiveSquadMembership(row),
    );
    if (existingIndex >= 0) {
      const existing = squadMemberships[existingIndex];
      squadMemberships[existingIndex] = {
        ...existing,
        status: 'inactive',
        deletedAt: now,
        deletedByUserId: params.authUserId,
        updatedAt: now,
        updatedByUserId: params.authUserId,
        version: Number(existing.version ?? 1) + 1,
      };
    }
    const users = asRows(tables.users);
    return buildClubMemberRecord({
      membership: targetMembership,
      user: users.find((row) => asString(row.id) === params.userId) ?? null,
      squadIds: getStoreSquadIdsForUser(tables, params.clubId, params.userId),
    });
  }
  async listInviteCodes(params: {
    clubId: string;
    authUserId: string;
  }): Promise<ClubInviteCodeRecord[]> {
    const tables = this.getTables();
    const viewerMembership = getStoreViewerMembership(tables, params.clubId, params.authUserId);
    requireManageInvites(asString(viewerMembership?.role));
    return getActiveStoreInviteCodeRows(tables).flatMap((row) =>
      asString(row.clubId) === params.clubId ? [mapInviteCodeRecordFromRow(row)] : [],
    );
  }
  async createInviteCode(params: {
    clubId: string;
    authUserId: string;
    role: string;
  }): Promise<ClubInviteCodeRecord> {
    const tables = this.getTables();
    const club = findStoreClubById(tables, params.clubId);
    if (!club) {
      throw notFound('Club not found');
    }
    const viewerMembership = getStoreViewerMembership(tables, params.clubId, params.authUserId);
    requireManageInvites(asString(viewerMembership?.role));
    const inviteCodes = ensureStoreInviteCodesTable(tables);
    const now = new Date().toISOString();
    if (params.role !== 'MEMBER') {
      inviteCodes.forEach((row) => {
        if (
          asString(row.clubId) === params.clubId &&
          asString(row.role) === params.role &&
          !asString(row.deletedAt)
        ) {
          row.deletedAt = now;
          row.deletedByUserId = params.authUserId;
          row.updatedAt = now;
          row.updatedByUserId = params.authUserId;
          row.version = Number(row.version ?? 1) + 1;
        }
      });
    }
    const inviteCode: SeedRow = {
      id: `cinv_${randomUUID()}`,
      clubId: params.clubId,
      code: `${buildInviteCode(asString(club.name) ?? 'Club', params.role)}-${randomUUID().slice(0, 4).toUpperCase()}`,
      role: params.role,
      remainingUses: params.role === 'MEMBER' ? 999 : 25,
      expiresAt: addDaysIso(params.role === 'MEMBER' ? 365 : 30),
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    inviteCodes.push(inviteCode);
    return mapInviteCodeRecordFromRow(inviteCode);
  }
  async deleteInviteCode(params: {
    clubId: string;
    authUserId: string;
    code: string;
  }): Promise<void> {
    const tables = this.getTables();
    const viewerMembership = getStoreViewerMembership(tables, params.clubId, params.authUserId);
    requireManageInvites(asString(viewerMembership?.role));
    const inviteCodes = ensureStoreInviteCodesTable(tables);
    const normalizedCode = normalizeInviteCode(params.code);
    const now = new Date().toISOString();
    inviteCodes.forEach((row) => {
      if (
        asString(row.clubId) === params.clubId &&
        normalizeInviteCode(asString(row.code) ?? '') === normalizedCode
      ) {
        row.deletedAt = now;
        row.deletedByUserId = params.authUserId;
        row.updatedAt = now;
        row.updatedByUserId = params.authUserId;
        row.version = Number(row.version ?? 1) + 1;
      }
    });
  }
  async resolveJoinCode(params: { authUserId: string; code: string }): Promise<ClubJoinPreview> {
    const tables = this.getTables();
    const inviteCodeRow = getActiveStoreInviteCodeRows(tables).find(
      (row) => normalizeInviteCode(asString(row.code) ?? '') === normalizeInviteCode(params.code),
    );
    if (!inviteCodeRow) {
      throw notFound('Invite code not found');
    }
    const clubId = asString(inviteCodeRow.clubId) ?? '';
    const club = findStoreClubById(tables, clubId);
    if (!club) {
      throw notFound('Club not found');
    }
    const existingMembership = getStoreViewerMembership(tables, clubId, params.authUserId);
    if (!existingMembership) {
      assertStoreClubMemberCanJoin(tables, clubId, params.authUserId);
    }
    return {
      clubId,
      clubName: asString(club.name) ?? 'Club',
      clubSlug: asString(club.slug) ?? null,
      visibility: asString(club.visibility) ?? null,
      inviteCode: asString(inviteCodeRow.code) ?? '',
      role: asString(inviteCodeRow.role) ?? 'MEMBER',
      joinFlow: asString(inviteCodeRow.role) === 'MEMBER' ? 'direct_join' : 'invite_review',
      expiresAt: asString(inviteCodeRow.expiresAt) ?? new Date().toISOString(),
      alreadyMember: Boolean(existingMembership),
    };
  }
  async joinWithCode(params: {
    authUserId: string;
    code: string;
    actingAuthCanUseStaffLinks: boolean;
  }): Promise<JoinWithCodeResult> {
    const tables = this.getTables();
    const inviteCodeRow = getActiveStoreInviteCodeRows(tables).find(
      (row) => normalizeInviteCode(asString(row.code) ?? '') === normalizeInviteCode(params.code),
    );
    if (!inviteCodeRow) {
      throw notFound('Invite code not found');
    }
    const clubId = asString(inviteCodeRow.clubId) ?? '';
    const club = findStoreClubById(tables, clubId);
    if (!club) {
      throw notFound('Club not found');
    }
    const clubSummary = buildClubSummary(
      {
        id: clubId,
        name: asString(club.name) ?? 'Club',
        slug: asString(club.slug) ?? null,
        visibility: asString(club.visibility) ?? null,
        createdByUserId: asString(club.createdByUserId) ?? null,
      },
      asString(inviteCodeRow.code) ?? '',
    );
    const existingMembership = getStoreViewerMembership(tables, clubId, params.authUserId);
    if (existingMembership) {
      return {
        outcome: 'already_member',
        club: clubSummary,
        membership: toMembershipSummary({
          id: asString(existingMembership.id) ?? '',
          clubId,
          userId: params.authUserId,
          role: asString(existingMembership.role) ?? '',
          active: existingMembership.active !== false,
          createdAt: asString(existingMembership.createdAt),
          updatedAt: asString(existingMembership.updatedAt),
        }),
        invite: null,
      };
    }
    assertStoreClubMemberCanJoin(tables, clubId, params.authUserId);
    const role = asString(inviteCodeRow.role) ?? 'MEMBER';
    if (role !== 'MEMBER' && !params.actingAuthCanUseStaffLinks) {
      throw forbidden('Only coach or admin accounts can use staff invite links');
    }
    if (role === 'MEMBER') {
      inviteCodeRow.remainingUses = Math.max(0, Number(inviteCodeRow.remainingUses ?? 0) - 1);
      inviteCodeRow.updatedAt = new Date().toISOString();
      inviteCodeRow.version = Number(inviteCodeRow.version ?? 1) + 1;
      const membership = createOrReviveStoreMembership({
        tables,
        clubId,
        userId: params.authUserId,
        role,
        actorUserId: asString(inviteCodeRow.createdByUserId) ?? params.authUserId,
      });
      return {
        outcome: 'joined',
        club: clubSummary,
        membership,
        invite: null,
      };
    }
    const pendingPair =
      getStoreClubStaffInvitePairs(tables).find(({ invite, target }) => {
        const metadata = asObject(invite.metadataJson);
        return (
          asString(invite.clubId) === clubId &&
          asString(target.targetUserId) === params.authUserId &&
          toPendingInviteStatus(asString(target.status)) === 'pending' &&
          asString(metadata?.role) === role &&
          !asString(invite.revokedAt) &&
          new Date(asString(invite.expiresAt) ?? '').getTime() > Date.now()
        );
      }) ?? null;
    if (pendingPair) {
      return {
        outcome: 'invite_pending',
        club: clubSummary,
        membership: null,
        invite: mapPendingInviteFromRows({
          invite: pendingPair.invite,
          target: pendingPair.target,
          clubName: asString(club.name) ?? 'Club',
        }),
      };
    }
    const now = new Date().toISOString();
    const inviteRow: SeedRow = {
      id: `inv_${randomUUID()}`,
      inviteType: 'club_staff_join',
      senderUserId: asString(inviteCodeRow.createdByUserId) ?? params.authUserId,
      clubId,
      groupSessionId: null,
      bookingId: null,
      eventId: null,
      status: 'PENDING',
      message: 'Review this staff join request.',
      expiresAt: asString(inviteCodeRow.expiresAt) ?? addDaysIso(30),
      metadataJson: {
        inviteCode: asString(inviteCodeRow.code) ?? '',
        role,
        invitedByLabel: 'Club staff',
      },
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    };
    const targetRow: SeedRow = {
      id: `ivt_${randomUUID()}`,
      inviteId: asString(inviteRow.id) ?? '',
      targetUserId: params.authUserId,
      targetAthleteId: null,
      targetFamilyId: null,
      status: 'PENDING',
      respondedAt: null,
      responsePayloadJson: null,
      createdAt: now,
      updatedAt: now,
    };
    ensureTable(tables, 'invites').push(inviteRow);
    ensureTable(tables, 'inviteTargets').push(targetRow);
    return {
      outcome: 'invite_pending',
      club: clubSummary,
      membership: null,
      invite: mapPendingInviteFromRows({
        invite: inviteRow,
        target: targetRow,
        clubName: asString(club.name) ?? 'Club',
      }),
    };
  }
  async listPendingInvites(params: { authUserId: string }): Promise<PendingClubInvite[]> {
    const tables = this.getTables();
    return getStoreClubStaffInvitePairs(tables).flatMap((item) =>
      (({ invite, target }) => {
        const expiresAt = asString(invite.expiresAt);
        return (
          asString(target.targetUserId) === params.authUserId &&
          toPendingInviteStatus(asString(target.status)) === 'pending' &&
          !asString(invite.revokedAt) &&
          Boolean(expiresAt && new Date(expiresAt).getTime() > Date.now())
        );
      })(item)
        ? [
            (({ invite, target }) => {
              const clubName =
                asString(findStoreClubById(tables, asString(invite.clubId) ?? '')?.name) ?? 'Club';
              return mapPendingInviteFromRows({
                invite,
                target,
                clubName,
              });
            })(item),
          ]
        : [],
    );
  }
  async respondToInvite(params: {
    authUserId: string;
    inviteId: string;
    response: 'accepted' | 'declined';
  }): Promise<RespondToInviteResult> {
    const tables = this.getTables();
    const pair = findStorePendingInvitePair(tables, params.inviteId, params.authUserId);
    if (!pair) {
      throw notFound('Club invite not found');
    }
    const clubId = asString(pair.invite.clubId) ?? '';
    const club = findStoreClubById(tables, clubId);
    if (!club) {
      throw notFound('Club not found');
    }
    const metadata = asObject(pair.invite.metadataJson);
    if (params.response === 'accepted') {
      assertStoreClubMemberCanJoin(tables, clubId, params.authUserId);
    }
    const now = new Date().toISOString();
    pair.invite.status = params.response.toUpperCase();
    pair.invite.updatedAt = now;
    pair.target.status = params.response.toUpperCase();
    pair.target.respondedAt = now;
    pair.target.responsePayloadJson = {
      response: params.response,
      source: 'club_invites',
    };
    pair.target.updatedAt = now;
    const membership =
      params.response === 'accepted'
        ? createOrReviveStoreMembership({
            tables,
            clubId,
            userId: params.authUserId,
            role: asString(metadata?.role) ?? 'COACH',
            actorUserId: asString(pair.invite.senderUserId) ?? params.authUserId,
          })
        : null;
    return {
      invite: mapPendingInviteFromRows({
        invite: pair.invite,
        target: pair.target,
        clubName: asString(club.name) ?? 'Club',
      }),
      membership,
      club: buildClubSummary(
        {
          id: clubId,
          name: asString(club.name) ?? 'Club',
          slug: asString(club.slug) ?? null,
          visibility: asString(club.visibility) ?? null,
          createdByUserId: asString(club.createdByUserId) ?? null,
        },
        asString(metadata?.inviteCode) ?? '',
      ),
    };
  }
}
class DbClubAuthorityRepository implements ClubAuthorityRepository {
  private readonly fixture = new SeedClubAuthorityRepository(() => getDbFixtureStore().tables);
  private async hasClubMemberBanEvent(params: { clubId: string; userId: string }): Promise<boolean> {
    const prisma = getPrismaClientOrThrow();
    const ban = await prisma.auditEvent.findFirst({
      where: {
        action: 'club_member.ban',
        resourceId: `${params.clubId}:${params.userId}`,
        result: 'SUCCESS',
      },
      select: {
        id: true,
      },
    });
    return Boolean(ban);
  }
  private async assertClubMemberCanJoin(params: { clubId: string; userId: string }): Promise<void> {
    if (await this.hasClubMemberBanEvent(params)) {
      throw forbidden('This account is banned from joining this club');
    }
  }
  private async listDbSquadIdsForClubMember(params: {
    clubId: string;
    userId: string;
  }): Promise<string[]> {
    const prisma = getPrismaClientOrThrow();
    const athlete = await prisma.athlete.findUnique({
      where: {
        userId: params.userId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });
    if (!athlete || athlete.deletedAt) {
      return [];
    }
    const memberships = await prisma.squadMembership.findMany({
      where: {
        athleteId: athlete.id,
        deletedAt: null,
        NOT: {
          status: {
            in: ['inactive', 'INACTIVE'],
          },
        },
        squad: {
          clubId: params.clubId,
          deletedAt: null,
        },
      },
      select: {
        squadId: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return memberships.map((membership) => membership.squadId);
  }

  private async requireDbSquadAssignmentContext(params: {
    clubId: string;
    userId: string;
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }) {
    const prisma = getPrismaClientOrThrow();
    const [club, squad, viewerMembership, targetMembership, athlete] = await Promise.all([
      prisma.club.findFirst({
        where: {
          id: params.clubId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
      prisma.squad.findFirst({
        where: {
          id: params.squadId,
          clubId: params.clubId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
      prisma.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId: params.clubId,
            userId: params.authUserId,
          },
        },
      }),
      prisma.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId: params.clubId,
            userId: params.userId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.athlete.findUnique({
        where: {
          userId: params.userId,
        },
        select: {
          id: true,
          status: true,
          deletedAt: true,
        },
      }),
    ]);
    if (!club) {
      throw notFound('Club not found');
    }
    if (!squad) {
      throw notFound('Squad not found');
    }
    if (!targetMembership?.active || targetMembership.deletedAt) {
      throw notFound('Club member not found');
    }
    if (!params.isPrivilegedAdmin) {
      assertCanManageTargetRole({
        managerRole: viewerMembership?.role,
        targetRole: targetMembership.role,
      });
    }
    if (
      !athlete ||
      athlete.deletedAt ||
      athlete.status.toLowerCase() === 'inactive'
    ) {
      throw badRequest('Club member must have a linked athlete profile before squad assignment');
    }
    return {
      targetMembership,
      athleteId: athlete.id,
    };
  }
  private async requireDbClubReadContext(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
    denyMessage?: string;
  }) {
    const prisma = getPrismaClientOrThrow();
    const [club, viewerMembership] = await Promise.all([
      prisma.club.findFirst({
        where: {
          id: params.clubId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
      prisma.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId: params.clubId,
            userId: params.authUserId,
          },
        },
      }),
    ]);
    if (!club) {
      throw notFound('Club not found');
    }
    if (
      !params.isPrivilegedAdmin &&
      (!viewerMembership || !viewerMembership.active || viewerMembership.deletedAt)
    ) {
      throw forbidden(params.denyMessage ?? 'You do not have permission to view this club');
    }
    return {
      club,
      viewerMembership,
    };
  }
  private async requireDbClubSquadManageContext(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }) {
    const context = await this.requireDbClubReadContext({
      ...params,
      denyMessage: 'You do not have permission to manage club squads',
    });
    if (!params.isPrivilegedAdmin) {
      requireManageClubSquads(context.viewerMembership?.role);
    }
    return context;
  }

  async listVisibleClubs(params: {
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<VisibleClub[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listVisibleClubs(params);
    }
    const prisma = getPrismaClientOrThrow();
    const baseWhere = {
      deletedAt: null as null,
    };
    const membershipsWhere = {
      active: true,
      deletedAt: null as null,
    };
    const visibleMemberships = params.isPrivilegedAdmin
      ? null
      : await prisma.clubMembership.findMany({
          where: {
            ...membershipsWhere,
            userId: params.authUserId,
          },
          select: {
            clubId: true,
          },
        });
    const clubIds = visibleMemberships
      ? [...new Set(visibleMemberships.map((row) => row.clubId))]
      : [];
    if (!params.isPrivilegedAdmin && clubIds.length === 0) {
      return [];
    }
    const clubs = await prisma.club.findMany({
      where: params.isPrivilegedAdmin
        ? baseWhere
        : {
            ...baseWhere,
            id: {
              in: clubIds,
            },
          },
      include: {
        memberships: {
          where: membershipsWhere,
          orderBy: {
            createdAt: 'asc',
          },
        },
        squads: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        inviteCodes: {
          where: {
            deletedAt: null,
            role: 'MEMBER',
            expiresAt: {
              gt: new Date(),
            },
            remainingUses: {
              gt: 0,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return normalizeForJson(
      clubs.map((club) => ({
        ...buildClubSummary(
          {
            id: club.id,
            name: club.name,
            slug: club.slug,
            visibility: club.visibility,
            createdByUserId: club.createdByUserId,
          },
          club.inviteCodes[0]?.code ?? null,
        ),
        memberships: club.memberships.map((membership) =>
          toMembershipSummary({
            id: membership.id,
            clubId: membership.clubId,
            userId: membership.userId,
            role: membership.role,
            active: membership.active,
            createdAt: membership.createdAt,
            updatedAt: membership.updatedAt,
          }),
        ),
        viewerMembership:
          club.memberships
            .map((membership) =>
              toMembershipSummary({
                id: membership.id,
                clubId: membership.clubId,
                userId: membership.userId,
                role: membership.role,
                active: membership.active,
                createdAt: membership.createdAt,
                updatedAt: membership.updatedAt,
              }),
            )
            .find((membership) => membership.userId === params.authUserId) ?? null,
        squads: club.squads,
      })),
    );
  }
  async listClubMembers(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listClubMembers(params);
    }
    const prisma = getPrismaClientOrThrow();
    const club = await prisma.club.findFirst({
      where: {
        id: params.clubId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!club) {
      throw notFound('Club not found');
    }
    if (!params.isPrivilegedAdmin) {
      const viewerMembership = await prisma.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId: params.clubId,
            userId: params.authUserId,
          },
        },
      });
      if (!viewerMembership?.active || viewerMembership.deletedAt) {
        throw forbidden('You do not have permission to view club members');
      }
    }
    const memberships = await prisma.clubMembership.findMany({
      where: {
        clubId: params.clubId,
        active: true,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    const userIds = memberships.map((membership) => membership.userId);
    const athletes =
      userIds.length > 0
        ? await prisma.athlete.findMany({
            where: {
              userId: {
                in: userIds,
              },
              deletedAt: null,
              NOT: {
                status: {
                  in: ['inactive', 'INACTIVE'],
                },
              },
            },
            select: {
              id: true,
              userId: true,
            },
          })
        : [];
    const athleteIds = athletes.map((athlete) => athlete.id);
    const squadMemberships =
      athleteIds.length > 0
        ? await prisma.squadMembership.findMany({
            where: {
              athleteId: {
                in: athleteIds,
              },
              deletedAt: null,
              NOT: {
                status: {
                  in: ['inactive', 'INACTIVE'],
                },
              },
              squad: {
                clubId: params.clubId,
                deletedAt: null,
              },
            },
            select: {
              athleteId: true,
              squadId: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          })
        : [];
    const athleteIdByUserId = new Map(
      athletes.flatMap((athlete) => (athlete.userId ? [[athlete.userId, athlete.id] as const] : [])),
    );
    const squadIdsByAthleteId = new Map<string, string[]>();
    for (const membership of squadMemberships) {
      const current = squadIdsByAthleteId.get(membership.athleteId) ?? [];
      current.push(membership.squadId);
      squadIdsByAthleteId.set(membership.athleteId, current);
    }
    return normalizeForJson(
      memberships.map((membership) =>
        buildClubMemberRecord({
          membership: {
            id: membership.id,
            clubId: membership.clubId,
            userId: membership.userId,
            role: membership.role,
            active: membership.active,
            createdAt: membership.createdAt,
            updatedAt: membership.updatedAt,
            deletedAt: membership.deletedAt,
          },
          user: membership.user,
          squadIds: squadIdsByAthleteId.get(athleteIdByUserId.get(membership.userId) ?? '') ?? [],
        }),
      ),
    );
  }
  async listClubSquads(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubSquadRecord[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listClubSquads(params);
    }
    await this.requireDbClubReadContext({
      ...params,
      denyMessage: 'You do not have permission to view club squads',
    });
    const prisma = getPrismaClientOrThrow();
    const squads = await prisma.squad.findMany({
      where: {
        clubId: params.clubId,
        deletedAt: null,
      },
      include: {
        memberships: {
          where: {
            deletedAt: null,
            NOT: {
              status: {
                in: ['inactive', 'INACTIVE'],
              },
            },
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return normalizeForJson(
      squads.map((squad) =>
        buildClubSquadRecord({
          squad: squad as unknown as SeedRow,
          memberCount: squad.memberships.length,
        }),
      ),
    );
  }
  async getClubSquad(params: {
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubSquadRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.getClubSquad(params);
    }
    const prisma = getPrismaClientOrThrow();
    const squad = await prisma.squad.findFirst({
      where: {
        id: params.squadId,
        deletedAt: null,
      },
      include: {
        memberships: {
          where: {
            deletedAt: null,
            NOT: {
              status: {
                in: ['inactive', 'INACTIVE'],
              },
            },
          },
          select: {
            id: true,
          },
        },
      },
    });
    if (!squad) {
      throw notFound('Squad not found');
    }
    await this.requireDbClubReadContext({
      clubId: squad.clubId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
      denyMessage: 'You do not have permission to view club squads',
    });
    return normalizeForJson(
      buildClubSquadRecord({
        squad: squad as unknown as SeedRow,
        memberCount: squad.memberships.length,
      }),
    );
  }
  async listSquadMembers(params: {
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<SquadMemberRecord[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listSquadMembers(params);
    }
    const prisma = getPrismaClientOrThrow();
    const squad = await prisma.squad.findFirst({
      where: {
        id: params.squadId,
        deletedAt: null,
      },
      select: {
        clubId: true,
        ownerCoachUserId: true,
      },
    });
    if (!squad) {
      throw notFound('Squad not found');
    }
    const context = await this.requireDbClubReadContext({
      clubId: squad.clubId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
      denyMessage: 'You do not have permission to view this squad roster',
    });
    if (
      !params.isPrivilegedAdmin &&
      squad.ownerCoachUserId !== params.authUserId
    ) {
      requireManageClubSquads(context.viewerMembership?.role);
    }
    const memberships = await prisma.squadMembership.findMany({
      where: {
        squadId: params.squadId,
        deletedAt: null,
        NOT: {
          status: {
            in: ['inactive', 'INACTIVE'],
          },
        },
      },
      include: {
        athlete: {
          select: {
            id: true,
            userId: true,
            primaryPosition: true,
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
      orderBy: {
        createdAt: 'asc',
      },
    });
    return normalizeForJson(
      memberships.map((membership) => {
        const primaryGuardian =
          membership.athlete.guardianLinks.find((link) => link.isPrimary) ??
          [...membership.athlete.guardianLinks].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          )[0];
        return buildSquadMemberRecord({
          membership: membership as unknown as SeedRow,
          athlete: membership.athlete as unknown as SeedRow,
          parentId: primaryGuardian?.guardianUserId ?? null,
        });
      }),
    );
  }
  async listAthleteSquadMemberships(params: {
    athleteId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<AthleteSquadMembershipRecord[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listAthleteSquadMemberships(params);
    }
    const prisma = getPrismaClientOrThrow();
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: params.athleteId,
        deletedAt: null,
        NOT: {
          status: {
            in: ['inactive', 'INACTIVE'],
          },
        },
      },
      select: {
        id: true,
        userId: true,
        guardianLinks: {
          where: {
            deletedAt: null,
          },
          select: {
            guardianUserId: true,
          },
        },
      },
    });
    if (!athlete) {
      throw notFound('Athlete not found');
    }
    const canRead =
      params.isPrivilegedAdmin ||
      athlete.userId === params.authUserId ||
      athlete.guardianLinks.some((link) => link.guardianUserId === params.authUserId);
    if (!canRead) {
      throw forbidden('You do not have permission to view this athlete squad membership');
    }
    const memberships = await prisma.squadMembership.findMany({
      where: {
        athleteId: params.athleteId,
        deletedAt: null,
        NOT: {
          status: {
            in: ['inactive', 'INACTIVE'],
          },
        },
      },
      include: {
        squad: {
          select: {
            id: true,
            clubId: true,
            name: true,
            ageBandLabel: true,
            deletedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return normalizeForJson(
      memberships.flatMap((membership) =>
        membership.squad.deletedAt
          ? []
          : [
              buildAthleteSquadMembershipRecord({
                membership: membership as unknown as SeedRow,
                squad: membership.squad as unknown as SeedRow,
              }),
            ],
      ),
    );
  }
  async createClubSquad(params: {
    clubId: string;
    name: string;
    level?: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubSquadRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.createClubSquad(params);
    }
    await this.requireDbClubSquadManageContext(params);
    const name = params.name.trim();
    if (!name) {
      throw badRequest('Squad name is required');
    }
    const prisma = getPrismaClientOrThrow();
    const squad = await prisma.squad.create({
      data: {
        id: `sqd_${randomUUID()}`,
        clubId: params.clubId,
        ownerCoachUserId: params.authUserId,
        name,
        ageBandLabel: params.level?.trim() || null,
        createdByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
      },
    });
    return normalizeForJson(
      buildClubSquadRecord({
        squad: squad as unknown as SeedRow,
        memberCount: 0,
      }),
    );
  }
  async updateClubSquad(params: {
    clubId: string;
    squadId: string;
    name?: string;
    level?: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubSquadRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.updateClubSquad(params);
    }
    await this.requireDbClubSquadManageContext({
      clubId: params.clubId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
    const nextName = params.name?.trim();
    if (params.name !== undefined && !nextName) {
      throw badRequest('Squad name is required');
    }
    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.squad.findFirst({
      where: {
        id: params.squadId,
        clubId: params.clubId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!existing) {
      throw notFound('Squad not found');
    }
    const squad = await prisma.squad.update({
      where: {
        id: params.squadId,
      },
      data: {
        ...(nextName ? { name: nextName } : {}),
        ...(params.level !== undefined ? { ageBandLabel: params.level.trim() || null } : {}),
        updatedByUserId: params.authUserId,
        version: {
          increment: 1n,
        },
      },
      include: {
        memberships: {
          where: {
            deletedAt: null,
            NOT: {
              status: {
                in: ['inactive', 'INACTIVE'],
              },
            },
          },
          select: {
            id: true,
          },
        },
      },
    });
    return normalizeForJson(
      buildClubSquadRecord({
        squad: squad as unknown as SeedRow,
        memberCount: squad.memberships.length,
      }),
    );
  }
  async deleteClubSquad(params: {
    clubId: string;
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<void> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.deleteClubSquad(params);
    }
    await this.requireDbClubSquadManageContext({
      clubId: params.clubId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
    const prisma = getPrismaClientOrThrow();
    const squad = await prisma.squad.findFirst({
      where: {
        id: params.squadId,
        clubId: params.clubId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!squad) {
      throw notFound('Squad not found');
    }
    const [activeMembershipCount, activeSessionCount, activeMatchCount] = await Promise.all([
      prisma.squadMembership.count({
        where: {
          squadId: params.squadId,
          deletedAt: null,
          NOT: {
            status: {
              in: ['inactive', 'INACTIVE'],
            },
          },
        },
      }),
      prisma.groupSession.count({
        where: {
          squadId: params.squadId,
          deletedAt: null,
          NOT: {
            status: {
              in: ['COMPLETED', 'CANCELLED'],
            },
          },
        },
      }),
      prisma.clubMatch.count({
        where: {
          squadId: params.squadId,
          deletedAt: null,
          NOT: {
            status: {
              in: ['COMPLETED', 'CANCELLED'],
            },
          },
        },
      }),
    ]);
    if (activeMembershipCount > 0 || activeSessionCount > 0 || activeMatchCount > 0) {
      throw conflict('Squad has active dependencies and cannot be archived', {
        activeMembershipCount,
        activeSessionCount,
        activeMatchCount,
      });
    }
    await prisma.squad.update({
      where: {
        id: params.squadId,
      },
      data: {
        deletedAt: new Date(),
        deletedByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
        version: {
          increment: 1n,
        },
      },
    });
  }
  async updateClubMemberRole(params: {
    clubId: string;
    userId: string;
    role: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.updateClubMemberRole(params);
    }
    const requestedRole = parseOrganizationRole(params.role);
    if (!requestedRole) {
      throw badRequest('Unsupported club role');
    }
    const prisma = getPrismaClientOrThrow();
    const [viewerMembership, targetMembership] = await Promise.all([
      prisma.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId: params.clubId,
            userId: params.authUserId,
          },
        },
      }),
      prisma.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId: params.clubId,
            userId: params.userId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);
    if (!targetMembership?.active || targetMembership.deletedAt) {
      throw notFound('Club member not found');
    }
    if (!params.isPrivilegedAdmin) {
      assertCanManageTargetRole({
        managerRole: viewerMembership?.role,
        targetRole: targetMembership.role,
        requestedRole,
      });
    } else {
      assertPrivilegedCanManageTargetRole({
        targetRole: targetMembership.role,
        requestedRole,
      });
    }
    const updated = await prisma.clubMembership.update({
      where: {
        clubId_userId: {
          clubId: params.clubId,
          userId: params.userId,
        },
      },
      data: {
        role: toStoreRole(requestedRole),
        updatedByUserId: params.authUserId,
        version: {
          increment: 1n,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    return normalizeForJson(
      buildClubMemberRecord({
        membership: {
          id: updated.id,
          clubId: updated.clubId,
          userId: updated.userId,
          role: updated.role,
          active: updated.active,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          deletedAt: updated.deletedAt,
        },
        user: updated.user,
        squadIds: await this.listDbSquadIdsForClubMember({
          clubId: params.clubId,
          userId: params.userId,
        }),
      }),
    );
  }
  async removeClubMember(params: {
    clubId: string;
    userId: string;
    reason: string;
    customReason?: string | null;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRemovalRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.removeClubMember(params);
    }
    const prisma = getPrismaClientOrThrow();
    const [viewerMembership, targetMembership, removedByUser] = await Promise.all([
      prisma.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId: params.clubId,
            userId: params.authUserId,
          },
        },
      }),
      prisma.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId: params.clubId,
            userId: params.userId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: {
          id: params.authUserId,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      }),
    ]);
    if (!targetMembership?.active || targetMembership.deletedAt) {
      throw notFound('Club member not found');
    }
    if (!params.isPrivilegedAdmin) {
      assertCanManageTargetRole({
        managerRole: viewerMembership?.role,
        targetRole: targetMembership.role,
      });
    } else {
      assertPrivilegedCanManageTargetRole({
        targetRole: targetMembership.role,
      });
    }
    const now = new Date();
    const linkedAthlete = await prisma.athlete.findUnique({
      where: {
        userId: params.userId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });
    await prisma.$transaction(async (tx) => {
      await tx.clubMembership.update({
        where: {
          clubId_userId: {
            clubId: params.clubId,
            userId: params.userId,
          },
        },
        data: {
          active: false,
          deletedAt: now,
          deletedByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1n,
          },
        },
      });
      if (linkedAthlete && !linkedAthlete.deletedAt) {
        await tx.squadMembership.updateMany({
          where: {
            athleteId: linkedAthlete.id,
            deletedAt: null,
            NOT: {
              status: {
                in: ['inactive', 'INACTIVE'],
              },
            },
            squad: {
              clubId: params.clubId,
              deletedAt: null,
            },
          },
          data: {
            status: 'inactive',
            deletedAt: now,
            deletedByUserId: params.authUserId,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1n,
            },
          },
        });
      }
    });
    return normalizeForJson({
      id: targetMembership.id,
      clubId: params.clubId,
      userId: params.userId,
      userName:
        targetMembership.user.name ?? targetMembership.user.email ?? targetMembership.userId,
      userRole: toContractRoleString(targetMembership.role),
      reason: params.reason,
      customReason: params.customReason ?? null,
      removedBy: params.authUserId,
      removedByName: removedByUser?.name ?? removedByUser?.email ?? params.authUserId,
      removedAt: now.toISOString(),
      originalMembership: toMembershipSummary({
        id: targetMembership.id,
        clubId: targetMembership.clubId,
        userId: targetMembership.userId,
        role: toContractRoleString(targetMembership.role),
        active: targetMembership.active,
        createdAt: targetMembership.createdAt,
        updatedAt: targetMembership.updatedAt,
      }),
    });
  }
  async banClubMember(params: {
    clubId: string;
    userId: string;
    reason: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRemovalRecord> {
    return this.removeClubMember({
      clubId: params.clubId,
      userId: params.userId,
      reason: 'CONDUCT',
      customReason: params.reason,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
  }
  async restoreRemovedClubMember(params: {
    clubId: string;
    removalId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.restoreRemovedClubMember(params);
    }
    const prisma = getPrismaClientOrThrow();
    const targetMembership = await prisma.clubMembership.findFirst({
      where: {
        clubId: params.clubId,
        OR: [
          {
            id: params.removalId,
          },
          {
            userId: params.removalId,
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    if (
      !targetMembership ||
      (targetMembership.active && !targetMembership.deletedAt)
    ) {
      throw notFound('Removed club member not found');
    }
    if (
      await this.hasClubMemberBanEvent({
        clubId: params.clubId,
        userId: targetMembership.userId,
      })
    ) {
      throw forbidden('Banned club members cannot be restored through removal undo');
    }
    const viewerMembership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: params.clubId,
          userId: params.authUserId,
        },
      },
    });
    if (!params.isPrivilegedAdmin) {
      assertCanManageTargetRole({
        managerRole: viewerMembership?.role,
        targetRole: targetMembership.role,
      });
    } else {
      assertPrivilegedCanManageTargetRole({
        targetRole: targetMembership.role,
      });
    }
    const updated = await prisma.clubMembership.update({
      where: {
        clubId_userId: {
          clubId: params.clubId,
          userId: targetMembership.userId,
        },
      },
      data: {
        active: true,
        deletedAt: null,
        deletedByUserId: null,
        updatedByUserId: params.authUserId,
        version: {
          increment: 1n,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    return normalizeForJson(
      buildClubMemberRecord({
        membership: {
          id: updated.id,
          clubId: updated.clubId,
          userId: updated.userId,
          role: updated.role,
          active: updated.active,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          deletedAt: updated.deletedAt,
        },
        user: updated.user,
        squadIds: await this.listDbSquadIdsForClubMember({
          clubId: params.clubId,
          userId: targetMembership.userId,
        }),
      }),
    );
  }
  async addClubMemberToSquad(params: {
    clubId: string;
    userId: string;
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.addClubMemberToSquad(params);
    }
    const prisma = getPrismaClientOrThrow();
    const { targetMembership, athleteId } = await this.requireDbSquadAssignmentContext(params);
    const existing = await prisma.squadMembership.findUnique({
      where: {
        squadId_athleteId: {
          squadId: params.squadId,
          athleteId,
        },
      },
    });
    if (existing) {
      if (existing.deletedAt || existing.status.toLowerCase() === 'inactive') {
        await prisma.squadMembership.update({
          where: {
            squadId_athleteId: {
              squadId: params.squadId,
              athleteId,
            },
          },
          data: {
            status: 'active',
            deletedAt: null,
            deletedByUserId: null,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1n,
            },
          },
        });
      }
    } else {
      await prisma.squadMembership.create({
        data: {
          id: `sqm_${randomUUID()}`,
          squadId: params.squadId,
          athleteId,
          status: 'active',
          createdByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
        },
      });
    }
    return normalizeForJson(
      buildClubMemberRecord({
        membership: {
          id: targetMembership.id,
          clubId: targetMembership.clubId,
          userId: targetMembership.userId,
          role: targetMembership.role,
          active: targetMembership.active,
          createdAt: targetMembership.createdAt,
          updatedAt: targetMembership.updatedAt,
          deletedAt: targetMembership.deletedAt,
        },
        user: targetMembership.user,
        squadIds: await this.listDbSquadIdsForClubMember({
          clubId: params.clubId,
          userId: params.userId,
        }),
      }),
    );
  }
  async removeClubMemberFromSquad(params: {
    clubId: string;
    userId: string;
    squadId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubMemberRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.removeClubMemberFromSquad(params);
    }
    const prisma = getPrismaClientOrThrow();
    const { targetMembership, athleteId } = await this.requireDbSquadAssignmentContext(params);
    const existing = await prisma.squadMembership.findUnique({
      where: {
        squadId_athleteId: {
          squadId: params.squadId,
          athleteId,
        },
      },
    });
    if (existing && !existing.deletedAt && existing.status.toLowerCase() !== 'inactive') {
      await prisma.squadMembership.update({
        where: {
          squadId_athleteId: {
            squadId: params.squadId,
            athleteId,
          },
        },
        data: {
          status: 'inactive',
          deletedAt: new Date(),
          deletedByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1n,
          },
        },
      });
    }
    return normalizeForJson(
      buildClubMemberRecord({
        membership: {
          id: targetMembership.id,
          clubId: targetMembership.clubId,
          userId: targetMembership.userId,
          role: targetMembership.role,
          active: targetMembership.active,
          createdAt: targetMembership.createdAt,
          updatedAt: targetMembership.updatedAt,
          deletedAt: targetMembership.deletedAt,
        },
        user: targetMembership.user,
        squadIds: await this.listDbSquadIdsForClubMember({
          clubId: params.clubId,
          userId: params.userId,
        }),
      }),
    );
  }
  async listInviteCodes(params: {
    clubId: string;
    authUserId: string;
  }): Promise<ClubInviteCodeRecord[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listInviteCodes(params);
    }
    const prisma = getPrismaClientOrThrow();
    const viewerMembership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: params.clubId,
          userId: params.authUserId,
        },
      },
    });
    requireManageInvites(viewerMembership?.role);
    const inviteCodes = await prisma.clubInviteCode.findMany({
      where: {
        clubId: params.clubId,
        deletedAt: null,
        expiresAt: {
          gt: new Date(),
        },
        remainingUses: {
          gt: 0,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return normalizeForJson(
      inviteCodes.map((row) => ({
        id: row.id,
        clubId: row.clubId,
        code: row.code,
        role: row.role,
        createdByUserId: row.createdByUserId,
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        remainingUses: row.remainingUses,
      })),
    );
  }
  async createInviteCode(params: {
    clubId: string;
    authUserId: string;
    role: string;
  }): Promise<ClubInviteCodeRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.createInviteCode(params);
    }
    const prisma = getPrismaClientOrThrow();
    const club = await prisma.club.findUnique({
      where: {
        id: params.clubId,
      },
    });
    if (!club || club.deletedAt) {
      throw notFound('Club not found');
    }
    const viewerMembership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: params.clubId,
          userId: params.authUserId,
        },
      },
    });
    requireManageInvites(viewerMembership?.role);
    const now = new Date();
    const created = await prisma.$transaction(async (tx) => {
      if (params.role !== 'MEMBER') {
        await tx.clubInviteCode.updateMany({
          where: {
            clubId: params.clubId,
            role: params.role,
            deletedAt: null,
          },
          data: {
            deletedAt: now,
            deletedByUserId: params.authUserId,
            updatedByUserId: params.authUserId,
          },
        });
      }
      return tx.clubInviteCode.create({
        data: {
          id: `cinv_${randomUUID()}`,
          clubId: params.clubId,
          code: `${buildInviteCode(club.name, params.role)}-${randomUUID().slice(0, 4).toUpperCase()}`,
          role: params.role,
          remainingUses: params.role === 'MEMBER' ? 999 : 25,
          expiresAt: new Date(
            Date.now() + (params.role === 'MEMBER' ? 365 : 30) * 24 * 60 * 60 * 1000,
          ),
          createdByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
        },
      });
    });
    return normalizeForJson({
      id: created.id,
      clubId: created.clubId,
      code: created.code,
      role: created.role,
      createdByUserId: created.createdByUserId,
      createdAt: created.createdAt.toISOString(),
      expiresAt: created.expiresAt.toISOString(),
      remainingUses: created.remainingUses,
    });
  }
  async deleteInviteCode(params: {
    clubId: string;
    authUserId: string;
    code: string;
  }): Promise<void> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.deleteInviteCode(params);
    }
    const prisma = getPrismaClientOrThrow();
    const viewerMembership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: params.clubId,
          userId: params.authUserId,
        },
      },
    });
    requireManageInvites(viewerMembership?.role);
    await prisma.clubInviteCode.updateMany({
      where: {
        clubId: params.clubId,
        code: normalizeInviteCode(params.code),
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        deletedByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
      },
    });
  }
  async resolveJoinCode(params: { authUserId: string; code: string }): Promise<ClubJoinPreview> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.resolveJoinCode(params);
    }
    const prisma = getPrismaClientOrThrow();
    const inviteCode = await prisma.clubInviteCode.findFirst({
      where: {
        code: normalizeInviteCode(params.code),
        deletedAt: null,
      },
    });
    if (
      !inviteCode ||
      inviteCode.remainingUses <= 0 ||
      inviteCode.expiresAt.getTime() <= Date.now()
    ) {
      throw notFound('Invite code not found');
    }
    const club = await prisma.club.findUnique({
      where: {
        id: inviteCode.clubId,
      },
    });
    if (!club || club.deletedAt) {
      throw notFound('Club not found');
    }
    const existingMembership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: inviteCode.clubId,
          userId: params.authUserId,
        },
      },
    });
    if (!existingMembership?.active || existingMembership.deletedAt) {
      await this.assertClubMemberCanJoin({
        clubId: inviteCode.clubId,
        userId: params.authUserId,
      });
    }
    return normalizeForJson({
      clubId: club.id,
      clubName: club.name,
      clubSlug: club.slug,
      visibility: club.visibility,
      inviteCode: inviteCode.code,
      role: inviteCode.role,
      joinFlow: inviteCode.role === 'MEMBER' ? 'direct_join' : 'invite_review',
      expiresAt: inviteCode.expiresAt.toISOString(),
      alreadyMember: Boolean(existingMembership?.active && !existingMembership.deletedAt),
    });
  }
  async joinWithCode(params: {
    authUserId: string;
    code: string;
    actingAuthCanUseStaffLinks: boolean;
  }): Promise<JoinWithCodeResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.joinWithCode(params);
    }
    const prisma = getPrismaClientOrThrow();
    const inviteCode = await prisma.clubInviteCode.findFirst({
      where: {
        code: normalizeInviteCode(params.code),
        deletedAt: null,
      },
    });
    if (
      !inviteCode ||
      inviteCode.remainingUses <= 0 ||
      inviteCode.expiresAt.getTime() <= Date.now()
    ) {
      throw notFound('Invite code not found');
    }
    const club = await prisma.club.findUnique({
      where: {
        id: inviteCode.clubId,
      },
    });
    if (!club || club.deletedAt) {
      throw notFound('Club not found');
    }
    const clubSummary = buildClubSummary(
      {
        id: club.id,
        name: club.name,
        slug: club.slug,
        visibility: club.visibility,
        createdByUserId: club.createdByUserId,
      },
      inviteCode.code,
    );
    const existingMembership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: inviteCode.clubId,
          userId: params.authUserId,
        },
      },
    });
    if (existingMembership?.active && !existingMembership.deletedAt) {
      return {
        outcome: 'already_member',
        club: clubSummary,
        membership: normalizeForJson(
          toMembershipSummary({
            id: existingMembership.id,
            clubId: existingMembership.clubId,
            userId: existingMembership.userId,
            role: existingMembership.role,
            active: existingMembership.active,
            createdAt: existingMembership.createdAt,
            updatedAt: existingMembership.updatedAt,
          }),
        ),
        invite: null,
      };
    }
    await this.assertClubMemberCanJoin({
      clubId: inviteCode.clubId,
      userId: params.authUserId,
    });
    if (inviteCode.role !== 'MEMBER' && !params.actingAuthCanUseStaffLinks) {
      throw forbidden('Only coach or admin accounts can use staff invite links');
    }
    if (inviteCode.role === 'MEMBER') {
      const membership = await prisma.$transaction(async (tx) => {
        await tx.clubInviteCode.update({
          where: {
            id: inviteCode.id,
          },
          data: {
            remainingUses: Math.max(0, inviteCode.remainingUses - 1),
            updatedByUserId: inviteCode.createdByUserId,
          },
        });
        const membershipRow = existingMembership
          ? await tx.clubMembership.update({
              where: {
                clubId_userId: {
                  clubId: inviteCode.clubId,
                  userId: params.authUserId,
                },
              },
              data: {
                role: toStoreRole(inviteCode.role),
                active: true,
                deletedAt: null,
                deletedByUserId: null,
                updatedByUserId: inviteCode.createdByUserId,
                version: {
                  increment: 1n,
                },
              },
            })
          : await tx.clubMembership.create({
              data: {
                id: `cmb_${randomUUID()}`,
                clubId: inviteCode.clubId,
                userId: params.authUserId,
                role: toStoreRole(inviteCode.role),
                active: true,
                createdByUserId: inviteCode.createdByUserId,
                updatedByUserId: inviteCode.createdByUserId,
              },
            });
        return membershipRow;
      });
      return {
        outcome: 'joined',
        club: clubSummary,
        membership: normalizeForJson(
          toMembershipSummary({
            id: membership.id,
            clubId: membership.clubId,
            userId: membership.userId,
            role: membership.role,
            active: membership.active,
            createdAt: membership.createdAt,
            updatedAt: membership.updatedAt,
          }),
        ),
        invite: null,
      };
    }
    const pendingInvite = (
      await prisma.invite.findMany({
        where: {
          inviteType: 'club_staff_join',
          clubId: inviteCode.clubId,
          status: 'PENDING',
          revokedAt: null,
          expiresAt: {
            gt: new Date(),
          },
          targets: {
            some: {
              targetUserId: params.authUserId,
              status: 'PENDING',
            },
          },
        },
        include: {
          targets: {
            where: {
              targetUserId: params.authUserId,
            },
          },
        },
      })
    ).find(
      (invite) =>
        asString((invite.metadataJson as Record<string, unknown> | null)?.role) === inviteCode.role,
    );
    if (pendingInvite) {
      const target = pendingInvite.targets[0];
      return {
        outcome: 'invite_pending',
        club: clubSummary,
        membership: null,
        invite: normalizeForJson({
          id: pendingInvite.id,
          clubId: pendingInvite.clubId ?? '',
          clubName: club.name,
          targetUserId: target?.targetUserId ?? params.authUserId,
          inviteCode:
            asString((pendingInvite.metadataJson as Record<string, unknown> | null)?.inviteCode) ??
            inviteCode.code,
          role:
            asString((pendingInvite.metadataJson as Record<string, unknown> | null)?.role) ??
            inviteCode.role,
          invitedByUserId: pendingInvite.senderUserId,
          invitedByLabel:
            asString(
              (pendingInvite.metadataJson as Record<string, unknown> | null)?.invitedByLabel,
            ) ?? 'Club staff',
          status: 'pending',
          createdAt: pendingInvite.createdAt.toISOString(),
          expiresAt: pendingInvite.expiresAt?.toISOString() ?? new Date().toISOString(),
          respondedAt: target?.respondedAt?.toISOString() ?? null,
        }),
      };
    }
    const created = await prisma.invite.create({
      data: {
        id: `inv_${randomUUID()}`,
        inviteType: 'club_staff_join',
        senderUserId: inviteCode.createdByUserId,
        clubId: inviteCode.clubId,
        status: 'PENDING',
        message: 'Review this staff join request.',
        expiresAt: inviteCode.expiresAt,
        metadataJson: {
          inviteCode: inviteCode.code,
          role: inviteCode.role,
          invitedByLabel: 'Club staff',
        },
        targets: {
          create: {
            id: `ivt_${randomUUID()}`,
            targetUserId: params.authUserId,
            status: 'PENDING',
          },
        },
      },
      include: {
        targets: true,
      },
    });
    return {
      outcome: 'invite_pending',
      club: clubSummary,
      membership: null,
      invite: normalizeForJson({
        id: created.id,
        clubId: created.clubId ?? '',
        clubName: club.name,
        targetUserId: created.targets[0]?.targetUserId ?? params.authUserId,
        inviteCode: inviteCode.code,
        role: inviteCode.role,
        invitedByUserId: created.senderUserId,
        invitedByLabel: 'Club staff',
        status: 'pending',
        createdAt: created.createdAt.toISOString(),
        expiresAt: created.expiresAt?.toISOString() ?? new Date().toISOString(),
        respondedAt: created.targets[0]?.respondedAt?.toISOString() ?? null,
      }),
    };
  }
  async listPendingInvites(params: { authUserId: string }): Promise<PendingClubInvite[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listPendingInvites(params);
    }
    const prisma = getPrismaClientOrThrow();
    const invites = await prisma.invite.findMany({
      where: {
        inviteType: 'club_staff_join',
        status: 'PENDING',
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
        targets: {
          some: {
            targetUserId: params.authUserId,
            status: 'PENDING',
          },
        },
      },
      include: {
        targets: {
          where: {
            targetUserId: params.authUserId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const clubIds = invites.flatMap((invite) => {
      const mapped = invite.clubId;
      return isTruthy(mapped) ? [mapped] : [];
    });
    const clubs = clubIds.length
      ? await prisma.club.findMany({
          where: {
            id: {
              in: clubIds,
            },
          },
        })
      : [];
    const clubNameById = new Map(clubs.map((club) => [club.id, club.name]));
    return normalizeForJson(
      invites.map((invite) => {
        const target = invite.targets[0];
        const metadata = invite.metadataJson as Record<string, unknown> | null;
        return {
          id: invite.id,
          clubId: invite.clubId ?? '',
          clubName: clubNameById.get(invite.clubId ?? '') ?? 'Club',
          targetUserId: target?.targetUserId ?? params.authUserId,
          inviteCode: asString(metadata?.inviteCode) ?? '',
          role: asString(metadata?.role) ?? 'COACH',
          invitedByUserId: invite.senderUserId,
          invitedByLabel: asString(metadata?.invitedByLabel) ?? 'Club staff',
          status: 'pending' as const,
          createdAt: invite.createdAt.toISOString(),
          expiresAt: invite.expiresAt?.toISOString() ?? new Date().toISOString(),
          respondedAt: target?.respondedAt?.toISOString() ?? null,
        };
      }),
    );
  }
  async respondToInvite(params: {
    authUserId: string;
    inviteId: string;
    response: 'accepted' | 'declined';
  }): Promise<RespondToInviteResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.respondToInvite(params);
    }
    const prisma = getPrismaClientOrThrow();
    const invite = await prisma.invite.findUnique({
      where: {
        id: params.inviteId,
      },
      include: {
        targets: {
          where: {
            targetUserId: params.authUserId,
          },
        },
      },
    });
    if (
      !invite ||
      invite.inviteType !== 'club_staff_join' ||
      invite.targets.length === 0 ||
      invite.revokedAt
    ) {
      throw notFound('Club invite not found');
    }
    const target = invite.targets[0];
    const clubId = invite.clubId;
    if (!clubId) {
      throw notFound('Club not found');
    }
    const club = await prisma.club.findUnique({
      where: {
        id: clubId,
      },
    });
    if (!club || club.deletedAt) {
      throw notFound('Club not found');
    }
    const metadata = invite.metadataJson as Record<string, unknown> | null;
    if (params.response === 'accepted') {
      await this.assertClubMemberCanJoin({
        clubId,
        userId: params.authUserId,
      });
    }
    const membership = await prisma.$transaction(async (tx) => {
      const nextStatus = params.response.toUpperCase();
      const recordResponse = () =>
        Promise.all([
          tx.invite.update({
            where: {
              id: invite.id,
            },
            data: {
              status: nextStatus as 'ACCEPTED' | 'DECLINED',
            },
          }),
          tx.inviteTarget.update({
            where: {
              id: target.id,
            },
            data: {
              status: nextStatus as 'ACCEPTED' | 'DECLINED',
              respondedAt: new Date(),
              responsePayloadJson: {
                response: params.response,
                source: 'club_invites',
              },
            },
          }),
        ]);
      if (params.response !== 'accepted') {
        await recordResponse();
        return null;
      }
      await recordResponse();
      const existingMembership = await tx.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId,
            userId: params.authUserId,
          },
        },
      });
      if (existingMembership) {
        return tx.clubMembership.update({
          where: {
            clubId_userId: {
              clubId,
              userId: params.authUserId,
            },
          },
          data: {
            role: toStoreRole(asString(metadata?.role) ?? 'COACH'),
            active: true,
            deletedAt: null,
            deletedByUserId: null,
            updatedByUserId: invite.senderUserId,
            version: {
              increment: 1n,
            },
          },
        });
      }
      return tx.clubMembership.create({
        data: {
          id: `cmb_${randomUUID()}`,
          clubId,
          userId: params.authUserId,
          role: toStoreRole(asString(metadata?.role) ?? 'COACH'),
          active: true,
          createdByUserId: invite.senderUserId,
          updatedByUserId: invite.senderUserId,
        },
      });
    });
    return {
      invite: normalizeForJson({
        id: invite.id,
        clubId,
        clubName: club.name,
        targetUserId: params.authUserId,
        inviteCode: asString(metadata?.inviteCode) ?? '',
        role: asString(metadata?.role) ?? 'COACH',
        invitedByUserId: invite.senderUserId,
        invitedByLabel: asString(metadata?.invitedByLabel) ?? 'Club staff',
        status: params.response,
        createdAt: invite.createdAt.toISOString(),
        expiresAt: invite.expiresAt?.toISOString() ?? new Date().toISOString(),
        respondedAt: new Date().toISOString(),
      }),
      membership: membership
        ? normalizeForJson(
            toMembershipSummary({
              id: membership.id,
              clubId: membership.clubId,
              userId: membership.userId,
              role: membership.role,
              active: membership.active,
              createdAt: membership.createdAt,
              updatedAt: membership.updatedAt,
            }),
          )
        : null,
      club: buildClubSummary(
        {
          id: club.id,
          name: club.name,
          slug: club.slug,
          visibility: club.visibility,
          createdByUserId: club.createdByUserId,
        },
        asString(metadata?.inviteCode) ?? '',
      ),
    };
  }
}
const seedClubAuthorityRepository = new SeedClubAuthorityRepository(
  () => getMarketplaceSeedStore().tables,
);
const dbClubAuthorityRepository = new DbClubAuthorityRepository();
export function resolveClubAuthorityRepository(): ClubAuthorityRepository {
  return getApiDataBackend() === 'db' ? dbClubAuthorityRepository : seedClubAuthorityRepository;
}
export function resetClubAuthorityRepositoryForTests(): void {
  // The repository mutates only the current backend tables; test store reset functions own the real reset.
}
