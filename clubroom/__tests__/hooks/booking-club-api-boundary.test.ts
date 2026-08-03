import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('club authority resolves individual clubs without local mirrors in API mode', () => {
  const source = readSource('services/club-authority-service.ts');
  const methodStart = source.indexOf('async getClubById(clubId: string)');
  const updateStart = source.indexOf('async updateClubDetails(', methodStart);

  assert.ok(methodStart >= 0, 'test should find getClubById helper');
  assert.ok(updateStart > methodStart, 'test should find helper boundary');

  const helper = source.slice(methodStart, updateStart);
  const mockBranchStart = helper.indexOf('if (api.useMock) {');
  const apiBranchStart = helper.indexOf('const headersResult = await resolveHeaders();');

  assert.ok(mockBranchStart >= 0, 'mock branch should be explicit');
  assert.ok(apiBranchStart > mockBranchStart, 'API branch should follow mock branch');
  assert.ok(
    helper.slice(mockBranchStart, apiBranchStart).includes('socialFeedService.getClub(clubId)'),
    'mock mode may keep local club lookup compatibility',
  );
  assert.equal(
    helper.slice(apiBranchStart).includes('socialFeedService.getClub'),
    false,
    'API mode must resolve clubs through /v1 club authority, not local social-feed mirrors',
  );
  assert.ok(
    helper.includes('apiFetch<ApiClubResponse>(`/v1/clubs/${encodeURIComponent(clubId)}`'),
    'API branch should call the direct club detail authority route',
  );
  assert.ok(
    helper.includes('headers: headersResult.data'),
    'API branch should send resolved auth context headers',
  );
  assert.equal(
    helper.slice(apiBranchStart).includes('this.listClubs()'),
    false,
    'API mode must not fetch every visible club to resolve one club detail',
  );
  assert.ok(
    helper.includes('socialFeedService.syncAuthorityClubs'),
    'successful API club detail reads may refresh the compatibility cache',
  );
});

