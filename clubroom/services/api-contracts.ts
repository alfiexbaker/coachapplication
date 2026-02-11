/**
 * API Contracts - Backend Integration Blueprint
 *
 * This file defines ALL API endpoints required to replace AsyncStorage
 * with a real backend. Each endpoint includes:
 * - HTTP method and path
 * - Request body/params type
 * - Response type
 * - Authentication requirements
 *
 * USAGE FOR BACKEND TEAM:
 * 1. Implement each endpoint following the contract
 * 2. Return data matching the response types
 * 3. All endpoints require JWT auth unless marked PUBLIC
 *
 * STATUS: Ready for backend implementation
 * PRIORITY: High (Core flows) → Medium → Low (Nice-to-have)
 */

// Re-export all types needed for API integration
import type {
  UserProfile,
  CoachProfile,
  AvailabilityTemplate,
  AvailabilityOverride,
  AvailabilitySlot,
  SessionOffering,
  SessionRegistration,
  SessionInvite,
  TimeSlot,
  FamilyAccount,
  FamilyGuardian,
  FamilyMember,
  GuardianInvite,
  Wallet,
  WalletTransaction,
  CoachEarnings,
  Withdrawal,
  PayoutMethod,
  Notification,
  NotificationPreferences,
  BadgeDefinition,
  BadgeAward,
  CoachReview,
  CancellationPolicy,
  RefundCalculation,
  CoachSchedulingRules,
} from '@/constants/types';

import type { Booking } from '@/constants/app-types';

export type {
  // User & Auth
  SimplifiedUserType,
  UserProfile,
  CoachProfile,

  // Availability & Scheduling
  AvailabilityTemplate,
  AvailabilityOverride,
  AvailabilitySlot,
  CoachSchedulingRules,

  // Bookings & Sessions
  SessionOffering,
  SessionRegistration,
  SessionInvite,
  TimeSlot,

  // Family & Children
  FamilyAccount,
  FamilyGuardian,
  FamilyMember,
  GuardianInvite,
  GuardianPermission,
  GuardianRole,

  // Wallet & Payments
  Wallet,
  WalletTransaction,
  CoachEarnings,
  EarningTransaction,
  Withdrawal,
  PayoutMethod,

  // Progress & Badges
  BadgeDefinition,
  BadgeAward,

  // Notifications
  Notification,
  NotificationPreferences,

  // Reviews & Feedback
  CoachReview,

  // Cancellation
  CancellationPolicy,
  CancellationReason,
  RefundCalculation,
} from '@/constants/types';

export type { Booking } from '@/constants/app-types';
export type { CreateBookingParams, BookingDraft } from './booking-service';

// ============================================================================
// API CONFIGURATION
// ============================================================================

export const API_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.clubroom.app',
  version: 'v1',
  timeout: 30000,
};

// ============================================================================
// AUTH ENDPOINTS (Priority: HIGH)
// ============================================================================

export interface AuthAPI {
  /**
   * POST /auth/login
   * Authenticate user and return JWT tokens
   */
  login: {
    method: 'POST';
    path: '/auth/login';
    body: { email: string; password: string };
    response: {
      accessToken: string;
      refreshToken: string;
      user: UserProfile | CoachProfile;
      expiresIn: number;
    };
  };

  /**
   * POST /auth/register
   * Register new user account
   */
  register: {
    method: 'POST';
    path: '/auth/register';
    body: {
      email: string;
      password: string;
      name: string;
      userType: 'USER' | 'COACH';
      phone?: string;
    };
    response: {
      accessToken: string;
      refreshToken: string;
      user: UserProfile | CoachProfile;
    };
  };

  /**
   * POST /auth/refresh
   * Refresh expired access token
   */
  refreshToken: {
    method: 'POST';
    path: '/auth/refresh';
    body: { refreshToken: string };
    response: {
      accessToken: string;
      expiresIn: number;
    };
  };

  /**
   * POST /auth/logout
   * Invalidate current session
   */
  logout: {
    method: 'POST';
    path: '/auth/logout';
    response: { success: boolean };
  };

  /**
   * POST /auth/forgot-password
   * Request password reset email
   */
  forgotPassword: {
    method: 'POST';
    path: '/auth/forgot-password';
    body: { email: string };
    response: { success: boolean; message: string };
  };

