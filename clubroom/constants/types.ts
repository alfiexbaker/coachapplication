export type SportCategory = 'Football';

// ============================================================================
// SOCIAL MEDIA LINKS
// ============================================================================

export type SocialPlatform = 'instagram' | 'twitter' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok' | 'website';

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
  username?: string; // Optional display username (e.g., @coachsarah)
}

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}

export type FootballObjective =
  | 'Dribbling'
  | 'Passing'
  | 'Defending'
  | 'Finishing'
  | 'Goalkeeping'
  | 'Conditioning';

export type TrainingFormat = 'In-person' | 'Virtual' | 'Small group';

export type BadgeCategory = 'leadership' | 'consistency' | 'technique' | 'mindset' | 'teamwork' | 'resilience';
export type BadgeTier = 1 | 2 | 3;  // Bronze, Silver, Gold

export interface BadgeDefinition {
  id: string;
  label: string;
  tone?: 'success' | 'warning' | 'default';
  description?: string;
  // Progression fields (optional for non-athlete badges like coach verification badges)
  category?: BadgeCategory;
  tier?: BadgeTier;
  pointValue?: number;  // 10, 25, 50 for Bronze, Silver, Gold
}

export type BadgeVisibility = 'coach_only' | 'athlete' | 'supporters';

export interface BadgeAward {
  id: string;
  badgeId: string;
  badgeLabel: string;
  badgeTone?: 'success' | 'warning' | 'default';
  athleteId: string;
  athleteName?: string;
  coachId: string;
  coachName?: string;
  sessionId?: string;
  reason: string;
  note?: string;
  presetId?: string;
  cooldownBypassed?: boolean;
  cooldownWindowDays?: number;
  context?: 'session' | 'athlete_profile';
  overrideNote?: string;
  awardedBy: string;
  awardedByName?: string;
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

export interface CoachBadge extends BadgeDefinition {}

// School & Invite System
export interface School {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  photoUrl?: string;
  description?: string;
  activeCoachesCount: number;
  createdAt: string;
}

export interface InviteCode {
  id: string;
  code: string;
  schoolId: string;
  schoolName: string;
  createdBy: string; // admin user id
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  status: 'active' | 'expired' | 'exhausted';
}

// Club & squad system
export type ClubRole = 'OWNER' | 'ADMIN' | 'HEAD_COACH' | 'COACH' | 'MEMBER';

export interface Club {
  id: string;
  name: string;
  city: string;
  country?: string;
  badge?: string;
  photoUrl?: string;
  tagline?: string;
  memberCount: number;
  coachCount: number;
  squadCount: number;
  ownerId: string;
  ownerName: string;
  inviteCode: string;
}

export interface ClubMembership {
  clubId: string;
  userId: string;
  role: ClubRole;
  status: 'active' | 'pending';
  joinSource: 'invite' | 'created';
  inviteCode?: string;
  squadIds?: string[];
  canPostAsClub?: boolean;
}

export interface ClubSquad {
  id: string;
  clubId: string;
  name: string;
  level: string;
  memberCount: number;
  primaryCoach: string;
  meetLocation: string;
  nextSession?: string;
  tags?: string[];
  ageMin?: number;
  ageMax?: number;
}

// Squad member types for squad-based invites
export interface SquadMember {
  id: string;
  squadId: string;
  athleteId: string;
  athleteName: string;
  athleteAge?: number;
  athletePhotoUrl?: string;
  parentId: string;
  parentName: string;
  parentEmail?: string;
  parentPhone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  joinedAt: string;
  position?: string;
  jerseyNumber?: number;
}

// Squad invite tracking
export interface SquadInvite {
  id: string;
  squadId: string;
  squadName: string;
  targetType: 'SESSION' | 'MATCH' | 'EVENT';
  targetId: string;
  targetTitle: string;
  invitedBy: string;
  invitedByName: string;
  invitedAt: string;
  memberCount: number;
  excludedMemberIds?: string[];
  responses: {
    accepted: number;
    declined: number;
    pending: number;
  };
}

// Match types moved to MATCHES / FIXTURES section below

// Club event types moved to CLUB EVENTS section below

export interface ClubInvite {
  code: string;
  clubId: string;
  clubName: string;
  createdBy: string;
  createdByName: string;
  role: ClubRole;
  expiresAt: string;
  remainingUses: number;
}

export type ClubPostType = 'announcement' | 'photo' | 'event' | 'general' | 'achievement' | 'session' | 'match';

export interface ClubFeedPost {
  id: string;
  clubId: string;
  title: string;
  body: string;
  createdAt: string;
  audience: 'club' | 'squad' | 'staff';
  audienceLabel?: string;
  authorName: string;
  authorId?: string;
  postAs?: 'club' | 'self';
  postType?: ClubPostType;
  badgeAwarded?: string;
  attachments?: string[];
  imageUrl?: string;
  reactionCount?: number;
  commentCount?: number;
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  eventDate?: string;
  eventLocation?: string;
  // Achievement post fields
  athleteId?: string;
  athleteName?: string;
  badgeId?: string;
  badgeAwardId?: string;
  // Session/Match post fields
  sessionId?: string;
  matchId?: string;
  // Parent who shared this (for achievement shares)
  sharedByParentId?: string;
  sharedByParentName?: string;
}

// Enhanced Coach Profile (Facebook-style)
export interface CoachExperience {
  id: string;
  title: string;
  organization: string;
  startDate: string;
  endDate?: string;
  description?: string;
  current: boolean;
}

export interface CoachCertification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialUrl?: string;
}

