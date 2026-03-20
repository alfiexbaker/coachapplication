import { api } from '@/constants/config';
import type { Club, ClubInvite, ClubMembership, ClubRole } from '@/constants/types';
import { apiFetch } from '@/services/api-client';
import { authService } from '@/services/auth-service';
import { socialFeedService } from '@/services/social-feed-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';

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
  slug?: string;
  visibility?: string;
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
  inviteCode: string;
  role: ClubRole;
  invitedByUserId?: string;
  invitedByLabel: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt: string;
  respondedAt?: string | null;
}

interface ApiClubInvitesResponse {
  invites: PendingClubInvite[];
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

function toApiUserId(userId: string): string {
  return userId.startsWith('usr_') ? userId : `usr_${userId.replace(/^ath_/, '')}`;
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

function deriveActingRole(
  user: Awaited<ReturnType<typeof authService.getCurrentUser>>,
): ActingRole {
  if (user?.roles?.includes('club_admin')) {
    return 'club_admin';
  }
  if (user?.roles?.includes('admin') || user?.appRole === 'ADMIN') {
    return 'admin';
  }
  if (user?.accountType === 'COACH') {
    return 'coach';
  }
  if (user?.accountType === 'PARENT') {
    return 'parent';
  }
  if (user?.accountType === 'ATHLETE') {
    return 'athlete';
  }
  return 'member';
}

async function resolveHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUser = await authService.getCurrentUser();
  if (!currentUser?.id) {
    return err(serviceError('UNAUTHORIZED', 'Sign in to manage clubs.'));
  }

  const actingRole = deriveActingRole(currentUser);
  const roles = new Set(currentUser.roles ?? []);
  roles.add(actingRole);

  return ok({
    'x-auth-user-id': toApiUserId(currentUser.id),
    'x-auth-roles': Array.from(roles).join(','),
    'x-acting-role': actingRole,
  });
}

function mapMembership(membership: ApiClubMembership): ClubMembership {
  return {
    clubId: membership.clubId,
    userId: membership.userId.replace(/^usr_/, ''),
    role: toContractRole(membership.role),
    status: membership.active === false ? 'pending' : 'active',
    joinSource: 'invite',
    canPostAsClub: ['OWNER', 'ADMIN', 'HEAD_COACH'].includes(toContractRole(membership.role)),
  };
}

function mapInviteCode(invite: ApiClubInviteCode): ClubInvite {
  return {
    code: invite.code,
    clubId: invite.clubId,
    createdBy: invite.createdByUserId.replace(/^usr_/, ''),
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
    city: '',
    country: undefined,
    badge: club.name.slice(0, 2).toUpperCase(),
    memberCount: memberships.length,
    coachCount: coaches.length,
    squadCount: club.squads?.length ?? 0,
    ownerId: (memberships.find((membership) => toContractRole(membership.role) === 'OWNER')?.userId ?? club.createdByUserId ?? '').replace(/^usr_/, ''),
    inviteCode: club.inviteCode ?? '',
  };
}

class ClubAuthorityService {
  async listClubs(): Promise<Result<{ clubs: Club[]; memberships: ClubMembership[] }, ServiceError>> {
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
      logger.error('Failed to list clubs via API', { error: result.error });
      return err(result.error);
    }

    const clubs = result.data.clubs.map(mapClub);
    const memberships = result.data.clubs
      .flatMap((club) => club.memberships ?? [])
      .map(mapMembership);

    await socialFeedService.syncAuthorityClubs(
      result.data.clubs.map((club) => ({
        ...mapClub(club),
        memberships: (club.memberships ?? []).map(mapMembership),
      })),
    );

    return ok({ clubs, memberships });
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

  async createInviteCode(clubId: string, role: ClubRole): Promise<Result<ClubInvite, ServiceError>> {
    if (api.useMock) {
      return socialFeedService.generateInviteCode(clubId, 'system', role);
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<{ inviteCode: ApiClubInviteCode }>(`/v1/clubs/${clubId}/invite-codes`, {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify({ role }),
    });
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
      logger.warn('Invite code deleted but local invite-code refresh failed', {
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
  ): Promise<Result<{ outcome: JoinClubResponse['outcome']; club: Club; membership?: ClubMembership | null; invite?: PendingClubInvite | null }, ServiceError>> {
    if (api.useMock) {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser?.id) {
        return err(serviceError('UNAUTHORIZED', 'Sign in to join a club.'));
      }
      const result = socialFeedService.joinClub(currentUser.id, code, 'MEMBER');
      if (!result.success) {
        return err(result.error);
      }
      const club = socialFeedService.getUserClubs(currentUser.id).find((candidate) => candidate.id === result.data.clubId);
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
      await socialFeedService.syncJoinedClub(
        club,
        membership,
        [{ code: result.data.club.inviteCode, clubId: club.id, createdBy: '', role: 'MEMBER', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), remainingUses: 999 }],
      );
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

  async respondToInvite(
    inviteId: string,
    response: 'accepted' | 'declined',
  ): Promise<Result<{ invite: PendingClubInvite; membership?: ClubMembership | null }, ServiceError>> {
    if (api.useMock) {
      return err(serviceError('UNKNOWN', 'Club invite response is only available in API mode.'));
    }

    const headersResult = await resolveHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<RespondToClubInviteResponse>(`/v1/clubs/invites/${inviteId}/respond`, {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify({ response }),
    });
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
