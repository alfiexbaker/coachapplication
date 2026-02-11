/**
 * Match Service
 *
 * Handles match/fixture management for clubs.
 * Coaches create matches, invite players, manage lineup.
 * Parents respond to match invites and see if child is selected.
 *
 * FLOW:
 * 1. COACH: Creates match → Selects squad → Auto-invites all players
 * 2. PARENT: Gets notification → Opens match → Responds: Available/Unavailable
 * 3. COACH: Views responses → Selects lineup from available players
 * 4. PARENT: Gets "selected for match" notification
 *
 * API Integration Notes:
 * - POST /api/matches - Create match
 * - GET /api/matches?clubId=X - Get club matches
 * - GET /api/matches?parentId=X - Get matches for parent's children
 * - POST /api/matches/:id/invite-squad - Invite entire squad
 * - POST /api/matches/:id/invite-players - Invite specific players
 * - PATCH /api/matches/:id/respond - Parent responds
 * - PATCH /api/matches/:id/lineup - Set lineup
 * - PATCH /api/matches/:id/result - Record result
 */

import { apiClient } from './api-client';
import { api } from '@/constants/config';
import type {
  Match,
  MatchPlayerStatus,
  MatchResult,
  MatchStatus,
  MatchType,
  NotificationItem,
} from '@/constants/types';
import { notificationService } from './notification-service';
import { socialFeedService } from './social-feed-service';
import { userService } from './user-service';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { type Result, type ServiceError, ok, err, notFound, storageError } from '@/types/result';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('MatchService');

const USE_MOCK = api.useMock;

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return fallback;
  return userResult.data.name || fallback;
}

// Mock data for development
const MOCK_MATCHES: Match[] = [
  {
    id: 'match_1',
    clubId: 'club_1',
    squadId: 'squad_u11',
    coachId: 'coach1',
    title: "Under 11's vs Hackney FC",
    matchType: 'LEAGUE',
    opponent: 'Hackney FC',
    isHome: true,
    date: '2026-01-18',
    kickoffTime: '10:00',
    meetTime: '09:30',
    venue: 'Bradwell Sports Ground',
    address: '123 Sports Lane, London E1 4AB',
    maxPlayers: 14,
    selectedPlayers: [
      {
        athleteId: 'athlete_1',
        parentId: 'parent_1',
        status: 'AVAILABLE',
        responseAt: '2026-01-12T10:00:00Z',
      },
      {
        athleteId: 'athlete_2',
        parentId: 'parent_2',
        status: 'AVAILABLE',
        responseAt: '2026-01-12T11:30:00Z',
      },
      {
        athleteId: 'athlete_3',
        parentId: 'parent_3',
        status: 'INVITED',
      },
      {
        athleteId: 'athlete_4',
        parentId: 'parent_4',
        status: 'UNAVAILABLE',
        responseAt: '2026-01-12T09:00:00Z',
        parentNote: 'Family commitment, sorry!',
      },
    ],
    status: 'SCHEDULED',
    createdAt: '2026-01-10T14:00:00Z',
    notes: 'Important league match - please arrive on time!',
  },
  {
    id: 'match_2',
    clubId: 'club_1',
    squadId: 'squad_u11',
    coachId: 'coach1',
    title: "Under 11's vs Victoria Park",
    matchType: 'FRIENDLY',
    opponent: 'Victoria Park FC',
    isHome: false,
    date: '2026-01-25',
    kickoffTime: '14:00',
    meetTime: '13:15',
    venue: 'Victoria Park Pitches',
    address: 'Victoria Park, London E9 7BT',
    maxPlayers: 14,
    selectedPlayers: [],
    status: 'SCHEDULED',
    createdAt: '2026-01-11T09:00:00Z',
  },
  {
    id: 'match_3',
    clubId: 'club_1',
    squadId: 'squad_u11',
    coachId: 'coach1',
    title: "Under 11's vs Stratford Youth",
    matchType: 'CUP',
    opponent: 'Stratford Youth',
    isHome: true,
    date: '2026-01-05',
    kickoffTime: '11:00',
    venue: 'Bradwell Sports Ground',
    maxPlayers: 14,
    selectedPlayers: [
      {
        athleteId: 'athlete_1',
        parentId: 'parent_1',
        status: 'SELECTED',
        responseAt: '2026-01-02T10:00:00Z',
        position: 'Midfielder',
        jerseyNumber: 8,
      },
      {
        athleteId: 'athlete_2',
        parentId: 'parent_2',
        status: 'SELECTED',
        responseAt: '2026-01-02T11:30:00Z',
        position: 'Forward',
        jerseyNumber: 9,
      },
    ],
    status: 'COMPLETED',
    result: { home: 3, away: 1 },
    createdAt: '2025-12-28T14:00:00Z',
  },
];

