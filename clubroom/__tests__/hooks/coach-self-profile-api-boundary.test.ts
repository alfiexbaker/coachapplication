import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  mapCoachSelfProfileResponse,
  type CoachSelfProfileResponse,
} from '../../services/coach-profile-service';

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function response(
  profile: Partial<CoachSelfProfileResponse['profile']> = {},
): CoachSelfProfileResponse {
  return {
    profile: {
      userId: 'usr_coach',
      bio: 'Authoritative coach bio',
      sessionRateMinor: 7250,
      priceMaxMinor: 9500,
      specialties: ['Passing'],
      qualifications: ['UEFA B'],
      experiencesJson: [],
      languagesJson: [],
      socialLinksJson: {},
      createdAt: '2026-01-10T12:00:00.000Z',
      ...profile,
    },
  };
}

test('maps coach self-profile fields from the authenticated API payload', () => {
  const mapped = mapCoachSelfProfileResponse(response(), {
    id: 'usr_coach',
    fullName: 'Alex Morgan',
    email: 'alex@example.test',
  });

  assert.equal(mapped.id, 'usr_coach');
  assert.equal(mapped.fullName, 'Alex Morgan');
  assert.equal(mapped.bio, 'Authoritative coach bio');
  assert.equal(mapped.city, '');
  assert.deepEqual(mapped.location, { lat: 0, lng: 0 });
  assert.deepEqual(mapped.priceRange, {
    min: 72.5,
    max: 95,
    unitLabel: 'per session',
  });
  assert.equal(mapped.nextAvailability, '');
  assert.deepEqual(mapped.footballFocuses, ['Passing']);
  assert.equal(mapped.certifications[0]?.name, 'UEFA B');
  assert.equal(mapped.joinedDate, '2026-01-10T12:00:00.000Z');
});

test('keeps absent self-profile values empty instead of inventing London or prices', () => {
  const mapped = mapCoachSelfProfileResponse(
    response({
      bio: null,
      sessionRateMinor: null,
      priceMaxMinor: null,
      specialties: [],
      qualifications: [],
      createdAt: null,
    }),
    {
      id: 'usr_coach',
      fullName: 'Alex Morgan',
    },
  );

  assert.equal(mapped.city, '');
  assert.equal(mapped.state, '');
  assert.equal(mapped.shortBio, '');
  assert.deepEqual(mapped.priceRange, { min: 0, max: 0, unitLabel: 'per session' });
  assert.equal(mapped.sessionRate, undefined);
  assert.equal(mapped.nextAvailability, '');
  assert.equal(mapped.joinedDate, '');
  assert.deepEqual(mapped.footballFocuses, []);
});

test('rejects a self-profile payload for a different authenticated user', () => {
  assert.throws(
    () =>
      mapCoachSelfProfileResponse(response({ userId: 'usr_other' }), {
        id: 'usr_coach',
      }),
    /did not match the authenticated user/,
  );
});

test('coach profile hooks use self-profile authority outside explicit mock mode', () => {
  const serviceSource = readSource('services/coach-profile-service.ts');
  const editSource = readSource('hooks/use-edit-profile.ts');
  const compatibilityRoute = readSource('app/(tabs)/coach-profile.tsx');

  assert.ok(
    serviceSource.includes("apiFetch<CoachSelfProfileResponse>('/v1/coaches/me/profile'"),
    'self-profile service must call the authenticated /v1 route',
  );
  assert.ok(editSource.includes('if (api.useMock) {'));
  assert.ok(editSource.includes('const result = await coachProfileService.getSelfProfile();'));
  assert.ok(editSource.includes('mapCoachSelfProfileResponse(result.data, currentUser)'));
  assert.equal(serviceSource.includes('availabilityTemplates:'), false);
  assert.equal(serviceSource.includes('cancellationPolicyRules:'), false);
  assert.ok(editSource.includes('minPricePounds === null ? null'));
  assert.ok(editSource.includes('const hasChanges ='));
  assert.ok(editSource.includes('profileReady &&'));
  assert.ok(editSource.includes('if (!canSave || isSavingRef.current) return;'));
  assert.ok(
    compatibilityRoute.includes(
      "currentUser?.role === 'COACH' ? Routes.EDIT_PROFILE : Routes.HOME",
    ),
  );
  assert.equal(compatibilityRoute.includes('useCoachProfile'), false);
  assert.equal(compatibilityRoute.includes('LoadingState'), false);
});
