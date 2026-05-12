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

test('booking mirrors are not classified as client-local authority in API mode', () => {
  const apiClientSource = readSource('services/api-client.ts');
  const bookingCrudSource = readSource('services/booking/booking-crud-service.ts');
  const recurringSource = readSource('services/recurring-booking-service.ts');
  const multiWeekSource = readSource('services/multi-week-booking-service.ts');
  const localKeysBlock = apiClientSource.match(
    /const CLIENT_LOCAL_STORAGE_KEYS = new Set<string>\(\[([\s\S]*?)\]\);/,
  );

  assert.ok(localKeysBlock, 'expected CLIENT_LOCAL_STORAGE_KEYS block');
  assert.equal(localKeysBlock[1]?.includes('STORAGE_KEYS.BOOKINGS'), false);
  assert.ok(bookingCrudSource.includes('if (!apiClient.isMockMode) {'));
  assert.ok(bookingCrudSource.includes('bookingAuthorityService.listBookings()'));
  assert.ok(bookingCrudSource.includes('bookingAuthorityService.getBooking(id)'));
  assert.ok(bookingCrudSource.includes('bookingAuthorityService.createBooking('));
  assert.ok(bookingCrudSource.includes('bookingAuthorityService.cancelBooking(id,'));
  assert.ok(bookingCrudSource.includes('bookingAuthorityService.reopenBooking(id,'));
  assert.ok(
    bookingCrudSource.includes('Multi-week booking batches require backend series authority'),
  );
  assert.ok(bookingCrudSource.includes('Direct local booking saves are disabled in API mode'));
  assert.ok(recurringSource.includes('Recurring booking plans require backend series authority'));
  assert.ok(multiWeekSource.includes('Multi-week booking series require backend series authority'));
});
