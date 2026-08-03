import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('seen statuses remain local UI state in API mode', () => {
  const apiClientSource = readSource('services/api-client.ts');
  const seenServiceSource = readSource('services/seen-service.ts');
  const serviceOwnershipSource = readSource('docs/architecture/service-ownership-map.md');
  const localKeysBlock = apiClientSource.match(
    /const CLIENT_LOCAL_STORAGE_KEYS = new Set<string>\(\[([\s\S]*?)\]\);/,
  );

  assert.ok(localKeysBlock, 'expected CLIENT_LOCAL_STORAGE_KEYS block');
  assert.ok(
    localKeysBlock[1]?.includes('STORAGE_KEYS.SEEN_STATUSES'),
    'local UI seen state should not trigger explicit-v1-required warnings in API mode',
  );
  assert.ok(
    serviceOwnershipSource.includes('is not notification or message-read authority'),
    'service ownership docs should explain why seen statuses stay local',
  );
  assert.ok(
    seenServiceSource.includes('API_MODE_UI_SEEN_ENTITY_TYPES'),
    'seen service should explicitly limit API-mode local state to known UI entities',
  );
  assert.ok(
    seenServiceSource.includes('Product read receipts must use their owning /v1 route.'),
    'seen service should fail closed instead of accepting product read-receipt entity types',
  );
  for (const entityType of [
    'availability_tutorial',
    'coach_onboarding_checklist_dismissed',
    'daily_challenge_animation_seen',
  ]) {
    assert.ok(
      seenServiceSource.includes(`"${entityType}"`),
      `seen service should allow only known UI entity ${entityType}`,
    );
  }
  assert.equal(
    seenServiceSource.includes('"demo_walkthrough"'),
    false,
    'removed internal walkthrough state should not remain allowlisted',
  );
});

test('internal demo walkthroughs are not reachable from product role surfaces', () => {
  for (const relativePath of [
    'components/user/home-screen.tsx',
    'components/coach/development-screen.tsx',
    'components/admin/users-screen.tsx',
    'app/club/[clubId]/dashboard.tsx',
  ]) {
    assert.equal(
      readSource(relativePath).toLowerCase().includes('walkthrough'),
      false,
      `${relativePath} should lead with product work instead of internal test instructions`,
    );
  }

  for (const relativePath of [
    'components/ui/demo-walkthrough-card.tsx',
    'hooks/use-demo-walkthrough-visibility.ts',
    'utils/demo-walkthrough.ts',
  ]) {
    assert.equal(
      fs.existsSync(path.join(ROOT, relativePath)),
      false,
      `${relativePath} should remain deleted`,
    );
  }
});

test('athlete home exposes one find-coach action in the empty-session state', () => {
  const homeSectionsSource = readSource('components/user/home-screen-sections.tsx');

  assert.equal(homeSectionsSource.match(/label: 'Find Coach'/g)?.length ?? 0, 1);
  assert.equal(homeSectionsSource.includes('Find a Coach'), false);
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
