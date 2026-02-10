"use strict";
/**
 * API Client — Single shared module for all data access.
 *
 * Every service imports this instead of touching AsyncStorage directly.
 * When backend exists, swap the implementation — services don't change.
 *
 * Features:
 * - Config-driven settings (base URL, timeout, mock mode)
 * - Rate limiting based on config
 * - Automatic token refresh
 *
 * Usage:
 *   import { apiClient } from './api-client';
 *   const items = await apiClient.get<Item[]>(STORAGE_KEYS.ITEMS, []);
 *   await apiClient.set(STORAGE_KEYS.ITEMS, items);
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = exports.ApiError = void 0;
exports.apiFetch = apiFetch;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const logger_1 = require("@/utils/logger");
const auth_service_1 = require("@/services/auth-service");
const error_types_1 = require("@/constants/error-types");
Object.defineProperty(exports, "ApiError", { enumerable: true, get: function () { return error_types_1.ApiError; } });
const config_1 = require("@/constants/config");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('ApiClient');
// Config-driven settings
const USE_MOCK = config_1.api.useMock;
const API_BASE_URL = config_1.api.baseUrl;
const API_TIMEOUT = config_1.api.timeout;
// -----------------------------------------------------------------------------
// Rate Limiter
// -----------------------------------------------------------------------------
class RateLimiter {
    constructor(maxRequestsPerMinute) {
        this.requests = [];
        this.windowMs = 60000; // 1 minute
        this.maxRequests = maxRequestsPerMinute;
    }
    canMakeRequest() {
        const now = Date.now();
        this.requests = this.requests.filter((t) => now - t < this.windowMs);
        return this.requests.length < this.maxRequests;
    }
    recordRequest() {
        this.requests.push(Date.now());
    }
    async waitForSlot() {
        while (!this.canMakeRequest()) {
            const oldest = Math.min(...this.requests);
            const waitTime = this.windowMs - (Date.now() - oldest) + 10;
            logger.debug('Rate limited, waiting', { waitTime });
            await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 1000)));
        }
    }
}
const rateLimiter = new RateLimiter(config_1.rateLimits.apiRequestsPerMinute);
// TODO: Implement real offline support with @react-native-community/netinfo when connecting to real API
// ============================================================================
// API FETCH (for real API mode)
// ============================================================================
let _isRefreshing = false;
let _refreshPromise = null;
/**
 * Internal fetch that throws errors (for backward compat).
 * Use apiFetch() instead which returns Result<T, ServiceError>.
 */
async function _apiFetchUnsafe(path, options) {
    // Rate limiting
    await rateLimiter.waitForSlot();
    rateLimiter.recordRequest();
    // Get auth token from authService
    let authHeaders = {};
    if (!USE_MOCK) {
        try {
            const tokens = await auth_service_1.authService.getTokens();
            if (tokens?.accessToken) {
                authHeaders = { Authorization: `Bearer ${tokens.accessToken}` };
            }
        }
        catch {
            // No tokens available
        }
    }
    let response;
    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
                ...options?.headers,
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Network request failed';
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        logger.error(isTimeout ? 'Request timeout' : 'Network request failed', error);
        throw new error_types_1.NetworkError(isTimeout ? `Request timeout after ${API_TIMEOUT}ms` : errorMessage);
    }
    if (response.status === 401) {
        // Try refresh token via authService
        logger.info('Received 401, attempting token refresh');
        try {
            if (!_isRefreshing) {
                _isRefreshing = true;
                _refreshPromise = auth_service_1.authService.refreshToken().then((result) => {
                    _isRefreshing = false;
                    _refreshPromise = null;
                    if (!result.success) {
                        throw new error_types_1.UnauthorizedError(result.error.message);
                    }
                });
            }
            await _refreshPromise;
            // Retry with new token
            const newTokens = await auth_service_1.authService.getTokens();
            const retryHeaders = newTokens?.accessToken
                ? { Authorization: `Bearer ${newTokens.accessToken}` }
                : {};
            const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...retryHeaders,
                    ...options?.headers,
                },
            });
            if (retryResponse.ok) {
                if (retryResponse.status === 204)
                    return undefined;
                return retryResponse.json();
            }
            if (retryResponse.status === 401) {
                logger.warn('Token refresh did not resolve 401, logging out');
                await auth_service_1.authService.logout();
                throw new error_types_1.UnauthorizedError('Session expired. Please log in again.');
            }
        }
        catch (error) {
            if (error instanceof error_types_1.UnauthorizedError)
                throw error;
            _isRefreshing = false;
            _refreshPromise = null;
            logger.error('Token refresh failed', error);
            await auth_service_1.authService.logout();
            throw new error_types_1.UnauthorizedError('Session expired. Please log in again.');
        }
    }
    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        let parsed = {};
        try {
            parsed = JSON.parse(errorBody);
        }
        catch { /* raw text */ }
        throw new error_types_1.ApiError(response.status, parsed.code || 'API_ERROR', parsed.message || errorBody || `HTTP ${response.status}`, parsed.details);
    }
    if (response.status === 204)
        return undefined;
    return response.json();
}
/**
 * API fetch with Result pattern - catches all errors and returns Result<T, ServiceError>.
 */
