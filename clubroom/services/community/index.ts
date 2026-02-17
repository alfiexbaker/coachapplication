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

// Re-export individual services for direct use
export { communityGroupService } from './community-group-service';
export { communityMessagingService } from './community-messaging-service';

// Re-export types
export type {
  CreateGroupParams,
  GroupInvite,
  ChangeMemberRoleParams,
} from './community-group-service';

// Import services for the unified facade
import { communityGroupService } from './community-group-service';
import { communityMessagingService } from './community-messaging-service';
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
};
