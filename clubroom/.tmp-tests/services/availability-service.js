"use strict";
/**
 * Availability Service
 *
 * Handles coach availability management including recurring templates and overrides.
 * This enables real scheduling that syncs with the booking system.
 *
 * API Integration Notes:
 * - GET /api/coaches/:id/availability?start=X&end=Y - Get available slots
 * - PUT /api/coaches/:id/availability/template - Set recurring template
 * - POST /api/coaches/:id/availability/override - Add exception
 * - WebSocket event: availability_updated
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityService = void 0;
const api_client_1 = require("./api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const booking_types_1 = require("@/constants/booking-types");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('AvailabilityService');
const USE_MOCK = config_1.api.useMock;
// Helper to load existing bookings from storage
async function loadBookings() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
    }
    catch (error) {
        logger.error('Failed to load bookings', error);
    }
    return [];
}
// Helper to load session offerings from storage
async function loadSessionOfferings() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SESSION_OFFERINGS, []);
    }
    catch (error) {
        logger.error('Failed to load session offerings', error);
    }
    return [];
}
// Mock templates for development - coach availability
const MOCK_TEMPLATES = [
    // Coach 1 - Sarah Mitchell (Goalkeeping)
    {
        id: 'tmpl_1',
        coachId: 'coach1',
        dayOfWeek: 1, // Monday
        startTime: '16:00',
        endTime: '19:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
        location: 'Hyde Park',
    },
    {
        id: 'tmpl_2',
        coachId: 'coach1',
        dayOfWeek: 3, // Wednesday
        startTime: '16:00',
        endTime: '19:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
        location: 'Hyde Park',
    },
    {
        id: 'tmpl_3',
        coachId: 'coach1',
        dayOfWeek: 5, // Friday
        startTime: '15:00',
        endTime: '18:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
        location: "Regent's Park",
    },
    {
        id: 'tmpl_4',
        coachId: 'coach1',
        dayOfWeek: 6, // Saturday
        startTime: '09:00',
        endTime: '13:00',
        isRecurring: true,
        maxConcurrent: 2,
        bufferMinutes: 15,
        location: 'Hyde Park',
    },
    // Coach 2 - Mike Thompson (Striker Training)
    {
        id: 'tmpl_5',
        coachId: 'coach2',
        dayOfWeek: 2, // Tuesday
        startTime: '17:00',
        endTime: '20:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
        location: 'Victoria Park',
    },
    {
        id: 'tmpl_6',
        coachId: 'coach2',
        dayOfWeek: 4, // Thursday
        startTime: '17:00',
        endTime: '20:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
        location: 'Victoria Park',
    },
    {
        id: 'tmpl_7',
        coachId: 'coach2',
        dayOfWeek: 6, // Saturday
        startTime: '10:00',
        endTime: '14:00',
        isRecurring: true,
        maxConcurrent: 2,
        bufferMinutes: 15,
        location: 'Hackney Marshes',
    },
    // Coach 3 - David Roberts (Youth Development)
    {
        id: 'tmpl_8',
        coachId: 'coach3',
        dayOfWeek: 1, // Monday
        startTime: '16:30',
        endTime: '19:30',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
        location: 'Clapham Common',
    },
    {
        id: 'tmpl_9',
        coachId: 'coach3',
        dayOfWeek: 3, // Wednesday
        startTime: '16:30',
        endTime: '19:30',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
        location: 'Clapham Common',
    },
    {
        id: 'tmpl_10',
        coachId: 'coach3',
        dayOfWeek: 0, // Sunday
        startTime: '09:00',
        endTime: '12:00',
        isRecurring: true,
        maxConcurrent: 2,
        bufferMinutes: 15,
        location: 'Battersea Park',
    },
];
const MOCK_OVERRIDES = [
    {
        id: 'ovr_1',
        coachId: 'coach1',
        date: '2026-01-20',
        isBlocked: true,
        reason: 'Personal appointment',
    },
];
let templatesCache = [...MOCK_TEMPLATES];
let overridesCache = [...MOCK_OVERRIDES];
async function loadTemplates() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.AVAILABILITY_TEMPLATES, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load templates', error);
    }
    return [...MOCK_TEMPLATES];
}
async function saveTemplates(templates) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY_TEMPLATES, templates);
    }
    catch (error) {
        logger.error('Failed to save templates', error);
    }
}
async function loadOverrides() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.AVAILABILITY_OVERRIDES, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load overrides', error);
    }
    return [...MOCK_OVERRIDES];
}
async function saveOverrides(overrides) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY_OVERRIDES, overrides);
    }
    catch (error) {
        logger.error('Failed to save overrides', error);
    }
}
exports.availabilityService = {
    /**
     * Get all availability templates for a coach
     */
    async getTemplates(coachId) {
        if (USE_MOCK) {
            templatesCache = await loadTemplates();
            return templatesCache.filter((t) => t.coachId === coachId);
        }
        const response = await fetch(`/api/coaches/${coachId}/availability/templates`);
        return response.json();
    },
    /**
     * Create or update a template
     */
    async saveTemplate(template) {
        const savedTemplate = {
            ...template,
            id: template.id || `tmpl_${Date.now()}`,
        };
        if (USE_MOCK) {
            templatesCache = await loadTemplates();
            const existingIndex = templatesCache.findIndex((t) => t.id === savedTemplate.id);
            if (existingIndex >= 0) {
                templatesCache[existingIndex] = savedTemplate;
            }
            else {
                templatesCache.push(savedTemplate);
            }
            await saveTemplates(templatesCache);
            return savedTemplate;
        }
        const response = await fetch(`/api/coaches/${template.coachId}/availability/templates`, {
            method: template.id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savedTemplate),
        });
        return response.json();
    },
    /**
     * Delete a template
     */
    async deleteTemplate(templateId) {
        if (USE_MOCK) {
            templatesCache = await loadTemplates();
            templatesCache = templatesCache.filter((t) => t.id !== templateId);
            await saveTemplates(templatesCache);
            return;
        }
        await fetch(`/api/availability/templates/${templateId}`, { method: 'DELETE' });
    },
    /**
     * Get all overrides for a coach within a date range
     */
    async getOverrides(coachId, startDate, endDate) {
        if (USE_MOCK) {
            overridesCache = await loadOverrides();
            let filtered = overridesCache.filter((o) => o.coachId === coachId);
            if (startDate) {
                filtered = filtered.filter((o) => o.date >= startDate);
            }
            if (endDate) {
                filtered = filtered.filter((o) => o.date <= endDate);
            }
            return filtered;
        }
        let url = `/api/coaches/${coachId}/availability/overrides`;
        if (startDate || endDate) {
            const params = new URLSearchParams();
            if (startDate)
                params.append('start', startDate);
            if (endDate)
                params.append('end', endDate);
            url += `?${params.toString()}`;
        }
        const response = await fetch(url);
        return response.json();
    },
    /**
     * Create or update an override
     */
    async saveOverride(override) {
        const savedOverride = {
            ...override,
            id: override.id || `ovr_${Date.now()}`,
        };
        if (USE_MOCK) {
            overridesCache = await loadOverrides();
            // Remove existing override for same date if exists
            overridesCache = overridesCache.filter((o) => !(o.coachId === savedOverride.coachId && o.date === savedOverride.date));
            overridesCache.push(savedOverride);
            await saveOverrides(overridesCache);
            return savedOverride;
        }
        const response = await fetch(`/api/coaches/${override.coachId}/availability/overrides`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savedOverride),
        });
        return response.json();
    },
    /**
     * Delete an override
     */
    async deleteOverride(overrideId) {
        if (USE_MOCK) {
            overridesCache = await loadOverrides();
            overridesCache = overridesCache.filter((o) => o.id !== overrideId);
            await saveOverrides(overridesCache);
            return;
        }
        await fetch(`/api/availability/overrides/${overrideId}`, { method: 'DELETE' });
    },
    /**
     * Block a specific date
     */
    async blockDate(coachId, date, reason) {
        return this.saveOverride({
            coachId,
            date,
            isBlocked: true,
            reason,
        });
    },
    /**
     * Unblock a specific date
     */
    async unblockDate(coachId, date) {
        if (USE_MOCK) {
            overridesCache = await loadOverrides();
            overridesCache = overridesCache.filter((o) => !(o.coachId === coachId && o.date === date));
            await saveOverrides(overridesCache);
            return;
        }
        const overrides = await this.getOverrides(coachId);
        const override = overrides.find((o) => o.date === date);
        if (override) {
            await this.deleteOverride(override.id);
        }
    },
    /**
     * Get available slots for a date range (used by booking system)
     * Now checks against existing bookings to show only truly available slots
     */
    async getAvailableSlots(coachId, startDate, endDate, sessionDurationMinutes = 60) {
        const templates = await this.getTemplates(coachId);
        const overrides = await this.getOverrides(coachId, startDate, endDate);
        // Load existing bookings to check availability
        const existingBookings = await loadBookings();
        const sessionOfferings = await loadSessionOfferings();
        // Filter bookings for this coach in the date range
        const coachBookings = existingBookings.filter((booking) => {
            if (booking.coachId !== coachId)
                return false;
            if (booking.status === 'CANCELLED')
                return false;
            const bookingDate = booking.scheduledAt?.split('T')[0];
            return bookingDate >= startDate && bookingDate <= endDate;
        });
        // Filter session offerings for this coach
        const coachOfferings = sessionOfferings.filter((offering) => {
            if (offering.coachId !== coachId)
                return false;
            if (offering.status === 'cancelled')
                return false;
            const offeringDate = offering.scheduledAt?.split('T')[0];
            return offeringDate >= startDate && offeringDate <= endDate;
        });
        const slots = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Iterate through each day in range
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();
            // Check for override on this date
            const override = overrides.find((o) => o.date === dateStr);
            if (override?.isBlocked) {
                // Date is blocked, skip
                continue;
            }
            if (override?.customSlots) {
                // Use custom slots for this date
                for (const customSlot of override.customSlots) {
                    const bookedCount = this.countBookingsForSlot(coachBookings, coachOfferings, dateStr, customSlot.startTime);
                    slots.push({
                        date: dateStr,
                        startTime: customSlot.startTime,
                        endTime: customSlot.endTime,
                        isAvailable: bookedCount < 1,
                        bookedCount,
                        maxBookings: 1,
                        location: customSlot.location,
                    });
                }
                continue;
            }
            // Use template for this day
            const dayTemplates = templates.filter((t) => t.dayOfWeek === dayOfWeek);
            for (const template of dayTemplates) {
                // Generate time slots based on template
                const [startHour, startMin] = template.startTime.split(':').map(Number);
                const [endHour, endMin] = template.endTime.split(':').map(Number);
                const templateStartMinutes = startHour * 60 + startMin;
                const templateEndMinutes = endHour * 60 + endMin;
                for (let slotStart = templateStartMinutes; slotStart + sessionDurationMinutes <= templateEndMinutes; slotStart += sessionDurationMinutes + template.bufferMinutes) {
                    const slotStartHour = Math.floor(slotStart / 60);
                    const slotStartMin = slotStart % 60;
                    const slotEndMinutes = slotStart + sessionDurationMinutes;
                    const slotEndHour = Math.floor(slotEndMinutes / 60);
                    const slotEndMin = slotEndMinutes % 60;
                    const slotStartTime = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMin.toString().padStart(2, '0')}`;
                    const slotEndTime = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`;
                    const bookedCount = this.countBookingsForSlot(coachBookings, coachOfferings, dateStr, slotStartTime);
                    slots.push({
                        date: dateStr,
                        startTime: slotStartTime,
                        endTime: slotEndTime,
                        isAvailable: bookedCount < template.maxConcurrent,
                        bookedCount,
                        maxBookings: template.maxConcurrent,
                        location: template.location,
                    });
                }
            }
        }
        return slots.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0)
                return dateCompare;
            return a.startTime.localeCompare(b.startTime);
        });
    },
    /**
     * Count bookings for a specific slot
     */
    countBookingsForSlot(bookings, offerings, date, startTime) {
        let count = 0;
        // Count from regular bookings
        for (const booking of bookings) {
            const bookingDate = booking.scheduledAt?.split('T')[0];
            const bookingTime = booking.scheduledAt?.split('T')[1]?.substring(0, 5);
            if (bookingDate === date && bookingTime === startTime) {
                count++;
            }
        }
        // Count from session offerings (for group sessions, count registrations)
        for (const offering of offerings) {
            const offeringDate = offering.scheduledAt?.split('T')[0];
            const offeringTime = offering.scheduledAt?.split('T')[1]?.substring(0, 5);
            if (offeringDate === date && offeringTime === startTime) {
                // For session offerings, the slot is occupied
                count += offering.registrations?.filter(r => r.status === 'confirmed').length || 1;
            }
        }
        return count;
    },
    /**
     * Get bookings for a coach within a date range
     */
    async getCoachBookings(coachId, startDate, endDate) {
        const bookings = await loadBookings();
        const offerings = await loadSessionOfferings();
        // Filter bookings for this coach
        const coachBookings = bookings.filter((booking) => {
            if (booking.coachId !== coachId)
                return false;
            const bookingDate = booking.scheduledAt?.split('T')[0];
            return bookingDate >= startDate && bookingDate <= endDate;
        });
        // Get registrations from offerings
        const coachOfferingBookings = offerings
            .filter((offering) => offering.coachId === coachId)
            .filter((offering) => {
            const offeringDate = offering.scheduledAt?.split('T')[0];
            return offeringDate >= startDate && offeringDate <= endDate;
        })
            .map((offering) => ({
            id: offering.id,
            coachId: offering.coachId,
            coachName: offering.coachName,
            scheduledAt: offering.scheduledAt,
            service: offering.title,
            location: offering.location,
            status: offering.status === 'active' ? 'CONFIRMED' : offering.status?.toUpperCase(),
            isGroupSession: offering.sessionType === 'group',
            maxParticipants: offering.maxParticipants,
            currentParticipants: offering.registrations?.filter(r => r.status === 'confirmed').length || 0,
            registrations: offering.registrations,
        }));
        return [...coachBookings, ...coachOfferingBookings];
    },
    /**
     * Get a summary of availability for display
     */
    async getAvailabilitySummary(coachId) {
        const templates = await this.getTemplates(coachId);
        // Calculate weekly hours
        let weeklyMinutes = 0;
        const daysAvailable = [];
        for (const template of templates) {
            const [startHour, startMin] = template.startTime.split(':').map(Number);
            const [endHour, endMin] = template.endTime.split(':').map(Number);
            const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
            weeklyMinutes += duration;
            const dayName = booking_types_1.DAY_NAMES[template.dayOfWeek];
            if (!daysAvailable.includes(dayName)) {
                daysAvailable.push(dayName);
            }
        }
        // Get next available slot
        const today = new Date().toISOString().split('T')[0];
        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
        const slots = await this.getAvailableSlots(coachId, today, twoWeeksLater.toISOString().split('T')[0]);
        const nextAvailableSlot = slots.find((s) => s.isAvailable);
        return {
            weeklyHours: Math.round(weeklyMinutes / 60 * 10) / 10,
            daysAvailable,
            nextAvailableSlot,
        };
    },
};
