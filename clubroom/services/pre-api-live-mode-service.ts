import type { Booking, User } from '@/constants/app-types';
import { api, preApiLive } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { UserRole } from '@/constants/user-types';
import { apiClient } from '@/services/api-client';
import { ensureCoachSessionsSeeded } from '@/services/coach-session-seed-service';
import { invoiceService } from '@/services/invoice-service';
import { messagingService } from '@/services/messaging-service';
import { notificationStore } from '@/services/notification/notification-store';
import {
  ensureProgressDemoSeeded,
  ensureUser1DiamondTestDataSeeded,
} from '@/services/progress/progress-demo-seed-lazy-service';
import { recurringBookingService } from '@/services/recurring-booking-service';
import { ensureRelationalDemoSeeded } from '@/services/relational-demo-seed-service';
import { socialFeedService } from '@/services/social-feed-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';

const logger = createLogger('PreApiLiveModeService');

interface LiveModeUserContext {
  userId: string;
  role: UserRole;
  displayName: string;
}

interface UserChildReference {
  childId: string;
  childName?: string;
}

interface UserWithChildren extends User {
  children?: UserChildReference[];
}

const PULSE_MESSAGES = [
  'Quick update: tomorrow session plan now includes an extra finishing block.',
  'Coach note: keep hydration high today, we are increasing intensity this week.',
  'New clip review posted. Check your last session notes for two focus points.',
  'Live reminder: arrive 10 minutes early for dynamic warm-up.',
];

const FEED_PULSE_UPDATES = [
  {
    title: 'Training Block Updated',
    body: 'Tonight includes extra first-touch reps and a final pressing game.',
  },
  {
    title: 'Coach Clip Added',
    body: 'A new walkthrough clip was posted for build-up play under pressure.',
  },
  {
    title: 'Session Reminder',
    body: 'Arrive 10 minutes early for activation and mobility prep.',
  },
  {
    title: 'Focus Point',
    body: 'Keep shoulders open before receiving to find the next pass faster.',
  },
];

const FEED_COACH_FALLBACKS = [
  { id: 'coach1', name: 'Jess Okafor', clubId: 'club_lions' },
  { id: 'coach2', name: 'Reuben Carr', clubId: 'club_eagles' },
  { id: 'coach3', name: 'Aiden Sharma', clubId: 'club_warriors' },
];

function toRecipientRole(role: UserRole): 'coach' | 'parent' {
  return role === 'COACH' ? 'coach' : 'parent';
}

