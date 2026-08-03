import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('consent dashboard fails closed when roster consent summary authority is unavailable', () => {
  const source = readProjectFile('hooks/use-consents.ts');
  const summaryFailureStart = source.indexOf('if (!summaryResult.success)');
  const returnStart = source.indexOf('return ok<ConsentsLoadData>', summaryFailureStart);

  assert.ok(summaryFailureStart >= 0, 'expected consent dashboard to check summary result');
  assert.ok(returnStart > summaryFailureStart, 'expected data return after summary authority check');

  const beforeReturn = source.slice(summaryFailureStart, returnStart);

  assert.equal(
    source.includes('consentsResult.success ? consentsResult.data : []'),
    false,
    'roster consent authority failures must not render as an empty consent list',
  );
  assert.equal(
    source.includes('summaryResult.success ? summaryResult.data : null'),
    false,
    'summary authority failures must not render as a missing summary',
  );
  assert.ok(
    beforeReturn.includes('return err(summaryResult.error);'),
    'summary authority failure should fail the consent dashboard load',
  );
  assert.ok(
    source.includes('consents: consentsResult.data') &&
      source.includes('summary: summaryResult.data'),
    'successful roster consent reads should render authoritative /v1 rows and summary',
  );
});
