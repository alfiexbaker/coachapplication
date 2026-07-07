import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('seen statuses remain local walkthrough state in API mode', () => {
  const apiClientSource = readSource('services/api-client.ts');
  const serviceOwnershipSource = readSource('docs/architecture/service-ownership-map.md');
  const localKeysBlock = apiClientSource.match(
    /const CLIENT_LOCAL_STORAGE_KEYS = new Set<string>\(\[([\s\S]*?)\]\);/,
  );

  assert.ok(localKeysBlock, 'expected CLIENT_LOCAL_STORAGE_KEYS block');
  assert.ok(
    localKeysBlock[1]?.includes('STORAGE_KEYS.SEEN_STATUSES'),
    'walkthrough seen state should not trigger explicit-v1-required warnings in API mode',
  );
  assert.ok(
    serviceOwnershipSource.includes('is not notification or message-read authority'),
    'service ownership docs should explain why seen statuses stay local',
  );
});