  /**
   * POST /auth/reset-password
   * Reset password using token from email
   */
  resetPassword: {
    method: 'POST';
    path: '/auth/reset-password';
    body: { token: string; newPassword: string };
    response: { success: boolean };
  };

  /**
   * GET /auth/check-email
   * PUBLIC: Check if an email is available for registration
   */
  checkEmail: {
    method: 'GET';
    path: '/auth/check-email';
    query: { email: string };
    response: { available: boolean };
  };

  /**
   * POST /auth/verify-email
   * Verify email address with code
   */
  verifyEmail: {
    method: 'POST';
    path: '/auth/verify-email';
    body: { code: string };
    response: { success: boolean };
  };
}

export interface AvailabilityAPI {
  /**
   * GET /coaches/:coachId/availability/templates
   * Get all recurring availability templates for a coach
   */
  getTemplates: {
    method: 'GET';
    path: '/coaches/:coachId/availability/templates';
    params: { coachId: string };
    response: AvailabilityTemplate[];
  };

  /**
   * POST /coaches/:coachId/availability/templates
   * Create a new availability template
   */
  createTemplate: {
    method: 'POST';
    path: '/coaches/:coachId/availability/templates';
    params: { coachId: string };
    body: Omit<AvailabilityTemplate, 'id'>;
    response: AvailabilityTemplate;
  };

  /**
   * PUT /coaches/:coachId/availability/templates/:templateId
   * Update an existing template
   */
  updateTemplate: {
    method: 'PUT';
    path: '/coaches/:coachId/availability/templates/:templateId';
    params: { coachId: string; templateId: string };
    body: Partial<AvailabilityTemplate>;
    response: AvailabilityTemplate;
  };

  /**
   * DELETE /coaches/:coachId/availability/templates/:templateId
   * Delete a template
   */
  deleteTemplate: {
    method: 'DELETE';
    path: '/coaches/:coachId/availability/templates/:templateId';
    params: { coachId: string; templateId: string };
    response: { success: boolean };
  };

  /**
   * GET /coaches/:coachId/availability/overrides
   * Get date-specific overrides (blocked dates, custom hours)
   */
  getOverrides: {
    method: 'GET';
    path: '/coaches/:coachId/availability/overrides';
    params: { coachId: string };
    query: { startDate?: string; endDate?: string };
    response: AvailabilityOverride[];
  };

  /**
   * POST /coaches/:coachId/availability/overrides
   * Create or update a date override
   */
  createOverride: {
    method: 'POST';
    path: '/coaches/:coachId/availability/overrides';
    params: { coachId: string };
    body: Omit<AvailabilityOverride, 'id'>;
    response: AvailabilityOverride;
  };

  /**
   * DELETE /coaches/:coachId/availability/overrides/:date
   * Remove an override for a specific date
   */
  deleteOverride: {
    method: 'DELETE';
    path: '/coaches/:coachId/availability/overrides/:date';
    params: { coachId: string; date: string };
    response: { success: boolean };
  };

  /**
   * GET /coaches/:coachId/availability/slots
   * Get computed available time slots for a date range
   * This combines templates + overrides + existing bookings
   */
  getAvailableSlots: {
    method: 'GET';
    path: '/coaches/:coachId/availability/slots';
    params: { coachId: string };
    query: {
      startDate: string;
      endDate: string;
      duration?: number; // session duration in minutes
    };
    response: AvailabilitySlot[];
  };
}

export interface BookingAPI {
  /**
   * GET /bookings
   * Get all bookings for current user (role-aware)
   */
  listBookings: {
    method: 'GET';
    path: '/bookings';
    query: {
      status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    };
    response: {
      bookings: Booking[];
      total: number;
      hasMore: boolean;
    };
  };

  /**
   * GET /bookings/:bookingId
   * Get single booking details
   */
  getBooking: {
    method: 'GET';
    path: '/bookings/:bookingId';
    params: { bookingId: string };
    response: Booking;
  };

