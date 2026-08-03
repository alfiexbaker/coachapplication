import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('booking cancellation derives coach UI from the signed-in account and booking owner', () => {
  const hook = readSource('hooks/use-booking-cancel.ts');
  const screen = readSource('app/booking/[id]/cancel.tsx');
  const routes = readSource('navigation/routes.ts');

  assert.match(hook, /coachId: booking\.coachId/);
  assert.match(
    hook,
    /currentUser\.accountType === 'COACH'[\s\S]*accountIdsMatch\(currentUser\.id, coachId\)/,
  );
  assert.match(hook, /const isParent = currentUser\?\.accountType === 'PARENT';/);
  assert.match(hook, /if \(!isParent && r\.parentOnly\) return false;/);
  assert.match(hook, /buildAuthScopedSnapshotKey\(currentUser\?\.id, 'booking-cancel', id\)/);
  assert.doesNotMatch(hook, /mode === 'coach'/);
  assert.match(screen, /useLocalSearchParams<\{ id: string \}>\(\)/);
  assert.doesNotMatch(screen, /mode\?: 'coach' \| 'parent'/);
  assert.match(routes, /bookingCancel: \(id: string\) =>/);
  assert.doesNotMatch(routes, /bookingCancel: \(id: string, mode/);
  assert.doesNotMatch(screen, /Notify Waitlist/);
  assert.doesNotMatch(hook, /notifyWaitlist/);
  assert.doesNotMatch(hook, /Waitlist notified for freed slot/);
});
