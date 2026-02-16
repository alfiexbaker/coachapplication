"use strict";
/**
 * Child Service
 *
 * Manages child profiles for parents/guardians including:
 * - Creating and updating child profiles
 * - Managing disabilities, special needs, and medical info
 * - Photo management
 * - Emergency contacts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.childService = exports.SPECIAL_NEEDS_CATEGORIES = exports.DISABILITY_TYPES = void 0;
const api_client_1 = require("./api-client");
const config_1 = require("@/constants/config");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const event_bus_1 = require("./event-bus");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('ChildService');
const USE_MOCK = config_1.api.useMock;
// ============================================================================
// PREDEFINED OPTIONS
// ============================================================================
exports.DISABILITY_TYPES = [
    'Autism Spectrum Disorder (ASD)',
    'ADHD',
    'Dyslexia',
    'Dyspraxia',
    'Dyscalculia',
    'Hearing Impairment',
    'Visual Impairment',
    'Physical Disability',
    'Cerebral Palsy',
    'Down Syndrome',
    'Epilepsy',
    'Speech/Language Disorder',
    'Anxiety Disorder',
    'Sensory Processing Disorder',
    'Other',
];
exports.SPECIAL_NEEDS_CATEGORIES = [
    {
        id: 'PHYSICAL',
        label: 'Physical',
        examples: ['Mobility support', 'Wheelchair access', 'Limited stamina'],
    },
    {
        id: 'LEARNING',
        label: 'Learning',
        examples: ['Extra time needed', 'Visual instructions preferred', 'Step-by-step breakdown'],
    },
    {
        id: 'SENSORY',
        label: 'Sensory',
        examples: ['Noise sensitivity', 'Light sensitivity', 'Tactile sensitivity'],
    },
    {
        id: 'BEHAVIORAL',
        label: 'Behavioral',
        examples: ['Needs structured environment', 'Requires frequent breaks', 'Benefits from routine'],
    },
    {
        id: 'MEDICAL',
        label: 'Medical',
        examples: [
            'Requires medication during sessions',
            'Has specific dietary needs',
            'Needs monitoring',
        ],
    },
    {
        id: 'OTHER',
        label: 'Other',
        examples: [],
    },
];
// ============================================================================
// MOCK DATA
// ============================================================================
let childrenCache = [
    {
        id: 'child-1',
        parentId: 'user1',
        firstName: 'Jake',
        lastName: 'Henderson',
        nickname: 'JT',
        dateOfBirth: '2012-03-15',
        gender: 'MALE',
        relationship: 'SON',
        photoUrl: undefined,
        disabilities: [
            {
                id: 'dis-1',
                type: 'ADHD',
                diagnosisDate: '2020-09-01',
                description: 'Diagnosed with ADHD - combined type',
                supportRequired: 'Benefits from clear, short instructions and regular breaks',
                communicationPreferences: ['Direct eye contact', 'Short sentences'],
                triggers: ['Long periods of waiting', 'Unclear expectations'],
                calmingStrategies: ['Movement breaks', 'Fidget tools', 'Counting exercises'],
            },
        ],
        specialNeeds: [
            {
                id: 'sn-1',
                category: 'BEHAVIORAL',
                name: 'Needs structured environment',
                description: 'Works best with clear routines and expectations',
                severity: 'MODERATE',
                accommodationsNeeded: ['Written schedule', 'Visual timers', 'Quiet space for breaks'],
                coachNotes: 'Give 5-minute warning before transitions',
            },
        ],
        hasSpecialNeeds: true,
        allergies: ['Peanuts'],
        medicalConditions: ['ADHD'],
        medications: ['Methylphenidate (morning only)'],
        communicationNotes: 'Responds well to positive reinforcement. Prefers direct communication.',
        behavioralNotes: 'May need movement breaks every 20-30 minutes. Gets overwhelmed in large groups.',
        emergencyContactName: 'Sarah Thompson',
        emergencyContactPhone: '+44 7700 900123',
        emergencyContactRelation: 'Mother',
        secondaryEmergencyName: 'Mike Thompson',
        secondaryEmergencyPhone: '+44 7700 900124',
        photoConsent: true,
        videoConsent: true,
        socialMediaConsent: false,
        emergencyTreatmentConsent: true,
        createdAt: '2023-01-15T10:00:00Z',
        updatedAt: '2024-01-10T14:30:00Z',
    },
    {
        id: 'child-2',
        parentId: 'user1',
        firstName: 'Tom',
        lastName: 'Henderson',
        dateOfBirth: '2010-05-12',
        gender: 'MALE',
        relationship: 'SON',
        photoUrl: undefined,
        disabilities: [
            {
                id: 'dis-2',
                type: 'Dyslexia',
                diagnosisDate: '2019-03-15',
                description: 'Mild dyslexia - affects reading and written instructions',
                supportRequired: 'Verbal instructions preferred over written',
                communicationPreferences: ['Verbal cues', 'Demonstrations'],
                triggers: ['Reading aloud', 'Written tests'],
                calmingStrategies: ['Extra time', 'One-on-one explanation'],
            },
        ],
        specialNeeds: [
            {
                id: 'sn-2',
                category: 'LEARNING',
                name: 'Requires verbal instructions',
                description: 'Learns better through verbal and visual demonstrations',
                severity: 'MILD',
                accommodationsNeeded: ['Verbal instructions', 'Visual demos', 'Extra processing time'],
                coachNotes: 'Show drills physically rather than explaining on a whiteboard',
            },
        ],
        hasSpecialNeeds: true,
        allergies: ['Bee stings'],
        medicalConditions: ['Dyslexia', 'Mild asthma'],
        medications: ['Ventolin inhaler (as needed)'],
        communicationNotes: 'Responds best to demonstrations. Very visual learner. Let him watch first before trying.',
        behavioralNotes: 'Very competitive but can get frustrated when struggling. Encourage and redirect.',
        emergencyContactName: 'John Henderson',
        emergencyContactPhone: '+1 (555) 123-4567',
        emergencyContactRelation: 'Father',
        secondaryEmergencyName: 'Mary Henderson',
        secondaryEmergencyPhone: '+1 (555) 123-4568',
        photoConsent: true,
        videoConsent: true,
        socialMediaConsent: false,
        emergencyTreatmentConsent: true,
        createdAt: '2023-03-20T10:00:00Z',
        updatedAt: '2024-01-05T10:00:00Z',
    },
    {
        id: 'child-3',
        parentId: 'user1',
        firstName: 'Lily',
        lastName: 'Henderson',
        dateOfBirth: '2015-11-08',
        gender: 'FEMALE',
        relationship: 'DAUGHTER',
        photoUrl: undefined,
        disabilities: [],
        specialNeeds: [],
        hasSpecialNeeds: false,
        allergies: ['Dairy'],
        medicalConditions: [],
        medications: [],
        communicationNotes: 'Very shy at first but warms up quickly. Loves praise and stickers.',
        behavioralNotes: 'May cling to parent at drop-off. Give her a moment to adjust.',
        emergencyContactName: 'John Henderson',
        emergencyContactPhone: '+1 (555) 123-4567',
        emergencyContactRelation: 'Father',
        photoConsent: true,
        videoConsent: true,
        socialMediaConsent: true,
        emergencyTreatmentConsent: true,
        createdAt: '2023-06-10T10:00:00Z',
        updatedAt: '2023-06-10T10:00:00Z',
    },
];
// ============================================================================
// STORAGE HELPERS
// ============================================================================
async function loadFromStorage() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CHILDREN_PROFILES, null);
        if (stored) {
            return stored;
        }
    }
    catch (error) {
        logger.error('Failed to load from storage', error);
    }
    return childrenCache;
}
async function saveToStorage(data) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CHILDREN_PROFILES, data);
        childrenCache = data;
        return (0, result_1.ok)(undefined);
    }
    catch (error) {
        logger.error('Failed to save to storage', error);
        return (0, result_1.err)((0, result_1.storageError)(`Failed to save children profiles: ${String(error)}`));
    }
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function generateId() {
    return api_client_1.apiClient.generateId('child');
}
function calculateAge(dateOfBirth) {
    if (!dateOfBirth)
        return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
// ============================================================================
// SERVICE METHODS
// ============================================================================
exports.childService = {
    /**
     * Get all children for a parent
     */
    async getChildren(parentId) {
        if (USE_MOCK) {
            childrenCache = await loadFromStorage();
            return childrenCache.filter((c) => c.parentId === parentId);
        }
        const response = await fetch(`/api/children?parentId=${parentId}`);
        return response.json();
    },
    /**
     * Get a single child by ID
     */
    async getChild(childId) {
        if (USE_MOCK) {
            childrenCache = await loadFromStorage();
            return childrenCache.find((c) => c.id === childId) || null;
        }
        const response = await fetch(`/api/children/${childId}`);
        return response.json();
    },
    /**
     * Create a new child profile
     */
    async createChild(parentId, input) {
        const now = new Date().toISOString();
        const newChild = {
            id: generateId(),
            parentId,
            firstName: input.firstName,
            lastName: input.lastName,
            nickname: input.nickname,
            dateOfBirth: input.dateOfBirth,
            gender: input.gender,
            relationship: input.relationship,
            photoUrl: input.photoUrl,
            disabilities: input.disabilities || [],
            specialNeeds: input.specialNeeds || [],
            hasSpecialNeeds: (input.disabilities?.length || 0) > 0 || (input.specialNeeds?.length || 0) > 0,
            allergies: input.allergies || [],
            medicalConditions: input.medicalConditions || [],
            medications: input.medications || [],
            communicationNotes: input.communicationNotes,
            behavioralNotes: input.behavioralNotes,
            emergencyContactName: input.emergencyContactName,
            emergencyContactPhone: input.emergencyContactPhone,
            emergencyContactRelation: input.emergencyContactRelation,
            secondaryEmergencyName: input.secondaryEmergencyName,
            secondaryEmergencyPhone: input.secondaryEmergencyPhone,
            photoConsent: input.photoConsent ?? true,
            videoConsent: input.videoConsent ?? true,
            socialMediaConsent: input.socialMediaConsent ?? false,
            emergencyTreatmentConsent: input.emergencyTreatmentConsent ?? true,
            createdAt: now,
            updatedAt: now,
        };
        if (USE_MOCK) {
            childrenCache = await loadFromStorage();
            childrenCache.push(newChild);
            await saveToStorage(childrenCache);
            return newChild;
        }
        const response = await fetch('/api/children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentId, ...input }),
        });
        return response.json();
    },
    /**
     * Update a child profile
     */
    async updateChild(childId, updates) {
        if (USE_MOCK) {
            childrenCache = await loadFromStorage();
            const index = childrenCache.findIndex((c) => c.id === childId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Child', childId));
            }
            childrenCache[index] = {
                ...childrenCache[index],
                ...updates,
                hasSpecialNeeds: (updates.disabilities?.length || childrenCache[index].disabilities.length) > 0 ||
                    (updates.specialNeeds?.length || childrenCache[index].specialNeeds.length) > 0,
                updatedAt: new Date().toISOString(),
            };
            await saveToStorage(childrenCache);
            return (0, result_1.ok)(childrenCache[index]);
        }
        const response = await fetch(`/api/children/${childId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Delete a child profile
     */
    async deleteChild(childId) {
        if (USE_MOCK) {
            childrenCache = await loadFromStorage();
            childrenCache = childrenCache.filter((c) => c.id !== childId);
            await saveToStorage(childrenCache);
            return;
        }
        await fetch(`/api/children/${childId}`, {
            method: 'DELETE',
        });
    },
    /**
     * Add a disability to a child
     */
    async addDisability(childId, disability) {
        const child = await this.getChild(childId);
        if (!child)
            return (0, result_1.err)((0, result_1.notFound)('Child', childId));
        const newDisability = {
            ...disability,
            id: api_client_1.apiClient.generateId('dis'),
        };
        return this.updateChild(childId, {
            disabilities: [...child.disabilities, newDisability],
        });
    },
    /**
     * Remove a disability from a child
     */
    async removeDisability(childId, disabilityId) {
        const child = await this.getChild(childId);
        if (!child)
            return (0, result_1.err)((0, result_1.notFound)('Child', childId));
        return this.updateChild(childId, {
            disabilities: child.disabilities.filter((d) => d.id !== disabilityId),
        });
    },
    /**
     * Add a special need to a child
     */
    async addSpecialNeed(childId, specialNeed) {
        const child = await this.getChild(childId);
        if (!child)
            return (0, result_1.err)((0, result_1.notFound)('Child', childId));
        const newSpecialNeed = {
            ...specialNeed,
            id: api_client_1.apiClient.generateId('sn'),
        };
        return this.updateChild(childId, {
            specialNeeds: [...child.specialNeeds, newSpecialNeed],
        });
    },
    /**
     * Remove a special need from a child
     */
    async removeSpecialNeed(childId, specialNeedId) {
        const child = await this.getChild(childId);
        if (!child)
            return (0, result_1.err)((0, result_1.notFound)('Child', childId));
        return this.updateChild(childId, {
            specialNeeds: child.specialNeeds.filter((sn) => sn.id !== specialNeedId),
        });
    },
    /**
     * Get child age from date of birth
     */
    getAge(dateOfBirth) {
        return calculateAge(dateOfBirth);
    },
    /**
     * Get children with special needs for a parent
     */
    async getChildrenWithSpecialNeeds(parentId) {
        const children = await this.getChildren(parentId);
        return children.filter((c) => c.hasSpecialNeeds);
    },
    /**
     * Find a child by name (for coach athlete lookup)
     * This allows coaches to see special needs info for athletes
     */
    async getChildByName(firstName, lastName) {
        if (USE_MOCK) {
            childrenCache = await loadFromStorage();
            return (childrenCache.find((c) => c.firstName.toLowerCase() === firstName.toLowerCase() &&
                c.lastName.toLowerCase() === lastName.toLowerCase()) || null);
        }
        const response = await fetch(`/api/children/by-name?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Get summary of a child for coach display
     */
    getCoachSummary(child) {
        const quickNotes = [];
        if (child.communicationNotes) {
            quickNotes.push(child.communicationNotes);
        }
        if (child.behavioralNotes) {
            quickNotes.push(child.behavioralNotes);
        }
        child.specialNeeds.forEach((sn) => {
            if (sn.coachNotes) {
                quickNotes.push(sn.coachNotes);
            }
        });
        return {
            name: `${child.firstName} ${child.lastName}`,
            age: calculateAge(child.dateOfBirth),
            hasSpecialNeeds: child.hasSpecialNeeds,
            quickNotes,
            allergies: child.allergies,
            disabilities: child.disabilities.map((d) => d.type),
        };
    },
    /**
     * Get the currently active child ID (the default child for bookings, badges, etc.)
     */
    async getActiveChildId() {
        try {
            return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ACTIVE_CHILD_ID, null);
        }
        catch (error) {
            logger.error('get_active_child_failed', { error });
            return null;
        }
    },
    /**
     * Set the active child. Pass null to clear.
     */
    async setActiveChildId(childId, childName) {
        try {
            if (childId) {
                await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.ACTIVE_CHILD_ID, childId);
            }
            else {
                await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.ACTIVE_CHILD_ID);
            }
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED, { childId, childName });
            logger.info('active_child_set', { childId, childName });
        }
        catch (error) {
            logger.error('set_active_child_failed', { childId, error });
        }
    },
};
