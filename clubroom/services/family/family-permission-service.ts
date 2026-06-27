/**
 * Family Permission Service
 *
 * Handles permission checks and updates for family guardians.
 * Single responsibility: authorization logic and access control.
 */

import { api } from '@/constants/config';
import { createLogger } from '@/utils/logger';
import { notificationTriggers } from '../notification-trigger';
import { loadMockFamilyAccounts, saveMockFamilyAccounts } from './family-mock-store';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  storageError,
  unauthorized,
  validationError,
} from '@/types/result';
import {
  type FamilyAccount,
  type FamilyGuardian,
  type GuardianPermission,
  type FamilyMember,
} from '@/constants/types';

const logger = createLogger('FamilyPermissionService');
const USE_MOCK = api.useMock;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default permissions for each guardian role.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  'PRIMARY' | 'GUARDIAN' | 'VIEWER',
  GuardianPermission[]
> = {
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

  private async loadAccounts(): Promise<FamilyAccount[]> {
    if (!USE_MOCK) {
      return [];
    }
    return loadMockFamilyAccounts();
  }

  private async saveAccounts(accounts: FamilyAccount[]): Promise<void> {
    if (!USE_MOCK) {
      return;
    }
    saveMockFamilyAccounts(accounts);
  }

  // ==========================================================================
  // PERMISSION QUERIES
  // ==========================================================================

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
   * Get guardian's permissions with Result type.
   */
  async getGuardianPermissions(
    userId: string,
    familyId: string,
  ): Promise<Result<GuardianPermission[], ServiceError>> {
    try {
      const permissions = await this.getPermissions(userId, familyId);
      return ok(permissions);
    } catch (error) {
      logger.error('get_guardian_permissions_failed', { userId, familyId, error });
      return err(storageError('Failed to retrieve permissions'));
    }
  }

  /**
   * Check if a user has a specific permission.
   */
  async hasPermission(
    userId: string,
    familyId: string,
    permission: GuardianPermission,
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

  // ==========================================================================
  // PERMISSION UPDATES
  // ==========================================================================

  /**
   * Update guardian permissions.
   */
  async updatePermissions(
    familyId: string,
    requesterId: string,
    guardianId: string,
    newPermissions: GuardianPermission[],
  ): Promise<Result<FamilyGuardian, ServiceError>> {
    if (!USE_MOCK) {
      return err(
        validationError(
          'Guardian permission updates require backend family permission authority in API mode.',
        ),
      );
    }

    // Check if requester has admin permission
    const hasAdmin = await this.isAdmin(requesterId, familyId);
    if (!hasAdmin) {
      return err(unauthorized('You do not have permission to modify guardians'));
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
      return err(unauthorized('Cannot modify primary guardian permissions'));
    }

    guardian.permissions = newPermissions;
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);

    // Notify the guardian
    await notificationTriggers.guardianPermissionsUpdated(guardian.userId);

    logger.debug('PermissionsUpdated', { familyId, guardianId, newPermissions });

    return ok(guardian);
  }

  /**
   * Update guardian permissions with Result type.
   */
  async updateGuardianPermissions(
    familyId: string,
    requesterId: string,
    guardianId: string,
    newPermissions: GuardianPermission[],
  ): Promise<Result<FamilyGuardian, ServiceError>> {
    return this.updatePermissions(familyId, requesterId, guardianId, newPermissions);
  }

  // ==========================================================================
  // CHILD ACCESS
  // ==========================================================================

  /**
   * Update guardian's child access list.
   */
  async updateChildAccess(
    familyId: string,
    requesterId: string,
    guardianId: string,
    childIds: string[],
  ): Promise<Result<FamilyGuardian, ServiceError>> {
    if (!USE_MOCK) {
      return err(
        validationError(
          'Guardian child-access updates require backend family permission authority in API mode.',
        ),
      );
    }

    const hasAdmin = await this.isAdmin(requesterId, familyId);
    if (!hasAdmin) {
      return err(unauthorized('You do not have permission to modify guardians'));
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

    guardian.childAccess = childIds;
    account.updatedAt = new Date().toISOString();

    await this.saveAccounts(accounts);
    logger.debug('ChildAccessUpdated', { familyId, guardianId, childIds });

    return ok(guardian);
  }

  /**
   * Update guardian child access with Result type.
   */
  async updateGuardianChildAccess(
    familyId: string,
    requesterId: string,
    guardianId: string,
    childIds: string[],
  ): Promise<Result<FamilyGuardian, ServiceError>> {
    return this.updateChildAccess(familyId, requesterId, guardianId, childIds);
  }

  /**
   * Get children that a guardian has access to.
   * Empty childAccess means access to all children.
   */
  async getAccessibleChildren(userId: string, familyId: string): Promise<FamilyMember[]> {
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
  getDefaultPermissions(role: 'PRIMARY' | 'GUARDIAN' | 'VIEWER'): GuardianPermission[] {
    return [...DEFAULT_ROLE_PERMISSIONS[role]];
  }
}

export const familyPermissionService = new FamilyPermissionService();
