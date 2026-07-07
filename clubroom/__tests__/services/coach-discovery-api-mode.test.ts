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
      return jsonResponse({ offerings: [] });
    }) as typeof fetch;

    const result = await discoverService.searchCoaches({ query: 'Local Fake' });

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }
    assert.ok(fetchCalls.includes('http://localhost:4000/v1/coaches/offerings'));
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

  it('derives coach service profile/search rows from live offerings instead of local directory', async () => {
    await seedLocalCoachNoise();
    const { coachService } = await import('@/services/coach-service');
    const fetchCalls: string[] = [];
    globalThis.fetch = (async (input) => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.endsWith('/v1/coaches/coach-1/offerings')) {
        return jsonResponse({ offerings: [] });
      }
      if (url.endsWith('/v1/coaches/usr_api_coach/offerings')) {
        return jsonResponse({ offerings: [apiOffering('usr_api_coach', richCoachProfile())] });
      }
      if (url.endsWith('/v1/coaches/offerings')) {
        return jsonResponse({ offerings: [apiOffering('usr_api_coach', richCoachProfile())] });
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
    assert.ok(fetchCalls.includes('http://localhost:4000/v1/coaches/coach-1/offerings'));
    assert.ok(fetchCalls.includes('http://localhost:4000/v1/coaches/usr_api_coach/offerings'));
    assert.ok(fetchCalls.includes('http://localhost:4000/v1/coaches/offerings'));
    assert.ok(fetchCalls.includes('http://localhost:4000/v1/coaches/coach-1/reviews'));
  });
});
