/**
 * Bulk Invite Service
 *
 * Handles squad-based and bulk invite operations for sessions, matches, and events.
 * Provides a unified interface for sending invites to entire squads or custom groups.
 *
 * API Integration Notes:
 * - POST /api/invites/squad-session - Invite squad to session
 * - POST /api/invites/squad-match - Invite squad to match
 * - POST /api/invites/squad-event - Invite squads to event
 * - POST /api/invites/bulk - Bulk invite multiple athletes
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  SquadMember,
  SquadInvite,
  TimeSlot,
  Match,
  ClubEvent,
  MatchPlayer,
} from '@/constants/types';
import { squadService } from './squad-service';
import { sessionInviteService } from './session-invite-service';
import { notificationService } from './notification-service';
import { safeJsonParse } from '@/utils/safe-json';
import { matchService } from './match-service';
import { eventService } from './event-service';

const SQUAD_INVITES_KEY = 'squad_invites';
const USE_MOCK = true;

// Result interfaces
export interface BulkInviteResult {
  successful: number;
  failed: number;
  errors: Array<{ memberId: string; error: string }>;
  squadInviteId?: string;
}

export interface SquadInvitePreview {
  squadId: string;
  squadName: string;
  memberCount: number;
  members: Array<{
    athleteId: string;
    athleteName: string;
    parentId: string;
    parentName: string;
  }>;
  uniqueParentCount: number;
}

// Input interfaces
export interface InviteSquadToSessionInput {
  sessionId: string;
  sessionTitle: string;
  squadId: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;
  excludeMemberIds?: string[];
}

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

export interface InviteSquadsToEventInput {
  clubId: string;
  clubName: string;
  title: string;
  description: string;
  eventType: 'TOURNAMENT' | 'SOCIAL' | 'MEETING' | 'PRESENTATION' | 'FUNDRAISER' | 'TRIAL_DAY' | 'TRAINING_CAMP' | 'OTHER';
  date: string;
  startTime: string;
  endTime?: string;
  venue: string;
  isVirtual?: boolean;
  squadIds: string[];
  createdBy: string;
  createdByName: string;
  price?: number;
  maxAttendees?: number;
  excludeMemberIds?: string[];
}

export interface InviteMultipleAthletesInput {
  targetType: 'SESSION' | 'MATCH' | 'EVENT';
  targetId: string;
  targetTitle: string;
  athleteIds: string[];
  coachId: string;
  coachName: string;
  proposedSlots?: TimeSlot[];
  sessionType?: string;
  focus?: string;
  notes?: string;
  priceUsd?: number;
}

// Cache
let squadInvitesCache: SquadInvite[] = [];

// Storage helpers
async function loadSquadInvites(): Promise<SquadInvite[]> {
  try {
    const stored = await AsyncStorage.getItem(SQUAD_INVITES_KEY);
    if (stored) return safeJsonParse<SquadInvite[]>(stored, []);
  } catch (error) {
    console.error('[BulkInviteService] Failed to load squad invites:', error);
  }
  return [];
}

async function saveSquadInvites(invites: SquadInvite[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SQUAD_INVITES_KEY, JSON.stringify(invites));
    squadInvitesCache = invites;
  } catch (error) {
    console.error('[BulkInviteService] Failed to save squad invites:', error);
  }
}

export const bulkInviteService = {
  // ============================================================================
  // PREVIEW / HELPERS
  // ============================================================================

  /**
   * Get preview of a squad invite - shows how many athletes/parents will be invited
   */
  async getSquadInvitePreview(
    squadId: string,
    excludeMemberIds: string[] = []
  ): Promise<SquadInvitePreview> {
    const squad = await squadService.getSquad(squadId);
    const members = await squadService.getSquadMembers(squadId);

    const eligibleMembers = members.filter(
      (m) => !excludeMemberIds.includes(m.athleteId)
    );

    const uniqueParents = new Set(eligibleMembers.map((m) => m.parentId));

    return {
      squadId,
      squadName: squad?.name || 'Unknown Squad',
      memberCount: eligibleMembers.length,
      members: eligibleMembers.map((m) => ({
        athleteId: m.athleteId,
        athleteName: m.athleteName,
        parentId: m.parentId,
        parentName: m.parentName,
      })),
      uniqueParentCount: uniqueParents.size,
    };
  },

  /**
   * Get preview for multiple squads
   */
  async getMultipleSquadsPreview(
    squadIds: string[],
    excludeMemberIds: string[] = []
  ): Promise<{
    squads: SquadInvitePreview[];
    totalMembers: number;
    totalParents: number;
  }> {
    const previews = await Promise.all(
      squadIds.map((id) => this.getSquadInvitePreview(id, excludeMemberIds))
    );

    // Count unique parents across all squads
    const allParentIds = new Set<string>();
    previews.forEach((p) => {
      p.members.forEach((m) => allParentIds.add(m.parentId));
    });

    return {
      squads: previews,
      totalMembers: previews.reduce((sum, p) => sum + p.memberCount, 0),
      totalParents: allParentIds.size,
    };
  },

  // ============================================================================
  // SESSION INVITES
  // ============================================================================

  /**
   * Invite entire squad to a session
   * Creates individual session invites for each parent
   */
  async inviteSquadToSession(
    input: InviteSquadToSessionInput
  ): Promise<BulkInviteResult> {
    const members = await squadService.getSquadMembers(input.squadId);
    const squad = await squadService.getSquad(input.squadId);

    // Filter out excluded members
    const eligibleMembers = input.excludeMemberIds
      ? members.filter((m) => !input.excludeMemberIds!.includes(m.athleteId))
      : members;

    // Group by parent
    const parentMap = new Map<string, SquadMember[]>();
    eligibleMembers.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    const groupId = `squad_session_${Date.now()}`;
    let successful = 0;
    let failed = 0;
    const errors: Array<{ memberId: string; error: string }> = [];

    // Create invite for each parent
    for (const [parentId, athletes] of parentMap.entries()) {
      try {
        await sessionInviteService.createInvite({
          coachId: input.coachId,
          coachName: input.coachName,
          coachPhotoUrl: input.coachPhotoUrl,
          clubName: input.clubName || squad?.name,
          athleteIds: athletes.map((a) => a.athleteId),
          athleteNames: athletes.map((a) => a.athleteName),
          parentId,
          parentName: athletes[0].parentName,
          proposedSlots: input.proposedSlots,
          sessionType: input.sessionType,
          focus: input.focus,
          notes: input.notes
            ? `[${squad?.name}] ${input.notes}`
            : `Squad Training: ${squad?.name}`,
          priceUsd: input.priceUsd,
          groupId,
        });
        successful++;
      } catch (error) {
        failed++;
        errors.push({
          memberId: athletes[0].athleteId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Track squad invite
    const squadInvite: SquadInvite = {
      id: groupId,
      squadId: input.squadId,
      squadName: squad?.name || 'Unknown Squad',
      targetType: 'SESSION',
      targetId: input.sessionId,
      targetTitle: input.sessionTitle,
      invitedBy: input.coachId,
      invitedByName: input.coachName,
      invitedAt: new Date().toISOString(),
      memberCount: eligibleMembers.length,
      excludedMemberIds: input.excludeMemberIds,
      responses: {
        accepted: 0,
        declined: 0,
        pending: parentMap.size,
      },
    };

    squadInvitesCache = await loadSquadInvites();
    squadInvitesCache.push(squadInvite);
    await saveSquadInvites(squadInvitesCache);

    return { successful, failed, errors, squadInviteId: groupId };
  },

  // ============================================================================
  // MATCH INVITES
  // ============================================================================

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

    // Create match players from squad members
    const players: MatchPlayer[] = eligibleMembers.map((m) => ({
      athleteId: m.athleteId,
      athleteName: m.athleteName,
      parentId: m.parentId,
      parentName: m.parentName,
      status: 'INVITED' as const,
    }));

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
      await matchService.invitePlayers({
        matchId: match.id,
        players: eligibleMembers.map((m) => ({
          athleteId: m.athleteId,
          athleteName: m.athleteName,
          parentId: m.parentId,
          parentName: m.parentName,
        })),
      });
    }

    // Track squad invite
    const groupId = `squad_match_${match.id}`;
    const squadInvite: SquadInvite = {
      id: groupId,
      squadId: input.squadId,
      squadName: input.squadName,
      targetType: 'MATCH',
      targetId: match.id,
      targetTitle: `${input.isHome ? 'vs' : '@'} ${input.opponent}`,
      invitedBy: input.coachId,
      invitedByName: input.coachName,
      invitedAt: new Date().toISOString(),
      memberCount: eligibleMembers.length,
      excludedMemberIds: input.excludeMemberIds,
      responses: {
        accepted: 0,
        declined: 0,
        pending: eligibleMembers.length,
      },
    };

    squadInvitesCache = await loadSquadInvites();
    squadInvitesCache.push(squadInvite);
    await saveSquadInvites(squadInvitesCache);

    // Send notifications to all parents
    const parentMap = new Map<string, SquadMember[]>();
    eligibleMembers.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    let successful = 0;
    let failed = 0;
    const errors: Array<{ memberId: string; error: string }> = [];

    for (const [parentId, athletes] of parentMap.entries()) {
      try {
        const athleteNames = athletes.map((a) => a.athleteName).join(', ');
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
        successful++;
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
      inviteResult: { successful, failed, errors, squadInviteId: groupId },
    };
  },

  // ============================================================================
  // EVENT INVITES
  // ============================================================================

  /**
   * Invite multiple squads to an event
   */
  async inviteSquadsToEvent(input: InviteSquadsToEventInput): Promise<{
    event: ClubEvent;
    inviteResult: BulkInviteResult;
  }> {
    // Get all members from all squads
    const allMembers = await squadService.getMembersForSquads(input.squadIds);

    // Filter out excluded members
    const eligibleMembers = input.excludeMemberIds
      ? allMembers.filter((m) => !input.excludeMemberIds!.includes(m.athleteId))
      : allMembers;

    // Create event using event service
    const event = await eventService.createEvent({
      clubId: input.clubId,
      clubName: input.clubName,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      title: input.title,
      description: input.description,
      eventType: input.eventType,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      venue: input.venue,
      isVirtual: input.isVirtual || false,
      targetAudience: 'SQUAD',
      maxAttendees: input.maxAttendees,
      price: input.price || 0,
      currency: 'GBP',
      rsvpRequired: true,
    });

    // Track squad invite for each squad
    const groupId = `squad_event_${event.id}`;
    for (const squadId of input.squadIds) {
      const squad = await squadService.getSquad(squadId);
      const squadMembers = eligibleMembers.filter((m) => m.squadId === squadId);

      const squadInvite: SquadInvite = {
        id: `${groupId}_${squadId}`,
        squadId,
        squadName: squad?.name || 'Unknown Squad',
        targetType: 'EVENT',
        targetId: event.id,
        targetTitle: input.title,
        invitedBy: input.createdBy,
        invitedByName: input.createdByName,
        invitedAt: new Date().toISOString(),
        memberCount: squadMembers.length,
        excludedMemberIds: input.excludeMemberIds,
        responses: {
          accepted: 0,
          declined: 0,
          pending: squadMembers.length,
        },
      };

      squadInvitesCache = await loadSquadInvites();
      squadInvitesCache.push(squadInvite);
    }
    await saveSquadInvites(squadInvitesCache);

    // Send notifications to all unique parents
    const parentMap = new Map<string, SquadMember[]>();
    eligibleMembers.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    let successful = 0;
    let failed = 0;
    const errors: Array<{ memberId: string; error: string }> = [];

    for (const [parentId, athletes] of parentMap.entries()) {
      try {
        const athleteNames = athletes.map((a) => a.athleteName).join(', ');
        await notificationService.create({
          id: `notif_event_${Date.now()}_${parentId}`,
          type: 'booking',
          title: 'Event Invitation',
          body: `${athleteNames} invited to ${input.title} on ${input.date}`,
          recipientId: parentId,
          recipientRole: 'parent',
          deepLink: `/events/${event.id}`,
          data: {
            eventId: event.id,
            eventTitle: input.title,
          },
          timeLabel: 'Just now',
        });
        successful++;
      } catch (error) {
        failed++;
        errors.push({
          memberId: athletes[0].athleteId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      event,
      inviteResult: { successful, failed, errors, squadInviteId: groupId },
    };
  },

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get all squad invites for a specific target
   */
  async getSquadInvitesForTarget(
    targetType: 'SESSION' | 'MATCH' | 'EVENT',
    targetId: string
  ): Promise<SquadInvite[]> {
    squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter(
      (si) => si.targetType === targetType && si.targetId === targetId
    );
  },

  /**
   * Get all squad invites by coach
   */
  async getSquadInvitesByCoach(coachId: string): Promise<SquadInvite[]> {
    squadInvitesCache = await loadSquadInvites();
    return squadInvitesCache.filter((si) => si.invitedBy === coachId);
  },
};
