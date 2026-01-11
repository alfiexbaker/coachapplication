import { Booking } from '@/constants/app-types';
import { storageService } from './storage-service';
import { notificationService } from './notification-service';
import { notificationPreferencesService, ReminderTiming } from './notification-preferences-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SessionReminderService');
const BOOKINGS_KEY = 'clubroom.bookings';
const SENT_REMINDERS_KEY = '@sent_reminders';
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

interface SentReminder {
  bookingId: string;
  userId: string;
  hours: number;
  sentAt: string;
}

class SessionReminderService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the reminder service - checks periodically for sessions needing reminders
   */
  start(): void {
    if (this.isRunning) {
      logger.debug('Reminder service already running');
      return;
    }

    logger.info('Starting session reminder service');
    this.isRunning = true;

    // Run immediately on start
    this.checkAndSendReminders();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkAndSendReminders();
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Stop the reminder service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Session reminder service stopped');
  }

  /**
   * Check all upcoming sessions and send reminders as needed
   */
  async checkAndSendReminders(): Promise<void> {
    try {
      logger.debug('Checking for sessions needing reminders');

      const bookings = await storageService.getItem<Booking[]>(BOOKINGS_KEY, []);
      const sentReminders = await this.getSentReminders();
      const now = new Date();

      // Get bookings that are confirmed/pending and in the future
      const upcomingBookings = bookings.filter((booking) => {
        if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') return false;
        const sessionTime = new Date(booking.scheduledAt);
        return sessionTime > now;
      });

      logger.debug('Found upcoming bookings', { count: upcomingBookings.length });

      for (const booking of upcomingBookings) {
        await this.processBookingReminders(booking, sentReminders, now);
      }

      // Clean up old sent reminders (older than 7 days)
      await this.cleanupOldReminders(sentReminders);
    } catch (error) {
      logger.error('Error checking reminders', { error });
    }
  }

  /**
   * Process reminders for a single booking
   */
  private async processBookingReminders(
    booking: Booking,
    sentReminders: SentReminder[],
    now: Date
  ): Promise<void> {
    const sessionTime = new Date(booking.scheduledAt);
    const hoursUntilSession = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check parent reminders
    if (booking.bookedById) {
      await this.sendReminderIfNeeded(
        booking,
        booking.bookedById,
        'parent',
        hoursUntilSession,
        sentReminders
      );
    }

    // Check coach reminders
    if (booking.coachId) {
      await this.sendReminderIfNeeded(
        booking,
        booking.coachId,
        'coach',
        hoursUntilSession,
        sentReminders
      );
    }
  }

  /**
   * Send a reminder if the user's preference matches and we haven't sent one yet
   */
  private async sendReminderIfNeeded(
    booking: Booking,
    userId: string,
    role: 'parent' | 'coach',
    hoursUntilSession: number,
    sentReminders: SentReminder[]
  ): Promise<void> {
    try {
      // Get user's reminder timing preference
      const reminderHours = await notificationPreferencesService.getSessionReminderTiming(userId);

      if (reminderHours === 0) {
        // Reminders disabled for this user
        return;
      }

      // Check if we're within the reminder window (with 10 minute grace period)
      const reminderWindowStart = reminderHours + 0.17; // Add 10 minutes
      const reminderWindowEnd = reminderHours - 0.17; // Subtract 10 minutes

      if (hoursUntilSession <= reminderWindowStart && hoursUntilSession >= reminderWindowEnd) {
        // Check if we already sent this reminder
        const alreadySent = sentReminders.some(
          (r) =>
            r.bookingId === booking.id &&
            r.userId === userId &&
            r.hours === reminderHours
        );

        if (alreadySent) {
          logger.debug('Reminder already sent', {
            bookingId: booking.id,
            userId,
            hours: reminderHours,
          });
          return;
        }

        // Send the reminder
        if (role === 'parent') {
          await notificationService.notifyParentSessionReminder({
            parentId: userId,
            childName: booking.athleteName || 'Athlete',
            coachName: booking.coachName || 'Coach',
            bookingId: booking.id,
            hoursBeforeSession: reminderHours,
          });
        } else {
          await notificationService.notifyCoachSessionReminder({
            coachId: userId,
            athleteName: booking.athleteName || 'Athlete',
            bookingId: booking.id,
            hoursBeforeSession: reminderHours,
          });
        }

        // Record that we sent this reminder
        await this.recordSentReminder(booking.id, userId, reminderHours);

        logger.info('Session reminder sent', {
          bookingId: booking.id,
          userId,
          role,
          hours: reminderHours,
        });
      }
    } catch (error) {
      logger.error('Error sending reminder', { bookingId: booking.id, userId, error });
    }
  }

  /**
   * Get the list of already-sent reminders
   */
  private async getSentReminders(): Promise<SentReminder[]> {
    return storageService.getItem<SentReminder[]>(SENT_REMINDERS_KEY, []);
  }

  /**
   * Record that a reminder was sent
   */
  private async recordSentReminder(
    bookingId: string,
    userId: string,
    hours: number
  ): Promise<void> {
    const sentReminders = await this.getSentReminders();
    sentReminders.push({
      bookingId,
      userId,
      hours,
      sentAt: new Date().toISOString(),
    });
    await storageService.setItem(SENT_REMINDERS_KEY, sentReminders);
  }

  /**
   * Clean up old sent reminders to prevent storage bloat
   */
  private async cleanupOldReminders(sentReminders: SentReminder[]): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const filtered = sentReminders.filter((r) => {
      const sentDate = new Date(r.sentAt);
      return sentDate > sevenDaysAgo;
    });

    if (filtered.length !== sentReminders.length) {
      await storageService.setItem(SENT_REMINDERS_KEY, filtered);
      logger.debug('Cleaned up old reminders', {
        removed: sentReminders.length - filtered.length,
      });
    }
  }

  /**
   * Manually trigger reminder check (useful for testing or after app comes to foreground)
   */
  async triggerCheck(): Promise<void> {
    logger.debug('Manual reminder check triggered');
    await this.checkAndSendReminders();
  }
}

export const sessionReminderService = new SessionReminderService();
