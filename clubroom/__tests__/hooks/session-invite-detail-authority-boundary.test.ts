import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('invite detail keeps API-mode reads authoritative and fails closed on action results', () => {
  const source = readSource('app/session-invites/[id].tsx');

  const apiSnapshotGuard =
    'const invite = loadedInvite ?? (USE_MOCK && id ? (inviteDetailSnapshots.get(id) ?? null) : null);';
  const declineResult = source.indexOf('const result = await sessionInviteService.respondToInvite({');
  const declineFailureGuard = source.indexOf('if (!result.success)', declineResult);
  const declinedToast = source.indexOf("uiFeedback.showToast('Invite declined.', 'success');", declineResult);
  const navigation = source.indexOf('router.back();', declineResult);

  assert.ok(source.includes(apiSnapshotGuard), 'API mode must not render a stale invite snapshot');
  assert.ok(source.includes('if (USE_MOCK && loadedInvite && id)'), 'only mock mode may cache detail data');
  assert.ok(declineResult >= 0, 'decline must call the invite response authority');
  assert.ok(declineFailureGuard > declineResult, 'decline must inspect its Result');
  assert.ok(declinedToast > declineFailureGuard, 'decline success copy must wait for authority success');
  assert.ok(navigation > declineFailureGuard, 'navigation must wait for authority success');
  assert.ok(source.includes("uiFeedback.showToast(result.error.message, 'error');"));
  assert.equal(source.includes("uiFeedback.showToast(result.error.message, 'success');"), false);
});
