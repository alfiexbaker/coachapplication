import { createLogger } from '@/utils/logger';

const logger = createLogger('Retry');

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoff?: boolean;
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxAttempts, delayMs, backoff = true, shouldRetry } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const isLastAttempt = attempt === maxAttempts;
      const shouldRetryError = shouldRetry ? shouldRetry(error) : true;

      if (isLastAttempt || !shouldRetryError) {
        throw error;
      }

      const delay = backoff ? delayMs * attempt : delayMs;

      logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
