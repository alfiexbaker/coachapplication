/**
 * Counter-Offer Service Tests
 *
 * Tests for counter-offer CRUD, negotiation tracking, expiry, and event emission.
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import { counterOfferService, type CreateCounterOfferInput } from '@/services/counter-offer-service';
import { apiClient } from '@/services/api-client';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Result, ServiceError } from '@/types/result';

const rid = () => Math.random().toString(36).slice(2, 10);

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true, `Expected ok but got err: ${JSON.stringify(result)}`);
  return result.data;
}

function makeInput(overrides?: Partial<CreateCounterOfferInput>): CreateCounterOfferInput {
  return {
    bookingId: `bk_${rid()}`,
    proposedBy: 'PARENT',
    proposerId: `parent_${rid()}`,
    proposerName: 'Test Parent',
    originalTime: {
      date: '2026-03-01',
      startTime: '16:00',
      endTime: '17:00',
      location: 'Hackney Marshes',
    },
    proposedTime: {
      date: '2026-03-02',
      startTime: '17:00',
      endTime: '18:00',
      location: 'Hackney Marshes',
    },
    ...overrides,
  };
}

describe('counterOfferService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.COUNTER_OFFERS);
    await apiClient.remove(STORAGE_KEYS.NEGOTIATIONS);
    // clearAll resets in-memory caches too
    await counterOfferService.clearAll();
  });

  // ---------------------------------------------------------------------------
  // createCounterOffer
  // ---------------------------------------------------------------------------
  describe('createCounterOffer', () => {
    it('creates a counter-offer and returns it', async () => {
      const input = makeInput();
      const offer = expectOk(await counterOfferService.createCounterOffer(input));

      assert.ok(offer.id, 'offer should have an id');
      assert.equal(offer.bookingId, input.bookingId);
      assert.equal(offer.proposedBy, 'PARENT');
      assert.equal(offer.status, 'PENDING');
      assert.equal(offer.proposedTime.date, '2026-03-02');
      assert.ok(offer.createdAt);
      assert.ok(offer.expiresAt);
    });

    it('emits COUNTER_OFFER_CREATED event', async () => {
      const input = makeInput();
      let emitted: Record<string, unknown> | null = null;

      const unsub = onTyped(ServiceEvents.COUNTER_OFFER_CREATED, (payload) => {
        emitted = payload as unknown as Record<string, unknown>;
      });

      try {
        const offer = expectOk(await counterOfferService.createCounterOffer(input));
        assert.ok(emitted, 'event should have been emitted');
        assert.equal((emitted as Record<string, unknown>).offerId, offer.id);
        assert.equal((emitted as Record<string, unknown>).bookingId, input.bookingId);
        assert.equal((emitted as Record<string, unknown>).proposerName, input.proposerName);
      } finally {
        unsub();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // acceptCounterOffer
  // ---------------------------------------------------------------------------
  describe('acceptCounterOffer', () => {
    it('returns NOT_FOUND for a non-existent offer', async () => {
      const result = await counterOfferService.acceptCounterOffer(`fake_${rid()}`);
      assert.equal(result.success, false);
      assert.ok(result.error);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  // ---------------------------------------------------------------------------
  // rejectCounterOffer
  // ---------------------------------------------------------------------------
  describe('rejectCounterOffer', () => {
    it('returns NOT_FOUND for a non-existent offer', async () => {
      const result = await counterOfferService.rejectCounterOffer({
        offerId: `fake_${rid()}`,
        reason: 'Does not work for me',
      });
      assert.equal(result.success, false);
      assert.ok(result.error);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  // ---------------------------------------------------------------------------
  // getCounterOffers
  // ---------------------------------------------------------------------------
  describe('getCounterOffers', () => {
    it('returns ok([]) when no offers exist for booking', async () => {
      const offers = expectOk(await counterOfferService.getCounterOffers(`bk_${rid()}`));
      assert.ok(Array.isArray(offers));
      assert.equal(offers.length, 0);
    });

    it('returns offers for a specific booking', async () => {
      const bookingId = `bk_${rid()}`;
      await counterOfferService.createCounterOffer(makeInput({ bookingId }));
      await counterOfferService.createCounterOffer(makeInput({ bookingId }));
      await counterOfferService.createCounterOffer(makeInput()); // different booking

      const offers = expectOk(await counterOfferService.getCounterOffers(bookingId));
      assert.equal(offers.length, 2);
      for (const o of offers) {
        assert.equal(o.bookingId, bookingId);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getCounterOffer
  // ---------------------------------------------------------------------------
  describe('getCounterOffer', () => {
    it('returns ok(null) for a missing offer', async () => {
      const offer = expectOk(await counterOfferService.getCounterOffer(`missing_${rid()}`));
      assert.equal(offer, null);
    });

    it('returns the offer when it exists', async () => {
      const created = expectOk(await counterOfferService.createCounterOffer(makeInput()));
      const found = expectOk(await counterOfferService.getCounterOffer(created.id));
      assert.ok(found);
      assert.equal(found!.id, created.id);
    });
  });

  // ---------------------------------------------------------------------------
  // expireOldOffers
  // ---------------------------------------------------------------------------
  describe('expireOldOffers', () => {
    it('returns ok(0) when no pending offers are past expiry', async () => {
      // Seed storage with an empty array so MOCK fallback is avoided,
      // then create a fresh offer with default 48h expiry — not expired yet.
      await apiClient.set(STORAGE_KEYS.COUNTER_OFFERS, []);
      await counterOfferService.createCounterOffer(makeInput());

      const expired = expectOk(await counterOfferService.expireOldOffers());
      assert.equal(expired, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // clearAll
  // ---------------------------------------------------------------------------
  describe('clearAll', () => {
    it('clears both counter-offers and negotiations stores', async () => {
      await counterOfferService.createCounterOffer(makeInput());

      const result = await counterOfferService.clearAll();
      assert.equal(result.success, true);

      // Verify both stores are empty
      const offers = expectOk(await counterOfferService.getCounterOffers('any'));
      assert.equal(offers.length, 0);

      const negotiation = expectOk(await counterOfferService.getNegotiationHistory('any'));
      assert.equal(negotiation, null);
    });
  });
});
