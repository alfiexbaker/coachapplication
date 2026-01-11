import { Booking } from '@/constants/app-types';
import { MOCK_BOOKINGS } from '@/constants/mock-data';
import { storageService } from './storage-service';
import { availabilityService } from './availability-service';
import { notificationService } from './notification-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'clubroom.bookings';
const SESSION_BOOKINGS_KEY = 'session_bookings';

export type BookingDraft = {
  sessionType?: string;
  participants?: number;
  duration?: number;
  date?: string;
  slot?: string;
  locationOption?: string;
  locationText?: string;
  notes?: string;
  childId?: string;
  childIds?: string[];
  price?: number;
  coachId?: string;
  coachName?: string;
  athleteId?: string;
  athleteName?: string;
  objectives?: string[];
};

export interface CreateBookingParams {
  coachId: string;
  coachName: string;
  athleteId: string;
  athleteName: string;
  bookedById: string;
  bookedByName: string;
  scheduledAt: string; // ISO date string with time
  duration: number;
  location: string;
  service: string;
  serviceType: string;
  objectives?: string[];
  price?: number;
  notes?: string;
  sessionInviteId?: string; // Link to session invite if created from one
}

class BookingService {
  private draft: BookingDraft = {};

  getDraft() {
    return this.draft;
  }

  updateDraft(patch: Partial<BookingDraft>) {
    this.draft = { ...this.draft, ...patch };
  }

  resetDraft() {
    this.draft = {};
  }

  async list(): Promise<Booking[]> {
    return storageService.getItem<Booking[]>(STORAGE_KEY, MOCK_BOOKINGS);
  }

  async updateStatus(id: string, status: Booking['status']) {
    const bookings = await this.list();
    const updated = bookings.map((b) => (b.id === id ? { ...b, status } : b));
    await storageService.setItem(STORAGE_KEY, updated);
    return updated.find((b) => b.id === id);
  }

