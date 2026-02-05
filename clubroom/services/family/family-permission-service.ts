/**
 * Family Permission Service
 *
 * Handles permission checks and updates for family guardians.
 * Single responsibility: authorization logic.
 */

import { apiClient } from '../api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { notificationTriggers } from '../notification-trigger';
import {
  type FamilyAccount,
  type FamilyGuardian,
  type GuardianPermission,
  type FamilyMember,
  DEFAULT_ROLE_PERMISSIONS,
} from './types';

const logger = createLogger('FamilyPermissionService');

class FamilyPermissionService {
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
   * Get guardian's permissions for a specific family.
   */
  async getPermissions(userId: string, familyId: string): Promise<GuardianPermission[]> {
    const accounts = await this.loadAccounts();
    const account = accounts.find((a) => a.id === familyId);
    const guardian = account?.guardians.find((g) => g.userId === userId);
    return guardian?.permissions || [];
  }

  /**
   * Check if a user has a specific permission.
   */
  async hasPermission(
    userId: string,
    familyId: string,
    permission: GuardianPermission
  ): Promise<boolean> {
    const permissions = await this.getPermissions(userId, familyId);
    // ADMIN permission grants all permissions
    return permissions.includes(permission) || permissions.includes('ADMIN');
  }

  /**
   * Check if user can book sessions.
   */
  async canBook(userId: string, familyId: string): Promise<boolean> {
    return this.hasPermission(userId, familyId, 'BOOK_SESSIONS');
  }

  /**
   * Check if user can view schedule.
   */
  async canViewSchedule(userId: string, familyId: string): Promise<boolean> {
    return this.hasPermission(userId, familyId, 'VIEW_SCHEDULE');
  }

  /**
   * Check if user can view progress.
   */
  async canViewProgress(userId: string, familyId: string): Promise<boolean> {
    return this.hasPermission(userId, familyId, 'VIEW_PROGRESS');
  }

  /**
   * Check if user can manage payments.
   */
  async canManagePayments(userId: string, familyId: string): Promise<boolean> {
    return this.hasPermission(userId, familyId, 'MANAGE_PAYMENTS');
  }

  /**
   * Check if user has admin access.
   */
  async isAdmin(userId: string, familyId: string): Promise<boolean> {
    return this.hasPermission(userId, familyId, 'ADMIN');
  }

  /**
   * Update guardian permissions.
   */
  async updatePermissions(
    familyId: string,
    requesterId: string,
    guardianId: string,
    newPermissions: GuardianPermission[]
  ): Promise<FamilyGuardian> {
    // Check if requester has admin permission
    const hasAdmin = await this.isAdmin(requesterId, familyId);
    if (!hasAdmin) {
      throw new Error('You do not have permission to modify guardians');
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
      throw new Error('Cannot modify primary guardian permissions');
    }

    guardian.permissions = newPermissions;
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);

    // Notify the guardian
    await notificationTriggers.guardianPermissionsUpdated(guardian.userId);

    logger.info('Permissions updated', { familyId, guardianId, newPermissions });

    return guardian;
  }

  /**
   * Update guardian's child access list.
   */
  async updateChildAccess(
    familyId: string,
    requesterId: string,
    guardianId: string,
    childIds: string[]
  ): Promise<FamilyGuardian> {
    const hasAdmin = await this.isAdmin(requesterId, familyId);
    if (!hasAdmin) {
      throw new Error('You do not have permission to modify guardians');
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

    guardian.childAccess = childIds;
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);
    logger.info('Child access updated', { familyId, guardianId, childIds });

    return guardian;
  }

  /**
   * Get children that a guardian has access to.
   * Empty childAccess means access to all children.
   */
  async getAccessibleChildren(
    userId: string,
    familyId: string
  ): Promise<FamilyMember[]> {
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

  /**
   * Get default permissions for a role.
   */
  getDefaultPermissions(role: 'PRIMARY' | 'GUARDIAN' | 'VIEWER'): GuardianPermission[] {
    return [...DEFAULT_ROLE_PERMISSIONS[role]];
  }
}

export const familyPermissionService = new FamilyPermissionService();
