"use strict";
/**
 * Squad Service
 *
 * Handles squad-related operations including member management and squad queries.
 * Provides functionality for getting squad members, filtering, and squad info.
 *
 * API Integration Notes:
 * - GET /api/squads/:id - Get squad details
 * - GET /api/squads/:id/members - Get squad members
 * - GET /api/clubs/:clubId/squads - Get all squads for a club
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.squadService = void 0;
const api_client_1 = require("./api-client");
const config_1 = require("@/constants/config");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("./event-bus");
const user_service_1 = require("./user-service");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('SquadService');
const USE_MOCK = config_1.api.useMock;
async function resolveUserName(userId, fallback) {
    const userResult = await user_service_1.userService.getUserById(userId);
    if (!userResult.success)
        return fallback;
    return userResult.data.name || fallback;
}
async function resolveUserEmail(userId) {
    const userResult = await user_service_1.userService.getUserById(userId);
    if (!userResult.success)
        return undefined;
    return userResult.data.email;
}
const BASE_CLUB_SQUADS = [
    {
        id: 'squad_u15',
        clubId: 'club_lions',
        name: 'U15 Performance',
        level: 'U15 · Competitive',
        memberCount: 18,
        primaryCoach: 'coach1',
        meetLocation: 'Pitch 2',
        tags: ['Pressing', 'Finishing'],
    },
    {
        id: 'squad_juniors',
        clubId: 'club_lions',
        name: 'Junior Skills',
        level: 'U11 · Development',
        memberCount: 22,
        primaryCoach: 'coach2',
        meetLocation: 'Sports Hall',
        tags: ['Ball Mastery', 'Confidence'],
    },
    {
        id: 'squad_staff',
        clubId: 'club_lions',
        name: 'Staff Room',
        level: 'Coaches & Admins',
        memberCount: 8,
        primaryCoach: 'coach1',
        meetLocation: 'Clubhouse',
        tags: ['Approvals', 'Safeguarding'],
    },
    {
        id: 'squad_warriors_u12',
        clubId: 'club_warriors',
        name: 'U12 Development',
        level: 'U12 · Grassroots',
        memberCount: 16,
        primaryCoach: 'coach3',
        meetLocation: 'Southbank Fields',
    },
    {
        id: 'squad_warriors_u14',
        clubId: 'club_warriors',
        name: 'U14 Competitive',
        level: 'U14 · League',
        memberCount: 20,
        primaryCoach: 'coach4',
        meetLocation: 'Southbank Stadium',
    },
    {
        id: 'squad_warriors_girls',
        clubId: 'club_warriors',
        name: 'Girls Team',
        level: 'U16 · Development',
        memberCount: 14,
        primaryCoach: 'coach4',
        meetLocation: 'Southbank Fields',
    },
    {
        id: 'squad_phoenix_elite',
        clubId: 'club_phoenix',
        name: 'Elite Academy',
        level: 'U15 · Performance',
        memberCount: 18,
        primaryCoach: 'coach5',
        meetLocation: 'Phoenix Training Ground',
    },
    {
        id: 'squad_phoenix_dev',
        clubId: 'club_phoenix',
        name: 'Development Squad',
        level: 'U13 · Foundation',
        memberCount: 22,
        primaryCoach: 'coach7',
        meetLocation: 'Phoenix Training Ground',
    },
    {
        id: 'squad_nlu_elite',
        clubId: 'club_united',
        name: 'Elite First Team',
        level: 'U16 · Competitive',
        memberCount: 18,
        primaryCoach: 'coach6',
        meetLocation: 'United Stadium',
    },
    {
        id: 'squad_nlu_academy',
        clubId: 'club_united',
        name: 'Academy Pathway',
        level: 'U14 · Development',
        memberCount: 24,
        primaryCoach: 'coach1',
        meetLocation: 'United Training Pitch',
    },
    {
        id: 'squad_nlu_tots',
        clubId: 'club_united',
        name: 'Mini Kickers',
        level: 'U8 · Fun Football',
        memberCount: 30,
        primaryCoach: 'coach2',
        meetLocation: 'Community Centre',
    },
];
// Cache for custom squads (created by users)
let customSquadsCache = [];
async function loadCustomSquads() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CLUB_SQUADS, null);
        if (stored) {
            customSquadsCache = stored;
            return customSquadsCache;
        }
    }
    catch (error) {
        logger.error('Failed to load custom squads', error);
    }
    return [];
}
async function saveCustomSquads(squads) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CLUB_SQUADS, squads);
        customSquadsCache = squads;
    }
    catch (error) {
        logger.error('Failed to save custom squads', error);
    }
}
// Mock squad members data
const MOCK_SQUAD_MEMBERS = [
    // U15 Performance Squad members
    {
        id: 'sm_1',
        squadId: 'squad_u15',
        athleteId: 'athlete_tom',
        parentId: 'parent1',
        status: 'ACTIVE',
        joinedAt: '2024-09-01',
        position: 'Midfielder',
        jerseyNumber: 10,
    },
    {
        id: 'sm_2',
        squadId: 'squad_u15',
        athleteId: 'athlete_james',
        parentId: 'parent2',
        status: 'ACTIVE',
        joinedAt: '2024-09-01',
        position: 'Forward',
        jerseyNumber: 9,
    },
    {
        id: 'sm_3',
        squadId: 'squad_u15',
        athleteId: 'athlete_maya',
        parentId: 'parent3',
        status: 'ACTIVE',
        joinedAt: '2024-09-15',
        position: 'Defender',
        jerseyNumber: 4,
    },
    {
        id: 'sm_4',
        squadId: 'squad_u15',
        athleteId: 'athlete_ethan',
        parentId: 'parent4',
        status: 'ACTIVE',
        joinedAt: '2024-09-01',
        position: 'Goalkeeper',
        jerseyNumber: 1,
    },
    {
        id: 'sm_5',
        squadId: 'squad_u15',
        athleteId: 'athlete_sophie',
        parentId: 'parent5',
        status: 'ACTIVE',
        joinedAt: '2024-10-01',
        position: 'Midfielder',
        jerseyNumber: 8,
    },
    // Junior Skills Squad members
    {
        id: 'sm_6',
        squadId: 'squad_juniors',
        athleteId: 'athlete_lucy',
        parentId: 'parent1',
        status: 'ACTIVE',
        joinedAt: '2024-09-01',
        position: 'Forward',
        jerseyNumber: 7,
    },
    {
        id: 'sm_7',
        squadId: 'squad_juniors',
        athleteId: 'athlete_jack',
        parentId: 'parent6',
        status: 'ACTIVE',
        joinedAt: '2024-09-01',
        position: 'Midfielder',
        jerseyNumber: 11,
    },
    {
        id: 'sm_8',
        squadId: 'squad_juniors',
        athleteId: 'athlete_olivia',
        parentId: 'parent7',
        status: 'ACTIVE',
        joinedAt: '2024-09-15',
        position: 'Defender',
        jerseyNumber: 3,
    },
    {
        id: 'sm_9',
        squadId: 'squad_juniors',
        athleteId: 'athlete_noah',
        parentId: 'parent8',
        status: 'ACTIVE',
        joinedAt: '2024-10-01',
        position: 'Goalkeeper',
        jerseyNumber: 1,
    },
    {
        id: 'sm_10',
        squadId: 'squad_juniors',
        athleteId: 'athlete_ava',
        parentId: 'parent9',
        status: 'ACTIVE',
        joinedAt: '2024-09-01',
        position: 'Forward',
        jerseyNumber: 10,
    },
    {
        id: 'sm_11',
        squadId: 'squad_juniors',
        athleteId: 'athlete_liam',
        parentId: 'parent10',
        status: 'ACTIVE',
        joinedAt: '2024-10-15',
        position: 'Midfielder',
        jerseyNumber: 6,
    },
];
let membersCache = [...MOCK_SQUAD_MEMBERS];
async function loadMembers() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SQUAD_MEMBERS, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load members', error);
    }
    return [...MOCK_SQUAD_MEMBERS];
}
exports.squadService = {
    /**
     * Get all squads for a club
     */
    async getSquads(clubId) {
        if (USE_MOCK) {
            const custom = await loadCustomSquads();
            const mockSquads = BASE_CLUB_SQUADS.filter((s) => s.clubId === clubId);
            const customForClub = custom.filter((s) => s.clubId === clubId);
            return [...mockSquads, ...customForClub];
        }
        const response = await fetch(`/api/clubs/${clubId}/squads`);
        return response.json();
    },
    /**
     * Get a single squad by ID
     */
    async getSquad(squadId) {
        if (USE_MOCK) {
            const fromMock = BASE_CLUB_SQUADS.find((s) => s.id === squadId);
            if (fromMock)
                return fromMock;
            const custom = await loadCustomSquads();
            return custom.find((s) => s.id === squadId) || null;
        }
        const response = await fetch(`/api/squads/${squadId}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Create a new squad
     */
    async createSquad(input) {
        const newSquad = {
            id: `squad_${Date.now()}`,
            clubId: input.clubId,
            name: input.name,
            level: input.level,
            memberCount: 0,
            description: input.description,
            meetLocation: input.meetingLocation ?? 'TBD',
            primaryCoach: 'coach1',
        };
        if (USE_MOCK) {
            const custom = await loadCustomSquads();
            custom.push(newSquad);
            await saveCustomSquads(custom);
            logger.info('Squad created', { squadId: newSquad.id, name: newSquad.name });
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SQUAD_CREATED, {
                squadId: newSquad.id,
                clubId: newSquad.clubId,
                squadName: newSquad.name,
                createdBy: newSquad.primaryCoach,
            });
            return newSquad;
        }
        const response = await fetch('/api/squads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSquad),
        });
        const created = await response.json();
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SQUAD_CREATED, {
            squadId: created.id,
            clubId: created.clubId,
            squadName: created.name,
            createdBy: created.primaryCoach,
        });
        return created;
    },
    /**
     * Get all members of a squad
     */
    async getSquadMembers(squadId) {
        if (USE_MOCK) {
            membersCache = await loadMembers();
            return membersCache.filter((m) => m.squadId === squadId && m.status === 'ACTIVE');
        }
        const response = await fetch(`/api/squads/${squadId}/members`);
        return response.json();
    },
    /**
     * Get members of multiple squads
     */
    async getMembersForSquads(squadIds) {
        if (USE_MOCK) {
            membersCache = await loadMembers();
            return membersCache.filter((m) => squadIds.includes(m.squadId) && m.status === 'ACTIVE');
        }
        const response = await fetch(`/api/squads/members?squadIds=${squadIds.join(',')}`);
        return response.json();
    },
    /**
     * Get all unique parents for a squad (for sending notifications)
     */
    async getSquadParents(squadId) {
        const members = await this.getSquadMembers(squadId);
        const parentMap = new Map();
        for (const m of members) {
            const [athleteName, parentName, parentEmail] = await Promise.all([
                resolveUserName(m.athleteId, 'Athlete'),
                resolveUserName(m.parentId, 'Parent'),
                resolveUserEmail(m.parentId),
            ]);
            const existing = parentMap.get(m.parentId);
            if (existing) {
                existing.athletes.push(athleteName);
            }
            else {
                parentMap.set(m.parentId, {
                    parentId: m.parentId,
                    parentName,
                    parentEmail,
                    athletes: [athleteName],
                });
            }
        }
        return Array.from(parentMap.values());
    },
    /**
     * Get squad member count
     */
    async getSquadMemberCount(squadId) {
        const members = await this.getSquadMembers(squadId);
        return members.length;
    },
    /**
     * Get squads that a user coaches
     */
    async getCoachSquads(coachId, clubId) {
        const squads = await this.getSquads(clubId);
        // Filter by coach assignment - show squads where coach is primary coach
        // Also include squads without a coach assigned (for assignment)
        return squads.filter((s) => s.id !== 'squad_staff' &&
            (s.primaryCoach === coachId || !s.primaryCoach));
    },
    /**
     * Get squad summary for display
     */
    async getSquadSummary(squadId) {
        const [squad, members] = await Promise.all([
            this.getSquad(squadId),
            this.getSquadMembers(squadId),
        ]);
        const uniqueParents = new Set(members.map((m) => m.parentId));
        return {
            squad,
            memberCount: members.length,
            parentCount: uniqueParents.size,
        };
    },
    /**
     * Format squad name with member count for display
     */
    formatSquadLabel(squad) {
        return `${squad.name} (${squad.memberCount} athletes)`;
    },
    /**
     * Get age group label from squad level
     */
    getAgeGroupLabel(squad) {
        // Extract age group from level string (e.g., "U15 · Competitive" -> "U15")
        const match = squad.level.match(/U\d+/);
        return match ? match[0] : squad.level.split('·')[0].trim();
    },
};
