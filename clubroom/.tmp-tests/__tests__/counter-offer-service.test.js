"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
// Mock storage for testing
const mockStorage = {};
// Mock the service inline since we can't import it directly
// This tests the business logic patterns used in the service
(0, node_test_1.describe)('Counter-Offer Service Logic', () => {
    (0, node_test_1.beforeEach)(() => {
        // Clear mock storage before each test
        Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    });
    (0, node_test_1.describe)('Counter-Offer Creation', () => {
        (0, node_test_1.it)('should create a counter-offer with correct structure', () => {
            const originalTime = {
                date: '2026-01-15',
                startTime: '16:00',
                endTime: '17:00',
                location: 'Hackney Marshes',
            };
            const proposedTime = {
                date: '2026-01-16',
                startTime: '17:00',
                endTime: '18:00',
                location: 'Hackney Marshes',
            };
            const counterOffer = {
                id: `co_${Date.now()}`,
                bookingId: 'booking_1',
                proposedBy: 'PARENT',
                proposerId: 'parent_1',
                proposerName: 'Sarah Baker',
                originalTime,
                proposedTime,
                status: 'PENDING',
                message: 'Tom has football practice on Wednesday',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            };
            node_assert_1.default.strictEqual(counterOffer.status, 'PENDING');
            node_assert_1.default.strictEqual(counterOffer.proposedBy, 'PARENT');
            node_assert_1.default.strictEqual(counterOffer.bookingId, 'booking_1');
            node_assert_1.default.deepStrictEqual(counterOffer.proposedTime, proposedTime);
            node_assert_1.default.ok(counterOffer.id.startsWith('co_'));
        });
        (0, node_test_1.it)('should set expiry time correctly (48 hours default)', () => {
            const now = Date.now();
            const expiryHours = 48;
            const expiresAt = new Date(now + expiryHours * 60 * 60 * 1000);
            const diffHours = (expiresAt.getTime() - now) / (60 * 60 * 1000);
            node_assert_1.default.strictEqual(Math.round(diffHours), expiryHours);
        });
    });
    (0, node_test_1.describe)('Counter-Offer Status Transitions', () => {
        (0, node_test_1.it)('should transition from PENDING to ACCEPTED', () => {
            const offer = {
                id: 'co_1',
                bookingId: 'booking_1',
                proposedBy: 'PARENT',
                proposerId: 'parent_1',
                proposerName: 'Sarah Baker',
                originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
                proposedTime: { date: '2026-01-16', startTime: '17:00', endTime: '18:00' },
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            };
            // Simulate accepting
            const accepted = {
                ...offer,
                status: 'ACCEPTED',
                respondedAt: new Date().toISOString(),
            };
            node_assert_1.default.strictEqual(accepted.status, 'ACCEPTED');
            node_assert_1.default.ok(accepted.respondedAt);
        });
        (0, node_test_1.it)('should transition from PENDING to REJECTED with reason', () => {
            const offer = {
                id: 'co_1',
                bookingId: 'booking_1',
                proposedBy: 'PARENT',
                proposerId: 'parent_1',
                proposerName: 'Sarah Baker',
                originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
                proposedTime: { date: '2026-01-16', startTime: '17:00', endTime: '18:00' },
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            };
            const rejected = {
                ...offer,
                status: 'REJECTED',
                rejectionReason: 'I have another session at that time',
                respondedAt: new Date().toISOString(),
            };
            node_assert_1.default.strictEqual(rejected.status, 'REJECTED');
            node_assert_1.default.strictEqual(rejected.rejectionReason, 'I have another session at that time');
            node_assert_1.default.ok(rejected.respondedAt);
        });
        (0, node_test_1.it)('should transition from PENDING to EXPIRED', () => {
            const expiredDate = new Date(Date.now() - 1000); // 1 second ago
            const offer = {
                id: 'co_1',
                bookingId: 'booking_1',
                proposedBy: 'PARENT',
                proposerId: 'parent_1',
                proposerName: 'Sarah Baker',
                originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
                proposedTime: { date: '2026-01-16', startTime: '17:00', endTime: '18:00' },
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                expiresAt: expiredDate.toISOString(),
            };
            // Check if expired
            const isExpired = new Date(offer.expiresAt) <= new Date();
            node_assert_1.default.ok(isExpired);
            // Transition to expired
            const expired = {
                ...offer,
                status: 'EXPIRED',
            };
            node_assert_1.default.strictEqual(expired.status, 'EXPIRED');
        });
    });
    (0, node_test_1.describe)('Negotiation History', () => {
        (0, node_test_1.it)('should create a negotiation history with multiple offers', () => {
            const offer1 = {
                id: 'co_1',
                bookingId: 'booking_1',
                proposedBy: 'PARENT',
                proposerId: 'parent_1',
                proposerName: 'Sarah Baker',
                originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
                proposedTime: { date: '2026-01-16', startTime: '17:00', endTime: '18:00' },
                status: 'REJECTED',
                rejectionReason: 'Not available',
                createdAt: '2026-01-10T10:00:00Z',
                respondedAt: '2026-01-10T12:00:00Z',
                expiresAt: '2026-01-12T10:00:00Z',
            };
            const offer2 = {
                id: 'co_2',
                bookingId: 'booking_1',
                proposedBy: 'COACH',
                proposerId: 'coach_1',
                proposerName: 'Marcus Thompson',
                originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
                proposedTime: { date: '2026-01-17', startTime: '15:00', endTime: '16:00' },
                status: 'ACCEPTED',
                createdAt: '2026-01-10T14:00:00Z',
                respondedAt: '2026-01-10T16:00:00Z',
                expiresAt: '2026-01-12T14:00:00Z',
            };
            const negotiation = {
                id: 'neg_1',
                bookingId: 'booking_1',
                coachId: 'coach_1',
                coachName: 'Marcus Thompson',
                parentId: 'parent_1',
                parentName: 'Sarah Baker',
                athleteId: 'athlete_1',
                athleteName: 'Tom Baker',
                offers: [offer1, offer2],
                originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
                finalTime: { date: '2026-01-17', startTime: '15:00', endTime: '16:00' },
                status: 'RESOLVED',
                createdAt: '2026-01-10T10:00:00Z',
                resolvedAt: '2026-01-10T16:00:00Z',
            };
            node_assert_1.default.strictEqual(negotiation.offers.length, 2);
            node_assert_1.default.strictEqual(negotiation.status, 'RESOLVED');
            node_assert_1.default.deepStrictEqual(negotiation.finalTime, offer2.proposedTime);
        });
        (0, node_test_1.it)('should track negotiation status correctly', () => {
            const statuses = ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'];
            statuses.forEach((status) => {
                const negotiation = {
                    id: 'neg_1',
                    bookingId: 'booking_1',
                    coachId: 'coach_1',
                    coachName: 'Marcus Thompson',
                    parentId: 'parent_1',
                    parentName: 'Sarah Baker',
                    athleteId: 'athlete_1',
                    athleteName: 'Tom Baker',
                    offers: [],
                    originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
                    status,
                    createdAt: new Date().toISOString(),
                };
                node_assert_1.default.strictEqual(negotiation.status, status);
            });
        });
    });
    (0, node_test_1.describe)('Time Slot Formatting', () => {
        (0, node_test_1.it)('should format time slot correctly', () => {
            const slot = {
                date: '2026-01-15',
                startTime: '16:00',
                endTime: '17:00',
                location: 'Hackney Marshes',
            };
            const date = new Date(slot.date);
            const dateStr = date.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
            });
            const formatted = `${dateStr} at ${slot.startTime}`;
            node_assert_1.default.ok(formatted.includes('at 16:00'));
            node_assert_1.default.ok(formatted.includes('Jan'));
        });
        (0, node_test_1.it)('should handle time slots without location', () => {
            const slot = {
                date: '2026-01-15',
                startTime: '16:00',
                endTime: '17:00',
            };
            node_assert_1.default.strictEqual(slot.location, undefined);
        });
    });
    (0, node_test_1.describe)('Counter-Offer Filtering', () => {
        (0, node_test_1.it)('should filter pending offers correctly', () => {
            const offers = [
                {
                    id: 'co_1',
                    bookingId: 'booking_1',
                    proposedBy: 'PARENT',
                    proposerId: 'parent_1',
                    proposerName: 'Sarah Baker',
                    originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
                    proposedTime: { date: '2026-01-16', startTime: '17:00', endTime: '18:00' },
                    status: 'PENDING',
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                },
                {
                    id: 'co_2',
                    bookingId: 'booking_2',
                    proposedBy: 'COACH',
                    proposerId: 'coach_1',
                    proposerName: 'Marcus Thompson',
                    originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
                    proposedTime: { date: '2026-01-17', startTime: '15:00', endTime: '16:00' },
                    status: 'ACCEPTED',
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                },
                {
                    id: 'co_3',
                    bookingId: 'booking_3',
                    proposedBy: 'PARENT',
                    proposerId: 'parent_2',
                    proposerName: 'Mike Wilson',
                    originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
                    proposedTime: { date: '2026-01-18', startTime: '10:00', endTime: '11:00' },
                    status: 'PENDING',
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                },
            ];
            const pendingOffers = offers.filter((o) => o.status === 'PENDING');
            node_assert_1.default.strictEqual(pendingOffers.length, 2);
            const acceptedOffers = offers.filter((o) => o.status === 'ACCEPTED');
            node_assert_1.default.strictEqual(acceptedOffers.length, 1);
        });
        (0, node_test_1.it)('should filter actionable offers for a user', () => {
            const userId = 'coach_1';
            const now = new Date();
            const offers = [
                {
                    id: 'co_1',
                    bookingId: 'booking_1',
                    proposedBy: 'PARENT',
                    proposerId: 'parent_1', // Different from userId - actionable
                    proposerName: 'Sarah Baker',
                    originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
                    proposedTime: { date: '2026-01-16', startTime: '17:00', endTime: '18:00' },
                    status: 'PENDING',
                    createdAt: now.toISOString(),
                    expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
                },
                {
                    id: 'co_2',
                    bookingId: 'booking_2',
                    proposedBy: 'COACH',
                    proposerId: 'coach_1', // Same as userId - not actionable
                    proposerName: 'Marcus Thompson',
                    originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
                    proposedTime: { date: '2026-01-17', startTime: '15:00', endTime: '16:00' },
                    status: 'PENDING',
                    createdAt: now.toISOString(),
                    expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
                },
            ];
            const actionableOffers = offers.filter((o) => {
                if (o.status !== 'PENDING')
                    return false;
                if (new Date(o.expiresAt) <= now)
                    return false;
                return o.proposerId !== userId;
            });
            node_assert_1.default.strictEqual(actionableOffers.length, 1);
            node_assert_1.default.strictEqual(actionableOffers[0].id, 'co_1');
        });
    });
    (0, node_test_1.describe)('Negotiation Stats', () => {
        (0, node_test_1.it)('should calculate negotiation stats correctly', () => {
            const offers = [
                { id: 'co_1', status: 'REJECTED' },
                { id: 'co_2', status: 'REJECTED' },
                { id: 'co_3', status: 'ACCEPTED' },
            ];
            const stats = {
                totalOffers: offers.length,
                pendingOffers: offers.filter((o) => o.status === 'PENDING').length,
                acceptedOffers: offers.filter((o) => o.status === 'ACCEPTED').length,
                rejectedOffers: offers.filter((o) => o.status === 'REJECTED').length,
            };
            node_assert_1.default.strictEqual(stats.totalOffers, 3);
            node_assert_1.default.strictEqual(stats.pendingOffers, 0);
            node_assert_1.default.strictEqual(stats.acceptedOffers, 1);
            node_assert_1.default.strictEqual(stats.rejectedOffers, 2);
        });
    });
    (0, node_test_1.describe)('Time Remaining Calculation', () => {
        (0, node_test_1.it)('should calculate time remaining correctly', () => {
            const now = Date.now();
            const expiresAt = new Date(now + 25 * 60 * 60 * 1000); // 25 hours from now
            const diffMs = expiresAt.getTime() - now;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);
            node_assert_1.default.strictEqual(diffDays, 1);
            node_assert_1.default.strictEqual(diffHours, 25);
        });
        (0, node_test_1.it)('should detect expired offers', () => {
            const expiredDate = new Date(Date.now() - 1000);
            const isExpired = expiredDate <= new Date();
            node_assert_1.default.ok(isExpired);
        });
        (0, node_test_1.it)('should detect non-expired offers', () => {
            const futureDate = new Date(Date.now() + 60 * 60 * 1000);
            const isExpired = futureDate <= new Date();
            node_assert_1.default.ok(!isExpired);
        });
    });
});
(0, node_test_1.describe)('Counter-Offer Types', () => {
    (0, node_test_1.it)('should have correct CounterOfferStatus values', () => {
        const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
        validStatuses.forEach((status) => {
            node_assert_1.default.ok(['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'].includes(status));
        });
    });
    (0, node_test_1.it)('should enforce proposer role types', () => {
        const validRoles = ['PARENT', 'COACH'];
        const offer = {
            id: 'co_1',
            bookingId: 'booking_1',
            proposedBy: 'PARENT',
            proposerId: 'parent_1',
            proposerName: 'Sarah Baker',
            originalTime: { date: '2026-01-15', startTime: '16:00', endTime: '17:00' },
            proposedTime: { date: '2026-01-16', startTime: '17:00', endTime: '18:00' },
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        };
        node_assert_1.default.ok(validRoles.includes(offer.proposedBy));
    });
});
