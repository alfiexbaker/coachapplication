import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { apiClient } from '../../services/api-client';

describe('apiClient storage primitives', () => {
  beforeEach(async () => {
    await apiClient.remove('ss_test_key');
    await apiClient.remove('ss_test_obj');
    await apiClient.remove('ss_remove_key');
  });

  test('stores and retrieves objects and arrays', async () => {
    await apiClient.set('ss_test_obj', { value: 1 });
    await apiClient.set('ss_test_key', ['a', 'b', 'c']);

    const objectValue = await apiClient.get('ss_test_obj', null);
    const arrayValue = await apiClient.get<string[]>('ss_test_key', []);

    assert.deepEqual(objectValue, { value: 1 });
    assert.deepEqual(arrayValue, ['a', 'b', 'c']);
  });

  test('returns fallback for missing key', async () => {
    const value = await apiClient.get('ss_missing', 'fallback');
    assert.equal(value, 'fallback');
  });

  test('removes values', async () => {
    await apiClient.set('ss_remove_key', true);
    await apiClient.remove('ss_remove_key');

    const value = await apiClient.get('ss_remove_key', false);
    assert.equal(value, false);
  });
});
