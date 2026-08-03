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
  const branchStart = source.indexOf('if (api.useMock) {', authorityStart);
  const eligibleStart = source.indexOf('const eligibleMemberships = memberships.filter', branchStart);
  const nextClubStart = source.indexOf('const nextClubs = (', eligibleStart);
  const selectedStart = source.indexOf('const nextSelectedClubId =', nextClubStart);

  assert.ok(loadStart >= 0, 'test should find manage bookings load function');
  assert.ok(authorityStart > loadStart, 'test should find club authority call');
  assert.ok(branchStart > authorityStart, 'test should find runtime mode branch');
  assert.ok(eligibleStart > branchStart, 'test should find eligible memberships');
  assert.ok(selectedStart > nextClubStart, 'test should find club option boundary');

  const setupBlock = source.slice(authorityStart, eligibleStart);
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
    setupBlock.includes('memberships = authorityResult.data.memberships'),
    'API mode should use authority memberships',
  );
  assert.ok(
    setupBlock.includes('authorityResult.data.clubs.forEach'),
    'API mode should build club labels from successful authority data',
  );
  assert.equal(
    setupBlock.includes('authorityResult?.data.memberships ?? []'),
    false,
    'API membership reads must not collapse missing authority into an empty list',
  );
  assert.equal(
    setupBlock.includes('authorityResult?.success ? authorityResult.data.clubs : []'),
    false,
    'API club label reads must not collapse failed authority into an empty list',
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

test('manage bookings surfaces staffing-console failures instead of empty org state', () => {
  const source = readSource('hooks/use-manage-bookings.ts');
  const staffingStart = source.indexOf(
    'const staffingResult = await orgStaffingService.getConsoleData(',
  );
  const assignableStart = source.indexOf(
    'const assignableChoices = staffingResult.data.staff',
    staffingStart,
  );

  assert.ok(staffingStart >= 0, 'test should find staffing-console read');
  assert.ok(assignableStart > staffingStart, 'test should find successful staffing boundary');

  const staffingFailureBlock = source.slice(staffingStart, assignableStart);

  assert.ok(
    staffingFailureBlock.includes('return err(staffingResult.error);'),
    'live staffing-console failures must surface to the screen error state',
  );
  assert.equal(
    staffingFailureBlock.includes('return ok({'),
    false,
    'staffing-console failures must not be converted into empty manage-bookings data',
  );
});
