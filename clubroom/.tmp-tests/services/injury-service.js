"use strict";
/**
 * Injury Service
 *
 * Handles injury tracking and recovery management for athletes.
 * Athletes can log injuries, track recovery progress, add notes,
 * and share injury status with their coaches.
 *
 * API Integration Notes:
 * - POST /api/injuries - Log injury
 * - GET /api/injuries?userId=X - Get user injuries
 * - GET /api/injuries/:id - Get injury details
 * - PATCH /api/injuries/:id - Update injury
 * - POST /api/injuries/:id/notes - Add recovery note
 * - PATCH /api/injuries/:id/heal - Mark as healed
 * - GET /api/athletes/:id/injuries - Coach view of athlete injuries
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.injuryService = void 0;
const storage_service_1 = require("./storage-service");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('InjuryService');
// Mock data for demonstration
const MOCK_INJURIES = [
    {
        id: 'injury_1',
        userId: 'user1',
        userName: 'Tom Henderson',
        bodyPart: 'LEFT_ANKLE',
        description: 'Rolled ankle during practice match. Some swelling and mild pain when walking.',
        severity: 'MODERATE',
        occurredAt: '2026-01-05T14:30:00Z',
        expectedRecovery: '2026-01-20T00:00:00Z',
        status: 'RECOVERING',
        recoveryPercent: 65,
        sharedWithCoach: true,
        notes: [
            {
                id: 'note_1',
                injuryId: 'injury_1',
                note: 'Started RICE protocol. Swelling has reduced significantly.',
                createdAt: '2026-01-06T10:00:00Z',
                createdBy: 'user1',
                createdByName: 'Tom Henderson',
                recoveryPercent: 25,
            },
            {
                id: 'note_2',
                injuryId: 'injury_1',
                note: 'Began light stretching exercises. Can walk without limp now.',
                createdAt: '2026-01-09T15:00:00Z',
                createdBy: 'user1',
                createdByName: 'Tom Henderson',
                recoveryPercent: 50,
            },
            {
                id: 'note_3',
                injuryId: 'injury_1',
                note: 'Light jogging today, feeling much better. Still some stiffness.',
                createdAt: '2026-01-11T09:00:00Z',
                createdBy: 'user1',
                createdByName: 'Tom Henderson',
                recoveryPercent: 65,
            },
        ],
        createdAt: '2026-01-05T16:00:00Z',
        updatedAt: '2026-01-11T09:00:00Z',
    },
    {
        id: 'injury_2',
        userId: 'user1',
        userName: 'Tom Henderson',
        bodyPart: 'RIGHT_THIGH',
        description: 'Minor muscle strain during sprint drills. Slight tightness but no sharp pain.',
        severity: 'MINOR',
        occurredAt: '2025-12-15T11:00:00Z',
        expectedRecovery: '2025-12-22T00:00:00Z',
        status: 'HEALED',
        recoveryPercent: 100,
        sharedWithCoach: true,
        notes: [
            {
                id: 'note_4',
                injuryId: 'injury_2',
                note: 'Resting and applying heat treatment.',
                createdAt: '2025-12-16T10:00:00Z',
                createdBy: 'user1',
                createdByName: 'Tom Henderson',
                recoveryPercent: 30,
            },
            {
                id: 'note_5',
                injuryId: 'injury_2',
                note: 'Muscle feels normal now. Cleared to resume training.',
                createdAt: '2025-12-21T14:00:00Z',
                createdBy: 'user1',
                createdByName: 'Tom Henderson',
                recoveryPercent: 100,
            },
        ],
        createdAt: '2025-12-15T12:00:00Z',
        updatedAt: '2025-12-21T14:00:00Z',
        healedAt: '2025-12-21T14:00:00Z',
    },
    {
        id: 'injury_3',
        userId: 'user2',
        userName: 'Emma Henderson',
        bodyPart: 'LEFT_KNEE',
        description: 'Knee pain after landing awkwardly from a header.',
        severity: 'MODERATE',
        occurredAt: '2026-01-08T16:00:00Z',
        expectedRecovery: '2026-01-25T00:00:00Z',
        status: 'ACTIVE',
        recoveryPercent: 10,
        sharedWithCoach: true,
        notes: [
            {
                id: 'note_6',
                injuryId: 'injury_3',
                note: 'Visited physio. Advised rest and ice for a week.',
                createdAt: '2026-01-09T11:00:00Z',
                createdBy: 'user2',
                createdByName: 'Emma Henderson',
                recoveryPercent: 10,
            },
        ],
        createdAt: '2026-01-08T18:00:00Z',
        updatedAt: '2026-01-09T11:00:00Z',
    },
    // Additional test data for other athletes
    {
        id: 'injury_4',
        userId: 'user3',
        userName: 'James Wilson',
        bodyPart: 'RIGHT_ANKLE',
        description: 'Twisted ankle during training session. Some swelling present.',
        severity: 'MINOR',
        occurredAt: '2026-01-10T17:00:00Z',
        expectedRecovery: '2026-01-17T00:00:00Z',
        status: 'RECOVERING',
        recoveryPercent: 40,
        sharedWithCoach: true,
        notes: [
            {
                id: 'note_7',
                injuryId: 'injury_4',
                note: 'Applying ice and keeping elevated. Pain manageable.',
                createdAt: '2026-01-11T09:00:00Z',
                createdBy: 'user3',
                createdByName: 'James Wilson',
                recoveryPercent: 40,
            },
        ],
        createdAt: '2026-01-10T18:00:00Z',
        updatedAt: '2026-01-11T09:00:00Z',
    },
    {
        id: 'injury_5',
        userId: 'user4a',
        userName: 'Sophie Taylor',
        bodyPart: 'LEFT_CALF',
        description: 'Calf strain during sprints. Tightness and discomfort when running.',
        severity: 'MINOR',
        occurredAt: '2025-12-20T15:00:00Z',
        expectedRecovery: '2025-12-30T00:00:00Z',
        status: 'HEALED',
        recoveryPercent: 100,
        sharedWithCoach: true,
        notes: [
            {
                id: 'note_8',
                injuryId: 'injury_5',
                note: 'Stretching daily and doing light exercises.',
                createdAt: '2025-12-22T10:00:00Z',
                createdBy: 'user4a',
                createdByName: 'Sophie Taylor',
                recoveryPercent: 50,
            },
            {
                id: 'note_9',
                injuryId: 'injury_5',
                note: 'Fully recovered. Back to full training.',
                createdAt: '2025-12-29T14:00:00Z',
                createdBy: 'user4a',
                createdByName: 'Sophie Taylor',
                recoveryPercent: 100,
            },
        ],
        createdAt: '2025-12-20T16:00:00Z',
        updatedAt: '2025-12-29T14:00:00Z',
        healedAt: '2025-12-29T14:00:00Z',
    },
    {
        id: 'injury_6',
        userId: 'user5',
        userName: 'Liam Davies',
        bodyPart: 'RIGHT_KNEE',
        description: 'Knee pain after collision during match. No visible swelling but painful to bend.',
        severity: 'MODERATE',
        occurredAt: '2026-01-12T14:00:00Z',
        expectedRecovery: '2026-01-28T00:00:00Z',
        status: 'ACTIVE',
        recoveryPercent: 5,
        sharedWithCoach: true,
        notes: [],
        createdAt: '2026-01-12T16:00:00Z',
        updatedAt: '2026-01-12T16:00:00Z',
    },
];
// ============================================================================
// BODY PART UTILITIES
// ============================================================================
/**
 * Get category for a body part
 */
