export type SportCategory = 'Football';

// ============================================================================
// WALLET & FINANCIAL SYSTEM
// ============================================================================
// User wallet for balance, top-ups, and payments
// Coach earnings for revenue tracking and withdrawals

export type TransactionType =
  | 'DEPOSIT'
  | 'TOP_UP'
  | 'BOOKING_PAYMENT'
  | 'BOOKING_REFUND'
  | 'WITHDRAWAL'
  | 'EARNING'
  | 'PLATFORM_FEE'
  | 'PROMO_CREDIT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: TransactionType;
  amount: number; // Positive for credit, negative for debit
  currency: string;
  status: TransactionStatus;
  description: string;
  reference?: string; // bookingId, withdrawalId, etc.
  balanceAfter: number;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

export interface Wallet {
  id: string;
  userId: string;
  userName: string;
  balance: number;
  currency: string;
  pendingBalance: number; // Funds on hold (e.g., pending refunds)
  totalDeposited: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export type PayoutMethodType = 'BANK_ACCOUNT' | 'PAYPAL' | 'STRIPE';

export interface PayoutMethod {
  id: string;
  coachId: string;
  type: PayoutMethodType;
  isDefault: boolean;
  isVerified: boolean;
  // Bank account details
  bankName?: string;
  accountLastFour?: string;
  sortCode?: string;
  // PayPal details
  paypalEmail?: string;
  // Stripe details
  stripeAccountId?: string;
  // Common
  nickname?: string;
  createdAt: string;
  verifiedAt?: string;
}

export type WithdrawalStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface Withdrawal {
  id: string;
  coachId: string;
  coachName: string;
  amount: number;
  currency: string;
  fee: number; // Platform fee for withdrawal
  netAmount: number; // Amount after fees
  payoutMethodId: string;
  payoutMethod: PayoutMethodType;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
  reference?: string; // Bank reference number
}

export interface CoachEarnings {
  coachId: string;
  coachName: string;
  // Balances
  availableBalance: number; // Can withdraw now
  pendingBalance: number; // Awaiting session completion
  totalEarned: number; // Lifetime earnings
  totalWithdrawn: number; // Lifetime withdrawals
  // Stats
  totalSessions: number;
  averageSessionValue: number;
  // Period stats
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;
  // Recent activity
  recentTransactions: EarningTransaction[];
  pendingWithdrawals: Withdrawal[];
  // Payout settings
  payoutMethods: PayoutMethod[];
  defaultPayoutMethodId?: string;
  // Platform fees
  platformFeePercent: number; // e.g., 10 for 10%
  currency: string;
  updatedAt: string;
}

export interface EarningTransaction {
  id: string;
  coachId: string;
  type: 'SESSION_PAYMENT' | 'REFUND' | 'WITHDRAWAL' | 'ADJUSTMENT' | 'PLATFORM_FEE';
  amount: number;
  currency: string;
  status: TransactionStatus;
  description: string;
  bookingId?: string;
  athleteName?: string;
  sessionDate?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================================================
// SIMPLIFIED USER TYPE SYSTEM
// ============================================================================
// Instead of 4 roles (COACH, USER, PARENT, ADMIN), we use 2 primary types:
// - USER: Can be athlete AND/OR parent
// - COACH: Can be individual OR organization
// Admin is a system flag, not a user type

export type SimplifiedUserType = 'USER' | 'COACH';

export interface ChildReference {
  childId: string;
  childName: string;
  relationshipType: 'PARENT_CHILD' | 'GUARDIAN';
  addedAt: string;
}

export interface GuardianReference {
  guardianId: string;
  guardianName: string;
  relationshipType: 'PARENT_CHILD' | 'GUARDIAN';
  isPrimary: boolean;
}

export type CoachPermission =
  | 'MANAGE_BOOKINGS'
  | 'MANAGE_ROSTER'
  | 'AWARD_BADGES'
  | 'VIEW_EARNINGS'
  | 'MANAGE_SETTINGS'
  | 'INVITE_STAFF'
  | 'POST_AS_COACH';

export interface StaffMember {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'HEAD_COACH' | 'COACH' | 'ASSISTANT' | 'ADMIN';
  permissions: CoachPermission[];
  joinedAt: string;
  isActive: boolean;
}

// Simplified User interface (replaces USER + PARENT roles)
export interface SimplifiedUser {
  id: string;
  email: string;
  name: string;
  type: 'USER';
  avatar?: string;
  bio?: string;
  phone?: string;
  dateOfBirth: string;
  postcode: string;
  createdAt: string;

  // Self-athlete properties (optional - if user is also an athlete)
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';
  position?: string;

  // Parent properties (optional - if user has children)
  children?: ChildReference[];

  // If managed by a parent
  parentId?: string;
  guardians?: GuardianReference[];

  // Admin flag (instead of separate ADMIN role)
  isSystemAdmin?: boolean;
}

// ============================================================================
// FOLLOWING SYSTEM
// ============================================================================
// Enables users to follow coaches (and potentially other users) to see their
// content in a personalized feed. This creates the missing non-bilateral
// relationship between users and coaches outside of club membership.

export interface Follow {
  id: string;
  followerId: string;
  followerName: string;
  followerType: 'USER' | 'COACH';
  followerAvatar?: string;
  followingId: string;
  followingName: string;
  followingType: 'USER' | 'COACH';
  followingAvatar?: string;
  createdAt: string;
  // Notification preferences for this follow
  notifyOnPost: boolean;
  notifyOnSession: boolean;
}

// For private profiles that require approval
export interface FollowRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar?: string;
  targetId: string;
  targetName: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  message?: string; // Optional message with request
  createdAt: string;
  respondedAt?: string;
}

// ============================================================================
// SIMPLIFIED USER TYPE SYSTEM (continued)
// ============================================================================

// Simplified Coach interface (individuals or organizations)
export interface SimplifiedCoach {
  id: string;
  email: string;
  name: string;
  type: 'COACH';
  avatar?: string;
  createdAt: string;

  // Organization support
  isOrganization: boolean;
  organizationName?: string;
  organizationLogo?: string;

  // Staff (if organization)
  staffMembers?: StaffMember[];

  // Availability status
  isLive: boolean; // Currently accepting new bookings
  liveStatusReason?: string; // "On vacation", "Fully booked", etc.

