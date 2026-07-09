import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('club setup complete reloads club from authority in API mode', () => {
  const source = readSource('app/club/setup-complete.tsx');
  const loadClubStart = source.indexOf('const loadClub = async ()');
  const mockBranchStart = source.indexOf('if (api.useMock) {', loadClubStart);
  const apiBranchStart = source.indexOf('const result = await clubAuthorityService.listClubs();');
  const loadClubEnd = source.indexOf('const {', loadClubStart);

  assert.ok(loadClubStart >= 0, 'test should find setup-complete loader');
  assert.ok(mockBranchStart > loadClubStart, 'test should find mock branch');
  assert.ok(apiBranchStart > mockBranchStart, 'test should find API authority branch');
  assert.ok(loadClubEnd > apiBranchStart, 'test should find loader boundary');

  const mockBranch = source.slice(mockBranchStart, apiBranchStart);
  const apiBranch = source.slice(apiBranchStart, loadClubEnd);

  assert.ok(
    source.includes("import { api } from '@/constants/config';"),
    'screen should branch on runtime mode',
  );
  assert.ok(
    source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
    'screen should use club authority in API mode',
  );
  assert.ok(
    mockBranch.includes('socialFeedService.getClub(clubId)'),
    'mock mode may keep local setup-complete club lookup',
  );
  assert.equal(
    apiBranch.includes('socialFeedService.getClub'),
    false,
    'API mode must not reload setup-complete club details from local social-feed mirrors',
  );
  assert.ok(
    apiBranch.includes('result.data.clubs.find((candidate) => candidate.id === clubId)'),
    'API mode should resolve the created club from /v1 club authority',
  );
});
