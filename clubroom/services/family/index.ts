/**
 * Family Services - Unified Export
 *
 * This module provides a clean API for family-related operations.
 * The original monolithic familyService is split into focused services:
 *
 * - familyMemberService: Child/member CRUD, bookings, calendar, progress, overview
 * - familyHealthService: Child medical, emergency contacts, and consent records
 * - familyRelationshipService: Guardian management & invites
 * - familyPermissionService: Authorization checks and access control
 *
 * For backward compatibility, this module exports a facade (`familyService`)
 * that maintains the same API as the original service.
 */

// Export individual services
export { familyMemberService, CHILD_COLORS } from './family-member-service';
export { familyHealthService } from './family-health-service';
export {
  familyRelationshipService,
  DEFAULT_ROLE_PERMISSIONS,
  RELATIONSHIP_OPTIONS,
  PERMISSION_DESCRIPTIONS,
} from './family-relationship-service';
export { familyPermissionService } from './family-permission-service';

// Export types
export * from './types';

// Import for facade
import { familyMemberService } from './family-member-service';
import { familyHealthService } from './family-health-service';
import { familyRelationshipService } from './family-relationship-service';
import { familyPermissionService } from './family-permission-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FamilyFacade');
void logger;

/**
 * Backward-compatible facade that delegates to focused services.
 * Use individual services for new code.
 *
 * @deprecated Use individual services: familyMemberService, familyHealthService, familyRelationshipService, familyPermissionService
 */
export const familyService = {
  // ==========================================================================
  // FAMILY MEMBERS (from familyMemberService)
  // ==========================================================================
  getFamilyMembers: familyMemberService.getFamilyMembers.bind(familyMemberService),
  getFamilyMember: familyMemberService.getFamilyMember.bind(familyMemberService),
  addFamilyMember: familyMemberService.addFamilyMember.bind(familyMemberService),
  updateFamilyMember: familyMemberService.updateFamilyMember.bind(familyMemberService),

  // ==========================================================================
  // BOOKINGS (from familyMemberService)
  // ==========================================================================
  getFamilyBookings: familyMemberService.getFamilyBookings.bind(familyMemberService),
  getChildBookings: familyMemberService.getChildBookings.bind(familyMemberService),

  // ==========================================================================
  // CALENDAR (from familyMemberService)
  // ==========================================================================
  getFamilyCalendar: familyMemberService.getFamilyCalendar.bind(familyMemberService),
  getUpcomingForFamily: familyMemberService.getUpcomingForFamily.bind(familyMemberService),
  getEventsGroupedByDate: familyMemberService.getEventsGroupedByDate.bind(familyMemberService),

  // ==========================================================================
  // CHILD PROGRESS (from familyMemberService)
  // ==========================================================================
  getChildProgress: familyMemberService.getChildProgress.bind(familyMemberService),

  // ==========================================================================
  // FAMILY OVERVIEW (from familyMemberService)
  // ==========================================================================
  getFamilyOverview: familyMemberService.getFamilyOverview.bind(familyMemberService),

  // ==========================================================================
  // FAMILY SHARING - ACCOUNTS (from familyRelationshipService)
  // ==========================================================================
  getFamilyAccount: familyRelationshipService.getFamilyAccount.bind(familyRelationshipService),
  getGuardians: familyRelationshipService.getGuardians.bind(familyRelationshipService),

  // ==========================================================================
  // FAMILY HEALTH (from familyHealthService)
  // ==========================================================================
  getEmergencyInfo: familyHealthService.getEmergencyInfo.bind(familyHealthService),
  updateMedicalInfo: familyHealthService.updateMedicalInfo.bind(familyHealthService),
  updateEmergencyContacts:
    familyHealthService.updateEmergencyContacts.bind(familyHealthService),
  updateConsents: familyHealthService.updateConsents.bind(familyHealthService),

  // ==========================================================================
  // FAMILY SHARING - PERMISSIONS (from familyPermissionService)
  // ==========================================================================
  getGuardianPermissions: familyPermissionService.getPermissions.bind(familyPermissionService),
  hasPermission: familyPermissionService.hasPermission.bind(familyPermissionService),
  updateGuardianPermissions:
    familyPermissionService.updatePermissions.bind(familyPermissionService),
  updateGuardianChildAccess:
    familyPermissionService.updateChildAccess.bind(familyPermissionService),
  getAccessibleChildren:
    familyPermissionService.getAccessibleChildren.bind(familyPermissionService),

  // ==========================================================================
  // FAMILY SHARING - INVITES (from familyRelationshipService)
  // ==========================================================================
  inviteGuardian: familyRelationshipService.inviteGuardian.bind(familyRelationshipService),
  getPendingInvitesForUser:
    familyRelationshipService.getPendingInvitesForUser.bind(familyRelationshipService),
  acceptInvite: familyRelationshipService.acceptInvite.bind(familyRelationshipService),
  declineInvite: familyRelationshipService.declineInvite.bind(familyRelationshipService),
  cancelInvite: familyRelationshipService.cancelInvite.bind(familyRelationshipService),

  // ==========================================================================
  // FAMILY SHARING - GUARDIANS (from familyRelationshipService)
  // ==========================================================================
  removeGuardian: familyRelationshipService.removeGuardian.bind(familyRelationshipService),
  clearCache: familyRelationshipService.clearCache.bind(familyRelationshipService),

  // ==========================================================================
  // UTILITY METHODS (from familyMemberService)
  // ==========================================================================
  getNextChildColor: familyMemberService.getNextChildColor.bind(familyMemberService),
  formatAmount: familyMemberService.formatAmount.bind(familyMemberService),
  seedDemoData: familyMemberService.seedDemoData.bind(familyMemberService),
  clearAllData: familyMemberService.clearAllData.bind(familyMemberService),
};

// Also export as familyServices for consistency with other modules
export const familyServices = familyService;
