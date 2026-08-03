import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('legacy group invite route replaces into the canonical existing-session invite flow', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app/session-invites/group.tsx'), 'utf8');
  const replace = source.indexOf('router.replace(');
  const intent = source.indexOf('Routes.sessionsCreateIntent({', replace);

  assert.ok(replace >= 0, 'the legacy route must replace itself');
  assert.ok(intent > replace, 'the replacement must use the route helper');
  assert.ok(source.includes("intent: 'existing'"));
  assert.ok(source.includes("source: 'group_manage'"));
  assert.equal(source.includes('router.push('), false, 'redirect must not leave a duplicate back-stack entry');
});
