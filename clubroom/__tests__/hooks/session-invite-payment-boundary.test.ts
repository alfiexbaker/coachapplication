import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('paid session invites do not show fake payment modal in API mode', () => {
  const source = readProjectFile('app/session-invites/[id].tsx');

  assert.match(source, /import \{ api \} from ["']@\/constants\/config["'];/);
  assert.ok(source.includes('const USE_MOCK = api.useMock;'));
  assert.equal(source.includes('if (invite.price && invite.price > 0) {'), false);
  assert.ok(
    source.includes('if (USE_MOCK && invite.price && invite.price > 0)'),
    'paid invite modal should be mock-only',
  );
  assert.ok(source.includes('{USE_MOCK ? ('), 'PaymentModal render should be guarded by mock mode');
  assert.ok(
    source.includes('sessionInviteService.respondToInvite({'),
    'API mode should accept through invite response authority',
  );
  assert.ok(
    /response: ['"]ACCEPTED['"]/.test(source),
    'acceptance should stay on the /v1 invite response path',
  );
});
