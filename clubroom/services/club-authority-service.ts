import { api } from '@/constants/config';
import type { Club, ClubInvite, ClubMembership, ClubRole } from '@/constants/types';
import { apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiUserId,
} from '@/services/api-auth-context';
import { authService } from '@/services/auth-service';
import { canUseClubCapability } from '@/contracts/club-governance';
import {
  socialFeedService,
  type CreateClubInput,
  type CreateClubResult,
} from '@/services/social-feed-service';
import { createLogger } from '@/utils/logger';
import { err, notFound, ok, serviceError, type Result, type ServiceError } from '@/types/result';

const logger = createLogger('ClubAuthorityService');

type ActingRole = 'coach' | 'parent' | 'athlete' | 'club_admin' | 'member' | 'admin';

interface ApiClubMembership {
  id: string;
  clubId: string;
  userId: string;
  role: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiClub {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  tagline?: string | null;
  slug?: string;
  visibility?: string;
  commercialMode?: string | null;
  createdByUserId?: string;
  inviteCode?: string | null;
  memberships: ApiClubMembership[];
  squads?: Array<{ id: string }>;
  viewerMembership?: ApiClubMembership | null;
}

interface ApiClubsResponse {
  clubs: ApiClub[];
  total: number;
}

interface ApiClubResponse {
  club: ApiClub;
}

interface ApiCreateClubResponse {
  club: ApiClub;
  membership: ApiClubMembership;
  primaryInvite: ApiClubInviteCode;
  firstStaffInvite?: ApiClubInviteCode;
}

interface ApiClubInviteCode {
  id: string;
  clubId: string;
  code: string;
  role: string;
  createdByUserId: string;
  createdAt: string;
  expiresAt: string;
  remainingUses: number;
}

interface ApiClubInviteCodesResponse {
  inviteCodes: ApiClubInviteCode[];
}

interface ClubJoinPreview {
  clubId: string;
  clubName: string;
  clubSlug?: string;
  visibility?: string;
  inviteCode: string;
  role: ClubRole;
  joinFlow: 'direct_join' | 'invite_review';
  expiresAt: string;
  alreadyMember: boolean;
}

interface ResolveClubJoinCodeResponse {
  preview: ClubJoinPreview;
}

export interface PendingClubInvite {
  id: string;
  clubId: string;
  clubName: string;
  targetUserId?: string;
  targetKind?: 'user' | 'email';
  targetEmailHint?: string;
  inviteCode: string;
  role: ClubRole;
  invitedByUserId?: string;
  invitedByLabel: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt: string;
  respondedAt?: string | null;
}

export interface ClubInviteEmailDeliverySummary {
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  providers: string[];
}

interface ApiClubInvitesResponse {
  invites: PendingClubInvite[];
  emailDelivery?: ClubInviteEmailDeliverySummary;
}

interface JoinClubResponse {
  outcome: 'joined' | 'invite_pending' | 'already_member';
  club: {
    id: string;
    name: string;
    slug?: string;
    visibility?: string;
    inviteCode: string;
  };
  membership?: ApiClubMembership | null;
  invite?: PendingClubInvite | null;
}

interface RespondToClubInviteResponse {
  invite: PendingClubInvite;
  membership?: ApiClubMembership | null;
  club?: {
    id: string;
    name: string;
    slug?: string;
    visibility?: string;
    inviteCode: string;
  } | null;
}

function toContractRole(role: string): ClubRole {
  if (role === 'club_admin' || role === 'ADMIN') {
    return 'ADMIN';
  }
  if (role === 'head_coach' || role === 'HEAD_COACH') {
    return 'HEAD_COACH';
  }
  if (role === 'assistant' || role === 'ASSISTANT') {
    return 'ASSISTANT';
  }
  if (role === 'owner' || role === 'OWNER') {
    return 'OWNER';
  }
  if (role === 'coach' || role === 'COACH') {
    return 'COACH';
  }
  return 'MEMBER';
}

async function resolveHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to manage clubs.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  const actingRole = deriveApiActingRole(currentUserResult.data, 'member') as ActingRole;
  return ok(buildApiAuthHeaders({ actingRole }));
}

function mapMembership(membership: ApiClubMembership): ClubMembership {
  const role = toContractRole(membership.role);
  const hasCoachGrant = role === 'COACH';

  return {
    clubId: membership.clubId,
    userId: membership.userId,
    role,
    status: membership.active === false ? 'pending' : 'active',
    joinSource: 'invite',
    canPostAsClub: canUseClubCapability(role, 'post_as_org', {
      hasGrant: hasCoachGrant,
    }),
    canCreateSessions: canUseClubCapability(role, 'create_org_sessions', {
      hasGrant: hasCoachGrant,
    }),
  };
}

