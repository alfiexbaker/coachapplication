"use strict";
/**
 * Community Service Module
 *
 * Manages parent community features: groups, messaging, and carpool coordination.
 *
 * This module is split into focused services:
 * - communityGroupService: Group CRUD, membership, invitations, role management
 * - communityMessagingService: Group messaging, read receipts, message status
 * - communityCarpoolService: Carpool offers, seat requests, acceptance/cancellation
 *
 * This index file provides a unified facade (communityService) for backward
 * compatibility, re-exporting all functionality from the split services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityService = exports.communityCarpoolService = exports.communityMessagingService = exports.communityGroupService = void 0;
// Re-export individual services for direct use
var community_group_service_1 = require("./community-group-service");
Object.defineProperty(exports, "communityGroupService", { enumerable: true, get: function () { return community_group_service_1.communityGroupService; } });
var community_messaging_service_1 = require("./community-messaging-service");
Object.defineProperty(exports, "communityMessagingService", { enumerable: true, get: function () { return community_messaging_service_1.communityMessagingService; } });
var community_carpool_service_1 = require("./community-carpool-service");
Object.defineProperty(exports, "communityCarpoolService", { enumerable: true, get: function () { return community_carpool_service_1.communityCarpoolService; } });
// Import services for the unified facade
const community_group_service_2 = require("./community-group-service");
const community_messaging_service_2 = require("./community-messaging-service");
const community_carpool_service_2 = require("./community-carpool-service");
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
    // ==========================================================================
    // GROUP MESSAGING (from communityMessagingService)
    // ==========================================================================
    getGroupMessages: community_messaging_service_2.communityMessagingService.getGroupMessages.bind(community_messaging_service_2.communityMessagingService),
    sendGroupMessage: community_messaging_service_2.communityMessagingService.sendGroupMessage.bind(community_messaging_service_2.communityMessagingService),
    markMessagesRead: community_messaging_service_2.communityMessagingService.markMessagesRead.bind(community_messaging_service_2.communityMessagingService),
    // ==========================================================================
    // CARPOOL MANAGEMENT (from communityCarpoolService)
    // ==========================================================================
    getCarpoolOffers: community_carpool_service_2.communityCarpoolService.getCarpoolOffers.bind(community_carpool_service_2.communityCarpoolService),
    getParentCarpoolOffers: community_carpool_service_2.communityCarpoolService.getParentCarpoolOffers.bind(community_carpool_service_2.communityCarpoolService),
    getAvailableCarpoolOffers: community_carpool_service_2.communityCarpoolService.getAvailableCarpoolOffers.bind(community_carpool_service_2.communityCarpoolService),
    getCarpoolOffer: community_carpool_service_2.communityCarpoolService.getCarpoolOffer.bind(community_carpool_service_2.communityCarpoolService),
    createCarpoolOffer: community_carpool_service_2.communityCarpoolService.createCarpoolOffer.bind(community_carpool_service_2.communityCarpoolService),
    requestCarpoolSeat: community_carpool_service_2.communityCarpoolService.requestCarpoolSeat.bind(community_carpool_service_2.communityCarpoolService),
    acceptCarpoolRequest: community_carpool_service_2.communityCarpoolService.acceptCarpoolRequest.bind(community_carpool_service_2.communityCarpoolService),
    declineCarpoolRequest: community_carpool_service_2.communityCarpoolService.declineCarpoolRequest.bind(community_carpool_service_2.communityCarpoolService),
    cancelCarpoolOffer: community_carpool_service_2.communityCarpoolService.cancelCarpoolOffer.bind(community_carpool_service_2.communityCarpoolService),
    cancelCarpoolRequest: community_carpool_service_2.communityCarpoolService.cancelCarpoolRequest.bind(community_carpool_service_2.communityCarpoolService),
};
