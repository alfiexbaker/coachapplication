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
  it('posts read receipts without a fabricated request body', async () => {
    const restoreUser = await setupApiModeUser();
    const { communityMediaAuthorityService } = await import(
      '@/services/community-media-authority-service'
    );
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

    globalThis.fetch = (async (input, init) => {
      fetchCalls.push({ url: String(input), init });
      return jsonResponse({ thread: null });
    }) as typeof fetch;

    try {
      const threadResult = await communityMediaAuthorityService.markThreadMessagesRead(
        'thread_api_direct',
      );
      const groupResult = await communityMediaAuthorityService.markGroupMessagesRead(
        'group_api_parent',
      );

      assert.equal(threadResult.success, true);
      assert.equal(groupResult.success, true);
      assert.deepEqual(
        fetchCalls.map(({ url, init }) => ({ url, method: init?.method, body: init?.body })),
        [
          {
            url: 'http://localhost:4000/v1/message-threads/thread_api_direct/read',
            method: 'POST',
            body: undefined,
          },
          {
            url: 'http://localhost:4000/v1/community-groups/group_api_parent/messages/read',
            method: 'POST',
            body: undefined,
          },
        ],
      );
    } finally {
      restoreUser();
    }
  });

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
            {
              id: 'thread_api_group_session',
              threadType: 'GROUP',
              title: 'Session group chat',
              communityGroupId: 'community_api_group',
              groupSessionId: 'group_session_api_1',
              createdAt: '2026-07-03T12:10:00.000Z',
              messages: [],
              participants: [{ userId: 'parent_api_reader' }],
            },
          ],
        });
      }
      if (url.endsWith('/v1/community-groups')) {
        return jsonResponse({
          groups: [
            {
              id: 'community_api_group',
              type: 'SESSION',
              name: 'U12 finishing group',
              description: 'Session group messages',
            },
          ],
        });
      }
      if (url.endsWith('/v1/users/parent_api_reader')) {
        return jsonResponse({
          user: {
            id: 'parent_api_reader',
            name: 'Parent Reader',
            role: 'PARENT',
          },
        });
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
        'http://localhost:4000/v1/users/parent_api_reader',
        'http://localhost:4000/v1/bookings',
      ]);
      assert.equal(result.data.length, 2);
      const directThread = result.data.find((thread) => thread.id === 'thread_api_direct');
      assert.equal(directThread?.title, 'Coach');
      assert.equal(directThread?.unreadCount, 0);
      assert.equal(directThread?.lastMessageSnippet, undefined);

      const groupThread = result.data.find((thread) => thread.id === 'thread_api_group_session');
      assert.equal(groupThread?.kind, 'group');
      assert.equal(groupThread?.communityGroupId, 'community_api_group');
      assert.equal(groupThread?.groupSessionId, 'group_session_api_1');
      assert.equal(groupThread?.title, 'Session group chat');
    } finally {
      restoreUser();
    }
  });

  it('keeps API-mode thread summaries available when optional booking labels fail', async () => {
    const restoreUser = await setupApiModeUser();
    const { messagingService } = await import('@/services/messaging-service');
    const fetchCalls: string[] = [];

    globalThis.fetch = (async (input) => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.endsWith('/v1/message-threads')) {
        return jsonResponse({
          threads: [
            {
              id: 'thread_api_direct',
              threadType: 'DIRECT',
              bookingId: 'booking_api_unavailable',
              createdAt: '2026-07-03T12:00:00.000Z',
              messages: [],
              participants: [{ userId: 'coach_api_sender' }],
            },
          ],
        });
      }
      if (url.endsWith('/v1/community-groups')) {
        return jsonResponse({ groups: [] });
      }
      if (url.endsWith('/v1/users/coach_api_sender')) {
        return jsonResponse({
          user: {
            id: 'coach_api_sender',
            name: 'Coach Sender',
            role: 'COACH',
          },
        });
      }
      if (url.endsWith('/v1/bookings')) {
        return jsonResponse({ message: 'temporary booking label failure' }, 503);
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
        'http://localhost:4000/v1/users/coach_api_sender',
        'http://localhost:4000/v1/bookings',
      ]);
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0]?.title, 'Coach Sender');
      assert.equal(result.data[0]?.serviceName, 'Direct message');
    } finally {
      restoreUser();
    }
  });

  it('does not grant API-mode co-guardian access from caller-supplied child ids', async () => {
    const restoreUser = await setupApiModeUser();
    const { messagingService } = await import('@/services/messaging-service');
    const fetchCalls: string[] = [];

    globalThis.fetch = (async (input) => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.endsWith('/v1/message-threads')) {
        return jsonResponse({
          threads: [
            {
              id: 'thread_api_visible',
              threadType: 'DIRECT',
              createdAt: '2026-07-03T12:00:00.000Z',
              messages: [],
              participants: [{ userId: 'parent_api_reader' }],
            },
          ],
        });
      }
      if (url.endsWith('/v1/community-groups')) {
        return jsonResponse({ groups: [] });
      }
      if (url.endsWith('/v1/users/parent_api_reader')) {
        return jsonResponse({
          user: {
            id: 'parent_api_reader',
            name: 'Parent Reader',
            role: 'PARENT',
          },
        });
      }
      if (url.endsWith('/v1/bookings')) {
        return jsonResponse({ bookings: [] });
      }
      return jsonResponse({ message: `Unexpected ${url}` }, 500);
    }) as typeof fetch;

    try {
      const result = await messagingService.checkCoGuardianAccess(
        'thread_api_hidden',
        'parent_api_reader',
        ['athlete_api_child'],
      );

      assert.equal(result.success, true);
      if (!result.success) {
        return;
      }
      assert.equal(result.data, false);
      assert.deepEqual(fetchCalls, [
        'http://localhost:4000/v1/message-threads',
        'http://localhost:4000/v1/community-groups',
        'http://localhost:4000/v1/users/parent_api_reader',
        'http://localhost:4000/v1/bookings',
      ]);
    } finally {
      restoreUser();
    }
  });

  it('fails co-guardian access checks closed on message-thread API failure', async () => {
    const restoreUser = await setupApiModeUser();
    const { messagingService } = await import('@/services/messaging-service');
    const fetchCalls: string[] = [];

    globalThis.fetch = (async (input) => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.endsWith('/v1/message-threads')) {
        return jsonResponse({ message: 'Message thread authority unavailable' }, 503);
      }
      return jsonResponse({ message: `Unexpected ${url}` }, 500);
    }) as typeof fetch;

    try {
      const result = await messagingService.checkCoGuardianAccess(
        'thread_api_direct',
        'parent_api_reader',
        ['athlete_api_child'],
      );

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.message, 'Message thread authority unavailable');
      }
      assert.deepEqual(fetchCalls, ['http://localhost:4000/v1/message-threads']);
    } finally {
      restoreUser();
    }
  });
});
