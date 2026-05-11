import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('db booking create replays idempotency-key races instead of leaking prisma conflicts', () => {
  const source = readSource('apps/api/src/repositories/p0/booking-repository.ts');

  assert.ok(source.includes('isCreateBookingIdempotencyRace'));
  assert.ok(source.includes("prismaError.code !== 'P2002'"));
  assert.ok(source.includes("['userId', 'endpointKey', 'idempotencyKey']"));
  assert.ok(source.includes('const replay = await resolveCreateBookingIdempotency({'));
  assert.ok(source.includes('return replay.response;'));
});