function mapApiClubViewerMemberships(
  club: ApiClub,
  currentUserId?: string | null,
): ClubMembership[] {
  if (club.viewerMembership) {
    return [mapMembership(club.viewerMembership)];
  }
  if (!currentUserId) {
    return [];
  }
  return (club.memberships ?? [])
    .filter((membership) => membership.userId === currentUserId)
    .map(mapMembership);
}

function mapInviteCode(invite: ApiClubInviteCode): ClubInvite {
  return {
    code: invite.code,
    clubId: invite.clubId,
    createdBy: invite.createdByUserId,
    role: toContractRole(invite.role),
    expiresAt: invite.expiresAt,
    remainingUses: invite.remainingUses,
  };
}

function mapClub(club: ApiClub): Club {
  const memberships = club.memberships ?? [];
  const coaches = memberships.filter((membership) => {
    const role = toContractRole(membership.role);
    return ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH', 'ASSISTANT'].includes(role);
  });

  return {
    id: club.id,
    name: club.name,
    city: club.city ?? '',
    country: club.country ?? undefined,
    badge: club.name.slice(0, 2).toUpperCase(),
    tagline: club.tagline ?? undefined,
    memberCount: memberships.length,
    coachCount: coaches.length,
    squadCount: club.squads?.length ?? 0,
    ownerId:
      memberships.find((membership) => toContractRole(membership.role) === 'OWNER')?.userId ??
      club.createdByUserId ??
      '',
    inviteCode: club.inviteCode ?? '',
    commercialMode:
      club.commercialMode === 'ORG_OWNED' || club.commercialMode === 'COACH_OWNED'
        ? club.commercialMode
        : undefined,
  };
}

