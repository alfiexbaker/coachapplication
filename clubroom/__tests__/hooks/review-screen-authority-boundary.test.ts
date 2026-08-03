import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('review screen follows backend reviewer authority', () => {
  const screen = fs.readFileSync(path.join(ROOT, 'app/review/[bookingId].tsx'), 'utf8');

  assert.ok(screen.includes("reviewAccess: 'allowed' | 'denied';"));
  assert.ok(screen.includes("reviewAccess: 'allowed',"));
  assert.ok(screen.includes("reviewStatus.error.code === 'UNAUTHORIZED'"));
  assert.ok(screen.includes("bookingInfo.reviewAccess = 'denied';"));
  assert.ok(screen.includes("booking.reviewAccess === 'denied' && !reviewFromStorage"));
  assert.ok(screen.includes("!booking || !bookingId || booking.reviewAccess === 'denied'"));
  assert.equal(screen.includes("currentUser?.role === 'COACH'"), false);
});
