/**
 * Base Service Tests
 *
 * Tests for the abstract BaseService class via a concrete TestService subclass.
 * Covers CRUD operations, caching, validation, query options, bulk operations,
 * Result<T> pattern, and event emissions.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { BaseService, type BaseEntity } from '../../services/base-service';
import { eventBus } from '../../services/event-bus';

// ---------------------------------------------------------------------------
// Test entity and concrete service
// ---------------------------------------------------------------------------

interface TestItem extends BaseEntity {
  name: string;
  category: string;
  score: number;
}

class TestService extends BaseService<TestItem> {
  protected storageKey = 'test_items_base_svc';
  protected entityName = 'TestItem';

  // Use mock data mode to avoid cross-test leakage via AsyncStorage
  constructor() {
    super();
    this.useMock = true;
    this.mockData = [];
  }
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService();
    eventBus.clearAll();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create', () => {
    test('creates an entity with auto-generated id and timestamps', async () => {
      const result = await service.create({ name: 'Alpha', category: 'A', score: 10 });

      assert.equal(result.success, true);
      if (!result.success) return;

      assert.ok(result.data.id, 'Should have an id');
      assert.ok(result.data.id.startsWith('testitem_'), `ID should start with "testitem_", got: ${result.data.id}`);
      assert.ok(result.data.createdAt, 'Should have createdAt');
      assert.ok(result.data.updatedAt, 'Should have updatedAt');
      assert.equal(result.data.name, 'Alpha');
      assert.equal(result.data.category, 'A');
      assert.equal(result.data.score, 10);
    });

    test('emits a created event', async () => {
      let emitted: unknown = null;
      eventBus.on('testitem:created', (data) => {
        emitted = data;
      });

      await service.create({ name: 'Beta', category: 'B', score: 20 });

      assert.ok(emitted, 'Should have emitted testitem:created');
      assert.equal((emitted as TestItem).name, 'Beta');
    });

    test('multiple creates produce unique IDs', async () => {
      const results = await Promise.all([
        service.create({ name: 'A', category: 'X', score: 1 }),
        service.create({ name: 'B', category: 'X', score: 2 }),
        service.create({ name: 'C', category: 'X', score: 3 }),
      ]);

      const ids = results
        .filter((r) => r.success)
        .map((r) => (r as { success: true; data: TestItem }).data.id);

      assert.equal(new Set(ids).size, 3, 'All IDs should be unique');
    });
  });

  // ---------------------------------------------------------------------------
  // getAll
  // ---------------------------------------------------------------------------

  describe('getAll', () => {
    test('returns empty array when no entities exist', async () => {
      const result = await service.getAll();
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.deepEqual(result.data, []);
    });

    test('returns all created entities', async () => {
      await service.create({ name: 'A', category: 'X', score: 1 });
      await service.create({ name: 'B', category: 'Y', score: 2 });

      const result = await service.getAll();
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.length, 2);
    });

    test('filters by partial match', async () => {
      await service.create({ name: 'A', category: 'tech', score: 5 });
      await service.create({ name: 'B', category: 'art', score: 8 });
      await service.create({ name: 'C', category: 'tech', score: 3 });

      const result = await service.getAll({ filter: { category: 'tech' } });
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.length, 2);
      assert.ok(result.data.every((d) => d.category === 'tech'));
    });

    test('sorts ascending by field', async () => {
      await service.create({ name: 'C', category: 'X', score: 30 });
      await service.create({ name: 'A', category: 'X', score: 10 });
      await service.create({ name: 'B', category: 'X', score: 20 });

      const result = await service.getAll({ sort: 'score', sortDirection: 'asc' });
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.deepEqual(
        result.data.map((d) => d.score),
        [10, 20, 30]
      );
    });

    test('sorts descending by field', async () => {
      await service.create({ name: 'C', category: 'X', score: 30 });
      await service.create({ name: 'A', category: 'X', score: 10 });
      await service.create({ name: 'B', category: 'X', score: 20 });

      const result = await service.getAll({ sort: 'score', sortDirection: 'desc' });
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.deepEqual(
        result.data.map((d) => d.score),
        [30, 20, 10]
      );
    });

    test('applies limit', async () => {
      for (let i = 0; i < 5; i++) {
        await service.create({ name: `Item ${i}`, category: 'X', score: i });
      }

      const result = await service.getAll({ limit: 2 });
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.length, 2);
    });

    test('applies offset', async () => {
      for (let i = 0; i < 5; i++) {
        await service.create({ name: `Item ${i}`, category: 'X', score: i });
      }

      const result = await service.getAll({ offset: 3 });
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.length, 2);
    });

    test('applies offset and limit together', async () => {
      for (let i = 0; i < 10; i++) {
        await service.create({ name: `Item ${i}`, category: 'X', score: i });
      }

      const result = await service.getAll({ offset: 2, limit: 3 });
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.length, 3);
    });
  });

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------

  describe('getById', () => {
    test('returns entity by ID', async () => {
      const createResult = await service.create({ name: 'Find Me', category: 'X', score: 99 });
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      const result = await service.getById(createResult.data.id);
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.name, 'Find Me');
      assert.equal(result.data.score, 99);
    });

    test('returns NOT_FOUND error for non-existent ID', async () => {
      const result = await service.getById('nonexistent_id_xyz');
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    test('updates entity fields', async () => {
      const createResult = await service.create({ name: 'Original', category: 'X', score: 1 });
      if (!createResult.success) return;

      const updateResult = await service.update(createResult.data.id, { name: 'Updated', score: 100 });
      assert.equal(updateResult.success, true);
      if (!updateResult.success) return;

      assert.equal(updateResult.data.name, 'Updated');
      assert.equal(updateResult.data.score, 100);
      assert.equal(updateResult.data.category, 'X'); // unchanged
      assert.equal(updateResult.data.id, createResult.data.id); // ID preserved
    });

    test('sets updatedAt timestamp', async () => {
      const createResult = await service.create({ name: 'Test', category: 'X', score: 0 });
      if (!createResult.success) return;
      const originalUpdatedAt = createResult.data.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updateResult = await service.update(createResult.data.id, { score: 5 });
      if (!updateResult.success) return;

      assert.notEqual(updateResult.data.updatedAt, originalUpdatedAt);
    });

    test('prevents ID change', async () => {
      const createResult = await service.create({ name: 'Test', category: 'X', score: 0 });
      if (!createResult.success) return;
      const originalId = createResult.data.id;

      const updateResult = await service.update(originalId, { id: 'hacked_id' } as Partial<TestItem>);
      if (!updateResult.success) return;

      assert.equal(updateResult.data.id, originalId);
    });

    test('emits an updated event', async () => {
      let emitted: unknown = null;
      eventBus.on('testitem:updated', (data) => {
        emitted = data;
      });

      const createResult = await service.create({ name: 'Test', category: 'X', score: 0 });
      if (!createResult.success) return;

      await service.update(createResult.data.id, { score: 50 });

      assert.ok(emitted, 'Should have emitted testitem:updated');
      assert.equal((emitted as TestItem).score, 50);
    });

    test('returns NOT_FOUND for non-existent ID', async () => {
      const result = await service.update('nonexistent_xyz', { name: 'Nope' });
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------

  describe('delete', () => {
    test('soft-deletes entity (hidden from getAll, still findable by ID)', async () => {
      const createResult = await service.create({ name: 'Delete Me', category: 'X', score: 0 });
      if (!createResult.success) return;

      const deleteResult = await service.delete(createResult.data.id);
      assert.equal(deleteResult.success, true);

      // Soft-deleted: still accessible via getById (has deletedAt set)
      const getResult = await service.getById(createResult.data.id);
      assert.equal(getResult.success, true);
      if (getResult.success) {
        assert.ok((getResult.data as unknown as Record<string, unknown>).deletedAt, 'Should have deletedAt');
      }

      // But hidden from getAll
      const allResult = await service.getAll();
      if (allResult.success) {
        const found = allResult.data.find((e: { id: string }) => e.id === createResult.data.id);
        assert.equal(found, undefined, 'Soft-deleted entity should not appear in getAll');
      }
    });

    test('emits a deleted event', async () => {
      let emitted: unknown = null;
      eventBus.on('testitem:deleted', (data) => {
        emitted = data;
      });

      const createResult = await service.create({ name: 'Del', category: 'X', score: 0 });
      if (!createResult.success) return;

      await service.delete(createResult.data.id);

      assert.ok(emitted, 'Should have emitted testitem:deleted');
      assert.equal((emitted as { id: string }).id, createResult.data.id);
    });

    test('returns NOT_FOUND for non-existent ID', async () => {
      const result = await service.delete('nonexistent_xyz');
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  // ---------------------------------------------------------------------------
  // exists
  // ---------------------------------------------------------------------------

  describe('exists', () => {
    test('returns true for existing entity', async () => {
      const createResult = await service.create({ name: 'Exist', category: 'X', score: 0 });
      if (!createResult.success) return;

      assert.equal(await service.exists(createResult.data.id), true);
    });

    test('returns false for non-existent entity', async () => {
      assert.equal(await service.exists('nope_xyz'), false);
    });
  });

  // ---------------------------------------------------------------------------
  // count
  // ---------------------------------------------------------------------------

  describe('count', () => {
    test('returns total count', async () => {
      await service.create({ name: 'A', category: 'X', score: 1 });
      await service.create({ name: 'B', category: 'Y', score: 2 });

      const result = await service.count();
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data, 2);
    });

    test('returns filtered count', async () => {
      await service.create({ name: 'A', category: 'tech', score: 1 });
      await service.create({ name: 'B', category: 'art', score: 2 });
      await service.create({ name: 'C', category: 'tech', score: 3 });

      const result = await service.count({ category: 'tech' });
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data, 2);
    });

    test('returns 0 when empty', async () => {
      const result = await service.count();
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------

  describe('findOne', () => {
    test('returns first matching entity', async () => {
      await service.create({ name: 'Alpha', category: 'tech', score: 10 });
      await service.create({ name: 'Beta', category: 'art', score: 20 });

      const result = await service.findOne({ category: 'art' });
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data?.name, 'Beta');
    });

    test('returns null when no match', async () => {
      await service.create({ name: 'Alpha', category: 'tech', score: 10 });

      const result = await service.findOne({ category: 'nonexistent' });
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data, null);
    });
  });

  // ---------------------------------------------------------------------------
  // createMany
  // ---------------------------------------------------------------------------

  describe('createMany', () => {
    test('creates multiple entities at once', async () => {
      const result = await service.createMany([
        { name: 'A', category: 'X', score: 1 },
        { name: 'B', category: 'Y', score: 2 },
        { name: 'C', category: 'Z', score: 3 },
      ]);

      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.length, 3);
      assert.ok(result.data.every((item) => item.id && item.createdAt));
    });

    test('all created entities are retrievable', async () => {
      await service.createMany([
        { name: 'A', category: 'X', score: 1 },
        { name: 'B', category: 'Y', score: 2 },
      ]);

      const allResult = await service.getAll();
      if (!allResult.success) return;
      assert.equal(allResult.data.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteMany
  // ---------------------------------------------------------------------------

  describe('deleteMany', () => {
    test('deletes multiple entities by IDs', async () => {
      const r1 = await service.create({ name: 'A', category: 'X', score: 1 });
      const r2 = await service.create({ name: 'B', category: 'Y', score: 2 });
      const r3 = await service.create({ name: 'C', category: 'Z', score: 3 });
      if (!r1.success || !r2.success || !r3.success) return;

      const result = await service.deleteMany([r1.data.id, r3.data.id]);
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data, 2); // deleted count

      const allResult = await service.getAll();
      if (!allResult.success) return;
      assert.equal(allResult.data.length, 1);
      assert.equal(allResult.data[0].name, 'B');
    });

    test('returns 0 when no IDs match', async () => {
      await service.create({ name: 'A', category: 'X', score: 1 });

      const result = await service.deleteMany(['fake_id_1', 'fake_id_2']);
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // clear
  // ---------------------------------------------------------------------------

  describe('clear', () => {
    test('removes all entities', async () => {
      await service.create({ name: 'A', category: 'X', score: 1 });
      await service.create({ name: 'B', category: 'Y', score: 2 });

      const clearResult = await service.clear();
      assert.equal(clearResult.success, true);

      const allResult = await service.getAll();
      if (!allResult.success) return;
      assert.equal(allResult.data.length, 0);
    });
  });
});