function getBodyPartCategory(bodyPart) {
    const categoryMap = {
        HEAD: 'HEAD',
        NECK: 'HEAD',
        LEFT_SHOULDER: 'UPPER_BODY',
        RIGHT_SHOULDER: 'UPPER_BODY',
        LEFT_ARM: 'UPPER_BODY',
        RIGHT_ARM: 'UPPER_BODY',
        LEFT_ELBOW: 'UPPER_BODY',
        RIGHT_ELBOW: 'UPPER_BODY',
        LEFT_WRIST: 'UPPER_BODY',
        RIGHT_WRIST: 'UPPER_BODY',
        LEFT_HAND: 'UPPER_BODY',
        RIGHT_HAND: 'UPPER_BODY',
        CHEST: 'CORE',
        UPPER_BACK: 'CORE',
        LOWER_BACK: 'CORE',
        ABDOMEN: 'CORE',
        LEFT_HIP: 'LOWER_BODY',
        RIGHT_HIP: 'LOWER_BODY',
        LEFT_THIGH: 'LOWER_BODY',
        RIGHT_THIGH: 'LOWER_BODY',
        LEFT_KNEE: 'LOWER_BODY',
        RIGHT_KNEE: 'LOWER_BODY',
        LEFT_CALF: 'LOWER_BODY',
        RIGHT_CALF: 'LOWER_BODY',
        LEFT_ANKLE: 'LOWER_BODY',
        RIGHT_ANKLE: 'LOWER_BODY',
        LEFT_FOOT: 'LOWER_BODY',
        RIGHT_FOOT: 'LOWER_BODY',
    };
    return categoryMap[bodyPart];
}
/**
 * Get display label for a body part
 */
