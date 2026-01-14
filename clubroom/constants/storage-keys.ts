/**
 * Centralized storage keys for the Clubroom app.
 * All AsyncStorage keys should be defined here to prevent conflicts and enable easy migration.
 *
 * Organization:
 * - Keys are grouped by functional domain
 * - Use consistent prefixing ('clubroom.' for main features)
 * - Use dot notation for hierarchical relationships
 *
 * @warning When adding new keys, check for duplicates first!
 * @see https://react-native-async-storage.github.io/async-storage/
 */

export const STORAGE_KEYS = {
  // ============================================================================
  // BOOKING DOMAIN
  // ============================================================================

  /** Main session bookings storage (used by booking-service and availability-service) */
  BOOKINGS: 'session_bookings',

  /** Recurring booking configurations */
  RECURRING_BOOKINGS: 'clubroom.recurring_bookings',

  /** Auto-generated bookings from recurring patterns */
  GENERATED_BOOKINGS: 'clubroom.generated_bookings',

  /** Session offerings/slots available for booking */
  SESSION_OFFERINGS: 'session_offerings',

  // ============================================================================
  // AVAILABILITY & SCHEDULING DOMAIN
  // ============================================================================

  /** Coach availability templates (recurring weekly patterns) */
  AVAILABILITY_TEMPLATES: 'availability_templates',

  /** One-time availability overrides (exceptions to templates) */
  AVAILABILITY_OVERRIDES: 'availability_overrides',

  /** Coach scheduling rules and preferences */
  SCHEDULING_RULES: 'coach_scheduling_rules',

  /** Cancellation policies for coaches */
  CANCELLATION_POLICIES: 'cancellation_policies',

  /** Waitlist entries for fully booked sessions */
  WAITLIST: 'clubroom.waitlist',

  /** Counter offers from coaches */
  COUNTER_OFFERS: 'counter_offers',

  /** Ongoing booking negotiations */
  NEGOTIATIONS: 'negotiations',

  // ============================================================================
  // ROSTER DOMAIN
  // ============================================================================

  /** Coach's athlete roster */
  ROSTER: 'coach_roster',

  /** History of removed roster members */
  ROSTER_REMOVAL_HISTORY: 'roster_removal_history',

  // ============================================================================
  // PROGRESS & SKILL TRACKING DOMAIN
  // ============================================================================

  /** Athlete skill level assessments by coach */
  SKILL_LEVELS: 'progress.skill_levels',

  /** Post-session feedback from coaches */
  SESSION_FEEDBACK: 'progress.session_feedback',

  /** Athlete goals set with coaches */
  GOALS: 'progress.goals',

  /** Session notes and observations */
  SESSION_NOTES: 'progress.session_notes',

  /** Skill tree progression data */
  SKILL_TREE_PROGRESS: 'skill_tree.user_progress',

  // ============================================================================
  // ANALYTICS DOMAIN
  // ============================================================================

  /** Analytics data for athletes */
  ATHLETE_ANALYTICS: 'athlete_analytics',

  /** Analytics goals for athletes */
  ATHLETE_GOALS: 'athlete_goals',

  /** Analytics data for coaches */
  COACH_ANALYTICS: 'coach_analytics',

  // ============================================================================
  // NOTIFICATIONS DOMAIN
  // ============================================================================

  /** User notifications inbox */
  NOTIFICATIONS: 'clubroom.notifications',

  /** Notification preferences per user */
  NOTIFICATION_PREFERENCES: 'clubroom.notification_preferences',

  // ============================================================================
  // MESSAGING DOMAIN
  // ============================================================================

  /** Direct messages between users */
  MESSAGES: 'clubroom.messages',

  // ============================================================================
  // FINANCIAL DOMAIN
  // ============================================================================

  /** Coach earnings records */
  EARNINGS: 'clubroom.earnings',

  /** Coach payout method configurations */
  PAYOUT_METHODS: 'clubroom.payout_methods',

  /** Withdrawal requests and history */
  WITHDRAWALS: 'clubroom.withdrawals',

  /** Earning transaction history */
  EARNING_TRANSACTIONS: 'clubroom.earning_transactions',

  /** User wallet data */
  WALLETS: 'clubroom.wallets',

  /** Wallet transaction history */
  WALLET_TRANSACTIONS: 'clubroom.wallet_transactions',

  /** Invoice records */
  INVOICES: 'clubroom.invoices',

  /** Session packages offered by coaches */
  PACKAGES: 'clubroom.packages',

  /** Package purchases by parents/athletes */
  PACKAGE_PURCHASES: 'clubroom.package_purchases',

  /** Package redemptions (sessions booked with packages) */
  PACKAGE_REDEMPTIONS: 'clubroom.package_redemptions',

  /** Promotional codes */
  PROMO_CODES: 'clubroom.promo_codes',

  /** Promo code usage tracking */
  PROMO_USAGE: 'clubroom.promo_usage',

  /** Referral codes */
  REFERRAL_CODES: 'clubroom.referral_codes',

  /** Referral tracking data */
  REFERRALS: 'clubroom.referrals',

  // ============================================================================
  // SAFETY & EMERGENCY DOMAIN
  // ============================================================================

  /** Emergency contact information for athletes */
  EMERGENCY_INFO: 'clubroom.emergency_info',

  /** Emergency info cache for offline access */
  EMERGENCY_CACHE: 'clubroom.emergency_cache',

  // ============================================================================
  // COMMUNITY DOMAIN
  // ============================================================================

  /** Parent community groups */
  PARENT_GROUPS: 'clubroom.parent_groups',

  /** Messages within parent groups */
  GROUP_MESSAGES: 'clubroom.group_messages',

  /** Carpool coordination offers */
  CARPOOL_OFFERS: 'clubroom.carpool_offers',

  // ============================================================================
  // SOCIAL DOMAIN
  // ============================================================================

  /** User follow relationships */
  FOLLOWS: 'follows',

  /** Pending follow requests */
  FOLLOW_REQUESTS: 'follow_requests',

  /** User's favorite coaches/content */
  FAVOURITES: 'favourites',

  // ============================================================================
  // FAMILY DOMAIN
  // ============================================================================

  /** Family member profiles */
  FAMILY_MEMBERS: 'clubroom.family_members',

  /** Family calendar/booking data */
  FAMILY_BOOKINGS: 'clubroom.family_bookings',

  /** Family account settings */
  FAMILY_ACCOUNTS: 'family_accounts',

  /** Guardian invite data */
  GUARDIAN_INVITES: 'guardian_invites',

  // ============================================================================
  // CLUB & SQUAD DOMAIN
  // ============================================================================

  /** Club membership data */
  CLUB_MEMBERS: 'club_members',

  /** Club member removal records */
  CLUB_MEMBER_REMOVALS: 'club_member_removals',

  /** Squad membership data */
  SQUAD_MEMBERS: 'squad_members',

  /** Academy/club organizations */
  ACADEMIES: 'academies',

  /** Academy membership records */
  ACADEMY_MEMBERSHIPS: 'academy_memberships',

  /** Academy invite data */
  ACADEMY_INVITES: 'academy_invites',

  // ============================================================================
  // EVENTS DOMAIN
  // ============================================================================

  /** Club events (tournaments, socials, meetings) */
  CLUB_EVENTS: 'club_events',

  /** RSVP data for events */
  EVENT_RSVPS: 'event_rsvps',

  /** Event attendance tracking */
  EVENT_ATTENDANCE: 'event_attendance',

  /** Group training sessions */
  GROUP_SESSIONS: 'group_sessions',

  /** Group session registrations */
  GROUP_REGISTRATIONS: 'group_registrations',

  // ============================================================================
  // INVITES DOMAIN
  // ============================================================================

  /** Session invitations */
  SESSION_INVITES: 'session_invites',

  /** Squad membership invites */
  SQUAD_INVITES: 'squad_invites',

  /** Squad session invites */
  SQUAD_SESSION_INVITES: 'squad_session_invites',

  /** History of squad invites */
  SQUAD_INVITE_HISTORY: 'squad_invite_history',

  // ============================================================================
  // TRAINING & CONTENT DOMAIN
  // ============================================================================

  /** Session video recordings */
  SESSION_VIDEOS: 'session_videos',

  /** Video annotations and markup */
  VIDEO_ANNOTATIONS: 'video_annotations',

  /** Drill library */
  DRILLS: 'drills.library',

  /** Drill assignments to athletes */
  DRILL_ASSIGNMENTS: 'drills.assignments',

  /** Injury tracking records */
  INJURIES: 'injuries.all',

  /** Match results and statistics */
  MATCHES: 'matches',

  // ============================================================================
  // REVIEWS & RECOGNITION DOMAIN
  // ============================================================================

  /** Coach/session reviews */
  REVIEWS: 'clubroom.reviews',

  /** Badge awards and achievements */
  BADGE_AWARDS: 'clubroom.badge_awards',

  // ============================================================================
  // SYSTEM & SETTINGS DOMAIN
  // ============================================================================

  /** User verification status */
  VERIFICATION: 'clubroom.verification',

  /** Coach comparison tool selections */
  COMPARISON_SELECTED_COACHES: 'clubroom.comparison.selectedCoaches',

  /** Recent search queries in discover */
  DISCOVER_RECENT_SEARCHES: 'clubroom.discover.recentSearches',

  /** Calendar sync settings (per user, key is suffixed with _userId) */
  CALENDAR_SYNC_SETTINGS: 'calendar_sync_settings',
} as const;

