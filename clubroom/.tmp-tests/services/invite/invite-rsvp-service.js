"use strict";
/**
 * Invite RSVP Service
 *
 * Facebook-style Going / Maybe / Can't Go RSVP responses on session invites.
 * Manages RSVP responses, counts, and respondent lists.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteRsvpService = void 0;
const api_client_1 = require("../api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("@/services/event-bus");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('InviteRsvpService');
const MOCK_INVITE_RSVPS = [
    {
        id: 'invite_rsvp_seed_1',
        inviteId: 'inv_group_rsvp_1',
        userId: 'user1',
        userName: 'Sarah Baker',
        childId: 'athlete_1',
        childName: 'Tom Henderson',
        status: 'going',
        respondedAt: '2026-02-10T12:40:00Z',
    },
    {
        id: 'invite_rsvp_seed_2',
        inviteId: 'inv_group_rsvp_1',
        userId: 'user2',
        userName: 'James Henderson',
        childId: 'athlete_3',
        childName: 'Mia Patel',
        status: 'maybe',
        respondedAt: '2026-02-10T13:05:00Z',
    },
    {
        id: 'invite_rsvp_seed_3',
        inviteId: 'inv_group_rsvp_1',
        userId: 'user5',
        userName: 'Priya Shah',
        childId: 'athlete_4',
        childName: 'Luca Bell',
        status: 'cant_go',
        respondedAt: '2026-02-10T14:25:00Z',
    },
];
async function loadResponses() {
    const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.INVITE_RSVPS, null);
    return stored ?? [...MOCK_INVITE_RSVPS];
}
async function saveResponses(responses) {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.INVITE_RSVPS, responses);
}
/**
 * Sync rsvpCounts on the SessionInvite object in storage
 * so carousel/card UIs reading invite.rsvpCounts get fresh data.
 */
async function syncCountsToInvite(inviteId, allResponses) {
    try {
        const invites = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, []);
        const idx = invites.findIndex((inv) => inv.id === inviteId);
        if (idx === -1)
            return;
        const inviteResponses = allResponses.filter((r) => r.inviteId === inviteId);
        invites[idx] = {
            ...invites[idx],
            rsvpCounts: {
                going: inviteResponses.filter((r) => r.status === 'going').length,
                maybe: inviteResponses.filter((r) => r.status === 'maybe').length,
                cantGo: inviteResponses.filter((r) => r.status === 'cant_go').length,
            },
        };
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, invites);
    }
    catch (e) {
        logger.warn('Failed to sync RSVP counts to invite', e);
    }
}
exports.inviteRsvpService = {
    /**
     * Store an RSVP response for an invite.
     * If the user has already responded, updates the existing response.
     */
    async respondToInvite(inviteId, userId, userName, status, childId, childName, userPhotoUrl) {
        try {
            const allResponses = await loadResponses();
            // Check for existing response from this user on this invite
            const existingIndex = allResponses.findIndex((r) => r.inviteId === inviteId && r.userId === userId);
            const response = {
                id: existingIndex >= 0 ? allResponses[existingIndex].id : `rsvp_${Date.now()}_${userId}`,
                inviteId,
                userId,
                userName,
                userPhotoUrl,
                childId,
                childName,
                status,
                respondedAt: new Date().toISOString(),
            };
            if (existingIndex >= 0) {
                allResponses[existingIndex] = response;
            }
            else {
                allResponses.push(response);
            }
            await saveResponses(allResponses);
            // Sync counts back to the invite object so card/carousel UIs stay fresh
            await syncCountsToInvite(inviteId, allResponses);
            // Emit event
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.INVITE_RSVP_RESPONDED, {
                inviteId,
                responseId: response.id,
                userId,
                userName,
                status,
                childName,
            });
            logger.info('RSVP response recorded', { inviteId, userId, status });
            return (0, result_1.ok)(response);
        }
        catch (error) {
            logger.error('Failed to record RSVP response', error);
            return (0, result_1.err)((0, result_1.serviceError)('STORAGE', 'Failed to record RSVP response'));
        }
    },
    /**
     * Get all RSVP responses for an invite.
     */
    async getResponses(inviteId) {
        try {
            const allResponses = await loadResponses();
            const filtered = allResponses.filter((r) => r.inviteId === inviteId);
            return (0, result_1.ok)(filtered);
        }
        catch (error) {
            logger.error('Failed to get RSVP responses', error);
            return (0, result_1.err)((0, result_1.serviceError)('STORAGE', 'Failed to get RSVP responses'));
        }
    },
    /**
     * Get RSVP counts for an invite.
     */
    async getCounts(inviteId) {
        try {
            const allResponses = await loadResponses();
            const inviteResponses = allResponses.filter((r) => r.inviteId === inviteId);
            const counts = {
                going: inviteResponses.filter((r) => r.status === 'going').length,
                maybe: inviteResponses.filter((r) => r.status === 'maybe').length,
                cantGo: inviteResponses.filter((r) => r.status === 'cant_go').length,
            };
            return (0, result_1.ok)(counts);
        }
        catch (error) {
            logger.error('Failed to get RSVP counts', error);
            return (0, result_1.err)((0, result_1.serviceError)('STORAGE', 'Failed to get RSVP counts'));
        }
    },
    /**
     * Get respondents filtered by status.
     */
    async getRespondents(inviteId, status) {
        try {
            const allResponses = await loadResponses();
            const filtered = allResponses.filter((r) => r.inviteId === inviteId && r.status === status);
            return (0, result_1.ok)(filtered);
        }
        catch (error) {
            logger.error('Failed to get respondents', error);
            return (0, result_1.err)((0, result_1.serviceError)('STORAGE', 'Failed to get respondents'));
        }
    },
    /**
     * Update an existing RSVP response status.
     */
    async updateResponse(responseId, newStatus) {
        try {
            const allResponses = await loadResponses();
            const index = allResponses.findIndex((r) => r.id === responseId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.serviceError)('NOT_FOUND', `RSVP response not found: ${responseId}`));
            }
            allResponses[index] = {
                ...allResponses[index],
                status: newStatus,
                respondedAt: new Date().toISOString(),
            };
            await saveResponses(allResponses);
            // Sync counts back to the invite object
            await syncCountsToInvite(allResponses[index].inviteId, allResponses);
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.INVITE_RSVP_RESPONDED, {
                inviteId: allResponses[index].inviteId,
                responseId,
                userId: allResponses[index].userId,
                userName: allResponses[index].userName,
                status: newStatus,
                childName: allResponses[index].childName,
            });
            logger.info('RSVP response updated', { responseId, newStatus });
            return (0, result_1.ok)(allResponses[index]);
        }
        catch (error) {
            logger.error('Failed to update RSVP response', error);
            return (0, result_1.err)((0, result_1.serviceError)('STORAGE', 'Failed to update RSVP response'));
        }
    },
};
