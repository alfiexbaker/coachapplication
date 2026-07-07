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

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('CommunityMessagingService API mode', () => {
  it('does not merge local message overlays into API-mode group message reads', async () => {
    const [
      { authService },
      { registerApiAuthService },
      { ok },
      { STORAGE_KEYS },
      { communityMessagingService },
    ] = await Promise.all([
      import('@/services/auth-service'),
      import('@/services/auth-service-registry'),
      import('@/types/result'),
      import('@/constants/storage-keys'),
      import('@/services/community/community-messaging-service'),
    ]);
    const originalGetCurrentUser = authService.getCurrentUser;
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

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
        accessToken: 'api-message-read-token',
        refreshToken: 'api-refresh-token',
        expiresAt: Date.now() + 3_600_000,
      }),
      refreshToken: async () => ok(undefined),
      logout: async () => {},
    });
    await seedLocalStorageValue(STORAGE_KEYS.GROUP_MESSAGES, {
      cgrp_api_real: [
        {
          id: 'gmsg_api_real',
          groupId: 'cgrp_api_real',
          senderId: 'local_parent',
          body: 'local override',
          createdAt: '2026-07-01T09:00:00.000Z',
          status: 'seen',
          readBy: ['local_parent'],
        },
        {
          id: 'gmsg_local_only',
          groupId: 'cgrp_api_real',
          senderId: 'local_parent',
          body: 'local only',
          createdAt: '2026-07-01T09:05:00.000Z',
          status: 'sent',
          readBy: [],
        },
      ],
    });
    globalThis.fetch = (async (input, init) => {
      fetchCalls.push({ url: String(input), init });
      return jsonResponse({
        threads: [
          {
            id: 'thread_api_group',
            threadType: 'GROUP',
            communityGroupId: 'cgrp_api_real',
            createdAt: '2026-07-03T12:00:00.000Z',
            messages: [
              {
                id: 'gmsg_api_real',
                messageThreadId: 'thread_api_group',
                senderUserId: 'parent_api_reader',
                content: 'API truth',
                createdAt: '2026-07-03T12:01:00.000Z',
                receipts: [
                  {
                    userId: 'parent_api_reader',
                    readAt: null,
                  },
                ],
              },
            ],
          },
        ],
      });
    }) as typeof fetch;

    try {
      const result = await communityMessagingService.getGroupMessages('cgrp_api_real');

      assert.equal(result.success, true);
      if (!result.success) {
        return;
      }
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0]?.url, 'http://localhost:4000/v1/message-threads');
      assert.equal(result.data.length, 1);
      assert.deepEqual(result.data[0], {
        id: 'gmsg_api_real',
        groupId: 'cgrp_api_real',
        senderId: 'parent_api_reader',
        body: 'API truth',
        createdAt: '2026-07-03T12:01:00.000Z',
        status: 'delivered',
        readBy: [],
        attachments: [],
      });
    } finally {
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });
});