/**
 * Type representing any valid storage key value.
 * Use this type when you need to reference a storage key dynamically.
 */
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Type representing the names of storage keys (the object keys).
 * Use this when you need to reference the key name itself.
 */
export type StorageKeyName = keyof typeof STORAGE_KEYS;

/**
 * Known storage key conflicts/duplicates.
 * These should be resolved during migration.
 */
export const STORAGE_KEY_CONFLICTS = {
  /**
   * 'session_bookings' is used by both:
   * - booking-service.ts (SESSION_BOOKINGS_KEY)
   * - availability-service.ts (BOOKINGS_STORAGE_KEY)
   *
   * Both reference the same underlying data, so this is not a true conflict,
   * but services should use the centralized constant.
   */
  BOOKINGS: {
    key: 'session_bookings',
    usedBy: ['booking-service.ts', 'availability-service.ts'],
    status: 'SHARED_DATA',
    resolution: 'Use STORAGE_KEYS.BOOKINGS in both services',
  },
} as const;

/**
 * Helper function to get a user-specific storage key.
 * Some keys are stored per-user and need the userId appended.
 *
 * @example
 * getUserKey(STORAGE_KEYS.CALENDAR_SYNC_SETTINGS, 'user123')
 * // Returns: 'calendar_sync_settings_user123'
 */
export function getUserKey(baseKey: StorageKey, userId: string): string {
  return `${baseKey}_${userId}`;
}

/**
 * Helper function to get a namespaced key.
 * Useful for dynamically creating keys with additional context.
 *
 * @example
 * getNamespacedKey(STORAGE_KEYS.MESSAGES, 'thread123')
 * // Returns: 'clubroom.messages:thread123'
 */
export function getNamespacedKey(baseKey: StorageKey, namespace: string): string {
  return `${baseKey}:${namespace}`;
}