async function apiFetch(path, options) {
    try {
        const data = await _apiFetchUnsafe(path, options);
        return (0, result_1.ok)(data);
    }
    catch (error) {
        if (error instanceof error_types_1.NetworkError) {
            return (0, result_1.err)((0, result_1.networkError)(error.message));
        }
        if (error instanceof error_types_1.UnauthorizedError) {
            return (0, result_1.err)((0, result_1.unauthorized)(error.message));
        }
        if (error instanceof error_types_1.ApiError) {
            // Map ApiError to ServiceError
            let code;
            switch (error.status) {
                case 404:
                    code = 'NOT_FOUND';
                    break;
                case 401:
                case 403:
                    code = 'UNAUTHORIZED';
                    break;
                case 409:
                    code = 'CONFLICT';
                    break;
                case 429:
                    code = 'RATE_LIMITED';
                    break;
                case 400:
                    code = 'VALIDATION';
                    break;
                default:
                    code = 'UNKNOWN';
            }
            return (0, result_1.err)((0, result_1.serviceError)(code, error.message, error.details));
        }
        // Unknown error
        const message = error instanceof Error ? error.message : 'Unknown error';
        return (0, result_1.err)((0, result_1.serviceError)('UNKNOWN', message));
    }
}
// ============================================================================
// MOCK HELPERS (AsyncStorage-based)
// ============================================================================
async function mockGet(key, fallback) {
    try {
        const raw = await async_storage_1.default.getItem(key);
        if (raw)
            return JSON.parse(raw);
        return fallback;
    }
    catch (error) {
        logger.error(`Failed to get ${key}`, error);
        return fallback;
    }
}
async function mockSet(key, data) {
    try {
        await async_storage_1.default.setItem(key, JSON.stringify(data));
    }
    catch (error) {
        logger.error(`Failed to set ${key}`, error);
        throw error;
    }
}
async function mockRemove(key) {
    try {
        await async_storage_1.default.removeItem(key);
    }
    catch (error) {
        logger.error(`Failed to remove ${key}`, error);
        throw error;
    }
}
// ============================================================================
// PUBLIC API CLIENT
// ============================================================================
exports.apiClient = {
    /**
     * Get data by storage key (mock) or API path (real).
     */
    async get(key, fallback) {
        if (USE_MOCK) {
            return mockGet(key, fallback);
        }
        const result = await apiFetch(`/api/${key}`);
        if (result.success) {
            return result.data;
        }
        logger.error(`API get failed for ${key}`, result.error);
        return fallback;
    },
    /**
     * Store data by storage key (mock) or POST to API (real).
     */
    async set(key, data) {
        if (USE_MOCK) {
            return mockSet(key, data);
        }
        const result = await apiFetch(`/api/${key}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!result.success) {
            logger.error(`API set failed for ${key}`, result.error);
            throw new Error(result.error.message);
        }
    },
    /**
     * Read-modify-write pattern. Reads current value, applies updater, saves result.
     */
    async update(key, updater, fallback) {
        const current = (await this.get(key, fallback));
        const updated = updater(current);
        await this.set(key, updated);
        return updated;
    },
    /**
     * Remove data by key.
     */
    async remove(key) {
        if (USE_MOCK) {
            return mockRemove(key);
        }
        const result = await apiFetch(`/api/${key}`, { method: 'DELETE' });
        if (!result.success) {
            logger.error(`API remove failed for ${key}`, result.error);
            throw new Error(result.error.message);
        }
    },
    /**
     * Generate a unique ID with optional prefix.
     */
    generateId(prefix) {
        const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return prefix ? `${prefix}_${id}` : id;
    },
    /**
     * Check if we're in mock mode.
     */
    get isMockMode() {
        return USE_MOCK;
    },
};