test('booking club display paths use club authority instead of social-feed club mirrors', () => {
  const files = [
    'app/(tabs)/bookings/[id].tsx',
    'app/(tabs)/bookings/report-problem.tsx',
    'app/book/[coachId]/confirmation.tsx',
    'app/book/[coachId]/review.tsx',
  ];

  for (const file of files) {
    const source = readSource(file);
    assert.ok(
      source.includes("import { clubAuthorityService } from '@/services/club-authority-service';"),
      `${file} should import club authority`,
    );
    assert.ok(
      /clubAuthorityService\s*\.\s*getClubById\s*\(/.test(source),
      `${file} should resolve club display data through authority`,
    );
    assert.equal(
      source.includes("from '@/services/social-feed-service'"),
      false,
      `${file} must not import social-feed club mirrors`,
    );
    assert.equal(
      source.includes('socialFeedService.getClub('),
      false,
      `${file} must not call local club mirrors for booking display`,
    );
  }
});

test('booking problem reports fail closed when support context cannot load', () => {
  const source = readSource('app/(tabs)/bookings/report-problem.tsx');
  const submitStart = source.indexOf('const handleSubmit = async () => {');
  const disabledStart = source.indexOf('disabled={', submitStart);
  const disabledEnd = source.indexOf('accessibilityLabel="Send report"', disabledStart);

  assert.ok(submitStart >= 0, 'test should find submit handler');
  assert.ok(disabledStart > submitStart, 'test should find submit disabled props');
  assert.ok(disabledEnd > disabledStart, 'test should find disabled prop boundary');

  const submitBlock = source.slice(submitStart, disabledStart);
  const disabledBlock = source.slice(disabledStart, disabledEnd);

  assert.ok(
    source.includes("const bookingParam = useRequiredParam('bookingId')"),
    'screen should require canonical booking context',
  );
  assert.ok(
    source.includes("if (!bookingId || loadState === 'unavailable')"),
    'missing and permanently denied booking context should fail closed',
  );
  assert.ok(
    source.includes('title="Booking unavailable"'),
    'permanent denial should expose a quiet unavailable state',
  );
  assert.ok(
    source.includes('actionLabel="Back to bookings"'),
    'permanent denial should provide one safe exit',
  );
  assert.ok(
    submitBlock.includes('!supportContext || !selectedCategory || !bookingId'),
    'submission should require the loaded booking and selected issue type',
  );
  assert.equal(
    submitBlock.includes('await bookingService.getBooking(bookingId)'),
    false,
    'submission should reuse the loaded booking while the API rechecks authority',
  );
  assert.ok(
    source.includes('trimmedDescription.length >= MIN_DETAILS_LENGTH'),
    'the primary action should stay disabled until details meet the minimum',
  );
  assert.ok(
    disabledBlock.includes('!canSubmit'),
    'the button disabled state should use the same submission predicate',
  );
  assert.ok(
    source.includes('accessibilityRole="radio"') &&
      source.includes('accessibilityState={{ checked: isSelected }}'),
    'issue categories should expose native radio semantics',
  );
  assert.ok(
    source.includes('accessibilityLabel="Issue details"'),
    'the multiline input should have a stable accessible name',
  );
  assert.ok(
    source.includes('<KeyboardAvoidingView'),
    'the form should remain usable with the iOS keyboard open',
  );
  assert.equal(
    /within 24 hours|reviewed within 24 hours|Help us improve/.test(source),
    false,
    'the screen must not invent response-time promises or generic improvement copy',
  );
});

test('bookings list does not use local club mirrors for viewer scope', () => {
  const source = readSource('hooks/use-bookings.ts');
  const loaderStart = source.indexOf('const loadData = useCallback(async () => {');
  const groupSessionsStart = source.indexOf('const groupSessionsPromise = (', loaderStart);
  const groupRegistrationsStart = source.indexOf(
    'const groupRegistrationsPromise = sessionRegistrationService',
    groupSessionsStart,
  );
  const promiseAllStart = source.indexOf('const [groupSessions, groupRegistrations]', groupRegistrationsStart);

  assert.ok(loaderStart >= 0, 'test should find bookings loader');
  assert.ok(groupSessionsStart > loaderStart, 'test should find group-session authority read');
  assert.ok(
    groupRegistrationsStart > groupSessionsStart,
    'test should find group-registration authority read',
  );
  assert.ok(promiseAllStart > groupRegistrationsStart, 'test should find authority read boundary');

  const groupSessionsBlock = source.slice(groupSessionsStart, groupRegistrationsStart);
  const groupRegistrationsBlock = source.slice(groupRegistrationsStart, promiseAllStart);

  assert.equal(
    source.includes("from '@/services/social-feed-service'"),
    false,
    'bookings loader must not import social-feed club mirrors',
  );
  assert.equal(
    source.includes('socialFeedService.'),
    false,
    'bookings loader must not call local social-feed mirrors',
  );
  assert.equal(
    source.includes('getUserClubs') || source.includes('getUserMemberships'),
    false,
    'viewer scope must not come from local club membership mirrors',
  );
  assert.ok(
    source.includes('const childClubIds = new Set<string>();'),
    'viewer club scope should come from loaded child context',
  );
  assert.ok(
    source.includes('for (const child of contextChildren)'),
    'viewer club scope should be derived from current child context',
  );
  for (const [name, block, errorName] of [
    ['group sessions', groupSessionsBlock, 'sessionError'],
    ['group registrations', groupRegistrationsBlock, 'registrationError'],
  ] as const) {
    assert.ok(
      block.includes('if (!apiClient.isMockMode) {'),
      `${name} failures should branch by runtime mode`,
    );
    assert.ok(
      block.includes(`throw ${errorName};`),
      `${name} failures should surface outside mock mode`,
    );
    assert.ok(
      block.includes('return [];'),
      `${name} may only collapse to [] in mock compatibility mode`,
    );
  }
  assert.ok(
    source.includes('const recurringBookings = apiClient.isMockMode'),
    'local recurring booking cache should remain explicitly mock-only',
  );
});

test('booking communications skips local notification routing in API mode', () => {
  const source = readSource('services/booking-communications-service.ts');
  const assignmentStart = source.indexOf('async notifyAssignmentChange');
  const supportStart = source.indexOf('async notifySupportIssueReported');
  const serviceEnd = source.indexOf('export const bookingCommunicationsService', supportStart);

  assert.ok(assignmentStart >= 0, 'test should find assignment notifier');
  assert.ok(supportStart > assignmentStart, 'test should find support notifier');
  assert.ok(serviceEnd > supportStart, 'test should find service boundary');

  const assignmentBlock = source.slice(assignmentStart, supportStart);
  const supportBlock = source.slice(supportStart, serviceEnd);

  for (const [name, block] of [
    ['assignment', assignmentBlock],
    ['support', supportBlock],
  ] as const) {
    const guardStart = block.indexOf('if (!api.useMock) {');
    const localClubStart = block.indexOf('socialFeedService.getClub');
    const localMembershipStart = block.indexOf('socialFeedService.getClubMemberships');
    assert.ok(guardStart >= 0, `${name} notifier should return early outside mock mode`);
    if (localClubStart >= 0) {
      assert.ok(localClubStart > guardStart, `${name} local club lookup should be mock-only`);
    }
    if (localMembershipStart >= 0) {
      assert.ok(
        localMembershipStart > guardStart,
        `${name} local membership lookup should be mock-only`,
      );
    }
  }
});
