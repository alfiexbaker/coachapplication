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
  assert.ok(source.includes("title={hasCreatedBooking ? 'Booking sent' : 'Confirm booking'}"));
  assert.ok(source.includes("{hasCreatedBooking ? 'View booking' : 'Confirm booking'}"));
  assert.ok(source.includes('{hasCreatedBooking ? ('));
  assert.ok(source.includes('bookingService.createBooking({'));
  assert.ok(source.includes('const bookingDraftReady = Boolean('));
  assert.ok(source.includes('!bookingDraftReady'));
  assert.ok(source.includes('<ScrollView'));
  assert.equal(source.includes('live booking API'), false);
  assert.equal(source.includes('checkCircle'), false);
});

test('assigned coach can confirm a pending booking through the v1 lifecycle authority', () => {
  const hookSource = readSource('hooks/use-booking-detail.ts');
  const coachViewSource = readSource('components/bookings/booking-coach-view.tsx');
  const screenSource = readSource('app/(tabs)/bookings/[id].tsx');

  assert.ok(hookSource.includes("booking?.status === 'Pending'"));
  assert.ok(hookSource.includes('isFutureBooking'));
  assert.ok(hookSource.includes('accountIdsMatch(currentUser.id, booking.coachId)'));
  assert.ok(hookSource.includes('await bookingService.confirmBooking(booking.id)'));
  assert.ok(hookSource.includes("uiFeedback.showToast('Booking confirmed.', 'success')"));
  assert.ok(hookSource.includes('onRefresh();'));
  assert.ok(coachViewSource.includes('accessibilityLabel="Confirm booking request"'));
  assert.ok(coachViewSource.includes("isConfirmingBooking ? 'Confirming...' : 'Confirm booking'"));
  assert.ok(
    screenSource.includes(
      'onConfirmBooking={canConfirmBooking ? handlers.confirmBooking : undefined}',
    ),
  );
});

test('pending booking requests use dedicated decline and withdrawal authority', () => {
  const authoritySource = readSource('services/booking/booking-authority-service.ts');
  const hookSource = readSource('hooks/use-booking-detail.ts');
  const coachViewSource = readSource('components/bookings/booking-coach-view.tsx');
  const parentViewSource = readSource('components/bookings/booking-parent-view.tsx');
  const screenSource = readSource('app/(tabs)/bookings/[id].tsx');

  assert.ok(authoritySource.includes('`/v1/bookings/${bookingId}/${action}`'));
  assert.ok(authoritySource.includes("action: 'decline' | 'withdraw'"));
  assert.ok(hookSource.includes("booking.status === 'Confirmed'"));
  assert.ok(hookSource.includes('await bookingService.declineBookingRequest(booking.id'));
  assert.ok(hookSource.includes('await bookingService.withdrawBookingRequest(booking.id'));
  assert.ok(hookSource.includes('accountIdsMatch(viewerUserId, booking.bookedById)'));
  assert.ok(hookSource.includes('accountIdsMatch(viewerUserId, participant.guardianUserId)'));
  assert.ok(coachViewSource.includes('accessibilityLabel="Decline booking request"'));
  assert.ok(coachViewSource.includes("'Decline request'"));
  assert.ok(parentViewSource.includes('accessibilityLabel="Withdraw booking request"'));
  assert.ok(parentViewSource.includes("'Withdraw request'"));
  assert.equal(parentViewSource.includes('(isPending || isConfirmed) && canCancelBooking'), false);
  assert.ok(
    screenSource.includes(
      'onDeclineRequest={canDeclineRequest ? handlers.declineRequest : undefined}',
    ),
  );
  assert.ok(
    screenSource.includes(
      'onWithdrawRequest={canWithdrawRequest ? handlers.withdrawRequest : undefined}',
    ),
  );
});

