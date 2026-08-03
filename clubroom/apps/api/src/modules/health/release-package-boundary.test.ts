import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  main?: string;
  scripts?: Record<string, string>;
  types?: string;
};

function readManifest(path: string): PackageManifest {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as PackageManifest;
}

test('production API processes use compiled JavaScript without the tsx loader', () => {
  const manifest = readManifest('../../../package.json');

  assert.equal(manifest.scripts?.start, 'node dist/server.js');
  assert.equal(manifest.scripts?.['worker:upload-scan'], 'node dist/workers/upload-scanner.js');
  assert.equal(manifest.dependencies?.tsx, undefined);
  assert.equal(manifest.devDependencies?.tsx, '^4.19.2');
});

test('local backend packages expose compiled JavaScript and declarations', () => {
  for (const packagePath of [
    '../../../../../packages/config/package.json',
    '../../../../../packages/db/package.json',
    '../../../../../packages/shared-contracts/package.json',
  ]) {
    const manifest = readManifest(packagePath);
    assert.equal(manifest.main, 'dist/index.js');
    assert.equal(manifest.types, 'dist/index.d.ts');
    assert.equal(manifest.scripts?.build, 'tsc -p tsconfig.json');
  }
});
