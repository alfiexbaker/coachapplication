/**
 * Drill Service
 *
 * Handles drill library management and drill assignments for athletes.
 * Coaches create drills in their library and assign them to athletes as homework.
 * Athletes can view, complete, and track their assigned drills.
 *
 * API Integration Notes:
 * - GET /v1/drills?coachUserId=X - Get coach's drill library.
 * - GET /v1/drills/:id - Get one drill from backend authority.
 * - POST /v1/drill-assignments and PATCH /v1/drill-assignments/:id/completion
 *   own assignment create and completion in API mode.
 */

import { apiClient, apiFetch } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationTriggers } from './notification-trigger';
import { childService } from './child-service';
import { userService } from './user-service';
import { createLogger } from '../utils/logger';
import { toDateStr } from '@/utils/format';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  serviceError,
} from '@/types/result';
import type {
  Drill,
  DrillCategory,
  DrillDifficulty,
  AssignedDrill,
  CreateDrillInput,
  AssignDrillInput,
  DrillAssignmentStats,
} from '../constants/types';
const logger = createLogger('DrillService');

type ApiDrillRow = Record<string, unknown> & {
  assignments?: Record<string, unknown>[];
};
type ApiDrillsResponse = {
  drills: ApiDrillRow[];
  total: number;
  seedVersion?: string | null;
  requestId?: string;
};
type ApiDrillResponse = {
  drill?: ApiDrillRow;
  seedVersion?: string | null;
  requestId?: string;
};
type ApiDrillMutationResponse = ApiDrillResponse & {
  removed?: boolean;
};
type ApiDrillAssignmentRow = Record<string, unknown> & {
  drill?: ApiDrillRow;
  submissions?: Record<string, unknown>[];
};
type ApiDrillAssignmentsResponse = {
  athleteId: string;
  assignments: ApiDrillAssignmentRow[];
  total: number;
  seedVersion?: string | null;
  requestId?: string;
};
type ApiDrillAssignmentMutationResponse = {
  removed?: boolean;
  assignment?: ApiDrillAssignmentRow;
  seedVersion?: string | null;
  requestId?: string;
};
type ApiDrillAssignmentCompletionResponse = ApiDrillAssignmentMutationResponse & {
  task?: Record<string, unknown>;
};

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) {
    return fallback;
  }
  return userResult.data.name?.trim() || fallback;
}

