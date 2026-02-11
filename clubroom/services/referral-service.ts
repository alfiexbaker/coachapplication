/**
 * Referral Service
 *
 * Handles referral code generation, tracking referrals, and awarding credits.
 * Integrates with wallet service to add credits when referrals are completed.
 *
 * API Integration Notes:
 * - POST /api/referrals/code - Generate a referral code
 * - GET /api/referrals/code/:userId - Get user's referral code
 * - POST /api/referrals/apply - Apply a referral code (new user)
 * - POST /api/referrals/:id/complete - Complete a referral (after first booking)
 * - GET /api/referrals/stats/:userId - Get referral statistics
 * - GET /api/referrals/history/:userId - Get referral history
 */

import { apiClient } from './api-client';
import { walletService } from './wallet-service';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, validationError } from '@/types/result';
import type { ReferralCode, Referral, ReferralStats, ReferralStatus } from '@/constants/types';

const logger = createLogger('ReferralService');

// Storage keys
const STORAGE_KEY_CODES = 'clubroom.referral_codes';
const STORAGE_KEY_REFERRALS = 'clubroom.referrals';

// Configuration
const DEFAULT_CREDIT_AMOUNT = 10.0; // GBP credited per successful referral
const DEFAULT_USES_REMAINING = -1; // -1 means unlimited
const CODE_LENGTH = 6;
const REFERRAL_EXPIRY_DAYS = 30; // Pending referrals expire after 30 days

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_CODES: ReferralCode[] = [
  {
    id: 'refcode_parent1',
    userId: 'parent1',
    code: 'JOHN-ABC123',
    creditAmount: DEFAULT_CREDIT_AMOUNT,
    usesRemaining: -1,
    isActive: true,
    createdAt: '2024-06-15T10:00:00.000Z',
    updatedAt: '2024-06-15T10:00:00.000Z',
  },
  {
    id: 'refcode_parent2',
    userId: 'parent2',
    code: 'LISA-XYZ789',
    creditAmount: DEFAULT_CREDIT_AMOUNT,
    usesRemaining: -1,
    isActive: true,
    createdAt: '2024-08-20T09:00:00.000Z',
    updatedAt: '2024-08-20T09:00:00.000Z',
  },
  {
    id: 'refcode_coach1',
    userId: 'coach1',
    code: 'SARAH-PRO456',
    creditAmount: 15.0, // Coaches get higher credit
    usesRemaining: -1,
    isActive: true,
    createdAt: '2024-05-10T12:00:00.000Z',
    updatedAt: '2024-05-10T12:00:00.000Z',
  },
];

