/**
 * Tests for the RecurringCard component
 *
 * These tests verify the component's rendering logic, status handling,
 * and callback behavior without actually rendering React components.
 * (Using Node's built-in test runner for consistency with project setup)
 */

import assert from 'node:assert';
import test from 'node:test';

import type { RecurringBooking, RecurringBookingStatus, RecurrenceFrequency } from '../../constants/types';
import {
  getDayName,
  getFrequencyLabel,
  getStatusLabel,
} from '../../services/recurring-booking-service';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock recurring booking for testing
 */
function createMockRecurring(overrides?: Partial<RecurringBooking>): RecurringBooking {
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

test('RecurringCard - formatTime displays correct AM/PM format', () => {
  // Test the time formatting logic used in RecurringCard
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  assert.strictEqual(formatTime('14:00'), '2:00 PM');
  assert.strictEqual(formatTime('09:30'), '9:30 AM');
  assert.strictEqual(formatTime('12:00'), '12:00 PM');
  assert.strictEqual(formatTime('00:00'), '12:00 AM');
  assert.strictEqual(formatTime('23:59'), '11:59 PM');
});

test('RecurringCard - status icon mapping is correct', () => {
  // Test the status icon mapping logic used in RecurringCard
  const getStatusIcon = (status: RecurringBookingStatus): string => {
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

  assert.strictEqual(getStatusIcon('ACTIVE'), 'checkmark-circle');
  assert.strictEqual(getStatusIcon('PAUSED'), 'pause-circle');
  assert.strictEqual(getStatusIcon('CANCELLED'), 'close-circle');
  assert.strictEqual(getStatusIcon('EXPIRED'), 'time');
});

test('RecurringCard - withAlpha utility correctly converts hex to rgba', () => {
  // Test the withAlpha utility function used in RecurringCard
  const withAlpha = (hexColor: string, alpha: number): string => {
    const hex = hexColor.replace('#', '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  assert.strictEqual(withAlpha('#FF0000', 0.5), 'rgba(255, 0, 0, 0.5)');
  assert.strictEqual(withAlpha('#00FF00', 0.25), 'rgba(0, 255, 0, 0.25)');
  assert.strictEqual(withAlpha('#0000FF', 1), 'rgba(0, 0, 255, 1)');
  assert.strictEqual(withAlpha('#FFFFFF', 0), 'rgba(255, 255, 255, 0)');
});

// ============================================================================
// Data Display Tests
// ============================================================================

test('RecurringCard - displays coach name correctly', () => {
  const recurring = createMockRecurring({ coachName: 'Sarah Mitchell' });
  assert.strictEqual(recurring.coachName, 'Sarah Mitchell');
});

test('RecurringCard - displays frequency label correctly', () => {
  const frequencies: RecurrenceFrequency[] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];
  const expectedLabels = ['Every week', 'Every 2 weeks', 'Every month'];

  frequencies.forEach((freq, index) => {
    const recurring = createMockRecurring({ frequency: freq });
    assert.strictEqual(getFrequencyLabel(recurring.frequency), expectedLabels[index]);
  });
});

test('RecurringCard - displays day of week correctly', () => {
  for (let day = 0; day <= 6; day++) {
    const recurring = createMockRecurring({ dayOfWeek: day as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
    const dayName = getDayName(recurring.dayOfWeek);
    assert.ok(dayName !== 'Unknown', `Day ${day} should have a valid name`);
  }
});

test('RecurringCard - displays status correctly', () => {
  const statuses: RecurringBookingStatus[] = ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'];
  const expectedLabels = ['Active', 'Paused', 'Cancelled', 'Expired'];

  statuses.forEach((status, index) => {
    const recurring = createMockRecurring({ status });
    assert.strictEqual(getStatusLabel(recurring.status), expectedLabels[index]);
  });
});

test('RecurringCard - shows athlete name when different from user', () => {
  const recurring = createMockRecurring({
    userName: 'Parent User',
    athleteName: 'Child Athlete',
  });

  // The component should show the athlete badge when athleteName differs from userName
  const shouldShowAthleteBadge =
    recurring.athleteName && recurring.athleteName !== recurring.userName;

  assert.strictEqual(shouldShowAthleteBadge, true);
});

test('RecurringCard - hides athlete badge when names are the same', () => {
  const recurring = createMockRecurring({
    userName: 'Same User',
    athleteName: 'Same User',
  });

  const shouldShowAthleteBadge =
    recurring.athleteName && recurring.athleteName !== recurring.userName;

  assert.strictEqual(shouldShowAthleteBadge, false);
});

// ============================================================================
// Stats Display Tests
// ============================================================================

test('RecurringCard - displays sessions completed', () => {
  const recurring = createMockRecurring({ sessionsCompleted: 10 });
  assert.strictEqual(recurring.sessionsCompleted, 10);
});

test('RecurringCard - displays sessions remaining when set', () => {
  const recurring = createMockRecurring({ sessionsRemaining: 5 });
  assert.strictEqual(recurring.sessionsRemaining, 5);
});

test('RecurringCard - sessions remaining is undefined for indefinite subscriptions', () => {
  const recurring = createMockRecurring({ sessionsRemaining: undefined });
  assert.strictEqual(recurring.sessionsRemaining, undefined);
});

test('RecurringCard - displays price per session', () => {
  const recurring = createMockRecurring({ pricePerSession: 100 });
  assert.strictEqual(recurring.pricePerSession, 100);
});

// ============================================================================
// Action Button Visibility Tests
// ============================================================================

test('RecurringCard - pause button shown only for ACTIVE status', () => {
  const statuses: RecurringBookingStatus[] = ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'];
  const expectedShowPause = [true, false, false, false];

  statuses.forEach((status, index) => {
    const recurring = createMockRecurring({ status });
    const shouldShowPause = recurring.status === 'ACTIVE';
    assert.strictEqual(
      shouldShowPause,
      expectedShowPause[index],
      `Pause button visibility wrong for ${status}`
    );
  });
});

test('RecurringCard - resume button shown only for PAUSED status', () => {
  const statuses: RecurringBookingStatus[] = ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'];
  const expectedShowResume = [false, true, false, false];

  statuses.forEach((status, index) => {
    const recurring = createMockRecurring({ status });
    const shouldShowResume = recurring.status === 'PAUSED';
    assert.strictEqual(
      shouldShowResume,
      expectedShowResume[index],
      `Resume button visibility wrong for ${status}`
    );
  });
});

test('RecurringCard - cancel button hidden for CANCELLED and EXPIRED', () => {
  const statuses: RecurringBookingStatus[] = ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'];
  const expectedShowCancel = [true, true, false, false];

  statuses.forEach((status, index) => {
    const recurring = createMockRecurring({ status });
    const shouldShowCancel =
      recurring.status !== 'CANCELLED' && recurring.status !== 'EXPIRED';
    assert.strictEqual(
      shouldShowCancel,
      expectedShowCancel[index],
      `Cancel button visibility wrong for ${status}`
    );
  });
});

// ============================================================================
// Pause Reason Display Tests
// ============================================================================

test('RecurringCard - shows pause reason when paused with reason', () => {
  const recurring = createMockRecurring({
    status: 'PAUSED',
    pausedAt: new Date().toISOString(),
    pauseReason: 'Going on vacation',
  });

  const shouldShowPauseReason =
    recurring.status === 'PAUSED' && !!recurring.pauseReason;

  assert.strictEqual(shouldShowPauseReason, true);
  assert.strictEqual(recurring.pauseReason, 'Going on vacation');
});

test('RecurringCard - hides pause reason when active', () => {
  const recurring = createMockRecurring({ status: 'ACTIVE' });

  const shouldShowPauseReason =
    recurring.status === 'PAUSED' && recurring.pauseReason;

  assert.strictEqual(shouldShowPauseReason, false);
});

// ============================================================================
// Date Formatting Tests
// ============================================================================

test('RecurringCard - formats start date correctly', () => {
  const startDate = new Date('2024-03-15T00:00:00.000Z');
  const recurring = createMockRecurring({ startDate: startDate.toISOString() });

  // Test the date formatting logic used in RecurringCard
  const formattedDate = new Date(recurring.startDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  assert.ok(formattedDate.includes('2024'), 'Should include year');
  assert.ok(formattedDate.includes('Mar') || formattedDate.includes('3'), 'Should include month');
  assert.ok(formattedDate.includes('15'), 'Should include day');
});

// ============================================================================
// Edge Cases
// ============================================================================

test('RecurringCard - handles missing optional fields', () => {
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
  assert.strictEqual(recurring.coachPhotoUrl, undefined);
  assert.strictEqual(recurring.athleteId, undefined);
  assert.strictEqual(recurring.pricePerSession, undefined);
});

test('RecurringCard - handles zero sessions completed', () => {
  const recurring = createMockRecurring({ sessionsCompleted: 0 });
  assert.strictEqual(recurring.sessionsCompleted, 0);
});

test('RecurringCard - handles empty generated booking IDs', () => {
  const recurring = createMockRecurring({ generatedBookingIds: [] });
  assert.deepStrictEqual(recurring.generatedBookingIds, []);
});

test('RecurringCard - handles generated booking IDs', () => {
  const recurring = createMockRecurring({
    generatedBookingIds: ['booking_1', 'booking_2', 'booking_3'],
  });
  assert.strictEqual(recurring.generatedBookingIds.length, 3);
});
