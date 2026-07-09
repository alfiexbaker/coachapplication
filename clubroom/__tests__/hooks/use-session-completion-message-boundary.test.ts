import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('session completion messages use backend threads before local MESSAGES access in API mode', () => {
  const source = readSource('hooks/use-session-completion.ts');

  const appendStart = source.indexOf('const appendThreadMessage = async');
  assert.ok(appendStart >= 0, 'test should find the appendThreadMessage helper');

  const apiModeGuard = source.indexOf('if (!apiClient.isMockMode)', appendStart);
  const apiThreadList = source.indexOf('messagingService.listThreads()', appendStart);
  const apiThreadSend = source.indexOf('messagingService.sendMessage(', appendStart);
  const localMessageRead = source.indexOf(
    'apiClient.get<Record<string, ChatMessage[]>>(\n      STORAGE_KEYS.MESSAGES',
    appendStart,
  );
  const localMessageWrite = source.indexOf(
    'apiClient.set(STORAGE_KEYS.MESSAGES, messagesByThread)',
    appendStart,
  );
  const intendedRoute = source.indexOf(
    "route: '/v1/message-threads/:threadId/messages'",
    appendStart,
  );

  assert.ok(apiModeGuard >= 0, 'append path must guard API mode');
  assert.ok(apiThreadList >= 0, 'API mode should resolve an existing backend message thread');
  assert.ok(apiThreadSend >= 0, 'API mode should send through backend-owned messaging');
  assert.ok(localMessageRead >= 0, 'test should find the local message read');
  assert.ok(localMessageWrite >= 0, 'test should find the local message write');
  assert.ok(intendedRoute >= 0, 'API-mode guard should document the intended backend route');
  assert.ok(apiModeGuard < apiThreadList, 'API mode must branch before resolving backend threads');
  assert.ok(
    apiThreadList < localMessageRead,
    'API mode must resolve backend threads before local reads',
  );
  assert.ok(
    apiThreadSend < localMessageWrite,
    'API mode must send through /v1 before local writes',
  );
});

test('session completion parent context keeps local roster lookup mock-only', () => {
  const source = readSource('hooks/use-session-completion.ts');

  const contextStart = source.indexOf('const loadParticipantContext = async');
  assert.ok(contextStart >= 0, 'test should find the participant context loader');

  const mockGuard = source.indexOf('apiClient.isMockMode', contextStart);
  const localRosterRead = source.indexOf(
    'apiClient.get<RosterEntry[]>(STORAGE_KEYS.ROSTER, [])',
    contextStart,
  );

  assert.ok(mockGuard >= 0, 'participant context should branch on mock mode');
  assert.ok(localRosterRead >= 0, 'test should find the local roster read');
  assert.ok(mockGuard < localRosterRead, 'API mode must not read the local roster mirror');
});

test('session completion uses resolved group session ids for offering work', () => {
  const source = readSource('hooks/use-session-completion.ts');

  assert.ok(source.includes("source: 'group'"));
  assert.ok(source.includes('sourceEntityId: groupSession.id'));
  assert.ok(source.includes('const groupSessionLookupId ='));
  assert.ok(source.includes('groupSessionService.getSession(groupSessionLookupId)'));
  assert.ok(source.includes('groupSessionService.getSessionRoster(groupSessionLookupId)'));
  assert.ok(source.includes('const activeGroupSessionId = useMemo'));
  assert.ok(source.includes('getSessionOfferingGroupSessionId(session)'));
  assert.equal(
    source.includes('resolveSessionOfferingSourceIds(session).groupSessionIds[0]'),
    false,
  );
  assert.ok(source.includes('booking.groupSessionId === activeGroupSessionId'));
  assert.ok(source.includes('const linkedBookings = activeGroupSessionId'));
  assert.equal(
    source.includes("groupSessionId: sourceType === 'offering' ? session.id : undefined"),
    false,
  );
});

test('individual booking completion sends attendance through booking lifecycle API', () => {
  const source = readSource('hooks/use-session-completion.ts');

  assert.equal(
    source.includes(
      'No-show completion for individual bookings needs a /v1 booking attendance API',
    ),
    false,
  );
  assert.ok(source.includes('const bookingCompletionAttendance = attendanceValues.map'));
  assert.ok(source.includes('attendance: bookingCompletionAttendance'));
  assert.ok(source.includes('bookingService.completeBooking(session.id, completeBookingInput)'));
  assert.ok(source.includes("!apiClient.isMockMode && sourceType === 'booking'"));
  assert.equal(
    source.includes('bookingService.updateBooking(session.id, {\n            status'),
    false,
  );
});

test('session completion records legacy earnings in mock mode only', () => {
  const source = readSource('hooks/use-session-completion.ts');
  const earningsStart = source.indexOf('earningsService.recordSessionPayment');
  assert.ok(earningsStart >= 0, 'test should find legacy earnings recording call');

  const guardStart = source.lastIndexOf(
    'if (apiClient.isMockMode && completedBookingId && session.price)',
    earningsStart,
  );
  assert.ok(guardStart >= 0, 'legacy earnings recording must be guarded to mock mode');

  const apiModeCallStart = source.lastIndexOf('if (!apiClient.isMockMode)', earningsStart);
  assert.ok(
    apiModeCallStart < guardStart,
    'API mode must not enter the legacy earnings recording branch',
  );
});
