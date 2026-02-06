/**
 * Skill Types
 *
 * Skill progression trees, badges, goals, milestones,
 * and player analytics types.
 */

import type { FootballObjective } from './user-types';
import type { BadgeCategory, BadgeTier } from './user-types';

// ============================================================================
// BADGE AWARDS
// ============================================================================

export type BadgeVisibility = 'coach_only' | 'athlete' | 'supporters';

export type VideoVisibility = 'PRIVATE' | 'SHARED' | 'PUBLIC';

export interface BadgeAward {
  id: string;
  badgeId: string;
  badgeLabel: string;
  badgeTone?: 'success' | 'warning' | 'default';
  athleteId: string;
  athleteName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  coachId: string;
  coachName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from coachId instead
  sessionId?: string;
  reason: string;
  note?: string;
  presetId?: string;
  cooldownBypassed?: boolean;
  cooldownWindowDays?: number;
  context?: 'session' | 'athlete_profile';
  overrideNote?: string;
  awardedBy: string;
  awardedByName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from awardedBy instead
  awardedAt: string;
  visibility: BadgeVisibility;
  shared?: boolean;
  feedPostId?: string;
  // Parent view tracking
  seenByParent?: boolean;
  seenAt?: string;
  // Progression fields (copied from badge definition at award time)
  badgeCategory?: BadgeCategory;
  badgeTier?: BadgeTier;
  badgePointValue?: number;
}

// ============================================================================
// PLAYER ANALYTICS & PROGRESS
// ============================================================================

export interface SkillProgress {
  skillName: string;
  category: string;
  currentLevel: number;
  previousLevel: number;
  changePercent: number;
  history: { date: string; level: number }[];
}

// ============================================================================
// SKILL PROGRESSION TREES
// ============================================================================

/**
 * Category of skill tree (maps to training focus areas)
 */
export type SkillTreeCategory =
  | 'DRIBBLING'
  | 'PASSING'
  | 'SHOOTING'
  | 'DEFENDING'
  | 'GOALKEEPING'
  | 'FITNESS'
  | 'TACTICS';

/**
 * A single node in the skill tree representing a learnable skill
 */
export interface SkillNode {
  /** Unique identifier for the skill node */
  id: string;
  /** Display name of the skill */
  name: string;
  /** Brief description of what this skill involves */
  description: string;
  /** Skill level tier (1 = beginner, 2 = intermediate, 3 = advanced) */
  level: 1 | 2 | 3;
  /** IDs of prerequisite skills that must be unlocked first */
  prerequisites: string[];
  /** Optional badge ID awarded when this skill is unlocked */
  badgeId?: string;
  /** Whether the skill is currently unlocked for the user */
  isUnlocked: boolean;
  /** Progress toward unlocking (0-100) */
  progress: number;
  /** Icon name for display (Ionicons) */
  icon: string;
  /** Position in the visual tree layout */
  position: {
    x: number;
    y: number;
  };
  /** XP required to unlock this skill */
  xpRequired: number;
  /** Current XP earned toward this skill */
  xpCurrent: number;
}

/**
 * A complete skill tree for a specific category
 */
export interface SkillTree {
  /** Unique identifier for the skill tree */
  id: string;
  /** Category this tree belongs to */
  category: SkillTreeCategory;
  /** Display name of the skill tree */
  name: string;
  /** Description of what this tree covers */
  description: string;
  /** Icon for the tree category */
  icon: string;
  /** All nodes in this tree */
  nodes: SkillNode[];
  /** Total number of nodes */
  totalNodes: number;
  /** Number of unlocked nodes */
  unlockedNodes: number;
  /** Overall progress percentage */
  progressPercent: number;
  /** Color theme for the tree */
  themeColor: string;
}

/**
 * User's progress on a specific skill node
 */
export interface SkillNodeProgress {
  /** Reference to the skill node */
  nodeId: string;
  /** Current XP earned for this skill */
  currentXp: number;
  /** Maximum XP needed to fully unlock */
  maxXp: number;
  /** Current level achieved (0 = locked, 1-3 = unlocked tier) */
  currentLevel: number;
  /** Maximum level for this skill */
  maxLevel: number;
  /** Whether currently unlocked */
  isUnlocked: boolean;
  /** Timestamp when unlocked */
  unlockedAt?: string;
  /** Timestamp of last progress update */
  lastUpdatedAt: string;
}

