// Core User Types
export type UserRole = 'COACH' | 'USER' | 'PARENT';

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
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';

export interface UserProfile {
  userId: string;
  bio: string;
  skillLevel: SkillLevel;
  position?: string; // e.g., 'Midfielder', 'Striker'
  goals: Goal[];
  parentId?: string; // If managed by parent
}

// Parent-Child Relationship
export interface Relationship {
  id: string;
  parentId: string;
  childId: string; // Child is a User with role='USER'
  relationshipType: 'PARENT_CHILD' | 'GUARDIAN';
}

// Bookings & Sessions
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Booking {
  id: string;
  coachId: string;
  athleteId: string; // The user being coached
  bookedById: string; // Could be parent or athlete
  status: BookingStatus;
  scheduledAt: string; // ISO date string
  duration: number; // minutes (default 60)
  location: string;
  notes?: string;
  coachName?: string; // Denormalized for easy display
  athleteName?: string; // Denormalized for easy display
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
  coachName?: string; // Denormalized
  athleteName?: string; // Denormalized
}

// Goals & Progress
export type GoalStatus = 'ACTIVE' | 'ACHIEVED' | 'PAUSED';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetDate?: string;
  status: GoalStatus;
  progress: number; // 0-100%
  createdAt: string;
}

// Messages
export interface Conversation {
  id: string;
  participants: string[]; // User IDs
  relatedAthleteId?: string; // If parent chatting about kid
  lastMessageAt: string;
  lastMessage?: string;
  unreadCount?: number;
  coachName?: string; // Denormalized
  athleteName?: string; // Denormalized
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  sentAt: string;
  read: boolean;
}

// Social Posts
export interface Post {
  id: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
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
  authorName?: string;
  authorAvatar?: string;
  content: string;
  likes: string[]; // User IDs who liked
  createdAt: string;
}

// Reviews
export interface Review {
  id: string;
  coachId: string;
  athleteId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  athleteName?: string;
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

export interface AthleteProgress {
  athleteId: string;
  totalSessions: number;
  averagePerformance: number;
  skillsProgress: { skill: string; level: number; trend: 'up' | 'down' | 'stable' }[];
  goalsActive: number;
  goalsAchieved: number;
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
  athleteName: string;
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
  | 'CERTIFICATION_EXPIRING';

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
