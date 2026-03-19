/**
 * Booking CRUD Service
 *
 * Handles basic CRUD operations for bookings: create, read, update, cancel.
 * Manages draft state and direct booking creation with validation.
 *
 * Uses an in-memory Map<string, Booking> cache with 30s TTL (same pattern as
 * BaseService) to avoid redundant reads from storage. All write operations
 * invalidate the cache so the next read re-populates from storage.
 *
 * API Integration Notes:
 * - Bookings are persisted via apiClient (AsyncStorage in dev, API in prod)
 * - Draft state is kept in memory for the booking flow wizard
 */

import { Booking } from '@/constants/app-types';
import type { OrganizationCommercialMode, SessionOffering } from '@/constants/types';
import { availabilityService } from '../availability-service';
import { verificationService } from '../verification-service';
import { notificationService } from '../notification-service';
import { apiClient } from '../api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationTriggers } from '../notification-trigger';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { blockService, getBlockActionMessage } from '@/services/block-service';
import { progressAttendanceService } from '@/services/progress/progress-attendance-service';
import { authService } from '@/services/auth-service';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';
import { normalizeAccountId } from '@/utils/account-id';
import { bookingAuthorityService } from './booking-authority-service';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  conflictError,
  notFound,
  validationError,
  storageError,
} from '@/types/result';

const logger = createLogger('BookingCrudService');
// Safeguarding: DBS verification required by default (fail-closed).
// Only explicit 'false' or '0' disables enforcement (dev/testing only).
const ENFORCE_DBS_SAFEGUARDING_GATE =
  process.env.EXPO_PUBLIC_ENFORCE_DBS_SAFEGUARDING_GATE !== 'false' &&
  process.env.EXPO_PUBLIC_ENFORCE_DBS_SAFEGUARDING_GATE !== '0';

/** Maximum age (ms) before cache is considered stale. */
const CACHE_MAX_AGE = 30_000;

function normalizeBookingActorId(id: string): string {
  return normalizeAccountId(id.replace(/^usr_/, '').replace(/^ath_/, ''));
}

function canUseApiBookingCreate(
  currentUser: Awaited<ReturnType<typeof authService.getCurrentUser>>,
  bookedById: string,
): boolean {
  if (!currentUser?.id) {
    return false;
  }

  if (currentUser.roles?.includes('club_admin')) {
    return true;
  }

  return normalizeBookingActorId(currentUser.id) === normalizeBookingActorId(bookedById);
}

export type BookingDraft = {
  entrySource?: string;
  sessionType?: string;
  sessionTypeLabel?: string;
  sessionOfferingId?: string;
  sessionSource?: 'direct' | 'event' | 'group';
  sessionSourceEntityId?: string;
  sessionTemplateId?: string;
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
  totalPrice?: number;
  coachId?: string;
  coachName?: string;
  clubId?: string;
  actingAs?: 'self' | 'club';
  commercialMode?: OrganizationCommercialMode;
  ownerCoachId?: string;
  assigneeCoachId?: string;
  createdByUserId?: string;
  createdByRole?: Booking['createdByRole'];
  athleteId?: string;
  athleteName?: string;
  objectives?: string[];
};

export interface CreateBookingParams {
  coachId: string;
  coachName: string;
  athleteIds: string[]; // Array of athlete IDs (supports multiple athletes)
  athleteNames: string[]; // Array of athlete names matching athleteIds
  bookedById: string;
  bookedByName: string;
  scheduledAt: string; // ISO date string with time
  duration: number;
  location: string;
  service: string;
  serviceType: string;
  sessionOfferingId?: string;
  sessionTemplateId?: string;
  sessionTemplateName?: string;
  sessionSource?: 'direct' | 'event' | 'group';
  sessionSourceEntityId?: string;
  clubId?: string;
  actingAs?: 'self' | 'club';
  commercialMode?: OrganizationCommercialMode;
  ownerCoachId?: string;
  assigneeCoachId?: string;
  createdByUserId?: string;
  createdByRole?: Booking['createdByRole'];
  objectives?: string[];
  price?: number; // Base price per athlete
  notes?: string;
  sessionInviteId?: string; // Link to session invite if created from one
  skipAvailabilityValidation?: boolean; // Skip slot validation (used by invite acceptance flow)
}

class BookingCrudService {
  private draft: BookingDraft = {};

  // ---------------------------------------------------------------------------
  // In-memory cache (mirrors BaseService pattern)
  // ---------------------------------------------------------------------------

  /** ID-indexed cache for O(1) lookups. `null` means cache is cold / invalidated. */
  private _cache: Map<string, Booking> | null = null;
  private _cacheTimestamp = 0;

  /**
   * Returns the ID-indexed cache, lazily loading from storage on first access
   * or when the cache has exceeded its TTL.
   */
  private async getCache(): Promise<Map<string, Booking>> {
    const now = Date.now();
    if (this._cache === null || now - this._cacheTimestamp > CACHE_MAX_AGE) {
      const data = await this.loadFromStorage();
      this._cache = new Map(data.map((item) => [item.id, item]));
      this._cacheTimestamp = now;
    }
    return this._cache;
  }