function formatTimeLabel(now: Date): string {
  return `just now (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
}

class PreApiLiveModeService {
  private interval: ReturnType<typeof setInterval> | null = null;
  private unsubscribeAppActive: (() => void) | null = null;
  private activeContext: LiveModeUserContext | null = null;
  private bootstrappedUsers = new Set<string>();
  private bootstrapInFlight: Promise<void> | null = null;
  private pulseInFlight: Promise<void> | null = null;
  private pulseCounter = 0;

  private get enabled(): boolean {
    return api.useMock && preApiLive.enabled;
  }

  async start(context: LiveModeUserContext): Promise<void> {
    this.activeContext = context;

    if (!this.enabled) {
      this.stop();
      return;
    }

    await this.bootstrapIfNeeded(context);
    this.ensurePulseLoop();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.unsubscribeAppActive) {
      this.unsubscribeAppActive();
      this.unsubscribeAppActive = null;
    }
    this.activeContext = null;
  }

  private ensurePulseLoop(): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      void this.pulse('interval');
    }, preApiLive.pulseIntervalMs);

    this.unsubscribeAppActive = onTyped(ServiceEvents.APP_ACTIVE, () => {
      void this.pulse('active');
    });
  }

  private async bootstrapIfNeeded(context: LiveModeUserContext): Promise<void> {
    if (!preApiLive.seedOnAuth || this.bootstrappedUsers.has(context.userId)) {
      return;
    }

    if (this.bootstrapInFlight) {
      return this.bootstrapInFlight;
    }

    this.bootstrapInFlight = (async () => {
      try {
        const [previousBootstrapUser] = await Promise.all([
          apiClient.get<string>(STORAGE_KEYS.PRE_API_LIVE_LAST_BOOTSTRAP_USER, ''),
          ensureRelationalDemoSeeded(),
        ]);
        const currentSeedVersion = await apiClient.get<string>(
          STORAGE_KEYS.RELATIONAL_DEMO_SEED_VERSION,
          '',
        );

        if (!currentSeedVersion || previousBootstrapUser !== context.userId) {
          await ensureRelationalDemoSeeded({ force: true });
        }

        await ensureCoachSessionsSeeded();
        await Promise.all([
          this.ensureSectionCoverage(context),
          this.ensureWarmNotifications(context),
          apiClient.set(STORAGE_KEYS.PRE_API_LIVE_LAST_BOOTSTRAP_USER, context.userId),
        ]);
        this.bootstrappedUsers.add(context.userId);

        logger.info('pre_api_live_bootstrap_complete', { userId: context.userId });
      } catch (error) {
        logger.warn('pre_api_live_bootstrap_failed', { userId: context.userId, error });
      } finally {
        this.bootstrapInFlight = null;
      }
    })();

    return this.bootstrapInFlight;
  }

  private async ensureWarmNotifications(context: LiveModeUserContext): Promise<void> {
    const listResult = await notificationStore.list();
    if (!listResult.success) return;

    const existingForUser = listResult.data.filter(
      (notification) => notification.recipientId === context.userId,
    );
    if (existingForUser.length > 0) return;

    const now = new Date();
    await notificationStore.create({
      id: `pre_live_bootstrap_${context.userId}_${now.getTime()}`,
      type: 'reminder',
      title: 'Live Test Mode Active',
      body: 'You are seeing continuously refreshed marketplace activity.',
      timeLabel: formatTimeLabel(now),
      read: false,
      recipientId: context.userId,
      recipientRole: toRecipientRole(context.role),
      notificationType: 'SESSION_REMINDER',
      deepLink: '/notifications',
      createdAt: now.toISOString(),
      data: {
        mode: 'pre-api-live',
      },
    });
  }

  private async pulse(source: 'interval' | 'active'): Promise<void> {
    if (!this.enabled || !this.activeContext) return;

    const nowMs = Date.now();
    const lastPulseAt = await apiClient.get<number>(STORAGE_KEYS.PRE_API_LIVE_LAST_PULSE_AT, 0);
    if (source === 'active' && nowMs - lastPulseAt < 12_000) {
      return;
    }

    if (this.pulseInFlight) {
      return this.pulseInFlight;
    }

    this.pulseInFlight = (async () => {
      try {
        this.pulseCounter += 1;
        const mode =
          this.pulseCounter % 3 === 0
            ? 'feed'
            : this.pulseCounter % 2 === 0
              ? 'message'
              : 'notification';

        if (mode === 'message') {
          await this.injectMessagePulse();
        } else if (mode === 'feed') {
          await this.injectFeedPulse();
        } else {
          await this.injectNotificationPulse();
        }

        await apiClient.set(STORAGE_KEYS.PRE_API_LIVE_LAST_PULSE_AT, nowMs);
      } catch (error) {
        logger.debug('pre_api_live_pulse_skipped', { source, error });
      } finally {
        this.pulseInFlight = null;
      }
    })();

    return this.pulseInFlight;
  }

  private async injectMessagePulse(): Promise<void> {
    const threadsResult = await messagingService.listThreads();
    if (!threadsResult.success || threadsResult.data.length === 0) {
      await this.injectNotificationPulse();
      return;
    }

    const thread = threadsResult.data[this.pulseCounter % threadsResult.data.length];
    const body = PULSE_MESSAGES[this.pulseCounter % PULSE_MESSAGES.length];
    await messagingService.simulateIncoming(thread.id, body, 'Coach Live');
  }

  private async injectNotificationPulse(): Promise<void> {
    if (!this.activeContext) return;

    const now = new Date();
    const booking = await this.pickRelevantBooking(this.activeContext);
    const title =
      this.activeContext.role === 'COACH' ? 'New Activity in Your Schedule' : 'Session Update';

    const body = booking
      ? `Live update for ${booking.location}: ${booking.serviceType || booking.service || 'training'} at ${new Date(booking.scheduledAt).toLocaleString()}.`
      : 'Live update: new marketplace activity was generated for testing.';

    await notificationStore.create({
      id: `pre_live_pulse_${this.activeContext.userId}_${now.getTime()}`,
      type: booking ? 'booking' : 'community',
      title,
      body,
      timeLabel: formatTimeLabel(now),
      read: false,
      recipientId: this.activeContext.userId,
      recipientRole: toRecipientRole(this.activeContext.role),
      notificationType: booking ? 'BOOKING_CONFIRMED' : 'MESSAGE_RECEIVED',
      deepLink: booking ? `/bookings/${booking.id}` : '/notifications',
      createdAt: now.toISOString(),
      data: booking
        ? {
            bookingId: booking.id,
          }
        : {
            mode: 'pre-api-live',
          },
    });
  }

  private async injectFeedPulse(): Promise<void> {
    if (!this.activeContext) return;

    const update = FEED_PULSE_UPDATES[this.pulseCounter % FEED_PULSE_UPDATES.length];
    const now = new Date();
    const suffix = `Live update ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const coachCandidates =
      this.activeContext.role === 'COACH'
        ? [
            {
              id: this.activeContext.userId,
              name: this.activeContext.displayName || 'Coach Live',
              clubId: 'club_lions',
            },
            ...FEED_COACH_FALLBACKS,
          ]
        : FEED_COACH_FALLBACKS;

    for (const coach of coachCandidates) {
      const result = socialFeedService.createCoachPost({
        coachId: coach.id,
        coachName: coach.name,
        clubId: coach.clubId,
        title: update.title,
        body: `${update.body}\n\n${suffix}.`,
        postType: 'announcement',
        feedType: 'BOTH',
      });
      if (result.success) {
        return;
      }
    }

    await this.injectNotificationPulse();
  }

  private async ensureSectionCoverage(context: LiveModeUserContext): Promise<void> {
    const coverageResults = await Promise.allSettled([
      this.ensureRecurringCoverage(context),
      this.ensureInvoiceCoverage(context),
      this.ensureProgressCoverage(context),
    ]);

    const failed = coverageResults.filter((result) => result.status === 'rejected').length;
    if (failed > 0) {
      logger.warn('pre_api_live_section_coverage_partial', { userId: context.userId, failed });
    }
  }

  private async ensureRecurringCoverage(context: LiveModeUserContext): Promise<void> {
    const booking = await this.pickRelevantBooking(context);
    if (!booking?.coachId) return;

    const ownerId = booking.bookedById || booking.athleteId || context.userId;
    const existing = await apiClient.get<{ userId: string; coachId: string; status?: string }[]>(
      STORAGE_KEYS.RECURRING_BOOKINGS,
      [],
    );
    const hasLinkedRecurring = existing.some(
      (entry) =>
        entry.userId === ownerId &&
        entry.coachId === booking.coachId &&
        entry.status !== 'CANCELLED',
    );
    if (hasLinkedRecurring) return;

    const start = new Date(booking.scheduledAt || Date.now());
    const end = new Date(start);
    end.setDate(end.getDate() + 84);

    const result = await recurringBookingService.createRecurring({
      userId: ownerId,
      coachId: booking.coachId,
      athleteId: booking.athleteId,
      dayOfWeek: start.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      time: toTimeHHMM(start),
      duration: booking.duration ?? 60,
      location: booking.location || 'Training Ground',
      sessionType: booking.serviceType || booking.service || '1-on-1 Training',
      frequency: 'WEEKLY',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      pricePerSession: booking.price,
      notes: 'Auto-seeded for pre-API live mode coverage.',
      createdByUserId: context.userId,
      createdByRole: context.role,
      clubId: booking.clubId,
    });

    if (!result.success) {
      logger.warn('pre_api_live_recurring_seed_failed', {
        userId: context.userId,
        bookingId: booking.id,
      });
    }
  }

  private async ensureInvoiceCoverage(context: LiveModeUserContext): Promise<void> {
    const userInvoices = await invoiceService.getUserInvoices(context.userId, 1);
    if (userInvoices.length > 0) return;

    const allBookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const linkedBooking = allBookings.find(
      (booking) => this.isBookingLinkedToContext(context, booking) && (booking.price ?? 0) > 0,
    );

    if (linkedBooking?.id) {
      const generatedResult = await invoiceService.generateInvoice({
        bookingId: linkedBooking.id,
        notes: 'Auto-generated demo invoice for pre-API live mode.',
      });
      if (generatedResult.success) {
        return;
      }
    }

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 14);

    await invoiceService.upsertInvoice({
      id: `inv_pre_live_${context.userId}_${now.getTime()}`,
      invoiceNumber: `INV-LIVE-${now.getFullYear()}-${String(now.getTime()).slice(-5)}`,
      userId: context.userId,
      bookingId: linkedBooking?.id || `booking_pre_live_${context.userId}`,
      coachId: linkedBooking?.coachId || 'coach1',
      athleteId:
        linkedBooking?.athleteId || (context.role === 'COACH' ? undefined : context.userId),
      sessionDate: linkedBooking?.scheduledAt || now.toISOString(),
      sessionType: linkedBooking?.serviceType || linkedBooking?.service || '1-on-1 Training',
      sessionLocation: linkedBooking?.location || 'Community Sports Ground',
      sessionDuration: linkedBooking?.duration ?? 60,
      amount: 45,
      tax: 9,
      taxRate: 20,
      total: 54,
      currency: 'GBP',
      status: 'SENT',
      createdAt: now.toISOString(),
      dueDate: dueDate.toISOString(),
      notes: 'Pre-API live mode synthetic invoice.',
      coachBusinessName: 'Clubroom Demo Coaching',
      coachBusinessEmail: 'billing@clubroom.demo',
    });
  }

  private async ensureProgressCoverage(context: LiveModeUserContext): Promise<void> {
    const [users, bookings] = await Promise.all([
      apiClient.get<User[]>(STORAGE_KEYS.USERS, []),
      apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const usersWithChildren = users as UserWithChildren[];
    const athleteIds = new Set<string>();
    const athleteNameHints = new Map<string, string>();

    for (const booking of bookings) {
      if (!this.isBookingLinkedToContext(context, booking)) continue;
      if (booking.athleteId) {
        athleteIds.add(booking.athleteId);
      }
      booking.athleteIds?.forEach((athleteId) => athleteIds.add(athleteId));
    }

    const contextUser = usersWithChildren.find((user) => user.id === context.userId);
    for (const childRef of contextUser?.children ?? []) {
      if (!childRef.childId) continue;
      athleteIds.add(childRef.childId);
      if (childRef.childName?.trim()) {
        athleteNameHints.set(childRef.childId, childRef.childName.trim());
      }
    }

    if (context.role !== 'COACH' && usersById.get(context.userId)?.role === 'USER') {
      athleteIds.add(context.userId);
    }

    const athleteTargets = Array.from(athleteIds).filter(Boolean).slice(0, 4);
    if (athleteTargets.length === 0) {
      athleteTargets.push('user1');
    }

    if (athleteTargets.includes('user1')) {
      const user1Result = await ensureUser1DiamondTestDataSeeded();
      if (!user1Result.success) {
        logger.warn('pre_api_live_progress_seed_user1_failed', { userId: context.userId });
      }
    }

    const seedResults = await Promise.all(
      athleteTargets.flatMap((athleteId) => {
        if (athleteId === 'user1') return [];
        const athleteName = usersById.get(athleteId)?.name || athleteNameHints.get(athleteId);
        return [
          ensureProgressDemoSeeded(athleteId, athleteName).then((result) => ({
            athleteId,
            result,
          })),
        ];
      }),
    );
    seedResults.forEach(({ athleteId, result }) => {
      if (!result.success) {
        logger.warn('pre_api_live_progress_seed_failed', {
          userId: context.userId,
          athleteId,
        });
      }
    });
  }

  private isBookingLinkedToContext(context: LiveModeUserContext, booking: Booking): boolean {
    if (context.role === 'COACH') {
      return booking.coachId === context.userId;
    }
    if (booking.bookedById === context.userId) {
      return true;
    }
    if (booking.athleteId === context.userId) {
      return true;
    }
    return booking.athleteIds?.includes(context.userId) ?? false;
  }

  private async pickRelevantBooking(context: LiveModeUserContext): Promise<Booking | null> {
    const all = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    if (all.length === 0) return null;

    const now = Date.now();
    const upcoming = all
      .filter((booking) => {
        const when = new Date(booking.scheduledAt).getTime();
        if (Number.isNaN(when) || when < now) return false;
        return this.isBookingLinkedToContext(context, booking);
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    if (upcoming.length > 0) {
      return upcoming[0];
    }

    const byRole = all.filter((booking) => this.isBookingLinkedToContext(context, booking));
    return byRole[0] ?? all[0] ?? null;
  }
}

function toTimeHHMM(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export const preApiLiveModeService = new PreApiLiveModeService();
export type { LiveModeUserContext };
