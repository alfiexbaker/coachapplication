"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('StorageService');
/**
 * Lightweight storage helper that hides AsyncStorage errors and keeps
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
            await async_storage_1.default.setItem(key, serialized);
        }
        catch (err) {
            logger.warn('Falling back to memory storage', { key, error: err });
        }
    }
    async getItem(key, fallback) {
        try {
            const value = await async_storage_1.default.getItem(key);
            if (value)
                return JSON.parse(value);
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
            await async_storage_1.default.removeItem(key);
        }
        catch (err) {
            logger.warn('Remove failed, ignoring', { key, error: err });
        }
    }
}
exports.storageService = new StorageService();
