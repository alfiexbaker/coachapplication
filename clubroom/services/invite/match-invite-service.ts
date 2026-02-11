/**
 * Match Invite Service
 *
 * Handles match-specific invitation functionality including:
 * - Inviting squads to matches
 * - Match availability requests
 * - Match RSVP tracking
 */

import type {
  Match,
  SquadMember,
  SquadInvite,
  BulkInviteResult,
  BulkInviteError,
} from '@/constants/types';
import { notificationService } from '../notification-service';
import { squadService } from '../squad-service';
import { matchService } from '../match-service';
import { createLogger } from '@/utils/logger';
import { userService } from '../user-service';

import {
  loadSquadInvites,
  saveSquadInvites,
} from './squad-invite-service';

const logger = createLogger('MatchInviteService');

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return fallback;
  return userResult.data.name || fallback;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface InviteSquadToMatchInput {
  squadId: string;
  squadName: string;
  matchTitle: string;
  opponent: string;
  isHome: boolean;
  date: string;
  kickoffTime: string;
  venue: string;
  clubId: string;
  clubName: string;
  coachId: string;
  coachName: string;
  matchType?: 'FRIENDLY' | 'LEAGUE' | 'CUP' | 'TOURNAMENT';
  notes?: string;
  excludeMemberIds?: string[];
}

// ============================================================================
// MATCH INVITE SERVICE
// ============================================================================

export const matchInviteService = {
  /**
   * Invite squad to a match - creates match and sends invites to all members
   */
  async inviteSquadToMatch(input: InviteSquadToMatchInput): Promise<{
    match: Match;
    inviteResult: BulkInviteResult;
  }> {
    const members = await squadService.getSquadMembers(input.squadId);

    // Filter out excluded members
    const eligibleMembers = input.excludeMemberIds
      ? members.filter((m) => !input.excludeMemberIds!.includes(m.athleteId))
      : members;

    // Create match using match service
    const match = await matchService.createMatch({
      clubId: input.clubId,
      clubName: input.clubName,
      squadId: input.squadId,
      squadName: input.squadName,
      coachId: input.coachId,
      coachName: input.coachName,
      title: input.matchTitle,
      matchType: input.matchType || 'FRIENDLY',
      opponent: input.opponent,
      isHome: input.isHome,
      date: input.date,
      kickoffTime: input.kickoffTime,
      venue: input.venue,
      maxPlayers: eligibleMembers.length,
      notes: input.notes,
    });

    // Invite all squad members
    if (match) {
      const players = await Promise.all(
        eligibleMembers.map(async (member, index) => ({
          athleteId: member.athleteId,
          athleteName: await resolveUserName(member.athleteId, `Athlete ${index + 1}`),
          parentId: member.parentId,
          parentName: await resolveUserName(member.parentId, 'Parent'),
        }))
      );
      await matchService.invitePlayers({
        matchId: match.id,
        players,
      });
    }

    // Track squad invite
    const groupId = `squad_match_${match.id}`;
    const squadInvite: SquadInvite = {
      id: groupId,
      squadId: input.squadId,
      targetType: 'MATCH',
      targetId: match.id,
      invitedBy: input.coachId,
      invitedAt: new Date().toISOString(),
      memberCount: eligibleMembers.length,
      excludedMemberIds: input.excludeMemberIds,
      responses: {
        accepted: 0,
        declined: 0,
        pending: eligibleMembers.length,
      },
    };

    let squadInvitesCache = await loadSquadInvites();
    squadInvitesCache.push(squadInvite);
    await saveSquadInvites(squadInvitesCache);

    // Send notifications to all parents
    const parentMap = new Map<string, SquadMember[]>();
    eligibleMembers.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    let sent = 0;
    let failed = 0;
    const errors: BulkInviteError[] = [];

    for (const [parentId, athletes] of parentMap.entries()) {
      try {
        const athleteNames = (
          await Promise.all(
            athletes.map((athlete, index) =>
              resolveUserName(athlete.athleteId, `Athlete ${index + 1}`)
            )
          )
        ).join(', ');
        await notificationService.create({
          id: `notif_match_${Date.now()}_${parentId}`,
          type: 'booking',
          title: 'Match Availability Request',
          body: `${athleteNames} invited to match ${input.isHome ? 'vs' : '@'} ${input.opponent} on ${input.date}`,
          recipientId: parentId,
          recipientRole: 'parent',
          deepLink: `/matches/${match.id}`,
          data: {
            matchId: match.id,
            squadName: input.squadName,
          },
          timeLabel: 'Just now',
        });
        sent++;
      } catch (error) {
        failed++;
        errors.push({
          memberId: athletes[0].athleteId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      match,
      inviteResult: { sent, successful: sent, failed, skipped: 0, totalAttempted: eligibleMembers.length, errors, groupId },
    };
  },

  /**
   * Get match invites for a specific match
   */
  async getMatchInvites(matchId: string): Promise<SquadInvite[]> {
    const squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter(
      (si) => si.targetType === 'MATCH' && si.targetId === matchId
    );
  },

  /**
   * Get all match invites by coach
   */
  async getCoachMatchInvites(coachId: string): Promise<SquadInvite[]> {
    const squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter(
      (si) => si.targetType === 'MATCH' && si.invitedBy === coachId
    );
  },

  /**
   * Update match invite responses
   */
  async updateMatchInviteResponse(
    matchId: string,
    squadId: string,
    accepted: number,
    declined: number
  ): Promise<void> {
    let squadInvitesCache = await loadSquadInvites();
    const index = squadInvitesCache.findIndex(
      (si) => si.targetType === 'MATCH' && si.targetId === matchId && si.squadId === squadId
    );

    if (index !== -1) {
      const invite = squadInvitesCache[index];
      squadInvitesCache[index] = {
        ...invite,
        responses: {
          accepted,
          declined,
          pending: invite.memberCount - accepted - declined,
        },
      };
      await saveSquadInvites(squadInvitesCache);
    }
  },
};
