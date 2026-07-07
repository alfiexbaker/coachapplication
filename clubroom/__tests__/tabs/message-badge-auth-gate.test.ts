import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('tab message badge waits for an authenticated user before loading threads', () => {
  const tabLayoutSource = readSource('app/(tabs)/_layout.tsx');
  const currentUserIdIndex = tabLayoutSource.indexOf('const currentUserId = currentUser?.id;');
  const authGateIndex = tabLayoutSource.indexOf('if (!currentUserId)');
  const unreadCallIndex = tabLayoutSource.indexOf('messagingService.getUnreadCount()');

  assert.ok(currentUserIdIndex > -1, 'tab shell should derive a stable currentUserId');
  assert.ok(authGateIndex > currentUserIdIndex, 'tab shell should gate message badge loading');
  assert.ok(unreadCallIndex > authGateIndex, 'message unread count should load after auth gate');
  assert.ok(
    tabLayoutSource.includes('}, [currentUserId]);'),
    'message badge effect should rerun when the authenticated user changes',
  );
});