function getBodyPartLabel(bodyPart) {
    const labels = {
        HEAD: 'Head',
        NECK: 'Neck',
        LEFT_SHOULDER: 'Left Shoulder',
        RIGHT_SHOULDER: 'Right Shoulder',
        LEFT_ARM: 'Left Arm',
        RIGHT_ARM: 'Right Arm',
        LEFT_ELBOW: 'Left Elbow',
        RIGHT_ELBOW: 'Right Elbow',
        LEFT_WRIST: 'Left Wrist',
        RIGHT_WRIST: 'Right Wrist',
        LEFT_HAND: 'Left Hand',
        RIGHT_HAND: 'Right Hand',
        CHEST: 'Chest',
        UPPER_BACK: 'Upper Back',
        LOWER_BACK: 'Lower Back',
        ABDOMEN: 'Abdomen',
        LEFT_HIP: 'Left Hip',
        RIGHT_HIP: 'Right Hip',
        LEFT_THIGH: 'Left Thigh',
        RIGHT_THIGH: 'Right Thigh',
        LEFT_KNEE: 'Left Knee',
        RIGHT_KNEE: 'Right Knee',
        LEFT_CALF: 'Left Calf',
        RIGHT_CALF: 'Right Calf',
        LEFT_ANKLE: 'Left Ankle',
        RIGHT_ANKLE: 'Right Ankle',
        LEFT_FOOT: 'Left Foot',
        RIGHT_FOOT: 'Right Foot',
    };
    return labels[bodyPart];
}
/**
 * Get all body parts in a category
 */
function getBodyPartsByCategory(category) {
    const allParts = [
        'HEAD', 'NECK',
        'LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_ARM', 'RIGHT_ARM',
        'LEFT_ELBOW', 'RIGHT_ELBOW', 'LEFT_WRIST', 'RIGHT_WRIST',
        'LEFT_HAND', 'RIGHT_HAND',
        'CHEST', 'UPPER_BACK', 'LOWER_BACK', 'ABDOMEN',
        'LEFT_HIP', 'RIGHT_HIP', 'LEFT_THIGH', 'RIGHT_THIGH',
        'LEFT_KNEE', 'RIGHT_KNEE', 'LEFT_CALF', 'RIGHT_CALF',
        'LEFT_ANKLE', 'RIGHT_ANKLE', 'LEFT_FOOT', 'RIGHT_FOOT',
    ];
    return allParts.filter(part => getBodyPartCategory(part) === category);
}
/**
 * Get display info for severity level
 */
function getSeverityInfo(severity) {
    const severityInfo = {
        MINOR: { label: 'Minor', color: '#F59E0B', icon: 'bandage-outline' },
        MODERATE: { label: 'Moderate', color: '#F97316', icon: 'medical-outline' },
        SEVERE: { label: 'Severe', color: '#EF4444', icon: 'alert-circle-outline' },
    };
    return severityInfo[severity];
}
/**
 * Get display info for injury status
 */
function getStatusInfo(status) {
    const statusInfo = {
        ACTIVE: { label: 'Active', color: '#EF4444', icon: 'pulse-outline' },
        RECOVERING: { label: 'Recovering', color: '#F59E0B', icon: 'trending-up-outline' },
        HEALED: { label: 'Healed', color: '#10B981', icon: 'checkmark-circle-outline' },
    };
    return statusInfo[status];
}
// ============================================================================
// STORAGE OPERATIONS
// ============================================================================
/**
 * Get all injuries from storage
 */
async function getAllInjuries() {
    const injuries = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.INJURIES, []);
    // Return mock data if no injuries stored
    if (injuries.length === 0) {
        return [...MOCK_INJURIES];
    }
    return injuries;
}
/**
 * Save all injuries to storage
 */
async function saveInjuries(injuries) {
    await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.INJURIES, injuries);
}
// ============================================================================
// INJURY CRUD OPERATIONS
// ============================================================================
/**
 * Log a new injury for a user
 * @param userId - The user ID of the athlete
 * @param params - Injury details
 * @param userName - Optional user name for display
 * @returns The created injury
 */
