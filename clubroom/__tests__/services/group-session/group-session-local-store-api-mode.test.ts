import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { GroupRegistration, GroupSession } from '@/constants/types';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

afterEach(async () => {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('group-session local store API mode', () => {
  it('does not read, write, or seed local group-session authority outside mock mode', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const { getSessionsCache, loadSessions, saveSessions, setSessionsCache } = await import(
      '@/services/group-session/session-crud-service'
    );
    const { loadRegistrations, saveRegistrations } = await import(
      '@/services/group-session/session-registration-service'
    );

    const localSession: GroupSession = {
      id: 'gs_local',
      coachId: 'coach_local',
      clubId: 'club_local',
      title: 'Local Session',
      description: 'Should not be API-mode truth',
      sessionType: 'TRAINING',
      schedule: [{ date: '2030-01-01', startTime: '18:00', endTime: '19:00' }],
      maxParticipants: 20,
      currentParticipants: 3,
      waitlistEnabled: true,
      waitlistCount: 0,
      pricePerParticipant: 0,
      currency: 'GBP',
      location: 'Local Pitch',
      isVirtual: false,
      status: 'PUBLISHED',
      createdAt: '2030-01-01T10:00:00.000Z',
    };
    const localRegistration: GroupRegistration = {
      id: 'reg_local',
      sessionId: localSession.id,
      athleteId: 'athlete_local',
      parentId: 'parent_local',
      status: 'REGISTERED',
      registeredAt: '2030-01-01T10:05:00.000Z',
      attendedDates: [],
    };

    await AsyncStorage.setItem(STORAGE_KEYS.GROUP_SESSIONS, JSON.stringify([localSession]));
    await AsyncStorage.setItem(
      STORAGE_KEYS.GROUP_REGISTRATIONS,
      JSON.stringify([localRegistration]),
    );

    assert.deepEqual(await loadSessions(), []);
    assert.deepEqual(await loadRegistrations(), []);

    await saveSessions([{ ...localSession, id: 'gs_write_attempt' }]);
    await saveRegistrations([{ ...localRegistration, id: 'reg_write_attempt' }]);
    assert.equal(
      await AsyncStorage.getItem(STORAGE_KEYS.GROUP_SESSIONS),
      JSON.stringify([localSession]),
    );
    assert.equal(
      await AsyncStorage.getItem(STORAGE_KEYS.GROUP_REGISTRATIONS),
      JSON.stringify([localRegistration]),
    );

    setSessionsCache([localSession]);
    assert.deepEqual(getSessionsCache(), []);
  });
});
