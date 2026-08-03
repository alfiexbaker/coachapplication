import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('group session detail surfaces live cancellation policy failures in API mode', () => {
  const source = readSource('hooks/use-group-session.ts');
  const loadStart = source.indexOf('const loadData = async () => {');
  const policyStart = source.indexOf(
    'const policyResult = await cancellationService.getCancellationPolicy',
    loadStart,
  );
  const returnStart = source.indexOf('return ok<GroupSessionData>({', policyStart);

  assert.ok(loadStart >= 0, 'test should find group session loader');
  assert.ok(policyStart > loadStart, 'test should find cancellation policy read');
  assert.ok(returnStart > policyStart, 'test should find load success boundary');

  const policyBlock = source.slice(policyStart, returnStart);

  assert.ok(
    source.includes('import { api } from "@/constants/config";'),
    'group session loader should branch on runtime mode',
  );
  assert.ok(
    policyBlock.includes('} else if (!api.useMock) {\n          throw new Error(policyResult.error.message);\n        }'),
    'API mode must surface cancellation policy read failures',
  );
  assert.equal(
    policyBlock.includes('default to null if fails'),
    false,
    'API mode must not document live policy failures as optional empty state',
  );
});
