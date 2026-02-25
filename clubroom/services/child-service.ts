/**
 * Child Service
 *
 * Manages child profiles for parents/guardians including:
 * - Creating and updating child profiles
 * - Managing disabilities, special needs, and medical info
 * - Photo management
 * - Emergency contacts
 */

import { apiClient } from './api-client';
import { api } from '@/constants/config';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, notFound, storageError } from '@/types/result';
import { emitTyped, ServiceEvents } from './event-bus';
import type { PositionRole } from '@/types/progress-types';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('ChildService');

const USE_MOCK = api.useMock;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type Relationship = 'SON' | 'DAUGHTER' | 'WARD' | 'GRANDCHILD' | 'OTHER';

export interface SpecialNeed {
  id: string;
  category: 'PHYSICAL' | 'LEARNING' | 'SENSORY' | 'BEHAVIORAL' | 'MEDICAL' | 'OTHER';
  name: string;
  description?: string;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE';
  accommodationsNeeded?: string[];
  parentHints?: string; // Parent's hints for coaches on how to accommodate
}

export interface Disability {
  id: string;
  type: string; // e.g., "Autism", "ADHD", "Dyslexia", "Hearing Impairment"
  diagnosisDate?: string;
  description?: string;
  supportRequired?: string;
  communicationPreferences?: string[];
  triggers?: string[]; // Things to avoid
  calmingStrategies?: string[]; // Things that help
}

export interface ChildProfile {
  id: string;
  parentId: string;

  // Basic info
  firstName: string;
  lastName: string;
  nickname?: string;
  dateOfBirth?: string; // ISO date (optional)
  gender: Gender;
  relationship: Relationship;
  primaryPosition?: PositionRole | null;

  // Photo
  photoUrl?: string;

  // Special needs & disabilities (shown to coaches)
  disabilities: Disability[];
  specialNeeds: SpecialNeed[];
  hasSpecialNeeds: boolean; // Quick flag for UI

  // Medical basics (quick reference - detailed in medical page)
  allergies: string[];
  medicalConditions: string[];
  medications: string[];

  // Communication
  communicationNotes?: string; // How to best communicate with this child
  behavioralNotes?: string; // Any behavioral considerations

  // Emergency
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  secondaryEmergencyName?: string;
  secondaryEmergencyPhone?: string;

