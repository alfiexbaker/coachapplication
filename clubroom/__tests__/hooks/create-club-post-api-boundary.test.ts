import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('create club post composer derives API-mode posting permissions from club authority', () => {
  const source = readSource('hooks/use-create-club-post.ts');
  const effectStart = source.indexOf('const loadClubContext = async () => {');
  const mockBranchStart = source.indexOf('if (api.useMock) {', effectStart);
  const apiBranchStart = source.indexOf('const result = await clubAuthorityService.listClubs();', mockBranchStart);
  const effectEnd = source.indexOf('void loadClubContext();', apiBranchStart);

  assert.ok(effectStart >= 0, 'test should find club context loader');
  assert.ok(mockBranchStart > effectStart, 'test should find mock branch');
  assert.ok(apiBranchStart > mockBranchStart, 'test should find API branch');
  assert.ok(effectEnd > apiBranchStart, 'test should find loader boundary');

  const mockBranch = source.slice(mockBranchStart, apiBranchStart);
  const apiBranch = source.slice(apiBranchStart, effectEnd);

  assert.ok(
    source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
    'composer should import club authority',
  );
  assert.ok(
    mockBranch.includes('clubFeedService.getUserClubs(currentUser.id)'),
    'mock mode may keep local club lookup compatibility',
  );
  assert.ok(
    mockBranch.includes('clubFeedService.getMembership(currentUser.id, nextClubId)'),
    'mock mode may keep local membership lookup compatibility',
  );
  assert.ok(
    apiBranch.includes('const result = await clubAuthorityService.listClubs();'),
    'API mode should load club/membership context through /v1 club authority',
  );
  assert.equal(
    apiBranch.includes('clubFeedService'),
    false,
    'API mode must not derive posting permissions from local social-feed state',
  );
  assert.ok(
    source.includes('const canPostAsClub = canCreateClubPost(membership);'),
    'composer posting controls should derive from authority-loaded membership',
  );
});
