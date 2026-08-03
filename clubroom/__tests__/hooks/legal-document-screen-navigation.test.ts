import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('legal document routes have a direct-entry back fallback', () => {
  const source = readProjectFile('components/settings/legal-document-screen.tsx');

  assert.match(source, /if \(router\.canGoBack\(\)\)/);
  assert.match(source, /router\.back\(\)/);
  assert.match(source, /router\.replace\(Routes\.SETTINGS\)/);
  assert.doesNotMatch(source, /onBackPress=\{\(\) => router\.back\(\)\}/);
});

test('terms uses a compact route title that fits the shared header', () => {
  const source = readProjectFile('app/settings/terms.tsx');

  assert.match(source, /title="Terms"/);
  assert.doesNotMatch(source, /title="Terms of Service"/);
});
