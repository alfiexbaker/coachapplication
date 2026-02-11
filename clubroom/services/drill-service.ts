/**
 * Drill Service
 *
 * Handles drill library management and drill assignments for athletes.
 * Coaches create drills in their library and assign them to athletes as homework.
 * Athletes can view, complete, and track their assigned drills.
 *
 * API Integration Notes:
 * - POST /api/drills - Create drill
 * - GET /api/drills?coachId=X - Get coach's drill library
 * - GET /api/drills/:id - Get drill details
 * - PATCH /api/drills/:id - Update drill
 * - DELETE /api/drills/:id - Delete drill
 * - POST /api/assignments - Assign drill to athlete
 * - GET /api/assignments?athleteId=X - Get athlete's assignments
 * - PATCH /api/assignments/:id/complete - Complete assignment
 * - GET /api/assignments/:athleteId/stats - Get assignment statistics
 */

import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationTriggers } from './notification-trigger';
import { userService } from './user-service';
import { createLogger } from '../utils/logger';
import { toDateStr } from '@/utils/format';
import { type Result, type ServiceError, ok, err, notFound } from '@/types/result';
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

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) {
    return fallback;
  }

  return userResult.data.name?.trim() || fallback;
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
  const drills = await getAllDrills();
  const drillIndex = drills.findIndex((d) => d.id === drillId);

  if (drillIndex === -1) {
    logger.warn('drill_not_found', { drillId });
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
  const drills = await getAllDrills();
  const drillIndex = drills.findIndex((d) => d.id === drillId);

  if (drillIndex === -1) {
    logger.warn('drill_not_found_for_delete', { drillId });
    return false;
  }

  drills.splice(drillIndex, 1);
  await saveDrills(drills);

  logger.info('drill_deleted', { drillId });
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
  const assignments = await getAllAssignments();
  const drills = await getAllDrills();

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
  await saveAssignments(assignments);

  // Increment assignment count on the drill
  const drillIndex = drills.findIndex((d) => d.id === drillId);
  if (drillIndex !== -1) {
    drills[drillIndex].assignmentCount = (drills[drillIndex].assignmentCount ?? 0) + 1;
    await saveDrills(drills);
  }

  logger.info('drill_assigned', {
    assignmentId: newAssignment.id,
    drillId,
    athleteId,
    dueDate: params.dueDate,
  });

  // Notify parent that a drill has been assigned to their athlete
  const [coachDisplayName, athleteDisplayName] = await Promise.all([
    assignedByName?.trim() ? Promise.resolve(assignedByName) : resolveUserName(assignedBy, 'Coach'),
    athleteName?.trim() ? Promise.resolve(athleteName) : resolveUserName(athleteId, 'Athlete'),
  ]);
  await notificationTriggers.drillAssigned(coachDisplayName, drill.title, athleteDisplayName);

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
  const assignments = await getAllAssignments();
  const drills = await getAllDrills();

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
  const assignments = await getAllAssignments();
  const drills = await getAllDrills();

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
  athleteFeedback?: string,
): Promise<AssignedDrill | null> {
  const assignments = await getAllAssignments();
  const assignmentIndex = assignments.findIndex((a) => a.id === assignmentId);

  if (assignmentIndex === -1) {
    logger.warn('assignment_not_found', { assignmentId });
    return null;
  }

  const assignment = assignments[assignmentIndex];

  if (assignment.isCompleted) {
    logger.info('assignment_already_completed', { assignmentId });
    return assignment;
  }

  const updatedAssignment: AssignedDrill = {
    ...assignment,
    isCompleted: true,
    completedAt: new Date().toISOString(),
    athleteFeedback,
  };

  assignments[assignmentIndex] = updatedAssignment;
  await saveAssignments(assignments);

  logger.info('drill_completed', {
    assignmentId,
    drillId: assignment.drillId,
    athleteId: assignment.athleteId,
  });

  // Notify coach that the athlete completed the drill
  const drills = await getAllDrills();
  const completedDrill = drills.find((d) => d.id === assignment.drillId);
  const athleteName = await resolveUserName(assignment.athleteId, 'Athlete');
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
  const assignments = await getAllAssignments();
  const assignmentIndex = assignments.findIndex((a) => a.id === assignmentId);

  if (assignmentIndex === -1) {
    logger.warn('assignment_not_found', { assignmentId });
    return null;
  }

  const assignment = assignments[assignmentIndex];

  const updatedAssignment: AssignedDrill = {
    ...assignment,
    isCompleted: false,
    completedAt: undefined,
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
  const assignments = await getAllAssignments();
  const assignmentIndex = assignments.findIndex((a) => a.id === assignmentId);

  if (assignmentIndex === -1) {
    logger.warn('assignment_not_found_for_delete', { assignmentId });
    return false;
  }

  assignments.splice(assignmentIndex, 1);
  await saveAssignments(assignments);

  logger.info('assignment_deleted', { assignmentId });
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
  const byCategory = {} as Record<DrillCategory, { total: number; completed: number }>;

  for (const cat of categories) {
    const catAssignments = assignments.filter((a) => a.drill?.category === cat);
    byCategory[cat] = {
      total: catAssignments.length,
      completed: catAssignments.filter((a) => a.isCompleted).length,
    };
  }

  // Calculate completion streak
  let currentStreak = 0;
  const completedDates = completed
    .filter((a) => a.completedAt)
    .map((a) => {
      const date = new Date(a.completedAt as string);
      return toDateStr(date);
    })
    .filter((value, index, self) => self.indexOf(value) === index) // Unique dates
    .sort()
    .reverse();

  // Count consecutive days from today
  const today = new Date();
  for (let i = 0; i < completedDates.length; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const checkKey = toDateStr(checkDate);

    if (completedDates.includes(checkKey)) {
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
  const categoryInfo: Record<DrillCategory, { label: string; icon: string; color: string }> = {
    WARMUP: { label: 'Warm-up', icon: 'flame', color: '#F59E0B' },
    TECHNIQUE: { label: 'Technique', icon: 'football', color: '#3B82F6' },
    FITNESS: { label: 'Fitness', icon: 'fitness', color: '#10B981' },
    COOLDOWN: { label: 'Cool-down', icon: 'snow', color: '#6366F1' },
    TACTICAL: { label: 'Tactical', icon: 'bulb', color: '#8B5CF6' },
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
  const difficultyInfo: Record<DrillDifficulty, { label: string; color: string; bgColor: string }> =
    {
      BEGINNER: { label: 'Beginner', color: '#10B981', bgColor: '#D1FAE5' },
      INTERMEDIATE: { label: 'Intermediate', color: '#F59E0B', bgColor: '#FEF3C7' },
      ADVANCED: { label: 'Advanced', color: '#EF4444', bgColor: '#FEE2E2' },
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
