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
import { safetyService } from './safety-service';
import { api } from '@/constants/config';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, notFound, storageError } from '@/types/result';
import { emitTyped, ServiceEvents } from './event-bus';
import type { PositionRole } from '@/types/progress-types';
import { normalizeLegacyMockDates } from '@/utils/mock-date-normalizer';
import type { User } from '@/constants/app-types';
import type {
  Consent,
  ConsentType,
  EmergencyContact,
  EmergencyInfo,
  MedicalInfo,
} from '@/constants/types';
import { accountIdsMatch } from '@/utils/account-id';

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

const CONSENT_TYPES: ConsentType[] = ['PHOTO', 'VIDEO', 'SOCIAL_MEDIA', 'EMERGENCY_TREATMENT'];

function createDefaultConsents(): Consent[] {
  return [
    { type: 'PHOTO', granted: true, grantedBy: 'Parent/Guardian' },
    { type: 'VIDEO', granted: true, grantedBy: 'Parent/Guardian' },
    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent/Guardian' },
  ];
}

function createClearedTrustSensitiveFields(): Pick<
  ChildProfile,
  | 'allergies'
  | 'medicalConditions'
  | 'medications'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'emergencyContactRelation'
  | 'secondaryEmergencyName'
  | 'secondaryEmergencyPhone'
  | 'photoConsent'
  | 'videoConsent'
  | 'socialMediaConsent'
  | 'emergencyTreatmentConsent'
> {
  return {
    allergies: [],
    medicalConditions: [],
    medications: [],
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    secondaryEmergencyName: undefined,
    secondaryEmergencyPhone: undefined,
    photoConsent: true,
    videoConsent: true,
    socialMediaConsent: false,
    emergencyTreatmentConsent: true,
  };
}

function sanitizeChildProfile(child: ChildProfile): ChildProfile {
  return {
    ...child,
    ...createClearedTrustSensitiveFields(),
  };
}

function createDefaultEmergencyInfo(athleteId: string): EmergencyInfo {
  return {
    athleteId,
    contacts: [],
    medical: {
      conditions: [],
      allergies: [],
      medications: [],
      restrictions: [],
    },
    consents: createDefaultConsents(),
    updatedAt: new Date().toISOString(),
  };
}

function hasLegacyTrustSensitiveData(child: ChildProfile): boolean {
  return (
    child.allergies.length > 0 ||
    child.medicalConditions.length > 0 ||
    child.medications.length > 0 ||
    child.emergencyContactName.trim().length > 0 ||
    child.emergencyContactPhone.trim().length > 0 ||
    child.emergencyContactRelation.trim().length > 0 ||
    (child.secondaryEmergencyName?.trim().length ?? 0) > 0 ||
    (child.secondaryEmergencyPhone?.trim().length ?? 0) > 0
  );
}

function buildMedicalRecord(input: Partial<CreateChildInput>, fallback: MedicalInfo): MedicalInfo {
  return {
    conditions:
      'medicalConditions' in input ? [...(input.medicalConditions ?? [])] : fallback.conditions,
    allergies: 'allergies' in input ? [...(input.allergies ?? [])] : fallback.allergies,
    medications: 'medications' in input ? [...(input.medications ?? [])] : fallback.medications,
    restrictions: fallback.restrictions,
    doctorName: fallback.doctorName,
    doctorPhone: fallback.doctorPhone,
    insuranceProvider: fallback.insuranceProvider,
    insuranceNumber: fallback.insuranceNumber,
    notes: fallback.notes,
  };
}

function buildConsentRecord(
  type: ConsentType,
  granted: boolean,
  existing: Consent | undefined,
): Consent {
  return {
    type,
    granted,
    grantedBy: granted ? existing?.grantedBy || 'Parent/Guardian' : '',
    grantedAt: granted
      ? existing?.granted === granted
        ? existing.grantedAt
        : new Date().toISOString()
      : undefined,
    expiryAt: existing?.expiryAt,
  };
}