function stringValue(row: Record<string, unknown> | undefined, key: string, fallback = ''): string {
  const value = row?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function numberValue(row: Record<string, unknown>, key: string, fallback: number): number {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function booleanValue(row: Record<string, unknown>, key: string, fallback = false): boolean {
  const value = row[key];
  return typeof value === 'boolean' ? value : fallback;
}

function toDrillApiAthleteId(athleteId: string): string {
  return athleteId.startsWith('ath_') ? athleteId : `ath_${athleteId.replace(/^usr_/, '')}`;
}

function stringArrayValue(row: Record<string, unknown>, key: string): string[] | undefined {
  const value = row[key];
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings = value.filter((entry): entry is string => typeof entry === 'string');
  return strings.length > 0 ? strings : undefined;
}

function drillCategory(value: unknown): DrillCategory {
  const normalized = typeof value === 'string' ? value.toUpperCase() : '';
  if (
    normalized === 'WARMUP' ||
    normalized === 'TECHNIQUE' ||
    normalized === 'FITNESS' ||
    normalized === 'COOLDOWN' ||
    normalized === 'TACTICAL'
  ) {
    return normalized;
  }
  return 'TECHNIQUE';
}

function drillDifficulty(value: unknown): DrillDifficulty {
  const normalized = typeof value === 'string' ? value.toUpperCase() : '';
  if (normalized === 'BEGINNER' || normalized === 'INTERMEDIATE' || normalized === 'ADVANCED') {
    return normalized;
  }
  return 'BEGINNER';
}

function mapApiDrill(row: ApiDrillRow): Drill {
  const assignments = Array.isArray(row.assignments) ? row.assignments : [];
  return {
    id: stringValue(row, 'id'),
    coachId: stringValue(row, 'authorUserId', stringValue(row, 'coachId')),
    title: stringValue(row, 'title', 'Untitled drill'),
    description: stringValue(row, 'description'),
    category: drillCategory(row.category),
    videoUrl: stringValue(row, 'videoUrl') || undefined,
    thumbnailUrl: stringValue(row, 'thumbnailUrl') || undefined,
    duration: numberValue(row, 'duration', numberValue(row, 'durationMinutes', 15)),
    difficulty: drillDifficulty(row.difficulty),
    equipment: stringArrayValue(row, 'equipment'),
    tags: stringArrayValue(row, 'tags'),
    assignmentCount: assignments.length,
    createdAt: stringValue(row, 'createdAt', new Date(0).toISOString()),
    updatedAt: stringValue(
      row,
      'updatedAt',
      stringValue(row, 'createdAt', new Date(0).toISOString()),
    ),
  };
}

function addDaysIso(value: string, days: number): string {
  const baseMs = Date.parse(value);
  const base = Number.isNaN(baseMs) ? Date.now() : baseMs;
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}

function assignmentSubmissions(row: ApiDrillAssignmentRow): Record<string, unknown>[] {
  return Array.isArray(row.submissions) ? row.submissions : [];
}

function latestSubmission(row: ApiDrillAssignmentRow): Record<string, unknown> | undefined {
  return [...assignmentSubmissions(row)].sort(
    (left, right) =>
      Date.parse(stringValue(right, 'submittedAt')) - Date.parse(stringValue(left, 'submittedAt')),
  )[0];
}

function isApiAssignmentCompleted(row: ApiDrillAssignmentRow): boolean {
  const status = stringValue(row, 'status').toUpperCase();
  if (status === 'SUBMITTED' || status === 'COMPLETED') {
    return true;
  }
  return stringValue(latestSubmission(row), 'status').toUpperCase() === 'SUBMITTED';
}

function mapApiAssignment(row: ApiDrillAssignmentRow): AssignedDrill {
  const assignedAt = stringValue(row, 'createdAt', new Date(0).toISOString());
  const latest = latestSubmission(row);
  const isCompleted = isApiAssignmentCompleted(row);
  return {
    id: stringValue(row, 'id'),
    drillId: stringValue(row, 'drillId'),
    drill: row.drill ? mapApiDrill(row.drill) : undefined,
    athleteId: stringValue(row, 'athleteId'),
    assignedBy: stringValue(row, 'coachUserId', stringValue(row, 'assignedBy')),
    assignedAt,
    dueDate: stringValue(row, 'dueDate', addDaysIso(assignedAt, 3)),
    isCompleted,
    completedAt: isCompleted ? stringValue(latest, 'submittedAt') || undefined : undefined,
    notes: stringValue(row, 'instructions') || undefined,
    athleteFeedback: isCompleted ? stringValue(latest, 'notes') || undefined : undefined,
    requiresEvidence: booleanValue(row, 'requiresEvidence'),
  };
}

function drillCompletionRequestBody(
  completed: boolean,
  athleteFeedbackOrOptions?:
    | string
    | {
        athleteFeedback?: string;
        evidenceVideoUri?: string;
        evidenceNotes?: string;
      },
): { completed: boolean; completionNote?: string } {
  const options =
    typeof athleteFeedbackOrOptions === 'string'
      ? {
          athleteFeedback: athleteFeedbackOrOptions,
        }
      : (athleteFeedbackOrOptions ?? {});

  if (options.evidenceVideoUri) {
    throw new Error(
      'Drill completion video evidence requires backend upload proof before API completion.',
    );
  }

  const completionNote = [options.athleteFeedback, options.evidenceNotes]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join('\n\n');

  return {
    completed,
    ...(completionNote ? { completionNote } : {}),
  };
}

async function fetchApiDrills(coachId: string): Promise<ApiDrillRow[]> {
  const query = new URLSearchParams({ coachUserId: coachId });
  const result = await apiFetch<ApiDrillsResponse>(`/v1/drills?${query.toString()}`, {
    method: 'GET',
  });
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data.drills;
}

async function fetchApiDrill(drillId: string): Promise<ApiDrillRow | null> {
  const result = await apiFetch<ApiDrillResponse>(`/v1/drills/${encodeURIComponent(drillId)}`, {
    method: 'GET',
  });
  if (!result.success) {
    if (result.error.code === 'NOT_FOUND') {
      return null;
    }
    throw new Error(result.error.message);
  }
  return result.data.drill ?? null;
}

async function postApiDrill(coachId: string, params: CreateDrillInput): Promise<ApiDrillRow> {
  const result = await apiFetch<ApiDrillMutationResponse>('/v1/drills', {
    method: 'POST',
    body: JSON.stringify({
      coachId,
      ...params,
    }),
  });
  if (!result.success) {
    throw new Error(result.error.message);
  }
  if (!result.data.drill) {
    throw new Error('Drill create API did not return a drill.');
  }
  return result.data.drill;
}

async function patchApiDrill(
  drillId: string,
  updates: Partial<CreateDrillInput>,
): Promise<ApiDrillRow | null> {
  const result = await apiFetch<ApiDrillMutationResponse>(
    `/v1/drills/${encodeURIComponent(drillId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    },
  );
  if (!result.success) {
    if (result.error.code === 'NOT_FOUND') {
      return null;
    }
    throw new Error(result.error.message);
  }
  return result.data.drill ?? null;
}

async function deleteApiDrill(drillId: string): Promise<boolean> {
  const result = await apiFetch<ApiDrillMutationResponse>(
    `/v1/drills/${encodeURIComponent(drillId)}`,
    {
      method: 'DELETE',
    },
  );
  if (!result.success) {
    if (result.error.code === 'NOT_FOUND') {
      return false;
    }
    throw new Error(result.error.message);
  }
  return result.data.removed === true || Boolean(result.data.drill);
}

async function fetchApiAthleteAssignments(
  athleteId: string,
  includeCompleted: boolean,
): Promise<ApiDrillAssignmentRow[]> {
  const apiAthleteId = toDrillApiAthleteId(athleteId);
  const query = new URLSearchParams({ includeCompleted: String(includeCompleted) });
  const result = await apiFetch<ApiDrillAssignmentsResponse>(
    `/v1/athletes/${encodeURIComponent(apiAthleteId)}/drill-assignments?${query.toString()}`,
    { method: 'GET' },
  );
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data.assignments;
}

async function postApiDrillAssignment(
  drillId: string,
  athleteId: string,
  params: AssignDrillInput,
): Promise<Result<AssignedDrill, ServiceError>> {
  const instructions = params.notes?.trim();
  const result = await apiFetch<ApiDrillAssignmentMutationResponse>('/v1/drill-assignments', {
    method: 'POST',
    body: JSON.stringify({
      drillId,
      athleteId: toDrillApiAthleteId(athleteId),
      dueDate: params.dueDate,
      ...(instructions ? { instructions } : {}),
    }),
  });
  if (!result.success) {
    return err(result.error);
  }
  if (!result.data.assignment) {
    return err(serviceError('UNKNOWN', 'Drill assignment API did not return an assignment.'));
  }
  return ok(mapApiAssignment(result.data.assignment));
}

async function patchApiAssignmentCompletion(
  assignmentId: string,
  completed: boolean,
  athleteFeedbackOrOptions?:
    | string
    | {
        athleteFeedback?: string;
        evidenceVideoUri?: string;
        evidenceNotes?: string;
      },
): Promise<AssignedDrill | null> {
  const result = await apiFetch<ApiDrillAssignmentCompletionResponse>(
    `/v1/drill-assignments/${encodeURIComponent(assignmentId)}/completion`,
    {
      method: 'PATCH',
      body: JSON.stringify(drillCompletionRequestBody(completed, athleteFeedbackOrOptions)),
    },
  );
  if (!result.success) {
    if (result.error.code === 'NOT_FOUND') {
      return null;
    }
    throw new Error(result.error.message);
  }
  return result.data.assignment ? mapApiAssignment(result.data.assignment) : null;
}

async function deleteApiDrillAssignment(assignmentId: string): Promise<boolean> {
  const result = await apiFetch<ApiDrillAssignmentMutationResponse>(
    `/v1/drill-assignments/${encodeURIComponent(assignmentId)}`,
    {
      method: 'DELETE',
    },
  );
  if (!result.success) {
    if (result.error.code === 'NOT_FOUND') {
      return false;
    }
    throw new Error(result.error.message);
  }
  return result.data.removed === true || Boolean(result.data.assignment);
}

function throwUnsupportedDrillMutation(action: string, route: string): never {
  throw new Error(`${action} requires backend drill mutation authority in API mode: ${route}`);
}

// Using centralized storage keys

// Mock data for demonstration
const MOCK_DRILLS: Drill[] = [
  {
    id: 'drill_1',
    coachId: 'coach1',
    title: 'Ball Juggling Challenge',
    description:
      'Practice juggling the ball with both feet, thighs, and head. Start with 10 touches and work up to 50 consecutive touches without the ball touching the ground.',
    category: 'TECHNIQUE',
    videoUrl: 'https://example.com/videos/juggling.mp4',
    thumbnailUrl: 'https://example.com/thumbnails/juggling.jpg',
    duration: 15,
    difficulty: 'BEGINNER',
    equipment: ['Football'],
    tags: ['ball control', 'touch', 'coordination'],
    assignmentCount: 12,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'drill_2',
    coachId: 'coach1',
    title: 'Sprint Intervals',
    description:
      'Perform 10 x 30m sprints with 30 seconds rest between each. Focus on explosive starts and proper running form.',
    category: 'FITNESS',
    duration: 20,
    difficulty: 'INTERMEDIATE',
    equipment: ['Cones', 'Stopwatch'],
    tags: ['speed', 'endurance', 'agility'],
    assignmentCount: 8,
    createdAt: '2026-01-02T09:00:00Z',
    updatedAt: '2026-01-02T09:00:00Z',
  },
  {
    id: 'drill_3',
    coachId: 'coach1',
    title: 'Dynamic Warm-up Routine',
    description:
      'Complete warm-up sequence: high knees, butt kicks, leg swings, lunges with twist, and arm circles. 2 sets of each exercise.',
    category: 'WARMUP',
    videoUrl: 'https://example.com/videos/warmup.mp4',
    thumbnailUrl: 'https://example.com/thumbnails/warmup.jpg',
    duration: 10,
    difficulty: 'BEGINNER',
    tags: ['warm-up', 'mobility', 'preparation'],
    assignmentCount: 25,
    createdAt: '2026-01-03T08:00:00Z',
    updatedAt: '2026-01-03T08:00:00Z',
  },
  {
    id: 'drill_4',
    coachId: 'coach1',
    title: 'Wall Pass Technique',
    description:
      'Using a wall, practice one-touch passing with both feet. Complete 50 passes with each foot, focusing on proper technique and receiving the ball cleanly.',
    category: 'TECHNIQUE',
    videoUrl: 'https://example.com/videos/wallpass.mp4',
    thumbnailUrl: 'https://example.com/thumbnails/wallpass.jpg',
    duration: 15,
    difficulty: 'BEGINNER',
    equipment: ['Football', 'Wall'],
    tags: ['passing', 'first touch', 'technique'],
    assignmentCount: 18,
    createdAt: '2026-01-04T11:00:00Z',
    updatedAt: '2026-01-04T11:00:00Z',
  },
  {
    id: 'drill_5',
    coachId: 'coach1',
    title: 'Cone Dribbling Course',
    description:
      'Set up 8 cones in a zig-zag pattern. Dribble through the course using inside and outside of both feet. Time yourself and try to improve each run.',
    category: 'TECHNIQUE',
    videoUrl: 'https://example.com/videos/dribbling.mp4',
    thumbnailUrl: 'https://example.com/thumbnails/dribbling.jpg',
    duration: 20,
    difficulty: 'INTERMEDIATE',
    equipment: ['Football', 'Cones (8)', 'Stopwatch'],
    tags: ['dribbling', 'close control', 'agility'],
    assignmentCount: 15,
    createdAt: '2026-01-05T14:00:00Z',
    updatedAt: '2026-01-05T14:00:00Z',
  },
  {
    id: 'drill_6',
    coachId: 'coach1',
    title: 'Tactical Positioning Awareness',
    description:
      'Watch the provided match analysis video and identify 5 instances of good defensive positioning and 5 instances where positioning could be improved. Write brief notes on each.',
    category: 'TACTICAL',
    videoUrl: 'https://example.com/videos/tactics.mp4',
    thumbnailUrl: 'https://example.com/thumbnails/tactics.jpg',
    duration: 30,
    difficulty: 'ADVANCED',
    tags: ['tactics', 'positioning', 'game intelligence'],
    assignmentCount: 5,
    createdAt: '2026-01-06T16:00:00Z',
    updatedAt: '2026-01-06T16:00:00Z',
  },
  {
    id: 'drill_7',
    coachId: 'coach1',
    title: 'Cool-down Stretching',
    description:
      'Post-training stretching routine: hold each stretch for 30 seconds. Include quadriceps, hamstrings, hip flexors, calves, and upper body stretches.',
    category: 'COOLDOWN',
    duration: 10,
    difficulty: 'BEGINNER',
    tags: ['stretching', 'recovery', 'flexibility'],
    assignmentCount: 20,
    createdAt: '2026-01-07T17:00:00Z',
    updatedAt: '2026-01-07T17:00:00Z',
  },
];
const MOCK_ASSIGNMENTS: AssignedDrill[] = [
  {
    id: 'assign_1',
    drillId: 'drill_1',
    athleteId: 'user1',
    assignedBy: 'coach1',
    assignedAt: '2026-01-08T09:00:00Z',
    dueDate: '2026-01-15T23:59:59Z',
    isCompleted: false,
    notes:
      'Focus on keeping your head up while juggling. Try to increase your count by 5 each day.',
    requiresEvidence: true,
    repetitions: 3,
    priority: 1,
  },
  {
    id: 'assign_2',
    drillId: 'drill_3',
    athleteId: 'user1',
    assignedBy: 'coach1',
    assignedAt: '2026-01-08T09:00:00Z',
    dueDate: '2026-01-12T23:59:59Z',
    isCompleted: true,
    completedAt: '2026-01-10T18:30:00Z',
    notes: 'Do this before every practice session.',
    priority: 2,
  },
  {
    id: 'assign_3',
    drillId: 'drill_4',
    athleteId: 'user1',
    assignedBy: 'coach1',
    assignedAt: '2026-01-09T10:00:00Z',
    dueDate: '2026-01-16T23:59:59Z',
    isCompleted: false,
    notes:
      'Work on your weaker foot especially. Try to get the ball to come back at the same pace.',
    repetitions: 2,
    priority: 1,
  },
  {
    id: 'assign_4',
    drillId: 'drill_2',
    athleteId: 'user1',
    assignedBy: 'coach1',
    assignedAt: '2026-01-07T08:00:00Z',
    dueDate: '2026-01-10T23:59:59Z',
    isCompleted: false,
    notes: 'Build up your sprint speed gradually. Listen to your body.',
    priority: 3,
  },
  {
    id: 'assign_5',
    drillId: 'drill_5',
    athleteId: 'user2',
    assignedBy: 'coach1',
    assignedAt: '2026-01-08T11:00:00Z',
    dueDate: '2026-01-14T23:59:59Z',
    isCompleted: false,
    notes: 'Time each run and track your progress.',
    repetitions: 5,
    priority: 1,
  },
];

/**
 * Get all drills from storage
 */
async function getAllDrills(): Promise<Drill[]> {
  const drills = await apiClient.get<Drill[]>(STORAGE_KEYS.DRILLS, []);
  if (drills.length === 0) {
    return [...MOCK_DRILLS];
  }
  return drills;
}

/**
 * Save all drills to storage
 */
async function saveDrills(drills: Drill[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.DRILLS, drills);
}

/**
 * Get all assignments from storage
 */
async function getAllAssignments(): Promise<AssignedDrill[]> {
  const assignments = await apiClient.get<AssignedDrill[]>(STORAGE_KEYS.DRILL_ASSIGNMENTS, []);
  if (assignments.length === 0) {
    return [...MOCK_ASSIGNMENTS];
  }
  return assignments;
}

/**
 * Save all assignments to storage
 */
async function saveAssignments(assignments: AssignedDrill[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.DRILL_ASSIGNMENTS, assignments);
}

/**
 * Get a coach's drill library
 * @param coachId - The coach's user ID
 * @returns Array of drills created by the coach
 */
async function getDrillLibrary(coachId: string): Promise<Drill[]> {
  if (!apiClient.isMockMode) {
    const drills = (await fetchApiDrills(coachId)).map(mapApiDrill);
    return drills.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  const drills = await getAllDrills();
  const coachDrills = drills.filter((d) => d.coachId === coachId);

  // Sort by most recently updated
  return coachDrills.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/**
 * Get a single drill by ID
 * @param drillId - The drill ID
 * @returns The drill or null if not found
 */
async function getDrillById(drillId: string): Promise<Drill | null> {
  if (!apiClient.isMockMode) {
    const drill = await fetchApiDrill(drillId);
    return drill ? mapApiDrill(drill) : null;
  }

  const drills = await getAllDrills();
  return drills.find((d) => d.id === drillId) ?? null;
}

/**
 * Create a new drill in the coach's library
 * @param coachId - The coach's user ID
 * @param _coachName - Reserved for compatibility with existing call sites
 * @param params - Drill creation parameters
 * @returns The created drill
 */
async function createDrill(
  coachId: string,
  _coachName: string,
  params: CreateDrillInput,
): Promise<Drill> {
  if (!apiClient.isMockMode) {
    return mapApiDrill(await postApiDrill(coachId, params));
  }

  const drills = await getAllDrills();
  const now = new Date().toISOString();
  const newDrill: Drill = {
    id: `drill_${Date.now()}`,
    coachId,
    title: params.title,
    description: params.description,
    category: params.category,
    videoUrl: params.videoUrl,
    thumbnailUrl: params.thumbnailUrl,
    duration: params.duration,
    difficulty: params.difficulty,
    equipment: params.equipment,
    tags: params.tags,
    assignmentCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  drills.unshift(newDrill);
  await saveDrills(drills);
  logger.info('drill_created', {
    drillId: newDrill.id,
    coachId,
    category: params.category,
    difficulty: params.difficulty,
  });
  return newDrill;
}

/**
 * Update an existing drill
 * @param drillId - The drill ID
 * @param updates - Partial drill fields to update
 * @returns The updated drill or null if not found
 */
async function updateDrill(
  drillId: string,
  updates: Partial<CreateDrillInput>,
): Promise<Drill | null> {
  if (!apiClient.isMockMode) {
    const drill = await patchApiDrill(drillId, updates);
    return drill ? mapApiDrill(drill) : null;
  }

  const drills = await getAllDrills();
  const drillIndex = drills.findIndex((d) => d.id === drillId);
  if (drillIndex === -1) {
    logger.warn('drill_not_found', {
      drillId,
    });
    return null;
  }
  const drill = drills[drillIndex];
  const updatedDrill: Drill = {
    ...drill,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  drills[drillIndex] = updatedDrill;
  await saveDrills(drills);
  logger.info('drill_updated', {
    drillId,
    updates: Object.keys(updates),
  });
  return updatedDrill;
}

/**
 * Delete a drill from the library
 * @param drillId - The drill ID
 * @returns True if deleted, false if not found
 */
async function deleteDrill(drillId: string): Promise<boolean> {
  if (!apiClient.isMockMode) {
    return deleteApiDrill(drillId);
  }

  const drills = await getAllDrills();
  const drillIndex = drills.findIndex((d) => d.id === drillId);
  if (drillIndex === -1) {
    logger.warn('drill_not_found_for_delete', {
      drillId,
    });
    return false;
  }
  drills.splice(drillIndex, 1);
  await saveDrills(drills);
  logger.info('drill_deleted', {
    drillId,
  });
  return true;
}

/**
 * Assign a drill to an athlete
 * @param drillId - The drill to assign
 * @param athleteId - The athlete's user ID
 * @param athleteName - The athlete's name for display
 * @param assignedBy - The coach's user ID
 * @param assignedByName - The coach's name for display
 * @param params - Assignment parameters (dueDate, notes, etc.)
 * @returns The created assignment
 */
async function assignDrill(
  drillId: string,
  athleteId: string,
  athleteName: string,
  assignedBy: string,
  assignedByName: string,
  params: AssignDrillInput,
): Promise<Result<AssignedDrill, ServiceError>> {
  if (!apiClient.isMockMode) {
    return postApiDrillAssignment(drillId, athleteId, params);
  }

  const [assignments, drills] = await Promise.all([getAllAssignments(), getAllDrills()]);

  // Get the drill details
  const drill = drills.find((d) => d.id === drillId);
  if (!drill) {
    return err(notFound('Drill', drillId));
  }
  const newAssignment: AssignedDrill = {
    id: `assign_${Date.now()}`,
    drillId,
    drill,
    athleteId,
    assignedBy,
    assignedAt: new Date().toISOString(),
    dueDate: params.dueDate,
    isCompleted: false,
    notes: params.notes,
    repetitions: params.repetitions,
    priority: params.priority ?? 2,
  };
  assignments.unshift(newAssignment);
  // Increment assignment count on the drill
  const drillIndex = drills.findIndex((d) => d.id === drillId);
  if (drillIndex !== -1) {
    drills[drillIndex].assignmentCount = (drills[drillIndex].assignmentCount ?? 0) + 1;
  }
  await Promise.all([
    saveAssignments(assignments),
    drillIndex !== -1 ? saveDrills(drills) : Promise.resolve(),
  ]);
  logger.info('drill_assigned', {
    assignmentId: newAssignment.id,
    drillId,
    athleteId,
    dueDate: params.dueDate,
  });

  // Notify parent that a drill has been assigned to their athlete
  const [coachDisplayName, athleteDisplayName, athleteChildProfile] = await Promise.all([
    assignedByName?.trim() ? Promise.resolve(assignedByName) : resolveUserName(assignedBy, 'Coach'),
    athleteName?.trim() ? Promise.resolve(athleteName) : resolveUserName(athleteId, 'Athlete'),
    childService.getChild(athleteId),
  ]);
  const recipientId = athleteChildProfile?.parentId || athleteId;
  await notificationTriggers.drillAssigned(
    coachDisplayName,
    drill.title,
    athleteDisplayName,
    recipientId,
  );
  return ok(newAssignment);
}

/**
 * Get all assignments for an athlete
 * @param athleteId - The athlete's user ID
 * @param includeCompleted - Whether to include completed assignments (default: true)
 * @returns Array of assigned drills with drill details
 */
async function getAthleteAssignments(
  athleteId: string,
  includeCompleted: boolean = true,
): Promise<AssignedDrill[]> {
  if (!apiClient.isMockMode) {
    const assignments = await fetchApiAthleteAssignments(athleteId, includeCompleted);
    return assignments.map(mapApiAssignment);
  }

  const [assignments, drills] = await Promise.all([getAllAssignments(), getAllDrills()]);
  let athleteAssignments = assignments.filter((a) => a.athleteId === athleteId);
  if (!includeCompleted) {
    athleteAssignments = athleteAssignments.filter((a) => !a.isCompleted);
  }

  // Attach drill details to each assignment
  const withDrills = athleteAssignments.map((assignment) => ({
    ...assignment,
    drill: drills.find((d) => d.id === assignment.drillId),
  }));

  // Sort by priority (highest first), then by due date (soonest first)
  return withDrills.sort((a, b) => {
    // Completed assignments go to the end
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    // Sort by priority
    if ((a.priority ?? 2) !== (b.priority ?? 2)) {
      return (a.priority ?? 2) - (b.priority ?? 2);
    }
    // Sort by due date
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

/**
 * Get a single assignment by ID
 * @param assignmentId - The assignment ID
 * @returns The assignment with drill details or null if not found
 */
async function getAssignmentById(assignmentId: string): Promise<AssignedDrill | null> {
  if (!apiClient.isMockMode) {
    logger.warn('drill_assignment_detail_api_route_missing', {
      assignmentId,
      route: '/v1/drill-assignments/:assignmentId',
    });
    return null;
  }

  const [assignments, drills] = await Promise.all([getAllAssignments(), getAllDrills()]);
  const assignment = assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return null;
  }
  return {
    ...assignment,
    drill: drills.find((d) => d.id === assignment.drillId),
  };
}

/**
 * Mark a drill assignment as completed
 * @param assignmentId - The assignment ID
 * @param athleteFeedback - Optional feedback from the athlete
 * @returns The updated assignment or null if not found
 */
async function completeDrill(
  assignmentId: string,
  athleteFeedbackOrOptions?:
    | string
    | {
        athleteFeedback?: string;
        evidenceVideoUri?: string;
        evidenceNotes?: string;
      },
): Promise<AssignedDrill | null> {
  if (!apiClient.isMockMode) {
    return patchApiAssignmentCompletion(assignmentId, true, athleteFeedbackOrOptions);
  }

  const assignments = await getAllAssignments();
  const assignmentIndex = assignments.findIndex((a) => a.id === assignmentId);
  if (assignmentIndex === -1) {
    logger.warn('assignment_not_found', {
      assignmentId,
    });
    return null;
  }
  const assignment = assignments[assignmentIndex];
  const options =
    typeof athleteFeedbackOrOptions === 'string'
      ? {
          athleteFeedback: athleteFeedbackOrOptions,
        }
      : (athleteFeedbackOrOptions ?? {});
  if (assignment.isCompleted) {
    logger.info('assignment_already_completed', {
      assignmentId,
    });
    return assignment;
  }
  const updatedAssignment: AssignedDrill = {
    ...assignment,
    isCompleted: true,
    completedAt: new Date().toISOString(),
    athleteFeedback: options.athleteFeedback,
    evidenceVideoUri: options.evidenceVideoUri,
    evidenceNotes: options.evidenceNotes,
  };
  assignments[assignmentIndex] = updatedAssignment;
  const [drills, athleteName] = await Promise.all([
    getAllDrills(),
    resolveUserName(assignment.athleteId, 'Athlete'),
    saveAssignments(assignments),
  ]);
  logger.info('drill_completed', {
    assignmentId,
    drillId: assignment.drillId,
    athleteId: assignment.athleteId,
  });

  // Notify coach that the athlete completed the drill
  const completedDrill = drills.find((d) => d.id === assignment.drillId);
  await notificationTriggers.drillCompleted(
    athleteName,
    completedDrill?.title || 'Drill',
    assignment.assignedBy,
  );
  return updatedAssignment;
}

/**
 * Mark a drill assignment as incomplete (undo completion)
 * @param assignmentId - The assignment ID
 * @returns The updated assignment or null if not found
 */
async function uncompleteDrill(assignmentId: string): Promise<AssignedDrill | null> {
  if (!apiClient.isMockMode) {
    return patchApiAssignmentCompletion(assignmentId, false);
  }

  const assignments = await getAllAssignments();
  const assignmentIndex = assignments.findIndex((a) => a.id === assignmentId);
  if (assignmentIndex === -1) {
    logger.warn('assignment_not_found', {
      assignmentId,
    });
    return null;
  }
  const assignment = assignments[assignmentIndex];
  const updatedAssignment: AssignedDrill = {
    ...assignment,
    isCompleted: false,
    completedAt: undefined,
    evidenceVideoUri: undefined,
    evidenceNotes: undefined,
  };
  assignments[assignmentIndex] = updatedAssignment;
  await saveAssignments(assignments);
  logger.info('drill_uncompleted', {
    assignmentId,
    drillId: assignment.drillId,
    athleteId: assignment.athleteId,
  });
  return updatedAssignment;
}

/**
 * Delete an assignment
 * @param assignmentId - The assignment ID
 * @returns True if deleted, false if not found
 */
async function deleteAssignment(assignmentId: string): Promise<boolean> {
  if (!apiClient.isMockMode) {
    return deleteApiDrillAssignment(assignmentId);
  }

  const assignments = await getAllAssignments();
  const assignmentIndex = assignments.findIndex((a) => a.id === assignmentId);
  if (assignmentIndex === -1) {
    logger.warn('assignment_not_found_for_delete', {
      assignmentId,
    });
    return false;
  }
  assignments.splice(assignmentIndex, 1);
  await saveAssignments(assignments);
  logger.info('assignment_deleted', {
    assignmentId,
  });
  return true;
}

/**
 * Get assignment statistics for an athlete
 * @param athleteId - The athlete's user ID
 * @returns Assignment statistics
 */
async function getAssignmentStats(athleteId: string): Promise<DrillAssignmentStats> {
  const assignments = await getAthleteAssignments(athleteId, true);
  const now = new Date();
  const completed = assignments.filter((a) => a.isCompleted);
  const pending = assignments.filter((a) => !a.isCompleted);
  const overdue = pending.filter((a) => new Date(a.dueDate) < now);

  // Calculate by category
  const categories: DrillCategory[] = ['WARMUP', 'TECHNIQUE', 'FITNESS', 'COOLDOWN', 'TACTICAL'];
  const byCategory = {} as Record<
    DrillCategory,
    {
      total: number;
      completed: number;
    }
  >;
  for (const cat of categories) {
    const catAssignments = assignments.filter((a) => a.drill?.category === cat);
    byCategory[cat] = {
      total: catAssignments.length,
      completed: catAssignments.filter((a) => a.isCompleted).length,
    };
  }

  // Calculate completion streak
  let currentStreak = 0;
  const completedDates = Array.from(
    new Set(
      completed.flatMap((a) => {
        if (!a.completedAt) return [];
        const date = new Date(a.completedAt as string);
        return [toDateStr(date)];
      }),
    ),
  )
    .sort()
    .reverse();

  // Count consecutive days from today
  const today = new Date();
  const completedDateSet = new Set(completedDates);
  for (let i = 0; i < completedDates.length; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const checkKey = toDateStr(checkDate);
    if (completedDateSet.has(checkKey)) {
      currentStreak++;
    } else {
      break;
    }
  }
  return {
    totalAssigned: assignments.length,
    completed: completed.length,
    pending: pending.length,
    overdue: overdue.length,
    completionRate:
      assignments.length > 0 ? Math.round((completed.length / assignments.length) * 100) : 0,
    byCategory,
    currentStreak,
  };
}

/**
 * Check if an assignment is overdue
 * @param assignment - The assignment to check
 * @returns True if the assignment is overdue
 */
function isOverdue(assignment: AssignedDrill): boolean {
  if (assignment.isCompleted) return false;
  const dueDate = new Date(assignment.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

/**
 * Check if an assignment is due soon (within 2 days)
 * @param assignment - The assignment to check
 * @returns True if the assignment is due within 2 days
 */
function isDueSoon(assignment: AssignedDrill): boolean {
  if (assignment.isCompleted) return false;
  const dueDate = new Date(assignment.dueDate);
  const today = new Date();
  const twoDaysFromNow = new Date(today);
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
  today.setHours(0, 0, 0, 0);
  return dueDate >= today && dueDate <= twoDaysFromNow;
}

/**
 * Format a due date for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Get display info for drill categories
 */
function getCategoryInfo(category: DrillCategory): {
  label: string;
  icon: string;
  color: string;
} {
  const categoryInfo: Record<
    DrillCategory,
    {
      label: string;
      icon: string;
      color: string;
    }
  > = {
    WARMUP: {
      label: 'Warm-up',
      icon: 'flame',
      color: '#F59E0B',
    },
    TECHNIQUE: {
      label: 'Technique',
      icon: 'football',
      color: '#3B82F6',
    },
    FITNESS: {
      label: 'Fitness',
      icon: 'fitness',
      color: '#10B981',
    },
    COOLDOWN: {
      label: 'Cool-down',
      icon: 'snow',
      color: '#6366F1',
    },
    TACTICAL: {
      label: 'Tactical',
      icon: 'bulb',
      color: '#8B5CF6',
    },
  };
  return categoryInfo[category] ?? categoryInfo.TECHNIQUE;
}

/**
 * Get display info for drill difficulty
 */
function getDifficultyInfo(difficulty: DrillDifficulty): {
  label: string;
  color: string;
  bgColor: string;
} {
  const difficultyInfo: Record<
    DrillDifficulty,
    {
      label: string;
      color: string;
      bgColor: string;
    }
  > = {
    BEGINNER: {
      label: 'Beginner',
      color: '#10B981',
      bgColor: '#D1FAE5',
    },
    INTERMEDIATE: {
      label: 'Intermediate',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
    },
    ADVANCED: {
      label: 'Advanced',
      color: '#EF4444',
      bgColor: '#FEE2E2',
    },
  };
  return difficultyInfo[difficulty] ?? difficultyInfo.BEGINNER;
}

/**
 * Format duration for display
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Reset to mock data (for development/testing)
 */
async function resetToMockData(): Promise<void> {
  if (!apiClient.isMockMode) {
    throwUnsupportedDrillMutation('Drill mock reset', 'mock mode only');
  }

  await saveDrills([...MOCK_DRILLS]);
  await saveAssignments([...MOCK_ASSIGNMENTS]);
  logger.info('drills_reset_to_mock');
}

// Export the service
export const drillService = {
  // Drill library operations
  getDrillLibrary,
  getDrillById,
  createDrill,
  updateDrill,
  deleteDrill,
  // Assignment operations
  assignDrill,
  getAthleteAssignments,
  getAssignmentById,
  completeDrill,
  uncompleteDrill,
  deleteAssignment,
  // Statistics
  getAssignmentStats,
  // Helpers
  isOverdue,
  isDueSoon,
  formatDueDate,
  getCategoryInfo,
  getDifficultyInfo,
  formatDuration,
  // Development
  resetToMockData,
};