  /**
   * POST /bookings
   * Create a new booking
   */
  createBooking: {
    method: 'POST';
    path: '/bookings';
    body: {
      coachId: string;
      athleteIds: string[];
      scheduledAt: string;
      duration: number;
      location: string;
      service: string;
      serviceType: string;
      objectives?: string[];
      price?: number;
      notes?: string;
      sessionInviteId?: string;
    };
    response: Booking;
  };

  /**
   * PUT /bookings/:bookingId
   * Update booking (reschedule, update notes, etc.)
   */
  updateBooking: {
    method: 'PUT';
    path: '/bookings/:bookingId';
    params: { bookingId: string };
    body: Partial<Booking>;
    response: Booking;
  };

  /**
   * POST /bookings/:bookingId/cancel
   * Cancel a booking with optional reason
   */
  cancelBooking: {
    method: 'POST';
    path: '/bookings/:bookingId/cancel';
    params: { bookingId: string };
    body: {
      reason?: string;
      cancelledBy: 'COACH' | 'PARENT' | 'ATHLETE';
    };
    response: {
      booking: Booking;
      refund?: {
        amount: number;
        status: 'PENDING' | 'PROCESSED';
        processedAt?: string;
      };
    };
  };

  /**
   * POST /bookings/:bookingId/complete
   * Mark booking as completed (coach action)
   */
  completeBooking: {
    method: 'POST';
    path: '/bookings/:bookingId/complete';
    params: { bookingId: string };
    body: {
      sessionNotes?: string;
      skillsWorkedOn?: string[];
    };
    response: Booking;
  };
}

export interface SessionOfferingAPI {
  /**
   * GET /sessions/offerings
   * PUBLIC: Get all discoverable session offerings
   */
  listOfferings: {
    method: 'GET';
    path: '/sessions/offerings';
    query: {
      skillFocus?: string;
      sessionType?: 'one_on_one' | 'group';
      coachId?: string;
      startDate?: string;
      endDate?: string;
      location?: string;
      limit?: number;
      offset?: number;
    };
    response: {
      offerings: SessionOffering[];
      total: number;
      hasMore: boolean;
    };
  };

  /**
   * GET /sessions/offerings/:offeringId
   * Get single offering details with registrations
   */
  getOffering: {
    method: 'GET';
    path: '/sessions/offerings/:offeringId';
    params: { offeringId: string };
    response: SessionOffering;
  };

  /**
   * POST /sessions/offerings
   * Create a new session offering (coach only)
   */
  createOffering: {
    method: 'POST';
    path: '/sessions/offerings';
    body: Omit<SessionOffering, 'id' | 'registrations' | 'createdAt' | 'status'>;
    response: SessionOffering;
  };

  /**
   * PUT /sessions/offerings/:offeringId
   * Update offering details
   */
  updateOffering: {
    method: 'PUT';
    path: '/sessions/offerings/:offeringId';
    params: { offeringId: string };
    body: Partial<SessionOffering>;
    response: SessionOffering;
  };

  /**
   * POST /sessions/offerings/:offeringId/register
   * Register athlete(s) for a session
   */
  registerForSession: {
    method: 'POST';
    path: '/sessions/offerings/:offeringId/register';
    params: { offeringId: string };
    body: {
      athleteIds: string[];
      bookedById: string;
      bookedByName: string;
      notes?: string;
    };
    response: {
      offering: SessionOffering;
      registration: SessionRegistration;
    };
  };

  /**
   * POST /sessions/offerings/:offeringId/cancel-registration
   * Cancel a registration
   */
  cancelRegistration: {
    method: 'POST';
    path: '/sessions/offerings/:offeringId/cancel-registration';
    params: { offeringId: string };
    body: {
      registrationId: string;
      reason?: string;
    };
    response: {
      success: boolean;
      refund?: { amount: number; status: string };
    };
  };
}

export interface SessionInviteAPI {
  /**
   * GET /session-invites
   * Get invites for current user (sent or received based on role)
   */
  listInvites: {
    method: 'GET';
    path: '/session-invites';
    query: {
      direction: 'sent' | 'received';
      status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'COUNTERED';
    };
    response: SessionInvite[];
  };