async function logInjury(userId, params, userName) {
    const injuries = await getAllInjuries();
    const now = new Date().toISOString();
    const newInjury = {
        id: `injury_${Date.now()}`,
        userId,
        userName,
        bodyPart: params.bodyPart,
        description: params.description,
        severity: params.severity,
        occurredAt: params.occurredAt,
        expectedRecovery: params.expectedRecovery,
        status: 'ACTIVE',
        notes: [],
        recoveryPercent: 0,
        sharedWithCoach: params.sharedWithCoach ?? true,
        createdAt: now,
        updatedAt: now,
    };
    injuries.unshift(newInjury);
    await saveInjuries(injuries);
    logger.info('injury_logged', {
        injuryId: newInjury.id,
        userId,
        bodyPart: params.bodyPart,
        severity: params.severity,
    });
    return newInjury;
}
/**
 * Get all injuries for a specific user
 * @param userId - The user ID of the athlete
 * @param includeHealed - Whether to include healed injuries (default: true)
 * @returns Array of injuries
 */
async function getUserInjuries(userId, includeHealed = true) {
    const injuries = await getAllInjuries();
    let filtered = injuries.filter(i => i.userId === userId);
    if (!includeHealed) {
        filtered = filtered.filter(i => i.status !== 'HEALED');
    }
    // Sort by status (active first, then recovering, then healed) and by date
    return filtered.sort((a, b) => {
        const statusOrder = { ACTIVE: 0, RECOVERING: 1, HEALED: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    });
}
/**
 * Get a single injury by ID
 * @param id - The injury ID
 * @returns The injury or null if not found
 */
async function getInjuryById(id) {
    const injuries = await getAllInjuries();
    return injuries.find(i => i.id === id) ?? null;
}
/**
 * Update an existing injury
 * @param id - The injury ID
 * @param updates - The fields to update
 * @returns The updated injury or null if not found
 */
async function updateInjury(id, updates) {
    const injuries = await getAllInjuries();
    const injuryIndex = injuries.findIndex(i => i.id === id);
    if (injuryIndex === -1) {
        logger.warn('injury_not_found', { injuryId: id });
        return null;
    }
    const injury = injuries[injuryIndex];
    const updatedInjury = {
        ...injury,
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    // Auto-set healed timestamp if marking as healed
    if (updates.status === 'HEALED' && injury.status !== 'HEALED') {
        updatedInjury.healedAt = new Date().toISOString();
        updatedInjury.recoveryPercent = 100;
    }
    injuries[injuryIndex] = updatedInjury;
    await saveInjuries(injuries);
    logger.info('injury_updated', {
        injuryId: id,
        updates: Object.keys(updates),
    });
    return updatedInjury;
}
/**
 * Add a recovery note to an injury
 * @param injuryId - The injury ID
 * @param note - The note content
 * @param createdBy - User ID of the note creator
 * @param createdByName - Name of the note creator
 * @param recoveryPercent - Optional recovery percentage update
 * @returns The updated injury or null if not found
 */
async function addRecoveryNote(injuryId, note, createdBy, createdByName, recoveryPercent) {
    const injuries = await getAllInjuries();
    const injuryIndex = injuries.findIndex(i => i.id === injuryId);
    if (injuryIndex === -1) {
        logger.warn('injury_not_found_for_note', { injuryId });
        return null;
    }
    const injury = injuries[injuryIndex];
    const now = new Date().toISOString();
    const newNote = {
        id: `note_${Date.now()}`,
        injuryId,
        note,
        createdAt: now,
        createdBy,
        createdByName,
        recoveryPercent: recoveryPercent ?? injury.recoveryPercent,
    };
    injury.notes.push(newNote);
    injury.updatedAt = now;
    // Update recovery percent if provided
    if (recoveryPercent !== undefined) {
        injury.recoveryPercent = recoveryPercent;
        // Auto-transition status based on recovery progress
        if (recoveryPercent >= 100 && injury.status !== 'HEALED') {
            injury.status = 'HEALED';
            injury.healedAt = now;
        }
        else if (recoveryPercent > 0 && injury.status === 'ACTIVE') {
            injury.status = 'RECOVERING';
        }
    }
    injuries[injuryIndex] = injury;
    await saveInjuries(injuries);
    logger.info('recovery_note_added', {
        injuryId,
        noteId: newNote.id,
        recoveryPercent: injury.recoveryPercent,
    });
    return injury;
}
/**
 * Mark an injury as healed
 * @param id - The injury ID
 * @returns The updated injury or null if not found
 */
async function markAsHealed(id) {
    return updateInjury(id, {
        status: 'HEALED',
        recoveryPercent: 100,
    });
}
/**
 * Get injuries for an athlete (coach view)
 * Only returns injuries that are shared with coach
 * @param athleteId - The athlete's user ID
 * @returns Array of shared injuries
 */
async function getAthleteInjuries(athleteId) {
    const injuries = await getUserInjuries(athleteId, true);
    return injuries.filter(i => i.sharedWithCoach);
}
/**
 * Check if user has any active injuries
 * @param userId - The user ID
 * @returns True if user has active injuries
 */
async function hasActiveInjury(userId) {
    const injuries = await getUserInjuries(userId, false);
    return injuries.some(i => i.status === 'ACTIVE' || i.status === 'RECOVERING');
}
/**
 * Get active injury count for a user
 * @param userId - The user ID
 * @returns Number of active/recovering injuries
 */
async function getActiveInjuryCount(userId) {
    const injuries = await getUserInjuries(userId, false);
    return injuries.filter(i => i.status === 'ACTIVE' || i.status === 'RECOVERING').length;
}
// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================
/**
 * Get injury statistics for a user
 * @param userId - The user ID
 * @returns Injury statistics
 */
async function getInjuryStats(userId) {
    const injuries = await getUserInjuries(userId, true);
    const active = injuries.filter(i => i.status === 'ACTIVE').length;
    const recovering = injuries.filter(i => i.status === 'RECOVERING').length;
    const healed = injuries.filter(i => i.status === 'HEALED').length;
    // Count body parts
    const bodyPartCounts = {};
    injuries.forEach(i => {
        bodyPartCounts[i.bodyPart] = (bodyPartCounts[i.bodyPart] || 0) + 1;
    });
    const commonBodyParts = Object.entries(bodyPartCounts)
        .map(([bodyPart, count]) => ({ bodyPart: bodyPart, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    // Calculate average recovery time for healed injuries
    const healedInjuries = injuries.filter(i => i.healedAt);
    let averageRecoveryDays = 0;
    if (healedInjuries.length > 0) {
        const totalDays = healedInjuries.reduce((sum, i) => {
            const occurred = new Date(i.occurredAt);
            const healed = new Date(i.healedAt);
            return sum + Math.ceil((healed.getTime() - occurred.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        averageRecoveryDays = Math.round(totalDays / healedInjuries.length);
    }
    return {
        totalInjuries: injuries.length,
        activeInjuries: active,
        recoveringInjuries: recovering,
        healedInjuries: healed,
        commonBodyParts,
        averageRecoveryDays,
    };
}
/**
 * Calculate expected recovery progress based on dates
 * @param injury - The injury to calculate for
 * @returns Expected progress percentage
 */
function calculateExpectedProgress(injury) {
    if (!injury.expectedRecovery || injury.status === 'HEALED') {
        return injury.recoveryPercent;
    }
    const occurred = new Date(injury.occurredAt).getTime();
    const expected = new Date(injury.expectedRecovery).getTime();
    const now = Date.now();
    if (now >= expected)
        return 100;
    if (now <= occurred)
        return 0;
    const totalDuration = expected - occurred;
    const elapsed = now - occurred;
    return Math.round((elapsed / totalDuration) * 100);
}
/**
 * Format a date for display
 */
function formatDate(date) {
    if (!date)
        return 'Not set';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
/**
 * Get days until expected recovery
 * @param injury - The injury
 * @returns Days remaining or null if no expected date
 */
function getDaysUntilRecovery(injury) {
    if (!injury.expectedRecovery || injury.status === 'HEALED') {
        return null;
    }
    const expected = new Date(injury.expectedRecovery);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days = Math.ceil((expected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
}
/**
 * Reset injuries to mock data (for development/testing)
 */
async function resetToMockData() {
    await saveInjuries([...MOCK_INJURIES]);
    logger.info('injuries_reset_to_mock');
}
// ============================================================================
// EXPORTS
// ============================================================================
exports.injuryService = {
    // CRUD operations
    logInjury,
    getUserInjuries,
    getInjuryById,
    updateInjury,
    addRecoveryNote,
    markAsHealed,
    // Coach view
    getAthleteInjuries,
    // Status checks
    hasActiveInjury,
    getActiveInjuryCount,
    // Statistics
    getInjuryStats,
    calculateExpectedProgress,
    getDaysUntilRecovery,
    // Body part utilities
    getBodyPartCategory,
    getBodyPartLabel,
    getBodyPartsByCategory,
    // Display helpers
    getSeverityInfo,
    getStatusInfo,
    formatDate,
    // Development
    resetToMockData,
};
