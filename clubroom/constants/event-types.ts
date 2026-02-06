/**
 * Event Types
 *
 * Club events, RSVP, attendance, and match/fixture types.
 */

// ============================================================================
// CLUB EVENTS
// ============================================================================

export type ClubEventType =
  | 'TOURNAMENT'
  | 'SOCIAL'
  | 'MEETING'
  | 'PRESENTATION'
  | 'FUNDRAISER'
  | 'TRIAL_DAY'
  | 'TRAINING_CAMP'
  | 'OTHER';

export type EventTargetAudience = 'ALL' | 'COACHES' | 'PARENTS' | 'ATHLETES' | 'SQUAD';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

export type RSVPStatus = 'GOING' | 'MAYBE' | 'NOT_GOING';

export interface EventAttendee {
  userId: string;
  userName: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  userPhotoUrl?: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';
  status: RSVPStatus;
  guestCount: number;
  respondedAt: string;
}

export interface ClubEvent {
  id: string;
  clubId: string;
  clubName: string; // TODO(T3.4): Remove when connecting to real API — resolve from clubId instead
  createdBy: string;
  createdByName: string; // TODO(T3.4): Remove when connecting to real API — resolve from createdBy instead

  // Event details
  title: string;
  description: string;
  eventType: ClubEventType;

  // Schedule
  date: string;
  startTime: string;
  endTime?: string;
  // Backward compatibility aliases
  startDate?: string; // alias for date
  endDate?: string;   // alias for endTime

  // Location
  venue: string;
  location?: string; // alias for venue
  address?: string;
  isVirtual: boolean;
  meetingLink?: string;

  // Attendance
  targetAudience: EventTargetAudience;
  squadIds?: string[]; // if squad-specific
  allClub?: boolean; // true if all club members invited (alias for targetAudience === 'ALL')
  maxAttendees?: number;
  maxParticipants?: number; // alias for maxAttendees
  currentParticipants?: number; // count of confirmed attendees

  // Cost
  price: number; // 0 = free
  priceUsd?: number; // alias for price
  currency: string;

  // RSVP
  rsvpRequired: boolean;
  rsvpDeadline?: string;
  attendees: EventAttendee[];

  // Status
  status: EventStatus;

  imageUrl?: string;
  createdAt: string;
}

// ============================================================================
// EVENT RSVP & ATTENDANCE TRACKING
// ============================================================================

/**
 * Represents a structured RSVP record for an event
 */
export interface EventRSVP {
  /** Unique identifier for the RSVP */
  id: string;
  /** ID of the event this RSVP is for */
  eventId: string;
  /** ID of the user who submitted the RSVP */
  userId: string;
  /** Name of the user for display purposes */
  userName: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  /** User's avatar URL */
  userPhotoUrl?: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  /** User's role (for display and filtering) */
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';
  /** Current RSVP status */
  status: RSVPStatus;
  /** Number of additional guests the user is bringing */
  guestCount: number;
  /** When the RSVP was submitted (ISO string) */
  respondedAt: string;
  /** Optional note from the user */
  note?: string;
  /** When the RSVP was last updated */
  updatedAt?: string;
}

/**
 * Represents a check-in record for event attendance
 */
export interface EventAttendance {
  /** Unique identifier for the attendance record */
  id: string;
  /** ID of the event */
  eventId: string;
  /** ID of the user who checked in */
  userId: string;
  /** Name of the user for display purposes */
  userName: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  /** User's avatar URL */
  userPhotoUrl?: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  /** User's role */
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';
  /** When the user checked in (ISO string) */
  checkedInAt: string;
  /** ID of the user who performed the check-in (for coach check-ins) */
  checkedInBy: string;
  /** Name of the person who performed the check-in */
  checkedInByName: string; // TODO(T3.4): Remove when connecting to real API — resolve from checkedInBy instead
  /** Check-in method */
  checkInMethod: 'SELF' | 'COACH' | 'QR_CODE' | 'LOCATION';
  /** Location coordinates at check-in (for location validation) */
  checkInLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  /** Whether the check-in location was validated */
  locationValidated?: boolean;
  /** Distance from event venue in meters */
  distanceFromVenue?: number;
  /** Number of guests checked in with this user */
  guestsCheckedIn: number;
  /** Optional notes about the check-in */
  notes?: string;
}

