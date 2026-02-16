"use strict";
/**
 * Club Service
 *
 * Handles club management operations including member management,
 * club branding, dashboard stats, and calendar data aggregation.
 *
 * API Integration Notes:
 * - GET /api/clubs/:id/members - Get club members
 * - DELETE /api/clubs/:id/members/:userId - Remove member
 * - GET /api/clubs/:id/members/removed - Get removal history
 * - POST /api/clubs/:id/members/removed/:recordId/undo - Undo removal
 * - GET /api/clubs/:id/branding - Get club branding
 * - PUT /api/clubs/:id/branding - Update club branding
 * - GET /api/clubs/:id/dashboard-stats - Get dashboard stats
 * - GET /api/clubs/:id/calendar - Get calendar events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clubService = void 0;
const api_client_1 = require("./api-client");
const result_1 = require("@/types/result");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("./event-bus");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('ClubService');
const USE_MOCK = config_1.api.useMock;
// ============================================================================
// MOCK BRANDING DATA
// ============================================================================
const MOCK_BRANDING = {
    default: {
        clubId: 'default',
        name: 'Riverside FC',
        tagline: 'Development through football',
        badgeUrl: '',
        coverPhotoUrl: '',
        primaryColor: '#0F172A',
        secondaryColor: '#1C8C5E',
        updatedAt: new Date().toISOString(),
    },
};
// ============================================================================
// MOCK DASHBOARD DATA
// ============================================================================
const MOCK_MATCH_RESULTS = [
    {
        id: 'm1',
        opponent: 'Valley United',
        date: '2026-02-01',
        scoreHome: 3,
        scoreAway: 1,
        outcome: 'W',
        squad: 'U15',
    },
    {
        id: 'm2',
        opponent: 'City Rangers',
        date: '2026-01-25',
        scoreHome: 1,
        scoreAway: 1,
        outcome: 'D',
        squad: 'U15',
    },
    {
        id: 'm3',
        opponent: 'Park Athletic',
        date: '2026-01-18',
        scoreHome: 0,
        scoreAway: 2,
        outcome: 'L',
        squad: 'Juniors',
    },
];
// ============================================================================
// MOCK CALENDAR DATA
// ============================================================================
const MOCK_CALENDAR_EVENTS = [
    {
        id: 'ce1',
        title: 'U15 Training',
        date: '2026-02-05',
        startTime: '17:00',
        endTime: '18:30',
        type: 'session',
        squadId: 'squad_u15',
        squadName: 'U15',
        location: 'Main Pitch',
    },
    {
        id: 'ce2',
        title: 'U15 vs Valley United',
        date: '2026-02-08',
        startTime: '10:00',
        endTime: '12:00',
        type: 'match',
        squadId: 'squad_u15',
        squadName: 'U15',
        location: 'Away Ground',
    },
    {
        id: 'ce3',
        title: 'Juniors Training',
        date: '2026-02-05',
        startTime: '16:00',
        endTime: '17:00',
        type: 'session',
        squadId: 'squad_juniors',
        squadName: 'Juniors',
        location: 'Main Pitch',
    },
    {
        id: 'ce4',
        title: 'Club Social Evening',
        date: '2026-02-14',
        startTime: '18:00',
        endTime: '21:00',
        type: 'event',
        location: 'Clubhouse',
    },
    {
        id: 'ce5',
        title: 'U15 Training',
        date: '2026-02-07',
        startTime: '17:00',
        endTime: '18:30',
        type: 'session',
        squadId: 'squad_u15',
        squadName: 'U15',
        location: 'Main Pitch',
    },
    {
        id: 'ce6',
        title: 'Juniors vs Park Athletic',
        date: '2026-02-15',
        startTime: '09:00',
        endTime: '10:30',
        type: 'match',
        squadId: 'squad_juniors',
        squadName: 'Juniors',
        location: 'Home Ground',
    },
    {
        id: 'ce7',
        title: 'U15 Training',
        date: '2026-02-12',
        startTime: '17:00',
        endTime: '18:30',
        type: 'session',
        squadId: 'squad_u15',
        squadName: 'U15',
        location: 'Main Pitch',
    },
    {
        id: 'ce8',
        title: 'Juniors Training',
        date: '2026-02-12',
        startTime: '16:00',
        endTime: '17:00',
        type: 'session',
        squadId: 'squad_juniors',
        squadName: 'Juniors',
        location: 'Main Pitch',
    },
    {
        id: 'ce9',
        title: 'Coaches Meeting',
        date: '2026-02-10',
        startTime: '19:00',
        endTime: '20:00',
        type: 'event',
        location: 'Clubhouse',
    },
    {
        id: 'ce10',
        title: 'U15 Cup Match',
        date: '2026-02-22',
        startTime: '14:00',
        endTime: '16:00',
        type: 'match',
        squadId: 'squad_u15',
        squadName: 'U15',
        location: 'Neutral Venue',
    },
    {
        id: 'ce11',
        title: 'End of Term Awards',
        date: '2026-02-28',
        startTime: '17:00',
        endTime: '19:00',
        type: 'event',
        location: 'Clubhouse',
    },
    {
        id: 'ce12',
        title: 'U15 Training',
        date: '2026-02-19',
        startTime: '17:00',
        endTime: '18:30',
        type: 'session',
        squadId: 'squad_u15',
        squadName: 'U15',
        location: 'Main Pitch',
    },
    {
        id: 'ce13',
        title: 'Juniors Training',
        date: '2026-02-19',
        startTime: '16:00',
        endTime: '17:00',
        type: 'session',
        squadId: 'squad_juniors',
        squadName: 'Juniors',
        location: 'Main Pitch',
    },
    {
        id: 'ce14',
        title: 'Juniors Training',
        date: '2026-02-26',
        startTime: '16:00',
        endTime: '17:00',
        type: 'session',
        squadId: 'squad_juniors',
        squadName: 'Juniors',
        location: 'Main Pitch',
    },
    {
        id: 'ce15',
        title: 'U15 Training',
        date: '2026-02-26',
        startTime: '17:00',
        endTime: '18:30',
        type: 'session',
        squadId: 'squad_u15',
        squadName: 'U15',
        location: 'Main Pitch',
    },
];
// Mock members data
const MOCK_MEMBERS = [
    {
        userId: 'coach1',
        userName: 'Director Kelly',
        role: 'OWNER',
        status: 'active',
        joinedAt: '2024-01-15',
        squadIds: ['squad_u15', 'squad_juniors'],
    },
    {
        userId: 'coach2',
        userName: 'Sarah Mitchell',
        role: 'COACH',
        status: 'active',
        joinedAt: '2024-03-20',
        squadIds: ['squad_u15'],
    },
    {
        userId: 'coach3',
        userName: 'Mike Thompson',
        role: 'COACH',
        status: 'pending',
        joinedAt: '2024-11-10',
        squadIds: ['squad_juniors'],
    },
    {
        userId: 'parent1',
        userName: 'Sarah Baker',
        role: 'MEMBER',
        status: 'active',
        joinedAt: '2024-06-01',
    },
    {
        userId: 'parent2',
        userName: 'Mike Wilson',
        role: 'MEMBER',
        status: 'active',
        joinedAt: '2024-07-15',
    },
];
let membersCache = new Map();
let removalHistoryCache = [];
async function loadMembers(clubId) {
    try {
        const stored = await api_client_1.apiClient.get(`${storage_keys_1.STORAGE_KEYS.CLUB_MEMBERS}_${clubId}`, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load members', error);
    }
    return [...MOCK_MEMBERS];
}
async function saveMembers(clubId, members) {
    try {
        await api_client_1.apiClient.set(`${storage_keys_1.STORAGE_KEYS.CLUB_MEMBERS}_${clubId}`, members);
        membersCache.set(clubId, members);
    }
    catch (error) {
        logger.error('Failed to save members', error);
    }
}
async function loadRemovalHistory() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CLUB_MEMBER_REMOVALS, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load removal history', error);
    }
    return [];
}
async function saveRemovalHistory(history) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CLUB_MEMBER_REMOVALS, history);
    }
    catch (error) {
        logger.error('Failed to save removal history', error);
    }
}
exports.clubService = {
    /**
     * Get all members of a club
     */
    async getMembers(clubId) {
        if (USE_MOCK) {
            if (!membersCache.has(clubId)) {
                const members = await loadMembers(clubId);
                membersCache.set(clubId, members);
            }
            return membersCache.get(clubId) || [];
        }
        const response = await fetch(`/api/clubs/${clubId}/members`);
        return response.json();
    },
    /**
     * Remove a member from the club
     */
    async removeMember(clubId, userId, reason, removedBy, options) {
        if (USE_MOCK) {
            const members = await loadMembers(clubId);
            const memberIndex = members.findIndex((m) => m.userId === userId);
            if (memberIndex === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Member', userId));
            }
            const member = members[memberIndex];
            // Create removal record
            const removalRecord = {
                id: `member_removal_${Date.now()}`,
                clubId,
                userId,
                userName: member.userName,
                userRole: member.role,
                reason,
                customReason: options?.customReason,
                removedBy: removedBy.id,
                removedByName: removedBy.name,
                removedAt: new Date().toISOString(),
                originalMembership: {
                    clubId,
                    userId: member.userId,
                    role: member.role,
                    status: member.status === 'banned' ? 'active' : member.status,
                    joinSource: 'invite',
                    squadIds: member.squadIds,
                },
            };
            // Remove from members
            members.splice(memberIndex, 1);
            await saveMembers(clubId, members);
            // Save to removal history
            removalHistoryCache = await loadRemovalHistory();
            removalHistoryCache.unshift(removalRecord);
            await saveRemovalHistory(removalHistoryCache);
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.CLUB_MEMBER_LEFT, { clubId, userId });
            return (0, result_1.ok)(removalRecord);
        }
        const response = await fetch(`/api/clubs/${clubId}/members/${userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reason,
                customReason: options?.customReason,
                removedBy: removedBy.id,
            }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Undo member removal (restore membership)
     */
    async undoRemoval(clubId, removalId) {
        if (USE_MOCK) {
            removalHistoryCache = await loadRemovalHistory();
            const recordIndex = removalHistoryCache.findIndex((r) => r.id === removalId && r.clubId === clubId);
            if (recordIndex === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Removal record', removalId));
            }
            const record = removalHistoryCache[recordIndex];
            if (!record.originalMembership) {
                return (0, result_1.err)((0, result_1.validationError)('Cannot restore - membership data not available'));
            }
            // Restore member
            const members = await loadMembers(clubId);
            const restoredMember = {
                userId: record.userId,
                userName: record.userName,
                role: record.userRole,
                status: 'active',
                joinedAt: new Date().toISOString(),
                squadIds: record.originalMembership.squadIds,
            };
            members.push(restoredMember);
            await saveMembers(clubId, members);
            // Remove from removal history
            removalHistoryCache.splice(recordIndex, 1);
            await saveRemovalHistory(removalHistoryCache);
            return (0, result_1.ok)(restoredMember);
        }
        const response = await fetch(`/api/clubs/${clubId}/members/removed/${removalId}/undo`, {
            method: 'POST',
        });
        if (!response.ok)
            return (0, result_1.err)((0, result_1.notFound)('Removal record', removalId));
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Get removal history for a club
     */
    async getRemovalHistory(clubId) {
        if (USE_MOCK) {
            removalHistoryCache = await loadRemovalHistory();
            return removalHistoryCache.filter((r) => r.clubId === clubId);
        }
        const response = await fetch(`/api/clubs/${clubId}/members/removed`);
        return response.json();
    },
    /**
     * Check if user can remove members (must be OWNER, ADMIN, or HEAD_COACH)
     */
    canRemoveMembers(userRole) {
        return ['OWNER', 'ADMIN', 'HEAD_COACH'].includes(userRole);
    },
    /**
     * Check if user can be removed (OWNER cannot be removed)
     */
    canBeRemoved(memberRole) {
        return memberRole !== 'OWNER';
    },
    /**
     * Change a member's role
     */
    async changeMemberRole(clubId, userId, newRole, changedBy) {
        if (USE_MOCK) {
            const members = await loadMembers(clubId);
            const memberIndex = members.findIndex((m) => m.userId === userId);
            if (memberIndex === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Member', userId));
            }
            if (members[memberIndex].role === 'OWNER') {
                return (0, result_1.err)((0, result_1.validationError)('Cannot change the role of the club owner'));
            }
            members[memberIndex].role = newRole;
            await saveMembers(clubId, members);
            logger.info('MemberRoleChanged', { clubId, userId, newRole, changedBy: changedBy.id });
            return (0, result_1.ok)(members[memberIndex]);
        }
        const response = await fetch(`/api/clubs/${clubId}/members/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole, changedBy: changedBy.id }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Ban a member from the club
     */
    async banMember(clubId, userId, reason, bannedBy) {
        if (USE_MOCK) {
            const members = await loadMembers(clubId);
            const memberIndex = members.findIndex((m) => m.userId === userId);
            if (memberIndex === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Member', userId));
            }
            const member = members[memberIndex];
            if (member.role === 'OWNER') {
                return (0, result_1.err)((0, result_1.validationError)('Cannot ban the club owner'));
            }
            const removalRecord = {
                id: `member_ban_${Date.now()}`,
                clubId,
                userId,
                userName: member.userName,
                userRole: member.role,
                reason: 'CONDUCT',
                customReason: reason,
                removedBy: bannedBy.id,
                removedByName: bannedBy.name,
                removedAt: new Date().toISOString(),
                originalMembership: {
                    clubId,
                    userId: member.userId,
                    role: member.role,
                    status: member.status === 'banned' ? 'active' : member.status,
                    joinSource: 'invite',
                    squadIds: member.squadIds,
                },
            };
            members.splice(memberIndex, 1);
            await saveMembers(clubId, members);
            removalHistoryCache = await loadRemovalHistory();
            removalHistoryCache.unshift(removalRecord);
            await saveRemovalHistory(removalHistoryCache);
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.CLUB_MEMBER_LEFT, { clubId, userId });
            logger.info('MemberBanned', { clubId, userId, reason, bannedBy: bannedBy.id });
            return (0, result_1.ok)(removalRecord);
        }
        const response = await fetch(`/api/clubs/${clubId}/members/${userId}/ban`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason, bannedBy: bannedBy.id }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Get a single member by userId
     */
    async getMember(clubId, userId) {
        const members = await this.getMembers(clubId);
        return members.find((m) => m.userId === userId) || null;
    },
    /**
     * Add a member to a squad
     */
    async addMemberToSquad(clubId, userId, squadId) {
        if (USE_MOCK) {
            const members = await loadMembers(clubId);
            const memberIndex = members.findIndex((m) => m.userId === userId);
            if (memberIndex === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Member', userId));
            }
            const squadIds = members[memberIndex].squadIds || [];
            if (!squadIds.includes(squadId)) {
                squadIds.push(squadId);
                members[memberIndex].squadIds = squadIds;
                await saveMembers(clubId, members);
            }
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SQUAD_MEMBER_ADDED, {
                squadId,
                clubId,
                userId,
                userName: members[memberIndex].userName,
            });
            return (0, result_1.ok)(members[memberIndex]);
        }
        const response = await fetch(`/api/clubs/${clubId}/members/${userId}/squads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ squadId }),
        });
        const member = await response.json();
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SQUAD_MEMBER_ADDED, {
            squadId,
            clubId,
            userId,
            userName: member.userName,
        });
        return (0, result_1.ok)(member);
    },
    /**
     * Remove a member from a squad
     */
    async removeMemberFromSquad(clubId, userId, squadId) {
        if (USE_MOCK) {
            const members = await loadMembers(clubId);
            const memberIndex = members.findIndex((m) => m.userId === userId);
            if (memberIndex === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Member', userId));
            }
            const squadIds = members[memberIndex].squadIds || [];
            members[memberIndex].squadIds = squadIds.filter((id) => id !== squadId);
            await saveMembers(clubId, members);
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SQUAD_MEMBER_REMOVED, {
                squadId,
                clubId,
                userId,
                userName: members[memberIndex].userName,
            });
            return (0, result_1.ok)(members[memberIndex]);
        }
        const response = await fetch(`/api/clubs/${clubId}/members/${userId}/squads/${squadId}`, {
            method: 'DELETE',
        });
        const member = await response.json();
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.SQUAD_MEMBER_REMOVED, {
            squadId,
            clubId,
            userId,
            userName: member.userName,
        });
        return (0, result_1.ok)(member);
    },
    /**
     * Check if a role can manage another role (hierarchy check)
     */
    canManageRole(managerRole, targetRole) {
        const hierarchy = {
            OWNER: 5,
            ADMIN: 4,
            HEAD_COACH: 3,
            COACH: 2,
            MEMBER: 1,
        };
        return hierarchy[managerRole] > hierarchy[targetRole];
    },
    /**
     * Get the list of roles a manager can assign to a target
     */
    getAssignableRoles(managerRole) {
        const hierarchy = {
            OWNER: 5,
            ADMIN: 4,
            HEAD_COACH: 3,
            COACH: 2,
            MEMBER: 1,
        };
        const managerLevel = hierarchy[managerRole];
        const allRoles = ['ADMIN', 'HEAD_COACH', 'COACH', 'MEMBER'];
        return allRoles.filter((role) => hierarchy[role] < managerLevel);
    },
    /**
     * Format removal reason for display
     */
    formatRemovalReason(reason) {
        const labels = {
            LEFT_CLUB: 'Left club',
            INACTIVE: 'Inactive',
            CONDUCT: 'Conduct issue',
            SEASON_END: 'Season ended',
            OTHER: 'Other',
        };
        return labels[reason] || reason;
    },
    /**
     * Format role for display
     */
    formatRole(role) {
        const labels = {
            OWNER: 'Owner',
            ADMIN: 'Admin',
            HEAD_COACH: 'Head Coach',
            COACH: 'Coach',
            MEMBER: 'Member',
        };
        return labels[role] || role;
    },
    /**
     * Get role color
     */
    getRoleColor(role) {
        const colors = {
            OWNER: '#7C3AED',
            ADMIN: '#2563EB',
            HEAD_COACH: '#16A34A',
            COACH: '#0891B2',
            MEMBER: '#6B7280',
        };
        return colors[role] || '#6B7280';
    },
    // ============================================================================
    // BRANDING
    // ============================================================================
    /**
     * Get club branding data
     */
    async getBranding(clubId) {
        if (USE_MOCK) {
            try {
                const stored = await api_client_1.apiClient.get(`${storage_keys_1.STORAGE_KEYS.CLUB_BRANDING}_${clubId}`, null);
                if (stored)
                    return stored;
            }
            catch (error) {
                logger.error('Failed to load branding', error);
            }
            return { ...MOCK_BRANDING.default, clubId };
        }
        const response = await fetch(`/api/clubs/${clubId}/branding`);
        return response.json();
    },
    /**
     * Update club branding
     */
    async updateBranding(clubId, branding) {
        const current = await this.getBranding(clubId);
        const updated = {
            ...current,
            ...branding,
            clubId,
            updatedAt: new Date().toISOString(),
        };
        if (USE_MOCK) {
            try {
                await api_client_1.apiClient.set(`${storage_keys_1.STORAGE_KEYS.CLUB_BRANDING}_${clubId}`, updated);
                logger.info('Branding updated', { clubId });
            }
            catch (error) {
                logger.error('Failed to save branding', error);
                return (0, result_1.err)((0, result_1.storageError)('Failed to save branding'));
            }
            return (0, result_1.ok)(updated);
        }
        const response = await fetch(`/api/clubs/${clubId}/branding`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
        });
        return (0, result_1.ok)(await response.json());
    },
    // ============================================================================
    // DASHBOARD
    // ============================================================================
    /**
     * Get dashboard statistics for a club
     */
    async getDashboardStats(clubId) {
        if (USE_MOCK) {
            const members = await this.getMembers(clubId);
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);
            const weekEvents = MOCK_CALENDAR_EVENTS.filter((e) => {
                const d = new Date(e.date);
                return d >= startOfWeek && d < endOfWeek;
            });
            return {
                sessionsThisWeek: weekEvents.filter((e) => e.type === 'session').length,
                matchesThisWeek: weekEvents.filter((e) => e.type === 'match').length,
                upcomingEvents: MOCK_CALENDAR_EVENTS.filter((e) => {
                    return e.type === 'event' && new Date(e.date) >= now;
                }).length,
                memberCount: members.length,
            };
        }
        const response = await fetch(`/api/clubs/${clubId}/dashboard-stats`);
        return response.json();
    },
    /**
     * Get recent match results
     */
    async getRecentResults(clubId, limit = 3) {
        if (USE_MOCK) {
            return MOCK_MATCH_RESULTS.slice(0, limit);
        }
        const response = await fetch(`/api/clubs/${clubId}/results?limit=${limit}`);
        return response.json();
    },
    // ============================================================================
    // CALENDAR
    // ============================================================================
    /**
     * Get calendar events for a club, optionally filtered by month and squad
     */
    async getCalendarEvents(clubId, options) {
        if (USE_MOCK) {
            let events = [...MOCK_CALENDAR_EVENTS];
            if (options?.year !== undefined && options?.month !== undefined) {
                events = events.filter((e) => {
                    const d = new Date(e.date);
                    return d.getFullYear() === options.year && d.getMonth() === options.month;
                });
            }
            if (options?.squadId) {
                events = events.filter((e) => e.squadId === options.squadId || !e.squadId);
            }
            return events.sort((a, b) => {
                const dateCompare = a.date.localeCompare(b.date);
                if (dateCompare !== 0)
                    return dateCompare;
                return a.startTime.localeCompare(b.startTime);
            });
        }
        const params = new URLSearchParams();
        if (options?.year !== undefined)
            params.set('year', String(options.year));
        if (options?.month !== undefined)
            params.set('month', String(options.month));
        if (options?.squadId)
            params.set('squadId', options.squadId);
        const response = await fetch(`/api/clubs/${clubId}/calendar?${params.toString()}`);
        return response.json();
    },
    /**
     * Get unique squads from calendar events (for filter)
     */
    async getCalendarSquads(clubId) {
        if (USE_MOCK) {
            const seen = new Map();
            for (const event of MOCK_CALENDAR_EVENTS) {
                if (event.squadId && event.squadName && !seen.has(event.squadId)) {
                    seen.set(event.squadId, event.squadName);
                }
            }
            return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
        }
        const response = await fetch(`/api/clubs/${clubId}/squads`);
        return response.json();
    },
};