test('booking confirmation fails closed when club context cannot be loaded', () => {
  const source = readSource('app/book/[coachId]/confirmation.tsx');
  const clubLoadStart = source.indexOf('void clubAuthorityService');
  const assigneeLoadStart = source.indexOf('.getUserById(draft.assigneeCoachId)', clubLoadStart);
  const createStart = source.indexOf('const result = await bookingService.createBooking({');

  assert.ok(clubLoadStart >= 0, 'test should find club context load');
  assert.ok(assigneeLoadStart > clubLoadStart, 'test should find club context load boundary');
  assert.ok(createStart > assigneeLoadStart, 'test should find booking create call');

  const clubLoadBlock = source.slice(clubLoadStart, assigneeLoadStart);
  const assigneeLoadBlock = source.slice(
    assigneeLoadStart,
    source.indexOf('const deliveredByLabel', assigneeLoadStart),
  );
  const beforeCreateBlock = source.slice(0, createStart);

  assert.equal(
    clubLoadBlock.includes('result.success ? result.data : null'),
    false,
    'club context failures must not be converted into null club context',
  );
  assert.equal(
    clubLoadBlock.includes("setCommercialMode('COACH_OWNED')"),
    false,
    'club context failures must not invent coach-owned commercial mode',
  );
  assert.ok(
    clubLoadBlock.includes('setClubContextError(message)'),
    'club context failures should be visible to the screen',
  );
  assert.ok(
    clubLoadBlock.includes('const nextCommercialMode = club.commercialMode ?? null') &&
      clubLoadBlock.includes('if (!nextCommercialMode)') &&
      clubLoadBlock.includes("setClubContextError('Could not load organization billing context.')"),
    'club drafts should require billing mode from live club authority',
  );
  assert.equal(
    clubLoadBlock.includes('club.commercialMode ?? draft.commercialMode'),
    false,
    'confirmation must not reuse stale draft commercial mode when live club authority omits billing mode',
  );
  assert.equal(
    assigneeLoadBlock.includes("safeDisplayLabel(draft.assigneeCoachId, 'Coach')"),
    false,
    'assignee context failures must not invent a generic delivery coach label',
  );
  assert.ok(
    assigneeLoadBlock.includes('setAssigneeContextError(message)'),
    'assignee context failures should be visible to the screen',
  );
  assert.ok(
    beforeCreateBlock.includes('if (draft.clubId) {') &&
      beforeCreateBlock.includes("trackConfirmStep('validation_fail', 'club_context_loading')") &&
      beforeCreateBlock.includes(
        "trackConfirmStep('validation_fail', 'club_context_unavailable')",
      ) &&
      beforeCreateBlock.includes('if (clubContextError || !clubLabel || !commercialMode)'),
    'club drafts should be blocked before create while club context is loading or unavailable',
  );
  assert.ok(
    source.includes('commercialMode: draft.clubId'),
    'club drafts should not use the stale non-club commercial-mode fallback',
  );
  assert.ok(
    source.includes('const confirmationBlocked =') &&
      source.includes('!bookingDraftReady') &&
      source.includes('disabled={isCreating || confirmationBlocked}'),
    'confirmation CTA should be blocked while its draft or live authority context is unavailable',
  );
  assert.ok(
    beforeCreateBlock.includes('if (draft.assigneeCoachId) {') &&
      beforeCreateBlock.includes(
        "trackConfirmStep('validation_fail', 'assignee_context_loading')",
      ) &&
      beforeCreateBlock.includes(
        "trackConfirmStep('validation_fail', 'assignee_context_unavailable')",
      ),
    'assigned coach drafts should be blocked before create while assignee context is loading or unavailable',
  );
});

