import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('favourite and follow mock fixtures are not initialized as API-mode caches', () => {
  const favouriteSource = readProjectFile('services/favourite-service.ts');
  const followSource = readProjectFile('services/follow-service.ts');

  assert.doesNotMatch(favouriteSource, /let favouritesCache:[^=]+=\s*\[\.\.\.MOCK_FAVOURITES\];/);
  assert.ok(favouriteSource.includes('apiClient.isMockMode ? [...MOCK_FAVOURITES] : []'));
  assert.ok(favouriteSource.includes('Favourite mock reset is only available in mock mode'));

  assert.doesNotMatch(followSource, /let followsCache:[^=]+=\s*\[\.\.\.MOCK_FOLLOWS\];/);
  assert.doesNotMatch(followSource, /return\s+\[\.\.\.MOCK_FOLLOWS\];/);
  assert.ok(followSource.includes('apiClient.isMockMode ? [...MOCK_FOLLOWS] : []'));
});