let matchesCache: Match[] = [...MOCK_MATCHES];

export interface CreateMatchInput {
  clubId: string;
  clubName: string;
  squadId?: string;
  squadName?: string;
  coachId: string;
  coachName: string;
  title: string;
  matchType: MatchType;
  opponent: string;
  isHome: boolean;
  date: string;
  kickoffTime: string;
  meetTime?: string;
  venue: string;
  address?: string;
  maxPlayers: number;
  notes?: string;
}

export interface InvitePlayersInput {
  matchId: string;
  players: {
    athleteId: string;
    athleteName: string;
    parentId: string;
    parentName?: string;
  }[];
}

export interface RespondToMatchInput {
  matchId: string;
  athleteId: string;
  parentId: string;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  note?: string;
}

export interface SetLineupInput {
  matchId: string;
  lineup: {
    athleteId: string;
    position?: string;
    jerseyNumber?: number;
    isReserve?: boolean;
  }[];
}

async function loadFromStorage(): Promise<Match[]> {
  try {
    const stored = await apiClient.get<Match[] | null>(STORAGE_KEYS.MATCHES, null);
    if (stored) {
      return stored;
    }
  } catch (error) {
    logger.error('Failed to load from storage', error);
  }
  return [...MOCK_MATCHES];
}

async function saveToStorage(matches: Match[]): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.MATCHES, matches);
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save to storage', error);
    return err(storageError(`Failed to save matches: ${String(error)}`));
  }
}

