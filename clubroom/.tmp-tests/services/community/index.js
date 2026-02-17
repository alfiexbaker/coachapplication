"use strict";
/**
 * Community Service Module
 *
 * Manages parent community features: groups and messaging.
 *
 * This module is split into focused services:
 * - communityGroupService: Group CRUD, membership, invitations, role management
 * - communityMessagingService: Group messaging, read receipts, message status
 *
 * This index file provides a unified facade (communityService) for backward
 * compatibility, re-exporting all functionality from the split services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityService = exports.communityMessagingService = exports.communityGroupService = void 0;
// Re-export individual services for direct use
var community_group_service_1 = require("./community-group-service");
Object.defineProperty(exports, "communityGroupService", { enumerable: true, get: function () { return community_group_service_1.communityGroupService; } });
var community_messaging_service_1 = require("./community-messaging-service");
Object.defineProperty(exports, "communityMessagingService", { enumerable: true, get: function () { return community_messaging_service_1.communityMessagingService; } });
// Import services for the unified facade
const community_group_service_2 = require("./community-group-service");
const community_messaging_service_2 = require("./community-messaging-service");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('CommunityFacade');
void logger;
// ============================================================================
// UNIFIED FACADE FOR BACKWARD COMPATIBILITY
// ============================================================================
/**
 * Unified community service facade that maintains the original CommunityService API.
 * Delegates to the appropriate focused service under the hood.
 *
 * This object replicates the exact same interface as the original CommunityService
 * class instance, so all existing callers continue to work without modification.
 */
exports.communityService = {
    // ==========================================================================
    // GROUP MANAGEMENT (from communityGroupService)
    // ==========================================================================
    getParentGroups: community_group_service_2.communityGroupService.getParentGroups.bind(community_group_service_2.communityGroupService),
    getPublicGroups: community_group_service_2.communityGroupService.getPublicGroups.bind(community_group_service_2.communityGroupService),
    getGroup: community_group_service_2.communityGroupService.getGroup.bind(community_group_service_2.communityGroupService),
    createGroup: community_group_service_2.communityGroupService.createGroup.bind(community_group_service_2.communityGroupService),
    joinGroup: community_group_service_2.communityGroupService.joinGroup.bind(community_group_service_2.communityGroupService),
    leaveGroup: community_group_service_2.communityGroupService.leaveGroup.bind(community_group_service_2.communityGroupService),
    inviteToGroup: community_group_service_2.communityGroupService.inviteToGroup.bind(community_group_service_2.communityGroupService),
    getGroupInvites: community_group_service_2.communityGroupService.getGroupInvites.bind(community_group_service_2.communityGroupService),
    getPendingInvites: community_group_service_2.communityGroupService.getPendingInvites.bind(community_group_service_2.communityGroupService),
    acceptGroupInvite: community_group_service_2.communityGroupService.acceptGroupInvite.bind(community_group_service_2.communityGroupService),
    declineGroupInvite: community_group_service_2.communityGroupService.declineGroupInvite.bind(community_group_service_2.communityGroupService),
    promoteMember: community_group_service_2.communityGroupService.promoteMember.bind(community_group_service_2.communityGroupService),
    changeMemberRole: community_group_service_2.communityGroupService.changeMemberRole.bind(community_group_service_2.communityGroupService),
    getRoleWeight: community_group_service_2.communityGroupService.getRoleWeight.bind(community_group_service_2.communityGroupService),
    getAssignableRoles: community_group_service_2.communityGroupService.getAssignableRoles.bind(community_group_service_2.communityGroupService),
    getRoleBreakdown: community_group_service_2.communityGroupService.getRoleBreakdown.bind(community_group_service_2.communityGroupService),
    addMemberDirect: community_group_service_2.communityGroupService.addMemberDirect.bind(community_group_service_2.communityGroupService),
    removeMemberDirect: community_group_service_2.communityGroupService.removeMemberDirect.bind(community_group_service_2.communityGroupService),
    deleteGroup: community_group_service_2.communityGroupService.deleteGroup.bind(community_group_service_2.communityGroupService),
    // ==========================================================================
    // GROUP MESSAGING (from communityMessagingService)
    // ==========================================================================
    getGroupMessages: community_messaging_service_2.communityMessagingService.getGroupMessages.bind(community_messaging_service_2.communityMessagingService),
    sendGroupMessage: community_messaging_service_2.communityMessagingService.sendGroupMessage.bind(community_messaging_service_2.communityMessagingService),
    markMessagesRead: community_messaging_service_2.communityMessagingService.markMessagesRead.bind(community_messaging_service_2.communityMessagingService),
};
