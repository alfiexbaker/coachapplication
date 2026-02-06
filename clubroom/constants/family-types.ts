/**
 * Family Types
 *
 * Family dashboard, family members, guardian management,
 * spending, calendar, and safety/emergency types.
 */

import type { SportCategory } from './user-types';
import type { BadgeAward } from './skill-types';

// ============================================================================
// FAMILY DASHBOARD
// ============================================================================

/**
 * Represents a family member (child) in the family dashboard
 */
export interface FamilyMember {
  /** Unique identifier for the family member */
  id: string;
  /** Display name of the family member */
  name: string;
  /** Avatar URL for the family member (optional) */
  avatar?: string;
  /** Relationship to the parent (e.g., 'son', 'daughter', 'ward') */
  relationship: 'son' | 'daughter' | 'ward' | 'other';
  /** Age of the family member */
  age: number;
  /** Color code for calendar events (hex color) */
  colorCode: string;
  /** Date of birth (ISO string) */
  dateOfBirth?: string;
  /** Skill level if applicable */
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';
  /** Primary sport or focus */
  primarySport?: SportCategory;
  /** Total sessions completed */
  totalSessions?: number;
  /** Total badges earned */
  totalBadges?: number;
  /** Whether the member is active */
  isActive: boolean;
  /** When the member was added to the family */
  addedAt: string;
}

// ============================================================================
// FAMILY SHARING & GUARDIAN MANAGEMENT
// ============================================================================

/**
 * Permission levels for guardians accessing family data
 */
export type GuardianPermission =
  | 'VIEW_SCHEDULE'    // View sessions and calendar
  | 'VIEW_PROGRESS'    // View badges, notes, progress
  | 'BOOK_SESSIONS'    // Book and cancel sessions
  | 'MANAGE_PAYMENTS'  // View and manage payments
  | 'MANAGE_PROFILE'   // Edit child profile
  | 'ADMIN';           // Full access including adding other guardians

/**
 * Guardian role types
 */
export type GuardianRole = 'PRIMARY' | 'GUARDIAN' | 'VIEWER';

/**
 * A guardian with access to the family account
 */
export interface FamilyGuardian {
  id: string;
  userId: string;
  userName: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  email: string;
  avatar?: string;
  /** Role in the family */
  role: GuardianRole;
  /** Specific permissions granted */
  permissions: GuardianPermission[];
  /** Relationship description (e.g., "Parent", "Grandparent", "Nanny") */
  relationship: string;
  /** Whether this guardian is the primary account holder */
  isPrimary: boolean;
  /** Children this guardian has access to (empty = all children) */
  childAccess: string[]; // Child IDs, empty array means all children
  /** When guardian was added */
  addedAt: string;
  /** Who invited this guardian */
  invitedBy?: string;
  /** Last active timestamp */
  lastActiveAt?: string;
}

/**
 * Status of a guardian invitation
 */
export type GuardianInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

/**
 * Invitation to join a family account as a guardian
 */
export interface GuardianInvite {
  id: string;
  /** ID of the family being invited to */
  familyId: string;
  /** Email of the person being invited */
  inviteeEmail: string;
  /** Name to display while pending (from inviter) */
  inviteeName?: string;
  /** Role the invitee will have */
  role: GuardianRole;
  /** Permissions the invitee will receive */
  permissions: GuardianPermission[];
  /** Relationship description */
  relationship: string;
  /** Which children they'll have access to */
  childAccess: string[];
  /** Status of the invitation */
  status: GuardianInviteStatus;
  /** ID of the user who sent the invite */
  invitedBy: string;
  /** Name of inviter for display */
  inviterName: string; // TODO(T3.4): Remove when connecting to real API — resolve from invitedBy instead
  /** When the invite was created */
  createdAt: string;
  /** When the invite expires */
  expiresAt: string;
  /** When the invite was responded to */
  respondedAt?: string;
  /** Optional message from the inviter */
  message?: string;
}

/**
 * Family account that groups children and guardians
 */
export interface FamilyAccount {
  id: string;
  /** Display name for the family */
  name: string;
  /** ID of the primary guardian (account creator) */
  primaryGuardianId: string;
  /** All guardians with access */
  guardians: FamilyGuardian[];
  /** All children in the family */
  children: FamilyMember[];
  /** Pending invitations */
  pendingInvites: GuardianInvite[];
  /** When the family was created */
  createdAt: string;
  updatedAt: string;
}

/**
 * Spending summary for a child in the family
 */
