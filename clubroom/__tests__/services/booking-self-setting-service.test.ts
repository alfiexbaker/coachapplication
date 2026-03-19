import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS, getUserKey } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { bookingSelfSettingService } from '@/services/booking-self-setting-service';
import { eventBus, onTyped, ServiceEvents } from '@/services/event-bus';

const TEST_USER_ID = 'user_booking_self_test';

describe('bookingSelfSettingService', () => {
  beforeEach(async () => {
    await apiClient.remove(getUserKey(STORAGE_KEYS.ALLOW_BOOK_SELF, TEST_USER_ID));
    eventBus.clearAll();
  });

  it('returns false when no self-booking preference has been saved', async () => {
    const enabled = await bookingSelfSettingService.isEnabled(TEST_USER_ID);

    assert.equal(enabled, false);
  });

  it('persists the preference and emits a change event', async () => {
    const events: Array<{ userId: string; enabled: boolean }> = [];
    const unsubscribe = onTyped(ServiceEvents.BOOKING_SELF_SETTING_CHANGED, (payload) => {
      events.push(payload);
    });

    const saved = await bookingSelfSettingService.setEnabled(TEST_USER_ID, true);
    const enabled = await bookingSelfSettingService.isEnabled(TEST_USER_ID);

    unsubscribe();

    assert.equal(saved, true);
    assert.equal(enabled, true);
    assert.deepEqual(events, [{ userId: TEST_USER_ID, enabled: true }]);
  });
});
