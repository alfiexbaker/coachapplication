import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('blocked-account settings uses its self-owned summary contract', () => {
  const hook = readSource('hooks/use-blocked-users-settings.ts');
  const screen = readSource('app/settings/blocked-users.tsx');

  assert.ok(hook.includes('blockService.getBlockedUserSummaries(userId)'));
  assert.equal(hook.includes('userService.getUsersByIds'), false);
  assert.equal(screen.includes('user.email'), false);
  assert.equal(screen.includes('{user.id}</ThemedText>'), false);
  assert.equal(hook.includes('be invited again'), false);
  assert.ok(hook.includes("title: 'Unblock account?'"));
  assert.ok(hook.includes('.finally(() => setPendingUserId(null))'));
  assert.ok(screen.includes('disabled={Boolean(pendingUserId)}'));
  assert.ok(screen.includes('No blocked accounts'));
});
