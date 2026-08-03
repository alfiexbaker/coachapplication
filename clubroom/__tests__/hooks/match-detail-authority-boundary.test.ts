import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('match detail defers management controls to backend capability', () => {
  const hook = fs.readFileSync(path.join(ROOT, 'hooks/use-match-detail.ts'), 'utf8');
  const screen = fs.readFileSync(path.join(ROOT, 'app/matches/[id].tsx'), 'utf8');
  const actions = fs.readFileSync(
    path.join(ROOT, 'components/match/match-coach-actions.tsx'),
    'utf8',
  );

  assert.ok(hook.includes('const canManageMatch = match?.canManageMatch === true;'));
  assert.equal(hook.includes("currentUser?.role === 'COACH'"), false);
  assert.ok(hook.includes('if (!match || !canManageMatch) return;'));
  assert.ok(hook.includes('/^(\\d{1,2})-(\\d{1,2})$/'));
  assert.ok(screen.includes('{canManageMatch && isUpcoming && ('));
  assert.ok(screen.includes('canRecordResult={canRecordResult}'));
  assert.ok(actions.includes('canRecordResult: boolean;'));
  assert.equal(actions.includes('isComplete && !hasResult'), false);
});
