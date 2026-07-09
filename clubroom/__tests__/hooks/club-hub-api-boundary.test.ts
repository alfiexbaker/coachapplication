import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('club hub is mock-only and redirects API mode before legacy hook mounts', () => {
  const source = readSource('app/(tabs)/club-hub.tsx');
  const screenStart = source.indexOf('export default function ClubHubScreen() {');
  const redirectStart = source.indexOf('function ClubHubApiRedirect');
  const legacyStart = source.indexOf('function ClubHubLegacyScreen()');
  const hookStart = source.indexOf('const hub = useClubHub();');

  assert.ok(screenStart >= 0, 'test should find the screen entrypoint');
  assert.ok(redirectStart > screenStart, 'test should find API redirect component');
  assert.ok(legacyStart > redirectStart, 'test should find legacy component');
  assert.ok(hookStart > legacyStart, 'legacy hook should only mount inside the legacy component');

  const screenBlock = source.slice(screenStart, redirectStart);
  const redirectBlock = source.slice(redirectStart, legacyStart);

  assert.ok(
    source.includes("import { api } from '@/constants/config';"),
    'screen should branch on runtime mode',
  );
  assert.ok(screenBlock.includes('if (!api.useMock) {'), 'API mode should be guarded');
  assert.ok(
    screenBlock.includes('return <ClubHubApiRedirect'),
    'API mode should return the redirect before the legacy hook can mount',
  );
  assert.equal(
    screenBlock.includes('useClubHub()'),
    false,
    'screen entrypoint must not call the legacy hook before the API guard',
  );
  assert.ok(
    redirectBlock.includes('router.replace(Routes.club(clubId));'),
    'API mode with a club id should route to backend-owned club detail',
  );
  assert.ok(
    redirectBlock.includes('Routes.myClubs({ inviteCode })'),
    'API mode should preserve invite-code links through My Clubs',
  );
  assert.ok(
    screenBlock.includes('return <ClubHubLegacyScreen />;'),
    'mock mode should keep the legacy hub available',
  );
});
