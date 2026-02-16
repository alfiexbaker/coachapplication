"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Routes = void 0;
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
exports.Routes = {
    // ─── Root ──────────────────────────────────────────────────────
    ROOT: '/',
    // ─── Tabs ──────────────────────────────────────────────────────
    HOME: '/(tabs)',
    HOME_INDEX: '/(tabs)/index',
    FEED: '/(tabs)/feed',
    BOOKINGS: '/(tabs)/bookings',
    ATHLETES: '/(tabs)/athletes',
    SETTINGS: '/(tabs)/settings',
    COACH_PROFILE: '/(tabs)/coach-profile',
    EDIT_PROFILE: '/(tabs)/edit-profile',
    AVAILABILITY: '/(tabs)/availability',
    BADGES: '/(tabs)/badges',
    CHILDREN: '/(tabs)/children',
    CLUB_HUB: '/(tabs)/club-hub',
    clubHub: (params) => ({
        pathname: '/(tabs)/club-hub',
        params: params ?? {},
    }),
    EARNINGS: '/(tabs)/earnings',
    MESSAGES: '/(tabs)/messages',
    MANAGE: '/manage',
    MORE: '/(tabs)/more',
    NOTIFICATIONS: '/(tabs)/notifications',
    ROSTER: '/(tabs)/roster',
    SCHEDULE: '/(tabs)/schedule',
    WALLET: '/(tabs)/wallet',
    // ─── Tab sub-routes (dynamic) ─────────────────────────────────
    booking: (id) => ({
        pathname: '/(tabs)/bookings/[id]',
        params: { id },
    }),
    BOOKINGS_OBJECTIVES: '/(tabs)/bookings/objectives',
    BOOKINGS_REPORT_PROBLEM: '/(tabs)/bookings/report-problem',
    BOOKINGS_STATISTICS: '/(tabs)/bookings/statistics',
    ADMIN_INVITE_CODES: '/(tabs)/admin/invite-codes',
    // ─── Modals ────────────────────────────────────────────────────
    MODAL_ADD_CHILD: '/(modal)/add-child',
    MODAL_CREATE_POST: '/(modal)/create-post',
    MODAL_CREATE_CLUB_POST: '/(modal)/create-club-post',
    modalCreateClubPost: (params) => ({
        pathname: '/(modal)/create-club-post',
        params: params ?? {},
    }),
    MODAL_CREATE_SQUAD: '/(modal)/create-squad',
    modalPostDetail: (postId) => ({
        pathname: '/(modal)/post-detail',
        params: { postId },
    }),
    // ─── Academy ───────────────────────────────────────────────────
    ACADEMY_CREATE: '/academy/create',
    ACADEMY_JOIN: '/academy/join',
    academy: (id) => ({
        pathname: '/academy/[id]',
        params: { id },
    }),
    academyBranding: (id) => ({
        pathname: '/academy/[id]/branding',
        params: { id },
    }),
    academySettings: (id) => ({
        pathname: '/academy/[id]/settings',
        params: { id },
    }),
    academyStaff: (id) => ({
        pathname: '/academy/[id]/staff',
        params: { id },
    }),
    academyInvite: (id) => ({
        pathname: '/academy/[id]/invite',
        params: { id },
    }),
    academyStaffMember: (id, staffId) => ({
        pathname: '/academy/[id]/staff/[staffId]',
        params: { id, staffId },
    }),
    // ─── Admin ─────────────────────────────────────────────────────
    ADMIN_PROMO_CODES: '/admin/promo-codes',
    ADMIN_PROMO_CODES_CREATE: '/admin/promo-codes/create',
    // ─── Analytics ─────────────────────────────────────────────────
    ANALYTICS_DASHBOARD: '/analytics/dashboard',
    ANALYTICS_REVENUE: '/analytics/revenue',
    ANALYTICS_RETENTION: '/analytics/retention',
    analyticsAthlete: (athleteId) => ({
        pathname: '/analytics/[athleteId]',
        params: { athleteId },
    }),
    analyticsAthleteGoals: (athleteId) => ({
        pathname: '/analytics/[athleteId]/goals',
        params: { athleteId },
    }),
    // ─── Availability ──────────────────────────────────────────────
    AVAILABILITY_ADD_TEMPLATE: '/availability/add-template',
    AVAILABILITY_BLOCK_DATE: '/availability/block-date',
    AVAILABILITY_CALENDAR: '/availability/calendar',
    AVAILABILITY_SCHEDULING_RULES: '/availability/scheduling-rules',
    // ─── Badges ────────────────────────────────────────────────────
    BADGES_INDEX: '/badges',
    // ─── Book ──────────────────────────────────────────────────────
    BOOK_COACH: '/book-coach',
    bookCoachWith: (coachId) => ({
        pathname: '/book-coach',
        params: { coachId },
    }),
    CONFIRM_BOOKING: '/confirm-booking',
    confirmBookingWith: (params) => ({
        pathname: '/confirm-booking',
        params,
    }),
    bookSessionType: (coachId) => ({
        pathname: '/book/[coachId]/session-type',
        params: { coachId },
    }),
    bookSchedule: (coachId) => ({
        pathname: '/book/[coachId]/schedule',
        params: { coachId },
    }),
    bookDetails: (coachId) => ({
        pathname: '/book/[coachId]/details',
        params: { coachId },
    }),
    bookReview: (coachId) => ({
        pathname: '/book/[coachId]/review',
        params: { coachId },
    }),
    bookConfirmation: (coachId) => ({
        pathname: '/book/[coachId]/confirmation',
        params: { coachId },
    }),
    bookCoach: (coachId) => ({
        pathname: '/book/[coachId]',
        params: { coachId },
    }),
    bookMultiWeek: (coachId) => ({
        pathname: '/book/[coachId]/multi-week',
        params: { coachId },
    }),
    // ─── Booking (non-tab) ────────────────────────────────────────
    bookingCancel: (id, mode) => ({
        pathname: '/booking/[id]/cancel',
        params: mode ? { id, mode } : { id },
    }),
    bookingsNegotiate: (id) => ({
        pathname: '/bookings/[id]/negotiate',
        params: { id },
    }),
    bookingsCounter: (id) => ({
        pathname: '/bookings/[id]/counter',
        params: { id },
    }),
    BOOKINGS_RECURRING: '/bookings/recurring',
    BOOKINGS_SUBSCRIBE: '/bookings/subscribe',
    sessionFeedback: (params) => ({
        pathname: '/bookings/session-feedback',
        params,
    }),
    // ─── Carpool ───────────────────────────────────────────────────
    CARPOOL: '/carpool',
    // ─── Chat ──────────────────────────────────────────────────────
    chat: (threadId) => ({
        pathname: '/chat/[threadId]',
        params: { threadId },
    }),
    messagesWith: (params) => ({
        pathname: '/(tabs)/messages',
        params,
    }),
    // ─── Child ─────────────────────────────────────────────────────
    childEmergency: (id) => ({
        pathname: '/child/[id]/emergency',
        params: { id },
    }),
    childMedical: (id) => ({
        pathname: '/child/[id]/medical',
        params: { id },
    }),
    childBadges: (childId) => ({
        pathname: '/children/badges/[childId]',
        params: { childId },
    }),
    // ─── Club ──────────────────────────────────────────────────────
    CLUB_CREATE: '/club/create',
    CLUB_INVITE_MEMBERS: '/club/invite-members',
    CLUB_SETTINGS: '/club/settings',
    clubSettings: (params) => ({
        pathname: '/club/settings',
        params: params ?? {},
    }),
    CLUB_TRAINING_SCHEDULE: '/club/training-schedule',
    club: (id) => ({
        pathname: '/club/[id]',
        params: { id },
    }),
    clubDashboard: (clubId) => ({
        pathname: '/club/[clubId]/dashboard',
        params: { clubId },
    }),
    clubBranding: (clubId) => ({
        pathname: '/club/[clubId]/branding',
        params: { clubId },
    }),
    clubCalendar: (clubId) => ({
        pathname: '/club/[clubId]/calendar',
        params: { clubId },
    }),
    clubMember: (clubId, memberId) => ({
        pathname: '/club/[clubId]/member/[memberId]',
        params: { clubId, memberId },
    }),
    clubSquad: (id) => ({
        pathname: '/club/squad/[id]',
        params: { id },
    }),
    CLUB_SQUAD_CREATE: '/club/squad/create',
    clubSquadCreate: (clubId) => ({
        pathname: '/club/squad/create',
        params: { clubId },
    }),
    // ─── Coach ─────────────────────────────────────────────────────
    COACH_INVITES: '/coach-invites',
    coachInvitesWith: (params) => ({
        pathname: '/coach-invites',
        params,
    }),
    coachInviteAthlete: (athleteId) => ({
        pathname: '/coach/invite',
        params: { athleteId },
    }),
    chatWithAthlete: (athleteId) => ({
        pathname: '/chat',
        params: { athleteId },
    }),
    coachPublic: (coachId) => ({
        pathname: '/coach/[coachId]/public',
        params: { coachId },
    }),
    coach: (id) => ({
        pathname: '/coach/[id]',
        params: { id },
    }),
    // ─── Community ─────────────────────────────────────────────────
    COMMUNITY: '/community',
    communityGroup: (groupId) => ({
        pathname: '/community/[groupId]',
        params: { groupId },
    }),
    // ─── Compare ───────────────────────────────────────────────────
    COMPARE: '/compare',
    compareCoaches: (ids) => ({
        pathname: '/compare/[ids]',
        params: { ids },
    }),
    // ─── Development ───────────────────────────────────────────────
    DEVELOPMENT_BADGES: '/development/badges',
    developmentBadgesHighlight: (badgeAwardId) => ({
        pathname: '/development/badges',
        params: { highlightBadge: badgeAwardId },
    }),
    DEVELOPMENT_MY_PROGRESS: '/development/my-progress',
    developmentAthlete: (athleteId) => ({
        pathname: '/development/athlete/[athleteId]',
        params: { athleteId },
    }),
    developmentAthleteSpecialNeeds: (athleteId) => ({
        pathname: '/development/athlete/[athleteId]/special-needs',
        params: { athleteId },
    }),
    developmentSession: (sessionId) => ({
        pathname: '/development/session/[sessionId]',
        params: { sessionId },
    }),
    developmentChildProgress: (childId) => ({
        pathname: '/development/child-progress/[childId]',
        params: { childId },
    }),
    // ─── Discover ──────────────────────────────────────────────────
    DISCOVER_SESSIONS: '/discover-sessions',
    DISCOVER_MAP: '/discover/map',
    DISCOVER_FILTERS: '/discover/filters',
    // ─── Drills ────────────────────────────────────────────────────
    DRILLS: '/drills',
    DRILLS_CREATE: '/drills/create',
    DRILLS_LIBRARY: '/drills/library',
    DRILLS_ASSIGN: '/drills/assign',
    DRILLS_CHALLENGES: '/drills/challenges',
    DRILLS_CREATE_CHALLENGE: '/drills/create-challenge',
    drill: (id) => ({
        pathname: '/drills/[id]',
        params: { id },
    }),
    drillsAssignWith: (drillId) => ({
        pathname: '/drills/assign',
        params: { drillId },
    }),
    // ─── Athlete ──────────────────────────────────────────────────
    ATHLETE_JOURNAL: '/athlete/journal',
    // ─── Events ────────────────────────────────────────────────────
    EVENTS: '/events',
    EVENTS_CREATE: '/events/create',
    event: (id) => ({
        pathname: '/events/[id]',
        params: { id },
    }),
    eventRsvp: (id) => ({
        pathname: '/events/[id]/rsvp',
        params: { id },
    }),
    eventAttendees: (id) => ({
        pathname: '/events/[id]/attendees',
        params: { id },
    }),
    // ─── Family ────────────────────────────────────────────────────
    FAMILY: '/family',
    FAMILY_CALENDAR: '/family/calendar',
    FAMILY_SHARING: '/family/sharing',
    FAMILY_SPENDING: '/family/spending',
    // ─── Goals ─────────────────────────────────────────────────────
    GOALS: '/goals',
    GOALS_CREATE: '/goals/create',
    goal: (id) => ({
        pathname: '/goals/[id]',
        params: { id },
    }),
    // ─── Group Sessions ────────────────────────────────────────────
    GROUP_SESSIONS: '/group-sessions',
    GROUP_SESSIONS_CREATE: '/group-sessions/create',
    groupSession: (id) => ({
        pathname: '/group-sessions/[id]',
        params: { id },
    }),
    groupSessionRoster: (id) => ({
        pathname: '/group-sessions/[id]/roster',
        params: { id },
    }),
    // ─── Health ────────────────────────────────────────────────────
    HEALTH: '/health',
    HEALTH_INJURIES: '/health/injuries',
    HEALTH_LOG: '/health/log',
    healthEntry: (id) => ({
        pathname: '/health/[id]',
        params: { id },
    }),
    // ─── Invites ───────────────────────────────────────────────────
    INVITES: '/invites',
    // ─── Invoices ──────────────────────────────────────────────────
    INVOICES: '/invoices',
    invoice: (id) => ({
        pathname: '/invoices/[id]',
        params: { id },
    }),
    // ─── Matches ───────────────────────────────────────────────────
    MATCHES: '/matches',
    MATCHES_CREATE: '/matches/create',
    match: (id) => ({
        pathname: '/matches/[id]',
        params: { id },
    }),
    // ─── Packages ──────────────────────────────────────────────────
    PACKAGES: '/packages',
    PACKAGES_MANAGE: '/packages/manage',
    package: (id) => ({
        pathname: '/packages/[id]',
        params: { id },
    }),
    // ─── Payment ───────────────────────────────────────────────────
    PAYMENT_METHODS: '/payment/methods',
    PAYMENT_ADD_CARD: '/payment/add-card',
    // ─── Profile ──────────────────────────────────────────────────
    profile: (userId) => ({
        pathname: '/profile/[userId]',
        params: { userId },
    }),
    // ─── Rate / Review ─────────────────────────────────────────────
    RATE_COACH: '/rate-coach',
    review: (bookingId) => ({
        pathname: '/review/[bookingId]',
        params: { bookingId },
    }),
    reviewCreate: (bookingId, coachId) => ({
        pathname: '/review/create',
        params: { bookingId, coachId },
    }),
    // ─── Referrals ─────────────────────────────────────────────────
    REFERRALS: '/referrals',
    REFERRALS_INVITE: '/referrals/invite',
    // ─── Roster ────────────────────────────────────────────────────
    ROSTER_INDEX: '/roster',
    ROSTER_CONSENTS: '/roster/consents',
    rosterAthlete: (athleteId) => ({
        pathname: '/roster/[athleteId]',
        params: { athleteId },
    }),
    rosterAthleteEmergency: (athleteId) => ({
        pathname: '/roster/[athleteId]/emergency',
        params: { athleteId },
    }),
    rosterAthleteAddToSession: (athleteId, athleteName) => ({
        pathname: '/roster/[athleteId]/add-to-session',
        params: athleteName ? { athleteId, athleteName } : { athleteId },
    }),
    rosterAthleteConcern: (athleteId) => ({
        pathname: '/roster/[athleteId]/raise-concern',
        params: { athleteId },
    }),
    // ─── Sessions ──────────────────────────────────────────────────
    SESSIONS_CREATE: '/sessions/create',
    sessionsCreateWith: (params) => ({
        pathname: '/sessions/create',
        params,
    }),
    sessionsCreateIntent: (params) => ({
        pathname: '/sessions/create',
        params,
    }),
    sessionsCreateOneToOneForAthlete: (athleteId, athleteName) => ({
        pathname: '/sessions/create',
        params: {
            athleteIds: athleteId,
            athleteNames: athleteName,
            preset: '1on1',
            inviteType: 'CLOSED',
        },
    }),
    sessionsCreateGroupForAthlete: (athleteId, athleteName) => ({
        pathname: '/sessions/create',
        params: {
            athleteIds: athleteId,
            athleteNames: athleteName,
            preset: 'group',
            inviteType: 'CLOSED',
        },
    }),
    sessionComplete: (id) => ({
        pathname: '/session/[id]/complete',
        params: { id },
    }),
    sessionNotes: (bookingId) => ({
        pathname: '/session-notes/[bookingId]',
        params: { bookingId },
    }),
    // ─── Session Invites ───────────────────────────────────────────
    SESSION_INVITES: '/session-invites',
    SESSION_INVITES_CREATE: '/session-invites/create',
    sessionInvitesCreateForOffering: (offeringId) => ({
        pathname: '/session-invites/create',
        params: { offeringId },
    }),
    SESSION_INVITES_GROUP: '/session-invites/group',
    SESSION_INVITES_SQUAD: '/session-invites/squad',
    sessionInvite: (id) => ({
        pathname: '/session-invites/[id]',
        params: { id },
    }),
    // ─── Settings ──────────────────────────────────────────────────
    SETTINGS_INDEX: '/settings',
    SETTINGS_ACCOUNT: '/settings/account',
    SETTINGS_APPEARANCE: '/settings/appearance',
    SETTINGS_CALENDAR_SYNC: '/settings/calendar-sync',
    SETTINGS_CANCELLATION_POLICY: '/settings/cancellation-policy',
    SETTINGS_COACHING: '/settings/coaching',
    SETTINGS_BLOCKED_DATES: '/settings/blocked-dates',
    SETTINGS_HELP: '/settings/help',
    SETTINGS_SMART_SLOTS: '/settings/smart-slots',
    SETTINGS_TRAVEL_RADIUS: '/settings/travel-radius',
    SETTINGS_NOTIFICATIONS: '/settings/notifications',
    SETTINGS_PRIVACY: '/settings/privacy',
    // ─── Skills ────────────────────────────────────────────────────
    SKILLS: '/skills',
    skillCategory: (category) => ({
        pathname: '/skills/[category]',
        params: { category },
    }),
    // ─── Squads ────────────────────────────────────────────────────
    squadInvite: (id) => ({
        pathname: '/squads/[id]/invite',
        params: { id },
    }),
    // ─── Verification ──────────────────────────────────────────────
    VERIFICATION: '/verification',
    VERIFICATION_BACKGROUND: '/verification/background',
    VERIFICATION_CREDENTIALS: '/verification/credentials',
    VERIFICATION_ID: '/verification/id',
    VERIFICATION_INSURANCE: '/verification/insurance',
    // ─── Videos ────────────────────────────────────────────────────
    VIDEOS: '/videos',
    VIDEOS_UPLOAD: '/videos/upload',
    video: (id) => ({
        pathname: '/videos/[id]',
        params: { id },
    }),
    videoAnnotate: (id) => ({
        pathname: '/videos/annotate/[id]',
        params: { id },
    }),
    // ─── Waitlist ──────────────────────────────────────────────────
    WAITLIST: '/waitlist',
    // ─── Favourites ────────────────────────────────────────────────
    FAVOURITES: '/favourites',
};
