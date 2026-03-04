/**
 * Family Relationship Service
 *
 * Handles parent/child linking, guardian management, and invitation flow.
 * Single responsibility: guardian lifecycle and relationships.
 */

import { apiClient } from '../api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { notificationTriggers } from '../notification-trigger';
import { userService } from '../user-service';
import { familyPermissionService } from './family-permission-service';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  storageError,
  validationError,
  conflictError,
} from '@/types/result';
import {
  type FamilyAccount,
  type FamilyGuardian,
  type GuardianInvite,
  type GuardianRole,
  type GuardianPermission,
} from '@/constants/types';

const logger = createLogger('FamilyRelationshipService');
const USE_MOCK = api.useMock;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default permissions for each guardian role.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<GuardianRole, GuardianPermission[]> = {
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

/**
 * Relationship type options for the invite flow.
 */
export const RELATIONSHIP_OPTIONS = [
  'Co-parent',
  'Grandparent',
  'Aunt/Uncle',
  'Family friend',
  'Nanny/Caregiver',
  'Other guardian',
] as const;

/**
 * Permission descriptions for UI display.
 */
export const PERMISSION_DESCRIPTIONS: Record<
  GuardianPermission,
  { label: string; description: string }
> = {
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
  private accountsCache: Map<string, FamilyAccount> = new Map();

  // ==========================================================================
  // STORAGE HELPERS
  // ==========================================================================

  private async loadAccounts(): Promise<FamilyAccount[]> {
    try {
      if (USE_MOCK) {
        return [];
      }
      const accounts = await apiClient.get<FamilyAccount[]>(STORAGE_KEYS.FAMILY_ACCOUNTS, []);
      accounts.forEach((a: FamilyAccount) => this.accountsCache.set(a.id, a));
      return accounts;
    } catch (error) {
      logger.error('Failed to load family accounts', error);
      return [];
    }
  }

  private async saveAccounts(accounts: FamilyAccount[]): Promise<void> {
    if (USE_MOCK) {
      return;
    }
    await apiClient.set(STORAGE_KEYS.FAMILY_ACCOUNTS, accounts);
    accounts.forEach((a) => this.accountsCache.set(a.id, a));
  }

  private async loadInvites(): Promise<GuardianInvite[]> {
    try {
      if (USE_MOCK) {
        return [];
      }
      return await apiClient.get<GuardianInvite[]>(STORAGE_KEYS.GUARDIAN_INVITES, []);
    } catch (error) {
      logger.error('Failed to load invites', error);
      return [];
    }
  }

  private async saveInvites(invites: GuardianInvite[]): Promise<void> {
    if (USE_MOCK) {
      return;
    }
    await apiClient.set(STORAGE_KEYS.GUARDIAN_INVITES, invites);
  }

  // ==========================================================================
  // FAMILY ACCOUNTS
  // ==========================================================================

  /**
   * Get or create a family account for a user.
   */
  async getFamilyAccount(userId: string, userName: string): Promise<FamilyAccount> {
    const accounts = await this.loadAccounts();

    // Find existing account where user is primary or a guardian
    let account = accounts.find(
      (a) => a.primaryGuardianId === userId || a.guardians.some((g) => g.userId === userId),
    );

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
            email: '',
            role: 'PRIMARY',
            permissions: DEFAULT_ROLE_PERMISSIONS.PRIMARY,
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
  async getOrCreateAccount(
    userId: string,
    userName: string,
  ): Promise<Result<FamilyAccount, ServiceError>> {
    try {
      const account = await this.getFamilyAccount(userId, userName);
      return ok(account);
    } catch (error) {
      logger.error('get_or_create_account_failed', { userId, error });
      return err(storageError('Failed to get or create family account'));
    }
  }

  // ==========================================================================
  // GUARDIANS
  // ==========================================================================

  /**
   * Get all guardians for a family.
   */
  async getGuardians(familyId: string): Promise<FamilyGuardian[]> {
    const accounts = await this.loadAccounts();
    const account = accounts.find((a) => a.id === familyId);
    return account?.guardians || [];
  }

  /**
   * Get a specific guardian.
   */
  async getGuardian(familyId: string, guardianId: string): Promise<FamilyGuardian | null> {
    const guardians = await this.getGuardians(familyId);
    return guardians.find((g) => g.id === guardianId) || null;
  }

  /**
   * Remove a guardian from the family.
   */
  async removeGuardian(
    familyId: string,
    requesterId: string,
    guardianId: string,
  ): Promise<Result<void, ServiceError>> {
    const hasAdmin = await familyPermissionService.isAdmin(requesterId, familyId);
    if (!hasAdmin) {
      return err(storageError('You do not have permission to remove guardians'));
    }

    const accounts = await this.loadAccounts();
    const account = accounts.find((a) => a.id === familyId);

    if (!account) {
      return err(notFound('Family account', familyId));
    }

    const guardian = account.guardians.find((g) => g.id === guardianId);
    if (!guardian) {
      return err(notFound('Guardian', guardianId));
    }

    if (guardian.isPrimary) {
      return err(validationError('Cannot remove the primary guardian'));
    }

    account.guardians = account.guardians.filter((g) => g.id !== guardianId);
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);

    // Trigger notification for removed guardian
    await notificationTriggers.guardianRemoved(account.name, guardian.userId);

    logger.debug('GuardianRemoved', { familyId, guardianId });
    return ok(undefined);
  }

  // ==========================================================================
  // INVITATIONS
  // ==========================================================================

  /**
   * Invite a new guardian to the family.
   */
  async inviteGuardian(
    familyId: string,
    inviterId: string,
    inviterName: string,
    inviteeEmail: string,
    inviteeName: string,
    role: GuardianRole,
    relationship: string,
    childAccess: string[],
    message?: string,
  ): Promise<Result<GuardianInvite, ServiceError>> {
    // Check if inviter has permission
    const hasAdmin = await familyPermissionService.isAdmin(inviterId, familyId);
    if (!hasAdmin) {
      return err(storageError('You do not have permission to invite guardians'));
    }

    // Check for existing pending invite
    const invites = await this.loadInvites();
    const existingInvite = invites.find(
      (i) =>
        i.familyId === familyId &&
        i.inviteeEmail.toLowerCase() === inviteeEmail.toLowerCase() &&
        i.status === 'PENDING',
    );

    if (existingInvite) {
      return err(conflictError('An invitation has already been sent to this email'));
    }

    // Create invite with 7-day expiry
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 7);

    const invite: GuardianInvite = {
      id: `invite_${Date.now()}`,
      familyId,
      inviteeEmail: inviteeEmail.toLowerCase(),
      inviteeName,
      role,
      permissions: DEFAULT_ROLE_PERMISSIONS[role],
      relationship,
      childAccess,
      status: 'PENDING',
      invitedBy: inviterId,
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

    // Send notification to the invitee when they already have an account.
    const inviteeLookup = await userService.searchUsers(inviteeEmail);
    if (inviteeLookup.success) {
      const normalizedEmail = inviteeEmail.toLowerCase();
      const inviteeUser = inviteeLookup.data.find(
        (user) => user.email.trim().toLowerCase() === normalizedEmail,
      );
      if (inviteeUser?.id) {
        await notificationTriggers.guardianInvited(account?.name || 'Family', inviteeUser.id);
      } else {
        logger.debug('guardian_invite_notification_skipped_no_recipient', {
          familyId,
          inviteeEmail: normalizedEmail,
        });
      }
    } else {
      logger.warn('guardian_invite_notification_lookup_failed', {
        familyId,
        inviteeEmail,
        error: inviteeLookup.error,
      });
    }

    logger.success('GuardianInvited', { familyId, inviteeEmail, role });

    return ok(invite);
  }

  /**
   * Get pending invites for a user by email.
   */
  async getPendingInvitesForUser(email: string): Promise<GuardianInvite[]> {
    const invites = await this.loadInvites();
    const now = new Date();

    return invites.filter(
      (i) =>
        i.inviteeEmail.toLowerCase() === email.toLowerCase() &&
        i.status === 'PENDING' &&
        new Date(i.expiresAt) > now,
    );
  }

  /**
   * Accept a guardian invitation.
   */
  async acceptInvite(
    inviteId: string,
    userId: string,
    userName: string,
    userEmail: string,
  ): Promise<Result<FamilyAccount, ServiceError>> {
    const invites = await this.loadInvites();
    const invite = invites.find((i) => i.id === inviteId);

    if (!invite) {
      return err(notFound('Invitation', inviteId));
    }

    if (invite.status !== 'PENDING') {
      return err(conflictError('This invitation has already been responded to'));
    }

    if (new Date(invite.expiresAt) < new Date()) {
      invite.status = 'EXPIRED';
      await this.saveInvites(invites);
      return err(validationError('This invitation has expired'));
    }

    // Update invite status
    invite.status = 'ACCEPTED';
    invite.respondedAt = new Date().toISOString();
    await this.saveInvites(invites);

    // Add guardian to family
    const accounts = await this.loadAccounts();
    const account = accounts.find((a) => a.id === invite.familyId);

    if (!account) {
      return err(notFound('Family account', invite.familyId));
    }

    const newGuardian: FamilyGuardian = {
      id: `guardian_${Date.now()}`,
      userId,
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
    emitTyped(ServiceEvents.FAMILY_LINK_CREATED, {
      familyId: invite.familyId,
      guardianId: userId,
      guardianName: userName,
      role: invite.role,
    });

    return ok(account);
  }

  /**
   * Decline a guardian invitation.
   */
  async declineInvite(inviteId: string): Promise<Result<void, ServiceError>> {
    const invites = await this.loadInvites();
    const invite = invites.find((i) => i.id === inviteId);

    if (!invite) {
      return err(notFound('Invitation', inviteId));
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
    return ok(undefined);
  }

  /**
   * Cancel a pending invitation.
   */
  async cancelInvite(
    familyId: string,
    requesterId: string,
    inviteId: string,
  ): Promise<Result<void, ServiceError>> {
    const hasAdmin = await familyPermissionService.isAdmin(requesterId, familyId);
    if (!hasAdmin) {
      return err(storageError('You do not have permission to cancel invitations'));
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
    return ok(undefined);
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  /**
   * Clear sharing cache.
   */
  clearCache(): void {
    this.accountsCache.clear();
  }
}

export const familyRelationshipService = new FamilyRelationshipService();
