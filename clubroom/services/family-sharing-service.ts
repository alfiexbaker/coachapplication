/**
 * Family Sharing Service
 *
 * Manages multi-guardian access to family accounts:
 * - Invite and manage guardians (co-parents, grandparents, nannies)
 * - Permission-based access control
 * - Track guardian activity
 *
 * USER STORY:
 * "As a parent, I want to invite my partner to access our children's
 * schedules so we can both manage bookings and track progress."
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  FamilyAccount,
  FamilyGuardian,
  FamilyMember,
  GuardianInvite,
  GuardianPermission,
  GuardianRole,
} from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FamilySharingService');
const STORAGE_KEY = 'family_accounts';
const INVITES_KEY = 'guardian_invites';

/**
 * Default permissions for each role
 */
const DEFAULT_PERMISSIONS: Record<GuardianRole, GuardianPermission[]> = {
  PRIMARY: ['VIEW_SCHEDULE', 'VIEW_PROGRESS', 'BOOK_SESSIONS', 'MANAGE_PAYMENTS', 'MANAGE_PROFILE', 'ADMIN'],
  GUARDIAN: ['VIEW_SCHEDULE', 'VIEW_PROGRESS', 'BOOK_SESSIONS'],
  VIEWER: ['VIEW_SCHEDULE', 'VIEW_PROGRESS'],
};

/**
 * Permission descriptions for UI display
 */
