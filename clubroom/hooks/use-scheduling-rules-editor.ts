/**
 * useSchedulingRulesEditor — State, auto-save with debounce, toast animation.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { CoachSchedulingRules } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import type { StepperConfig } from '@/components/coach/scheduling-rules-editor-config';

const logger = createLogger('SchedulingRulesEditor');

export function useSchedulingRulesEditor(coachId: string, onSaved?: (rules: CoachSchedulingRules) => void) {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<CoachSchedulingRules | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useSharedValue(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<Partial<CoachSchedulingRules>>({});

  // Load rules
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await schedulingRulesService.getCoachRules(coachId);
        if (!cancelled) setRules(data);
      } catch (err) {
        logger.error('Failed to load scheduling rules', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [coachId]);

  // Cleanup
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const showSavedToast = useCallback(() => {
    setToastVisible(true);
    toastOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1200 }),
      withTiming(0, { duration: 300 }),
    );
    setTimeout(() => setToastVisible(false), 1800);
  }, [toastOpacity]);

  const scheduleAutoSave = useCallback((updates: Partial<CoachSchedulingRules>) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const toSave = { ...pendingUpdatesRef.current };
      pendingUpdatesRef.current = {};
      try {
        const updated = await schedulingRulesService.updateCoachRules(coachId, toSave);
        setRules(updated);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showSavedToast();
        onSaved?.(updated);
        logger.debug('Auto-saved scheduling rules', toSave);
      } catch (err) { logger.error('Failed to auto-save scheduling rules', err); }
    }, 500);
  }, [coachId, onSaved, showSavedToast]);

  const handleStepperChange = useCallback((key: StepperConfig['key'], value: number) => {
    if (!rules) return;
    setRules({ ...rules, [key]: value });
    scheduleAutoSave({ [key]: value });
  }, [rules, scheduleAutoSave]);

  const handleToggle = useCallback((key: 'allowSameDayBookings' | 'allowRescheduling', value: boolean) => {
    if (!rules) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRules({ ...rules, [key]: value });
    scheduleAutoSave({ [key]: value });
  }, [rules, scheduleAutoSave]);

  const toastAnimatedStyle = useAnimatedStyle(() => ({ opacity: toastOpacity.value }));

  return {
    loading, rules, toastVisible, toastAnimatedStyle,
    handleStepperChange, handleToggle,
  };
}
