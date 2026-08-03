import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('owner dashboard validates route and actor frame before sensitive backend projection', () => {
  const hook = readSource('hooks/use-club-dashboard.ts');
  const backend = readSource('apps/api/src/modules/coach-club/owner-dashboard.ts');

  assert.ok(hook.includes("import { useRequiredParam } from '@/hooks/use-required-param';"));
  assert.ok(hook.includes("const clubIdParam = useRequiredParam('clubId');"));
  assert.ok(hook.includes("return err(validationError('Invalid club dashboard link.'))"));
  assert.ok(
    hook.includes(
      "dataKey: `owner-dashboard:${currentUser?.id ?? 'anonymous'}:${resolvedClubId || 'missing'}`",
    ),
  );

  assert.ok(backend.includes('async function assertOwnerDashboardAccess'));
  assert.ok(backend.includes("assertOwnerDashboardRole(parseOrganizationRole(role) ?? '', false, params.clubId);"));
  const accessCheck = backend.indexOf('await assertOwnerDashboardAccess(params);');
  const projection = backend.indexOf('const [staffing, oversight, finance] = await Promise.all([');
  assert.ok(accessCheck >= 0);
  assert.ok(projection > accessCheck);
});
