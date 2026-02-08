"use strict";
/**
 * Calendar Helpers Tests
 *
 * Unit tests for the calendar helper utility functions:
 * - buildCalendarTitle: formats the event title from booking info
 * - buildCalendarNotes: formats the event notes/description from booking info
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
const calendar_helpers_1 = require("../../utils/calendar-helpers");
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const fullBooking = {
    coachName: 'Coach Sarah',
    scheduledAt: '2026-02-15T14:00:00.000Z',
    duration: 60,
    location: 'Hackney Marshes',
    sessionType: '1-on-1 Training',
    price: 45,
};
const minimalBooking = {
    coachName: 'Coach Dave',
    scheduledAt: '2026-03-01T10:00:00.000Z',
    duration: 90,
};
// ---------------------------------------------------------------------------
// buildCalendarTitle
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('buildCalendarTitle', () => {
    (0, node_test_1.default)('should include session type when provided', () => {
        const title = (0, calendar_helpers_1.buildCalendarTitle)(fullBooking);
        node_assert_1.default.strictEqual(title, '1-on-1 Training with Coach Sarah');
    });
    (0, node_test_1.default)('should fall back to "Session" when no session type', () => {
        const title = (0, calendar_helpers_1.buildCalendarTitle)(minimalBooking);
        node_assert_1.default.strictEqual(title, 'Session with Coach Dave');
    });
    (0, node_test_1.default)('should include coach name in all cases', () => {
        const title = (0, calendar_helpers_1.buildCalendarTitle)(fullBooking);
        node_assert_1.default.ok(title.includes('Coach Sarah'));
    });
    (0, node_test_1.default)('should handle empty string session type as falsy', () => {
        const booking = {
            ...minimalBooking,
            sessionType: '',
        };
        const title = (0, calendar_helpers_1.buildCalendarTitle)(booking);
        node_assert_1.default.strictEqual(title, 'Session with Coach Dave');
    });
    (0, node_test_1.default)('should handle various session type strings', () => {
        const types = ['Goalkeeping', 'Small Group', 'Assessment', 'Fitness'];
        for (const sessionType of types) {
            const title = (0, calendar_helpers_1.buildCalendarTitle)({ ...fullBooking, sessionType });
            node_assert_1.default.strictEqual(title, `${sessionType} with Coach Sarah`);
        }
    });
});
// ---------------------------------------------------------------------------
// buildCalendarNotes
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('buildCalendarNotes', () => {
    (0, node_test_1.default)('should include session type when provided', () => {
        const notes = (0, calendar_helpers_1.buildCalendarNotes)(fullBooking);
        node_assert_1.default.ok(notes.includes('Type: 1-on-1 Training'));
    });
    (0, node_test_1.default)('should include price with pound sign when provided', () => {
        const notes = (0, calendar_helpers_1.buildCalendarNotes)(fullBooking);
        node_assert_1.default.ok(notes.includes('Price: \u00A345'));
    });
    (0, node_test_1.default)('should always include "Booked via Clubroom"', () => {
        const notes = (0, calendar_helpers_1.buildCalendarNotes)(fullBooking);
        node_assert_1.default.ok(notes.includes('Booked via Clubroom'));
        const notesMinimal = (0, calendar_helpers_1.buildCalendarNotes)(minimalBooking);
        node_assert_1.default.ok(notesMinimal.includes('Booked via Clubroom'));
    });
    (0, node_test_1.default)('should use newline separator between lines', () => {
        const notes = (0, calendar_helpers_1.buildCalendarNotes)(fullBooking);
        const lines = notes.split('\n');
        node_assert_1.default.strictEqual(lines.length, 3);
        node_assert_1.default.strictEqual(lines[0], 'Type: 1-on-1 Training');
        node_assert_1.default.strictEqual(lines[1], 'Price: \u00A345');
        node_assert_1.default.strictEqual(lines[2], 'Booked via Clubroom');
    });
    (0, node_test_1.default)('should omit session type line when not provided', () => {
        const notes = (0, calendar_helpers_1.buildCalendarNotes)(minimalBooking);
        node_assert_1.default.ok(!notes.includes('Type:'));
        // Should only have "Booked via Clubroom"
        node_assert_1.default.strictEqual(notes, 'Booked via Clubroom');
    });
    (0, node_test_1.default)('should omit price line when not provided', () => {
        const bookingNoPrice = {
            ...fullBooking,
            price: undefined,
        };
        const notes = (0, calendar_helpers_1.buildCalendarNotes)(bookingNoPrice);
        node_assert_1.default.ok(!notes.includes('Price:'));
        const lines = notes.split('\n');
        node_assert_1.default.strictEqual(lines.length, 2);
        node_assert_1.default.strictEqual(lines[0], 'Type: 1-on-1 Training');
        node_assert_1.default.strictEqual(lines[1], 'Booked via Clubroom');
    });
    (0, node_test_1.default)('should include price of 0 (not null)', () => {
        const bookingFreeSession = {
            ...fullBooking,
            price: 0,
        };
        const notes = (0, calendar_helpers_1.buildCalendarNotes)(bookingFreeSession);
        node_assert_1.default.ok(notes.includes('Price: \u00A30'));
    });
    (0, node_test_1.default)('should handle both session type and price missing', () => {
        const notes = (0, calendar_helpers_1.buildCalendarNotes)(minimalBooking);
        node_assert_1.default.strictEqual(notes, 'Booked via Clubroom');
    });
});
