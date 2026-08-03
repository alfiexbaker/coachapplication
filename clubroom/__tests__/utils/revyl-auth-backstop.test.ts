import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('Revyl auth backstop is the sole test-only allowlisted handoff', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app/revyl-auth.tsx'), 'utf8');
  const rootLayout = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');

  assert.match(source, /evaluateRevylAuthBypassUrl/);
  assert.match(source, /if \(!isAuditRuntime\)/);
  assert.match(source, /router\.replace\(Routes\.ROOT\)/);
  assert.match(source, /buildDemoRoleEntries\(availableUsers\)/);
  assert.match(source, /await login\(entry\.username, entry\.password\)/);
  assert.match(source, /router\.replace\(decision\.route\)/);
  assert.match(source, /Native audit sign-in unavailable/);
  assert.doesNotMatch(source, /<Redirect/);
  assert.doesNotMatch(rootLayout, /useRevylAuthBypass/);
});
