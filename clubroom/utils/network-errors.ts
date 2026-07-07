import type { ServiceError } from '@/types/result';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const maybeServiceError = error as Partial<ServiceError>;
    if (typeof maybeServiceError.message === 'string') return maybeServiceError.message;
  }
  return String(error);
}

export function isBrowserFetchFailure(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('failed to fetch') || message.includes('network request failed');
}
