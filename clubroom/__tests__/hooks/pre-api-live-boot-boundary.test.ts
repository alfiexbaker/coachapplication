import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('app shell does not start pre-API live bootstrap code', () => {
  const rootLayout = readSource('app/_layout.tsx');
  const deletedServicePath = path.join(ROOT, 'services/pre-api-live-mode-service.ts');

  assert.equal(
    fs.existsSync(deletedServicePath),
    false,
    'pre-API live bootstrap service should not exist in runtime services',
  );
  assert.equal(
    rootLayout.includes('pre-api-live-mode-service'),
    false,
    'root layout must not import pre-API live bootstrap code',
  );
  assert.equal(
    rootLayout.includes('preApiLiveModeService'),
    false,
    'root layout must not start or stop pre-API live bootstrap code',
  );
});
