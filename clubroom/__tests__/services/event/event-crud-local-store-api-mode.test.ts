import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { ClubEvent } from '@/constants/types';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

afterEach(async () => {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('event CRUD local store API mode', () => {
  it('does not read, write, or seed local club event authority outside mock mode', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const { getEventsCache, loadEvents, saveEvents, setEventsCache } = await import(
      '@/services/event/event-crud-service'
    );

    const localEvent: ClubEvent = {
      id: 'event_local',
      clubId: 'club_local',
      createdBy: 'coach_local',
      title: 'Local Event',
      description: 'Should not be API-mode truth',
      eventType: 'MEETING',
      date: '2030-01-01',
      startTime: '18:00',
      timeZone: 'Europe/London',
      venue: 'Local Clubhouse',
      isVirtual: false,
      targetAudience: 'ALL',
      price: 0,
      currency: 'GBP',
      rsvpRequired: true,
      attendees: [],
      status: 'PUBLISHED',
      createdAt: '2030-01-01T10:00:00.000Z',
    };

    await AsyncStorage.setItem(STORAGE_KEYS.CLUB_EVENTS, JSON.stringify([localEvent]));

    assert.deepEqual(await loadEvents(), []);

    await saveEvents([{ ...localEvent, id: 'event_write_attempt' }]);
    assert.equal(await AsyncStorage.getItem(STORAGE_KEYS.CLUB_EVENTS), JSON.stringify([localEvent]));

    setEventsCache([localEvent]);
    assert.deepEqual(getEventsCache(), []);
  });
});
