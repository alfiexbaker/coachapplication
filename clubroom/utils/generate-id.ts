/**
 * Centralized ID generation — collision-safe, URL-safe.
 *
 * Uses a fallback UUID v4 generator when crypto.randomUUID()
 * is not available (e.g. Hermes engine in Expo Go).
 *
 * Format: `{prefix}_{uuid}` or just `{uuid}` if no prefix.
 */

function uuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: manual UUID v4 using Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateId(prefix?: string): string {
  const uuid = uuidV4();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/**
 * Generate a mock token string (for mock auth mode only).
 */
export function generateMockToken(prefix: string): string {
  return `${prefix}_${uuidV4()}`;
}
