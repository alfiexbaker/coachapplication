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
  const bookingAuthoritySource = readSource('services/booking/booking-authority-service.ts');
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
  assert.ok(bookingCrudSource.includes('bookingAuthorityService.completeBooking(id,'));
  assert.ok(bookingCrudSource.includes('bookingAuthorityService.reopenBooking(id,'));
  assert.ok(
    bookingCrudSource.includes(
      'Booking status updates require an explicit /v1 lifecycle contract in API mode.',
    ),
  );
  assert.ok(bookingCrudSource.includes('Failed to update booking status through API authority'));
  assert.ok(bookingAuthoritySource.includes('async confirmBooking('));
  assert.ok(bookingAuthoritySource.includes('/confirm'));
  assert.ok(bookingCrudSource.includes('bookingAuthorityService.confirmBooking(id,'));
  assert.ok(
    bookingCrudSource.includes('Multi-week booking batches require backend series authority'),
  );
  assert.ok(bookingCrudSource.includes('Direct local booking saves are disabled in API mode'));
  assert.ok(recurringSource.includes('Recurring booking plans require backend series authority'));
  assert.ok(multiWeekSource.includes('bookingAuthorityService.createBookingSeries({'));
});

test('booking wizard does not prefill generic names into live booking writes', () => {
  const sessionTypeSource = readSource('app/book/[coachId]/session-type.tsx');
  const detailsSource = readSource('app/book/[coachId]/details.tsx');
  const confirmationSource = readSource('app/book/[coachId]/confirmation.tsx');
  const discoverSource = readSource('hooks/use-bookings-discover.ts');
  const sessionDetailHookSource = readSource('hooks/use-session-detail-modal.ts');
  const multiWeekHookSource = readSource('hooks/use-multi-week.ts');
  const bookingTargetsSource = readSource('utils/booking-targets.ts');
  const bookingDraftSource = readSource('utils/booking-draft-prefill.ts');
  const bookingCrudSource = readSource('services/booking/booking-crud-service.ts');

  assert.equal(
    sessionTypeSource.includes("currentUser.name || currentUser.fullName || 'Athlete'"),
    false,
  );
  assert.equal(
    detailsSource.includes("currentUser.name || currentUser.fullName || 'Athlete'"),
    false,
  );
  assert.equal(
    multiWeekHookSource.includes("currentUser.name || currentUser.fullName || 'Athlete'"),
    false,
  );
  assert.equal(
    multiWeekHookSource.includes("currentUser.name || currentUser.fullName || 'Parent'"),
    false,
  );
  assert.ok(sessionTypeSource.includes('resolveDefaultBookingTarget({'));
  assert.equal(
    sessionTypeSource.includes('return resolveBookingTarget({ targetId: children[0].id'),
    false,
  );
  assert.ok(detailsSource.includes('buildBookingTargetDraftPatch({'));
  assert.ok(discoverSource.includes('resolveDefaultBookingTarget({'));
  assert.ok(sessionDetailHookSource.includes('resolveBookingTarget({ targetId: childId'));
  assert.ok(
    sessionDetailHookSource.includes('resolveDefaultBookingTarget({ currentUser, children })'),
  );
  assert.ok(bookingTargetsSource.includes('resolveUserProfileName(currentUser)'));
  assert.ok(multiWeekHookSource.includes('resolveUserProfileName(currentUser)'));
  assert.ok(bookingTargetsSource.includes('resolveNonGenericPersonName(child?.name)'));
  assert.ok(
    bookingTargetsSource.includes(
      'targets.athleteNames.every((name) => Boolean(resolveNonGenericPersonName(name)))',
    ),
  );
  assert.ok(bookingDraftSource.includes('resolveNonGenericPersonName(child.name)'));
  assert.ok(confirmationSource.includes('resolveBookingDraftTargets({'));
  assert.ok(confirmationSource.includes('hasResolvedBookingTargets({'));
  assert.equal(
    confirmationSource.includes('currentUser?.id\n                ? [currentUser.id]'),
    false,
  );
  assert.ok(
    bookingTargetsSource.includes(
      'draft.childIds?.length ? draft.childIds : [draft.childId ?? draft.athleteId]',
    ),
  );
  assert.ok(bookingCrudSource.includes('isGenericPersonPlaceholder(coachName)'));
  assert.ok(bookingCrudSource.includes('isGenericPersonPlaceholder(bookedByName)'));
  assert.ok(bookingCrudSource.includes('isGenericPersonPlaceholder(name)'));
  assert.ok(bookingCrudSource.includes('draft.childId ?? draft.athleteId'));
});

test('booking route offering selection wins over stale draft selection', () => {
  const source = readSource('app/book/[coachId]/session-type.tsx');
  const requestedStart = source.indexOf('const requestedOffering = offeringId');
  const staleSelectionStart = source.indexOf('const currentSelection = currentResolvedOfferings');

  assert.ok(requestedStart >= 0, 'session type screen should resolve route offering id');
  assert.ok(staleSelectionStart > requestedStart, 'route offering should be checked first');
  assert.ok(
    source.includes('requestedOffering && requestedOffering.id !== draft.sessionOfferingId'),
    'a changed route offering should replace stale draft offering state',
  );
  assert.ok(
    source.includes('currentSelection && (!offeringId || currentSelection.id === offeringId)'),
    'existing draft selection should only win when no different route offering was requested',
  );
});
