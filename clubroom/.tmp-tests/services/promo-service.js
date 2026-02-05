"use strict";
/**
 * Promo Code Service
 *
 * Handles promotional code creation, validation, and redemption.
 * Integrates with wallet service to add credits when codes are redeemed.
 *
 * API Integration Notes:
 * - POST /api/promo-codes - Create a promo code (admin)
 * - GET /api/promo-codes - List all promo codes (admin)
 * - GET /api/promo-codes/:id - Get promo code details
 * - PUT /api/promo-codes/:id - Update a promo code
 * - DELETE /api/promo-codes/:id - Deactivate a promo code
 * - POST /api/promo-codes/validate - Validate a code
 * - POST /api/promo-codes/redeem - Redeem a code for a user
 * - GET /api/promo-codes/:id/usage - Get usage history for a code
 * - GET /api/promo-codes/stats - Get overall promo code statistics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.promoService = void 0;
const storage_service_1 = require("./storage-service");
const wallet_service_1 = require("./wallet-service");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('PromoService');
// Storage keys
const STORAGE_KEY_CODES = 'clubroom.promo_codes';
const STORAGE_KEY_USAGE = 'clubroom.promo_usage';
// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_PROMO_CODES = [
    {
        id: 'promo_welcome25',
        code: 'WELCOME25',
        creditAmount: 25.0,
        maxUses: 500,
        currentUses: 156,
        expiresAt: '2026-12-31T23:59:59.000Z',
        isActive: true,
        createdBy: 'admin1',
        createdByName: 'System Admin',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        description: 'Welcome bonus for new users',
        onePerUser: true,
    },
    {
        id: 'promo_summer50',
        code: 'SUMMER50',
        creditAmount: 50.0,
        maxUses: 100,
        currentUses: 45,
        expiresAt: '2026-08-31T23:59:59.000Z',
        isActive: true,
        createdBy: 'admin1',
        createdByName: 'System Admin',
        createdAt: '2024-06-01T00:00:00.000Z',
        updatedAt: '2024-06-01T00:00:00.000Z',
        description: 'Summer promotion - limited time',
        onePerUser: true,
    },
    {
        id: 'promo_vip10',
        code: 'VIP10',
        creditAmount: 10.0,
        maxUses: 1000,
        currentUses: 312,
        isActive: true,
        createdBy: 'admin1',
        createdByName: 'System Admin',
        createdAt: '2024-03-15T00:00:00.000Z',
        updatedAt: '2024-03-15T00:00:00.000Z',
        description: 'VIP member referral bonus',
        onePerUser: false,
    },
    {
        id: 'promo_spring20',
        code: 'SPRING20',
        creditAmount: 20.0,
        maxUses: 200,
        currentUses: 200,
        expiresAt: '2024-05-31T23:59:59.000Z',
        isActive: false,
        createdBy: 'admin1',
        createdByName: 'System Admin',
        createdAt: '2024-03-01T00:00:00.000Z',
        updatedAt: '2024-06-01T00:00:00.000Z',
        description: 'Spring promotion - exhausted',
        onePerUser: true,
    },
    {
        id: 'promo_coach15',
        code: 'COACH15',
        creditAmount: 15.0,
        maxUses: 50,
        currentUses: 12,
        expiresAt: '2026-06-30T23:59:59.000Z',
        isActive: true,
        createdBy: 'admin1',
        createdByName: 'System Admin',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        description: 'Coach referral program',
        onePerUser: true,
    },
];
const MOCK_PROMO_USAGE = [
    {
        id: 'usage_1',
        codeId: 'promo_welcome25',
        code: 'WELCOME25',
        userId: 'parent1',
        userName: 'John Henderson',
        creditAmount: 25.0,
        usedAt: '2024-06-15T10:10:00.000Z',
        transactionId: 'txn_p1_8',
    },
    {
        id: 'usage_2',
        codeId: 'promo_summer50',
        code: 'SUMMER50',
        userId: 'parent2',
        userName: 'Lisa Wilson',
        creditAmount: 50.0,
        usedAt: '2024-07-01T14:30:00.000Z',
        transactionId: 'txn_p2_promo1',
    },
    {
        id: 'usage_3',
        codeId: 'promo_vip10',
        code: 'VIP10',
        userId: 'parent1',
        userName: 'John Henderson',
        creditAmount: 10.0,
        usedAt: '2024-09-10T09:00:00.000Z',
        transactionId: 'txn_p1_promo2',
    },
];
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Generate a unique ID for a promo code
 */
