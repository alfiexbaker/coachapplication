/**
 * Family Relationship Service
 *
 * Handles parent/child linking, guardian management, and invitation flow.
 * Single responsibility: guardian lifecycle and relationships.
 */

import { apiFetch } from '../api-client';
import { api } from '@/constants/config';
import { createLogger } from '@/utils/logger';
import { notificationTriggers } from '../notification-trigger';
import { userService } from '../user-service';
import { familyPermissionService } from './family-permission-service';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import {
  loadMockFamilyAccounts,
  loadMockGuardianInvites,
  saveMockFamilyAccounts,
  saveMockGuardianInvites,
} from './family-mock-store';
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
  type FamilyMember,
  type FamilyGuardian,
  type GuardianInvite,
  type GuardianRole,
  type GuardianPermission,
} from '@/constants/types';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from '@/services/api-auth-context';
import { mapApiFamilyAthleteToChildProfile, type ApiFamilyAthlete } from './family-api-support';

const logger = createLogger('FamilyRelationshipService');
const USE_MOCK = api.useMock;
const FAMILY_MEMBER_COLOR = '#3B82F6';

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
    description: 'Book, cancel, and rebook sessions',
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
    id?: string | null;
    email?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  } | null;
}

interface ApiFamilyResponse {
  family: {
    id: string;
    name?: string | null;
    primaryGuardianUserId?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  memberships: ApiFamilyMembership[];
  athletes: ApiFamilyAthlete[];
  guardianInvites?: GuardianInvite[];
  pendingGuardianInvites?: GuardianInvite[];
}

function mapBackendPermissions(
  role: GuardianRole,
  permissions: string[] | null | undefined,
): GuardianPermission[] {
  if (role === 'PRIMARY') {
    return DEFAULT_ROLE_PERMISSIONS.PRIMARY;
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
  return mapped.length > 0 ? mapped : DEFAULT_ROLE_PERMISSIONS[role];
}

function membershipRoleToGuardianRole(
  membership: ApiFamilyMembership,
  primaryGuardianUserId: string | null | undefined,
): GuardianRole {
  const role = membership.role?.toLowerCase();
  if (membership.userId === primaryGuardianUserId || role === 'owner' || role === 'admin') {
    return 'PRIMARY';
  }
  if (role === 'viewer') {
    return 'VIEWER';
  }
  return 'GUARDIAN';
}

function mapApiFamilyMember(athlete: ApiFamilyAthlete, fallbackParentId: string): FamilyMember {
  const child = mapApiFamilyAthleteToChildProfile(athlete, fallbackParentId);
  const dateOfBirth = child.dateOfBirth ? new Date(child.dateOfBirth) : null;
  const age =
    dateOfBirth && !Number.isNaN(dateOfBirth.getTime())
      ? Math.max(0, new Date().getFullYear() - dateOfBirth.getFullYear())
      : 0;
  return {
    id: child.id,
    name: child.nickname?.trim() || `${child.firstName} ${child.lastName}`.trim(),
    avatar: child.photoUrl,
    relationship: child.relationship.toLowerCase() as FamilyMember['relationship'],
    age,
    colorCode: FAMILY_MEMBER_COLOR,
    dateOfBirth: child.dateOfBirth,
    isActive: true,
    addedAt: child.createdAt,
  };
}

function mapApiFamilyAccount(payload: ApiFamilyResponse, fallbackUserId: string): FamilyAccount {
  const primaryGuardianId = payload.family.primaryGuardianUserId ?? fallbackUserId;
  return {
    id: payload.family.id,
    name: payload.family.name ?? 'Family Account',
    primaryGuardianId,
    guardians: payload.memberships.map((membership) => {
      const role = membershipRoleToGuardianRole(membership, payload.family.primaryGuardianUserId);
      return {
        id: membership.id,
        userId: membership.userId,
        email: membership.user?.email ?? '',
        avatar: membership.user?.avatarUrl ?? undefined,
        role,
        permissions: mapBackendPermissions(role, membership.permissions),
        relationship: membership.relationshipLabel ?? (role === 'PRIMARY' ? 'Primary guardian' : 'Guardian'),
        isPrimary: role === 'PRIMARY',
        childAccess: membership.childAccessAthleteIds ?? [],
        addedAt: membership.createdAt ?? new Date().toISOString(),
      };
    }),
    children: payload.athletes.map((athlete) => mapApiFamilyMember(athlete, primaryGuardianId)),
    pendingInvites: payload.pendingGuardianInvites ?? payload.guardianInvites ?? [],
    createdAt: payload.family.createdAt ?? new Date().toISOString(),
    updatedAt: payload.family.updatedAt ?? payload.family.createdAt ?? new Date().toISOString(),
  };
}

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
      if (!USE_MOCK) {
        return [];
      }
      const accounts = loadMockFamilyAccounts();
      accounts.forEach((a: FamilyAccount) => this.accountsCache.set(a.id, a));
      return accounts;
    } catch (error) {
      logger.error('Failed to load family accounts', error);
      return [];
    }
  }

  private async saveAccounts(accounts: FamilyAccount[]): Promise<void> {
    if (!USE_MOCK) {
      return;
    }
    saveMockFamilyAccounts(accounts);
    accounts.forEach((a) => this.accountsCache.set(a.id, a));
  }

  private async loadInvites(): Promise<GuardianInvite[]> {
    try {
      if (!USE_MOCK) {
        return [];
      }
      return loadMockGuardianInvites();
    } catch (error) {
      logger.error('Failed to load invites', error);
      return [];
    }
  }

  private async saveInvites(invites: GuardianInvite[]): Promise<void> {
    if (!USE_MOCK) {
      return;
    }
    saveMockGuardianInvites(invites);
  }

  // ==========================================================================
  // FAMILY ACCOUNTS
  // ==========================================================================

  /**
   * Get or create a family account for a user.
   */
  async getFamilyAccount(userId: string, userName: string): Promise<FamilyAccount> {
    if (!USE_MOCK) {
      const currentUserResult = await resolveSignedInApiUser('Sign in to view family sharing.');
      if (!currentUserResult.success) {
        throw new Error(currentUserResult.error.message);
      }
      const meResult = await apiFetch<{ linkedFamilies: Array<{ familyId?: string | null }> }>(
        '/v1/me',
        {
          method: 'GET',
          headers: buildApiAuthHeaders({
            actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
          }),
        },
      );
      if (!meResult.success) {
        throw new Error(meResult.error.message);
      }
      const familyId = meResult.data.linkedFamilies.find((family) => family.familyId)?.familyId;
      if (!familyId) {
        throw new Error('No family account found for this user.');
      }

      const familyResult = await apiFetch<ApiFamilyResponse>(`/v1/families/${familyId}`, {
        method: 'GET',
        headers: buildApiAuthHeaders({
          actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
        }),
      });
      if (!familyResult.success) {
        throw new Error(familyResult.error.message);
      }
      return mapApiFamilyAccount(familyResult.data, userId);
    }

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
    if (!USE_MOCK) {
      const currentUserResult = await resolveSignedInApiUser('Sign in to view guardians.');
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
      return mapApiFamilyAccount(result.data, currentUserResult.data.id).guardians;
    }

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
    if (!USE_MOCK) {
      const currentUserResult = await resolveSignedInApiUser('Sign in to remove guardians.');
      if (!currentUserResult.success) {
        return err(currentUserResult.error);
      }
      const result = await apiFetch<void>(`/v1/families/${familyId}/guardians/${guardianId}`, {
        method: 'DELETE',
        headers: buildApiAuthHeaders({
          actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
        }),
      });
      if (!result.success) {
        return err(result.error);
      }
      return ok(undefined);
    }

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
    if (!USE_MOCK) {
      const currentUserResult = await resolveSignedInApiUser('Sign in to invite guardians.');
      if (!currentUserResult.success) {
        return err(currentUserResult.error);
      }
      const result = await apiFetch<GuardianInvite>(`/v1/families/${familyId}/guardians`, {
        method: 'POST',
        headers: buildApiAuthHeaders({
          actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
        }),
        body: JSON.stringify({
          inviteeEmail,
          inviteeName,
          role,
          relationship,
          childAccess,
          message,
        }),
      });
      if (!result.success) {
        return err(result.error);
      }
      logger.success('GuardianInvited', { familyId, inviteeEmail, role, source: 'api' });
      return ok(result.data);
    }

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
    if (!USE_MOCK) {
      const currentUserResult = await resolveSignedInApiUser('Sign in to view guardian invitations.');
      if (!currentUserResult.success) {
        logger.warn('guardian_invite_inbox_unavailable', { email, error: currentUserResult.error.message });
        return [];
      }
      const result = await apiFetch<{ invites: GuardianInvite[] }>('/v1/me/guardian-invites', {
        method: 'GET',
        headers: buildApiAuthHeaders({
          actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
        }),
      });
      if (!result.success) {
        logger.warn('guardian_invite_inbox_failed', { email, error: result.error.message });
        return [];
      }
      return result.data.invites;
    }

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
    if (!USE_MOCK) {
      const currentUserResult = await resolveSignedInApiUser('Sign in to accept guardian invitations.');
      if (!currentUserResult.success) {
        return err(currentUserResult.error);
      }
      const acceptResult = await apiFetch<GuardianInvite & { familyId: string }>(
        `/v1/guardian-invites/${inviteId}/accept`,
        {
          method: 'POST',
          headers: buildApiAuthHeaders({
            actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
          }),
        },
      );
      if (!acceptResult.success) {
        return err(acceptResult.error);
      }
      const familyResult = await apiFetch<ApiFamilyResponse>(
        `/v1/families/${acceptResult.data.familyId}`,
        {
          method: 'GET',
          headers: buildApiAuthHeaders({
            actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
          }),
        },
      );
      if (!familyResult.success) {
        return err(familyResult.error);
      }
      return ok(mapApiFamilyAccount(familyResult.data, currentUserResult.data.id));
    }

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
    if (!USE_MOCK) {
      const currentUserResult = await resolveSignedInApiUser('Sign in to decline guardian invitations.');
      if (!currentUserResult.success) {
        return err(currentUserResult.error);
      }
      const result = await apiFetch<void>(`/v1/guardian-invites/${inviteId}/decline`, {
        method: 'POST',
        headers: buildApiAuthHeaders({
          actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
        }),
      });
      if (!result.success) {
        return err(result.error);
      }
      return ok(undefined);
    }

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
    if (!USE_MOCK) {
      const currentUserResult = await resolveSignedInApiUser('Sign in to cancel guardian invitations.');
      if (!currentUserResult.success) {
        return err(currentUserResult.error);
      }
      const result = await apiFetch<void>(
        `/v1/families/${familyId}/guardian-invites/${inviteId}`,
        {
          method: 'DELETE',
          headers: buildApiAuthHeaders({
            actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
          }),
        },
      );
      if (!result.success) {
        return err(result.error);
      }
      return ok(undefined);
    }

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
