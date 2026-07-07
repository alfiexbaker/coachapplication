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
  const saveStart = source.indexOf('const profileResult = await coachProfileService.updateSelfProfile({');
  assert.ok(saveStart >= 0, 'test should find coach profile API save payload');
  const saveEnd = source.indexOf('});', saveStart);
  assert.ok(saveEnd > saveStart, 'test should find end of coach profile API save payload');

  const payload = source.slice(saveStart, saveEnd);
  for (const field of ['priceMaxMinor', 'website', 'socialLinks', 'experiences', 'languages']) {
    assert.ok(payload.includes(field), `${field} should be sent to the profile API`);
  }

  const unsupportedStart = source.indexOf('const unsupportedChanges = [', saveEnd);
  assert.ok(unsupportedStart > saveEnd, 'test should find coach unsupported-change list');
  const unsupportedEnd = source.indexOf('].filter', unsupportedStart);
  assert.ok(unsupportedEnd > unsupportedStart, 'test should find end of coach unsupported-change list');

  const unsupported = source.slice(unsupportedStart, unsupportedEnd);
  assert.ok(unsupported.includes('email changes'), 'email changes still need a separate API path');
  for (const label of ['website', 'maximum price', 'experience history', 'languages', 'social links']) {
    assert.equal(
      unsupported.includes(label),
      false,
      `${label} should not be reported as unsupported after profile API support`,
    );
  }
});
