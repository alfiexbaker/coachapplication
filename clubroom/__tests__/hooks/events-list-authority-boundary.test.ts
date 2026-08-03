import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('event list derives staff actions and draft visibility from club membership authority', () => {
  const screen = readSource('app/events/index.tsx');
  const sections = readSource('components/event/events-list-sections.tsx');

  assert.ok(screen.includes("import { isClubStaffRole } from '@/contracts/club-governance';"));
  assert.ok(screen.includes('function resolveEventListClub('));
  assert.ok(screen.includes("membership.status === 'active'"));
  assert.ok(screen.includes('isClubStaffRole(membership.role)'));
  assert.ok(screen.includes('clubs.find((candidate) => staffClubIds.has(candidate.id))'));
  assert.ok(screen.includes('canManageEvents: Boolean(club && staffClubIds.has(club.id))'));
  assert.ok(screen.includes('const canCreateEvent = data?.canManageEvents === true'));
  assert.ok(screen.includes("dataKey: `events-list:${currentUser?.id ?? 'anonymous'}`"));
  assert.ok(screen.includes("if (!canCreateEvent && event.status === 'DRAFT')"));
  assert.equal(screen.includes("currentUser?.role === 'COACH'"), false);
  assert.equal(screen.includes('isCoach={canCreateEvent}'), false);

  assert.ok(sections.includes('canCreateEvent: boolean;'));
  assert.equal(sections.includes('isCoach'), false);
  assert.ok(sections.includes('{canCreateEvent ? ('));
});