  /**
   * POST /session-invites
   * Create a new session invite (coach only)
   */
  createInvite: {
    method: 'POST';
    path: '/session-invites';
    body: {
      athleteId: string;
      athleteName: string;
      parentId?: string;
      parentName?: string;
      parentEmail: string;
      proposedSlots: TimeSlot[];
      message?: string;
      sessionType: string;
      skillFocus: string[];
      duration: number;
      price: number;
      location: string;
      expiresInDays?: number;
    };
    response: SessionInvite;
  };

  /**
   * POST /session-invites/:inviteId/accept
   * Accept an invite with selected slot
   */
  acceptInvite: {
    method: 'POST';
    path: '/session-invites/:inviteId/accept';
    params: { inviteId: string };
    body: {
      selectedSlotId: string;
    };
    response: {
      invite: SessionInvite;
      booking: Booking;
    };
  };

  /**
   * POST /session-invites/:inviteId/decline
   * Decline an invite
   */
  declineInvite: {
    method: 'POST';
    path: '/session-invites/:inviteId/decline';
    params: { inviteId: string };
    body: {
      reason?: string;
    };
    response: SessionInvite;
  };

  /**
   * POST /session-invites/:inviteId/counter
   * Counter-offer with different times
   */
  counterInvite: {
    method: 'POST';
    path: '/session-invites/:inviteId/counter';
    params: { inviteId: string };
    body: {
      proposedSlots: TimeSlot[];
      message?: string;
    };
    response: SessionInvite;
  };
}

export interface FamilyAPI {
  /**
   * GET /family
   * Get current user's family account
   */
  getFamilyAccount: {
    method: 'GET';
    path: '/family';
    response: FamilyAccount;
  };

  /**
   * GET /family/members
   * Get all children in the family
   */
  getMembers: {
    method: 'GET';
    path: '/family/members';
    response: FamilyMember[];
  };

  /**
   * POST /family/members
   * Add a child to the family
   */
  addMember: {
    method: 'POST';
    path: '/family/members';
    body: Omit<FamilyMember, 'id' | 'addedAt'>;
    response: FamilyMember;
  };

  /**
   * PUT /family/members/:memberId
   * Update child information
   */
  updateMember: {
    method: 'PUT';
    path: '/family/members/:memberId';
    params: { memberId: string };
    body: Partial<FamilyMember>;
    response: FamilyMember;
  };

  /**
   * DELETE /family/members/:memberId
   * Remove child from family
   */
  deleteMember: {
    method: 'DELETE';
    path: '/family/members/:memberId';
    params: { memberId: string };
    response: { success: boolean };
  };

  /**
   * GET /family/guardians
   * Get all guardians with access to the family
   */
  getGuardians: {
    method: 'GET';
    path: '/family/guardians';
    response: FamilyGuardian[];
  };

  /**
   * POST /family/guardians/invite
   * Invite a new guardian (co-parent, grandparent, etc.)
   */
  inviteGuardian: {
    method: 'POST';
    path: '/family/guardians/invite';
    body: {
      email: string;
      name: string;
      role: 'GUARDIAN' | 'VIEWER';
      relationship: string;
      childAccess: string[];
      message?: string;
    };
    response: GuardianInvite;
  };

  /**
   * POST /family/guardians/invite/:inviteId/accept
   * Accept guardian invite
   */
  acceptGuardianInvite: {
    method: 'POST';
    path: '/family/guardians/invite/:inviteId/accept';
    params: { inviteId: string };
    response: {
      guardian: FamilyGuardian;
      family: FamilyAccount;
    };
  };

  /**
   * DELETE /family/guardians/:guardianId
   * Remove a guardian from family access
   */
  removeGuardian: {
    method: 'DELETE';
    path: '/family/guardians/:guardianId';
    params: { guardianId: string };
    response: { success: boolean };
  };

  /**
   * GET /family/upcoming
   * Get upcoming sessions for all family members
   */
  getUpcomingSessions: {
    method: 'GET';
    path: '/family/upcoming';
    query: { limit?: number };
    response: {
      sessions: {
        booking: Booking;
        child: FamilyMember;
      }[];
    };
  };