export const PERMISSION_DESCRIPTIONS: Record<GuardianPermission, { label: string; description: string }> = {
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

/**
 * Relationship type options for the invite flow
 */
export const RELATIONSHIP_OPTIONS = [
  'Co-parent',
  'Grandparent',
  'Aunt/Uncle',
  'Family friend',
  'Nanny/Caregiver',
  'Other guardian',
];

class FamilySharingService {
  private accountsCache: Map<string, FamilyAccount> = new Map();

  /**
   * Load all family accounts
   */
  private async loadAccounts(): Promise<FamilyAccount[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const accounts = stored ? JSON.parse(stored) : [];
      accounts.forEach((a: FamilyAccount) => this.accountsCache.set(a.id, a));
      return accounts;
    } catch (error) {
      logger.error('Failed to load family accounts', error);
      return [];
    }
  }

  /**
   * Save family accounts
   */
  private async saveAccounts(accounts: FamilyAccount[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    accounts.forEach(a => this.accountsCache.set(a.id, a));
  }

  /**
   * Load pending invites
   */
  private async loadInvites(): Promise<GuardianInvite[]> {
    try {
      const stored = await AsyncStorage.getItem(INVITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('Failed to load invites', error);
      return [];
    }
  }

  /**
   * Save invites
   */
  private async saveInvites(invites: GuardianInvite[]): Promise<void> {
    await AsyncStorage.setItem(INVITES_KEY, JSON.stringify(invites));
  }

  /**
   * Get or create a family account for a user
   */
  async getFamilyAccount(userId: string, userName: string): Promise<FamilyAccount> {
    const accounts = await this.loadAccounts();
    let account = accounts.find(a =>
      a.primaryGuardianId === userId ||
      a.guardians.some(g => g.userId === userId)
    );

    if (!account) {
      // Create new family account
      account = {
        id: `family_${Date.now()}`,
        name: `${userName}'s Family`,
        primaryGuardianId: userId,
        guardians: [{
          id: `guardian_${Date.now()}`,
          userId,
          userName,
          email: '', // Would come from auth
          role: 'PRIMARY',
          permissions: DEFAULT_PERMISSIONS.PRIMARY,
          relationship: 'Parent',
          isPrimary: true,
          childAccess: [],
          addedAt: new Date().toISOString(),
        }],
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
   * Get all guardians for a family
   */
  async getGuardians(familyId: string): Promise<FamilyGuardian[]> {
    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);
    return account?.guardians || [];
  }

  /**
   * Get guardian's permissions for a specific family
   */
  async getGuardianPermissions(userId: string, familyId: string): Promise<GuardianPermission[]> {
    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);
    const guardian = account?.guardians.find(g => g.userId === userId);
    return guardian?.permissions || [];
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(
    userId: string,
    familyId: string,
    permission: GuardianPermission
  ): Promise<boolean> {
    const permissions = await this.getGuardianPermissions(userId, familyId);
    return permissions.includes(permission) || permissions.includes('ADMIN');
  }

  /**
   * Invite a new guardian to the family
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
    message?: string
  ): Promise<GuardianInvite> {
    // Check if inviter has permission
    const hasAdmin = await this.hasPermission(inviterId, familyId, 'ADMIN');
    if (!hasAdmin) {
      throw new Error('You do not have permission to invite guardians');
    }

    // Check for existing pending invite
    const invites = await this.loadInvites();
    const existingInvite = invites.find(
      i => i.familyId === familyId &&
           i.inviteeEmail.toLowerCase() === inviteeEmail.toLowerCase() &&
           i.status === 'PENDING'
    );

    if (existingInvite) {
      throw new Error('An invitation has already been sent to this email');
    }

    // Create invite
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 7); // 7 day expiry

    const invite: GuardianInvite = {
      id: `invite_${Date.now()}`,
      familyId,
      inviteeEmail: inviteeEmail.toLowerCase(),
      inviteeName,
      role,
      permissions: DEFAULT_PERMISSIONS[role],
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

    // Also add to family's pending invites
    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);
    if (account) {
      account.pendingInvites.push(invite);
      account.updatedAt = now.toISOString();
      await this.saveAccounts(accounts);
    }

    logger.success('GuardianInvited', {
      familyId,
      inviteeEmail,
      role,
    });

    return invite;
  }

  /**
   * Get pending invites for a user (by email)
   */
  async getPendingInvitesForUser(email: string): Promise<GuardianInvite[]> {
    const invites = await this.loadInvites();
    const now = new Date();

    return invites.filter(
      i => i.inviteeEmail.toLowerCase() === email.toLowerCase() &&
           i.status === 'PENDING' &&
           new Date(i.expiresAt) > now
    );
  }

  /**
   * Accept a guardian invitation
   */
  async acceptInvite(
    inviteId: string,
    userId: string,
    userName: string,
    userEmail: string
  ): Promise<FamilyAccount> {
    const invites = await this.loadInvites();
    const invite = invites.find(i => i.id === inviteId);

    if (!invite) {
      throw new Error('Invitation not found');
    }

    if (invite.status !== 'PENDING') {
      throw new Error('This invitation has already been responded to');
    }

    if (new Date(invite.expiresAt) < new Date()) {
      invite.status = 'EXPIRED';
      await this.saveInvites(invites);
      throw new Error('This invitation has expired');
    }

    // Update invite status
    invite.status = 'ACCEPTED';
    invite.respondedAt = new Date().toISOString();
    await this.saveInvites(invites);

    // Add guardian to family
    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === invite.familyId);

    if (!account) {
      throw new Error('Family account not found');
    }

    const newGuardian: FamilyGuardian = {
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
    account.pendingInvites = account.pendingInvites.filter(i => i.id !== inviteId);
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);

    logger.success('InviteAccepted', {
      inviteId,
      familyId: invite.familyId,
      userId,
    });

    return account;
  }

  /**
   * Decline a guardian invitation
   */
  async declineInvite(inviteId: string): Promise<void> {
    const invites = await this.loadInvites();
    const invite = invites.find(i => i.id === inviteId);

    if (!invite) {
      throw new Error('Invitation not found');
    }

    invite.status = 'DECLINED';
    invite.respondedAt = new Date().toISOString();
    await this.saveInvites(invites);

    // Remove from family's pending invites
    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === invite.familyId);
    if (account) {
      account.pendingInvites = account.pendingInvites.filter(i => i.id !== inviteId);
      account.updatedAt = new Date().toISOString();
      await this.saveAccounts(accounts);
    }

    logger.debug('InviteDeclined', { inviteId });
  }

  /**
   * Remove a guardian from the family
   */
  async removeGuardian(
    familyId: string,
    requesterId: string,
    guardianId: string
  ): Promise<void> {
    const hasAdmin = await this.hasPermission(requesterId, familyId, 'ADMIN');
    if (!hasAdmin) {
      throw new Error('You do not have permission to remove guardians');
    }

    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);

    if (!account) {
      throw new Error('Family account not found');
    }

    const guardian = account.guardians.find(g => g.id === guardianId);
    if (!guardian) {
      throw new Error('Guardian not found');
    }

    if (guardian.isPrimary) {
      throw new Error('Cannot remove the primary guardian');
    }

    account.guardians = account.guardians.filter(g => g.id !== guardianId);
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);
    logger.debug('GuardianRemoved', { familyId, guardianId });
  }

  /**
   * Update guardian permissions
   */
  async updateGuardianPermissions(
    familyId: string,
    requesterId: string,
    guardianId: string,
    newPermissions: GuardianPermission[]
  ): Promise<FamilyGuardian> {
    const hasAdmin = await this.hasPermission(requesterId, familyId, 'ADMIN');
    if (!hasAdmin) {
      throw new Error('You do not have permission to modify guardians');
    }

    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);

    if (!account) {
      throw new Error('Family account not found');
    }

    const guardian = account.guardians.find(g => g.id === guardianId);
    if (!guardian) {
      throw new Error('Guardian not found');
    }

    if (guardian.isPrimary) {
      throw new Error('Cannot modify primary guardian permissions');
    }

    guardian.permissions = newPermissions;
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);
    logger.debug('PermissionsUpdated', { familyId, guardianId, newPermissions });

    return guardian;
  }

  /**
   * Update guardian child access
   */
  async updateGuardianChildAccess(
    familyId: string,
    requesterId: string,
    guardianId: string,
    childIds: string[]
  ): Promise<FamilyGuardian> {
    const hasAdmin = await this.hasPermission(requesterId, familyId, 'ADMIN');
    if (!hasAdmin) {
      throw new Error('You do not have permission to modify guardians');
    }

    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);

    if (!account) {
      throw new Error('Family account not found');
    }

    const guardian = account.guardians.find(g => g.id === guardianId);
    if (!guardian) {
      throw new Error('Guardian not found');
    }

    guardian.childAccess = childIds;
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);
    logger.debug('ChildAccessUpdated', { familyId, guardianId, childIds });

    return guardian;
  }

  /**
   * Get children that a guardian has access to
   */
  async getAccessibleChildren(
    userId: string,
    familyId: string
  ): Promise<FamilyMember[]> {
    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);

    if (!account) {
      return [];
    }

    const guardian = account.guardians.find(g => g.userId === userId);
    if (!guardian) {
      return [];
    }

    // Empty childAccess means access to all children
    if (guardian.childAccess.length === 0 || guardian.isPrimary) {
      return account.children;
    }

    return account.children.filter(c => guardian.childAccess.includes(c.id));
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvite(
    familyId: string,
    requesterId: string,
    inviteId: string
  ): Promise<void> {
    const hasAdmin = await this.hasPermission(requesterId, familyId, 'ADMIN');
    if (!hasAdmin) {
      throw new Error('You do not have permission to cancel invitations');
    }

    const invites = await this.loadInvites();
    const inviteIndex = invites.findIndex(i => i.id === inviteId);

    if (inviteIndex >= 0) {
      invites.splice(inviteIndex, 1);
      await this.saveInvites(invites);
    }

    const accounts = await this.loadAccounts();
    const account = accounts.find(a => a.id === familyId);
    if (account) {
      account.pendingInvites = account.pendingInvites.filter(i => i.id !== inviteId);
      await this.saveAccounts(accounts);
    }

    logger.debug('InviteCancelled', { familyId, inviteId });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.accountsCache.clear();
  }
}

export const familySharingService = new FamilySharingService();