  // Profile
  bio: string;
  phone?: string;
  website?: string;
  primarySport: SportCategory;
  sports: SportCategory[];
  specialties: string[];

  // Qualifications
  certifications: CoachCertification[];
  experiences: CoachExperience[];
  languages: CoachLanguage[];

  // Location
  city: string;
  state?: string;
  postcode: string;
  travelRadius?: number; // miles willing to travel

  // Pricing
  priceRange: {
    minUsd: number;
    maxUsd: number;
    unitLabel: string;
  };
  sessionFormats: ('In-person' | 'Virtual' | 'Small group')[];

  // Ratings
  rating: {
    average: number;
    reviewCount: number;
  };

  // Verification
  verificationLevel: 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM';

  // Social
  socialLinks?: SocialLinks;

  // Analytics
  totalSessions: number;
  activeAthletes: number;
}

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

// Squad session invite - for bulk inviting squad members to sessions
export interface SquadSessionInvite {
  id: string;
  squadId: string;
  squadName: string;
  sessionId: string;
  sessionTitle: string;
  invitedMembers: SquadInvitedMember[];
  sentAt: string;
  sentBy: string;
  sentByName: string;
  status: 'SENT' | 'PARTIAL' | 'FAILED';
  result: BulkInviteResult;
}

// Individual member in a squad bulk invite
export interface SquadInvitedMember {
  memberId: string;
  athleteId: string;
  athleteName: string;
  parentId: string;
  parentName: string;
  inviteId?: string; // Reference to the individual SessionInvite created
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  failureReason?: string;
  skipReason?: string;
}

// Result of a bulk invite operation
export interface BulkInviteResult {
  sent: number;
  failed: number;
  skipped: number;
  totalAttempted: number;
  errors: BulkInviteError[];
  groupId?: string;
}

// Error details for failed bulk invites
export interface BulkInviteError {
  memberId: string;
  athleteName: string;
  error: string;
  code?: 'DUPLICATE' | 'INVALID_PARENT' | 'RATE_LIMITED' | 'UNKNOWN';
}

// Squad invite history entry
export interface SquadInviteHistoryEntry {
  id: string;
  squadId: string;
  squadName: string;
  sessionId: string;
  sessionTitle: string;
  sessionType: string;
  focus: string;
  sentAt: string;
  sentBy: string;
  sentByName: string;
  inviteCount: number;
  acceptedCount: number;
  declinedCount: number;
  pendingCount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
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
  recurrenceType: 'none' | 'weekly' | 'biweekly';
  dayOfWeek?: number; // 0-6 (Sunday-Saturday) for recurring sessions
  timeOfDay?: string; // "18:00" format for recurring sessions
  endDate?: string; // ISO date string - when recurring series ends
  cancelledInstances?: string[]; // ISO date strings of cancelled individual instances
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
  bookingId?: string; // Link to created booking (bidirectional)
  dismissed?: boolean; // When parent removes/hides the invite from their view
}

// ============================================================================
// COUNTER-OFFER NEGOTIATION SYSTEM
// ============================================================================
// Enables full negotiation flow for booking time changes between parents and coaches

export type CounterOfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export type CounterOfferProposerRole = 'PARENT' | 'COACH';

export interface CounterOffer {
  id: string;
  bookingId: string;
  proposedBy: CounterOfferProposerRole;
  proposerId: string;
  proposerName: string;
  originalTime: TimeSlot;
  proposedTime: TimeSlot;
  status: CounterOfferStatus;
  message?: string;
  rejectionReason?: string;
  createdAt: string;
  respondedAt?: string;
  expiresAt: string;
}

export interface NegotiationHistory {
  id: string;
  bookingId: string;
  coachId: string;
  coachName: string;
  parentId: string;
  parentName: string;
  athleteId: string;
  athleteName: string;
  offers: CounterOffer[];
  originalTime: TimeSlot;
  finalTime?: TimeSlot;
  status: 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  createdAt: string;
  resolvedAt?: string;
}

export interface CounterOfferNotification {
  type: 'COUNTER_OFFER_RECEIVED' | 'COUNTER_OFFER_ACCEPTED' | 'COUNTER_OFFER_REJECTED' | 'COUNTER_OFFER_EXPIRED';
  counterOfferId: string;
  bookingId: string;
  proposerName: string;
  proposedTime: TimeSlot;
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
  /** Whether clients can reschedule bookings */
  allowRescheduling: boolean;
  /** Maximum hours before session that rescheduling is allowed */
  rescheduleDeadlineHours: number;
  createdAt: string;
  updatedAt: string;
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
  /** ID of the user who created the annotation */
  createdBy?: string;
  /** Name of the user who created the annotation */
  createdByName?: string;
  /** When the annotation was created */
  createdAt?: string;
  /** When the annotation was last updated */
  updatedAt?: string;
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

/**
 * Extended annotation data for export/sharing purposes
 */
export interface AnnotationExport {
  /** Video title */
  videoTitle: string;
  /** Video duration in seconds */
  videoDuration: number;
  /** Coach name */
  coachName: string;
  /** Athlete names */
  athleteNames: string[];
  /** Export timestamp */
  exportedAt: string;
  /** Annotations sorted by timestamp */
  annotations: Array<{
    timestamp: number;
    timestampFormatted: string;
    label: string;
    note?: string;
    type: VideoAnnotationType;
    typeLabel: string;
  }>;
}

/**
 * Annotated video with full annotation details
 * Used for the coach annotation and athlete review screens
 */
export interface AnnotatedVideo {
  /** Unique video ID */
  id: string;
  /** Optional session ID this video belongs to */
  sessionId?: string;
  /** Video URL for playback */
  videoUrl: string;
  /** Thumbnail URL for preview */
  thumbnailUrl: string;
  /** Video duration in seconds */
  duration: number;
  /** Video title */
  title: string;
  /** Video description */
  description?: string;
  /** Coach who uploaded the video */
  coachId: string;
  /** Coach name */
  coachName: string;
  /** Athletes featured in the video */
  athleteIds: string[];
  /** Athlete names */
  athleteNames: string[];
  /** All annotations on this video, sorted by timestamp */
  annotations: VideoAnnotation[];
  /** When the video was created */
  createdAt: string;
  /** Video visibility status */
  visibility: 'PRIVATE' | 'SHARED' | 'PUBLIC';
  /** List of user IDs the video is shared with */
  sharedWith: string[];
  /** Number of times the video has been viewed */
  viewCount: number;
  /** Tags for categorization */
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

// ============================================================================
// SKILL PROGRESSION TREES
// ============================================================================
// Visual skill trees showing progression paths for athletes
// Skills unlock as the athlete progresses through training
// Connected to the badge system for rewarding achievements

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
// Athletes can set specific training goals with milestones
// Coaches can view athlete goals when planning sessions
// Supports tracking progress and celebrating achievements

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

/**
 * Aggregated consent status for an athlete - used in coach consent dashboard
 */
export interface AthleteConsent {
  athleteId: string;
  athleteName: string;
  athletePhotoUrl?: string;
  parentName: string;
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
  | 'MATCH_CANCELLED'
  | 'NEW_FOLLOWER'
  | 'FOLLOW_REQUEST'
  | 'FOLLOW_REQUEST_ACCEPTED';

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

/**
 * Notification channel types for delivery preferences
 */
export type NotificationChannel = 'PUSH' | 'EMAIL' | 'SMS';

/**
 * Notification categories for grouping type preferences
 */
export type NotificationCategory =
  | 'BOOKINGS'
  | 'MESSAGES'
  | 'BADGES'
  | 'PAYMENTS'
  | 'REMINDERS'
  | 'SOCIAL'
  | 'MATCHES';

/**
 * Mapping of notification types to their categories
 */
export const NOTIFICATION_TYPE_CATEGORIES: Record<NotificationType, NotificationCategory> = {
  BOOKING_RECEIVED: 'BOOKINGS',
  BOOKING_CONFIRMED: 'BOOKINGS',
  BOOKING_CANCELLED: 'BOOKINGS',
  SESSION_REMINDER: 'REMINDERS',
  MESSAGE_RECEIVED: 'MESSAGES',
  SESSION_INVITE: 'BOOKINGS',
  SESSION_INVITE_RESPONSE: 'BOOKINGS',
  REVIEW_REQUEST: 'MESSAGES',
  REVIEW_RECEIVED: 'MESSAGES',
  BADGE_AWARDED: 'BADGES',
  WAITLIST_AVAILABLE: 'BOOKINGS',
  PAYMENT_RECEIVED: 'PAYMENTS',
  PAYMENT_FAILED: 'PAYMENTS',
  GOAL_COMPLETED: 'BADGES',
  VIDEO_SHARED: 'MESSAGES',
  MATCH_INVITE: 'MATCHES',
  MATCH_RESPONSE: 'MATCHES',
  MATCH_LINEUP: 'MATCHES',
  MATCH_REMINDER: 'MATCHES',
  MATCH_CANCELLED: 'MATCHES',
  NEW_FOLLOWER: 'SOCIAL',
  FOLLOW_REQUEST: 'SOCIAL',
  FOLLOW_REQUEST_ACCEPTED: 'SOCIAL',
};

/**
 * Category display configuration
 */
export interface NotificationCategoryConfig {
  id: NotificationCategory;
  label: string;
  description: string;
  icon: string;
}

/**
 * All notification category configurations
 */
export const NOTIFICATION_CATEGORIES: NotificationCategoryConfig[] = [
  { id: 'BOOKINGS', label: 'Bookings & Sessions', description: 'Session invites, confirmations, and changes', icon: 'calendar' },
  { id: 'MESSAGES', label: 'Messages', description: 'Direct messages and reviews', icon: 'chatbubble' },
  { id: 'BADGES', label: 'Achievements', description: 'Badges and goal completions', icon: 'trophy' },
  { id: 'PAYMENTS', label: 'Payments', description: 'Payment confirmations and issues', icon: 'card' },
  { id: 'REMINDERS', label: 'Reminders', description: 'Upcoming session reminders', icon: 'alarm' },
  { id: 'SOCIAL', label: 'Social', description: 'Followers and connection requests', icon: 'people' },
  { id: 'MATCHES', label: 'Matches', description: 'Match invites and updates', icon: 'football' },
];

/**
 * Quiet hours time range configuration
 */
export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:mm format (e.g., "22:00")
  endTime: string;   // HH:mm format (e.g., "07:00")
  timezone?: string; // User's timezone
}

/**
 * Per-type notification preference configuration
 */
export interface TypeNotificationPreference {
  enabled: boolean;
  channels: NotificationChannel[];
}

/**
 * Muted coach entry - represents a coach the user has muted
 */
export interface MutedCoach {
  coachId: string;
  coachName: string;
  coachAvatar?: string;
  mutedAt: string;
  reason?: string;
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

/**
 * Enhanced notification preferences with all configuration options
 */
export interface EnhancedNotificationPreferences {
  /** User ID these preferences belong to */
  userId: string;

