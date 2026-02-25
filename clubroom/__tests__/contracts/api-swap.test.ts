/**
 * Contract: API Swap Safety
 *
 * Verifies that services handle various data shapes from apiClient gracefully:
 * - Empty arrays
 * - Null values
 * - Storage errors (apiClient.get/set throwing)
 * - UUID-style IDs
 *
 * Tests bookingCrudService, walletCrudService, and cancellationService.
 */

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { bookingCrudService } from '@/services/booking/booking-crud-service';
import type { CreateBookingParams } from '@/services/booking/booking-crud-service';
import { walletCrudService } from '@/services/wallet/wallet-crud-service';
import { cancellationService } from '@/services/cancellation-service';

function makeBookingParams(overrides: Partial<CreateBookingParams> = {}): CreateBookingParams {
  return {
    coachId: 'coach-contract',
    coachName: 'Coach Contract',
    athleteIds: ['athlete-contract'],
    athleteNames: ['Athlete Contract'],
    bookedById: 'parent-contract',
    bookedByName: 'Parent Contract',
    scheduledAt: '2030-09-01T10:00:00.000Z',
    duration: 60,
    location: 'Test Field',
    service: '1-on-1',
    serviceType: 'COACHING',
    price: 25,
    skipAvailabilityValidation: true,
    ...overrides,
  };
}

