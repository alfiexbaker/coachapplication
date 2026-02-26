/**
 * Academy Service
 *
 * Handles school/academy management with branding, staff, and members.
 * Enables coaches to create branded coaching businesses.
 *
 * API Integration Notes:
 * - POST /api/academies - Create academy
 * - GET /api/academies/:id - Get details
 * - PUT /api/academies/:id/branding - Update branding
 * - POST /api/academies/:id/invite - Invite member
 * - GET /api/academies/:id/staff - List staff
 */

import { apiClient } from './api-client';
import { api } from '@/constants/config';
import type {
  Academy,
  AcademyMembership,
  AcademyInvite,
  AcademyPermission,
  SportCategory,
  FootballObjective,
} from '@/constants/types';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  validationError,
  conflictError,
  storageError,
} from '@/types/result';
import { createLogger } from '@/utils/logger';
import { normalizeLegacyMockDates } from '@/utils/mock-date-normalizer';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('AcademyService');

const USE_MOCK = api.useMock;

// Mock academies
const MOCK_ACADEMIES: Academy[] = normalizeLegacyMockDates([
  {
    id: 'academy_1',
    name: 'East London FC Academy',
    slug: 'east-london-fc',
    description:
      "Premier youth football development program in East London. Building tomorrow's stars today.",
    logoUrl: 'https://picsum.photos/seed/elfc/200/200',
    bannerUrl: 'https://picsum.photos/seed/elfc-banner/1200/400',
    primaryColor: '#1E40AF',
    secondaryColor: '#60A5FA',
    email: 'info@eastlondonfc.academy',
    phone: '+44 20 1234 5678',
    website: 'https://eastlondonfc.academy',
    address: '123 Football Lane',
    postcode: 'E8 1AB',
    city: 'London',
    coachCount: 5,
    athleteCount: 48,
    sessionCount: 120,
    isPublic: true,
    requiresApproval: false,
    ownerId: 'coach1',
    createdAt: '2024-06-15T10:00:00Z',
    rating: {
      average: 4.8,
      reviewCount: 32,
    },
    sports: ['Football'],
    specialties: ['Dribbling', 'Finishing', 'Passing'],
  },
  {
    id: 'academy_2',
    name: 'South London Goalkeeping School',
    slug: 'south-london-gk',
    description: 'Specialized goalkeeper training for all ages and skill levels.',
    logoUrl: 'https://picsum.photos/seed/slgk/200/200',
    primaryColor: '#15803D',
    secondaryColor: '#86EFAC',
    postcode: 'SE1 2AB',
    city: 'London',
    coachCount: 3,
    athleteCount: 24,
    sessionCount: 85,
    isPublic: true,
    requiresApproval: true,
    ownerId: 'coach_2',
    createdAt: '2025-01-10T14:00:00Z',
    rating: {
      average: 4.9,
      reviewCount: 18,
    },
    sports: ['Football'],
    specialties: ['Goalkeeping'],
  },
]);

const MOCK_MEMBERSHIPS: AcademyMembership[] = normalizeLegacyMockDates([
  {
    id: 'mem_1',
    academyId: 'academy_1',
    userId: 'coach1',
    role: 'OWNER',
    permissions: [
      'MANAGE_STAFF',
      'MANAGE_SETTINGS',
      'CREATE_SESSIONS',
      'VIEW_ANALYTICS',
      'MANAGE_BILLING',
      'POST_AS_ACADEMY',
      'INVITE_MEMBERS',
    ],
    status: 'ACTIVE',
    joinedAt: '2024-06-15T10:00:00Z',
  },
  {
    id: 'mem_2',
    academyId: 'academy_1',
    userId: 'coach_3',
    role: 'COACH',
    permissions: ['CREATE_SESSIONS', 'POST_AS_ACADEMY'],
    status: 'ACTIVE',
    joinedAt: '2024-08-20T09:00:00Z',
    invitedBy: 'coach1',
  },
  {
    id: 'mem_3',
    academyId: 'academy_1',
    userId: 'coach_4',
    role: 'ASSISTANT',
    permissions: [],
    status: 'ACTIVE',
    joinedAt: '2025-01-05T11:00:00Z',
    invitedBy: 'coach1',
  },
]);

const MOCK_INVITES: AcademyInvite[] = [
  {
    id: 'ainv_1',
    academyId: 'academy_1',
    code: 'ELFC2026',
    role: 'COACH',
    permissions: ['CREATE_SESSIONS', 'POST_AS_ACADEMY'],
    createdBy: 'coach1',
    expiresAt: '2026-02-10T23:59:59Z',
    maxUses: 5,
    currentUses: 1,
  },
];