  /** Global channel toggles */
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };

  /** Quiet hours configuration */
  quietHours: QuietHours;

  /** Per-type notification preferences */
  typePreferences: Partial<Record<NotificationType, TypeNotificationPreference>>;

  /** List of muted coaches */
  mutedCoaches: MutedCoach[];

  /** When preferences were last updated */
  updatedAt: string;

  /** When preferences were created */
  createdAt: string;
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

/** Session package that coaches can create and sell */
export interface SessionPackage {
  /** Unique identifier for the package */
  id: string;
  /** ID of the coach who created this package */
  coachId: string;
  /** Coach name for display purposes */
  coachName?: string;
  /** Package display name (e.g., "5 Session Starter Bundle") */
  name: string;
  /** Optional description of what's included */
  description?: string;
  /** Number of sessions included in the package */
  sessionCount: number;
  /** Total price for the package in GBP */
  price: number;
  /** Discount percentage compared to individual session pricing */
  discountPercent: number;
  /** Number of days the package is valid after purchase */
  validDays: number;
  /** Whether the package is currently available for purchase */
  isActive: boolean;
  /** Optional session type restriction */
  sessionType?: string;
  /** Optional football focus areas */
  focus?: FootballObjective[];
  /** Currency code (default: GBP) */
  currency?: string;
  /** Price per individual session for comparison */
  pricePerSession?: number;
  /** When the package was created */
  createdAt?: string;
  /** When the package was last updated */
  updatedAt?: string;
}

/** Status of a purchased package */
export type PackagePurchaseStatus = 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'REFUNDED';

/** Record of a user's package purchase */
export interface PackagePurchase {
  /** Unique identifier for the purchase */
  id: string;
  /** ID of the user who purchased the package */
  userId: string;
  /** Name of the user who purchased */
  userName?: string;
  /** ID of the package that was purchased */
  packageId: string;
  /** Package name at time of purchase */
  packageName: string;
  /** ID of the coach who created the package */
  coachId: string;
  /** Coach name for display */
  coachName?: string;
  /** Total sessions in the package */
  sessionsTotal: number;
  /** Number of sessions used */
  sessionsUsed: number;
  /** Remaining sessions available */
  sessionsRemaining: number;
  /** When the package was purchased (ISO string) */
  purchasedAt: string;
  /** When the package expires (ISO string) */
  expiresAt: string;
  /** Current status of the purchase */
  status: PackagePurchaseStatus;
  /** Price paid for the package */
  pricePaid: number;
  /** Currency code */
  currency: string;
  /** IDs of bookings that used sessions from this package */
  redeemedBookingIds?: string[];
  /** Transaction ID from wallet service */
  transactionId?: string;
}

/** Record of a session redemption from a package */
export interface PackageRedemption {
  /** Unique identifier for the redemption */
  id: string;
  /** ID of the package purchase */
  purchaseId: string;
  /** ID of the booking this session was used for */
  bookingId: string;
  /** When the session was redeemed */
  redeemedAt: string;
  /** ID of the user who redeemed */
  userId: string;
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

// ============================================================================
// EVENT RSVP & ATTENDANCE TRACKING
// ============================================================================
// Enhanced RSVP tracking and check-in management for club events.
// Supports attendance validation, statistics, and event management.

/**
 * Represents a structured RSVP record for an event
 * Extends the basic EventAttendee with additional tracking fields
 */
export interface EventRSVP {
  /** Unique identifier for the RSVP */
  id: string;
  /** ID of the event this RSVP is for */
  eventId: string;
  /** ID of the user who submitted the RSVP */
  userId: string;
  /** Name of the user for display purposes */
  userName: string;
  /** User's avatar URL */
  userPhotoUrl?: string;
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
  userName: string;
  /** User's avatar URL */
  userPhotoUrl?: string;
  /** User's role */
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';
  /** When the user checked in (ISO string) */
  checkedInAt: string;
  /** ID of the user who performed the check-in (for coach check-ins) */
  checkedInBy: string;
  /** Name of the person who performed the check-in */
  checkedInByName: string;
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
  userName: string;
  userPhotoUrl?: string;
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
  userName: string;
  userPhotoUrl?: string;
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';
  checkedInBy: string;
  checkedInByName: string;
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
 * Users can subscribe to automatically book the same time slot on a recurring basis
 */
export interface RecurringBooking {
  /** Unique identifier for the recurring booking */
  id: string;
  /** ID of the user who created the subscription */
  userId: string;
  /** Name of the user for display purposes */
  userName: string;
  /** ID of the coach being booked */
  coachId: string;
  /** Name of the coach for display purposes */
  coachName: string;
  /** Avatar URL of the coach */
  coachPhotoUrl?: string;
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
  /** Price per session in USD */
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
}

/**
 * Parameters for creating a new recurring booking
 */
export interface CreateRecurringBookingParams {
  userId: string;
  userName: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  athleteId?: string;
  athleteName?: string;
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
// Enables users to join waitlists for full sessions
// Automatic notifications when spots become available
// Optional auto-booking for convenience

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
  userName: string;
  /** Optional user avatar URL */
  userPhotoUrl?: string;
  /** ID of the session they're waiting for */
  sessionId: string;
  /** Title of the session for display purposes */
  sessionTitle?: string;
  /** Scheduled date/time of the session */
  sessionScheduledAt?: string;
  /** Coach ID for the session */
  coachId?: string;
  /** Coach name for display purposes */
  coachName?: string;
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
}

/**
 * Parameters for joining a waitlist
 */
export interface JoinWaitlistParams {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  sessionId: string;
  sessionTitle?: string;
  sessionScheduledAt?: string;
  coachId?: string;
  coachName?: string;
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
// HOMEWORK & DRILLS SYSTEM
// ============================================================================
// Coaches can create drills and assign them to athletes as homework between sessions.
// Athletes can view assigned drills, watch video demonstrations, and mark them complete.
// Supports progress tracking on drill completion.

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
 * Drills form the coach's library of exercises.
 */
export interface Drill {
  /** Unique identifier for the drill */
  id: string;
  /** ID of the coach who created this drill */
  coachId: string;
  /** Name of the coach for display purposes */
  coachName?: string;
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
 * Tracks completion status and due dates.
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
  athleteName?: string;
  /** ID of the coach who assigned the drill */
  assignedBy: string;
  /** Name of the assigning coach for display */
  assignedByName?: string;
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

// ============================================================================
// REFERRAL SYSTEM
// ============================================================================
// Users can invite friends via unique referral codes
// Both referrer and referee earn wallet credits when the referee signs up and completes their first booking

/**
 * Status of a referral
 */
export type ReferralStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED';

/**
 * A unique referral code generated for a user
 * Used to track and reward referrals
 */
export interface ReferralCode {
  /** Unique identifier for the referral code record */
  id: string;
  /** User ID of the code owner */
  userId: string;
  /** The unique referral code string (e.g., "SARAH-ABC123") */
  code: string;
  /** Credit amount awarded per successful referral (in GBP) */
  creditAmount: number;
  /** Number of uses remaining (-1 for unlimited) */
  usesRemaining: number;
  /** When the code expires (ISO date string, optional for no expiry) */
  expiresAt?: string;
  /** Whether the code is currently active */
  isActive: boolean;
  /** When the code was created */
  createdAt: string;
  /** When the code was last updated */
  updatedAt: string;
}

/**
 * A referral record tracking when one user refers another
 */
export interface Referral {
  /** Unique identifier for the referral */
  id: string;
  /** User ID of the person who made the referral */
  referrerId: string;
  /** User ID of the person who was referred */
  refereeId: string;
  /** Display name of the referee */
  refereeName: string;
  /** The referral code used */
  code: string;
  /** Amount of credit awarded (0 if pending/expired) */
  creditAwarded: number;
  /** Current status of the referral */
  status: ReferralStatus;
  /** When the referral was created */
  createdAt: string;
  /** When the referral was completed (if applicable) */
  completedAt?: string;
  /** ID of the booking that triggered completion (if applicable) */
  triggerBookingId?: string;
}

/**
 * Statistics for a user's referral activity
 */
export interface ReferralStats {
  /** User ID these stats belong to */
  userId: string;
  /** Total credits earned from referrals (in GBP) */
  totalEarned: number;
  /** Total number of successful referrals */
  referredCount: number;
  /** Number of pending referrals */
  pendingCount: number;
  /** Current referral code */
  currentCode: string;
  /** Credit amount per referral */
  creditPerReferral: number;
}

// ============================================================================
// FAVOURITES SYSTEM
// ============================================================================
// Users can save/favourite coaches for quick access and re-booking
// This provides a lightweight way to bookmark coaches without following

/**
 * A favourited coach relationship - allows users to save coaches for quick access
 */
export interface FavouriteCoach {
  /** Unique identifier for this favourite relationship */
  id: string;
  /** ID of the user who favourited the coach */
  userId: string;
  /** ID of the favourited coach */
  coachId: string;
  /** Display name of the coach (denormalized for quick display) */
  coachName: string;
  /** Coach's avatar URL (denormalized for quick display) */
  coachAvatar?: string;
  /** Coach's primary sport */
  coachSport?: SportCategory;
  /** Coach's rating (denormalized snapshot) */
  coachRating?: number;
  /** Coach's price range (denormalized snapshot) */
  coachPriceMin?: number;
  coachPriceMax?: number;
  /** Coach's location */
  coachCity?: string;
  /** Whether this favourite is currently active */
  isFavourite: boolean;
  /** When the coach was favourited */
  createdAt: string;
  /** When this record was last updated */
  updatedAt?: string;
  /** Optional note from the user about why they favourited */
  note?: string;
}

// ============================================================================
// FAMILY DASHBOARD
// ============================================================================
// Family dashboard types for parents to view all children's sessions,
// calendar view, and spending overview in one unified dashboard.

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
// Types for multi-guardian support, invitations, and access permissions

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
  userName: string;
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
  inviterName: string;
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
  childName: string;
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
  childName: string;
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
  coachName?: string;
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
  childName: string;
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
// INVOICE & RECEIPT SYSTEM
// ============================================================================
// Generate PDF invoices/receipts for sessions
// Parents can download receipts for expense tracking
// Coaches can generate invoices for bookings

/**
 * Status of an invoice
 */
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'VOID';

/**
 * Represents an invoice for a coaching session
 */
export interface Invoice {
  /** Unique identifier for the invoice */
  id: string;
  /** Invoice number for display (e.g., INV-2024-001) */
  invoiceNumber: string;
  /** ID of the user this invoice belongs to */
  userId: string;
  /** Name of the user for display */
  userName?: string;
  /** ID of the associated booking */
  bookingId: string;
  /** Name of the coach */
  coachName: string;
  /** ID of the coach */
  coachId: string;
  /** Name of the athlete */
  athleteName: string;
  /** ID of the athlete */
  athleteId?: string;
  /** Date of the session (ISO string) */
  sessionDate: string;
  /** Session type/description */
  sessionType?: string;
  /** Location of the session */
  sessionLocation?: string;
  /** Duration of the session in minutes */
  sessionDuration?: number;
  /** Subtotal amount before tax */
  amount: number;
  /** Tax amount (VAT) */
  tax: number;
  /** Tax rate percentage (e.g., 20 for 20%) */
  taxRate: number;
  /** Total amount including tax */
  total: number;
  /** Currency code (default: GBP) */
  currency: string;
  /** Current status of the invoice */
  status: InvoiceStatus;
  /** When the invoice was created */
  createdAt: string;
  /** When the invoice was last updated */
  updatedAt?: string;
  /** When the invoice was sent (if applicable) */
  sentAt?: string;
  /** Email address the invoice was sent to */
  sentTo?: string;
  /** When the invoice was paid (if applicable) */
  paidAt?: string;
  /** When the invoice was voided (if applicable) */
  voidedAt?: string;
  /** Reason for voiding (if applicable) */
  voidReason?: string;
  /** URL to the generated PDF */
  pdfUrl?: string;
  /** Due date for payment (ISO string) */
  dueDate?: string;
  /** Additional notes on the invoice */
  notes?: string;
  /** Coach's business details for the invoice */
  coachBusinessName?: string;
  coachBusinessAddress?: string;
  coachBusinessEmail?: string;
  coachBusinessPhone?: string;
  /** Billing address for the recipient */
  billingAddress?: string;
}

/**
 * Summary of invoices for a user
 */
export interface InvoiceSummary {
  /** User ID these stats belong to */
  userId: string;
  /** Total number of invoices */
  totalInvoices: number;
  /** Number of paid invoices */
  paidCount: number;
  /** Number of pending/sent invoices */
  pendingCount: number;
  /** Number of draft invoices */
  draftCount: number;
  /** Number of voided invoices */
  voidedCount: number;
  /** Total amount of all invoices */
  totalAmount: number;
  /** Total amount paid */
  totalPaid: number;
  /** Total amount pending */
  totalPending: number;
  /** Currency code */
  currency: string;
}

/**
 * Filter options for querying invoices
 */
export interface InvoiceFilter {
  /** Filter by status */
  status?: InvoiceStatus | InvoiceStatus[];
  /** Filter by date range start */
  dateFrom?: string;
  /** Filter by date range end */
  dateTo?: string;
  /** Filter by coach ID */
  coachId?: string;
  /** Filter by booking ID */
  bookingId?: string;
}

/**
 * Parameters for generating a new invoice
 */
export interface GenerateInvoiceParams {
  /** ID of the booking to generate invoice for */
  bookingId: string;
  /** Optional notes to include */
  notes?: string;
  /** Optional due date */
  dueDate?: string;
  /** Tax rate to apply (default: 20 for UK VAT) */
  taxRate?: number;
}

// ============================================================================
// PROMO CODES SYSTEM
// ============================================================================
// Admins can create promotional codes that users can redeem for wallet credits.
// Supports usage limits, expiration dates, and tracking of all redemptions.

/**
 * A promotional code that can be redeemed for wallet credits
 */
export interface PromoCode {
  /** Unique identifier for the promo code */
  id: string;
  /** The code string that users enter (e.g., "SUMMER25") */
  code: string;
  /** Credit amount in GBP awarded when code is redeemed */
  creditAmount: number;
  /** Maximum number of times this code can be used (total across all users) */
  maxUses: number;
  /** Current number of times this code has been used */
  currentUses: number;
  /** When the code expires (ISO date string, optional for no expiry) */
  expiresAt?: string;
  /** Whether the code is currently active and can be redeemed */
  isActive: boolean;
  /** User ID of the admin who created this code */
  createdBy: string;
  /** Display name of the admin who created this code */
  createdByName?: string;
  /** When the code was created */
  createdAt: string;
  /** When the code was last updated */
  updatedAt: string;
  /** Optional description or notes about the code */
  description?: string;
  /** Whether each user can only use this code once */
  onePerUser: boolean;
}

/**
 * Record of a promo code redemption by a user
 */
export interface PromoCodeUsage {
  /** Unique identifier for the usage record */
  id: string;
  /** ID of the promo code that was used */
  codeId: string;
  /** The code string that was used */
  code: string;
  /** ID of the user who redeemed the code */
  userId: string;
  /** Display name of the user who redeemed */
  userName?: string;
  /** Credit amount that was awarded */
  creditAmount: number;
  /** When the code was redeemed */
  usedAt: string;
  /** ID of the wallet transaction created */
  transactionId?: string;
}

/**
 * Parameters for creating a new promo code
 */
export interface CreatePromoCodeParams {
  /** The code string (will be uppercased) */
  code: string;
  /** Credit amount in GBP */
  creditAmount: number;
  /** Maximum number of uses */
  maxUses: number;
  /** Expiration date (ISO string, optional) */
  expiresAt?: string;
  /** Optional description */
  description?: string;
  /** Whether each user can only use once (default: true) */
  onePerUser?: boolean;
  /** Admin user ID creating the code */
  createdBy: string;
  /** Admin user name */
  createdByName?: string;
}

/**
 * Result of validating a promo code
 */
export interface PromoCodeValidationResult {
  /** Whether the code is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** The promo code if valid */
  promoCode?: PromoCode;
}

/**
 * Result of redeeming a promo code
 */
export interface PromoCodeRedemptionResult {
  /** Whether the redemption was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** The usage record if successful */
  usage?: PromoCodeUsage;
  /** The new wallet balance after redemption */
  newBalance?: number;
}

/**
 * Statistics for promo codes
 */
export interface PromoCodeStats {
  /** Total number of codes */
  totalCodes: number;
  /** Number of active codes */
  activeCodes: number;
  /** Number of expired codes */
  expiredCodes: number;
  /** Number of exhausted codes (maxUses reached) */
  exhaustedCodes: number;
  /** Total credits awarded across all codes */
  totalCreditsAwarded: number;
  /** Total redemptions across all codes */
  totalRedemptions: number;
}

// ============================================================================
// INJURY & RECOVERY TRACKING
// ============================================================================
// Athletes can log injuries, track recovery progress, and share status with coaches.
// Supports recovery timeline with notes and percentage-based progress tracking.

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
  createdByName?: string;
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
  userName?: string;
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
  commonBodyParts: Array<{ bodyPart: BodyPart; count: number }>;
  /** Average recovery time in days */
  averageRecoveryDays: number;
}

// ============================================================================
// COACH ANALYTICS DASHBOARD
// ============================================================================
// Comprehensive analytics for coaches to track revenue, sessions, retention,
// and client patterns. Supports date range filtering and trend analysis.

/**
 * Time period for analytics queries
 */
export type CoachAnalyticsPeriod = 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';

/**
 * Date range for filtering analytics data
 */
export interface AnalyticsDateRange {
  /** Start date (ISO string) */
  startDate: string;
  /** End date (ISO string) */
  endDate: string;
}

/**
 * A single data point for revenue charts
 */
export interface RevenueDataPoint {
  /** Date of the revenue (ISO string or formatted label) */
  date: string;
  /** Revenue amount for this period */
  amount: number;
  /** Number of sessions in this period */
  sessionCount?: number;
}

/**
 * Retention metrics for client analysis
 */
export interface RetentionMetrics {
  /** Number of new clients in the period */
  newClients: number;
  /** Number of returning clients (booked before) */
  returningClients: number;
  /** Client churn rate as percentage (0-100) */
  churnRate: number;
  /** Client retention rate as percentage (0-100) */
  retentionRate: number;
  /** Average sessions per client */
  avgSessionsPerClient: number;
  /** Total active clients in period */
  totalActiveClients: number;
  /** Clients lost compared to previous period */
  clientsLost: number;
}

/**
 * Cancellation reason categories
 */
export type CancellationReason =
  | 'CLIENT_REQUEST'
  | 'WEATHER'
  | 'ILLNESS'
  | 'SCHEDULING_CONFLICT'
  | 'NO_SHOW'
  | 'COACH_CANCELLED'
  | 'OTHER';

/**
 * Statistics on booking cancellations
 */
export interface CancellationStats {
  /** Total cancellations in period */
  totalCancellations: number;
  /** Cancellation rate as percentage (0-100) */
  cancellationRate: number;
  /** Breakdown by cancellation reason */
  byReason: Array<{
    reason: CancellationReason;
    count: number;
    percentage: number;
  }>;
  /** Breakdown by day of week (0=Sunday, 6=Saturday) */
  byDayOfWeek: Array<{
    dayOfWeek: number;
    dayName: string;
    count: number;
    percentage: number;
  }>;
  /** Average notice time in hours before session */
  avgNoticeHours: number;
  /** Revenue lost to cancellations */
  revenueLost: number;
}

// ============================================================================
// CANCELLATION POLICY
// ============================================================================
// Configurable policies for refund calculations based on time before session

/**
 * A single refund tier - defines refund percentage for a time window
 */
export interface RefundTier {
  /** Hours before session start (e.g., 24 means "24+ hours before") */
  hoursBeforeSession: number;
  /** Refund percentage for this tier (0-100) */
  refundPercentage: number;
  /** Description shown to users */
  description: string;
}

/**
 * Cancellation policy configuration for a coach
 */
export interface CancellationPolicy {
  id: string;
  coachId: string;
  /** Policy name (e.g., "Standard", "Strict", "Flexible") */
  name: string;
  /** Detailed description of the policy */
  description: string;
  /** Refund tiers ordered from most hours to least */
  tiers: RefundTier[];
  /** Minimum notice required to cancel (hours) */
  minimumNoticeHours: number;
  /** Whether coach allows cancellations at all */
  allowCancellations: boolean;
  /** Whether this is the default policy for new bookings */
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Result of calculating a refund
 */
export interface RefundCalculation {
  /** Original booking amount */
  originalAmount: number;
  /** Refund amount to give back */
  refundAmount: number;
  /** Platform fee deducted from refund */
  platformFee: number;
  /** Net refund after fees */
  netRefundAmount: number;
  /** Percentage being refunded */
  refundPercentage: number;
  /** Hours until session start */
  hoursUntilSession: number;
  /** Which tier was applied */
  appliedTier: RefundTier | null;
  /** Human-readable explanation */
  explanation: string;
  /** Whether a refund is eligible */
  isEligible: boolean;
}

/**
 * Session statistics for a period
 */
export interface SessionStats {
  /** Total sessions completed */
  totalSessions: number;
  /** Sessions compared to previous period */
  sessionsChange: number;
  /** Percentage change from previous period */
  sessionsChangePercent: number;
  /** Average sessions per week */
  avgSessionsPerWeek: number;
  /** Average session duration in minutes */
  avgDuration: number;
  /** Most popular session type */
  popularSessionType: string;
  /** Breakdown by session type */
  bySessionType: Array<{
    type: string;
    count: number;
    percentage: number;
    revenue: number;
  }>;
}

/**
 * Peak hours data for heatmap visualization
 * Represents booking density by hour and day of week
 */
export interface PeakHoursData {
  /** Day of week (0=Sunday, 6=Saturday) */
  dayOfWeek: number;
  /** Day name for display */
  dayName: string;
  /** Hour of day (0-23) */
  hour: number;
  /** Number of sessions at this time slot */
  sessionCount: number;
  /** Intensity value (0-1) for heatmap coloring */
  intensity: number;
}

/**
 * Top skill/focus area taught by the coach
 */
export interface TopSkillData {
  /** Skill name */
  skill: string;
  /** Number of sessions focused on this skill */
  sessionCount: number;
  /** Percentage of total sessions */
  percentage: number;
  /** Revenue generated from this skill focus */
  revenue: number;
}

/**
 * Trend direction indicator
 */
export type TrendDirection = 'UP' | 'DOWN' | 'STABLE';

/**
 * Comprehensive coach analytics dashboard data
 */
export interface CoachAnalytics {
  /** Coach ID */
  coachId: string;
  /** Coach name */
  coachName: string;
  /** Period these analytics cover */
  period: CoachAnalyticsPeriod;
  /** Date range for the analytics */
  dateRange: AnalyticsDateRange;

