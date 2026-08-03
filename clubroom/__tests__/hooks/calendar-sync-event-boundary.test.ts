import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('calendar export uses user-scoped club events, not club-scoped event reads with a user id', () => {
  const source = readProjectFile('hooks/use-calendar-sync.ts');

  assert.ok(source.includes('eventService.getUpcomingUserEvents(userId)'));
  assert.doesNotMatch(source, /eventService\.getUpcomingEvents\(userId\)/);
});

test('calendar export fails closed on partial live source failures', () => {
  const source = readProjectFile('hooks/use-calendar-sync.ts');
  const groupSessionRead = source.indexOf('const coachSessions = await groupSessionService.getCoachSessions(userId);');
  const groupSessionMessage = source.indexOf(
    'Could not load all group sessions for export. Please try again.',
    groupSessionRead,
  );
  const eventRead = source.indexOf('const upcomingEvents = await eventService.getUpcomingUserEvents(userId);');
  const eventMessage = source.indexOf(
    'Could not load all club events for export. Please try again.',
    eventRead,
  );
  const generateFile = source.indexOf('calendarService.generateICSFileFromEvents');

  assert.ok(source.includes("import { apiClient } from '@/services/api-client';"));
  assert.ok(groupSessionRead >= 0, 'test should find group-session export read');
  assert.ok(groupSessionMessage > groupSessionRead, 'group-session read failure should set an error');
  assert.ok(eventRead > groupSessionMessage, 'test should find club-event export read');
  assert.ok(eventMessage > eventRead, 'club-event read failure should set an error');
  assert.ok(generateFile > eventMessage, 'ICS file generation should happen after all live reads');
  assert.match(
    source.slice(groupSessionRead, eventRead),
    /if \(!apiClient\.isMockMode\) \{[\s\S]*setActionError\(message\);[\s\S]*uiFeedback\.showToast\(message, 'error'\);[\s\S]*return;[\s\S]*\}/,
  );
  assert.match(
    source.slice(eventRead, generateFile),
    /if \(!apiClient\.isMockMode\) \{[\s\S]*setActionError\(message\);[\s\S]*uiFeedback\.showToast\(message, 'error'\);[\s\S]*return;[\s\S]*\}/,
  );
});
