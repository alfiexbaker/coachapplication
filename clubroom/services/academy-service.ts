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
import type { Academy, AcademyMembership, AcademyInvite, AcademyPermission, SportCategory, FootballObjective } from '@/constants/types';
import { type Result, type ServiceError, ok, err, notFound, validationError, conflictError } from '@/types/result';
import { createLogger } from '@/utils/logger';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('AcademyService');

const USE_MOCK = api.useMock;

// Mock academies
const MOCK_ACADEMIES: Academy[] = [
  {
    id: 'academy_1',
    name: 'East London FC Academy',
    slug: 'east-london-fc',
    description: 'Premier youth football development program in East London. Building tomorrow\'s stars today.',
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
    ownerId: 'coach_1',
    ownerName: 'Marcus Thompson',
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
    ownerName: 'Emma Williams',
    createdAt: '2025-01-10T14:00:00Z',
    rating: {
      average: 4.9,
      reviewCount: 18,
    },
    sports: ['Football'],
    specialties: ['Goalkeeping'],
  },
];

const MOCK_MEMBERSHIPS: AcademyMembership[] = [
  {
    id: 'mem_1',
    academyId: 'academy_1',
    userId: 'coach_1',
    userName: 'Marcus Thompson',
    userPhotoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    role: 'OWNER',
    permissions: ['MANAGE_STAFF', 'MANAGE_SETTINGS', 'CREATE_SESSIONS', 'VIEW_ANALYTICS', 'MANAGE_BILLING', 'POST_AS_ACADEMY', 'INVITE_MEMBERS'],
    status: 'ACTIVE',
    joinedAt: '2024-06-15T10:00:00Z',
  },
  {
    id: 'mem_2',
    academyId: 'academy_1',
    userId: 'coach_3',
    userName: 'James Carter',
    userPhotoUrl: 'https://randomuser.me/api/portraits/men/45.jpg',
    role: 'COACH',
    permissions: ['CREATE_SESSIONS', 'POST_AS_ACADEMY'],
    status: 'ACTIVE',
    joinedAt: '2024-08-20T09:00:00Z',
    invitedBy: 'coach_1',
  },
  {
    id: 'mem_3',
    academyId: 'academy_1',
    userId: 'coach_4',
    userName: 'Sophie Brown',
    userPhotoUrl: 'https://randomuser.me/api/portraits/women/28.jpg',
    role: 'ASSISTANT',
    permissions: [],
    status: 'ACTIVE',
    joinedAt: '2025-01-05T11:00:00Z',
    invitedBy: 'coach_1',
  },
];

