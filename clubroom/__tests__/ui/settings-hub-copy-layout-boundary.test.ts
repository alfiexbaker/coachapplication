import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('settings keeps account identity legible and product copy direct', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app/settings/index.tsx'), 'utf8');
  const hookSource = fs.readFileSync(path.join(process.cwd(), 'hooks/use-settings-hub.ts'), 'utf8');

  assert.ok(source.includes('profileInfo: { flex: 1, minWidth: 0'));
  assert.ok(source.includes('numberOfLines={1}'));
  assert.ok(source.includes('adjustsFontSizeToFit'));
  assert.ok(source.includes('minimumFontScale={0.8}'));
  assert.ok(source.includes('accessibilityLabel={`Email ${currentUser?.email'));

  for (const internalCopy of [
    'lifecycle requests',
    'not available in this build',
    'Earnings Reconciler',
    "currentUser?.role ?? 'GUEST'",
  ]) {
    assert.equal(source.includes(internalCopy), false, `remove internal copy: ${internalCopy}`);
  }

  assert.ok(source.includes('subtitle="Email and password"'));
  assert.ok(source.includes('title="Payments"'));
  assert.ok(source.includes('const canManageChildren = Boolean(currentUser && isParent)'));
  assert.ok(hookSource.includes('const { children, isParent } = useChildContext()'));
  assert.ok(
    hookSource.includes('return { currentUser, isCoach, isParent, childCount, handleLogout }'),
  );
});
