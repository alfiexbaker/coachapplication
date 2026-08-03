import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('child context fails closed when live squad membership enrichment fails', () => {
  const source = readSource('hooks/use-child-context.tsx');
  const membershipRead = source.indexOf('childService.getSquadMemberships(athleteId)');
  const membershipFailure = source.indexOf('if (!result.success)', membershipRead);
  const membershipThrow = source.indexOf('throw new Error(result.error.message)', membershipFailure);
  const catchStart = source.indexOf('async (error) => {', membershipThrow);
  const catchEnd = source.indexOf('},\n    () => {', catchStart);
  const catchBlock = source.slice(catchStart, catchEnd);

  assert.ok(membershipRead >= 0, 'test should find live squad membership read');
  assert.ok(membershipFailure > membershipRead, 'test should find membership failure branch');
  assert.ok(
    membershipThrow > membershipFailure,
    'membership failures must fail the child context load instead of being swallowed',
  );
  assert.equal(
    catchBlock.includes('reconcileChildren(childRefs, [])'),
    false,
    'API child context failures must not rebuild children from auth refs alone',
  );
  assert.ok(
    catchBlock.includes('setError(') &&
      catchBlock.includes('setChildInfos([])') &&
      catchBlock.includes('setActiveChildIdState(null)'),
    'API child context failures should clear stale child context and expose an error',
  );
});