const MOCK_INVITES: AcademyInvite[] = [
  {
    id: 'ainv_1',
    academyId: 'academy_1',
    academyName: 'East London FC Academy',
    code: 'ELFC2026',
    role: 'COACH',
    permissions: ['CREATE_SESSIONS', 'POST_AS_ACADEMY'],
    createdBy: 'coach_1',
    createdByName: 'Marcus Thompson',
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
    const stored = await apiClient.get<AcademyMembership[] | null>(STORAGE_KEYS.ACADEMY_MEMBERSHIPS, null);
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
  }): Promise<Academy[]> {
    if (USE_MOCK) {
      academiesCache = await loadAcademies();
      return academiesCache
        .filter((a) => a.isPublic)
        .sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
    }

    const response = await fetch('/api/academies');
    return response.json();
  },

  /**
   * Get academy by ID
   */
  async getAcademy(academyId: string): Promise<Academy | null> {
    if (USE_MOCK) {
      academiesCache = await loadAcademies();
      return academiesCache.find((a) => a.id === academyId) || null;
    }

    const response = await fetch(`/api/academies/${academyId}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Get academy by slug
   */
  async getAcademyBySlug(slug: string): Promise<Academy | null> {
    if (USE_MOCK) {
      academiesCache = await loadAcademies();
      return academiesCache.find((a) => a.slug === slug) || null;
    }

    const response = await fetch(`/api/academies/slug/${slug}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Get academies where user is a member
   */
  async getUserAcademies(userId: string): Promise<(Academy & { membership: AcademyMembership })[]> {
    if (USE_MOCK) {
      academiesCache = await loadAcademies();
      membershipsCache = await loadMemberships();

      const userMemberships = membershipsCache.filter(
        (m) => m.userId === userId && m.status === 'ACTIVE'
      );

      return userMemberships
        .map((m) => {
          const academy = academiesCache.find((a) => a.id === m.academyId);
          if (!academy) return null;
          return { ...academy, membership: m };
        })
        .filter(Boolean) as (Academy & { membership: AcademyMembership })[];
    }

    const response = await fetch(`/api/users/${userId}/academies`);
    return response.json();
  },

  /**
   * Create a new academy
   */
  async createAcademy(input: CreateAcademyInput): Promise<Academy> {
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
      ownerName: input.ownerName,
      createdAt: new Date().toISOString(),
      sports: input.sports || ['Football'],
      specialties: input.specialties || [],
    };

    // Create owner membership
    const ownerMembership: AcademyMembership = {
      id: `mem_${Date.now()}`,
      academyId: newAcademy.id,
      userId: input.ownerId,
      userName: input.ownerName,
      role: 'OWNER',
      permissions: ['MANAGE_STAFF', 'MANAGE_SETTINGS', 'CREATE_SESSIONS', 'VIEW_ANALYTICS', 'MANAGE_BILLING', 'POST_AS_ACADEMY', 'INVITE_MEMBERS'],
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

      return newAcademy;
    }

    const response = await fetch('/api/academies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAcademy),
    });
    return response.json();
  },

  /**
   * Update academy branding
   */
  async updateBranding(academyId: string, branding: UpdateBrandingInput): Promise<Result<Academy, ServiceError>> {
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
    settings: Partial<Pick<Academy, 'name' | 'description' | 'isPublic' | 'requiresApproval'>>
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
  async getStaff(academyId: string): Promise<AcademyMembership[]> {
    if (USE_MOCK) {
      membershipsCache = await loadMemberships();
      return membershipsCache
        .filter((m) => m.academyId === academyId && m.status === 'ACTIVE')
        .sort((a, b) => {
          const roleOrder = ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH', 'ASSISTANT', 'MEMBER'];
          return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
        });
    }

    const response = await fetch(`/api/academies/${academyId}/staff`);
    return response.json();
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
    maxUses: number = 10
  ): Promise<AcademyInvite> {
    const code = `${academyName.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '')}${Date.now().toString(36).toUpperCase().slice(-4)}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite: AcademyInvite = {
      id: `ainv_${Date.now()}`,
      academyId,
      academyName,
      code,
      role,
      permissions,
      createdBy,
      createdByName,
      expiresAt: expiresAt.toISOString(),
      maxUses,
      currentUses: 0,
    };

    if (USE_MOCK) {
      invitesCache = await loadInvites();
      invitesCache.push(invite);
      await saveInvites(invitesCache);
      return invite;
    }

    const response = await fetch(`/api/academies/${academyId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invite),
    });
    return response.json();
  },

  /**
   * Join academy with invite code
   */
  async joinWithCode(
    code: string,
    userId: string,
    userName: string,
    userPhotoUrl?: string
  ): Promise<Result<AcademyMembership, ServiceError>> {
    if (USE_MOCK) {
      invitesCache = await loadInvites();
      membershipsCache = await loadMemberships();
      academiesCache = await loadAcademies();

      const invite = invitesCache.find(
        (i) => i.code === code && new Date(i.expiresAt) > new Date() && i.currentUses < i.maxUses
      );
      if (!invite) return err(validationError('Invalid or expired invite code'));

      // Check if already a member
      const existingMembership = membershipsCache.find(
        (m) => m.academyId === invite.academyId && m.userId === userId
      );
      if (existingMembership) return err(conflictError('Already a member of this academy'));

      const membership: AcademyMembership = {
        id: `mem_${Date.now()}`,
        academyId: invite.academyId,
        userId,
        userName,
        userPhotoUrl,
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
    permissions: AcademyPermission[]
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
  async hasPermission(academyId: string, userId: string, permission: AcademyPermission): Promise<boolean> {
    if (USE_MOCK) {
      membershipsCache = await loadMemberships();
      const membership = membershipsCache.find(
        (m) => m.academyId === academyId && m.userId === userId && m.status === 'ACTIVE'
      );
      if (!membership) return false;
      if (membership.role === 'OWNER') return true; // Owner has all permissions
      return membership.permissions.includes(permission);
    }

    const response = await fetch(`/api/academies/${academyId}/permissions/${userId}/${permission}`);
    const data = await response.json();
    return data.hasPermission;
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