export interface FamilySpending {
  /** ID of the child this spending relates to */
  childId: string;
  /** Name of the child for display purposes */
  childName: string; // TODO(T3.4): Remove when connecting to real API — resolve from childId instead
  /** Color code for the child (for charts) */
  colorCode: string;
  /** Total amount spent on this child (in currency units) */
  totalSpent: number;
  /** Number of sessions booked */
  sessionCount: number;
  /** Date of the last session (ISO string) */
  lastSession?: string;
  /** Breakdown by month */
  monthlyBreakdown?: FamilySpendingMonth[];
  /** Average cost per session */
  averagePerSession: number;
  /** Spending trend compared to previous period */
  trend?: 'up' | 'down' | 'stable';
  /** Percentage change from previous period */
  trendPercent?: number;
}

/**
 * Monthly spending breakdown
 */
export interface FamilySpendingMonth {
  /** Month in YYYY-MM format */
  month: string;
  /** Amount spent in this month */
  amount: number;
  /** Number of sessions in this month */
  sessionCount: number;
}

/**
 * Family calendar event - represents a booking in the family calendar
 */
export interface FamilyCalendarEvent {
  /** Unique event ID (usually the booking ID) */
  id: string;
  /** ID of the child this event is for */
  childId: string;
  /** Name of the child */
  childName: string; // TODO(T3.4): Remove when connecting to real API — resolve from childId instead
  /** Color code for the event */
  colorCode: string;
  /** Event title */
  title: string;
  /** Event description */
  description?: string;
  /** Start date/time (ISO string) */
  start: string;
  /** End date/time (ISO string) */
  end: string;
  /** Location of the event */
  location?: string;
  /** Coach name */
  coachName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from coachId instead
  /** Coach ID */
  coachId?: string;
  /** Session type */
  sessionType?: string;
  /** Status of the booking */
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
  /** Price of the session */
  price?: number;
}

/**
 * Family overview stats for the dashboard
 */
export interface FamilyOverview {
  /** Total number of children */
  totalChildren: number;
  /** Total upcoming sessions across all children */
  upcomingSessions: number;
  /** Total sessions completed this month */
  sessionsThisMonth: number;
  /** Total spending this month */
  spendingThisMonth: number;
  /** Total spending all time */
  totalSpending: number;
  /** Currency code */
  currency: string;
  /** Next upcoming session (if any) */
  nextSession?: FamilyCalendarEvent;
  /** Recent badges earned by any child */
  recentBadges?: BadgeAward[];
}

/**
 * Date range for filtering family data
 */
export interface FamilyDateRange {
  /** Start date (ISO string) */
  startDate: string;
  /** End date (ISO string) */
  endDate: string;
}

/**
 * Child progress summary for family dashboard
 */
export interface ChildProgressSummary {
  /** Child ID */
  childId: string;
  /** Child name */
  childName: string; // TODO(T3.4): Remove when connecting to real API — resolve from childId instead
  /** Number of sessions completed */
  sessionsCompleted: number;
  /** Average session rating (1-5) */
  averageRating?: number;
  /** Total badges earned */
  badgesEarned: number;
  /** Active goals count */
  activeGoals: number;
  /** Completed goals count */
  completedGoals: number;
  /** Last session date */
  lastSessionDate?: string;
  /** Next session date */
  nextSessionDate?: string;
  /** Skill progress summary */
  skillProgress?: {
    skill: string;
    level: number;
    change: number;
  }[];
}

// ============================================================================
// EMERGENCY & SAFETY INFO
// ============================================================================

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
  canPickup: boolean;
}

export interface MedicalInfo {
  conditions: string[];
  allergies: string[];
  medications: string[];
  doctorName?: string;
  doctorPhone?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  restrictions: string[];
  notes?: string;
}

export type ConsentType = 'PHOTO' | 'VIDEO' | 'SOCIAL_MEDIA' | 'EMERGENCY_TREATMENT';

export interface Consent {
  type: ConsentType;
  granted: boolean;
  grantedAt?: string;
  grantedBy: string;
}

export interface EmergencyInfo {
  athleteId: string;
  contacts: EmergencyContact[];
  medical: MedicalInfo;
  consents: Consent[];
  updatedAt: string;
}

/**
 * Aggregated consent status for an athlete
 */
export interface AthleteConsent {
  athleteId: string;
  athleteName: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  athletePhotoUrl?: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  parentName: string; // TODO(T3.4): Remove when connecting to real API — resolve from a parentId field instead
  consents: Consent[];
  lastUpdated: string;
}

/**
 * Summary of consent status across roster
 */
export interface ConsentSummary {
  totalAthletes: number;
  byType: Record<ConsentType, { granted: number; denied: number }>;
}

// ============================================================================
// INJURY & RECOVERY TRACKING
// ============================================================================

