import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { isEventStaffWorkspaceDenied } from '@/utils/event-workspace';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('event staff workspace denial only handles the explicit permission boundary', () => {
  assert.equal(
    isEventStaffWorkspaceDenied(new Error('Only event staff can read event attendance')),
    true,
  );
  assert.equal(
    isEventStaffWorkspaceDenied(new Error('Only event staff can read event RSVPs')),
    true,
  );
  assert.equal(isEventStaffWorkspaceDenied(new Error('attendance service unavailable')), false);
});

test('event detail loads personal records before optional staff records and isolates its cache by actor', () => {
  const hook = readSource('hooks/use-event-detail.ts');
  const screen = readSource('app/events/[id].tsx');

  assert.ok(hook.includes('eventService.getUserEventRSVP(id, currentUser.id)'));
  assert.ok(hook.includes('eventService.getUserAttendance(id, currentUser.id)'));
  assert.ok(hook.includes('const attendance = await eventService.getAttendeeList(id);'));
  assert.ok(hook.includes('if (!isEventStaffWorkspaceDenied(staffWorkspaceError))'));
  assert.ok(hook.includes('canManageEvent: false'));
  assert.ok(
    hook.includes("`event-detail:${currentUser?.id ?? 'anonymous'}:${id}`"),
    'protected event detail cache should not survive an account switch',
  );
  assert.ok(screen.includes('isOrganizer && rsvps.length > 0'));
  assert.ok(screen.includes('onUndoCheckIn={isOrganizer ? handleUndoCheckIn : undefined}'));
  assert.ok(screen.includes('disabled={!currentRSVP && !isOrganizer}'));
});

test('event RSVP and attendee routes have no generic coach-only or fake staff actions', () => {
  const rsvpHook = readSource('hooks/use-event-rsvp.ts');
  const rsvpScreen = readSource('app/events/[id]/rsvp.tsx');
  const attendeesHook = readSource('hooks/use-event-attendees.ts');
  const attendeesScreen = readSource('app/events/[id]/attendees.tsx');

  assert.ok(rsvpHook.includes("userRole: actorRole"));
  assert.ok(
    rsvpHook.includes("`event-rsvp:${currentUser?.id ?? 'anonymous'}:${id}`"),
  );
  assert.equal(rsvpHook.includes('handleSendReminder'), false);
  assert.equal(rsvpScreen.includes('Send Reminder'), false);
  assert.ok(attendeesHook.includes('canManageEvent: false'));
  assert.ok(
    attendeesHook.includes("`event-attendees:${currentUser?.id ?? 'anonymous'}:${id}`"),
  );
  assert.equal(attendeesHook.includes('handleExport'), false);
  assert.equal(attendeesHook.includes('handleSendReminder'), false);
  assert.ok(attendeesScreen.includes('Staff access required'));
  assert.equal(attendeesScreen.includes('Export List'), false);
  assert.equal(attendeesScreen.includes('Send Reminder'), false);
});
