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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/utils/logger';
import { generateId } from '@/utils/generate-id';
import { ApiError, UnauthorizedError, NetworkError } from '@/constants/error-types';
import { api, rateLimits } from '@/constants/config';
import type { Result, ServiceError, ServiceErrorCode } from '@/types/result';
import { ok, err, networkError, unauthorized, serviceError, storageError } from '@/types/result';
import { withTimeout } from '@/utils/timeout';
import { withRetry } from '@/utils/retry';
import { emitTyped, ServiceEvents } from './event-bus';

const logger = createLogger('ApiClient');

// Config-driven settings
const USE_MOCK = api.useMock;

// Storage resilience
const STORAGE_TIMEOUT_MS = 5000;
const STORAGE_RETRY_ATTEMPTS = 3;
const STORAGE_RETRY_DELAY = 500;

function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const message =
    'message' in error && typeof (error as { message: unknown }).message === 'string'
      ? ((error as { message: string }).message).toLowerCase()
      : '';

  return (
    message.includes('database locked') ||
    message.includes('disk i/o error') ||
    message.includes('temporarily unavailable')
  );
}
const API_BASE_URL = api.baseUrl;
const API_TIMEOUT = api.timeout;

// -----------------------------------------------------------------------------
// Rate Limiter
// -----------------------------------------------------------------------------

class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs = 60000; // 1 minute

  constructor(maxRequestsPerMinute: number) {
    this.maxRequests = maxRequestsPerMinute;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter((t) => now - t < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  async waitForSlot(): Promise<void> {
    while (!this.canMakeRequest()) {
      const oldest = Math.min(...this.requests);
      const waitTime = this.windowMs - (Date.now() - oldest) + 10;
      logger.debug('Rate limited, waiting', { waitTime });
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 1000)));
    }
  }
}

const rateLimiter = new RateLimiter(rateLimits.apiRequestsPerMinute);

// Re-export for backwards compatibility
export { ApiError };

// TODO: Implement real offline support with @react-native-community/netinfo when connecting to real API

// ============================================================================
// API FETCH (for real API mode)
// ============================================================================

let _isRefreshing = false;
let _refreshPromise: Promise<void> | null = null;

type AuthServiceLike = {
  getTokens: () => Promise<{ accessToken?: string; refreshToken?: string; expiresAt?: number } | null>;
  refreshToken: () => Promise<Result<unknown, ServiceError>>;
  logout: () => Promise<void>;
};

let authServiceRef: AuthServiceLike | null | undefined;

function getAuthService(): AuthServiceLike | null {
  if (authServiceRef !== undefined) {
    return authServiceRef;
  }

  try {
    // Lazy import to avoid static require-cycle with auth-service.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/services/auth-service') as { authService?: AuthServiceLike };
    authServiceRef = mod.authService ?? null;
  } catch {
    authServiceRef = null;
  }

  return authServiceRef;
}

/**
 * Internal fetch that throws errors (for backward compat).
 * Use apiFetch() instead which returns Result<T, ServiceError>.
 */