  /**
   * GET /family/spending
   * Get family spending summary
   */
  getSpending: {
    method: 'GET';
    path: '/family/spending';
    query: { startDate?: string; endDate?: string };
    response: {
      totalSpent: number;
      sessionCount: number;
      byChild: {
        childId: string;
        childName: string;
        amount: number;
        sessions: number;
      }[];
      byMonth: {
        month: string;
        amount: number;
      }[];
    };
  };
}

export interface WalletAPI {
  /**
   * GET /wallet
   * Get current user's wallet
   */
  getWallet: {
    method: 'GET';
    path: '/wallet';
    response: Wallet;
  };

  /**
   * POST /wallet/topup
   * Add funds to wallet
   */
  topUp: {
    method: 'POST';
    path: '/wallet/topup';
    body: {
      amount: number;
      paymentMethodId: string;
    };
    response: {
      transaction: WalletTransaction;
      wallet: Wallet;
    };
  };

  /**
   * GET /wallet/transactions
   * Get wallet transaction history
   */
  getTransactions: {
    method: 'GET';
    path: '/wallet/transactions';
    query: {
      limit?: number;
      offset?: number;
      type?: string;
    };
    response: {
      transactions: WalletTransaction[];
      total: number;
    };
  };
}

export interface EarningsAPI {
  /**
   * GET /earnings (Coach only)
   * Get coach earnings summary
   */
  getEarnings: {
    method: 'GET';
    path: '/earnings';
    response: CoachEarnings;
  };

  /**
   * POST /earnings/withdraw
   * Request withdrawal of earnings
   */
  requestWithdrawal: {
    method: 'POST';
    path: '/earnings/withdraw';
    body: {
      amount: number;
      payoutMethodId: string;
    };
    response: Withdrawal;
  };

  /**
   * GET /earnings/payout-methods
   * Get configured payout methods
   */
  getPayoutMethods: {
    method: 'GET';
    path: '/earnings/payout-methods';
    response: PayoutMethod[];
  };

  /**
   * POST /earnings/payout-methods
   * Add a payout method
   */
  addPayoutMethod: {
    method: 'POST';
    path: '/earnings/payout-methods';
    body: Omit<PayoutMethod, 'id' | 'createdAt' | 'isVerified' | 'verifiedAt'>;
    response: PayoutMethod;
  };
}

export interface NotificationAPI {
  /**
   * GET /notifications
   * Get user's notifications
   */
  listNotifications: {
    method: 'GET';
    path: '/notifications';
    query: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    };
    response: {
      notifications: Notification[];
      unreadCount: number;
    };
  };

  /**
   * PUT /notifications/:notificationId/read
   * Mark notification as read
   */
  markAsRead: {
    method: 'PUT';
    path: '/notifications/:notificationId/read';
    params: { notificationId: string };
    response: { success: boolean };
  };

  /**
   * PUT /notifications/read-all
   * Mark all notifications as read
   */
  markAllAsRead: {
    method: 'PUT';
    path: '/notifications/read-all';
    response: { success: boolean; count: number };
  };

  /**
   * GET /notifications/preferences
   * Get notification preferences
   */
  getPreferences: {
    method: 'GET';
    path: '/notifications/preferences';
    response: NotificationPreferences;
  };

  /**
   * PUT /notifications/preferences
   * Update notification preferences
   */
  updatePreferences: {
    method: 'PUT';
    path: '/notifications/preferences';
    body: Partial<NotificationPreferences>;
    response: NotificationPreferences;
  };

  /**
   * POST /notifications/register-device
   * Register device for push notifications
   */
  registerDevice: {
    method: 'POST';
    path: '/notifications/register-device';
    body: {
      token: string;
      platform: 'ios' | 'android';
    };
    response: { success: boolean };
  };
}

export interface BadgeAPI {
  /**
   * GET /badges
   * Get all available badges
   */
  listBadges: {
    method: 'GET';
    path: '/badges';
    query: { category?: string };
    response: BadgeDefinition[];
  };

  /**
   * GET /athletes/:athleteId/badges
   * Get badges earned by an athlete
   */
  getAthleteBadges: {
    method: 'GET';
    path: '/athletes/:athleteId/badges';
    params: { athleteId: string };
    response: BadgeAward[];
  };

