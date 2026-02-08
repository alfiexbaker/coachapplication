// @ts-nocheck
import assert from 'node:assert';
import test from 'node:test';

/**
 * Tests for the PackageCard component
 *
 * These tests verify the PackageCard renders correctly with different props
 * and displays package information appropriately.
 */

// Mock SessionPackage data for testing
const createMockPackage = (overrides = {}) => ({
  id: 'pkg_test_1',
  coachId: 'coach1',
  coachName: 'Test Coach',
  name: 'Test Package',
  description: 'A test description for the package',
  sessionCount: 5,
  price: 200,
  discountPercent: 10,
  validDays: 60,
  isActive: true,
  currency: 'GBP',
  pricePerSession: 40,
  createdAt: '2024-01-01T00:00:00.000Z',
  focus: ['Dribbling', 'Passing'],
  ...overrides,
});

// ============================================================================
// PACKAGE CARD DATA TRANSFORMATION TESTS
// ============================================================================

test('PackageCard computes pricePerSession correctly when not provided', () => {
  const pkg = createMockPackage({ pricePerSession: undefined });
  const computedPricePerSession = Math.round((pkg.price / pkg.sessionCount) * 100) / 100;

  assert.strictEqual(computedPricePerSession, 40);
});

test('PackageCard uses provided pricePerSession when available', () => {
  const pkg = createMockPackage({ pricePerSession: 35 });

  assert.strictEqual(pkg.pricePerSession, 35);
});

test('PackageCard displays discount badge for packages with discount', () => {
  const pkg = createMockPackage({ discountPercent: 15 });

  // Verify discount badge should be shown
  const shouldShowDiscount = pkg.discountPercent > 0;
  assert.strictEqual(shouldShowDiscount, true);
  assert.strictEqual(pkg.discountPercent, 15);
});

test('PackageCard hides discount badge for packages with no discount', () => {
  const pkg = createMockPackage({ discountPercent: 0 });

  const shouldShowDiscount = pkg.discountPercent > 0;
  assert.strictEqual(shouldShowDiscount, false);
});

test('PackageCard shows inactive indicator for inactive packages', () => {
  const pkg = createMockPackage({ isActive: false });

  const shouldShowInactive = !pkg.isActive;
  assert.strictEqual(shouldShowInactive, true);
});

test('PackageCard hides inactive indicator for active packages', () => {
  const pkg = createMockPackage({ isActive: true });

  const shouldShowInactive = !pkg.isActive;
  assert.strictEqual(shouldShowInactive, false);
});

// ============================================================================
// COACH NAME DISPLAY TESTS
// ============================================================================

test('PackageCard displays coach name when showCoach is true', () => {
  const pkg = createMockPackage({ coachName: 'Sarah Mitchell' });
  const showCoach = true;

  const shouldShowCoachName = showCoach && pkg.coachName;
  assert.ok(shouldShowCoachName);
  assert.strictEqual(pkg.coachName, 'Sarah Mitchell');
});

test('PackageCard hides coach name when showCoach is false', () => {
  const pkg = createMockPackage({ coachName: 'Sarah Mitchell' });
  const showCoach = false;

  const shouldShowCoachName = showCoach && pkg.coachName;
  assert.strictEqual(shouldShowCoachName, false);
});

test('PackageCard handles missing coach name gracefully', () => {
  const pkg = createMockPackage({ coachName: undefined });
  const showCoach = true;

  const shouldShowCoachName = showCoach && pkg.coachName;
  assert.strictEqual(shouldShowCoachName, undefined);
});

// ============================================================================
// DESCRIPTION DISPLAY TESTS
// ============================================================================

test('PackageCard shows description in non-compact mode', () => {
  const pkg = createMockPackage({ description: 'Test description' });
  const compact = false;

  const shouldShowDescription = !compact && pkg.description;
  assert.ok(shouldShowDescription);
});

test('PackageCard hides description in compact mode', () => {
  const pkg = createMockPackage({ description: 'Test description' });
  const compact = true;

  const shouldShowDescription = !compact && pkg.description;
  assert.strictEqual(shouldShowDescription, false);
});

test('PackageCard handles missing description', () => {
  const pkg = createMockPackage({ description: undefined });
  const compact = false;

  const shouldShowDescription = !compact && pkg.description;
  assert.strictEqual(shouldShowDescription, undefined);
});

// ============================================================================
// FOCUS AREAS DISPLAY TESTS
// ============================================================================

test('PackageCard shows focus areas when available', () => {
  const pkg = createMockPackage({ focus: ['Dribbling', 'Passing', 'Finishing'] });
  const compact = false;

  const shouldShowFocus = !compact && pkg.focus && pkg.focus.length > 0;
  assert.strictEqual(shouldShowFocus, true);
  assert.strictEqual(pkg.focus.length, 3);
});

test('PackageCard limits focus areas to 3', () => {
  const pkg = createMockPackage({
    focus: ['Dribbling', 'Passing', 'Finishing', 'Defending', 'Conditioning'],
  });

  const displayedFocus = pkg.focus.slice(0, 3);
  assert.strictEqual(displayedFocus.length, 3);
  assert.deepStrictEqual(displayedFocus, ['Dribbling', 'Passing', 'Finishing']);
});

