import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function richCoachProfile() {
  return {
    userId: 'usr_api_coach',
    displayName: 'API Coach Name',
    bio: 'API profile bio',
    sessionRateMinor: 6500,
    priceMaxMinor: 9500,
    website: 'https://coach.example.com',
    socialLinks: {
      instagram: 'coach.example',
    },
    experiences: [
      {
        id: 'exp_api',
        title: 'Academy coach',
        organization: 'API FC',
        startDate: '2021',
        current: true,
      },
    ],
    languages: [
      {
        id: 'lang_api',
        name: 'Spanish',
        proficiency: 'Conversational',
      },
    ],
    specialties: ['First touch'],
    qualifications: ['UEFA B'],
    travelRadiusMiles: 18,
    acceptsTravelSessions: true,
    acceptsRemoteSessions: true,
    publicLocations: [
      {
        id: 'loc_api_public',
        label: 'API Public Pitch',
        lat: 51.49,
        lng: -0.12,
        isDefault: true,
      },
    ],
  };
}

function apiOffering(coachUserId: string, coachProfile?: ReturnType<typeof richCoachProfile>) {
  return {
    id: `offering_${coachUserId}`,
    coachUserId,
    title: 'Live finishing session',
    description: 'API-backed football coaching',
    serviceType: '1-to-1',
    capacity: 1,
    defaultLocation: 'API pitch',
    durationMinutes: 60,
    priceMinor: 2500,
    active: true,
    coachProfile,
    createdAt: '2026-07-03T12:00:00.000Z',
    updatedAt: '2026-07-03T12:00:00.000Z',
  };
}

function apiSearchResponse(
  coachUserId: string,
  coachProfile: ReturnType<typeof richCoachProfile>,
) {
  const offering = apiOffering(coachUserId, coachProfile);
  return {
    results: [
      {
        coachId: coachUserId,
        coachProfile,
        offerings: [offering],
        relevanceScore: 84,
        matchedTerms: ['api'],
        minPriceMinor: coachProfile.sessionRateMinor,
        maxPriceMinor: coachProfile.priceMaxMinor,
        ratingAverage: 0,
        reviewCount: 0,
        sessionFormats: ['In-person'],
        focuses: coachProfile.specialties,
        languages: coachProfile.languages.map((language) => language.name),
        bookableCount: 1,
        publicLocation: coachProfile.publicLocations[0],
        distanceKm: 1.2,
        distanceMiles: 0.7,
      },
    ],
    offerings: [offering],
    total: 1,
    page: 1,
    pageSize: 100,
    hasMore: false,
    filterOptions: {
      sports: [{ value: 'Football', label: 'Football', count: 1, selected: true }],
      focuses: [{ value: 'First touch', label: 'First touch', count: 1 }],
      languages: [{ value: 'Spanish', label: 'Spanish', count: 1 }],
      formats: [{ value: 'In-person', label: 'In-person', count: 1 }],
      priceRange: { minMinor: 6500, maxMinor: 9500 },
      ratingDistribution: [{ rating: 0, count: 1 }],
      totalCount: 1,
    },
    requestId: 'req_search',
  };
}

function emptySearchResponse() {
  return {
    results: [],
    offerings: [],
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: false,
    filterOptions: {
      sports: [{ value: 'Football', label: 'Football', count: 0 }],
      focuses: [],
      languages: [],
      formats: [],
      priceRange: { minMinor: 0, maxMinor: 0 },
      ratingDistribution: [],
      totalCount: 0,
    },
    requestId: 'req_empty_search',
  };
}