/**
 * Statistics for event attendance
 */
export interface EventAttendanceStats {
  /** ID of the event */
  eventId: string;
  /** Total RSVPs by status */
  rsvpCounts: {
    going: number;
    notGoing: number;
    maybe: number;
    noResponse: number;
  };
  /** Total guests expected (from RSVP going) */
  expectedGuests: number;
  /** Total capacity (if event has maxAttendees) */
  capacity?: number;
  /** Number of users who have checked in */
  checkedInCount: number;
  /** Number of guests who have checked in */
  guestsCheckedInCount: number;
  /** Percentage of "going" RSVPs who have checked in */
  attendanceRate: number;
  /** Breakdown by role */
  byRole: {
    coaches: { rsvp: number; checkedIn: number };
    parents: { rsvp: number; checkedIn: number };
    athletes: { rsvp: number; checkedIn: number };
  };
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Input for submitting an RSVP
 */
export interface SubmitRSVPInput {
  eventId: string;
  userId: string;
  userName: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  userPhotoUrl?: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';
  status: RSVPStatus;
  guestCount?: number;
  note?: string;
}

/**
 * Input for checking in to an event
 */
export interface CheckInInput {
  eventId: string;
  userId: string;
  userName: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  userPhotoUrl?: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';
  checkedInBy: string;
  checkedInByName: string; // TODO(T3.4): Remove when connecting to real API — resolve from checkedInBy instead
  checkInMethod: 'SELF' | 'COACH' | 'QR_CODE' | 'LOCATION';
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  guestsCheckedIn?: number;
  notes?: string;
}

// ============================================================================
// MATCHES / FIXTURES
// ============================================================================

export type MatchType = 'FRIENDLY' | 'LEAGUE' | 'CUP' | 'TOURNAMENT';

export type MatchStatus = 'SCHEDULED' | 'LINEUP_SET' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type MatchPlayerStatus = 'INVITED' | 'AVAILABLE' | 'UNAVAILABLE' | 'SELECTED' | 'RESERVE';

export interface MatchPlayer {
  athleteId: string;
  athleteName: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  parentId: string;
  parentName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  status: MatchPlayerStatus;
  responseAt?: string;
  parentNote?: string;
  position?: string;
  jerseyNumber?: number;
}

export interface MatchResult {
  home: number;
  away: number;
}

export interface Match {
  id: string;
  clubId: string;
  clubName: string; // TODO(T3.4): Remove when connecting to real API — resolve from clubId instead
  squadId?: string;
  squadName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from squadId instead
  coachId: string;
  coachName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from coachId instead

  // Match details
  title: string; // "Under 11's vs Hackney FC"
  matchType: MatchType;
  opponent: string;
  isHome: boolean;

  // Schedule
  date: string;
  kickoffTime: string;
  meetTime?: string; // arrive 30min early

  // Location
  venue: string;
  address?: string;

  // Squad
  maxPlayers: number;
  selectedPlayers: MatchPlayer[];

  // Status
  status: MatchStatus;

  // Result (after match)
  result?: MatchResult;

  // Metadata
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface MatchInviteNotification {
  matchId: string;
  matchTitle: string; // TODO(T3.4): Remove when connecting to real API — resolve from matchId instead
  opponent: string;
  date: string;
  kickoffTime: string;
  venue: string;
  clubName: string; // TODO(T3.4): Remove when connecting to real API — resolve from matchId -> clubId instead
  coachName: string; // TODO(T3.4): Remove when connecting to real API — resolve from matchId -> coachId instead
  athleteName: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
}

export interface MatchSelectionNotification {
  matchId: string;
  matchTitle: string;
  opponent: string;
  date: string;
  kickoffTime: string;
  venue: string;
  isSelected: boolean; // true = selected, false = reserve
  athleteName: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
}
