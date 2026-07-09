import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('my clubs screen uses club authority instead of local club mirrors in API mode', () => {
  const source = readSource('app/club/my-clubs.tsx');

  assert.equal(
    source.includes("import { socialFeedService } from '@/services/social-feed-service';"),
    false,
    'My Clubs should not read local social feed club mirrors directly',
  );
  assert.ok(
    source.includes('return clubAuthorityService.listClubs();'),
    'My Clubs should return the /v1-backed club authority result directly',
  );
  assert.ok(
    source.includes('api.useMock && isStaffMembership(membership?.role)'),
    'staff cards should only open legacy Club Hub in mock mode',
  );
});
