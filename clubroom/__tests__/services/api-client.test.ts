/**
 * API Client Tests
 *
 * Tests for apiClient (mock mode), generateId, update, and isMockMode.
 * Note: real API mode (apiFetch) is not testable without network mocks,
 * so we test the mock-mode paths which use AsyncStorage.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { apiClient } from '../../services/api-client';

describe('apiClient', () => {
  // Clear storage between tests
  beforeEach(async () => {
    // Remove known test keys
    await apiClient.remove('test_key');
    await apiClient.remove('test_list');
    await apiClient.remove('test_update');
    await apiClient.remove('test_remove');
  });

  // ---------------------------------------------------------------------------
  // isMockMode
  // ---------------------------------------------------------------------------

  describe('isMockMode', () => {
    test('returns a boolean', () => {
      assert.equal(typeof apiClient.isMockMode, 'boolean');
    });
  });

  // ---------------------------------------------------------------------------
  // get / set
  // ---------------------------------------------------------------------------

  describe('get + set', () => {
    test('set stores data and get retrieves it', async () => {
      await apiClient.set('test_key', { name: 'Alice', age: 30 });
      const result = await apiClient.get('test_key', null);

      assert.deepEqual(result, { name: 'Alice', age: 30 });
    });

    test('get returns fallback when key does not exist', async () => {
      const result = await apiClient.get('nonexistent_key_xyz', 'default');
      assert.equal(result, 'default');
    });

    test('set overwrites existing data', async () => {
      await apiClient.set('test_key', { v: 1 });
      await apiClient.set('test_key', { v: 2 });

      const result = await apiClient.get('test_key', null);
      assert.deepEqual(result, { v: 2 });
    });

    test('stores and retrieves arrays', async () => {
      const items = [
        { id: 'a', name: 'Item A' },
        { id: 'b', name: 'Item B' },
      ];
      await apiClient.set('test_list', items);
      const result = await apiClient.get('test_list', []);

      assert.equal(result.length, 2);
      assert.equal((result[0] as { id: string }).id, 'a');
      assert.equal((result[1] as { name: string }).name, 'Item B');
    });

    test('stores and retrieves primitive values', async () => {
      await apiClient.set('test_key', 42);
      assert.equal(await apiClient.get('test_key', 0), 42);

      await apiClient.set('test_key', true);
      assert.equal(await apiClient.get('test_key', false), true);

      await apiClient.set('test_key', 'hello');
      assert.equal(await apiClient.get('test_key', ''), 'hello');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    test('applies updater function to current value', async () => {
      await apiClient.set('test_update', [1, 2, 3]);

      const result = await apiClient.update<number[]>(
        'test_update',
        (current) => [...current, 4],
        []
      );

      assert.deepEqual(result, [1, 2, 3, 4]);

      // Verify persisted
      const stored = await apiClient.get('test_update', []);
      assert.deepEqual(stored, [1, 2, 3, 4]);
    });

    test('uses fallback when key does not exist', async () => {
      const result = await apiClient.update<number>(
        'test_update',
        (n) => n + 10,
        5
      );

      assert.equal(result, 15);
    });

    test('read-modify-write is atomic in sequence', async () => {
      await apiClient.set('test_update', { count: 0 });

      await apiClient.update<{ count: number }>(
        'test_update',
        (c) => ({ count: c.count + 1 }),
        { count: 0 }
      );
      await apiClient.update<{ count: number }>(
        'test_update',
        (c) => ({ count: c.count + 1 }),
        { count: 0 }
      );

      const result = await apiClient.get('test_update', { count: -1 });
      assert.equal(result.count, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe('remove', () => {
    test('removes a key so get returns fallback', async () => {
      await apiClient.set('test_remove', 'data');
      await apiClient.remove('test_remove');

      const result = await apiClient.get('test_remove', 'gone');
      assert.equal(result, 'gone');
    });

    test('removing a non-existent key does not throw', async () => {
      await assert.doesNotReject(apiClient.remove('nonexistent_remove_key'));
    });
  });

  // ---------------------------------------------------------------------------
  // generateId
  // ---------------------------------------------------------------------------

  describe('generateId', () => {
    test('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(apiClient.generateId());
      }
      assert.equal(ids.size, 100, 'All 100 generated IDs should be unique');
    });

    test('includes prefix when provided', () => {
      const id = apiClient.generateId('booking');
      assert.ok(id.startsWith('booking_'), `Expected prefix "booking_", got: ${id}`);
    });

    test('works without prefix', () => {
      const id = apiClient.generateId();
      assert.ok(id.length > 5, 'ID should be non-trivial length');
      assert.ok(!id.startsWith('undefined'), 'Should not contain "undefined"');
    });

    test('IDs contain timestamp and random component', () => {
      const id = apiClient.generateId('test');
      const parts = id.split('_');
      // Structure: prefix_timestamp_random
      assert.ok(parts.length >= 3, `Expected at least 3 parts, got: ${parts.length}`);
    });
  });
});
