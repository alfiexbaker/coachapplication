"use strict";
/**
 * Unified Invite Service
 *
 * This facade re-exports all invite-related services and provides
 * a unified API that maintains full backward compatibility with
 * the original monolithic invite-service.ts
 *
 * Usage:
 *   import { inviteService } from '@/services/invite';
 *   // or
 *   import { sessionInviteService, bulkInviteService } from '@/services/invite';
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.squadBulkInviteService = exports.inviteService = exports.eventInviteService = exports.matchInviteService = exports.bulkInviteService = exports.squadInviteService = exports.sessionInviteService = void 0;
// Re-export individual services
var session_invite_service_1 = require("./session-invite-service");
Object.defineProperty(exports, "sessionInviteService", { enumerable: true, get: function () { return session_invite_service_1.sessionInviteService; } });
var squad_invite_service_1 = require("./squad-invite-service");
Object.defineProperty(exports, "squadInviteService", { enumerable: true, get: function () { return squad_invite_service_1.squadInviteService; } });
var bulk_invite_service_1 = require("./bulk-invite-service");
Object.defineProperty(exports, "bulkInviteService", { enumerable: true, get: function () { return bulk_invite_service_1.bulkInviteService; } });
var match_invite_service_1 = require("./match-invite-service");
Object.defineProperty(exports, "matchInviteService", { enumerable: true, get: function () { return match_invite_service_1.matchInviteService; } });
var event_invite_service_1 = require("./event-invite-service");
Object.defineProperty(exports, "eventInviteService", { enumerable: true, get: function () { return event_invite_service_1.eventInviteService; } });
// Import services for the unified facade
const session_invite_service_2 = require("./session-invite-service");
const squad_invite_service_2 = require("./squad-invite-service");
const bulk_invite_service_2 = require("./bulk-invite-service");
const match_invite_service_2 = require("./match-invite-service");
const event_invite_service_2 = require("./event-invite-service");
const api_client_1 = require("../api-client");
const storage_keys_1 = require("@/constants/storage-keys");
// Import storage functions for clearCache
const session_invite_service_3 = require("./session-invite-service");
/**
 * Unified invite service that maintains full backward compatibility
 * with the original monolithic service API
 */
