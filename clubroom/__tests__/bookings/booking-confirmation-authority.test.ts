import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('direct booking confirmation screen does not show success before API create succeeds', () => {
  const source = readSource('app/book/[coachId]/confirmation.tsx');

  assert.equal(source.includes('title="Booking placed"'), false);
  assert.ok(source.includes("title={hasCreatedBooking ? 'Booking confirmed' : 'Confirm booking'}"));
  assert.ok(source.includes("{hasCreatedBooking ? 'View booking' : 'Confirm booking'}"));
  assert.ok(source.includes("name={hasCreatedBooking ? 'checkmark' : 'calendar-outline'}"));
  assert.ok(source.includes('{hasCreatedBooking ? ('));
  assert.ok(source.includes('bookingService.createBooking({'));
});
