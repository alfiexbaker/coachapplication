/**
 * useScreen — Core data-loading hook for screens.
 *
 * Provides a state machine (loading → error → empty → success),
 * pull-to-refresh, event bus auto-subscribe, and theme colors.
 *
 * Usage:
 *   const { data, status, error, refreshing, onRefresh, retry, colors, scheme } = useScreen({
 *     load: () => bookingService.getAll({ filter: { coachId } }),
 *     deps: [coachId],
 *     events: [ServiceEvents.BOOKING_CREATED],
 *   });
 *
 *   if (status === 'loading') return <LoadingState variant="list" />;
 *   if (status === 'error') return <ErrorState message={error!.message} onRetry={retry} />;
 *   if (status === 'empty') return <EmptyState title="No bookings" message="..." />;
 *   // status === 'success' — data is T
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useState, useEffect, useRef } from 'react';

import { Colors, type ThemeName } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createIdlePendingState,
  deriveScreenPendingState,
  deriveScreenStatus,
  isTruthfulScreenStatus,
  normalizeUnknownError,
  runFocusRefetch,
  shouldSurfaceBackgroundFailure,
  type ScreenLoadingStrategy,
  type ScreenLoadMode,
  type ScreenPendingState,
  type ScreenStatus as CoreScreenStatus,
} from '@/hooks/use-screen-core';
import { withTimeout } from '@/utils/timeout';
import { onTyped } from '@/services/event-bus';
import type { EventPayloads } from '@/services/event-bus';
import type { Result, ServiceError } from '@/types/result';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

export type ScreenStatus = CoreScreenStatus;
type TruthfulScreenStatus = Extract<ScreenStatus, 'empty' | 'success'>;

const EMPTY_DEPS: ReadonlyArray<unknown> = [];
const EMPTY_EVENTS: ReadonlyArray<keyof EventPayloads> = [];

function markUnmounted(ref: { current: boolean }) {
  ref.current = false;
}

function areDependencyListsEqual(current: ReadonlyArray<unknown>, next: ReadonlyArray<unknown>) {
  return (
    current.length === next.length && current.every((value, index) => Object.is(value, next[index]))
  );
}

interface ScreenSnapshot<T> {
  data: T;
  status: TruthfulScreenStatus;
}

export interface UseScreenOptions<T> {
  /** Async function that returns a Result<T>. Called on mount and on refresh. */
  load: () => Promise<Result<T, ServiceError>>;
  /** Dependency array — re-fetches when these change. */
  deps?: ReadonlyArray<unknown>;
  /** Event bus events that trigger a re-fetch. */
  events?: ReadonlyArray<keyof EventPayloads>;
  /** Custom empty check. Default: null/undefined/empty-array = empty. */
  isEmpty?: (data: T) => boolean;
  /** Re-fetch silently when the screen gains focus after initial load. */
  refetchOnFocus?: boolean;
  /** Timeout in ms for the load function. Default: 10000 (10s). */
  loadTimeoutMs?: number;
  /** Declares whether refreshed content should preserve the current frame or block on load. */
  loadingStrategy?: ScreenLoadingStrategy;
  /** Logical identity for the requested data so warmed routes can hydrate the right truthful frame. */
  dataKey?: string | null;
}

export interface UseScreenResult<T> {
  data: T | null;
  status: ScreenStatus;
  error: ServiceError | null;
  /** Error from a silent focus refetch. Non-null when stale data is shown but refresh failed. */
  silentError: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  colors: ThemeColors;
  scheme: ThemeName;
  hasResolvedOnce: boolean;
  hasTruthfulFrame: boolean;
  isPending: boolean;
  pendingState: ScreenPendingState;
  showLoadingState: boolean;
  showSectionSkeleton: boolean;
  showSubmitProgress: boolean;
  loadingStrategy: ScreenLoadingStrategy;
  requestedDataKey: string | null;
  resolvedDataKey: string | null;
  hasRequestedTruthfulFrame: boolean;
}

