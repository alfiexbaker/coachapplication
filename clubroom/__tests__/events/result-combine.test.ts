import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { combineResults, err, ok, type ServiceError } from '@/types/result';

describe('combineResults', () => {
  test('returns tuple data when all results succeed', () => {
    const combined = combineResults([
      ok({ id: 'one' }),
      ok(['a', 'b']),
      ok(3),
    ] as const);

    assert.equal(combined.success, true);
    if (!combined.success) return;

    assert.deepEqual(combined.data[0], { id: 'one' });
    assert.deepEqual(combined.data[1], ['a', 'b']);
    assert.equal(combined.data[2], 3);
  });

  test('returns first error encountered', () => {
    const firstError: ServiceError = { code: 'VALIDATION', message: 'first failed' };
    const secondError: ServiceError = { code: 'NETWORK', message: 'second failed' };

    const combined = combineResults([
      ok('ok'),
      err(firstError),
      err(secondError),
    ] as const);

    assert.equal(combined.success, false);
    if (combined.success) return;
    assert.equal(combined.error, firstError);
  });
});
