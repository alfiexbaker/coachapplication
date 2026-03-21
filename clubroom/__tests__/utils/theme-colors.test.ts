import assert from 'node:assert/strict';
import test from 'node:test';

import { withAlpha } from '@/constants/theme';

test('withAlpha preserves valid hex colors', () => {
  assert.equal(withAlpha('#FF0000', 0.5), 'rgba(255, 0, 0, 0.5)');
  assert.equal(withAlpha('#00FF00', 0.25), 'rgba(0, 255, 0, 0.25)');
});

test('withAlpha falls back safely for missing or malformed colors', () => {
  assert.equal(withAlpha(undefined, 0.4), 'rgba(15, 23, 42, 0.4)');
  assert.equal(withAlpha('bad-color', 0.4), 'rgba(15, 23, 42, 0.4)');
  assert.equal(withAlpha('#ABC', 0.4), 'rgba(170, 187, 204, 0.4)');
});