  /**
   * POST /athletes/:athleteId/badges
   * Award a badge to an athlete (coach only)
   */
  awardBadge: {
    method: 'POST';
    path: '/athletes/:athleteId/badges';
    params: { athleteId: string };
    body: {
      badgeId: string;
      reason?: string;
      sessionId?: string;
    };
    response: BadgeAward;
  };

  /**
   * GET /athletes/:athleteId/progression
   * Get athlete's progression summary
   */
  getProgression: {
    method: 'GET';
    path: '/athletes/:athleteId/progression';
    params: { athleteId: string };
    response: {
      level: string;
      totalPoints: number;
      categoryProgress: {
        category: string;
        points: number;
        badgesEarned: number;
      }[];
    };
  };
}

export interface ReviewAPI {
  /**
   * GET /coaches/:coachId/reviews
   * Get reviews for a coach
   */
  getCoachReviews: {
    method: 'GET';
    path: '/coaches/:coachId/reviews';
    params: { coachId: string };
    query: { limit?: number; offset?: number };
    response: {
      reviews: CoachReview[];
      averageRating: number;
      totalReviews: number;
    };
  };

  /**
   * POST /bookings/:bookingId/review
   * Submit a review for a completed session
   */
  submitReview: {
    method: 'POST';
    path: '/bookings/:bookingId/review';
    params: { bookingId: string };
    body: {
      rating: number;
      comment?: string;
      wouldRecommend: boolean;
      skillImprovements?: string[];
    };
    response: CoachReview;
  };
}

export interface CancellationAPI {
  /**
   * GET /coaches/:coachId/cancellation-policy
   * Get coach's cancellation policy
   */
  getPolicy: {
    method: 'GET';
    path: '/coaches/:coachId/cancellation-policy';
    params: { coachId: string };
    response: CancellationPolicy;
  };

  /**
   * PUT /cancellation-policy
   * Update coach's cancellation policy (coach only)
   */
  updatePolicy: {
    method: 'PUT';
    path: '/cancellation-policy';
    body: Partial<CancellationPolicy>;
    response: CancellationPolicy;
  };

  /**
   * POST /bookings/:bookingId/calculate-refund
   * Calculate refund amount for potential cancellation
   */
  calculateRefund: {
    method: 'POST';
    path: '/bookings/:bookingId/calculate-refund';
    params: { bookingId: string };
    response: RefundCalculation;
  };
}

export interface SchedulingRulesAPI {
  /**
   * GET /coaches/:coachId/scheduling-rules
   * Get coach's scheduling rules
   */
  getRules: {
    method: 'GET';
    path: '/coaches/:coachId/scheduling-rules';
    params: { coachId: string };
    response: CoachSchedulingRules;
  };

  /**
   * PUT /scheduling-rules
   * Update scheduling rules (coach only)
   */
  updateRules: {
    method: 'PUT';
    path: '/scheduling-rules';
    body: Partial<CoachSchedulingRules>;
    response: CoachSchedulingRules;
  };

  /**
   * POST /validate-booking-time
   * Validate if a proposed time meets scheduling rules
   */
  validateTime: {
    method: 'POST';
    path: '/validate-booking-time';
    body: {
      coachId: string;
      proposedTime: string;
    };
    response: {
      isValid: boolean;
      errorMessage?: string;
      warningMessage?: string;
    };
  };
}

// ============================================================================
// COACH PROFILE ENDPOINTS (Priority: MEDIUM)
// ============================================================================

export interface CoachProfileAPI {
  /**
   * GET /coaches/:coachId
   * PUBLIC: Get coach profile
   */
  getProfile: {
    method: 'GET';
    path: '/coaches/:coachId';
    params: { coachId: string };
    response: CoachProfile;
  };

  /**
   * PUT /profile
   * Update own profile (coach only)
   */
  updateProfile: {
    method: 'PUT';
    path: '/profile';
    body: Partial<CoachProfile>;
    response: CoachProfile;
  };

  /**
   * GET /coaches
   * PUBLIC: Search/discover coaches
   */
  searchCoaches: {
    method: 'GET';
    path: '/coaches';
    query: {
      location?: string;
      specialty?: string;
      minRating?: number;
      priceMax?: number;
      available?: boolean;
      limit?: number;
      offset?: number;
    };
    response: {
      coaches: CoachProfile[];
      total: number;
    };
  };