function generatePromoCodeId() {
    return `promo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
/**
 * Generate a unique ID for a usage record
 */
function generateUsageId() {
    return `usage_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
/**
 * Normalize a code string (uppercase, trimmed)
 */
function normalizeCode(code) {
    return code.toUpperCase().trim().replace(/\s+/g, '');
}
/**
 * Check if a promo code has expired
 */
function isCodeExpired(code) {
    if (!code.expiresAt)
        return false;
    return new Date(code.expiresAt) < new Date();
}
/**
 * Check if a promo code has reached its usage limit
 */
function isCodeExhausted(code) {
    return code.currentUses >= code.maxUses;
}
/**
 * Get the effective status of a promo code
 */
function getCodeStatus(code) {
    if (!code.isActive)
        return 'inactive';
    if (isCodeExpired(code))
        return 'expired';
    if (isCodeExhausted(code))
        return 'exhausted';
    return 'active';
}
// ============================================================================
// STORAGE OPERATIONS
// ============================================================================
async function getAllCodes() {
    const codes = await storage_service_1.storageService.getItem(STORAGE_KEY_CODES, []);
    if (codes.length === 0) {
        return [...MOCK_PROMO_CODES];
    }
    return codes;
}
async function saveCodes(codes) {
    await storage_service_1.storageService.setItem(STORAGE_KEY_CODES, codes);
}
async function getAllUsage() {
    const usage = await storage_service_1.storageService.getItem(STORAGE_KEY_USAGE, []);
    if (usage.length === 0) {
        return [...MOCK_PROMO_USAGE];
    }
    return usage;
}
async function saveUsage(usage) {
    await storage_service_1.storageService.setItem(STORAGE_KEY_USAGE, usage);
}
// ============================================================================
// PROMO CODE OPERATIONS
// ============================================================================
/**
 * Create a new promo code
 * @param params - Parameters for the new code
 * @returns The created promo code
 */
async function createPromoCode(params) {
    const codes = await getAllCodes();
    const normalizedCode = normalizeCode(params.code);
    // Check if code already exists
    const existingCode = codes.find((c) => c.code === normalizedCode);
    if (existingCode) {
        return (0, result_1.err)((0, result_1.conflictError)(`Promo code "${normalizedCode}" already exists`));
    }
    // Validate credit amount
    if (params.creditAmount <= 0) {
        return (0, result_1.err)((0, result_1.validationError)('Credit amount must be greater than zero'));
    }
    // Validate max uses
    if (params.maxUses <= 0) {
        return (0, result_1.err)((0, result_1.validationError)('Max uses must be greater than zero'));
    }
    const now = new Date().toISOString();
    const newCode = {
        id: generatePromoCodeId(),
        code: normalizedCode,
        creditAmount: params.creditAmount,
        maxUses: params.maxUses,
        currentUses: 0,
        expiresAt: params.expiresAt,
        isActive: true,
        createdBy: params.createdBy,
        createdByName: params.createdByName,
        createdAt: now,
        updatedAt: now,
        description: params.description,
        onePerUser: params.onePerUser ?? true,
    };
    codes.push(newCode);
    await saveCodes(codes);
    logger.info('promo_code_created', {
        id: newCode.id,
        code: newCode.code,
        creditAmount: newCode.creditAmount,
        maxUses: newCode.maxUses,
    });
    return (0, result_1.ok)(newCode);
}
/**
 * Get all promo codes (admin use)
 * @returns Array of all promo codes
 */
async function getAllPromoCodes() {
    const codes = await getAllCodes();
    return codes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
/**
 * Get a promo code by ID
 * @param codeId - The promo code ID
 * @returns The promo code or null if not found
 */
async function getPromoCodeById(codeId) {
    const codes = await getAllCodes();
    return codes.find((c) => c.id === codeId) ?? null;
}
/**
 * Get a promo code by its code string
 * @param code - The code string
 * @returns The promo code or null if not found
 */
async function getPromoCodeByString(code) {
    const codes = await getAllCodes();
    const normalizedCode = normalizeCode(code);
    return codes.find((c) => c.code === normalizedCode) ?? null;
}
/**
 * Validate a promo code for a specific user
 * @param code - The code string to validate
 * @param userId - The user attempting to use the code
 * @returns Validation result with error message if invalid
 */
async function validateCode(code, userId) {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode) {
        return { valid: false, error: 'Please enter a promo code' };
    }
    const promoCode = await getPromoCodeByString(normalizedCode);
    if (!promoCode) {
        return { valid: false, error: 'Invalid promo code' };
    }
    if (!promoCode.isActive) {
        return { valid: false, error: 'This promo code is no longer active' };
    }
    if (isCodeExpired(promoCode)) {
        return { valid: false, error: 'This promo code has expired' };
    }
    if (isCodeExhausted(promoCode)) {
        return { valid: false, error: 'This promo code has reached its usage limit' };
    }
    // Check if user has already used this code (if onePerUser is true)
    if (promoCode.onePerUser) {
        const usage = await getAllUsage();
        const userUsage = usage.find((u) => u.codeId === promoCode.id && u.userId === userId);
        if (userUsage) {
            return { valid: false, error: 'You have already used this promo code' };
        }
    }
    return { valid: true, promoCode };
}
/**
 * Redeem a promo code for a user
 * @param userId - The user ID
 * @param code - The promo code string
 * @param userName - Optional user name for record keeping
 * @returns Redemption result with new balance if successful
 */
async function redeemCode(userId, code, userName) {
    // Validate the code first
    const validation = await validateCode(code, userId);
    if (!validation.valid || !validation.promoCode) {
        logger.warn('redeem_code_failed', { userId, code, error: validation.error });
        return { success: false, error: validation.error };
    }
    const promoCode = validation.promoCode;
    try {
        // Apply credit to wallet
        const walletResult = await wallet_service_1.walletService.applyPromoCredit(userId, promoCode.creditAmount, promoCode.code);
        if (!walletResult.success) {
            logger.error('redeem_code_wallet_failed', { userId, code, error: walletResult.error });
            return { success: false, error: walletResult.error ?? 'Failed to apply credit' };
        }
        // Create usage record
        const now = new Date().toISOString();
        const usageRecord = {
            id: generateUsageId(),
            codeId: promoCode.id,
            code: promoCode.code,
            userId,
            userName,
            creditAmount: promoCode.creditAmount,
            usedAt: now,
            transactionId: walletResult.transaction?.id,
        };
        const usage = await getAllUsage();
        usage.push(usageRecord);
        await saveUsage(usage);
        // Update promo code usage count
        const codes = await getAllCodes();
        const codeIndex = codes.findIndex((c) => c.id === promoCode.id);
        if (codeIndex !== -1) {
            codes[codeIndex].currentUses++;
            codes[codeIndex].updatedAt = now;
            await saveCodes(codes);
        }
        logger.info('promo_code_redeemed', {
            userId,
            code: promoCode.code,
            creditAmount: promoCode.creditAmount,
            usageId: usageRecord.id,
            newBalance: walletResult.newBalance,
        });
        return {
            success: true,
            usage: usageRecord,
            newBalance: walletResult.newBalance,
        };
    }
    catch (error) {
        logger.error('redeem_code_error', { userId, code, error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to redeem promo code',
        };
    }
}
/**
 * Get usage history for a specific promo code
 * @param codeId - The promo code ID
 * @returns Array of usage records
 */
async function getCodeUsage(codeId) {
    const usage = await getAllUsage();
    return usage
        .filter((u) => u.codeId === codeId)
        .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime());
}
/**
 * Get all usage records for a user
 * @param userId - The user ID
 * @returns Array of usage records
 */
async function getUserUsage(userId) {
    const usage = await getAllUsage();
    return usage
        .filter((u) => u.userId === userId)
        .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime());
}
/**
 * Deactivate a promo code
 * @param codeId - The promo code ID
 * @returns The updated promo code or null if not found
 */
