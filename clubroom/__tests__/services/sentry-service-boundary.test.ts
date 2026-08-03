import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('Sentry app-hang tracking excludes development clients only', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'services/observability/sentry-service.ts'),
    'utf8',
  );

  assert.match(
    source,
    /enableAppHangTracking:\s*!__DEV__\s*,/,
    'development clients must not emit native app-hang issues',
  );
  assert.doesNotMatch(
    source,
    /enableAppHangTracking:\s*false\s*,/,
    'release builds must retain native app-hang monitoring',
  );
});
