"use strict";
/**
 * Family Relationship Service
 *
 * Handles parent/child linking, guardian management, and invitation flow.
 * Single responsibility: guardian lifecycle and relationships.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.familyRelationshipService = exports.PERMISSION_DESCRIPTIONS = exports.RELATIONSHIP_OPTIONS = exports.DEFAULT_ROLE_PERMISSIONS = void 0;
const api_client_1 = require("../api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const notification_trigger_1 = require("../notification-trigger");
const family_permission_service_1 = require("./family-permission-service");
const event_bus_1 = require("@/services/event-bus");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('FamilyRelationshipService');
const USE_MOCK = config_1.api.useMock;
// ============================================================================
// CONSTANTS
// ============================================================================
/**
 * Default permissions for each guardian role.
 */
exports.DEFAULT_ROLE_PERMISSIONS = {
    PRIMARY: ['VIEW_SCHEDULE', 'VIEW_PROGRESS', 'BOOK_SESSIONS', 'MANAGE_PAYMENTS', 'MANAGE_PROFILE', 'ADMIN'],
    GUARDIAN: ['VIEW_SCHEDULE', 'VIEW_PROGRESS', 'BOOK_SESSIONS'],
    VIEWER: ['VIEW_SCHEDULE', 'VIEW_PROGRESS'],
};
/**
 * Relationship type options for the invite flow.
 */
exports.RELATIONSHIP_OPTIONS = [
    'Co-parent',
    'Grandparent',
    'Aunt/Uncle',
    'Family friend',
    'Nanny/Caregiver',
    'Other guardian',
];
/**
 * Permission descriptions for UI display.
 */
