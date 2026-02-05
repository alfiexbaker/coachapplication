/**
 * Family Guardian Service
 *
 * Handles guardian management and invitation flow.
 * Single responsibility: guardian lifecycle.
 */

import { apiClient } from '../api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { notificationTriggers } from '../notification-trigger';
import { familyPermissionService } from './family-permission-service';
import {
  type FamilyAccount,
  type FamilyGuardian,
  type GuardianInvite,
  type GuardianRole,
  type GuardianPermission,
  DEFAULT_ROLE_PERMISSIONS,
} from './types';

const logger = createLogger('FamilyGuardianService');

class FamilyGuardianService {
  private useMock = true;

  /**
   * Load family accounts from storage.
   */
  private async loadAccounts(): Promise<FamilyAccount[]> {
    if (this.useMock) {
      return [];
    }
    return apiClient.get<FamilyAccount[]>(STORAGE_KEYS.FAMILY_ACCOUNTS, []);
  }

  /**
   * Save accounts to storage.
   */
  private async saveAccounts(accounts: FamilyAccount[]): Promise<void> {
    if (this.useMock) {
      return;
    }
    await apiClient.set(STORAGE_KEYS.FAMILY_ACCOUNTS, accounts);
  }

  /**
   * Load invites from storage.
   */
  private async loadInvites(): Promise<GuardianInvite[]> {
    if (this.useMock) {
      return [];
    }
    return apiClient.get<GuardianInvite[]>(STORAGE_KEYS.GUARDIAN_INVITES, []);
  }

  /**
   * Save invites to storage.
   */
  private async saveInvites(invites: GuardianInvite[]): Promise<void> {
    if (this.useMock) {
      return;
    }
    await apiClient.set(STORAGE_KEYS.GUARDIAN_INVITES, invites);
  }

  /**
   * Get or create a family account for a user.
   */
  async getOrCreateAccount(userId: string, userName: string): Promise<FamilyAccount> {
    const accounts = await this.loadAccounts();

    // Find existing account where user is primary or a guardian
    let account = accounts.find(
      (a) =>
        a.primaryGuardianId === userId ||
        a.guardians.some((g) => g.userId === userId)
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
            userName,
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
      logger.info('Created family account', { accountId: account.id });
    }

    return account;
  }

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
   * Invite a new guardian to the family.
   */
  async inviteGuardian(params: {
    familyId: string;
    inviterId: string;
    inviterName: string;
    inviteeEmail: string;
    inviteeName: string;
    role: GuardianRole;
    relationship: string;
    childAccess: string[];
    message?: string;
  }): Promise<GuardianInvite> {
    const {
      familyId,
      inviterId,
      inviterName,
      inviteeEmail,
      inviteeName,
      role,
      relationship,
      childAccess,
      message,
    } = params;

    // Check permission
    const hasAdmin = await familyPermissionService.isAdmin(inviterId, familyId);
    if (!hasAdmin) {
      throw new Error('You do not have permission to invite guardians');
    }

    // Check for existing pending invite
    const invites = await this.loadInvites();
    const existingInvite = invites.find(
      (i) =>
        i.familyId === familyId &&
        i.inviteeEmail.toLowerCase() === inviteeEmail.toLowerCase() &&
        i.status === 'PENDING'
    );

    if (existingInvite) {
      throw new Error('An invitation has already been sent to this email');
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
      permissions: DEFAULT_ROLE_PERMISSIONS[role] as GuardianPermission[],
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
    await notificationTriggers.guardianInvited(account?.name || 'Family');

    logger.info('Guardian invited', { familyId, inviteeEmail, role });

    return invite;
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
        new Date(i.expiresAt) > now
    );
  }

  /**
   * Accept a guardian invitation.
   */
  async acceptInvite(
    inviteId: string,
    userId: string,
    userName: string,
    userEmail: string
  ): Promise<FamilyAccount> {
    const invites = await this.loadInvites();
    const invite = invites.find((i) => i.id === inviteId);

    if (!invite) {
      throw new Error('Invitation not found');
    }

    if (invite.status !== 'PENDING') {
      throw new Error('Invitation is no longer valid');
    }

    if (new Date(invite.expiresAt) < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Update invite status
    invite.status = 'ACCEPTED';
    invite.respondedAt = new Date().toISOString();
    await this.saveInvites(invites);

    // Add guardian to family
    const accounts = await this.loadAccounts();
    const account = accounts.find((a) => a.id === invite.familyId);

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
    };

    account.guardians.push(newGuardian);
    account.pendingInvites = account.pendingInvites.filter((i) => i.id !== inviteId);
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);

    // Notify the inviter
    await notificationTriggers.guardianJoined(userName);

    logger.info('Guardian joined family', { familyId: account.id, guardianId: newGuardian.id });

    return account;
  }

  /**
   * Decline a guardian invitation.
   */
  async declineInvite(inviteId: string): Promise<void> {
    const invites = await this.loadInvites();
    const invite = invites.find((i) => i.id === inviteId);

    if (!invite) {
      throw new Error('Invitation not found');
    }

    invite.status = 'DECLINED';
    invite.respondedAt = new Date().toISOString();
    await this.saveInvites(invites);

    // Remove from family's pending invites
    const accounts = await this.loadAccounts();
    const account = accounts.find((a) => a.id === invite.familyId);
    if (account) {
      account.pendingInvites = account.pendingInvites.filter((i) => i.id !== inviteId);
      await this.saveAccounts(accounts);
    }

    logger.info('Guardian invitation declined', { inviteId });
  }

  /**
   * Remove a guardian from a family.
   */
  async removeGuardian(
    familyId: string,
    requesterId: string,
    guardianId: string
  ): Promise<void> {
    const hasAdmin = await familyPermissionService.isAdmin(requesterId, familyId);
    if (!hasAdmin) {
      throw new Error('You do not have permission to remove guardians');
    }

    const accounts = await this.loadAccounts();
    const account = accounts.find((a) => a.id === familyId);

    if (!account) {
      throw new Error('Family account not found');
    }

    const guardian = account.guardians.find((g) => g.id === guardianId);
    if (!guardian) {
      throw new Error('Guardian not found');
    }

    if (guardian.isPrimary) {
      throw new Error('Cannot remove primary guardian');
    }

    account.guardians = account.guardians.filter((g) => g.id !== guardianId);
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);

    logger.info('Guardian removed', { familyId, guardianId });
  }
}

export const familyGuardianService = new FamilyGuardianService();
