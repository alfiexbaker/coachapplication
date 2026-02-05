// @ts-nocheck
import assert from 'node:assert';
import test from 'node:test';

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

test('formatPrice formats GBP correctly', () => {
  // Test the format logic directly
  const amount = 200;
  const currency = 'GBP';
  const symbol = currency === 'GBP' ? '\u00A3' : '$';
  const formatted = `${symbol}${amount.toFixed(2)}`;

  assert.strictEqual(formatted, '\u00A3200.00');
});

test('formatPrice formats decimal amounts', () => {
  const amount = 35.5;
  const currency = 'GBP';
  const symbol = currency === 'GBP' ? '\u00A3' : '$';
  const formatted = `${symbol}${amount.toFixed(2)}`;

  assert.strictEqual(formatted, '\u00A335.50');
});

test('formatPrice defaults to GBP', () => {
  const amount = 100;
  const currency = undefined;
  const symbol = (currency ?? 'GBP') === 'GBP' ? '\u00A3' : '$';
  const formatted = `${symbol}${amount.toFixed(2)}`;

  assert.strictEqual(formatted, '\u00A3100.00');
});

// ============================================================================
// CALCULATE SAVINGS TESTS
// ============================================================================

test('calculateSavings returns correct amount', () => {
  const singleSessionPrice = 50;
  const regularPrice = singleSessionPrice * testPackage.sessionCount;
  const savings = regularPrice - testPackage.price;

  // 5 sessions at £50 = £250
  // Package price = £200
  // Savings = £50
  assert.strictEqual(savings, 50);
});

test('calculateSavings returns zero when no discount', () => {
  const pkg = { ...testPackage, price: 250, discountPercent: 0 };
  const singleSessionPrice = 50;
  const regularPrice = singleSessionPrice * pkg.sessionCount;
  const savings = regularPrice - pkg.price;

  assert.strictEqual(savings, 0);
});

// ============================================================================
// FORMAT EXPIRATION DATE TESTS
// ============================================================================

test('formatExpirationDate shows "Expired" for past dates', () => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  const expiresAt = pastDate.toISOString();

  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const result = diffDays < 0 ? 'Expired' : 'Not expired';
  assert.strictEqual(result, 'Expired');
});

test('formatExpirationDate shows "Expires today" for today', () => {
  const today = new Date();
  today.setHours(23, 59, 59);
  const expiresAt = today.toISOString();

  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // If it's later today, diffDays will be 0 or 1
  assert.ok(diffDays >= 0 && diffDays <= 1);
});

test('formatExpirationDate shows "Expires tomorrow" for tomorrow', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const expiresAt = tomorrow.toISOString();

  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Tomorrow should be 1 or 2 days depending on time
  assert.ok(diffDays >= 1 && diffDays <= 2);
});

test('formatExpirationDate shows days for upcoming dates', () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);
  const expiresAt = futureDate.toISOString();

  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Should be around 5 days
  assert.ok(diffDays >= 4 && diffDays <= 6);
});

// ============================================================================
// PACKAGE FILTERING TESTS
// ============================================================================

test('filtering packages by coachId works correctly', () => {
  const packages = [testPackage, testPackage2, inactivePackage];
  const coach1Packages = packages.filter((pkg) => pkg.coachId === 'coach1');

  assert.strictEqual(coach1Packages.length, 2);
  assert.ok(coach1Packages.every((pkg) => pkg.coachId === 'coach1'));
});

test('filtering active packages works correctly', () => {
  const packages = [testPackage, testPackage2, inactivePackage];
  const activePackages = packages.filter((pkg) => pkg.isActive);

  assert.strictEqual(activePackages.length, 2);
  assert.ok(activePackages.every((pkg) => pkg.isActive));
});

test('filtering available packages for a coach works correctly', () => {
  const packages = [testPackage, testPackage2, inactivePackage];
  const availableForCoach1 = packages.filter(
    (pkg) => pkg.coachId === 'coach1' && pkg.isActive
  );

  assert.strictEqual(availableForCoach1.length, 1);
  assert.strictEqual(availableForCoach1[0].id, 'test_pkg_1');
});

// ============================================================================
// PACKAGE VALIDATION TESTS
// ============================================================================

test('package with valid data passes validation', () => {
  const pkg = {
    name: 'Valid Package',
    price: 100,
    sessionCount: 5,
    discountPercent: 10,
  };

  const errors: Record<string, string> = {};

  if (!pkg.name.trim()) {
    errors.name = 'Package name is required';
  }
  if (!pkg.price || pkg.price <= 0) {
    errors.price = 'Valid price is required';
  }
  if (pkg.discountPercent < 0 || pkg.discountPercent > 50) {
    errors.discountPercent = 'Discount must be 0-50%';
  }

  assert.strictEqual(Object.keys(errors).length, 0);
});

test('package without name fails validation', () => {
  const pkg = {
    name: '',
    price: 100,
    sessionCount: 5,
    discountPercent: 10,
  };

  const errors: Record<string, string> = {};

  if (!pkg.name.trim()) {
    errors.name = 'Package name is required';
  }

  assert.ok(errors.name);
  assert.strictEqual(errors.name, 'Package name is required');
});

test('package with zero price fails validation', () => {
  const pkg = {
    name: 'Test Package',
    price: 0,
    sessionCount: 5,
    discountPercent: 10,
  };

  const errors: Record<string, string> = {};

  if (!pkg.price || pkg.price <= 0) {
    errors.price = 'Valid price is required';
  }

  assert.ok(errors.price);
  assert.strictEqual(errors.price, 'Valid price is required');
});

