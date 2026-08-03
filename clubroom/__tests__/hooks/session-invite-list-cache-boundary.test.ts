import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('session invite list never shares a warm frame across accounts or reports a denied decline as success', () => {
  const screen = fs.readFileSync(path.join(ROOT, 'app/session-invites/index.tsx'), 'utf8');

  assert.equal(screen.includes('inviteListSnapshots'), false);
  assert.match(
    screen,
    /dataKey:\s*currentUser\?\.id\s*\?\s*`session-invites:\$\{currentUser\.id\}:\$\{mode\}`/,
  );
  assert.ok(screen.includes("loadingStrategy: 'cold-first'"));
  assert.ok(screen.includes('const result = await sessionInviteService.respondToInvite({'));
  assert.ok(screen.includes("if (!result.success) {\n                uiFeedback.showToast(result.error.message, 'error');"));
  assert.ok(screen.indexOf("if (!result.success)") < screen.indexOf("Invite declined. The coach has been notified."));
});
