/**
 * Result Pattern for standardized error handling across all services.
 * Inspired by Rust's Result type - forces explicit error handling.
 */

export type Result<T, E = ServiceError> =
  | { success: true; data: T; error?: undefined }
  | { success: false; data?: undefined; error: E };

export type ServiceErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'NETWORK'
  | 'STORAGE'
  | 'UNAUTHORIZED'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export interface ServiceError {
  code: ServiceErrorCode;
  message: string;
  details?: unknown;
}

// Helper functions for creating Results
export const ok = <T>(data: T): Result<T, never> => ({
  success: true,
  data,
});

export const err = <E = ServiceError>(error: E): Result<never, E> => ({
  success: false,
  error,
});

// Helper functions for creating ServiceErrors
export const serviceError = (
  code: ServiceErrorCode,
  message: string,
  details?: unknown
): ServiceError => ({
  code,
  message,
  details,
});

export const notFound = (entity: string, id?: string): ServiceError =>
  serviceError('NOT_FOUND', id ? `${entity} with id '${id}' not found` : `${entity} not found`);

export const validationError = (message: string, details?: unknown): ServiceError =>
  serviceError('VALIDATION', message, details);

export const networkError = (message: string = 'Network request failed'): ServiceError =>
  serviceError('NETWORK', message);

export const storageError = (message: string = 'Storage operation failed'): ServiceError =>
  serviceError('STORAGE', message);

export const unauthorized = (message: string = 'Unauthorized'): ServiceError =>
  serviceError('UNAUTHORIZED', message);

export const conflictError = (message: string): ServiceError =>
  serviceError('CONFLICT', message);

// Type guards
export const isOk = <T, E>(result: Result<T, E>): result is { success: true; data: T } =>
  result.success === true;

export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  result.success === false;

// Utility to unwrap or throw
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.success) return result.data;
  throw new Error(
    typeof result.error === 'object' && result.error !== null && 'message' in result.error
      ? String((result.error as unknown as ServiceError).message)
      : 'Result unwrap failed'
  );
};

// Utility to unwrap with default
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T =>
  result.success ? result.data : defaultValue;

// Map success value
export const map = <T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> =>
  result.success ? ok(fn(result.data)) : result;

// Map error value
export const mapErr = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
  result.success ? result : err(fn(result.error));

// Chain async operations
export const andThen = async <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Promise<Result<U, E>>
): Promise<Result<U, E>> => (result.success ? fn(result.data) : result);

// Combine multiple results
export const all = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const data: T[] = [];
  for (const result of results) {
    if (!result.success) return result;
    data.push(result.data);
  }
  return ok(data);
};