exports.PERMISSION_DESCRIPTIONS = {
    VIEW_SCHEDULE: {
        label: 'View Schedule',
        description: 'See sessions, calendar, and upcoming bookings',
    },
    VIEW_PROGRESS: {
        label: 'View Progress',
        description: 'See badges, session notes, and development reports',
    },
    BOOK_SESSIONS: {
        label: 'Book Sessions',
        description: 'Book, reschedule, and cancel sessions',
    },
    MANAGE_PAYMENTS: {
        label: 'Manage Payments',
        description: 'View invoices and manage payment methods',
    },
    MANAGE_PROFILE: {
        label: 'Manage Profile',
        description: "Edit children's profile information",
    },
    ADMIN: {
        label: 'Admin Access',
        description: 'Add and remove guardians, full account control',
    },
};
// ============================================================================
// SERVICE CLASS
// ============================================================================
class FamilyRelationshipService {
    constructor() {
        this.accountsCache = new Map();
    }
    // ==========================================================================
    // STORAGE HELPERS
    // ==========================================================================
    async loadAccounts() {
        try {
            if (USE_MOCK) {
                return [];
            }
            const accounts = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.FAMILY_ACCOUNTS, []);
            accounts.forEach((a) => this.accountsCache.set(a.id, a));
            return accounts;
        }
        catch (error) {
            logger.error('Failed to load family accounts', error);
            return [];
        }
    }
    async saveAccounts(accounts) {
        if (USE_MOCK) {
            return;
        }
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.FAMILY_ACCOUNTS, accounts);
        accounts.forEach((a) => this.accountsCache.set(a.id, a));
    }
    async loadInvites() {
        try {
            if (USE_MOCK) {
                return [];
            }
            return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.GUARDIAN_INVITES, []);
        }
        catch (error) {
            logger.error('Failed to load invites', error);
            return [];
        }
    }
    async saveInvites(invites) {
        if (USE_MOCK) {
            return;
        }
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.GUARDIAN_INVITES, invites);
    }
    // ==========================================================================
    // FAMILY ACCOUNTS
    // ==========================================================================
    /**
     * Get or create a family account for a user.
     */
    async getFamilyAccount(userId, userName) {
        const accounts = await this.loadAccounts();
        // Find existing account where user is primary or a guardian
        let account = accounts.find((a) => a.primaryGuardianId === userId ||
            a.guardians.some((g) => g.userId === userId));
        if (!account) {
            // Create new family account
            account = {
                id: `family_${Date.now()}`,
                name: `${userName}'s Family`,
                primaryGuardianId: userId,
                guardians: [
                    {
                        id: `guardian_${Date.now()}`,
                        userId,
                        userName,
                        email: '',
                        role: 'PRIMARY',
                        permissions: exports.DEFAULT_ROLE_PERMISSIONS.PRIMARY,
                        relationship: 'Parent',
                        isPrimary: true,
                        childAccess: [],
                        addedAt: new Date().toISOString(),
                    },
                ],
                children: [],
                pendingInvites: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            accounts.push(account);
            await this.saveAccounts(accounts);
            logger.debug('Created new family account', { accountId: account.id });
        }
        return account;
    }
    /**
     * Get or create a family account with Result type.
     */
    async getOrCreateAccount(userId, userName) {
        try {
            const account = await this.getFamilyAccount(userId, userName);
            return (0, result_1.ok)(account);
        }
        catch (error) {
            logger.error('get_or_create_account_failed', { userId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to get or create family account'));
        }
    }
    // ==========================================================================
    // GUARDIANS
    // ==========================================================================
    /**
     * Get all guardians for a family.
     */
    async getGuardians(familyId) {
        const accounts = await this.loadAccounts();
        const account = accounts.find((a) => a.id === familyId);
        return account?.guardians || [];
    }
    /**
     * Get a specific guardian.
     */
    async getGuardian(familyId, guardianId) {
        const guardians = await this.getGuardians(familyId);
        return guardians.find((g) => g.id === guardianId) || null;
    }
    /**
     * Remove a guardian from the family.
     */
    async removeGuardian(familyId, requesterId, guardianId) {
        const hasAdmin = await family_permission_service_1.familyPermissionService.isAdmin(requesterId, familyId);
        if (!hasAdmin) {
            return (0, result_1.err)((0, result_1.storageError)('You do not have permission to remove guardians'));
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
            return (0, result_1.err)((0, result_1.validationError)('Cannot remove the primary guardian'));
        }
        account.guardians = account.guardians.filter((g) => g.id !== guardianId);
        account.updatedAt = new Date().toISOString();
        await this.saveAccounts(accounts);
        // Trigger notification for removed guardian
        await notification_trigger_1.notificationTriggers.guardianRemoved(account.name, guardian.userId);
        logger.debug('GuardianRemoved', { familyId, guardianId });
        return (0, result_1.ok)(undefined);
    }
    // ==========================================================================
    // INVITATIONS
    // ==========================================================================
    /**
     * Invite a new guardian to the family.
     */
    async inviteGuardian(familyId, inviterId, inviterName, inviteeEmail, inviteeName, role, relationship, childAccess, message) {
        // Check if inviter has permission
        const hasAdmin = await family_permission_service_1.familyPermissionService.isAdmin(inviterId, familyId);
        if (!hasAdmin) {
            return (0, result_1.err)((0, result_1.storageError)('You do not have permission to invite guardians'));
        }
        // Check for existing pending invite
        const invites = await this.loadInvites();
        const existingInvite = invites.find((i) => i.familyId === familyId &&
            i.inviteeEmail.toLowerCase() === inviteeEmail.toLowerCase() &&
            i.status === 'PENDING');
        if (existingInvite) {
            return (0, result_1.err)((0, result_1.conflictError)('An invitation has already been sent to this email'));
        }
        // Create invite with 7-day expiry
        const now = new Date();
        const expires = new Date(now);
        expires.setDate(expires.getDate() + 7);
        const invite = {
            id: `invite_${Date.now()}`,
            familyId,
            inviteeEmail: inviteeEmail.toLowerCase(),
            inviteeName,
            role,
            permissions: exports.DEFAULT_ROLE_PERMISSIONS[role],
            relationship,
            childAccess,
            status: 'PENDING',
            invitedBy: inviterId,
            inviterName,
            createdAt: now.toISOString(),
            expiresAt: expires.toISOString(),
            message,
        };
        invites.push(invite);
        await this.saveInvites(invites);
        // Add to family's pending invites
        const accounts = await this.loadAccounts();
        const account = accounts.find((a) => a.id === familyId);
        if (account) {
            account.pendingInvites.push(invite);
            account.updatedAt = now.toISOString();
            await this.saveAccounts(accounts);
        }
        // Send notification
        await notification_trigger_1.notificationTriggers.guardianInvited(account?.name || 'Family');
        logger.success('GuardianInvited', { familyId, inviteeEmail, role });
        return (0, result_1.ok)(invite);
    }
    /**
     * Get pending invites for a user by email.
     */
    async getPendingInvitesForUser(email) {
        const invites = await this.loadInvites();
        const now = new Date();
        return invites.filter((i) => i.inviteeEmail.toLowerCase() === email.toLowerCase() &&
            i.status === 'PENDING' &&
            new Date(i.expiresAt) > now);
    }
    /**
     * Accept a guardian invitation.
     */
    async acceptInvite(inviteId, userId, userName, userEmail) {
        const invites = await this.loadInvites();
        const invite = invites.find((i) => i.id === inviteId);
        if (!invite) {
            return (0, result_1.err)((0, result_1.notFound)('Invitation', inviteId));
        }
        if (invite.status !== 'PENDING') {
            return (0, result_1.err)((0, result_1.conflictError)('This invitation has already been responded to'));
        }
        if (new Date(invite.expiresAt) < new Date()) {
            invite.status = 'EXPIRED';
            await this.saveInvites(invites);
            return (0, result_1.err)((0, result_1.validationError)('This invitation has expired'));
        }
        // Update invite status
        invite.status = 'ACCEPTED';
        invite.respondedAt = new Date().toISOString();
        await this.saveInvites(invites);
        // Add guardian to family
        const accounts = await this.loadAccounts();
        const account = accounts.find((a) => a.id === invite.familyId);
        if (!account) {
            return (0, result_1.err)((0, result_1.notFound)('Family account', invite.familyId));
        }
        const newGuardian = {
            id: `guardian_${Date.now()}`,
            userId,
            userName,
            email: userEmail,
            role: invite.role,
            permissions: invite.permissions,
            relationship: invite.relationship,
            isPrimary: false,
            childAccess: invite.childAccess,
            addedAt: new Date().toISOString(),
            invitedBy: invite.invitedBy,
        };
        account.guardians.push(newGuardian);
        account.pendingInvites = account.pendingInvites.filter((i) => i.id !== inviteId);
        account.updatedAt = new Date().toISOString();
        await this.saveAccounts(accounts);
        logger.success('InviteAccepted', {
            inviteId,
            familyId: invite.familyId,
            userId,
        });
        // Emit typed event for cross-service reactions
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.FAMILY_LINK_CREATED, {
            familyId: invite.familyId,
            guardianId: userId,
            guardianName: userName,
            role: invite.role,
        });
        return (0, result_1.ok)(account);
    }
    /**
     * Decline a guardian invitation.
     */
    async declineInvite(inviteId) {
        const invites = await this.loadInvites();
        const invite = invites.find((i) => i.id === inviteId);
        if (!invite) {
            return (0, result_1.err)((0, result_1.notFound)('Invitation', inviteId));
        }
        invite.status = 'DECLINED';
        invite.respondedAt = new Date().toISOString();
        await this.saveInvites(invites);
        // Remove from family's pending invites
        const accounts = await this.loadAccounts();
        const account = accounts.find((a) => a.id === invite.familyId);
        if (account) {
            account.pendingInvites = account.pendingInvites.filter((i) => i.id !== inviteId);
            account.updatedAt = new Date().toISOString();
            await this.saveAccounts(accounts);
        }
        logger.debug('InviteDeclined', { inviteId });
        return (0, result_1.ok)(undefined);
    }
    /**
     * Cancel a pending invitation.
     */
    async cancelInvite(familyId, requesterId, inviteId) {
        const hasAdmin = await family_permission_service_1.familyPermissionService.isAdmin(requesterId, familyId);
        if (!hasAdmin) {
            return (0, result_1.err)((0, result_1.storageError)('You do not have permission to cancel invitations'));
        }
        const invites = await this.loadInvites();
        const inviteIndex = invites.findIndex((i) => i.id === inviteId);
        if (inviteIndex >= 0) {
            invites.splice(inviteIndex, 1);
            await this.saveInvites(invites);
        }
        const accounts = await this.loadAccounts();
        const account = accounts.find((a) => a.id === familyId);
        if (account) {
            account.pendingInvites = account.pendingInvites.filter((i) => i.id !== inviteId);
            await this.saveAccounts(accounts);
        }
        logger.debug('InviteCancelled', { familyId, inviteId });
        return (0, result_1.ok)(undefined);
    }
    // ==========================================================================
    // CACHE MANAGEMENT
    // ==========================================================================
    /**
     * Clear sharing cache.
     */
    clearCache() {
        this.accountsCache.clear();
    }
}
exports.familyRelationshipService = new FamilyRelationshipService();
