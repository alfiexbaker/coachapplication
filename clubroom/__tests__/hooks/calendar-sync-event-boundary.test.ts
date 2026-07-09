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
