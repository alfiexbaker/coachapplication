import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function setupApiModeUser() {
  const [{ authService }, { registerApiAuthService }, { ok }] = await Promise.all([
    import('@/services/auth-service'),
    import('@/services/auth-service-registry'),
    import('@/types/result'),
  ]);
  const originalGetCurrentUser = authService.getCurrentUser;

  authService.getCurrentUser = async () => ({
    id: 'parent_api_notifications',
    email: 'parent.notifications@example.com',
    accountType: 'PARENT',
    appRole: 'USER',
    firstName: 'Parent',
    lastName: 'Notifications',
    isVerified: true,
    onboardingComplete: true,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
  });
  registerApiAuthService({
    getTokens: async () => ({
      accessToken: 'api-notification-token',
      refreshToken: 'api-notification-refresh-token',
      expiresAt: Date.now() + 3_600_000,
    }),
    refreshToken: async () => ok(undefined),
    logout: async () => {},
  });

  return () => {
    authService.getCurrentUser = originalGetCurrentUser;
  };
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('notification API mode', () => {
  it('posts notification actions without fabricated request bodies', async () => {
    const restoreUser = await setupApiModeUser();
    const { notificationAuthorityService } =
      await import('@/services/notification/notification-authority-service');
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
    const notification = {
      id: 'notif_api_action',
      userId: 'parent_api_notifications',
      type: 'BOOKING_CONFIRMED',
      title: 'Booking confirmed',
      body: 'Your booking is confirmed.',
      status: 'READ',
      sourceType: 'booking',
      sourceId: 'booking_api_action',
      deepLink: '/bookings/booking_api_action',
      metadataJson: {},
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:05:00.000Z',
      readAt: '2026-08-01T10:05:00.000Z',
      dismissedAt: null,
    };

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      fetchCalls.push({ url, init });
      return jsonResponse(
        url.endsWith('/read-all') || url.endsWith('/dismiss-all')
          ? { notifications: [notification], unreadCount: 0 }
          : { notification },
      );
    }) as typeof fetch;

    try {
      const results = await Promise.all([
        notificationAuthorityService.markNotificationRead('notif_api_action'),
        notificationAuthorityService.markAllNotificationsRead(),
        notificationAuthorityService.dismissNotification('notif_api_action'),
        notificationAuthorityService.dismissAllNotifications(),
      ]);

      assert.equal(
        results.every((result) => result.success),
        true,
      );
      assert.deepEqual(
        fetchCalls.map(({ url, init }) => ({ url, method: init?.method, body: init?.body })),
        [
          {
            url: 'http://localhost:4000/v1/me/notifications/notif_api_action/read',
            method: 'POST',
            body: undefined,
          },
          {
            url: 'http://localhost:4000/v1/me/notifications/read-all',
            method: 'POST',
            body: undefined,
          },
          {
            url: 'http://localhost:4000/v1/me/notifications/notif_api_action/dismiss',
            method: 'POST',
            body: undefined,
          },
          {
            url: 'http://localhost:4000/v1/me/notifications/dismiss-all',
            method: 'POST',
            body: undefined,
          },
        ],
      );
    } finally {
      restoreUser();
    }
  });

  it('preserves live notification authority errors instead of relabeling them as storage errors', async () => {
    const [{ notificationStore }, { notificationAuthorityService }] = await Promise.all([
      import('@/services/notification/notification-store'),
      import('@/services/notification/notification-authority-service'),
    ]);
    const originalListNotifications = notificationAuthorityService.listNotifications;
    const authorityError = {
      code: 'NETWORK' as const,
      message: 'Notification database unavailable',
      details: { route: '/v1/me/notifications' },
    };

    notificationAuthorityService.listNotifications = async () => {
      throw authorityError;
    };

    try {
      const result = await notificationStore.list();

      assert.equal(result.success, false);
      if (result.success) {
        return;
      }
      assert.deepEqual(result.error, authorityError);
      assert.equal(result.error.code, 'NETWORK');
    } finally {
      notificationAuthorityService.listNotifications = originalListNotifications;
    }
  });

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
