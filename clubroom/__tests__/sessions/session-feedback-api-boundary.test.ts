import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('booking session feedback completes via lifecycle API before mock storage bridge', () => {
  const source = readSource('app/(tabs)/bookings/session-feedback.tsx');

  const effect = source.indexOf('const prepareFeedbackAndNavigate = async');
  const apiBranch = source.indexOf('if (!apiClient.isMockMode)', effect);
  const completeCall = source.indexOf('bookingService.completeBooking(bookingId', effect);
  const genericStatusPatch = source.indexOf(
    "bookingService.updateBooking(bookingId, {\n              status: 'COMPLETED'",
    effect,
  );
  const localCoachSessionRead = source.indexOf(
    "apiClient.get<Record<string, unknown>[]>('coach_sessions'",
    effect,
  );
  const localBookingRead = source.indexOf("apiClient.get<Booking[]>('session_bookings'", effect);

  assert.ok(effect >= 0, 'test should find feedback preparation effect');
  assert.ok(apiBranch >= 0, 'API branch must run before mock storage branch');
  assert.ok(completeCall >= 0, 'API branch must use booking lifecycle completion authority');
  assert.equal(
    genericStatusPatch,
    -1,
    'API branch must not complete by generic booking status patch',
  );
  assert.ok(localCoachSessionRead >= 0, 'test should find mock coach session bridge');
  assert.ok(localBookingRead >= 0, 'test should find mock booking bridge');
  assert.ok(
    apiBranch < localCoachSessionRead,
    'API branch must run before local coach session reads',
  );
  assert.ok(
    completeCall < localCoachSessionRead,
    'lifecycle completion must run before local session reads',
  );
  assert.ok(
    completeCall < localBookingRead,
    'lifecycle completion must run before local booking reads',
  );
});
