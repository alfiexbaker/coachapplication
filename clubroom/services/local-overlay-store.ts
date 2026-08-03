import { apiClient } from './api-client';
import { api } from '@/constants/config';
import { createLogger } from '@/utils/logger';

const logger = createLogger('LocalOverlayStore');

function mockOnlyOverlayError(key: string): Error {
  return new Error(
    `Local overlay key '${key}' is mock-only. API mode must use a /v1 authority or fail closed.`,
  );
}

export async function getLocalOverlayValue<T>(key: string, fallback: T): Promise<T> {
  if (!api.useMock) {
    logger.warn('Skipped local overlay read outside mock mode', { key });
    void fallback;
    throw mockOnlyOverlayError(key);
  }

  return apiClient.get<T>(key, fallback);
}

export async function setLocalOverlayValue<T>(key: string, value: T): Promise<void> {
  if (!api.useMock) {
    logger.warn('Skipped local overlay write outside mock mode', { key });
    throw mockOnlyOverlayError(key);
  }

  await apiClient.set<T>(key, value);
}
