/**
 * Booking Search Service
 *
 * Handles booking queries and filtering: get bookings by user/role,
 * upcoming bookings, awaiting completion, etc.
 *
 * API Integration Notes:
 * - Queries are performed against local storage in mock mode
 * - Would map to various GET /api/bookings?... endpoints in production
 */

import { Booking } from '@/constants/app-types';
import { createLogger } from '@/utils/logger';
import { bookingCrudService } from './booking-crud-service';

const logger = createLogger('BookingSearchService');

export const bookingSearchService = {
  /**
   * Get all bookings for a specific user (coach, parent, or athlete).
   * Reads through bookingCrudService.list() so the in-memory cache is used.
   */
  async getBookingsForUser(userId: string, role: 'coach' | 'parent' | 'athlete'): Promise<Booking[]> {
    try {
      const bookings = await bookingCrudService.list();

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
    } catch (error) {
      logger.error('Failed to get bookings', error);
      return [];
    }
  },

  /**
   * Get all bookings for a coach that are awaiting completion.
   * Also auto-detects confirmed sessions whose time has passed.
   */
  async getAwaitingCompletion(coachId: string): Promise<Booking[]> {
    const bookings = await bookingCrudService.list();
    const now = new Date();

    return bookings.filter((b) => {
      if (b.coachId !== coachId) return false;
      if (b.status === 'AWAITING_COMPLETION') return true;

      // Auto-transition confirmed sessions that have passed
      if (b.status === 'CONFIRMED') {
        const end = new Date(b.scheduledAt);
        end.setMinutes(end.getMinutes() + (b.duration || 60));
        return now > end;
      }
      return false;
    });
  },

  /**
   * Get upcoming bookings for a coach (confirmed/pending, scheduled in the future)
   */
  async getUpcomingBookings(coachId: string): Promise<Booking[]> {
    const bookings = await bookingCrudService.list();
    const now = new Date();
    return bookings.filter((b) => {
      if (b.coachId !== coachId) return false;
      if (b.status !== 'CONFIRMED' && b.status !== 'PENDING') return false;
      return new Date(b.scheduledAt) > now;
    });
  },
};
