"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchService = void 0;
const api_client_1 = require("./api-client");
const config_1 = require("@/constants/config");
const notification_service_1 = require("./notification-service");
const social_feed_service_1 = require("./social-feed-service");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('MatchService');
const USE_MOCK = config_1.api.useMock;
// Mock data for development
const MOCK_MATCHES = [
    {
        id: 'match_1',
        clubId: 'club_1',
        clubName: 'Bradwell Boys Academy',
        squadId: 'squad_u11',
        squadName: 'Under 11s',
        coachId: 'coach_1',
        coachName: 'Marcus Thompson',
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
                athleteName: 'Tom Baker',
                parentId: 'parent_1',
                parentName: 'Sarah Baker',
                status: 'AVAILABLE',
                responseAt: '2026-01-12T10:00:00Z',
            },
            {
                athleteId: 'athlete_2',
                athleteName: 'James Wilson',
                parentId: 'parent_2',
                parentName: 'Mike Wilson',
                status: 'AVAILABLE',
                responseAt: '2026-01-12T11:30:00Z',
            },
            {
                athleteId: 'athlete_3',
                athleteName: 'Oliver Smith',
                parentId: 'parent_3',
                parentName: 'Emma Smith',
                status: 'INVITED',
            },
            {
                athleteId: 'athlete_4',
                athleteName: 'Harry Jones',
                parentId: 'parent_4',
                parentName: 'David Jones',
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
        clubName: 'Bradwell Boys Academy',
        squadId: 'squad_u11',
        squadName: 'Under 11s',
        coachId: 'coach_1',
        coachName: 'Marcus Thompson',
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
        clubName: 'Bradwell Boys Academy',
        squadId: 'squad_u11',
        squadName: 'Under 11s',
        coachId: 'coach_1',
        coachName: 'Marcus Thompson',
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
                athleteName: 'Tom Baker',
                parentId: 'parent_1',
                status: 'SELECTED',
                responseAt: '2026-01-02T10:00:00Z',
                position: 'Midfielder',
                jerseyNumber: 8,
            },
            {
                athleteId: 'athlete_2',
                athleteName: 'James Wilson',
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
let matchesCache = [...MOCK_MATCHES];
async function loadFromStorage() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.MATCHES, null);
        if (stored) {
            return stored;
        }
    }
    catch (error) {
        logger.error('Failed to load from storage', error);
    }
    return [...MOCK_MATCHES];
}
async function saveToStorage(matches) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.MATCHES, matches);
    }
    catch (error) {
        logger.error('Failed to save to storage', error);
    }
}
exports.matchService = {
    /**
     * Get all matches for a club
     */
    async getClubMatches(clubId) {
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
    async getUpcomingMatches(clubId) {
        const matches = await this.getClubMatches(clubId);
        const today = new Date().toISOString().split('T')[0];
        return matches
            .filter((m) => m.date >= today && m.status !== 'CANCELLED' && m.status !== 'COMPLETED')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    /**
     * Get past matches for a club
     */
    async getPastMatches(clubId) {
        const matches = await this.getClubMatches(clubId);
        return matches.filter((m) => m.status === 'COMPLETED');
    },
    /**
     * Get matches for a parent (all matches where their children are involved)
     */
    async getMatchesForParent(parentId) {
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
    async getMatch(matchId) {
        if (USE_MOCK) {
            matchesCache = await loadFromStorage();
            return matchesCache.find((m) => m.id === matchId) || null;
        }
        const response = await fetch(`/api/matches/${matchId}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Create a new match (coach action)
     */
    async createMatch(input) {
        const newMatch = {
            id: `match_${Date.now()}`,
            clubId: input.clubId,
            clubName: input.clubName,
            squadId: input.squadId,
            squadName: input.squadName,
            coachId: input.coachId,
            coachName: input.coachName,
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
            social_feed_service_1.socialFeedService.createMatchPost({
                clubId: newMatch.clubId,
                clubName: newMatch.clubName,
                matchId: newMatch.id,
                matchTitle: newMatch.title,
                opponent: newMatch.opponent,
                matchDate: newMatch.date,
                kickoffTime: newMatch.kickoffTime,
                venue: newMatch.venue,
                isHome: newMatch.isHome,
                coachId: newMatch.coachId,
                coachName: newMatch.coachName || 'Coach',
                squadName: newMatch.squadName,
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
    async inviteSquad(matchId, squadId, players) {
        return this.invitePlayers({ matchId, players });
    },
    /**
     * Invite specific players to a match
     * Sends notification to each parent
     */
    async invitePlayers(input) {
        if (USE_MOCK) {
            matchesCache = await loadFromStorage();
            const index = matchesCache.findIndex((m) => m.id === input.matchId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Match', input.matchId));
            }
            const match = matchesCache[index];
            // Add players who aren't already invited
            for (const player of input.players) {
                const existingIndex = match.selectedPlayers.findIndex((p) => p.athleteId === player.athleteId);
                if (existingIndex === -1) {
                    match.selectedPlayers.push({
                        athleteId: player.athleteId,
                        athleteName: player.athleteName,
                        parentId: player.parentId,
                        parentName: player.parentName,
                        status: 'INVITED',
                    });
                    // Create notification for parent
                    const notification = {
                        id: `notif_match_${Date.now()}_${player.athleteId}`,
                        type: 'booking',
                        title: 'Match Invite',
                        body: `${player.athleteName} has been invited to play: ${match.title} on ${formatMatchDate(match.date)} at ${match.kickoffTime}`,
                        timeLabel: 'Just now',
                        read: false,
                        actionLabel: 'Respond',
                    };
                    await notification_service_1.notificationService.create(notification);
                }
            }
            match.updatedAt = new Date().toISOString();
            matchesCache[index] = match;
            await saveToStorage(matchesCache);
            return (0, result_1.ok)(match);
        }
        const response = await fetch(`/api/matches/${input.matchId}/invite-players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Parent responds to match invite (Available/Unavailable)
     */
    async respondToMatch(input) {
        if (USE_MOCK) {
            matchesCache = await loadFromStorage();
            const index = matchesCache.findIndex((m) => m.id === input.matchId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Match', input.matchId));
            }
            const match = matchesCache[index];
            const playerIndex = match.selectedPlayers.findIndex((p) => p.athleteId === input.athleteId);
            if (playerIndex === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Player', input.athleteId));
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
            const notification = {
                id: `notif_${Date.now()}`,
                type: 'booking',
                title: input.status === 'AVAILABLE' ? 'Player Available' : 'Player Unavailable',
                body: `${player.athleteName} is ${input.status.toLowerCase()} for ${match.title}${input.note ? `: "${input.note}"` : ''}`,
                timeLabel: 'Just now',
                read: false,
            };
            await notification_service_1.notificationService.create(notification);
            return (0, result_1.ok)(match);
        }
        const response = await fetch(`/api/matches/${input.matchId}/respond`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Coach sets the lineup from available players
     * Sends "You're playing" notifications
     */
    async setLineup(input) {
        if (USE_MOCK) {
            matchesCache = await loadFromStorage();
            const index = matchesCache.findIndex((m) => m.id === input.matchId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Match', input.matchId));
            }
            const match = matchesCache[index];
            // Update player statuses based on lineup
            for (const lineupPlayer of input.lineup) {
                const playerIndex = match.selectedPlayers.findIndex((p) => p.athleteId === lineupPlayer.athleteId);
                if (playerIndex !== -1) {
                    const player = match.selectedPlayers[playerIndex];
                    const newStatus = lineupPlayer.isReserve ? 'RESERVE' : 'SELECTED';
                    match.selectedPlayers[playerIndex] = {
                        ...player,
                        status: newStatus,
                        position: lineupPlayer.position,
                        jerseyNumber: lineupPlayer.jerseyNumber,
                    };
                    // Send notification to parent
                    const notification = {
                        id: `notif_lineup_${Date.now()}_${player.athleteId}`,
                        type: 'booking',
                        title: lineupPlayer.isReserve ? 'Reserve Selection' : 'Match Selection',
                        body: lineupPlayer.isReserve
                            ? `${player.athleteName} is on the bench for ${match.title}`
                            : `${player.athleteName} has been selected to play in ${match.title}!`,
                        timeLabel: 'Just now',
                        read: false,
                    };
                    await notification_service_1.notificationService.create(notification);
                }
            }
            match.status = 'LINEUP_SET';
            match.updatedAt = new Date().toISOString();
            matchesCache[index] = match;
            await saveToStorage(matchesCache);
            return (0, result_1.ok)(match);
        }
        const response = await fetch(`/api/matches/${input.matchId}/lineup`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Record match result (coach action after match)
     */
    async recordResult(matchId, result) {
        if (USE_MOCK) {
            matchesCache = await loadFromStorage();
            const index = matchesCache.findIndex((m) => m.id === matchId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Match', matchId));
            }
            matchesCache[index] = {
                ...matchesCache[index],
                result,
                status: 'COMPLETED',
                updatedAt: new Date().toISOString(),
            };
            await saveToStorage(matchesCache);
            return (0, result_1.ok)(matchesCache[index]);
        }
        const response = await fetch(`/api/matches/${matchId}/result`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ result }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Update match status
     */
    async updateStatus(matchId, status) {
        if (USE_MOCK) {
            matchesCache = await loadFromStorage();
            const index = matchesCache.findIndex((m) => m.id === matchId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Match', matchId));
            }
            matchesCache[index] = {
                ...matchesCache[index],
                status,
                updatedAt: new Date().toISOString(),
            };
            await saveToStorage(matchesCache);
            return (0, result_1.ok)(matchesCache[index]);
        }
        const response = await fetch(`/api/matches/${matchId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Cancel a match
     */
    async cancelMatch(matchId) {
        if (USE_MOCK) {
            matchesCache = await loadFromStorage();
            const index = matchesCache.findIndex((m) => m.id === matchId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Match', matchId));
            }
            const match = matchesCache[index];
            match.status = 'CANCELLED';
            match.updatedAt = new Date().toISOString();
            matchesCache[index] = match;
            await saveToStorage(matchesCache);
            // Notify all players
            for (const player of match.selectedPlayers) {
                const notification = {
                    id: `notif_cancel_${Date.now()}_${player.athleteId}`,
                    type: 'booking',
                    title: 'Match Cancelled',
                    body: `${match.title} on ${formatMatchDate(match.date)} has been cancelled.`,
                    timeLabel: 'Just now',
                    read: false,
                };
                await notification_service_1.notificationService.create(notification);
            }
            return (0, result_1.ok)(match);
        }
        return this.updateStatus(matchId, 'CANCELLED');
    },
    /**
     * Get match statistics for a club
     */
    async getMatchStats(clubId) {
        const matches = await this.getClubMatches(clubId);
        const completedMatches = matches.filter((m) => m.status === 'COMPLETED' && m.result);
        const upcomingMatches = matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'LINEUP_SET');
        let wins = 0;
        let draws = 0;
        let losses = 0;
        let goalsFor = 0;
        let goalsAgainst = 0;
        for (const match of completedMatches) {
            if (!match.result)
                continue;
            const homeGoals = match.result.home;
            const awayGoals = match.result.away;
            if (match.isHome) {
                goalsFor += homeGoals;
                goalsAgainst += awayGoals;
                if (homeGoals > awayGoals)
                    wins++;
                else if (homeGoals < awayGoals)
                    losses++;
                else
                    draws++;
            }
            else {
                goalsFor += awayGoals;
                goalsAgainst += homeGoals;
                if (awayGoals > homeGoals)
                    wins++;
                else if (awayGoals < homeGoals)
                    losses++;
                else
                    draws++;
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
    getAvailabilitySummary(match) {
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
    formatMatchType(type) {
        const labels = {
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
    getMatchTypeColor(type) {
        const colors = {
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
    formatStatus(status) {
        const labels = {
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
    getStatusColor(status) {
        const colors = {
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
    formatPlayerStatus(status) {
        const labels = {
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
    getPlayerStatusColor(status) {
        const colors = {
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
function formatMatchDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}
