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

import { sessionInviteService, getMockInvites, setInvitesCache } from './session-invite-service';
import { squadInviteService } from './squad-invite-service';
import { bulkInviteService } from './bulk-invite-service';
import { matchInviteService } from './match-invite-service';
import { eventInviteService } from './event-invite-service';
import { inviteRsvpService } from './invite-rsvp-service';
import { inviteShareService } from './invite-share-service';
import { createLogger } from '@/utils/logger';

// Re-export individual services
export {
  sessionInviteService,
  squadInviteService,
  bulkInviteService,
  matchInviteService,
  eventInviteService,
  inviteRsvpService,
  inviteShareService,
};

// Re-export types
export type { CreateInviteInput, RespondToInviteInput } from './session-invite-service';

export type { SquadInvitePreview, SquadMemberWithSelection } from './squad-invite-service';

export type {
  CreateBulkInviteInput,
  InviteSelectedMembersInput,
  InviteSquadToSessionInput,
} from './bulk-invite-service';

export type { InviteSquadToMatchInput } from './match-invite-service';

export type { InviteSquadsToEventInput } from './event-invite-service';

const logger = createLogger('InviteFacade');
void logger;

/**
 * Unified invite service that maintains full backward compatibility
 * with the original monolithic service API
 */
export const inviteService = {
  // ==========================================================================
  // SESSION INVITE OPERATIONS (from session-invite-service)
  // ==========================================================================

  createInvite: sessionInviteService.createInvite.bind(sessionInviteService),
  _createSingleInvite: sessionInviteService._createSingleInvite.bind(sessionInviteService),
  acceptInvite: sessionInviteService.acceptInvite.bind(sessionInviteService),
  declineInvite: sessionInviteService.declineInvite.bind(sessionInviteService),
  respondToInvite: sessionInviteService.respondToInvite.bind(sessionInviteService),
  cancelInvite: sessionInviteService.cancelInvite.bind(sessionInviteService),
  sendInviteReminder: sessionInviteService.sendInviteReminder.bind(sessionInviteService),
  dismissInvite: sessionInviteService.dismissInvite.bind(sessionInviteService),
  getCoachInvites: sessionInviteService.getCoachInvites.bind(sessionInviteService),
  getParentInvites: sessionInviteService.getParentInvites.bind(sessionInviteService),
  getPendingInvites: sessionInviteService.getPendingInvites.bind(sessionInviteService),
  getInviteHistory: sessionInviteService.getInviteHistory.bind(sessionInviteService),
  getInvite: sessionInviteService.getInvite.bind(sessionInviteService),
  getInvitesForParent: sessionInviteService.getInvitesForParent.bind(sessionInviteService),

  // INVITE TYPE FILTERING
  getOpenInvites: sessionInviteService.getOpenInvites.bind(sessionInviteService),
  getClosedInvitesForParent:
    sessionInviteService.getClosedInvitesForParent.bind(sessionInviteService),
  getSquadOnlyInvitesForParent:
    sessionInviteService.getSquadOnlyInvitesForParent.bind(sessionInviteService),
  getAvailableInvitesForParent:
    sessionInviteService.getAvailableInvitesForParent.bind(sessionInviteService),

  // ==========================================================================
  // BULK INVITE OPERATIONS (from bulk-invite-service)
  // ==========================================================================

  createBulk: bulkInviteService.createBulk.bind(bulkInviteService),
  getGroupInvites: bulkInviteService.getGroupInvites.bind(bulkInviteService),
  getGroupStats: bulkInviteService.getGroupStats.bind(bulkInviteService),
  getCoachInviteStats: bulkInviteService.getCoachInviteStats.bind(bulkInviteService),
  inviteSquadToSession: bulkInviteService.inviteSquadToSession.bind(bulkInviteService),
  createBulkInvite: bulkInviteService.createBulkInvite.bind(bulkInviteService),
  inviteSelectedMembers: bulkInviteService.inviteSelectedMembers.bind(bulkInviteService),
  createSquadInvite: bulkInviteService.createSquadInvite.bind(bulkInviteService),

  // ==========================================================================
  // SQUAD INVITE OPERATIONS (from squad-invite-service)
  // ==========================================================================

  getSquadInvitePreview: squadInviteService.getSquadInvitePreview.bind(squadInviteService),
  getMultipleSquadsPreview: squadInviteService.getMultipleSquadsPreview.bind(squadInviteService),
  getSquadInvitesForTarget: squadInviteService.getSquadInvitesForTarget.bind(squadInviteService),
  getSquadInvitesByCoach: squadInviteService.getSquadInvitesByCoach.bind(squadInviteService),
  getSquadMembers: squadInviteService.getSquadMembers.bind(squadInviteService),
  getSquadMembersWithMetadata:
    squadInviteService.getSquadMembersWithMetadata.bind(squadInviteService),
  getSquadMembersGroupedByParent:
    squadInviteService.getSquadMembersGroupedByParent.bind(squadInviteService),
  getSquadInviteHistory: squadInviteService.getSquadInviteHistory.bind(squadInviteService),
  getCoachInviteHistory: squadInviteService.getCoachInviteHistory.bind(squadInviteService),
  addToInviteHistory: squadInviteService.addToInviteHistory.bind(squadInviteService),
  updateInviteHistoryEntry: squadInviteService.updateInviteHistoryEntry.bind(squadInviteService),
  getSquadSessionInvite: squadInviteService.getSquadSessionInvite.bind(squadInviteService),
  getInvitesForSession: squadInviteService.getInvitesForSession.bind(squadInviteService),
  getInvitesByCoach: squadInviteService.getInvitesByCoach.bind(squadInviteService),
  getSquadInviteStats: squadInviteService.getSquadInviteStats.bind(squadInviteService),
  hasMemberBeenInvited: squadInviteService.hasMemberBeenInvited.bind(squadInviteService),
  calculateNotificationCount:
    squadInviteService.calculateNotificationCount.bind(squadInviteService),

  // ==========================================================================
  // MATCH INVITE OPERATIONS (from match-invite-service)
  // ==========================================================================

  inviteSquadToMatch: matchInviteService.inviteSquadToMatch.bind(matchInviteService),

  // ==========================================================================
  // EVENT INVITE OPERATIONS (from event-invite-service)
  // ==========================================================================

  inviteSquadsToEvent: eventInviteService.inviteSquadsToEvent.bind(eventInviteService),

  // ==========================================================================
  // UTILITY OPERATIONS
  // ==========================================================================

  /**
   * Clear all cached data (for testing)
   */
  async clearCache(): Promise<void> {
    // Clear session invites cache
    setInvitesCache(getMockInvites());

    // Clear squad-related caches
    await squadInviteService.clearCache();
  },
};

// Backward compatible exports - aliased service names
export const squadBulkInviteService = inviteService;
