import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { EventRSVP } from '@/constants/types';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

afterEach(async () => {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('event RSVP local store API mode', () => {
  it('does not read, write, or seed local RSVP authority outside mock mode', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const { getRsvpsCache, loadRSVPs, saveRSVPs, setRsvpsCache } = await import(
      '@/services/event/event-rsvp-service'
    );

    const localRsvp: EventRSVP = {
      id: 'event_rsvp_local',
      eventId: 'event_local',
      userId: 'user_local',
      userRole: 'PARENT',
      status: 'GOING',
      guestCount: 1,
      respondedAt: '2030-01-01T10:00:00.000Z',
    };

    await AsyncStorage.setItem(STORAGE_KEYS.EVENT_RSVPS, JSON.stringify([localRsvp]));

    assert.deepEqual(await loadRSVPs(), []);

    await saveRSVPs([{ ...localRsvp, id: 'event_rsvp_write_attempt' }]);
    assert.equal(await AsyncStorage.getItem(STORAGE_KEYS.EVENT_RSVPS), JSON.stringify([localRsvp]));

    setRsvpsCache([localRsvp]);
    assert.deepEqual(getRsvpsCache(), []);
  });
});
