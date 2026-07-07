import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import type { AuthTokens } from '@/services/auth-service';

const KEYCHAIN_SERVICE = 'clubroom.auth';
const REFRESH_TOKEN_KEY = `${STORAGE_KEYS.AUTH_TOKENS}.refresh_token`;
const EXPIRES_AT_KEY = `${STORAGE_KEYS.AUTH_TOKENS}.expires_at`;

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: KEYCHAIN_SERVICE,
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const WEB_SESSION_PREFIX = 'clubroom.auth.';
const webSessionSecrets = new Map<string, string>();
let secureStoreAvailablePromise: Promise<boolean> | null = null;

interface WebStorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

async function canUseSecureStore(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  secureStoreAvailablePromise ??= SecureStore.isAvailableAsync().catch(() => false);
  return secureStoreAvailablePromise;
}

function getWebSessionStorage(): WebStorageLike | null {
  try {
    const candidate = (globalThis as { sessionStorage?: WebStorageLike }).sessionStorage;
    return candidate ?? null;
  } catch {
    return null;
  }
}

function webSessionKey(key: string): string {
  return `${WEB_SESSION_PREFIX}${key}`;
}

async function setSecret(key: string, value: string): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
    return;
  }

  const sessionStorage = getWebSessionStorage();
  if (sessionStorage) {
    sessionStorage.setItem(webSessionKey(key), value);
    return;
  }

  webSessionSecrets.set(key, value);
}

async function getSecret(key: string): Promise<string | null> {
  if (await canUseSecureStore()) {
    return SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
  }

  const sessionStorage = getWebSessionStorage();
  if (sessionStorage) {
    return sessionStorage.getItem(webSessionKey(key));
  }

  return webSessionSecrets.get(key) ?? null;
}

async function deleteSecret(key: string): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
    return;
  }

  const sessionStorage = getWebSessionStorage();
  if (sessionStorage) {
    sessionStorage.removeItem(webSessionKey(key));
    return;
  }

  webSessionSecrets.delete(key);
}

async function purgeLegacyAsyncStorageTokens(): Promise<void> {
  await Promise.allSettled([
    apiClient.removeLocal(STORAGE_KEYS.AUTH_TOKEN),
    apiClient.removeLocal(STORAGE_KEYS.AUTH_TOKENS),
  ]);
}

export async function setAuthTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    setSecret(STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken),
    setSecret(REFRESH_TOKEN_KEY, tokens.refreshToken),
    setSecret(EXPIRES_AT_KEY, String(tokens.expiresAt)),
  ]);
  await purgeLegacyAsyncStorageTokens();
}

export async function getAuthTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken, expiresAtRaw] = await Promise.all([
    getSecret(STORAGE_KEYS.AUTH_TOKEN),
    getSecret(REFRESH_TOKEN_KEY),
    getSecret(EXPIRES_AT_KEY),
  ]);

  if (!accessToken || !refreshToken || !expiresAtRaw) {
    await purgeLegacyAsyncStorageTokens();
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) {
    await clearAuthTokens();
    return null;
  }

  return { accessToken, refreshToken, expiresAt };
}

export async function clearAuthTokens(): Promise<void> {
  await Promise.allSettled([
    deleteSecret(STORAGE_KEYS.AUTH_TOKEN),
    deleteSecret(REFRESH_TOKEN_KEY),
    deleteSecret(EXPIRES_AT_KEY),
    purgeLegacyAsyncStorageTokens(),
  ]);
}