async function deactivateCode(codeId) {
    const codes = await getAllCodes();
    const codeIndex = codes.findIndex((c) => c.id === codeId);
    if (codeIndex === -1) {
        logger.warn('deactivate_code_not_found', { codeId });
        return null;
    }
    codes[codeIndex].isActive = false;
    codes[codeIndex].updatedAt = new Date().toISOString();
    await saveCodes(codes);
    logger.info('promo_code_deactivated', { codeId, code: codes[codeIndex].code });
    return codes[codeIndex];
}
/**
 * Reactivate a promo code
 * @param codeId - The promo code ID
 * @returns The updated promo code or null if not found
 */
async function reactivateCode(codeId) {
    const codes = await getAllCodes();
    const codeIndex = codes.findIndex((c) => c.id === codeId);
    if (codeIndex === -1) {
        logger.warn('reactivate_code_not_found', { codeId });
        return null;
    }
    codes[codeIndex].isActive = true;
    codes[codeIndex].updatedAt = new Date().toISOString();
    await saveCodes(codes);
    logger.info('promo_code_reactivated', { codeId, code: codes[codeIndex].code });
    return codes[codeIndex];
}
/**
 * Update a promo code
 * @param codeId - The promo code ID
 * @param updates - Partial updates to apply
 * @returns The updated promo code or null if not found
 */