class ClubAuthorityService {
  async createClub(input: CreateClubInput): Promise<Result<CreateClubResult, ServiceError>> {
    if (api.useMock) {
      return socialFeedService.createClub(input);
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiCreateClubResponse>('/v1/clubs', {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify({
        name: input.name,
        city: input.city,
        country: input.country,
        tagline: input.tagline,
        badge: input.badge,
        commercialMode: input.commercialMode,
        firstStaffRole: input.firstStaffRole,
      }),
    });
    if (!result.success) {
      return err(result.error);
    }

    const club = mapClub({
      ...result.data.club,
      memberships: [result.data.membership],
    });
    const membership = mapMembership(result.data.membership);
    const primaryInvite = mapInviteCode(result.data.primaryInvite);
    const firstStaffInvite = result.data.firstStaffInvite
      ? mapInviteCode(result.data.firstStaffInvite)
      : undefined;

    await socialFeedService.syncJoinedClub(
      club,
      membership,
      [primaryInvite, firstStaffInvite].filter(
        (invite): invite is ClubInvite => Boolean(invite),
      ),
    );

    return ok({
      club,
      membership,
      primaryInvite,
      firstStaffInvite,
    });
  }

  async listClubs(): Promise<
    Result<{ clubs: Club[]; memberships: ClubMembership[] }, ServiceError>
  > {
    if (api.useMock) {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser?.id) {
        return ok({ clubs: [], memberships: [] });
      }
      return ok({
        clubs: socialFeedService.getUserClubs(currentUser.id),
        memberships: socialFeedService.getUserMemberships(currentUser.id),
      });
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiClubsResponse>('/v1/clubs', {
      method: 'GET',
      headers: headersResult.data,
    });
    if (!result.success) {
      logger.warn('Failed to list clubs via API', { error: result.error });
      return err(result.error);
    }

    const currentUser = await authService.getCurrentUser();
    const currentUserId = currentUser?.id ? toApiUserId(currentUser.id) : null;
    const clubs = result.data.clubs.map(mapClub);
    const memberships = result.data.clubs.flatMap((club) =>
      mapApiClubViewerMemberships(club, currentUserId),
    );

    await socialFeedService.syncAuthorityClubs(
      result.data.clubs.map((club) => ({
        ...mapClub(club),
        memberships: mapApiClubViewerMemberships(club, currentUserId),
      })),
    );

    return ok({ clubs, memberships });
  }

  async getClubById(clubId: string): Promise<Result<Club, ServiceError>> {
    if (api.useMock) {
      const club = await socialFeedService.getClub(clubId);
      return club ? ok(club) : err(notFound('Club', clubId));
    }

    const result = await this.listClubs();
    if (!result.success) {
      return result;
    }

    const club = result.data.clubs.find((candidate) => candidate.id === clubId);
    return club ? ok(club) : err(notFound('Club', clubId));
  }

  async updateClubDetails(
    clubId: string,
    changes: Pick<Club, 'name' | 'tagline' | 'city'>,
  ): Promise<Result<Club, ServiceError>> {
    if (api.useMock) {
      return socialFeedService.updateClubDetails(clubId, changes);
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiClubResponse>(`/v1/clubs/${clubId}`, {
      method: 'PATCH',
      headers: headersResult.data,
      body: JSON.stringify(changes),
    });
    if (!result.success) {
      return err(result.error);
    }

    const club = mapClub(result.data.club);
    await socialFeedService.syncAuthorityClubs([
      {
        ...club,
        memberships: (result.data.club.memberships ?? []).map(mapMembership),
      },
    ]);
    return ok(club);
  }

  async updateClubCommercialMode(
    clubId: string,
    commercialMode: NonNullable<Club['commercialMode']>,
  ): Promise<Result<Club, ServiceError>> {
    if (api.useMock) {
      return socialFeedService.updateClubCommercialMode(clubId, commercialMode);
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiClubResponse>(`/v1/clubs/${clubId}`, {
      method: 'PATCH',
      headers: headersResult.data,
      body: JSON.stringify({ commercialMode }),
    });
    if (!result.success) {
      return err(result.error);
    }

    const club = mapClub(result.data.club);
    await socialFeedService.syncAuthorityClubs([
      {
        ...club,
        memberships: (result.data.club.memberships ?? []).map(mapMembership),
      },
    ]);
    return ok(club);
  }

  async deleteClub(clubId: string): Promise<Result<boolean, ServiceError>> {
    if (api.useMock) {
      return socialFeedService.deleteClub(clubId);
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<void>(`/v1/clubs/${clubId}`, {
      method: 'DELETE',
      headers: headersResult.data,
    });
    if (!result.success) {
      return err(result.error);
    }

    await socialFeedService.syncDeletedClub(clubId);
    return ok(true);
  }

  async listInviteCodes(clubId: string): Promise<Result<ClubInvite[], ServiceError>> {
    if (api.useMock) {
      return ok(await socialFeedService.getInviteCodes(clubId));
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiClubInviteCodesResponse>(`/v1/clubs/${clubId}/invite-codes`, {
      method: 'GET',
      headers: headersResult.data,
    });
    if (!result.success) {
      return err(result.error);
    }

    const inviteCodes = result.data.inviteCodes.map(mapInviteCode);
    await socialFeedService.syncInviteCodes(clubId, inviteCodes);
    return ok(inviteCodes);
  }

  async createInviteCode(
    clubId: string,
    role: ClubRole,
  ): Promise<Result<ClubInvite, ServiceError>> {
    if (api.useMock) {
      return socialFeedService.generateInviteCode(clubId, 'system', role);
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<{ inviteCode: ApiClubInviteCode }>(
      `/v1/clubs/${clubId}/invite-codes`,
      {
        method: 'POST',
        headers: headersResult.data,
        body: JSON.stringify({ role }),
      },
    );
    if (!result.success) {
      return err(result.error);
    }

    const mapped = mapInviteCode(result.data.inviteCode);
    const inviteCodesResult = await this.listInviteCodes(clubId);
    if (!inviteCodesResult.success) {
      await socialFeedService.syncInviteCodes(clubId, [mapped]);
    }
    return ok(mapped);
  }

  async deleteInviteCode(clubId: string, code: string): Promise<Result<void, ServiceError>> {
    if (api.useMock) {
      const result = await socialFeedService.deleteInviteCode(clubId, code);
      if (!result.success) {
        return err(result.error);
      }
      return ok(undefined);
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<void>(
      `/v1/clubs/${clubId}/invite-codes/${encodeURIComponent(code)}`,
      {
        method: 'DELETE',
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      return err(result.error);
    }

    const nextInviteCodes = await this.listInviteCodes(clubId);
    if (!nextInviteCodes.success) {
      logger.warn('Invite code revoked but local invite-code refresh failed', {
        clubId,
        code,
        error: nextInviteCodes.error,
      });
    }
    return ok(undefined);
  }

  async resolveJoinCode(code: string): Promise<Result<ClubJoinPreview, ServiceError>> {
    if (api.useMock) {
      return err(serviceError('UNKNOWN', 'Join preview is only available in API mode.'));
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ResolveClubJoinCodeResponse>(
      `/v1/clubs/join/resolve?code=${encodeURIComponent(code.trim())}`,
      {
        method: 'GET',
        headers: headersResult.data,
      },
    );
    if (!result.success) {
      return err(result.error);
    }

    return ok(result.data.preview);
  }

  async joinWithCode(
    code: string,
  ): Promise<
    Result<
      {
        outcome: JoinClubResponse['outcome'];
        club: Club;
        membership?: ClubMembership | null;
        invite?: PendingClubInvite | null;
      },
      ServiceError
    >
  > {
    if (api.useMock) {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser?.id) {
        return err(serviceError('UNAUTHORIZED', 'Sign in to join a club.'));
      }
      const result = socialFeedService.joinClub(currentUser.id, code, 'MEMBER');
      if (!result.success) {
        return err(result.error);
      }
      const club = socialFeedService
        .getUserClubs(currentUser.id)
        .find((candidate) => candidate.id === result.data.clubId);
      return ok({
        outcome: 'joined',
        club: club ?? {
          id: result.data.clubId,
          name: 'Club',
          city: '',
          memberCount: 0,
          coachCount: 0,
          squadCount: 0,
          ownerId: '',
          inviteCode: code,
        },
        membership: result.data,
        invite: null,
      });
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<JoinClubResponse>('/v1/clubs/join', {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify({ code: code.trim() }),
    });
    if (!result.success) {
      return err(result.error);
    }

    const club: Club = {
      id: result.data.club.id,
      name: result.data.club.name,
      city: '',
      memberCount: 0,
      coachCount: 0,
      squadCount: 0,
      ownerId: '',
      inviteCode: result.data.club.inviteCode,
    };
    const membership = result.data.membership ? mapMembership(result.data.membership) : null;

    if (membership) {
      await socialFeedService.syncJoinedClub(club, membership, [
        {
          code: result.data.club.inviteCode,
          clubId: club.id,
          createdBy: '',
          role: 'MEMBER',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          remainingUses: 999,
        },
      ]);
    }

    return ok({
      outcome: result.data.outcome,
      club,
      membership,
      invite: result.data.invite ?? null,
    });
  }

  async listPendingInvites(): Promise<Result<PendingClubInvite[], ServiceError>> {
    if (api.useMock) {
      return ok([]);
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiClubInvitesResponse>('/v1/clubs/invites', {
      method: 'GET',
      headers: headersResult.data,
    });
    if (!result.success) {
      return err(result.error);
    }

    return ok(result.data.invites);
  }

  async inviteExistingUsers(
    clubId: string,
    targetUserIds: string[],
    role: ClubRole,
  ): Promise<Result<PendingClubInvite[], ServiceError>> {
    if (api.useMock) {
      return err(serviceError('UNSUPPORTED', 'Direct club invites are only available in API mode.'));
    }
    if (role !== 'MEMBER' && role !== 'COACH' && role !== 'ADMIN') {
      return err(
        serviceError(
          'UNSUPPORTED',
          'Direct invites for that club role need a role-grant backend contract. Share a role invite code for now.',
        ),
      );
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiClubInvitesResponse>(`/v1/clubs/${clubId}/invites`, {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify({
        targetUserIds: Array.from(new Set(targetUserIds)),
        role,
      }),
    });
    if (!result.success) {
      return err(result.error);
    }

    return ok(result.data.invites);
  }

  async inviteEmailTargets(
    clubId: string,
    targetEmails: string[],
    role: ClubRole,
  ): Promise<
    Result<
      { invites: PendingClubInvite[]; emailDelivery?: ClubInviteEmailDeliverySummary },
      ServiceError
    >
  > {
    if (api.useMock) {
      return err(serviceError('UNSUPPORTED', 'Direct club invites are only available in API mode.'));
    }
    if (role !== 'MEMBER' && role !== 'COACH' && role !== 'ADMIN') {
      return err(
        serviceError(
          'UNSUPPORTED',
          'Direct invites for that club role need a role-grant backend contract. Share a role invite code for now.',
        ),
      );
    }

    const emails = Array.from(
      new Set(targetEmails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
    );
    if (emails.length === 0) {
      return err(serviceError('VALIDATION', 'Enter a valid email'));
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiClubInvitesResponse>(`/v1/clubs/${clubId}/invites`, {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify({
        targetEmails: emails,
        role,
      }),
    });
    if (!result.success) {
      return err(result.error);
    }

    return ok({
      invites: result.data.invites,
      emailDelivery: result.data.emailDelivery,
    });
  }

  async respondToInvite(
    inviteId: string,
    response: 'accepted' | 'declined',
  ): Promise<
    Result<{ invite: PendingClubInvite; membership?: ClubMembership | null }, ServiceError>
  > {
    if (api.useMock) {
      return err(serviceError('UNKNOWN', 'Club invite response is only available in API mode.'));
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<RespondToClubInviteResponse>(
      `/v1/clubs/invites/${inviteId}/respond`,
      {
        method: 'POST',
        headers: headersResult.data,
        body: JSON.stringify({ response }),
      },
    );
    if (!result.success) {
      return err(result.error);
    }

    const membership = result.data.membership ? mapMembership(result.data.membership) : null;
    if (membership && result.data.club) {
      await socialFeedService.syncJoinedClub(
        {
          id: result.data.club.id,
          name: result.data.club.name,
          city: '',
          memberCount: 0,
          coachCount: 0,
          squadCount: 0,
          ownerId: '',
          inviteCode: result.data.club.inviteCode,
        },
        membership,
      );
    }

    return ok({
      invite: result.data.invite,
      membership,
    });
  }
}

export const clubAuthorityService = new ClubAuthorityService();
