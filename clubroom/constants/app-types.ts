import type { Goal } from './skill-types';
import type { UserRole, SkillLevel } from './user-types';
import type { OrganizationCommercialMode } from './club-types';

// Core User Types - re-exported from user-types (single source of truth)
export type { UserRole, SkillLevel } from './user-types';
export { normalizeUserRole } from './user-types';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar?: string;
  postcode: string;
  dateOfBirth: string;
}

// Coach Profile
export interface CoachProfile {
  userId: string;
  bio: string;
  qualifications: string[];
  specialties: string[]; // e.g., ['Striker Training', 'Goalkeeping']
  dbsChecked?: boolean;
  yearsExperience: number;
  sessionRate: number; // £ GBP per session
  availability: AvailabilitySlot[];
  rating: number; // Calculated from reviews
  totalReviews: number;
  totalSessions: number;
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string;
  location: string;
}

// User/Athlete Profile
export interface UserProfile {
  userId: string;
  bio: string;
  skillLevel: SkillLevel;
  position?: string; // e.g., 'Midfielder', 'Striker'
  goals: Goal[];
}

// Child Relationship - Users can have children they book for
export interface ChildRelationship {
  id: string;
  userId: string; // User who has children
  childId: string; // Child is also a User
  relationshipType: 'PARENT_CHILD' | 'GUARDIAN';
}

// Bookings & Sessions
export type BookingStatus = 'PENDING' | 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'AWAITING_COMPLETION' | 'COMPLETED' | 'CANCELLED';

export interface Booking {
  id: string;
  coachId: string;
  clubId?: string;
  actingAs?: 'self' | 'club';
  commercialMode?: OrganizationCommercialMode;
  ownerCoachId?: string;
  assigneeCoachId?: string;
  createdByUserId?: string;
  createdByRole?: UserRole;
  athleteIds?: string[]; // The users being coached (supports multiple athletes)
  athleteNames?: string[]; // @deprecated — resolve via athleteIds at display time
  athleteId?: string; // @deprecated — use athleteIds instead
  bookedById?: string; // Could be parent or athlete
  bookedByName?: string; // @deprecated — resolve via bookedById at display time
  status: BookingStatus;
  isSharedSession?: boolean; // True if multiple athletes share this session
  scheduledAt: string; // ISO date string
  duration?: number; // minutes (default 60)
  location: string;
  notes?: string;
  coachName?: string; // @deprecated — resolve via coachId at display time
  // Group booking fields
  isGroupSession?: boolean;
  maxParticipants?: number;
  currentParticipants?: number;
  participants?: {
    id: string;
    status: 'confirmed' | 'pending' | 'cancelled';
  }[];
  version?: number;
  service?: string;
  locationLabel?: string;
  start?: string;
  price?: number;
  serviceType?: string;
  sessionSource?: 'direct' | 'event' | 'group';
  sessionSourceEntityId?: string;
  sessionTemplateId?: string;
  sessionTemplateName?: string;
  objectives?: string[];
  createdAt?: string;
  cancellationReason?: string;
  isRecurringGenerated?: boolean;
  recurringBookingId?: string;
  // Group session linkage
  groupSessionId?: string;
  groupRegistrationId?: string;
  // Session invite link (bidirectional)
  sessionInviteId?: string;
  // Bilateral confirmation fields
  confirmationMode?: 'auto' | 'manual';  // coach preference
  confirmedAt?: string;                    // when coach confirmed (manual mode)
  declinedReason?: string;                 // if coach declines booking request
  cancelledBy?: string;                    // userId who cancelled
  cancelledAt?: string;                    // when cancelled
  cancelReason?: string;                   // reason for cancellation
  statusBeforeCancellation?: BookingStatus; // active status to restore if reopened
  cancellationFee?: number;                // amount owed for late cancellation
  // Multi-week series fields
  seriesId?: string;                       // ID of the BookingSeries this booking belongs to
  seriesIndex?: number;                    // 0-based index within the series
  // Calendar sync
  calendarEventId?: string;               // Native calendar event ID for sync
}

export type AttendanceStatus = 'ATTENDED' | 'NO_SHOW';

export interface Session {
  id: string;
  bookingId: string;
  coachId: string;
  athleteId: string;
  completedAt: string;
  attendance: AttendanceStatus;
  notes: string; // Coach's session notes
  skillsWorkedOn: string[];
  performanceRating: number; // 1-5
  nextFocusAreas: string[];
  videoUrls?: string[]; // Session videos uploaded by coach
  coachName?: string; // @deprecated — resolve via coachId at display time
}

// Messages
export interface Conversation {
  id: string;
  participants: string[]; // User IDs
  relatedAthleteId?: string; // If parent chatting about kid
  relatedBookingId?: string;
  lastMessageAt: string;
  lastMessage?: string;
  unreadCount?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  sentAt: string;
  read: boolean;
}

// Social Posts
export interface Post {
  id: string;
  authorId: string;
  content: string;
  images?: string[];
  likes: string[]; // User IDs who liked
  commentCount?: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  likes: string[]; // User IDs who liked
  createdAt: string;
  updatedAt?: string;

  // Threading support
  parentId?: string; // If set, this is a reply to another comment (1-level deep)
  replyCount?: number; // Number of direct replies (top-level comments only)

  // Soft-delete
  isDeleted?: boolean;
  deletedAt?: string;
}

// Reviews
export interface Review {
  id: string;
  coachId: string;
  athleteId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

// Analytics Types
export interface CoachAnalytics {
  coachId: string;
  period: 'week' | 'month' | 'year';
  sessionsCount: number;
  activeClients: number;
  averageRating: number;
  topSkills: { skill: string; count: number }[];
  busiestDay: string;
  peakHour: number;
  revenueTotal: number; // GBP
}


// ===== SESSION MANAGEMENT TYPES =====

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

// Notifications
export type NotificationType =
  | 'SESSION_REQUEST'
  | 'SESSION_CONFIRMED'
  | 'SESSION_CANCELLED'
  | 'SESSION_REMINDER'
  | 'NEW_MESSAGE'
  | 'RECAP_SHARED'
  | 'PAYMENT_DUE'
  | 'CERTIFICATION_EXPIRING'
  | 'BADGE';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  deepLink?: string; // Route to navigate to
  relatedEntityId?: string; // e.g., sessionId, messageId
  isRead: boolean;
  createdAt: string;
}

// Payment Information
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELLED';

export interface PaymentInfo {
  id: string;
  sessionId: string;
  athleteId: string;
  payerId: string; // Parent or athlete
  amount: number; // GBP
  discountCode?: string;
  discountAmount?: number;
  finalAmount: number;
  status: PaymentStatus;
  dueDate?: string;
  paidAt?: string;
  refundedAt?: string;
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
