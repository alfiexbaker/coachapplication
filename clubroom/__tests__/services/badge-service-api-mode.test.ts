import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

function apiCoachUser() {
  return {
    id: 'coach_api_badge',
    email: 'coach-api-badge@example.test',
    accountType: 'COACH',
    firstName: 'API',
    lastName: 'Coach',
    isVerified: true,
    onboardingComplete: true,
    createdAt: '2026-07-05T10:00:00.000Z',
    updatedAt: '2026-07-05T10:00:00.000Z',
  };
}

function apiParentUser() {
  return {
    id: 'parent_api_badge',
    email: 'parent-api-badge@example.test',
    accountType: 'PARENT',
    firstName: 'API',
    lastName: 'Parent',
    isVerified: true,
    onboardingComplete: true,
    createdAt: '2026-07-05T10:00:00.000Z',
    updatedAt: '2026-07-05T10:00:00.000Z',
  };
}

describe('badgeService API mode', () => {
  it('lists athlete badge awards from /v1 instead of local badge storage', async () => {
    const [{ badgeService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/badge-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalGetCurrentUser = authService.getCurrentUser;
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    const requestedHeaders: unknown[] = [];

    authService.getCurrentUser = async () =>
      apiCoachUser() as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    apiClient.get = async <T>(key: string, fallback: T): Promise<T> => {
      if (key === STORAGE_KEYS.AUTH_USER) {
        return apiCoachUser() as T;
      }
      void fallback;
      throw new Error('local badge reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local badge writes should not run in API mode');
    };
    globalThis.fetch = (async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      requestedUrls.push(String(input));
      requestedHeaders.push(init?.headers ?? {});
      return new Response(
        JSON.stringify({
          athleteId: 'ath_api_badge',
          badges: [
            {
              id: 'award_api_badge',
              athleteId: 'ath_api_badge',
              badgeDefinitionId: 'badge_definition_api',
              awardedByUserId: 'coach_api_badge',
              bookingId: 'booking_api_badge',
              note: 'Backend badge',
              awardedAt: '2026-07-05T10:00:00.000Z',
              createdAt: '2026-07-05T10:00:00.000Z',
            },
          ],
          badgeDefinitions: [
            {
              id: 'badge_definition_api',
              name: 'API Badge',
              description: 'Loaded from backend',
              category: 'technical',
              pointValue: 10,
            },
          ],
          requestId: 'req_badge_api',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    try {
      const awards = await badgeService.listAwardsForAthlete('ath_api_badge');

      assert.equal(requestedUrls[0], 'http://localhost:4000/v1/athletes/ath_api_badge/badges');
      assert.equal((requestedHeaders[0] as Record<string, string>)['x-acting-role'], 'coach');
      assert.equal(
        (requestedHeaders[0] as Record<string, string>)['x-coach-athlete-ids'],
        'ath_api_badge',
      );
      assert.equal((requestedHeaders[0] as Record<string, string>)['x-coach-verified'], '1');
      assert.deepEqual(
        awards.map((award) => ({
          id: award.id,
          badgeId: award.badgeId,
          badgeLabel: award.badgeLabel,
          athleteId: award.athleteId,
          coachId: award.coachId,
          sessionId: award.sessionId,
          badgeCategory: award.badgeCategory,
          badgePointValue: award.badgePointValue,
        })),
        [
          {
            id: 'award_api_badge',
            badgeId: 'badge_definition_api',
            badgeLabel: 'API Badge',
            athleteId: 'ath_api_badge',
            coachId: 'coach_api_badge',
            sessionId: 'booking_api_badge',
            badgeCategory: 'technical',
            badgePointValue: 10,
          },
        ],
      );
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      authService.getCurrentUser = originalGetCurrentUser;
      globalThis.fetch = originalFetch;
    }
  });

  it('surfaces API badge read failures instead of returning empty local awards', async () => {
    const [{ badgeService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/badge-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalGetCurrentUser = authService.getCurrentUser;
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    authService.getCurrentUser = async () =>
      apiCoachUser() as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    apiClient.get = async <T>(key: string, fallback: T): Promise<T> => {
      if (key === STORAGE_KEYS.AUTH_USER) {
        return apiCoachUser() as T;
      }
      void fallback;
      throw new Error('local badge reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local badge writes should not run in API mode');
    };
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      requestedUrls.push(String(input));
      return new Response(
        JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'Not allowed to read athlete badges',
          },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    try {
      await assert.rejects(
        () => badgeService.listAwardsForAthlete('ath_api_badge'),
        /Not allowed to read athlete badges/,
      );
      await assert.rejects(
        () => badgeService.listAwardsForSession('session_api_badge'),
        /Not allowed to read athlete badges/,
      );
      assert.deepEqual(requestedUrls, [
        'http://localhost:4000/v1/athletes/ath_api_badge/badges',
        'http://localhost:4000/v1/sessions/session_api_badge/badges',
      ]);
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      authService.getCurrentUser = originalGetCurrentUser;
      globalThis.fetch = originalFetch;
    }
  });

  it('awards badges through /v1 instead of writing local badge storage', async () => {
    const [{ badgeService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/badge-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalGetCurrentUser = authService.getCurrentUser;
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    const requestedBodies: unknown[] = [];
    authService.getCurrentUser = async () =>
      apiCoachUser() as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    apiClient.get = async <T>(key: string, fallback: T): Promise<T> => {
      if (key === STORAGE_KEYS.AUTH_USER) {
        return apiCoachUser() as T;
      }
      void fallback;
      throw new Error('local badge reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local badge writes should not run in API mode');
    };
    globalThis.fetch = (async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      requestedUrls.push(String(input));
      requestedBodies.push(init?.body ? JSON.parse(String(init.body)) : {});
      return new Response(
        JSON.stringify({
          athleteId: 'ath_api_badge',
          badge: {
            id: 'award_api_badge_post',
            athleteId: 'ath_api_badge',
            badgeDefinitionId: 'badge_definition_api_post',
            awardedByUserId: 'coach_api_badge',
            bookingId: 'booking_api_badge',
            note: 'Backend badge post',
            reason: 'Strong session',
            visibility: 'supporters',
            cooldownBypassed: true,
            cooldownWindowDays: 7,
            context: 'session',
            overrideNote: 'API guard test',
            badgeTier: 1,
            badgePointValue: 10,
            badgeCategory: 'physical',
            awardedAt: '2026-07-05T10:00:00.000Z',
            createdAt: '2026-07-05T10:00:00.000Z',
          },
          badgeDefinition: {
            id: 'badge_definition_api_post',
            name: 'Standout Session',
            description: 'Loaded from backend',
            category: 'physical',
          },
          requestId: 'req_badge_api_post',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    try {
      const result = await badgeService.awardBadge({
        badgeId: 'badge_best_training',
        athleteId: 'ath_api_badge',
        coachId: 'coach_api_badge',
        sessionId: 'booking_api_badge',
        reason: 'Strong session',
        note: 'Backend badge post',
        visibility: 'supporters',
        overrideCooldown: true,
        overrideNote: 'API guard test',
      });

      assert.equal(result.success, true);
      assert.equal(requestedUrls[0], 'http://localhost:4000/v1/athletes/ath_api_badge/badge-awards');
      assert.deepEqual(requestedBodies[0], {
        badgeId: 'badge_best_training',
        badgeLabel: 'Standout Session',
        badgeCategory: 'physical',
        badgeTier: 1,
        badgePointValue: 10,
        sessionId: 'booking_api_badge',
        reason: 'Strong session',
        note: 'Backend badge post',
        visibility: 'supporters',
        overrideCooldown: true,
        overrideNote: 'API guard test',
        context: 'session',
      });
      assert.equal(result.success && result.data.id, 'award_api_badge_post');
      assert.equal(result.success && result.data.badgeLabel, 'Standout Session');
      assert.equal(result.success && result.data.cooldownBypassed, true);
      assert.equal(result.success && result.data.visibility, 'supporters');
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      authService.getCurrentUser = originalGetCurrentUser;
      globalThis.fetch = originalFetch;
    }
  });

  it('does not read or write local badge state for API-mode share and seen helpers', async () => {
    const [{ badgeService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/badge-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalGetCurrentUser = authService.getCurrentUser;
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    authService.getCurrentUser = async () =>
      apiParentUser() as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    apiClient.get = async <T>(key: string, fallback: T): Promise<T> => {
      if (key === STORAGE_KEYS.AUTH_USER) {
        return apiParentUser() as T;
      }
      void fallback;
      throw new Error('local badge reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local badge writes should not run in API mode');
    };
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.endsWith('/athletes/ath_api_badge/badge-awards/seen')) {
        return new Response(
          JSON.stringify({
            athleteId: 'ath_api_badge',
            badges: [],
            badgeDefinitions: [],
            seenCount: 1,
            requestId: 'req_badge_seen_all',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          athleteId: 'ath_api_badge',
          badge: {
            id: 'award_api_badge',
            athleteId: 'ath_api_badge',
            badgeDefinitionId: 'badge_definition_api',
            awardedByUserId: 'coach_api_badge',
            note: 'Backend badge action',
            reason: 'Strong session',
            visibility: 'supporters',
            shared: url.endsWith('/share') || url.endsWith('/feed-post'),
            feedPostId: url.endsWith('/feed-post') ? 'post_api_badge' : null,
            seenByParent: url.endsWith('/seen'),
            seenAt: url.endsWith('/seen') ? '2026-07-05T10:05:00.000Z' : null,
            awardedAt: '2026-07-05T10:00:00.000Z',
            createdAt: '2026-07-05T10:00:00.000Z',
          },
          badgeDefinition: {
            id: 'badge_definition_api',
            name: 'Standout Session',
            category: 'physical',
          },
          postIds: url.endsWith('/feed-post') ? ['post_api_badge'] : [],
          createdPostCount: url.endsWith('/feed-post') ? 1 : 0,
          requestId: 'req_badge_action',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      const shared = await badgeService.markShared('award_api_badge');
      assert.equal(shared?.shared, true);

      const seen = await badgeService.markSeenByParent('award_api_badge');
      assert.equal(seen?.seenByParent, true);

      await badgeService.postBadgeToFeed('award_api_badge');
      await badgeService.markAllSeenByParent('ath_api_badge');

      assert.deepEqual(requestedUrls, [
        'http://localhost:4000/v1/badge-awards/award_api_badge/share',
        'http://localhost:4000/v1/badge-awards/award_api_badge/seen',
        'http://localhost:4000/v1/badge-awards/award_api_badge/feed-post',
        'http://localhost:4000/v1/athletes/ath_api_badge/badge-awards/seen',
      ]);
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      authService.getCurrentUser = originalGetCurrentUser;
      globalThis.fetch = originalFetch;
    }
  });

  it('surfaces API badge action failures instead of returning silent success', async () => {
    const [{ badgeService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/badge-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    const originalGetCurrentUser = authService.getCurrentUser;
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    authService.getCurrentUser = async () =>
      apiParentUser() as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    apiClient.get = async <T>(key: string, fallback: T): Promise<T> => {
      if (key === STORAGE_KEYS.AUTH_USER) {
        return apiParentUser() as T;
      }
      void fallback;
      throw new Error('local badge reads should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local badge writes should not run in API mode');
    };
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      requestedUrls.push(String(input));
      return new Response(
        JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'Not allowed to update badge action state',
          },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      await assert.rejects(
        () => badgeService.markShared('award_api_badge'),
        /Not allowed to update badge action state/,
      );
      await assert.rejects(
        () => badgeService.markSeenByParent('award_api_badge'),
        /Not allowed to update badge action state/,
      );
      await assert.rejects(
        () => badgeService.postBadgeToFeed('award_api_badge'),
        /Not allowed to update badge action state/,
      );
      await assert.rejects(
        () => badgeService.markAllSeenByParent('ath_api_badge'),
        /Not allowed to update badge action state/,
      );

      assert.deepEqual(requestedUrls, [
        'http://localhost:4000/v1/badge-awards/award_api_badge/share',
        'http://localhost:4000/v1/badge-awards/award_api_badge/seen',
        'http://localhost:4000/v1/badge-awards/award_api_badge/feed-post',
        'http://localhost:4000/v1/athletes/ath_api_badge/badge-awards/seen',
      ]);
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
      authService.getCurrentUser = originalGetCurrentUser;
      globalThis.fetch = originalFetch;
    }
  });
});
