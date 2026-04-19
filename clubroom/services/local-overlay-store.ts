import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/utils/logger';
import { withRetry } from '@/utils/retry';
import { withTimeout } from '@/utils/timeout';

const logger = createLogger('LocalOverlayStore');

const STORAGE_TIMEOUT_MS = 5000;
const STORAGE_RETRY_ATTEMPTS = 3;
const STORAGE_RETRY_DELAY = 500;

function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

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

export async function getLocalOverlayValue<T>(key: string, fallback: T): Promise<T> {
  try {
    const timeoutResult = await withTimeout(
      withRetry(() => AsyncStorage.getItem(key), {
        maxAttempts: STORAGE_RETRY_ATTEMPTS,
        delayMs: STORAGE_RETRY_DELAY,
        shouldRetry: isTransientError,
      }),
      STORAGE_TIMEOUT_MS,
    );

    if (!timeoutResult.success) {
      logger.warn('Overlay read timeout', { key, timeout: STORAGE_TIMEOUT_MS });
      return fallback;
    }

    return timeoutResult.data ? (JSON.parse(timeoutResult.data) as T) : fallback;
  } catch (error) {
    logger.error('Failed to read local overlay value', { key, error });
    return fallback;
  }
}

export async function setLocalOverlayValue<T>(key: string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);

  const timeoutResult = await withTimeout(
    withRetry(() => AsyncStorage.setItem(key, serialized), {
      maxAttempts: STORAGE_RETRY_ATTEMPTS,
      delayMs: STORAGE_RETRY_DELAY,
      shouldRetry: isTransientError,
    }),
    STORAGE_TIMEOUT_MS,
  );

  if (!timeoutResult.success) {
    logger.error('Overlay write timeout', { key, timeout: STORAGE_TIMEOUT_MS });
    throw new Error(`Overlay write timeout for ${key}`);
  }
}
