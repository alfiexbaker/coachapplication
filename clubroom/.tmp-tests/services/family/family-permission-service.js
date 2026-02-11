"use strict";
/**
 * Family Permission Service
 *
 * Handles permission checks and updates for family guardians.
 * Single responsibility: authorization logic and access control.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.familyPermissionService = exports.DEFAULT_ROLE_PERMISSIONS = void 0;
const api_client_1 = require("../api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const notification_trigger_1 = require("../notification-trigger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('FamilyPermissionService');
const USE_MOCK = config_1.api.useMock;
// ============================================================================
// CONSTANTS
// ============================================================================
/**
 * Default permissions for each guardian role.
 */
exports.DEFAULT_ROLE_PERMISSIONS = {
    PRIMARY: [
        'VIEW_SCHEDULE',
        'VIEW_PROGRESS',
        'BOOK_SESSIONS',
        'MANAGE_PAYMENTS',
        'MANAGE_PROFILE',
        'ADMIN',
    ],
    GUARDIAN: ['VIEW_SCHEDULE', 'VIEW_PROGRESS', 'BOOK_SESSIONS'],
    VIEWER: ['VIEW_SCHEDULE', 'VIEW_PROGRESS'],
};
// ============================================================================
// SERVICE CLASS
// ============================================================================
class FamilyPermissionService {
    // ==========================================================================
    // STORAGE HELPERS
    // ==========================================================================
    async loadAccounts() {
        if (USE_MOCK) {
            return [];
        }
        return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.FAMILY_ACCOUNTS, []);
    }
    async saveAccounts(accounts) {
        if (USE_MOCK) {
            return;
        }
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.FAMILY_ACCOUNTS, accounts);
    }
    // ==========================================================================
    // PERMISSION QUERIES
    // ==========================================================================
    /**
     * Get guardian's permissions for a specific family.
     */
    async getPermissions(userId, familyId) {
        const accounts = await this.loadAccounts();
        const account = accounts.find((a) => a.id === familyId);
        const guardian = account?.guardians.find((g) => g.userId === userId);
        return guardian?.permissions || [];
    }
    /**
     * Get guardian's permissions with Result type.
     */
    async getGuardianPermissions(userId, familyId) {
        try {
            const permissions = await this.getPermissions(userId, familyId);
            return (0, result_1.ok)(permissions);
        }
        catch (error) {
            logger.error('get_guardian_permissions_failed', { userId, familyId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to retrieve permissions'));
        }
    }
    /**
     * Check if a user has a specific permission.
     */
    async hasPermission(userId, familyId, permission) {
        const permissions = await this.getPermissions(userId, familyId);
        // ADMIN permission grants all permissions
        return permissions.includes(permission) || permissions.includes('ADMIN');
    }
    /**
     * Check if user can book sessions.
     */
    async canBook(userId, familyId) {
        return this.hasPermission(userId, familyId, 'BOOK_SESSIONS');
    }
    /**
     * Check if user can view schedule.
     */
    async canViewSchedule(userId, familyId) {
        return this.hasPermission(userId, familyId, 'VIEW_SCHEDULE');
    }
    /**
     * Check if user can view progress.
     */
    async canViewProgress(userId, familyId) {
        return this.hasPermission(userId, familyId, 'VIEW_PROGRESS');
    }
    /**
     * Check if user can manage payments.
     */
    async canManagePayments(userId, familyId) {
        return this.hasPermission(userId, familyId, 'MANAGE_PAYMENTS');
    }
    /**
     * Check if user has admin access.
     */
    async isAdmin(userId, familyId) {
        return this.hasPermission(userId, familyId, 'ADMIN');
    }
    // ==========================================================================
    // PERMISSION UPDATES
    // ==========================================================================
    /**
     * Update guardian permissions.
     */
    async updatePermissions(familyId, requesterId, guardianId, newPermissions) {
        // Check if requester has admin permission
        const hasAdmin = await this.isAdmin(requesterId, familyId);
        if (!hasAdmin) {
            return (0, result_1.err)((0, result_1.unauthorized)('You do not have permission to modify guardians'));
        }
        const accounts = await this.loadAccounts();
        const account = accounts.find((a) => a.id === familyId);
        if (!account) {
            return (0, result_1.err)((0, result_1.notFound)('Family account', familyId));
        }
        const guardian = account.guardians.find((g) => g.id === guardianId);
        if (!guardian) {
            return (0, result_1.err)((0, result_1.notFound)('Guardian', guardianId));
        }
        if (guardian.isPrimary) {
            return (0, result_1.err)((0, result_1.unauthorized)('Cannot modify primary guardian permissions'));
        }
        guardian.permissions = newPermissions;
        account.updatedAt = new Date().toISOString();
        await this.saveAccounts(accounts);
        // Notify the guardian
        await notification_trigger_1.notificationTriggers.guardianPermissionsUpdated(guardian.userId);
        logger.debug('PermissionsUpdated', { familyId, guardianId, newPermissions });
        return (0, result_1.ok)(guardian);
    }
    /**
     * Update guardian permissions with Result type.
     */
    async updateGuardianPermissions(familyId, requesterId, guardianId, newPermissions) {
        return this.updatePermissions(familyId, requesterId, guardianId, newPermissions);
    }
    // ==========================================================================
    // CHILD ACCESS
    // ==========================================================================
    /**
     * Update guardian's child access list.
     */
    async updateChildAccess(familyId, requesterId, guardianId, childIds) {
        const hasAdmin = await this.isAdmin(requesterId, familyId);
        if (!hasAdmin) {
            return (0, result_1.err)((0, result_1.unauthorized)('You do not have permission to modify guardians'));
        }
        const accounts = await this.loadAccounts();
        const account = accounts.find((a) => a.id === familyId);
        if (!account) {
            return (0, result_1.err)((0, result_1.notFound)('Family account', familyId));
        }
        const guardian = account.guardians.find((g) => g.id === guardianId);
        if (!guardian) {
            return (0, result_1.err)((0, result_1.notFound)('Guardian', guardianId));
        }
        guardian.childAccess = childIds;
        account.updatedAt = new Date().toISOString();
        await this.saveAccounts(accounts);
        logger.debug('ChildAccessUpdated', { familyId, guardianId, childIds });
        return (0, result_1.ok)(guardian);
    }
    /**
     * Update guardian child access with Result type.
     */
    async updateGuardianChildAccess(familyId, requesterId, guardianId, childIds) {
        return this.updateChildAccess(familyId, requesterId, guardianId, childIds);
    }
    /**
     * Get children that a guardian has access to.
     * Empty childAccess means access to all children.
     */
    async getAccessibleChildren(userId, familyId) {
        const accounts = await this.loadAccounts();
        const account = accounts.find((a) => a.id === familyId);
        if (!account) {
            return [];
        }
        const guardian = account.guardians.find((g) => g.userId === userId);
        if (!guardian) {
            return [];
        }
        // Empty childAccess or primary guardian = access to all
        if (guardian.childAccess.length === 0 || guardian.isPrimary) {
            return account.children;
        }
        return account.children.filter((c) => guardian.childAccess.includes(c.id));
    }
    // ==========================================================================
    // UTILITY METHODS
    // ==========================================================================
    /**
     * Get default permissions for a role.
     */
    getDefaultPermissions(role) {
        return [...exports.DEFAULT_ROLE_PERMISSIONS[role]];
    }
}
exports.familyPermissionService = new FamilyPermissionService();
