"use strict";
/**
 * API Client Tests
 *
 * Tests for apiClient (mock mode), generateId, update, and isMockMode.
 * Note: real API mode (apiFetch) is not testable without network mocks,
 * so we test the mock-mode paths which use AsyncStorage.
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
const api_client_1 = require("../../services/api-client");
(0, node_test_1.describe)('apiClient', () => {
    // Clear storage between tests
    (0, node_test_1.beforeEach)(async () => {
        // Remove known test keys
        await api_client_1.apiClient.remove('test_key');
        await api_client_1.apiClient.remove('test_list');
        await api_client_1.apiClient.remove('test_update');
        await api_client_1.apiClient.remove('test_remove');
    });
    // ---------------------------------------------------------------------------
    // isMockMode
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('isMockMode', () => {
        (0, node_test_1.default)('returns a boolean', () => {
            strict_1.default.equal(typeof api_client_1.apiClient.isMockMode, 'boolean');
        });
    });
    // ---------------------------------------------------------------------------
    // get / set
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('get + set', () => {
        (0, node_test_1.default)('set stores data and get retrieves it', async () => {
            await api_client_1.apiClient.set('test_key', { name: 'Alice', age: 30 });
            const result = await api_client_1.apiClient.get('test_key', null);
            strict_1.default.deepEqual(result, { name: 'Alice', age: 30 });
        });
        (0, node_test_1.default)('get returns fallback when key does not exist', async () => {
            const result = await api_client_1.apiClient.get('nonexistent_key_xyz', 'default');
            strict_1.default.equal(result, 'default');
        });
        (0, node_test_1.default)('set overwrites existing data', async () => {
            await api_client_1.apiClient.set('test_key', { v: 1 });
            await api_client_1.apiClient.set('test_key', { v: 2 });
            const result = await api_client_1.apiClient.get('test_key', null);
            strict_1.default.deepEqual(result, { v: 2 });
        });
        (0, node_test_1.default)('stores and retrieves arrays', async () => {
            const items = [
                { id: 'a', name: 'Item A' },
                { id: 'b', name: 'Item B' },
            ];
            await api_client_1.apiClient.set('test_list', items);
            const result = await api_client_1.apiClient.get('test_list', []);
            strict_1.default.equal(result.length, 2);
            strict_1.default.equal(result[0].id, 'a');
            strict_1.default.equal(result[1].name, 'Item B');
        });
        (0, node_test_1.default)('stores and retrieves primitive values', async () => {
            await api_client_1.apiClient.set('test_key', 42);
            strict_1.default.equal(await api_client_1.apiClient.get('test_key', 0), 42);
            await api_client_1.apiClient.set('test_key', true);
            strict_1.default.equal(await api_client_1.apiClient.get('test_key', false), true);
            await api_client_1.apiClient.set('test_key', 'hello');
            strict_1.default.equal(await api_client_1.apiClient.get('test_key', ''), 'hello');
        });
    });
    // ---------------------------------------------------------------------------
    // update
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('update', () => {
        (0, node_test_1.default)('applies updater function to current value', async () => {
            await api_client_1.apiClient.set('test_update', [1, 2, 3]);
            const result = await api_client_1.apiClient.update('test_update', (current) => [...current, 4], []);
            strict_1.default.deepEqual(result, [1, 2, 3, 4]);
            // Verify persisted
            const stored = await api_client_1.apiClient.get('test_update', []);
            strict_1.default.deepEqual(stored, [1, 2, 3, 4]);
        });
        (0, node_test_1.default)('uses fallback when key does not exist', async () => {
            const result = await api_client_1.apiClient.update('test_update', (n) => n + 10, 5);
            strict_1.default.equal(result, 15);
        });
        (0, node_test_1.default)('read-modify-write is atomic in sequence', async () => {
            await api_client_1.apiClient.set('test_update', { count: 0 });
            await api_client_1.apiClient.update('test_update', (c) => ({ count: c.count + 1 }), { count: 0 });
            await api_client_1.apiClient.update('test_update', (c) => ({ count: c.count + 1 }), { count: 0 });
            const result = await api_client_1.apiClient.get('test_update', { count: -1 });
            strict_1.default.equal(result.count, 2);
        });
    });
    // ---------------------------------------------------------------------------
    // remove
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('remove', () => {
        (0, node_test_1.default)('removes a key so get returns fallback', async () => {
            await api_client_1.apiClient.set('test_remove', 'data');
            await api_client_1.apiClient.remove('test_remove');
            const result = await api_client_1.apiClient.get('test_remove', 'gone');
            strict_1.default.equal(result, 'gone');
        });
        (0, node_test_1.default)('removing a non-existent key does not throw', async () => {
            await strict_1.default.doesNotReject(api_client_1.apiClient.remove('nonexistent_remove_key'));
        });
    });
    // ---------------------------------------------------------------------------
    // generateId
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('generateId', () => {
        (0, node_test_1.default)('generates unique IDs', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add(api_client_1.apiClient.generateId());
            }
            strict_1.default.equal(ids.size, 100, 'All 100 generated IDs should be unique');
        });
        (0, node_test_1.default)('includes prefix when provided', () => {
            const id = api_client_1.apiClient.generateId('booking');
            strict_1.default.ok(id.startsWith('booking_'), `Expected prefix "booking_", got: ${id}`);
        });
        (0, node_test_1.default)('works without prefix', () => {
            const id = api_client_1.apiClient.generateId();
            strict_1.default.ok(id.length > 5, 'ID should be non-trivial length');
            strict_1.default.ok(!id.startsWith('undefined'), 'Should not contain "undefined"');
        });
        (0, node_test_1.default)('IDs contain timestamp and random component', () => {
            const id = api_client_1.apiClient.generateId('test');
            const parts = id.split('_');
            // Structure: prefix_timestamp_random
            strict_1.default.ok(parts.length >= 3, `Expected at least 3 parts, got: ${parts.length}`);
        });
    });
});
