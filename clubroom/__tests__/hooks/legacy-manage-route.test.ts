import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('legacy manage links replace into the canonical bookings console', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app/manage/[legacy].tsx'), 'utf8');

  assert.ok(source.includes("import { Redirect } from 'expo-router';"));
  assert.ok(source.includes('return <Redirect href={Routes.MANAGE_BOOKINGS} />;'));
  assert.equal(source.includes('apiFetch'), false, 'legacy redirect must not make an independent API request');
});