  // Revenue metrics
  /** Total revenue in period */
  totalRevenue: number;
  /** Revenue change from previous period */
  revenueChange: number;
  /** Percentage change in revenue */
  revenueChangePercent: number;
  /** Revenue trend direction */
  revenueTrend: TrendDirection;
  /** Revenue data points for charting */
  revenueChart: RevenueDataPoint[];
  /** Projected revenue based on trends */
  projectedRevenue?: number;
  /** Average revenue per session */
  avgRevenuePerSession: number;

  // Session metrics
  /** Session statistics */
  sessions: SessionStats;

  // Client/retention metrics
  /** Retention and client metrics */
  retention: RetentionMetrics;

  // Cancellation metrics
  /** Cancellation statistics */
  cancellations: CancellationStats;

  // Schedule insights
  /** Peak hours heatmap data */
  peakHours: PeakHoursData[];
  /** Busiest day of week */
  busiestDay: {
    dayOfWeek: number;
    dayName: string;
    sessionCount: number;
  };
  /** Busiest hour */
  busiestHour: {
    hour: number;
    sessionCount: number;
  };

  // Skill insights
  /** Top skills taught */
  topSkills: TopSkillData[];

  // Performance metrics
  /** Average client rating */
  avgRating: number;
  /** Rating change from previous period */
  ratingChange: number;
  /** Total reviews in period */
  reviewCount: number;

