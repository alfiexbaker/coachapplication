import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('availability mock fixtures are not initialized as API-mode caches', () => {
  const source = readProjectFile('services/availability-service.ts');

  assert.doesNotMatch(source, /let templatesCache:[^=]+=\s*\[\.\.\.MOCK_TEMPLATES\];/);
  assert.doesNotMatch(source, /let overridesCache:[^=]+=\s*\[\.\.\.MOCK_OVERRIDES\];/);
  assert.doesNotMatch(source, /return\s+\[\.\.\.MOCK_TEMPLATES\];/);
  assert.doesNotMatch(source, /return\s+\[\.\.\.MOCK_OVERRIDES\];/);

  assert.ok(source.includes('USE_MOCK ? [...MOCK_TEMPLATES] : []'));
  assert.ok(source.includes('USE_MOCK ? [...MOCK_OVERRIDES] : []'));
});