  /**
   * POST /profile/photo
   * Upload profile photo
   */
  uploadPhoto: {
    method: 'POST';
    path: '/profile/photo';
    body: FormData; // multipart/form-data
    response: { photoUrl: string };
  };
}

// ============================================================================
// WEBSOCKET EVENTS
// ============================================================================

/**
 * Real-time events the client should listen for
 * These replace polling and provide instant updates
 */
export interface WebSocketEvents {
  // Booking events
  'booking:created': { booking: Booking };
  'booking:updated': { booking: Booking };
  'booking:cancelled': { bookingId: string; reason?: string };

  // Availability events
  'availability:updated': { coachId: string };
  'slot:booked': { coachId: string; date: string; time: string };

  // Session invite events
  'invite:received': { invite: SessionInvite };
  'invite:accepted': { inviteId: string; booking: Booking };
  'invite:declined': { inviteId: string };
  'invite:countered': { invite: SessionInvite };

  // Notification events
  'notification:new': { notification: Notification };

  // Chat/messaging events
  'message:received': {
    conversationId: string;
    message: { id: string; body: string; senderId: string; sentAt: string; readAt?: string };
  };

  // Family events
  'guardian:invited': { invite: GuardianInvite };
  'guardian:accepted': { guardian: FamilyGuardian };
}

// ============================================================================
// API CLIENT HELPER TYPES
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Error codes the client should handle
 */
export type APIErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'BOOKING_CONFLICT'
  | 'SLOT_UNAVAILABLE'
  | 'INSUFFICIENT_BALANCE'
  | 'POLICY_VIOLATION';

// ============================================================================
// SERVICE MIGRATION STATUS
// ============================================================================

/**
 * Current services and their API readiness status
 * Use this to track backend implementation progress
 */
export const SERVICE_MIGRATION_STATUS = {
  // HIGH PRIORITY - Core booking flow
  'availability-service': { status: 'READY', endpoints: 8 },
  'booking-service': { status: 'READY', endpoints: 6 },
  'invite-service': { status: 'READY', endpoints: 5 },
  'family-service': { status: 'READY', endpoints: 10 },
  'wallet-service': { status: 'READY', endpoints: 4 },
  'earnings-service': { status: 'READY', endpoints: 4 },

  // MEDIUM PRIORITY - Supporting features
  'notification-service': { status: 'READY', endpoints: 6 },
  'badge-service': { status: 'READY', endpoints: 4 },
  'review-service': { status: 'READY', endpoints: 2 },
  'scheduling-rules-service': { status: 'READY', endpoints: 6 }, // Includes cancellation policies

  // LOWER PRIORITY - Can use mock data longer
  'discover-service': { status: 'PARTIAL', endpoints: 2 },
  'analytics-service': { status: 'PARTIAL', endpoints: 3 },
  'social-feed-service': { status: 'PARTIAL', endpoints: 4 },
  'messaging-service': { status: 'PARTIAL', endpoints: 5 },
  'club-service': { status: 'PARTIAL', endpoints: 6 },
} as const;

// ============================================================================
// MESSAGING ENDPOINTS (Priority: MEDIUM)
// ============================================================================

export interface MessagingAPI {
  /**
   * GET /messages/threads
   * Get all message threads for current user
   */
  listThreads: {
    method: 'GET';
    path: '/messages/threads';
    query: { limit?: number; offset?: number };
    response: {
      threads: {
        id: string;
        participants: { id: string; name: string; avatar?: string }[];
        lastMessage: { body: string; sentAt: string; senderId: string };
        unreadCount: number;
      }[];
      total: number;
    };
  };

  /**
   * GET /messages/threads/:threadId
   * Get messages in a thread
   */
  getThread: {
    method: 'GET';
    path: '/messages/threads/:threadId';
    params: { threadId: string };
    query: { limit?: number; before?: string };
    response: {
      messages: {
        id: string;
        body: string;
        senderId: string;
        sentAt: string;
        readAt?: string;
      }[];
      hasMore: boolean;
    };
  };