  /** When the analytics were last computed */
  computedAt: string;
}

/**
 * Summary card data for quick stats display
 */
export interface AnalyticsSummaryCard {
  /** Label for the stat */
  label: string;
  /** Current value */
  value: string | number;
  /** Previous period value for comparison */
  previousValue?: string | number;
  /** Change from previous period */
  change?: number;
  /** Percentage change */
  changePercent?: number;
  /** Trend direction */
  trend?: TrendDirection;
  /** Icon name (Ionicons) */
  icon?: string;
  /** Custom color for the card */
  color?: string;
}

// ============================================================================
// ADVANCED COACH DISCOVERY
// ============================================================================
// Types for filtering, searching, and discovering coaches with advanced
// criteria including location, pricing, ratings, and more.

/**
 * Gender options for coach filtering
 */
export type CoachGender = 'Male' | 'Female' | 'Non-binary' | 'Any';

/**
 * Location data for a coach with distance calculation
 */
export interface CoachLocation {
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lng: number;
  /** City name */
  city: string;
  /** State/region */
  state?: string;
  /** Distance from search origin in kilometers */
  distanceKm?: number;
  /** Distance from search origin in miles */
  distanceMiles?: number;
  /** Formatted address string */
  formattedAddress?: string;
}

/**
 * Comprehensive filters for coach search
 */
export interface CoachSearchFilters {
  /** Minimum price per session in USD */
  priceMin?: number;
  /** Maximum price per session in USD */
  priceMax?: number;
  /** Minimum average rating (1-5) */
  rating?: number;
  /** Maximum distance from user in kilometers */
  distance?: number;
  /** Sports/activities to filter by */
  sports?: SportCategory[];
  /** Football objectives/focuses to filter by */
  focuses?: FootballObjective[];
  /** Gender preference */
  gender?: CoachGender;
  /** Languages spoken by coach */
  languages?: string[];
  /** Minimum verification level */
  verified?: 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM';
  /** Session formats supported */
  formats?: TrainingFormat[];
  /** Text search query */
  query?: string;
  /** Only show coaches with availability in date range */
  availableFrom?: string;
  /** End of availability date range */
  availableTo?: string;
  /** Location-based search */
  location?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  /** Sort order for results */
  sortBy?: 'distance' | 'rating' | 'price_low' | 'price_high' | 'reviews';
}

/**
 * Filter option with count of matching coaches
 */
export interface FilterOption {
  /** Option value/id */
  value: string;
  /** Display label */
  label: string;
  /** Number of coaches matching this option */
  count: number;
  /** Whether this option is currently selected */
  selected?: boolean;
}

/**
 * Available filter options with counts
 */
export interface FilterOptions {
  /** Available sports with counts */
  sports: FilterOption[];
  /** Available focuses with counts */
  focuses: FilterOption[];
  /** Available languages with counts */
  languages: FilterOption[];
  /** Gender options with counts */
  genders: FilterOption[];
  /** Verification levels with counts */
  verificationLevels: FilterOption[];
  /** Session formats with counts */
  formats: FilterOption[];
  /** Price range bounds */
  priceRange: {
    min: number;
    max: number;
  };
  /** Rating distribution */
  ratingDistribution: {
    rating: number;
    count: number;
  }[];
  /** Total coaches matching current filters */
  totalCount: number;
}

/**
 * Coach search result with relevance score
 */
export interface CoachSearchResult {
  /** The coach profile */
  coach: CoachProfile;
  /** Relevance score for search ranking */
  relevanceScore: number;
  /** Distance from search location (if location search) */
  distanceKm?: number;
  /** Matched search terms for highlighting */
  matchedTerms?: string[];
}

/**
 * Paginated search results
 */
export interface CoachSearchResponse {
  /** Search results */
  results: CoachSearchResult[];
  /** Total number of matching coaches */
  totalCount: number;
  /** Current page number */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Whether there are more results */
  hasMore: boolean;
  /** Filter options based on current results */
  filterOptions: FilterOptions;
}

/**
 * Suggested coach with reason for suggestion
 */
export interface SuggestedCoach {
  /** The coach profile */
  coach: CoachProfile;
  /** Reason for the suggestion */
  reason: 'nearby' | 'highly_rated' | 'similar_to_booked' | 'popular' | 'new' | 'available_soon';
  /** Human-readable reason text */
  reasonText: string;
  /** Confidence score for the suggestion */
  confidence: number;
}

/**
 * Active filter for display in filter bar
 */
export interface ActiveFilter {
  /** Filter type/category */
  type: keyof CoachSearchFilters;
  /** Display label */
  label: string;
  /** Filter value */
  value: string | number | string[];
}

// ============================================================================
// PARENT COMMUNITY
// ============================================================================
// Parent-to-parent messaging, group chats, and carpool coordination

export type GroupType = 'CLUB' | 'SESSION' | 'CARPOOL' | 'GENERAL';

export type GroupMemberRole = 'ADMIN' | 'MEMBER';

export interface GroupMember {
  parentId: string;
  parentName: string;
  parentAvatar?: string;
  role: GroupMemberRole;
  joinedAt: string;
}

export interface ParentGroup {
  id: string;
  name: string;
  description?: string;
  type: GroupType;
  members: GroupMember[];
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  /** Associated club ID for CLUB type groups */
  clubId?: string;
  /** Associated session ID for SESSION type groups */
  sessionId?: string;
  /** Group avatar/icon URL */
  avatarUrl?: string;
  /** Whether group is publicly joinable or invite-only */
  isPublic: boolean;
  /** Maximum number of members (optional) */
  maxMembers?: number;
}

export type CarpoolRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export interface CarpoolRequest {
  id: string;
  offerId: string;
  parentId: string;
  parentName: string;
  parentAvatar?: string;
  childNames: string[];
  seatsRequested: number;
  message?: string;
  status: CarpoolRequestStatus;
  requestedAt: string;
  respondedAt?: string;
}

export type CarpoolOfferStatus = 'ACTIVE' | 'FULL' | 'COMPLETED' | 'CANCELLED';

export interface CarpoolOffer {
  id: string;
  parentId: string;
  parentName: string;
  parentAvatar?: string;
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  seatsAvailable: number;
  seatsTaken: number;
  pickupLocation: string;
  pickupTime: string;
  returnOffered: boolean;
  returnTime?: string;
  notes?: string;
  status: CarpoolOfferStatus;
  requests: CarpoolRequest[];
  acceptedRequests: CarpoolRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  body: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'seen';
  /** IDs of members who have read this message */
  readBy: string[];
  /** Optional attachment */
  attachments?: ChatAttachment[];
}

// ============================================================================
// COACH COMPARISON
// ============================================================================
// Enables users to compare 2-3 coaches side-by-side to make informed decisions
// based on price, rating, specialties, availability, and session types.

/**
 * Criteria for sorting/highlighting in coach comparison
 */
export type ComparisonCriteria = 'PRICE' | 'RATING' | 'EXPERIENCE' | 'AVAILABILITY';

/**
 * Coach data optimized for comparison view
 */
export interface CoachComparison {
  /** Unique coach identifier */
  coachId: string;
  /** Coach display name */
  name: string;
  /** Profile photo URL */
  avatar: string;
  /** Average rating (1-5) */
  rating: number;
  /** Number of reviews */
  reviewCount: number;
  /** Price range for sessions */
  price: {
    min: number;
    max: number;
    currency: string;
  };
  /** List of coaching specialties/focuses */
  specialties: string[];
  /** Available session types/formats */
  sessionTypes: TrainingFormat[];
  /** Next available slot for booking */
  availability: {
    nextSlot: string | null;
    slotsThisWeek: number;
  };
  /** Total sessions conducted */
  totalSessions: number;
  /** Distance from user in miles */
  distanceMiles: number;
  /** Coach's spoken languages */
  languages: string[];
  /** Years of experience (derived from join date) */
  yearsExperience: number;
  /** Verification/badge status */
  badges: Array<{ label: string; tone: 'success' | 'warning' | 'default' }>;
  /** Short bio for quick reference */
  shortBio: string;
}

/**
 * Comparison state for tracking selected coaches
 */
export interface ComparisonState {
  /** Currently selected coach IDs for comparison */
  selectedCoachIds: string[];
  /** Comparison data for selected coaches */
  coaches: CoachComparison[];
  /** Maximum coaches allowed in comparison */
  maxCoaches: number;
  /** Criteria to highlight best values */
  highlightCriteria: ComparisonCriteria | null;
}

/**
 * Result of adding a coach to comparison
 */
export interface AddToComparisonResult {
  success: boolean;
  message: string;
  currentCount: number;
  maxCount: number;
}

// ============================================================================
// CALENDAR SYNC SYSTEM
// ============================================================================
// Enables users to export sessions to external calendars and manage sync settings

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
  coachName?: string;
  /** Optional athlete name */
  athleteName?: string;
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