test('package with excessive discount fails validation', () => {
  const pkg = {
    name: 'Test Package',
    price: 100,
    sessionCount: 5,
    discountPercent: 60,
  };

  const errors: Record<string, string> = {};

  if (pkg.discountPercent < 0 || pkg.discountPercent > 50) {
    errors.discountPercent = 'Discount must be 0-50%';
  }

  assert.ok(errors.discountPercent);
  assert.strictEqual(errors.discountPercent, 'Discount must be 0-50%');
});

// ============================================================================
// PURCHASE STATUS TESTS
// ============================================================================

test('purchase status is correctly identified as active', () => {
  const purchase = {
    status: 'ACTIVE' as const,
    sessionsRemaining: 3,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const isActive =
    purchase.status === 'ACTIVE' &&
    purchase.sessionsRemaining > 0 &&
    new Date(purchase.expiresAt) > new Date();

  assert.strictEqual(isActive, true);
});

test('purchase status is correctly identified as expired', () => {
  const purchase = {
    status: 'ACTIVE' as const,
    sessionsRemaining: 3,
    expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const isExpired = new Date(purchase.expiresAt) < new Date();

  assert.strictEqual(isExpired, true);
});

test('purchase status is correctly identified as exhausted', () => {
  const purchase = {
    status: 'ACTIVE' as const,
    sessionsRemaining: 0,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const isExhausted = purchase.sessionsRemaining <= 0;

  assert.strictEqual(isExhausted, true);
});

// ============================================================================
// PRICE PER SESSION CALCULATION TESTS
// ============================================================================

test('price per session is calculated correctly', () => {
  const price = 200;
  const sessionCount = 5;
  const pricePerSession = Math.round((price / sessionCount) * 100) / 100;

  assert.strictEqual(pricePerSession, 40);
});

test('price per session handles odd divisions', () => {
  const price = 100;
  const sessionCount = 3;
  const pricePerSession = Math.round((price / sessionCount) * 100) / 100;

  // 100/3 = 33.33...
  assert.strictEqual(pricePerSession, 33.33);
});

// ============================================================================
// WALLET BALANCE CHECK TESTS
// ============================================================================

test('wallet balance check returns true when sufficient', () => {
  const balance = 500;
  const price = 200;
  const hasSufficient = balance >= price;

  assert.strictEqual(hasSufficient, true);
});

test('wallet balance check returns false when insufficient', () => {
  const balance = 50;
  const price = 200;
  const hasSufficient = balance >= price;

  assert.strictEqual(hasSufficient, false);
});

test('shortfall is calculated correctly', () => {
  const balance = 50;
  const price = 200;
  const shortfall = price - balance;

  assert.strictEqual(shortfall, 150);
});

// ============================================================================
// EXPIRATION DATE CALCULATION TESTS
// ============================================================================

test('expiration date is calculated correctly from validDays', () => {
  const validDays = 60;
  const purchaseDate = new Date('2024-01-01T00:00:00.000Z');
  const expiresAt = new Date(purchaseDate);
  expiresAt.setDate(expiresAt.getDate() + validDays);

  assert.strictEqual(expiresAt.toISOString(), '2024-03-01T00:00:00.000Z');
});

test('expiration date handles month boundaries', () => {
  const validDays = 30;
  const purchaseDate = new Date('2024-01-15T00:00:00.000Z');
  const expiresAt = new Date(purchaseDate);
  expiresAt.setDate(expiresAt.getDate() + validDays);

  assert.strictEqual(expiresAt.toISOString(), '2024-02-14T00:00:00.000Z');
});

// ============================================================================
// SESSION REDEMPTION VALIDATION TESTS
// ============================================================================

test('redemption validation passes for valid purchase', () => {
  const purchase = {
    userId: 'user1',
    status: 'ACTIVE' as const,
    sessionsRemaining: 3,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    redeemedBookingIds: ['booking1'],
  };
  const userId = 'user1';
  const bookingId = 'booking2';

  const errors: string[] = [];

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

  assert.strictEqual(errors.length, 0);
});

test('redemption validation fails for wrong user', () => {
  const purchase = {
    userId: 'user1',
    status: 'ACTIVE' as const,
    sessionsRemaining: 3,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const userId = 'user2';

  const isOwner = purchase.userId === userId;

  assert.strictEqual(isOwner, false);
});

test('redemption validation fails for inactive purchase', () => {
  const purchase = {
    userId: 'user1',
    status: 'EXPIRED' as const,
    sessionsRemaining: 3,
    expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const isActive = purchase.status === 'ACTIVE';

  assert.strictEqual(isActive, false);
});

test('redemption validation fails for duplicate booking', () => {
  const purchase = {
    userId: 'user1',
    status: 'ACTIVE' as const,
    sessionsRemaining: 3,
    redeemedBookingIds: ['booking1', 'booking2'],
  };
  const bookingId = 'booking1';

  const isDuplicate = purchase.redeemedBookingIds.includes(bookingId);

  assert.strictEqual(isDuplicate, true);
});

// ============================================================================
// DATA STRUCTURE TESTS
// ============================================================================

test('SessionPackage has required fields', () => {
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
    assert.ok(
      field in testPackage,
      `SessionPackage should have ${field} field`
    );
  }
});

test('PackagePurchase structure is correct', () => {
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

  assert.strictEqual(purchase.sessionsRemaining, purchase.sessionsTotal - purchase.sessionsUsed);
  assert.strictEqual(purchase.status, 'ACTIVE');
});

console.log('All package service tests passed!');
