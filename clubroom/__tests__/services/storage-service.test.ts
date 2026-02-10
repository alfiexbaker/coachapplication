/**
 * Storage Service Tests
 *
 * Tests for the StorageService wrapper around apiClient with
 * in-memory fallback behavior.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { storageService } from '../../services/storage-service';
import { apiClient } from '../../services/api-client';

describe('StorageService', () => {
  beforeEach(async () => {
    await apiClient.remove('ss_test_key');
    await apiClient.remove('ss_test_obj');
    await apiClient.remove('ss_remove_key');
  });

  // ---------------------------------------------------------------------------
  // setItem + getItem
  // ---------------------------------------------------------------------------

  describe('setItem + getItem', () => {
    test('stores and retrieves a value', async () => {
      await storageService.setItem('ss_test_key', { name: 'Alice' });
      const result = await storageService.getItem('ss_test_key', null);

      assert.deepEqual(result, { name: 'Alice' });
    });

    test('stores and retrieves an array', async () => {
      const items = ['a', 'b', 'c'];
      await storageService.setItem('ss_test_key', items);
      const result = await storageService.getItem<string[]>('ss_test_key', []);

      assert.deepEqual(result, ['a', 'b', 'c']);
    });

    test('returns fallback when key does not exist', async () => {
      const result = await storageService.getItem('ss_nonexistent', 'default_val');
      assert.equal(result, 'default_val');
    });

    test('overwrites existing data', async () => {
      await storageService.setItem('ss_test_obj', { v: 1 });
      await storageService.setItem('ss_test_obj', { v: 2 });

      const result = await storageService.getItem('ss_test_obj', null);
      assert.deepEqual(result, { v: 2 });
    });
  });

  // ---------------------------------------------------------------------------
  // removeItem
  // ---------------------------------------------------------------------------

  describe('removeItem', () => {
    test('removes a stored value', async () => {
      await storageService.setItem('ss_remove_key', 'data');
      await storageService.removeItem('ss_remove_key');

      const result = await storageService.getItem('ss_remove_key', 'gone');
      assert.equal(result, 'gone');
    });

    test('removing non-existent key does not throw', async () => {
      await assert.doesNotReject(storageService.removeItem('ss_nonexistent'));
    });
  });

  // ---------------------------------------------------------------------------
  // Primitive types
  // ---------------------------------------------------------------------------

  describe('primitive types', () => {
    test('stores and retrieves numbers', async () => {
      await storageService.setItem('ss_test_key', 42);
      const result = await storageService.getItem('ss_test_key', 0);
      assert.equal(result, 42);
    });

    test('stores and retrieves booleans', async () => {
      await storageService.setItem('ss_test_key', true);
      const result = await storageService.getItem('ss_test_key', false);
      assert.equal(result, true);
    });

    test('stores and retrieves strings', async () => {
      await storageService.setItem('ss_test_key', 'hello world');
      const result = await storageService.getItem('ss_test_key', '');
      assert.equal(result, 'hello world');
    });
  });
});
