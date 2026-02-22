/**
 * Types Barrel File
 *
 * Re-exports all types from domain-specific files for backward compatibility.
 * Every type that was previously importable from '@/constants/types' remains
 * importable from here.
 *
 * Domain files:
 * - user-types.ts: Core user, coach, athlete, discovery, comparison, auth types
 * - financial-types.ts: Wallet, payment, invoice, promo, referral types
 * - club-types.ts: Club, squad, academy, roster types
 * - session-types.ts: Session management, invites, availability, booking types
 * - social-types.ts: Follow, messaging, parent community types
 * - event-types.ts: Club events, RSVP, attendance, match types
 * - skill-types.ts: Skill trees, badges, goals, drills types
 * - video-types.ts: Video management and annotation types
 * - analytics-types.ts: Analytics dashboard, notification preference types
 * - family-types.ts: Family dashboard, guardian, safety, injury types
 */

// ============================================================================
// USER & COACH TYPES
// ============================================================================
export type {
  SportCategory,
  UserRole,
  FootballObjective,
  TrainingFormat,
  SkillLevel,
  SimplifiedUserType,
  ChildReference,
  GuardianReference,
  CoachPermission,
  StaffMember,
  SimplifiedUser,
  SocialPlatform,
  SocialLink,
  SocialLinks,
  CoachExperience,
  CoachCertification,
  CoachLanguage,
  CoachPost,
  CoachReview,
  BadgeCategory,
  BadgeTier,
  BadgeDefinition,
  CoachBadge,
  CoachProfile,
  SimplifiedCoach,
  CoachSearchParams,
  UserProfile,
  School,
  InviteCode,
  VerificationItem,
  VerificationStatus,
  CoachFeedback,
  Review,
  CoachGender,
  CoachLocation,
  CoachSearchFilters,
  FilterOption,
  FilterOptions,
  CoachSearchResult,
  CoachSearchResponse,
  SuggestedCoach,
  ActiveFilter,
  ComparisonCriteria,
  CoachComparison,
  ComparisonState,
  AddToComparisonResult,
  AuthTokens,
  AuthState,
} from './user-types';

// ============================================================================
// FINANCIAL TYPES
// ============================================================================
export type {
  TransactionType,
  TransactionStatus,
  WalletTransaction,
  Wallet,
  PayoutMethodType,
  PayoutMethod,
  WithdrawalStatus,
  Withdrawal,
  CoachEarnings,
  EarningTransaction,
  PaymentStatus,
  PaymentInfo,
  PaymentMethod,
  Transaction,
  PaymentReminder,
  SessionPackage,
  PackagePurchaseStatus,
  PackagePurchase,
  PackageRedemption,
  InvoiceStatus,
  Invoice,
  InvoiceSummary,
  InvoiceFilter,
  GenerateInvoiceParams,
  BillCategory,
  BillStatus,
  Bill,
  BillSummary,
  PromoCode,
  PromoCodeUsage,
  CreatePromoCodeParams,
  PromoCodeValidationResult,
  PromoCodeRedemptionResult,
  PromoCodeStats,
  ReferralStatus,
  ReferralCode,
  Referral,
  ReferralStats,
  RefundTier,
  CancellationPolicy,
  RefundCalculation,
  FavouriteCoach,
} from './financial-types';

// ============================================================================
// CLUB TYPES
// ============================================================================
export type {
  ClubRole,
  Club,
  ClubMembership,
  ClubSquad,
  SquadMember,
  SquadInvite,
  SquadSessionInvite,
  SquadInvitedMember,
  BulkInviteResult,
  BulkInviteError,
  SquadInviteHistoryEntry,
  ClubInvite,
  ClubPostType,
  FeedFilter,
  FeedType,
  ClubFeedPost,
  AcademyPermission,
  Academy,
  AcademyMembership,
  AcademyInvite,
  RosterNote,
  RosterEntry,
} from './club-types';

// ============================================================================
// SESSION TYPES
// ============================================================================
export type {
  SessionInviteType,
  SessionType,
  SessionTemplate,
  SessionState,
  AttendanceStatus,
  CoachSession,
  ParticipantType,
  SessionParticipant,
  GuestAthlete,
  RequestStatus,
  SessionRequest,
  AthleteDirectoryEntry,
  SessionPlan,
  SessionActivity,
  SessionRecap,
  AthleteHighlight,
  TeamInviteCode,
  BookingSummary,
  SessionRegistration,
  SessionOffering,
  AthleteObjective,
  SessionHistoryEntry,
  SessionNote,
  TimeSlot,
  SessionInvite,
  CounterOfferStatus,
  CounterOfferProposerRole,
  CounterOffer,
  NegotiationHistory,
  CounterOfferNotification,
  AvailabilityTemplate,
  AvailabilityOverride,
  AvailabilitySlot,
  CoachSchedulingRules,
  GroupSessionSchedule,
  RecurringPattern,
  GroupSession,
  GroupRegistration,
  RecurrenceFrequency,
  RecurringBookingStatus,
  RecurringBooking,
  CreateRecurringBookingParams,
  GeneratedBookingSummary,
  WaitlistStatus,
  WaitlistEntry,
  JoinWaitlistParams,
  WaitlistSummary,
  SessionAttendance,
  AttendanceRecord,
  CancellationRecord,
  InviteDeclineReason,
  SessionRsvp,
  BlockedDateRange,
  SeenStatus,
  CalendarProvider,
  CalendarEvent,
  CalendarSyncSettings,
  BookingSeries,
  WeekAcceptance,
  CoachVenue,
  InviteRsvpResponse,
} from './session-types';

