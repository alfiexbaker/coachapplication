import { apiClient } from './api-client';

export async function getLocalOverlayValue<T>(key: string, fallback: T): Promise<T> {
  return apiClient.get<T>(key, fallback);
}

export async function setLocalOverlayValue<T>(key: string, value: T): Promise<void> {
  await apiClient.set<T>(key, value);
}