function buildConsents(input: Partial<CreateChildInput>, fallback: Consent[]): Consent[] {
  const existingByType = new Map(fallback.map((consent) => [consent.type, consent]));

  const consentFlags: Record<ConsentType, boolean> = {
    PHOTO:
      'photoConsent' in input
        ? (input.photoConsent ?? true)
        : (existingByType.get('PHOTO')?.granted ?? true),
    VIDEO:
      'videoConsent' in input
        ? (input.videoConsent ?? true)
        : (existingByType.get('VIDEO')?.granted ?? true),
    SOCIAL_MEDIA:
      'socialMediaConsent' in input
        ? (input.socialMediaConsent ?? false)
        : (existingByType.get('SOCIAL_MEDIA')?.granted ?? false),
    EMERGENCY_TREATMENT:
      'emergencyTreatmentConsent' in input
        ? (input.emergencyTreatmentConsent ?? true)
        : (existingByType.get('EMERGENCY_TREATMENT')?.granted ?? true),
  };

  return CONSENT_TYPES.map((type) =>
    buildConsentRecord(type, consentFlags[type], existingByType.get(type)),
  );
}

function buildEmergencyContacts(
  input: Partial<CreateChildInput>,
  fallback: EmergencyContact[],
): EmergencyContact[] {
  const primaryExisting = fallback.find((contact) => contact.isPrimary) ?? fallback[0];
  const secondaryExisting = fallback.find((contact) => contact.id !== primaryExisting?.id);

  const primaryName =
    'emergencyContactName' in input
      ? (input.emergencyContactName?.trim() ?? '')
      : (primaryExisting?.name ?? '');
  const primaryPhone =
    'emergencyContactPhone' in input
      ? (input.emergencyContactPhone?.trim() ?? '')
      : (primaryExisting?.phone ?? '');
  const primaryRelationship =
    'emergencyContactRelation' in input
      ? (input.emergencyContactRelation?.trim() ?? '')
      : (primaryExisting?.relationship ?? '');

  const nextContacts: EmergencyContact[] = [];

  if (primaryName && primaryPhone && primaryRelationship) {
    nextContacts.push({
      id: primaryExisting?.id ?? `emc_primary_${Date.now()}`,
      name: primaryName,
      phone: primaryPhone,
      relationship: primaryRelationship,
      email: primaryExisting?.email,
      isPrimary: true,
      canPickup: primaryExisting?.canPickup ?? true,
    });
  }

  const secondaryTouched = 'secondaryEmergencyName' in input || 'secondaryEmergencyPhone' in input;

  if (secondaryTouched) {
    const secondaryName = input.secondaryEmergencyName?.trim() ?? '';
    const secondaryPhone = input.secondaryEmergencyPhone?.trim() ?? '';
    if (secondaryName && secondaryPhone) {
      nextContacts.push({
        id: secondaryExisting?.id ?? `emc_secondary_${Date.now()}`,
        name: secondaryName,
        phone: secondaryPhone,
        relationship: secondaryExisting?.relationship ?? 'Emergency contact',
        email: secondaryExisting?.email,
        isPrimary: false,
        canPickup: secondaryExisting?.canPickup ?? true,
      });
    }
  } else if (secondaryExisting) {
    nextContacts.push(secondaryExisting);
  }

  return nextContacts;
}

async function syncTrustSensitiveChildData(
  childId: string,
  input: Partial<CreateChildInput>,
): Promise<Result<EmergencyInfo, ServiceError> | null> {
  const touchesTrustData =
    'allergies' in input ||
    'medicalConditions' in input ||
    'medications' in input ||
    'emergencyContactName' in input ||
    'emergencyContactPhone' in input ||
    'emergencyContactRelation' in input ||
    'secondaryEmergencyName' in input ||
    'secondaryEmergencyPhone' in input ||
    'photoConsent' in input ||
    'videoConsent' in input ||
    'socialMediaConsent' in input ||
    'emergencyTreatmentConsent' in input;

  if (!touchesTrustData) {
    return null;
  }

  const currentInfoResult = await safetyService.getEmergencyInfo(childId);
  const currentInfo = currentInfoResult.success
    ? currentInfoResult.data
    : createDefaultEmergencyInfo(childId);

  return safetyService.updateEmergencyInfo(childId, {
    medical: buildMedicalRecord(input, currentInfo.medical),
    contacts: buildEmergencyContacts(input, currentInfo.contacts),
    consents: buildConsents(input, currentInfo.consents),
  });
}