exports.inviteService = {
    // ==========================================================================
    // SESSION INVITE OPERATIONS (from session-invite-service)
    // ==========================================================================
    createInvite: session_invite_service_2.sessionInviteService.createInvite.bind(session_invite_service_2.sessionInviteService),
    _createSingleInvite: session_invite_service_2.sessionInviteService._createSingleInvite.bind(session_invite_service_2.sessionInviteService),
    acceptInvite: session_invite_service_2.sessionInviteService.acceptInvite.bind(session_invite_service_2.sessionInviteService),
    declineInvite: session_invite_service_2.sessionInviteService.declineInvite.bind(session_invite_service_2.sessionInviteService),
    respondToInvite: session_invite_service_2.sessionInviteService.respondToInvite.bind(session_invite_service_2.sessionInviteService),
    cancelInvite: session_invite_service_2.sessionInviteService.cancelInvite.bind(session_invite_service_2.sessionInviteService),
    dismissInvite: session_invite_service_2.sessionInviteService.dismissInvite.bind(session_invite_service_2.sessionInviteService),
    getCoachInvites: session_invite_service_2.sessionInviteService.getCoachInvites.bind(session_invite_service_2.sessionInviteService),
    getParentInvites: session_invite_service_2.sessionInviteService.getParentInvites.bind(session_invite_service_2.sessionInviteService),
    getPendingInvites: session_invite_service_2.sessionInviteService.getPendingInvites.bind(session_invite_service_2.sessionInviteService),
    getInviteHistory: session_invite_service_2.sessionInviteService.getInviteHistory.bind(session_invite_service_2.sessionInviteService),
    getInvite: session_invite_service_2.sessionInviteService.getInvite.bind(session_invite_service_2.sessionInviteService),
    getCounteredInvites: session_invite_service_2.sessionInviteService.getCounteredInvites.bind(session_invite_service_2.sessionInviteService),
    acceptCounterProposal: session_invite_service_2.sessionInviteService.acceptCounterProposal.bind(session_invite_service_2.sessionInviteService),
    getInvitesForParent: session_invite_service_2.sessionInviteService.getInvitesForParent.bind(session_invite_service_2.sessionInviteService),
    // ==========================================================================
    // BULK INVITE OPERATIONS (from bulk-invite-service)
    // ==========================================================================
    createBulk: bulk_invite_service_2.bulkInviteService.createBulk.bind(bulk_invite_service_2.bulkInviteService),
    getGroupInvites: bulk_invite_service_2.bulkInviteService.getGroupInvites.bind(bulk_invite_service_2.bulkInviteService),
    getGroupStats: bulk_invite_service_2.bulkInviteService.getGroupStats.bind(bulk_invite_service_2.bulkInviteService),
    getCoachInviteStats: bulk_invite_service_2.bulkInviteService.getCoachInviteStats.bind(bulk_invite_service_2.bulkInviteService),
    inviteSquadToSession: bulk_invite_service_2.bulkInviteService.inviteSquadToSession.bind(bulk_invite_service_2.bulkInviteService),
    createBulkInvite: bulk_invite_service_2.bulkInviteService.createBulkInvite.bind(bulk_invite_service_2.bulkInviteService),
    inviteSelectedMembers: bulk_invite_service_2.bulkInviteService.inviteSelectedMembers.bind(bulk_invite_service_2.bulkInviteService),
    createSquadInvite: bulk_invite_service_2.bulkInviteService.createSquadInvite.bind(bulk_invite_service_2.bulkInviteService),
    // ==========================================================================
    // SQUAD INVITE OPERATIONS (from squad-invite-service)
    // ==========================================================================
    getSquadInvitePreview: squad_invite_service_2.squadInviteService.getSquadInvitePreview.bind(squad_invite_service_2.squadInviteService),
    getMultipleSquadsPreview: squad_invite_service_2.squadInviteService.getMultipleSquadsPreview.bind(squad_invite_service_2.squadInviteService),
    getSquadInvitesForTarget: squad_invite_service_2.squadInviteService.getSquadInvitesForTarget.bind(squad_invite_service_2.squadInviteService),
    getSquadInvitesByCoach: squad_invite_service_2.squadInviteService.getSquadInvitesByCoach.bind(squad_invite_service_2.squadInviteService),
    getSquadMembers: squad_invite_service_2.squadInviteService.getSquadMembers.bind(squad_invite_service_2.squadInviteService),
    getSquadMembersWithMetadata: squad_invite_service_2.squadInviteService.getSquadMembersWithMetadata.bind(squad_invite_service_2.squadInviteService),
    getSquadMembersGroupedByParent: squad_invite_service_2.squadInviteService.getSquadMembersGroupedByParent.bind(squad_invite_service_2.squadInviteService),
    getSquadInviteHistory: squad_invite_service_2.squadInviteService.getSquadInviteHistory.bind(squad_invite_service_2.squadInviteService),
    getCoachInviteHistory: squad_invite_service_2.squadInviteService.getCoachInviteHistory.bind(squad_invite_service_2.squadInviteService),
    addToInviteHistory: squad_invite_service_2.squadInviteService.addToInviteHistory.bind(squad_invite_service_2.squadInviteService),
    updateInviteHistoryEntry: squad_invite_service_2.squadInviteService.updateInviteHistoryEntry.bind(squad_invite_service_2.squadInviteService),
    getSquadSessionInvite: squad_invite_service_2.squadInviteService.getSquadSessionInvite.bind(squad_invite_service_2.squadInviteService),
    getInvitesForSession: squad_invite_service_2.squadInviteService.getInvitesForSession.bind(squad_invite_service_2.squadInviteService),
    getInvitesByCoach: squad_invite_service_2.squadInviteService.getInvitesByCoach.bind(squad_invite_service_2.squadInviteService),
    getSquadInviteStats: squad_invite_service_2.squadInviteService.getSquadInviteStats.bind(squad_invite_service_2.squadInviteService),
    hasMemberBeenInvited: squad_invite_service_2.squadInviteService.hasMemberBeenInvited.bind(squad_invite_service_2.squadInviteService),
    calculateNotificationCount: squad_invite_service_2.squadInviteService.calculateNotificationCount.bind(squad_invite_service_2.squadInviteService),
    // ==========================================================================
    // MATCH INVITE OPERATIONS (from match-invite-service)
    // ==========================================================================
    inviteSquadToMatch: match_invite_service_2.matchInviteService.inviteSquadToMatch.bind(match_invite_service_2.matchInviteService),
    // ==========================================================================
    // EVENT INVITE OPERATIONS (from event-invite-service)
    // ==========================================================================
    inviteSquadsToEvent: event_invite_service_2.eventInviteService.inviteSquadsToEvent.bind(event_invite_service_2.eventInviteService),
    // ==========================================================================
    // UTILITY OPERATIONS
    // ==========================================================================
    /**
     * Clear all cached data (for testing)
     */
    async clearCache() {
        // Clear session invites cache
        (0, session_invite_service_3.setInvitesCache)((0, session_invite_service_3.getMockInvites)());
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_INVITES);
        // Clear squad-related caches
        await squad_invite_service_2.squadInviteService.clearCache();
    },
};
// Backward compatible exports - aliased service names
exports.squadBulkInviteService = exports.inviteService;