describe('Contract: API Swap — Empty Data Handling', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.WALLETS);
    await apiClient.remove(STORAGE_KEYS.CANCELLATION_RECORDS);
    await apiClient.remove(STORAGE_KEYS.NO_SHOW_COUNTS);
    await apiClient.remove(STORAGE_KEYS.NOTIFICATIONS);
    await apiClient.remove(STORAGE_KEYS.COACH_SESSIONS);
    await apiClient.remove(STORAGE_KEYS.CANCELLATION_POLICIES);
    await apiClient.remove(STORAGE_KEYS.SCHEDULING_RULES);
  });

  // --------------------------------------------------------------------------
  // Empty array responses
  // --------------------------------------------------------------------------

  it('bookingCrudService.list() returns empty array when storage is empty', async () => {
    const bookings = await bookingCrudService.list();
    assert.ok(Array.isArray(bookings), 'should return an array');
    assert.equal(bookings.length, 0, 'should be empty');
  });

  it('walletCrudService.getAllWallets() returns ok with array when storage is empty', async () => {
    // Clear wallets so mock fallback is not used
    await apiClient.set(STORAGE_KEYS.WALLETS, []);
    const result = await walletCrudService.getAllWallets();
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.ok(Array.isArray(result.data));
  });

  it('cancellationService.getCancellationRecords() returns ok([]) when empty', async () => {
    const result = await cancellationService.getCancellationRecords();
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.deepEqual(result.data, []);
  });

  // --------------------------------------------------------------------------
  // Null handling
  // --------------------------------------------------------------------------

  it('bookingCrudService.getBooking() returns null for non-existent ID', async () => {
    const booking = await bookingCrudService.getBooking('non-existent-id');
    assert.equal(booking, null);
  });

  it('bookingCrudService.getById() returns undefined for non-existent ID', async () => {
    const booking = await bookingCrudService.getById('non-existent-id');
    assert.equal(booking, undefined);
  });

  it('cancellationService.getCancellationByBooking() returns ok(null) for missing booking', async () => {
    const result = await cancellationService.getCancellationByBooking('missing-booking-id');
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data, null);
  });

  // --------------------------------------------------------------------------
  // Update on non-existent records
  // --------------------------------------------------------------------------

  it('bookingCrudService.updateBooking() returns NOT_FOUND for missing booking', async () => {
    const result = await bookingCrudService.updateBooking('missing-id', { status: 'COMPLETED' });
    assert.equal(result.success, false, 'should fail');
    if (result.success) return;
    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('walletCrudService.updateWallet() returns NOT_FOUND for missing wallet', async () => {
    await apiClient.set(STORAGE_KEYS.WALLETS, []);
    const result = await walletCrudService.updateWallet('no-such-user', { balance: 100 });
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.error.code, 'NOT_FOUND');
  });

  // --------------------------------------------------------------------------
  // UUID-style IDs don't break services
  // --------------------------------------------------------------------------

  it('services handle UUID-style IDs without breaking', async () => {
    const uuidCoachId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const uuidAthleteId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    const result = await bookingCrudService.createBooking(
      makeBookingParams({
        coachId: uuidCoachId,
        athleteIds: [uuidAthleteId],
        athleteNames: ['UUID Athlete'],
      }),
    );
    assert.equal(result.success, true, 'createBooking with UUID IDs should succeed');
    if (!result.success) return;

    assert.equal(result.data.coachId, uuidCoachId);
    assert.deepEqual(result.data.athleteIds, [uuidAthleteId]);

    // Verify lookup works
    const fetched = await bookingCrudService.getBooking(result.data.id);
    assert.ok(fetched);
    assert.equal(fetched!.coachId, uuidCoachId);
  });

  it('walletCrudService.getWallet() handles UUID userId and auto-creates', async () => {
    await apiClient.set(STORAGE_KEYS.WALLETS, []);
    const uuidUserId = 'e9d71a2c-4f3b-47e8-9c5a-8f1d2e3c4b5a';

    const result = await walletCrudService.getWallet(uuidUserId);
    assert.equal(result.success, true, 'should auto-create wallet for UUID user');
    if (!result.success) return;
    assert.equal(result.data.userId, uuidUserId);
    assert.equal(result.data.balance, 0);
  });

  it('cancellationService.cancelBooking() works with UUID IDs', async () => {
    const uuidBookingId = '12345678-abcd-ef01-2345-6789abcdef01';
    const result = await cancellationService.cancelBooking(uuidBookingId, 'parent', {
      reason: 'Schedule conflict',
      coachId: '00000000-0000-0000-0000-000000000001',
    });
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.bookingId, uuidBookingId);
    assert.equal(result.data.cancelledBy, 'parent');
  });

  // --------------------------------------------------------------------------
  // Storage error handling (apiClient.set throws)
  // --------------------------------------------------------------------------

  it('bookingCrudService handles storage write failure gracefully', async () => {
    // First create a valid booking
    const createResult = await bookingCrudService.createBooking(makeBookingParams());
    assert.equal(createResult.success, true);
    if (!createResult.success) return;

    // Monkey-patch apiClient.set to throw, then restore
    const originalSet = apiClient.set.bind(apiClient);
    let setCallCount = 0;
    (apiClient as Record<string, unknown>).set = async (_key: string, _data: unknown) => {
      setCallCount++;
      throw new Error('Simulated storage failure');
    };

    try {
      const updateResult = await bookingCrudService.updateBooking(createResult.data.id, {
        status: 'COMPLETED',
      });
      // Should return an error result, not throw
      assert.equal(updateResult.success, false, 'should return error on storage failure');
      if (!updateResult.success) {
        assert.equal(updateResult.error.code, 'STORAGE');
      }
      assert.ok(setCallCount > 0, 'apiClient.set should have been called');
    } finally {
      // Restore original
      (apiClient as Record<string, unknown>).set = originalSet;
    }
  });

  it('walletCrudService handles storage write failure gracefully', async () => {
    await apiClient.set(STORAGE_KEYS.WALLETS, [
      {
        id: 'wallet_failtest',
        userId: 'failtest',
        balance: 50,
        currency: 'GBP',
        pendingBalance: 0,
        totalDeposited: 100,
        totalSpent: 50,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        isActive: true,
      },
    ]);

    const originalSet = apiClient.set.bind(apiClient);
    (apiClient as Record<string, unknown>).set = async (_key: string, _data: unknown) => {
      throw new Error('Simulated storage failure');
    };

    try {
      const result = await walletCrudService.updateWallet('failtest', { balance: 200 });
      assert.equal(result.success, false, 'should return error on storage failure');
      if (!result.success) {
        assert.equal(result.error.code, 'STORAGE');
      }
    } finally {
      (apiClient as Record<string, unknown>).set = originalSet;
    }
  });

  it('cancellationService handles storage write failure gracefully', async () => {
    const originalSet = apiClient.set.bind(apiClient);
    (apiClient as Record<string, unknown>).set = async (_key: string, _data: unknown) => {
      throw new Error('Simulated storage failure');
    };

    try {
      const result = await cancellationService.cancelBooking('booking-fail', 'coach', {
        reason: 'test',
        coachId: 'coach-fail',
      });
      assert.equal(result.success, false, 'should return error on storage failure');
      if (!result.success) {
        assert.equal(result.error.code, 'STORAGE');
      }
    } finally {
      (apiClient as Record<string, unknown>).set = originalSet;
    }
  });

  // --------------------------------------------------------------------------
  // No-show counter contract
  // --------------------------------------------------------------------------

  it('no-show counter increments correctly from zero', async () => {
    const familyId = 'family-noshow-1';

    const before = await cancellationService.getNoShowCount(familyId);
    assert.equal(before.success, true);
    if (before.success) assert.equal(before.data, 0);

    await cancellationService.incrementNoShow(familyId);

    const after = await cancellationService.getNoShowCount(familyId);
    assert.equal(after.success, true);
    if (after.success) assert.equal(after.data, 1);

    await cancellationService.incrementNoShow(familyId);

    const afterTwo = await cancellationService.getNoShowCount(familyId);
    assert.equal(afterTwo.success, true);
    if (afterTwo.success) assert.equal(afterTwo.data, 2);
  });

  it('no-show reset brings count back to zero', async () => {
    const familyId = 'family-reset-1';
    await cancellationService.incrementNoShow(familyId);
    await cancellationService.incrementNoShow(familyId);

    await cancellationService.resetNoShowCount(familyId);

    const result = await cancellationService.getNoShowCount(familyId);
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data, 0);
  });
});
