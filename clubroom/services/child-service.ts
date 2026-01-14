/**
 * Child Service
 *
 * Manages child profiles for parents/guardians including:
 * - Creating and updating child profiles
 * - Managing disabilities, special needs, and medical info
 * - Photo management
 * - Emergency contacts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ChildService');

const STORAGE_KEY = 'children_profiles';
const USE_MOCK = true;

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
  coachNotes?: string; // Notes for coaches on how to accommodate
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

export const SPECIAL_NEEDS_CATEGORIES: Array<{ id: SpecialNeed['category']; label: string; examples: string[] }> = [
  {
    id: 'PHYSICAL',
    label: 'Physical',
    examples: ['Mobility support', 'Wheelchair access', 'Limited stamina']
  },
  {
    id: 'LEARNING',
    label: 'Learning',
    examples: ['Extra time needed', 'Visual instructions preferred', 'Step-by-step breakdown']
  },
  {
    id: 'SENSORY',
    label: 'Sensory',
    examples: ['Noise sensitivity', 'Light sensitivity', 'Tactile sensitivity']
  },
  {
    id: 'BEHAVIORAL',
    label: 'Behavioral',
    examples: ['Needs structured environment', 'Requires frequent breaks', 'Benefits from routine']
  },
  {
    id: 'MEDICAL',
    label: 'Medical',
    examples: ['Requires medication during sessions', 'Has specific dietary needs', 'Needs monitoring']
  },
  {
    id: 'OTHER',
    label: 'Other',
    examples: []
  },
];

// ============================================================================
// MOCK DATA
// ============================================================================

let childrenCache: ChildProfile[] = [
  {
    id: 'child-1',
    parentId: 'parent-1',
    firstName: 'Jake',
    lastName: 'Thompson',
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
      }
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
      }
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
    parentId: 'parent-1',
    firstName: 'Emma',
    lastName: 'Thompson',
    dateOfBirth: '2014-07-22',
    gender: 'FEMALE',
    relationship: 'DAUGHTER',
    photoUrl: undefined,
    disabilities: [],
    specialNeeds: [],
    hasSpecialNeeds: false,
    allergies: [],
    medicalConditions: [],
    medications: [],
    emergencyContactName: 'Sarah Thompson',
    emergencyContactPhone: '+44 7700 900123',
    emergencyContactRelation: 'Mother',
    photoConsent: true,
    videoConsent: true,
    socialMediaConsent: true,
    emergencyTreatmentConsent: true,
    createdAt: '2023-03-20T10:00:00Z',
    updatedAt: '2023-03-20T10:00:00Z',
  },
];

// ============================================================================
// STORAGE HELPERS
// ============================================================================

async function loadFromStorage(): Promise<ChildProfile[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error('Failed to load from storage', error);
  }
  return childrenCache;
}

async function saveToStorage(data: ChildProfile[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    childrenCache = data;
  } catch (error) {
    logger.error('Failed to save to storage', error);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return `child-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      return childrenCache.filter(c => c.parentId === parentId);
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
      return childrenCache.find(c => c.id === childId) || null;
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
  async updateChild(childId: string, updates: Partial<CreateChildInput>): Promise<ChildProfile> {
    if (USE_MOCK) {
      childrenCache = await loadFromStorage();
      const index = childrenCache.findIndex(c => c.id === childId);
      if (index === -1) {
        throw new Error('Child not found');
      }

      childrenCache[index] = {
        ...childrenCache[index],
        ...updates,
        hasSpecialNeeds: (updates.disabilities?.length || childrenCache[index].disabilities.length) > 0 ||
                        (updates.specialNeeds?.length || childrenCache[index].specialNeeds.length) > 0,
        updatedAt: new Date().toISOString(),
      };

      await saveToStorage(childrenCache);
      return childrenCache[index];
    }

    const response = await fetch(`/api/children/${childId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.json();
  },

  /**
   * Delete a child profile
   */
  async deleteChild(childId: string): Promise<void> {
    if (USE_MOCK) {
      childrenCache = await loadFromStorage();
      childrenCache = childrenCache.filter(c => c.id !== childId);
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
  async addDisability(childId: string, disability: Omit<Disability, 'id'>): Promise<ChildProfile> {
    const child = await this.getChild(childId);
    if (!child) throw new Error('Child not found');

    const newDisability: Disability = {
      ...disability,
      id: `dis-${Date.now()}`,
    };

    return this.updateChild(childId, {
      disabilities: [...child.disabilities, newDisability],
    });
  },

  /**
   * Remove a disability from a child
   */
  async removeDisability(childId: string, disabilityId: string): Promise<ChildProfile> {
    const child = await this.getChild(childId);
    if (!child) throw new Error('Child not found');

    return this.updateChild(childId, {
      disabilities: child.disabilities.filter(d => d.id !== disabilityId),
    });
  },

  /**
   * Add a special need to a child
   */
  async addSpecialNeed(childId: string, specialNeed: Omit<SpecialNeed, 'id'>): Promise<ChildProfile> {
    const child = await this.getChild(childId);
    if (!child) throw new Error('Child not found');

    const newSpecialNeed: SpecialNeed = {
      ...specialNeed,
      id: `sn-${Date.now()}`,
    };

    return this.updateChild(childId, {
      specialNeeds: [...child.specialNeeds, newSpecialNeed],
    });
  },

  /**
   * Remove a special need from a child
   */
  async removeSpecialNeed(childId: string, specialNeedId: string): Promise<ChildProfile> {
    const child = await this.getChild(childId);
    if (!child) throw new Error('Child not found');

    return this.updateChild(childId, {
      specialNeeds: child.specialNeeds.filter(sn => sn.id !== specialNeedId),
    });
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
    return children.filter(c => c.hasSpecialNeeds);
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
    child.specialNeeds.forEach(sn => {
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
      disabilities: child.disabilities.map(d => d.type),
    };
  },
};
