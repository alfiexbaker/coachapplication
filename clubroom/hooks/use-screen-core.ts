import type { ServiceError } from '@/types/result';

export type ScreenLoadMode = 'initial' | 'refresh' | 'silent';

export interface FocusRefetchOptions {
  refetchOnFocus: boolean;
  hasLoadedOnce: boolean;
  fetchData: (mode: ScreenLoadMode) => Promise<void>;
}

/** Default empty check shared by useScreen and tests. */
export function isScreenDataEmpty<T>(data: T | null): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data) && data.length === 0) return true;
  return false;
}

export function deriveScreenStatus<T>(data: T, isEmpty?: (value: T) => boolean): 'empty' | 'success' {
  const empty = isEmpty ? isEmpty(data) : isScreenDataEmpty(data);
  return empty ? 'empty' : 'success';
}

export function shouldRunFocusRefetch(refetchOnFocus: boolean, hasLoadedOnce: boolean): boolean {
  return refetchOnFocus && hasLoadedOnce;
}

export function runFocusRefetch(options: FocusRefetchOptions): void {
  if (!shouldRunFocusRefetch(options.refetchOnFocus, options.hasLoadedOnce)) return;
  void options.fetchData('silent');
}

export function normalizeUnknownError(error: unknown): ServiceError {
  if (typeof error === 'object' && error !== null) {
    if ('code' in error && 'message' in error) {
      return error as ServiceError;
    }
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return {
        code: 'UNKNOWN',
        message: (error as { message: string }).message,
        details: error,
      };
    }
  }

  return {
    code: 'UNKNOWN',
    message: 'Unexpected error while loading screen data',
    details: error,
  };
}
