import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('coach profile actions fail closed when block-status authority is unavailable', () => {
  const detailHook = readProjectFile('hooks/use-coach-detail.ts');
  const publicHook = readProjectFile('hooks/use-public-profile.ts');
  const detailScreen = readProjectFile('app/coach/[id].tsx');
  const publicScreen = readProjectFile('app/coach/[coachId]/public.tsx');
  const detailHero = readProjectFile('components/coach/coach-detail-hero.tsx');
  const publicHero = readProjectFile('components/coach/public-profile-hero.tsx');

  assert.equal(
    detailHook.includes('blockedResult.success ? blockedResult.data : false;'),
    false,
    'coach detail must not convert block authority failure into not-blocked state',
  );
  assert.ok(detailHook.includes('blockStatusError: string | null;'));
  assert.ok(
    detailHook.includes('const [blockStatusReadyKey, setBlockStatusReadyKey] = useState<string | null>(null);'),
  );
  assert.ok(detailHook.includes('const blockStatusAuthorityKey ='));
  assert.ok(detailHook.includes('const blockStatusReady = blockStatusReadyKey === blockStatusAuthorityKey;'));
  assert.ok(detailHook.includes('const shouldVerifyBlockStatus ='));
  assert.ok(detailHook.includes('!blockStatusReady || Boolean(blockStatusError)'));
  assert.ok(detailHook.includes('let isCurrentSnapshot = true;'));
  assert.ok(detailHook.includes('setBlockStatusReadyKey(null);'));
  assert.ok(detailHook.includes('const profileActionsBlocked = isBlocked || blockStatusUnavailable;'));
  assert.ok(detailHook.includes('if (blockStatusUnavailable)'));
  assert.ok(
    detailHook.includes("blockStatusError ?? 'Unable to verify block status. Please retry.'"),
  );

  assert.equal(
    publicHook.includes('const isBlocked = blockedStatus.data ?? false;'),
    false,
    'public profile must not default unknown block status to not-blocked',
  );
  assert.ok(publicHook.includes('const isBlocked = blockedStatus.data === true;'));
  assert.ok(publicHook.includes('const blockStatusDataKey = shouldVerifyBlockStatus'));
  assert.ok(publicHook.includes('dataKey: blockStatusDataKey,'));
  assert.ok(
    publicHook.includes(
      '!blockedStatus.hasRequestedTruthfulFrame ||',
    ),
  );
  assert.ok(publicHook.includes('const profileActionsBlocked = isBlocked || blockStatusUnavailable;'));
  assert.ok(publicHook.includes('if (blockStatusUnavailable)'));

  assert.ok(detailScreen.includes('actionsUnavailable={p.profileActionsBlocked}'));
  assert.ok(detailScreen.includes('disabled={p.profileActionsBlocked}'));
  assert.ok(publicScreen.includes('actionsUnavailable={profile.profileActionsBlocked}'));
  assert.ok(detailHero.includes('actionsUnavailable?: boolean;'));
  assert.ok(publicHero.includes('actionsUnavailable?: boolean;'));
  assert.ok(detailHero.includes('disabled={disableActions}'));
  assert.ok(publicHero.includes('disabled={disableActions}'));
});
