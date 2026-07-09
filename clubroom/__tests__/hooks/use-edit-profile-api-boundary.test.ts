import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('coach edit profile sends rich profile fields through the API save path', () => {
  const source = readSource('hooks/use-edit-profile.ts');
  const identityStart = source.indexOf('const identityUpdates: Partial<AuthUserProfile> = {};');
  const coachSaveStart = source.indexOf('if (userIsCoach) {', identityStart);
  assert.ok(identityStart >= 0, 'test should find identity update payload');
  assert.ok(coachSaveStart > identityStart, 'test should find coach save branch');

  const identityPayload = source.slice(identityStart, coachSaveStart);
  assert.ok(
    identityPayload.includes('identityUpdates.email = email.trim();'),
    'email changes should be sent through the auth profile API',
  );

  const saveStart = source.indexOf('const profileResult = await coachProfileService.updateSelfProfile({');
  assert.ok(saveStart >= 0, 'test should find coach profile API save payload');
  const saveEnd = source.indexOf('});', saveStart);
  assert.ok(saveEnd > saveStart, 'test should find end of coach profile API save payload');

  const payload = source.slice(saveStart, saveEnd);
  for (const field of ['priceMaxMinor', 'website', 'socialLinks', 'experiences', 'languages']) {
    assert.ok(payload.includes(field), `${field} should be sent to the profile API`);
  }

  assert.equal(
    source.includes('email changes'),
    false,
    'email changes are supported by /v1/auth/me and must not be shown as unsupported',
  );
  const unsupportedLists = Array.from(
    source.matchAll(/const unsupportedChanges = \[[\s\S]*?\]\.filter/g),
    (match) => match[0],
  );
  for (const label of ['website', 'maximum price', 'experience history', 'languages', 'social links']) {
    assert.equal(
      unsupportedLists.some((unsupported) => unsupported.includes(label)),
      false,
      `${label} should not be reported as unsupported after profile API support`,
    );
  }
});

test('generic edit profile does not own family child-list mutation', () => {
  const hookSource = readSource('hooks/use-edit-profile.ts');
  const screenSource = readSource('app/(tabs)/edit-profile.tsx');

  for (const staleToken of [
    'family child list edits',
    'Saved supported profile fields. Still needs backend support',
    'const addChild =',
    'const updateChild =',
    'const removeChild =',
    'addChild,',
    'updateChild,',
    'removeChild,',
  ]) {
    assert.equal(
      hookSource.includes(staleToken),
      false,
      `${staleToken} should not be part of the generic profile save path`,
    );
  }

  for (const staleScreenToken of ['profile.addChild', 'profile.updateChild', 'profile.removeChild']) {
    assert.equal(
      screenSource.includes(staleScreenToken),
      false,
      `${staleScreenToken} should not be exposed from the generic edit profile screen`,
    );
  }

  assert.ok(
    hookSource.includes('childService.updateChild(typedCurrentUser?.id'),
    'self-service athlete profile fields should still use the athlete API path',
  );
});
