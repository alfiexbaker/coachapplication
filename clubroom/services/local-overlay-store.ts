import { apiClient } from './api-client';
import { api } from '@/constants/config';
import { createLogger } from '@/utils/logger';

const logger = createLogger('LocalOverlayStore');

export async function getLocalOverlayValue<T>(key: string, fallback: T): Promise<T> {
  if (!api.useMock) {
    logger.warn('Skipped local overlay read outside mock mode', { key });
    return fallback;
  }

  return apiClient.get<T>(key, fallback);
}

export async function setLocalOverlayValue<T>(key: string, value: T): Promise<void> {
  if (!api.useMock) {
    logger.warn('Skipped local overlay write outside mock mode', { key });
    return;
  }

  await apiClient.set<T>(key, value);
}
