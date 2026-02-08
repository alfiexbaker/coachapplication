"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
const node_module_1 = __importDefault(require("node:module"));
// ---------------------------------------------------------------------------
// Mocks — we override the expo-calendar mock and set up service stubs
// before importing the module under test.
// ---------------------------------------------------------------------------
// Track expo-calendar calls
let calendarCalls = [];
let mockCreateEventResult = 'mock-cal-event-123';
let mockGetPermissionsResult = { status: 'granted' };
let mockCalendarsResult = [
    { id: 'cal-1', isPrimary: true, allowsModifications: true },
];
// Replace the expo-calendar mock with our instrumented version
const calendarMock = {
    getCalendarsAsync: async (...args) => {
        calendarCalls.push({ method: 'getCalendarsAsync', args });
        return mockCalendarsResult;
    },
    createEventAsync: async (...args) => {
        calendarCalls.push({ method: 'createEventAsync', args });
        return mockCreateEventResult;
    },
    updateEventAsync: async (...args) => {
        calendarCalls.push({ method: 'updateEventAsync', args });
    },
    deleteEventAsync: async (...args) => {
        calendarCalls.push({ method: 'deleteEventAsync', args });
    },
    createCalendarAsync: async (...args) => {
        calendarCalls.push({ method: 'createCalendarAsync', args });
        return 'new-cal-id';
    },
    requestCalendarPermissionsAsync: async () => ({ status: 'granted' }),
    getCalendarPermissionsAsync: async () => mockGetPermissionsResult,
    EntityTypes: { EVENT: 'event', REMINDER: 'reminder' },
    CalendarAccessLevel: { OWNER: 'owner', READ: 'read', NONE: 'none' },
};
// Patch the module cache before the import resolves
const calMod = new node_module_1.default('expo-calendar');
calMod.filename = 'expo-calendar';
calMod.loaded = true;
calMod.exports = calendarMock;
node_module_1.default._cache['expo-calendar'] = calMod;
// ---------------------------------------------------------------------------
// Mock booking service & calendar service (lazy loaded via require)
// ---------------------------------------------------------------------------
let mockBooking;
let updateBookingCalls = [];
let mockSyncSettings = null;
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
        getById: async (id) => mockBooking,
        updateBooking: async (id, patch) => {
            updateBookingCalls.push({ id, patch });
            return { success: true };
        },
    },
};
const calendarServiceMock = {
    calendarService: {
        getSyncSettings: async (userId) => mockSyncSettings,
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
const origResolve = node_module_1.default._resolveFilename;
const mockModuleMap = {};
function registerServiceMock(pathSuffix, mockExports) {
    const fakeName = `__mock__${pathSuffix}`;
    mockModuleMap[pathSuffix] = fakeName;
    const mod = new node_module_1.default(fakeName);
    mod.filename = fakeName;
    mod.loaded = true;
    mod.exports = mockExports;
    node_module_1.default._cache[fakeName] = mod;
}
registerServiceMock('services/booking-service', bookingServiceMock);
registerServiceMock('services/calendar-service', calendarServiceMock);
// Patch resolve to intercept .tmp-tests/services/* paths
const prevResolve = node_module_1.default._resolveFilename;
node_module_1.default._resolveFilename = function (request, parent, isMain, options) {
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
const calendar_sync_subscriber_1 = require("../../services/calendar-sync-subscriber");
// ---------------------------------------------------------------------------
// Reset state before each test
// ---------------------------------------------------------------------------
(0, node_test_1.beforeEach)(() => {
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
(0, node_test_1.describe)('handleBookingCreated', () => {
    (0, node_test_1.default)('should create a calendar event when autoSync enabled and permission granted', async () => {
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
        await (0, calendar_sync_subscriber_1.handleBookingCreated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        // Should have called createEventAsync
        const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
        node_assert_1.default.ok(createCall, 'createEventAsync should have been called');
        // Should have persisted calendarEventId via updateBooking
        node_assert_1.default.strictEqual(updateBookingCalls.length, 1);
        node_assert_1.default.strictEqual(updateBookingCalls[0].id, 'booking_1');
        node_assert_1.default.strictEqual(updateBookingCalls[0].patch.calendarEventId, 'mock-cal-event-123');
    });
    (0, node_test_1.default)('should skip when autoSync is disabled', async () => {
        mockSyncSettings = { enabled: true, autoSync: false };
        await (0, calendar_sync_subscriber_1.handleBookingCreated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
        node_assert_1.default.ok(!createCall, 'createEventAsync should NOT be called');
        node_assert_1.default.strictEqual(updateBookingCalls.length, 0);
    });
    (0, node_test_1.default)('should skip when calendar permission not granted', async () => {
        mockSyncSettings = { enabled: true, autoSync: true };
        mockGetPermissionsResult = { status: 'denied' };
        await (0, calendar_sync_subscriber_1.handleBookingCreated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
        node_assert_1.default.ok(!createCall, 'createEventAsync should NOT be called when permission denied');
    });
    (0, node_test_1.default)('should skip when userId is missing', async () => {
        await (0, calendar_sync_subscriber_1.handleBookingCreated)({
            bookingId: 'booking_1',
            userId: '',
            coachId: 'coach_1',
        });
        node_assert_1.default.strictEqual(calendarCalls.length, 0);
        node_assert_1.default.strictEqual(updateBookingCalls.length, 0);
    });
    (0, node_test_1.default)('should skip when booking not found', async () => {
        mockSyncSettings = { enabled: true, autoSync: true };
        mockBooking = undefined;
        await (0, calendar_sync_subscriber_1.handleBookingCreated)({
            bookingId: 'booking_nonexistent',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
        node_assert_1.default.ok(!createCall, 'createEventAsync should NOT be called when booking not found');
    });
    (0, node_test_1.default)('should skip when booking already has a calendarEventId', async () => {
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
        await (0, calendar_sync_subscriber_1.handleBookingCreated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
        node_assert_1.default.ok(!createCall, 'createEventAsync should NOT be called when calendarEventId already set');
    });
    (0, node_test_1.default)('should skip when no writable calendar found', async () => {
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
        await (0, calendar_sync_subscriber_1.handleBookingCreated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
        node_assert_1.default.ok(!createCall, 'createEventAsync should NOT be called when no writable calendar');
    });
    (0, node_test_1.default)('should build correct event title with session type', async () => {
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
        await (0, calendar_sync_subscriber_1.handleBookingCreated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
        node_assert_1.default.ok(createCall, 'createEventAsync should have been called');
        const eventDetails = createCall.args[1];
        node_assert_1.default.strictEqual(eventDetails.title, 'Goalkeeping with Coach Sarah');
    });
    (0, node_test_1.default)('should calculate correct end date from duration', async () => {
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
        await (0, calendar_sync_subscriber_1.handleBookingCreated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        const createCall = calendarCalls.find((c) => c.method === 'createEventAsync');
        node_assert_1.default.ok(createCall);
        const eventDetails = createCall.args[1];
        const start = new Date(eventDetails.startDate);
        const end = new Date(eventDetails.endDate);
        const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        node_assert_1.default.strictEqual(diffMinutes, 90);
    });
    (0, node_test_1.default)('should not crash on calendar API failure (best-effort)', async () => {
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
        await (0, calendar_sync_subscriber_1.handleBookingCreated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        // Restore
        calendarMock.createEventAsync = origCreate;
        // Should not have updated the booking
        node_assert_1.default.strictEqual(updateBookingCalls.length, 0);
    });
});
// ---------------------------------------------------------------------------
// handleBookingUpdated
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('handleBookingUpdated', () => {
    (0, node_test_1.default)('should update calendar event when booking has calendarEventId', async () => {
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
        await (0, calendar_sync_subscriber_1.handleBookingUpdated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            changes: { location: 'Victoria Park' },
        });
        const updateCall = calendarCalls.find((c) => c.method === 'updateEventAsync');
        node_assert_1.default.ok(updateCall, 'updateEventAsync should have been called');
        node_assert_1.default.strictEqual(updateCall.args[0], 'cal-evt-1');
    });
    (0, node_test_1.default)('should skip when changes only contain calendarEventId (infinite loop guard)', async () => {
        mockBooking = {
            id: 'booking_1',
            calendarEventId: 'cal-evt-1',
        };
        await (0, calendar_sync_subscriber_1.handleBookingUpdated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            changes: { calendarEventId: 'cal-evt-1' },
        });
        const updateCall = calendarCalls.find((c) => c.method === 'updateEventAsync');
        node_assert_1.default.ok(!updateCall, 'updateEventAsync should NOT be called for calendarEventId-only change');
    });
    (0, node_test_1.default)('should proceed when changes include calendarEventId AND other fields', async () => {
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
        await (0, calendar_sync_subscriber_1.handleBookingUpdated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            changes: { calendarEventId: 'cal-evt-1', location: 'Updated Location' },
        });
        const updateCall = calendarCalls.find((c) => c.method === 'updateEventAsync');
        node_assert_1.default.ok(updateCall, 'updateEventAsync should be called when other changes exist alongside calendarEventId');
    });
    (0, node_test_1.default)('should skip when booking has no calendarEventId', async () => {
        mockBooking = {
            id: 'booking_1',
            coachId: 'coach_1',
            scheduledAt: '2026-02-15T15:00:00.000Z',
            duration: 60,
            status: 'CONFIRMED',
        };
        await (0, calendar_sync_subscriber_1.handleBookingUpdated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            changes: { location: 'New Place' },
        });
        const updateCall = calendarCalls.find((c) => c.method === 'updateEventAsync');
        node_assert_1.default.ok(!updateCall, 'updateEventAsync should NOT be called without calendarEventId');
    });
    (0, node_test_1.default)('should skip when booking not found', async () => {
        mockBooking = undefined;
        await (0, calendar_sync_subscriber_1.handleBookingUpdated)({
            bookingId: 'booking_nonexistent',
            userId: 'user_1',
            changes: { location: 'New Place' },
        });
        const updateCall = calendarCalls.find((c) => c.method === 'updateEventAsync');
        node_assert_1.default.ok(!updateCall, 'updateEventAsync should NOT be called when booking not found');
    });
    (0, node_test_1.default)('should skip when calendar permission not granted', async () => {
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
        await (0, calendar_sync_subscriber_1.handleBookingUpdated)({
            bookingId: 'booking_1',
            userId: 'user_1',
            changes: { location: 'New Place' },
        });
        const updateCall = calendarCalls.find((c) => c.method === 'updateEventAsync');
        node_assert_1.default.ok(!updateCall, 'updateEventAsync should NOT be called without permission');
    });
    (0, node_test_1.default)('should not crash on calendar API failure', async () => {
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
        await (0, calendar_sync_subscriber_1.handleBookingUpdated)({
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
(0, node_test_1.describe)('handleBookingCancelled', () => {
    (0, node_test_1.default)('should delete calendar event and clear calendarEventId', async () => {
        mockBooking = {
            id: 'booking_1',
            coachId: 'coach_1',
            calendarEventId: 'cal-evt-1',
            status: 'CANCELLED',
        };
        await (0, calendar_sync_subscriber_1.handleBookingCancelled)({
            bookingId: 'booking_1',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        // Should have called deleteEventAsync with the correct event ID
        const deleteCall = calendarCalls.find((c) => c.method === 'deleteEventAsync');
        node_assert_1.default.ok(deleteCall, 'deleteEventAsync should have been called');
        node_assert_1.default.strictEqual(deleteCall.args[0], 'cal-evt-1');
        // Should have cleared calendarEventId on the booking
        node_assert_1.default.strictEqual(updateBookingCalls.length, 1);
        node_assert_1.default.strictEqual(updateBookingCalls[0].id, 'booking_1');
        node_assert_1.default.strictEqual(updateBookingCalls[0].patch.calendarEventId, undefined);
    });
    (0, node_test_1.default)('should skip when booking has no calendarEventId', async () => {
        mockBooking = {
            id: 'booking_1',
            coachId: 'coach_1',
            status: 'CANCELLED',
        };
        await (0, calendar_sync_subscriber_1.handleBookingCancelled)({
            bookingId: 'booking_1',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        const deleteCall = calendarCalls.find((c) => c.method === 'deleteEventAsync');
        node_assert_1.default.ok(!deleteCall, 'deleteEventAsync should NOT be called without calendarEventId');
        node_assert_1.default.strictEqual(updateBookingCalls.length, 0);
    });
    (0, node_test_1.default)('should skip when booking not found', async () => {
        mockBooking = undefined;
        await (0, calendar_sync_subscriber_1.handleBookingCancelled)({
            bookingId: 'booking_nonexistent',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        const deleteCall = calendarCalls.find((c) => c.method === 'deleteEventAsync');
        node_assert_1.default.ok(!deleteCall, 'deleteEventAsync should NOT be called when booking not found');
    });
    (0, node_test_1.default)('should skip when calendar permission not granted', async () => {
        mockBooking = {
            id: 'booking_1',
            coachId: 'coach_1',
            calendarEventId: 'cal-evt-1',
            status: 'CANCELLED',
        };
        mockGetPermissionsResult = { status: 'denied' };
        await (0, calendar_sync_subscriber_1.handleBookingCancelled)({
            bookingId: 'booking_1',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        const deleteCall = calendarCalls.find((c) => c.method === 'deleteEventAsync');
        node_assert_1.default.ok(!deleteCall, 'deleteEventAsync should NOT be called without permission');
        node_assert_1.default.strictEqual(updateBookingCalls.length, 0);
    });
    (0, node_test_1.default)('should not crash on calendar API failure', async () => {
        mockBooking = {
            id: 'booking_1',
            coachId: 'coach_1',
            calendarEventId: 'cal-evt-1',
            status: 'CANCELLED',
        };
        const origDelete = calendarMock.deleteEventAsync;
        calendarMock.deleteEventAsync = async () => { throw new Error('Calendar delete failed'); };
        // Should not throw
        await (0, calendar_sync_subscriber_1.handleBookingCancelled)({
            bookingId: 'booking_1',
            userId: 'user_1',
            coachId: 'coach_1',
        });
        calendarMock.deleteEventAsync = origDelete;
        // Should NOT have called updateBooking since deleteEventAsync threw
        node_assert_1.default.strictEqual(updateBookingCalls.length, 0);
    });
});
