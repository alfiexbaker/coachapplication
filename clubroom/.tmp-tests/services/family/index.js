"use strict";
/**
 * Family Services - Unified Export
 *
 * This module provides a clean API for family-related operations.
 * The original monolithic familyService is split into focused services:
 *
 * - familyMemberService: Child/member CRUD, bookings, calendar, spending, progress, overview
 * - familyRelationshipService: Guardian management & invites
 * - familyPermissionService: Authorization checks and access control
 *
 * For backward compatibility, this module exports a facade (`familyService`)
 * that maintains the same API as the original service.
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.familyServices = exports.familyService = exports.familyPermissionService = exports.PERMISSION_DESCRIPTIONS = exports.RELATIONSHIP_OPTIONS = exports.DEFAULT_ROLE_PERMISSIONS = exports.familyRelationshipService = exports.CHILD_COLORS = exports.familyMemberService = void 0;
// Export individual services
var family_member_service_1 = require("./family-member-service");
Object.defineProperty(exports, "familyMemberService", { enumerable: true, get: function () { return family_member_service_1.familyMemberService; } });
Object.defineProperty(exports, "CHILD_COLORS", { enumerable: true, get: function () { return family_member_service_1.CHILD_COLORS; } });
var family_relationship_service_1 = require("./family-relationship-service");
Object.defineProperty(exports, "familyRelationshipService", { enumerable: true, get: function () { return family_relationship_service_1.familyRelationshipService; } });
Object.defineProperty(exports, "DEFAULT_ROLE_PERMISSIONS", { enumerable: true, get: function () { return family_relationship_service_1.DEFAULT_ROLE_PERMISSIONS; } });
Object.defineProperty(exports, "RELATIONSHIP_OPTIONS", { enumerable: true, get: function () { return family_relationship_service_1.RELATIONSHIP_OPTIONS; } });
Object.defineProperty(exports, "PERMISSION_DESCRIPTIONS", { enumerable: true, get: function () { return family_relationship_service_1.PERMISSION_DESCRIPTIONS; } });
var family_permission_service_1 = require("./family-permission-service");
Object.defineProperty(exports, "familyPermissionService", { enumerable: true, get: function () { return family_permission_service_1.familyPermissionService; } });
// Export types
__exportStar(require("./types"), exports);
// Import for facade
const family_member_service_2 = require("./family-member-service");
const family_relationship_service_2 = require("./family-relationship-service");
const family_permission_service_2 = require("./family-permission-service");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('FamilyFacade');
void logger;
/**
 * Backward-compatible facade that delegates to focused services.
 * Use individual services for new code.
 *
 * @deprecated Use individual services: familyMemberService, familyRelationshipService, familyPermissionService
 */