  /** Invalidate the in-memory cache. Called after every write operation. */
  private invalidateCache(): void {
    this._cache = null;
    this._cacheTimestamp = 0;
  }

  /** Load all bookings from storage. */
  private async loadFromStorage(): Promise<Booking[]> {
    try {
      return await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    } catch (error) {
      logger.error('Failed to load bookings from storage', error);
      return [];
    }
  }

  /** Save all bookings to storage and invalidate cache. */
  private async saveToStorage(bookings: Booking[]): Promise<Result<void, ServiceError>> {
    try {
      await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);
      this.invalidateCache();
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to save bookings to storage', error);
      return err(storageError(`Failed to save bookings: ${String(error)}`));
    }
  }

  private mergeAuthoritativeBooking(
    apiBooking: {
      id: string;
      coachUserId: string;
      bookedByUserId?: string;
      status: Booking['status'];
      scheduledAt: string;
      durationMinutes: number;
      location: string;
      serviceType?: string;
      sessionTemplateId?: string | null;
      objectives: string[];
      notes?: string | null;
      priceMinor?: number | null;
      createdAt: string;
      updatedAt: string;
      cancelledAt?: string | null;
      participants: Array<{
        athleteId: string;
        guardianUserId?: string;
        status: 'confirmed' | 'pending' | 'cancelled';
      }>;
    },
    localBooking?: Booking,
  ): Booking {
    const athleteIds = apiBooking.participants.map((participant) => participant.athleteId);
    const athleteId = localBooking?.athleteId ?? athleteIds[0];
    const bookedById = localBooking?.bookedById ?? apiBooking.bookedByUserId;

    return {
      ...localBooking,
      id: apiBooking.id,
      coachId: localBooking?.coachId ?? apiBooking.coachUserId,
      athleteIds: localBooking?.athleteIds?.length ? localBooking.athleteIds : athleteIds,
      athleteId,
      bookedById,
      status: apiBooking.status,
      scheduledAt: apiBooking.scheduledAt,
      duration: apiBooking.durationMinutes,
      location: apiBooking.location,
      serviceType: apiBooking.serviceType ?? localBooking?.serviceType,
      ...(apiBooking.sessionTemplateId ? { sessionTemplateId: apiBooking.sessionTemplateId } : {}),
      objectives: apiBooking.objectives,
      notes: apiBooking.notes ?? localBooking?.notes ?? '',
      price:
        typeof apiBooking.priceMinor === 'number'
          ? apiBooking.priceMinor / 100
          : localBooking?.price,
      participants: apiBooking.participants.map((participant) => ({
        id: participant.athleteId,
        status: participant.status,
      })),
      createdAt: apiBooking.createdAt,
      cancelledAt: apiBooking.cancelledAt ?? undefined,
      cancelReason: apiBooking.cancelledAt ? localBooking?.cancelReason : undefined,
      cancellationReason: apiBooking.cancelledAt ? localBooking?.cancellationReason : undefined,
      cancelledBy: apiBooking.cancelledAt ? localBooking?.cancelledBy : undefined,
      statusBeforeCancellation:
        apiBooking.status === 'CANCELLED' ? localBooking?.statusBeforeCancellation : undefined,
      service:
        localBooking?.service
        ?? apiBooking.serviceType
        ?? 'Session',
      isSharedSession: athleteIds.length > 1 || localBooking?.isSharedSession,
    };
  }

  private async syncAuthoritativeBookings(
    apiBookings: Array<{
      id: string;
      coachUserId: string;
      bookedByUserId?: string;
      status: Booking['status'];
      scheduledAt: string;
      durationMinutes: number;
      location: string;
      serviceType?: string;
      sessionTemplateId?: string | null;
      objectives: string[];
      notes?: string | null;
      priceMinor?: number | null;
      createdAt: string;
      updatedAt: string;
      cancelledAt?: string | null;
      participants: Array<{
        athleteId: string;
        guardianUserId?: string;
        status: 'confirmed' | 'pending' | 'cancelled';
      }>;
    }>,
  ): Promise<Booking[]> {
    const localBookings = await this.loadFromStorage();
    const localById = new Map(localBookings.map((booking) => [booking.id, booking]));
    const authoritativeIds = new Set(apiBookings.map((booking) => booking.id));

    const merged = apiBookings.map((booking) =>
      this.mergeAuthoritativeBooking(booking, localById.get(booking.id)),
    );

    const localOnly = localBookings.filter((booking) => !authoritativeIds.has(booking.id));
    const nextBookings = [...merged, ...localOnly];
    const saveResult = await this.saveToStorage(nextBookings);
    if (!saveResult.success) {
      logger.warn('Failed to mirror authoritative bookings into local storage', {
        error: saveResult.error.message,
      });
      return nextBookings;
    }

    return nextBookings;
  }

  // ---------------------------------------------------------------------------
  // Draft methods
  // ---------------------------------------------------------------------------

  getDraft() {
    return this.draft;
  }

  updateDraft(patch: Partial<BookingDraft>) {
    this.draft = { ...this.draft, ...patch };
  }

  resetDraft() {
    this.draft = {};
  }

  // ---------------------------------------------------------------------------
  // Read methods (use cache)
  // ---------------------------------------------------------------------------

  async list(): Promise<Booking[]> {
    try {
      if (!apiClient.isMockMode) {
        const apiResult = await bookingAuthorityService.listBookings();
        if (apiResult.success) {
          return this.syncAuthoritativeBookings(apiResult.data);
        }
        logger.warn('Falling back to local booking list after API read failure', {
          error: apiResult.error.message,
        });
      }

      const cache = await this.getCache();
      return Array.from(cache.values());
    } catch (error) {
      logger.error('Failed to list bookings', error);
      return [];
    }
  }

  /**
   * Get a single booking by ID.
   * Uses the O(1) cache lookup instead of scanning the full list.
   */
  async getBooking(id: string): Promise<Booking | null> {
    try {
      if (!apiClient.isMockMode) {
        const apiResult = await bookingAuthorityService.getBooking(id);
        if (apiResult.success) {
          const [localBookings] = await Promise.all([this.loadFromStorage()]);
          const localBooking = localBookings.find((entry) => entry.id === id);
          const merged = this.mergeAuthoritativeBooking(apiResult.data, localBooking);
          const otherBookings = localBookings.filter((entry) => entry.id !== id);
          const saveResult = await this.saveToStorage([...otherBookings, merged]);
          if (!saveResult.success) {
            logger.warn('Failed to mirror authoritative booking into local storage', {
              bookingId: id,
              error: saveResult.error.message,
            });
          }
          return merged;
        }
        if (apiResult.error.code !== 'NOT_FOUND') {
          logger.warn('Falling back to local booking detail after API read failure', {
            bookingId: id,
            error: apiResult.error.message,
          });
        }
      }

      const cache = await this.getCache();
      return cache.get(id) ?? null;
    } catch (error) {
      logger.error('Failed to get booking', error);
      return null;
    }
  }

  /**
   * Get a specific booking by ID.
   * Uses the O(1) cache lookup instead of scanning the full list.
   */
  async getById(id: string): Promise<Booking | undefined> {
    try {
      return (await this.getBooking(id)) ?? undefined;
    } catch (error) {
      logger.error('Failed to get booking by id', error);
      return undefined;
    }
  }

  // ---------------------------------------------------------------------------
  // Write methods (invalidate cache after every write)
  // ---------------------------------------------------------------------------

  /**
   * Update a booking with partial fields
   */
  async updateBooking(
    id: string,
    updates: Partial<Booking>,
  ): Promise<Result<Booking, ServiceError>> {
    const bookings = await this.loadFromStorage();
    const index = bookings.findIndex((b) => b.id === id);
    if (index === -1) return err(notFound('Booking', id));

    const previous = bookings[index];
    const updated = { ...previous, ...updates };
    bookings[index] = updated;
    const saveResult = await this.saveToStorage(bookings);
    if (!saveResult.success) {
      return err(saveResult.error);
    }

    if (previous.status !== 'COMPLETED' && updated.status === 'COMPLETED') {
      const ingestionResult = await progressAttendanceService.upsertCompletedBookingSessions(updated);
      if (!ingestionResult.success) {
        logger.error('Failed to ingest completed booking after status transition', {
          bookingId: updated.id,
          error: ingestionResult.error,
        });
      }
    }

    return ok(updated);
  }

  async updateStatus(id: string, status: Booking['status']) {
    const bookings = await this.loadFromStorage();
    const index = bookings.findIndex((booking) => booking.id === id);
    if (index === -1) {
      return undefined;
    }

    const previousStatus = bookings[index].status;
    bookings[index] = { ...bookings[index], status };
    const saveResult = await this.saveToStorage(bookings);
    if (!saveResult.success) {
      logger.error('Failed to update booking status', {
        bookingId: id,
        status,
        error: saveResult.error.message,
      });
      return undefined;
    }

    const updatedBooking = bookings[index];
    if (previousStatus !== 'COMPLETED' && updatedBooking.status === 'COMPLETED') {
      const ingestionResult =
        await progressAttendanceService.upsertCompletedBookingSessions(updatedBooking);
      if (!ingestionResult.success) {
        logger.error('Failed to ingest completed booking from updateStatus', {
          bookingId: updatedBooking.id,
          error: ingestionResult.error,
        });
      }
    }

    return updatedBooking;
  }

  async cancel(
    id: string,
    reason: string,
    cancelledBy: 'coach' | 'parent' = 'parent',
    options?: { allowPastBooking?: boolean; note?: string },
  ) {
    const bookings = await this.loadFromStorage();
    const booking = bookings.find((b) => b.id === id);
    if (!booking) {
      logger.warn('Booking not found for cancellation', { bookingId: id, cancelledBy });
      return undefined;
    }

    const sessionStart = new Date(booking.scheduledAt).getTime();
    if (!options?.allowPastBooking && (!Number.isFinite(sessionStart) || sessionStart <= Date.now())) {
      logger.warn('Cancellation blocked for past booking', { bookingId: id, cancelledBy });
      return undefined;
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      logger.warn('Cancellation blocked for non-active booking', {
        bookingId: id,
        status: booking.status,
        cancelledBy,
      });
      return undefined;
    }

    if (!apiClient.isMockMode) {
      const cancelResult = await bookingAuthorityService.cancelBooking(id, {
        reason,
        ...(options?.note ? { note: options.note } : {}),
      });
      if (!cancelResult.success) {
        logger.error('Failed to cancel booking via API', {
          bookingId: id,
          reason,
          cancelledBy,
          error: cancelResult.error.message,
        });
        return undefined;
      }
    }

    const updated = bookings.map((b) =>
      b.id === id
        ? {
            ...b,
            status: 'CANCELLED' as const,
            cancellationReason: reason,
            cancelledBy,
            cancelledAt: new Date().toISOString(),
            cancelReason: reason,
            statusBeforeCancellation: b.status,
          }
        : b,
    );
    const saveResult = await this.saveToStorage(updated);
    if (!saveResult.success) {
      logger.error('Failed to cancel booking', {
        bookingId: id,
        reason,
        cancelledBy,
        error: saveResult.error.message,
      });
      return undefined;
    }

    // Notify the other party about the cancellation
    if (booking) {
      const date = booking.scheduledAt
        ? new Date(booking.scheduledAt).toLocaleDateString('en-GB', {
            month: 'short',
            day: 'numeric',
          })
        : 'upcoming date';

      if (cancelledBy === 'parent') {
        // Notify coach when parent cancels
        await notificationTriggers.bookingCancelled('Parent', date, 'coach', booking.coachId);
      } else {
        // Notify parent when coach cancels
        const parentRecipientId = booking.bookedById || booking.athleteId;
        if (parentRecipientId) {
          await notificationTriggers.bookingCancelled(
            booking.coachName || 'Coach',
            date,
            'parent',
            parentRecipientId,
          );
        } else {
          logger.warn('Cancellation notification skipped: missing parent recipient', {
            bookingId: booking.id,
            coachId: booking.coachId,
          });
        }
      }

      // Emit typed event for cross-service reactions
      emitTyped(ServiceEvents.BOOKING_CANCELLED, {
        bookingId: id,
        userId: booking.bookedById ?? booking.athleteId ?? '',
        coachId: booking.coachId,
        reason,
        cancelledBy,
      });
    }

    return updated.find((b) => b.id === id);
  }

  async reopen(
    id: string,
    reopenedBy: 'coach' | 'parent' = 'parent',
    options?: { allowPastBooking?: boolean; note?: string },
  ) {
    const bookings = await this.loadFromStorage();
    const booking = bookings.find((entry) => entry.id === id);
    if (!booking) {
      logger.warn('Booking not found for reopen', { bookingId: id, reopenedBy });
      return undefined;
    }

    const sessionStart = new Date(booking.scheduledAt).getTime();
    if (!options?.allowPastBooking && (!Number.isFinite(sessionStart) || sessionStart <= Date.now())) {
      logger.warn('Reopen blocked for past booking', { bookingId: id, reopenedBy });
      return undefined;
    }

    if (booking.status !== 'CANCELLED') {
      logger.warn('Reopen blocked for non-cancelled booking', {
        bookingId: id,
        status: booking.status,
        reopenedBy,
      });
      return undefined;
    }

    let restoredStatus = booking.statusBeforeCancellation ?? 'CONFIRMED';
    if (!apiClient.isMockMode) {
      const reopenResult = await bookingAuthorityService.reopenBooking(id, {
        ...(options?.note ? { note: options.note } : {}),
      });
      if (!reopenResult.success) {
        logger.error('Failed to reopen booking via API', {
          bookingId: id,
          reopenedBy,
          error: reopenResult.error.message,
        });
        return undefined;
      }
      restoredStatus = reopenResult.data.status;
    }

    const updated = bookings.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            status: restoredStatus,
            cancellationReason: undefined,
            cancelledBy: undefined,
            cancelledAt: undefined,
            cancelReason: undefined,
            statusBeforeCancellation: undefined,
          }
        : entry,
    );
    const saveResult = await this.saveToStorage(updated);
    if (!saveResult.success) {
      logger.error('Failed to reopen booking', {
        bookingId: id,
        reopenedBy,
        error: saveResult.error.message,
      });
      return undefined;
    }

    return updated.find((entry) => entry.id === id);
  }

  /**
   * DBS safeguarding gate — fail-closed.
   * If any athlete differs from the booker (parent booking for child),
   * the coach must have a VERIFIED and non-expired background check.
   */
  private async validateDbsGate(
    coachId: string,
    athleteIds: string[],
    bookedById: string,
  ): Promise<Result<void, ServiceError>> {
    if (!ENFORCE_DBS_SAFEGUARDING_GATE) {
      logger.warn('DBS safeguarding gate DISABLED — not for production use', { coachId });
      return ok(undefined);
    }

    if (!bookedById || athleteIds.length === 0) {
      return ok(undefined);
    }

    const hasMinorAthlete = athleteIds.some((id) => id !== bookedById);
    if (!hasMinorAthlete) return ok(undefined);

    const verificationResult = await verificationService.getStatus(coachId);
    if (!verificationResult.success) {
      return err(
        validationError(
          'Unable to verify coach background check status. Booking blocked for safety.',
        ),
      );
    }

    const bg = verificationResult.data.backgroundCheck;
    if (bg.status !== 'VERIFIED') {
      return err(
        validationError(
          'This coach has not completed a DBS background check. A verified DBS is required for sessions with under-18 athletes.',
        ),
      );
    }

    if (bg.expiresAt && new Date(bg.expiresAt) < new Date()) {
      return err(
        validationError(
          "This coach's DBS background check has expired. An up-to-date DBS is required for sessions with under-18 athletes.",
        ),
      );
    }

    return ok(undefined);
  }

  /**
   * Validate booking against coach availability
   * Returns { valid: true } if slot is available, otherwise { valid: false, reason: string }
   */
  async validateBooking(
    coachId: string,
    date: string,
    startTime: string,
    durationMinutes: number = 60,
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const slots = await availabilityService.getAvailableSlots(
        coachId,
        date,
        date,
        durationMinutes,
      );

      // Find matching slot
      const matchingSlot = slots.find((slot) => slot.date === date && slot.startTime === startTime);

      if (!matchingSlot) {
        return {
          valid: false,
          reason: "This time slot is not within the coach's available hours.",
        };
      }

      if (!matchingSlot.isAvailable) {
        return { valid: false, reason: 'This time slot is already fully booked.' };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Validation error', error);
      return { valid: false, reason: 'Unable to validate availability. Please try again.' };
    }
  }

  private getBookingAthleteIds(booking: Booking): string[] {
    return Array.from(
      new Set(
        [booking.athleteId, ...(booking.athleteIds ?? [])].filter(
          (value): value is string => Boolean(value && value.trim().length > 0),
        ),
      ),
    );
  }

  private getDuplicateLinkedSessionAthleteIds(
    bookings: Booking[],
    linkedSessionEntityId: string,
    athleteIds: string[],
  ): string[] {
    const targetAthleteIds = new Set(athleteIds);
    const duplicates = new Set<string>();

    for (const booking of bookings) {
      if (booking.status === 'CANCELLED') continue;
      if (booking.sessionSourceEntityId !== linkedSessionEntityId) continue;
      for (const athleteId of this.getBookingAthleteIds(booking)) {
        if (targetAthleteIds.has(athleteId)) {
          duplicates.add(athleteId);
        }
      }
    }

    return Array.from(duplicates);
  }

  private async validateLinkedSessionCapacity(params: {
    linkedSessionEntityId: string;
    athleteIds: string[];
    existingBookings: Booking[];
  }): Promise<{ valid: boolean; reason?: string; offeringId?: string | null }> {
    const offerings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
    const offering =
      offerings.find((candidate) => candidate.id === params.linkedSessionEntityId) ??
      offerings.find((candidate) => candidate.sourceEntityId === params.linkedSessionEntityId);

    if (!offering) {
      return { valid: true, offeringId: null };
    }

    const linkedAthleteIds = new Set<string>();
    for (const registration of offering.registrations) {
      if (registration.status === 'confirmed' && registration.userId) {
        linkedAthleteIds.add(registration.userId);
      }
    }

    const linkedEntityIds = new Set<string>([
      params.linkedSessionEntityId,
      offering.id,
      offering.sourceEntityId ?? '',
    ]);

    for (const booking of params.existingBookings) {
      if (booking.status === 'CANCELLED') continue;
      if (!booking.sessionSourceEntityId || !linkedEntityIds.has(booking.sessionSourceEntityId)) {
        continue;
      }
      for (const athleteId of this.getBookingAthleteIds(booking)) {
        linkedAthleteIds.add(athleteId);
      }
    }

    const additionalAthletes = params.athleteIds.filter((athleteId) => !linkedAthleteIds.has(athleteId)).length;
    const projectedHeadcount =
      Math.max(getSessionOfferingHeadcount(offering), linkedAthleteIds.size) + additionalAthletes;
    if (projectedHeadcount > offering.maxParticipants) {
      return {
        valid: false,
        reason: 'This session is full. Please choose another session.',
        offeringId: offering.id,
      };
    }

    return { valid: true, offeringId: offering.id };
  }

  /**
   * Create a new booking with validation and notifications
   */
  async createBooking(params: CreateBookingParams): Promise<Result<Booking, ServiceError>> {
    const {
      coachId,
      coachName,
      athleteIds,
      athleteNames,
      bookedById,
      bookedByName,
      scheduledAt,
      duration,
      location,
      service,
      serviceType,
      sessionOfferingId,
      sessionTemplateId,
      sessionTemplateName,
      sessionSource,
      sessionSourceEntityId,
      clubId,
      actingAs,
      commercialMode,
      ownerCoachId,
      assigneeCoachId,
      createdByUserId,
      createdByRole,
      objectives,
      price,
      notes,
      sessionInviteId,
    } = params;

    if (!scheduledAt) {
      return err(validationError('Scheduled date/time is required'));
    }

    // Check if coach/booker have blocked each other
    const blockedResult = await blockService.getBlockStatus(bookedById, coachId);
    if (blockedResult.success && blockedResult.data.blocked) {
      logger.warn('Booking blocked due to block relationship', { coachId, bookedById });
      emitTyped(ServiceEvents.USER_ACTION_BLOCKED, {
        blockerId: blockedResult.data.blockerId ?? bookedById,
        blockedId: blockedResult.data.blockedId ?? coachId,
        action: 'create_booking',
        timestamp: new Date().toISOString(),
      });
      return err({
        code: 'CONFLICT',
        message: getBlockActionMessage('booking'),
      });
    }

    // Extract date and time from scheduledAt
    const date = scheduledAt.split('T')[0];
    const time = scheduledAt.split('T')[1]?.substring(0, 5) || '10:00';

    const linkedSessionEntityId = sessionSourceEntityId || sessionOfferingId || null;
    const validationPath = linkedSessionEntityId
      ? 'linked_session_skip_hours'
      : 'adhoc_validate_hours';
    logger.debug('Booking validation path', {
      validation_path: validationPath,
      sessionSource: sessionSource ?? null,
      sessionSourceEntityId: linkedSessionEntityId,
      actingAs: actingAs ?? 'self',
      failure_code: null,
    });

    const existingBookings = await this.loadFromStorage();
    if (linkedSessionEntityId) {
      const duplicateAthleteIds = this.getDuplicateLinkedSessionAthleteIds(
        existingBookings,
        linkedSessionEntityId,
        athleteIds,
      );
      if (duplicateAthleteIds.length > 0) {
        logger.debug('Booking validation path', {
          validation_path: validationPath,
          sessionSource: sessionSource ?? null,
          sessionSourceEntityId: linkedSessionEntityId,
          actingAs: actingAs ?? 'self',
          failure_code: 'linked_session_duplicate_athlete',
        });
        return err(conflictError('This athlete is already booked for this session.'));
      }

      const capacityValidation = await this.validateLinkedSessionCapacity({
        linkedSessionEntityId,
        athleteIds,
        existingBookings,
      });
      if (!capacityValidation.valid) {
        logger.debug('Booking validation path', {
          validation_path: validationPath,
          sessionSource: sessionSource ?? null,
          sessionSourceEntityId: linkedSessionEntityId,
          actingAs: actingAs ?? 'self',
          failure_code: 'linked_session_capacity_full',
          offeringId: capacityValidation.offeringId ?? null,
        });
        return err(conflictError(capacityValidation.reason || 'This session is full.'));
      }
    }

    // Validate against availability (skip for linked existing sessions and explicit trusted flows)
    if (!linkedSessionEntityId && !params.skipAvailabilityValidation) {
      const validation = await this.validateBooking(coachId, date, time, duration);
      if (!validation.valid) {
        logger.debug('Booking validation path', {
          validation_path: validationPath,
          sessionSource: sessionSource ?? null,
          sessionSourceEntityId: linkedSessionEntityId,
          actingAs: actingAs ?? 'self',
          failure_code: 'coach_hours_or_slot_unavailable',
        });
        return err(validationError(validation.reason || 'Booking validation failed'));
      }
    }

    // DBS safeguarding gate (fail-closed)
    const dbsResult = await this.validateDbsGate(coachId, athleteIds, bookedById);
    if (!dbsResult.success) return dbsResult;

    // Calculate total price (base price * number of athletes)
    const basePrice = price || 0;
    const totalPrice = basePrice * athleteIds.length;
    const isSharedSession = athleteIds.length > 1;
    const createdAt = new Date().toISOString();
    let authoritativeCreate:
      | {
          id: string;
          status: Booking['status'];
          scheduledAt: string;
          createdAt: string;
          serviceType?: string;
          sessionTemplateId?: string | null;
          objectives: string[];
          notes?: string | null;
          priceMinor?: number | null;
        }
      | null = null;

    if (!apiClient.isMockMode) {
      const currentUser = await authService.getCurrentUser();
      if (canUseApiBookingCreate(currentUser, bookedById)) {
        const createViaApiResult = await bookingAuthorityService.createBooking({
          coachId,
          athleteIds,
          bookedById,
          scheduledAt,
          duration,
          location,
          serviceType,
          ...(sessionTemplateId ? { sessionTemplateId } : {}),
          objectives: objectives || [],
          notes,
          totalPrice,
        });

        if (!createViaApiResult.success) {
          logger.error('Failed to create booking via API', {
            coachId,
            bookedById,
            athleteIds,
            error: createViaApiResult.error.message,
          });
          return err(createViaApiResult.error);
        }

        authoritativeCreate = {
          id: createViaApiResult.data.id,
          status: createViaApiResult.data.status,
          scheduledAt: createViaApiResult.data.scheduledAt,
          createdAt: createViaApiResult.data.createdAt,
          serviceType: createViaApiResult.data.serviceType,
          sessionTemplateId: createViaApiResult.data.sessionTemplateId,
          objectives: createViaApiResult.data.objectives,
          notes: createViaApiResult.data.notes,
          priceMinor: createViaApiResult.data.priceMinor,
        };
      } else {
        logger.debug('Skipping API booking create for delegated actor', {
          coachId,
          bookedById,
          athleteIds,
          currentUserId: currentUser?.id ?? null,
          actingAs: actingAs ?? 'self',
          createdByUserId: createdByUserId ?? null,
          createdByRole: createdByRole ?? null,
        });
      }
    }

    // Create the booking
    const newBooking = {
      id: authoritativeCreate?.id ?? apiClient.generateId('booking'),
      coachId,
      coachName,
      athleteIds,
      athleteNames,
      athleteId: athleteIds[0], // Backwards compatibility: first athlete
      bookedById,
      bookedByName,
      scheduledAt: authoritativeCreate?.scheduledAt ?? scheduledAt,
      status: authoritativeCreate?.status ?? 'CONFIRMED',
      duration,
      location,
      service,
      serviceType: authoritativeCreate?.serviceType ?? serviceType,
      ...(sessionTemplateId ? { sessionTemplateId } : {}),
      ...(sessionTemplateName ? { sessionTemplateName } : {}),
      ...(sessionSource ? { sessionSource } : {}),
      ...(linkedSessionEntityId ? { sessionSourceEntityId: linkedSessionEntityId } : {}),
      ...(clubId ? { clubId } : {}),
      ...(actingAs ? { actingAs } : {}),
      ...(commercialMode ? { commercialMode } : {}),
      ...(ownerCoachId ? { ownerCoachId } : {}),
      ...(assigneeCoachId ? { assigneeCoachId } : {}),
      ...(createdByUserId ? { createdByUserId } : {}),
      ...(createdByRole ? { createdByRole } : {}),
      objectives: authoritativeCreate?.objectives ?? (objectives || []),
      price:
        typeof authoritativeCreate?.priceMinor === 'number'
          ? authoritativeCreate.priceMinor / 100
          : totalPrice,
      isSharedSession,
      notes: authoritativeCreate?.notes ?? (notes || ''),
      createdAt: authoritativeCreate?.createdAt ?? createdAt,
      sessionInviteId, // Link to session invite if created from one
    };

    // Save to bookings storage
    try {
      const bookings = [...existingBookings];
      bookings.push(newBooking as Booking);
      const saveResult = await this.saveToStorage(bookings);
      if (!saveResult.success) {
        return err(saveResult.error);
      }

      // Create notifications for coach and parent
      await this.createBookingNotifications(
        newBooking as Booking,
        bookedByName,
        athleteNames.join(', '),
      );

      // Trigger notification for coach
      const formattedDateTime = new Date(scheduledAt).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
      });
      await notificationTriggers.bookingConfirmed(coachName, formattedDateTime, coachId);

      // Emit typed event for cross-service reactions
      emitTyped(ServiceEvents.BOOKING_CREATED, {
        bookingId: newBooking.id,
        userId: bookedById,
        coachId,
        coachName,
        athleteIds,
        athleteName: athleteNames.join(', '),
        scheduledAt,
        service,
        price: totalPrice,
      });

      return ok(newBooking as Booking);
    } catch (error) {
      logger.error('Failed to create booking', error);
      return err(storageError('Failed to save booking. Please try again.'));
    }
  }

  /**
   * Create notifications for a new booking
   */
  async createBookingNotifications(
    booking: Booking,
    bookedByName: string,
    athleteDisplayName = 'Athlete',
  ): Promise<void> {
    const scheduledDate = new Date(booking.scheduledAt);
    const formattedDate = scheduledDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = scheduledDate.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Notification for coach: New booking received
    await notificationService.create({
      id: apiClient.generateId('notif-coach'),
      type: 'booking',
      notificationType: 'BOOKING_RECEIVED',
      title: 'New Booking Request',
      body: `${bookedByName} has booked a ${booking.service} session for ${athleteDisplayName} on ${formattedDate} at ${formattedTime}.`,
      timeLabel: 'Just now',
      read: false,
      recipientId: booking.coachId,
      recipientRole: 'coach',
      deepLink: `/bookings/${booking.id}`,
      data: { bookingId: booking.id },
    });

    // Notification for parent: Booking confirmed
    await notificationService.create({
      id: apiClient.generateId('notif-parent'),
      type: 'booking',
      notificationType: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed',
      body: `Your session with Coach ${booking.coachName} for ${athleteDisplayName} is confirmed for ${formattedDate} at ${formattedTime}.`,
      timeLabel: 'Just now',
      read: false,
      recipientId: booking.bookedById,
      recipientRole: 'parent',
      deepLink: `/bookings/${booking.id}`,
      data: { bookingId: booking.id },
    });
  }

  /**
   * Create a booking from the current draft state
   * This method now routes through createBooking() for consistency
   * Note: Draft bookings skip availability validation since they're legacy flow
   */
  async createFromDraft(): Promise<Result<Booking, ServiceError>> {
    const draft = this.draft;

    // Validate required draft fields
    if (!draft.coachId || !draft.coachName) {
      return err(validationError('Cannot create booking: missing coach information'));
    }
    if (!draft.athleteId || !draft.athleteName) {
      return err(validationError('Cannot create booking: missing athlete information'));
    }

    const scheduledAt = `${draft.date || toDateStr(new Date())}T${draft.slot || '10:00'}:00`;
    const athleteIds = draft.childIds || [draft.athleteId];
    const athleteNames = draft.athleteName ? athleteIds.map(() => draft.athleteName as string) : ['Athlete'];
    const bookedById = draft.createdByUserId || draft.athleteId;

    if (!bookedById) {
      return err(validationError('Cannot create booking: missing booking owner'));
    }

    const result = await this.createBooking({
      coachId: draft.coachId,
      coachName: draft.coachName,
      athleteIds: athleteIds.filter((value): value is string => Boolean(value)),
      athleteNames,
      bookedById,
      bookedByName: draft.athleteName || 'User',
      scheduledAt,
      duration: draft.duration || 60,
      location: draft.locationText || 'Coach preferred venue',
      service: draft.sessionTypeLabel || draft.sessionType || 'Session',
      serviceType: draft.sessionType || '1-to-1',
      sessionTemplateId: draft.sessionTemplateId,
      sessionSource: draft.sessionSource,
      sessionSourceEntityId: draft.sessionSourceEntityId,
      clubId: draft.clubId,
      actingAs: draft.actingAs,
      commercialMode: draft.commercialMode,
      ownerCoachId: draft.ownerCoachId,
      assigneeCoachId: draft.assigneeCoachId,
      createdByUserId: draft.createdByUserId,
      createdByRole: draft.createdByRole,
      objectives: draft.objectives || [],
      price: draft.price || 0,
      notes: draft.notes || '',
      skipAvailabilityValidation: true,
    });

    if (result.success) {
      this.resetDraft();
    }

    return result;
  }

  /**
   * Create multiple bookings at once for a multi-week series.
   * Skips per-slot availability validation (caller is responsible).
   * Each booking gets the provided seriesId and its index within the series.
   */
  async createMultipleBookings(bookings: Booking[]): Promise<Result<Booking[], ServiceError>> {
    try {
      // DBS safeguarding gate for each booking in batch
      for (const booking of bookings) {
        const dbsResult = await this.validateDbsGate(
          booking.coachId,
          booking.athleteIds ?? [],
          booking.bookedById ?? '',
        );
        if (!dbsResult.success) return err(dbsResult.error);
      }

      const existing = await this.loadFromStorage();
      existing.push(...bookings);
      const saveResult = await this.saveToStorage(existing);
      if (!saveResult.success) {
        return err(saveResult.error);
      }

      // Emit events for each booking
      for (const booking of bookings) {
        emitTyped(ServiceEvents.BOOKING_CREATED, {
          bookingId: booking.id,
          userId: booking.bookedById ?? '',
          coachId: booking.coachId,
          coachName: booking.coachName,
          athleteIds: booking.athleteIds,
          athleteName: booking.athleteIds?.length
            ? booking.athleteIds.length === 1
              ? booking.athleteIds[0]
              : `${booking.athleteIds.length} athletes`
            : undefined,
          scheduledAt: booking.scheduledAt,
          service: booking.service,
          price: booking.price,
        });
      }

      logger.info(`Created ${bookings.length} bookings in batch`);
      return ok(bookings);
    } catch (error) {
      logger.error('Failed to create multiple bookings', error);
      return err(storageError('Failed to create bookings batch'));
    }
  }

  /**
   * Save a booking directly without validation (for internal service use only)
   * Used by recurringBookingService and other trusted callers
   */
  async saveBookingDirect(booking: Booking): Promise<{ success: boolean; error?: string }> {
    try {
      const bookings = await this.loadFromStorage();
      bookings.push(booking);
      const saveResult = await this.saveToStorage(bookings);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error.message };
      }
      return { success: true };
    } catch (error) {
      logger.error('Failed to save booking directly', error);
      return { success: false, error: 'Failed to save booking' };
    }
  }
}

export const bookingCrudService = new BookingCrudService();