async function _apiFetchUnsafe<T>(path: string, options?: RequestInit): Promise<T> {
  // Rate limiting
  await rateLimiter.waitForSlot();
  rateLimiter.recordRequest();

  // Get auth token from authService, proactively refreshing if about to expire
  let authHeaders: Record<string, string> = {};
  const authService = getAuthService();
  if (!USE_MOCK && authService) {
    try {
      let tokens = await authService.getTokens();

      // Proactive refresh: if token expires within 60s, refresh now
      if (tokens?.expiresAt && tokens.expiresAt < Date.now() + 60_000) {
        logger.debug('Token expiring soon, proactively refreshing');
        if (!_isRefreshing) {
          _isRefreshing = true;
          _refreshPromise = authService.refreshToken().then((result) => {
            _isRefreshing = false;
            _refreshPromise = null;
            if (!result.success) {
              logger.warn('Proactive token refresh failed');
            }
          });
        }
        await _refreshPromise;
        tokens = await authService.getTokens();
      }

      if (tokens?.accessToken) {
        authHeaders = { Authorization: `Bearer ${tokens.accessToken}` };
      }
    } catch {
      // No tokens available
    }
  }

  let response: Response;
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Network request failed';
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    logger.error(isTimeout ? 'Request timeout' : 'Network request failed', error);
    throw new NetworkError(isTimeout ? `Request timeout after ${API_TIMEOUT}ms` : errorMessage);
  }

  if (response.status === 401) {
    if (!authService) {
      throw new UnauthorizedError('Session expired. Please log in again.');
    }

    // Try refresh token via authService
    logger.info('Received 401, attempting token refresh');
    try {
      if (!_isRefreshing) {
        _isRefreshing = true;
        _refreshPromise = authService.refreshToken().then((result) => {
          _isRefreshing = false;
          _refreshPromise = null;
          if (!result.success) {
            throw new UnauthorizedError(result.error.message);
          }
        });
      }
      await _refreshPromise;

      // Retry with new token
      const newTokens = await authService.getTokens();
      const retryHeaders: Record<string, string> = newTokens?.accessToken
        ? { Authorization: `Bearer ${newTokens.accessToken}` }
        : {};

      const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...retryHeaders,
          ...(options?.headers as Record<string, string>),
        },
      });

      if (retryResponse.ok) {
        if (retryResponse.status === 204) return undefined as T;
        return retryResponse.json();
      }

      if (retryResponse.status === 401) {
        logger.warn('Token refresh did not resolve 401, logging out');
        await authService.logout();
        throw new UnauthorizedError('Session expired. Please log in again.');
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      _isRefreshing = false;
      _refreshPromise = null;
      logger.error('Token refresh failed', error);
      await authService.logout();
      throw new UnauthorizedError('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    let parsed: { code?: string; message?: string; details?: Record<string, string[]> } = {};
    try {
      parsed = JSON.parse(errorBody);
    } catch {
      /* raw text */
    }
    throw new ApiError(
      response.status,
      parsed.code || 'API_ERROR',
      parsed.message || errorBody || `HTTP ${response.status}`,
      parsed.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

/**
 * API fetch with Result pattern - catches all errors and returns Result<T, ServiceError>.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<Result<T, ServiceError>> {
  try {
    const data = await _apiFetchUnsafe<T>(path, options);
    return ok(data);
  } catch (error: unknown) {
    if (error instanceof NetworkError) {
      return err(networkError(error.message));
    }
    if (error instanceof UnauthorizedError) {
      return err(unauthorized(error.message));
    }
    if (error instanceof ApiError) {
      // Map ApiError to ServiceError
      let code: ServiceErrorCode;
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
      return err(serviceError(code, error.message, error.details));
    }
    // Unknown error
    const message = error instanceof Error ? error.message : 'Unknown error';
    return err(serviceError('UNKNOWN', message));
  }
}

// ============================================================================
// MOCK HELPERS (AsyncStorage-based)
// ============================================================================

async function mockGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const timeoutResult = await withTimeout(
      withRetry(
        () => AsyncStorage.getItem(key),
        { maxAttempts: STORAGE_RETRY_ATTEMPTS, delayMs: STORAGE_RETRY_DELAY, shouldRetry: isTransientError },
      ),
      STORAGE_TIMEOUT_MS,
    );

    if (!timeoutResult.success) {
      logger.error('Storage read timeout', { key, timeout: STORAGE_TIMEOUT_MS });
      return fallback;
    }

    const raw = timeoutResult.data;
    if (raw) return JSON.parse(raw) as T;
    return fallback;
  } catch (error) {
    logger.error(`Failed to get ${key}`, error);
    return fallback;
  }
}

async function mockSet<T>(key: string, data: T): Promise<void> {
  const serialized = JSON.stringify(data);
  try {
    const timeoutResult = await withTimeout(
      withRetry(
        () => AsyncStorage.setItem(key, serialized),
        { maxAttempts: STORAGE_RETRY_ATTEMPTS, delayMs: STORAGE_RETRY_DELAY, shouldRetry: isTransientError },
      ),
      STORAGE_TIMEOUT_MS,
    );

    if (!timeoutResult.success) {
      logger.error('Storage write timeout', { key, timeout: STORAGE_TIMEOUT_MS });
      throw new Error(`Storage write timeout for ${key}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/quotaexceeded|quota exceeded/i.test(message)) {
      logger.error(`Storage quota exceeded for key: ${key}`, { error: message });
      emitTyped(ServiceEvents.STORAGE_QUOTA_WARNING, {
        key,
        timestamp: Date.now(),
      });
    }
    logger.error(`Failed to set ${key}`, error);
    throw error;
  }
}

async function mockRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    logger.error(`Failed to remove ${key}`, error);
    throw error;
  }
}

// ============================================================================
// PUBLIC API CLIENT
// ============================================================================

export const apiClient = {
  /**
   * Get data by storage key (mock) or API path (real).
   */
  async get<T>(key: string, fallback: T): Promise<T> {
    if (USE_MOCK) {
      return mockGet(key, fallback);
    }
    const result = await apiFetch<T>(`/api/${key}`);
    if (result.success) {
      return result.data;
    }
    logger.error(`API get failed for ${key}`, result.error);
    return fallback;
  },

  /**
   * Store data by storage key (mock) or POST to API (real).
   */
  async set<T>(key: string, data: T): Promise<void> {
    if (USE_MOCK) {
      return mockSet(key, data);
    }
    const result = await apiFetch(`/api/${key}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!result.success) {
      logger.error(`API set failed for ${key}`, result.error);
      throw new ApiError(500, 'API_SET_FAILED', result.error.message);
    }
  },

  /**
   * Read-modify-write pattern. Reads current value, applies updater, saves result.
   */
  async update<T>(key: string, updater: (current: T) => T, fallback: T): Promise<T> {
    const current = (await this.get(key, fallback)) as T;
    const updated = updater(current);
    await this.set(key, updated);
    return updated;
  },

  /**
   * Remove data by key.
   */
  async remove(key: string): Promise<void> {
    if (USE_MOCK) {
      return mockRemove(key);
    }
    const result = await apiFetch(`/api/${key}`, { method: 'DELETE' });
    if (!result.success) {
      logger.error(`API remove failed for ${key}`, result.error);
      throw new ApiError(500, 'API_REMOVE_FAILED', result.error.message);
    }
  },

  /**
   * Generate a unique ID with optional prefix.
   */
  generateId(prefix?: string): string {
    return generateId(prefix);
  },

  /**
   * Check if we're in mock mode.
   */
  get isMockMode(): boolean {
    return USE_MOCK;
  },
};
