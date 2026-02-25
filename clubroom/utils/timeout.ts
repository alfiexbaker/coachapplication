import { type Result, type ServiceError, ok, err, networkError } from '@/types/result';

/**
 * Wraps a promise with a timeout. Returns a Result to integrate with
 * the service error pattern. Cleans up the timer to prevent memory leaks.
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
): Promise<Result<T, ServiceError>> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout')), ms);
  });
  return Promise.race([promise, timeout])
    .then((data) => ok(data))
    .catch(() => err(networkError(`Operation timed out after ${ms}ms`)))
    .finally(() => clearTimeout(timeoutId));
};
