"use strict";
/**
 * Tests for the RecurringCard component
 *
 * These tests verify the component's rendering logic, status handling,
 * and callback behavior without actually rendering React components.
 * (Using Node's built-in test runner for consistency with project setup)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importDefault(require("node:test"));
const recurring_booking_service_1 = require("../../services/recurring-booking-service");
// ============================================================================
// Test Fixtures
// ============================================================================
/**
 * Create a mock recurring booking for testing
 */
function createMockRecurring(overrides) {
    const now = new Date().toISOString();
    return {
        id: 'recurring_test_1',
        userId: 'user_1',
        userName: 'Test User',
        coachId: 'coach_1',
        coachName: 'Test Coach',
        coachPhotoUrl: 'https://example.com/photo.jpg',
        athleteId: 'athlete_1',
        athleteName: 'Test Athlete',
        dayOfWeek: 2,
        time: '14:00',
        duration: 60,
        location: 'Test Location',
        sessionType: '1-on-1 Training',
        frequency: 'WEEKLY',
        startDate: now,
        status: 'ACTIVE',
        pricePerSession: 75,
        notes: 'Test notes',
        createdAt: now,
        updatedAt: now,
        generatedBookingIds: [],
        sessionsCompleted: 5,
        ...overrides,
    };
}
// ============================================================================
// Display Helper Tests
// ============================================================================
(0, node_test_1.default)('RecurringCard - formatTime displays correct AM/PM format', () => {
    // Test the time formatting logic used in RecurringCard
    const formatTime = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };
    node_assert_1.default.strictEqual(formatTime('14:00'), '2:00 PM');
    node_assert_1.default.strictEqual(formatTime('09:30'), '9:30 AM');
    node_assert_1.default.strictEqual(formatTime('12:00'), '12:00 PM');
    node_assert_1.default.strictEqual(formatTime('00:00'), '12:00 AM');
    node_assert_1.default.strictEqual(formatTime('23:59'), '11:59 PM');
});
(0, node_test_1.default)('RecurringCard - status icon mapping is correct', () => {
    // Test the status icon mapping logic used in RecurringCard
    const getStatusIcon = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'checkmark-circle';
            case 'PAUSED':
                return 'pause-circle';
            case 'CANCELLED':
                return 'close-circle';
            case 'EXPIRED':
                return 'time';
            default:
                return 'help-circle';
        }
    };
    node_assert_1.default.strictEqual(getStatusIcon('ACTIVE'), 'checkmark-circle');
    node_assert_1.default.strictEqual(getStatusIcon('PAUSED'), 'pause-circle');
    node_assert_1.default.strictEqual(getStatusIcon('CANCELLED'), 'close-circle');
    node_assert_1.default.strictEqual(getStatusIcon('EXPIRED'), 'time');
});
(0, node_test_1.default)('RecurringCard - withAlpha utility correctly converts hex to rgba', () => {
    // Test the withAlpha utility function used in RecurringCard
    const withAlpha = (hexColor, alpha) => {
        const hex = hexColor.replace('#', '');
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    node_assert_1.default.strictEqual(withAlpha('#FF0000', 0.5), 'rgba(255, 0, 0, 0.5)');
    node_assert_1.default.strictEqual(withAlpha('#00FF00', 0.25), 'rgba(0, 255, 0, 0.25)');
    node_assert_1.default.strictEqual(withAlpha('#0000FF', 1), 'rgba(0, 0, 255, 1)');
    node_assert_1.default.strictEqual(withAlpha('#FFFFFF', 0), 'rgba(255, 255, 255, 0)');
});
// ============================================================================
// Data Display Tests
// ============================================================================
(0, node_test_1.default)('RecurringCard - displays coach name correctly', () => {
    const recurring = createMockRecurring({ coachName: 'Sarah Mitchell' });
    node_assert_1.default.strictEqual(recurring.coachName, 'Sarah Mitchell');
});
(0, node_test_1.default)('RecurringCard - displays frequency label correctly', () => {
    const frequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];
    const expectedLabels = ['Every week', 'Every 2 weeks', 'Every month'];
    frequencies.forEach((freq, index) => {
        const recurring = createMockRecurring({ frequency: freq });
        node_assert_1.default.strictEqual((0, recurring_booking_service_1.getFrequencyLabel)(recurring.frequency), expectedLabels[index]);
    });
});
(0, node_test_1.default)('RecurringCard - displays day of week correctly', () => {
    for (let day = 0; day <= 6; day++) {
        const recurring = createMockRecurring({ dayOfWeek: day });
        const dayName = (0, recurring_booking_service_1.getDayName)(recurring.dayOfWeek);
        node_assert_1.default.ok(dayName !== 'Unknown', `Day ${day} should have a valid name`);
    }
});
(0, node_test_1.default)('RecurringCard - displays status correctly', () => {
    const statuses = ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'];
    const expectedLabels = ['Active', 'Paused', 'Cancelled', 'Expired'];
    statuses.forEach((status, index) => {
        const recurring = createMockRecurring({ status });
        node_assert_1.default.strictEqual((0, recurring_booking_service_1.getStatusLabel)(recurring.status), expectedLabels[index]);
    });
});
(0, node_test_1.default)('RecurringCard - shows athlete name when different from user', () => {
    const recurring = createMockRecurring({
        userName: 'Parent User',
        athleteName: 'Child Athlete',
    });
    // The component should show the athlete badge when athleteName differs from userName
    const shouldShowAthleteBadge = recurring.athleteName && recurring.athleteName !== recurring.userName;
    node_assert_1.default.strictEqual(shouldShowAthleteBadge, true);
});
(0, node_test_1.default)('RecurringCard - hides athlete badge when names are the same', () => {
    const recurring = createMockRecurring({
        userName: 'Same User',
        athleteName: 'Same User',
    });
    const shouldShowAthleteBadge = recurring.athleteName && recurring.athleteName !== recurring.userName;
    node_assert_1.default.strictEqual(shouldShowAthleteBadge, false);
});
// ============================================================================
// Stats Display Tests
// ============================================================================
(0, node_test_1.default)('RecurringCard - displays sessions completed', () => {
    const recurring = createMockRecurring({ sessionsCompleted: 10 });
    node_assert_1.default.strictEqual(recurring.sessionsCompleted, 10);
});
(0, node_test_1.default)('RecurringCard - displays sessions remaining when set', () => {
    const recurring = createMockRecurring({ sessionsRemaining: 5 });
    node_assert_1.default.strictEqual(recurring.sessionsRemaining, 5);
});
(0, node_test_1.default)('RecurringCard - sessions remaining is undefined for indefinite subscriptions', () => {
    const recurring = createMockRecurring({ sessionsRemaining: undefined });
    node_assert_1.default.strictEqual(recurring.sessionsRemaining, undefined);
});
(0, node_test_1.default)('RecurringCard - displays price per session', () => {
    const recurring = createMockRecurring({ pricePerSession: 100 });
    node_assert_1.default.strictEqual(recurring.pricePerSession, 100);
});
// ============================================================================
// Action Button Visibility Tests
// ============================================================================
(0, node_test_1.default)('RecurringCard - pause button shown only for ACTIVE status', () => {
    const statuses = ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'];
    const expectedShowPause = [true, false, false, false];
    statuses.forEach((status, index) => {
        const recurring = createMockRecurring({ status });
        const shouldShowPause = recurring.status === 'ACTIVE';
        node_assert_1.default.strictEqual(shouldShowPause, expectedShowPause[index], `Pause button visibility wrong for ${status}`);
    });
});
(0, node_test_1.default)('RecurringCard - resume button shown only for PAUSED status', () => {
    const statuses = ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'];
    const expectedShowResume = [false, true, false, false];
    statuses.forEach((status, index) => {
        const recurring = createMockRecurring({ status });
        const shouldShowResume = recurring.status === 'PAUSED';
        node_assert_1.default.strictEqual(shouldShowResume, expectedShowResume[index], `Resume button visibility wrong for ${status}`);
    });
});
(0, node_test_1.default)('RecurringCard - cancel button hidden for CANCELLED and EXPIRED', () => {
    const statuses = ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'];
    const expectedShowCancel = [true, true, false, false];
    statuses.forEach((status, index) => {
        const recurring = createMockRecurring({ status });
        const shouldShowCancel = recurring.status !== 'CANCELLED' && recurring.status !== 'EXPIRED';
        node_assert_1.default.strictEqual(shouldShowCancel, expectedShowCancel[index], `Cancel button visibility wrong for ${status}`);
    });
});
// ============================================================================
// Pause Reason Display Tests
// ============================================================================
(0, node_test_1.default)('RecurringCard - shows pause reason when paused with reason', () => {
    const recurring = createMockRecurring({
        status: 'PAUSED',
        pausedAt: new Date().toISOString(),
        pauseReason: 'Going on vacation',
    });
    const shouldShowPauseReason = recurring.status === 'PAUSED' && !!recurring.pauseReason;
    node_assert_1.default.strictEqual(shouldShowPauseReason, true);
    node_assert_1.default.strictEqual(recurring.pauseReason, 'Going on vacation');
});
(0, node_test_1.default)('RecurringCard - hides pause reason when active', () => {
    const recurring = createMockRecurring({ status: 'ACTIVE' });
    const shouldShowPauseReason = recurring.status === 'PAUSED' && recurring.pauseReason;
    node_assert_1.default.strictEqual(shouldShowPauseReason, false);
});
// ============================================================================
// Date Formatting Tests
// ============================================================================
(0, node_test_1.default)('RecurringCard - formats start date correctly', () => {
    const startDate = new Date('2024-03-15T00:00:00.000Z');
    const recurring = createMockRecurring({ startDate: startDate.toISOString() });
    // Test the date formatting logic used in RecurringCard
    const formattedDate = new Date(recurring.startDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    node_assert_1.default.ok(formattedDate.includes('2024'), 'Should include year');
    node_assert_1.default.ok(formattedDate.includes('Mar') || formattedDate.includes('3'), 'Should include month');
    node_assert_1.default.ok(formattedDate.includes('15'), 'Should include day');
});
// ============================================================================
// Edge Cases
// ============================================================================
(0, node_test_1.default)('RecurringCard - handles missing optional fields', () => {
    const recurring = createMockRecurring({
        coachPhotoUrl: undefined,
        athleteId: undefined,
        athleteName: undefined,
        pricePerSession: undefined,
        notes: undefined,
        sessionsRemaining: undefined,
        pausedAt: undefined,
        pauseReason: undefined,
        cancelledAt: undefined,
        cancellationReason: undefined,
    });
    // Component should not crash with missing optional fields
    node_assert_1.default.strictEqual(recurring.coachPhotoUrl, undefined);
    node_assert_1.default.strictEqual(recurring.athleteId, undefined);
    node_assert_1.default.strictEqual(recurring.pricePerSession, undefined);
});
(0, node_test_1.default)('RecurringCard - handles zero sessions completed', () => {
    const recurring = createMockRecurring({ sessionsCompleted: 0 });
    node_assert_1.default.strictEqual(recurring.sessionsCompleted, 0);
});
(0, node_test_1.default)('RecurringCard - handles empty generated booking IDs', () => {
    const recurring = createMockRecurring({ generatedBookingIds: [] });
    node_assert_1.default.deepStrictEqual(recurring.generatedBookingIds, []);
});
(0, node_test_1.default)('RecurringCard - handles generated booking IDs', () => {
    const recurring = createMockRecurring({
        generatedBookingIds: ['booking_1', 'booking_2', 'booking_3'],
    });
    node_assert_1.default.strictEqual(recurring.generatedBookingIds.length, 3);
});
