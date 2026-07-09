import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('create squad derives API-mode club context from club authority', () => {
  const source = readSource('hooks/use-create-squad.ts');
  const loadClubStart = source.indexOf('const loadClub = async () => {');
  const mockBranchStart = source.indexOf('if (api.useMock) {', loadClubStart);
  const apiBranchStart = source.indexOf('const result = await clubAuthorityService.listClubs();');
  const loadClubEnd = source.indexOf('const toggleTag =', loadClubStart);
  const createStart = source.indexOf('const newSquad = await squadService.createSquad({');
  const createEnd = source.indexOf('uiFeedback.showToast(`${newSquad.name}', createStart);

  assert.ok(loadClubStart >= 0, 'test should find club loader');
  assert.ok(mockBranchStart > loadClubStart, 'test should find mock club branch');
  assert.ok(apiBranchStart > mockBranchStart, 'test should find API club branch');
  assert.ok(loadClubEnd > apiBranchStart, 'test should find club loader boundary');
  assert.ok(createStart >= 0 && createEnd > createStart, 'test should find create payload');

  const mockBranch = source.slice(mockBranchStart, apiBranchStart);
  const apiBranch = source.slice(apiBranchStart, loadClubEnd);
  const createPayload = source.slice(createStart, createEnd);

  assert.ok(
    source.includes("import { api } from '@/constants/config';"),
    'hook should branch on runtime mode',
  );
  assert.ok(
    source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
    'hook should import club authority for API-mode club context',
  );
  assert.ok(
    mockBranch.includes('socialFeedService.getUserClubs(currentUser.id)'),
    'mock mode may keep local club lookup',
  );
  assert.equal(
    apiBranch.includes('socialFeedService'),
    false,
    'API mode must not derive create-squad club context from local social-feed mirrors',
  );
  assert.ok(
    apiBranch.includes('result.data.clubs.find((candidate) => candidate.id === clubId)'),
    'API mode should resolve the selected club from /v1 club authority',
  );
  assert.ok(createPayload.includes('clubId,'), 'create payload should use the validated route club id');
  assert.equal(createPayload.includes('clubId!'), false, 'create payload should not force unwrap club id');
});

test('create squad modal renders live club loading and authority errors', () => {
  const source = readSource('app/(modal)/create-squad.tsx');

  assert.ok(
    source.includes('if (c.isLoadingClub) {'),
    'modal should not show Club not found while the API club context is loading',
  );
  assert.ok(
    source.includes("<LoadingState variant=\"detail\" />"),
    'modal should render a loading state for live club context',
  );
  assert.ok(
    source.includes("{c.clubLoadError ?? 'Club not found'}"),
    'modal should surface API club-context errors',
  );
});
