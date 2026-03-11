/**
 * REST API Endpoint Map
 *
 * Maps logical resources to REST routes. Used by apiClient when
 * USE_MOCK === false to route requests to the real backend.
 *
 * In mock mode, apiClient continues using AsyncStorage keys directly.
 */

export const Endpoints = {
  // ──────────────────────────────────────────
  // AUTH
  // ──────────────────────────────────────────
  auth: {
    login: () => `/v1/auth/login`,
    register: () => `/v1/auth/register`,
    refresh: () => `/v1/auth/refresh`,
    revoke: () => `/v1/auth/revoke`,
    me: () => `/v1/auth/me`,
  },

  // ──────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────
  users: {
    list: () => `/api/users`,
    detail: (id: string) => `/api/users/${id}`,
    profile: (id: string) => `/api/users/${id}/profile`,
  },

  // ──────────────────────────────────────────
  // COACHES
  // ──────────────────────────────────────────
  coaches: {
    list: () => `/api/coaches`,
    detail: (id: string) => `/api/coaches/${id}`,
    profile: (id: string) => `/api/coaches/${id}/profile`,
    analytics: (id: string) => `/api/coaches/${id}/analytics`,
    availability: (id: string) => `/api/coaches/${id}/availability`,
    templates: (id: string) => `/api/coaches/${id}/availability/templates`,
    overrides: (id: string) => `/api/coaches/${id}/availability/overrides`,
    schedulingRules: (id: string) => `/api/coaches/${id}/scheduling-rules`,
    blockedDates: (id: string) => `/api/coaches/${id}/blocked-dates`,
    sessionTemplates: (id: string) => `/api/coaches/${id}/session-templates`,
    earnings: (id: string) => `/api/coaches/${id}/earnings`,
    payouts: (id: string) => `/api/coaches/${id}/payouts`,
    withdrawals: (id: string) => `/api/coaches/${id}/withdrawals`,
    roster: (id: string) => `/api/coaches/${id}/roster`,
    venues: (id: string) => `/api/coaches/${id}/venues`,
    locations: (id: string) => `/api/coaches/${id}/locations`,
    feedPosts: (id: string) => `/api/coaches/${id}/feed-posts`,
    observations: (id: string) => `/api/coaches/${id}/observations`,
    sessions: (id: string) => `/api/coaches/${id}/sessions`,
  },

  // ──────────────────────────────────────────
  // ATHLETES
  // ──────────────────────────────────────────
  athletes: {
    list: () => `/api/athletes`,
    detail: (id: string) => `/api/athletes/${id}`,
    skills: (id: string) => `/api/athletes/${id}/skills`,
    feedback: (id: string) => `/api/athletes/${id}/feedback`,
    goals: (id: string) => `/api/athletes/${id}/goals`,
    analytics: (id: string) => `/api/athletes/${id}/analytics`,
    challenges: (id: string) => `/api/athletes/${id}/challenges`,
    badges: (id: string) => `/api/athletes/${id}/badges`,
    journal: (id: string) => `/api/athletes/${id}/journal`,
    injuries: (id: string) => `/api/athletes/${id}/injuries`,
  },

  // ──────────────────────────────────────────
  // BOOKINGS
  // ──────────────────────────────────────────
  bookings: {
    list: () => `/api/bookings`,
    detail: (id: string) => `/api/bookings/${id}`,
    status: (id: string) => `/api/bookings/${id}/status`,
    cancel: (id: string) => `/api/bookings/${id}/cancel`,
    series: () => `/api/bookings/series`,
    seriesDetail: (id: string) => `/api/bookings/series/${id}`,
    recurring: () => `/api/bookings/recurring`,
    recurringDetail: (id: string) => `/api/bookings/recurring/${id}`,
  },

  // ──────────────────────────────────────────
  // SESSIONS
  // ──────────────────────────────────────────
  sessions: {
    list: () => `/api/sessions`,
    detail: (id: string) => `/api/sessions/${id}`,
    feedback: (id: string) => `/api/sessions/${id}/feedback`,
    attendance: (id: string) => `/api/sessions/${id}/attendance`,
    media: (id: string) => `/api/sessions/${id}/media`,
    notes: (id: string) => `/api/sessions/${id}/notes`,
    videos: (id: string) => `/api/sessions/${id}/videos`,
    annotations: (id: string) => `/api/sessions/${id}/annotations`,
    sharing: (id: string) => `/api/sessions/${id}/sharing`,
    offerings: () => `/api/sessions/offerings`,
    offeringDetail: (id: string) => `/api/sessions/offerings/${id}`,
  },

  // ──────────────────────────────────────────
  // GROUP SESSIONS
  // ──────────────────────────────────────────
  groupSessions: {
    list: () => `/api/group-sessions`,
    detail: (id: string) => `/api/group-sessions/${id}`,
    registrations: (id: string) => `/api/group-sessions/${id}/registrations`,
    rsvps: (id: string) => `/api/group-sessions/${id}/rsvps`,
  },

  // ──────────────────────────────────────────
  // FAMILY
  // ──────────────────────────────────────────
  family: {
    members: () => `/api/family/members`,
    memberDetail: (id: string) => `/api/family/members/${id}`,
    children: () => `/api/family/children`,
    childDetail: (id: string) => `/api/family/children/${id}`,
    bookings: () => `/api/family/bookings`,
    accounts: () => `/api/family/accounts`,
    guardianInvites: () => `/api/family/guardian-invites`,
  },

  // ──────────────────────────────────────────
  // CLUBS
  // ──────────────────────────────────────────
  clubs: {
    list: () => `/api/clubs`,
    detail: (id: string) => `/api/clubs/${id}`,
    members: (id: string) => `/api/clubs/${id}/members`,
    branding: (id: string) => `/api/clubs/${id}/branding`,
    squads: (id: string) => `/api/clubs/${id}/squads`,
    squadMembers: (clubId: string, squadId: string) => `/api/clubs/${clubId}/squads/${squadId}/members`,
    events: (id: string) => `/api/clubs/${id}/events`,
    invites: (id: string) => `/api/clubs/${id}/invites`,
  },

  // ──────────────────────────────────────────
  // EVENTS
  // ──────────────────────────────────────────
  events: {
    list: () => `/api/events`,
    detail: (id: string) => `/api/events/${id}`,
    rsvps: (id: string) => `/api/events/${id}/rsvps`,
    attendance: (id: string) => `/api/events/${id}/attendance`,
  },

  // ──────────────────────────────────────────
  // INVITES
  // ──────────────────────────────────────────
  invites: {
    session: () => `/api/invites/session`,
    sessionDetail: (id: string) => `/api/invites/session/${id}`,
    squad: () => `/api/invites/squad`,
    squadSession: () => `/api/invites/squad-session`,
    rsvps: () => `/api/invites/rsvps`,
    shareLinks: () => `/api/invites/share-links`,
  },

  // ──────────────────────────────────────────
  // FINANCIAL
  // ──────────────────────────────────────────
  wallets: {
    list: () => `/api/wallets`,
    detail: (id: string) => `/api/wallets/${id}`,
    transactions: (id: string) => `/api/wallets/${id}/transactions`,
  },

  invoices: {
    list: () => `/api/invoices`,
    detail: (id: string) => `/api/invoices/${id}`,
  },

  promoCodes: {
    list: () => `/api/promo-codes`,
    detail: (id: string) => `/api/promo-codes/${id}`,
    usage: (id: string) => `/api/promo-codes/${id}/usage`,
  },

  referrals: {
    codes: () => `/api/referrals/codes`,
    list: () => `/api/referrals`,
  },

  bills: {
    list: () => `/api/bills`,
    detail: (id: string) => `/api/bills/${id}`,
  },

  // ──────────────────────────────────────────
  // MESSAGING
  // ──────────────────────────────────────────
  messages: {
    list: () => `/api/messages`,
    detail: (id: string) => `/api/messages/${id}`,
    threads: () => `/api/messages/threads`,
    threadDetail: (id: string) => `/api/messages/threads/${id}`,
  },

  // ──────────────────────────────────────────
  // NOTIFICATIONS
  // ──────────────────────────────────────────
  notifications: {
    list: () => `/api/notifications`,
    detail: (id: string) => `/api/notifications/${id}`,
    preferences: () => `/api/notifications/preferences`,
    markRead: (id: string) => `/api/notifications/${id}/read`,
  },

  // ──────────────────────────────────────────
  // COMMUNITY
  // ──────────────────────────────────────────
  community: {
    groups: () => `/api/community/groups`,
    groupDetail: (id: string) => `/api/community/groups/${id}`,
    groupMessages: (id: string) => `/api/community/groups/${id}/messages`,
    groupInvites: (id: string) => `/api/community/groups/${id}/invites`,
  },

  // ──────────────────────────────────────────
  // SOCIAL
  // ──────────────────────────────────────────
  social: {
    follows: () => `/api/social/follows`,
    followRequests: () => `/api/social/follow-requests`,
    favourites: () => `/api/social/favourites`,
    comments: () => `/api/social/comments`,
    commentDetail: (id: string) => `/api/social/comments/${id}`,
  },

  // ──────────────────────────────────────────
  // PROGRESS
  // ──────────────────────────────────────────
  progress: {
    skillLevels: (athleteId: string) => `/api/progress/${athleteId}/skills`,
    sessionFeedback: () => `/api/progress/feedback`,
    goals: (athleteId: string) => `/api/progress/${athleteId}/goals`,
    challenges: () => `/api/progress/challenges`,
    practiceLog: (athleteId: string) => `/api/progress/${athleteId}/practice-log`,
    selfAssessments: (athleteId: string) => `/api/progress/${athleteId}/self-assessments`,
    termReports: (athleteId: string) => `/api/progress/${athleteId}/term-reports`,
    leaderboard: (squadId: string) => `/api/progress/leaderboard/${squadId}`,
  },

  // ──────────────────────────────────────────
  // TRAINING & CONTENT
  // ──────────────────────────────────────────
  drills: {
    list: () => `/api/drills`,
    detail: (id: string) => `/api/drills/${id}`,
    assignments: () => `/api/drills/assignments`,
    assignmentDetail: (id: string) => `/api/drills/assignments/${id}`,
  },

  matches: {
    list: () => `/api/matches`,
    detail: (id: string) => `/api/matches/${id}`,
  },

  // ──────────────────────────────────────────
  // REVIEWS & RECOGNITION
  // ──────────────────────────────────────────
  reviews: {
    list: () => `/api/reviews`,
    detail: (id: string) => `/api/reviews/${id}`,
  },

  badges: {
    awards: () => `/api/badges/awards`,
    awardDetail: (id: string) => `/api/badges/awards/${id}`,
  },

  // ──────────────────────────────────────────
  // SCHEDULING
  // ──────────────────────────────────────────
  scheduling: {
    cancellationPolicies: () => `/api/scheduling/cancellation-policies`,
    cancellationRecords: () => `/api/scheduling/cancellation-records`,
    counterOffers: () => `/api/scheduling/counter-offers`,
    counterOfferDetail: (id: string) => `/api/scheduling/counter-offers/${id}`,
    negotiations: () => `/api/scheduling/negotiations`,
    waitlist: () => `/api/scheduling/waitlist`,
  },

  // ──────────────────────────────────────────
  // SAFETY
  // ──────────────────────────────────────────
  safety: {
    emergencyInfo: (userId: string) => `/api/safety/${userId}/emergency`,
    verification: (userId: string) => `/api/safety/${userId}/verification`,
  },

  // ──────────────────────────────────────────
  // TRIALS
  // ──────────────────────────────────────────
  trials: {
    offerings: () => `/api/trials/offerings`,
    offeringDetail: (id: string) => `/api/trials/offerings/${id}`,
    usages: () => `/api/trials/usages`,
    conversions: () => `/api/trials/conversions`,
  },

  // ──────────────────────────────────────────
  // SYSTEM
  // ──────────────────────────────────────────
  system: {
    calendarSync: () => `/api/system/calendar-sync`,
    blockedUsers: () => `/api/system/blocked-users`,
    reports: () => `/api/system/reports`,
  },
} as const;

/** Type helper for endpoint functions */
export type EndpointFn = (...args: string[]) => string;