function applyEmergencyInfoToChild(child: ChildProfile, info: EmergencyInfo): ChildProfile {
  const primaryContact = info.contacts.find((contact) => contact.isPrimary) ?? info.contacts[0];
  const secondaryContact = info.contacts.find((contact) => contact.id !== primaryContact?.id);
  const consentsByType = new Map(info.consents.map((consent) => [consent.type, consent.granted]));

  return {
    ...sanitizeChildProfile(child),
    allergies: info.medical.allergies,
    medicalConditions: info.medical.conditions,
    medications: info.medical.medications,
    emergencyContactName: primaryContact?.name ?? '',
    emergencyContactPhone: primaryContact?.phone ?? '',
    emergencyContactRelation: primaryContact?.relationship ?? '',
    secondaryEmergencyName: secondaryContact?.name ?? undefined,
    secondaryEmergencyPhone: secondaryContact?.phone ?? undefined,
    photoConsent: consentsByType.get('PHOTO') ?? true,
    videoConsent: consentsByType.get('VIDEO') ?? true,
    socialMediaConsent: consentsByType.get('SOCIAL_MEDIA') ?? false,
    emergencyTreatmentConsent: consentsByType.get('EMERGENCY_TREATMENT') ?? true,
  };
}

async function hydrateChildTrustData(child: ChildProfile): Promise<ChildProfile> {
  const result = await safetyService.getEmergencyInfo(child.id);
  if (!result.success) {
    logger.warn('Failed to hydrate child trust data from safety service', {
      childId: child.id,
      error: result.error.message,
    });
    return sanitizeChildProfile(child);
  }

  return applyEmergencyInfoToChild(child, result.data);
}