async function seedLocalCoachNoise() {
  const [{ STORAGE_KEYS }, AsyncStorageModule] = await Promise.all([
    import('@/constants/storage-keys'),
    import('@react-native-async-storage/async-storage'),
  ]);
  const AsyncStorage = AsyncStorageModule.default;
  await AsyncStorage.setItem(
    STORAGE_KEYS.COACH_DIRECTORY,
    JSON.stringify([
      {
        id: 'coach-1',
        name: 'Local Fake Coach',
        bio: 'This local coach must not appear in API mode.',
        sports: ['Football'],
        location: { city: 'Localtown' },
        rating: 5,
        reviewCount: 999,
        minPrice: 1,
        totalSessions: 999,
      },
    ]),
  );
  await AsyncStorage.setItem(
    STORAGE_KEYS.COACH_PUBLIC_REVIEWS,
    JSON.stringify([
      {
        id: 'review_local',
        coachId: 'coach-1',
        reviewerName: 'Local Parent',
        rating: 5,
        comment: 'local review',
        createdAt: '2026-07-01T12:00:00.000Z',
      },
    ]),
  );
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('Coach discovery API mode', () => {
  it('keeps legacy coach ids from forcing local offering reads in profile hooks', () => {
    for (const relativePath of ['hooks/use-public-profile.ts', 'hooks/use-coach-detail.ts']) {
      const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
      const guard = source.indexOf('const shouldUseLocalOfferings = apiClient.isMockMode;');

      assert.ok(guard >= 0, `${relativePath} should gate local offerings only on mock mode`);
      assert.equal(
        source.includes("apiClient.isMockMode || coachId.startsWith('coach-')"),
        false,
        `${relativePath} must not force local offerings for legacy coach ids in API mode`,
      );
    }
  });

  it('does not surface local coach directory entries when the API offering index is empty', async () => {
    await seedLocalCoachNoise();
    const { discoverService } = await import('@/services/discover-service');
    const fetchCalls: string[] = [];
    globalThis.fetch = (async (input) => {
      fetchCalls.push(String(input));
      return jsonResponse(emptySearchResponse());
    }) as typeof fetch;

    const result = await discoverService.searchCoaches({ query: 'Local Fake' });

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }
    assert.ok(
      fetchCalls.some(
        (url) =>
          url.startsWith('http://localhost:4000/v1/coaches/search?') &&
          url.includes('query=Local+Fake'),
      ),
    );
    assert.equal(fetchCalls.some((url) => url.endsWith('/v1/coaches/offerings')), false);
    assert.equal(result.data.totalCount, 0);
    assert.equal(result.data.results.some((entry) => entry.coach.id === 'coach-1'), false);
  });

  it('projects rich public coach metadata from the API offering index', async () => {
    const { discoverService } = await import('@/services/discover-service');
    Object.assign(discoverService as unknown as { lastHydratedAt: number; hydrationInFlight: null }, {
      lastHydratedAt: 0,
      hydrationInFlight: null,
    });
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.endsWith('/v1/coaches/offerings')) {
        return jsonResponse({ offerings: [apiOffering('usr_api_coach', richCoachProfile())] });
      }
      return jsonResponse({ message: `Unexpected ${url}` }, 500);
    }) as typeof fetch;

    const result = await discoverService.getAllCoaches();

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }
    const coach = result.data.find((entry) => entry.id === 'usr_api_coach');
    assert.ok(coach, 'expected API coach in discovery results');
    assert.equal(coach.fullName, 'API Coach Name');
    assert.equal(coach.bio, 'API profile bio');
    assert.equal(coach.shortBio, 'API profile bio');
    assert.equal(coach.priceRange.min, 65);
    assert.equal(coach.priceRange.max, 95);
    assert.equal(coach.website, 'https://coach.example.com');
    assert.equal(coach.socialLinks?.instagram, 'coach.example');
    assert.equal(coach.experiences[0]?.title, 'Academy coach');
    assert.equal(coach.languages[0]?.name, 'Spanish');
    assert.equal(coach.certifications[0]?.name, 'UEFA B');
    assert.equal(coach.travelRadius, 18);
    assert.equal(coach.acceptsRemoteSessions, true);
  });

  it('fails closed when API coach offering hydration fails', async () => {
    const { discoverService } = await import('@/services/discover-service');
    Object.assign(
      discoverService as unknown as { lastHydratedAt: number; hydrationInFlight: null },
      {
        lastHydratedAt: 0,
        hydrationInFlight: null,
      },
    );
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.endsWith('/v1/coaches/offerings')) {
        return jsonResponse({ message: 'Offering index unavailable' }, 500);
      }
      return jsonResponse({ message: `Unexpected ${url}` }, 500);
    }) as typeof fetch;

    const allCoaches = await discoverService.getAllCoaches();
    const suggestions = await discoverService.getSuggestedCoaches('parent_api');

    assert.equal(allCoaches.success, false);
    assert.equal(suggestions.success, false);
  });

  it('rejects mock reset in API mode before live coach discovery reads', async () => {
    const { discoverService } = await import('@/services/discover-service');
    Object.assign(
      discoverService as unknown as {
        lastHydratedAt: number;
        hydrationInFlight: null;
        forceMockData: boolean;
      },
      {
        lastHydratedAt: 0,
        hydrationInFlight: null,
        forceMockData: false,
      },
    );
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.endsWith('/v1/coaches/offerings')) {
        return jsonResponse({ offerings: [apiOffering('usr_api_coach', richCoachProfile())] });
      }
      return jsonResponse({ message: `Unexpected ${url}` }, 500);
    }) as typeof fetch;

    const reset = await discoverService.resetToMockData();
    const live = await discoverService.getAllCoaches();

    assert.equal(reset.success, false);
    assert.equal(live.success, true);
    if (!live.success) {
      return;
    }
    assert.deepEqual(
      live.data.map((coach) => coach.id),
      ['usr_api_coach'],
    );
  });

  it('derives coach service profile/search rows from live offerings instead of local directory', async () => {
    await seedLocalCoachNoise();
    const { coachService } = await import('@/services/coach-service');
    const fetchCalls: string[] = [];
    globalThis.fetch = (async (input) => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.endsWith('/v1/coaches/coach-1/profile')) {
        return jsonResponse({ message: 'Coach not found' }, 404);
      }
      if (url.endsWith('/v1/coaches/usr_api_coach/profile')) {
        return jsonResponse({
          coachId: 'usr_api_coach',
          coachProfile: richCoachProfile(),
          offerings: [apiOffering('usr_api_coach', richCoachProfile())],
          total: 1,
          requestId: 'req_profile',
        });
      }
      if (url.startsWith('http://localhost:4000/v1/coaches/search?')) {
        return jsonResponse(apiSearchResponse('usr_api_coach', richCoachProfile()));
      }
      if (url.endsWith('/v1/coaches/coach-1/reviews')) {
        return jsonResponse({ reviews: [] });
      }
      return jsonResponse({ message: `Unexpected ${url}` }, 500);
    }) as typeof fetch;

    const localLegacyResult = await coachService.getCoach('coach-1');
    const apiCoachResult = await coachService.getCoach('usr_api_coach');
    const searchResult = await coachService.searchCoaches('api');
    const reviewsResult = await coachService.getCoachReviews('coach-1');

    assert.equal(localLegacyResult.success, false);
    assert.equal(apiCoachResult.success, true);
    assert.equal(searchResult.success, true);
    assert.equal(reviewsResult.success, true);
    if (!apiCoachResult.success || !searchResult.success || !reviewsResult.success) {
      return;
    }
    assert.equal(apiCoachResult.data.id, 'usr_api_coach');
    assert.equal(apiCoachResult.data.name, 'API Coach Name');
    assert.equal(apiCoachResult.data.bio, 'API profile bio');
    assert.equal(apiCoachResult.data.minPrice, 65);
    assert.equal(apiCoachResult.data.maxPrice, 95);
    assert.equal(apiCoachResult.data.experiences?.[0]?.title, 'Academy coach');
    assert.equal(apiCoachResult.data.languages?.[0]?.name, 'Spanish');
    assert.equal(searchResult.data.some((coach) => coach.id === 'usr_api_coach'), true);
    assert.equal(searchResult.data.some((coach) => coach.id === 'coach-1'), false);
    assert.deepEqual(reviewsResult.data, []);
    assert.ok(fetchCalls.includes('http://localhost:4000/v1/coaches/coach-1/profile'));
    assert.ok(fetchCalls.includes('http://localhost:4000/v1/coaches/usr_api_coach/profile'));
    assert.ok(
      fetchCalls.some(
        (url) =>
          url.startsWith('http://localhost:4000/v1/coaches/search?') &&
          url.includes('query=api') &&
          url.includes('sports=Football') &&
          url.includes('pageSize=100'),
      ),
    );
    assert.ok(fetchCalls.includes('http://localhost:4000/v1/coaches/coach-1/reviews'));
  });

  it('uses v1 coach search for text location filters in API mode', async () => {
    await seedLocalCoachNoise();
    const { coachService } = await import('@/services/coach-service');
    const fetchCalls: string[] = [];
    globalThis.fetch = (async (input) => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.startsWith('http://localhost:4000/v1/coaches/search?')) {
        return jsonResponse(apiSearchResponse('usr_api_coach', richCoachProfile()));
      }
      return jsonResponse({ message: `Unexpected ${url}` }, 500);
    }) as typeof fetch;

    const result = await coachService.getCoaches({
      location: 'API Public Pitch',
      maxPrice: 100,
      minRating: 4,
    });

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }
    assert.ok(
      fetchCalls.some(
        (url) =>
          url.startsWith('http://localhost:4000/v1/coaches/search?') &&
          url.includes('query=API+Public+Pitch') &&
          url.includes('priceMax=100') &&
          url.includes('rating=4') &&
          url.includes('sports=Football') &&
          url.includes('pageSize=100'),
      ),
    );
    assert.equal(fetchCalls.some((url) => url.endsWith('/v1/coaches/offerings')), false);
    assert.equal(result.data[0]?.id, 'usr_api_coach');
    assert.equal(result.data.some((coach) => coach.id === 'coach-1'), false);
  });

  it('toggles coach follows through the v1 follow API', async () => {
    const { coachService } = await import('@/services/coach-service');
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    let isFollowing = false;

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({
        method,
        path: `${url.pathname}${url.search}`,
        body,
      });

      if (url.pathname === '/v1/follows' && method === 'GET') {
        return jsonResponse({ following: isFollowing });
      }
      if (url.pathname === '/v1/follows' && method === 'POST') {
        isFollowing = true;
        return jsonResponse(
          {
            follow: {
              id: 'follow_api',
              followerId: 'parent_api',
              followerType: 'USER',
              followingId: 'usr_api_coach',
              followingType: 'COACH',
              createdAt: '2026-07-01T00:00:00.000Z',
            },
          },
          201,
        );
      }
      if (url.pathname === '/v1/follows' && method === 'DELETE') {
        isFollowing = false;
        return jsonResponse({ removed: true, follow: null });
      }
      return jsonResponse({ message: `Unexpected ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    const followed = await coachService.toggleFollow('usr_api_coach', 'parent_api');
    const unfollowed = await coachService.toggleFollow('usr_api_coach', 'parent_api');

    assert.equal(followed.success, true);
    assert.equal(followed.success && followed.data, true);
    assert.equal(unfollowed.success, true);
    assert.equal(unfollowed.success && unfollowed.data, false);
    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.path}`),
      [
        'GET /v1/follows?targetUserId=usr_api_coach',
        'POST /v1/follows',
        'GET /v1/follows?targetUserId=usr_api_coach',
        'DELETE /v1/follows?followingId=usr_api_coach',
      ],
    );
    assert.deepEqual(calls[1]?.body, {
      followingId: 'usr_api_coach',
      followingType: 'COACH',
    });
  });

  it('sends coordinate location searches to the v1 coach search route', async () => {
    await seedLocalCoachNoise();
    const { discoverService } = await import('@/services/discover-service');
    const fetchCalls: string[] = [];
    globalThis.fetch = (async (input) => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.startsWith('http://localhost:4000/v1/coaches/search?')) {
        return jsonResponse(apiSearchResponse('usr_api_coach', richCoachProfile()));
      }
      return jsonResponse({ message: `Unexpected ${url}` }, 500);
    }) as typeof fetch;

    const result = await discoverService.searchCoaches({
      query: 'api',
      location: {
        lat: 51.49,
        lng: -0.12,
        radiusKm: 4,
      },
      distance: 2,
      sortBy: 'distance',
    });

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }
    assert.ok(
      fetchCalls.some(
        (url) =>
          url.startsWith('http://localhost:4000/v1/coaches/search?') &&
          url.includes('query=api') &&
          url.includes('lat=51.49') &&
          url.includes('lng=-0.12') &&
          url.includes('radiusKm=2') &&
          url.includes('sortBy=distance'),
      ),
    );
    assert.equal(fetchCalls.some((url) => url.endsWith('/v1/coaches/offerings')), false);
    assert.equal(result.data.results[0]?.coach.id, 'usr_api_coach');
    assert.equal(result.data.results[0]?.coach.city, 'API Public Pitch');
    assert.equal(result.data.results[0]?.coach.location.lat, 51.49);
    assert.equal(result.data.results[0]?.distanceKm, 1.2);
    assert.equal(result.data.results[0]?.coach.distanceMiles, 0.7);
  });
});
