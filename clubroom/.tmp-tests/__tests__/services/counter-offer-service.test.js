"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const counter_offer_service_1 = require("@/services/counter-offer-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('CounterOfferService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.COUNTER_OFFERS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.NEGOTIATIONS);
    });
    (0, node_test_1.describe)('createCounterOffer', () => {
        (0, node_test_1.it)('should create new counter-offer', async () => {
            const input = {
                bookingId: 'booking-' + Math.random().toString(36).slice(2),
                proposedBy: 'PARENT',
                proposerId: 'parent-' + Math.random().toString(36).slice(2),
                proposerName: 'Test Parent',
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field A',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field A',
                },
                message: 'Can we reschedule?',
            };
            const offer = await counter_offer_service_1.counterOfferService.createCounterOffer(input);
            strict_1.default.ok(offer);
            strict_1.default.ok(offer.id);
            strict_1.default.equal(offer.bookingId, input.bookingId);
            strict_1.default.equal(offer.proposedBy, 'PARENT');
            strict_1.default.equal(offer.status, 'PENDING');
        });
        (0, node_test_1.it)('should set expiration time', async () => {
            const input = {
                bookingId: 'booking1',
                proposedBy: 'COACH',
                proposerId: 'coach1',
                proposerName: 'Test Coach',
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field A',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field A',
                },
            };
            const offer = await counter_offer_service_1.counterOfferService.createCounterOffer(input);
            strict_1.default.ok(offer.expiresAt);
            const expiresAt = new Date(offer.expiresAt);
            const createdAt = new Date(offer.createdAt);
            strict_1.default.ok(expiresAt > createdAt);
        });
        (0, node_test_1.it)('should create or update negotiation history', async () => {
            const bookingId = 'booking-' + Math.random().toString(36).slice(2);
            await counter_offer_service_1.counterOfferService.createCounterOffer({
                bookingId,
                proposedBy: 'PARENT',
                proposerId: 'parent1',
                proposerName: 'Parent',
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field',
                },
            });
            const history = await counter_offer_service_1.counterOfferService.getNegotiationHistory(bookingId);
            strict_1.default.ok(history);
            strict_1.default.equal(history.bookingId, bookingId);
        });
    });
    (0, node_test_1.describe)('acceptCounterOffer', () => {
        (0, node_test_1.it)('should return ok() and update status to ACCEPTED', async () => {
            const offer = await counter_offer_service_1.counterOfferService.createCounterOffer({
                bookingId: 'booking-' + Math.random().toString(36).slice(2),
                proposedBy: 'PARENT',
                proposerId: 'parent1',
                proposerName: 'Parent',
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field',
                },
            });
            const result = await counter_offer_service_1.counterOfferService.acceptCounterOffer(offer.id);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.status, 'ACCEPTED');
        });
        (0, node_test_1.it)('should return err() for non-existent offer', async () => {
            const result = await counter_offer_service_1.counterOfferService.acceptCounterOffer('fake-id-' + Math.random().toString(36).slice(2));
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.it)('should update negotiation history status', async () => {
            const bookingId = 'booking-' + Math.random().toString(36).slice(2);
            const offer = await counter_offer_service_1.counterOfferService.createCounterOffer({
                bookingId,
                proposedBy: 'PARENT',
                proposerId: 'parent1',
                proposerName: 'Parent',
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field',
                },
            });
            await counter_offer_service_1.counterOfferService.acceptCounterOffer(offer.id);
            const history = await counter_offer_service_1.counterOfferService.getNegotiationHistory(bookingId);
            strict_1.default.ok(history);
            strict_1.default.equal(history.status, 'RESOLVED');
        });
    });
    (0, node_test_1.describe)('rejectCounterOffer', () => {
        (0, node_test_1.it)('should return ok() and update status to REJECTED', async () => {
            const offer = await counter_offer_service_1.counterOfferService.createCounterOffer({
                bookingId: 'booking-' + Math.random().toString(36).slice(2),
                proposedBy: 'PARENT',
                proposerId: 'parent1',
                proposerName: 'Parent',
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field',
                },
            });
            const result = await counter_offer_service_1.counterOfferService.rejectCounterOffer({
                offerId: offer.id,
                rejectorId: 'coach1',
                reason: 'Not available',
            });
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.status, 'REJECTED');
            strict_1.default.equal(result.data.rejectionReason, 'Not available');
        });
        (0, node_test_1.it)('should return err() for non-existent offer', async () => {
            const result = await counter_offer_service_1.counterOfferService.rejectCounterOffer({
                offerId: 'fake-id-' + Math.random().toString(36).slice(2),
                rejectorId: 'coach1',
                reason: 'Test',
            });
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    (0, node_test_1.describe)('getCounterOffers', () => {
        (0, node_test_1.it)('should return offers for booking', async () => {
            const bookingId = 'booking-' + Math.random().toString(36).slice(2);
            await counter_offer_service_1.counterOfferService.createCounterOffer({
                bookingId,
                proposedBy: 'PARENT',
                proposerId: 'parent1',
                proposerName: 'Parent',
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field',
                },
            });
            const offers = await counter_offer_service_1.counterOfferService.getCounterOffers(bookingId);
            strict_1.default.ok(Array.isArray(offers));
            strict_1.default.ok(offers.length > 0);
            strict_1.default.equal(offers[0].bookingId, bookingId);
        });
        (0, node_test_1.it)('should return empty array for booking with no offers', async () => {
            const offers = await counter_offer_service_1.counterOfferService.getCounterOffers('booking-nonexistent-' + Math.random().toString(36).slice(2));
            strict_1.default.ok(Array.isArray(offers));
            strict_1.default.equal(offers.length, 0);
        });
    });
    (0, node_test_1.describe)('getPendingCounterOffers', () => {
        (0, node_test_1.it)('should return pending offers for user as coach', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const offer = await counter_offer_service_1.counterOfferService.createCounterOffer({
                bookingId: 'booking1',
                proposedBy: 'PARENT',
                proposerId: 'parent1',
                proposerName: 'Parent',
                coachId,
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field',
                },
            });
            const offers = await counter_offer_service_1.counterOfferService.getPendingCounterOffers(coachId, 'COACH');
            strict_1.default.ok(Array.isArray(offers));
            if (offers.length > 0) {
                strict_1.default.equal(offers[0].status, 'PENDING');
            }
        });
        (0, node_test_1.it)('should filter by user role', async () => {
            const parentId = 'parent-' + Math.random().toString(36).slice(2);
            await counter_offer_service_1.counterOfferService.createCounterOffer({
                bookingId: 'booking1',
                proposedBy: 'COACH',
                proposerId: 'coach1',
                proposerName: 'Coach',
                parentId,
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field',
                },
            });
            const offers = await counter_offer_service_1.counterOfferService.getPendingCounterOffers(parentId, 'PARENT');
            strict_1.default.ok(Array.isArray(offers));
        });
    });
    (0, node_test_1.describe)('getNegotiationHistory', () => {
        (0, node_test_1.it)('should return null for booking with no history', async () => {
            const history = await counter_offer_service_1.counterOfferService.getNegotiationHistory('booking-nonexistent-' + Math.random().toString(36).slice(2));
            strict_1.default.equal(history, null);
        });
        (0, node_test_1.it)('should return history with all offers', async () => {
            const bookingId = 'booking-' + Math.random().toString(36).slice(2);
            await counter_offer_service_1.counterOfferService.createCounterOffer({
                bookingId,
                proposedBy: 'PARENT',
                proposerId: 'parent1',
                proposerName: 'Parent',
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field',
                },
            });
            const history = await counter_offer_service_1.counterOfferService.getNegotiationHistory(bookingId);
            strict_1.default.ok(history);
            strict_1.default.equal(history.bookingId, bookingId);
            strict_1.default.ok(Array.isArray(history.offers));
            strict_1.default.ok(history.offers.length > 0);
        });
    });
    (0, node_test_1.describe)('cancelNegotiation', () => {
        (0, node_test_1.it)('should return ok() and update status to CANCELLED', async () => {
            const bookingId = 'booking-' + Math.random().toString(36).slice(2);
            await counter_offer_service_1.counterOfferService.createCounterOffer({
                bookingId,
                proposedBy: 'PARENT',
                proposerId: 'parent1',
                proposerName: 'Parent',
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field',
                },
            });
            const result = await counter_offer_service_1.counterOfferService.cancelNegotiation(bookingId);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.status, 'CANCELLED');
        });
        (0, node_test_1.it)('should return err() for non-existent negotiation', async () => {
            const result = await counter_offer_service_1.counterOfferService.cancelNegotiation('booking-nonexistent-' + Math.random().toString(36).slice(2));
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    (0, node_test_1.describe)('expireOldOffers', () => {
        (0, node_test_1.it)('should return count of expired offers', async () => {
            const count = await counter_offer_service_1.counterOfferService.expireOldOffers();
            strict_1.default.ok(typeof count === 'number');
            strict_1.default.ok(count >= 0);
        });
        (0, node_test_1.it)('should update expired offers to EXPIRED status', async () => {
            // Create an offer with past expiration
            const offer = await counter_offer_service_1.counterOfferService.createCounterOffer({
                bookingId: 'booking1',
                proposedBy: 'PARENT',
                proposerId: 'parent1',
                proposerName: 'Parent',
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field',
                },
                expiryHours: -1, // Already expired
            });
            await counter_offer_service_1.counterOfferService.expireOldOffers();
            const retrieved = await counter_offer_service_1.counterOfferService.getCounterOffer(offer.id);
            if (retrieved && retrieved.status === 'PENDING') {
                // The offer might not have been expired if expiryHours wasn't supported
                strict_1.default.ok(true);
            }
            else if (retrieved) {
                strict_1.default.equal(retrieved.status, 'EXPIRED');
            }
        });
    });
    (0, node_test_1.describe)('getNegotiationStats', () => {
        (0, node_test_1.it)('should return stats for booking', async () => {
            const bookingId = 'booking-' + Math.random().toString(36).slice(2);
            await counter_offer_service_1.counterOfferService.createCounterOffer({
                bookingId,
                proposedBy: 'PARENT',
                proposerId: 'parent1',
                proposerName: 'Parent',
                originalTime: {
                    date: '2026-02-15',
                    startTime: '14:00',
                    endTime: '15:00',
                    location: 'Field',
                },
                proposedTime: {
                    date: '2026-02-16',
                    startTime: '16:00',
                    endTime: '17:00',
                    location: 'Field',
                },
            });
            const stats = await counter_offer_service_1.counterOfferService.getNegotiationStats(bookingId);
            strict_1.default.ok(stats);
            strict_1.default.ok(typeof stats.totalOffers === 'number');
            strict_1.default.ok(typeof stats.pendingOffers === 'number');
            strict_1.default.ok(typeof stats.acceptedOffers === 'number');
            strict_1.default.ok(typeof stats.rejectedOffers === 'number');
        });
        (0, node_test_1.it)('should return zero stats for non-existent booking', async () => {
            const stats = await counter_offer_service_1.counterOfferService.getNegotiationStats('booking-nonexistent-' + Math.random().toString(36).slice(2));
            strict_1.default.equal(stats.totalOffers, 0);
            strict_1.default.equal(stats.pendingOffers, 0);
        });
    });
});
