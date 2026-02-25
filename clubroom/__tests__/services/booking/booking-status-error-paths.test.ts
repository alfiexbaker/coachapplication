import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { bookingStatusService } from '@/services/booking/booking-status-service';
import { bookingCrudService } from '@/services/booking/booking-crud-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('BookingStatusService — error paths', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.NOTIFICATIONS);
  });

  it('should return error when confirming non-existent booking', async () => {
    const result = await bookingStatusService.confirmBooking(
      'fake-id-' + Math.random().toString(36).slice(2),
    );

    assert.equal(result.success, false);
    assert.ok(result.error, 'should include an error message');
  });

  it('should handle status check on missing booking', async () => {
    const result = await bookingStatusService.checkAndTransitionStatus(
      'fake-id-' + Math.random().toString(36).slice(2),
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'NOT_FOUND');
    }
  });
});
