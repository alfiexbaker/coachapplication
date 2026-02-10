/**
 * Hook: useCoachingSettings
 *
 * Manages coaching settings screen state: load/save scheduling rules with debounce.
 * Used by app/settings/coaching.tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSharedValue, withSequence, withTiming, withDelay, runOnJS, type SharedValue } from 'react-native-reanimated';

import { useAuth } from '@/hooks/use-auth';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { CoachSchedulingRules } from '@/constants/types';

export function useCoachingSettings() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<CoachSchedulingRules | null>(null);

  // Toast state
  const [showSaved, setShowSaved] = useState(false);
  const toastOpacity = useSharedValue(0);

  // Debounce timer ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load rules on mount
  useEffect(() => {
    (async () => {
      try {
        const loadedResult = await schedulingRulesService.getCoachRules(coachId);
        if (loadedResult.success) {
          setRules(loadedResult.data);
        } else {
          setRules(schedulingRulesService.getDefaultRules(coachId));
        }
      } catch {
        setRules(schedulingRulesService.getDefaultRules(coachId));
      } finally {
        setLoading(false);
      }
    })();
  }, [coachId]);

  // Show "Saved" toast
  const flashSaved = useCallback(() => {
    setShowSaved(true);
    toastOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(1200, withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(setShowSaved)(false);
      })),
    );
  }, [toastOpacity]);

  // Debounced save
  const persistRules = useCallback(
    (updated: CoachSchedulingRules) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const result = await schedulingRulesService.updateCoachRules(coachId, updated);
          if (!result.success) {
            return;
          }
          flashSaved();
        } catch {
          // Silent fail for MVP
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

  return {
    loading,
    rules,
    showSaved,
    toastOpacity,
    update,
    currentUser,
  };
}
