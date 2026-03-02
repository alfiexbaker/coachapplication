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

import { apiClient } from './api-client';
import { apiFetch } from './api-client';
import { authService } from './auth-service';
import { createLogger } from '@/utils/logger';
import type {
  Injury,
  InjuryStatus,
  InjurySeverity,
  InjuryStats,
  BodyPart,
  BodyPartCategory,
  RecoveryNote,
  LogInjuryInput,
  UpdateInjuryInput,
} from '@/constants/types';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('InjuryService');

type ApiInjurySeverity = 'low' | 'medium' | 'high';
type ApiInjuryStatus = 'active' | 'recovering' | 'resolved';

type ApiInjuryRecord = {
  id: string;
  athleteId: string;
  title: string;
  type: string;
  severity: ApiInjurySeverity;
  status: ApiInjuryStatus;
  reportedAt: string;
  expectedRecoveryDate: string | null;
  resolvedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiInjuriesResponse = {
  athleteId: string;
  injuries: ApiInjuryRecord[];
};

const API_SEVERITY_FROM_UI: Record<InjurySeverity, ApiInjurySeverity> = {
  MINOR: 'low',
  MODERATE: 'medium',
  SEVERE: 'high',
};

const UI_SEVERITY_FROM_API: Record<ApiInjurySeverity, InjurySeverity> = {
  low: 'MINOR',
  medium: 'MODERATE',
  high: 'SEVERE',
};

const API_STATUS_FROM_UI: Record<InjuryStatus, ApiInjuryStatus> = {
  ACTIVE: 'active',
  RECOVERING: 'recovering',
  HEALED: 'resolved',
};

const UI_STATUS_FROM_API: Record<ApiInjuryStatus, InjuryStatus> = {
  active: 'ACTIVE',
  recovering: 'RECOVERING',
  resolved: 'HEALED',
};

const BODY_PART_VALUES: readonly BodyPart[] = [
  'HEAD',
  'NECK',
  'LEFT_SHOULDER',
  'RIGHT_SHOULDER',
  'LEFT_ARM',
  'RIGHT_ARM',
  'LEFT_ELBOW',
  'RIGHT_ELBOW',
  'LEFT_WRIST',
  'RIGHT_WRIST',
  'LEFT_HAND',
  'RIGHT_HAND',
  'CHEST',
  'UPPER_BACK',
  'LOWER_BACK',
  'ABDOMEN',
  'LEFT_HIP',
  'RIGHT_HIP',
  'LEFT_THIGH',
  'RIGHT_THIGH',
  'LEFT_KNEE',
  'RIGHT_KNEE',
  'LEFT_CALF',
  'RIGHT_CALF',
  'LEFT_ANKLE',
  'RIGHT_ANKLE',
  'LEFT_FOOT',
  'RIGHT_FOOT',
];
const BODY_PART_SET = new Set<string>(BODY_PART_VALUES);

function toApiUserId(userId: string): string {
  return userId.startsWith('usr_') ? userId : `usr_${userId}`;
}

function toApiAthleteId(userId: string): string {
  const unprefixed = userId.replace(/^usr_/, '').replace(/^ath_/, '');
  return `ath_${unprefixed}`;
}

function fromApiAthleteId(athleteId: string): string {
  return athleteId.replace(/^ath_/, '');
}

async function buildApiActorHeaders(targetUserId: string): Promise<Record<string, string>> {
  const currentUser = await authService.getCurrentUser().catch(() => null);
  const accountType = currentUser?.accountType ?? 'ATHLETE';
  const actingRole = accountType.toLowerCase();
  const actorUserId = toApiUserId(currentUser?.id ?? targetUserId);
  const targetAthleteId = toApiAthleteId(targetUserId);

  const headers: Record<string, string> = {
    'x-auth-user-id': actorUserId,
    'x-auth-roles': actingRole,
    'x-acting-role': actingRole,
  };

  if (actingRole === 'coach') {
    headers['x-coach-athlete-ids'] = targetAthleteId;
    headers['x-coach-verified'] = '1';
  }
  if (actingRole === 'parent') {
    headers['x-guardian-athlete-ids'] = targetAthleteId;
  }

  return headers;
}

function toUiBodyPart(apiType: string): BodyPart {
  const normalized = apiType.toUpperCase();
  if (BODY_PART_SET.has(normalized)) {
    return normalized as BodyPart;
  }
  return 'LEFT_ANKLE';
}

function toUiInjury(apiInjury: ApiInjuryRecord): Injury {
  const bodyPart = toUiBodyPart(apiInjury.type);
  const description = apiInjury.notes ?? apiInjury.title;
  const status = UI_STATUS_FROM_API[apiInjury.status];
  const recoveryPercent =
    status === 'HEALED'
      ? 100
      : status === 'RECOVERING'
        ? 60
        : 0;

  return {
    id: apiInjury.id,
    userId: fromApiAthleteId(apiInjury.athleteId),
    bodyPart,
    description,
    severity: UI_SEVERITY_FROM_API[apiInjury.severity],
    occurredAt: apiInjury.reportedAt,
    expectedRecovery: apiInjury.expectedRecoveryDate ?? undefined,
    status,
    notes: [],
    recoveryPercent,
    sharedWithCoach: true,
    createdAt: apiInjury.createdAt,
    updatedAt: apiInjury.updatedAt,
    healedAt: apiInjury.resolvedAt ?? undefined,
  };
}

const latestApiInjuriesById = new Map<string, Injury>();

// Mock data for demonstration
const MOCK_INJURIES: Injury[] = [
  {
    id: 'injury_1',
    userId: 'user1',
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
        recoveryPercent: 25,
      },
      {
        id: 'note_2',
        injuryId: 'injury_1',
        note: 'Began light stretching exercises. Can walk without limp now.',
        createdAt: '2026-01-09T15:00:00Z',
        createdBy: 'user1',
        recoveryPercent: 50,
      },
      {
        id: 'note_3',
        injuryId: 'injury_1',
        note: 'Light jogging today, feeling much better. Still some stiffness.',
        createdAt: '2026-01-11T09:00:00Z',
        createdBy: 'user1',
        recoveryPercent: 65,
      },
    ],
    createdAt: '2026-01-05T16:00:00Z',
    updatedAt: '2026-01-11T09:00:00Z',
  },
  {
    id: 'injury_2',
    userId: 'user1',
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
        recoveryPercent: 30,
      },
      {
        id: 'note_5',
        injuryId: 'injury_2',
        note: 'Muscle feels normal now. Cleared to resume training.',
        createdAt: '2025-12-21T14:00:00Z',
        createdBy: 'user1',
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
        recoveryPercent: 40,
      },
    ],
    createdAt: '2026-01-10T18:00:00Z',
    updatedAt: '2026-01-11T09:00:00Z',
  },
  {
    id: 'injury_5',
    userId: 'user4a',
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
        recoveryPercent: 50,
      },
      {
        id: 'note_9',
        injuryId: 'injury_5',
        note: 'Fully recovered. Back to full training.',
        createdAt: '2025-12-29T14:00:00Z',
        createdBy: 'user4a',
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
function getBodyPartCategory(bodyPart: BodyPart): BodyPartCategory {
  const categoryMap: Record<BodyPart, BodyPartCategory> = {
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
function getBodyPartLabel(bodyPart: BodyPart): string {
  const labels: Record<BodyPart, string> = {
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
function getBodyPartsByCategory(category: BodyPartCategory): BodyPart[] {
  const allParts: BodyPart[] = [
    'HEAD',
    'NECK',
    'LEFT_SHOULDER',
    'RIGHT_SHOULDER',
    'LEFT_ARM',
    'RIGHT_ARM',
    'LEFT_ELBOW',
    'RIGHT_ELBOW',
    'LEFT_WRIST',
    'RIGHT_WRIST',
    'LEFT_HAND',
    'RIGHT_HAND',
    'CHEST',
    'UPPER_BACK',
    'LOWER_BACK',
    'ABDOMEN',
    'LEFT_HIP',
    'RIGHT_HIP',
    'LEFT_THIGH',
    'RIGHT_THIGH',
    'LEFT_KNEE',
    'RIGHT_KNEE',
    'LEFT_CALF',
    'RIGHT_CALF',
    'LEFT_ANKLE',
    'RIGHT_ANKLE',
    'LEFT_FOOT',
    'RIGHT_FOOT',
  ];
  return allParts.filter((part) => getBodyPartCategory(part) === category);
}

/**
 * Get display info for severity level
 */
function getSeverityInfo(severity: InjurySeverity): { label: string; color: string; icon: string } {
  const severityInfo: Record<InjurySeverity, { label: string; color: string; icon: string }> = {
    MINOR: { label: 'Minor', color: '#F59E0B', icon: 'bandage-outline' },
    MODERATE: { label: 'Moderate', color: '#F97316', icon: 'medical-outline' },
    SEVERE: { label: 'Severe', color: '#EF4444', icon: 'alert-circle-outline' },
  };
  return severityInfo[severity];
}

/**
 * Get display info for injury status
 */
function getStatusInfo(status: InjuryStatus): { label: string; color: string; icon: string } {
  const statusInfo: Record<InjuryStatus, { label: string; color: string; icon: string }> = {
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
async function getAllInjuries(): Promise<Injury[]> {
  const injuries = await apiClient.get<Injury[]>(STORAGE_KEYS.INJURIES, []);
  // Return mock data if no injuries stored
  if (injuries.length === 0) {
    return [...MOCK_INJURIES];
  }
  return injuries;
}

/**
 * Save all injuries to storage
 */
async function saveInjuries(injuries: Injury[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.INJURIES, injuries);
}

// ============================================================================
// INJURY CRUD OPERATIONS
// ============================================================================

/**
 * Log a new injury for a user
 * @param userId - The user ID of the athlete
 * @param params - Injury details
 * @param _userName - Reserved for compatibility with existing call sites
 * @returns The created injury
 */
async function logInjury(
  userId: string,
  params: LogInjuryInput,
  _userName?: string,
): Promise<Injury> {
  if (!apiClient.isMockMode) {
    try {
      const athleteId = toApiAthleteId(userId);
      const headers = await buildApiActorHeaders(userId);
      const result = await apiFetch<ApiInjuryRecord>(`/athletes/${athleteId}/injuries`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `Injury - ${getBodyPartLabel(params.bodyPart)}`,
          type: params.bodyPart,
          severity: API_SEVERITY_FROM_UI[params.severity],
          reportedAt: params.occurredAt,
          expectedRecoveryDate: params.expectedRecovery ?? undefined,
          notes: params.description,
        }),
      });

      if (result.success) {
        const mapped = toUiInjury(result.data);
        latestApiInjuriesById.set(mapped.id, mapped);
        return mapped;
      }

      logger.warn('API injury create failed, falling back to local storage', {
        userId,
        error: result.error.message,
      });
    } catch (error) {
      logger.warn('API injury create threw, falling back to local storage', { userId, error });
    }
  }

  const injuries = await getAllInjuries();
  const now = new Date().toISOString();

  const newInjury: Injury = {
    id: `injury_${Date.now()}`,
    userId,
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
async function getUserInjuries(userId: string, includeHealed: boolean = true): Promise<Injury[]> {
  if (!apiClient.isMockMode) {
    try {
      const athleteId = toApiAthleteId(userId);
      const headers = await buildApiActorHeaders(userId);
      const result = await apiFetch<ApiInjuriesResponse>(`/athletes/${athleteId}/injuries`, {
        method: 'GET',
        headers,
      });

      if (result.success) {
        let injuries = result.data.injuries.map(toUiInjury);
        for (const injury of injuries) {
          latestApiInjuriesById.set(injury.id, injury);
        }
        if (!includeHealed) {
          injuries = injuries.filter((i) => i.status !== 'HEALED');
        }
        return injuries.sort((a, b) => {
          const statusOrder: Record<InjuryStatus, number> = { ACTIVE: 0, RECOVERING: 1, HEALED: 2 };
          if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
          }
          return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
        });
      }

      logger.warn('API injury list failed, falling back to local storage', {
        userId,
        error: result.error.message,
      });
    } catch (error) {
      logger.warn('API injury list threw, falling back to local storage', { userId, error });
    }
  }

  const injuries = await getAllInjuries();
  let filtered = injuries.filter((i) => i.userId === userId);

  if (!includeHealed) {
    filtered = filtered.filter((i) => i.status !== 'HEALED');
  }

  // Sort by status (active first, then recovering, then healed) and by date
  return filtered.sort((a, b) => {
    const statusOrder: Record<InjuryStatus, number> = { ACTIVE: 0, RECOVERING: 1, HEALED: 2 };
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
async function getInjuryById(id: string): Promise<Injury | null> {
  if (!apiClient.isMockMode) {
    const cached = latestApiInjuriesById.get(id);
    if (cached) {
      return cached;
    }
  }

  const injuries = await getAllInjuries();
  return injuries.find((i) => i.id === id) ?? null;
}

/**
 * Update an existing injury
 * @param id - The injury ID
 * @param updates - The fields to update
 * @returns The updated injury or null if not found
 */
async function updateInjury(id: string, updates: UpdateInjuryInput): Promise<Injury | null> {
  if (!apiClient.isMockMode) {
    const cached = latestApiInjuriesById.get(id);
    if (cached) {
      try {
        const headers = await buildApiActorHeaders(cached.userId);
        const result = await apiFetch<ApiInjuryRecord>(`/injuries/${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            severity:
              updates.severity !== undefined ? API_SEVERITY_FROM_UI[updates.severity] : undefined,
            status: updates.status !== undefined ? API_STATUS_FROM_UI[updates.status] : undefined,
            expectedRecoveryDate:
              updates.expectedRecovery !== undefined ? updates.expectedRecovery : undefined,
            notes: updates.description !== undefined ? updates.description : undefined,
          }),
        });

        if (result.success) {
          const mapped = toUiInjury(result.data);
          if (updates.recoveryPercent !== undefined) {
            mapped.recoveryPercent = updates.recoveryPercent;
            if (updates.recoveryPercent >= 100) {
              mapped.status = 'HEALED';
            } else if (updates.recoveryPercent > 0 && mapped.status === 'ACTIVE') {
              mapped.status = 'RECOVERING';
            }
          }
          if (updates.sharedWithCoach !== undefined) {
            mapped.sharedWithCoach = updates.sharedWithCoach;
          }
          latestApiInjuriesById.set(mapped.id, mapped);
          return mapped;
        }

        logger.warn('API injury update failed, falling back to local storage', {
          id,
          error: result.error.message,
        });
      } catch (error) {
        logger.warn('API injury update threw, falling back to local storage', { id, error });
      }
    }
  }

  const injuries = await getAllInjuries();
  const injuryIndex = injuries.findIndex((i) => i.id === id);

  if (injuryIndex === -1) {
    logger.warn('injury_not_found', { injuryId: id });
    return null;
  }

  const injury = injuries[injuryIndex];
  const updatedInjury: Injury = {
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
 * @param _createdByName - Reserved for compatibility with existing call sites
 * @param recoveryPercent - Optional recovery percentage update
 * @returns The updated injury or null if not found
 */
async function addRecoveryNote(
  injuryId: string,
  note: string,
  createdBy: string,
  _createdByName?: string,
  recoveryPercent?: number,
): Promise<Injury | null> {
  if (!apiClient.isMockMode) {
    const cached = latestApiInjuriesById.get(injuryId);
    if (cached) {
      const nextDescription = cached.description
        ? `${cached.description}\n\n[${new Date().toISOString()}] ${note}`
        : note;
      return updateInjury(injuryId, {
        description: nextDescription,
        recoveryPercent: recoveryPercent ?? cached.recoveryPercent,
        status:
          recoveryPercent !== undefined
            ? recoveryPercent >= 100
              ? 'HEALED'
              : recoveryPercent > 0
                ? 'RECOVERING'
                : cached.status
            : cached.status,
      });
    }
  }

  const injuries = await getAllInjuries();
  const injuryIndex = injuries.findIndex((i) => i.id === injuryId);

  if (injuryIndex === -1) {
    logger.warn('injury_not_found_for_note', { injuryId });
    return null;
  }

  const injury = injuries[injuryIndex];
  const now = new Date().toISOString();

  const newNote: RecoveryNote = {
    id: `note_${Date.now()}`,
    injuryId,
    note,
    createdAt: now,
    createdBy,
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
    } else if (recoveryPercent > 0 && injury.status === 'ACTIVE') {
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
async function markAsHealed(id: string): Promise<Injury | null> {
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
async function getAthleteInjuries(athleteId: string): Promise<Injury[]> {
  if (!apiClient.isMockMode) {
    try {
      const apiAthleteId = toApiAthleteId(athleteId);
      const currentUser = await authService.getCurrentUser().catch(() => null);
      const coachUserId = currentUser?.id ?? 'coach1';
      const headers: Record<string, string> = {
        'x-auth-user-id': toApiUserId(coachUserId),
        'x-auth-roles': 'coach',
        'x-acting-role': 'coach',
        'x-coach-athlete-ids': apiAthleteId,
        'x-coach-verified': '1',
      };
      const result = await apiFetch<ApiInjuriesResponse>(`/athletes/${apiAthleteId}/injuries`, {
        method: 'GET',
        headers,
      });
      if (result.success) {
        const injuries = result.data.injuries.map(toUiInjury);
        for (const injury of injuries) {
          latestApiInjuriesById.set(injury.id, injury);
        }
        return injuries.filter((i) => i.sharedWithCoach);
      }
      logger.warn('API athlete injuries read failed, falling back to local storage', {
        athleteId,
        error: result.error.message,
      });
    } catch (error) {
      logger.warn('API athlete injuries read threw, falling back to local storage', {
        athleteId,
        error,
      });
    }
  }

  const injuries = await getUserInjuries(athleteId, true);
  return injuries.filter((i) => i.sharedWithCoach);
}

/**
 * Check if user has any active injuries
 * @param userId - The user ID
 * @returns True if user has active injuries
 */
async function hasActiveInjury(userId: string): Promise<boolean> {
  const injuries = await getUserInjuries(userId, false);
  return injuries.some((i) => i.status === 'ACTIVE' || i.status === 'RECOVERING');
}

/**
 * Get active injury count for a user
 * @param userId - The user ID
 * @returns Number of active/recovering injuries
 */
async function getActiveInjuryCount(userId: string): Promise<number> {
  const injuries = await getUserInjuries(userId, false);
  return injuries.filter((i) => i.status === 'ACTIVE' || i.status === 'RECOVERING').length;
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

/**
 * Get injury statistics for a user
 * @param userId - The user ID
 * @returns Injury statistics
 */
async function getInjuryStats(userId: string): Promise<InjuryStats> {
  const injuries = await getUserInjuries(userId, true);

  const active = injuries.filter((i) => i.status === 'ACTIVE').length;
  const recovering = injuries.filter((i) => i.status === 'RECOVERING').length;
  const healed = injuries.filter((i) => i.status === 'HEALED').length;

  // Count body parts
  const bodyPartCounts: Record<string, number> = {};
  injuries.forEach((i) => {
    bodyPartCounts[i.bodyPart] = (bodyPartCounts[i.bodyPart] || 0) + 1;
  });

  const commonBodyParts = Object.entries(bodyPartCounts)
    .map(([bodyPart, count]) => ({ bodyPart: bodyPart as BodyPart, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate average recovery time for healed injuries
  const healedInjuries = injuries.filter((i) => i.healedAt);
  let averageRecoveryDays = 0;
  if (healedInjuries.length > 0) {
    const totalDays = healedInjuries.reduce((sum, i) => {
      const occurred = new Date(i.occurredAt);
      const healed = new Date(i.healedAt!);
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
function calculateExpectedProgress(injury: Injury): number {
  if (!injury.expectedRecovery || injury.status === 'HEALED') {
    return injury.recoveryPercent;
  }

  const occurred = new Date(injury.occurredAt).getTime();
  const expected = new Date(injury.expectedRecovery).getTime();
  const now = Date.now();

  if (now >= expected) return 100;
  if (now <= occurred) return 0;

  const totalDuration = expected - occurred;
  const elapsed = now - occurred;
  return Math.round((elapsed / totalDuration) * 100);
}

/**
 * Format a date for display
 */
function formatDate(date: string | undefined): string {
  if (!date) return 'Not set';
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
function getDaysUntilRecovery(injury: Injury): number | null {
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
async function resetToMockData(): Promise<void> {
  await saveInjuries([...MOCK_INJURIES]);
  logger.info('injuries_reset_to_mock');
}

// ============================================================================
// EXPORTS
// ============================================================================

export const injuryService = {
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