async function migrateLegacyTrustData(children: ChildProfile[]): Promise<ChildProfile[]> {
  const nextChildren = [...children];
  let mutated = false;

  for (let index = 0; index < nextChildren.length; index += 1) {
    const child = nextChildren[index];
    if (!hasLegacyTrustSensitiveData(child)) {
      continue;
    }

    const result = await syncTrustSensitiveChildData(child.id, {
      allergies: child.allergies,
      medicalConditions: child.medicalConditions,
      medications: child.medications,
      emergencyContactName: child.emergencyContactName,
      emergencyContactPhone: child.emergencyContactPhone,
      emergencyContactRelation: child.emergencyContactRelation,
      secondaryEmergencyName: child.secondaryEmergencyName,
      secondaryEmergencyPhone: child.secondaryEmergencyPhone,
      photoConsent: child.photoConsent,
      videoConsent: child.videoConsent,
      socialMediaConsent: child.socialMediaConsent,
      emergencyTreatmentConsent: child.emergencyTreatmentConsent,
    });

    if (!result || !result.success) {
      logger.warn('Failed to migrate legacy child trust data', {
        childId: child.id,
        error: result?.success === false ? result.error.message : 'unknown',
      });
      continue;
    }

    nextChildren[index] = sanitizeChildProfile(child);
    mutated = true;
  }

  if (mutated) {
    const saveResult = await saveToStorage(nextChildren);
    if (!saveResult.success) {
      logger.warn('Failed to persist migrated child trust data cleanup', {
        error: saveResult.error.message,
      });
    }
  }

  return nextChildren;
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

let childrenCache: ChildProfile[] = normalizeLegacyMockDates([
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
]);

// ============================================================================
// STORAGE HELPERS
// ============================================================================

async function loadFromStorage(): Promise<ChildProfile[]> {
  try {
    const stored = await apiClient.get<ChildProfile[] | null>(STORAGE_KEYS.CHILDREN_PROFILES, null);
    if (stored) {
      return migrateLegacyTrustData(stored);
    }
  } catch (error) {
    logger.error('Failed to load from storage', error);
  }
  return migrateLegacyTrustData(childrenCache);
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

function toChildDisplayName(child: ChildProfile): string {
  const fullName = `${child.firstName} ${child.lastName}`.trim();
  return child.nickname?.trim() || fullName || child.firstName || 'Young Athlete';
}

async function upsertChildUserRecord(child: ChildProfile): Promise<void> {
  try {
    const users = await apiClient.get<User[]>(STORAGE_KEYS.USERS, []);
    const existingIndex = users.findIndex((user) => accountIdsMatch(user.id, child.id));

    if (existingIndex >= 0) {
      const existing = users[existingIndex];
      users[existingIndex] = {
        ...existing,
        id: existing.id,
        name: existing.name || toChildDisplayName(child),
        email: existing.email || '',
        postcode: existing.postcode || '',
        dateOfBirth: existing.dateOfBirth || child.dateOfBirth || '',
        role: existing.role || 'USER',
        avatar: existing.avatar || child.photoUrl,
      };
    } else {
      users.push({
        id: child.id,
        name: toChildDisplayName(child),
        email: '',
        postcode: '',
        dateOfBirth: child.dateOfBirth || '',
        role: 'USER',
        avatar: child.photoUrl,
      });
    }

    await apiClient.set(STORAGE_KEYS.USERS, users);
  } catch (error) {
    logger.warn('Failed to sync child user record', { childId: child.id, error });
  }
}

async function removeGeneratedChildUserRecord(childId: string): Promise<void> {
  if (!childId.startsWith('child_')) {
    return;
  }

  try {
    const users = await apiClient.get<User[]>(STORAGE_KEYS.USERS, []);
    const filteredUsers = users.filter((user) => !accountIdsMatch(user.id, childId));
    if (filteredUsers.length !== users.length) {
      await apiClient.set(STORAGE_KEYS.USERS, filteredUsers);
    }
  } catch (error) {
    logger.warn('Failed to remove generated child user record', { childId, error });
  }
}

async function removeChildTrustData(childId: string): Promise<void> {
  if (!apiClient.isMockMode) {
    return;
  }

  try {
    const emergencyInfo = await apiClient.get<Record<string, EmergencyInfo>>(
      STORAGE_KEYS.EMERGENCY_INFO,
      {},
    );
    if (childId in emergencyInfo) {
      delete emergencyInfo[childId];
      await apiClient.set(STORAGE_KEYS.EMERGENCY_INFO, emergencyInfo);
    }

    await apiClient.remove(`${STORAGE_KEYS.AUDIT_LOG_PREFIX}${childId}`).catch(() => {});
  } catch (error) {
    logger.warn('Failed to remove child trust data', { childId, error });
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
      const matchingChildren = childrenCache.filter((c) => c.parentId === parentId);
      return Promise.all(matchingChildren.map((child) => hydrateChildTrustData(child)));
    }

    const response = await fetch(`/api/children?parentId=${parentId}`);
    const children = (await response.json()) as ChildProfile[];
    return Promise.all(children.map((child) => hydrateChildTrustData(child)));
  },

  /**
   * Get a single child by ID
   */
  async getChild(childId: string): Promise<ChildProfile | null> {
    if (USE_MOCK) {
      childrenCache = await loadFromStorage();
      const child = childrenCache.find((c) => c.id === childId) || null;
      return child ? hydrateChildTrustData(child) : null;
    }

    const response = await fetch(`/api/children/${childId}`);
    const child = (await response.json()) as ChildProfile | null;
    return child ? hydrateChildTrustData(child) : null;
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
      communicationNotes: input.communicationNotes,
      behavioralNotes: input.behavioralNotes,
      ...createClearedTrustSensitiveFields(),
      createdAt: now,
      updatedAt: now,
    };

    const trustResult = await syncTrustSensitiveChildData(newChild.id, input);
    if (trustResult && !trustResult.success) {
      throw new Error(trustResult.error.message);
    }

    if (USE_MOCK) {
      childrenCache = await loadFromStorage();
      childrenCache.push(newChild);
      await saveToStorage(childrenCache);
      await upsertChildUserRecord(newChild);
      emitTyped(ServiceEvents.CHILD_PROFILES_UPDATED, {
        parentId,
        action: 'created',
        childId: newChild.id,
      });
      return hydrateChildTrustData(newChild);
    }

    const response = await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId,
        firstName: input.firstName,
        lastName: input.lastName,
        nickname: input.nickname,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        relationship: input.relationship,
        primaryPosition: input.primaryPosition,
        photoUrl: input.photoUrl,
        disabilities: input.disabilities,
        specialNeeds: input.specialNeeds,
        communicationNotes: input.communicationNotes,
        behavioralNotes: input.behavioralNotes,
      }),
    });
    const child = (await response.json()) as ChildProfile;
    return hydrateChildTrustData(child);
  },

  /**
   * Update a child profile
   */
  async updateChild(
    childId: string,
    updates: Partial<CreateChildInput>,
  ): Promise<Result<ChildProfile, ServiceError>> {
    const {
      allergies: _allergies,
      medicalConditions: _medicalConditions,
      medications: _medications,
      emergencyContactName: _emergencyContactName,
      emergencyContactPhone: _emergencyContactPhone,
      emergencyContactRelation: _emergencyContactRelation,
      secondaryEmergencyName: _secondaryEmergencyName,
      secondaryEmergencyPhone: _secondaryEmergencyPhone,
      photoConsent: _photoConsent,
      videoConsent: _videoConsent,
      socialMediaConsent: _socialMediaConsent,
      emergencyTreatmentConsent: _emergencyTreatmentConsent,
      ...profileUpdates
    } = updates;

    if (USE_MOCK) {
      childrenCache = await loadFromStorage();
      const index = childrenCache.findIndex((c) => c.id === childId);
      if (index === -1) {
        return err(notFound('Child', childId));
      }

      const trustResult = await syncTrustSensitiveChildData(childId, updates);
      if (trustResult && !trustResult.success) {
        return err(trustResult.error);
      }

      childrenCache[index] = {
        ...childrenCache[index],
        ...profileUpdates,
        hasSpecialNeeds:
          (updates.disabilities?.length || childrenCache[index].disabilities.length) > 0 ||
          (updates.specialNeeds?.length || childrenCache[index].specialNeeds.length) > 0,
        ...createClearedTrustSensitiveFields(),
        updatedAt: new Date().toISOString(),
      };

      await saveToStorage(childrenCache);
      await upsertChildUserRecord(childrenCache[index]);

      const updatedFields = Object.keys(profileUpdates);
      emitTyped(ServiceEvents.CHILD_PROFILES_UPDATED, {
        parentId: childrenCache[index].parentId,
        action: 'updated',
        childId,
      });
      emitTyped(ServiceEvents.CHILD_PROFILE_UPDATED, {
        childId,
        parentId: childrenCache[index].parentId,
        updatedFields,
        timestamp: childrenCache[index].updatedAt,
      });

      return ok(await hydrateChildTrustData(childrenCache[index]));
    }

    const response = await fetch(`/api/children/${childId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileUpdates),
    });
    const child = (await response.json()) as ChildProfile;
    return ok(await hydrateChildTrustData(child));
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
      await removeGeneratedChildUserRecord(childId);
      await removeChildTrustData(childId);
      if (deletedChild) {
        emitTyped(ServiceEvents.CHILD_PROFILES_UPDATED, {
          parentId: deletedChild.parentId,
          action: 'deleted',
          childId,
        });
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
      emitTyped(ServiceEvents.CHILD_SEN_UPDATED, {
        childId,
        parentId: child.parentId,
        section: 'disabilities',
      });
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
      emitTyped(ServiceEvents.CHILD_SEN_UPDATED, {
        childId,
        parentId: child.parentId,
        section: 'disabilities',
      });
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
      emitTyped(ServiceEvents.CHILD_SEN_UPDATED, {
        childId,
        parentId: child.parentId,
        section: 'specialNeeds',
      });
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
      emitTyped(ServiceEvents.CHILD_SEN_UPDATED, {
        childId,
        parentId: child.parentId,
        section: 'specialNeeds',
      });
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
      const child =
        childrenCache.find(
          (c) =>
            c.firstName.toLowerCase() === firstName.toLowerCase() &&
            c.lastName.toLowerCase() === lastName.toLowerCase(),
        ) || null;
      return child ? hydrateChildTrustData(child) : null;
    }

    const response = await fetch(
      `/api/children/by-name?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`,
    );
    if (!response.ok) return null;
    const child = (await response.json()) as ChildProfile | null;
    return child ? hydrateChildTrustData(child) : null;
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