export const matchService = {
  /**
   * Get all matches for a club
   */
  async getClubMatches(clubId: string): Promise<Match[]> {
    if (USE_MOCK) {
      matchesCache = await loadFromStorage();
      return matchesCache
        .filter((m) => m.clubId === clubId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const response = await fetch(`/api/matches?clubId=${clubId}`);
    return response.json();
  },

  /**
   * Get upcoming matches for a club
   */
  async getUpcomingMatches(clubId: string): Promise<Match[]> {
    const matches = await this.getClubMatches(clubId);
    const today = toDateStr(new Date());
    return matches
      .filter((m) => m.date >= today && m.status !== 'CANCELLED' && m.status !== 'COMPLETED')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  /**
   * Get past matches for a club
   */
  async getPastMatches(clubId: string): Promise<Match[]> {
    const matches = await this.getClubMatches(clubId);
    return matches.filter((m) => m.status === 'COMPLETED');
  },

  /**
   * Get matches for a parent (all matches where their children are involved)
   */
  async getMatchesForParent(parentId: string): Promise<Match[]> {
    if (USE_MOCK) {
      matchesCache = await loadFromStorage();
      return matchesCache
        .filter((m) => m.selectedPlayers.some((p) => p.parentId === parentId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const response = await fetch(`/api/matches?parentId=${parentId}`);
    return response.json();
  },

  /**
   * Get a single match by ID
   */
  async getMatch(matchId: string): Promise<Match | null> {
    if (USE_MOCK) {
      matchesCache = await loadFromStorage();
      return matchesCache.find((m) => m.id === matchId) || null;
    }

    const response = await fetch(`/api/matches/${matchId}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Create a new match (coach action)
   */
  async createMatch(input: CreateMatchInput): Promise<Match> {
    const newMatch: Match = {
      id: apiClient.generateId('match'),
      clubId: input.clubId,
      squadId: input.squadId,
      coachId: input.coachId,
      title: input.title,
      matchType: input.matchType,
      opponent: input.opponent,
      isHome: input.isHome,
      date: input.date,
      kickoffTime: input.kickoffTime,
      meetTime: input.meetTime,
      venue: input.venue,
      address: input.address,
      maxPlayers: input.maxPlayers,
      selectedPlayers: [],
      status: 'SCHEDULED',
      createdAt: new Date().toISOString(),
      notes: input.notes,
    };

    if (USE_MOCK) {
      matchesCache = await loadFromStorage();
      matchesCache.push(newMatch);
      await saveToStorage(matchesCache);

      // Create social feed post for the match
      const coachName = await resolveUserName(newMatch.coachId, 'Coach');
      socialFeedService.createMatchPost({
        clubId: newMatch.clubId,
        clubName: input.clubName,
        matchId: newMatch.id,
        matchTitle: newMatch.title,
        opponent: newMatch.opponent,
        matchDate: newMatch.date,
        kickoffTime: newMatch.kickoffTime,
        venue: newMatch.venue,
        isHome: newMatch.isHome,
        coachId: newMatch.coachId,
        coachName,
        squadName: input.squadName,
      });

      return newMatch;
    }

    const response = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMatch),
    });
    return response.json();
  },

  /**
   * Invite an entire squad to a match
   */
  async inviteSquad(
    matchId: string,
    squadId: string,
    players: {
      athleteId: string;
      athleteName: string;
      parentId: string;
      parentName?: string;
    }[]
  ): Promise<Result<Match, ServiceError>> {
    return this.invitePlayers({ matchId, players });
  },

  /**
   * Invite specific players to a match
   * Sends notification to each parent
   */
  async invitePlayers(input: InvitePlayersInput): Promise<Result<Match, ServiceError>> {
    if (USE_MOCK) {
      matchesCache = await loadFromStorage();
      const index = matchesCache.findIndex((m) => m.id === input.matchId);

      if (index === -1) {
        return err(notFound('Match', input.matchId));
      }

      const match = matchesCache[index];

      // Add players who aren't already invited
      for (const player of input.players) {
        const existingIndex = match.selectedPlayers.findIndex(
          (p) => p.athleteId === player.athleteId
        );
        if (existingIndex === -1) {
          match.selectedPlayers.push({
            athleteId: player.athleteId,
            parentId: player.parentId,
            status: 'INVITED',
          });

          // Create notification for parent
          const athleteName = await resolveUserName(player.athleteId, 'Athlete');
          const notification: NotificationItem = {
            id: apiClient.generateId(`notif_match_${player.athleteId}`),
            type: 'booking',
            title: 'Match Invite',
            body: `${athleteName} has been invited to play: ${match.title} on ${formatMatchDate(match.date)} at ${match.kickoffTime}`,
            timeLabel: 'Just now',
            read: false,
            actionLabel: 'Respond',
          };
          await notificationService.create(notification);
        }
      }

      match.updatedAt = new Date().toISOString();
      matchesCache[index] = match;
      await saveToStorage(matchesCache);
      return ok(match);
    }

    const response = await fetch(`/api/matches/${input.matchId}/invite-players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return ok(await response.json());
  },

  /**
   * Parent responds to match invite (Available/Unavailable)
   */
  async respondToMatch(input: RespondToMatchInput): Promise<Result<Match, ServiceError>> {
    if (USE_MOCK) {
      matchesCache = await loadFromStorage();
      const index = matchesCache.findIndex((m) => m.id === input.matchId);

      if (index === -1) {
        return err(notFound('Match', input.matchId));
      }

      const match = matchesCache[index];
      const playerIndex = match.selectedPlayers.findIndex(
        (p) => p.athleteId === input.athleteId
      );

      if (playerIndex === -1) {
        return err(notFound('Player', input.athleteId));
      }

      match.selectedPlayers[playerIndex] = {
        ...match.selectedPlayers[playerIndex],
        status: input.status,
        responseAt: new Date().toISOString(),
        parentNote: input.note,
      };

      match.updatedAt = new Date().toISOString();
      matchesCache[index] = match;
      await saveToStorage(matchesCache);

      // Create notification for coach
      const player = match.selectedPlayers[playerIndex];
      const athleteName = await resolveUserName(player.athleteId, 'Athlete');
      const notification: NotificationItem = {
        id: apiClient.generateId('notif'),
        type: 'booking',
        title: input.status === 'AVAILABLE' ? 'Player Available' : 'Player Unavailable',
        body: `${athleteName} is ${input.status.toLowerCase()} for ${match.title}${input.note ? `: "${input.note}"` : ''}`,
        timeLabel: 'Just now',
        read: false,
      };
      await notificationService.create(notification);

      return ok(match);
    }

    const response = await fetch(`/api/matches/${input.matchId}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return ok(await response.json());
  },

  /**
   * Coach sets the lineup from available players
   * Sends "You're playing" notifications
   */
  async setLineup(input: SetLineupInput): Promise<Result<Match, ServiceError>> {
    if (USE_MOCK) {
      matchesCache = await loadFromStorage();
      const index = matchesCache.findIndex((m) => m.id === input.matchId);

      if (index === -1) {
        return err(notFound('Match', input.matchId));
      }

      const match = matchesCache[index];

      // Update player statuses based on lineup
      for (const lineupPlayer of input.lineup) {
        const playerIndex = match.selectedPlayers.findIndex(
          (p) => p.athleteId === lineupPlayer.athleteId
        );

        if (playerIndex !== -1) {
          const player = match.selectedPlayers[playerIndex];
          const newStatus: MatchPlayerStatus = lineupPlayer.isReserve ? 'RESERVE' : 'SELECTED';

          match.selectedPlayers[playerIndex] = {
            ...player,
            status: newStatus,
            position: lineupPlayer.position,
            jerseyNumber: lineupPlayer.jerseyNumber,
          };

          // Send notification to parent
          const athleteName = await resolveUserName(player.athleteId, 'Athlete');
          const notification: NotificationItem = {
            id: apiClient.generateId(`notif_lineup_${player.athleteId}`),
            type: 'booking',
            title: lineupPlayer.isReserve ? 'Reserve Selection' : 'Match Selection',
            body: lineupPlayer.isReserve
              ? `${athleteName} is on the bench for ${match.title}`
              : `${athleteName} has been selected to play in ${match.title}!`,
            timeLabel: 'Just now',
            read: false,
          };
          await notificationService.create(notification);
        }
      }

      match.status = 'LINEUP_SET';
      match.updatedAt = new Date().toISOString();
      matchesCache[index] = match;
      await saveToStorage(matchesCache);
      return ok(match);
    }

    const response = await fetch(`/api/matches/${input.matchId}/lineup`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return ok(await response.json());
  },

  /**
   * Record match result (coach action after match)
   */
  async recordResult(matchId: string, result: MatchResult): Promise<Result<Match, ServiceError>> {
    if (USE_MOCK) {
      matchesCache = await loadFromStorage();
      const index = matchesCache.findIndex((m) => m.id === matchId);

      if (index === -1) {
        return err(notFound('Match', matchId));
      }

      matchesCache[index] = {
        ...matchesCache[index],
        result,
        status: 'COMPLETED',
        updatedAt: new Date().toISOString(),
      };

      await saveToStorage(matchesCache);
      return ok(matchesCache[index]);
    }

    const response = await fetch(`/api/matches/${matchId}/result`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    });
    return ok(await response.json());
  },

  /**
   * Update match status
   */
  async updateStatus(matchId: string, status: MatchStatus): Promise<Result<Match, ServiceError>> {
    if (USE_MOCK) {
      matchesCache = await loadFromStorage();
      const index = matchesCache.findIndex((m) => m.id === matchId);

      if (index === -1) {
        return err(notFound('Match', matchId));
      }

      matchesCache[index] = {
        ...matchesCache[index],
        status,
        updatedAt: new Date().toISOString(),
      };

      await saveToStorage(matchesCache);
      return ok(matchesCache[index]);
    }

    const response = await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return ok(await response.json());
  },

  /**
   * Cancel a match
   */
  async cancelMatch(matchId: string): Promise<Result<Match, ServiceError>> {
    if (USE_MOCK) {
      matchesCache = await loadFromStorage();
      const index = matchesCache.findIndex((m) => m.id === matchId);

      if (index === -1) {
        return err(notFound('Match', matchId));
      }

      const match = matchesCache[index];
      match.status = 'CANCELLED';
      match.updatedAt = new Date().toISOString();
      matchesCache[index] = match;
      await saveToStorage(matchesCache);

      // Notify all players
      for (const player of match.selectedPlayers) {
        const notification: NotificationItem = {
          id: apiClient.generateId(`notif_cancel_${player.athleteId}`),
          type: 'booking',
          title: 'Match Cancelled',
          body: `${match.title} on ${formatMatchDate(match.date)} has been cancelled.`,
          timeLabel: 'Just now',
          read: false,
        };
        await notificationService.create(notification);
      }

      return ok(match);
    }

    return this.updateStatus(matchId, 'CANCELLED');
  },

  /**
   * Get match statistics for a club
   */
  async getMatchStats(clubId: string): Promise<{
    totalMatches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    upcomingCount: number;
  }> {
    const matches = await this.getClubMatches(clubId);
    const completedMatches = matches.filter((m) => m.status === 'COMPLETED' && m.result);
    const upcomingMatches = matches.filter(
      (m) => m.status === 'SCHEDULED' || m.status === 'LINEUP_SET'
    );

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    for (const match of completedMatches) {
      if (!match.result) continue;

      const homeGoals = match.result.home;
      const awayGoals = match.result.away;

      if (match.isHome) {
        goalsFor += homeGoals;
        goalsAgainst += awayGoals;
        if (homeGoals > awayGoals) wins++;
        else if (homeGoals < awayGoals) losses++;
        else draws++;
      } else {
        goalsFor += awayGoals;
        goalsAgainst += homeGoals;
        if (awayGoals > homeGoals) wins++;
        else if (awayGoals < homeGoals) losses++;
        else draws++;
      }
    }

    return {
      totalMatches: completedMatches.length,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      upcomingCount: upcomingMatches.length,
    };
  },

  /**
   * Get availability summary for a match
   */
  getAvailabilitySummary(match: Match): {
    invited: number;
    available: number;
    unavailable: number;
    pending: number;
    selected: number;
    reserve: number;
  } {
    const players = match.selectedPlayers;
    return {
      invited: players.filter((p) => p.status === 'INVITED').length,
      available: players.filter((p) => p.status === 'AVAILABLE').length,
      unavailable: players.filter((p) => p.status === 'UNAVAILABLE').length,
      pending: players.filter((p) => p.status === 'INVITED').length,
      selected: players.filter((p) => p.status === 'SELECTED').length,
      reserve: players.filter((p) => p.status === 'RESERVE').length,
    };
  },

  /**
   * Format match type for display
   */
  formatMatchType(type: MatchType): string {
    const labels: Record<MatchType, string> = {
      FRIENDLY: 'Friendly',
      LEAGUE: 'League',
      CUP: 'Cup',
      TOURNAMENT: 'Tournament',
    };
    return labels[type] || type;
  },

  /**
   * Get match type color
   */
  getMatchTypeColor(type: MatchType): string {
    const colors: Record<MatchType, string> = {
      FRIENDLY: '#0891B2',
      LEAGUE: '#16A34A',
      CUP: '#7C3AED',
      TOURNAMENT: '#EA580C',
    };
    return colors[type] || '#6B7280';
  },

  /**
   * Format match status for display
   */
  formatStatus(status: MatchStatus): string {
    const labels: Record<MatchStatus, string> = {
      SCHEDULED: 'Scheduled',
      LINEUP_SET: 'Lineup Set',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  },

  /**
   * Get status color
   */
  getStatusColor(status: MatchStatus): string {
    const colors: Record<MatchStatus, string> = {
      SCHEDULED: '#0891B2',
      LINEUP_SET: '#16A34A',
      IN_PROGRESS: '#EA580C',
      COMPLETED: '#6B7280',
      CANCELLED: '#DC2626',
    };
    return colors[status] || '#6B7280';
  },

  /**
   * Format player status for display
   */
  formatPlayerStatus(status: MatchPlayerStatus): string {
    const labels: Record<MatchPlayerStatus, string> = {
      INVITED: 'Awaiting response',
      AVAILABLE: 'Available',
      UNAVAILABLE: 'Unavailable',
      SELECTED: 'Selected',
      RESERVE: 'Reserve',
    };
    return labels[status] || status;
  },

  /**
   * Get player status color
   */
  getPlayerStatusColor(status: MatchPlayerStatus): string {
    const colors: Record<MatchPlayerStatus, string> = {
      INVITED: '#F59E0B',
      AVAILABLE: '#16A34A',
      UNAVAILABLE: '#DC2626',
      SELECTED: '#7C3AED',
      RESERVE: '#0891B2',
    };
    return colors[status] || '#6B7280';
  },
};

// Helper function to format date
function formatMatchDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
