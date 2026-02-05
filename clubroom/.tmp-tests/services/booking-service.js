"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingService = void 0;
const availability_service_1 = require("./availability-service");
const notification_service_1 = require("./notification-service");
const api_client_1 = require("./api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const notification_trigger_1 = require("./notification-trigger");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('BookingService');
class BookingService {
    constructor() {
        this.draft = {};
    }
    getDraft() {
        return this.draft;
    }
    updateDraft(patch) {
        this.draft = { ...this.draft, ...patch };
    }
    resetDraft() {
        this.draft = {};
    }
    async list() {
        try {
            return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
        }
        catch (error) {
            logger.error('Failed to list bookings', error);
            return [];
        }
    }
    /**
     * Get a single booking by ID
     */
    async getBooking(id) {
        const bookings = await this.list();
        const booking = bookings.find((b) => b.id === id);
        if (booking)
            return booking;
        // Also check session bookings
        try {
            const sessionBookings = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
            if (sessionBookings.length > 0) {
                const sessionBooking = sessionBookings.find((b) => b.id === id);
                if (sessionBooking) {
                    return {
                        id: sessionBooking.id,
                        coachId: sessionBooking.coachId,
                        coachName: sessionBooking.coachName,
                        athleteId: sessionBooking.athleteId,
                        athleteName: sessionBooking.athleteName,
                        scheduledAt: sessionBooking.scheduledAt,
                        location: sessionBooking.location,
                        service: sessionBooking.service,
                        status: sessionBooking.status,
                        price: sessionBooking.price || 35,
                    };
                }
            }
        }
        catch (error) {
            logger.error('Failed to check session bookings', error);
        }
        return null;
    }
    async updateStatus(id, status) {
        const bookings = await this.list();
        const updated = bookings.map((b) => (b.id === id ? { ...b, status } : b));
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, updated);
        return updated.find((b) => b.id === id);
    }
    async cancel(id, reason, cancelledBy = 'parent') {
        const bookings = await this.list();
        const booking = bookings.find((b) => b.id === id);
        const updated = bookings.map((b) => b.id === id ? { ...b, status: 'CANCELLED', cancellationReason: reason } : b);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, updated);
        // Notify the other party about the cancellation
        if (booking) {
            const date = booking.scheduledAt
                ? new Date(booking.scheduledAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                })
                : 'upcoming date';
            if (cancelledBy === 'parent') {
                // Notify coach when parent cancels
                await notification_trigger_1.notificationTriggers.bookingCancelled('Parent', date, 'coach', booking.coachId);
            }
            else {
                // Notify parent when coach cancels
                await notification_trigger_1.notificationTriggers.bookingCancelled(booking.coachName || 'Coach', date, 'parent', booking.bookedById);
            }
        }
        return updated.find((b) => b.id === id);
    }
    /**
     * Validate booking against coach availability
     * Returns { valid: true } if slot is available, otherwise { valid: false, reason: string }
     */
    async validateBooking(coachId, date, startTime, durationMinutes = 60) {
        try {
            const slots = await availability_service_1.availabilityService.getAvailableSlots(coachId, date, date, durationMinutes);
            // Find matching slot
            const matchingSlot = slots.find((slot) => slot.date === date && slot.startTime === startTime);
            if (!matchingSlot) {
                return { valid: false, reason: 'This time slot is not within the coach\'s available hours.' };
            }
            if (!matchingSlot.isAvailable) {
                return { valid: false, reason: 'This time slot is already fully booked.' };
            }
            return { valid: true };
        }
        catch (error) {
            logger.error('Validation error', error);
            return { valid: false, reason: 'Unable to validate availability. Please try again.' };
        }
    }
    /**
     * Create a new booking with validation and notifications
     */
    async createBooking(params) {
        const { coachId, coachName, athleteIds, athleteNames, bookedById, bookedByName, scheduledAt, duration, location, service, serviceType, objectives, price, notes, sessionInviteId, } = params;
        // Extract date and time from scheduledAt
        const date = scheduledAt.split('T')[0];
        const time = scheduledAt.split('T')[1]?.substring(0, 5) || '10:00';
        // Validate against availability
        const validation = await this.validateBooking(coachId, date, time, duration);
        if (!validation.valid) {
            return { success: false, error: validation.reason };
        }
        // Calculate total price (base price * number of athletes)
        const basePrice = price || 0;
        const totalPrice = basePrice * athleteIds.length;
        const isSharedSession = athleteIds.length > 1;
        // Create the booking
        const newBooking = {
            id: `booking-${Date.now()}`,
            coachId,
            coachName,
            athleteIds,
            athleteId: athleteIds[0], // Backwards compatibility: first athlete
            athleteName: athleteNames.join(', '), // Combined names for display
            bookedById,
            scheduledAt,
            status: 'CONFIRMED',
            duration,
            location,
            service,
            serviceType,
            objectives: objectives || [],
            price: totalPrice,
            isSharedSession,
            notes: notes || '',
            createdAt: new Date().toISOString(),
            sessionInviteId, // Link to session invite if created from one
        };
        // Save to session bookings storage
        try {
            const bookings = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
            bookings.push(newBooking);
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
            // Create notifications for coach and parent
            await this.createBookingNotifications(newBooking, bookedByName);
            // Trigger notification for coach
            const formattedDateTime = new Date(scheduledAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
            });
            await notification_trigger_1.notificationTriggers.bookingConfirmed(coachName, formattedDateTime, coachId);
            return { success: true, booking: newBooking };
        }
        catch (error) {
            logger.error('Failed to create booking', error);
            return { success: false, error: 'Failed to save booking. Please try again.' };
        }
    }
    /**
     * Create notifications for a new booking
     */
    async createBookingNotifications(booking, bookedByName) {
        const scheduledDate = new Date(booking.scheduledAt);
        const formattedDate = scheduledDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
        const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
        // Notification for coach: New booking received
        await notification_service_1.notificationService.create({
            id: `notif-coach-${Date.now()}`,
            type: 'booking',
            title: 'New Booking Request',
            body: `${bookedByName} has booked a ${booking.service} session for ${booking.athleteName} on ${formattedDate} at ${formattedTime}.`,
            timeLabel: 'Just now',
            read: false,
        });
        // Notification for parent: Booking confirmed
        await notification_service_1.notificationService.create({
            id: `notif-parent-${Date.now() + 1}`,
            type: 'booking',
            title: 'Booking Confirmed',
            body: `Your session with Coach ${booking.coachName} for ${booking.athleteName} is confirmed for ${formattedDate} at ${formattedTime}.`,
            timeLabel: 'Just now',
            read: false,
        });
    }
    /**
     * Get all bookings for a specific user (coach, parent, or athlete)
     */
    async getBookingsForUser(userId, role) {
        try {
            const bookings = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
            switch (role) {
                case 'coach':
                    return bookings.filter((b) => b.coachId === userId);
                case 'parent':
                    return bookings.filter((b) => b.bookedById === userId);
                case 'athlete':
                    return bookings.filter((b) => b.athleteId === userId);
                default:
                    return [];
            }
        }
        catch (error) {
            logger.error('Failed to get bookings', error);
            return [];
        }
    }
    /**
     * Confirm a pending booking (for coach)
     */
    async confirmBooking(bookingId) {
        try {
            const bookings = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
            const bookingIndex = bookings.findIndex((b) => b.id === bookingId);
            if (bookingIndex === -1) {
                return { success: false, error: 'Booking not found' };
            }
            bookings[bookingIndex].status = 'CONFIRMED';
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
            // Create confirmation notification
            const booking = bookings[bookingIndex];
            await notification_service_1.notificationService.create({
                id: `notif-confirmed-${Date.now()}`,
                type: 'booking',
                title: 'Booking Confirmed',
                body: `Coach ${booking.coachName} has confirmed your session for ${booking.athleteName}.`,
                timeLabel: 'Just now',
                read: false,
            });
            return { success: true };
        }
        catch (error) {
            logger.error('Failed to confirm booking', error);
            return { success: false, error: 'Failed to confirm booking' };
        }
    }
    /**
     * Create a booking from the current draft state
     * This method now routes through createBooking() for consistency
     * Note: Draft bookings skip availability validation since they're legacy flow
     */
    async createFromDraft() {
        const draft = this.draft;
        // Validate required draft fields
        if (!draft.coachId || !draft.coachName) {
            throw new Error('Cannot create booking: missing coach information');
        }
        if (!draft.athleteId || !draft.athleteName) {
            throw new Error('Cannot create booking: missing athlete information');
        }
        const scheduledAt = `${draft.date || new Date().toISOString().split('T')[0]}T${draft.slot || '10:00'}:00`;
        // Create booking through the centralized createBooking method
        // Note: We use saveBookingDirect to bypass validation for draft flow (legacy compatibility)
        const booking = {
            id: `draft_${Date.now()}`,
            coachId: draft.coachId,
            coachName: draft.coachName,
            athleteIds: draft.childIds || [draft.athleteId],
            athleteId: draft.athleteId, // Backwards compatibility
            athleteName: draft.athleteName,
            bookedById: draft.athleteId, // Use athleteId as bookedById (parent booking for their child)
            scheduledAt,
            status: 'PENDING',
            duration: draft.duration || 60,
            location: draft.locationText || 'Coach preferred venue',
            service: draft.sessionType || '1-on-1',
            serviceType: draft.sessionType || '1-on-1',
            objectives: draft.objectives || [],
            price: draft.price || 0,
            notes: draft.notes || '',
            createdAt: new Date().toISOString(),
            isSharedSession: (draft.childIds?.length || 1) > 1,
        };
        // Save directly to bypass validation (draft flow is legacy)
        const result = await this.saveBookingDirect(booking);
        if (!result.success) {
            throw new Error(result.error || 'Failed to create booking from draft');
        }
        // Notify coach of new booking
        const formattedDate = draft.date
            ? new Date(draft.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'upcoming date';
        await notification_service_1.notificationService.notifyCoachNewBooking({
            coachId: booking.coachId,
            parentName: 'Parent',
            childName: booking.athleteName,
            date: formattedDate,
            bookingId: booking.id,
        });
        this.resetDraft();
        return booking;
    }
    /**
     * Schedule session reminders (would be triggered by a scheduler in production)
     * This method checks for sessions happening in the next hour and sends reminders
     */
    async scheduleSessionReminders() {
        const bookings = await this.list();
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        const upcomingSessions = bookings.filter((booking) => {
            if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING')
                return false;
            const sessionTime = new Date(booking.scheduledAt);
            return sessionTime > now && sessionTime <= oneHourFromNow;
        });
        for (const session of upcomingSessions) {
            // Notify coach if we have a valid coachId
            if (session.coachId) {
                await notification_service_1.notificationService.notifyCoachSessionReminder({
                    coachId: session.coachId,
                    athleteName: session.athleteName || 'Athlete',
                    bookingId: session.id,
                });
            }
            // Notify parent if we have a valid bookedById
            if (session.bookedById) {
                await notification_service_1.notificationService.notifyParentSessionReminder({
                    parentId: session.bookedById,
                    childName: session.athleteName || 'Athlete',
                    coachName: session.coachName || 'Coach',
                    bookingId: session.id,
                });
            }
        }
    }
    /**
     * Get a specific booking by ID
     */
    async getById(id) {
        const bookings = await this.list();
        return bookings.find((b) => b.id === id);
    }
    /**
     * Update a booking with partial fields
     */
    async updateBooking(id, updates) {
        const bookings = await this.list();
        const index = bookings.findIndex((b) => b.id === id);
        if (index === -1)
            throw new Error('Booking not found');
        const updated = { ...bookings[index], ...updates };
        bookings[index] = updated;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
        return updated;
    }
    /**
     * Check if a confirmed booking has passed its session end time and
     * transition it to AWAITING_COMPLETION status automatically.
     */
    async checkAndTransitionStatus(bookingId) {
        const booking = await this.getBooking(bookingId);
        if (!booking)
            throw new Error('Booking not found');
        const sessionEnd = new Date(booking.scheduledAt);
        sessionEnd.setMinutes(sessionEnd.getMinutes() + (booking.duration || 60));
        if (booking.status === 'CONFIRMED' && new Date() > sessionEnd) {
            return this.updateBooking(bookingId, { status: 'AWAITING_COMPLETION' });
        }
        return booking;
    }
    /**
     * Get all bookings for a coach that are awaiting completion.
     * Also auto-detects confirmed sessions whose time has passed.
     */
    async getAwaitingCompletion(coachId) {
        const bookings = await this.list();
        const now = new Date();
        return bookings.filter((b) => {
            if (b.coachId !== coachId)
                return false;
            if (b.status === 'AWAITING_COMPLETION')
                return true;
            // Auto-transition confirmed sessions that have passed
            if (b.status === 'CONFIRMED') {
                const end = new Date(b.scheduledAt);
                end.setMinutes(end.getMinutes() + (b.duration || 60));
                return now > end;
            }
            return false;
        });
    }
    /**
     * Get upcoming bookings for a coach (confirmed/pending, scheduled in the future)
     */
    async getUpcomingBookings(coachId) {
        const bookings = await this.list();
        const now = new Date();
        return bookings.filter((b) => {
            if (b.coachId !== coachId)
                return false;
            if (b.status !== 'CONFIRMED' && b.status !== 'PENDING')
                return false;
            return new Date(b.scheduledAt) > now;
        });
    }
    /**
     * Save a booking directly without validation (for internal service use only)
     * Used by recurringBookingService and other trusted callers
     */
    async saveBookingDirect(booking) {
        try {
            const bookings = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []);
            bookings.push(booking);
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings);
            return { success: true };
        }
        catch (error) {
            logger.error('Failed to save booking directly', error);
            return { success: false, error: 'Failed to save booking' };
        }
    }
}
exports.bookingService = new BookingService();
