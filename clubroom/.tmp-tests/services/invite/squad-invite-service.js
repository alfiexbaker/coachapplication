"use strict";
/**
 * Squad Invite Service
 *
 * Handles squad-level invitation functionality including:
 * - Squad invite previews
 * - Squad session invites tracking
 * - Squad member selection with metadata
 * - Invite history for squads
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.squadInviteService = void 0;
exports.loadSquadInvites = loadSquadInvites;
exports.saveSquadInvites = saveSquadInvites;
exports.loadSquadSessionInvites = loadSquadSessionInvites;
exports.saveSquadSessionInvites = saveSquadSessionInvites;
exports.loadInviteHistory = loadInviteHistory;
exports.saveInviteHistory = saveInviteHistory;
exports.getSquadInvitesCache = getSquadInvitesCache;
exports.setSquadInvitesCache = setSquadInvitesCache;
exports.getSquadSessionInvitesCache = getSquadSessionInvitesCache;
exports.setSquadSessionInvitesCache = setSquadSessionInvitesCache;
exports.getInviteHistoryCache = getInviteHistoryCache;
exports.setInviteHistoryCache = setInviteHistoryCache;
const api_client_1 = require("../api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const squad_service_1 = require("../squad-service");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('SquadInviteService');
const USE_MOCK = config_1.api.useMock;
// ============================================================================
// STORAGE & CACHING
// ============================================================================
let squadInvitesCache = [];
let squadSessionInvitesCache = [];
let inviteHistoryCache = [];
async function loadSquadInvites() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, []);
    }
    catch (error) {
        logger.error('Failed to load squad invites', error);
    }
    return [];
}
async function saveSquadInvites(invites) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES, invites);
        squadInvitesCache = invites;
    }
    catch (error) {
        logger.error('Failed to save squad invites', error);
    }
}
async function loadSquadSessionInvites() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SQUAD_SESSION_INVITES, []);
    }
    catch (error) {
        logger.error('Failed to load squad session invites', error);
    }
    return [];
}
async function saveSquadSessionInvites(invites) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_SESSION_INVITES, invites);
        squadSessionInvitesCache = invites;
    }
    catch (error) {
        logger.error('Failed to save squad session invites', error);
    }
}
async function loadInviteHistory() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SQUAD_INVITE_HISTORY, []);
    }
    catch (error) {
        logger.error('Failed to load invite history', error);
    }
    return [];
}
async function saveInviteHistory(history) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_INVITE_HISTORY, history);
        inviteHistoryCache = history;
    }
    catch (error) {
        logger.error('Failed to save invite history', error);
    }
}
// Export cache getters/setters for use by other services
function getSquadInvitesCache() {
    return squadInvitesCache;
}
function setSquadInvitesCache(invites) {
    squadInvitesCache = invites;
}
function getSquadSessionInvitesCache() {
    return squadSessionInvitesCache;
}
function setSquadSessionInvitesCache(invites) {
    squadSessionInvitesCache = invites;
}
function getInviteHistoryCache() {
    return inviteHistoryCache;
}
function setInviteHistoryCache(history) {
    inviteHistoryCache = history;
}
// ============================================================================
// SQUAD INVITE SERVICE
// ============================================================================
exports.squadInviteService = {
    // ==========================================================================
    // PREVIEW METHODS
    // ==========================================================================
    /**
     * Get squad invite preview - shows how many athletes/parents will be invited
     */
    async getSquadInvitePreview(squadId, excludeMemberIds = []) {
        const squad = await squad_service_1.squadService.getSquad(squadId);
        const members = await squad_service_1.squadService.getSquadMembers(squadId);
        const eligibleMembers = members.filter((m) => !excludeMemberIds.includes(m.athleteId));
        const uniqueParents = new Set(eligibleMembers.map((m) => m.parentId));
        return {
            squadId,
            squadName: squad?.name || 'Unknown Squad',
            memberCount: eligibleMembers.length,
            members: eligibleMembers.map((m) => ({
                athleteId: m.athleteId,
                athleteName: m.athleteName,
                athleteAge: m.athleteAge,
                parentId: m.parentId,
                parentName: m.parentName,
            })),
            uniqueParentCount: uniqueParents.size,
        };
    },
    /**
     * Get preview for multiple squads
     */
    async getMultipleSquadsPreview(squadIds, excludeMemberIds = []) {
        const previews = await Promise.all(squadIds.map((id) => this.getSquadInvitePreview(id, excludeMemberIds)));
        // Count unique parents across all squads
        const allParentIds = new Set();
        previews.forEach((p) => {
            p.members.forEach((m) => allParentIds.add(m.parentId));
        });
        return {
            squads: previews,
            totalMembers: previews.reduce((sum, p) => sum + p.memberCount, 0),
            totalParents: allParentIds.size,
        };
    },
    // ==========================================================================
    // SQUAD INVITE QUERY METHODS
    // ==========================================================================
    /**
     * Get all squad invites for a specific target
     */
    async getSquadInvitesForTarget(targetType, targetId) {
        squadInvitesCache = await loadSquadInvites();
        return squadInvitesCache.filter((si) => si.targetType === targetType && si.targetId === targetId);
    },
    /**
     * Get all squad invites by coach
     */
    async getSquadInvitesByCoach(coachId) {
        squadInvitesCache = await loadSquadInvites();
        return squadInvitesCache.filter((si) => si.invitedBy === coachId);
    },
    /**
     * Get all squad members with selection state
     */
    async getSquadMembers(squadId) {
        return squad_service_1.squadService.getSquadMembers(squadId);
    },
    /**
     * Get squad members with additional metadata for selection UI
     */
    async getSquadMembersWithMetadata(squadId, sessionId) {
        const members = await squad_service_1.squadService.getSquadMembers(squadId);
        // Get existing invites to check for pending ones
        let existingInviteMap = new Map();
        if (sessionId) {
            squadSessionInvitesCache = await loadSquadSessionInvites();
            const relatedInvites = squadSessionInvitesCache.filter((inv) => inv.squadId === squadId && inv.sessionId === sessionId);
            relatedInvites.forEach((inv) => {
                inv.invitedMembers.forEach((m) => {
                    if (m.status === 'SENT') {
                        existingInviteMap.set(m.athleteId, {
                            pending: true,
                            lastInvited: inv.sentAt,
                        });
                    }
                });
            });
        }
        return members.map((member) => ({
            ...member,
            isSelected: false,
            hasPendingInvite: existingInviteMap.get(member.athleteId)?.pending ?? false,
            lastInvitedAt: existingInviteMap.get(member.athleteId)?.lastInvited,
        }));
    },
    /**
     * Get squad members grouped by parent
     */
    async getSquadMembersGroupedByParent(squadId) {
        const members = await squad_service_1.squadService.getSquadMembers(squadId);
        const parentMap = new Map();
        members.forEach((member) => {
            const existing = parentMap.get(member.parentId);
            if (existing) {
                existing.athletes.push(member);
            }
            else {
                parentMap.set(member.parentId, {
                    parent: {
                        id: member.parentId,
                        name: member.parentName,
                        email: member.parentEmail,
                    },
                    athletes: [member],
                });
            }
        });
        return parentMap;
    },
    // ==========================================================================
    // INVITE HISTORY
    // ==========================================================================
    /**
     * Get invite history for a squad
     */
    async getSquadInviteHistory(squadId) {
        inviteHistoryCache = await loadInviteHistory();
        return inviteHistoryCache
            .filter((entry) => entry.squadId === squadId)
            .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    },
    /**
     * Get all invite history for a coach
     */
    async getCoachInviteHistory(coachId) {
        inviteHistoryCache = await loadInviteHistory();
        return inviteHistoryCache
            .filter((entry) => entry.sentBy === coachId)
            .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    },
    /**
     * Add entry to invite history
     */
    async addToInviteHistory(entry) {
        inviteHistoryCache = await loadInviteHistory();
        inviteHistoryCache.push(entry);
        await saveInviteHistory(inviteHistoryCache);
    },
    /**
     * Update invite history entry
     */
    async updateInviteHistoryEntry(entryId, updates) {
        inviteHistoryCache = await loadInviteHistory();
        const index = inviteHistoryCache.findIndex((e) => e.id === entryId);
        if (index !== -1) {
            inviteHistoryCache[index] = { ...inviteHistoryCache[index], ...updates };
            await saveInviteHistory(inviteHistoryCache);
        }
    },
    /**
     * Get squad session invite by ID
     */
    async getSquadSessionInvite(inviteId) {
        squadSessionInvitesCache = await loadSquadSessionInvites();
        return squadSessionInvitesCache.find((inv) => inv.id === inviteId) || null;
    },
    /**
     * Get all squad session invites for a session
     */
    async getInvitesForSession(sessionId) {
        squadSessionInvitesCache = await loadSquadSessionInvites();
        return squadSessionInvitesCache.filter((inv) => inv.sessionId === sessionId);
    },
    /**
     * Get squad session invites by coach
     */
    async getInvitesByCoach(coachId) {
        squadSessionInvitesCache = await loadSquadSessionInvites();
        return squadSessionInvitesCache
            .filter((inv) => inv.sentBy === coachId)
            .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    },
    // ==========================================================================
    // STATISTICS
    // ==========================================================================
    /**
     * Get summary stats for a squad's invite activity
     */
    async getSquadInviteStats(squadId) {
        const history = await this.getSquadInviteHistory(squadId);
        if (history.length === 0) {
            return {
                totalInvitesSent: 0,
                totalAccepted: 0,
                totalDeclined: 0,
                acceptanceRate: 0,
                lastInviteSentAt: null,
            };
        }
        const totalInvitesSent = history.reduce((sum, h) => sum + h.inviteCount, 0);
        const totalAccepted = history.reduce((sum, h) => sum + h.acceptedCount, 0);
        const totalDeclined = history.reduce((sum, h) => sum + h.declinedCount, 0);
        const totalResponded = totalAccepted + totalDeclined;
        const acceptanceRate = totalResponded > 0 ? (totalAccepted / totalResponded) * 100 : 0;
        return {
            totalInvitesSent,
            totalAccepted,
            totalDeclined,
            acceptanceRate,
            lastInviteSentAt: history[0]?.sentAt || null,
        };
    },
    /**
     * Check if member has already been invited to a session
     */
    async hasMemberBeenInvited(memberId, sessionId) {
        squadSessionInvitesCache = await loadSquadSessionInvites();
        return squadSessionInvitesCache.some((inv) => inv.sessionId === sessionId &&
            inv.invitedMembers.some((m) => m.memberId === memberId && m.status === 'SENT'));
    },
    /**
     * Calculate how many unique notifications will be sent
     */
    async calculateNotificationCount(memberIds, squadId) {
        const members = await squad_service_1.squadService.getSquadMembers(squadId);
        const selectedMembers = members.filter((m) => memberIds.includes(m.id));
        const uniqueParents = new Set(selectedMembers.map((m) => m.parentId));
        return uniqueParents.size;
    },
    /**
     * Clear all squad invite caches (for testing)
     */
    async clearCache() {
        squadInvitesCache = [];
        squadSessionInvitesCache = [];
        inviteHistoryCache = [];
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SQUAD_INVITES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SQUAD_SESSION_INVITES);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SQUAD_INVITE_HISTORY);
    },
};
