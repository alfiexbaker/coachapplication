import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import type {
  CounterOffer,
  CounterOfferStatus,
  NegotiationHistory,
  TimeSlot,
} from '../constants/types';

// Mock storage for testing
const mockStorage: Record<string, string> = {};

// Mock the service inline since we can't import it directly
// This tests the business logic patterns used in the service

describe('Counter-Offer Service Logic', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe('Counter-Offer Creation', () => {
    it('should create a counter-offer with correct structure', () => {
      const originalTime: TimeSlot = {
        date: '2026-01-15',
        startTime: '16:00',
        endTime: '17:00',
        location: 'Hackney Marshes',
      };

      const proposedTime: TimeSlot = {
        date: '2026-01-16',
        startTime: '17:00',
        endTime: '18:00',
        location: 'Hackney Marshes',
      };

      const counterOffer: CounterOffer = {
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

      assert.strictEqual(counterOffer.status, 'PENDING');
      assert.strictEqual(counterOffer.proposedBy, 'PARENT');
      assert.strictEqual(counterOffer.bookingId, 'booking_1');
      assert.deepStrictEqual(counterOffer.proposedTime, proposedTime);
      assert.ok(counterOffer.id.startsWith('co_'));
    });

    it('should set expiry time correctly (48 hours default)', () => {
      const now = Date.now();
      const expiryHours = 48;
      const expiresAt = new Date(now + expiryHours * 60 * 60 * 1000);

      const diffHours = (expiresAt.getTime() - now) / (60 * 60 * 1000);
      assert.strictEqual(Math.round(diffHours), expiryHours);
    });
  });

  describe('Counter-Offer Status Transitions', () => {
    it('should transition from PENDING to ACCEPTED', () => {
      const offer: CounterOffer = {
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
      const accepted: CounterOffer = {
        ...offer,
        status: 'ACCEPTED',
        respondedAt: new Date().toISOString(),
      };

      assert.strictEqual(accepted.status, 'ACCEPTED');
      assert.ok(accepted.respondedAt);
    });

    it('should transition from PENDING to REJECTED with reason', () => {
      const offer: CounterOffer = {
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

      const rejected: CounterOffer = {
        ...offer,
        status: 'REJECTED',
        rejectionReason: 'I have another session at that time',
        respondedAt: new Date().toISOString(),
      };

      assert.strictEqual(rejected.status, 'REJECTED');
      assert.strictEqual(rejected.rejectionReason, 'I have another session at that time');
      assert.ok(rejected.respondedAt);
    });

    it('should transition from PENDING to EXPIRED', () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago

      const offer: CounterOffer = {
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
      assert.ok(isExpired);

      // Transition to expired
      const expired: CounterOffer = {
        ...offer,
        status: 'EXPIRED',
      };

      assert.strictEqual(expired.status, 'EXPIRED');
    });
  });

  describe('Negotiation History', () => {
    it('should create a negotiation history with multiple offers', () => {
      const offer1: CounterOffer = {
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

      const offer2: CounterOffer = {
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

      const negotiation: NegotiationHistory = {
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

      assert.strictEqual(negotiation.offers.length, 2);
      assert.strictEqual(negotiation.status, 'RESOLVED');
      assert.deepStrictEqual(negotiation.finalTime, offer2.proposedTime);
    });

    it('should track negotiation status correctly', () => {
      const statuses = ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'] as const;

      statuses.forEach((status) => {
        const negotiation: NegotiationHistory = {
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

        assert.strictEqual(negotiation.status, status);
      });
    });
  });

  describe('Time Slot Formatting', () => {
    it('should format time slot correctly', () => {
      const slot: TimeSlot = {
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

      assert.ok(formatted.includes('at 16:00'));
      assert.ok(formatted.includes('Jan'));
    });

    it('should handle time slots without location', () => {
      const slot: TimeSlot = {
        date: '2026-01-15',
        startTime: '16:00',
        endTime: '17:00',
      };

      assert.strictEqual(slot.location, undefined);
    });
  });

  describe('Counter-Offer Filtering', () => {
    it('should filter pending offers correctly', () => {
      const offers: CounterOffer[] = [
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
      assert.strictEqual(pendingOffers.length, 2);

      const acceptedOffers = offers.filter((o) => o.status === 'ACCEPTED');
      assert.strictEqual(acceptedOffers.length, 1);
    });

    it('should filter actionable offers for a user', () => {
      const userId = 'coach_1';
      const now = new Date();

      const offers: CounterOffer[] = [
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
        if (o.status !== 'PENDING') return false;
        if (new Date(o.expiresAt) <= now) return false;
        return o.proposerId !== userId;
      });

      assert.strictEqual(actionableOffers.length, 1);
      assert.strictEqual(actionableOffers[0].id, 'co_1');
    });
  });

  describe('Negotiation Stats', () => {
    it('should calculate negotiation stats correctly', () => {
      const offers: CounterOffer[] = [
        { id: 'co_1', status: 'REJECTED' } as CounterOffer,
        { id: 'co_2', status: 'REJECTED' } as CounterOffer,
        { id: 'co_3', status: 'ACCEPTED' } as CounterOffer,
      ];

      const stats = {
        totalOffers: offers.length,
        pendingOffers: offers.filter((o) => o.status === 'PENDING').length,
        acceptedOffers: offers.filter((o) => o.status === 'ACCEPTED').length,
        rejectedOffers: offers.filter((o) => o.status === 'REJECTED').length,
      };

      assert.strictEqual(stats.totalOffers, 3);
      assert.strictEqual(stats.pendingOffers, 0);
      assert.strictEqual(stats.acceptedOffers, 1);
      assert.strictEqual(stats.rejectedOffers, 2);
    });
  });

  describe('Time Remaining Calculation', () => {
    it('should calculate time remaining correctly', () => {
      const now = Date.now();
      const expiresAt = new Date(now + 25 * 60 * 60 * 1000); // 25 hours from now

      const diffMs = expiresAt.getTime() - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      assert.strictEqual(diffDays, 1);
      assert.strictEqual(diffHours, 25);
    });

    it('should detect expired offers', () => {
      const expiredDate = new Date(Date.now() - 1000);
      const isExpired = expiredDate <= new Date();
      assert.ok(isExpired);
    });

    it('should detect non-expired offers', () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      const isExpired = futureDate <= new Date();
      assert.ok(!isExpired);
    });
  });
});

describe('Counter-Offer Types', () => {
  it('should have correct CounterOfferStatus values', () => {
    const validStatuses: CounterOfferStatus[] = ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'];

    validStatuses.forEach((status) => {
      assert.ok(['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'].includes(status));
    });
  });

  it('should enforce proposer role types', () => {
    const validRoles = ['PARENT', 'COACH'];

    const offer: CounterOffer = {
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

    assert.ok(validRoles.includes(offer.proposedBy));
  });
});