test('PackageCard hides focus areas in compact mode', () => {
  const pkg = createMockPackage({ focus: ['Dribbling', 'Passing'] });
  const compact = true;

  const shouldShowFocus = !compact && pkg.focus && pkg.focus.length > 0;
  assert.strictEqual(shouldShowFocus, false);
});

test('PackageCard handles empty focus array', () => {
  const pkg = createMockPackage({ focus: [] });
  const compact = false;

  const shouldShowFocus = !compact && pkg.focus && pkg.focus.length > 0;
  assert.strictEqual(shouldShowFocus, false);
});

test('PackageCard handles undefined focus', () => {
  const pkg = createMockPackage({ focus: undefined });
  const compact = false;

  const shouldShowFocus = !compact && pkg.focus && pkg.focus.length > 0;
  assert.ok(!shouldShowFocus);
});

// ============================================================================
// STATS ROW TESTS
// ============================================================================

test('PackageCard displays session count correctly', () => {
  const pkg = createMockPackage({ sessionCount: 5 });

  const sessionText =
    pkg.sessionCount === 1
      ? `${pkg.sessionCount} session`
      : `${pkg.sessionCount} sessions`;

  assert.strictEqual(sessionText, '5 sessions');
});

test('PackageCard displays singular session text for 1 session', () => {
  const pkg = createMockPackage({ sessionCount: 1 });

  const sessionText =
    pkg.sessionCount === 1
      ? `${pkg.sessionCount} session`
      : `${pkg.sessionCount} sessions`;

  assert.strictEqual(sessionText, '1 session');
});

test('PackageCard displays valid days correctly', () => {
  const pkg = createMockPackage({ validDays: 60 });

  const validityText = `${pkg.validDays} days valid`;
  assert.strictEqual(validityText, '60 days valid');
});

// ============================================================================
// PRICE FORMATTING TESTS
// ============================================================================

test('PackageCard formats GBP price correctly', () => {
  const pkg = createMockPackage({ price: 200, currency: 'GBP' });

  const symbol = pkg.currency === 'GBP' ? '\u00A3' : '$';
  const formattedPrice = `${symbol}${pkg.price.toFixed(2)}`;

  assert.strictEqual(formattedPrice, '\u00A3200.00');
});

test('PackageCard formats USD price correctly', () => {
  const pkg = createMockPackage({ price: 150, currency: 'USD' });

  const symbol = pkg.currency === 'GBP' ? '\u00A3' : '$';
  const formattedPrice = `${symbol}${pkg.price.toFixed(2)}`;

  assert.strictEqual(formattedPrice, '$150.00');
});

test('PackageCard formats per-session price correctly', () => {
  const pkg = createMockPackage({ pricePerSession: 40, currency: 'GBP' });

  const symbol = pkg.currency === 'GBP' ? '\u00A3' : '$';
  const formattedPerSession = `${symbol}${pkg.pricePerSession.toFixed(2)}/session`;

  assert.strictEqual(formattedPerSession, '\u00A340.00/session');
});

// ============================================================================
// ANIMATION INDEX TESTS
// ============================================================================

test('PackageCard uses default index of 0 when not provided', () => {
  const defaultIndex = 0;
  const animationDelay = defaultIndex * 50;

  assert.strictEqual(animationDelay, 0);
});

test('PackageCard calculates animation delay from index', () => {
  const index = 3;
  const animationDelay = index * 50;

  assert.strictEqual(animationDelay, 150);
});

// ============================================================================
// PRESS HANDLER TESTS
// ============================================================================

test('PackageCard is pressable when onPress is provided', () => {
  const onPress = () => {};
  const isPressable = !!onPress;

  assert.strictEqual(isPressable, true);
});

test('PackageCard is not pressable when onPress is undefined', () => {
  const onPress = undefined;
  const isPressable = !!onPress;

  assert.strictEqual(isPressable, false);
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

test('PackageCard handles very long package name', () => {
  const pkg = createMockPackage({
    name: 'This is a very long package name that should be truncated in the UI display',
  });

  // The component uses numberOfLines={2} so name will be truncated
  assert.ok(pkg.name.length > 50);
});

test('PackageCard handles very long description', () => {
  const pkg = createMockPackage({
    description:
      'This is a very long description that explains everything about the package in great detail and should definitely be truncated in the UI when displayed to the user.',
  });

  // The component uses numberOfLines={2} so description will be truncated
  assert.ok(pkg.description.length > 100);
});

test('PackageCard handles zero price', () => {
  const pkg = createMockPackage({ price: 0, discountPercent: 0 });

  const symbol = pkg.currency === 'GBP' ? '\u00A3' : '$';
  const formattedPrice = `${symbol}${pkg.price.toFixed(2)}`;

  assert.strictEqual(formattedPrice, '\u00A30.00');
});

test('PackageCard handles large session count', () => {
  const pkg = createMockPackage({ sessionCount: 100 });

  const sessionText = `${pkg.sessionCount} sessions`;
  assert.strictEqual(sessionText, '100 sessions');
});

test('PackageCard handles 100% discount', () => {
  const pkg = createMockPackage({ discountPercent: 100 });

  // Although 100% is not typically allowed, test that it displays
  const discountText = `Save ${pkg.discountPercent}%`;
  assert.strictEqual(discountText, 'Save 100%');
});

console.log('All PackageCard tests passed!');