export interface CoachLanguage {
  id: string;
  name: string;
  proficiency: 'Native' | 'Fluent' | 'Conversational' | 'Basic';
}

export interface CoachPost {
  id: string;
  coachId: string;
  content: string;
  mediaUrls?: string[];
  mediaType?: 'photo' | 'video';
  createdAt: string;
  likes: number;
  comments: number;
}

export interface CoachReview {
  id: string;
  parentName: string;
  parentPhotoUrl?: string;
  rating: number;
  content: string;
  createdAt: string;
  sessionDate: string;
}

export interface CoachProfile {
  id: string;
  fullName: string;
  primarySport: SportCategory;
  sports: SportCategory[];
  city: string;
  state: string;
  distanceMiles: number;
  rating: {
    average: number;
    reviewCount: number;
  };
  priceRange: {
    minUsd: number;
    maxUsd: number;
    unitLabel: string;
  };
  nextAvailability: string;
  badges: CoachBadge[];
  sessionFormats: TrainingFormat[];
  shortBio: string;
  profilePhotoUrl: string;
  coverPhotoUrl?: string;
  footballFocuses: FootballObjective[];
  schoolName?: string;
  schoolId?: string;
  location: {
    lat: number;
    lng: number;
  };

  // Facebook-style additions
  bio?: string; // Full bio (longer than shortBio)
  phone?: string;
  email?: string;
  website?: string;
  joinedDate: string;
  totalSessions: number;
  experiences: CoachExperience[];
  certifications: CoachCertification[];
  posts: CoachPost[];
  photoGallery: string[];
  videoGallery: string[];
  languages: CoachLanguage[];
  achievements: string[];
  socialLinks?: SocialLinks;
}

export interface CoachSearchParams {
  availability?: { startDate: string; endDate: string };
  geo?:
    | { boundingBox: { north: number; south: number; east: number; west: number } }
    | { radiusKm: number; center: { lat: number; lng: number } };
  sports?: SportCategory[];
  formats?: TrainingFormat[];
  skillLevels?: string[];
  price?: { minUsd?: number; maxUsd?: number };
  rating?: { min: number };
  coachGender?: 'Male' | 'Female' | 'Non-binary';
  languages?: string[];
}

export interface BookingSummary {
  id: string;
  coachName: string;
  childName: string;
  service: string;
  start: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
  locationLabel: string;
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
  // Group booking fields
  isGroupSession?: boolean;
  maxParticipants?: number;
  currentParticipants?: number;
  participants?: Array<{
    id: string;
    name: string;
    avatar: string;
    status: 'confirmed' | 'pending' | 'cancelled';
  }>;
}

// Session Offering System
export interface SessionRegistration {
  id: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  bookedAt: string;
  status: 'confirmed' | 'cancelled' | 'completed';
}

