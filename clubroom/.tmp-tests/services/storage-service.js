"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const api_client_1 = require("./api-client");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('StorageService');
/**
 * Lightweight storage helper that delegates to apiClient and keeps
 * a tiny in-memory cache for mock/preview sessions.
 */
class StorageService {
    constructor() {
        this.memory = {};
    }
    async setItem(key, value) {
        const serialized = JSON.stringify(value);
        this.memory[key] = serialized;
        try {
            await api_client_1.apiClient.set(key, value);
        }
        catch (err) {
            logger.warn('Falling back to memory storage', { key, error: err });
        }
    }
    async getItem(key, fallback) {
        try {
            const value = await api_client_1.apiClient.get(key, null);
            if (value !== null)
                return value;
        }
        catch (err) {
            logger.warn('Read failed, using memory fallback', { key, error: err });
        }
        if (this.memory[key]) {
            return JSON.parse(this.memory[key]);
        }
        return fallback;
    }
    async removeItem(key) {
        delete this.memory[key];
        try {
            await api_client_1.apiClient.remove(key);
        }
        catch (err) {
            logger.warn('Remove failed, ignoring', { key, error: err });
        }
    }
}
exports.storageService = new StorageService();
