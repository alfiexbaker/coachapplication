/**
 * Counter-Offer Service
 *
 * Handles the full negotiation flow for booking time changes between
 * parents and coaches. Enables back-and-forth proposals until agreement.
 *
 * FLOW:
 * 1. PARENT/COACH: Views booking -> Proposes new time
 * 2. OTHER PARTY: Gets notification -> Reviews counter-offer
 * 3. OTHER PARTY: Accepts (booking updated) / Rejects (with reason) / Counter-proposes
 * 4. REPEAT until resolved or expired
 *
 * API Integration Notes:
 * - POST /api/counter-offers - Create counter-offer
 * - GET /api/counter-offers?bookingId=X - Get offers for booking
 * - GET /api/counter-offers/pending?userId=X - Get pending offers for user
 * - PATCH /api/counter-offers/:id/accept - Accept counter-offer
 * - PATCH /api/counter-offers/:id/reject - Reject counter-offer
 * - GET /api/negotiations/:bookingId - Get negotiation history
 */

import { apiClient } from './api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { bookingService } from './booking-service';
import type {
  CounterOffer,
  CounterOfferStatus,
  CounterOfferProposerRole,
  NegotiationHistory,
  TimeSlot,
  NotificationItem,
} from '@/constants/types';
import { notificationService } from './notification-service';
import { userService } from './user-service';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, notFound, storageError } from '@/types/result';
import { emitTyped, ServiceEvents } from './event-bus';

const logger = createLogger('CounterOfferService');

// Using centralized storage keys
const USE_MOCK = api.useMock;

// Default expiry for counter-offers (48 hours)
const DEFAULT_EXPIRY_HOURS = 48;

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) {
    return fallback;
  }

  return userResult.data.name?.trim() || fallback;
}

// Mock data for development
const MOCK_COUNTER_OFFERS: CounterOffer[] = [
  {
    id: 'co_1',
    bookingId: 'booking_1',
    proposedBy: 'PARENT',
    proposerId: 'parent_1',
    originalTime: {
      date: '2026-01-15',
      startTime: '16:00',
      endTime: '17:00',
      location: 'Hackney Marshes',
    },
    proposedTime: {
      date: '2026-01-16',
      startTime: '17:00',
      endTime: '18:00',
      location: 'Hackney Marshes',
    },
    status: 'PENDING',
    message: 'Tom has football practice on Wednesday, could we move to Thursday instead?',
    createdAt: '2026-01-10T14:00:00Z',
    expiresAt: '2026-01-12T14:00:00Z',
  },
];

const MOCK_NEGOTIATIONS: NegotiationHistory[] = [
  {
    id: 'neg_1',
    bookingId: 'booking_1',
    coachId: 'coach1',
    parentId: 'parent_1',
    athleteId: 'athlete_1',
    offers: MOCK_COUNTER_OFFERS,
    originalTime: {
      date: '2026-01-15',
      startTime: '16:00',
      endTime: '17:00',
      location: 'Hackney Marshes',
    },
    status: 'IN_PROGRESS',
    createdAt: '2026-01-10T14:00:00Z',
  },
];

let counterOffersCache: CounterOffer[] = [...MOCK_COUNTER_OFFERS];
let negotiationsCache: NegotiationHistory[] = [...MOCK_NEGOTIATIONS];

export interface CreateCounterOfferInput {
  bookingId: string;
  proposedBy: CounterOfferProposerRole;
  proposerId: string;
  proposerName: string;
  originalTime: TimeSlot;
  proposedTime: TimeSlot;
  message?: string;
  expiryHours?: number;
}

export interface RejectCounterOfferInput {
  offerId: string;
  reason?: string;
}

async function loadCounterOffersFromStorage(): Promise<CounterOffer[]> {
  try {
    const stored = await apiClient.get<CounterOffer[] | null>(STORAGE_KEYS.COUNTER_OFFERS, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load counter offers', error);
  }
  return [...MOCK_COUNTER_OFFERS];
}

async function saveCounterOffersToStorage(offers: CounterOffer[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.COUNTER_OFFERS, offers);
  } catch (error) {
    logger.error('Failed to save counter offers', error);
  }
}

