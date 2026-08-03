/**
 * Hook: useCoachingSettings
 *
 * Manages coaching settings screen state: load/save scheduling rules with debounce.
 * Used by app/settings/coaching.tsx
 */

import { useState, useEffect, useRef, startTransition } from 'react';
import {
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { availabilityService } from '@/services/availability-service';
import {
  diffCoachSchedulingRules,
  schedulingRulesService,
} from '@/services/scheduling-rules-service';
import { coachTravelService, type CoachTravelSettings } from '@/services/coach-travel-service';
import type { CoachSchedulingRules } from '@/constants/types';
import { err, ok, type ServiceError } from '@/types/result';

function clearSaveTimer(ref: { current: ReturnType<typeof setTimeout> | null }) {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

export function useCoachingSettings() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';

  const [rules, setRules] = useState<CoachSchedulingRules | null>(null);
  const [travelSettings, setTravelSettings] = useState<CoachTravelSettings | null>(null);
  const [blockedDateCount, setBlockedDateCount] = useState(0);
  const [policySummary, setPolicySummary] = useState('Standard');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Toast state
  const [showSaved, setShowSaved] = useState(false);
  const toastOpacity = useSharedValue(0);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  const draftRules = useRef<CoachSchedulingRules | null>(null);
  const persistedRules = useRef<CoachSchedulingRules | null>(null);

  const loadRules = async () => {
    if (!coachId) {
      return ok(schedulingRulesService.getDefaultRules('coach_default'));
    }

    const loadedResult = await schedulingRulesService.getCoachRules(coachId);
    if (loadedResult.success) {
      return ok(loadedResult.data);
    }
    return err(loadedResult.error);
  };

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
    loadingStrategy: 'section-skeleton',
    dataKey: coachId ? `coaching-settings:${coachId}` : 'coaching-settings:anonymous',
  });

  useEffect(() => {
    if (data && !savingRef.current && !saveTimer.current) {
      draftRules.current = data;
      persistedRules.current = data;
      startTransition(() => {
        setRules(data);
        setSaveError(null);
      });
    }
  }, [data]);

  useEffect(() => {
    if (!coachId) return;
    let active = true;
    void (async () => {
      const [travelResult, policyResult, overrides] = await Promise.all([
        coachTravelService.getSettings(coachId),
        schedulingRulesService.getCancellationPolicy(coachId),
        availabilityService.getOverrides(coachId),
      ]);

      if (!active) return;
      if (travelResult.success) {
        setTravelSettings(travelResult.data);
      }
      if (policyResult.success) {
        setPolicySummary(policyResult.data?.name ?? 'Not set');
      }
      setBlockedDateCount(overrides.filter((override) => override.isBlocked).length);
    })().catch(() => {
      // These summaries are secondary. Their routes still load authoritative state when opened.
    });

    return () => {
      active = false;
    };
  }, [coachId]);

  // Show "Saved" toast
  const flashSaved = () => {
    setShowSaved(true);
    toastOpacity.set(
      withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(
          1200,
          withTiming(0, { duration: 300 }, (finished) => {
            if (finished) scheduleOnRN(setShowSaved, false);
          }),
        ),
      ),
    );
  };

  const update = <K extends keyof CoachSchedulingRules>(key: K, value: CoachSchedulingRules[K]) => {
    const current = draftRules.current;
    const persisted = persistedRules.current;
    if (!coachId || savingRef.current || !current || !persisted) return;

    const next = { ...current, [key]: value };
    draftRules.current = next;
    setRules(next);
    setSaveError(null);

    clearSaveTimer(saveTimer);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      const serverRules = persistedRules.current ?? persisted;
      const patch = diffCoachSchedulingRules(serverRules, draftRules.current ?? next);
      if (Object.keys(patch).length === 0) return;

      savingRef.current = true;
      setSaving(true);
      const rollback = (message: string) => {
        const restored = persistedRules.current ?? persisted;
        draftRules.current = restored;
        setRules(restored);
        setSaveError(message);
      };

      void schedulingRulesService
        .updateCoachRules(coachId, patch)
        .then(
          (result) => {
            if (!mountedRef.current) return;
            if (!result.success) {
              rollback('Not saved. Previous settings restored.');
              return;
            }
            persistedRules.current = result.data;
            draftRules.current = result.data;
            setRules(result.data);
            setSaveError(null);
            flashSaved();
          },
          () => {
            if (mountedRef.current) rollback('Not saved. Previous settings restored.');
          },
        )
        .finally(() => {
          savingRef.current = false;
          if (mountedRef.current) setSaving(false);
        });
    }, 300);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearSaveTimer(saveTimer);
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
    saving,
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
    saving: boolean;
    showSaved: boolean;
    toastOpacity: SharedValue<number>;
    update: <K extends keyof CoachSchedulingRules>(key: K, value: CoachSchedulingRules[K]) => void;
    currentUser: ReturnType<typeof useAuth>['currentUser'];
  };
}
