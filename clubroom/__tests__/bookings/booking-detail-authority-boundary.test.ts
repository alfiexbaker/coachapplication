import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('booking detail stays lean and loads sensitive children after booking authority', () => {
  const screen = readProjectFile('app/(tabs)/bookings/[id].tsx');
  const coachView = readProjectFile('components/bookings/booking-coach-view.tsx');
  const hook = readProjectFile('hooks/use-booking-detail.ts');
  const layout = readProjectFile('app/(tabs)/bookings/_layout.tsx');
  const messages = readProjectFile('hooks/use-messages.ts');

  assert.match(layout, /name="\[id\]"[\s\S]*?headerShown: false/);
  assert.ok(screen.includes('<BookingEssentialsCard'));
  assert.equal(screen.includes('BookingWeatherCard'), false);
  assert.equal(screen.includes('BookingOwnershipCard'), false);
  assert.equal(screen.includes('BookingTrustCard'), false);
  assert.equal(screen.includes('BookingFollowUpsCard'), false);
  assert.equal(screen.includes('Free cancellation is unavailable within 24 hours'), false);
  assert.equal(screen.includes('onRefund='), false);

  const loadIndex = hook.indexOf('useScreen<BookingSummary | null>');
  const noteIndex = hook.indexOf('useSessionNote(canReadSessionNote');
  assert.ok(loadIndex >= 0 && noteIndex > loadIndex, 'booking authority must resolve before notes');
  assert.ok(hook.includes("booking.status === 'COMPLETED'"));
  assert.ok(hook.includes("booking.status === 'Completed'"));
  assert.ok(hook.includes('Routes.messagesWith({ bookingId: booking.id })'));
  assert.ok(messages.includes('thread.bookingId === bookingId'));
  assert.ok(coachView.includes('Message contact'));

  assert.ok(screen.includes('title="Booking unavailable"'));
  assert.ok(screen.includes('actionLabel="Back to bookings"'));
  assert.ok(screen.includes("error?.code === 'UNAUTHORIZED'"));
});