exports.familyService = {
    // ==========================================================================
    // FAMILY MEMBERS (from familyMemberService)
    // ==========================================================================
    getFamilyMembers: family_member_service_2.familyMemberService.getFamilyMembers.bind(family_member_service_2.familyMemberService),
    getFamilyMember: family_member_service_2.familyMemberService.getFamilyMember.bind(family_member_service_2.familyMemberService),
    addFamilyMember: family_member_service_2.familyMemberService.addFamilyMember.bind(family_member_service_2.familyMemberService),
    updateFamilyMember: family_member_service_2.familyMemberService.updateFamilyMember.bind(family_member_service_2.familyMemberService),
    // ==========================================================================
    // BOOKINGS (from familyMemberService)
    // ==========================================================================
    getFamilyBookings: family_member_service_2.familyMemberService.getFamilyBookings.bind(family_member_service_2.familyMemberService),
    getChildBookings: family_member_service_2.familyMemberService.getChildBookings.bind(family_member_service_2.familyMemberService),
    // ==========================================================================
    // CALENDAR (from familyMemberService)
    // ==========================================================================
    getFamilyCalendar: family_member_service_2.familyMemberService.getFamilyCalendar.bind(family_member_service_2.familyMemberService),
    getUpcomingForFamily: family_member_service_2.familyMemberService.getUpcomingForFamily.bind(family_member_service_2.familyMemberService),
    getEventsGroupedByDate: family_member_service_2.familyMemberService.getEventsGroupedByDate.bind(family_member_service_2.familyMemberService),
    // ==========================================================================
    // SPENDING (from familyMemberService)
    // ==========================================================================
    getFamilySpending: family_member_service_2.familyMemberService.getFamilySpending.bind(family_member_service_2.familyMemberService),
    getFamilySpendingSummary: family_member_service_2.familyMemberService.getFamilySpendingSummary.bind(family_member_service_2.familyMemberService),
    // ==========================================================================
    // CHILD PROGRESS (from familyMemberService)
    // ==========================================================================
    getChildProgress: family_member_service_2.familyMemberService.getChildProgress.bind(family_member_service_2.familyMemberService),
    // ==========================================================================
    // FAMILY OVERVIEW (from familyMemberService)
    // ==========================================================================
    getFamilyOverview: family_member_service_2.familyMemberService.getFamilyOverview.bind(family_member_service_2.familyMemberService),
    // ==========================================================================
    // FAMILY SHARING - ACCOUNTS (from familyRelationshipService)
    // ==========================================================================
    getFamilyAccount: family_relationship_service_2.familyRelationshipService.getFamilyAccount.bind(family_relationship_service_2.familyRelationshipService),
    getGuardians: family_relationship_service_2.familyRelationshipService.getGuardians.bind(family_relationship_service_2.familyRelationshipService),
    // ==========================================================================
    // FAMILY SHARING - PERMISSIONS (from familyPermissionService)
    // ==========================================================================
    getGuardianPermissions: family_permission_service_2.familyPermissionService.getPermissions.bind(family_permission_service_2.familyPermissionService),
    hasPermission: family_permission_service_2.familyPermissionService.hasPermission.bind(family_permission_service_2.familyPermissionService),
    updateGuardianPermissions: family_permission_service_2.familyPermissionService.updatePermissions.bind(family_permission_service_2.familyPermissionService),
    updateGuardianChildAccess: family_permission_service_2.familyPermissionService.updateChildAccess.bind(family_permission_service_2.familyPermissionService),
    getAccessibleChildren: family_permission_service_2.familyPermissionService.getAccessibleChildren.bind(family_permission_service_2.familyPermissionService),
    // ==========================================================================
    // FAMILY SHARING - INVITES (from familyRelationshipService)
    // ==========================================================================
    inviteGuardian: family_relationship_service_2.familyRelationshipService.inviteGuardian.bind(family_relationship_service_2.familyRelationshipService),
    getPendingInvitesForUser: family_relationship_service_2.familyRelationshipService.getPendingInvitesForUser.bind(family_relationship_service_2.familyRelationshipService),
    acceptInvite: family_relationship_service_2.familyRelationshipService.acceptInvite.bind(family_relationship_service_2.familyRelationshipService),
    declineInvite: family_relationship_service_2.familyRelationshipService.declineInvite.bind(family_relationship_service_2.familyRelationshipService),
    cancelInvite: family_relationship_service_2.familyRelationshipService.cancelInvite.bind(family_relationship_service_2.familyRelationshipService),
    // ==========================================================================
    // FAMILY SHARING - GUARDIANS (from familyRelationshipService)
    // ==========================================================================
    removeGuardian: family_relationship_service_2.familyRelationshipService.removeGuardian.bind(family_relationship_service_2.familyRelationshipService),
    clearCache: family_relationship_service_2.familyRelationshipService.clearCache.bind(family_relationship_service_2.familyRelationshipService),
    // ==========================================================================
    // UTILITY METHODS (from familyMemberService)
    // ==========================================================================
    getNextChildColor: family_member_service_2.familyMemberService.getNextChildColor.bind(family_member_service_2.familyMemberService),
    formatAmount: family_member_service_2.familyMemberService.formatAmount.bind(family_member_service_2.familyMemberService),
    seedDemoData: family_member_service_2.familyMemberService.seedDemoData.bind(family_member_service_2.familyMemberService),
    clearAllData: family_member_service_2.familyMemberService.clearAllData.bind(family_member_service_2.familyMemberService),
};
// Also export as familyServices for consistency with other modules
exports.familyServices = exports.familyService;
