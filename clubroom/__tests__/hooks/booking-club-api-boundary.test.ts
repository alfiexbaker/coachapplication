import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('club authority resolves individual clubs without local mirrors in API mode', () => {
  const source = readSource('services/club-authority-service.ts');
  const methodStart = source.indexOf('async getClubById(clubId: string)');
  const updateStart = source.indexOf('async updateClubDetails(', methodStart);

  assert.ok(methodStart >= 0, 'test should find getClubById helper');
  assert.ok(updateStart > methodStart, 'test should find helper boundary');

  const helper = source.slice(methodStart, updateStart);
  const mockBranchStart = helper.indexOf('if (api.useMock) {');
  const apiBranchStart = helper.indexOf('const result = await this.listClubs();');

  assert.ok(mockBranchStart >= 0, 'mock branch should be explicit');
  assert.ok(apiBranchStart > mockBranchStart, 'API branch should follow mock branch');
  assert.ok(
    helper.slice(mockBranchStart, apiBranchStart).includes('socialFeedService.getClub(clubId)'),
    'mock mode may keep local club lookup compatibility',
  );
  assert.equal(
    helper.slice(apiBranchStart).includes('socialFeedService.getClub'),
    false,
    'API mode must resolve clubs through /v1 club authority, not local social-feed mirrors',
  );
  assert.ok(
    helper.includes('result.data.clubs.find((candidate) => candidate.id === clubId)'),
    'API branch should resolve the club from authority-visible clubs',
  );
});

test('booking club display paths use club authority instead of social-feed club mirrors', () => {
  const files = [
    'app/(tabs)/bookings/[id].tsx',
    'app/(tabs)/bookings/report-problem.tsx',
    'app/book/[coachId]/confirmation.tsx',
    'app/book/[coachId]/review.tsx',
    'components/bookings/booking-info-cards.tsx',
    'components/bookings/booking-ownership-block.tsx',
  ];

  for (const file of files) {
    const source = readSource(file);
    assert.ok(
      source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
      `${file} should import club authority`,
    );
    assert.ok(
      source.includes('clubAuthorityService.getClubById('),
      `${file} should resolve club display data through authority`,
    );
    assert.equal(
      source.includes("from '@/services/social-feed-service'"),
      false,
      `${file} must not import social-feed club mirrors`,
    );
    assert.equal(
      source.includes('socialFeedService.getClub('),
      false,
      `${file} must not call local club mirrors for booking display`,
    );
  }
});

test('bookings list only uses local user clubs inside mock mode', () => {
  const source = readSource('hooks/use-bookings.ts');
  const loaderStart = source.indexOf('const loadData = useCallback(async () => {');
  const localLookupStart = source.indexOf('socialFeedService.getUserClubs(currentUser.id)', loaderStart);
  const eventScopeStart = source.indexOf('const clubIds = collectRelevantClubIds({', loaderStart);

  assert.ok(loaderStart >= 0, 'test should find bookings loader');
  assert.ok(localLookupStart > loaderStart, 'test should find local user-club lookup');
  assert.ok(eventScopeStart > localLookupStart, 'test should find club event scope boundary');

  const lookupBlock = source.slice(loaderStart, eventScopeStart);

  assert.ok(
    source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
    'bookings loader should import club authority',
  );
  assert.ok(
    lookupBlock.includes('if (apiClient.isMockMode) {'),
    'local user-club lookup should sit behind mock mode',
  );
  assert.ok(
    lookupBlock.includes('const authorityClubs = await clubAuthorityService.listClubs();'),
    'API mode should load viewer clubs through /v1 authority',
  );
  assert.equal(
    source.slice(eventScopeStart).includes('socialFeedService.getUserClubs'),
    false,
    'event scope should not call local user-club mirrors after authority resolution',
  );
});

test('booking communications skips local notification routing in API mode', () => {
  const source = readSource('services/booking-communications-service.ts');
  const assignmentStart = source.indexOf('async notifyAssignmentChange');
  const supportStart = source.indexOf('async notifySupportIssueReported');
  const serviceEnd = source.indexOf('export const bookingCommunicationsService', supportStart);

  assert.ok(assignmentStart >= 0, 'test should find assignment notifier');
  assert.ok(supportStart > assignmentStart, 'test should find support notifier');
  assert.ok(serviceEnd > supportStart, 'test should find service boundary');

  const assignmentBlock = source.slice(assignmentStart, supportStart);
  const supportBlock = source.slice(supportStart, serviceEnd);

  for (const [name, block] of [
    ['assignment', assignmentBlock],
    ['support', supportBlock],
  ] as const) {
    const guardStart = block.indexOf('if (!api.useMock) {');
    const localClubStart = block.indexOf('socialFeedService.getClub');
    const localMembershipStart = block.indexOf('socialFeedService.getClubMemberships');
    assert.ok(guardStart >= 0, `${name} notifier should return early outside mock mode`);
    if (localClubStart >= 0) {
      assert.ok(localClubStart > guardStart, `${name} local club lookup should be mock-only`);
    }
    if (localMembershipStart >= 0) {
      assert.ok(
        localMembershipStart > guardStart,
        `${name} local membership lookup should be mock-only`,
      );
    }
  }
});
