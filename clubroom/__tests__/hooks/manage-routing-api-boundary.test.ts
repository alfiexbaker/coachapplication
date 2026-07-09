import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('operations redirect uses club authority memberships outside mock mode', () => {
  const source = readSource('app/manage/index.tsx');
  const mockBranchStart = source.indexOf('if (api.useMock) {');
  const apiBranchStart = source.indexOf('const authorityResult = await clubAuthorityService.listClubs();');
  const routeDecisionStart = source.indexOf(
    'const ownerDashboardClubId = pickOwnerDashboardClubId',
    apiBranchStart,
  );

  assert.ok(mockBranchStart >= 0, 'test should find mock branch');
  assert.ok(apiBranchStart > mockBranchStart, 'test should find API branch');
  assert.ok(routeDecisionStart > apiBranchStart, 'test should find route decision');

  const mockBranch = source.slice(mockBranchStart, apiBranchStart);
  const apiBranch = source.slice(apiBranchStart, routeDecisionStart);

  assert.ok(
    source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
    'Operations redirect should import club authority',
  );
  assert.ok(
    mockBranch.includes('socialFeedService.getUserMembershipsHydrated(currentUser.id)'),
    'mock mode may keep local membership routing compatibility',
  );
  assert.ok(
    apiBranch.includes('const authorityResult = await clubAuthorityService.listClubs();'),
    'API mode should load memberships from /v1 club authority',
  );
  assert.ok(
    apiBranch.includes('return err(memberships.error);'),
    'API errors should surface instead of falling back to local memberships',
  );
  assert.equal(
    apiBranch.includes('socialFeedService'),
    false,
    'API mode must not route Operations from local social-feed memberships',
  );
  assert.ok(
    source.includes('pickOwnerDashboardClubId(memberships.data, clubId)'),
    'route choice should use the authority-derived membership set',
  );
});

test('club authority exposes viewer memberships for route decisions', () => {
  const source = readSource('services/club-authority-service.ts');
  const listStart = source.indexOf('async listClubs(): Promise<');
  const listEnd = source.indexOf('async getClubById', listStart);
  const listSource = source.slice(listStart, listEnd);

  assert.ok(
    source.includes('function mapApiClubViewerMemberships'),
    'club authority should centralize viewer-scoped membership mapping',
  );
  assert.ok(
    source.includes('club.viewerMembership'),
    'viewerMembership from /v1/clubs should drive the current user membership projection',
  );
  assert.ok(
    source.includes('membership.userId === currentUserId'),
    'fallback membership lookup should still be scoped to the signed-in user',
  );
  assert.ok(
    listSource.includes('const memberships = result.data.clubs.flatMap((club) =>'),
    'listClubs should build top-level memberships from the API club payload',
  );
  assert.ok(
    listSource.includes('mapApiClubViewerMemberships(club, currentUserId)'),
    'listClubs should not expose every club member as the viewer membership list',
  );
  assert.equal(
    listSource.includes('(club.memberships ?? []).map(mapMembership)'),
    false,
    'route-facing membership lists must not be built from every club membership row',
  );
});