export function useScreen<T>(options: UseScreenOptions<T>): UseScreenResult<T> {
  const {
    load,
    deps = EMPTY_DEPS,
    events = EMPTY_EVENTS,
    isEmpty,
    refetchOnFocus = false,
    loadTimeoutMs = 10_000,
    loadingStrategy = 'cold-first',
    dataKey = null,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ScreenStatus>('loading');
  const [error, setError] = useState<ServiceError | null>(null);
  const [silentError, setSilentError] = useState<ServiceError | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingState, setPendingState] = useState<ScreenPendingState>(() =>
    createIdlePendingState(loadingStrategy),
  );
  const [hasResolvedOnce, setHasResolvedOnce] = useState(false);
  const [resolvedDataKey, setResolvedDataKey] = useState<string | null>(null);

  // Theme
  const scheme: ThemeName = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);
  const hasLoadedOnceRef = useRef(false);
  const statusRef = useRef<ScreenStatus>('loading');
  const resolvedDataKeyRef = useRef<string | null>(null);
  const snapshotCacheRef = useRef<Map<string, ScreenSnapshot<T>>>(new Map());
  const loadRef = useRef(load);
  const isEmptyRef = useRef(isEmpty);
  const depsRef = useRef(deps);
  const [depsVersion, setDepsVersion] = useState(0);

  useEffect(() => {
    loadRef.current = load;
    isEmptyRef.current = isEmpty;
  });

  useEffect(() => {
    if (areDependencyListsEqual(depsRef.current, deps)) return;
    depsRef.current = deps;
    // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change -- useScreen increments an internal reload version when caller dependencies change.
    setDepsVersion((version) => version + 1);
  }, [deps]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    resolvedDataKeyRef.current = resolvedDataKey;
  }, [resolvedDataKey]);

  useEffect(() => {
    return () => {
      markUnmounted(mountedRef);
    };
  }, []);

  const fetchData = async (mode: ScreenLoadMode = 'initial') => {
    const currentStatus = statusRef.current;
    const requestedDataKey = dataKey ?? null;
    const cachedSnapshot =
      requestedDataKey !== null ? (snapshotCacheRef.current.get(requestedDataKey) ?? null) : null;
    const hasVisibleTruthfulFrame =
      isTruthfulScreenStatus(currentStatus) || cachedSnapshot !== null;
    const hasRequestedTruthfulFrame =
      requestedDataKey === null ||
      resolvedDataKeyRef.current === requestedDataKey ||
      cachedSnapshot !== null;

    if (cachedSnapshot) {
      setData(cachedSnapshot.data);
      setStatus(cachedSnapshot.status);
      setError(null);
      setSilentError(null);
      if (resolvedDataKeyRef.current !== requestedDataKey) {
        resolvedDataKeyRef.current = requestedDataKey;
        setResolvedDataKey(requestedDataKey);
      }
      setHasResolvedOnce(true);
    }

    const nextPendingState = deriveScreenPendingState({
      hasTruthfulFrame: hasVisibleTruthfulFrame,
      hasRequestedTruthfulFrame,
      mode,
      strategy: loadingStrategy,
    });

    setPendingState(nextPendingState);

    if (mode === 'refresh') {
      setRefreshing(true);
    }

    if (nextPendingState.blocking) {
      setStatus('loading');
      setError(null);
    }

    // Clear silent error on any non-silent fetch
    if (mode !== 'silent') {
      setSilentError(null);
    }

    return await runAsyncTryCatchFinally(
      async () => {
        const timeoutResult = await withTimeout(loadRef.current(), loadTimeoutMs);

        if (mountedRef.current) {
          // Timeout expired — treat as a network error
          if (!timeoutResult.success) {
            if (
              shouldSurfaceBackgroundFailure({
                hasTruthfulFrame: hasVisibleTruthfulFrame,
                hasRequestedTruthfulFrame,
                mode,
                strategy: loadingStrategy,
                pendingState: nextPendingState,
              })
            ) {
              setSilentError(timeoutResult.error);
            } else {
              setError(timeoutResult.error);
              setStatus('error');
            }
            return;
          }

          const result = timeoutResult.data;

          if (!result.success) {
            if (
              shouldSurfaceBackgroundFailure({
                hasTruthfulFrame: hasVisibleTruthfulFrame,
                hasRequestedTruthfulFrame,
                mode,
                strategy: loadingStrategy,
                pendingState: nextPendingState,
              })
            ) {
              // Silent refetch failed — show silentError, keep existing data visible
              setSilentError(result.error);
            } else {
              setError(result.error);
              setStatus('error');
            }
            return;
          }

          const resultData = result.data;
          const nextStatus = deriveScreenStatus(resultData, isEmptyRef.current);
          setData(resultData);
          setStatus(nextStatus);
          setError(null);
          setSilentError(null);
          if (requestedDataKey !== null) {
            snapshotCacheRef.current.set(requestedDataKey, {
              data: resultData,
              status: nextStatus,
            });
            if (resolvedDataKeyRef.current !== requestedDataKey) {
              resolvedDataKeyRef.current = requestedDataKey;
              setResolvedDataKey(requestedDataKey);
            }
          } else if (resolvedDataKeyRef.current !== null) {
            resolvedDataKeyRef.current = null;
            setResolvedDataKey(null);
          }
        }
      },
      async (loadError) => {
        if (!mountedRef.current) return;
        const normalizedError = normalizeUnknownError(loadError);
        if (
          shouldSurfaceBackgroundFailure({
            hasTruthfulFrame: hasVisibleTruthfulFrame,
            hasRequestedTruthfulFrame,
            mode,
            strategy: loadingStrategy,
            pendingState: nextPendingState,
          })
        ) {
          setSilentError(normalizedError);
        } else {
          setError(normalizedError);
          setStatus('error');
        }
      },
      () => {
        if (mode === 'refresh' && mountedRef.current) {
          setRefreshing(false);
        }
        if (mountedRef.current) {
          setPendingState(createIdlePendingState(loadingStrategy));
          setHasResolvedOnce(true);
        }
        hasLoadedOnceRef.current = true;
      },
    );
  };
  const fetchDataRef = useRef(fetchData);

  useEffect(() => {
    fetchDataRef.current = fetchData;
  });

  // Initial load + deps change
  useEffect(() => {
    void fetchDataRef.current(hasLoadedOnceRef.current ? 'dependency-change' : 'initial');
  }, [depsVersion]);

  // Optional focus-triggered silent refetch (no loading spinner/status reset).
  useFocusEffect(
    useCallback(() => {
      runFocusRefetch({
        refetchOnFocus,
        hasLoadedOnce: hasLoadedOnceRef.current,
        fetchData: fetchDataRef.current,
      });
    }, [refetchOnFocus]),
  );

  // Event bus subscriptions — re-fetch on relevant events
  useEffect(() => {
    if (events.length === 0) return;

    const unsubscribers = events.map((event) =>
      onTyped(event, () => {
        void fetchDataRef.current('silent');
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [events]);

  const onRefresh = () => {
    void fetchDataRef.current('refresh');
  };

  const retry = () => {
    void fetchDataRef.current('retry');
  };

  const hasTruthfulFrame = isTruthfulScreenStatus(status);
  const requestedDataKey = dataKey ?? null;
  const hasRequestedTruthfulFrame =
    requestedDataKey === null || resolvedDataKey === requestedDataKey;
  const isPending = pendingState.mode !== null;

  return {
    data,
    status,
    error,
    silentError,
    refreshing,
    onRefresh,
    retry,
    colors,
    scheme,
    hasResolvedOnce,
    hasTruthfulFrame,
    isPending,
    pendingState,
    showLoadingState: status === 'loading',
    showSectionSkeleton: pendingState.shouldShowSectionSkeleton,
    showSubmitProgress: pendingState.shouldShowSubmitProgress,
    loadingStrategy,
    requestedDataKey,
    resolvedDataKey,
    hasRequestedTruthfulFrame,
  };
}
