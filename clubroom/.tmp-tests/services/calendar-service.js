"use strict";
/**
 * Calendar Service
 *
 * Handles calendar sync functionality including ICS file generation,
 * native calendar integration, and sync settings management.
 *
 * API Integration Notes:
 * - GET /api/users/:id/calendar-settings - Get user's calendar sync settings
 * - PUT /api/users/:id/calendar-settings - Update calendar sync settings
 * - POST /api/bookings/:id/calendar-export - Generate calendar event from booking
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
exports.calendarService = void 0;
const api_client_1 = require("./api-client");
const config_1 = require("@/constants/config");
const FileSystem = __importStar(require("expo-file-system/legacy"));
const Sharing = __importStar(require("expo-sharing"));
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('CalendarService');
const USE_MOCK = config_1.api.useMock;
// Default settings for new users
const DEFAULT_SETTINGS = {
    enabled: false,
    provider: 'APPLE',
    autoSync: false,
    reminderMinutes: 60,
    includeLocation: true,
    includeNotes: true,
};
/**
 * Format a date to ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(dateString) {
    const date = new Date(dateString);
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
/**
 * Escape special characters for ICS format
 */
function escapeICSText(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}
/**
 * Generate a unique identifier for ICS events
 */
function generateUID(bookingId) {
    return `${bookingId}@clubroom.app`;
}
/**
 * Convert a booking to a CalendarEvent
 */
function bookingToCalendarEvent(booking) {
    const startTime = booking.scheduledAt;
    const durationMs = (booking.duration || 60) * 60 * 1000;
    const endTime = new Date(new Date(startTime).getTime() + durationMs).toISOString();
    let description = '';
    if (booking.service) {
        description += `Session Type: ${booking.service}\n`;
    }
    if (booking.notes) {
        description += `Notes: ${booking.notes}\n`;
    }
    if (booking.athleteName) {
        description += `Athlete: ${booking.athleteName}\n`;
    }
    return {
        id: booking.id,
        title: `Training Session${booking.coachName ? ` with ${booking.coachName}` : ''}`,
        startTime,
        endTime,
        location: booking.location || '',
        description: description.trim(),
        bookingId: booking.id,
        coachName: booking.coachName || undefined,
        athleteName: booking.athleteName || undefined,
    };
}
/**
 * Generate ICS content for a single event
 */
function generateICSContent(event, settings) {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Clubroom//Calendar Export//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${generateUID(event.id)}`,
        `DTSTAMP:${formatICSDate(new Date().toISOString())}`,
        `DTSTART:${formatICSDate(event.startTime)}`,
        `DTEND:${formatICSDate(event.endTime)}`,
        `SUMMARY:${escapeICSText(event.title)}`,
    ];
    // Add location if enabled and available
    if (settings?.includeLocation !== false && event.location) {
        lines.push(`LOCATION:${escapeICSText(event.location)}`);
    }
    // Add description if enabled and available
    if (settings?.includeNotes !== false && event.description) {
        lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
    }
    // Add reminder/alarm if configured
    if (settings?.reminderMinutes && settings.reminderMinutes > 0) {
        lines.push('BEGIN:VALARM');
        lines.push('ACTION:DISPLAY');
        lines.push('DESCRIPTION:Training Session Reminder');
        lines.push(`TRIGGER:-PT${settings.reminderMinutes}M`);
        lines.push('END:VALARM');
    }
    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}
/**
 * Generate ICS content for multiple events
 */
