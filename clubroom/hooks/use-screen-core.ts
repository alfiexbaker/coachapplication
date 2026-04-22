import type { ServiceError } from '@/types/result';

export type ScreenStatus = 'loading' | 'error' | 'empty' | 'success';
export type LoadingRouteStrategy =
  | 'warm-first'
  | 'section-skeleton'
  | 'submit-only'
  | 'cold-first'
  | 'static';
export type ScreenLoadingStrategy = Exclude<LoadingRouteStrategy, 'static'>;
export type ScreenLoadMode = 'initial' | 'dependency-change' | 'refresh' | 'retry' | 'silent';

export interface ScreenPendingState {
  mode: ScreenLoadMode | null;
  strategy: ScreenLoadingStrategy;
  blocking: boolean;
  preservesVisibleState: boolean;
  shouldShowSectionSkeleton: boolean;
  shouldShowSubmitProgress: boolean;
}

export interface FocusRefetchOptions {
  refetchOnFocus: boolean;
  hasLoadedOnce: boolean;
  fetchData: (mode: ScreenLoadMode) => Promise<void>;
}

export interface ScreenPendingStateOptions {
  hasTruthfulFrame: boolean;
  mode: ScreenLoadMode;
  strategy: ScreenLoadingStrategy;
}

export interface ScreenFailureStateOptions extends ScreenPendingStateOptions {
  pendingState: ScreenPendingState;
}

export function createIdlePendingState(
  strategy: ScreenLoadingStrategy = 'cold-first',
): ScreenPendingState {
  return {
    mode: null,
    strategy,
    blocking: false,
    preservesVisibleState: false,
    shouldShowSectionSkeleton: false,
    shouldShowSubmitProgress: false,
  };
}

/** Default empty check shared by useScreen and tests. */
export function isScreenDataEmpty<T>(data: T | null): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data) && data.length === 0) return true;
  return false;
}

export function deriveScreenStatus<T>(
  data: T,
  isEmpty?: (value: T) => boolean,
): Extract<ScreenStatus, 'empty' | 'success'> {
  const empty = isEmpty ? isEmpty(data) : isScreenDataEmpty(data);
  return empty ? 'empty' : 'success';
}

export function isTruthfulScreenStatus(status: ScreenStatus): boolean {
  return status === 'success' || status === 'empty';
}

export function shouldPreserveVisibleState(
  options: ScreenPendingStateOptions,
): boolean {
  const { hasTruthfulFrame, mode, strategy } = options;

  if (!hasTruthfulFrame) return false;
  if (mode === 'silent' || mode === 'refresh' || mode === 'retry') return true;

  return strategy === 'warm-first' || strategy === 'section-skeleton';
}

export function deriveScreenPendingState(
  options: ScreenPendingStateOptions,
): ScreenPendingState {
  const preservesVisibleState = shouldPreserveVisibleState(options);
  const blocking = options.mode !== 'silent' && !preservesVisibleState;
  const shouldShowSectionSkeleton =
    options.strategy === 'section-skeleton' &&
    options.mode !== 'silent' &&
    !blocking;
  const shouldShowSubmitProgress =
    options.strategy === 'submit-only' &&
    options.mode !== 'silent' &&
    options.hasTruthfulFrame;

  return {
    mode: options.mode,
    strategy: options.strategy,
    blocking,
    preservesVisibleState,
    shouldShowSectionSkeleton,
    shouldShowSubmitProgress,
  };
}

export function shouldSurfaceBackgroundFailure(
  options: ScreenFailureStateOptions,
): boolean {
  return options.mode === 'silent' || options.pendingState.preservesVisibleState;
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