/**
 * User's overall progress on a skill tree
 */
export interface SkillTreeProgress {
  /** User ID */
  userId: string;
  /** Tree ID */
  treeId: string;
  /** Category of the tree */
  category: SkillTreeCategory;
  /** Progress for each node */
  nodeProgress: Record<string, SkillNodeProgress>;
  /** Total XP earned in this tree */
  totalXp: number;
  /** Number of nodes unlocked */
  nodesUnlocked: number;
  /** Total number of nodes */
  totalNodes: number;
  /** Overall percentage complete */
  percentComplete: number;
  /** When progress was last updated */
  lastUpdatedAt: string;
}

// ============================================================================
// GOALS & MILESTONES SYSTEM
// ============================================================================

/**
 * Status of a goal
 */
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'ABANDONED';

/**
 * Category of a goal for grouping and filtering
 */
export type GoalCategory = 'SPEED' | 'TECHNIQUE' | 'FITNESS' | 'TACTICAL' | 'MENTAL' | 'OTHER';

/**
 * Who created the goal
 */
export type GoalCreator = 'COACH' | 'ATHLETE' | 'PARENT';

/**
 * A milestone is a specific checkpoint towards achieving a goal
 */
export interface GoalMilestone {
  /** Unique identifier for the milestone */
  id: string;
  /** Reference to the parent goal */
  goalId: string;
  /** Title/description of the milestone */
  title: string;
  /** Whether the milestone has been completed */
  isCompleted: boolean;
  /** Timestamp when the milestone was completed */
  completedAt?: string;
  /** Order in the milestone list (for sorting) */
  order: number;
}

/**
 * A goal represents a specific training objective for an athlete
 */
export interface Goal {
  /** Unique identifier for the goal */
  id: string;
  /** User ID of the athlete this goal belongs to (alias: athleteId for backward compat) */
  userId: string;
  /** Backward compatibility alias for userId */
  athleteId: string;
  /** Title of the goal */
  title: string;
  /** Detailed description of what the goal entails */
  description?: string;
  /** Category for grouping and filtering */
  category: GoalCategory;
  /** Target date to achieve the goal */
  targetDate?: string;
  /** Current status of the goal */
  status: GoalStatus;
  /** Progress percentage (0-100), calculated from milestones or manually set */
  progress: number;
  /** Milestones that make up the goal */
  milestones: GoalMilestone[];
  /** Who created this goal */
  createdBy: GoalCreator;
  /** User ID of the creator */
  createdById: string;
  /** Timestamp when the goal was created */
  createdAt: string;
  /** Timestamp when the goal was last updated */
  updatedAt: string;
  /** Whether the coach has verified this goal */
  coachVerified?: boolean;
  /** When the coach verified this goal */
  coachVerifiedAt?: string;
  /** Whether the parent has acknowledged this goal */
  parentAcknowledged?: boolean;
  /** When the parent acknowledged this goal */
  parentAcknowledgedAt?: string;
}

/**
 * Input for creating a new goal
 */
export interface CreateGoalInput {
  /** Title of the goal */
  title: string;
  /** Detailed description */
  description?: string;
  /** Category for grouping */
  category: GoalCategory;
  /** Target date to achieve */
  targetDate?: string;
  /** Initial milestones (titles only) */
  milestones?: string[];
}

/**
 * Input for updating an existing goal
 */
export interface UpdateGoalInput {
  /** Updated title */
  title?: string;
  /** Updated description */
  description?: string;
  /** Updated category */
  category?: GoalCategory;
  /** Updated target date */
  targetDate?: string;
  /** Updated status */
  status?: GoalStatus;
}

export interface AthleteAnalytics {
  athleteId: string;
  athleteName: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  period: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';
  totalSessions: number;
  sessionsThisPeriod: number;
  averageSessionRating: number;
  attendanceRate: number;
  skills: SkillProgress[];
  activeGoals: Goal[];
  completedGoals: Goal[];
  improvementRate: number;
  consistencyScore: number;
  percentileRank: number;
  lastSessionDate?: string;
  nextSessionDate?: string;
}

