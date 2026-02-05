"use strict";
/**
 * Bulk Invite Service
 *
 * Handles bulk invitation operations including:
 * - Bulk session invite creation
 * - Group invite tracking and statistics
 * - Invite selected squad members
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkInviteService = void 0;
const config_1 = require("@/constants/config");
const result_1 = require("@/types/result");
const notification_service_1 = require("../notification-service");
const squad_service_1 = require("../squad-service");
const logger_1 = require("@/utils/logger");
const session_invite_service_1 = require("./session-invite-service");
const squad_invite_service_1 = require("./squad-invite-service");
const logger = (0, logger_1.createLogger)('BulkInviteService');
const USE_MOCK = config_1.api.useMock;
// ============================================================================
// BULK INVITE SERVICE
// ============================================================================
exports.bulkInviteService = {
    // ==========================================================================
    // BULK INVITE OPERATIONS
    // ==========================================================================
    /**
     * Create multiple session invites at once (bulk send)
     * Used for group invites to multiple parents/athletes
     */
    async createBulk(inputs) {
        const groupId = inputs[0]?.groupId || `group_${Date.now()}`;
        const successful = [];
        const failed = [];
        if (USE_MOCK) {
            let invitesCache = await (0, session_invite_service_1.loadFromStorage)();
            for (const input of inputs) {
                try {
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 7));
                    const newInvite = {
                        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        coachId: input.coachId,
                        coachName: input.coachName,
                        coachPhotoUrl: input.coachPhotoUrl,
                        clubName: input.clubName,
                        athleteIds: input.athleteIds,
                        athleteNames: input.athleteNames,
                        parentId: input.parentId,
                        parentName: input.parentName,
                        proposedSlots: input.proposedSlots,
                        sessionType: input.sessionType,
                        focus: input.focus,
                        notes: input.notes,
                        priceUsd: input.priceUsd,
                        status: 'PENDING',
                        expiresAt: expiresAt.toISOString(),
                        createdAt: new Date().toISOString(),
                        groupId,
                    };
                    invitesCache.push(newInvite);
                    successful.push(newInvite);
                }
                catch (error) {
                    failed.push({
                        input,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
            await (0, session_invite_service_1.saveToStorage)(invitesCache);
            (0, session_invite_service_1.setInvitesCache)(invitesCache);
            return { successful, failed, groupId };
        }
        // API call for bulk creation
        const response = await fetch('/api/session-invites/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invites: inputs, groupId }),
        });
        return response.json();
    },
    /**
     * Get all invites that are part of a group send
     */
    async getGroupInvites(groupId) {
        if (USE_MOCK) {
            const invitesCache = await (0, session_invite_service_1.loadFromStorage)();
            return invitesCache.filter((inv) => inv.groupId === groupId);
        }
        const response = await fetch(`/api/session-invites?groupId=${groupId}`);
        return response.json();
    },
    /**
     * Get group send statistics
     */
    async getGroupStats(groupId) {
        const invites = await this.getGroupInvites(groupId);
        return {
            total: invites.length,
            pending: invites.filter((i) => i.status === 'PENDING').length,
            accepted: invites.filter((i) => i.status === 'ACCEPTED').length,
            declined: invites.filter((i) => i.status === 'DECLINED').length,
            expired: invites.filter((i) => i.status === 'EXPIRED').length,
        };
    },
    /**
     * Get invite statistics for a coach
     */
    async getCoachInviteStats(coachId) {
        const invites = await session_invite_service_1.sessionInviteService.getCoachInvites(coachId);
        const sent = invites.length;
        const pending = invites.filter((i) => i.status === 'PENDING').length;
        const accepted = invites.filter((i) => i.status === 'ACCEPTED').length;
        const declined = invites.filter((i) => i.status === 'DECLINED').length;
        const responded = accepted + declined;
        const acceptanceRate = responded > 0 ? (accepted / responded) * 100 : 0;
        return { sent, pending, accepted, declined, acceptanceRate };
    },
    /**
     * Invite entire squad to a session
     * Creates individual session invites for each parent
     */
    async inviteSquadToSession(input) {
        const members = await squad_service_1.squadService.getSquadMembers(input.squadId);
        const squad = await squad_service_1.squadService.getSquad(input.squadId);
        // Filter out excluded members
        const eligibleMembers = input.excludeMemberIds
            ? members.filter((m) => !input.excludeMemberIds.includes(m.athleteId))
            : members;
        // Group by parent
        const parentMap = new Map();
        eligibleMembers.forEach((m) => {
            const existing = parentMap.get(m.parentId) || [];
            parentMap.set(m.parentId, [...existing, m]);
        });
        const groupId = `squad_session_${Date.now()}`;
        let sent = 0;
        let failed = 0;
        const errors = [];
        // Create invite for each parent
        for (const [parentId, athletes] of parentMap.entries()) {
            try {
                await session_invite_service_1.sessionInviteService._createSingleInvite({
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
                sent++;
            }
            catch (error) {
                failed++;
                errors.push({
                    memberId: athletes[0].athleteId,
                    athleteName: athletes[0].athleteName,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        // Track squad invite
        const squadInvite = {
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
        // Import and use squad invite storage functions
        const { loadSquadInvites, saveSquadInvites } = await Promise.resolve().then(() => __importStar(require('./squad-invite-service')));
        let squadInvitesCache = await loadSquadInvites();
        squadInvitesCache.push(squadInvite);
        await saveSquadInvites(squadInvitesCache);
        return { sent, successful: sent, failed, skipped: 0, totalAttempted: eligibleMembers.length, errors, groupId };
    },
    /**
     * Create bulk invite to entire squad
     * Sends session invites to all active squad members
     */
    async createBulkInvite(input) {
        const squad = await squad_service_1.squadService.getSquad(input.squadId);
        const members = await squad_service_1.squadService.getSquadMembers(input.squadId);
        if (!squad) {
            return (0, result_1.err)((0, result_1.notFound)('Squad', input.squadId));
        }
        if (members.length === 0) {
            return (0, result_1.err)((0, result_1.validationError)('Squad has no active members'));
        }
        const groupId = `squad_bulk_${input.squadId}_${Date.now()}`;
        const invitedMembers = [];
        const errors = [];
        let sent = 0;
        let failed = 0;
        let skipped = 0;
        // Group members by parent to avoid duplicate notifications
        const parentMap = new Map();
        members.forEach((m) => {
            const existing = parentMap.get(m.parentId) || [];
            parentMap.set(m.parentId, [...existing, m]);
        });
        if (USE_MOCK) {
            // Create invites for each parent
            for (const [parentId, athletes] of parentMap.entries()) {
                try {
                    const invite = await session_invite_service_1.sessionInviteService._createSingleInvite({
                        coachId: input.coachId,
                        coachName: input.coachName,
                        coachPhotoUrl: input.coachPhotoUrl,
                        clubName: input.clubName || squad.name,
                        athleteIds: athletes.map((a) => a.athleteId),
                        athleteNames: athletes.map((a) => a.athleteName),
                        parentId,
                        parentName: athletes[0].parentName,
                        proposedSlots: input.proposedSlots,
                        sessionType: input.sessionType,
                        focus: input.focus,
                        notes: input.notes
                            ? `[${squad.name}] ${input.notes}`
                            : `Squad Training: ${squad.name}`,
                        priceUsd: input.priceUsd,
                        expiresInDays: input.expiresInDays ?? 7,
                        groupId,
                    });
                    // Mark all athletes for this parent as sent
                    athletes.forEach((athlete) => {
                        invitedMembers.push({
                            memberId: athlete.id,
                            athleteId: athlete.athleteId,
                            athleteName: athlete.athleteName,
                            parentId: athlete.parentId,
                            parentName: athlete.parentName,
                            inviteId: invite.id,
                            status: 'SENT',
                        });
                        sent++;
                    });
                }
                catch (error) {
                    // Mark all athletes for this parent as failed
                    athletes.forEach((athlete) => {
                        invitedMembers.push({
                            memberId: athlete.id,
                            athleteId: athlete.athleteId,
                            athleteName: athlete.athleteName,
                            parentId: athlete.parentId,
                            parentName: athlete.parentName,
                            status: 'FAILED',
                            failureReason: error instanceof Error ? error.message : 'Unknown error',
                        });
                        errors.push({
                            memberId: athlete.id,
                            athleteName: athlete.athleteName,
                            error: error instanceof Error ? error.message : 'Unknown error',
                            code: 'UNKNOWN',
                        });
                        failed++;
                    });
                }
            }
        }
        const result = {
            sent,
            successful: sent,
            failed,
            skipped,
            totalAttempted: members.length,
            errors,
            groupId,
        };
        const squadInvite = {
            id: groupId,
            squadId: input.squadId,
            squadName: squad.name,
            sessionId: input.sessionId,
            sessionTitle: input.sessionTitle,
            invitedMembers,
            sentAt: new Date().toISOString(),
            sentBy: input.coachId,
            sentByName: input.coachName,
            status: failed === 0 ? 'SENT' : failed === members.length ? 'FAILED' : 'PARTIAL',
            result,
        };
        // Save to storage
        let squadSessionInvitesCache = await (0, squad_invite_service_1.loadSquadSessionInvites)();
        squadSessionInvitesCache.push(squadInvite);
        await (0, squad_invite_service_1.saveSquadSessionInvites)(squadSessionInvitesCache);
        // Create history entry
        await squad_invite_service_1.squadInviteService.addToInviteHistory({
            id: groupId,
            squadId: input.squadId,
            squadName: squad.name,
            sessionId: input.sessionId,
            sessionTitle: input.sessionTitle,
            sessionType: input.sessionType,
            focus: input.focus,
            sentAt: new Date().toISOString(),
            sentBy: input.coachId,
            sentByName: input.coachName,
            inviteCount: sent,
            acceptedCount: 0,
            declinedCount: 0,
            pendingCount: sent,
            status: 'ACTIVE',
        });
        // Send summary notification to coach
        await notification_service_1.notificationService.create({
            id: `notif_bulk_${Date.now()}`,
            type: 'booking',
            title: 'Squad Invites Sent',
            body: `${sent} invite${sent !== 1 ? 's' : ''} sent to ${squad.name}${failed > 0 ? ` (${failed} failed)` : ''}`,
            timeLabel: 'Just now',
        });
        return (0, result_1.ok)({ squadInvite, result });
    },
    /**
     * Invite selected members (subset of squad)
     * Allows coach to pick specific members to invite
     */
    async inviteSelectedMembers(input) {
        if (input.memberIds.length === 0) {
            return (0, result_1.err)((0, result_1.validationError)('No members selected'));
        }
        // Get all members from all known squads
        const clubSquads = await squad_service_1.squadService.getSquads('club_lions');
        const selectedMembers = [];
        for (const squad of clubSquads) {
            const members = await squad_service_1.squadService.getSquadMembers(squad.id);
            members.forEach((m) => {
                if (input.memberIds.includes(m.id)) {
                    selectedMembers.push(m);
                }
            });
        }
        if (selectedMembers.length === 0) {
            return (0, result_1.err)((0, result_1.validationError)('No valid members found for the provided IDs'));
        }
        const groupId = `selected_${Date.now()}`;
        const invitedMembers = [];
        const errors = [];
        let sent = 0;
        let failed = 0;
        const skipped = 0;
        // Group by parent
        const parentMap = new Map();
        selectedMembers.forEach((m) => {
            const existing = parentMap.get(m.parentId) || [];
            parentMap.set(m.parentId, [...existing, m]);
        });
        if (USE_MOCK) {
            for (const [parentId, athletes] of parentMap.entries()) {
                try {
                    const invite = await session_invite_service_1.sessionInviteService._createSingleInvite({
                        coachId: input.coachId,
                        coachName: input.coachName,
                        coachPhotoUrl: input.coachPhotoUrl,
                        clubName: input.clubName,
                        athleteIds: athletes.map((a) => a.athleteId),
                        athleteNames: athletes.map((a) => a.athleteName),
                        parentId,
                        parentName: athletes[0].parentName,
                        proposedSlots: input.proposedSlots,
                        sessionType: input.sessionType,
                        focus: input.focus,
                        notes: input.notes,
                        priceUsd: input.priceUsd,
                        expiresInDays: input.expiresInDays ?? 7,
                        groupId,
                    });
                    athletes.forEach((athlete) => {
                        invitedMembers.push({
                            memberId: athlete.id,
                            athleteId: athlete.athleteId,
                            athleteName: athlete.athleteName,
                            parentId: athlete.parentId,
                            parentName: athlete.parentName,
                            inviteId: invite.id,
                            status: 'SENT',
                        });
                        sent++;
                    });
                }
                catch (error) {
                    athletes.forEach((athlete) => {
                        invitedMembers.push({
                            memberId: athlete.id,
                            athleteId: athlete.athleteId,
                            athleteName: athlete.athleteName,
                            parentId: athlete.parentId,
                            parentName: athlete.parentName,
                            status: 'FAILED',
                            failureReason: error instanceof Error ? error.message : 'Unknown error',
                        });
                        errors.push({
                            memberId: athlete.id,
                            athleteName: athlete.athleteName,
                            error: error instanceof Error ? error.message : 'Unknown error',
                            code: 'UNKNOWN',
                        });
                        failed++;
                    });
                }
            }
        }
        const result = {
            sent,
            successful: sent,
            failed,
            skipped,
            totalAttempted: selectedMembers.length,
            errors,
            groupId,
        };
        return (0, result_1.ok)({ result, invitedMembers });
    },
    /**
     * Create squad invite (unified method that wraps createBulkInvite)
     */
    async createSquadInvite(squadId, sessionDetails) {
        return this.createBulkInvite({
            squadId,
            sessionId: sessionDetails.sessionId,
            sessionTitle: sessionDetails.sessionTitle,
            coachId: sessionDetails.coachId,
            coachName: sessionDetails.coachName,
            coachPhotoUrl: sessionDetails.coachPhotoUrl,
            clubName: sessionDetails.clubName,
            proposedSlots: sessionDetails.proposedSlots,
            sessionType: sessionDetails.sessionType,
            focus: sessionDetails.focus,
            notes: sessionDetails.notes,
            priceUsd: sessionDetails.priceUsd,
        });
    },
};