const MOCK_REFERRALS: Referral[] = [
  {
    id: 'ref_1',
    referrerId: 'parent1',
    refereeId: 'user_new1',
    code: 'JOHN-ABC123',
    creditAwarded: 10.0,
    status: 'COMPLETED',
    createdAt: '2024-09-01T14:00:00.000Z',
    completedAt: '2024-09-05T10:30:00.000Z',
    triggerBookingId: 'booking_ref1',
  },
  {
    id: 'ref_2',
    referrerId: 'parent1',
    refereeId: 'user_new2',
    code: 'JOHN-ABC123',
    creditAwarded: 10.0,
    status: 'COMPLETED',
    createdAt: '2024-10-15T09:00:00.000Z',
    completedAt: '2024-10-20T16:45:00.000Z',
    triggerBookingId: 'booking_ref2',
  },
  {
    id: 'ref_3',
    referrerId: 'parent1',
    refereeId: 'user_new3',
    code: 'JOHN-ABC123',
    creditAwarded: 0,
    status: 'PENDING',
    createdAt: '2025-01-05T11:00:00.000Z',
  },
  {
    id: 'ref_4',
    referrerId: 'parent2',
    refereeId: 'user_new4',
    code: 'LISA-XYZ789',
    creditAwarded: 10.0,
    status: 'COMPLETED',
    createdAt: '2024-11-20T15:30:00.000Z',
    completedAt: '2024-11-25T09:00:00.000Z',
    triggerBookingId: 'booking_ref4',
  },
  {
    id: 'ref_5',
    referrerId: 'coach1',
    refereeId: 'user_new5',
    code: 'SARAH-PRO456',
    creditAwarded: 15.0,
    status: 'COMPLETED',
    createdAt: '2024-12-01T08:00:00.000Z',
    completedAt: '2024-12-10T14:20:00.000Z',
    triggerBookingId: 'booking_ref5',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a random alphanumeric string
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar characters like 0/O, 1/I
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique referral code based on user name
 */
function generateUniqueCode(userName: string): string {
  const prefix = userName.split(' ')[0].toUpperCase().slice(0, 5);
  const suffix = generateRandomString(CODE_LENGTH);
  return `${prefix}-${suffix}`;
}

/**
 * Check if a referral has expired
 */
function isReferralExpired(referral: Referral): boolean {
  if (referral.status !== 'PENDING') return false;

  const createdDate = new Date(referral.createdAt);
  const expiryDate = new Date(createdDate.getTime() + REFERRAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  return new Date() > expiryDate;
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

async function getAllCodes(): Promise<ReferralCode[]> {
  const codes = await apiClient.get<ReferralCode[]>(STORAGE_KEY_CODES, []);
  if (codes.length === 0) {
    return [...MOCK_CODES];
  }
  return codes;
}

async function saveCodes(codes: ReferralCode[]): Promise<void> {
  await apiClient.set(STORAGE_KEY_CODES, codes);
}

async function getAllReferrals(): Promise<Referral[]> {
  const referrals = await apiClient.get<Referral[]>(STORAGE_KEY_REFERRALS, []);
  if (referrals.length === 0) {
    return [...MOCK_REFERRALS];
  }
  return referrals;
}

async function saveReferrals(referrals: Referral[]): Promise<void> {
  await apiClient.set(STORAGE_KEY_REFERRALS, referrals);
}

// ============================================================================
// REFERRAL CODE OPERATIONS
// ============================================================================

/**
 * Generate a new referral code for a user
 * @param userId - The user ID to generate code for
 * @param userName - The user's display name (used in code prefix)
 * @param creditAmount - Optional custom credit amount
 * @returns The generated referral code
 */
async function generateCode(
  userId: string,
  userName: string = 'USER',
  creditAmount: number = DEFAULT_CREDIT_AMOUNT
): Promise<Result<ReferralCode, ServiceError>> {
  const codes = await getAllCodes();

  // Check if user already has an active code
  const existingCode = codes.find((c) => c.userId === userId && c.isActive);
  if (existingCode) {
    logger.info('existing_code_found', { userId, code: existingCode.code });
    return ok(existingCode);
  }

  // Generate unique code
  let code = generateUniqueCode(userName);
  let attempts = 0;
  const maxAttempts = 10;

  // Ensure code is unique
  while (codes.some((c) => c.code === code) && attempts < maxAttempts) {
    code = generateUniqueCode(userName);
    attempts++;
  }

  if (attempts >= maxAttempts) {
    return err(validationError('Failed to generate unique referral code'));
  }

  const now = new Date().toISOString();
  const newCode: ReferralCode = {
    id: `refcode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    code,
    creditAmount,
    usesRemaining: DEFAULT_USES_REMAINING,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  codes.push(newCode);
  await saveCodes(codes);

  logger.info('code_generated', { userId, code: newCode.code, creditAmount });
  return ok(newCode);
}

/**
 * Get the referral code for a user, creating one if it doesn't exist
 * @param userId - The user ID
 * @param userName - The user's display name (used if creating new code)
 * @returns The user's referral code
 */
async function getUserCode(userId: string, userName: string = 'USER'): Promise<Result<ReferralCode, ServiceError>> {
  const codes = await getAllCodes();
  const existingCode = codes.find((c) => c.userId === userId && c.isActive);

  if (existingCode) {
    return ok(existingCode);
  }

  // Create a new code for the user
  return generateCode(userId, userName);
}

/**
 * Get a referral code by its code string
 * @param code - The referral code string
 * @returns The referral code or null if not found
 */
async function getCodeByString(code: string): Promise<ReferralCode | null> {
  const codes = await getAllCodes();
  const normalizedCode = code.toUpperCase().trim();
  return codes.find((c) => c.code === normalizedCode && c.isActive) ?? null;
}

/**
 * Validate a referral code
 * @param code - The referral code to validate
 * @param newUserId - The user trying to apply the code
 * @returns Validation result with error message if invalid
 */
async function validateCode(
  code: string,
  newUserId: string
): Promise<{ valid: boolean; error?: string; referralCode?: ReferralCode }> {
  const referralCode = await getCodeByString(code);

  if (!referralCode) {
    return { valid: false, error: 'Invalid referral code' };
  }

  if (!referralCode.isActive) {
    return { valid: false, error: 'This referral code is no longer active' };
  }

  if (referralCode.usesRemaining === 0) {
    return { valid: false, error: 'This referral code has reached its usage limit' };
  }

  if (referralCode.expiresAt && new Date(referralCode.expiresAt) < new Date()) {
    return { valid: false, error: 'This referral code has expired' };
  }

  // Check if user is trying to use their own code
  if (referralCode.userId === newUserId) {
    return { valid: false, error: 'You cannot use your own referral code' };
  }

  // Check if user has already used a referral code
  const referrals = await getAllReferrals();
  const existingReferral = referrals.find((r) => r.refereeId === newUserId);
  if (existingReferral) {
    return { valid: false, error: 'You have already used a referral code' };
  }

  return { valid: true, referralCode };
}

// ============================================================================
// REFERRAL OPERATIONS
// ============================================================================

/**
 * Apply a referral code for a new user
 * Creates a pending referral that will be completed when the user makes their first booking
 * @param newUserId - The new user's ID
 * @param newUserName - The new user's display name
 * @param code - The referral code to apply
 * @returns The created referral or error
 */
async function applyReferralCode(
  newUserId: string,
  _newUserName: string,
  code: string
): Promise<{ success: boolean; referral?: Referral; error?: string }> {
  const validation = await validateCode(code, newUserId);

  if (!validation.valid || !validation.referralCode) {
    logger.warn('apply_code_failed', { newUserId, code, error: validation.error });
    return { success: false, error: validation.error };
  }

  const referralCode = validation.referralCode;
  const referrals = await getAllReferrals();
  const now = new Date().toISOString();

  const newReferral: Referral = {
    id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    referrerId: referralCode.userId,
    refereeId: newUserId,
    code: referralCode.code,
    creditAwarded: 0, // Will be set when completed
    status: 'PENDING',
    createdAt: now,
  };

  referrals.push(newReferral);
  await saveReferrals(referrals);

  // Update code usage if limited
  if (referralCode.usesRemaining > 0) {
    const codes = await getAllCodes();
    const codeIndex = codes.findIndex((c) => c.id === referralCode.id);
    if (codeIndex !== -1) {
      codes[codeIndex].usesRemaining--;
      codes[codeIndex].updatedAt = now;
      await saveCodes(codes);
    }
  }

  logger.info('referral_applied', {
    referralId: newReferral.id,
    referrerId: referralCode.userId,
    refereeId: newUserId,
    code: referralCode.code,
  });

  return { success: true, referral: newReferral };
}

/**
 * Complete a referral and award credits to the referrer
 * Called when the referred user completes their first booking
 * @param referralId - The referral ID to complete
 * @param bookingId - The booking that triggered completion
 * @returns The completed referral or error
 */
async function completeReferral(
  referralId: string,
  bookingId: string
): Promise<{ success: boolean; referral?: Referral; error?: string }> {
  const referrals = await getAllReferrals();
  const referralIndex = referrals.findIndex((r) => r.id === referralId);

  if (referralIndex === -1) {
    logger.warn('complete_referral_not_found', { referralId });
    return { success: false, error: 'Referral not found' };
  }

  const referral = referrals[referralIndex];

  if (referral.status !== 'PENDING') {
    logger.warn('complete_referral_invalid_status', { referralId, status: referral.status });
    return { success: false, error: `Referral is already ${referral.status.toLowerCase()}` };
  }

  if (isReferralExpired(referral)) {
    referrals[referralIndex].status = 'EXPIRED';
    await saveReferrals(referrals);
    logger.warn('complete_referral_expired', { referralId });
    return { success: false, error: 'Referral has expired' };
  }

  // Get the referral code to determine credit amount
  const codes = await getAllCodes();
  const referralCode = codes.find((c) => c.code === referral.code);
  const creditAmount = referralCode?.creditAmount ?? DEFAULT_CREDIT_AMOUNT;

  // Award credits to the referrer via wallet service
  try {
    await walletService.applyPromoCredit(
      referral.referrerId,
      creditAmount,
      `REFERRAL-${referral.code}`
    );

    logger.info('referral_credit_awarded', {
      referralId,
      referrerId: referral.referrerId,
      amount: creditAmount,
    });
  } catch (error) {
    logger.error('referral_credit_failed', { referralId, error });
    return { success: false, error: 'Failed to award referral credit' };
  }

  // Update referral status
  const now = new Date().toISOString();
  referrals[referralIndex] = {
    ...referral,
    creditAwarded: creditAmount,
    status: 'COMPLETED',
    completedAt: now,
    triggerBookingId: bookingId,
  };

  await saveReferrals(referrals);

  logger.info('referral_completed', {
    referralId,
    referrerId: referral.referrerId,
    refereeId: referral.refereeId,
    creditAwarded: creditAmount,
    bookingId,
  });

  return { success: true, referral: referrals[referralIndex] };
}

/**
 * Complete a referral by referee ID (for when we don't have the referral ID)
 * @param refereeId - The referee's user ID
 * @param bookingId - The booking that triggered completion
 * @returns The completed referral or null if no pending referral exists
 */
async function completeReferralByReferee(
  refereeId: string,
  bookingId: string
): Promise<{ success: boolean; referral?: Referral; error?: string }> {
  const referrals = await getAllReferrals();
  const pendingReferral = referrals.find(
    (r) => r.refereeId === refereeId && r.status === 'PENDING'
  );

  if (!pendingReferral) {
    // Not an error - user might not have been referred
    return { success: true };
  }

  return completeReferral(pendingReferral.id, bookingId);
}

// ============================================================================
// STATISTICS & HISTORY
// ============================================================================

/**
 * Get referral statistics for a user
 * @param userId - The user ID
 * @returns Referral statistics
 */
async function getReferralStats(userId: string): Promise<Result<ReferralStats, ServiceError>> {
  const [referrals, codeResult] = await Promise.all([
    getAllReferrals(),
    getUserCode(userId),
  ]);

  if (!codeResult.success) return codeResult;
  const code = codeResult.data;

  const userReferrals = referrals.filter((r) => r.referrerId === userId);
  const completedReferrals = userReferrals.filter((r) => r.status === 'COMPLETED');
  const pendingReferrals = userReferrals.filter((r) => r.status === 'PENDING' && !isReferralExpired(r));

  const totalEarned = completedReferrals.reduce((sum, r) => sum + r.creditAwarded, 0);

  return ok({
    userId,
    totalEarned,
    referredCount: completedReferrals.length,
    pendingCount: pendingReferrals.length,
    currentCode: code.code,
    creditPerReferral: code.creditAmount,
  });
}

/**
 * Get referral history for a user
 * @param userId - The user ID
 * @param limit - Maximum number of referrals to return
 * @returns Array of referrals
 */
async function getReferralHistory(userId: string, limit?: number): Promise<Referral[]> {
  const referrals = await getAllReferrals();

  let userReferrals = referrals
    .filter((r) => r.referrerId === userId)
    .map((r) => {
      // Update expired status
      if (r.status === 'PENDING' && isReferralExpired(r)) {
        return { ...r, status: 'EXPIRED' as ReferralStatus };
      }
      return r;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (limit && limit > 0) {
    userReferrals = userReferrals.slice(0, limit);
  }

  return userReferrals;
}

/**
 * Get a referral by ID
 * @param referralId - The referral ID
 * @returns The referral or null if not found
 */
async function getReferralById(referralId: string): Promise<Referral | null> {
  const referrals = await getAllReferrals();
  return referrals.find((r) => r.id === referralId) ?? null;
}

/**
 * Check if a user was referred (has a pending or completed referral as referee)
 * @param userId - The user ID to check
 * @returns Whether the user was referred
 */
async function wasUserReferred(userId: string): Promise<boolean> {
  const referrals = await getAllReferrals();
  return referrals.some((r) => r.refereeId === userId);
}

/**
 * Get the pending referral for a user (if they were referred)
 * @param userId - The referee's user ID
 * @returns The pending referral or null
 */
async function getPendingReferralForUser(userId: string): Promise<Referral | null> {
  const referrals = await getAllReferrals();
  return referrals.find(
    (r) => r.refereeId === userId && r.status === 'PENDING' && !isReferralExpired(r)
  ) ?? null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the share URL for a referral code
 * @param code - The referral code
 * @returns The shareable URL
 */
function getShareUrl(code: string): string {
  // In a real app, this would be your app's deep link URL
  return `https://clubroom.app/join?ref=${encodeURIComponent(code)}`;
}

/**
 * Get the share message for a referral code
 * @param code - The referral code
 * @param userName - The user's name (referrer)
 * @param creditAmount - The credit amount for the referral
 * @returns The share message
 */
function getShareMessage(code: string, userName: string, creditAmount: number): string {
  return `Join me on Clubroom! Use my referral code ${code} when you sign up to get started. Download the app: ${getShareUrl(code)}`;
}

/**
 * Format credit amount as currency string
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
function formatCredit(amount: number): string {
  return `\u00A3${amount.toFixed(2)}`;
}

/**
 * Get display info for referral status
 * @param status - The referral status
 * @returns Display info with label and color
 */
function getStatusInfo(status: ReferralStatus): { label: string; color: string } {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Completed', color: '#10B981' };
    case 'PENDING':
      return { label: 'Pending', color: '#F59E0B' };
    case 'EXPIRED':
      return { label: 'Expired', color: '#6B7280' };
    default:
      return { label: status, color: '#6B7280' };
  }
}

/**
 * Format a date for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================================
// DEVELOPMENT UTILITIES
// ============================================================================

/**
 * Reset referral data to mock data (for development/testing)
 */
async function resetToMockData(): Promise<void> {
  await saveCodes([...MOCK_CODES]);
  await saveReferrals([...MOCK_REFERRALS]);
  logger.info('referral_data_reset_to_mock');
}

/**
 * Clear all referral data (for testing)
 */
async function clearAllData(): Promise<void> {
  await apiClient.set(STORAGE_KEY_CODES, []);
  await apiClient.set(STORAGE_KEY_REFERRALS, []);
  logger.info('referral_data_cleared');
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const referralService = {
  // Code operations
  generateCode,
  getUserCode,
  getCodeByString,
  validateCode,

  // Referral operations
  applyReferralCode,
  completeReferral,
  completeReferralByReferee,

  // Statistics & history
  getReferralStats,
  getReferralHistory,
  getReferralById,
  wasUserReferred,
  getPendingReferralForUser,

  // Utility functions
  getShareUrl,
  getShareMessage,
  formatCredit,
  getStatusInfo,
  formatDate,

  // Development utilities
  resetToMockData,
  clearAllData,
};