export interface SessionOffering {
  id: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubId?: string;
  clubScope?: 'club' | 'squad' | 'public';
  squadId?: string;
  title: string; // Session name/title
  description?: string;
  sessionType: '1on1' | 'group';
  maxParticipants: number;
  location: string;
  scheduledAt: string; // ISO date string
  isRecurring: boolean;
  recurrenceType: 'none' | 'weekly';
  dayOfWeek?: number; // 0-6 (Sunday-Saturday) for recurring sessions
  timeOfDay?: string; // "18:00" format for recurring sessions
  status: 'active' | 'cancelled' | 'completed' | 'full';
  visibility?: 'club' | 'public';
  registrations: SessionRegistration[];
  createdAt: string;
  priceUsd?: number;
  ageMin?: number; // Minimum age (e.g., 10 for U12)
  ageMax?: number; // Maximum age (e.g., 12 for U12)
  footballSkill?: FootballObjective; // Primary skill focus
}

export interface AthleteObjective {
  id: string;
  label: FootballObjective | 'Custom';
  status: 'active' | 'upcoming' | 'completed';
  updatedAt: string;
  note?: string;
  coachName: string;
  progress: number; // 0-100
  sessionsCompleted: number;
  startDate: string;
  targetSessions?: number;
}

export interface SessionHistoryEntry {
  id: string;
  date: string;
  coachName: string;
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

export interface PaymentReminder {
  id: string;
  title: string;
  amountUsd: number;
  dueDate: string;
  status: 'placeholder' | 'pending' | 'paid';
  description: string;
}

export type ChatSender = 'parent' | 'coach';

export interface ChatAttachment {
  id: string;
  type: 'photo' | 'video' | 'pdf';
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  sender: ChatSender;
  senderName?: string;
  body: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'seen' | 'pending';
  attachments?: ChatAttachment[];
}

export interface ChatThreadSummary {
  id: string;
  kind?: 'direct' | 'group';
  groupType?: 'club' | 'squad' | 'class' | 'announcement';
  bookingId: string;
  coachName: string;
  childName: string;
  serviceName: string;
  location: string;
  scheduledFor: string;
  unreadCount: number;
  unreadMentions?: number;
  memberCount?: number;
  title?: string;
  subtitle?: string;
  scopeLabel?: string;
  postingAsOptions?: string[];
  safetyCopy: string;
  pinnedObjectives?: FootballObjective[];
  lastMessageSnippet?: string;
  lastMessageSender?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  profilePhotoUrl?: string;
  bio?: string;
  role: 'User' | 'Parent' | 'Coach' | 'Admin';
  joinedDate: string;
  children?: Array<{
    name: string;
    age: number;
  }>;
  socialLinks?: SocialLinks;
}

export interface CoachFeedback {
  id: string;
  sessionId: string;
  coachId: string;
  athleteId: string;
  rating: number; // 1-5
  notes: string;
  highlights: string[];
  areasToImprove: string[];
  skillsWorked: FootballObjective[];
  skillUpdates: Array<{
    skill: FootballObjective;
    previousLevel: number;
    newLevel: number;
  }>;
  createdAt: string;
}

export interface SkillLevel {
  skill: FootballObjective;
  level: number; // 0-100
  lastUpdated: string;
}

export interface NotificationItem {
  id: string;
  type: 'booking' | 'message' | 'review' | 'payment' | 'reminder' | 'badge';
  title: string;
  body: string;
  timeLabel?: string;
  read?: boolean;
  badgeTitle?: string;
  athleteName?: string;
  badgeAwardId?: string;
  actionLabel?: string;
  handled?: boolean;
}

// ============================================================================
// SESSION INVITES (Coach → Parent)
// ============================================================================

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export interface SessionInvite {
  id: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string; // Club or Academy name (e.g., "Bradwell Boys")
  athleteIds: string[];
  athleteNames: string[];
  parentId: string;
  parentName: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'COUNTERED';
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
  selectedSlot?: TimeSlot; // The slot chosen when accepting
  counterProposal?: TimeSlot[];
  counterNote?: string;
  groupId?: string; // Links invites that were sent as part of a group/bulk send
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
}

export interface AvailabilityOverride {
  id: string;
  coachId: string;
  date: string;
  isBlocked: boolean;
  reason?: string;
  customSlots?: TimeSlot[];
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

// ============================================================================
// VIDEO MANAGEMENT
// ============================================================================

export type VideoAnnotationType = 'HIGHLIGHT' | 'IMPROVEMENT' | 'TECHNIQUE' | 'GENERAL';

export interface VideoAnnotation {
  id: string;
  timestamp: number;
  label: string;
  note?: string;
  type: VideoAnnotationType;
}

export interface SessionVideo {
  id: string;
  sessionId?: string;
  bookingId?: string;
  coachId: string;
  coachName: string;
  athleteIds: string[];
  athleteNames: string[];
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSize: number;
  annotations: VideoAnnotation[];
  visibility: 'PRIVATE' | 'SHARED' | 'PUBLIC';
  sharedWith: string[];
  createdAt: string;
  uploadStatus: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
  viewCount: number;
  tags: string[];
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

export interface GoalMilestone {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface Goal {
  id: string;
  athleteId: string;
  title: string;
  description?: string;
  targetDate?: string;
  progress: number;
  milestones: GoalMilestone[];
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  createdBy: 'COACH' | 'ATHLETE' | 'PARENT';
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface AthleteAnalytics {
  athleteId: string;
  athleteName: string;
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
  coachName: string;
  coachPhotoUrl?: string;
  clubId?: string;
  clubName?: string;
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
  squadName?: string;
  parentSessionId?: string; // For recurring instances, links to the template
  isFree?: boolean;         // Quick flag for free sessions
}

export interface GroupRegistration {
  id: string;
  sessionId: string;
  athleteId: string;
  athleteName: string;
  parentId: string;
  parentName: string;
  status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';
  registeredAt: string;
  paidAt?: string;
  attendedDates: string[];
  notes?: string;
}

// ============================================================================
// ACADEMY / SCHOOL SYSTEM
// ============================================================================

export type AcademyPermission =
  | 'MANAGE_STAFF'
  | 'MANAGE_SETTINGS'
  | 'CREATE_SESSIONS'
  | 'VIEW_ANALYTICS'
  | 'MANAGE_BILLING'
  | 'POST_AS_ACADEMY'
  | 'INVITE_MEMBERS';

export interface Academy {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  postcode: string;
  city: string;
  coachCount: number;
  athleteCount: number;
  sessionCount: number;
  isPublic: boolean;
  requiresApproval: boolean;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  rating?: {
    average: number;
    reviewCount: number;
  };
  sports: SportCategory[];
  specialties: FootballObjective[];
}

export interface AcademyMembership {
  id: string;
  academyId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  role: 'OWNER' | 'ADMIN' | 'HEAD_COACH' | 'COACH' | 'ASSISTANT' | 'MEMBER';
  permissions: AcademyPermission[];
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  joinedAt: string;
  invitedBy?: string;
}

export interface AcademyInvite {
  id: string;
  academyId: string;
  academyName: string;
  code: string;
  role: AcademyMembership['role'];
  permissions: AcademyPermission[];
  createdBy: string;
  createdByName: string;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
}

// ============================================================================
// COACH ROSTER & ATHLETE DIRECTORY
// ============================================================================

export interface RosterNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RosterEntry {
  id: string;
  coachId: string;
  athleteId: string;
  athleteName: string;
  athleteAge?: number;
  athletePhotoUrl?: string;
  athleteSkillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  parentId: string;
  parentName: string;
  parentEmail?: string;
  parentPhone?: string;
  status: 'ACTIVE' | 'PAUSED' | 'GRADUATED' | 'INACTIVE';
  startDate: string;
  lastSessionDate?: string;
  nextSessionDate?: string;
  totalSessions: number;
  totalRevenue: number;
  averageRating: number;
  notes: RosterNote[];
  tags: string[];
  primaryFocus?: FootballObjective;
  notificationPreference: 'ALL' | 'IMPORTANT' | 'NONE';
}

// ============================================================================
// VERIFICATION & TRUST
// ============================================================================

export interface VerificationItem {
  status: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  verifiedAt?: string;
  expiresAt?: string;
  documentUrl?: string;
  notes?: string;
}

export interface VerificationStatus {
  coachId: string;
  email: VerificationItem;
  phone: VerificationItem;
  identity: VerificationItem;
  backgroundCheck: VerificationItem;
  credentials: VerificationItem[];
  insurance: VerificationItem;
  overallLevel: 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM';
  lastUpdated: string;
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

// ============================================================================
// ENHANCED NOTIFICATIONS
// ============================================================================

export type NotificationType =
  | 'BOOKING_RECEIVED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'SESSION_REMINDER'
  | 'MESSAGE_RECEIVED'
  | 'SESSION_INVITE'
  | 'SESSION_INVITE_RESPONSE'
  | 'REVIEW_REQUEST'
  | 'REVIEW_RECEIVED'
  | 'BADGE_AWARDED'
  | 'WAITLIST_AVAILABLE'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'GOAL_COMPLETED'
  | 'VIDEO_SHARED'
  | 'MATCH_INVITE'
  | 'MATCH_RESPONSE'
  | 'MATCH_LINEUP'
  | 'MATCH_REMINDER'
  | 'MATCH_CANCELLED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  deepLink?: string;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationPreferences {
  userId: string;
  inApp: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
  typePreferences: {
    [key in NotificationType]?: {
      enabled: boolean;
      channels: ('IN_APP' | 'PUSH' | 'EMAIL' | 'SMS')[];
    };
  };
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// ============================================================================
// ENHANCED REVIEWS
// ============================================================================

export interface Review {
  id: string;
  coachId: string;
  coachName: string;
  parentId: string;
  parentName: string;
  parentPhotoUrl?: string;
  athleteId?: string;
  athleteName?: string;
  bookingId?: string;
  rating: number;
  title?: string;
  content: string;
  isPublic: boolean;
  response?: string;
  respondedAt?: string;
  isVerifiedBooking: boolean;
  status: 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';
  createdAt: string;
  updatedAt?: string;
  helpfulCount: number;
}

// ============================================================================
// PAYMENTS & TRANSACTIONS
// ============================================================================

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'CARD' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'BANK';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  stripePaymentMethodId?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'PAYMENT' | 'REFUND' | 'PAYOUT';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  description: string;
  bookingId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CoachEarnings {
  coachId: string;
  balance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  recentTransactions: Transaction[];
  payoutSchedule: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MANUAL';
  nextPayoutDate?: string;
  stripeAccountId?: string;
  stripeAccountStatus?: 'PENDING' | 'ACTIVE' | 'RESTRICTED';
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
// PACKAGES & PRICING
// ============================================================================

export interface SessionPackage {
  id: string;
  coachId: string;
  name: string;
  description?: string;
  sessionCount: number;
  priceUsd: number;
  savingsPercent: number;
  validDays: number;
  isActive: boolean;
  sessionType?: string;
  focus?: FootballObjective[];
}

export interface PackagePurchase {
  id: string;
  packageId: string;
  packageName: string;
  userId: string;
  coachId: string;
  sessionsTotal: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  purchasedAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED';
}

// ============================================================================
// MATCHES / FIXTURES
// ============================================================================

export type MatchType = 'FRIENDLY' | 'LEAGUE' | 'CUP' | 'TOURNAMENT';

export type MatchStatus = 'SCHEDULED' | 'LINEUP_SET' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type MatchPlayerStatus = 'INVITED' | 'AVAILABLE' | 'UNAVAILABLE' | 'SELECTED' | 'RESERVE';

export interface MatchPlayer {
  athleteId: string;
  athleteName: string;
  parentId: string;
  parentName?: string;
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
  clubName: string;
  squadId?: string;
  squadName?: string;
  coachId: string;
  coachName?: string;

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
  matchTitle: string;
  opponent: string;
  date: string;
  kickoffTime: string;
  venue: string;
  clubName: string;
  coachName: string;
  athleteName: string;
}

export interface MatchSelectionNotification {
  matchId: string;
  matchTitle: string;
  opponent: string;
  date: string;
  kickoffTime: string;
  venue: string;
  isSelected: boolean; // true = selected, false = reserve
  athleteName: string;
}

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
  userName: string;
  userPhotoUrl?: string;
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';
  status: RSVPStatus;
  guestCount: number;
  respondedAt: string;
}

export interface ClubEvent {
  id: string;
  clubId: string;
  clubName: string;
  createdBy: string;
  createdByName: string;

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
