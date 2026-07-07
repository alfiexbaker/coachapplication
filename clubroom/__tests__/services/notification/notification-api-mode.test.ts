import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

afterEach(async () => {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('notification API mode', () => {
  it('rejects client-side notification create without writing local notification state', async () => {
    const [{ notificationService }, { STORAGE_KEYS }, AsyncStorageModule] = await Promise.all([
      import('@/services/notification-service'),
      import('@/constants/storage-keys'),
      import('@react-native-async-storage/async-storage'),
    ]);
    const AsyncStorage = AsyncStorageModule.default;
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));

    const result = await notificationService.create({
      id: 'notif_api_local_create',
      type: 'booking',
      title: 'Should not be created locally',
      body: 'API mode must use backend-owned product actions.',
      timeLabel: 'Now',
      read: false,
      recipientId: 'coach_api_notification',
    });
    const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) ?? '[]');

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'UNSUPPORTED');
    }
    assert.deepEqual(stored, []);
  });

  it('rejects sender helpers in API mode instead of reporting fake success', async () => {
    const [{ notificationService }, { STORAGE_KEYS }, AsyncStorageModule] = await Promise.all([
      import('@/services/notification-service'),
      import('@/constants/storage-keys'),
      import('@react-native-async-storage/async-storage'),
    ]);
    const AsyncStorage = AsyncStorageModule.default;
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));

    const result = await notificationService.notifyCoachNewBooking({
      coachId: 'coach_api_notification',
      parentName: 'Parent API',
      childName: 'Athlete API',
      date: '2026-07-07',
      bookingId: 'booking_api_notification',
    });
    const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) ?? '[]');

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'UNSUPPORTED');
    }
    assert.deepEqual(stored, []);
  });
});