async function loadNegotiationsFromStorage(): Promise<NegotiationHistory[]> {
  try {
    const stored = await apiClient.get<NegotiationHistory[] | null>(STORAGE_KEYS.NEGOTIATIONS, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load negotiations', error);
  }
  return [...MOCK_NEGOTIATIONS];
}

async function saveNegotiationsToStorage(negotiations: NegotiationHistory[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.NEGOTIATIONS, negotiations);
  } catch (error) {
    logger.error('Failed to save negotiations', error);
  }
}

function formatTimeSlot(slot: TimeSlot): string {
  const date = new Date(slot.date);
  const dateStr = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${dateStr} at ${slot.startTime}`;
}

export const counterOfferService = {
  /**
   * Create a new counter-offer for a booking
   * Sends notification to the other party
   */
  async createCounterOffer(input: CreateCounterOfferInput): Promise<Result<CounterOffer, ServiceError>> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (input.expiryHours || DEFAULT_EXPIRY_HOURS));

      const newOffer: CounterOffer = {
        id: `co_${Date.now()}`,
        bookingId: input.bookingId,
        proposedBy: input.proposedBy,
        proposerId: input.proposerId,
        originalTime: input.originalTime,
        proposedTime: input.proposedTime,
        status: 'PENDING',
        message: input.message,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      if (USE_MOCK) {
        counterOffersCache = await loadCounterOffersFromStorage();
        counterOffersCache.push(newOffer);
        await saveCounterOffersToStorage(counterOffersCache);

        // Update or create negotiation history
        negotiationsCache = await loadNegotiationsFromStorage();
        const existingNeg = negotiationsCache.find((n) => n.bookingId === input.bookingId);

        if (existingNeg) {
          existingNeg.offers.push(newOffer);
          existingNeg.status = 'IN_PROGRESS';
        } else {
          // Create new negotiation - would need booking details in real implementation
          const newNegotiation: NegotiationHistory = {
            id: `neg_${Date.now()}`,
            bookingId: input.bookingId,
            coachId: input.proposedBy === 'COACH' ? input.proposerId : 'coach1',
            parentId: input.proposedBy === 'PARENT' ? input.proposerId : 'parent_1',
            athleteId: 'athlete_1',
            offers: [newOffer],
            originalTime: input.originalTime,
            status: 'IN_PROGRESS',
            createdAt: new Date().toISOString(),
          };
          negotiationsCache.push(newNegotiation);
        }

        await saveNegotiationsToStorage(negotiationsCache);

        // Create notification for the other party
        const notification: NotificationItem = {
          id: `notif_co_${Date.now()}`,
          type: 'booking',
          title: 'Time Change Request',
          body: `${input.proposerName} has proposed a new time: ${formatTimeSlot(input.proposedTime)}`,
          timeLabel: 'Just now',
          read: false,
          actionLabel: 'Review Proposal',
        };

        const notifyResult = await notificationService.create(notification);
        if (!notifyResult.success) {
          logger.warn('Failed to create counter-offer notification', { error: notifyResult.error });
        }
        emitTyped(ServiceEvents.COUNTER_OFFER_CREATED, {
          offerId: newOffer.id,
          bookingId: newOffer.bookingId,
          proposedBy: newOffer.proposedBy,
          proposerId: newOffer.proposerId,
          proposerName: input.proposerName,
          expiresAt: newOffer.expiresAt,
        });

        return ok(newOffer);
      }

      // API call would go here
      const response = await fetch('/api/counter-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOffer),
      });
      const createdOffer = await response.json();
      emitTyped(ServiceEvents.COUNTER_OFFER_CREATED, {
        offerId: createdOffer.id ?? newOffer.id,
        bookingId: createdOffer.bookingId ?? newOffer.bookingId,
        proposedBy: createdOffer.proposedBy ?? newOffer.proposedBy,
        proposerId: createdOffer.proposerId ?? newOffer.proposerId,
        proposerName: createdOffer.proposerName ?? input.proposerName,
        expiresAt: createdOffer.expiresAt ?? newOffer.expiresAt,
      });
      return ok(createdOffer as CounterOffer);
    } catch (error) {
      logger.error('Failed to create counter-offer', { input, error });
      return err(storageError('Failed to create counter-offer'));
    }
  },

  /**
   * Accept a counter-offer
   * Updates booking time and notifies proposer
   */
  async acceptCounterOffer(offerId: string): Promise<Result<CounterOffer, ServiceError>> {
    if (USE_MOCK) {
      counterOffersCache = await loadCounterOffersFromStorage();
      const index = counterOffersCache.findIndex((o) => o.id === offerId);

      if (index === -1) {
        return err(notFound('Counter-offer', offerId));
      }

      const offer = counterOffersCache[index];
      counterOffersCache[index] = {
        ...offer,
        status: 'ACCEPTED',
        respondedAt: new Date().toISOString(),
      };

      await saveCounterOffersToStorage(counterOffersCache);

      // Update negotiation status
      negotiationsCache = await loadNegotiationsFromStorage();
      const negotiation = negotiationsCache.find((n) => n.bookingId === offer.bookingId);
      if (negotiation) {
        negotiation.status = 'RESOLVED';
        negotiation.finalTime = offer.proposedTime;
        negotiation.resolvedAt = new Date().toISOString();

        // Update the offer in the negotiation
        const offerIndex = negotiation.offers.findIndex((o) => o.id === offerId);
        if (offerIndex !== -1) {
          negotiation.offers[offerIndex].status = 'ACCEPTED';
          negotiation.offers[offerIndex].respondedAt = new Date().toISOString();
        }
      }
      await saveNegotiationsToStorage(negotiationsCache);

      // Notify proposer
      const notification: NotificationItem = {
        id: `notif_co_accepted_${Date.now()}`,
        type: 'booking',
        title: 'Time Change Accepted!',
        body: `Your proposed time of ${formatTimeSlot(offer.proposedTime)} has been accepted.`,
        timeLabel: 'Just now',
        read: false,
      };

      await notificationService.create(notification);

      // CRITICAL: Create a real booking when counter-offer is accepted
      if (offer.proposedTime) {
        const negotiation = negotiationsCache.find((n) => n.bookingId === offer.bookingId);
        if (negotiation) {
          const scheduledAt = `${offer.proposedTime.date}T${offer.proposedTime.startTime}:00`;
          const [startH, startM] = offer.proposedTime.startTime.split(':').map(Number);
          const [endH, endM] = offer.proposedTime.endTime.split(':').map(Number);
          const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
          const [coachName, athleteName, parentName] = await Promise.all([
            resolveUserName(negotiation.coachId, 'Coach'),
            resolveUserName(negotiation.athleteId, 'Athlete'),
            resolveUserName(negotiation.parentId, 'Parent'),
          ]);

          const bookingResult = await bookingService.createBooking({
            coachId: negotiation.coachId,
            coachName,
            athleteIds: [negotiation.athleteId],
            athleteNames: [athleteName],
            bookedById: negotiation.parentId,
            bookedByName: parentName,
            scheduledAt,
            duration: durationMinutes > 0 ? durationMinutes : 60,
            location: offer.proposedTime.location || 'Coach preferred location',
            service: 'Rescheduled Session',
            serviceType: '1-on-1',
          });

          if (bookingResult.success) {
            logger.info('Booking created from counter-offer', { bookingId: bookingResult.data?.id });
          } else {
            logger.error('Failed to create booking from counter-offer', { error: bookingResult.error?.message });
          }
        }
      }

      const acceptedOffer = counterOffersCache[index];
      emitTyped(ServiceEvents.COUNTER_OFFER_ACCEPTED, {
        offerId: acceptedOffer.id,
        bookingId: acceptedOffer.bookingId,
        respondedAt: acceptedOffer.respondedAt ?? new Date().toISOString(),
      });
      return ok(acceptedOffer);
    }

    const response = await fetch(`/api/counter-offers/${offerId}/accept`, {
      method: 'PATCH',
    });
    const acceptedOffer = await response.json();
    emitTyped(ServiceEvents.COUNTER_OFFER_ACCEPTED, {
      offerId: acceptedOffer.id ?? offerId,
      bookingId: acceptedOffer.bookingId ?? '',
      respondedAt: acceptedOffer.respondedAt ?? new Date().toISOString(),
    });
    return ok(acceptedOffer);
  },

  /**
   * Reject a counter-offer with optional reason
   * Notifies proposer of rejection
   */
  async rejectCounterOffer(input: RejectCounterOfferInput): Promise<Result<CounterOffer, ServiceError>> {
    if (USE_MOCK) {
      counterOffersCache = await loadCounterOffersFromStorage();
      const index = counterOffersCache.findIndex((o) => o.id === input.offerId);

      if (index === -1) {
        return err(notFound('Counter-offer', input.offerId));
      }

      const offer = counterOffersCache[index];
      counterOffersCache[index] = {
        ...offer,
        status: 'REJECTED',
        rejectionReason: input.reason,
        respondedAt: new Date().toISOString(),
      };

      await saveCounterOffersToStorage(counterOffersCache);

      // Update negotiation
      negotiationsCache = await loadNegotiationsFromStorage();
      const negotiation = negotiationsCache.find((n) => n.bookingId === offer.bookingId);
      if (negotiation) {
        const offerIndex = negotiation.offers.findIndex((o) => o.id === input.offerId);
        if (offerIndex !== -1) {
          negotiation.offers[offerIndex].status = 'REJECTED';
          negotiation.offers[offerIndex].rejectionReason = input.reason;
          negotiation.offers[offerIndex].respondedAt = new Date().toISOString();
        }
      }
      await saveNegotiationsToStorage(negotiationsCache);

      // Notify proposer
      const reasonText = input.reason ? ` Reason: ${input.reason}` : '';
      const notification: NotificationItem = {
        id: `notif_co_rejected_${Date.now()}`,
        type: 'booking',
        title: 'Time Change Declined',
        body: `Your proposed time of ${formatTimeSlot(offer.proposedTime)} was declined.${reasonText}`,
        timeLabel: 'Just now',
        read: false,
        actionLabel: 'Propose New Time',
      };

      await notificationService.create(notification);

      const rejectedOffer = counterOffersCache[index];
      emitTyped(ServiceEvents.COUNTER_OFFER_REJECTED, {
        offerId: rejectedOffer.id,
        bookingId: rejectedOffer.bookingId,
        respondedAt: rejectedOffer.respondedAt ?? new Date().toISOString(),
        reason: input.reason,
      });
      return ok(rejectedOffer);
    }

    const response = await fetch(`/api/counter-offers/${input.offerId}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: input.reason }),
    });
    const rejectedOffer = await response.json();
    emitTyped(ServiceEvents.COUNTER_OFFER_REJECTED, {
      offerId: rejectedOffer.id ?? input.offerId,
      bookingId: rejectedOffer.bookingId ?? '',
      respondedAt: rejectedOffer.respondedAt ?? new Date().toISOString(),
      reason: input.reason,
    });
    return ok(rejectedOffer);
  },

  /**
   * Get all counter-offers for a specific booking
   */
  async getCounterOffers(bookingId: string): Promise<Result<CounterOffer[], ServiceError>> {
    try {
      if (USE_MOCK) {
        counterOffersCache = await loadCounterOffersFromStorage();
        return ok(counterOffersCache.filter((o) => o.bookingId === bookingId));
      }

      const response = await fetch(`/api/counter-offers?bookingId=${bookingId}`);
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get counter-offers', { bookingId, error });
      return err(storageError('Failed to load counter-offers'));
    }
  },

  /**
   * Get a single counter-offer by ID
   */
  async getCounterOffer(offerId: string): Promise<Result<CounterOffer | null, ServiceError>> {
    try {
      if (USE_MOCK) {
        counterOffersCache = await loadCounterOffersFromStorage();
        return ok(counterOffersCache.find((o) => o.id === offerId) || null);
      }

      const response = await fetch(`/api/counter-offers/${offerId}`);
      if (!response.ok) return ok(null);
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get counter-offer', { offerId, error });
      return err(storageError('Failed to load counter-offer'));
    }
  },

  /**
   * Get pending counter-offers for a user
   * Filters by role and checks expiry
   */
  async getPendingCounterOffers(
    userId: string,
    role: CounterOfferProposerRole
  ): Promise<Result<CounterOffer[], ServiceError>> {
    try {
      if (USE_MOCK) {
        counterOffersCache = await loadCounterOffersFromStorage();
        const now = new Date();

        // Get offers where user is the recipient (not proposer)
        return ok(counterOffersCache.filter((o) => {
          // Only pending offers
          if (o.status !== 'PENDING') return false;

          // Not expired
          if (new Date(o.expiresAt) <= now) return false;

          // User is the recipient (opposite role from proposer)
          // If proposer is PARENT, recipient is COACH, and vice versa
          // We check if the user is the one who should respond
          // This is simplified - in production we'd check actual recipient ID
          return o.proposedBy !== role;
        }));
      }

      const response = await fetch(`/api/counter-offers/pending?userId=${userId}&role=${role}`);
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get pending counter-offers', { userId, role, error });
      return err(storageError('Failed to load pending counter-offers'));
    }
  },

  /**
   * Get all pending counter-offers that need user's attention
   * Returns offers where user is the recipient
   */
  async getActionableOffers(userId: string): Promise<Result<CounterOffer[], ServiceError>> {
    try {
      if (USE_MOCK) {
        counterOffersCache = await loadCounterOffersFromStorage();
        const now = new Date();

        return ok(counterOffersCache.filter((o) => {
          // Only pending offers
          if (o.status !== 'PENDING') return false;

          // Not expired
          if (new Date(o.expiresAt) <= now) return false;

          // User is NOT the proposer (they need to respond)
          return o.proposerId !== userId;
        }));
      }

      const response = await fetch(`/api/counter-offers/actionable?userId=${userId}`);
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get actionable counter-offers', { userId, error });
      return err(storageError('Failed to load actionable counter-offers'));
    }
  },

  /**
   * Get the full negotiation history for a booking
   */
  async getNegotiationHistory(bookingId: string): Promise<Result<NegotiationHistory | null, ServiceError>> {
    try {
      if (USE_MOCK) {
        negotiationsCache = await loadNegotiationsFromStorage();
        return ok(negotiationsCache.find((n) => n.bookingId === bookingId) || null);
      }

      const response = await fetch(`/api/negotiations/${bookingId}`);
      if (!response.ok) return ok(null);
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get negotiation history', { bookingId, error });
      return err(storageError('Failed to load negotiation history'));
    }
  },

  /**
   * Get all active negotiations for a user
   */
  async getActiveNegotiations(userId: string): Promise<Result<NegotiationHistory[], ServiceError>> {
    try {
      if (USE_MOCK) {
        negotiationsCache = await loadNegotiationsFromStorage();
        return ok(negotiationsCache.filter(
          (n) =>
            n.status === 'IN_PROGRESS' &&
            (n.coachId === userId || n.parentId === userId)
        ));
      }

      const response = await fetch(`/api/negotiations?userId=${userId}&status=IN_PROGRESS`);
      return ok(await response.json());
    } catch (error) {
      logger.error('Failed to get active negotiations', { userId, error });
      return err(storageError('Failed to load active negotiations'));
    }
  },

  /**
   * Cancel a negotiation (both parties give up)
   */
  async cancelNegotiation(bookingId: string): Promise<Result<NegotiationHistory, ServiceError>> {
    if (USE_MOCK) {
      negotiationsCache = await loadNegotiationsFromStorage();
      const index = negotiationsCache.findIndex((n) => n.bookingId === bookingId);

      if (index === -1) {
        return err(notFound('Negotiation', bookingId));
      }

      negotiationsCache[index] = {
        ...negotiationsCache[index],
        status: 'CANCELLED',
        resolvedAt: new Date().toISOString(),
      };

      await saveNegotiationsToStorage(negotiationsCache);
      return ok(negotiationsCache[index]);
    }

    const response = await fetch(`/api/negotiations/${bookingId}/cancel`, {
      method: 'PATCH',
    });
    return ok(await response.json());
  },

  /**
   * Check and expire old counter-offers
   * Would be called periodically in production
   */
  async expireOldOffers(): Promise<Result<number, ServiceError>> {
    try {
      if (USE_MOCK) {
        counterOffersCache = await loadCounterOffersFromStorage();
        const now = new Date();
        let expiredCount = 0;

        counterOffersCache = counterOffersCache.map((offer) => {
          if (offer.status === 'PENDING' && new Date(offer.expiresAt) <= now) {
            expiredCount++;
            return { ...offer, status: 'EXPIRED' as CounterOfferStatus };
          }
          return offer;
        });

        await saveCounterOffersToStorage(counterOffersCache);
        return ok(expiredCount);
      }

      const response = await fetch('/api/counter-offers/expire', { method: 'POST' });
      const result = await response.json();
      return ok(result.expiredCount);
    } catch (error) {
      logger.error('Failed to expire counter-offers', { error });
      return err(storageError('Failed to expire counter-offers'));
    }
  },

  /**
   * Get stats for a booking's negotiation
   */
  async getNegotiationStats(bookingId: string): Promise<Result<{
    totalOffers: number;
    pendingOffers: number;
    acceptedOffers: number;
    rejectedOffers: number;
    isResolved: boolean;
    latestOffer: CounterOffer | null;
  }, ServiceError>> {
    const negotiationResult = await this.getNegotiationHistory(bookingId);
    if (!negotiationResult.success) {
      return negotiationResult;
    }
    const negotiation = negotiationResult.data;

    if (!negotiation) {
      return ok({
        totalOffers: 0,
        pendingOffers: 0,
        acceptedOffers: 0,
        rejectedOffers: 0,
        isResolved: false,
        latestOffer: null,
      });
    }

    const offers = negotiation.offers;
    return ok({
      totalOffers: offers.length,
      pendingOffers: offers.filter((o) => o.status === 'PENDING').length,
      acceptedOffers: offers.filter((o) => o.status === 'ACCEPTED').length,
      rejectedOffers: offers.filter((o) => o.status === 'REJECTED').length,
      isResolved: negotiation.status === 'RESOLVED',
      latestOffer: offers.length > 0 ? offers[offers.length - 1] : null,
    });
  },

  /**
   * Seed demo data for testing
   */
  async seedDemoData(): Promise<Result<void, ServiceError>> {
    try {
      await saveCounterOffersToStorage(MOCK_COUNTER_OFFERS);
      await saveNegotiationsToStorage(MOCK_NEGOTIATIONS);
      counterOffersCache = [...MOCK_COUNTER_OFFERS];
      negotiationsCache = [...MOCK_NEGOTIATIONS];
      logger.info('Demo data seeded');
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to seed counter-offer demo data', { error });
      return err(storageError('Failed to seed demo data'));
    }
  },

  /**
   * Clear all data (for testing)
   */
  async clearAll(): Promise<Result<void, ServiceError>> {
    try {
      await apiClient.remove(STORAGE_KEYS.COUNTER_OFFERS);
      await apiClient.remove(STORAGE_KEYS.NEGOTIATIONS);
      counterOffersCache = [];
      negotiationsCache = [];
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to clear counter-offer data', { error });
      return err(storageError('Failed to clear counter-offer data'));
    }
  },
};