// ============================================================================
// SOCIAL TYPES
// ============================================================================
export type {
  Follow,
  FollowRequest,
  Post,
  Comment,
  Conversation,
  Message,
  ChatSender,
  ChatAttachment,
  MessageReadReceipt,
  ChatMessage,
  ChatThreadSummary,
  Attachment,
  GroupType,
  GroupMemberRole,
  GroupMember,
  ParentGroup,
  GroupMessage,
} from './social-types';

// ============================================================================
// EVENT TYPES
// ============================================================================
export type {
  ClubEventType,
  EventTargetAudience,
  EventStatus,
  RSVPStatus,
  EventAttendee,
  ClubEvent,
  EventRSVP,
  EventAttendance,
  EventAttendanceStats,
  SubmitRSVPInput,
  CheckInInput,
  MatchType,
  MatchStatus,
  MatchPlayerStatus,
  MatchPlayer,
  MatchResult,
  Match,
  MatchInviteNotification,
  MatchSelectionNotification,
} from './event-types';

// ============================================================================
// SKILL TYPES
// ============================================================================
export type {
  BadgeVisibility,
  VideoVisibility,
  BadgeAward,
  SkillProgress,
  GoalStatus,
  GoalCategory,
  GoalCreator,
  GoalMilestone,
  Goal,
  CreateGoalInput,
  UpdateGoalInput,
  AthleteAnalytics,
  DrillDifficulty,
  DrillCategory,
  Drill,
  AssignedDrill,
  CreateDrillInput,
  AssignDrillInput,
  DrillAssignmentStats,
} from './skill-types';

// ============================================================================
// VIDEO TYPES
// ============================================================================
export type {
  VideoAnnotationType,
  VideoAnnotation,
  SessionVideo,
  AnnotationExport,
  AnnotatedVideo,
} from './video-types';

// ============================================================================
// ANALYTICS & NOTIFICATION TYPES
// ============================================================================
export {
  NOTIFICATION_TYPE_CATEGORIES,
  NOTIFICATION_CATEGORIES,
} from './analytics-types';

export type {
  NotificationType,
  Notification,
  LegacyNotificationType,
  AppNotification,
  NotificationItem,
  NotificationChannel,
  NotificationCategory,
  NotificationCategoryConfig,
  QuietHours,
  TypeNotificationPreference,
  MutedCoach,
  NotificationPreferences,
  EnhancedNotificationPreferences,
  CoachAnalyticsPeriod,
  AnalyticsDateRange,
  RevenueDataPoint,
  RetentionMetrics,
  CancellationReason,
  CancellationStats,
  SessionStats,
  PeakHoursData,
  TopSkillData,
  TrendDirection,
  CoachAnalytics,
  AnalyticsSummaryCard,
} from './analytics-types';

// ============================================================================
// FAMILY TYPES
// ============================================================================
export type {
  FamilyMember,
  GuardianPermission,
  GuardianRole,
  FamilyGuardian,
  GuardianInviteStatus,
  GuardianInvite,
  FamilyAccount,
  FamilySpending,
  FamilySpendingMonth,
  FamilyCalendarEvent,
  FamilyOverview,
  FamilyDateRange,
  ChildProgressSummary,
  EmergencyContact,
  MedicalInfo,
  ConsentType,
  Consent,
  EmergencyInfo,
  AthleteConsent,
  ConsentSummary,
  InjurySeverity,
  InjuryStatus,
  BodyPartCategory,
  BodyPart,
  RecoveryNote,
  Injury,
  LogInjuryInput,
  UpdateInjuryInput,
  InjuryStats,
  ScheduleConflict,
  ConflictsByEventId,
} from './family-types';

// ============================================================================
// RE-EXPORTS FROM APP-TYPES (backward compatibility)
// ============================================================================
// These types exist in app-types.ts with slightly different (simpler) definitions.
// They are re-exported here so that `import { User, Session } from '@/constants/types'`
// continues to work.
export { type User, type Session, type Booking, type BookingStatus } from './app-types';
