import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf8');

test('member management derives API authority from the returned viewer membership and keys state by actor', () => {
  const hook = readSource('hooks/use-member-management.ts');
  const screen = readSource('app/club/[clubId]/member/[memberId].tsx');

  assert.match(
    hook,
    /memberships\.find\(\(membership\) => membership\.clubId === clubId\)\?\.role/,
  );
  assert.equal(hook.includes('membership.userId === currentUser.id'), false);
  assert.ok(
    hook.includes(
      "dataKey: `member-management:${currentUser?.id ?? 'anonymous'}:${clubId ?? 'missing'}:${memberId ?? 'missing'}`",
    ),
  );
  assert.ok(screen.includes('You do not have permission to manage this member.'));
  assert.equal(screen.includes('Only club admins and coaches can manage member settings.'), false);
});
