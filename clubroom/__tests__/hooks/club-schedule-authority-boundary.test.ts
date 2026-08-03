import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('club schedule isolates the current actor and derives each create control from its authority', () => {
  const hook = readSource('hooks/use-club-schedule.ts');
  const screen = readSource('components/club/ClubScheduleScreen.tsx');

  assert.ok(
    hook.includes(
      "membership: result.data.memberships.find((candidate) => candidate.clubId === clubId) ?? null,",
    ),
  );
  assert.equal(hook.includes('isMembershipForUser'), false);
  assert.ok(
    hook.includes(
      "dataKey: `club-schedule:${currentUser?.id ?? 'anonymous'}:${clubId ?? 'missing'}:${squadId ?? 'none'}`",
    ),
  );

  assert.ok(screen.includes("import { isClubStaffRole } from '@/contracts/club-governance';"));
  assert.ok(screen.includes('const canCreateTraining = canCreateClubScheduleItems(schedule.membership);'));
  assert.ok(screen.includes('const canCreateEventOrMatch ='));
  assert.ok(screen.includes('schedule.club?.canManageMatches === true'));
  assert.ok(screen.includes("schedule.membership?.status === 'active' && isClubStaffRole(schedule.membership.role)"));
  assert.ok(screen.includes('{canCreateEventOrMatch && ('));
  assert.ok(screen.includes('{canCreateTraining && ('));
  assert.equal(screen.includes('canCreateItems'), false);
});