  /**
   * POST /messages/threads/:threadId/messages
   * Send a message in a thread
   */
  sendMessage: {
    method: 'POST';
    path: '/messages/threads/:threadId/messages';
    params: { threadId: string };
    body: { body: string; attachments?: string[] };
    response: {
      id: string;
      body: string;
      senderId: string;
      sentAt: string;
    };
  };

  /**
   * POST /messages/threads
   * Create a new thread
   */
  createThread: {
    method: 'POST';
    path: '/messages/threads';
    body: { participantIds: string[]; initialMessage?: string };
    response: { threadId: string };
  };

  /**
   * PUT /messages/threads/:threadId/read
   * Mark all messages in thread as read
   */
  markThreadRead: {
    method: 'PUT';
    path: '/messages/threads/:threadId/read';
    params: { threadId: string };
    response: { success: boolean };
  };
}

// ============================================================================
// CLUB ENDPOINTS (Priority: MEDIUM)
// ============================================================================

export interface ClubAPI {
  /**
   * GET /clubs
   * Get clubs for current user
   */
  listClubs: {
    method: 'GET';
    path: '/clubs';
    query: { role?: 'member' | 'admin'; limit?: number };
    response: {
      clubs: {
        id: string;
        name: string;
        description: string;
        memberCount: number;
        avatar?: string;
      }[];
      total: number;
    };
  };

  /**
   * GET /clubs/:clubId
   * Get club details
   */
  getClub: {
    method: 'GET';
    path: '/clubs/:clubId';
    params: { clubId: string };
    response: {
      id: string;
      name: string;
      description: string;
      members: { id: string; name: string; role: string }[];
      settings: Record<string, unknown>;
    };
  };

  /**
   * GET /clubs/:clubId/feed
   * Get club feed posts
   */
  getClubFeed: {
    method: 'GET';
    path: '/clubs/:clubId/feed';
    params: { clubId: string };
    query: { limit?: number; before?: string };
    response: {
      posts: {
        id: string;
        authorId: string;
        authorName: string;
        body: string;
        createdAt: string;
        likes: number;
        comments: number;
      }[];
      hasMore: boolean;
    };
  };

  /**
   * POST /clubs/:clubId/feed
   * Create a post in club feed
   */
  createPost: {
    method: 'POST';
    path: '/clubs/:clubId/feed';
    params: { clubId: string };
    body: { body: string; attachments?: string[] };
    response: { id: string; createdAt: string };
  };

  /**
   * POST /clubs/:clubId/members
   * Add member to club
   */
  addMember: {
    method: 'POST';
    path: '/clubs/:clubId/members';
    params: { clubId: string };
    body: { userId: string; role: string };
    response: { success: boolean };
  };

  /**
   * DELETE /clubs/:clubId/members/:userId
   * Remove member from club
   */
  removeMember: {
    method: 'DELETE';
    path: '/clubs/:clubId/members/:userId';
    params: { clubId: string; userId: string };
    response: { success: boolean };
  };
}

// ============================================================================
// ANALYTICS ENDPOINTS (Priority: LOW)
// ============================================================================

export interface AnalyticsAPI {
  /**
   * GET /analytics/coach/dashboard
   * Get coach dashboard analytics
   */
  coachDashboard: {
    method: 'GET';
    path: '/analytics/coach/dashboard';
    query: { period?: 'week' | 'month' | 'quarter' | 'year' };
    response: {
      totalSessions: number;
      totalRevenue: number;
      averageRating: number;
      retentionRate: number;
      upcomingSessions: number;
      trends: { date: string; sessions: number; revenue: number }[];
    };
  };

  /**
   * GET /analytics/athlete/:athleteId
   * Get athlete progress analytics
   */
  athleteProgress: {
    method: 'GET';
    path: '/analytics/athlete/:athleteId';
    params: { athleteId: string };
    query: { period?: 'month' | 'quarter' | 'year' };
    response: {
      totalSessions: number;
      badgesEarned: number;
      skillProgress: { skill: string; level: number; change: number }[];
      attendance: number;
    };
  };

  /**
   * POST /analytics/events
   * Track analytics event
   */
  trackEvent: {
    method: 'POST';
    path: '/analytics/events';
    body: {
      event: string;
      properties?: Record<string, string | number | boolean>;
      timestamp?: string;
    };
    response: { success: boolean };
  };
}
