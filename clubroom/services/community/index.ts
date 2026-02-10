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

// Re-export individual services for direct use
export { communityGroupService } from './community-group-service';
export { communityMessagingService } from './community-messaging-service';
export { communityCarpoolService } from './community-carpool-service';

// Re-export types
export type { CreateGroupParams, GroupInvite, ChangeMemberRoleParams } from './community-group-service';
export type { CreateCarpoolOfferParams, RequestCarpoolSeatParams } from './community-carpool-service';

// Import services for the unified facade
import { communityGroupService } from './community-group-service';
import { communityMessagingService } from './community-messaging-service';
import { communityCarpoolService } from './community-carpool-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CommunityFacade');
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
export const communityService = {
  // ==========================================================================
  // GROUP MANAGEMENT (from communityGroupService)
  // ==========================================================================

  getParentGroups: communityGroupService.getParentGroups.bind(communityGroupService),
  getPublicGroups: communityGroupService.getPublicGroups.bind(communityGroupService),
  getGroup: communityGroupService.getGroup.bind(communityGroupService),
  createGroup: communityGroupService.createGroup.bind(communityGroupService),
  joinGroup: communityGroupService.joinGroup.bind(communityGroupService),
  leaveGroup: communityGroupService.leaveGroup.bind(communityGroupService),
  inviteToGroup: communityGroupService.inviteToGroup.bind(communityGroupService),
  getGroupInvites: communityGroupService.getGroupInvites.bind(communityGroupService),
  getPendingInvites: communityGroupService.getPendingInvites.bind(communityGroupService),
  acceptGroupInvite: communityGroupService.acceptGroupInvite.bind(communityGroupService),
  declineGroupInvite: communityGroupService.declineGroupInvite.bind(communityGroupService),
  promoteMember: communityGroupService.promoteMember.bind(communityGroupService),
  changeMemberRole: communityGroupService.changeMemberRole.bind(communityGroupService),
  getRoleWeight: communityGroupService.getRoleWeight.bind(communityGroupService),
  getAssignableRoles: communityGroupService.getAssignableRoles.bind(communityGroupService),
  getRoleBreakdown: communityGroupService.getRoleBreakdown.bind(communityGroupService),
  addMemberDirect: communityGroupService.addMemberDirect.bind(communityGroupService),
  removeMemberDirect: communityGroupService.removeMemberDirect.bind(communityGroupService),
  deleteGroup: communityGroupService.deleteGroup.bind(communityGroupService),

  // ==========================================================================
  // GROUP MESSAGING (from communityMessagingService)
  // ==========================================================================

  getGroupMessages: communityMessagingService.getGroupMessages.bind(communityMessagingService),
  sendGroupMessage: communityMessagingService.sendGroupMessage.bind(communityMessagingService),
  markMessagesRead: communityMessagingService.markMessagesRead.bind(communityMessagingService),

  // ==========================================================================
  // CARPOOL MANAGEMENT (from communityCarpoolService)
  // ==========================================================================

  getCarpoolOffers: communityCarpoolService.getCarpoolOffers.bind(communityCarpoolService),
  getParentCarpoolOffers: communityCarpoolService.getParentCarpoolOffers.bind(communityCarpoolService),
  getAvailableCarpoolOffers: communityCarpoolService.getAvailableCarpoolOffers.bind(communityCarpoolService),
  getCarpoolOffer: communityCarpoolService.getCarpoolOffer.bind(communityCarpoolService),
  createCarpoolOffer: communityCarpoolService.createCarpoolOffer.bind(communityCarpoolService),
  requestCarpoolSeat: communityCarpoolService.requestCarpoolSeat.bind(communityCarpoolService),
  acceptCarpoolRequest: communityCarpoolService.acceptCarpoolRequest.bind(communityCarpoolService),
  declineCarpoolRequest: communityCarpoolService.declineCarpoolRequest.bind(communityCarpoolService),
  cancelCarpoolOffer: communityCarpoolService.cancelCarpoolOffer.bind(communityCarpoolService),
  cancelCarpoolRequest: communityCarpoolService.cancelCarpoolRequest.bind(communityCarpoolService),
};