  async cancel(id: string, reason: string, cancelledBy: 'coach' | 'parent' = 'parent') {
    const bookings = await this.list();
    const booking = bookings.find((b) => b.id === id);
    const updated = bookings.map((b) =>
      b.id === id ? { ...b, status: 'CANCELLED', cancellationReason: reason } : b
    );
    await storageService.setItem(STORAGE_KEY, updated);

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
        await notificationService.notifyCoachBookingCancelled({
          coachId: booking.coachId || 'coach_1',
          parentName: 'Parent',
          date,
          bookingId: id,
        });
      } else {
        // Notify parent when coach cancels
        await notificationService.create({
          id: `notif_cancel_${Date.now()}`,
          type: 'booking',
          title: 'Booking Cancelled',
          body: `Coach ${booking.coachName} cancelled your session for ${date}`,
          timeLabel: 'Just now',
          read: false,
        });
      }
    }

    return updated.find((b) => b.id === id);
  }

  /**
   * Validate booking against coach availability
   * Returns { valid: true } if slot is available, otherwise { valid: false, reason: string }
   */
  async validateBooking(
    coachId: string,
    date: string,
    startTime: string,
    durationMinutes: number = 60
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const slots = await availabilityService.getAvailableSlots(coachId, date, date, durationMinutes);

      // Find matching slot
      const matchingSlot = slots.find(
        (slot) => slot.date === date && slot.startTime === startTime
      );

      if (!matchingSlot) {
        return { valid: false, reason: 'This time slot is not within the coach\'s available hours.' };
      }

      if (!matchingSlot.isAvailable) {
        return { valid: false, reason: 'This time slot is already fully booked.' };
      }

      return { valid: true };
    } catch (error) {
      console.error('[BookingService] Validation error:', error);
      return { valid: false, reason: 'Unable to validate availability. Please try again.' };
    }
  }

  /**
   * Create a new booking with validation and notifications
   */
  async createBooking(params: CreateBookingParams): Promise<{ success: boolean; booking?: any; error?: string }> {
    const {
      coachId,
      coachName,
      athleteId,
      athleteName,
      bookedById,
      bookedByName,
      scheduledAt,
      duration,
      location,
      service,
      serviceType,
      objectives,
      price,
      notes,
      sessionInviteId,
    } = params;

    // Extract date and time from scheduledAt
    const date = scheduledAt.split('T')[0];
    const time = scheduledAt.split('T')[1]?.substring(0, 5) || '10:00';

    // Validate against availability
    const validation = await this.validateBooking(coachId, date, time, duration);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Create the booking
    const newBooking = {
      id: `booking-${Date.now()}`,
      coachId,
      coachName,
      athleteId,
      athleteName,
      bookedById,
      scheduledAt,
      status: 'CONFIRMED',
      duration,
      location,
      service,
      serviceType,
      objectives: objectives || [],
      price,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      sessionInviteId, // Link to session invite if created from one
    };

    // Save to session bookings storage
    try {
      const existingBookings = await AsyncStorage.getItem(SESSION_BOOKINGS_KEY);
      const bookings = existingBookings ? JSON.parse(existingBookings) : [];
      bookings.push(newBooking);
      await AsyncStorage.setItem(SESSION_BOOKINGS_KEY, JSON.stringify(bookings));

      // Create notifications for coach and parent
      await this.createBookingNotifications(newBooking, bookedByName);

      return { success: true, booking: newBooking };
    } catch (error) {
      console.error('[BookingService] Failed to create booking:', error);
      return { success: false, error: 'Failed to save booking. Please try again.' };
    }
  }

  /**
   * Create notifications for a new booking
   */
  async createBookingNotifications(booking: any, bookedByName: string): Promise<void> {
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
    await notificationService.create({
      id: `notif-coach-${Date.now()}`,
      type: 'booking',
      title: 'New Booking Request',
      body: `${bookedByName} has booked a ${booking.service} session for ${booking.athleteName} on ${formattedDate} at ${formattedTime}.`,
      timeLabel: 'Just now',
      read: false,
    });

    // Notification for parent: Booking confirmed
    await notificationService.create({
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
  async getBookingsForUser(userId: string, role: 'coach' | 'parent' | 'athlete'): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem(SESSION_BOOKINGS_KEY);
      const bookings = stored ? JSON.parse(stored) : [];

      switch (role) {
        case 'coach':
          return bookings.filter((b: any) => b.coachId === userId);
        case 'parent':
          return bookings.filter((b: any) => b.bookedById === userId);
        case 'athlete':
          return bookings.filter((b: any) => b.athleteId === userId);
        default:
          return [];
      }
    } catch (error) {
      console.error('[BookingService] Failed to get bookings:', error);
      return [];
    }
  }

  /**
   * Confirm a pending booking (for coach)
   */
  async confirmBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const stored = await AsyncStorage.getItem(SESSION_BOOKINGS_KEY);
      const bookings = stored ? JSON.parse(stored) : [];

      const bookingIndex = bookings.findIndex((b: any) => b.id === bookingId);
      if (bookingIndex === -1) {
        return { success: false, error: 'Booking not found' };
      }

      bookings[bookingIndex].status = 'CONFIRMED';
      await AsyncStorage.setItem(SESSION_BOOKINGS_KEY, JSON.stringify(bookings));

      // Create confirmation notification
      const booking = bookings[bookingIndex];
      await notificationService.create({
        id: `notif-confirmed-${Date.now()}`,
        type: 'booking',
        title: 'Booking Confirmed',
        body: `Coach ${booking.coachName} has confirmed your session for ${booking.athleteName}.`,
        timeLabel: 'Just now',
        read: false,
      });

      return { success: true };
    } catch (error) {
      console.error('[BookingService] Failed to confirm booking:', error);
      return { success: false, error: 'Failed to confirm booking' };
    }
  }

  async createFromDraft(): Promise<Booking> {
    const draft = this.draft;
    const bookings = await this.list();

    const formattedDate = draft.date
      ? new Date(draft.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'upcoming date';

    const newBooking: Booking = {
      id: `draft_${Date.now()}`,
      coachId: draft.coachId || 'coach1',
      athleteId: draft.athleteId || 'user1',
      bookedById: 'parent1',
      status: 'PENDING',
      scheduledAt: `${draft.date || new Date().toISOString().split('T')[0]}T${draft.slot || '10:00'}`,
      duration: draft.duration || 60,
      location: draft.locationText || 'Coach preferred venue',
      notes: draft.notes || '',
      coachName: draft.coachName || 'Sarah Mitchell',
      athleteName: draft.athleteName || 'Tom Henderson',
      service: draft.sessionType || '1-on-1',
      locationLabel: draft.locationOption || 'Coach preferred location',
      start: `${draft.date || new Date().toISOString().split('T')[0]}T${draft.slot || '10:00'}`,
    } as Booking;

    const updated = [newBooking, ...bookings];
    await storageService.setItem(STORAGE_KEY, updated);

    // Notify coach of new booking
    await notificationService.notifyCoachNewBooking({
      coachId: newBooking.coachId,
      parentName: 'Parent',
      childName: newBooking.athleteName || 'Athlete',
      date: formattedDate,
      bookingId: newBooking.id,
    });

    this.resetDraft();
    return newBooking;
  }

  /**
   * Schedule session reminders (would be triggered by a scheduler in production)
   * This method checks for sessions happening in the next hour and sends reminders
   */
  async scheduleSessionReminders(): Promise<void> {
    const bookings = await this.list();
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const upcomingSessions = bookings.filter((booking) => {
      if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') return false;
      const sessionTime = new Date(booking.scheduledAt);
      return sessionTime > now && sessionTime <= oneHourFromNow;
    });

    for (const session of upcomingSessions) {
      // Notify coach
      await notificationService.notifyCoachSessionReminder({
        coachId: session.coachId,
        athleteName: session.athleteName || 'Athlete',
        bookingId: session.id,
      });

      // Notify parent
      await notificationService.notifyParentSessionReminder({
        parentId: session.bookedById || 'parent_1',
        childName: session.athleteName || 'Athlete',
        coachName: session.coachName || 'Coach',
        bookingId: session.id,
      });
    }
  }

  /**
   * Get a specific booking by ID
   */
  async getById(id: string): Promise<Booking | undefined> {
    const bookings = await this.list();
    return bookings.find((b) => b.id === id);
  }
}

export const bookingService = new BookingService();
