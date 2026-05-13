/**
 * Session Types
 *
 * Session management, session invites, availability,
 * group sessions, recurring bookings, waitlist, booking summaries,
 * and bilateral interaction types.
 */

import type { FootballObjective, UserRole } from './user-types';
import type { OrganizationCommercialMode } from './club-types';

// ============================================================================
// SESSION MANAGEMENT TYPES
// ============================================================================

// Session Invite Type (visibility/access control)
export type SessionInviteType = 'OPEN' | 'CLOSED' | 'SQUAD_ONLY';

// Session Types and Templates
export type SessionType = '1-to-1' | 'small-group' | 'clinic' | 'assessment';

export interface SessionTemplate {
  id: string;
  coachId: string;
  name: string;
  type: SessionType;
  duration: number; // minutes
  capacity: number; // max participants
  defaultPrice: number; // GBP
  description?: string;
  defaultLocation?: string;
  skillsFocus: string[];
  createdAt: string;
}

// Session Lifecycle States
export type SessionState = 'DRAFT' | 'OPEN' | 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type AttendanceStatus = 'ATTENDED' | 'NO_SHOW';

export type NoShowCategory = 'no_contact' | 'cancelled_late' | 'arrived_late' | 'weather_travel' | 'other';

export interface CoachSession {
  id: string;
  coachId: string;
  templateId?: string; // If created from template
  type: SessionType;
  state: SessionState;
  title: string;
  description?: string;

  // Scheduling
  scheduledAt: string; // ISO date string
  duration: number; // minutes
  location: string;

  // Capacity & Roster
  capacity: number; // max participants
  roster: SessionParticipant[];

  // Access Control
  inviteType: SessionInviteType; // OPEN = browsable, CLOSED = invite-only, SQUAD_ONLY = squad members
  isPrivate: boolean; // If true, only invited athletes can see/request
  isOpenToRequests: boolean; // If false, coach must directly invite

  // Pricing
  price: number; // GBP

  // Plan & Recap
  planId?: string; // Reference to SessionPlan
  recapId?: string; // Reference to SessionRecap

  // Metadata
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

// Participant in a session
export type ParticipantType = 'athlete' | 'guest' | 'request';

export interface SessionParticipant {
  id: string;
  sessionId: string;
  participantType: ParticipantType;
  athleteId?: string; // If registered athlete
  guestId?: string; // If guest athlete
  requestId?: string; // If pending request
  confirmedAt?: string;
  attendanceStatus?: AttendanceStatus;
}

// Guest Athletes (Exterior Individuals)
export interface GuestAthlete {
  id: string;
  coachId: string; // Coach who added them
  name: string;
  ageBand?: string; // e.g., 'Under 12', '13-15', '16-18', 'Adult'
  guardianName?: string;
  guardianContact?: string;
  notes?: string;
  isVerified: boolean; // Whether guardian has accepted invite
  createdAt: string;
}

// Session Requests (from parents/users)
export type RequestStatus = 'PENDING' | 'APPROVED' | 'DECLINED';

export interface SessionRequest {
  id: string;
  sessionId: string;
  athleteId: string;
  requestedById: string; // Parent or athlete
  status: RequestStatus;
  message?: string; // Optional message from requester
  createdAt: string;
  respondedAt?: string;
  responseMessage?: string;
}

// Athlete Directory (Coach's saved athletes)
export interface AthleteDirectoryEntry {
  id: string;
  coachId: string;
  athleteId: string;
  tags?: string[]; // e.g., ['Team A', 'U15', 'Striker']
  notes?: string;
  firstSessionDate?: string;
  lastSessionDate?: string;
  totalSessions: number;
  addedAt: string;
}

// Session Plan (before session)
export interface SessionPlan {
  id: string;
  sessionId: string;
  coachId: string;

  // Content
  objectives: string[];
  warmUp?: string;
  mainActivities: SessionActivity[];
  coolDown?: string;
  equipment: string[];
  notes?: string;

  // Sharing
  sharedWithAthletes: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionActivity {
  id: string;
  name: string;
  duration: number; // minutes
  description?: string;
  focusAreas: string[];
}

// Session Recap (after session)
export interface SessionRecap {
  id: string;
  sessionId: string;
  coachId: string;

