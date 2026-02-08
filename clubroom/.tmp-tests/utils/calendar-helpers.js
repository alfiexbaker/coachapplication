"use strict";
/**
 * Calendar Helpers
 *
 * Shared utilities for phone calendar integration.
 * Used by AddToCalendar component and CalendarSyncSubscriber service.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultCalendarId = getDefaultCalendarId;
exports.buildCalendarTitle = buildCalendarTitle;
exports.buildCalendarNotes = buildCalendarNotes;
const react_native_1 = require("react-native");
const Calendar = __importStar(require("expo-calendar"));
const theme_1 = require("@/constants/theme");
// ---------------------------------------------------------------------------
// getDefaultCalendarId
// ---------------------------------------------------------------------------
/**
 * Find the best writable calendar, or create one if necessary.
 * Returns the calendar ID, or null if no suitable calendar was found.
 */
async function getDefaultCalendarId() {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    // Try to find the default calendar
    const defaultCalendar = calendars.find((cal) => cal.isPrimary);
    if (defaultCalendar)
        return defaultCalendar.id;
    // Fallback: find a writable local calendar
    const writable = calendars.find((cal) => cal.allowsModifications &&
        (cal.source?.type === 'local' ||
            cal.source?.type === 'LOCAL' ||
            cal.type === 'local'));
    if (writable)
        return writable.id;
    // Last resort: create a new calendar on iOS
    if (react_native_1.Platform.OS === 'ios') {
        const defaultSource = calendars.find((cal) => cal.source?.name === 'iCloud' || cal.source?.name === 'Default')?.source;
        if (defaultSource) {
            const newCalendarId = await Calendar.createCalendarAsync({
                title: 'Clubroom Sessions',
                color: theme_1.Colors.light.tint,
                entityType: Calendar.EntityTypes.EVENT,
                sourceId: defaultSource.id,
                source: defaultSource,
                name: 'clubroom',
                ownerAccount: 'personal',
                accessLevel: Calendar.CalendarAccessLevel.OWNER,
            });
            return newCalendarId;
        }
    }
    // Android: use the first writable calendar
    if (react_native_1.Platform.OS === 'android') {
        const writableCalendar = calendars.find((cal) => cal.allowsModifications);
        if (writableCalendar)
            return writableCalendar.id;
    }
    return null;
}
// ---------------------------------------------------------------------------
// buildCalendarTitle
// ---------------------------------------------------------------------------
/**
 * Build the calendar event title from booking info.
 */
function buildCalendarTitle(booking) {
    return booking.sessionType
        ? `${booking.sessionType} with ${booking.coachName}`
        : `Session with ${booking.coachName}`;
}
// ---------------------------------------------------------------------------
// buildCalendarNotes
// ---------------------------------------------------------------------------
/**
 * Build the calendar event notes/description from booking info.
 */
function buildCalendarNotes(booking) {
    return [
        booking.sessionType && `Type: ${booking.sessionType}`,
        booking.price != null && `Price: \u00A3${booking.price}`,
        'Booked via Clubroom',
    ]
        .filter(Boolean)
        .join('\n');
}
