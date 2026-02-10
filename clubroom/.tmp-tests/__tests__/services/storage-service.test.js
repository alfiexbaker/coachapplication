"use strict";
/**
 * Storage Service Tests
 *
 * Tests for the StorageService wrapper around apiClient with
 * in-memory fallback behavior.
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
const storage_service_1 = require("../../services/storage-service");
const api_client_1 = require("../../services/api-client");
(0, node_test_1.describe)('StorageService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove('ss_test_key');
        await api_client_1.apiClient.remove('ss_test_obj');
        await api_client_1.apiClient.remove('ss_remove_key');
    });
    // ---------------------------------------------------------------------------
    // setItem + getItem
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('setItem + getItem', () => {
        (0, node_test_1.default)('stores and retrieves a value', async () => {
            await storage_service_1.storageService.setItem('ss_test_key', { name: 'Alice' });
            const result = await storage_service_1.storageService.getItem('ss_test_key', null);
            strict_1.default.deepEqual(result, { name: 'Alice' });
        });
        (0, node_test_1.default)('stores and retrieves an array', async () => {
            const items = ['a', 'b', 'c'];
            await storage_service_1.storageService.setItem('ss_test_key', items);
            const result = await storage_service_1.storageService.getItem('ss_test_key', []);
            strict_1.default.deepEqual(result, ['a', 'b', 'c']);
        });
        (0, node_test_1.default)('returns fallback when key does not exist', async () => {
            const result = await storage_service_1.storageService.getItem('ss_nonexistent', 'default_val');
            strict_1.default.equal(result, 'default_val');
        });
        (0, node_test_1.default)('overwrites existing data', async () => {
            await storage_service_1.storageService.setItem('ss_test_obj', { v: 1 });
            await storage_service_1.storageService.setItem('ss_test_obj', { v: 2 });
            const result = await storage_service_1.storageService.getItem('ss_test_obj', null);
            strict_1.default.deepEqual(result, { v: 2 });
        });
    });
    // ---------------------------------------------------------------------------
    // removeItem
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('removeItem', () => {
        (0, node_test_1.default)('removes a stored value', async () => {
            await storage_service_1.storageService.setItem('ss_remove_key', 'data');
            await storage_service_1.storageService.removeItem('ss_remove_key');
            const result = await storage_service_1.storageService.getItem('ss_remove_key', 'gone');
            strict_1.default.equal(result, 'gone');
        });
        (0, node_test_1.default)('removing non-existent key does not throw', async () => {
            await strict_1.default.doesNotReject(storage_service_1.storageService.removeItem('ss_nonexistent'));
        });
    });
    // ---------------------------------------------------------------------------
    // Primitive types
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('primitive types', () => {
        (0, node_test_1.default)('stores and retrieves numbers', async () => {
            await storage_service_1.storageService.setItem('ss_test_key', 42);
            const result = await storage_service_1.storageService.getItem('ss_test_key', 0);
            strict_1.default.equal(result, 42);
        });
        (0, node_test_1.default)('stores and retrieves booleans', async () => {
            await storage_service_1.storageService.setItem('ss_test_key', true);
            const result = await storage_service_1.storageService.getItem('ss_test_key', false);
            strict_1.default.equal(result, true);
        });
        (0, node_test_1.default)('stores and retrieves strings', async () => {
            await storage_service_1.storageService.setItem('ss_test_key', 'hello world');
            const result = await storage_service_1.storageService.getItem('ss_test_key', '');
            strict_1.default.equal(result, 'hello world');
        });
    });
});
