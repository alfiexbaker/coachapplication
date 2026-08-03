/**
 * Family Permission Service
 *
 * Handles permission checks and updates for family guardians.
 * Single responsibility: authorization logic and access control.
 */

import { api } from '@/constants/config';
import { createLogger } from '@/utils/logger';
import { notificationTriggers } from '../notification-trigger';
import { apiFetch } from '../api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from '@/services/api-auth-context';
import { loadMockFamilyAccounts, saveMockFamilyAccounts } from './family-mock-store';
import {
  mapApiFamilyAthleteToChildProfile,
  mapChildProfileToFamilyMember,
  type ApiFamilyAthlete,
} from './family-api-support';
import { CHILD_COLORS } from './family-colors';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  storageError,
  unauthorized,
} from '@/types/result';
import {
  type FamilyAccount,
  type FamilyGuardian,
  type GuardianPermission,
  type FamilyMember,
} from '@/constants/types';

const logger = createLogger('FamilyPermissionService');
const USE_MOCK = api.useMock;

interface ApiFamilyMembership {
  id: string;
  familyId: string;
  userId: string;
  role?: string | null;
  permissions?: string[] | null;
  relationshipLabel?: string | null;
  childAccessAthleteIds?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  user?: {
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
}

interface ApiFamilyResponse {
  family: {
    id: string;
    primaryGuardianUserId?: string | null;
  };
  memberships: ApiFamilyMembership[];
  athletes: ApiFamilyAthlete[];
}

interface ApiFamilyGuardianResponse {
  id: string;
  familyId: string;
  userId: string;
  role: 'PRIMARY' | 'GUARDIAN' | 'VIEWER';
  permissions: GuardianPermission[];
  relationship: string;
  childAccess: string[];
  isPrimary: boolean;
  addedAt: string;
  updatedAt?: string;
}

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

  private async loadApiFamily(familyId: string): Promise<ApiFamilyResponse> {
    const currentUserResult = await resolveSignedInApiUser('Sign in to view family permissions.');
    if (!currentUserResult.success) {
      throw new Error(currentUserResult.error.message);
    }

    const result = await apiFetch<ApiFamilyResponse>(`/v1/families/${familyId}`, {
      method: 'GET',
      headers: buildApiAuthHeaders({
        actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
      }),
    });
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data;
  }

  private mapApiGuardianResponse(guardian: ApiFamilyGuardianResponse): FamilyGuardian {
    return {
      id: guardian.id,
      userId: guardian.userId,
      email: '',
      role: guardian.role,
      permissions: guardian.permissions,
      relationship: guardian.relationship,
      isPrimary: guardian.isPrimary,
      childAccess: guardian.childAccess,
      addedAt: guardian.addedAt,
      lastActiveAt: guardian.updatedAt,
    };
  }

  private async updateApiGuardianAccess(
    familyId: string,
    guardianId: string,
    body: {
      permissions?: GuardianPermission[];
      childAccess?: string[];
    },
  ): Promise<Result<FamilyGuardian, ServiceError>> {
    const currentUserResult = await resolveSignedInApiUser('Sign in to update guardian access.');
    if (!currentUserResult.success) {
      return err(currentUserResult.error);
    }

    const result = await apiFetch<ApiFamilyGuardianResponse>(
      `/v1/families/${familyId}/guardians/${guardianId}`,
      {
        method: 'PATCH',
        headers: buildApiAuthHeaders({
          actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
        }),
        body: JSON.stringify(body),
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(this.mapApiGuardianResponse(result.data));
  }

  private mapBackendPermissions(
    role: 'PRIMARY' | 'GUARDIAN' | 'VIEWER',
    permissions: string[] | null | undefined,
  ): GuardianPermission[] {
    if (role === 'PRIMARY') {
      return this.getDefaultPermissions('PRIMARY');
    }

    const normalized = new Set((permissions ?? []).map((permission) => permission.toLowerCase()));
    const mapped: GuardianPermission[] = [];
    if (normalized.has('schedule') || normalized.has('messages') || normalized.has('book')) {
      mapped.push('VIEW_SCHEDULE');
    }
    if (normalized.has('progress') || normalized.has('messages')) {
      mapped.push('VIEW_PROGRESS');
    }
    if (normalized.has('book')) {
      mapped.push('BOOK_SESSIONS');
    }
    if (normalized.has('payments')) {
      mapped.push('MANAGE_PAYMENTS');
    }
    if (normalized.has('medical') || normalized.has('profile')) {
      mapped.push('MANAGE_PROFILE');
    }
    if (normalized.has('admin')) {
      mapped.push('ADMIN');
    }
    return mapped;
  }

  private normalizeRole(role: string | null | undefined): 'PRIMARY' | 'GUARDIAN' | 'VIEWER' {
    const normalized = role?.toUpperCase();
    if (normalized === 'PRIMARY' || normalized === 'OWNER' || normalized === 'ADMIN') {
      return 'PRIMARY';
    }
    return normalized === 'VIEWER' ? 'VIEWER' : 'GUARDIAN';
  }

  // ==========================================================================
  // PERMISSION QUERIES
  // ==========================================================================

  /**
   * Get guardian's permissions for a specific family.
   */
  async getPermissions(userId: string, familyId: string): Promise<GuardianPermission[]> {
    if (!USE_MOCK) {
      const family = await this.loadApiFamily(familyId);
      const membership = family.memberships.find((candidate) => candidate.userId === userId);
      if (!membership) {
        return [];
      }
      return this.mapBackendPermissions(
        this.normalizeRole(membership.role),
        membership.permissions,
      );
    }

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
      return this.updateApiGuardianAccess(familyId, guardianId, {
        permissions: newPermissions,
      });
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
      return this.updateApiGuardianAccess(familyId, guardianId, {
        childAccess: childIds,
      });
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
    if (!USE_MOCK) {
      const family = await this.loadApiFamily(familyId);
      const membership = family.memberships.find((candidate) => candidate.userId === userId);
      if (!membership) {
        return [];
      }
      const role = this.normalizeRole(membership.role);
      const childAccess = membership.childAccessAthleteIds ?? [];
      const accessibleAthletes =
        role === 'PRIMARY' || childAccess.length === 0
          ? family.athletes
          : family.athletes.filter((athlete) => childAccess.includes(athlete.id));
      return accessibleAthletes.map((athlete, index) =>
        mapChildProfileToFamilyMember(
          mapApiFamilyAthleteToChildProfile(athlete, family.family.primaryGuardianUserId ?? userId),
          CHILD_COLORS[index % CHILD_COLORS.length],
        ),
      );
    }

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
