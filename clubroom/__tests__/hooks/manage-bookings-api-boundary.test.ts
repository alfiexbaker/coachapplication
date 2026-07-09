import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('manage bookings club picker uses club authority outside mock mode', () => {
  const source = readSource('hooks/use-manage-bookings.ts');
  const loadStart = source.indexOf('const loadConsole = async');
  const authorityStart = source.indexOf('api.useMock ? Promise.resolve(null) : clubAuthorityService.listClubs()', loadStart);
  const mockMembershipStart = source.indexOf('const memberships = api.useMock', authorityStart);
  const clubLookupStart = source.indexOf('const authorityClubMap = new Map', mockMembershipStart);
  const nextClubStart = source.indexOf('const nextClubs = (', clubLookupStart);
  const selectedStart = source.indexOf('const nextSelectedClubId =', nextClubStart);

  assert.ok(loadStart >= 0, 'test should find manage bookings load function');
  assert.ok(authorityStart > loadStart, 'test should find club authority call');
  assert.ok(mockMembershipStart > authorityStart, 'test should find membership branch');
  assert.ok(clubLookupStart > mockMembershipStart, 'test should find club lookup');
  assert.ok(selectedStart > nextClubStart, 'test should find club option boundary');

  const setupBlock = source.slice(authorityStart, nextClubStart);
  const clubOptionBlock = source.slice(nextClubStart, selectedStart);

  assert.ok(
    source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
    'manage bookings should import club authority',
  );
  assert.ok(
    setupBlock.includes('return err(authorityResult.error);'),
    'API authority failures should surface instead of falling back to local memberships',
  );
  assert.ok(
    setupBlock.includes('await socialFeedService.getUserMembershipsHydrated(currentUser.id)'),
    'mock mode may keep local membership compatibility',
  );
  assert.ok(
    setupBlock.includes('authorityResult?.data.memberships ?? []'),
    'API mode should use authority memberships',
  );
  assert.ok(
    clubOptionBlock.includes('api.useMock'),
    'club option resolution should branch by runtime mode',
  );
  assert.ok(
    clubOptionBlock.includes('authorityClubMap.get(membership.clubId)'),
    'API mode should resolve clubs from the authority response',
  );
  assert.equal(
    clubOptionBlock.includes('await socialFeedService.getClub(membership.clubId)') &&
      !clubOptionBlock.includes('api.useMock'),
    false,
    'local club lookup must not be unguarded in the manage bookings picker',
  );
});
