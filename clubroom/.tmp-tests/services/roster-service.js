"use strict";
/**
 * Roster Service
 *
 * Handles coach athlete roster/directory management.
 * Provides athlete details, notes, and quick actions.
 *
 * Extends BaseService<RosterEntry> for standardized CRUD, caching (Map-based,
 * 30s TTL, O(1) getById), and storage operations.
 *
 * API Integration Notes:
 * - GET /api/coaches/:id/roster - Get roster
 * - GET /api/coaches/:id/roster/:athleteId - Get detail
 * - POST /api/coaches/:id/roster/:athleteId/notes - Add note
 * - PATCH /api/coaches/:id/roster/:athleteId - Update status/tags
 * - DELETE /api/coaches/:id/roster/:athleteId - Remove athlete
 * - GET /api/coaches/:id/roster/removed - Get removal history
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rosterService = void 0;
const api_client_1 = require("./api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const result_1 = require("@/types/result");
const base_service_1 = require("./base-service");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('RosterService');
const USE_MOCK = config_1.api.useMock;
// Mock roster data
const MOCK_ROSTER = [
    {
        id: 'roster_1',
        coachId: 'coach1',
        athleteId: 'athlete_1',
        athleteName: 'Tom Baker',
        athleteAge: 11,
        athletePhotoUrl: 'https://randomuser.me/api/portraits/boys/1.jpg',
        athleteSkillLevel: 'INTERMEDIATE',
        parentId: 'parent_1',
        parentName: 'Sarah Baker',
        parentEmail: 'sarah.baker@email.com',
        parentPhone: '+44 7700 900001',
        status: 'ACTIVE',
        startDate: '2025-06-15',
        lastSessionDate: '2026-01-08',
        nextSessionDate: '2026-01-15',
        totalSessions: 24,
        totalRevenue: 1440,
        averageRating: 4.5,
        notes: [
            {
                id: 'note_1',
                content: 'Strong dribbler, needs work on weak foot',
                createdAt: '2025-12-01T10:00:00Z',
            },
            {
                id: 'note_2',
                content: 'Very motivated, responds well to challenges',
                createdAt: '2026-01-05T14:00:00Z',
            },
        ],
        tags: ['striker', 'high-potential', 'academy-track'],
        primaryFocus: 'Finishing',
        notificationPreference: 'ALL',
    },
    {
        id: 'roster_2',
        coachId: 'coach1',
        athleteId: 'athlete_2',
        athleteName: 'Lucy Baker',
        athleteAge: 9,
        athletePhotoUrl: 'https://randomuser.me/api/portraits/girls/1.jpg',
        athleteSkillLevel: 'BEGINNER',
        parentId: 'parent_1',
        parentName: 'Sarah Baker',
        parentEmail: 'sarah.baker@email.com',
        parentPhone: '+44 7700 900001',
        status: 'ACTIVE',
        startDate: '2025-09-01',
        lastSessionDate: '2026-01-05',
        nextSessionDate: '2026-01-12',
        totalSessions: 12,
        totalRevenue: 720,
        averageRating: 4.8,
        notes: [
            {
                id: 'note_3',
                content: 'Excellent attitude, picks up skills quickly',
                createdAt: '2025-11-15T09:00:00Z',
            },
        ],
        tags: ['midfielder', 'new-starter'],
        primaryFocus: 'Passing',
        notificationPreference: 'ALL',
        senInfo: {
            hasSen: true,
            conditions: ['Dyspraxia'],
            supportNotes: 'Extra time for coordination drills. Responds well to visual demonstrations.',
            communicationPreferences: 'Clear step-by-step instructions. Avoid rushing between activities.',
        },
    },
    {
        id: 'roster_3',
        coachId: 'coach1',
        athleteId: 'athlete_3',
        athleteName: 'James Wilson',
        athleteAge: 12,
        athletePhotoUrl: 'https://randomuser.me/api/portraits/boys/2.jpg',
        athleteSkillLevel: 'ADVANCED',
        parentId: 'parent_2',
        parentName: 'Mike Wilson',
        parentEmail: 'mike.wilson@email.com',
        parentPhone: '+44 7700 900002',
        status: 'ACTIVE',
        startDate: '2024-03-10',
        lastSessionDate: '2026-01-10',
        nextSessionDate: '2026-01-17',
        totalSessions: 48,
        totalRevenue: 2880,
        averageRating: 4.7,
        notes: [
            {
                id: 'note_4',
                content: 'Team captain material, great leadership',
                createdAt: '2025-10-20T11:00:00Z',
            },
            {
                id: 'note_5',
                content: 'Working towards academy trials in March',
                createdAt: '2026-01-10T16:00:00Z',
            },
        ],
        tags: ['defender', 'captain', 'academy-track', 'long-term'],
        primaryFocus: 'Defending',
        notificationPreference: 'IMPORTANT',
        senInfo: {
            hasSen: true,
            conditions: ['ADHD'],
            supportNotes: 'Short activity bursts. Clear verbal instructions. Positive reinforcement.',
            communicationPreferences: 'Direct and concise. Use his name before giving instructions.',
        },
    },
    {
        id: 'roster_4',
        coachId: 'coach1',
        athleteId: 'athlete_4',
        athleteName: 'Emma Thompson',
        athleteAge: 10,
        athletePhotoUrl: 'https://randomuser.me/api/portraits/girls/2.jpg',
        athleteSkillLevel: 'INTERMEDIATE',
        parentId: 'parent_3',
        parentName: 'David Thompson',
        parentEmail: 'david.thompson@email.com',
        status: 'PAUSED',
        startDate: '2025-04-01',
        lastSessionDate: '2025-11-20',
        totalSessions: 18,
        totalRevenue: 1080,
        averageRating: 4.3,
        notes: [
            {
                id: 'note_6',
                content: 'On break due to school exams, returning Feb',
                createdAt: '2025-11-15T10:00:00Z',
            },
        ],
        tags: ['goalkeeper', 'on-break'],
        primaryFocus: 'Goalkeeping',
        notificationPreference: 'NONE',
    },
    {
        id: 'roster_5',
        coachId: 'coach1',
        athleteId: 'athlete_5',
        athleteName: 'Oliver Chen',
        athleteAge: 14,
        athletePhotoUrl: 'https://randomuser.me/api/portraits/boys/3.jpg',
        athleteSkillLevel: 'ADVANCED',
        parentId: 'parent_4',
        parentName: 'Wei Chen',
        parentEmail: 'wei.chen@email.com',
        status: 'GRADUATED',
        startDate: '2023-01-15',
        lastSessionDate: '2025-08-30',
        totalSessions: 96,
        totalRevenue: 5760,
        averageRating: 4.9,
        notes: [
            {
                id: 'note_7',
                content: 'Signed with Chelsea Academy U15',
                createdAt: '2025-08-30T17:00:00Z',
            },
        ],
        tags: ['success-story', 'academy-signed'],
        primaryFocus: 'Dribbling',
        notificationPreference: 'NONE',
    },
];
// ============================================================================
// REMOVAL HISTORY HELPERS
// ============================================================================
let removalHistoryCache = [];
async function loadRemovalHistory() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ROSTER_REMOVAL_HISTORY, []);
    }
    catch (error) {
        logger.error('Failed to load removal history', error);
    }
    return [];
}
async function saveRemovalHistory(history) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.ROSTER_REMOVAL_HISTORY, history);
        return (0, result_1.ok)(undefined);
    }
    catch (error) {
        logger.error('Failed to save removal history', error);
        return (0, result_1.err)((0, result_1.storageError)(`Failed to save removal history: ${String(error)}`));
    }
}
// ============================================================================
// ROSTER SERVICE (extends BaseService)
// ============================================================================
class RosterServiceImpl extends base_service_1.BaseService {
    constructor() {
        super();
        this.storageKey = storage_keys_1.STORAGE_KEYS.ROSTER;
        this.entityName = 'RosterEntry';
        this.useMock = USE_MOCK;
        this.mockData = [...MOCK_ROSTER];
    }
    // --------------------------------------------------------------------------
    // Query methods
    // --------------------------------------------------------------------------
    /**
     * Get full roster for a coach, with optional filters and sorting.
     */
    async getRoster(coachId, filters) {
        const result = await this.getAll({ filter: { coachId } });
        if (!result.success) {
            logger.error('Failed to get roster', result.error);
            return [];
        }
        let filtered = result.data;
        if (filters?.status) {
            filtered = filtered.filter((r) => r.status === filters.status);
        }
        if (filters?.skillLevel) {
            filtered = filtered.filter((r) => r.athleteSkillLevel === filters.skillLevel);
        }
        if (filters?.tags?.length) {
            filtered = filtered.filter((r) => filters.tags.some((tag) => r.tags.includes(tag)));
        }
        if (filters?.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter((r) => r.athleteName.toLowerCase().includes(search) ||
                r.parentName.toLowerCase().includes(search));
        }
        return filtered.sort((a, b) => {
            // Active first, then by name
            if (a.status === 'ACTIVE' && b.status !== 'ACTIVE')
                return -1;
            if (a.status !== 'ACTIVE' && b.status === 'ACTIVE')
                return 1;
            return a.athleteName.localeCompare(b.athleteName);
        });
    }
    /**
     * Get single roster entry by coach + athlete lookup.
     */
    async getRosterEntry(coachId, athleteId) {
        const result = await this.findOne({ coachId, athleteId });
        if (!result.success) {
            logger.error('Failed to get roster entry', result.error);
            return null;
        }
        return result.data;
    }
    // --------------------------------------------------------------------------
    // Note methods
    // --------------------------------------------------------------------------
    /**
     * Add note to athlete
     */
    async addNote(coachId, athleteId, content) {
        const note = {
            id: api_client_1.apiClient.generateId('note'),
            content,
            createdAt: new Date().toISOString(),
        };
        const data = await this.loadFromStorage();
        const entry = data.find((r) => r.coachId === coachId && r.athleteId === athleteId);
        if (entry) {
            entry.notes.push(note);
            await this.saveToStorage(data);
        }
        return note;
    }
    /**
     * Update note
     */
    async updateNote(coachId, athleteId, noteId, content) {
        const data = await this.loadFromStorage();
        const entry = data.find((r) => r.coachId === coachId && r.athleteId === athleteId);
        if (entry) {
            const note = entry.notes.find((n) => n.id === noteId);
            if (note) {
                note.content = content;
                note.updatedAt = new Date().toISOString();
                await this.saveToStorage(data);
                return (0, result_1.ok)(note);
            }
        }
        return (0, result_1.err)((0, result_1.notFound)('Note', noteId));
    }
    /**
     * Delete note
     */
    async deleteNote(coachId, athleteId, noteId) {
        const data = await this.loadFromStorage();
        const entry = data.find((r) => r.coachId === coachId && r.athleteId === athleteId);
        if (entry) {
            entry.notes = entry.notes.filter((n) => n.id !== noteId);
            await this.saveToStorage(data);
        }
    }
    // --------------------------------------------------------------------------
    // Status / tags / focus updates
    // --------------------------------------------------------------------------
    /**
     * Update athlete status
     */
    async updateStatus(coachId, athleteId, status) {
        const data = await this.loadFromStorage();
        const entry = data.find((r) => r.coachId === coachId && r.athleteId === athleteId);
        if (!entry)
            return (0, result_1.err)((0, result_1.notFound)('Roster entry', athleteId));
        entry.status = status;
        await this.saveToStorage(data);
        return (0, result_1.ok)(entry);
    }
    /**
     * Update tags
     */
    async updateTags(coachId, athleteId, tags) {
        const data = await this.loadFromStorage();
        const entry = data.find((r) => r.coachId === coachId && r.athleteId === athleteId);
        if (!entry)
            return (0, result_1.err)((0, result_1.notFound)('Roster entry', athleteId));
        entry.tags = tags;
        await this.saveToStorage(data);
        return (0, result_1.ok)(entry);
    }
    /**
     * Update primary focus
     */
    async updatePrimaryFocus(coachId, athleteId, focus) {
        const data = await this.loadFromStorage();
        const entry = data.find((r) => r.coachId === coachId && r.athleteId === athleteId);
        if (!entry)
            return (0, result_1.err)((0, result_1.notFound)('Roster entry', athleteId));
        entry.primaryFocus = focus;
        await this.saveToStorage(data);
        return (0, result_1.ok)(entry);
    }
    // --------------------------------------------------------------------------
    // Statistics & Tags
    // --------------------------------------------------------------------------
    /**
     * Get roster statistics
     */
    async getStats(coachId) {
        const roster = await this.getRoster(coachId);
        const total = roster.length;
        const active = roster.filter((r) => r.status === 'ACTIVE').length;
        const paused = roster.filter((r) => r.status === 'PAUSED').length;
        const graduated = roster.filter((r) => r.status === 'GRADUATED').length;
        const totalSessions = roster.reduce((sum, r) => sum + r.totalSessions, 0);
        const totalRevenue = roster.reduce((sum, r) => sum + r.totalRevenue, 0);
        const averageSessionsPerAthlete = total > 0 ? Math.round(totalSessions / total) : 0;
        return {
            total,
            active,
            paused,
            graduated,
            totalSessions,
            totalRevenue,
            averageSessionsPerAthlete,
        };
    }
    /**
     * Get all unique tags used in roster
     */
    async getAllTags(coachId) {
        const roster = await this.getRoster(coachId);
        const tags = new Set();
        roster.forEach((r) => r.tags.forEach((t) => tags.add(t)));
        return Array.from(tags).sort();
    }
    /**
     * Get athletes by tag
     */
    async getByTag(coachId, tag) {
        return this.getRoster(coachId, { tags: [tag] });
    }
    // --------------------------------------------------------------------------
    // Formatters (pure, no state)
    // --------------------------------------------------------------------------
    /**
     * Format revenue for display
     */
    formatRevenue(amount, currency = 'GBP') {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
        }).format(amount);
    }
    /**
     * Format status for display
     */
    formatStatus(status) {
        const labels = {
            ACTIVE: 'Active',
            PAUSED: 'Paused',
            GRADUATED: 'Graduated',
            INACTIVE: 'Inactive',
        };
        return labels[status] || status;
    }
    /**
     * Get status color
     */
    getStatusColor(status) {
        const colors = {
            ACTIVE: '#16A34A',
            PAUSED: '#CA8A04',
            GRADUATED: '#2563EB',
            INACTIVE: '#6B7280',
        };
        return colors[status] || '#6B7280';
    }
    // --------------------------------------------------------------------------
    // Removal / Archival
    // --------------------------------------------------------------------------
    /**
     * Remove athlete from roster
     */
    async removeAthlete(coachId, athleteId, reason, options) {
        const archive = options?.archive ?? true; // Default to archiving
        const data = await this.loadFromStorage();
        const entryIndex = data.findIndex((r) => r.coachId === coachId && r.athleteId === athleteId);
        if (entryIndex === -1) {
            return (0, result_1.err)((0, result_1.notFound)('Athlete', athleteId));
        }
        const entry = data[entryIndex];
        // Create removal record
        const removalRecord = {
            id: api_client_1.apiClient.generateId('removal'),
            coachId,
            athleteId,
            athleteName: entry.athleteName,
            reason,
            customReason: options?.customReason,
            archived: archive,
            removedAt: new Date().toISOString(),
            previousStatus: entry.status,
            totalSessions: entry.totalSessions,
            totalRevenue: entry.totalRevenue,
            originalEntry: archive ? entry : undefined,
        };
        // Remove from roster
        data.splice(entryIndex, 1);
        await this.saveToStorage(data);
        // Save to removal history
        removalHistoryCache = await loadRemovalHistory();
        removalHistoryCache.unshift(removalRecord);
        await saveRemovalHistory(removalHistoryCache);
        return (0, result_1.ok)(removalRecord);
    }
    /**
     * Undo athlete removal (restore from archive)
     */
    async undoRemoval(coachId, removalId) {
        removalHistoryCache = await loadRemovalHistory();
        const recordIndex = removalHistoryCache.findIndex((r) => r.id === removalId && r.coachId === coachId);
        if (recordIndex === -1) {
            return (0, result_1.err)((0, result_1.notFound)('Removal record', removalId));
        }
        const record = removalHistoryCache[recordIndex];
        if (!record.originalEntry) {
            return (0, result_1.err)((0, result_1.validationError)('Cannot restore - athlete was permanently deleted'));
        }
        // Restore to roster
        const data = await this.loadFromStorage();
        data.push(record.originalEntry);
        await this.saveToStorage(data);
        // Remove from removal history
        removalHistoryCache.splice(recordIndex, 1);
        await saveRemovalHistory(removalHistoryCache);
        return (0, result_1.ok)(record.originalEntry);
    }
    /**
     * Get removal history for a coach
     */
    async getRemovalHistory(coachId) {
        removalHistoryCache = await loadRemovalHistory();
        return removalHistoryCache.filter((r) => r.coachId === coachId);
    }
    /**
     * Format removal reason for display
     */
    formatRemovalReason(reason) {
        const labels = {
            GRADUATED: 'Graduated',
            MOVED: 'Moved away',
            INACTIVE: 'Inactive',
            OTHER: 'Other',
        };
        return labels[reason] || reason;
    }
}
exports.rosterService = new RosterServiceImpl();
