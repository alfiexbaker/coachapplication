"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.academyService = void 0;
const api_client_1 = require("./api-client");
const config_1 = require("@/constants/config");
const result_1 = require("@/types/result");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('AcademyService');
const USE_MOCK = config_1.api.useMock;
// Mock academies
const MOCK_ACADEMIES = [
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
        ownerId: 'coach1',
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
const MOCK_MEMBERSHIPS = [
    {
        id: 'mem_1',
        academyId: 'academy_1',
        userId: 'coach1',
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
        invitedBy: 'coach1',
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
        invitedBy: 'coach1',
    },
];
const MOCK_INVITES = [
    {
        id: 'ainv_1',
        academyId: 'academy_1',
        academyName: 'East London FC Academy',
        code: 'ELFC2026',
        role: 'COACH',
        permissions: ['CREATE_SESSIONS', 'POST_AS_ACADEMY'],
        createdBy: 'coach1',
        createdByName: 'Marcus Thompson',
        expiresAt: '2026-02-10T23:59:59Z',
        maxUses: 5,
        currentUses: 1,
    },
];
let academiesCache = [...MOCK_ACADEMIES];
let membershipsCache = [...MOCK_MEMBERSHIPS];
let invitesCache = [...MOCK_INVITES];
async function loadAcademies() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ACADEMIES, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load academies', error);
    }
    return [...MOCK_ACADEMIES];
}
async function saveAcademies(academies) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.ACADEMIES, academies);
    }
    catch (error) {
        logger.error('Failed to save academies', error);
    }
}
async function loadMemberships() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ACADEMY_MEMBERSHIPS, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load memberships', error);
    }
    return [...MOCK_MEMBERSHIPS];
}
async function saveMemberships(memberships) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.ACADEMY_MEMBERSHIPS, memberships);
    }
    catch (error) {
        logger.error('Failed to save memberships', error);
    }
}
async function loadInvites() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ACADEMY_INVITES, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load invites', error);
    }
    return [...MOCK_INVITES];
}
async function saveInvites(invites) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.ACADEMY_INVITES, invites);
    }
    catch (error) {
        logger.error('Failed to save invites', error);
    }
}
exports.academyService = {
    /**
     * Get all academies (discovery)
     */
    async discoverAcademies(filters) {
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
    async getAcademy(academyId) {
        if (USE_MOCK) {
            academiesCache = await loadAcademies();
            return academiesCache.find((a) => a.id === academyId) || null;
        }
        const response = await fetch(`/api/academies/${academyId}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Get academy by slug
     */
    async getAcademyBySlug(slug) {
        if (USE_MOCK) {
            academiesCache = await loadAcademies();
            return academiesCache.find((a) => a.slug === slug) || null;
        }
        const response = await fetch(`/api/academies/slug/${slug}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Get academies where user is a member
     */
    async getUserAcademies(userId) {
        if (USE_MOCK) {
            academiesCache = await loadAcademies();
            membershipsCache = await loadMemberships();
            const userMemberships = membershipsCache.filter((m) => m.userId === userId && m.status === 'ACTIVE');
            return userMemberships
                .map((m) => {
                const academy = academiesCache.find((a) => a.id === m.academyId);
                if (!academy)
                    return null;
                return { ...academy, membership: m };
            })
                .filter(Boolean);
        }
        const response = await fetch(`/api/users/${userId}/academies`);
        return response.json();
    },
    /**
     * Create a new academy
     */
    async createAcademy(input) {
        const slug = input.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        const newAcademy = {
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
        const ownerMembership = {
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
    async updateBranding(academyId, branding) {
        if (USE_MOCK) {
            academiesCache = await loadAcademies();
            const academy = academiesCache.find((a) => a.id === academyId);
            if (!academy)
                return (0, result_1.err)((0, result_1.notFound)('Academy', academyId));
            Object.assign(academy, branding);
            await saveAcademies(academiesCache);
            return (0, result_1.ok)(academy);
        }
        const response = await fetch(`/api/academies/${academyId}/branding`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(branding),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Update academy settings
     */
    async updateSettings(academyId, settings) {
        if (USE_MOCK) {
            academiesCache = await loadAcademies();
            const academy = academiesCache.find((a) => a.id === academyId);
            if (!academy)
                return (0, result_1.err)((0, result_1.notFound)('Academy', academyId));
            Object.assign(academy, settings);
            await saveAcademies(academiesCache);
            return (0, result_1.ok)(academy);
        }
        const response = await fetch(`/api/academies/${academyId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Get academy staff
     */
    async getStaff(academyId) {
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
    async createInvite(academyId, academyName, role, permissions, createdBy, createdByName, expiresInDays = 30, maxUses = 10) {
        const code = `${academyName.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '')}${Date.now().toString(36).toUpperCase().slice(-4)}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        const invite = {
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
    async joinWithCode(code, userId, userName, userPhotoUrl) {
        if (USE_MOCK) {
            invitesCache = await loadInvites();
            membershipsCache = await loadMemberships();
            academiesCache = await loadAcademies();
            const invite = invitesCache.find((i) => i.code === code && new Date(i.expiresAt) > new Date() && i.currentUses < i.maxUses);
            if (!invite)
                return (0, result_1.err)((0, result_1.validationError)('Invalid or expired invite code'));
            // Check if already a member
            const existingMembership = membershipsCache.find((m) => m.academyId === invite.academyId && m.userId === userId);
            if (existingMembership)
                return (0, result_1.err)((0, result_1.conflictError)('Already a member of this academy'));
            const membership = {
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
            return (0, result_1.ok)(membership);
        }
        const response = await fetch('/api/academies/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, userId, userName, userPhotoUrl }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Update member role
     */
    async updateMemberRole(membershipId, role, permissions) {
        if (USE_MOCK) {
            membershipsCache = await loadMemberships();
            const membership = membershipsCache.find((m) => m.id === membershipId);
            if (!membership)
                return (0, result_1.err)((0, result_1.notFound)('Membership', membershipId));
            membership.role = role;
            membership.permissions = permissions;
            await saveMemberships(membershipsCache);
            return (0, result_1.ok)(membership);
        }
        const response = await fetch(`/api/memberships/${membershipId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, permissions }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Remove member from academy
     */
    async removeMember(membershipId) {
        if (USE_MOCK) {
            membershipsCache = await loadMemberships();
            const membership = membershipsCache.find((m) => m.id === membershipId);
            if (!membership)
                return (0, result_1.err)((0, result_1.notFound)('Membership', membershipId));
            if (membership.role === 'OWNER') {
                return (0, result_1.err)((0, result_1.validationError)('Cannot remove owner'));
            }
            membership.status = 'SUSPENDED';
            await saveMemberships(membershipsCache);
            return (0, result_1.ok)(undefined);
        }
        await fetch(`/api/memberships/${membershipId}`, { method: 'DELETE' });
        return (0, result_1.ok)(undefined);
    },
    /**
     * Check if user has permission
     */
    async hasPermission(academyId, userId, permission) {
        if (USE_MOCK) {
            membershipsCache = await loadMemberships();
            const membership = membershipsCache.find((m) => m.academyId === academyId && m.userId === userId && m.status === 'ACTIVE');
            if (!membership)
                return false;
            if (membership.role === 'OWNER')
                return true; // Owner has all permissions
            return membership.permissions.includes(permission);
        }
        const response = await fetch(`/api/academies/${academyId}/permissions/${userId}/${permission}`);
        const data = await response.json();
        return data.hasPermission;
    },
    /**
     * Format role for display
     */
    formatRole(role) {
        const labels = {
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
