import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('club detail derives viewer authority and only offers removal for manageable targets', () => {
  const hook = readSource('hooks/use-club-detail.ts');
  const screen = readSource('app/club/[id].tsx');
  const members = readSource('components/club/MembersPanel.tsx');
  const legacyHeader = readSource('components/club/club-feed-list-header.tsx');

  assert.ok(
    hook.includes('setMembership(result.data.memberships.find((candidate) => candidate.clubId === clubId));'),
  );
  assert.equal(hook.includes('isMembershipForUser'), false);
  assert.match(hook, /clubService\.canManageRole\(membership\.role, member\.role\)/);
  assert.ok(hook.includes("import { isClubStaffRole } from '@/contracts/club-governance';"));
  assert.ok(
    hook.includes(
      "const canCreateEvents = membership?.status === 'active' && isClubStaffRole(membership.role);",
    ),
  );
  assert.ok(hook.includes("uiFeedback.showToast('You do not have permission to manage this member.', 'error');"));
  assert.equal(hook.includes('Complete your account name before removing club members.'), false);
  assert.ok(screen.includes('canManageMember={canManageMember}'));
  assert.ok(screen.includes('(canCreatePosts || canCreateEvents)'));
  assert.ok(members.includes('canRemove={canManageMember(member)}'));
  assert.ok(members.includes("'Tap to view, long press to remove'"));
  assert.match(legacyHeader, /clubService\.canManageRole\(hub\.membership!\.role, member\.role\)/);
  assert.ok(legacyHeader.includes('canManageMember={canManageMember}'));
});
