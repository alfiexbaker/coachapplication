import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('seen statuses remain local walkthrough state in API mode', () => {
  const apiClientSource = readSource('services/api-client.ts');
  const serviceOwnershipSource = readSource('docs/architecture/service-ownership-map.md');
  const localKeysBlock = apiClientSource.match(
    /const CLIENT_LOCAL_STORAGE_KEYS = new Set<string>\(\[([\s\S]*?)\]\);/,
  );

  assert.ok(localKeysBlock, 'expected CLIENT_LOCAL_STORAGE_KEYS block');
  assert.ok(
    localKeysBlock[1]?.includes('STORAGE_KEYS.SEEN_STATUSES'),
    'walkthrough seen state should not trigger explicit-v1-required warnings in API mode',
  );
  assert.ok(
    serviceOwnershipSource.includes('is not notification or message-read authority'),
    'service ownership docs should explain why seen statuses stay local',
  );
});

test('UI seen state does not create ad hoc API-mode storage keys', () => {
  const dailyChallengeSource = readSource('components/progress/daily-challenge-banner.tsx');
  const onboardingChecklistSource = readSource('components/coach/onboarding-checklist.tsx');
  const availabilityTutorialSource = readSource('components/coach/availability-tutorial.tsx');

  assert.ok(dailyChallengeSource.includes("from '@/services/seen-service'"));
  assert.equal(dailyChallengeSource.includes('CHALLENGE_ANIMATION_SEEN_'), false);
  assert.doesNotMatch(dailyChallengeSource, /apiClient\.(get|set|remove)\(/);

  assert.ok(onboardingChecklistSource.includes("from '@/services/seen-service'"));
  assert.equal(onboardingChecklistSource.includes('clubroom.coach_onboarding_dismissed_'), false);
  assert.doesNotMatch(onboardingChecklistSource, /apiClient\.(get|set|remove)\(/);

  assert.ok(availabilityTutorialSource.includes("from '@/services/seen-service'"));
  assert.equal(availabilityTutorialSource.includes('AVAILABILITY_TUTORIAL_COMPLETED'), false);
  assert.equal(availabilityTutorialSource.includes('clubroom.availability_tutorial_completed'), false);
  assert.doesNotMatch(availabilityTutorialSource, /apiClient\.(get|set|remove)\(/);
});
