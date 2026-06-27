import {
  EmergencyInfo,
  EmergencyContact,
  MedicalInfo,
  Consent,
  ConsentType,
} from '@/constants/types';
import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  storageError,
  validationError,
} from '@/types/result';
import { normalizeLegacyMockDates } from '@/utils/mock-date-normalizer';
import { familyHealthService } from '@/services/family/family-health-service';

const logger = createLogger('SafetyService');
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CachedEmergencyInfo {
  data: EmergencyInfo;
  cachedAt: number;
  athleteName?: string;
}

interface EmergencyCache {
  [athleteId: string]: CachedEmergencyInfo;
}

/**
 * Quick access emergency data for coach view during sessions
 */
export interface AthleteEmergencyQuickView {
  athleteId: string;
  athleteName: string;
  hasAlerts: boolean;
  alertLevel: 'none' | 'low' | 'medium' | 'high';
  primaryContact: EmergencyContact | null;
  allContacts: EmergencyContact[];
  allergies: string[];
  conditions: string[];
  medications: string[];
  restrictions: string[];
  medicalNotes: string | undefined;
  doctorName: string | undefined;
  doctorPhone: string | undefined;
  emergencyTreatmentConsent: boolean;
  lastUpdated: string;
  isCached: boolean;
}

/**
 * Session safety info aggregating all attendees' emergency data
 */
export interface SessionSafetyInfo {
  sessionId: string;
  totalAthletes: number;
  athletesWithAlerts: number;
  highAlertCount: number;
  athletes: AthleteEmergencyQuickView[];
  allAllergies: string[];
  allConditions: string[];
  missingEmergencyInfo: string[];
}

// Default empty medical info
const createDefaultMedicalInfo = (): MedicalInfo => ({
  conditions: [],
  allergies: [],
  medications: [],
  restrictions: [],
});

