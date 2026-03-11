import { type Href } from 'expo-router';

export interface SessionsCreateIntentParams {
  [key: string]: string | undefined;
  intent: 'new' | 'existing' | 'invite';
  source?: 'schedule' | 'roster' | 'group_manage' | 'club_manage' | 'session_detail' | 'manual';
  athleteIds?: string;
  athleteNames?: string;
  offeringId?: string;
  date?: string;
  preset?: '1on1' | 'group';
  inviteType?: 'OPEN' | 'CLOSED' | 'SQUAD_ONLY';
  actingAs?: 'self' | 'club';
  clubId?: string;
  assigneeCoachId?: string;
}

export interface BookingFlowEntryOptions {
  offeringId?: string;
  source?: string;
  childId?: string;
  weeks?: string;
}

export interface BookingDetailRouteOptions {
  returnTo?: string;
  source?: string;
}

/**
 * Type-safe route builders for all Clubroom navigation.
 *
 * Static routes are typed Href constants.
 * Dynamic routes are functions that return typed Href objects.
 *
 * Usage:
 *   import { Routes } from '@/navigation/routes';
 *   router.push(Routes.FEED);
 *   router.push(Routes.event('abc123'));
 */
export const Routes = {
  // ─── Root ──────────────────────────────────────────────────────
  ROOT: '/' as Href,

  // ─── Tabs ──────────────────────────────────────────────────────
  HOME: '/(tabs)' as Href,
  HOME_INDEX: '/(tabs)/index' as Href,
  FEED: '/(tabs)/feed' as Href,
  BOOKINGS: '/(tabs)/bookings' as Href,
  ATHLETES: '/(tabs)/athletes' as Href,
  SETTINGS: '/settings' as Href,
  SETTINGS_TAB: '/(tabs)/settings' as Href,
  COACH_PROFILE: '/(tabs)/coach-profile' as Href,
  EDIT_PROFILE: '/(tabs)/edit-profile' as Href,
  AVAILABILITY: '/(tabs)/availability' as Href,
  BADGES: '/(tabs)/badges' as Href,
  CHILDREN: '/(tabs)/children' as Href,
  CLUB_HUB: '/(tabs)/club-hub' as Href,
  clubHub: (params?: { clubId?: string; inviteCode?: string }) => ({
    pathname: '/(tabs)/club-hub',
    params: params ?? {},
  }) as Href,
  EARNINGS: '/(tabs)/earnings' as Href,
  MESSAGES: '/(tabs)/messages' as Href,
  MANAGE: '/manage' as Href,
  MANAGE_BOOKINGS: '/manage/bookings' as Href,
  MANAGE_HEAD_COACH: '/manage/head-coach' as Href,
  MORE: '/(tabs)/more' as Href,
  NOTIFICATIONS: '/(tabs)/notifications' as Href,
  ROSTER: '/(tabs)/roster' as Href,
  SCHEDULE: '/(tabs)/schedule' as Href,
  manage: (params?: { clubId?: string }) => ({
    pathname: '/manage',
    params: params ?? {},
  }) as Href,

  // ─── Tab sub-routes (dynamic) ─────────────────────────────────
  booking: (id: string, options?: BookingDetailRouteOptions) => ({
    pathname: '/(tabs)/bookings/[id]',
    params: { id, ...(options ?? {}) },
  }) as Href,
  BOOKINGS_REPORT_PROBLEM: '/(tabs)/bookings/report-problem' as Href,
  bookingsReportProblem: (params?: { bookingId?: string }) => ({
    pathname: '/(tabs)/bookings/report-problem',
    params: params ?? {},
  }) as Href,
  ADMIN_INVITE_CODES: '/(tabs)/admin/invite-codes' as Href,

  // ─── Modals ────────────────────────────────────────────────────
  MODAL_ADD_CHILD: '/(modal)/add-child' as Href,
  MODAL_CREATE_POST: '/(modal)/create-post' as Href,
  MODAL_CREATE_CLUB_POST: '/(modal)/create-club-post' as Href,
  modalCreateClubPost: (params?: {
    clubId?: string;
    audience?: 'club' | 'squad';
    squadId?: string;
  }) =>
    ({
      pathname: '/(modal)/create-club-post',
      params: params ?? {},
    }) as Href,
  MODAL_CREATE_SQUAD: '/(modal)/create-squad' as Href,
  MODAL_EDIT_CHILD_SEN: '/(modal)/edit-child-sen' as Href,
  modalEditChildSen: (childId: string) => ({
    pathname: '/(modal)/edit-child-sen',
    params: { childId },
  }) as Href,
  MODAL_EDIT_CHILD_PROFILE: '/(modal)/edit-child-profile' as Href,
  modalEditChildProfile: (childId: string) => ({
    pathname: '/(modal)/edit-child-profile',
    params: { childId },
  }) as Href,
  modalPostDetail: (postId: string) => ({
    pathname: '/(modal)/post-detail',
    params: { postId },
  }) as Href,

  // ─── Academy ───────────────────────────────────────────────────
  ACADEMY_CREATE: '/academy/create' as Href,
  ACADEMY_JOIN: '/academy/join' as Href,
  academy: (id: string) => ({
    pathname: '/academy/[id]',
    params: { id },
  }) as Href,
  academyBranding: (id: string) => ({
    pathname: '/academy/[id]/branding',
    params: { id },
  }) as Href,
  academySettings: (id: string) => ({
    pathname: '/academy/[id]/settings',
    params: { id },
  }) as Href,
  academyStaff: (id: string) => ({
    pathname: '/academy/[id]/staff',
    params: { id },
  }) as Href,
  academyInvite: (id: string) => ({
    pathname: '/academy/[id]/invite',
    params: { id },
  }) as Href,
  academyStaffMember: (id: string, staffId: string) => ({
    pathname: '/academy/[id]/staff/[staffId]',
    params: { id, staffId },
  }) as Href,

  // ─── Admin ─────────────────────────────────────────────────────
  ADMIN_PROMO_CODES: '/admin/promo-codes' as Href,
  ADMIN_PROMO_CODES_CREATE: '/admin/promo-codes/create' as Href,

  // ─── Analytics ─────────────────────────────────────────────────
  ANALYTICS_DASHBOARD: '/analytics/dashboard' as Href,
  ANALYTICS_REVENUE: '/analytics/revenue' as Href,
  ANALYTICS_RETENTION: '/analytics/retention' as Href,
  analyticsAthlete: (athleteId: string) => ({
    pathname: '/analytics/[athleteId]',
    params: { athleteId },
  }) as Href,
  analyticsAthleteGoals: (athleteId: string) => ({
    pathname: '/analytics/[athleteId]/goals',
    params: { athleteId },
  }) as Href,

  // ─── Availability ──────────────────────────────────────────────
  AVAILABILITY_ADD_TEMPLATE: '/availability/add-template' as Href,
  AVAILABILITY_BLOCK_DATE: '/availability/block-date' as Href,
  AVAILABILITY_CALENDAR: '/availability/calendar' as Href,
  AVAILABILITY_SCHEDULING_RULES: '/availability/scheduling-rules' as Href,

  // ─── Badges ────────────────────────────────────────────────────
  BADGES_INDEX: '/badges' as Href,

  // ─── Book ──────────────────────────────────────────────────────
  BOOK_COACH: '/book-coach' as Href,
  bookCoachWith: (coachId: string, options?: BookingFlowEntryOptions) => ({
    pathname: '/book/[coachId]',
    params: { coachId, ...(options ?? {}) },
  }) as Href,
  CONFIRM_BOOKING: '/confirm-booking' as Href,
  confirmBookingWith: (params: {
    coachId: string;
    coachName: string;
    slotId: string;
    slotTitle: string;
    slotFocus: string;
    slotStart: string;
    slotDuration: string;
    price: string;
    serviceType: string;
    objectives: string;
    athleteIds: string;
  }) => ({
    pathname: '/confirm-booking',
    params,
  }) as Href,
  bookSessionType: (
    coachId: string,
    options?: BookingFlowEntryOptions,
  ) => ({
    pathname: '/book/[coachId]/session-type',
    params: { coachId, ...(options ?? {}) },
  }) as Href,
  bookSchedule: (coachId: string) => ({
    pathname: '/book/[coachId]/schedule',
    params: { coachId },
  }) as Href,
  bookDetails: (coachId: string) => ({
    pathname: '/book/[coachId]/details',
    params: { coachId },
  }) as Href,
  bookReview: (coachId: string) => ({
    pathname: '/book/[coachId]/review',
    params: { coachId },
  }) as Href,
  bookConfirmation: (coachId: string) => ({
    pathname: '/book/[coachId]/confirmation',
    params: { coachId },
  }) as Href,
  bookCoach: (coachId: string, options?: BookingFlowEntryOptions) => ({
    pathname: '/book/[coachId]',
    params: { coachId, ...(options ?? {}) },
  }) as Href,
  bookMultiWeek: (coachId: string) => ({
    pathname: '/book/[coachId]/multi-week',
    params: { coachId },
  }) as Href,

  // ─── Booking (non-tab) ────────────────────────────────────────
  bookingCancel: (id: string, mode?: 'coach' | 'parent') => ({
    pathname: '/booking/[id]/cancel',
    params: mode ? { id, mode } : { id },
  }) as Href,
  bookingsNegotiate: (id: string) => ({
    pathname: '/bookings/[id]/negotiate',
    params: { id },
  }) as Href,
  BOOKINGS_SUBSCRIBE: '/bookings/subscribe' as Href,
  sessionFeedback: (params: {
    bookingId: string;
    athleteId?: string;
    athleteName?: string;
    athleteObjectives?: string;
  }) => ({
    pathname: '/bookings/session-feedback',
    params,
  }) as Href,

  // ─── Chat ──────────────────────────────────────────────────────
  chat: (threadId: string) => ({
    pathname: '/chat/[threadId]',
    params: { threadId },
  }) as Href,
  messagesWith: (params: { coachId?: string; athleteId?: string }) => ({
    pathname: '/(tabs)/messages',
    params,
  }) as Href,

  // ─── Child ─────────────────────────────────────────────────────
  childEmergency: (id: string) => ({
    pathname: '/child/[id]/emergency',
    params: { id },
  }) as Href,
  childMedical: (id: string) => ({
    pathname: '/child/[id]/medical',
    params: { id },
  }) as Href,
  childBadges: (childId: string) => ({
    pathname: '/children/badges/[childId]',
    params: { childId },
  }) as Href,

  // ─── Club ──────────────────────────────────────────────────────
  CLUB_CREATE: '/club/create' as Href,
  CLUB_SETUP_COMPLETE: '/club/setup-complete' as Href,
  clubSetupComplete: (params: { clubId: string; inviteCode?: string; inviteRole?: string }) => ({
    pathname: '/club/setup-complete',
    params,
  }) as Href,
  MY_CLUBS: '/club/my-clubs' as Href,
  CLUB_INVITE_MEMBERS: '/club/invite-members' as Href,
  clubInviteMembers: (params?: { clubId?: string }) => ({
    pathname: '/club/invite-members',
    params: params ?? {},
  }) as Href,
  CLUB_SETTINGS: '/club/settings' as Href,
  clubSettings: (params?: { clubId?: string; section?: string }) => ({
    pathname: '/club/settings',
    params: params ?? {},
  }) as Href,
  CLUB_TRAINING_SCHEDULE: '/club/training-schedule' as Href,
  club: (id: string) => ({
    pathname: '/club/[id]',
    params: { id },
  }) as Href,
  clubDashboard: (clubId: string) => ({
    pathname: '/club/[clubId]/dashboard',
    params: { clubId },
  }) as Href,
  clubBranding: (clubId: string) => ({
    pathname: '/club/[clubId]/branding',
    params: { clubId },
  }) as Href,
  clubCalendar: (clubId: string) => ({
    pathname: '/club/[clubId]/calendar',
    params: { clubId },
  }) as Href,
  clubMember: (clubId: string, memberId: string) => ({
    pathname: '/club/[clubId]/member/[memberId]',
    params: { clubId, memberId },
  }) as Href,
  clubSquad: (id: string) => ({
    pathname: '/club/squad/[id]',
    params: { id },
  }) as Href,
  CLUB_SQUAD_CREATE: '/club/squad/create' as Href,
  clubSquadCreate: (clubId: string) => ({
    pathname: '/club/squad/create',
    params: { clubId },
  }) as Href,

  // ─── Coach ─────────────────────────────────────────────────────
  COACH_INVITES: '/coach-invites' as Href,
  coachInvitesWith: (params: { code: string; clubId: string; clubName: string; role: string }) => ({
    pathname: '/coach-invites',
    params,
  }) as Href,
  coachInviteAthlete: (athleteId: string) => ({
    pathname: '/coach/invite',
    params: { athleteId },
  }) as Href,
  chatWithAthlete: (athleteId: string) => ({
    pathname: '/chat',
    params: { athleteId },
  }) as Href,
  coachPublic: (coachId: string) => ({
    pathname: '/coach/[coachId]/public',
    params: { coachId },
  }) as Href,
  coach: (id: string) => ({
    pathname: '/coach/[id]',
    params: { id },
  }) as Href,

  // ─── Community ─────────────────────────────────────────────────
  COMMUNITY: '/community' as Href,
  communityGroup: (groupId: string) => ({
    pathname: '/community/[groupId]',
    params: { groupId },
  }) as Href,

  // ─── Compare ───────────────────────────────────────────────────
  COMPARE: '/compare' as Href,
  compareCoaches: (ids: string) => ({
    pathname: '/compare/[ids]',
    params: { ids },
  }) as Href,

  // ─── Development ───────────────────────────────────────────────
  DEVELOPMENT_BADGES: '/development/badges' as Href,
  developmentBadgesHighlight: (badgeAwardId: string) => ({
    pathname: '/development/badges',
    params: { highlightBadge: badgeAwardId },
  }) as Href,
  DEVELOPMENT_MY_PROGRESS: '/development/my-progress' as Href,
  DEVELOPMENT_PROGRESS_LOOP: '/development/progress-loop' as Href,
  DEVELOPMENT_RESULTS_PROGRAM: '/development/results-program' as Href,
  DEVELOPMENT_SEED_HEALTH: '/development/seed-health' as Href,
  RESULTS_PROGRAM: '/results-program' as Href,
  DEVELOPMENT_MEDIA_GALLERY: '/development/media-gallery' as Href,
  DEVELOPMENT_SESSION_HISTORY: '/development/session-history' as Href,
  developmentAthlete: (athleteId: string) => ({
    pathname: '/development/athlete/[athleteId]',
    params: { athleteId },
  }) as Href,
  developmentAthleteSpecialNeeds: (athleteId: string) => ({
    pathname: '/development/athlete/[athleteId]/special-needs',
    params: { athleteId },
  }) as Href,
  developmentSession: (
    sessionId: string,
    params?: { prefillFromQuickRate?: 'true' | 'false'; athleteId?: string },
  ) => ({
    pathname: '/development/session/[sessionId]',
    params: { sessionId, ...(params ?? {}) },
  }) as Href,
  developmentChildProgress: (
    childId: string,
    params?: { tab?: 'profile' | 'feedback' | 'badges' | 'radar' },
  ) =>
    ({
      pathname: '/development/child-progress/[childId]',
      params: { childId, ...(params ?? {}) },
    }) as Href,
  developmentSessionHistory: (params?: { athleteId?: string }) =>
    ({
      pathname: '/development/session-history',
      params: params ?? {},
    }) as Href,
  developmentProgressLoop: (params?: { athleteId?: string }) =>
    ({
      pathname: '/development/progress-loop',
      params: params ?? {},
    }) as Href,
  developmentResultsProgram: (params?: { athleteId?: string }) =>
    ({
      pathname: '/development/results-program',
      params: params ?? {},
    }) as Href,
  developmentMediaGallery: (params?: { athleteId?: string }) =>
    ({
      pathname: '/development/media-gallery',
      params: params ?? {},
    }) as Href,
  developmentSeedHealth: () =>
    ({
      pathname: '/development/seed-health',
      params: {},
    }) as Href,

  // ─── Discover ──────────────────────────────────────────────────
  DISCOVER_SESSIONS: '/discover-sessions' as Href,
  DISCOVER_MAP: '/discover/map' as Href,
  DISCOVER_FILTERS: '/discover/filters' as Href,

  // ─── Drills ────────────────────────────────────────────────────
  DRILLS: '/drills' as Href,
  DRILLS_CREATE: '/drills/create' as Href,
  DRILLS_LIBRARY: '/drills/library' as Href,
  DRILLS_ASSIGN: '/drills/assign' as Href,
  DRILLS_CHALLENGES: '/drills/challenges' as Href,
  DRILLS_CREATE_CHALLENGE: '/drills/create-challenge' as Href,
  drill: (id: string) => ({
    pathname: '/drills/[id]',
    params: { id },
  }) as Href,
  drillsAssignWith: (drillId: string) => ({
    pathname: '/drills/assign',
    params: { drillId },
  }) as Href,

  // ─── Athlete ──────────────────────────────────────────────────
  ATHLETE_JOURNAL: '/athlete/journal' as Href,
  athleteJournal: (params?: { athleteId?: string }) =>
    ({
      pathname: '/athlete/journal',
      params: params ?? {},
    }) as Href,

  // ─── Events ────────────────────────────────────────────────────
  EVENTS: '/events' as Href,
  EVENTS_CREATE: '/events/create' as Href,
  event: (id: string) => ({
    pathname: '/events/[id]',
    params: { id },
  }) as Href,
  eventRsvp: (id: string) => ({
    pathname: '/events/[id]/rsvp',
    params: { id },
  }) as Href,
  eventAttendees: (id: string) => ({
    pathname: '/events/[id]/attendees',
    params: { id },
  }) as Href,

  // ─── Family ────────────────────────────────────────────────────
  FAMILY: '/family' as Href,
  FAMILY_CALENDAR: '/family/calendar' as Href,
  FAMILY_RECURRING: '/family/recurring' as Href,
  FAMILY_SHARING: '/family/sharing' as Href,
  FAMILY_SPENDING: '/family/spending' as Href,
  familyRecurring: (params?: { recurringId?: string }) => ({
    pathname: '/family/recurring',
    params: params ?? {},
  }) as Href,

  // ─── Goals ─────────────────────────────────────────────────────
  GOALS: '/goals' as Href,
  GOALS_CREATE: '/goals/create' as Href,
  goal: (id: string) => ({
    pathname: '/goals/[id]',
    params: { id },
  }) as Href,

  // ─── Group Sessions ────────────────────────────────────────────
  GROUP_SESSIONS: '/group-sessions' as Href,
  GROUP_SESSIONS_CREATE: '/group-sessions/create' as Href,
  groupSession: (id: string) => ({
    pathname: '/group-sessions/[id]',
    params: { id },
  }) as Href,
  groupSessionRoster: (id: string) => ({
    pathname: '/group-sessions/[id]/roster',
    params: { id },
  }) as Href,

  // ─── Health ────────────────────────────────────────────────────
  HEALTH: '/health' as Href,
  HEALTH_INJURIES: '/health/injuries' as Href,
  HEALTH_LOG: '/health/log' as Href,
  healthEntry: (id: string) => ({
    pathname: '/health/[id]',
    params: { id },
  }) as Href,

  // ─── Invites ───────────────────────────────────────────────────
  INVITES: '/invites' as Href,

  // ─── Bills ────────────────────────────────────────────────────
  BILLS: '/bills' as Href,
  BILLS_CREATE: '/bills/create' as Href,

  // ─── Invoices ──────────────────────────────────────────────────
  INVOICES: '/invoices' as Href,
  invoice: (id: string) => ({
    pathname: '/invoices/[id]',
    params: { id },
  }) as Href,

  // ─── Matches ───────────────────────────────────────────────────
  MATCHES: '/matches' as Href,
  MATCHES_CREATE: '/matches/create' as Href,
  match: (id: string) => ({
    pathname: '/matches/[id]',
    params: { id },
  }) as Href,

  // ─── Payment ───────────────────────────────────────────────────
  PAYMENTS: '/payments' as Href,

  // ─── Profile ──────────────────────────────────────────────────
  profile: (userId: string) => ({
    pathname: '/profile/[userId]',
    params: { userId },
  }) as Href,

  // ─── Rate / Review ─────────────────────────────────────────────
  RATE_COACH: '/rate-coach' as Href,
  review: (bookingId: string) => ({
    pathname: '/review/[bookingId]',
    params: { bookingId },
  }) as Href,
  reviewCreate: (bookingId: string, coachId: string) => ({
    pathname: '/review/create',
    params: { bookingId, coachId },
  }) as Href,

  // ─── Referrals ─────────────────────────────────────────────────
  REFERRALS: '/referrals' as Href,
  REFERRALS_INVITE: '/referrals/invite' as Href,

  // ─── Roster ────────────────────────────────────────────────────
  ROSTER_INDEX: '/roster' as Href,
  ROSTER_CONSENTS: '/roster/consents' as Href,
  rosterAthlete: (athleteId: string) => ({
    pathname: '/roster/[athleteId]',
    params: { athleteId },
  }) as Href,
  rosterAthleteEmergency: (athleteId: string) => ({
    pathname: '/roster/[athleteId]/emergency',
    params: { athleteId },
  }) as Href,
  rosterAthleteHealth: (athleteId: string) => ({
    pathname: '/roster/[athleteId]/health',
    params: { athleteId },
  }) as Href,
  rosterAthleteAddToSession: (athleteId: string, athleteName?: string) => ({
    pathname: '/roster/[athleteId]/add-to-session',
    params: athleteName ? { athleteId, athleteName } : { athleteId },
  }) as Href,
  rosterAthleteConcern: (athleteId: string) => ({
    pathname: '/roster/[athleteId]/raise-concern',
    params: { athleteId },
  }) as Href,

  // ─── Sessions ──────────────────────────────────────────────────
  SESSIONS_CREATE: '/sessions/create' as Href,
  sessionsCreateWith: (params: {
    athleteIds: string;
    athleteNames: string;
    preset?: '1on1' | 'group';
    inviteType?: 'OPEN' | 'CLOSED' | 'SQUAD_ONLY';
  }) => ({
    pathname: '/sessions/create',
    params,
  }) as Href,
  sessionsCreateIntent: (params: SessionsCreateIntentParams) => ({
    pathname: '/sessions/create',
    params,
  }) as Href,
  sessionsCreateOneToOneForAthlete: (athleteId: string, athleteName: string) => ({
    pathname: '/sessions/create',
    params: {
      athleteIds: athleteId,
      athleteNames: athleteName,
      preset: '1on1',
      inviteType: 'CLOSED',
    },
  }) as Href,
  sessionsCreateGroupForAthlete: (athleteId: string, athleteName: string) => ({
    pathname: '/sessions/create',
    params: {
      athleteIds: athleteId,
      athleteNames: athleteName,
      preset: 'group',
      inviteType: 'CLOSED',
    },
  }) as Href,
  sessionComplete: (id: string) => ({
    pathname: '/session/[id]/complete',
    params: { id },
  }) as Href,
  sessionNotes: (bookingId: string) => ({
    pathname: '/session-notes/[bookingId]',
    params: { bookingId },
  }) as Href,

  // ─── Session Invites ───────────────────────────────────────────
  SESSION_INVITES: '/session-invites' as Href,
  SESSION_INVITES_CREATE: '/session-invites/create' as Href,
  sessionInvitesCreateForOffering: (offeringId: string) => ({
    pathname: '/session-invites/create',
    params: { offeringId },
  }) as Href,
  SESSION_INVITES_GROUP: '/session-invites/group' as Href,
  SESSION_INVITES_SQUAD: '/session-invites/squad' as Href,
  sessionInvite: (id: string) => ({
    pathname: '/session-invites/[id]',
    params: { id },
  }) as Href,

  // ─── Settings ──────────────────────────────────────────────────
  SETTINGS_INDEX: '/settings' as Href,
  SETTINGS_ACCOUNT: '/settings/account' as Href,
  SETTINGS_APPEARANCE: '/settings/appearance' as Href,
  SETTINGS_CALENDAR_SYNC: '/settings/calendar-sync' as Href,
  SETTINGS_CANCELLATION_POLICY: '/settings/cancellation-policy' as Href,
  SETTINGS_COACHING: '/settings/coaching' as Href,
  SETTINGS_BLOCKED_DATES: '/settings/blocked-dates' as Href,
  SETTINGS_BLOCKED_USERS: '/settings/blocked-users' as Href,
  SETTINGS_HELP: '/settings/help' as Href,
  SETTINGS_SMART_SLOTS: '/settings/smart-slots' as Href,
  SETTINGS_TRAVEL_RADIUS: '/settings/travel-radius' as Href,
  SETTINGS_NOTIFICATIONS: '/settings/notifications' as Href,
  SETTINGS_NOTIFICATION_PREFERENCES: '/settings/notifications/preferences' as Href,
  SETTINGS_PRIVACY: '/settings/privacy' as Href,
  SETTINGS_PRIVACY_POLICY: '/settings/privacy-policy' as Href,
  SETTINGS_TERMS: '/settings/terms' as Href,

  // ─── Skills ────────────────────────────────────────────────────
  SKILLS: '/skills' as Href,
  skillCategory: (category: string) => ({
    pathname: '/skills/[category]',
    params: { category },
  }) as Href,

  // ─── Squads ────────────────────────────────────────────────────
  squadInvite: (id: string) => ({
    pathname: '/squads/[id]/invite',
    params: { id },
  }) as Href,

  // ─── Verification ──────────────────────────────────────────────
  VERIFICATION: '/verification' as Href,
  VERIFICATION_BACKGROUND: '/verification/background' as Href,
  VERIFICATION_CREDENTIALS: '/verification/credentials' as Href,
  VERIFICATION_ID: '/verification/id' as Href,
  VERIFICATION_INSURANCE: '/verification/insurance' as Href,

  // ─── Videos ────────────────────────────────────────────────────
  VIDEOS: '/videos' as Href,
  VIDEOS_UPLOAD: '/videos/upload' as Href,
  video: (id: string) => ({
    pathname: '/videos/[id]',
    params: { id },
  }) as Href,
  videoAnnotate: (id: string) => ({
    pathname: '/videos/annotate/[id]',
    params: { id },
  }) as Href,

  // ─── Waitlist ──────────────────────────────────────────────────
  WAITLIST: '/waitlist' as Href,

  // ─── Favourites ────────────────────────────────────────────────
  FAVOURITES: '/favourites' as Href,
} as const;
