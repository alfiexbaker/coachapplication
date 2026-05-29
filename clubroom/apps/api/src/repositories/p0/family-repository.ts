import crypto from 'node:crypto';
import { badRequest, conflict, forbidden, notFound } from '../../lib/http-errors.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';
type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
type GuardianInviteRole = 'GUARDIAN' | 'VIEWER';
type GuardianInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
type GuardianPermission =
  | 'VIEW_SCHEDULE'
  | 'VIEW_PROGRESS'
  | 'BOOK_SESSIONS'
  | 'MANAGE_PAYMENTS'
  | 'MANAGE_PROFILE'
  | 'ADMIN';
export interface GuardianInviteRecord {
  id: string;
  familyId: string;
  inviteeEmail: string;
  inviteeName?: string;
  role: GuardianInviteRole;
  permissions: GuardianPermission[];
  relationship: string;
  childAccess: string[];
  status: GuardianInviteStatus;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  respondedAt?: string;
  message?: string;
}
export interface CreateGuardianInviteInput {
  familyId: string;
  inviterUserId: string;
  inviteeEmail: string;
  inviteeName?: string;
  role: GuardianInviteRole;
  relationship: string;
  childAccess: string[];
  message?: string;
}
export interface GuardianInviteCreateResult {
  invite: GuardianInviteRecord;
  replayed: boolean;
}
export interface GuardianInviteRespondResult {
  invite: GuardianInviteRecord;
  familyId: string;
  replayed: boolean;
}
export interface FamilyAggregate {
  family: Record<string, unknown>;
  memberships: Array<Record<string, unknown>>;
  athletes: Array<Record<string, unknown>>;
  guardianInvites: GuardianInviteRecord[];
  dataVersion: string | null;
}
export interface FamilyRepository {
  getFamilyAggregate(
    familyId: string,
    authUserId: string,
    isClubAdmin: boolean,
  ): Promise<FamilyAggregate>;
  listGuardianInvitesForUser(authUserId: string): Promise<GuardianInviteRecord[]>;
  createGuardianInvite(input: CreateGuardianInviteInput): Promise<GuardianInviteCreateResult>;
  respondGuardianInvite(
    inviteId: string,
    authUserId: string,
    response: 'ACCEPTED' | 'DECLINED',
  ): Promise<GuardianInviteRespondResult>;
  cancelGuardianInvite(familyId: string, inviteId: string, authUserId: string): Promise<boolean>;
  removeGuardian(familyId: string, guardianId: string, authUserId: string): Promise<boolean>;
}
function ensureStoreTable(tables: SeedTables, name: string): SeedRow[] {
  if (!Array.isArray(tables[name])) {
    tables[name] = [];
  }
  return asRows(tables[name]);
}
function defaultInvitePermissions(role: GuardianInviteRole): GuardianPermission[] {
  if (role === 'VIEWER') {
    return ['VIEW_SCHEDULE', 'VIEW_PROGRESS'];
  }
  return ['VIEW_SCHEDULE', 'VIEW_PROGRESS', 'BOOK_SESSIONS'];
}
function membershipPermissionsForRole(role: GuardianInviteRole): string[] {
  if (role === 'VIEWER') {
    return ['messages'];
  }
  return ['book', 'messages'];
}
function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
function inviteFromRow(row: SeedRow): GuardianInviteRecord {
  return {
    id: asString(row.id) ?? '',
    familyId: asString(row.familyId) ?? '',
    inviteeEmail: asString(row.inviteeEmail) ?? '',
    inviteeName: asString(row.inviteeName),
    role: (asString(row.role) as GuardianInviteRole | undefined) ?? 'GUARDIAN',
    permissions: asStringArray(row.permissions) as GuardianPermission[],
    relationship: asString(row.relationshipLabel) ?? asString(row.relationship) ?? 'Guardian',
    childAccess: asStringArray(row.childAccessAthleteIds ?? row.childAccess),
    status: (asString(row.status) as GuardianInviteStatus | undefined) ?? 'PENDING',
    invitedBy: asString(row.invitedByUserId) ?? asString(row.invitedBy) ?? '',
    createdAt: asString(row.createdAt) ?? isoNow(),
    expiresAt: asString(row.expiresAt) ?? isoNow(),
    respondedAt: asString(row.respondedAt),
    message: asString(row.message),
  };
}
function invitePayloadMatches(row: SeedRow, input: CreateGuardianInviteInput): boolean {
  const requestedChildAccess = Array.from(new Set(input.childAccess)).toSorted();
  const existingChildAccess = asStringArray(row.childAccessAthleteIds ?? row.childAccess).sort();
  return (
    asString(row.invitedByUserId) === input.inviterUserId &&
    asString(row.role) === input.role &&
    (asString(row.relationshipLabel) ?? asString(row.relationship) ?? '') ===
      input.relationship.trim() &&
    JSON.stringify(existingChildAccess) === JSON.stringify(requestedChildAccess) &&
    (asString(row.message) ?? '') === (normalizeOptionalString(input.message) ?? '')
  );
}
function isPending(row: SeedRow, now = Date.now()): boolean {
  const expiresAt = asString(row.expiresAt);
  return (
    asString(row.status) === 'PENDING' &&
    !asString(row.deletedAt) &&
    (!expiresAt || Date.parse(expiresAt) > now)
  );
}
function isFamilyAdminFromRows(
  family: SeedRow,
  memberships: SeedRow[],
  authUserId: string,
): boolean {
  if (asString(family.primaryGuardianUserId) === authUserId) {
    return true;
  }
  const membership = memberships.find((row) => asString(row.userId) === authUserId);
  if (!membership) {
    return false;
  }
  const role = asString(membership.role)?.toLowerCase();
  const permissions = asStringArray(membership.permissions).map((permission) =>
    permission.toLowerCase(),
  );
  return role === 'owner' || role === 'admin' || permissions.includes('admin');
}
function familyAthleteIdsFromRows(tables: SeedTables, familyId: string): Set<string> {
  return new Set(
    asRows(tables.guardianChildLinks).flatMap((row) => {
      if (!(asString(row.familyId) === familyId && !asString(row.deletedAt))) return [];
      const mapped = asString(row.athleteId);
      return Boolean(mapped) ? [mapped] : [];
    }),
  );
}
function assertChildAccessIsInsideFamily(
  tables: SeedTables,
  familyId: string,
  childAccess: string[],
): void {
  if (childAccess.length === 0) {
    return;
  }
  const athleteIds = familyAthleteIdsFromRows(tables, familyId);
  const outsideFamily = childAccess.find((athleteId) => !athleteIds.has(athleteId));
  if (outsideFamily) {
    throw badRequest('Guardian child access must belong to this family', {
      athleteId: outsideFamily,
    });
  }
}
function activeUserEmailById(tables: SeedTables): Map<string, string> {
  const users = asRows(tables.users).filter((row) => !asString(row.deletedAt));
  return new Map(
    users.flatMap((row) => {
      const mapped = [asString(row.id), asString(row.email)?.toLowerCase()] as const;
      return Boolean(mapped[0] && mapped[1]) ? [mapped] : [];
    }),
  );
}
function activeUserEmail(tables: SeedTables, authUserId: string): string {
  const email = activeUserEmailById(tables).get(authUserId);
  if (!email) {
    throw forbidden(`Authenticated user ${authUserId} does not exist or has no email`);
  }
  return email;
}
function assertInviteeIsNotActiveFamilyMember(
  tables: SeedTables,
  familyId: string,
  inviteeEmail: string,
): void {
  const emailByUserId = activeUserEmailById(tables);
  const existing = asRows(tables.familyMemberships)
    .filter((row) => asString(row.familyId) === familyId && !asString(row.deletedAt))
    .find((row) => emailByUserId.get(asString(row.userId) ?? '') === inviteeEmail);
  if (existing) {
    throw conflict('This email already belongs to a family guardian', {
      familyId,
    });
  }
}
function createGuardianInviteFromTables(
  tables: SeedTables,
  input: CreateGuardianInviteInput,
): GuardianInviteCreateResult {
  const families = asRows(tables.families).filter((row) => !asString(row.deletedAt));
  const family = families.find((row) => asString(row.id) === input.familyId);
  if (!family) {
    throw notFound('Family not found', {
      familyId: input.familyId,
    });
  }
  const memberships = asRows(tables.familyMemberships).filter(
    (row) => asString(row.familyId) === input.familyId && !asString(row.deletedAt),
  );
  if (!isFamilyAdminFromRows(family, memberships, input.inviterUserId)) {
    throw forbidden('Only a family admin guardian can invite guardians');
  }
  const inviteeEmail = normalizeEmail(input.inviteeEmail);
  assertChildAccessIsInsideFamily(tables, input.familyId, input.childAccess);
  assertInviteeIsNotActiveFamilyMember(tables, input.familyId, inviteeEmail);
  const invites = ensureStoreTable(tables, 'familyGuardianInvites');
  const existingPending = invites.find(
    (row) =>
      asString(row.familyId) === input.familyId &&
      asString(row.inviteeEmail)?.toLowerCase() === inviteeEmail &&
      isPending(row),
  );
  if (existingPending) {
    if (
      invitePayloadMatches(existingPending, {
        ...input,
        inviteeEmail,
      })
    ) {
      return {
        invite: inviteFromRow(existingPending),
        replayed: true,
      };
    }
    throw conflict('A pending guardian invitation already exists for this email', {
      familyId: input.familyId,
    });
  }
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 7);
  const childAccess = [...new Set(input.childAccess)];
  const invite: SeedRow = {
    id: newId('ginv'),
    familyId: input.familyId,
    inviteeEmail,
    inviteeName: normalizeOptionalString(input.inviteeName),
    role: input.role,
    permissions: defaultInvitePermissions(input.role),
    relationshipLabel: input.relationship.trim(),
    childAccessAthleteIds: childAccess,
    status: 'PENDING',
    invitedByUserId: input.inviterUserId,
    message: normalizeOptionalString(input.message),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    respondedAt: null,
    updatedAt: now.toISOString(),
    deletedAt: null,
    deletedByUserId: null,
  };
  invites.push(invite);
  return {
    invite: inviteFromRow(invite),
    replayed: false,
  };
}
function listGuardianInvitesForUserFromTables(
  tables: SeedTables,
  authUserId: string,
): GuardianInviteRecord[] {
  const email = activeUserEmail(tables, authUserId);
  return asRows(tables.familyGuardianInvites)
    .filter((row) => asString(row.inviteeEmail)?.toLowerCase() === email && isPending(row))
    .sort(
      (left, right) =>
        Date.parse(asString(right.createdAt) ?? '') - Date.parse(asString(left.createdAt) ?? ''),
    )
    .map(inviteFromRow);
}
function familyInviteAthleteIds(
  tables: SeedTables,
  familyId: string,
  childAccess: string[],
): string[] {
  if (childAccess.length > 0) {
    return [...new Set(childAccess)];
  }
  return [...familyAthleteIdsFromRows(tables, familyId)];
}
function respondGuardianInviteFromTables(
  tables: SeedTables,
  inviteId: string,
  authUserId: string,
  response: 'ACCEPTED' | 'DECLINED',
): GuardianInviteRespondResult {
  const email = activeUserEmail(tables, authUserId);
  const invite = ensureStoreTable(tables, 'familyGuardianInvites').find(
    (row) => asString(row.id) === inviteId && !asString(row.deletedAt),
  );
  if (!invite) {
    throw notFound('Guardian invitation not found', {
      inviteId,
    });
  }
  const familyId = asString(invite.familyId);
  if (!familyId) {
    throw notFound('Guardian invitation family not found', {
      inviteId,
    });
  }
  if (asString(invite.inviteeEmail)?.toLowerCase() !== email) {
    throw forbidden('Guardian invitation does not belong to authenticated user');
  }
  const currentStatus = asString(invite.status);
  if (currentStatus === response) {
    return {
      invite: inviteFromRow(invite),
      familyId,
      replayed: true,
    };
  }
  if (currentStatus !== 'PENDING') {
    throw conflict('Guardian invitation has already been responded to', {
      inviteId,
      status: currentStatus,
    });
  }
  const expiresAt = asString(invite.expiresAt);
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    invite.status = 'EXPIRED';
    invite.updatedAt = isoNow();
    throw conflict('Guardian invitation has expired', {
      inviteId,
    });
  }
  const now = isoNow();
  invite.status = response;
  invite.respondedAt = now;
  invite.updatedAt = now;
  if (response === 'DECLINED') {
    return {
      invite: inviteFromRow(invite),
      familyId,
      replayed: false,
    };
  }
  const memberships = ensureStoreTable(tables, 'familyMemberships');
  const existingMembership = memberships.find(
    (row) => asString(row.familyId) === familyId && asString(row.userId) === authUserId,
  );
  const childAccess = asStringArray(invite.childAccessAthleteIds ?? invite.childAccess);
  const athleteIds = familyInviteAthleteIds(tables, familyId, childAccess);
  const role = (asString(invite.role) as GuardianInviteRole | undefined) ?? 'GUARDIAN';
  if (existingMembership) {
    existingMembership.role = role.toLowerCase();
    existingMembership.permissions = membershipPermissionsForRole(role);
    existingMembership.relationshipLabel = asString(invite.relationshipLabel) ?? 'Guardian';
    existingMembership.childAccessAthleteIds = athleteIds;
    existingMembership.deletedAt = null;
    existingMembership.deletedByUserId = null;
    existingMembership.updatedAt = now;
    existingMembership.updatedByUserId = authUserId;
  } else {
    memberships.push({
      id: newId('fmb'),
      familyId,
      userId: authUserId,
      role: role.toLowerCase(),
      permissions: membershipPermissionsForRole(role),
      relationshipLabel: asString(invite.relationshipLabel) ?? 'Guardian',
      childAccessAthleteIds: athleteIds,
      createdByUserId: asString(invite.invitedByUserId) ?? authUserId,
      updatedByUserId: authUserId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });
  }
  const guardianLinks = ensureStoreTable(tables, 'guardianChildLinks');
  const guardianLinkByAthleteId = new Map(
    guardianLinks.flatMap((row) => {
      if (asString(row.guardianUserId) !== authUserId) {
        return [];
      }
      const athleteId = asString(row.athleteId);
      return athleteId ? [[athleteId, row] as const] : [];
    }),
  );
  for (const athleteId of athleteIds) {
    const existingLink = guardianLinkByAthleteId.get(athleteId);
    if (existingLink) {
      existingLink.familyId = familyId;
      existingLink.relationshipType = (
        asString(invite.relationshipLabel) ?? 'guardian'
      ).toLowerCase();
      existingLink.isPrimary = false;
      existingLink.deletedAt = null;
      existingLink.deletedByUserId = null;
      existingLink.updatedAt = now;
      existingLink.updatedByUserId = authUserId;
      continue;
    }
    const createdLink = {
      id: newId('gcl'),
      familyId,
      guardianUserId: authUserId,
      athleteId,
      relationshipType: (asString(invite.relationshipLabel) ?? 'guardian').toLowerCase(),
      isPrimary: false,
      createdByUserId: asString(invite.invitedByUserId) ?? authUserId,
      updatedByUserId: authUserId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    };
    guardianLinks.push(createdLink);
    guardianLinkByAthleteId.set(athleteId, createdLink);
  }
  return {
    invite: inviteFromRow(invite),
    familyId,
    replayed: false,
  };
}
function cancelGuardianInviteFromTables(
  tables: SeedTables,
  familyId: string,
  inviteId: string,
  authUserId: string,
): boolean {
  const family = asRows(tables.families).find(
    (row) => asString(row.id) === familyId && !asString(row.deletedAt),
  );
  if (!family) {
    throw notFound('Family not found', {
      familyId,
    });
  }
  const memberships = asRows(tables.familyMemberships).filter(
    (row) => asString(row.familyId) === familyId && !asString(row.deletedAt),
  );
  if (!isFamilyAdminFromRows(family, memberships, authUserId)) {
    throw forbidden('Only a family admin guardian can cancel guardian invitations');
  }
  const invite = ensureStoreTable(tables, 'familyGuardianInvites').find(
    (row) =>
      asString(row.id) === inviteId &&
      asString(row.familyId) === familyId &&
      !asString(row.deletedAt),
  );
  if (!invite) {
    return false;
  }
  if (asString(invite.status) !== 'PENDING') {
    throw conflict('Only pending guardian invitations can be cancelled', {
      inviteId,
    });
  }
  invite.status = 'CANCELLED';
  invite.respondedAt = isoNow();
  invite.updatedAt = isoNow();
  return true;
}
function removeGuardianFromTables(
  tables: SeedTables,
  familyId: string,
  guardianId: string,
  authUserId: string,
): boolean {
  const now = isoNow();
  const family = asRows(tables.families).find(
    (row) => asString(row.id) === familyId && !asString(row.deletedAt),
  );
  if (!family) {
    throw notFound('Family not found', {
      familyId,
    });
  }
  const memberships = asRows(tables.familyMemberships).filter(
    (row) => asString(row.familyId) === familyId && !asString(row.deletedAt),
  );
  if (!isFamilyAdminFromRows(family, memberships, authUserId)) {
    throw forbidden('Only a family admin guardian can remove guardians');
  }
  const membership = memberships.find((row) => asString(row.id) === guardianId);
  if (!membership) {
    return false;
  }
  const guardianUserId = asString(membership.userId);
  if (!guardianUserId) {
    return false;
  }
  if (
    asString(family.primaryGuardianUserId) === guardianUserId ||
    asString(membership.role) === 'owner'
  ) {
    throw conflict('Cannot remove the primary guardian', {
      guardianId,
    });
  }
  const links = asRows(tables.guardianChildLinks).filter(
    (link) =>
      asString(link.familyId) === familyId &&
      asString(link.guardianUserId) === guardianUserId &&
      !asString(link.deletedAt),
  );
  if (links.some((link) => asBoolean(link.isPrimary))) {
    throw conflict('Cannot remove a primary guardian link', {
      guardianId,
    });
  }
  membership.deletedAt = now;
  membership.deletedByUserId = authUserId;
  membership.updatedAt = now;
  membership.updatedByUserId = authUserId;
  for (const link of links) {
    link.deletedAt = now;
    link.deletedByUserId = authUserId;
    link.updatedAt = now;
    link.updatedByUserId = authUserId;
  }
  return true;
}
function fromTables(
  tables: SeedTables,
  familyId: string,
  authUserId: string,
  isClubAdmin: boolean,
  dataVersion: string | null,
): FamilyAggregate {
  const families = asRows(tables.families).filter((row) => !asString(row.deletedAt));
  const memberships = asRows(tables.familyMemberships).filter((row) => !asString(row.deletedAt));
  const athletes = asRows(tables.athletes).filter((row) => !asString(row.deletedAt));
  const guardianChildLinks = asRows(tables.guardianChildLinks).filter(
    (row) => !asString(row.deletedAt),
  );
  const guardianInvites = asRows(tables.familyGuardianInvites).filter(
    (row) => !asString(row.deletedAt),
  );
  const childSenTags = asRows(tables.childSenTags).filter((row) => !asString(row.deletedAt));
  const childConsents = asRows(tables.childConsents);
  const users = asRows(tables.users).filter((row) => !asString(row.deletedAt));
  const family = families.find((row) => asString(row.id) === familyId);
  if (!family) {
    throw notFound('Family not found', {
      familyId,
    });
  }
  const familyMemberships = memberships.filter((row) => asString(row.familyId) === familyId);
  const canAccess =
    isClubAdmin || familyMemberships.some((row) => asString(row.userId) === authUserId);
  if (!canAccess) {
    throw forbidden('Not allowed to access this family');
  }
  const familyAthleteIds = new Set(
    guardianChildLinks.flatMap((row) => {
      if (!(asString(row.familyId) === familyId)) return [];
      const mapped = asString(row.athleteId);
      return Boolean(mapped) ? [mapped] : [];
    }),
  );
  const familyAthletes = athletes.flatMap((row) => {
    if (
      !(() => {
        const athleteId = asString(row.id);
        return Boolean(athleteId && familyAthleteIds.has(athleteId));
      })()
    )
      return [];
    const athleteId = asString(row.id) ?? '';
    return [
      {
        ...row,
        guardians: guardianChildLinks.filter((row) => asString(row.athleteId) === athleteId),
        senTags: childSenTags.filter((row) => asString(row.athleteId) === athleteId),
        consents: childConsents.filter((row) => asString(row.athleteId) === athleteId),
      },
    ];
  });
  const membershipRows = familyMemberships.map((membership) => {
    const userId = asString(membership.userId);
    const user = users.find((row) => asString(row.id) === userId) ?? null;
    return {
      ...membership,
      user,
    };
  });
  return {
    family,
    memberships: membershipRows,
    athletes: familyAthletes,
    guardianInvites: guardianInvites.flatMap((row) =>
      asString(row.familyId) === familyId && isPending(row) ? [inviteFromRow(row)] : [],
    ),
    dataVersion,
  };
}
class SeedFamilyRepository implements FamilyRepository {
  async getFamilyAggregate(
    familyId: string,
    authUserId: string,
    isClubAdmin: boolean,
  ): Promise<FamilyAggregate> {
    const store = getMarketplaceSeedStore();
    return fromTables(store.tables, familyId, authUserId, isClubAdmin, store.version);
  }
  async createGuardianInvite(
    input: CreateGuardianInviteInput,
  ): Promise<GuardianInviteCreateResult> {
    const store = getMarketplaceSeedStore();
    return createGuardianInviteFromTables(store.tables, input);
  }
  async listGuardianInvitesForUser(authUserId: string): Promise<GuardianInviteRecord[]> {
    const store = getMarketplaceSeedStore();
    return listGuardianInvitesForUserFromTables(store.tables, authUserId);
  }
  async respondGuardianInvite(
    inviteId: string,
    authUserId: string,
    response: 'ACCEPTED' | 'DECLINED',
  ): Promise<GuardianInviteRespondResult> {
    const store = getMarketplaceSeedStore();
    return respondGuardianInviteFromTables(store.tables, inviteId, authUserId, response);
  }
  async cancelGuardianInvite(
    familyId: string,
    inviteId: string,
    authUserId: string,
  ): Promise<boolean> {
    const store = getMarketplaceSeedStore();
    return cancelGuardianInviteFromTables(store.tables, familyId, inviteId, authUserId);
  }
  async removeGuardian(familyId: string, guardianId: string, authUserId: string): Promise<boolean> {
    const store = getMarketplaceSeedStore();
    return removeGuardianFromTables(store.tables, familyId, guardianId, authUserId);
  }
}
class DbFamilyRepository implements FamilyRepository {
  async getFamilyAggregate(
    familyId: string,
    authUserId: string,
    isClubAdmin: boolean,
  ): Promise<FamilyAggregate> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return fromTables(store.tables, familyId, authUserId, isClubAdmin, null);
    }
    const prisma = getPrismaClientOrThrow();
    const family = await prisma.family.findUnique({
      where: {
        id: familyId,
      },
    });
    if (!family) {
      throw notFound('Family not found', {
        familyId,
      });
    }
    const familyMemberships = await prisma.familyMembership.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
    });
    const canAccess = isClubAdmin || familyMemberships.some((row) => row.userId === authUserId);
    if (!canAccess) {
      throw forbidden('Not allowed to access this family');
    }
    const [users, guardianLinks, guardianInvites] = await Promise.all([
      prisma.user.findMany({
        where: {
          id: {
            in: familyMemberships.map((row) => row.userId),
          },
        },
      }),
      prisma.guardianChildLink.findMany({
        where: {
          familyId,
          deletedAt: null,
        },
      }),
      prisma.familyGuardianInvite.findMany({
        where: {
          familyId,
          status: 'PENDING',
          deletedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);
    const athleteIds = [...new Set(guardianLinks.map((row) => row.athleteId))];
    const [athletes, senTags, consents] = await Promise.all([
      prisma.athlete.findMany({
        where: {
          id: {
            in: athleteIds,
          },
          deletedAt: null,
        },
      }),
      prisma.childSenTag.findMany({
        where: {
          athleteId: {
            in: athleteIds,
          },
          deletedAt: null,
        },
      }),
      prisma.childConsent.findMany({
        where: {
          athleteId: {
            in: athleteIds,
          },
        },
      }),
    ]);
    const membershipRows = familyMemberships.map((membership) => {
      const user = users.find((row) => row.id === membership.userId) ?? null;
      return {
        ...membership,
        user,
      };
    });
    const familyAthletes = athletes.map((athlete) => ({
      ...athlete,
      guardians: guardianLinks.filter((row) => row.athleteId === athlete.id),
      senTags: senTags.filter((row) => row.athleteId === athlete.id),
      consents: consents.filter((row) => row.athleteId === athlete.id),
    }));
    return normalizeForJson({
      family,
      memberships: membershipRows,
      athletes: familyAthletes,
      guardianInvites: guardianInvites.map((row) =>
        inviteFromRow(normalizeForJson(row) as SeedRow),
      ),
      dataVersion: null,
    });
  }
  async createGuardianInvite(
    input: CreateGuardianInviteInput,
  ): Promise<GuardianInviteCreateResult> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return createGuardianInviteFromTables(store.tables, input);
    }
    const prisma = getPrismaClientOrThrow();
    const family = await prisma.family.findFirst({
      where: {
        id: input.familyId,
        deletedAt: null,
      },
    });
    if (!family) {
      throw notFound('Family not found', {
        familyId: input.familyId,
      });
    }
    const memberships = await prisma.familyMembership.findMany({
      where: {
        familyId: input.familyId,
        deletedAt: null,
      },
      include: {
        user: true,
      },
    });
    if (
      !isFamilyAdminFromRows(
        normalizeForJson(family) as SeedRow,
        normalizeForJson(memberships) as SeedRow[],
        input.inviterUserId,
      )
    ) {
      throw forbidden('Only a family admin guardian can invite guardians');
    }
    const familyAthleteIds = new Set(
      (
        await prisma.guardianChildLink.findMany({
          where: {
            familyId: input.familyId,
            deletedAt: null,
          },
          select: {
            athleteId: true,
          },
        })
      ).map((row) => row.athleteId),
    );
    const outsideFamily = input.childAccess.find((athleteId) => !familyAthleteIds.has(athleteId));
    if (outsideFamily) {
      throw badRequest('Guardian child access must belong to this family', {
        athleteId: outsideFamily,
      });
    }
    const inviteeEmail = normalizeEmail(input.inviteeEmail);
    if (memberships.some((row) => row.user?.email?.trim().toLowerCase() === inviteeEmail)) {
      throw conflict('This email already belongs to a family guardian', {
        familyId: input.familyId,
      });
    }
    const existingPending = await prisma.familyGuardianInvite.findFirst({
      where: {
        familyId: input.familyId,
        inviteeEmail,
        status: 'PENDING',
        deletedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    if (existingPending) {
      const row = normalizeForJson(existingPending) as SeedRow;
      if (
        invitePayloadMatches(row, {
          ...input,
          inviteeEmail,
        })
      ) {
        return {
          invite: inviteFromRow(row),
          replayed: true,
        };
      }
      throw conflict('A pending guardian invitation already exists for this email', {
        familyId: input.familyId,
      });
    }
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 7);
    const created = await prisma.familyGuardianInvite.create({
      data: {
        id: newId('ginv'),
        familyId: input.familyId,
        inviteeEmail,
        inviteeName: normalizeOptionalString(input.inviteeName) ?? null,
        role: input.role,
        permissions: defaultInvitePermissions(input.role),
        relationshipLabel: input.relationship.trim(),
        childAccessAthleteIds: [...new Set(input.childAccess)],
        status: 'PENDING',
        invitedByUserId: input.inviterUserId,
        message: normalizeOptionalString(input.message) ?? null,
        createdAt: now,
        updatedAt: now,
        expiresAt,
      },
    });
    return {
      invite: inviteFromRow(normalizeForJson(created) as SeedRow),
      replayed: false,
    };
  }
  async listGuardianInvitesForUser(authUserId: string): Promise<GuardianInviteRecord[]> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return listGuardianInvitesForUserFromTables(store.tables, authUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const user = await prisma.user.findUnique({
      where: {
        id: authUserId,
      },
      select: {
        email: true,
      },
    });
    const email = user?.email?.trim().toLowerCase();
    if (!email) {
      throw forbidden(`Authenticated user ${authUserId} does not exist or has no email`);
    }
    const invites = await prisma.familyGuardianInvite.findMany({
      where: {
        inviteeEmail: email,
        status: 'PENDING',
        deletedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return invites.map((row) => inviteFromRow(normalizeForJson(row) as SeedRow));
  }
  async respondGuardianInvite(
    inviteId: string,
    authUserId: string,
    response: 'ACCEPTED' | 'DECLINED',
  ): Promise<GuardianInviteRespondResult> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return respondGuardianInviteFromTables(store.tables, inviteId, authUserId, response);
    }
    const prisma = getPrismaClientOrThrow();
    const user = await prisma.user.findUnique({
      where: {
        id: authUserId,
      },
      select: {
        email: true,
      },
    });
    const email = user?.email?.trim().toLowerCase();
    if (!email) {
      throw forbidden(`Authenticated user ${authUserId} does not exist or has no email`);
    }
    const existing = await prisma.familyGuardianInvite.findFirst({
      where: {
        id: inviteId,
        deletedAt: null,
      },
    });
    if (!existing) {
      throw notFound('Guardian invitation not found', {
        inviteId,
      });
    }
    if (existing.inviteeEmail.trim().toLowerCase() !== email) {
      throw forbidden('Guardian invitation does not belong to authenticated user');
    }
    if (existing.status === response) {
      return {
        invite: inviteFromRow(normalizeForJson(existing) as SeedRow),
        familyId: existing.familyId,
        replayed: true,
      };
    }
    if (existing.status !== 'PENDING') {
      throw conflict('Guardian invitation has already been responded to', {
        inviteId,
        status: existing.status,
      });
    }
    if (existing.expiresAt.getTime() <= Date.now()) {
      await prisma.familyGuardianInvite.update({
        where: {
          id: inviteId,
        },
        data: {
          status: 'EXPIRED',
          updatedAt: new Date(),
        },
      });
      throw conflict('Guardian invitation has expired', {
        inviteId,
      });
    }
    const now = new Date();
    if (response === 'DECLINED') {
      const declined = await prisma.familyGuardianInvite.update({
        where: {
          id: inviteId,
        },
        data: {
          status: 'DECLINED',
          respondedAt: now,
          updatedAt: now,
        },
      });
      return {
        invite: inviteFromRow(normalizeForJson(declined) as SeedRow),
        familyId: declined.familyId,
        replayed: false,
      };
    }
    const childAccess = existing.childAccessAthleteIds;
    const familyLinks = await prisma.guardianChildLink.findMany({
      where: {
        familyId: existing.familyId,
        deletedAt: null,
      },
      select: {
        athleteId: true,
      },
    });
    const familyAthleteIds = [...new Set(familyLinks.map((row) => row.athleteId))];
    const athleteIds = childAccess.length > 0 ? [...new Set(childAccess)] : familyAthleteIds;
    const outsideFamily = athleteIds.find((athleteId) => !familyAthleteIds.includes(athleteId));
    if (outsideFamily) {
      throw badRequest('Guardian child access must belong to this family', {
        athleteId: outsideFamily,
      });
    }
    const role = (existing.role as GuardianInviteRole | undefined) ?? 'GUARDIAN';
    const accepted = await prisma.$transaction(async (tx) => {
      const currentMembership = await tx.familyMembership.findFirst({
        where: {
          familyId: existing.familyId,
          userId: authUserId,
        },
      });
      if (currentMembership) {
        await tx.familyMembership.update({
          where: {
            id: currentMembership.id,
          },
          data: {
            role: role.toLowerCase(),
            permissions: membershipPermissionsForRole(role),
            relationshipLabel: existing.relationshipLabel,
            childAccessAthleteIds: athleteIds,
            deletedAt: null,
            deletedByUserId: null,
            updatedByUserId: authUserId,
            updatedAt: now,
          },
        });
      } else {
        await tx.familyMembership.create({
          data: {
            id: newId('fmb'),
            familyId: existing.familyId,
            userId: authUserId,
            role: role.toLowerCase(),
            permissions: membershipPermissionsForRole(role),
            relationshipLabel: existing.relationshipLabel,
            childAccessAthleteIds: athleteIds,
            createdByUserId: existing.invitedByUserId,
            updatedByUserId: authUserId,
            createdAt: now,
            updatedAt: now,
          },
        });
      }
      await Promise.all(
        athleteIds.map(async (athleteId) => {
          const currentLink = await tx.guardianChildLink.findFirst({
            where: {
              guardianUserId: authUserId,
              athleteId,
            },
          });
          if (currentLink) {
            await tx.guardianChildLink.update({
              where: {
                id: currentLink.id,
              },
              data: {
                familyId: existing.familyId,
                relationshipType: existing.relationshipLabel.toLowerCase(),
                isPrimary: false,
                deletedAt: null,
                deletedByUserId: null,
                updatedByUserId: authUserId,
                updatedAt: now,
              },
            });
            return;
          }
          await tx.guardianChildLink.create({
            data: {
              id: newId('gcl'),
              familyId: existing.familyId,
              guardianUserId: authUserId,
              athleteId,
              relationshipType: existing.relationshipLabel.toLowerCase(),
              isPrimary: false,
              createdByUserId: existing.invitedByUserId,
              updatedByUserId: authUserId,
              createdAt: now,
              updatedAt: now,
            },
          });
        }),
      );
      return tx.familyGuardianInvite.update({
        where: {
          id: inviteId,
        },
        data: {
          status: 'ACCEPTED',
          respondedAt: now,
          updatedAt: now,
        },
      });
    });
    return {
      invite: inviteFromRow(normalizeForJson(accepted) as SeedRow),
      familyId: accepted.familyId,
      replayed: false,
    };
  }
  async cancelGuardianInvite(
    familyId: string,
    inviteId: string,
    authUserId: string,
  ): Promise<boolean> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return cancelGuardianInviteFromTables(store.tables, familyId, inviteId, authUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const family = await prisma.family.findFirst({
      where: {
        id: familyId,
        deletedAt: null,
      },
    });
    if (!family) {
      throw notFound('Family not found', {
        familyId,
      });
    }
    const memberships = await prisma.familyMembership.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
    });
    if (
      !isFamilyAdminFromRows(
        normalizeForJson(family) as SeedRow,
        normalizeForJson(memberships) as SeedRow[],
        authUserId,
      )
    ) {
      throw forbidden('Only a family admin guardian can cancel guardian invitations');
    }
    const invite = await prisma.familyGuardianInvite.findFirst({
      where: {
        id: inviteId,
        familyId,
        deletedAt: null,
      },
    });
    if (!invite) {
      return false;
    }
    if (invite.status !== 'PENDING') {
      throw conflict('Only pending guardian invitations can be cancelled', {
        inviteId,
      });
    }
    await prisma.familyGuardianInvite.update({
      where: {
        id: inviteId,
      },
      data: {
        status: 'CANCELLED',
        respondedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return true;
  }
  async removeGuardian(familyId: string, guardianId: string, authUserId: string): Promise<boolean> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return removeGuardianFromTables(store.tables, familyId, guardianId, authUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const family = await prisma.family.findFirst({
      where: {
        id: familyId,
        deletedAt: null,
      },
    });
    if (!family) {
      throw notFound('Family not found', {
        familyId,
      });
    }
    const memberships = await prisma.familyMembership.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
    });
    if (
      !isFamilyAdminFromRows(
        normalizeForJson(family) as SeedRow,
        normalizeForJson(memberships) as SeedRow[],
        authUserId,
      )
    ) {
      throw forbidden('Only a family admin guardian can remove guardians');
    }
    const membership = memberships.find((row) => row.id === guardianId);
    if (!membership) {
      return false;
    }
    if (family.primaryGuardianUserId === membership.userId || membership.role === 'owner') {
      throw conflict('Cannot remove the primary guardian', {
        guardianId,
      });
    }
    const primaryLinkCount = await prisma.guardianChildLink.count({
      where: {
        familyId,
        guardianUserId: membership.userId,
        isPrimary: true,
        deletedAt: null,
      },
    });
    if (primaryLinkCount > 0) {
      throw conflict('Cannot remove a primary guardian link', {
        guardianId,
      });
    }
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.familyMembership.update({
        where: {
          id: guardianId,
        },
        data: {
          deletedAt: now,
          deletedByUserId: authUserId,
          updatedByUserId: authUserId,
          updatedAt: now,
        },
      });
      await tx.guardianChildLink.updateMany({
        where: {
          familyId,
          guardianUserId: membership.userId,
          isPrimary: false,
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          deletedByUserId: authUserId,
          updatedByUserId: authUserId,
          updatedAt: now,
        },
      });
    });
    return true;
  }
}
const seedFamilyRepository = new SeedFamilyRepository();
const dbFamilyRepository = new DbFamilyRepository();
export function resolveFamilyRepository(): FamilyRepository {
  return getApiDataBackend() === 'db' ? dbFamilyRepository : seedFamilyRepository;
}