function generateMultiEventICSContent(events, settings) {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Clubroom//Calendar Export//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
    ];
    for (const event of events) {
        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${generateUID(event.id)}`);
        lines.push(`DTSTAMP:${formatICSDate(new Date().toISOString())}`);
        lines.push(`DTSTART:${formatICSDate(event.startTime)}`);
        lines.push(`DTEND:${formatICSDate(event.endTime)}`);
        lines.push(`SUMMARY:${escapeICSText(event.title)}`);
        if (settings?.includeLocation !== false && event.location) {
            lines.push(`LOCATION:${escapeICSText(event.location)}`);
        }
        if (settings?.includeNotes !== false && event.description) {
            lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
        }
        if (settings?.reminderMinutes && settings.reminderMinutes > 0) {
            lines.push('BEGIN:VALARM');
            lines.push('ACTION:DISPLAY');
            lines.push('DESCRIPTION:Training Session Reminder');
            lines.push(`TRIGGER:-PT${settings.reminderMinutes}M`);
            lines.push('END:VALARM');
        }
        lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}
/**
 * Generate a calendar subscription URL for the provider
 */
function generateCalendarLink(event, provider) {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    // Format dates for URL
    const startStr = start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const endStr = end.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = encodeURIComponent(event.title);
    const location = encodeURIComponent(event.location || '');
    const description = encodeURIComponent(event.description || '');
    switch (provider) {
        case 'GOOGLE':
            return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&location=${location}&details=${description}`;
        case 'OUTLOOK':
            const outlookStart = start.toISOString();
            const outlookEnd = end.toISOString();
            return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${outlookStart}&enddt=${outlookEnd}&location=${location}&body=${description}`;
        case 'APPLE':
        default:
            // Apple Calendar uses webcal protocol or ICS file download
            // For deep linking, we generate a data URL that can be opened
            return `webcal://clubroom.app/calendar/${event.id}.ics`;
    }
}
exports.calendarService = {
    /**
     * Generate an ICS file from bookings and save to device
     */
    async generateICSFile(bookings, filename) {
        try {
            const settings = await this.getSyncSettings('current_user');
            const events = bookings.map(bookingToCalendarEvent);
            const icsContent = generateMultiEventICSContent(events, settings || undefined);
            const finalFilename = filename || `clubroom-sessions-${Date.now()}.ics`;
            const filePath = `${FileSystem.cacheDirectory}${finalFilename}`;
            await FileSystem.writeAsStringAsync(filePath, icsContent, {
                encoding: FileSystem.EncodingType.UTF8,
            });
            return { success: true, filePath };
        }
        catch (error) {
            logger.error('Failed to generate ICS file', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate calendar file',
            };
        }
    },
    /**
     * Export a single booking to calendar (opens share sheet on mobile)
     */
    async exportToCalendar(booking) {
        try {
            const result = await this.generateICSFile([booking], `session-${booking.id}.ics`);
            if (!result.success || !result.filePath) {
                return { success: false, error: result.error || 'Failed to create calendar file' };
            }
            // Check if sharing is available
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                return { success: false, error: 'Sharing is not available on this device' };
            }
            // Open share sheet to let user choose calendar app
            await Sharing.shareAsync(result.filePath, {
                mimeType: 'text/calendar',
                dialogTitle: 'Add to Calendar',
                UTI: 'public.calendar-event',
            });
            return { success: true };
        }
        catch (error) {
            logger.error('Failed to export to calendar', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to export to calendar',
            };
        }
    },
    /**
     * Export multiple bookings to calendar
     */
    async exportMultipleToCalendar(bookings) {
        try {
            if (bookings.length === 0) {
                return { success: false, error: 'No bookings to export' };
            }
            const result = await this.generateICSFile(bookings);
            if (!result.success || !result.filePath) {
                return { success: false, error: result.error || 'Failed to create calendar file' };
            }
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                return { success: false, error: 'Sharing is not available on this device' };
            }
            await Sharing.shareAsync(result.filePath, {
                mimeType: 'text/calendar',
                dialogTitle: 'Add Sessions to Calendar',
                UTI: 'public.calendar-event',
            });
            return { success: true };
        }
        catch (error) {
            logger.error('Failed to export multiple to calendar', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to export to calendar',
            };
        }
    },
    /**
     * Get calendar sync settings for a user
     */
    async getSyncSettings(userId) {
        if (USE_MOCK) {
            try {
                const stored = await api_client_1.apiClient.get(`${storage_keys_1.STORAGE_KEYS.CALENDAR_SYNC_SETTINGS}_${userId}`, null);
                return stored;
            }
            catch (error) {
                logger.error('Failed to get sync settings', error);
                return null;
            }
        }
        try {
            const response = await fetch(`/api/users/${userId}/calendar-settings`);
            if (!response.ok)
                return null;
            return response.json();
        }
        catch (error) {
            logger.error('Failed to fetch sync settings', error);
            return null;
        }
    },
    /**
     * Update calendar sync settings for a user
     */
    async updateSyncSettings(userId, settings) {
        if (USE_MOCK) {
            try {
                const existing = await this.getSyncSettings(userId);
                const updated = {
                    ...DEFAULT_SETTINGS,
                    ...existing,
                    ...settings,
                    userId,
                };
                await api_client_1.apiClient.set(`${storage_keys_1.STORAGE_KEYS.CALENDAR_SYNC_SETTINGS}_${userId}`, updated);
                return { success: true, settings: updated };
            }
            catch (error) {
                logger.error('Failed to update sync settings', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to save settings',
                };
            }
        }
        try {
            const response = await fetch(`/api/users/${userId}/calendar-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!response.ok) {
                return { success: false, error: 'Failed to update settings' };
            }
            const updated = await response.json();
            return { success: true, settings: updated };
        }
        catch (error) {
            logger.error('Failed to update sync settings', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save settings',
            };
        }
    },
    /**
     * Generate a calendar link for a booking
     */
    generateCalendarLink(booking, provider = 'GOOGLE') {
        const event = bookingToCalendarEvent(booking);
        return generateCalendarLink(event, provider);
    },
    /**
     * Get ICS content as a string for a booking (useful for web download)
     */
    async getICSContent(booking) {
        const settings = await this.getSyncSettings('current_user');
        const event = bookingToCalendarEvent(booking);
        return generateICSContent(event, settings || undefined);
    },
    /**
     * Convert booking to CalendarEvent (exposed for external use)
     */
    bookingToEvent(booking) {
        return bookingToCalendarEvent(booking);
    },
    /**
     * Get default settings
     */
    getDefaultSettings() {
        return { ...DEFAULT_SETTINGS };
    },
};
