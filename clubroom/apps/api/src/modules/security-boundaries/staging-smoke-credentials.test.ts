import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const stagingSmokePath = ['staging-smoke.ts', 'staging-smoke.js']
  .map((fileName) => path.resolve(testDirectory, '../../../scripts', fileName))
  .find((candidate) => fs.existsSync(candidate));

test('staging smoke sources account passwords from the owner-only credential file', () => {
  assert.ok(stagingSmokePath, 'staging smoke script must be present');
  const source = fs.readFileSync(stagingSmokePath, 'utf8');

  assert.match(source, /Staging credential file must be owner-only \(0600\)/);
  assert.doesNotMatch(source, /password\s*:\s*['"][^'"]+['"]/);
});
