import {
  EmergencyInfo,
  EmergencyContact,
  MedicalInfo,
  Consent,
  ConsentType,
} from '@/constants/types';
import { storageService } from './storage-service';

const STORAGE_KEY = 'clubroom.emergency_info';

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

// Mock emergency info data for demo purposes
const MOCK_EMERGENCY_INFO: Record<string, EmergencyInfo> = {
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
  async getEmergencyInfo(athleteId: string): Promise<EmergencyInfo> {
    const allInfo = await storageService.getItem<Record<string, EmergencyInfo>>(
      STORAGE_KEY,
      MOCK_EMERGENCY_INFO
    );
    return allInfo[athleteId] ?? createDefaultEmergencyInfo(athleteId);
  }

  /**
   * Update emergency info for an athlete
   */
  async updateEmergencyInfo(
    athleteId: string,
    update: Partial<Omit<EmergencyInfo, 'athleteId' | 'updatedAt'>>
  ): Promise<EmergencyInfo> {
    const allInfo = await storageService.getItem<Record<string, EmergencyInfo>>(
      STORAGE_KEY,
      MOCK_EMERGENCY_INFO
    );

    const currentInfo = allInfo[athleteId] ?? createDefaultEmergencyInfo(athleteId);
    const updatedInfo: EmergencyInfo = {
      ...currentInfo,
      ...update,
      athleteId,
      updatedAt: new Date().toISOString(),
    };

    allInfo[athleteId] = updatedInfo;
    await storageService.setItem(STORAGE_KEY, allInfo);

    return updatedInfo;
  }

  /**
   * Add an emergency contact
   */
  async addContact(athleteId: string, contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyInfo> {
    const info = await this.getEmergencyInfo(athleteId);
    const newContact: EmergencyContact = {
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
  async updateContact(
    athleteId: string,
    contactId: string,
    update: Partial<Omit<EmergencyContact, 'id'>>
  ): Promise<EmergencyInfo> {
    const info = await this.getEmergencyInfo(athleteId);

    let contacts = info.contacts.map(c =>
      c.id === contactId ? { ...c, ...update } : c
    );

    // If updating to primary, unset other primaries
    if (update.isPrimary) {
      contacts = contacts.map(c =>
        c.id === contactId ? c : { ...c, isPrimary: false }
      );
    }

    return this.updateEmergencyInfo(athleteId, { contacts });
  }

  /**
   * Remove an emergency contact
   */
  async removeContact(athleteId: string, contactId: string): Promise<EmergencyInfo> {
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
  async updateMedicalInfo(
    athleteId: string,
    medical: Partial<MedicalInfo>
  ): Promise<EmergencyInfo> {
    const info = await this.getEmergencyInfo(athleteId);
    return this.updateEmergencyInfo(athleteId, {
      medical: { ...info.medical, ...medical },
    });
  }

  /**
   * Update a consent
   */
  async updateConsent(
    athleteId: string,
    type: ConsentType,
    granted: boolean,
    grantedBy: string
  ): Promise<EmergencyInfo> {
    const info = await this.getEmergencyInfo(athleteId);
    const consents = info.consents.map(c =>
      c.type === type
        ? {
            ...c,
            granted,
            grantedBy,
            grantedAt: granted ? new Date().toISOString() : undefined,
          }
        : c
    );

    return this.updateEmergencyInfo(athleteId, { consents });
  }

  /**
   * Get primary emergency contact
   */
  async getPrimaryContact(athleteId: string): Promise<EmergencyContact | null> {
    const info = await this.getEmergencyInfo(athleteId);
    return info.contacts.find(c => c.isPrimary) ?? info.contacts[0] ?? null;
  }

  /**
   * Check if athlete has any allergies or medical conditions
   */
  async hasAlerts(athleteId: string): Promise<boolean> {
    const info = await this.getEmergencyInfo(athleteId);
    return (
      info.medical.allergies.length > 0 ||
      info.medical.conditions.length > 0 ||
      info.medical.medications.length > 0
    );
  }

  /**
   * Get consent status for a specific type
   */
  async getConsent(athleteId: string, type: ConsentType): Promise<Consent | null> {
    const info = await this.getEmergencyInfo(athleteId);
    return info.consents.find(c => c.type === type) ?? null;
  }

  /**
   * Check if emergency info is complete (has at least one contact and emergency treatment consent)
   */
  async isComplete(athleteId: string): Promise<boolean> {
    const info = await this.getEmergencyInfo(athleteId);
    const hasContact = info.contacts.length > 0;
    const hasEmergencyConsent = info.consents.find(
      c => c.type === 'EMERGENCY_TREATMENT'
    )?.granted;
    return hasContact && Boolean(hasEmergencyConsent);
  }

  /**
   * Get completion percentage for emergency info
   */
  async getCompletionPercentage(athleteId: string): Promise<number> {
    const info = await this.getEmergencyInfo(athleteId);
    let completed = 0;
    const total = 4; // contacts, medical, consents (emergency treatment), doctor info

    if (info.contacts.length > 0) completed++;
    if (info.consents.find(c => c.type === 'EMERGENCY_TREATMENT')?.granted) completed++;
    if (info.medical.doctorName || info.medical.doctorPhone) completed++;
    if (
      info.medical.allergies.length > 0 ||
      info.medical.conditions.length > 0 ||
      info.medical.notes
    ) {
      completed++;
    }

    return Math.round((completed / total) * 100);
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
}

export const safetyService = new SafetyService();
