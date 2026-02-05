/**
 * Family Services - Unified Export
 *
 * This module provides a clean API for family-related operations.
 * The original monolithic familyService is split into focused services:
 *
 * - familyMemberService: Child/member CRUD
 * - familyGuardianService: Guardian management & invites
 * - familyPermissionService: Authorization checks
 *
 * For backward compatibility, this module also exports a facade
 * that delegates to the appropriate service.
 */

// Export individual services
/**
 * Backward-compatible facade that delegates to focused services.
 * Use individual services for new code.
 *
 * @deprecated Use individual services: familyMemberService, familyGuardianService, familyPermissionService
 */
import { familyMemberService } from './family-member-service';
import { familyGuardianService } from './family-guardian-service';
import { familyPermissionService } from './family-permission-service';

export { familyMemberService } from './family-member-service';
export { familyGuardianService } from './family-guardian-service';
export { familyPermissionService } from './family-permission-service';

// Export types
export * from './types';

// Re-export permission descriptions for UI
export { PERMISSION_DESCRIPTIONS, RELATIONSHIP_OPTIONS } from '../family-service';

export const familyServices = {
  // Members
  getFamilyMembers: familyMemberService.getAll.bind(familyMemberService),
  getFamilyMember: familyMemberService.getById.bind(familyMemberService),
  addFamilyMember: familyMemberService.create.bind(familyMemberService),
  updateFamilyMember: familyMemberService.update.bind(familyMemberService),

  // Guardians
  getFamilyAccount: familyGuardianService.getOrCreateAccount.bind(familyGuardianService),
  getGuardians: familyGuardianService.getGuardians.bind(familyGuardianService),
  inviteGuardian: familyGuardianService.inviteGuardian.bind(familyGuardianService),
  acceptInvite: familyGuardianService.acceptInvite.bind(familyGuardianService),
  declineInvite: familyGuardianService.declineInvite.bind(familyGuardianService),
  removeGuardian: familyGuardianService.removeGuardian.bind(familyGuardianService),
  getPendingInvitesForUser: familyGuardianService.getPendingInvitesForUser.bind(familyGuardianService),

  // Permissions
  getGuardianPermissions: familyPermissionService.getPermissions.bind(familyPermissionService),
  hasPermission: familyPermissionService.hasPermission.bind(familyPermissionService),
  updateGuardianPermissions: familyPermissionService.updatePermissions.bind(familyPermissionService),
  updateGuardianChildAccess: familyPermissionService.updateChildAccess.bind(familyPermissionService),
  getAccessibleChildren: familyPermissionService.getAccessibleChildren.bind(familyPermissionService),
};