  // Content
  summary: string;
  highlightsPerAthlete: AthleteHighlight[];
  skillsWorked: string[];
  overallPerformance: number; // 1-5 rating
  nextSteps?: string;

  // Media
  photoUrls?: string[];
  videoUrls?: string[];

  // Sharing
  sharedWithAthletes: boolean;
  createdAt: string;
}

export interface AthleteHighlight {
  athleteId?: string;
  guestId?: string;
  strengths: string[];
  areasToImprove: string[];
  performanceRating: number; // 1-5
  notes?: string;
}

// Invite Codes for Teams/Rosters
export interface TeamInviteCode {
  id: string;
  coachId: string;
  code: string;
  teamName?: string;
  description?: string;
  maxUses?: number;
  currentUses: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// MULTI-WEEK BOOKING SERIES
// ============================================================================

export interface BookingSeries {
  id: string;
  bookingIds: string[];
  createdById: string;
  createdByName?: string; // @deprecated — resolve via createdById
  coachId: string;
  coachName?: string; // @deprecated — resolve via coachId
  athleteIds: string[];
  athleteNames?: string[]; // @deprecated — resolve via athleteIds
  sessionType: string;
  focus?: string;
  pricePerSession?: number;
  selectedWeeks: string[];
  totalCost: number;
  patternLabel: string;
  location: string;
  sessionInviteId?: string;
  createdAt: string;
  status: 'ACTIVE' | 'PARTIAL' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
}

export interface WeekAcceptance {
  weekDate: string;
  startTime: string;
  endTime: string;
  location?: string;
  accepted: boolean;
}

// ============================================================================
// BOOKING SUMMARY
// ============================================================================

export interface BookingSummary {
  id: string;
  service: string;
  price?: number;
  recurringBookingId?: string;
  sessionSource?: 'direct' | 'event' | 'group';
  sessionSourceEntityId?: string;
  start: string;
  status: 'Confirmed' | 'Pending' | 'Needs Completion' | 'Completed' | 'Cancelled';
  locationLabel: string;
  createdAt?: string;
  clubId?: string;
  actingAs?: 'self' | 'club';
  commercialMode?: OrganizationCommercialMode;
  ownerCoachId?: string;
  ownerCoachName?: string;
  assigneeCoachId?: string;
  assigneeCoachName?: string;
  createdByUserId?: string;
  createdByName?: string;
  createdByRole?: UserRole;
  coach?: {
    name: string;
    photoUrl: string;
  };
  client?: {
    name: string;
    photoUrl: string;
  };
  coachId?: string;
  clientId?: string;
  bookedById?: string;
  bookedByName?: string;
  audienceLabel?: string;
  // Group booking fields
  isGroupSession?: boolean;
  maxParticipants?: number;
  currentParticipants?: number;
  participants?: {
    id: string;
    name: string;
    avatar: string;
    status: 'confirmed' | 'pending' | 'cancelled';
  }[];
  // Multi-week series fields
  seriesId?: string;
  seriesIndex?: number;
  seriesTotalWeeks?: number;
}

// Session Offering System
export interface SessionRegistration {
  id: string;
  userId: string;
  userName?: string;
  bookedAt: string;
  status: 'confirmed' | 'cancelled' | 'completed';
}

export interface SessionOwnershipAuditEvent {
  id: string;
  action: 'CREATED' | 'ASSIGNED' | 'REASSIGNED' | 'UPDATED';
  timestamp: string;
  actorUserId?: string;
  actorName?: string;
  actorRole?: UserRole;
  fromCoachId?: string;
  toCoachId?: string;
  note?: string;
}

export type SessionOfferingSource = 'direct' | 'event' | 'group';

export interface SessionOffering {
  id: string;
  source?: SessionOfferingSource;
  sourceEntityId?: string;
  coachId: string;
  clubId?: string;
  actingAs?: 'self' | 'club';
  commercialMode?: OrganizationCommercialMode;
  ownerCoachId?: string;
  assigneeCoachId?: string;
  createdByUserId?: string;
  createdByRole?: UserRole;
  createdByName?: string;
  clubScope?: 'club' | 'squad' | 'public';
  squadId?: string;
  inviteType?: SessionInviteType; // OPEN = browsable, CLOSED = invite-only, SQUAD_ONLY = squad members
  title: string; // Session name/title
  description?: string;
  sessionType: '1on1' | 'group';
  maxParticipants: number;
  location: string;
  venueName?: string;
  locationCoordinates?: { latitude: number; longitude: number };
  scheduledAt: string; // ISO date string
  isRecurring: boolean;
  recurrenceType: 'none' | 'weekly' | 'biweekly';
  dayOfWeek?: number; // 0-6 (Sunday-Saturday) for recurring sessions
  timeOfDay?: string; // "18:00" format for recurring sessions
  endDate?: string; // ISO date string - when recurring series ends
  cancelledInstances?: string[]; // ISO date strings of cancelled individual instances
  status: 'active' | 'cancelled' | 'completed' | 'full';
  visibility?: 'club' | 'public';
  registrations: SessionRegistration[];
  /** Manual attendees tracked outside Clubroom bookings (walk-ins, cash, etc.) */
  offPlatformParticipants?: number;
  createdAt: string;
  updatedAt?: string;
  updatedByUserId?: string;
  updatedByRole?: UserRole;
  ownershipAuditTrail?: SessionOwnershipAuditEvent[];
  duration?: number; // Duration in minutes (default 60)
  price?: number;
  ageMin?: number; // Minimum age (e.g., 10 for U12)
  ageMax?: number; // Maximum age (e.g., 12 for U12)
  footballSkill?: FootballObjective; // Primary skill focus
  invitedAthleteIds?: string[]; // Coach-selected invite list for CLOSED sessions
  invitedAthleteNames?: string[]; // Display labels for invited athletes
  viewerAthleteNames?: string[]; // Parent/athlete-facing: who this session is for
}

export interface AthleteObjective {
  id: string;
  athleteId?: string; // Optional: links objective to specific athlete (for parents with multiple children)
  label: FootballObjective | 'Custom';
  status: 'active' | 'upcoming' | 'completed';
  updatedAt: string;
  note?: string;
  progress: number; // 0-100
  sessionsCompleted: number;
  startDate: string;
  targetSessions?: number;
}

export interface SessionHistoryEntry {
  id: string;
  date: string;
  focus: FootballObjective;
  location: string;
  highlight: string;
  resultBadge?: string;
  clipLabel?: string;
  durationMinutes: number;
  sessionType: string;
  dateCompleted: string;
  rating?: number; // 1-5
  coachFeedback?: string;
}

// ============================================================================
// SESSION NOTES (Enhanced)
// ============================================================================

export interface SessionNote {
  id: string;
  bookingId: string;
  coachId: string;
  athleteId: string;
  effortRating: number;
  focusAreas: FootballObjective[];
  improvements: string[];
  homework: string[];
  privateNotes?: string;
  parentVisibleNotes?: string;
  videoUrls: string[];
  skillUpdates: {
    skill: FootballObjective;
    previousLevel: number;
    newLevel: number;
  }[];
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// SESSION INVITES (Coach -> Parent)
// ============================================================================

export interface TimeSlot {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  venueName?: string;
  locationCoordinates?: { latitude: number; longitude: number };
}

export interface SessionInvite {
  id: string;
  coachId: string;
  clubName?: string; // Club or Academy name (e.g., "Bradwell Boys")
  inviteType?: SessionInviteType; // OPEN = browsable, CLOSED = invite-only, SQUAD_ONLY = squad members
  squadIds?: string[]; // Relevant squad IDs when inviteType is SQUAD_ONLY
  athleteIds: string[];
  parentId: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  sessionTemplateId?: string; // Links to SessionTemplate for auto-fill
  focus: string;
  notes?: string;
  price?: number;
  duration?: number; // Duration in minutes (from session template)
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'MAYBE';
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
  selectedSlot?: TimeSlot; // The slot chosen when accepting
  existingSessionId?: string; // Links invite to an already published session offering
  groupId?: string; // Links invites that were sent as part of a group/bulk send
  bookingId?: string; // Link to created booking (bidirectional)
  dismissed?: boolean; // When parent removes/hides the invite from their view
  declineReason?: 'schedule_conflict' | 'too_far' | 'price' | 'child_unavailable' | 'other';
  declineNote?: string;
  isRecurring?: boolean; // Whether this is a weekly recurring invite
  recurrenceWeeks?: number; // Number of weeks for recurring (4, 8, 12, or undefined for until cancelled)
  // Multi-week acceptance fields
  weekSlots?: WeekAcceptance[]; // Per-week slots for multi-week invites
  acceptedWeeks?: string[]; // ISO date strings of accepted weeks
  declinedWeeks?: string[]; // ISO date strings of declined weeks
  coverImageUrl?: string;
  locationCoordinates?: { latitude: number; longitude: number };
  shareableLink?: string;
  rsvpCounts?: { going: number; maybe: number; cantGo: number };
  rsvpResponses?: InviteRsvpResponse[];
}

export interface InviteRsvpResponse {
  id: string;
  inviteId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  childId?: string;
  childName?: string;
  status: 'going' | 'maybe' | 'cant_go';
  respondedAt: string;
}

// ============================================================================
// COACH VENUE MANAGEMENT
// ============================================================================

export interface CoachVenue {
  id: string;
  coachId: string;
  label: string;
  icon?: string;       // Ionicons name
  isDefault?: boolean;
  createdAt: string;
}

// ============================================================================
// AVAILABILITY MANAGEMENT
// ============================================================================

export interface AvailabilityTemplate {
  id: string;
  coachId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  maxConcurrent: number;
  bufferMinutes: number;
  location?: string;
  sessionTemplateId?: string; // Optional: restricts this block to a specific session type
}

export interface AvailabilityOverride {
  id: string;
  coachId: string;
  date: string;
  isBlocked: boolean;
  reason?: string;
  customSlots?: TimeSlot[];
  repeatUntil?: string;
  repeatDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  repeatGroupId?: string;
}

export interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  bookedCount: number;
  maxBookings: number;
  location?: string;
}

/**
 * Coach scheduling rules - configurable booking constraints
 */
export interface CoachSchedulingRules {
  id: string;
  coachId: string;
  /** Minimum hours before a session that bookings can be made */
  minimumAdvanceBookingHours: number;
  /** Maximum days in advance that bookings can be made */
  maxAdvanceBookingDays: number;
  /** Default buffer minutes between sessions */
  bufferMinutesDefault: number;
  /** Default max concurrent sessions */
  maxConcurrentDefault: number;
  /** Whether to allow same-day bookings */
  allowSameDayBookings: boolean;
  /** Cancellation policy ID for this coach */
  cancellationPolicyId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// GROUP SESSIONS
// ============================================================================

export interface GroupSessionSchedule {
  date: string;
  startTime: string;
  endTime: string;
}

export interface RecurringPattern {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  until?: string;    // ISO date string - when the recurring pattern ends
}

export interface GroupSession {
  id: string;
  coachId: string;
  clubId?: string;
  actingAs?: 'self' | 'club';
  commercialMode?: OrganizationCommercialMode;
  ownerCoachId?: string;
  assigneeCoachId?: string;
  createdByUserId?: string;
  createdByRole?: UserRole;
  createdByName?: string;
  title: string;
  description: string;
  sessionType: 'CAMP' | 'CLINIC' | 'TEAM_TRAINING' | 'OPEN_SESSION' | 'TRIAL' | 'TRAINING';
  schedule: GroupSessionSchedule[];
  maxParticipants: number;
  currentParticipants: number;
  waitlistEnabled: boolean;
  waitlistCount: number;
  pricePerParticipant: number;
  currency: string;
  ageMin?: number;
  ageMax?: number;
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  location: string;
  venueName?: string;
  locationCoordinates?: { latitude: number; longitude: number };
  isVirtual: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'FULL' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  focus?: FootballObjective[];
  equipment?: string[];
  imageUrl?: string;
  // Training/Recurring session fields
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  squadId?: string;      // Link to specific squad
  parentSessionId?: string; // For recurring instances, links to the template
  isFree?: boolean;         // Quick flag for free sessions
  inviteType?: SessionInviteType; // OPEN = browsable, CLOSED = invite-only, SQUAD_ONLY = squad members
  registrationDeadline?: string;  // ISO date — after this, RSVP responses are locked
}

export interface GroupRegistration {
  id: string;
  sessionId: string;
  athleteId: string;
  parentId: string;
  status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';
  registeredAt: string;
  paidAt?: string;
  attendedDates: string[];
  notes?: string;
}

// ============================================================================
// RECURRING BOOKINGS
// ============================================================================

/**
 * Frequency options for recurring bookings
 */
export type RecurrenceFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

/**
 * Status of a recurring booking subscription
 */
export type RecurringBookingStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';

/**
 * Represents a recurring booking subscription
 */
export interface RecurringBooking {
  /** Unique identifier for the recurring booking */
  id: string;
  /** ID of the user who created the subscription */
  userId: string;
  /** Name of the user for display purposes */
  userName?: string;
  /** ID of the coach being booked */
  coachId: string;
  /** Name of the coach for display purposes */
  coachName?: string;
  /** Avatar URL of the coach */
  /** Athlete ID if booking for a child/athlete */
  athleteId?: string;
  /** Athlete name for display purposes */
  athleteName?: string;
  /** Day of the week (0-6, Sunday-Saturday) */
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Time of the session in HH:mm format */
  time: string;
  /** Duration of each session in minutes */
  duration: number;
  /** Location for the sessions */
  location: string;
  /** Type of session (e.g., '1-on-1', 'Group Training') */
  sessionType: string;
  /** How often the booking recurs */
  frequency: RecurrenceFrequency;
  /** When the recurring booking starts (ISO date string) */
  startDate: string;
  /** When the recurring booking ends (ISO date string, optional for indefinite) */
  endDate?: string;
  /** Current status of the subscription */
  status: RecurringBookingStatus;
  /** Price per session in GBP */
  pricePerSession?: number;
  /** Additional notes for the booking */
  notes?: string;
  /** When the subscription was created */
  createdAt: string;
  /** When the subscription was last updated */
  updatedAt: string;
  /** When the subscription was paused (if applicable) */
  pausedAt?: string;
  /** Reason for pausing the subscription */
  pauseReason?: string;
  /** When the subscription was cancelled (if applicable) */
  cancelledAt?: string;
  /** Reason for cancellation */
  cancellationReason?: string;
  /** IDs of bookings generated from this recurring subscription */
  generatedBookingIds: string[];
  /** Number of sessions completed */
  sessionsCompleted: number;
  /** Number of sessions remaining (if endDate is set) */
  sessionsRemaining?: number;
  /** Ownership/delegation metadata for club-created recurring programs */
  actingAs?: 'self' | 'club';
  commercialMode?: OrganizationCommercialMode;
  ownerCoachId?: string;
  assigneeCoachId?: string;
  createdByUserId?: string;
  createdByRole?: UserRole;
  clubId?: string;
}

/**
 * Parameters for creating a new recurring booking
 */
export interface CreateRecurringBookingParams {
  userId: string;
  coachId: string;
  athleteId?: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  time: string;
  duration: number;
  location: string;
  sessionType: string;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
  pricePerSession?: number;
  notes?: string;
  actingAs?: 'self' | 'club';
  commercialMode?: OrganizationCommercialMode;
  ownerCoachId?: string;
  assigneeCoachId?: string;
  createdByUserId?: string;
  createdByRole?: UserRole;
  clubId?: string;
}

/**
 * Summary of a generated booking from a recurring subscription
 */
export interface GeneratedBookingSummary {
  bookingId: string;
  recurringBookingId: string;
  scheduledAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
}

// ============================================================================
// WAITLIST SYSTEM
// ============================================================================

/**
 * Status of a waitlist entry
 */
export type WaitlistStatus = 'WAITING' | 'NOTIFIED' | 'BOOKED' | 'EXPIRED' | 'REMOVED';

/**
 * Represents a user's position in a session waitlist
 */
export interface WaitlistEntry {
  /** Unique identifier for the waitlist entry */
  id: string;
  /** ID of the user on the waitlist */
  userId: string;
  /** Display name of the user */
  /** Optional user avatar URL */
  /** ID of the session they're waiting for */
  sessionId: string;
  /** Title of the session for display purposes */
  /** Scheduled date/time of the session */
  /** Coach ID for the session */
  coachId?: string;
  /** Coach name for display purposes */
  /** Position in the waitlist (1 = first in line) */
  position: number;
  /** When the user joined the waitlist */
  joinedAt: string;
  /** When the user was last notified of availability */
  notifiedAt?: string;
  /** Whether to automatically book when a spot opens */
  autoBook: boolean;
  /** Current status of the waitlist entry */
  status: WaitlistStatus;
  /** When the notification expires (user must respond by this time) */
  expiresAt?: string;
  /** ID of the booking if auto-booked or manually booked */
  bookingId?: string;
  /** Additional notes from the user */
  notes?: string;
  /** User's response when notified of availability */
  userResponse?: 'accepted' | 'declined' | 'expired';
  /** When the user responded to the notification */
  userRespondedAt?: string;
}

/**
 * Parameters for joining a waitlist
 */
export interface JoinWaitlistParams {
  userId: string;
  sessionId: string;
  coachId?: string;
  autoBook?: boolean;
  notes?: string;
}

/**
 * Summary of a session's waitlist for display
 */
export interface WaitlistSummary {
  sessionId: string;
  sessionTitle: string;
  totalWaiting: number;
  autoBookCount: number;
  nextInLine?: {
    userId: string;
    userName: string;
    position: number;
    autoBook: boolean;
  };
}

// ============================================================================
// BILATERAL INTERACTION TYPES
// ============================================================================

/** Session attendance tracking by coach */
export interface SessionAttendance {
  bookingId: string;
  records: AttendanceRecord[];
  completedAt: string;
  completedBy: string;
}

/** Individual athlete attendance record */
export interface AttendanceRecord {
  athleteId: string;
  status: 'ATTENDED' | 'NO_SHOW' | 'LATE';
  notes?: string;
  effortRating?: number;
  focusAreas?: string[];
  improvement?: string;
  drillAssigned?: string;
}

/** Record of a booking cancellation */
export interface CancellationRecord {
  bookingId: string;
  cancelledBy: string;
  cancelledAt: string;
  reason?: 'child_ill' | 'schedule_change' | 'weather' | 'venue' | 'emergency' | 'other';
  note?: string;
  policyTierApplied?: string;
}

/** Structured reason for declining an invite */
export interface InviteDeclineReason {
  category: 'schedule_conflict' | 'too_far' | 'price' | 'child_unavailable' | 'other';
  note?: string;
}

/** RSVP for a session */
export interface SessionRsvp {
  id: string;
  sessionId: string;
  userId: string;
  childId?: string;
  status: 'going' | 'not_going' | 'maybe' | 'pending';
  respondedAt?: string;
  createdAt: string;
}

/** Blocked date range for coach availability */
export interface BlockedDateRange {
  id: string;
  coachId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  createdAt: string;
}

/** Tracks when entities are seen by users */
export interface SeenStatus {
  entityType: 'message' | 'invite_response' | 'rsvp' | 'booking_request' | 'goal';
  entityId: string;
  seenBy: string;
  seenAt: string;
}

// ============================================================================
// CALENDAR SYNC SYSTEM
// ============================================================================

export type CalendarProvider = 'GOOGLE' | 'APPLE' | 'OUTLOOK';

export interface CalendarEvent {
  /** Unique identifier for the event */
  id: string;
  /** Event title/name */
  title: string;
  /** Start time as ISO date string */
  startTime: string;
  /** End time as ISO date string */
  endTime: string;
  /** Location of the event */
  location: string;
  /** Description/notes for the event */
  description: string;
  /** Optional booking ID if linked to a booking */
  bookingId?: string;
  /** Optional coach name */
  /** Optional athlete name */
}

export interface CalendarSyncSettings {
  /** Whether calendar sync is enabled */
  enabled: boolean;
  /** Selected calendar provider */
  provider: CalendarProvider;
  /** Whether to automatically sync new bookings */
  autoSync: boolean;
  /** Minutes before event to send reminder (0 = no reminder) */
  reminderMinutes: number;
  /** Include location in calendar events */
  includeLocation: boolean;
  /** Include coach/athlete notes in event description */
  includeNotes: boolean;
  /** Last sync timestamp */
  lastSyncAt?: string;
  /** User ID this setting belongs to */
  userId: string;
}
