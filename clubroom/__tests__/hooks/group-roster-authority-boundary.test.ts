import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('group roster cache is scoped to the authenticated actor', () => {
  const source = readSource('hooks/use-group-roster.ts');

  assert.ok(source.includes("import { useAuth } from '@/hooks/use-auth';"));
  assert.ok(source.includes('const { currentUser } = useAuth();'));
  assert.ok(source.includes('deps: [sessionId, currentUser?.id]'));
  assert.ok(
    source.includes(
      "dataKey: `group-roster:${currentUser?.id ?? 'anonymous'}:${sessionId ?? 'missing'}`",
    ),
  );
});

test('group roster only exposes actions the current actor can perform', () => {
  const source = readSource('app/group-sessions/[id]/roster.tsx');

  assert.ok(
    source.includes('const canManageRoster = Boolean(isAssignedCoach || isAdmin(currentUser));'),
  );
  assert.ok(source.includes('canManageRoster ? handleMarkAttendance : undefined'));
  assert.ok(source.includes('canWriteCoachPrivateData ? handleRecognise : undefined'));
  assert.ok(source.includes('visible={canManageRoster && showRollCall}'));
  assert.ok(source.includes('onReportInjury={canReportInjury ? openInjuryReport : undefined}'));
  assert.ok(source.includes('registration.parentId === currentUser?.id'));
  assert.ok(source.includes('registration.athleteId === currentUser?.athleteId'));
});

test('roster controls and missing guardian identities are accessible and truthful', () => {
  const route = readSource('app/group-sessions/[id]/roster.tsx');
  const card = readSource('components/group/participant-card.tsx');
  const rollCallList = readSource('components/group/roll-call-participant-list.tsx');

  assert.ok(route.includes('accessibilityLabel="Start roll call"'));
  assert.ok(route.includes('accessibilityState={{ selected: item.isActive }}'));
  assert.ok(card.includes('accessibilityLabel={`Cancel registration for ${athleteName}`}'));
  assert.ok(card.includes('const parentName = registration.parentName?.trim();'));
  assert.ok(rollCallList.includes('const parentName = registration.parentName?.trim() || null;'));
  assert.ok(rollCallList.includes('{item.onReportInjury ? ('));
});
