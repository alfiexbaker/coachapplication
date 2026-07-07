import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function seedLocalStorageValue(key: string, value: unknown): Promise<void> {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function setupApiModeUser() {
  const [{ authService }, { registerApiAuthService }, { ok }] = await Promise.all([
    import('@/services/auth-service'),
    import('@/services/auth-service-registry'),
    import('@/types/result'),
  ]);
  const originalGetCurrentUser = authService.getCurrentUser;

  authService.getCurrentUser = async () => ({
    id: 'parent_api_reader',
    email: 'parent.reader@example.com',
    accountType: 'PARENT',
    appRole: 'USER',
    firstName: 'Parent',
    lastName: 'Reader',
    isVerified: true,
    onboardingComplete: true,
    createdAt: '2026-07-03T12:00:00.000Z',
    updatedAt: '2026-07-03T12:00:00.000Z',
  });
  registerApiAuthService({
    getTokens: async () => ({
      accessToken: 'api-message-token',
      refreshToken: 'api-refresh-token',
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

describe('MessagingService API mode', () => {
  it('does not merge local message overlays or deleted masks into API-mode reads', async () => {
    const restoreUser = await setupApiModeUser();
    const [{ STORAGE_KEYS }, { messagingService }] = await Promise.all([
      import('@/constants/storage-keys'),
      import('@/services/messaging-service'),
    ]);
    const fetchCalls: string[] = [];

    await seedLocalStorageValue(STORAGE_KEYS.MESSAGES, {
      thread_api_direct: [
        {
          id: 'msg_api_keep',
          threadId: 'thread_api_direct',
          sender: 'parent',
          body: 'local override',
          createdAt: '2026-07-01T08:00:00.000Z',
          status: 'seen',
        },
        {
          id: 'msg_local_only',
          threadId: 'thread_api_direct',
          sender: 'parent',
          body: 'local only',
          createdAt: '2026-07-01T08:05:00.000Z',
          status: 'sent',
        },
      ],
    });
    await seedLocalStorageValue(STORAGE_KEYS.MESSAGE_DELETED_IDS, {
      thread_api_direct: ['msg_api_deleted'],
    });
    globalThis.fetch = (async (input) => {
      fetchCalls.push(String(input));
      return jsonResponse({
        threads: [
          {
            id: 'thread_api_direct',
            threadType: 'DIRECT',
            createdAt: '2026-07-03T12:00:00.000Z',
            messages: [
              {
                id: 'msg_api_keep',
                messageThreadId: 'thread_api_direct',
                senderUserId: 'coach_api_sender',
                content: 'API truth',
                createdAt: '2026-07-03T12:01:00.000Z',
                receipts: [
                  {
                    userId: 'parent_api_reader',
                    deliveredAt: '2026-07-03T12:01:05.000Z',
                    readAt: null,
                  },
                ],
              },
              {
                id: 'msg_api_deleted',
                messageThreadId: 'thread_api_direct',
                senderUserId: 'coach_api_sender',
                content: 'API still visible',
                createdAt: '2026-07-03T12:02:00.000Z',
                receipts: [],
              },
            ],
          },
        ],
      });
    }) as typeof fetch;

    try {
      const result = await messagingService.listMessages('thread_api_direct');

      assert.equal(result.success, true);
      if (!result.success) {
        return;
      }
      assert.deepEqual(fetchCalls, ['http://localhost:4000/v1/message-threads']);
      assert.deepEqual(
        result.data.map((message) => [message.id, message.body]),
        [
          ['msg_api_keep', 'API truth'],
          ['msg_api_deleted', 'API still visible'],
        ],
      );
    } finally {
      restoreUser();
    }
  });

  it('does not merge local thread overlays into API-mode thread summaries', async () => {
    const restoreUser = await setupApiModeUser();
    const [{ STORAGE_KEYS }, { messagingService }] = await Promise.all([
      import('@/constants/storage-keys'),
      import('@/services/messaging-service'),
    ]);
    const fetchCalls: string[] = [];

    await seedLocalStorageValue(STORAGE_KEYS.MESSAGE_THREADS, [
      {
        id: 'thread_api_direct',
        kind: 'direct',
        title: 'Local Coach',
        unreadCount: 99,
        lastMessageSnippet: 'local override',
        scheduledFor: '2026-07-01T08:00:00.000Z',
      },
      {
        id: 'thread_local_only',
        kind: 'direct',
        title: 'Local Only',
        unreadCount: 1,
        scheduledFor: '2026-07-01T08:05:00.000Z',
      },
    ]);
    globalThis.fetch = (async (input) => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.endsWith('/v1/message-threads')) {
        return jsonResponse({
          threads: [
            {
              id: 'thread_api_direct',
              threadType: 'DIRECT',
              title: 'API Coach',
              createdAt: '2026-07-03T12:00:00.000Z',
              messages: [],
              participants: [],
            },
          ],
        });
      }
      if (url.endsWith('/v1/community-groups')) {
        return jsonResponse({ groups: [] });
      }
      if (url.endsWith('/v1/bookings')) {
        return jsonResponse({ bookings: [] });
      }
      return jsonResponse({ message: `Unexpected ${url}` }, 500);
    }) as typeof fetch;

    try {
      const result = await messagingService.listThreads();

      assert.equal(result.success, true);
      if (!result.success) {
        return;
      }
      assert.deepEqual(fetchCalls, [
        'http://localhost:4000/v1/message-threads',
        'http://localhost:4000/v1/community-groups',
        'http://localhost:4000/v1/bookings',
      ]);
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0]?.id, 'thread_api_direct');
      assert.equal(result.data[0]?.title, 'Coach');
      assert.equal(result.data[0]?.unreadCount, 0);
      assert.equal(result.data[0]?.lastMessageSnippet, undefined);
    } finally {
      restoreUser();
    }
  });
});
