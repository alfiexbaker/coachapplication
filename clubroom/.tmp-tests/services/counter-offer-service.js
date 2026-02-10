"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.counterOfferService = void 0;
const api_client_1 = require("./api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const booking_service_1 = require("./booking-service");
const notification_service_1 = require("./notification-service");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('CounterOfferService');
// Using centralized storage keys
const USE_MOCK = config_1.api.useMock;
// Default expiry for counter-offers (48 hours)
const DEFAULT_EXPIRY_HOURS = 48;
// Mock data for development
const MOCK_COUNTER_OFFERS = [
    {
        id: 'co_1',
        bookingId: 'booking_1',
        proposedBy: 'PARENT',
        proposerId: 'parent_1',
        proposerName: 'Sarah Baker',
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
const MOCK_NEGOTIATIONS = [
    {
        id: 'neg_1',
        bookingId: 'booking_1',
        coachId: 'coach1',
        coachName: 'Marcus Thompson',
        parentId: 'parent_1',
        parentName: 'Sarah Baker',
        athleteId: 'athlete_1',
        athleteName: 'Tom Baker',
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
let counterOffersCache = [...MOCK_COUNTER_OFFERS];
let negotiationsCache = [...MOCK_NEGOTIATIONS];
async function loadCounterOffersFromStorage() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COUNTER_OFFERS, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load counter offers', error);
    }
    return [...MOCK_COUNTER_OFFERS];
}
async function saveCounterOffersToStorage(offers) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COUNTER_OFFERS, offers);
    }
    catch (error) {
        logger.error('Failed to save counter offers', error);
    }
}
async function loadNegotiationsFromStorage() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.NEGOTIATIONS, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load negotiations', error);
    }
    return [...MOCK_NEGOTIATIONS];
}
async function saveNegotiationsToStorage(negotiations) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NEGOTIATIONS, negotiations);
    }
    catch (error) {
        logger.error('Failed to save negotiations', error);
    }
}
function formatTimeSlot(slot) {
    const date = new Date(slot.date);
    const dateStr = date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
    return `${dateStr} at ${slot.startTime}`;
}
exports.counterOfferService = {
    /**
     * Create a new counter-offer for a booking
     * Sends notification to the other party
     */
    async createCounterOffer(input) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (input.expiryHours || DEFAULT_EXPIRY_HOURS));
        const newOffer = {
            id: `co_${Date.now()}`,
            bookingId: input.bookingId,
            proposedBy: input.proposedBy,
            proposerId: input.proposerId,
            proposerName: input.proposerName,
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
            }
            else {
                // Create new negotiation - would need booking details in real implementation
                const newNegotiation = {
                    id: `neg_${Date.now()}`,
                    bookingId: input.bookingId,
                    coachId: input.proposedBy === 'COACH' ? input.proposerId : 'coach1',
                    coachName: input.proposedBy === 'COACH' ? input.proposerName : 'Coach',
                    parentId: input.proposedBy === 'PARENT' ? input.proposerId : 'parent_1',
                    parentName: input.proposedBy === 'PARENT' ? input.proposerName : 'Parent',
                    athleteId: 'athlete_1',
                    athleteName: 'Athlete',
                    offers: [newOffer],
                    originalTime: input.originalTime,
                    status: 'IN_PROGRESS',
                    createdAt: new Date().toISOString(),
                };
                negotiationsCache.push(newNegotiation);
            }
            await saveNegotiationsToStorage(negotiationsCache);
            // Create notification for the other party
            const notification = {
                id: `notif_co_${Date.now()}`,
                type: 'booking',
                title: 'Time Change Request',
                body: `${input.proposerName} has proposed a new time: ${formatTimeSlot(input.proposedTime)}`,
                timeLabel: 'Just now',
                read: false,
                actionLabel: 'Review Proposal',
            };
            await notification_service_1.notificationService.create(notification);
            return newOffer;
        }
        // API call would go here
        const response = await fetch('/api/counter-offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOffer),
        });
        return response.json();
    },
    /**
     * Accept a counter-offer
     * Updates booking time and notifies proposer
     */
    async acceptCounterOffer(offerId) {
        if (USE_MOCK) {
            counterOffersCache = await loadCounterOffersFromStorage();
            const index = counterOffersCache.findIndex((o) => o.id === offerId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Counter-offer', offerId));
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
            const notification = {
                id: `notif_co_accepted_${Date.now()}`,
                type: 'booking',
                title: 'Time Change Accepted!',
                body: `Your proposed time of ${formatTimeSlot(offer.proposedTime)} has been accepted.`,
                timeLabel: 'Just now',
                read: false,
            };
            await notification_service_1.notificationService.create(notification);
            // CRITICAL: Create a real booking when counter-offer is accepted
            if (offer.proposedTime) {
                const negotiation = negotiationsCache.find((n) => n.bookingId === offer.bookingId);
                if (negotiation) {
                    const scheduledAt = `${offer.proposedTime.date}T${offer.proposedTime.startTime}:00`;
                    const [startH, startM] = offer.proposedTime.startTime.split(':').map(Number);
                    const [endH, endM] = offer.proposedTime.endTime.split(':').map(Number);
                    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                    const bookingResult = await booking_service_1.bookingService.createBooking({
                        coachId: negotiation.coachId,
                        coachName: negotiation.coachName,
                        athleteIds: [negotiation.athleteId],
                        athleteNames: [negotiation.athleteName],
                        bookedById: negotiation.parentId,
                        bookedByName: negotiation.parentName,
                        scheduledAt,
                        duration: durationMinutes > 0 ? durationMinutes : 60,
                        location: offer.proposedTime.location || 'Coach preferred location',
                        service: 'Rescheduled Session',
                        serviceType: '1-on-1',
                    });
                    if (bookingResult.success) {
                        logger.info('Booking created from counter-offer', { bookingId: bookingResult.data?.id });
                    }
                    else {
                        logger.error('Failed to create booking from counter-offer', { error: bookingResult.error?.message });
                    }
                }
            }
            return (0, result_1.ok)(counterOffersCache[index]);
        }
        const response = await fetch(`/api/counter-offers/${offerId}/accept`, {
            method: 'PATCH',
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Reject a counter-offer with optional reason
     * Notifies proposer of rejection
     */
    async rejectCounterOffer(input) {
        if (USE_MOCK) {
            counterOffersCache = await loadCounterOffersFromStorage();
            const index = counterOffersCache.findIndex((o) => o.id === input.offerId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Counter-offer', input.offerId));
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
            const notification = {
                id: `notif_co_rejected_${Date.now()}`,
                type: 'booking',
                title: 'Time Change Declined',
                body: `Your proposed time of ${formatTimeSlot(offer.proposedTime)} was declined.${reasonText}`,
                timeLabel: 'Just now',
                read: false,
                actionLabel: 'Propose New Time',
            };
            await notification_service_1.notificationService.create(notification);
            return (0, result_1.ok)(counterOffersCache[index]);
        }
        const response = await fetch(`/api/counter-offers/${input.offerId}/reject`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: input.reason }),
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Get all counter-offers for a specific booking
     */
    async getCounterOffers(bookingId) {
        if (USE_MOCK) {
            counterOffersCache = await loadCounterOffersFromStorage();
            return counterOffersCache.filter((o) => o.bookingId === bookingId);
        }
        const response = await fetch(`/api/counter-offers?bookingId=${bookingId}`);
        return response.json();
    },
    /**
     * Get a single counter-offer by ID
     */
    async getCounterOffer(offerId) {
        if (USE_MOCK) {
            counterOffersCache = await loadCounterOffersFromStorage();
            return counterOffersCache.find((o) => o.id === offerId) || null;
        }
        const response = await fetch(`/api/counter-offers/${offerId}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Get pending counter-offers for a user
     * Filters by role and checks expiry
     */
    async getPendingCounterOffers(userId, role) {
        if (USE_MOCK) {
            counterOffersCache = await loadCounterOffersFromStorage();
            const now = new Date();
            // Get offers where user is the recipient (not proposer)
            return counterOffersCache.filter((o) => {
                // Only pending offers
                if (o.status !== 'PENDING')
                    return false;
                // Not expired
                if (new Date(o.expiresAt) <= now)
                    return false;
                // User is the recipient (opposite role from proposer)
                // If proposer is PARENT, recipient is COACH, and vice versa
                // We check if the user is the one who should respond
                // This is simplified - in production we'd check actual recipient ID
                return o.proposedBy !== role;
            });
        }
        const response = await fetch(`/api/counter-offers/pending?userId=${userId}&role=${role}`);
        return response.json();
    },
    /**
     * Get all pending counter-offers that need user's attention
     * Returns offers where user is the recipient
     */
    async getActionableOffers(userId) {
        if (USE_MOCK) {
            counterOffersCache = await loadCounterOffersFromStorage();
            const now = new Date();
            return counterOffersCache.filter((o) => {
                // Only pending offers
                if (o.status !== 'PENDING')
                    return false;
                // Not expired
                if (new Date(o.expiresAt) <= now)
                    return false;
                // User is NOT the proposer (they need to respond)
                return o.proposerId !== userId;
            });
        }
        const response = await fetch(`/api/counter-offers/actionable?userId=${userId}`);
        return response.json();
    },
    /**
     * Get the full negotiation history for a booking
     */
    async getNegotiationHistory(bookingId) {
        if (USE_MOCK) {
            negotiationsCache = await loadNegotiationsFromStorage();
            return negotiationsCache.find((n) => n.bookingId === bookingId) || null;
        }
        const response = await fetch(`/api/negotiations/${bookingId}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Get all active negotiations for a user
     */
    async getActiveNegotiations(userId) {
        if (USE_MOCK) {
            negotiationsCache = await loadNegotiationsFromStorage();
            return negotiationsCache.filter((n) => n.status === 'IN_PROGRESS' &&
                (n.coachId === userId || n.parentId === userId));
        }
        const response = await fetch(`/api/negotiations?userId=${userId}&status=IN_PROGRESS`);
        return response.json();
    },
    /**
     * Cancel a negotiation (both parties give up)
     */
    async cancelNegotiation(bookingId) {
        if (USE_MOCK) {
            negotiationsCache = await loadNegotiationsFromStorage();
            const index = negotiationsCache.findIndex((n) => n.bookingId === bookingId);
            if (index === -1) {
                return (0, result_1.err)((0, result_1.notFound)('Negotiation', bookingId));
            }
            negotiationsCache[index] = {
                ...negotiationsCache[index],
                status: 'CANCELLED',
                resolvedAt: new Date().toISOString(),
            };
            await saveNegotiationsToStorage(negotiationsCache);
            return (0, result_1.ok)(negotiationsCache[index]);
        }
        const response = await fetch(`/api/negotiations/${bookingId}/cancel`, {
            method: 'PATCH',
        });
        return (0, result_1.ok)(await response.json());
    },
    /**
     * Check and expire old counter-offers
     * Would be called periodically in production
     */
    async expireOldOffers() {
        if (USE_MOCK) {
            counterOffersCache = await loadCounterOffersFromStorage();
            const now = new Date();
            let expiredCount = 0;
            counterOffersCache = counterOffersCache.map((offer) => {
                if (offer.status === 'PENDING' && new Date(offer.expiresAt) <= now) {
                    expiredCount++;
                    return { ...offer, status: 'EXPIRED' };
                }
                return offer;
            });
            await saveCounterOffersToStorage(counterOffersCache);
            return expiredCount;
        }
        const response = await fetch('/api/counter-offers/expire', { method: 'POST' });
        const result = await response.json();
        return result.expiredCount;
    },
    /**
     * Get stats for a booking's negotiation
     */
    async getNegotiationStats(bookingId) {
        const negotiation = await this.getNegotiationHistory(bookingId);
        if (!negotiation) {
            return {
                totalOffers: 0,
                pendingOffers: 0,
                acceptedOffers: 0,
                rejectedOffers: 0,
                isResolved: false,
                latestOffer: null,
            };
        }
        const offers = negotiation.offers;
        return {
            totalOffers: offers.length,
            pendingOffers: offers.filter((o) => o.status === 'PENDING').length,
            acceptedOffers: offers.filter((o) => o.status === 'ACCEPTED').length,
            rejectedOffers: offers.filter((o) => o.status === 'REJECTED').length,
            isResolved: negotiation.status === 'RESOLVED',
            latestOffer: offers.length > 0 ? offers[offers.length - 1] : null,
        };
    },
    /**
     * Seed demo data for testing
     */
    async seedDemoData() {
        await saveCounterOffersToStorage(MOCK_COUNTER_OFFERS);
        await saveNegotiationsToStorage(MOCK_NEGOTIATIONS);
        counterOffersCache = [...MOCK_COUNTER_OFFERS];
        negotiationsCache = [...MOCK_NEGOTIATIONS];
        logger.info('Demo data seeded');
    },
    /**
     * Clear all data (for testing)
     */
    async clearAll() {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.COUNTER_OFFERS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.NEGOTIATIONS);
        counterOffersCache = [];
        negotiationsCache = [];
    },
};
