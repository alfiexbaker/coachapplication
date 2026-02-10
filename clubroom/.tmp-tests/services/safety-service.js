"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safetyService = void 0;
const storage_service_1 = require("./storage-service");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('SafetyService');
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
// Default empty medical info
const createDefaultMedicalInfo = () => ({
    conditions: [],
    allergies: [],
    medications: [],
    restrictions: [],
});
// Default emergency info for a new athlete
const createDefaultEmergencyInfo = (athleteId) => ({
    athleteId,
    contacts: [],
    medical: createDefaultMedicalInfo(),
    consents: [
        { type: 'PHOTO', granted: false, grantedBy: '' },
        { type: 'VIDEO', granted: false, grantedBy: '' },
        { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
        { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
    ],
    updatedAt: new Date().toISOString(),
});
// Mock emergency info data for demo purposes
const MOCK_EMERGENCY_INFO = {
    athlete1: {
        athleteId: 'athlete1',
        contacts: [
            {
                id: 'contact1',
                name: 'Sarah Henderson',
                relationship: 'Mother',
                phone: '+44 7700 900123',
                email: 'sarah.henderson@email.com',
                isPrimary: true,
                canPickup: true,
            },
            {
                id: 'contact2',
                name: 'James Henderson',
                relationship: 'Father',
                phone: '+44 7700 900456',
                email: 'james.henderson@email.com',
                isPrimary: false,
                canPickup: true,
            },
            {
                id: 'contact3',
                name: 'Emily Parker',
                relationship: 'Grandmother',
                phone: '+44 7700 900789',
                isPrimary: false,
                canPickup: true,
            },
        ],
        medical: {
            conditions: ['Mild asthma'],
            allergies: ['Peanuts', 'Tree nuts'],
            medications: ['Ventolin inhaler (as needed)'],
            doctorName: 'Dr. Sarah Williams',
            doctorPhone: '+44 20 7123 4567',
            insuranceProvider: 'Bupa',
            insuranceNumber: 'BUP-123456789',
            restrictions: ['Avoid running in cold weather without warm-up'],
            notes: 'Carries inhaler in sports bag. Parent to be notified if inhaler used.',
        },
        consents: [
            { type: 'PHOTO', granted: true, grantedAt: '2024-01-15T10:00:00Z', grantedBy: 'Sarah Henderson' },
            { type: 'VIDEO', granted: true, grantedAt: '2024-01-15T10:00:00Z', grantedBy: 'Sarah Henderson' },
            { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
            { type: 'EMERGENCY_TREATMENT', granted: true, grantedAt: '2024-01-15T10:00:00Z', grantedBy: 'Sarah Henderson' },
        ],
        updatedAt: '2024-01-15T10:00:00Z',
    },
    athlete2: {
        athleteId: 'athlete2',
        contacts: [
            {
                id: 'contact4',
                name: 'Michael Smith',
                relationship: 'Father',
                phone: '+44 7700 901234',
                email: 'michael.smith@email.com',
                isPrimary: true,
                canPickup: true,
            },
        ],
        medical: {
            conditions: [],
            allergies: ['Penicillin'],
            medications: [],
            restrictions: [],
            notes: 'No significant medical history.',
        },
        consents: [
            { type: 'PHOTO', granted: true, grantedAt: '2024-02-01T14:30:00Z', grantedBy: 'Michael Smith' },
            { type: 'VIDEO', granted: true, grantedAt: '2024-02-01T14:30:00Z', grantedBy: 'Michael Smith' },
            { type: 'SOCIAL_MEDIA', granted: true, grantedAt: '2024-02-01T14:30:00Z', grantedBy: 'Michael Smith' },
            { type: 'EMERGENCY_TREATMENT', granted: true, grantedAt: '2024-02-01T14:30:00Z', grantedBy: 'Michael Smith' },
        ],
        updatedAt: '2024-02-01T14:30:00Z',
    },
};
class SafetyService {
    /**
     * Get emergency info for an athlete
     */
    async getEmergencyInfo(athleteId) {
        const allInfo = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.EMERGENCY_INFO, MOCK_EMERGENCY_INFO);
        return allInfo[athleteId] ?? createDefaultEmergencyInfo(athleteId);
    }
    /**
     * Update emergency info for an athlete
     */
    async updateEmergencyInfo(athleteId, update) {
        const allInfo = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.EMERGENCY_INFO, MOCK_EMERGENCY_INFO);
        const currentInfo = allInfo[athleteId] ?? createDefaultEmergencyInfo(athleteId);
        const updatedInfo = {
            ...currentInfo,
            ...update,
            athleteId,
            updatedAt: new Date().toISOString(),
        };
        allInfo[athleteId] = updatedInfo;
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.EMERGENCY_INFO, allInfo);
        return updatedInfo;
    }
    /**
     * Add an emergency contact
     */
    async addContact(athleteId, contact) {
        const info = await this.getEmergencyInfo(athleteId);
        const newContact = {
            ...contact,
            id: `contact_${Date.now()}`,
        };
        // If this is marked as primary, unset other primaries
        if (newContact.isPrimary) {
            info.contacts = info.contacts.map(c => ({ ...c, isPrimary: false }));
        }
        // If this is the first contact, make it primary
        if (info.contacts.length === 0) {
            newContact.isPrimary = true;
        }
        return this.updateEmergencyInfo(athleteId, {
            contacts: [...info.contacts, newContact],
        });
    }
    /**
     * Update an emergency contact
     */
    async updateContact(athleteId, contactId, update) {
        const info = await this.getEmergencyInfo(athleteId);
        let contacts = info.contacts.map(c => c.id === contactId ? { ...c, ...update } : c);
        // If updating to primary, unset other primaries
        if (update.isPrimary) {
            contacts = contacts.map(c => c.id === contactId ? c : { ...c, isPrimary: false });
        }
        return this.updateEmergencyInfo(athleteId, { contacts });
    }
    /**
     * Remove an emergency contact
     */
    async removeContact(athleteId, contactId) {
        const info = await this.getEmergencyInfo(athleteId);
        const contacts = info.contacts.filter(c => c.id !== contactId);
        // Ensure there's always a primary if contacts exist
        if (contacts.length > 0 && !contacts.some(c => c.isPrimary)) {
            contacts[0].isPrimary = true;
        }
        return this.updateEmergencyInfo(athleteId, { contacts });
    }
    /**
     * Update medical info
     */
    async updateMedicalInfo(athleteId, medical) {
        const info = await this.getEmergencyInfo(athleteId);
        return this.updateEmergencyInfo(athleteId, {
            medical: { ...info.medical, ...medical },
        });
    }
    /**
     * Update a consent
     */
    async updateConsent(athleteId, type, granted, grantedBy) {
        const info = await this.getEmergencyInfo(athleteId);
        const consents = info.consents.map(c => c.type === type
            ? {
                ...c,
                granted,
                grantedBy,
                grantedAt: granted ? new Date().toISOString() : undefined,
            }
            : c);
        return this.updateEmergencyInfo(athleteId, { consents });
    }
    /**
     * Get primary emergency contact
     */
    async getPrimaryContact(athleteId) {
        const info = await this.getEmergencyInfo(athleteId);
        return info.contacts.find(c => c.isPrimary) ?? info.contacts[0] ?? null;
    }
    /**
     * Check if athlete has any allergies or medical conditions
     */
    async hasAlerts(athleteId) {
        const info = await this.getEmergencyInfo(athleteId);
        return (info.medical.allergies.length > 0 ||
            info.medical.conditions.length > 0 ||
            info.medical.medications.length > 0);
    }
    /**
     * Get consent status for a specific type
     */
    async getConsent(athleteId, type) {
        const info = await this.getEmergencyInfo(athleteId);
        return info.consents.find(c => c.type === type) ?? null;
    }
    /**
     * Check if emergency info is complete (has at least one contact and emergency treatment consent)
     */
    async isComplete(athleteId) {
        const info = await this.getEmergencyInfo(athleteId);
        const hasContact = info.contacts.length > 0;
        const hasEmergencyConsent = info.consents.find(c => c.type === 'EMERGENCY_TREATMENT')?.granted;
        return hasContact && Boolean(hasEmergencyConsent);
    }
    /**
     * Get completion percentage for emergency info
     */
    async getCompletionPercentage(athleteId) {
        const info = await this.getEmergencyInfo(athleteId);
        let completed = 0;
        const total = 4; // contacts, medical, consents (emergency treatment), doctor info
        if (info.contacts.length > 0)
            completed++;
        if (info.consents.find(c => c.type === 'EMERGENCY_TREATMENT')?.granted)
            completed++;
        if (info.medical.doctorName || info.medical.doctorPhone)
            completed++;
        if (info.medical.allergies.length > 0 ||
            info.medical.conditions.length > 0 ||
            info.medical.notes) {
            completed++;
        }
        return Math.round((completed / total) * 100);
    }
    /**
     * Format allergies for display
     */
    formatAllergies(allergies) {
        if (allergies.length === 0)
            return 'None';
        return allergies.join(', ');
    }
    /**
     * Format conditions for display
     */
    formatConditions(conditions) {
        if (conditions.length === 0)
            return 'None';
        return conditions.join(', ');
    }
    /**
     * Get severity level for medical alerts
     */
    getMedicalAlertSeverity(medical) {
        const allergyCount = medical.allergies.length;
        const conditionCount = medical.conditions.length;
        const medicationCount = medical.medications.length;
        if (allergyCount === 0 && conditionCount === 0 && medicationCount === 0) {
            return 'none';
        }
        if (allergyCount >= 2 || conditionCount >= 2 || medicationCount >= 2) {
            return 'high';
        }
        if (allergyCount >= 1 || conditionCount >= 1 || medicationCount >= 1) {
            return 'medium';
        }
        return 'low';
    }
    // ============================================================================
    // EMERGENCY QUICK ACCESS METHODS (for coach session view)
    // ============================================================================
    /**
     * Get quick access emergency data for a single athlete
     * Caches data for offline access during sessions
     */
    async getAthleteEmergency(athleteId, athleteName) {
        let isCached = false;
        let info;
        let resolvedName = athleteName || 'Unknown Athlete';
        try {
            info = await this.getEmergencyInfo(athleteId);
            // Cache for offline access
            await this.cacheEmergencyInfo(athleteId, info, resolvedName);
        }
        catch {
            // Try to get from cache if network fails
            const cached = await this.getCachedEmergencyInfo(athleteId);
            if (cached) {
                info = cached.data;
                resolvedName = cached.athleteName || resolvedName;
                isCached = true;
            }
            else {
                // Return empty data if nothing available
                info = createDefaultEmergencyInfo(athleteId);
            }
        }
        const primaryContact = info.contacts.find(c => c.isPrimary) ?? info.contacts[0] ?? null;
        const alertLevel = this.getMedicalAlertSeverity(info.medical);
        const hasAlerts = alertLevel !== 'none';
        const emergencyTreatmentConsent = info.consents.find(c => c.type === 'EMERGENCY_TREATMENT')?.granted ?? false;
        return {
            athleteId,
            athleteName: resolvedName,
            hasAlerts,
            alertLevel,
            primaryContact,
            allContacts: info.contacts,
            allergies: info.medical.allergies,
            conditions: info.medical.conditions,
            medications: info.medical.medications,
            restrictions: info.medical.restrictions,
            medicalNotes: info.medical.notes,
            doctorName: info.medical.doctorName,
            doctorPhone: info.medical.doctorPhone,
            emergencyTreatmentConsent,
            lastUpdated: info.updatedAt,
            isCached,
        };
    }
    /**
     * Get aggregated safety info for all attendees in a session
     */
    async getSessionSafetyInfo(sessionId, attendees) {
        const athletes = [];
        const allAllergies = new Set();
        const allConditions = new Set();
        const missingEmergencyInfo = [];
        let athletesWithAlerts = 0;
        let highAlertCount = 0;
        for (const attendee of attendees) {
            const emergencyData = await this.getAthleteEmergency(attendee.athleteId, attendee.athleteName);
            athletes.push(emergencyData);
            // Aggregate allergies and conditions
            emergencyData.allergies.forEach(a => allAllergies.add(a));
            emergencyData.conditions.forEach(c => allConditions.add(c));
            // Count alerts
            if (emergencyData.hasAlerts) {
                athletesWithAlerts++;
                if (emergencyData.alertLevel === 'high') {
                    highAlertCount++;
                }
            }
            // Track missing info
            if (emergencyData.allContacts.length === 0) {
                missingEmergencyInfo.push(attendee.athleteName);
            }
        }
        return {
            sessionId,
            totalAthletes: attendees.length,
            athletesWithAlerts,
            highAlertCount,
            athletes,
            allAllergies: Array.from(allAllergies).sort(),
            allConditions: Array.from(allConditions).sort(),
            missingEmergencyInfo,
        };
    }
    /**
     * Format an emergency contact for display
     */
    formatEmergencyContact(contact) {
        const parts = [contact.name];
        if (contact.relationship) {
            parts.push(`(${contact.relationship})`);
        }
        return parts.join(' ');
    }
    /**
     * Format phone number for display
     */
    formatPhoneNumber(phone) {
        // Simple formatting - just return as-is for now
        // Could be enhanced to format based on locale
        return phone;
    }
    /**
     * Get a formatted summary of medical alerts
     */
    getAlertSummary(info) {
        const parts = [];
        if (info.allergies.length > 0) {
            parts.push(`${info.allergies.length} allerg${info.allergies.length === 1 ? 'y' : 'ies'}`);
        }
        if (info.conditions.length > 0) {
            parts.push(`${info.conditions.length} condition${info.conditions.length === 1 ? '' : 's'}`);
        }
        if (info.medications.length > 0) {
            parts.push(`${info.medications.length} medication${info.medications.length === 1 ? '' : 's'}`);
        }
        if (parts.length === 0) {
            return 'No medical alerts';
        }
        return parts.join(', ');
    }
    /**
     * Get alert level color for UI
     * TODO: These hardcoded hex colors should be replaced with theme tokens
     * (e.g. colors.error, colors.warning, colors.textSecondary, colors.success)
     * when consumed in UI components. Service returns data values; UI layer
     * should map to theme via useTheme().
     */
    getAlertLevelColor(level) {
        switch (level) {
            case 'high':
                return '#C03E47'; // TODO: map to colors.error in UI layer
            case 'medium':
                return '#C78000'; // TODO: map to colors.warning in UI layer
            case 'low':
                return '#64748b'; // TODO: map to colors.textSecondary in UI layer
            case 'none':
            default:
                return '#1C8C5E'; // TODO: map to colors.success in UI layer
        }
    }
    /**
     * Get alert level label for UI
     */
    getAlertLevelLabel(level) {
        switch (level) {
            case 'high':
                return 'High Alert';
            case 'medium':
                return 'Medical Alert';
            case 'low':
                return 'Info on File';
            case 'none':
            default:
                return 'No Alerts';
        }
    }
    // ============================================================================
    // CACHING METHODS (for offline access)
    // ============================================================================
    /**
     * Cache emergency info for offline access
     */
    async cacheEmergencyInfo(athleteId, info, athleteName) {
        const cache = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.EMERGENCY_CACHE, {});
        cache[athleteId] = {
            data: info,
            cachedAt: Date.now(),
            athleteName,
        };
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.EMERGENCY_CACHE, cache);
    }
    /**
     * Get cached emergency info
     */
    async getCachedEmergencyInfo(athleteId) {
        const cache = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.EMERGENCY_CACHE, {});
        const cached = cache[athleteId];
        if (!cached) {
            return null;
        }
        // Check if cache is still valid
        if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
            return null;
        }
        return cached;
    }
    /**
     * Pre-cache emergency info for all athletes in an upcoming session
     * Call this before a session starts to ensure offline access
     */
    async preCacheSessionEmergencyInfo(attendees) {
        for (const attendee of attendees) {
            try {
                const info = await this.getEmergencyInfo(attendee.athleteId);
                await this.cacheEmergencyInfo(attendee.athleteId, info, attendee.athleteName);
            }
            catch {
                // Ignore errors during pre-caching
                logger.warn('Failed to pre-cache emergency info', { athleteId: attendee.athleteId });
            }
        }
    }
    /**
     * Clear cached emergency info
     */
    async clearCache() {
        await storage_service_1.storageService.removeItem(storage_keys_1.STORAGE_KEYS.EMERGENCY_CACHE);
    }
    /**
     * Reset to mock data (for testing)
     */
    async resetToMockData() {
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.EMERGENCY_INFO, MOCK_EMERGENCY_INFO);
        await this.clearCache();
    }
}
exports.safetyService = new SafetyService();