test('booking review fails closed when club context cannot be loaded', () => {
  const source = readSource('app/book/[coachId]/review.tsx');
  const clubLoadStart = source.indexOf('void clubAuthorityService');
  const assigneeLoadStart = source.indexOf('.getUserById(draft.assigneeCoachId)', clubLoadStart);
  const continueStart = source.indexOf('const handleContinue = () => {');

  assert.ok(clubLoadStart >= 0, 'test should find review club context load');
  assert.ok(assigneeLoadStart > clubLoadStart, 'test should find review club load boundary');
  assert.ok(continueStart > assigneeLoadStart, 'test should find review continue handler');

  const clubLoadBlock = source.slice(clubLoadStart, assigneeLoadStart);
  const assigneeLoadBlock = source.slice(
    assigneeLoadStart,
    source.indexOf('const locationSummary', assigneeLoadStart),
  );
  const continueBlock = source.slice(
    continueStart,
    source.indexOf('if (status ===', continueStart),
  );

  assert.equal(
    clubLoadBlock.includes('result.success ? result.data : null'),
    false,
    'review club context failures must not be converted into null club context',
  );
  assert.equal(
    clubLoadBlock.includes("setCommercialMode('COACH_OWNED')"),
    false,
    'review club context failures must not invent coach-owned commercial mode',
  );
  assert.ok(
    clubLoadBlock.includes('setClubContextError(message)'),
    'review club context failures should be visible to the screen',
  );
  assert.ok(
    clubLoadBlock.includes('const nextCommercialMode = club.commercialMode ?? null') &&
      clubLoadBlock.includes('if (!nextCommercialMode)') &&
      clubLoadBlock.includes("setClubContextError('Could not load organization billing context.')"),
    'review club drafts should require billing mode from live club authority',
  );
  assert.equal(
    clubLoadBlock.includes('club.commercialMode ?? draft.commercialMode'),
    false,
    'review must not reuse stale draft commercial mode when live club authority omits billing mode',
  );
  assert.equal(
    assigneeLoadBlock.includes("safeDisplayLabel(draft.assigneeCoachId, 'Coach')"),
    false,
    'review assignee context failures must not invent a generic delivery coach label',
  );
  assert.ok(
    assigneeLoadBlock.includes('setAssigneeContextError(message)'),
    'review assignee context failures should be visible to the screen',
  );
  assert.ok(
    source.includes('const hasResolvedClubContext =') &&
      source.includes('const hasResolvedAssigneeContext =') &&
      source.includes(
        'const canContinue = hasRequiredDraft && hasResolvedClubContext && hasResolvedAssigneeContext',
      ) &&
      source.includes('disabled={!canContinue}'),
    'review continue action should require resolved club and assignee context for assigned club drafts',
  );
  assert.ok(
    continueBlock.includes('if (!hasResolvedClubContext)') &&
      continueBlock.includes(
        "failure_code: clubContextLoading ? 'club_context_loading' : 'club_context_unavailable'",
      ),
    'review continue handler should fail closed while club context is loading or unavailable',
  );
  assert.ok(
    continueBlock.includes('if (!hasResolvedAssigneeContext)') &&
      continueBlock.includes('assignee_context_loading') &&
      continueBlock.includes('assignee_context_unavailable'),
    'review continue handler should fail closed while assignee context is loading or unavailable',
  );
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

test('multi-week booking fails closed when live availability refresh fails', () => {
  const source = readSource('hooks/use-multi-week.ts');

  assert.equal(source.includes('multiWeekSnapshots'), false);
  assert.ok(source.includes('dataKey: availabilityKey'));
  assert.ok(source.includes('resolveAuthoritativeScreenState({'));
  assert.ok(
    source.includes(
      'const weekRows = availabilityBlocked ? EMPTY_WEEK_ROWS : (data ?? EMPTY_WEEK_ROWS)',
    ),
  );
  assert.ok(source.includes('if (availabilityBlocked) {'));
  assert.ok(source.includes('Refresh availability before booking these weeks.'));
  assert.ok(source.includes('status: visibleStatus'));
  assert.ok(source.includes('error: error ?? silentError'));
  assert.ok(
    source.indexOf('if (availabilityBlocked) {') <
      source.indexOf('multiWeekBookingService.createSeries({'),
  );
});

test('api-mode direct booking create sends club context to v1 authority', () => {
  const bookingAuthoritySource = readSource('services/booking/booking-authority-service.ts');
  const bookingCrudSource = readSource('services/booking/booking-crud-service.ts');

  assert.ok(bookingCrudSource.includes('...(clubId ? { clubId } : {}),'));
  assert.ok(bookingAuthoritySource.includes('clubId?: string;'));
  assert.ok(bookingAuthoritySource.includes('clubId: input.clubId ?? null'));
  assert.ok(bookingAuthoritySource.includes('...(input.clubId ? { clubId: input.clubId } : {})'));
  assert.ok(bookingAuthoritySource.includes('clubId: apiBooking.clubId ?? undefined'));
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
