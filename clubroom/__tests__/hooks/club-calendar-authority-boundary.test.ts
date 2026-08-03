import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('club calendar fails invalid routes and isolates calendar frames by current actor', () => {
  const hook = readSource('hooks/use-club-calendar.ts');
  const screen = readSource('app/club/[clubId]/calendar.tsx');

  assert.ok(hook.includes("import { useRequiredParam } from '@/hooks/use-required-param';"));
  assert.ok(hook.includes("import { useAuth } from '@/hooks/use-auth';"));
  assert.ok(hook.includes("const clubIdParam = useRequiredParam('clubId');"));
  assert.ok(hook.includes("return Promise.resolve(err(validationError('Invalid club calendar link.')));"));
  assert.ok(
    hook.includes(
      "const calendarDataKey = `club-calendar:${currentUser?.id ?? 'anonymous'}:${clubId ?? 'missing'}:${year}-${month}:${squadFilter ?? 'all'}`;",
    ),
  );
  assert.ok(
    hook.includes('deps: [clubId, clubIdParam.valid, currentUser?.id, year, month, squadFilter]'),
  );

  assert.equal(screen.includes("if (status === 'loading')"), false);
  assert.ok(screen.includes("loading={status === 'loading' || showSectionSkeleton}"));
  assert.ok(screen.includes("status !== 'loading' && !showSectionSkeleton"));
});
