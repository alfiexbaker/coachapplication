import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('event mock fixtures are not initialized as API-mode caches', () => {
  const eventCrud = readProjectFile('services/event/event-crud-service.ts');
  const eventRsvp = readProjectFile('services/event/event-rsvp-service.ts');
  const eventAttendance = readProjectFile('services/event/event-attendance-service.ts');

  assert.doesNotMatch(eventCrud, /let eventsCache:[^=]+=\s*\[\.\.\.MOCK_EVENTS\];/);
  assert.doesNotMatch(eventRsvp, /let rsvpsCache:[^=]+=\s*\[\.\.\.MOCK_RSVPS\];/);
  assert.doesNotMatch(
    eventAttendance,
    /let attendanceCache:[^=]+=\s*\[\.\.\.MOCK_ATTENDANCE\];/,
  );

  assert.ok(eventCrud.includes('USE_MOCK ? [...MOCK_EVENTS] : []'));
  assert.ok(eventRsvp.includes('USE_MOCK ? [...MOCK_RSVPS] : []'));
  assert.ok(eventAttendance.includes('USE_MOCK ? [...MOCK_ATTENDANCE] : []'));
});
