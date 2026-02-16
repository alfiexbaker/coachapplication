"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const api_client_1 = require("../../services/api-client");
(0, node_test_1.describe)('apiClient storage primitives', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove('ss_test_key');
        await api_client_1.apiClient.remove('ss_test_obj');
        await api_client_1.apiClient.remove('ss_remove_key');
    });
    (0, node_test_1.test)('stores and retrieves objects and arrays', async () => {
        await api_client_1.apiClient.set('ss_test_obj', { value: 1 });
        await api_client_1.apiClient.set('ss_test_key', ['a', 'b', 'c']);
        const objectValue = await api_client_1.apiClient.get('ss_test_obj', null);
        const arrayValue = await api_client_1.apiClient.get('ss_test_key', []);
        strict_1.default.deepEqual(objectValue, { value: 1 });
        strict_1.default.deepEqual(arrayValue, ['a', 'b', 'c']);
    });
    (0, node_test_1.test)('returns fallback for missing key', async () => {
        const value = await api_client_1.apiClient.get('ss_missing', 'fallback');
        strict_1.default.equal(value, 'fallback');
    });
    (0, node_test_1.test)('removes values', async () => {
        await api_client_1.apiClient.set('ss_remove_key', true);
        await api_client_1.apiClient.remove('ss_remove_key');
        const value = await api_client_1.apiClient.get('ss_remove_key', false);
        strict_1.default.equal(value, false);
    });
});