// Default emergency info for a new athlete
const createDefaultEmergencyInfo = (athleteId: string): EmergencyInfo => ({
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

// Mock emergency info data — only available in development
const MOCK_EMERGENCY_INFO: Record<string, EmergencyInfo> | null = __DEV__
  ? normalizeLegacyMockDates({
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
          {
            type: 'PHOTO',
            granted: true,
            grantedAt: '2024-01-15T10:00:00Z',
            grantedBy: 'Sarah Henderson',
          },
          {
            type: 'VIDEO',
            granted: true,
            grantedAt: '2024-01-15T10:00:00Z',
            grantedBy: 'Sarah Henderson',
          },
          { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
          {
            type: 'EMERGENCY_TREATMENT',
            granted: true,
            grantedAt: '2024-01-15T10:00:00Z',
            grantedBy: 'Sarah Henderson',
          },
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
          {
            type: 'PHOTO',
            granted: true,
            grantedAt: '2024-02-01T14:30:00Z',
            grantedBy: 'Michael Smith',
          },
          {
            type: 'VIDEO',
            granted: true,
            grantedAt: '2024-02-01T14:30:00Z',
            grantedBy: 'Michael Smith',
          },
          {
            type: 'SOCIAL_MEDIA',
            granted: true,
            grantedAt: '2024-02-01T14:30:00Z',
            grantedBy: 'Michael Smith',
          },
          {
            type: 'EMERGENCY_TREATMENT',
            granted: true,
            grantedAt: '2024-02-01T14:30:00Z',
            grantedBy: 'Michael Smith',
          },
        ],
        updatedAt: '2024-02-01T14:30:00Z',
      },
    })
  : null;

function cloneEmergencyInfo(info: EmergencyInfo): EmergencyInfo {
  return {
    ...info,
    contacts: info.contacts.map((contact) => ({ ...contact })),
    medical: {
      ...info.medical,
      conditions: [...info.medical.conditions],
      allergies: [...info.medical.allergies],
      medications: [...info.medical.medications],
      restrictions: [...info.medical.restrictions],
    },
    consents: info.consents.map((consent) => ({ ...consent })),
  };
}

function cloneEmergencyInfoStore(
  source: Record<string, EmergencyInfo> | null | undefined,
): Record<string, EmergencyInfo> {
  return Object.fromEntries(
    Object.entries(source ?? {}).map(([athleteId, info]) => [athleteId, cloneEmergencyInfo(info)]),
  );
}

let mockEmergencyInfo = cloneEmergencyInfoStore(MOCK_EMERGENCY_INFO);
let emergencyCache: EmergencyCache = {};

class SafetyService {
  private async getEmergencyInfoValue(athleteId: string): Promise<EmergencyInfo> {
    return cloneEmergencyInfo(mockEmergencyInfo[athleteId] ?? createDefaultEmergencyInfo(athleteId));
  }

  private async updateEmergencyInfoValue(
    athleteId: string,
    update: Partial<Omit<EmergencyInfo, 'athleteId' | 'updatedAt'>>,
  ): Promise<EmergencyInfo> {
    const currentInfo = mockEmergencyInfo[athleteId] ?? createDefaultEmergencyInfo(athleteId);
    const updatedInfo: EmergencyInfo = {
      ...currentInfo,
      ...update,
      athleteId,
      updatedAt: new Date().toISOString(),
    };

    mockEmergencyInfo = {
      ...mockEmergencyInfo,
      [athleteId]: cloneEmergencyInfo(updatedInfo),
    };

    return cloneEmergencyInfo(updatedInfo);
  }

  /**
   * Get emergency info for an athlete.
   *
   * When requestorId and requestorRole are provided, access control is
   * enforced and the access is logged for audit compliance.
   * When omitted (legacy callers), a warning is logged but access is allowed
   * to avoid breaking existing flows during migration.
   */
  async getEmergencyInfo(
    athleteId: string,
    requestorId?: string,
    requestorRole?: 'coach' | 'parent' | 'admin',
  ): Promise<Result<EmergencyInfo, ServiceError>> {
    if (!apiClient.isMockMode) {
      return familyHealthService.getEmergencyInfo(athleteId);
    }

    try {
      // Access control when credentials are provided
      if (requestorId && requestorRole) {
        const hasAccess = await this.verifyEmergencyDataAccess(
          athleteId,
          requestorId,
          requestorRole,
        );
        if (!hasAccess) {
          logger.warn('Unauthorized emergency data access attempt', {
            athleteId,
            requestorId,
            requestorRole,
          });
          return err({
            code: 'UNAUTHORIZED',
            message: "You do not have permission to view this athlete's emergency information",
          });
        }
        // Log access for audit trail
        await this.logEmergencyDataAccess(athleteId, requestorId, requestorRole);
      } else {
        logger.warn('Emergency data accessed without credentials — legacy caller', {
          athleteId,
        });
      }

      return ok(await this.getEmergencyInfoValue(athleteId));
    } catch (error) {
      logger.error('Failed to get emergency info', { athleteId, error });
      return err(storageError('Failed to load emergency info'));
    }
  }

  /**
   * Verify whether a requestor has access to an athlete's emergency data.
   * - Parents can access their own children's data
   * - Coaches can access rostered athletes' data
   * - Admins always have access
   */
  private async verifyEmergencyDataAccess(
    athleteId: string,
    requestorId: string,
    requestorRole: 'coach' | 'parent' | 'admin',
  ): Promise<boolean> {
    if (requestorRole === 'admin') {
      return true;
    }

    // Self-access is always allowed
    if (requestorId === athleteId) {
      return true;
    }

    // Parents: check family membership (flat list, match by child id)
    if (requestorRole === 'parent') {
      return Boolean(mockEmergencyInfo[athleteId]);
    }

    // Coaches: check roster (coach's rostered athletes)
    if (requestorRole === 'coach') {
      const roster = await apiClient.get<{ athleteId: string; coachId?: string }[]>(
        STORAGE_KEYS.ROSTER,
        [],
      );
      return roster.some((a) => a.athleteId === athleteId);
    }

    return false;
  }

  /**
   * Log emergency data access for audit compliance.
   * Per-athlete key, FIFO capped at 1000 entries.
   */
  private async logEmergencyDataAccess(
    athleteId: string,
    requestorId: string,
    requestorRole: string,
  ): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        athleteId,
        requestorId,
        requestorRole,
        action: 'VIEW_EMERGENCY_INFO' as const,
      };

      const key = `${STORAGE_KEYS.AUDIT_LOG_PREFIX}${athleteId}`;
      const existingLogs = await apiClient.get<(typeof logEntry)[]>(key, []);

      const MAX_AUDIT_ENTRIES = 1000;
      const updatedLogs = [...existingLogs, logEntry];
      const trimmedLogs =
        updatedLogs.length > MAX_AUDIT_ENTRIES
          ? updatedLogs.slice(updatedLogs.length - MAX_AUDIT_ENTRIES)
          : updatedLogs;

      await apiClient.set(key, trimmedLogs);
      logger.info('Emergency data accessed', logEntry);
    } catch (error) {
      // Audit failure should not block access
      logger.error('Failed to log emergency data access', { athleteId, error });
    }
  }

  /**
   * Update emergency info for an athlete
   */
  async updateEmergencyInfo(
    athleteId: string,
    update: Partial<Omit<EmergencyInfo, 'athleteId' | 'updatedAt'>>,
  ): Promise<Result<EmergencyInfo, ServiceError>> {
    if (!apiClient.isMockMode) {
      const currentResult = await familyHealthService.getEmergencyInfo(athleteId);
      if (!currentResult.success) {
        return currentResult;
      }

      const current = currentResult.data;
      let nextResult: Result<EmergencyInfo, ServiceError> = ok(current);

      if (update.medical) {
        nextResult = await familyHealthService.updateMedicalInfo(athleteId, update.medical);
        if (!nextResult.success) return nextResult;
      }
      if (update.contacts) {
        nextResult = await familyHealthService.updateEmergencyContacts(athleteId, update.contacts);
        if (!nextResult.success) return nextResult;
      }
      if (update.consents) {
        nextResult = await familyHealthService.updateConsents(athleteId, update.consents);
      }

      return nextResult;
    }

    try {
      return ok(await this.updateEmergencyInfoValue(athleteId, update));
    } catch (error) {
      logger.error('Failed to update emergency info', { athleteId, error });
      return err(storageError('Failed to update emergency info'));
    }
  }

  /**
   * Add an emergency contact
   */
  async addContact(
    athleteId: string,
    contact: Omit<EmergencyContact, 'id'>,
  ): Promise<Result<EmergencyInfo, ServiceError>> {
    if (!apiClient.isMockMode) {
      const infoResult = await familyHealthService.getEmergencyInfo(athleteId);
      if (!infoResult.success) {
        return infoResult;
      }

      const info = infoResult.data;
      const newContact: EmergencyContact = {
        ...contact,
        id: `contact_${Date.now()}`,
      };

      if (newContact.isPrimary) {
        info.contacts = info.contacts.map((existing) => ({ ...existing, isPrimary: false }));
      }
      if (info.contacts.length === 0) {
        newContact.isPrimary = true;
      }

      return familyHealthService.updateEmergencyContacts(athleteId, [...info.contacts, newContact]);
    }

    try {
      const info = await this.getEmergencyInfoValue(athleteId);
      const newContact: EmergencyContact = {
        ...contact,
        id: `contact_${Date.now()}`,
      };

      // If this is marked as primary, unset other primaries
      if (newContact.isPrimary) {
        info.contacts = info.contacts.map((c) => ({ ...c, isPrimary: false }));
      }

      // If this is the first contact, make it primary
      if (info.contacts.length === 0) {
        newContact.isPrimary = true;
      }

      return ok(
        await this.updateEmergencyInfoValue(athleteId, {
          contacts: [...info.contacts, newContact],
        }),
      );
    } catch (error) {
      logger.error('Failed to add emergency contact', { athleteId, error });
      return err(storageError('Failed to add emergency contact'));
    }
  }

  /**
   * Update an emergency contact
   */
  async updateContact(
    athleteId: string,
    contactId: string,
    update: Partial<Omit<EmergencyContact, 'id'>>,
  ): Promise<Result<EmergencyInfo, ServiceError>> {
    if (!apiClient.isMockMode) {
      const infoResult = await familyHealthService.getEmergencyInfo(athleteId);
      if (!infoResult.success) {
        return infoResult;
      }

      let contacts = infoResult.data.contacts.map((contact) =>
        contact.id === contactId ? { ...contact, ...update } : contact,
      );
      if (update.isPrimary) {
        contacts = contacts.map((contact) =>
          contact.id === contactId ? contact : { ...contact, isPrimary: false },
        );
      }

      return familyHealthService.updateEmergencyContacts(athleteId, contacts);
    }

    try {
      const info = await this.getEmergencyInfoValue(athleteId);

      let contacts = info.contacts.map((c) => (c.id === contactId ? { ...c, ...update } : c));

      // If updating to primary, unset other primaries
      if (update.isPrimary) {
        contacts = contacts.map((c) => (c.id === contactId ? c : { ...c, isPrimary: false }));
      }

      return ok(await this.updateEmergencyInfoValue(athleteId, { contacts }));
    } catch (error) {
      logger.error('Failed to update emergency contact', { athleteId, contactId, error });
      return err(storageError('Failed to update emergency contact'));
    }
  }

  /**
   * Remove an emergency contact
   */
  async removeContact(
    athleteId: string,
    contactId: string,
  ): Promise<Result<EmergencyInfo, ServiceError>> {
    if (!apiClient.isMockMode) {
      const infoResult = await familyHealthService.getEmergencyInfo(athleteId);
      if (!infoResult.success) {
        return infoResult;
      }

      const contacts = infoResult.data.contacts.filter((contact) => contact.id !== contactId);
      if (contacts.length > 0 && !contacts.some((contact) => contact.isPrimary)) {
        contacts[0] = { ...contacts[0], isPrimary: true };
      }

      return familyHealthService.updateEmergencyContacts(athleteId, contacts);
    }

    try {
      const info = await this.getEmergencyInfoValue(athleteId);
      const contacts = info.contacts.filter((c) => c.id !== contactId);

      // Ensure there's always a primary if contacts exist
      if (contacts.length > 0 && !contacts.some((c) => c.isPrimary)) {
        contacts[0].isPrimary = true;
      }

      return ok(await this.updateEmergencyInfoValue(athleteId, { contacts }));
    } catch (error) {
      logger.error('Failed to remove emergency contact', { athleteId, contactId, error });
      return err(storageError('Failed to remove emergency contact'));
    }
  }

  /**
   * Update medical info
   */
  async updateMedicalInfo(
    athleteId: string,
    medical: Partial<MedicalInfo>,
  ): Promise<Result<EmergencyInfo, ServiceError>> {
    if (!apiClient.isMockMode) {
      return familyHealthService.updateMedicalInfo(athleteId, medical);
    }

    try {
      const info = await this.getEmergencyInfoValue(athleteId);
      return ok(
        await this.updateEmergencyInfoValue(athleteId, {
          medical: { ...info.medical, ...medical },
        }),
      );
    } catch (error) {
      logger.error('Failed to update medical info', { athleteId, error });
      return err(storageError('Failed to update medical info'));
    }
  }

  /**
   * Update a consent
   */
  async updateConsent(
    athleteId: string,
    type: ConsentType,
    granted: boolean,
    grantedBy: string,
    durationMonths = 12,
  ): Promise<Result<EmergencyInfo, ServiceError>> {
    if (!apiClient.isMockMode) {
      const infoResult = await familyHealthService.getEmergencyInfo(athleteId);
      if (!infoResult.success) {
        return infoResult;
      }

      let expiryAt: string | undefined;
      if (granted) {
        const expiryDate = new Date();
        expiryDate.setDate(1);
        expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
        expiryAt = expiryDate.toISOString();
      }

      const consents = infoResult.data.consents.map((consent) =>
        consent.type === type
          ? {
              ...consent,
              granted,
              grantedBy,
              grantedAt: granted ? new Date().toISOString() : undefined,
              expiryAt,
            }
          : consent,
      );

      return familyHealthService.updateConsents(athleteId, consents);
    }

    try {
      const info = await this.getEmergencyInfoValue(athleteId);

      // Calculate expiry date (default 12 months from now)
      let expiryAt: string | undefined;
      if (granted) {
        const expiryDate = new Date();
        expiryDate.setDate(1); // Avoid month-end overflow
        expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
        expiryAt = expiryDate.toISOString();
      }

      const consents = info.consents.map((c) =>
        c.type === type
          ? {
              ...c,
              granted,
              grantedBy,
              grantedAt: granted ? new Date().toISOString() : undefined,
              expiryAt,
            }
          : c,
      );

      return ok(await this.updateEmergencyInfoValue(athleteId, { consents }));
    } catch (error) {
      logger.error('Failed to update consent', { athleteId, type, error });
      return err(storageError('Failed to update consent'));
    }
  }

  /**
   * Get primary emergency contact
   */
  async getPrimaryContact(
    athleteId: string,
  ): Promise<Result<EmergencyContact | null, ServiceError>> {
    try {
      const infoResult = await this.getEmergencyInfo(athleteId);
      if (!infoResult.success) {
        return err(infoResult.error);
      }
      const info = infoResult.data;
      return ok(info.contacts.find((c) => c.isPrimary) ?? info.contacts[0] ?? null);
    } catch (error) {
      logger.error('Failed to get primary contact', { athleteId, error });
      return err(storageError('Failed to load primary contact'));
    }
  }

  /**
   * Check if athlete has any allergies or medical conditions
   */
  async hasAlerts(athleteId: string): Promise<Result<boolean, ServiceError>> {
    try {
      const infoResult = await this.getEmergencyInfo(athleteId);
      if (!infoResult.success) {
        return err(infoResult.error);
      }
      const info = infoResult.data;
      return ok(
        info.medical.allergies.length > 0 ||
          info.medical.conditions.length > 0 ||
          info.medical.medications.length > 0,
      );
    } catch (error) {
      logger.error('Failed to compute alerts', { athleteId, error });
      return err(storageError('Failed to compute medical alerts'));
    }
  }

  /**
   * Get consent status for a specific type
   */
  async getConsent(
    athleteId: string,
    type: ConsentType,
  ): Promise<Result<Consent | null, ServiceError>> {
    try {
      const infoResult = await this.getEmergencyInfo(athleteId);
      if (!infoResult.success) {
        return err(infoResult.error);
      }
      const info = infoResult.data;
      return ok(info.consents.find((c) => c.type === type) ?? null);
    } catch (error) {
      logger.error('Failed to get consent', { athleteId, type, error });
      return err(storageError('Failed to load consent'));
    }
  }

  /**
   * Check if emergency info is complete (has at least one contact and emergency treatment consent)
   */
  async isComplete(athleteId: string): Promise<Result<boolean, ServiceError>> {
    try {
      const infoResult = await this.getEmergencyInfo(athleteId);
      if (!infoResult.success) {
        return err(infoResult.error);
      }
      const info = infoResult.data;
      const hasContact = info.contacts.length > 0;
      const hasEmergencyConsent = info.consents.find(
        (c) => c.type === 'EMERGENCY_TREATMENT',
      )?.granted;
      return ok(hasContact && Boolean(hasEmergencyConsent));
    } catch (error) {
      logger.error('Failed to check emergency completeness', { athleteId, error });
      return err(storageError('Failed to check emergency info completeness'));
    }
  }

  /**
   * Get completion percentage for emergency info
   */
  async getCompletionPercentage(athleteId: string): Promise<Result<number, ServiceError>> {
    try {
      const infoResult = await this.getEmergencyInfo(athleteId);
      if (!infoResult.success) {
        return err(infoResult.error);
      }
      const info = infoResult.data;
      let completed = 0;
      const total = 4; // contacts, medical, consents (emergency treatment), doctor info

      if (info.contacts.length > 0) completed++;
      if (info.consents.find((c) => c.type === 'EMERGENCY_TREATMENT')?.granted) completed++;
      if (info.medical.doctorName || info.medical.doctorPhone) completed++;
      if (
        info.medical.allergies.length > 0 ||
        info.medical.conditions.length > 0 ||
        info.medical.notes
      ) {
        completed++;
      }

      return ok(Math.round((completed / total) * 100));
    } catch (error) {
      logger.error('Failed to compute emergency completion', { athleteId, error });
      return err(storageError('Failed to compute emergency completion'));
    }
  }

  /**
   * Format allergies for display
   */
  formatAllergies(allergies: string[]): string {
    if (allergies.length === 0) return 'None';
    return allergies.join(', ');
  }

  /**
   * Format conditions for display
   */
  formatConditions(conditions: string[]): string {
    if (conditions.length === 0) return 'None';
    return conditions.join(', ');
  }

  /**
   * Get severity level for medical alerts
   */
  getMedicalAlertSeverity(medical: MedicalInfo): 'none' | 'low' | 'medium' | 'high' {
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
  async getAthleteEmergency(
    athleteId: string,
    athleteName?: string,
  ): Promise<Result<AthleteEmergencyQuickView, ServiceError>> {
    try {
      let isCached = false;
      let info: EmergencyInfo;
      let resolvedName = athleteName || 'Unknown Athlete';

      const emergencyInfoResult = await this.getEmergencyInfo(athleteId);
      if (emergencyInfoResult.success) {
        info = emergencyInfoResult.data;
        // Cache for offline access
        await this.cacheEmergencyInfo(athleteId, info, resolvedName);
      } else {
        // Try to get from cache if loading fails
        const cached = await this.getCachedEmergencyInfo(athleteId);
        if (cached) {
          info = cached.data;
          resolvedName = cached.athleteName || resolvedName;
          isCached = true;
        } else {
          // Return empty data if nothing available
          info = createDefaultEmergencyInfo(athleteId);
        }
      }

      const primaryContact = info.contacts.find((c) => c.isPrimary) ?? info.contacts[0] ?? null;
      const alertLevel = this.getMedicalAlertSeverity(info.medical);
      const hasAlerts = alertLevel !== 'none';
      const emergencyTreatmentConsent =
        info.consents.find((c) => c.type === 'EMERGENCY_TREATMENT')?.granted ?? false;

      return ok({
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
      });
    } catch (error) {
      logger.error('Failed to get athlete emergency info', { athleteId, error });
      return err(storageError('Failed to load athlete emergency information'));
    }
  }

  /**
   * Get aggregated safety info for all attendees in a session
   */
  async getSessionSafetyInfo(
    sessionId: string,
    attendees: { athleteId: string; athleteName: string }[],
  ): Promise<Result<SessionSafetyInfo, ServiceError>> {
    try {
      const athletes: AthleteEmergencyQuickView[] = [];
      const allAllergies = new Set<string>();
      const allConditions = new Set<string>();
      const missingEmergencyInfo: string[] = [];
      let athletesWithAlerts = 0;
      let highAlertCount = 0;

      const emergencyDataResults = await Promise.all(
        attendees.map(async (attendee) => ({
          attendee,
          result: await this.getAthleteEmergency(attendee.athleteId, attendee.athleteName),
        })),
      );
      const failedEmergencyDataResult = emergencyDataResults.find((entry) => !entry.result.success);
      if (failedEmergencyDataResult && !failedEmergencyDataResult.result.success) {
        return err(failedEmergencyDataResult.result.error);
      }

      for (const { attendee, result } of emergencyDataResults) {
        if (!result.success) continue;
        const emergencyData = result.data;
        athletes.push(emergencyData);

        // Aggregate allergies and conditions
        emergencyData.allergies.forEach((a) => allAllergies.add(a));
        emergencyData.conditions.forEach((c) => allConditions.add(c));

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

      return ok({
        sessionId,
        totalAthletes: attendees.length,
        athletesWithAlerts,
        highAlertCount,
        athletes,
        allAllergies: Array.from(allAllergies).sort(),
        allConditions: Array.from(allConditions).sort(),
        missingEmergencyInfo,
      });
    } catch (error) {
      logger.error('Failed to get session safety info', { sessionId, error });
      return err(storageError('Failed to load session safety information'));
    }
  }

  /**
   * Format an emergency contact for display
   */
  formatEmergencyContact(contact: EmergencyContact): string {
    const parts = [contact.name];
    if (contact.relationship) {
      parts.push(`(${contact.relationship})`);
    }
    return parts.join(' ');
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phone: string): string {
    // Simple formatting - just return as-is for now
    // Could be enhanced to format based on locale
    return phone;
  }

  /**
   * Get a formatted summary of medical alerts
   */
  getAlertSummary(info: AthleteEmergencyQuickView): string {
    const parts: string[] = [];

    if (info.allergies.length > 0) {
      parts.push(`${info.allergies.length} allerg${info.allergies.length === 1 ? 'y' : 'ies'}`);
    }
    if (info.conditions.length > 0) {
      parts.push(`${info.conditions.length} condition${info.conditions.length === 1 ? '' : 's'}`);
    }
    if (info.medications.length > 0) {
      parts.push(
        `${info.medications.length} medication${info.medications.length === 1 ? '' : 's'}`,
      );
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
  getAlertLevelColor(level: 'none' | 'low' | 'medium' | 'high'): string {
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
  getAlertLevelLabel(level: 'none' | 'low' | 'medium' | 'high'): string {
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
  private async cacheEmergencyInfo(
    athleteId: string,
    info: EmergencyInfo,
    athleteName?: string,
  ): Promise<void> {
    emergencyCache = {
      ...emergencyCache,
      [athleteId]: {
        data: cloneEmergencyInfo(info),
        cachedAt: Date.now(),
        athleteName,
      },
    };
  }

  /**
   * Get cached emergency info
   */
  private async getCachedEmergencyInfo(athleteId: string): Promise<CachedEmergencyInfo | null> {
    const cached = emergencyCache[athleteId];

    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
      return null;
    }

    return {
      ...cached,
      data: cloneEmergencyInfo(cached.data),
    };
  }

  /**
   * Pre-cache emergency info for all athletes in an upcoming session
   * Call this before a session starts to ensure offline access
   */
  async preCacheSessionEmergencyInfo(
    attendees: { athleteId: string; athleteName: string }[],
  ): Promise<Result<void, ServiceError>> {
    try {
      await Promise.all(
        attendees.map(async (attendee) => {
          const infoResult = await this.getEmergencyInfo(attendee.athleteId);
          if (!infoResult.success) {
            logger.warn('Failed to pre-cache emergency info', {
              athleteId: attendee.athleteId,
              error: infoResult.error.message,
            });
            return;
          }
          await this.cacheEmergencyInfo(attendee.athleteId, infoResult.data, attendee.athleteName);
        }),
      );
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to pre-cache session emergency info', error);
      return err(storageError('Failed to pre-cache emergency information'));
    }
  }

  /**
   * Clear cached emergency info
   */
  async clearCache(): Promise<Result<void, ServiceError>> {
    try {
      emergencyCache = {};
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to clear emergency cache', error);
      return err(storageError('Failed to clear emergency cache'));
    }
  }

  async removeEmergencyInfo(athleteId: string): Promise<Result<void, ServiceError>> {
    if (!apiClient.isMockMode) {
      return err(
        validationError(
          'Removing emergency info requires backend family health deletion authority in API mode.',
        ),
      );
    }

    try {
      if (athleteId in mockEmergencyInfo) {
        const nextInfo = { ...mockEmergencyInfo };
        delete nextInfo[athleteId];
        mockEmergencyInfo = nextInfo;
      }
      const nextCache = { ...emergencyCache };
      delete nextCache[athleteId];
      emergencyCache = nextCache;
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to remove emergency info', { athleteId, error });
      return err(storageError('Failed to remove emergency info'));
    }
  }

  /**
   * Reset to mock data (for testing)
   */
  async resetToMockData(): Promise<Result<void, ServiceError>> {
    try {
      mockEmergencyInfo = cloneEmergencyInfoStore(MOCK_EMERGENCY_INFO);
      const clearResult = await this.clearCache();
      if (!clearResult.success) return err(clearResult.error);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to reset safety data to mock', error);
      return err(storageError('Failed to reset safety data'));
    }
  }
}

export const safetyService = new SafetyService();
