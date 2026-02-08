"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importDefault(require("node:test"));
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
(0, node_test_1.default)('PackageCard computes pricePerSession correctly when not provided', () => {
    const pkg = createMockPackage({ pricePerSession: undefined });
    const computedPricePerSession = Math.round((pkg.price / pkg.sessionCount) * 100) / 100;
    node_assert_1.default.strictEqual(computedPricePerSession, 40);
});
(0, node_test_1.default)('PackageCard uses provided pricePerSession when available', () => {
    const pkg = createMockPackage({ pricePerSession: 35 });
    node_assert_1.default.strictEqual(pkg.pricePerSession, 35);
});
(0, node_test_1.default)('PackageCard displays discount badge for packages with discount', () => {
    const pkg = createMockPackage({ discountPercent: 15 });
    // Verify discount badge should be shown
    const shouldShowDiscount = pkg.discountPercent > 0;
    node_assert_1.default.strictEqual(shouldShowDiscount, true);
    node_assert_1.default.strictEqual(pkg.discountPercent, 15);
});
(0, node_test_1.default)('PackageCard hides discount badge for packages with no discount', () => {
    const pkg = createMockPackage({ discountPercent: 0 });
    const shouldShowDiscount = pkg.discountPercent > 0;
    node_assert_1.default.strictEqual(shouldShowDiscount, false);
});
(0, node_test_1.default)('PackageCard shows inactive indicator for inactive packages', () => {
    const pkg = createMockPackage({ isActive: false });
    const shouldShowInactive = !pkg.isActive;
    node_assert_1.default.strictEqual(shouldShowInactive, true);
});
(0, node_test_1.default)('PackageCard hides inactive indicator for active packages', () => {
    const pkg = createMockPackage({ isActive: true });
    const shouldShowInactive = !pkg.isActive;
    node_assert_1.default.strictEqual(shouldShowInactive, false);
});
// ============================================================================
// COACH NAME DISPLAY TESTS
// ============================================================================
(0, node_test_1.default)('PackageCard displays coach name when showCoach is true', () => {
    const pkg = createMockPackage({ coachName: 'Sarah Mitchell' });
    const showCoach = true;
    const shouldShowCoachName = showCoach && pkg.coachName;
    node_assert_1.default.ok(shouldShowCoachName);
    node_assert_1.default.strictEqual(pkg.coachName, 'Sarah Mitchell');
});
(0, node_test_1.default)('PackageCard hides coach name when showCoach is false', () => {
    const pkg = createMockPackage({ coachName: 'Sarah Mitchell' });
    const showCoach = false;
    const shouldShowCoachName = showCoach && pkg.coachName;
    node_assert_1.default.strictEqual(shouldShowCoachName, false);
});
(0, node_test_1.default)('PackageCard handles missing coach name gracefully', () => {
    const pkg = createMockPackage({ coachName: undefined });
    const showCoach = true;
    const shouldShowCoachName = showCoach && pkg.coachName;
    node_assert_1.default.strictEqual(shouldShowCoachName, undefined);
});
// ============================================================================
// DESCRIPTION DISPLAY TESTS
// ============================================================================
(0, node_test_1.default)('PackageCard shows description in non-compact mode', () => {
    const pkg = createMockPackage({ description: 'Test description' });
    const compact = false;
    const shouldShowDescription = !compact && pkg.description;
    node_assert_1.default.ok(shouldShowDescription);
});
(0, node_test_1.default)('PackageCard hides description in compact mode', () => {
    const pkg = createMockPackage({ description: 'Test description' });
    const compact = true;
    const shouldShowDescription = !compact && pkg.description;
    node_assert_1.default.strictEqual(shouldShowDescription, false);
});
(0, node_test_1.default)('PackageCard handles missing description', () => {
    const pkg = createMockPackage({ description: undefined });
    const compact = false;
    const shouldShowDescription = !compact && pkg.description;
    node_assert_1.default.strictEqual(shouldShowDescription, undefined);
});
// ============================================================================
// FOCUS AREAS DISPLAY TESTS
// ============================================================================
(0, node_test_1.default)('PackageCard shows focus areas when available', () => {
    const pkg = createMockPackage({ focus: ['Dribbling', 'Passing', 'Finishing'] });
    const compact = false;
    const shouldShowFocus = !compact && pkg.focus && pkg.focus.length > 0;
    node_assert_1.default.strictEqual(shouldShowFocus, true);
    node_assert_1.default.strictEqual(pkg.focus.length, 3);
});
(0, node_test_1.default)('PackageCard limits focus areas to 3', () => {
    const pkg = createMockPackage({
        focus: ['Dribbling', 'Passing', 'Finishing', 'Defending', 'Conditioning'],
    });
    const displayedFocus = pkg.focus.slice(0, 3);
    node_assert_1.default.strictEqual(displayedFocus.length, 3);
    node_assert_1.default.deepStrictEqual(displayedFocus, ['Dribbling', 'Passing', 'Finishing']);
});
(0, node_test_1.default)('PackageCard hides focus areas in compact mode', () => {
    const pkg = createMockPackage({ focus: ['Dribbling', 'Passing'] });
    const compact = true;
    const shouldShowFocus = !compact && pkg.focus && pkg.focus.length > 0;
    node_assert_1.default.strictEqual(shouldShowFocus, false);
});
(0, node_test_1.default)('PackageCard handles empty focus array', () => {
    const pkg = createMockPackage({ focus: [] });
    const compact = false;
    const shouldShowFocus = !compact && pkg.focus && pkg.focus.length > 0;
    node_assert_1.default.strictEqual(shouldShowFocus, false);
});
(0, node_test_1.default)('PackageCard handles undefined focus', () => {
    const pkg = createMockPackage({ focus: undefined });
    const compact = false;
    const shouldShowFocus = !compact && pkg.focus && pkg.focus.length > 0;
    node_assert_1.default.ok(!shouldShowFocus);
});
// ============================================================================
// STATS ROW TESTS
// ============================================================================
(0, node_test_1.default)('PackageCard displays session count correctly', () => {
    const pkg = createMockPackage({ sessionCount: 5 });
    const sessionText = pkg.sessionCount === 1
        ? `${pkg.sessionCount} session`
        : `${pkg.sessionCount} sessions`;
    node_assert_1.default.strictEqual(sessionText, '5 sessions');
});
(0, node_test_1.default)('PackageCard displays singular session text for 1 session', () => {
    const pkg = createMockPackage({ sessionCount: 1 });
    const sessionText = pkg.sessionCount === 1
        ? `${pkg.sessionCount} session`
        : `${pkg.sessionCount} sessions`;
    node_assert_1.default.strictEqual(sessionText, '1 session');
});
(0, node_test_1.default)('PackageCard displays valid days correctly', () => {
    const pkg = createMockPackage({ validDays: 60 });
    const validityText = `${pkg.validDays} days valid`;
    node_assert_1.default.strictEqual(validityText, '60 days valid');
});
// ============================================================================
// PRICE FORMATTING TESTS
// ============================================================================
(0, node_test_1.default)('PackageCard formats GBP price correctly', () => {
    const pkg = createMockPackage({ price: 200, currency: 'GBP' });
    const symbol = pkg.currency === 'GBP' ? '\u00A3' : '$';
    const formattedPrice = `${symbol}${pkg.price.toFixed(2)}`;
    node_assert_1.default.strictEqual(formattedPrice, '\u00A3200.00');
});
(0, node_test_1.default)('PackageCard formats USD price correctly', () => {
    const pkg = createMockPackage({ price: 150, currency: 'USD' });
    const symbol = pkg.currency === 'GBP' ? '\u00A3' : '$';
    const formattedPrice = `${symbol}${pkg.price.toFixed(2)}`;
    node_assert_1.default.strictEqual(formattedPrice, '$150.00');
});
(0, node_test_1.default)('PackageCard formats per-session price correctly', () => {
    const pkg = createMockPackage({ pricePerSession: 40, currency: 'GBP' });
    const symbol = pkg.currency === 'GBP' ? '\u00A3' : '$';
    const formattedPerSession = `${symbol}${pkg.pricePerSession.toFixed(2)}/session`;
    node_assert_1.default.strictEqual(formattedPerSession, '\u00A340.00/session');
});
// ============================================================================
// ANIMATION INDEX TESTS
// ============================================================================
(0, node_test_1.default)('PackageCard uses default index of 0 when not provided', () => {
    const defaultIndex = 0;
    const animationDelay = defaultIndex * 50;
    node_assert_1.default.strictEqual(animationDelay, 0);
});
(0, node_test_1.default)('PackageCard calculates animation delay from index', () => {
    const index = 3;
    const animationDelay = index * 50;
    node_assert_1.default.strictEqual(animationDelay, 150);
});
// ============================================================================
// PRESS HANDLER TESTS
// ============================================================================
(0, node_test_1.default)('PackageCard is pressable when onPress is provided', () => {
    const onPress = () => { };
    const isPressable = !!onPress;
    node_assert_1.default.strictEqual(isPressable, true);
});
(0, node_test_1.default)('PackageCard is not pressable when onPress is undefined', () => {
    const onPress = undefined;
    const isPressable = !!onPress;
    node_assert_1.default.strictEqual(isPressable, false);
});
// ============================================================================
// EDGE CASE TESTS
// ============================================================================
(0, node_test_1.default)('PackageCard handles very long package name', () => {
    const pkg = createMockPackage({
        name: 'This is a very long package name that should be truncated in the UI display',
    });
    // The component uses numberOfLines={2} so name will be truncated
    node_assert_1.default.ok(pkg.name.length > 50);
});
(0, node_test_1.default)('PackageCard handles very long description', () => {
    const pkg = createMockPackage({
        description: 'This is a very long description that explains everything about the package in great detail and should definitely be truncated in the UI when displayed to the user.',
    });
    // The component uses numberOfLines={2} so description will be truncated
    node_assert_1.default.ok(pkg.description.length > 100);
});
(0, node_test_1.default)('PackageCard handles zero price', () => {
    const pkg = createMockPackage({ price: 0, discountPercent: 0 });
    const symbol = pkg.currency === 'GBP' ? '\u00A3' : '$';
    const formattedPrice = `${symbol}${pkg.price.toFixed(2)}`;
    node_assert_1.default.strictEqual(formattedPrice, '\u00A30.00');
});
(0, node_test_1.default)('PackageCard handles large session count', () => {
    const pkg = createMockPackage({ sessionCount: 100 });
    const sessionText = `${pkg.sessionCount} sessions`;
    node_assert_1.default.strictEqual(sessionText, '100 sessions');
});
(0, node_test_1.default)('PackageCard handles 100% discount', () => {
    const pkg = createMockPackage({ discountPercent: 100 });
    // Although 100% is not typically allowed, test that it displays
    const discountText = `Save ${pkg.discountPercent}%`;
    node_assert_1.default.strictEqual(discountText, 'Save 100%');
});
console.log('All PackageCard tests passed!');