/**
 * Severity level of an injury
 */
export type InjurySeverity = 'MINOR' | 'MODERATE' | 'SEVERE';

/**
 * Current status of an injury
 */
export type InjuryStatus = 'ACTIVE' | 'RECOVERING' | 'HEALED';

/**
 * Body part categories for injury tracking
 */
export type BodyPartCategory = 'HEAD' | 'UPPER_BODY' | 'CORE' | 'LOWER_BODY';

/**
 * Specific body parts that can be injured
 */
export type BodyPart =
  | 'HEAD'
  | 'NECK'
  | 'LEFT_SHOULDER'
  | 'RIGHT_SHOULDER'
  | 'LEFT_ARM'
  | 'RIGHT_ARM'
  | 'LEFT_ELBOW'
  | 'RIGHT_ELBOW'
  | 'LEFT_WRIST'
  | 'RIGHT_WRIST'
  | 'LEFT_HAND'
  | 'RIGHT_HAND'
  | 'CHEST'
  | 'UPPER_BACK'
  | 'LOWER_BACK'
  | 'ABDOMEN'
  | 'LEFT_HIP'
  | 'RIGHT_HIP'
  | 'LEFT_THIGH'
  | 'RIGHT_THIGH'
  | 'LEFT_KNEE'
  | 'RIGHT_KNEE'
  | 'LEFT_CALF'
  | 'RIGHT_CALF'
  | 'LEFT_ANKLE'
  | 'RIGHT_ANKLE'
  | 'LEFT_FOOT'
  | 'RIGHT_FOOT';

/**
 * A recovery note added to track progress of an injury
 */
export interface RecoveryNote {
  /** Unique identifier for the note */
  id: string;
  /** ID of the injury this note belongs to */
  injuryId: string;
  /** Content of the recovery note */
  note: string;
  /** When the note was created (ISO string) */
  createdAt: string;
  /** ID of the user who created the note */
  createdBy: string;
  /** Name of the user who created the note */
  createdByName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from createdBy instead
  /** Optional recovery percentage at time of note */
  recoveryPercent?: number;
}

/**
 * Represents an injury logged by an athlete
 */
export interface Injury {
  /** Unique identifier for the injury */
  id: string;
  /** ID of the user (athlete) who has the injury */
  userId: string;
  /** Name of the athlete (for display) */
  userName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  /** The injured body part */
  bodyPart: BodyPart;
  /** Description of the injury */
  description: string;
  /** Severity level of the injury */
  severity: InjurySeverity;
  /** When the injury occurred (ISO string) */
  occurredAt: string;
  /** Expected recovery date (ISO string, optional) */
  expectedRecovery?: string;
  /** Current status of the injury */
  status: InjuryStatus;
  /** Recovery notes tracking progress */
  notes: RecoveryNote[];
  /** Current recovery percentage (0-100) */
  recoveryPercent: number;
  /** Whether the injury is shared with the coach */
  sharedWithCoach: boolean;
  /** When the injury was logged (ISO string) */
  createdAt: string;
  /** When the injury was last updated (ISO string) */
  updatedAt: string;
  /** When the injury was marked as healed (ISO string) */
  healedAt?: string;
}

/**
 * Input for logging a new injury
 */
export interface LogInjuryInput {
  /** The injured body part */
  bodyPart: BodyPart;
  /** Description of the injury */
  description: string;
  /** Severity level of the injury */
  severity: InjurySeverity;
  /** When the injury occurred (ISO string) */
  occurredAt: string;
  /** Expected recovery date (ISO string, optional) */
  expectedRecovery?: string;
  /** Whether to share with coach */
  sharedWithCoach?: boolean;
}

/**
 * Input for updating an existing injury
 */
export interface UpdateInjuryInput {
  /** Updated description */
  description?: string;
  /** Updated severity */
  severity?: InjurySeverity;
  /** Updated expected recovery date */
  expectedRecovery?: string;
  /** Updated status */
  status?: InjuryStatus;
  /** Updated recovery percentage */
  recoveryPercent?: number;
  /** Updated coach sharing preference */
  sharedWithCoach?: boolean;
}

/**
 * Summary of a user's injury history
 */
export interface InjuryStats {
  /** Total number of injuries logged */
  totalInjuries: number;
  /** Number of currently active injuries */
  activeInjuries: number;
  /** Number of injuries currently recovering */
  recoveringInjuries: number;
  /** Number of healed injuries */
  healedInjuries: number;
  /** Most commonly injured body parts */
  commonBodyParts: { bodyPart: BodyPart; count: number }[];
  /** Average recovery time in days */
  averageRecoveryDays: number;
}