  // Consents
  photoConsent: boolean;
  videoConsent: boolean;
  socialMediaConsent: boolean;
  emergencyTreatmentConsent: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface CreateChildInput {
  firstName: string;
  lastName: string;
  nickname?: string;
  dateOfBirth?: string;
  gender: Gender;
  relationship: Relationship;
  primaryPosition?: PositionRole | null;
  photoUrl?: string;
  disabilities?: Disability[];
  specialNeeds?: SpecialNeed[];
  allergies?: string[];
  medicalConditions?: string[];
  medications?: string[];
  communicationNotes?: string;
  behavioralNotes?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  secondaryEmergencyName?: string;
  secondaryEmergencyPhone?: string;
  photoConsent?: boolean;
  videoConsent?: boolean;
  socialMediaConsent?: boolean;
  emergencyTreatmentConsent?: boolean;
}

// ============================================================================
// PREDEFINED OPTIONS
// ============================================================================

export const DISABILITY_TYPES = [
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

export const SPECIAL_NEEDS_CATEGORIES: {
  id: SpecialNeed['category'];
  label: string;
  examples: string[];
}[] = [
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

let childrenCache: ChildProfile[] = [
  {
    id: 'user1',
    parentId: 'user4',
    firstName: 'Tom',
    lastName: 'Barton',
    nickname: 'Tommy',
    dateOfBirth: '2008-05-12',
    gender: 'MALE',
    relationship: 'SON',
    primaryPosition: 'MID',
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
        parentHints: 'Give 5-minute warning before transitions',
      },
    ],
    hasSpecialNeeds: true,
    allergies: ['Peanuts'],
    medicalConditions: ['ADHD'],
    medications: ['Methylphenidate (morning only)'],
    communicationNotes: 'Responds well to positive reinforcement. Prefers direct communication.',
    behavioralNotes:
      'May need movement breaks every 20-30 minutes. Gets overwhelmed in large groups.',
    emergencyContactName: 'Chris Barton',
    emergencyContactPhone: '+44 7700 900123',
    emergencyContactRelation: 'Father',
    secondaryEmergencyName: 'Mary Barton',
    secondaryEmergencyPhone: '+44 7700 900124',
    photoConsent: true,
    videoConsent: true,
    socialMediaConsent: false,
    emergencyTreatmentConsent: true,
    createdAt: '2023-01-15T10:00:00Z',
    updatedAt: '2024-01-10T14:30:00Z',
  },
  {
    id: 'user2',
    parentId: 'user4',
    firstName: 'Emma',
    lastName: 'Barton',
    dateOfBirth: '2009-08-20',
    gender: 'FEMALE',
    relationship: 'DAUGHTER',
    primaryPosition: 'ATT',
    photoUrl: undefined,
    disabilities: [],
    specialNeeds: [],
    hasSpecialNeeds: false,
    allergies: ['Dairy'],
    medicalConditions: [],
    medications: [],
    communicationNotes: 'Very shy at first but warms up quickly. Loves praise and stickers.',
    behavioralNotes: 'May cling to parent at drop-off. Give her a moment to adjust.',
    emergencyContactName: 'Chris Barton',
    emergencyContactPhone: '+44 7700 900123',
    emergencyContactRelation: 'Father',
    secondaryEmergencyName: 'Mary Barton',
    secondaryEmergencyPhone: '+44 7700 900124',
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

async function loadFromStorage(): Promise<ChildProfile[]> {
  try {
    const stored = await apiClient.get<ChildProfile[] | null>(STORAGE_KEYS.CHILDREN_PROFILES, null);
    if (stored) {
      return stored;
    }
  } catch (error) {
    logger.error('Failed to load from storage', error);
  }
  return childrenCache;
}

async function saveToStorage(data: ChildProfile[]): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.CHILDREN_PROFILES, data);
    childrenCache = data;
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save to storage', error);
    return err(storageError(`Failed to save children profiles: ${String(error)}`));
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return apiClient.generateId('child');
}

function calculateAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
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

export const childService = {
  /**
   * Get all children for a parent
   */
  async getChildren(parentId: string): Promise<ChildProfile[]> {
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
  async getChild(childId: string): Promise<ChildProfile | null> {
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
  async createChild(parentId: string, input: CreateChildInput): Promise<ChildProfile> {
    const now = new Date().toISOString();
    const newChild: ChildProfile = {
      id: generateId(),
      parentId,
      firstName: input.firstName,
      lastName: input.lastName,
      nickname: input.nickname,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      relationship: input.relationship,
      primaryPosition: input.primaryPosition,
      photoUrl: input.photoUrl,
      disabilities: input.disabilities || [],
      specialNeeds: input.specialNeeds || [],
      hasSpecialNeeds:
        (input.disabilities?.length || 0) > 0 || (input.specialNeeds?.length || 0) > 0,
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
      emitTyped(ServiceEvents.CHILD_PROFILES_UPDATED, { parentId, action: 'created', childId: newChild.id });
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
  async updateChild(
    childId: string,
    updates: Partial<CreateChildInput>,
  ): Promise<Result<ChildProfile, ServiceError>> {
    if (USE_MOCK) {
      childrenCache = await loadFromStorage();
      const index = childrenCache.findIndex((c) => c.id === childId);
      if (index === -1) {
        return err(notFound('Child', childId));
      }

      childrenCache[index] = {
        ...childrenCache[index],
        ...updates,
        hasSpecialNeeds:
          (updates.disabilities?.length || childrenCache[index].disabilities.length) > 0 ||
          (updates.specialNeeds?.length || childrenCache[index].specialNeeds.length) > 0,
        updatedAt: new Date().toISOString(),
      };

      await saveToStorage(childrenCache);

      const updatedFields = Object.keys(updates);
      emitTyped(ServiceEvents.CHILD_PROFILES_UPDATED, { parentId: childrenCache[index].parentId, action: 'updated', childId });
      emitTyped(ServiceEvents.CHILD_PROFILE_UPDATED, {
        childId,
        parentId: childrenCache[index].parentId,
        updatedFields,
        timestamp: childrenCache[index].updatedAt,
      });

      // Emit specific event for critical medical/emergency fields
      const criticalFields = ['allergies', 'medicalConditions', 'medications', 'emergencyContactName', 'emergencyContactPhone', 'secondaryEmergencyName', 'secondaryEmergencyPhone'];
      const criticalChanged = updatedFields.filter((f) => criticalFields.includes(f));
      if (criticalChanged.length > 0) {
        emitTyped(ServiceEvents.CHILD_MEDICAL_INFO_UPDATED, {
          childId,
          updatedFields: criticalChanged,
          timestamp: childrenCache[index].updatedAt,
        });
        logger.warn('Critical medical/emergency information updated', { childId, fields: criticalChanged });
      }

      return ok(childrenCache[index]);
    }

    const response = await fetch(`/api/children/${childId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return ok(await response.json());
  },

  /**
   * Delete a child profile
   */
  async deleteChild(childId: string): Promise<void> {
    if (USE_MOCK) {
      childrenCache = await loadFromStorage();
      const deletedChild = childrenCache.find((c) => c.id === childId);
      childrenCache = childrenCache.filter((c) => c.id !== childId);
      await saveToStorage(childrenCache);
      if (deletedChild) {
        emitTyped(ServiceEvents.CHILD_PROFILES_UPDATED, { parentId: deletedChild.parentId, action: 'deleted', childId });
      }
      return;
    }

    await fetch(`/api/children/${childId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Add a disability to a child
   */
  async addDisability(
    childId: string,
    disability: Omit<Disability, 'id'>,
  ): Promise<Result<ChildProfile, ServiceError>> {
    const child = await this.getChild(childId);
    if (!child) return err(notFound('Child', childId));

    const newDisability: Disability = {
      ...disability,
      id: apiClient.generateId('dis'),
    };

    const result = await this.updateChild(childId, {
      disabilities: [...child.disabilities, newDisability],
    });
    if (result.success) {
      emitTyped(ServiceEvents.CHILD_SEN_UPDATED, { childId, parentId: child.parentId, section: 'disabilities' });
    }
    return result;
  },

  /**
   * Remove a disability from a child
   */
  async removeDisability(
    childId: string,
    disabilityId: string,
  ): Promise<Result<ChildProfile, ServiceError>> {
    const child = await this.getChild(childId);
    if (!child) return err(notFound('Child', childId));

    const result = await this.updateChild(childId, {
      disabilities: child.disabilities.filter((d) => d.id !== disabilityId),
    });
    if (result.success) {
      emitTyped(ServiceEvents.CHILD_SEN_UPDATED, { childId, parentId: child.parentId, section: 'disabilities' });
    }
    return result;
  },

  /**
   * Add a special need to a child
   */
  async addSpecialNeed(
    childId: string,
    specialNeed: Omit<SpecialNeed, 'id'>,
  ): Promise<Result<ChildProfile, ServiceError>> {
    const child = await this.getChild(childId);
    if (!child) return err(notFound('Child', childId));

    const newSpecialNeed: SpecialNeed = {
      ...specialNeed,
      id: apiClient.generateId('sn'),
    };

    const result = await this.updateChild(childId, {
      specialNeeds: [...child.specialNeeds, newSpecialNeed],
    });
    if (result.success) {
      emitTyped(ServiceEvents.CHILD_SEN_UPDATED, { childId, parentId: child.parentId, section: 'specialNeeds' });
    }
    return result;
  },

  /**
   * Remove a special need from a child
   */
  async removeSpecialNeed(
    childId: string,
    specialNeedId: string,
  ): Promise<Result<ChildProfile, ServiceError>> {
    const child = await this.getChild(childId);
    if (!child) return err(notFound('Child', childId));

    const result = await this.updateChild(childId, {
      specialNeeds: child.specialNeeds.filter((sn) => sn.id !== specialNeedId),
    });
    if (result.success) {
      emitTyped(ServiceEvents.CHILD_SEN_UPDATED, { childId, parentId: child.parentId, section: 'specialNeeds' });
    }
    return result;
  },

  /**
   * Update a specific disability on a child
   */
  async updateDisability(
    childId: string,
    disabilityId: string,
    updates: Partial<Omit<Disability, 'id'>>,
  ): Promise<Result<ChildProfile, ServiceError>> {
    const child = await this.getChild(childId);
    if (!child) return err(notFound('Child', childId));

    const index = child.disabilities.findIndex((d) => d.id === disabilityId);
    if (index === -1) return err(notFound('Disability', disabilityId));

    const updatedDisabilities = [...child.disabilities];
    updatedDisabilities[index] = { ...updatedDisabilities[index], ...updates };

    const result = await this.updateChild(childId, { disabilities: updatedDisabilities });
    if (result.success) {
      emitTyped(ServiceEvents.CHILD_SEN_UPDATED, {
        childId,
        parentId: child.parentId,
        section: 'disabilities',
      });
    }
    return result;
  },

  /**
   * Update a specific special need on a child
   */
  async updateSpecialNeed(
    childId: string,
    specialNeedId: string,
    updates: Partial<Omit<SpecialNeed, 'id'>>,
  ): Promise<Result<ChildProfile, ServiceError>> {
    const child = await this.getChild(childId);
    if (!child) return err(notFound('Child', childId));

    const index = child.specialNeeds.findIndex((sn) => sn.id === specialNeedId);
    if (index === -1) return err(notFound('SpecialNeed', specialNeedId));

    const updatedNeeds = [...child.specialNeeds];
    updatedNeeds[index] = { ...updatedNeeds[index], ...updates };

    const result = await this.updateChild(childId, { specialNeeds: updatedNeeds });
    if (result.success) {
      emitTyped(ServiceEvents.CHILD_SEN_UPDATED, {
        childId,
        parentId: child.parentId,
        section: 'specialNeeds',
      });
    }
    return result;
  },

  /**
   * Get child age from date of birth
   */
  getAge(dateOfBirth?: string): number | null {
    return calculateAge(dateOfBirth);
  },

  /**
   * Get children with special needs for a parent
   */
  async getChildrenWithSpecialNeeds(parentId: string): Promise<ChildProfile[]> {
    const children = await this.getChildren(parentId);
    return children.filter((c) => c.hasSpecialNeeds);
  },

  /**
   * Find a child by name (for coach athlete lookup)
   * This allows coaches to see special needs info for athletes
   */
  async getChildByName(firstName: string, lastName: string): Promise<ChildProfile | null> {
    if (USE_MOCK) {
      childrenCache = await loadFromStorage();
      return (
        childrenCache.find(
          (c) =>
            c.firstName.toLowerCase() === firstName.toLowerCase() &&
            c.lastName.toLowerCase() === lastName.toLowerCase(),
        ) || null
      );
    }

    const response = await fetch(
      `/api/children/by-name?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`,
    );
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Get summary of a child for coach display
   */
  getCoachSummary(child: ChildProfile): {
    name: string;
    age: number | null;
    hasSpecialNeeds: boolean;
    quickNotes: string[];
    allergies: string[];
    disabilities: string[];
  } {
    const quickNotes: string[] = [];

    if (child.communicationNotes) {
      quickNotes.push(child.communicationNotes);
    }
    if (child.behavioralNotes) {
      quickNotes.push(child.behavioralNotes);
    }
    child.specialNeeds.forEach((sn) => {
      if (sn.parentHints) {
        quickNotes.push(sn.parentHints);
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
  async getActiveChildId(): Promise<string | null> {
    try {
      return await apiClient.get<string | null>(STORAGE_KEYS.ACTIVE_CHILD_ID, null);
    } catch (error) {
      logger.error('get_active_child_failed', { error });
      return null;
    }
  },

  /**
   * Set the active child. Pass null to clear.
   */
  async setActiveChildId(childId: string | null, childName?: string): Promise<void> {
    try {
      if (childId) {
        await apiClient.set(STORAGE_KEYS.ACTIVE_CHILD_ID, childId);
      } else {
        await apiClient.remove(STORAGE_KEYS.ACTIVE_CHILD_ID);
      }
      emitTyped(ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED, { childId, childName });
      logger.info('active_child_set', { childId, childName });
    } catch (error) {
      logger.error('set_active_child_failed', { childId, error });
    }
  },
};
