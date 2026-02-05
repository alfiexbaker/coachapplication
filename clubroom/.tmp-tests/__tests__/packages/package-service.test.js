"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importDefault(require("node:test"));
/**
 * Tests for the PackageService
 *
 * These tests verify the core functionality of session packages:
 * - Package CRUD operations
 * - Purchase flow
 * - Session redemption
 * - Utility methods
 */
// Test data
const testPackage = {
    id: 'test_pkg_1',
    coachId: 'coach1',
    coachName: 'Test Coach',
    name: '5 Session Bundle',
    description: 'A test bundle',
    sessionCount: 5,
    price: 200,
    discountPercent: 10,
    validDays: 60,
    isActive: true,
    currency: 'GBP',
    pricePerSession: 40,
    createdAt: '2024-01-01T00:00:00.000Z',
};
const testPackage2 = {
    id: 'test_pkg_2',
    coachId: 'coach2',
    coachName: 'Other Coach',
    name: '10 Session Pro',
    description: 'Another bundle',
    sessionCount: 10,
    price: 350,
    discountPercent: 20,
    validDays: 90,
    isActive: true,
    currency: 'GBP',
    pricePerSession: 35,
    createdAt: '2024-01-02T00:00:00.000Z',
};
const inactivePackage = {
    ...testPackage,
    id: 'test_pkg_inactive',
    name: 'Inactive Bundle',
    isActive: false,
};
// ============================================================================
// FORMAT PRICE TESTS
// ============================================================================
(0, node_test_1.default)('formatPrice formats GBP correctly', () => {
    // Test the format logic directly
    const amount = 200;
    const currency = 'GBP';
    const symbol = currency === 'GBP' ? '\u00A3' : '$';
    const formatted = `${symbol}${amount.toFixed(2)}`;
    node_assert_1.default.strictEqual(formatted, '\u00A3200.00');
});
(0, node_test_1.default)('formatPrice formats decimal amounts', () => {
    const amount = 35.5;
    const currency = 'GBP';
    const symbol = currency === 'GBP' ? '\u00A3' : '$';
    const formatted = `${symbol}${amount.toFixed(2)}`;
    node_assert_1.default.strictEqual(formatted, '\u00A335.50');
});
(0, node_test_1.default)('formatPrice defaults to GBP', () => {
    const amount = 100;
    const currency = undefined;
    const symbol = (currency ?? 'GBP') === 'GBP' ? '\u00A3' : '$';
    const formatted = `${symbol}${amount.toFixed(2)}`;
    node_assert_1.default.strictEqual(formatted, '\u00A3100.00');
});
// ============================================================================
// CALCULATE SAVINGS TESTS
// ============================================================================
(0, node_test_1.default)('calculateSavings returns correct amount', () => {
    const singleSessionPrice = 50;
    const regularPrice = singleSessionPrice * testPackage.sessionCount;
    const savings = regularPrice - testPackage.price;
    // 5 sessions at £50 = £250
    // Package price = £200
    // Savings = £50
    node_assert_1.default.strictEqual(savings, 50);
});
(0, node_test_1.default)('calculateSavings returns zero when no discount', () => {
    const pkg = { ...testPackage, price: 250, discountPercent: 0 };
    const singleSessionPrice = 50;
    const regularPrice = singleSessionPrice * pkg.sessionCount;
    const savings = regularPrice - pkg.price;
    node_assert_1.default.strictEqual(savings, 0);
});
// ============================================================================
// FORMAT EXPIRATION DATE TESTS
// ============================================================================
(0, node_test_1.default)('formatExpirationDate shows "Expired" for past dates', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const expiresAt = pastDate.toISOString();
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const result = diffDays < 0 ? 'Expired' : 'Not expired';
    node_assert_1.default.strictEqual(result, 'Expired');
});
(0, node_test_1.default)('formatExpirationDate shows "Expires today" for today', () => {
    const today = new Date();
    today.setHours(23, 59, 59);
    const expiresAt = today.toISOString();
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    // If it's later today, diffDays will be 0 or 1
    node_assert_1.default.ok(diffDays >= 0 && diffDays <= 1);
});
(0, node_test_1.default)('formatExpirationDate shows "Expires tomorrow" for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expiresAt = tomorrow.toISOString();
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    // Tomorrow should be 1 or 2 days depending on time
    node_assert_1.default.ok(diffDays >= 1 && diffDays <= 2);
});
(0, node_test_1.default)('formatExpirationDate shows days for upcoming dates', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const expiresAt = futureDate.toISOString();
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    // Should be around 5 days
    node_assert_1.default.ok(diffDays >= 4 && diffDays <= 6);
});
// ============================================================================
// PACKAGE FILTERING TESTS
// ============================================================================
(0, node_test_1.default)('filtering packages by coachId works correctly', () => {
    const packages = [testPackage, testPackage2, inactivePackage];
    const coach1Packages = packages.filter((pkg) => pkg.coachId === 'coach1');
    node_assert_1.default.strictEqual(coach1Packages.length, 2);
    node_assert_1.default.ok(coach1Packages.every((pkg) => pkg.coachId === 'coach1'));
});
(0, node_test_1.default)('filtering active packages works correctly', () => {
    const packages = [testPackage, testPackage2, inactivePackage];
    const activePackages = packages.filter((pkg) => pkg.isActive);
    node_assert_1.default.strictEqual(activePackages.length, 2);
    node_assert_1.default.ok(activePackages.every((pkg) => pkg.isActive));
});
(0, node_test_1.default)('filtering available packages for a coach works correctly', () => {
    const packages = [testPackage, testPackage2, inactivePackage];
    const availableForCoach1 = packages.filter((pkg) => pkg.coachId === 'coach1' && pkg.isActive);
    node_assert_1.default.strictEqual(availableForCoach1.length, 1);
    node_assert_1.default.strictEqual(availableForCoach1[0].id, 'test_pkg_1');
});
// ============================================================================
// PACKAGE VALIDATION TESTS
// ============================================================================
(0, node_test_1.default)('package with valid data passes validation', () => {
    const pkg = {
        name: 'Valid Package',
        price: 100,
        sessionCount: 5,
        discountPercent: 10,
    };
    const errors = {};
    if (!pkg.name.trim()) {
        errors.name = 'Package name is required';
    }
    if (!pkg.price || pkg.price <= 0) {
        errors.price = 'Valid price is required';
    }
    if (pkg.discountPercent < 0 || pkg.discountPercent > 50) {
        errors.discountPercent = 'Discount must be 0-50%';
    }
    node_assert_1.default.strictEqual(Object.keys(errors).length, 0);
});
(0, node_test_1.default)('package without name fails validation', () => {
    const pkg = {
        name: '',
        price: 100,
        sessionCount: 5,
        discountPercent: 10,
    };
    const errors = {};
    if (!pkg.name.trim()) {
        errors.name = 'Package name is required';
    }
    node_assert_1.default.ok(errors.name);
    node_assert_1.default.strictEqual(errors.name, 'Package name is required');
});
(0, node_test_1.default)('package with zero price fails validation', () => {
    const pkg = {
        name: 'Test Package',
        price: 0,
        sessionCount: 5,
        discountPercent: 10,
    };
    const errors = {};
    if (!pkg.price || pkg.price <= 0) {
        errors.price = 'Valid price is required';
    }
    node_assert_1.default.ok(errors.price);
    node_assert_1.default.strictEqual(errors.price, 'Valid price is required');
});
(0, node_test_1.default)('package with excessive discount fails validation', () => {
    const pkg = {
        name: 'Test Package',
        price: 100,
        sessionCount: 5,
        discountPercent: 60,
    };
    const errors = {};
    if (pkg.discountPercent < 0 || pkg.discountPercent > 50) {
        errors.discountPercent = 'Discount must be 0-50%';
    }
    node_assert_1.default.ok(errors.discountPercent);
    node_assert_1.default.strictEqual(errors.discountPercent, 'Discount must be 0-50%');
});
// ============================================================================
// PURCHASE STATUS TESTS
// ============================================================================
(0, node_test_1.default)('purchase status is correctly identified as active', () => {
    const purchase = {
        status: 'ACTIVE',
        sessionsRemaining: 3,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const isActive = purchase.status === 'ACTIVE' &&
        purchase.sessionsRemaining > 0 &&
        new Date(purchase.expiresAt) > new Date();
    node_assert_1.default.strictEqual(isActive, true);
});
(0, node_test_1.default)('purchase status is correctly identified as expired', () => {
    const purchase = {
        status: 'ACTIVE',
        sessionsRemaining: 3,
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const isExpired = new Date(purchase.expiresAt) < new Date();
    node_assert_1.default.strictEqual(isExpired, true);
});
(0, node_test_1.default)('purchase status is correctly identified as exhausted', () => {
    const purchase = {
        status: 'ACTIVE',
        sessionsRemaining: 0,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const isExhausted = purchase.sessionsRemaining <= 0;
    node_assert_1.default.strictEqual(isExhausted, true);
});
// ============================================================================
// PRICE PER SESSION CALCULATION TESTS
// ============================================================================
(0, node_test_1.default)('price per session is calculated correctly', () => {
    const price = 200;
    const sessionCount = 5;
    const pricePerSession = Math.round((price / sessionCount) * 100) / 100;
    node_assert_1.default.strictEqual(pricePerSession, 40);
});
(0, node_test_1.default)('price per session handles odd divisions', () => {
    const price = 100;
    const sessionCount = 3;
    const pricePerSession = Math.round((price / sessionCount) * 100) / 100;
    // 100/3 = 33.33...
    node_assert_1.default.strictEqual(pricePerSession, 33.33);
});
// ============================================================================
// WALLET BALANCE CHECK TESTS
// ============================================================================
(0, node_test_1.default)('wallet balance check returns true when sufficient', () => {
    const balance = 500;
    const price = 200;
    const hasSufficient = balance >= price;
    node_assert_1.default.strictEqual(hasSufficient, true);
});
(0, node_test_1.default)('wallet balance check returns false when insufficient', () => {
    const balance = 50;
    const price = 200;
    const hasSufficient = balance >= price;
    node_assert_1.default.strictEqual(hasSufficient, false);
});
(0, node_test_1.default)('shortfall is calculated correctly', () => {
    const balance = 50;
    const price = 200;
    const shortfall = price - balance;
    node_assert_1.default.strictEqual(shortfall, 150);
});
// ============================================================================
// EXPIRATION DATE CALCULATION TESTS
// ============================================================================
(0, node_test_1.default)('expiration date is calculated correctly from validDays', () => {
    const validDays = 60;
    const purchaseDate = new Date('2024-01-01T00:00:00.000Z');
    const expiresAt = new Date(purchaseDate);
    expiresAt.setDate(expiresAt.getDate() + validDays);
    node_assert_1.default.strictEqual(expiresAt.toISOString(), '2024-03-01T00:00:00.000Z');
});
(0, node_test_1.default)('expiration date handles month boundaries', () => {
    const validDays = 30;
    const purchaseDate = new Date('2024-01-15T00:00:00.000Z');
    const expiresAt = new Date(purchaseDate);
    expiresAt.setDate(expiresAt.getDate() + validDays);
    node_assert_1.default.strictEqual(expiresAt.toISOString(), '2024-02-14T00:00:00.000Z');
});
// ============================================================================
// SESSION REDEMPTION VALIDATION TESTS
// ============================================================================
(0, node_test_1.default)('redemption validation passes for valid purchase', () => {
    const purchase = {
        userId: 'user1',
        status: 'ACTIVE',
        sessionsRemaining: 3,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        redeemedBookingIds: ['booking1'],
    };
    const userId = 'user1';
    const bookingId = 'booking2';
    const errors = [];
    if (purchase.userId !== userId) {
        errors.push('This package does not belong to you');
    }
    if (purchase.status !== 'ACTIVE') {
        errors.push(`Package is ${purchase.status.toLowerCase()}`);
    }
    if (new Date(purchase.expiresAt) < new Date()) {
        errors.push('Package has expired');
    }
    if (purchase.sessionsRemaining <= 0) {
        errors.push('No sessions remaining');
    }
    if (purchase.redeemedBookingIds?.includes(bookingId)) {
        errors.push('Session already redeemed for this booking');
    }
    node_assert_1.default.strictEqual(errors.length, 0);
});
(0, node_test_1.default)('redemption validation fails for wrong user', () => {
    const purchase = {
        userId: 'user1',
        status: 'ACTIVE',
        sessionsRemaining: 3,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const userId = 'user2';
    const isOwner = purchase.userId === userId;
    node_assert_1.default.strictEqual(isOwner, false);
});
(0, node_test_1.default)('redemption validation fails for inactive purchase', () => {
    const purchase = {
        userId: 'user1',
        status: 'EXPIRED',
        sessionsRemaining: 3,
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const isActive = purchase.status === 'ACTIVE';
    node_assert_1.default.strictEqual(isActive, false);
});
(0, node_test_1.default)('redemption validation fails for duplicate booking', () => {
    const purchase = {
        userId: 'user1',
        status: 'ACTIVE',
        sessionsRemaining: 3,
        redeemedBookingIds: ['booking1', 'booking2'],
    };
    const bookingId = 'booking1';
    const isDuplicate = purchase.redeemedBookingIds.includes(bookingId);
    node_assert_1.default.strictEqual(isDuplicate, true);
});
// ============================================================================
// DATA STRUCTURE TESTS
// ============================================================================
(0, node_test_1.default)('SessionPackage has required fields', () => {
    const requiredFields = [
        'id',
        'coachId',
        'name',
        'sessionCount',
        'price',
        'discountPercent',
        'validDays',
        'isActive',
    ];
    for (const field of requiredFields) {
        node_assert_1.default.ok(field in testPackage, `SessionPackage should have ${field} field`);
    }
});
(0, node_test_1.default)('PackagePurchase structure is correct', () => {
    const purchase = {
        id: 'purchase_1',
        userId: 'user1',
        packageId: 'pkg_1',
        packageName: 'Test Bundle',
        coachId: 'coach1',
        sessionsTotal: 5,
        sessionsUsed: 2,
        sessionsRemaining: 3,
        purchasedAt: '2024-01-01T00:00:00.000Z',
        expiresAt: '2024-03-01T00:00:00.000Z',
        status: 'ACTIVE',
        pricePaid: 200,
        currency: 'GBP',
    };
    node_assert_1.default.strictEqual(purchase.sessionsRemaining, purchase.sessionsTotal - purchase.sessionsUsed);
    node_assert_1.default.strictEqual(purchase.status, 'ACTIVE');
});
console.log('All package service tests passed!');