async function updatePromoCode(codeId, updates) {
    const codes = await getAllCodes();
    const codeIndex = codes.findIndex((c) => c.id === codeId);
    if (codeIndex === -1) {
        logger.warn('update_code_not_found', { codeId });
        return null;
    }
    codes[codeIndex] = {
        ...codes[codeIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    await saveCodes(codes);
    logger.info('promo_code_updated', { codeId, updates });
    return codes[codeIndex];
}
/**
 * Delete a promo code (hard delete - use with caution)
 * @param codeId - The promo code ID
 * @returns Whether the deletion was successful
 */
async function deletePromoCode(codeId) {
    const codes = await getAllCodes();
    const codeIndex = codes.findIndex((c) => c.id === codeId);
    if (codeIndex === -1) {
        logger.warn('delete_code_not_found', { codeId });
        return false;
    }
    const deletedCode = codes[codeIndex];
    codes.splice(codeIndex, 1);
    await saveCodes(codes);
    logger.info('promo_code_deleted', { codeId, code: deletedCode.code });
    return true;
}
// ============================================================================
// STATISTICS
// ============================================================================
/**
 * Get overall statistics for promo codes
 * @returns Promo code statistics
 */
async function getCodeStats() {
    const [codes, usage] = await Promise.all([getAllCodes(), getAllUsage()]);
    const activeCodes = codes.filter((c) => c.isActive && !isCodeExpired(c) && !isCodeExhausted(c)).length;
    const expiredCodes = codes.filter((c) => isCodeExpired(c)).length;
    const exhaustedCodes = codes.filter((c) => isCodeExhausted(c) && !isCodeExpired(c)).length;
    const totalCreditsAwarded = usage.reduce((sum, u) => sum + u.creditAmount, 0);
    return {
        totalCodes: codes.length,
        activeCodes,
        expiredCodes,
        exhaustedCodes,
        totalCreditsAwarded,
        totalRedemptions: usage.length,
    };
}
/**
 * Get detailed statistics for a specific promo code
 * @param codeId - The promo code ID
 * @returns Code-specific statistics or null if not found
 */
async function getCodeDetailedStats(codeId) {
    const code = await getPromoCodeById(codeId);
    if (!code)
        return null;
    const usage = await getCodeUsage(codeId);
    const totalCreditsAwarded = usage.reduce((sum, u) => sum + u.creditAmount, 0);
    return {
        code,
        status: getCodeStatus(code),
        usageCount: code.currentUses,
        remainingUses: code.maxUses - code.currentUses,
        totalCreditsAwarded,
        recentUsage: usage.slice(0, 10),
    };
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Format a credit amount as currency string
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
function formatCredit(amount) {
    return `\u00A3${amount.toFixed(2)}`;
}
/**
 * Format a date for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
/**
 * Get display info for a promo code status
 * @param status - The status to get info for
 * @returns Display info with label and color
 */
function getStatusInfo(status) {
    switch (status) {
        case 'active':
            return { label: 'Active', color: '#10B981' };
        case 'expired':
            return { label: 'Expired', color: '#6B7280' };
        case 'exhausted':
            return { label: 'Exhausted', color: '#F59E0B' };
        case 'inactive':
            return { label: 'Inactive', color: '#EF4444' };
        default:
            return { label: 'Unknown', color: '#6B7280' };
    }
}
/**
 * Check if a code string is valid format (alphanumeric only)
 * @param code - The code to validate
 * @returns Whether the code is valid format
 */
function isValidCodeFormat(code) {
    const normalized = normalizeCode(code);
    return /^[A-Z0-9]{3,20}$/.test(normalized);
}
// ============================================================================
// DEVELOPMENT UTILITIES
// ============================================================================
/**
 * Reset promo code data to mock data (for development/testing)
 */
async function resetToMockData() {
    await saveCodes([...MOCK_PROMO_CODES]);
    await saveUsage([...MOCK_PROMO_USAGE]);
    logger.info('promo_data_reset_to_mock');
}
/**
 * Clear all promo code data (for testing)
 */
async function clearAllData() {
    await storage_service_1.storageService.setItem(STORAGE_KEY_CODES, []);
    await storage_service_1.storageService.setItem(STORAGE_KEY_USAGE, []);
    logger.info('promo_data_cleared');
}
// ============================================================================
// EXPORT SERVICE
// ============================================================================
exports.promoService = {
    // Code CRUD operations
    createPromoCode,
    getAllPromoCodes,
    getPromoCodeById,
    getPromoCodeByString,
    updatePromoCode,
    deactivateCode,
    reactivateCode,
    deletePromoCode,
    // Validation and redemption
    validateCode,
    redeemCode,
    // Usage tracking
    getCodeUsage,
    getUserUsage,
    // Statistics
    getCodeStats,
    getCodeDetailedStats,
    // Utility functions
    formatCredit,
    formatDate,
    getStatusInfo,
    isValidCodeFormat,
    getCodeStatus,
    // Development utilities
    resetToMockData,
    clearAllData,
};
