"use strict";
/**
 * Calendar Service Tests
 *
 * Unit tests for the calendar service functionality including
 * ICS generation, calendar event conversion, and sync settings management.
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
const calendar_service_1 = require("../../services/calendar-service");
// Mock booking data
const mockBooking = {
    id: 'booking_123',
    coachId: 'coach_1',
    athleteId: 'athlete_1',
    bookedById: 'parent_1',
    status: 'CONFIRMED',
    scheduledAt: '2026-02-15T14:00:00.000Z',
    duration: 60,
    location: 'Hackney Marshes',
    notes: 'Focus on dribbling',
    coachName: 'Coach Sarah',
    athleteName: 'Tom Henderson',
    service: '1-on-1 Training',
};
const mockBookingNoOptionals = {
    id: 'booking_456',
    coachId: 'coach_2',
    athleteId: 'athlete_2',
    bookedById: 'parent_2',
    status: 'PENDING',
    scheduledAt: '2026-03-01T10:00:00.000Z',
    duration: 90,
    location: '',
};
(0, node_test_1.describe)('Calendar Service', () => {
    (0, node_test_1.describe)('bookingToEvent', () => {
        (0, node_test_1.default)('should convert a booking to a calendar event', () => {
            const event = calendar_service_1.calendarService.bookingToEvent(mockBooking);
            node_assert_1.default.strictEqual(event.id, 'booking_123');
            node_assert_1.default.strictEqual(event.title, 'Training Session with Coach Sarah');
            node_assert_1.default.strictEqual(event.startTime, '2026-02-15T14:00:00.000Z');
            node_assert_1.default.strictEqual(event.location, 'Hackney Marshes');
            node_assert_1.default.ok(event.description.includes('1-on-1 Training'));
            node_assert_1.default.ok(event.description.includes('Focus on dribbling'));
            node_assert_1.default.ok(event.description.includes('Tom Henderson'));
            node_assert_1.default.strictEqual(event.coachName, 'Coach Sarah');
            node_assert_1.default.strictEqual(event.athleteName, 'Tom Henderson');
            node_assert_1.default.strictEqual(event.bookingId, 'booking_123');
        });
        (0, node_test_1.default)('should calculate end time based on duration', () => {
            const event = calendar_service_1.calendarService.bookingToEvent(mockBooking);
            const startTime = new Date(event.startTime);
            const endTime = new Date(event.endTime);
            const diffMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
            node_assert_1.default.strictEqual(diffMinutes, 60);
        });
        (0, node_test_1.default)('should handle booking without optional fields', () => {
            const event = calendar_service_1.calendarService.bookingToEvent(mockBookingNoOptionals);
            node_assert_1.default.strictEqual(event.id, 'booking_456');
            node_assert_1.default.strictEqual(event.title, 'Training Session');
            node_assert_1.default.strictEqual(event.location, '');
            node_assert_1.default.strictEqual(event.coachName, undefined);
            node_assert_1.default.strictEqual(event.athleteName, undefined);
        });
        (0, node_test_1.default)('should handle different durations', () => {
            const shortBooking = { ...mockBooking, duration: 30 };
            const longBooking = { ...mockBooking, duration: 120 };
            const shortEvent = calendar_service_1.calendarService.bookingToEvent(shortBooking);
            const longEvent = calendar_service_1.calendarService.bookingToEvent(longBooking);
            const shortDiff = (new Date(shortEvent.endTime).getTime() - new Date(shortEvent.startTime).getTime()) /
                (1000 * 60);
            const longDiff = (new Date(longEvent.endTime).getTime() - new Date(longEvent.startTime).getTime()) /
                (1000 * 60);
            node_assert_1.default.strictEqual(shortDiff, 30);
            node_assert_1.default.strictEqual(longDiff, 120);
        });
    });
    (0, node_test_1.describe)('getICSContent', () => {
        (0, node_test_1.default)('should generate valid ICS format', async () => {
            const icsContent = await calendar_service_1.calendarService.getICSContent(mockBooking);
            // Check ICS structure
            node_assert_1.default.ok(icsContent.includes('BEGIN:VCALENDAR'));
            node_assert_1.default.ok(icsContent.includes('END:VCALENDAR'));
            node_assert_1.default.ok(icsContent.includes('BEGIN:VEVENT'));
            node_assert_1.default.ok(icsContent.includes('END:VEVENT'));
            node_assert_1.default.ok(icsContent.includes('VERSION:2.0'));
            node_assert_1.default.ok(icsContent.includes('PRODID:-//Clubroom//Calendar Export//EN'));
        });
        (0, node_test_1.default)('should include event details in ICS', async () => {
            const icsContent = await calendar_service_1.calendarService.getICSContent(mockBooking);
            node_assert_1.default.ok(icsContent.includes('SUMMARY:Training Session with Coach Sarah'));
            node_assert_1.default.ok(icsContent.includes('LOCATION:Hackney Marshes'));
            node_assert_1.default.ok(icsContent.includes('UID:booking_123@clubroom.app'));
        });
        (0, node_test_1.default)('should include DTSTART and DTEND', async () => {
            const icsContent = await calendar_service_1.calendarService.getICSContent(mockBooking);
            node_assert_1.default.ok(icsContent.includes('DTSTART:'));
            node_assert_1.default.ok(icsContent.includes('DTEND:'));
        });
        (0, node_test_1.default)('should handle special characters in content', async () => {
            const bookingWithSpecialChars = {
                ...mockBooking,
                notes: 'Work on: passing, shooting; avoid injuries',
                location: 'Victoria Park, London',
            };
            const icsContent = await calendar_service_1.calendarService.getICSContent(bookingWithSpecialChars);
            // Special characters should be escaped
            node_assert_1.default.ok(icsContent.includes('Victoria Park\\, London'));
        });
    });
    (0, node_test_1.describe)('generateCalendarLink', () => {
        (0, node_test_1.default)('should generate Google Calendar link', () => {
            const link = calendar_service_1.calendarService.generateCalendarLink(mockBooking, 'GOOGLE');
            node_assert_1.default.ok(link.startsWith('https://calendar.google.com/calendar/render'));
            node_assert_1.default.ok(link.includes('action=TEMPLATE'));
            node_assert_1.default.ok(link.includes('text='));
            node_assert_1.default.ok(link.includes('dates='));
            node_assert_1.default.ok(link.includes('location='));
        });
        (0, node_test_1.default)('should generate Outlook link', () => {
            const link = calendar_service_1.calendarService.generateCalendarLink(mockBooking, 'OUTLOOK');
            node_assert_1.default.ok(link.startsWith('https://outlook.live.com/calendar/0/deeplink/compose'));
            node_assert_1.default.ok(link.includes('subject='));
            node_assert_1.default.ok(link.includes('startdt='));
            node_assert_1.default.ok(link.includes('enddt='));
        });
        (0, node_test_1.default)('should generate Apple Calendar link', () => {
            const link = calendar_service_1.calendarService.generateCalendarLink(mockBooking, 'APPLE');
            node_assert_1.default.ok(link.startsWith('webcal://'));
            node_assert_1.default.ok(link.includes('.ics'));
        });
        (0, node_test_1.default)('should URL-encode special characters', () => {
            const bookingWithSpaces = {
                ...mockBooking,
                location: 'Victoria Park Stadium',
                notes: 'Test notes with spaces',
            };
            const link = calendar_service_1.calendarService.generateCalendarLink(bookingWithSpaces, 'GOOGLE');
            // Should contain encoded spaces
            node_assert_1.default.ok(link.includes('Victoria%20Park'));
        });
    });
    (0, node_test_1.describe)('getSyncSettings', () => {
        (0, node_test_1.default)('should return null for non-existent user settings', async () => {
            const settings = await calendar_service_1.calendarService.getSyncSettings('non_existent_user');
            node_assert_1.default.strictEqual(settings, null);
        });
    });
    (0, node_test_1.describe)('updateSyncSettings', () => {
        (0, node_test_1.default)('should create new settings for user', async () => {
            const userId = `test_user_${Date.now()}`;
            const result = await calendar_service_1.calendarService.updateSyncSettings(userId, {
                enabled: true,
                provider: 'GOOGLE',
                autoSync: true,
                reminderMinutes: 30,
            });
            node_assert_1.default.strictEqual(result.success, true);
            node_assert_1.default.ok(result.settings);
            node_assert_1.default.strictEqual(result.settings.enabled, true);
            node_assert_1.default.strictEqual(result.settings.provider, 'GOOGLE');
            node_assert_1.default.strictEqual(result.settings.autoSync, true);
            node_assert_1.default.strictEqual(result.settings.reminderMinutes, 30);
            node_assert_1.default.strictEqual(result.settings.userId, userId);
        });
        (0, node_test_1.default)('should update existing settings', async () => {
            const userId = `test_user_${Date.now()}`;
            // Create initial settings
            await calendar_service_1.calendarService.updateSyncSettings(userId, {
                enabled: true,
                provider: 'APPLE',
            });
            // Update settings
            const result = await calendar_service_1.calendarService.updateSyncSettings(userId, {
                provider: 'OUTLOOK',
                reminderMinutes: 120,
            });
            node_assert_1.default.strictEqual(result.success, true);
            node_assert_1.default.ok(result.settings);
            node_assert_1.default.strictEqual(result.settings.provider, 'OUTLOOK');
            node_assert_1.default.strictEqual(result.settings.reminderMinutes, 120);
            node_assert_1.default.strictEqual(result.settings.enabled, true); // Preserved from first update
        });
        (0, node_test_1.default)('should persist settings between calls', async () => {
            const userId = `persist_test_${Date.now()}`;
            await calendar_service_1.calendarService.updateSyncSettings(userId, {
                enabled: true,
                provider: 'GOOGLE',
                autoSync: true,
                reminderMinutes: 60,
                includeLocation: true,
                includeNotes: false,
            });
            const retrieved = await calendar_service_1.calendarService.getSyncSettings(userId);
            node_assert_1.default.ok(retrieved);
            node_assert_1.default.strictEqual(retrieved.enabled, true);
            node_assert_1.default.strictEqual(retrieved.provider, 'GOOGLE');
            node_assert_1.default.strictEqual(retrieved.autoSync, true);
            node_assert_1.default.strictEqual(retrieved.reminderMinutes, 60);
            node_assert_1.default.strictEqual(retrieved.includeLocation, true);
            node_assert_1.default.strictEqual(retrieved.includeNotes, false);
        });
    });
    (0, node_test_1.describe)('getDefaultSettings', () => {
        (0, node_test_1.default)('should return default settings object', () => {
            const defaults = calendar_service_1.calendarService.getDefaultSettings();
            node_assert_1.default.strictEqual(defaults.enabled, false);
            node_assert_1.default.strictEqual(defaults.provider, 'APPLE');
            node_assert_1.default.strictEqual(defaults.autoSync, false);
            node_assert_1.default.strictEqual(defaults.reminderMinutes, 60);
            node_assert_1.default.strictEqual(defaults.includeLocation, true);
            node_assert_1.default.strictEqual(defaults.includeNotes, true);
        });
        (0, node_test_1.default)('should return a new object each time', () => {
            const defaults1 = calendar_service_1.calendarService.getDefaultSettings();
            const defaults2 = calendar_service_1.calendarService.getDefaultSettings();
            node_assert_1.default.notStrictEqual(defaults1, defaults2);
            node_assert_1.default.deepStrictEqual(defaults1, defaults2);
        });
    });
    (0, node_test_1.describe)('ICS Date Formatting', () => {
        (0, node_test_1.default)('should format dates correctly for ICS', async () => {
            const icsContent = await calendar_service_1.calendarService.getICSContent(mockBooking);
            // ICS dates should be in format: YYYYMMDDTHHMMSSZ
            const dtStartMatch = icsContent.match(/DTSTART:(\d{8}T\d{6}Z)/);
            const dtEndMatch = icsContent.match(/DTEND:(\d{8}T\d{6}Z)/);
            node_assert_1.default.ok(dtStartMatch, 'DTSTART should be in correct format');
            node_assert_1.default.ok(dtEndMatch, 'DTEND should be in correct format');
            // Verify the date matches our booking
            const dtStart = dtStartMatch[1];
            node_assert_1.default.ok(dtStart.startsWith('20260215'), 'Date should be February 15, 2026');
        });
    });
    (0, node_test_1.describe)('Calendar Provider Validation', () => {
        (0, node_test_1.default)('should handle all provider types', () => {
            const providers = ['GOOGLE', 'APPLE', 'OUTLOOK'];
            providers.forEach((provider) => {
                const link = calendar_service_1.calendarService.generateCalendarLink(mockBooking, provider);
                node_assert_1.default.ok(link.length > 0, `${provider} should generate a non-empty link`);
            });
        });
    });
    (0, node_test_1.describe)('Multiple Bookings', () => {
        (0, node_test_1.default)('should handle multiple bookings', async () => {
            const bookings = [mockBooking, mockBookingNoOptionals];
            const result = await calendar_service_1.calendarService.generateICSFile(bookings, 'test-export.ics');
            node_assert_1.default.strictEqual(result.success, true);
            node_assert_1.default.ok(result.filePath);
            node_assert_1.default.ok(result.filePath.includes('test-export.ics'));
        });
    });
    (0, node_test_1.describe)('Edge Cases', () => {
        (0, node_test_1.default)('should handle booking with undefined duration', () => {
            const bookingNoDuration = {
                ...mockBooking,
                duration: undefined,
            };
            // Should default to 60 minutes
            const event = calendar_service_1.calendarService.bookingToEvent(bookingNoDuration);
            const diffMinutes = (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60);
            node_assert_1.default.strictEqual(diffMinutes, 60);
        });
        (0, node_test_1.default)('should handle empty notes', () => {
            const bookingEmptyNotes = {
                ...mockBooking,
                notes: '',
            };
            const event = calendar_service_1.calendarService.bookingToEvent(bookingEmptyNotes);
            // Should still have description with service and athlete info
            node_assert_1.default.ok(event.description.includes('1-on-1 Training'));
        });
    });
});
