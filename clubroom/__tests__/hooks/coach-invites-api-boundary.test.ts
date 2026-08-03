import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('coach invite deep links surface API join-code outcomes', () => {
  const source = readSource('hooks/use-coach-invites.ts');
  const joinCallStart = source.indexOf(
    'const joinResult = await clubAuthorityService.joinWithCode(normalizedCode);',
  );
  const apiBranchStart = source.lastIndexOf('if (!api.useMock) {', joinCallStart);
  const mockBranchStart = source.indexOf('const existing = await apiClient.get', joinCallStart);
  const catchStart = source.indexOf('} catch (incomingError) {', mockBranchStart);

  assert.ok(apiBranchStart >= 0, 'test should find API invite-code branch');
  assert.ok(mockBranchStart > apiBranchStart, 'test should find mock invite-code branch');
  assert.ok(catchStart > mockBranchStart, 'test should find incoming invite catch branch');

  const apiBranch = source.slice(apiBranchStart, mockBranchStart);
  const catchBranch = source.slice(catchStart, source.indexOf('}', catchStart + 1) + 1);

  assert.ok(
    apiBranch.includes(
      'const joinResult = await clubAuthorityService.joinWithCode(normalizedCode);',
    ),
    'API mode should use the /v1 club join authority',
  );
  assert.match(
    apiBranch,
    /if \(!joinResult\.success\) \{[\s\S]*handledIncomingCodeRef\.current = null;[\s\S]*uiFeedback\.showToast\(joinResult\.error\.message, 'error'\);[\s\S]*return;/,
    'failed live join-code responses must be visible and retryable',
  );
  assert.match(
    apiBranch,
    /if \(joinResult\.data\.outcome === 'invite_pending'\) \{[\s\S]*uiFeedback\.showToast\(`Review the \$\{joinResult\.data\.club\.name\} invite below\.`\);[\s\S]*onRefresh\(\);[\s\S]*return;/,
    'staff invite outcomes should refresh the backend-owned pending invite list',
  );
  assert.match(
    apiBranch,
    /router\.push\(Routes\.club\(joinResult\.data\.club\.id\)\);/,
    'direct join outcomes should route to backend-owned club detail',
  );
  assert.doesNotMatch(
    apiBranch,
    /apiClient\.get|apiClient\.set|socialFeedService/,
    'API mode must not use local invite mirrors for incoming codes',
  );
  assert.match(
    catchBranch,
    /handledIncomingCodeRef\.current = null;[\s\S]*uiFeedback\.showToast\('Failed to process club invite\. Please try again\.', 'error'\);/,
    'unexpected API processing failures must not be swallowed',
  );
});
