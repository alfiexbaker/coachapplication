"use strict";
/**
 * Base Service Tests
 *
 * Tests for the abstract BaseService class via a concrete TestService subclass.
 * Covers CRUD operations, caching, validation, query options, bulk operations,
 * Result<T> pattern, and event emissions.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const base_service_1 = require("../../services/base-service");
const event_bus_1 = require("../../services/event-bus");
class TestService extends base_service_1.BaseService {
    // Use mock data mode to avoid cross-test leakage via AsyncStorage
    constructor() {
        super();
        this.storageKey = 'test_items_base_svc';
        this.entityName = 'TestItem';
        this.useMock = true;
        this.mockData = [];
    }
}
(0, node_test_1.describe)('BaseService', () => {
    let service;
    (0, node_test_1.beforeEach)(() => {
        service = new TestService();
        event_bus_1.eventBus.clearAll();
    });
    // ---------------------------------------------------------------------------
    // create
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('create', () => {
        (0, node_test_1.default)('creates an entity with auto-generated id and timestamps', async () => {
            const result = await service.create({ name: 'Alpha', category: 'A', score: 10 });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.ok(result.data.id, 'Should have an id');
            strict_1.default.ok(result.data.id.startsWith('testitem_'), `ID should start with "testitem_", got: ${result.data.id}`);
            strict_1.default.ok(result.data.createdAt, 'Should have createdAt');
            strict_1.default.ok(result.data.updatedAt, 'Should have updatedAt');
            strict_1.default.equal(result.data.name, 'Alpha');
            strict_1.default.equal(result.data.category, 'A');
            strict_1.default.equal(result.data.score, 10);
        });
        (0, node_test_1.default)('emits a created event', async () => {
            let emitted = null;
            event_bus_1.eventBus.on('testitem:created', (data) => {
                emitted = data;
            });
            await service.create({ name: 'Beta', category: 'B', score: 20 });
            strict_1.default.ok(emitted, 'Should have emitted testitem:created');
            strict_1.default.equal(emitted.name, 'Beta');
        });
        (0, node_test_1.default)('multiple creates produce unique IDs', async () => {
            const results = await Promise.all([
                service.create({ name: 'A', category: 'X', score: 1 }),
                service.create({ name: 'B', category: 'X', score: 2 }),
                service.create({ name: 'C', category: 'X', score: 3 }),
            ]);
            const ids = results
                .filter((r) => r.success)
                .map((r) => r.data.id);
            strict_1.default.equal(new Set(ids).size, 3, 'All IDs should be unique');
        });
    });
    // ---------------------------------------------------------------------------
    // getAll
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getAll', () => {
        (0, node_test_1.default)('returns empty array when no entities exist', async () => {
            const result = await service.getAll();
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.deepEqual(result.data, []);
        });
        (0, node_test_1.default)('returns all created entities', async () => {
            await service.create({ name: 'A', category: 'X', score: 1 });
            await service.create({ name: 'B', category: 'Y', score: 2 });
            const result = await service.getAll();
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.length, 2);
        });
        (0, node_test_1.default)('filters by partial match', async () => {
            await service.create({ name: 'A', category: 'tech', score: 5 });
            await service.create({ name: 'B', category: 'art', score: 8 });
            await service.create({ name: 'C', category: 'tech', score: 3 });
            const result = await service.getAll({ filter: { category: 'tech' } });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.length, 2);
            strict_1.default.ok(result.data.every((d) => d.category === 'tech'));
        });
        (0, node_test_1.default)('sorts ascending by field', async () => {
            await service.create({ name: 'C', category: 'X', score: 30 });
            await service.create({ name: 'A', category: 'X', score: 10 });
            await service.create({ name: 'B', category: 'X', score: 20 });
            const result = await service.getAll({ sort: 'score', sortDirection: 'asc' });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.deepEqual(result.data.map((d) => d.score), [10, 20, 30]);
        });
        (0, node_test_1.default)('sorts descending by field', async () => {
            await service.create({ name: 'C', category: 'X', score: 30 });
            await service.create({ name: 'A', category: 'X', score: 10 });
            await service.create({ name: 'B', category: 'X', score: 20 });
            const result = await service.getAll({ sort: 'score', sortDirection: 'desc' });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.deepEqual(result.data.map((d) => d.score), [30, 20, 10]);
        });
        (0, node_test_1.default)('applies limit', async () => {
            for (let i = 0; i < 5; i++) {
                await service.create({ name: `Item ${i}`, category: 'X', score: i });
            }
            const result = await service.getAll({ limit: 2 });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.length, 2);
        });
        (0, node_test_1.default)('applies offset', async () => {
            for (let i = 0; i < 5; i++) {
                await service.create({ name: `Item ${i}`, category: 'X', score: i });
            }
            const result = await service.getAll({ offset: 3 });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.length, 2);
        });
        (0, node_test_1.default)('applies offset and limit together', async () => {
            for (let i = 0; i < 10; i++) {
                await service.create({ name: `Item ${i}`, category: 'X', score: i });
            }
            const result = await service.getAll({ offset: 2, limit: 3 });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.length, 3);
        });
    });
    // ---------------------------------------------------------------------------
    // getById
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getById', () => {
        (0, node_test_1.default)('returns entity by ID', async () => {
            const createResult = await service.create({ name: 'Find Me', category: 'X', score: 99 });
            strict_1.default.equal(createResult.success, true);
            if (!createResult.success)
                return;
            const result = await service.getById(createResult.data.id);
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.name, 'Find Me');
            strict_1.default.equal(result.data.score, 99);
        });
        (0, node_test_1.default)('returns NOT_FOUND error for non-existent ID', async () => {
            const result = await service.getById('nonexistent_id_xyz');
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    // ---------------------------------------------------------------------------
    // update
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('update', () => {
        (0, node_test_1.default)('updates entity fields', async () => {
            const createResult = await service.create({ name: 'Original', category: 'X', score: 1 });
            if (!createResult.success)
                return;
            const updateResult = await service.update(createResult.data.id, { name: 'Updated', score: 100 });
            strict_1.default.equal(updateResult.success, true);
            if (!updateResult.success)
                return;
            strict_1.default.equal(updateResult.data.name, 'Updated');
            strict_1.default.equal(updateResult.data.score, 100);
            strict_1.default.equal(updateResult.data.category, 'X'); // unchanged
            strict_1.default.equal(updateResult.data.id, createResult.data.id); // ID preserved
        });
        (0, node_test_1.default)('sets updatedAt timestamp', async () => {
            const createResult = await service.create({ name: 'Test', category: 'X', score: 0 });
            if (!createResult.success)
                return;
            const originalUpdatedAt = createResult.data.updatedAt;
            // Small delay to ensure different timestamp
            await new Promise((resolve) => setTimeout(resolve, 10));
            const updateResult = await service.update(createResult.data.id, { score: 5 });
            if (!updateResult.success)
                return;
            strict_1.default.notEqual(updateResult.data.updatedAt, originalUpdatedAt);
        });
        (0, node_test_1.default)('prevents ID change', async () => {
            const createResult = await service.create({ name: 'Test', category: 'X', score: 0 });
            if (!createResult.success)
                return;
            const originalId = createResult.data.id;
            const updateResult = await service.update(originalId, { id: 'hacked_id' });
            if (!updateResult.success)
                return;
            strict_1.default.equal(updateResult.data.id, originalId);
        });
        (0, node_test_1.default)('emits an updated event', async () => {
            let emitted = null;
            event_bus_1.eventBus.on('testitem:updated', (data) => {
                emitted = data;
            });
            const createResult = await service.create({ name: 'Test', category: 'X', score: 0 });
            if (!createResult.success)
                return;
            await service.update(createResult.data.id, { score: 50 });
            strict_1.default.ok(emitted, 'Should have emitted testitem:updated');
            strict_1.default.equal(emitted.score, 50);
        });
        (0, node_test_1.default)('returns NOT_FOUND for non-existent ID', async () => {
            const result = await service.update('nonexistent_xyz', { name: 'Nope' });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    // ---------------------------------------------------------------------------
    // delete
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('delete', () => {
        (0, node_test_1.default)('removes entity', async () => {
            const createResult = await service.create({ name: 'Delete Me', category: 'X', score: 0 });
            if (!createResult.success)
                return;
            const deleteResult = await service.delete(createResult.data.id);
            strict_1.default.equal(deleteResult.success, true);
            const getResult = await service.getById(createResult.data.id);
            strict_1.default.equal(getResult.success, false);
        });
        (0, node_test_1.default)('emits a deleted event', async () => {
            let emitted = null;
            event_bus_1.eventBus.on('testitem:deleted', (data) => {
                emitted = data;
            });
            const createResult = await service.create({ name: 'Del', category: 'X', score: 0 });
            if (!createResult.success)
                return;
            await service.delete(createResult.data.id);
            strict_1.default.ok(emitted, 'Should have emitted testitem:deleted');
            strict_1.default.equal(emitted.id, createResult.data.id);
        });
        (0, node_test_1.default)('returns NOT_FOUND for non-existent ID', async () => {
            const result = await service.delete('nonexistent_xyz');
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    // ---------------------------------------------------------------------------
    // exists
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('exists', () => {
        (0, node_test_1.default)('returns true for existing entity', async () => {
            const createResult = await service.create({ name: 'Exist', category: 'X', score: 0 });
            if (!createResult.success)
                return;
            strict_1.default.equal(await service.exists(createResult.data.id), true);
        });
        (0, node_test_1.default)('returns false for non-existent entity', async () => {
            strict_1.default.equal(await service.exists('nope_xyz'), false);
        });
    });
    // ---------------------------------------------------------------------------
    // count
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('count', () => {
        (0, node_test_1.default)('returns total count', async () => {
            await service.create({ name: 'A', category: 'X', score: 1 });
            await service.create({ name: 'B', category: 'Y', score: 2 });
            const result = await service.count();
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data, 2);
        });
        (0, node_test_1.default)('returns filtered count', async () => {
            await service.create({ name: 'A', category: 'tech', score: 1 });
            await service.create({ name: 'B', category: 'art', score: 2 });
            await service.create({ name: 'C', category: 'tech', score: 3 });
            const result = await service.count({ category: 'tech' });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data, 2);
        });
        (0, node_test_1.default)('returns 0 when empty', async () => {
            const result = await service.count();
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data, 0);
        });
    });
    // ---------------------------------------------------------------------------
    // findOne
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('findOne', () => {
        (0, node_test_1.default)('returns first matching entity', async () => {
            await service.create({ name: 'Alpha', category: 'tech', score: 10 });
            await service.create({ name: 'Beta', category: 'art', score: 20 });
            const result = await service.findOne({ category: 'art' });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data?.name, 'Beta');
        });
        (0, node_test_1.default)('returns null when no match', async () => {
            await service.create({ name: 'Alpha', category: 'tech', score: 10 });
            const result = await service.findOne({ category: 'nonexistent' });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data, null);
        });
    });
    // ---------------------------------------------------------------------------
    // createMany
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('createMany', () => {
        (0, node_test_1.default)('creates multiple entities at once', async () => {
            const result = await service.createMany([
                { name: 'A', category: 'X', score: 1 },
                { name: 'B', category: 'Y', score: 2 },
                { name: 'C', category: 'Z', score: 3 },
            ]);
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.length, 3);
            strict_1.default.ok(result.data.every((item) => item.id && item.createdAt));
        });
        (0, node_test_1.default)('all created entities are retrievable', async () => {
            await service.createMany([
                { name: 'A', category: 'X', score: 1 },
                { name: 'B', category: 'Y', score: 2 },
            ]);
            const allResult = await service.getAll();
            if (!allResult.success)
                return;
            strict_1.default.equal(allResult.data.length, 2);
        });
    });
    // ---------------------------------------------------------------------------
    // deleteMany
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('deleteMany', () => {
        (0, node_test_1.default)('deletes multiple entities by IDs', async () => {
            const r1 = await service.create({ name: 'A', category: 'X', score: 1 });
            const r2 = await service.create({ name: 'B', category: 'Y', score: 2 });
            const r3 = await service.create({ name: 'C', category: 'Z', score: 3 });
            if (!r1.success || !r2.success || !r3.success)
                return;
            const result = await service.deleteMany([r1.data.id, r3.data.id]);
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data, 2); // deleted count
            const allResult = await service.getAll();
            if (!allResult.success)
                return;
            strict_1.default.equal(allResult.data.length, 1);
            strict_1.default.equal(allResult.data[0].name, 'B');
        });
        (0, node_test_1.default)('returns 0 when no IDs match', async () => {
            await service.create({ name: 'A', category: 'X', score: 1 });
            const result = await service.deleteMany(['fake_id_1', 'fake_id_2']);
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data, 0);
        });
    });
    // ---------------------------------------------------------------------------
    // clear
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('clear', () => {
        (0, node_test_1.default)('removes all entities', async () => {
            await service.create({ name: 'A', category: 'X', score: 1 });
            await service.create({ name: 'B', category: 'Y', score: 2 });
            const clearResult = await service.clear();
            strict_1.default.equal(clearResult.success, true);
            const allResult = await service.getAll();
            if (!allResult.success)
                return;
            strict_1.default.equal(allResult.data.length, 0);
        });
    });
});
