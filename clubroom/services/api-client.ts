/**
 * API Client — Single shared module for all data access.
 *
 * Every service imports this instead of touching AsyncStorage directly.
 * When backend exists, swap the implementation — services don't change.
 *
 * Usage:
 *   import { apiClient } from './api-client';
 *   const items = await apiClient.get<Item[]>(STORAGE_KEYS.ITEMS, []);
 *   await apiClient.set(STORAGE_KEYS.ITEMS, items);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/utils/logger';
import { authService } from '@/services/auth-service';
import { ApiError, UnauthorizedError, NetworkError } from '@/constants/error-types';

const logger = createLogger('ApiClient');

// Toggle between mock (AsyncStorage) and real API
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Re-export for backwards compatibility
export { ApiError };

// ============================================================================
// OFFLINE QUEUE
// ============================================================================

const OFFLINE_QUEUE_KEY = 'clubroom.offline_queue';

interface QueuedAction {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body: any;
  timestamp: number;
}

let _isConnected = true;

export function setConnectionStatus(connected: boolean) {
  _isConnected = connected;
  if (connected) {
    flushQueue().catch(err => logger.error('Failed to flush queue', err));
  }
}

async function addToQueue(action: QueuedAction): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: QueuedAction[] = raw ? JSON.parse(raw) : [];
    queue.push(action);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    logger.info('Queued offline action', { method: action.method, path: action.path });
  } catch (error) {
    logger.error('Failed to queue action', error);
  }
}

async function getQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function removeFromQueue(actionId: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter(a => a.id !== actionId);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
}

async function flushQueue(): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;

  logger.info(`Flushing ${queue.length} queued actions`);
  for (const action of queue) {
    try {
      await apiFetch(action.path, {
        method: action.method,
        body: JSON.stringify(action.body),
      });
      await removeFromQueue(action.id);
    } catch (err) {
      logger.error('Queue flush failed, will retry', err);
      break; // Stop on first failure — retry next reconnect
    }
  }
}

// ============================================================================
// API FETCH (for real API mode)
// ============================================================================

let _isRefreshing = false;
let _refreshPromise: Promise<void> | null = null;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Get auth token from authService
  let authHeaders: Record<string, string> = {};
  if (!USE_MOCK) {
    try {
      const tokens = await authService.getTokens();
      if (tokens?.accessToken) {
        authHeaders = { Authorization: `Bearer ${tokens.accessToken}` };
      }
    } catch {
      // No tokens available
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
    });
  } catch (error: any) {
    logger.error('Network request failed', error);
    throw new NetworkError(error.message || 'Network request failed');
  }

  if (response.status === 401) {
    // Try refresh token via authService
    logger.info('Received 401, attempting token refresh');
    try {
      if (!_isRefreshing) {
        _isRefreshing = true;
        _refreshPromise = authService.refreshToken().then(() => {
          _isRefreshing = false;
          _refreshPromise = null;
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
    let parsed: any = {};
    try { parsed = JSON.parse(errorBody); } catch { /* raw text */ }
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

// ============================================================================
// MOCK HELPERS (AsyncStorage-based)
// ============================================================================

async function mockGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
    return fallback;
  } catch (error) {
    logger.error(`Failed to get ${key}`, error);
    return fallback;
  }
}

async function mockSet<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
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
    try {
      return await apiFetch<T>(`/api/${key}`);
    } catch (error) {
      logger.error(`API get failed for ${key}`, error);
      return fallback;
    }
  },

  /**
   * Store data by storage key (mock) or POST to API (real).
   */
  async set<T>(key: string, data: T): Promise<void> {
    if (USE_MOCK) {
      return mockSet(key, data);
    }
    if (!_isConnected) {
      await addToQueue({
        id: this.generateId('q'),
        method: 'PUT',
        path: `/api/${key}`,
        body: data,
        timestamp: Date.now(),
      });
      return;
    }
    await apiFetch(`/api/${key}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Read-modify-write pattern. Reads current value, applies updater, saves result.
   */
  async update<T>(key: string, updater: (current: T) => T, fallback: T): Promise<T> {
    const current = await this.get<T>(key, fallback);
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
    await apiFetch(`/api/${key}`, { method: 'DELETE' });
  },

  /**
   * Generate a unique ID with optional prefix.
   */
  generateId(prefix?: string): string {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return prefix ? `${prefix}_${id}` : id;
  },

  /**
   * Check if we're in mock mode.
   */
  get isMockMode(): boolean {
    return USE_MOCK;
  },
};