let academiesCache: Academy[] = [...MOCK_ACADEMIES];
let membershipsCache: AcademyMembership[] = [...MOCK_MEMBERSHIPS];
let invitesCache: AcademyInvite[] = [...MOCK_INVITES];

async function loadAcademies(): Promise<Academy[]> {
  try {
    const stored = await apiClient.get<Academy[] | null>(STORAGE_KEYS.ACADEMIES, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load academies', error);
  }
  return [...MOCK_ACADEMIES];
}

async function saveAcademies(academies: Academy[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.ACADEMIES, academies);
  } catch (error) {
    logger.error('Failed to save academies', error);
  }
}

async function loadMemberships(): Promise<AcademyMembership[]> {
  try {
    const stored = await apiClient.get<AcademyMembership[] | null>(
      STORAGE_KEYS.ACADEMY_MEMBERSHIPS,
      null,
    );
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load memberships', error);
  }
  return [...MOCK_MEMBERSHIPS];
}

async function saveMemberships(memberships: AcademyMembership[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.ACADEMY_MEMBERSHIPS, memberships);
  } catch (error) {
    logger.error('Failed to save memberships', error);
  }
}

async function loadInvites(): Promise<AcademyInvite[]> {
  try {
    const stored = await apiClient.get<AcademyInvite[] | null>(STORAGE_KEYS.ACADEMY_INVITES, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load invites', error);
  }
  return [...MOCK_INVITES];
}

async function saveInvites(invites: AcademyInvite[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.ACADEMY_INVITES, invites);
  } catch (error) {
    logger.error('Failed to save invites', error);
  }
}

export interface CreateAcademyInput {
  name: string;
  description: string;
  postcode: string;
  city: string;
  ownerId: string;
  ownerName: string;
  sports?: SportCategory[];
  specialties?: FootballObjective[];
}

export interface UpdateBrandingInput {
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}

