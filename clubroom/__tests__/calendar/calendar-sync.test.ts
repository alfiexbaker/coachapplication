/**
 * Calendar Sync Subscriber Tests
 *
 * Unit tests for the calendar sync event handlers:
 * - handleBookingCreated: creates a calendar event when autoSync is enabled
 * - handleBookingUpdated: updates calendar event; guards against infinite loop
 * - handleBookingCancelled: deletes calendar event and clears calendarEventId
 *
 * All expo-calendar calls and service dependencies are mocked.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';
import Module from 'node:module';

// ---------------------------------------------------------------------------
// Mocks — we override the expo-calendar mock and set up service stubs
// before importing the module under test.
// ---------------------------------------------------------------------------

// Track expo-calendar calls
let calendarCalls: { method: string; args: unknown[] }[] = [];
let mockCreateEventResult = 'mock-cal-event-123';
let mockGetPermissionsResult = { status: 'granted' as string };
let mockCalendarsResult: unknown[] = [
  { id: 'cal-1', isPrimary: true, allowsModifications: true },
];

// Replace the expo-calendar mock with our instrumented version
const calendarMock = {
  getCalendarsAsync: async (...args: unknown[]) => {
    calendarCalls.push({ method: 'getCalendarsAsync', args });
    return mockCalendarsResult;
  },
  createEventAsync: async (...args: unknown[]) => {
    calendarCalls.push({ method: 'createEventAsync', args });
    return mockCreateEventResult;
  },
  updateEventAsync: async (...args: unknown[]) => {
    calendarCalls.push({ method: 'updateEventAsync', args });
  },
  deleteEventAsync: async (...args: unknown[]) => {
    calendarCalls.push({ method: 'deleteEventAsync', args });
  },
  createCalendarAsync: async (...args: unknown[]) => {
    calendarCalls.push({ method: 'createCalendarAsync', args });
    return 'new-cal-id';
  },
  requestCalendarPermissionsAsync: async () => ({ status: 'granted' }),
  getCalendarPermissionsAsync: async () => mockGetPermissionsResult,
  EntityTypes: { EVENT: 'event', REMINDER: 'reminder' },
  CalendarAccessLevel: { OWNER: 'owner', READ: 'read', NONE: 'none' },
};

// Patch the module cache before the import resolves
const calMod = new Module('expo-calendar');
(calMod as any).filename = 'expo-calendar';
(calMod as any).loaded = true;
calMod.exports = calendarMock;
(Module as any)._cache['expo-calendar'] = calMod;

// ---------------------------------------------------------------------------
// Mock booking service & calendar service (lazy loaded via require)
// ---------------------------------------------------------------------------

let mockBooking: Record<string, unknown> | undefined;
let updateBookingCalls: { id: string; patch: Record<string, unknown> }[] = [];

let mockSyncSettings: { enabled: boolean; autoSync: boolean } | null = null;

// We need to mock the services that calendar-sync-subscriber loads lazily.
// The subscriber uses:
//   require('@/services/booking-service').bookingService
//   require('@/services/calendar-service').calendarService
//
// Since test-register.js rewrites @/ to .tmp-tests/, we need to ensure
// those modules resolve to our mocks. We'll use a require hook approach.

// We cannot easily pre-seed the .tmp-tests paths, so instead we'll
// mock at the module level by creating stub modules in the cache.

const bookingServiceMock = {
  bookingService: {
    getById: async (id: string) => mockBooking,
    updateBooking: async (id: string, patch: Record<string, unknown>) => {
      updateBookingCalls.push({ id, patch });
      return { success: true };
    },
  },
};

const calendarServiceMock = {
  calendarService: {
    getSyncSettings: async (userId: string) => mockSyncSettings,
    getDefaultSettings: () => ({
      enabled: false,
      provider: 'APPLE',
      autoSync: false,
      reminderMinutes: 60,
      includeLocation: true,
      includeNotes: true,
    }),
  },
};

// We need to intercept the @/ require paths. Since test-register.js
// translates @/services/booking-service -> .tmp-tests/services/booking-service,
// we'll hook into _resolveFilename to catch those and return our mock module names.

const origResolve = (Module as any)._resolveFilename;
const mockModuleMap: Record<string, unknown> = {};

function registerServiceMock(pathSuffix: string, mockExports: unknown): void {
  const fakeName = `__mock__${pathSuffix}`;
  mockModuleMap[pathSuffix] = fakeName;

  const mod = new Module(fakeName);
  (mod as any).filename = fakeName;
  (mod as any).loaded = true;
  mod.exports = mockExports;
  (Module as any)._cache[fakeName] = mod;
}

registerServiceMock('services/booking-service', bookingServiceMock);
registerServiceMock('services/calendar-service', calendarServiceMock);

// Patch resolve to intercept .tmp-tests/services/* paths
const prevResolve = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
  // Check if request ends with a known mock path
  for (const [suffix, fakeName] of Object.entries(mockModuleMap)) {
    if (request.endsWith(suffix) || request.endsWith(suffix + '.js') || request.endsWith(suffix + '/index')) {
      return fakeName;
    }
  }
  return prevResolve.call(this, request, parent, isMain, options);
};

// ---------------------------------------------------------------------------
// Now import the module under test
// ---------------------------------------------------------------------------

import {
  handleBookingCreated,
  handleBookingUpdated,
  handleBookingCancelled,
} from '../../services/calendar-sync-subscriber';

// ---------------------------------------------------------------------------
// Reset state before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  calendarCalls = [];
  updateBookingCalls = [];
  mockBooking = undefined;
  mockSyncSettings = null;
  mockCreateEventResult = 'mock-cal-event-123';
  mockGetPermissionsResult = { status: 'granted' };
  mockCalendarsResult = [
    { id: 'cal-1', isPrimary: true, allowsModifications: true },
  ];
});

// ---------------------------------------------------------------------------
// handleBookingCreated
// ---------------------------------------------------------------------------

describe('handleBookingCreated', () => {
  test('should create a calendar event when autoSync enabled and permission granted', async () => {
    mockSyncSettings = { enabled: true, autoSync: true };
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      coachName: 'Coach Sarah',
      scheduledAt: '2026-02-15T14:00:00.000Z',
      duration: 60,
      location: 'Hackney Marshes',
      service: '1-on-1 Training',
      price: 45,
      status: 'CONFIRMED',
    };

    await handleBookingCreated({
      bookingId: 'booking_1',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    // Should have called createEventAsync
    const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
    assert.ok(createCall, 'createEventAsync should have been called');

    // Should have persisted calendarEventId via updateBooking
    assert.strictEqual(updateBookingCalls.length, 1);
    assert.strictEqual(updateBookingCalls[0].id, 'booking_1');
    assert.strictEqual(updateBookingCalls[0].patch.calendarEventId, 'mock-cal-event-123');
  });

  test('should skip when autoSync is disabled', async () => {
    mockSyncSettings = { enabled: true, autoSync: false };

    await handleBookingCreated({
      bookingId: 'booking_1',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
    assert.ok(!createCall, 'createEventAsync should NOT be called');
    assert.strictEqual(updateBookingCalls.length, 0);
  });

  test('should skip when calendar permission not granted', async () => {
    mockSyncSettings = { enabled: true, autoSync: true };
    mockGetPermissionsResult = { status: 'denied' };

    await handleBookingCreated({
      bookingId: 'booking_1',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
    assert.ok(!createCall, 'createEventAsync should NOT be called when permission denied');
  });

  test('should skip when userId is missing', async () => {
    await handleBookingCreated({
      bookingId: 'booking_1',
      userId: '',
      coachId: 'coach_1',
    });

    assert.strictEqual(calendarCalls.length, 0);
    assert.strictEqual(updateBookingCalls.length, 0);
  });

  test('should skip when booking not found', async () => {
    mockSyncSettings = { enabled: true, autoSync: true };
    mockBooking = undefined;

    await handleBookingCreated({
      bookingId: 'booking_nonexistent',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
    assert.ok(!createCall, 'createEventAsync should NOT be called when booking not found');
  });

  test('should skip when booking already has a calendarEventId', async () => {
    mockSyncSettings = { enabled: true, autoSync: true };
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      coachName: 'Coach Sarah',
      scheduledAt: '2026-02-15T14:00:00.000Z',
      duration: 60,
      location: 'Hackney Marshes',
      calendarEventId: 'existing-event-id',
      status: 'CONFIRMED',
    };

    await handleBookingCreated({
      bookingId: 'booking_1',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
    assert.ok(!createCall, 'createEventAsync should NOT be called when calendarEventId already set');
  });

  test('should skip when no writable calendar found', async () => {
    mockSyncSettings = { enabled: true, autoSync: true };
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      coachName: 'Coach Sarah',
      scheduledAt: '2026-02-15T14:00:00.000Z',
      duration: 60,
      location: 'Hackney Marshes',
      status: 'CONFIRMED',
    };
    mockCalendarsResult = []; // No calendars available

    await handleBookingCreated({
      bookingId: 'booking_1',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
    assert.ok(!createCall, 'createEventAsync should NOT be called when no writable calendar');
  });

  test('should build correct event title with session type', async () => {
    mockSyncSettings = { enabled: true, autoSync: true };
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      coachName: 'Coach Sarah',
      scheduledAt: '2026-02-15T14:00:00.000Z',
      duration: 60,
      location: 'Hackney Marshes',
      serviceType: 'Goalkeeping',
      status: 'CONFIRMED',
    };

    await handleBookingCreated({
      bookingId: 'booking_1',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
    assert.ok(createCall, 'createEventAsync should have been called');
    const eventDetails = createCall.args[1] as Record<string, unknown>;
    assert.strictEqual(eventDetails.title, 'Goalkeeping with Coach Sarah');
  });

  test('should calculate correct end date from duration', async () => {
    mockSyncSettings = { enabled: true, autoSync: true };
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      coachName: 'Coach Sarah',
      scheduledAt: '2026-02-15T14:00:00.000Z',
      duration: 90,
      location: 'Hackney Marshes',
      status: 'CONFIRMED',
    };

    await handleBookingCreated({
      bookingId: 'booking_1',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
    assert.ok(createCall);
    const eventDetails = createCall.args[1] as Record<string, unknown>;
    const start = new Date(eventDetails.startDate as string);
    const end = new Date(eventDetails.endDate as string);
    const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    assert.strictEqual(diffMinutes, 90);
  });

  test('should not crash on calendar API failure (best-effort)', async () => {
    mockSyncSettings = { enabled: true, autoSync: true };
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      coachName: 'Coach Sarah',
      scheduledAt: '2026-02-15T14:00:00.000Z',
      duration: 60,
      location: 'Hackney Marshes',
      status: 'CONFIRMED',
    };

    // Make createEventAsync throw
    const origCreate = calendarMock.createEventAsync;
    calendarMock.createEventAsync = async () => { throw new Error('Calendar API failed'); };

    // Should not throw
    await handleBookingCreated({
      bookingId: 'booking_1',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    // Restore
    calendarMock.createEventAsync = origCreate;

    // Should not have updated the booking
    assert.strictEqual(updateBookingCalls.length, 0);
  });
});

// ---------------------------------------------------------------------------
// handleBookingUpdated
// ---------------------------------------------------------------------------

describe('handleBookingUpdated', () => {
  test('should update calendar event when booking has calendarEventId', async () => {
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      coachName: 'Coach Sarah',
      scheduledAt: '2026-02-15T15:00:00.000Z',
      duration: 60,
      location: 'Victoria Park',
      calendarEventId: 'cal-evt-1',
      status: 'CONFIRMED',
    };

    await handleBookingUpdated({
      bookingId: 'booking_1',
      userId: 'user_1',
      changes: { location: 'Victoria Park' },
    });

    const updateCall = calendarCalls.find((c) => c.method === 'updateEventAsync');
    assert.ok(updateCall, 'updateEventAsync should have been called');
    assert.strictEqual(updateCall.args[0], 'cal-evt-1');
  });

  test('should skip when changes only contain calendarEventId (infinite loop guard)', async () => {
    mockBooking = {
      id: 'booking_1',
      calendarEventId: 'cal-evt-1',
    };

    await handleBookingUpdated({
      bookingId: 'booking_1',
      userId: 'user_1',
      changes: { calendarEventId: 'cal-evt-1' },
    });

    const updateCall = calendarCalls.find((c) => c.method === 'updateEventAsync');
    assert.ok(!updateCall, 'updateEventAsync should NOT be called for calendarEventId-only change');
  });

  test('should proceed when changes include calendarEventId AND other fields', async () => {
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      coachName: 'Coach Sarah',
      scheduledAt: '2026-02-15T15:00:00.000Z',
      duration: 60,
      location: 'Updated Location',
      calendarEventId: 'cal-evt-1',
      status: 'CONFIRMED',
    };

    await handleBookingUpdated({
      bookingId: 'booking_1',
      userId: 'user_1',
      changes: { calendarEventId: 'cal-evt-1', location: 'Updated Location' },
    });

    const updateCall = calendarCalls.find((c) => c.method === 'updateEventAsync');
    assert.ok(updateCall, 'updateEventAsync should be called when other changes exist alongside calendarEventId');
  });

  test('should skip when booking has no calendarEventId', async () => {
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      scheduledAt: '2026-02-15T15:00:00.000Z',
      duration: 60,
      status: 'CONFIRMED',
    };

    await handleBookingUpdated({
      bookingId: 'booking_1',
      userId: 'user_1',
      changes: { location: 'New Place' },
    });

    const updateCall = calendarCalls.find((c) => c.method === 'updateEventAsync');
    assert.ok(!updateCall, 'updateEventAsync should NOT be called without calendarEventId');
  });

  test('should skip when booking not found', async () => {
    mockBooking = undefined;

    await handleBookingUpdated({
      bookingId: 'booking_nonexistent',
      userId: 'user_1',
      changes: { location: 'New Place' },
    });

    const updateCall = calendarCalls.find((c) => c.method === 'updateEventAsync');
    assert.ok(!updateCall, 'updateEventAsync should NOT be called when booking not found');
  });

  test('should skip when calendar permission not granted', async () => {
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      coachName: 'Coach Sarah',
      scheduledAt: '2026-02-15T15:00:00.000Z',
      duration: 60,
      calendarEventId: 'cal-evt-1',
      status: 'CONFIRMED',
    };
    mockGetPermissionsResult = { status: 'denied' };

    await handleBookingUpdated({
      bookingId: 'booking_1',
      userId: 'user_1',
      changes: { location: 'New Place' },
    });

    const updateCall = calendarCalls.find((c) => c.method === 'updateEventAsync');
    assert.ok(!updateCall, 'updateEventAsync should NOT be called without permission');
  });

  test('should not crash on calendar API failure', async () => {
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      coachName: 'Coach Sarah',
      scheduledAt: '2026-02-15T15:00:00.000Z',
      duration: 60,
      location: 'Somewhere',
      calendarEventId: 'cal-evt-1',
      status: 'CONFIRMED',
    };

    const origUpdate = calendarMock.updateEventAsync;
    calendarMock.updateEventAsync = async () => { throw new Error('Calendar update failed'); };

    // Should not throw
    await handleBookingUpdated({
      bookingId: 'booking_1',
      userId: 'user_1',
      changes: { location: 'Somewhere' },
    });

    calendarMock.updateEventAsync = origUpdate;
  });
});

// ---------------------------------------------------------------------------
// handleBookingCancelled
// ---------------------------------------------------------------------------

describe('handleBookingCancelled', () => {
  test('should delete calendar event and clear calendarEventId', async () => {
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      calendarEventId: 'cal-evt-1',
      status: 'CANCELLED',
    };

    await handleBookingCancelled({
      bookingId: 'booking_1',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    // Should have called deleteEventAsync with the correct event ID
    const deleteCall = calendarCalls.find((c) => c.method === 'deleteEventAsync');
    assert.ok(deleteCall, 'deleteEventAsync should have been called');
    assert.strictEqual(deleteCall.args[0], 'cal-evt-1');

    // Should have cleared calendarEventId on the booking
    assert.strictEqual(updateBookingCalls.length, 1);
    assert.strictEqual(updateBookingCalls[0].id, 'booking_1');
    assert.strictEqual(updateBookingCalls[0].patch.calendarEventId, undefined);
  });

  test('should skip when booking has no calendarEventId', async () => {
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      status: 'CANCELLED',
    };

    await handleBookingCancelled({
      bookingId: 'booking_1',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    const deleteCall = calendarCalls.find((c) => c.method === 'deleteEventAsync');
    assert.ok(!deleteCall, 'deleteEventAsync should NOT be called without calendarEventId');
    assert.strictEqual(updateBookingCalls.length, 0);
  });

  test('should skip when booking not found', async () => {
    mockBooking = undefined;

    await handleBookingCancelled({
      bookingId: 'booking_nonexistent',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    const deleteCall = calendarCalls.find((c) => c.method === 'deleteEventAsync');
    assert.ok(!deleteCall, 'deleteEventAsync should NOT be called when booking not found');
  });

  test('should skip when calendar permission not granted', async () => {
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      calendarEventId: 'cal-evt-1',
      status: 'CANCELLED',
    };
    mockGetPermissionsResult = { status: 'denied' };

    await handleBookingCancelled({
      bookingId: 'booking_1',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    const deleteCall = calendarCalls.find((c) => c.method === 'deleteEventAsync');
    assert.ok(!deleteCall, 'deleteEventAsync should NOT be called without permission');
    assert.strictEqual(updateBookingCalls.length, 0);
  });

  test('should not crash on calendar API failure', async () => {
    mockBooking = {
      id: 'booking_1',
      coachId: 'coach_1',
      calendarEventId: 'cal-evt-1',
      status: 'CANCELLED',
    };

    const origDelete = calendarMock.deleteEventAsync;
    calendarMock.deleteEventAsync = async () => { throw new Error('Calendar delete failed'); };

    // Should not throw
    await handleBookingCancelled({
      bookingId: 'booking_1',
      userId: 'user_1',
      coachId: 'coach_1',
    });

    calendarMock.deleteEventAsync = origDelete;

    // Should NOT have called updateBooking since deleteEventAsync threw
    assert.strictEqual(updateBookingCalls.length, 0);
  });
});
