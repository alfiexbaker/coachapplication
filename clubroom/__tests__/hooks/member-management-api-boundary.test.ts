import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('member management derives API-mode club role from club authority', () => {
  const source = readSource('hooks/use-member-management.ts');
  const mockBranchStart = source.indexOf('if (api.useMock) {');
  const apiBranchStart = source.indexOf('} else {', mockBranchStart);
  const memberLoadStart = source.indexOf('const memberData = await clubService.getMember', apiBranchStart);
  const fallbackStart = source.indexOf('const currentUserRole =');
  const handleStart = source.indexOf('const canManage =');

  assert.ok(mockBranchStart >= 0, 'test should find the mock-mode branch');
  assert.ok(apiBranchStart > mockBranchStart, 'test should find the API-mode branch');
  assert.ok(memberLoadStart > apiBranchStart, 'test should find the data-load boundary');
  assert.ok(handleStart > fallbackStart, 'test should find the computed role boundary');

  const mockBranch = source.slice(mockBranchStart, apiBranchStart);
  const apiBranch = source.slice(apiBranchStart, memberLoadStart);
  const roleFallback = source.slice(fallbackStart, handleStart);

  assert.ok(
    source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
    'member management should import club authority',
  );
  assert.match(
    mockBranch,
    /socialFeedService\s*\.\s*getUserClubs\(currentUser\.id\)/,
    'mock mode may keep local social-feed club compatibility',
  );
  assert.match(
    mockBranch,
    /socialFeedService\s*\.\s*getMembership\(currentUser\.id, clubId\)\?\.role/,
    'mock mode may keep local membership compatibility',
  );
  assert.ok(
    apiBranch.includes('const authorityResult = await clubAuthorityService.listClubs();'),
    'API mode should load viewer club membership through /v1 club authority',
  );
  assert.equal(
    apiBranch.includes('socialFeedService.getUserClubs'),
    false,
    'API mode must not derive the target club from local social-feed mirrors',
  );
  assert.equal(
    apiBranch.includes('socialFeedService.getMembership'),
    false,
    'API mode must not derive the viewer role from local social-feed mirrors',
  );
  assert.ok(
    roleFallback.includes('api.useMock && currentUser?.id && clubId'),
    'computed role fallback should be mock-only',
  );
});
