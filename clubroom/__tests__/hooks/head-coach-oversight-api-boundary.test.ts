import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('head coach oversight club picker uses club authority outside mock mode', () => {
  const source = readSource('hooks/use-head-coach-oversight.ts');
  const branchStart = source.indexOf('if (api.useMock) {');
  const apiBranchStart = source.indexOf('} else {', branchStart);
  const eligibleStart = source.indexOf('const eligibleMemberships = memberships.filter', apiBranchStart);
  const clubsStart = source.indexOf('const nextClubs = (', eligibleStart);
  const selectedStart = source.indexOf('const nextSelectedClubId =', clubsStart);

  assert.ok(branchStart >= 0, 'test should find mock/API branch');
  assert.ok(apiBranchStart > branchStart, 'test should find API branch');
  assert.ok(eligibleStart > apiBranchStart, 'test should find eligible memberships');
  assert.ok(selectedStart > clubsStart, 'test should find club picker boundary');

  const mockBranch = source.slice(branchStart, apiBranchStart);
  const apiBranch = source.slice(apiBranchStart, eligibleStart);
  const clubPicker = source.slice(clubsStart, selectedStart);

  assert.ok(
    source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
    'oversight hook should import club authority',
  );
  assert.ok(
    mockBranch.includes('socialFeedService.getUserMembershipsHydrated(currentUser.id)'),
    'mock mode may keep local membership compatibility',
  );
  assert.ok(
    apiBranch.includes('const authorityResult = await clubAuthorityService.listClubs();'),
    'API mode should load eligible memberships from /v1 club authority',
  );
  assert.ok(
    apiBranch.includes('return err(authorityResult.error);'),
    'API authority errors should surface instead of falling back to local membership mirrors',
  );
  assert.equal(
    apiBranch.includes('socialFeedService'),
    false,
    'API mode must not derive oversight eligibility from local social-feed memberships',
  );
  assert.ok(
    clubPicker.includes('authorityClubMap.get(membership.clubId)'),
    'API mode should resolve club names from the authority response',
  );
});
