import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import {
  canUseClubCapability,
  getClubGovernanceSnapshot,
  parseOrganizationRole,
} from '@clubroom/shared-contracts';
import { forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;

interface ClubInviteCodeRow {
  id: string;
  clubId: string;
  code: string;
  role: string;
  createdByUserId: string;
  createdAt: string;
  expiresAt: string;
  remainingUses: number;
}

interface PendingClubInviteRow {
  id: string;
  clubId: string;
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

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const isTruthy = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

let inviteCodesStore: ClubInviteCodeRow[] | null = null;
let pendingClubInvitesStore: PendingClubInviteRow[] = [];

export function resetCoachClubRouteStateForTests(): void {
  inviteCodesStore = null;
  pendingClubInvitesStore = [];
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

function toContractRole(role: string | undefined): string {
  return parseOrganizationRole(role) ?? 'MEMBER';
}

function buildCodePrefix(clubName: string): string {
  const normalized = clubName.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return normalized.slice(0, 5) || 'CLUB';
}

function buildInviteCode(clubName: string, role: string): string {
  const suffix = role === 'MEMBER' ? 'JOIN' : role.replace(/[^A-Za-z]/g, '').slice(0, 4) || 'TEAM';
  return `${buildCodePrefix(clubName)}-${suffix}`;
}

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function ensureInviteCodesStore(): ClubInviteCodeRow[] {
  if (inviteCodesStore) {
    return inviteCodesStore;
  }

  const store = getMarketplaceSeedStore();
  const clubs = asRows(store.tables.clubs);

  inviteCodesStore = clubs.flatMap((club) => {
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
        code: buildInviteCode(clubName, 'MEMBER'),
        role: 'MEMBER',
        createdByUserId,
        createdAt,
        expiresAt: addDaysIso(365),
        remainingUses: 999,
      },
      {
        id: `cinv_${randomUUID()}`,
        clubId,
        code: buildInviteCode(clubName, 'COACH'),
        role: 'COACH',
        createdByUserId,
        createdAt,
        expiresAt: addDaysIso(30),
        remainingUses: 25,
      },
    ];
  });

  return inviteCodesStore;
}

function getActiveMemberships(clubMemberships: SeedRow[]): SeedRow[] {
  return clubMemberships.filter((row) => row.active !== false && !asString(row.deletedAt));
}

function getViewerMembership(clubMemberships: SeedRow[], clubId: string, userId: string): SeedRow | null {
  return (
    getActiveMemberships(clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === userId,
    ) ?? null
  );
}

function requireAuthUserId(authUserId: string | undefined): string {
  if (!authUserId) {
    throw forbidden('Authenticated user is required');
  }
  return authUserId;
}

function requireManageInvites(membershipRole: string | undefined): void {
  const viewerRole = parseOrganizationRole(membershipRole);
  if (!viewerRole || !canUseClubCapability(viewerRole, 'manage_staff_and_invites')) {
    throw forbidden('You do not have permission to manage club invites');
  }
}

function mapMembershipSummary(row: SeedRow) {
  return {
    id: asString(row.id) ?? '',
    clubId: asString(row.clubId) ?? '',
    userId: asString(row.userId) ?? '',
    role: toContractRole(asString(row.role)),
    active: row.active !== false,
    createdAt: asString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: asString(row.updatedAt) ?? asString(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapClubSummary(club: SeedRow, inviteCode: string) {
  return {
    id: asString(club.id) ?? '',
    name: asString(club.name) ?? 'Club',
    slug: asString(club.slug),
    visibility: asString(club.visibility),
    inviteCode,
  };
}

function getInviteCodeForRole(clubId: string, role: string): ClubInviteCodeRow | undefined {
  return ensureInviteCodesStore().find(
    (invite) =>
      invite.clubId === clubId
      && invite.role === role
      && invite.remainingUses > 0
      && new Date(invite.expiresAt).getTime() > Date.now(),
  );
}

function getInviteByCode(code: string): ClubInviteCodeRow | undefined {
  const normalized = normalizeInviteCode(code);
  return ensureInviteCodesStore().find(
    (invite) =>
      normalizeInviteCode(invite.code) === normalized
      && invite.remainingUses > 0
      && new Date(invite.expiresAt).getTime() > Date.now(),
  );
}

function createMembership(clubId: string, userId: string, role: string, createdByUserId: string): SeedRow {
  const now = new Date().toISOString();
  return {
    id: `cmb_${randomUUID()}`,
    clubId,
    userId,
    role: toStoreRole(role),
    active: true,
    createdAt: now,
    updatedAt: now,
    createdByUserId,
    updatedByUserId: createdByUserId,
    version: 1,
    deletedAt: null,
    deletedByUserId: null,
  };
}

const coachClubRoutes: FastifyPluginAsync = async (app) => {
  app.get('/coaches/me/profile', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);

    const store = getMarketplaceSeedStore();
    const coachProfiles = asRows(store.tables.coachProfiles);
    const coachLocations = asRows(store.tables.coachLocations);
    const availabilityTemplates = asRows(store.tables.availabilityTemplates);
    const availabilityOverrides = asRows(store.tables.availabilityOverrides);
    const schedulingRules = asRows(store.tables.schedulingRules);
    const cancellationPolicyRules = asRows(store.tables.cancellationPolicyRules);

    const profile = coachProfiles.find((row) => asString(row.userId) === authUserId);
    if (!profile) {
      throw notFound('Coach profile not found', { userId: authUserId });
    }

    const cancellationPolicyId = asString(
      schedulingRules.find((row) => asString(row.coachUserId) === authUserId)?.cancellationPolicyId,
    );

    return reply.send({
      profile,
      locations: coachLocations.filter((row) => asString(row.coachUserId) === authUserId),
      availabilityTemplates: availabilityTemplates.filter((row) => asString(row.coachUserId) === authUserId),
      availabilityOverrides: availabilityOverrides.filter((row) => asString(row.coachUserId) === authUserId),
      schedulingRules: schedulingRules.filter((row) => asString(row.coachUserId) === authUserId),
      cancellationPolicyRules: cancellationPolicyRules.filter((row) =>
        asString(row.coachUserId) === authUserId
        || (cancellationPolicyId && asString(row.id) === cancellationPolicyId)
      ),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/coaches/me/offerings', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);

    const store = getMarketplaceSeedStore();
    const offerings = asRows(store.tables.coachingOfferings).filter(
      (row) => asString(row.coachUserId) === authUserId,
    );

    return reply.send({
      offerings,
      total: offerings.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/coaches/me/verifications/:type/documents', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);

    const requestedType = asString((request.params as { type?: string }).type)?.toLowerCase();
    if (!requestedType) {
      throw notFound('Verification type is required');
    }

    const store = getMarketplaceSeedStore();
    const coachVerifications = asRows(store.tables.coachVerifications).filter((row) => {
      const owner = asString(row.coachUserId);
      const verificationType = asString(row.verificationType)?.toLowerCase();
      return owner === authUserId && verificationType === requestedType;
    });

    const verificationDocuments = asRows(store.tables.verificationDocuments);
    const mediaObjects = asRows(store.tables.mediaObjects);

    const documents = coachVerifications.map((verification) => {
      const verificationId = asString(verification.id);
      const linkedDocuments = verificationDocuments
        .filter((row) => asString(row.coachVerificationId) === verificationId)
        .map((row) => {
          const mediaObjectId = asString(row.mediaObjectId);
          const media = mediaObjects.find((item) => asString(item.id) === mediaObjectId) ?? null;
          return {
            ...row,
            mediaObject: media,
          };
        });

      return {
        verification,
        documents: linkedDocuments,
      };
    });

    return reply.send({
      type: requestedType,
      items: documents,
      total: documents.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/clubs', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);

    const isClubAdmin =
      request.auth?.roles.includes('club_admin') || request.auth?.actingRole === 'club_admin';

    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);
    const clubMemberships = asRows(store.tables.clubMemberships);
    const squads = asRows(store.tables.squads);

    const allowedClubIds = new Set(
      getActiveMemberships(clubMemberships)
        .filter((row) => asString(row.userId) === authUserId)
        .map((row) => asString(row.clubId))
        .filter(isTruthy),
    );

    const visibleClubs = clubs.filter((club) => {
      if (isClubAdmin) {
        return true;
      }
      const clubId = asString(club.id);
      return Boolean(clubId && allowedClubIds.has(clubId));
    });

    const payload = visibleClubs.map((club) => {
      const clubId = asString(club.id);
      const memberships = getActiveMemberships(clubMemberships).filter(
        (row) => asString(row.clubId) === clubId,
      );
      const clubSquads = squads.filter((row) => asString(row.clubId) === clubId);
      const viewerMembership = memberships.find((row) => asString(row.userId) === authUserId) ?? null;
      const viewerRole = parseOrganizationRole(asString(viewerMembership?.role));
      const primaryInviteCode = getInviteCodeForRole(clubId ?? '', 'MEMBER');
      return {
        ...club,
        inviteCode: primaryInviteCode?.code ?? null,
        memberships,
        viewerMembership,
        viewerGovernance: getClubGovernanceSnapshot(viewerRole),
        squads: clubSquads,
      };
    });

    return reply.send({
      clubs: payload,
      total: payload.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/clubs/:clubId/invite-codes', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const clubId = asString((request.params as { clubId?: string }).clubId);
    if (!clubId) {
      throw notFound('Club not found');
    }

    const store = getMarketplaceSeedStore();
    const clubMemberships = asRows(store.tables.clubMemberships);
    const viewerMembership = getViewerMembership(clubMemberships, clubId, authUserId);
    requireManageInvites(asString(viewerMembership?.role));

    return reply.send({
      inviteCodes: ensureInviteCodesStore().filter((invite) => invite.clubId === clubId),
      requestId: request.requestId,
    });
  });

  app.post('/clubs/:clubId/invite-codes', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const clubId = asString((request.params as { clubId?: string }).clubId);
    const role = toContractRole(asString((request.body as { role?: string }).role));
    if (!clubId) {
      throw notFound('Club not found');
    }

    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);
    const clubMemberships = asRows(store.tables.clubMemberships);
    const club = clubs.find((row) => asString(row.id) === clubId);
    if (!club) {
      throw notFound('Club not found');
    }

    const viewerMembership = getViewerMembership(clubMemberships, clubId, authUserId);
    requireManageInvites(asString(viewerMembership?.role));

    const inviteCode: ClubInviteCodeRow = {
      id: `cinv_${randomUUID()}`,
      clubId,
      code: `${buildInviteCode(asString(club.name) ?? 'Club', role)}-${randomUUID().slice(0, 4).toUpperCase()}`,
      role,
      createdByUserId: authUserId,
      createdAt: new Date().toISOString(),
      expiresAt: addDaysIso(role === 'MEMBER' ? 365 : 30),
      remainingUses: role === 'MEMBER' ? 999 : 25,
    };

    inviteCodesStore = [
      ...ensureInviteCodesStore().filter(
        (invite) => !(invite.clubId === clubId && invite.role === role && role !== 'MEMBER'),
      ),
      inviteCode,
    ];

    return reply.code(201).send({
      inviteCode,
      requestId: request.requestId,
    });
  });

  app.delete('/clubs/:clubId/invite-codes/:code', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = request.params as { clubId?: string; code?: string };
    const clubId = asString(params.clubId);
    const code = normalizeInviteCode(asString(params.code) ?? '');
    if (!clubId || !code) {
      throw notFound('Invite code not found');
    }

    const store = getMarketplaceSeedStore();
    const clubMemberships = asRows(store.tables.clubMemberships);
    const viewerMembership = getViewerMembership(clubMemberships, clubId, authUserId);
    requireManageInvites(asString(viewerMembership?.role));

    inviteCodesStore = ensureInviteCodesStore().filter(
      (invite) => !(invite.clubId === clubId && normalizeInviteCode(invite.code) === code),
    );

    return reply.code(204).send();
  });

  app.get('/clubs/join/resolve', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const code = normalizeInviteCode(asString((request.query as { code?: string }).code) ?? '');
    const inviteCode = getInviteByCode(code);
    if (!inviteCode) {
      throw notFound('Invite code not found');
    }

    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);
    const clubMemberships = asRows(store.tables.clubMemberships);
    const club = clubs.find((row) => asString(row.id) === inviteCode.clubId);
    if (!club) {
      throw notFound('Club not found');
    }

    const existingMembership = getViewerMembership(clubMemberships, inviteCode.clubId, authUserId);

    return reply.send({
      preview: {
        clubId: inviteCode.clubId,
        clubName: asString(club.name) ?? 'Club',
        clubSlug: asString(club.slug),
        visibility: asString(club.visibility),
        inviteCode: inviteCode.code,
        role: inviteCode.role,
        joinFlow: inviteCode.role === 'MEMBER' ? 'direct_join' : 'invite_review',
        expiresAt: inviteCode.expiresAt,
        alreadyMember: Boolean(existingMembership),
      },
      requestId: request.requestId,
    });
  });

  app.post('/clubs/join', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const code = normalizeInviteCode(asString((request.body as { code?: string }).code) ?? '');
    const inviteCode = getInviteByCode(code);
    if (!inviteCode) {
      throw notFound('Invite code not found');
    }

    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);
    const clubMemberships = asRows(store.tables.clubMemberships);
    const club = clubs.find((row) => asString(row.id) === inviteCode.clubId);
    if (!club) {
      throw notFound('Club not found');
    }

    const existingMembership = getViewerMembership(clubMemberships, inviteCode.clubId, authUserId);
    if (existingMembership) {
      return reply.send({
        outcome: 'already_member',
        club: mapClubSummary(club, inviteCode.code),
        membership: mapMembershipSummary(existingMembership),
        invite: null,
        requestId: request.requestId,
      });
    }

    const isStaffInvite = inviteCode.role !== 'MEMBER';
    const authRoles = new Set(request.auth?.roles ?? []);
    const staffEligible =
      authRoles.has('coach') || authRoles.has('admin') || authRoles.has('club_admin')
      || request.auth?.actingRole === 'coach'
      || request.auth?.actingRole === 'admin'
      || request.auth?.actingRole === 'club_admin';

    if (isStaffInvite && !staffEligible) {
      throw forbidden('Only coach or admin accounts can use staff invite links');
    }

    if (!isStaffInvite) {
      const membership = createMembership(inviteCode.clubId, authUserId, inviteCode.role, inviteCode.createdByUserId);
      clubMemberships.push(membership);
      inviteCode.remainingUses = Math.max(0, inviteCode.remainingUses - 1);

      return reply.code(201).send({
        outcome: 'joined',
        club: mapClubSummary(club, inviteCode.code),
        membership: mapMembershipSummary(membership),
        invite: null,
        requestId: request.requestId,
      });
    }

    const existingPending = pendingClubInvitesStore.find(
      (invite) =>
        invite.clubId === inviteCode.clubId
        && invite.targetUserId === authUserId
        && invite.role === inviteCode.role
        && invite.status === 'pending',
    );

    const pendingInvite =
      existingPending
      ?? {
        id: `cpi_${randomUUID()}`,
        clubId: inviteCode.clubId,
        targetUserId: authUserId,
        inviteCode: inviteCode.code,
        role: inviteCode.role,
        invitedByUserId: inviteCode.createdByUserId,
        invitedByLabel: 'Club staff',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        expiresAt: inviteCode.expiresAt,
        respondedAt: null,
      };

    if (!existingPending) {
      pendingClubInvitesStore.push(pendingInvite);
    }

    return reply.code(202).send({
      outcome: 'invite_pending',
      club: mapClubSummary(club, inviteCode.code),
      membership: null,
      invite: {
        ...pendingInvite,
        clubName: asString(club.name) ?? 'Club',
      },
      requestId: request.requestId,
    });
  });

  app.get('/clubs/invites', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);

    const invites = pendingClubInvitesStore
      .filter(
        (invite) =>
          invite.targetUserId === authUserId
          && invite.status === 'pending'
          && new Date(invite.expiresAt).getTime() > Date.now(),
      )
      .map((invite) => ({
        ...invite,
        clubName:
          asString(clubs.find((club) => asString(club.id) === invite.clubId)?.name) ?? 'Club',
      }));

    return reply.send({
      invites,
      requestId: request.requestId,
    });
  });

  app.post('/clubs/invites/:inviteId/respond', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const inviteId = asString((request.params as { inviteId?: string }).inviteId);
    const response = asString((request.body as { response?: string }).response)?.toLowerCase();
    if (!inviteId || (response !== 'accepted' && response !== 'declined')) {
      throw notFound('Club invite not found');
    }

    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);
    const clubMemberships = asRows(store.tables.clubMemberships);
    const invite = pendingClubInvitesStore.find((row) => row.id === inviteId && row.targetUserId === authUserId);
    if (!invite) {
      throw notFound('Club invite not found');
    }

    const club = clubs.find((row) => asString(row.id) === invite.clubId);
    if (!club) {
      throw notFound('Club not found');
    }

    invite.status = response;
    invite.respondedAt = new Date().toISOString();

    let membership: SeedRow | null = getViewerMembership(clubMemberships, invite.clubId, authUserId);
    if (response === 'accepted' && !membership) {
      membership = createMembership(invite.clubId, authUserId, invite.role, invite.invitedByUserId);
      clubMemberships.push(membership);
    }

    return reply.send({
      invite: {
        ...invite,
        clubName: asString(club.name) ?? 'Club',
      },
      membership: membership ? mapMembershipSummary(membership) : null,
      club: mapClubSummary(club, invite.inviteCode),
      requestId: request.requestId,
    });
  });
};

export default coachClubRoutes;
