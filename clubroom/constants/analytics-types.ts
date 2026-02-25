/**
 * Analytics Types
 *
 * Coach analytics dashboard, revenue, retention, cancellation stats,
 * and notification preference types.
 */

// ============================================================================
// NOTIFICATIONS (Enhanced from types.ts)
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

// The original NotificationType and AppNotification from the earlier section of types.ts
export type LegacyNotificationType =
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
  type: LegacyNotificationType;
  title: string;
  body: string;
  deepLink?: string; // Route to navigate to
  relatedEntityId?: string; // e.g., sessionId, messageId
  isRead: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'booking' | 'message' | 'review' | 'payment' | 'reminder' | 'badge' | 'community';
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
 * Muted coach entry
 */
export interface MutedCoach {
  coachId: string;
  coachName?: string; // @deprecated — resolve via coachId
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
// COACH ANALYTICS DASHBOARD
// ============================================================================

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
  byReason: {
    reason: CancellationReason;
    count: number;
    percentage: number;
  }[];
  /** Breakdown by day of week (0=Sunday, 6=Saturday) */
  byDayOfWeek: {
    dayOfWeek: number;
    dayName: string;
    count: number;
    percentage: number;
  }[];
  /** Average notice time in hours before session */
  avgNoticeHours: number;
  /** Revenue lost to cancellations */
  revenueLost: number;
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
  bySessionType: {
    type: string;
    count: number;
    percentage: number;
    revenue: number;
  }[];
}

/**
 * Peak hours data for heatmap visualization
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
  /** @deprecated — resolve via coachId */
  coachName?: string;
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
