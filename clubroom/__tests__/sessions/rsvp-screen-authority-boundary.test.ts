import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('session RSVP does not confirm a response before backend authority succeeds', () => {
  const source = readSource('app/session/[id]/rsvp.tsx');

  const respond = source.indexOf('const result = await rsvpService.respond(rsvp.id, status);');
  const failureGuard = source.indexOf('if (!result.success)', respond);
  const responseState = source.indexOf('setResponseOverride({ responded: true, responseStatus });');
  const successToast = source.indexOf('You\'ve confirmed', respond);

  assert.ok(respond >= 0, 'RSVP response must use the authority service');
  assert.ok(failureGuard > respond, 'authority failures must be handled after submission');
  assert.ok(responseState > failureGuard, 'UI response state must wait for authority success');
  assert.ok(successToast > failureGuard, 'success copy must wait for authority success');
  assert.equal(
    source.includes("await rsvpService.respond(rsvp.id, status);\n      setResponseOverride"),
    false,
    'the screen must not optimistically mark an RSVP as submitted',
  );
});

test('session RSVP rejects missing or fabricated schedule data', () => {
  const source = readSource('app/session/[id]/rsvp.tsx');

  assert.ok(source.includes('if (!session || !firstSlot)'), 'RSVP requires a real session occurrence');
  assert.ok(source.includes("'This session is unavailable for RSVP.'"));
  assert.ok(source.includes("'This session has an invalid schedule.'"));
  assert.equal(source.includes("'Training Session'"), false);
  assert.equal(source.includes("'Location to be confirmed'"), false);
  assert.equal(source.includes('Date.now() + 3 * 24 * 60 * 60 * 1000'), false);
});