export const academyService = {
  /**
   * Get all academies (discovery)
   */
  async discoverAcademies(filters?: {
    postcode?: string;
    sport?: SportCategory;
  }): Promise<Result<Academy[], ServiceError>> {
    try {
      if (USE_MOCK) {
        academiesCache = await loadAcademies();
        const filtered = academiesCache
          .filter((a) => a.isPublic)
          .filter((a) => !filters?.postcode || a.postcode === filters.postcode)
          .filter((a) => !filters?.sport || a.sports.includes(filters.sport))
          .sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
        return ok(filtered);
      }

      const response = await fetch('/api/academies');
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to discover academies', error);
      return err(storageError('Failed to discover academies'));
    }
  },

  /**
   * Get academy by ID
   */
  async getAcademy(academyId: string): Promise<Result<Academy | null, ServiceError>> {
    try {
      if (USE_MOCK) {
        academiesCache = await loadAcademies();
        return ok(academiesCache.find((a) => a.id === academyId) || null);
      }

      const response = await fetch(`/api/academies/${academyId}`);
      if (!response.ok) return ok(null);
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get academy', error);
      return err(storageError('Failed to load academy'));
    }
  },

  /**
   * Get academy by slug
   */
  async getAcademyBySlug(slug: string): Promise<Result<Academy | null, ServiceError>> {
    try {
      if (USE_MOCK) {
        academiesCache = await loadAcademies();
        return ok(academiesCache.find((a) => a.slug === slug) || null);
      }

      const response = await fetch(`/api/academies/slug/${slug}`);
      if (!response.ok) return ok(null);
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get academy by slug', error);
      return err(storageError('Failed to load academy'));
    }
  },

  /**
   * Get academies where user is a member
   */
  async getUserAcademies(
    userId: string,
  ): Promise<Result<(Academy & { membership: AcademyMembership })[], ServiceError>> {
    try {
      if (USE_MOCK) {
        academiesCache = await loadAcademies();
        membershipsCache = await loadMemberships();

        const userMemberships = membershipsCache.filter(
          (m) => m.userId === userId && m.status === 'ACTIVE',
        );

        const data = userMemberships
          .map((m) => {
            const academy = academiesCache.find((a) => a.id === m.academyId);
            if (!academy) return null;
            return { ...academy, membership: m };
          })
          .filter(Boolean) as (Academy & { membership: AcademyMembership })[];
        return ok(data);
      }

      const response = await fetch(`/api/users/${userId}/academies`);
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get user academies', error);
      return err(storageError('Failed to load user academies'));
    }
  },

  /**
   * Create a new academy
   */
  async createAcademy(input: CreateAcademyInput): Promise<Result<Academy, ServiceError>> {
    try {
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const newAcademy: Academy = {
        id: `academy_${Date.now()}`,
        name: input.name,
        slug,
        description: input.description,
        postcode: input.postcode,
        city: input.city,
        coachCount: 1,
        athleteCount: 0,
        sessionCount: 0,
        isPublic: true,
        requiresApproval: false,
        ownerId: input.ownerId,
        createdAt: new Date().toISOString(),
        sports: input.sports || ['Football'],
        specialties: input.specialties || [],
      };

      // Create owner membership
      const ownerMembership: AcademyMembership = {
        id: `mem_${Date.now()}`,
        academyId: newAcademy.id,
        userId: input.ownerId,
        role: 'OWNER',
        permissions: [
          'MANAGE_STAFF',
          'MANAGE_SETTINGS',
          'CREATE_SESSIONS',
          'VIEW_ANALYTICS',
          'MANAGE_BILLING',
          'POST_AS_ACADEMY',
          'INVITE_MEMBERS',
        ],
        status: 'ACTIVE',
        joinedAt: new Date().toISOString(),
      };

      if (USE_MOCK) {
        academiesCache = await loadAcademies();
        membershipsCache = await loadMemberships();

        academiesCache.push(newAcademy);
        membershipsCache.push(ownerMembership);

        await saveAcademies(academiesCache);
        await saveMemberships(membershipsCache);

        return ok(newAcademy);
      }

      const response = await fetch('/api/academies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAcademy),
      });
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to create academy', error);
      return err(storageError('Failed to create academy'));
    }
  },

  /**
   * Update academy branding
   */
  async updateBranding(
    academyId: string,
    branding: UpdateBrandingInput,
  ): Promise<Result<Academy, ServiceError>> {
    if (USE_MOCK) {
      academiesCache = await loadAcademies();
      const academy = academiesCache.find((a) => a.id === academyId);
      if (!academy) return err(notFound('Academy', academyId));

      Object.assign(academy, branding);
      await saveAcademies(academiesCache);
      return ok(academy);
    }

    const response = await fetch(`/api/academies/${academyId}/branding`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branding),
    });
    return ok(await response.json());
  },

  /**
   * Update academy settings
   */
  async updateSettings(
    academyId: string,
    settings: Partial<Pick<Academy, 'name' | 'description' | 'isPublic' | 'requiresApproval'>>,
  ): Promise<Result<Academy, ServiceError>> {
    if (USE_MOCK) {
      academiesCache = await loadAcademies();
      const academy = academiesCache.find((a) => a.id === academyId);
      if (!academy) return err(notFound('Academy', academyId));

      Object.assign(academy, settings);
      await saveAcademies(academiesCache);
      return ok(academy);
    }

    const response = await fetch(`/api/academies/${academyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return ok(await response.json());
  },

  /**
   * Get academy staff
   */
  async getStaff(academyId: string): Promise<Result<AcademyMembership[], ServiceError>> {
    try {
      if (USE_MOCK) {
        membershipsCache = await loadMemberships();
        const staff = membershipsCache
          .filter((m) => m.academyId === academyId && m.status === 'ACTIVE')
          .sort((a, b) => {
            const roleOrder = ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH', 'ASSISTANT', 'MEMBER'];
            return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
          });
        return ok(staff);
      }

      const response = await fetch(`/api/academies/${academyId}/staff`);
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get academy staff', error);
      return err(storageError('Failed to load academy staff'));
    }
  },

  /**
   * Create an invite code
   */
  async createInvite(
    academyId: string,
    academyName: string,
    role: AcademyMembership['role'],
    permissions: AcademyPermission[],
    createdBy: string,
    createdByName: string,
    expiresInDays: number = 30,
    maxUses: number = 10,
  ): Promise<Result<AcademyInvite, ServiceError>> {
    try {
      const code = `${academyName
        .slice(0, 4)
        .toUpperCase()
        .replace(/[^A-Z]/g, '')}${Date.now().toString(36).toUpperCase().slice(-4)}`;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const invite: AcademyInvite = {
        id: `ainv_${Date.now()}`,
        academyId,
        code,
        role,
        permissions,
        createdBy,
        expiresAt: expiresAt.toISOString(),
        maxUses,
        currentUses: 0,
      };

      if (USE_MOCK) {
        invitesCache = await loadInvites();
        invitesCache.push(invite);
        await saveInvites(invitesCache);
        return ok(invite);
      }

      const response = await fetch(`/api/academies/${academyId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invite),
      });
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to create academy invite', error);
      return err(storageError('Failed to create academy invite'));
    }
  },

  /**
   * Join academy with invite code
   */
  async joinWithCode(
    code: string,
    userId: string,
    userName: string,
    userPhotoUrl?: string,
  ): Promise<Result<AcademyMembership, ServiceError>> {
    if (USE_MOCK) {
      invitesCache = await loadInvites();
      membershipsCache = await loadMemberships();
      academiesCache = await loadAcademies();

      const invite = invitesCache.find(
        (i) => i.code === code && new Date(i.expiresAt) > new Date() && i.currentUses < i.maxUses,
      );
      if (!invite) return err(validationError('Invalid or expired invite code'));

      // Check if already a member
      const existingMembership = membershipsCache.find(
        (m) => m.academyId === invite.academyId && m.userId === userId,
      );
      if (existingMembership) return err(conflictError('Already a member of this academy'));

      const membership: AcademyMembership = {
        id: `mem_${Date.now()}`,
        academyId: invite.academyId,
        userId,
        role: invite.role,
        permissions: invite.permissions,
        status: 'ACTIVE',
        joinedAt: new Date().toISOString(),
        invitedBy: invite.createdBy,
      };

      membershipsCache.push(membership);
      invite.currentUses += 1;

      // Update academy coach count
      const academy = academiesCache.find((a) => a.id === invite.academyId);
      if (academy && ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH', 'ASSISTANT'].includes(invite.role)) {
        academy.coachCount += 1;
      }

      await saveMemberships(membershipsCache);
      await saveInvites(invitesCache);
      await saveAcademies(academiesCache);

      return ok(membership);
    }

    const response = await fetch('/api/academies/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, userId, userName, userPhotoUrl }),
    });
    return ok(await response.json());
  },

  /**
   * Update member role
   */
  async updateMemberRole(
    membershipId: string,
    role: AcademyMembership['role'],
    permissions: AcademyPermission[],
  ): Promise<Result<AcademyMembership, ServiceError>> {
    if (USE_MOCK) {
      membershipsCache = await loadMemberships();
      const membership = membershipsCache.find((m) => m.id === membershipId);
      if (!membership) return err(notFound('Membership', membershipId));

      membership.role = role;
      membership.permissions = permissions;

      await saveMemberships(membershipsCache);
      return ok(membership);
    }

    const response = await fetch(`/api/memberships/${membershipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, permissions }),
    });
    return ok(await response.json());
  },

  /**
   * Remove member from academy
   */
  async removeMember(membershipId: string): Promise<Result<void, ServiceError>> {
    if (USE_MOCK) {
      membershipsCache = await loadMemberships();
      const membership = membershipsCache.find((m) => m.id === membershipId);
      if (!membership) return err(notFound('Membership', membershipId));

      if (membership.role === 'OWNER') {
        return err(validationError('Cannot remove owner'));
      }

      membership.status = 'SUSPENDED';
      await saveMemberships(membershipsCache);
      return ok(undefined);
    }

    await fetch(`/api/memberships/${membershipId}`, { method: 'DELETE' });
    return ok(undefined);
  },

  /**
   * Check if user has permission
   */
  async hasPermission(
    academyId: string,
    userId: string,
    permission: AcademyPermission,
  ): Promise<Result<boolean, ServiceError>> {
    try {
      if (USE_MOCK) {
        membershipsCache = await loadMemberships();
        const membership = membershipsCache.find(
          (m) => m.academyId === academyId && m.userId === userId && m.status === 'ACTIVE',
        );
        if (!membership) return ok(false);
        if (membership.role === 'OWNER') return ok(true);
        return ok(membership.permissions.includes(permission));
      }

      const response = await fetch(
        `/api/academies/${academyId}/permissions/${userId}/${permission}`,
      );
      const data = await response.json();
      return ok(data.hasPermission);
    } catch (error) {
      logger.error('Failed to check academy permission', error);
      return err(storageError('Failed to check academy permission'));
    }
  },

  /**
   * Delete an academy
   * TODO: Implement full deletion logic with membership cleanup
   */
  async deleteAcademy(academyId: string): Promise<Result<void, ServiceError>> {
    if (USE_MOCK) {
      academiesCache = await loadAcademies();
      const index = academiesCache.findIndex((a) => a.id === academyId);
      if (index === -1) return err(notFound('Academy', academyId));

      academiesCache.splice(index, 1);
      await saveAcademies(academiesCache);
      return ok(undefined);
    }

    await fetch(`/api/academies/${academyId}`, { method: 'DELETE' });
    return ok(undefined);
  },

  /**
   * Format role for display
   */
  formatRole(role: AcademyMembership['role']): string {
    const labels: Record<AcademyMembership['role'], string> = {
      OWNER: 'Owner',
      ADMIN: 'Admin',
      HEAD_COACH: 'Head Coach',
      COACH: 'Coach',
      ASSISTANT: 'Assistant',
      MEMBER: 'Member',
    };
    return labels[role] || role;
  },
};
