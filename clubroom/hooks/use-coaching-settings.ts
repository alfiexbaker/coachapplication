/**
 * Hook: useCoachingSettings
 *
 * Manages coaching settings screen state: load/save scheduling rules with debounce.
 * Used by app/settings/coaching.tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { availabilityService } from '@/services/availability-service';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import { coachTravelService, type CoachTravelSettings } from '@/services/coach-travel-service';
import type { CoachSchedulingRules } from '@/constants/types';
import { err, ok, type ServiceError } from '@/types/result';

export function useCoachingSettings() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';

  const [rules, setRules] = useState<CoachSchedulingRules | null>(null);
  const [travelSettings, setTravelSettings] = useState<CoachTravelSettings | null>(null);
  const [blockedDateCount, setBlockedDateCount] = useState(0);
  const [policySummary, setPolicySummary] = useState('Standard cancellation policy');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Toast state
  const [showSaved, setShowSaved] = useState(false);
  const toastOpacity = useSharedValue(0);

  // Debounce timer ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRules = useCallback(async () => {
    if (!coachId) {
      return ok(schedulingRulesService.getDefaultRules('coach_default'));
    }

    const loadedResult = await schedulingRulesService.getCoachRules(coachId);
    if (loadedResult.success) {
      return ok(loadedResult.data);
    }
    return err(loadedResult.error);
  }, [coachId]);

  const {
    data,
    status,
    error: loadError,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<CoachSchedulingRules>({
    load: loadRules,
    deps: [coachId],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  useEffect(() => {
    if (data) {
      setRules(data);
      setSaveError(null);
    }
  }, [data]);

  useEffect(() => {
    if (!coachId) return;
    void (async () => {
      const [travelResult, policyResult, overrides] = await Promise.all([
        coachTravelService.getSettings(coachId),
        schedulingRulesService.getCancellationPolicy(coachId),
        availabilityService.getOverrides(coachId),
      ]);

      if (travelResult.success) {
        setTravelSettings(travelResult.data);
      }
      if (policyResult.success) {
        setPolicySummary(
          schedulingRulesService.getCancellationPolicySummary(policyResult.data),
        );
      }
      setBlockedDateCount(overrides.filter((override) => override.isBlocked).length);
    })();
  }, [coachId]);

  // Show "Saved" toast
  const flashSaved = useCallback(() => {
    setShowSaved(true);
    toastOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(
        1200,
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished) runOnJS(setShowSaved)(false);
        }),
      ),
    );
  }, [toastOpacity]);

  // Debounced save
  const persistRules = useCallback(
    (updated: CoachSchedulingRules) => {
      if (!coachId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const result = await schedulingRulesService.updateCoachRules(coachId, updated);
          if (!result.success) {
            setSaveError(result.error.message);
            return;
          }
          setRules(result.data);
          setSaveError(null);
          flashSaved();
        } catch {
          setSaveError('Failed to save coaching settings.');
        }
      }, 500);
    },
    [coachId, flashSaved],
  );

  // Generic updater
  const update = useCallback(
    <K extends keyof CoachSchedulingRules>(key: K, value: CoachSchedulingRules[K]) => {
      setRules((prev) => {
        if (!prev) return prev;
        const next = { ...prev, [key]: value };
        setSaveError(null);
        persistRules(next);
        return next;
      });
    },
    [persistRules],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const error =
    saveError ??
    (status === 'error'
      ? ((loadError as ServiceError | null)?.message ?? 'Failed to load coaching settings.')
      : null);

  return {
    loading: status === 'loading' && !rules,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    rules,
    travelSettings,
    blockedDateCount,
    policySummary,
    showSaved,
    toastOpacity,
    update,
    currentUser,
  } satisfies {
    loading: boolean;
    status: ScreenStatus;
    error: string | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    rules: CoachSchedulingRules | null;
    travelSettings: CoachTravelSettings | null;
    blockedDateCount: number;
    policySummary: string;
    showSaved: boolean;
    toastOpacity: SharedValue<number>;
    update: <K extends keyof CoachSchedulingRules>(key: K, value: CoachSchedulingRules[K]) => void;
    currentUser: ReturnType<typeof useAuth>['currentUser'];
  };
}
