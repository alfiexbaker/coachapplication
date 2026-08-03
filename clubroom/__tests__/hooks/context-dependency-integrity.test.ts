import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('role and child scoped hooks depend on the current context objects they read', () => {
  const discoverSource = readProjectFile('hooks/use-bookings-discover.ts');
  const bookingsSource = readProjectFile('hooks/use-bookings.ts');
  const childrenHubSource = readProjectFile('hooks/use-children-hub.ts');
  const clubHubSource = readProjectFile('hooks/use-club-hub.ts');
  const sessionDetailSource = readProjectFile('hooks/use-session-detail-modal.ts');

  assert.match(
    discoverSource,
    /\}, \[activeChildId, contextChildren, currentUser, hasParentInviteScope\]\);/,
  );
  assert.match(
    bookingsSource,
    /\}, \[contextChildren, currentUser, hasParentInviteScope, hasChildProfiles, isCoachUser\]\);/,
  );
  assert.match(bookingsSource, /businessFilter,\s*contextChildren,\s*currentUser,/);
  assert.match(childrenHubSource, /\}, \[contextChildren, currentUser\?\.id\]\);/);
  assert.match(clubHubSource, /\}, \[availableUsers, userClubs\]\);/);
  assert.match(sessionDetailSource, /\[contextChildren\],\s*\);/);
});

test('match context selection does not close over the interactive squad setter', () => {
  const source = readProjectFile('hooks/use-create-match.ts');

  assert.doesNotMatch(source, /updateSelectedSquadId\(routeSquad\?\.id/);
  assert.match(source, /setSelectedSquadId\(routeSquad\?\.id \?\? null\);/);
  assert.match(source, /if \(!routeSquad\) \{\s*setSquadMemberCount\(0\);/);
});