// ============================================================================
// HOMEWORK & DRILLS SYSTEM
// ============================================================================

/**
 * Difficulty level of a drill
 */
export type DrillDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/**
 * Category of drill for organization and filtering
 */
export type DrillCategory = 'WARMUP' | 'TECHNIQUE' | 'FITNESS' | 'COOLDOWN' | 'TACTICAL';

/**
 * A drill is a reusable exercise that coaches can assign to athletes.
 */
export interface Drill {
  /** Unique identifier for the drill */
  id: string;
  /** ID of the coach who created this drill */
  coachId: string;
  /** Name of the coach for display purposes */
  coachName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from coachId instead
  /** Title of the drill (e.g., "Ball Juggling", "Sprint Intervals") */
  title: string;
  /** Detailed description of how to perform the drill */
  description: string;
  /** Category for organization and filtering */
  category: DrillCategory;
  /** URL to a video demonstration (optional) */
  videoUrl?: string;
  /** Thumbnail URL for the video */
  thumbnailUrl?: string;
  /** Estimated duration in minutes */
  duration: number;
  /** Difficulty level of the drill */
  difficulty: DrillDifficulty;
  /** Equipment needed for this drill */
  equipment?: string[];
  /** Tags for searching and filtering */
  tags?: string[];
  /** Number of times this drill has been assigned */
  assignmentCount?: number;
  /** When the drill was created */
  createdAt: string;
  /** When the drill was last updated */
  updatedAt: string;
}

/**
 * An assigned drill represents a specific drill assigned to an athlete.
 */
export interface AssignedDrill {
  /** Unique identifier for the assignment */
  id: string;
  /** Reference to the drill being assigned */
  drillId: string;
  /** Cached drill details for display */
  drill?: Drill;
  /** ID of the athlete this drill is assigned to */
  athleteId: string;
  /** Name of the athlete for display */
  athleteName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  /** ID of the coach who assigned the drill */
  assignedBy: string;
  /** Name of the assigning coach for display */
  assignedByName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from assignedBy instead
  /** When the drill was assigned (ISO string) */
  assignedAt: string;
  /** Due date for completion (ISO string) */
  dueDate: string;
  /** Whether the athlete has completed the drill */
  isCompleted: boolean;
  /** When the drill was completed (ISO string) */
  completedAt?: string;
  /** Optional notes from the coach to the athlete */
  notes?: string;
  /** Optional feedback from the athlete upon completion */
  athleteFeedback?: string;
  /** Number of repetitions or sets required */
  repetitions?: number;
  /** Priority level (1 = highest) */
  priority?: number;
}

/**
 * Input for creating a new drill in the library
 */
export interface CreateDrillInput {
  /** Title of the drill */
  title: string;
  /** Detailed description */
  description: string;
  /** Category for organization */
  category: DrillCategory;
  /** URL to video demonstration */
  videoUrl?: string;
  /** Thumbnail URL for the video */
  thumbnailUrl?: string;
  /** Duration in minutes */
  duration: number;
  /** Difficulty level */
  difficulty: DrillDifficulty;
  /** Required equipment */
  equipment?: string[];
  /** Searchable tags */
  tags?: string[];
}

/**
 * Input for assigning a drill to an athlete
 */
export interface AssignDrillInput {
  /** Due date for the assignment */
  dueDate: string;
  /** Optional notes for the athlete */
  notes?: string;
  /** Number of repetitions or sets */
  repetitions?: number;
  /** Priority level */
  priority?: number;
}

/**
 * Statistics for drill assignments for an athlete
 */
export interface DrillAssignmentStats {
  /** Total number of drills assigned */
  totalAssigned: number;
  /** Number of drills completed */
  completed: number;
  /** Number of drills pending */
  pending: number;
  /** Number of overdue drills */
  overdue: number;
  /** Completion rate percentage (0-100) */
  completionRate: number;
  /** Breakdown by category */
  byCategory: Record<DrillCategory, { total: number; completed: number }>;
  /** Recent completion streak (consecutive days with completions) */
  currentStreak: number;
}
