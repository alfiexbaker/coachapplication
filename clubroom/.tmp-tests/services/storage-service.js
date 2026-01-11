"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
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
            console.warn('[storage] falling back to memory', err);
        }
    }
    async getItem(key, fallback) {
        try {
            const value = await async_storage_1.default.getItem(key);
            if (value)
                return JSON.parse(value);
        }
        catch (err) {
            console.warn('[storage] read failed, using memory', err);
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
            console.warn('[storage] remove failed, ignoring', err);
        }
    }
}
exports.storageService = new StorageService();
