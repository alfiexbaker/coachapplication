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
import { useState, useEffect, useCallback, useRef } from 'react';

import { Colors, type ThemeName } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  deriveScreenStatus,
  normalizeUnknownError,
  runFocusRefetch,
  type ScreenLoadMode,
} from '@/hooks/use-screen-core';
import { withTimeout } from '@/utils/timeout';
import { onTyped } from '@/services/event-bus';
import type { EventPayloads } from '@/services/event-bus';
import type { Result, ServiceError } from '@/types/result';

export type ScreenStatus = 'loading' | 'error' | 'empty' | 'success';

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
}

export function useScreen<T>(options: UseScreenOptions<T>): UseScreenResult<T> {
  const { load, deps = [], events = [], isEmpty, refetchOnFocus = false, loadTimeoutMs = 10_000 } = options;

  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ScreenStatus>('loading');
  const [error, setError] = useState<ServiceError | null>(null);
  const [silentError, setSilentError] = useState<ServiceError | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Theme
  const scheme: ThemeName = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);
  const hasLoadedOnceRef = useRef(false);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async (mode: ScreenLoadMode = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else if (mode === 'initial') {
      setStatus('loading');
      setError(null);
    }

    // Clear silent error on any non-silent fetch
    if (mode !== 'silent') {
      setSilentError(null);
    }

    try {
      const timeoutResult = await withTimeout(load(), loadTimeoutMs);

      if (!mountedRef.current) return;

      // Timeout expired — treat as a network error
      if (!timeoutResult.success) {
        if (mode === 'silent') {
          setSilentError(timeoutResult.error);
        } else {
          setError(timeoutResult.error);
          setStatus('error');
        }
        return;
      }

      const result = timeoutResult.data;

      if (!result.success) {
        if (mode === 'silent') {
          // Silent refetch failed — show silentError, keep existing data visible
          setSilentError(result.error);
        } else {
          setError(result.error);
          setStatus('error');
        }
        return;
      }

      const resultData = result.data;
      setData(resultData);
      setStatus(deriveScreenStatus(resultData, isEmpty));
      setError(null);
      setSilentError(null);
    } catch (loadError) {
      if (!mountedRef.current) return;
      if (mode === 'silent') {
        setSilentError(normalizeUnknownError(loadError));
      } else {
        setError(normalizeUnknownError(loadError));
        setStatus('error');
      }
    } finally {
      if (mode === 'refresh' && mountedRef.current) {
        setRefreshing(false);
      }
      hasLoadedOnceRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, loadTimeoutMs]);

  // Initial load + deps change
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Optional focus-triggered silent refetch (no loading spinner/status reset).
  useFocusEffect(
    useCallback(() => {
      runFocusRefetch({
        refetchOnFocus,
        hasLoadedOnce: hasLoadedOnceRef.current,
        fetchData,
      });
    }, [fetchData, refetchOnFocus]),
  );

  // Event bus subscriptions — re-fetch on relevant events
  useEffect(() => {
    if (events.length === 0) return;

    const unsubscribers = events.map((event) =>
      onTyped(event, () => {
        void fetchData('silent');
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [events, fetchData]);

  const onRefresh = useCallback(() => {
    void fetchData('refresh');
  }, [fetchData]);

  const retry = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  return { data, status, error, silentError, refreshing, onRefresh, retry, colors, scheme };
}
