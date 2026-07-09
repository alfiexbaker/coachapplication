import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const SOURCE_FILES = [
  'constants/session-types.ts',
  'constants/app-types.ts',
  'services/booking/booking-crud-service.ts',
  'services/booking/booking-step-analytics-service.ts',
  'services/invite/session-invite-service.ts',
  'services/multi-week-booking-service.ts',
  'utils/coach-profile-offerings.ts',
];

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('booking session sources are direct offerings or group sessions, not events', () => {
  const sessionTypes = readProjectFile('constants/session-types.ts');
  assert.ok(sessionTypes.includes("export type SessionOfferingSource = 'direct' | 'group';"));

  for (const relativePath of SOURCE_FILES) {
    const source = readProjectFile(relativePath);
    assert.equal(source.includes("'direct' | 'event' | 'group'"), false, relativePath);
    assert.equal(source.includes("sessionSource === 'event'"), false, relativePath);
    assert.equal(source.includes("source === 'event'"), false, relativePath);
    assert.equal(source.includes('source === "event"'), false, relativePath);
  }
});
