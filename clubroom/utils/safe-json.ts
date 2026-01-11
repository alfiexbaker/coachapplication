/**
 * Safe JSON Parsing Utilities
 *
 * Provides safe wrappers around JSON.parse and JSON.stringify to prevent
 * app crashes from corrupted storage data or serialization errors.
 */

import { createLogger } from './logger';

const logger = createLogger('SafeJSON');

/**
 * Safely parse a JSON string with a default fallback value.
 * Returns the default value if parsing fails or input is null/undefined.
 *
 * @param json - The JSON string to parse (can be null/undefined)
 * @param defaultValue - The value to return if parsing fails
 * @returns The parsed value or the default value
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  defaultValue: T
): T {
  if (json === null || json === undefined || json === '') {
    return defaultValue;
  }

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.error('Failed to parse JSON', {
      error: error instanceof Error ? error.message : String(error),
      jsonPreview: json.length > 100 ? `${json.substring(0, 100)}...` : json,
    });
    return defaultValue;
  }
}

/**
 * Safely stringify a value to JSON.
 * Returns null if stringification fails.
 *
 * @param value - The value to stringify
 * @returns The JSON string or null if stringification fails
 */
export function safeJsonStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch (error) {
    logger.error('Failed to stringify to JSON', {
      error: error instanceof Error ? error.message : String(error),
      valueType: typeof value,
    });
    return null;
  }
}

// ============================================================================
// Data Validators
// ============================================================================

/**
 * Type guard to validate a Booking object structure
 */
export function isValidBooking(obj: unknown): obj is {
  id: string;
  coachId: string;
  athleteId: string;
  scheduledAt: string;
  status: string;
} {
  if (!obj || typeof obj !== 'object') return false;
  const booking = obj as Record<string, unknown>;
  return (
    typeof booking.id === 'string' &&
    typeof booking.coachId === 'string' &&
    typeof booking.athleteId === 'string' &&
    typeof booking.scheduledAt === 'string' &&
    typeof booking.status === 'string'
  );
}

/**
 * Type guard to validate a SessionOffering object structure
 */
export function isValidSessionOffering(obj: unknown): obj is {
  id: string;
  title: string;
  coachId: string;
  scheduledAt: string;
} {
  if (!obj || typeof obj !== 'object') return false;
  const offering = obj as Record<string, unknown>;
  return (
    typeof offering.id === 'string' &&
    typeof offering.title === 'string' &&
    typeof offering.coachId === 'string' &&
    typeof offering.scheduledAt === 'string'
  );
}

/**
 * Type guard to validate a Message object structure
 */
export function isValidMessage(obj: unknown): obj is {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  timestamp: string;
} {
  if (!obj || typeof obj !== 'object') return false;
  const message = obj as Record<string, unknown>;
  return (
    typeof message.id === 'string' &&
    typeof message.threadId === 'string' &&
    typeof message.senderId === 'string' &&
    typeof message.content === 'string' &&
    typeof message.timestamp === 'string'
  );
}

/**
 * Type guard to validate an array of objects
 * Filters out invalid items and logs warnings
 */
export function filterValidItems<T>(
  items: unknown[],
  validator: (item: unknown) => item is T,
  entityName: string
): T[] {
  const validItems: T[] = [];
  let invalidCount = 0;

  for (const item of items) {
    if (validator(item)) {
      validItems.push(item);
    } else {
      invalidCount++;
    }
  }

  if (invalidCount > 0) {
    logger.warn(`Filtered out ${invalidCount} invalid ${entityName} items`);
  }

  return validItems;
}
