/**
 * Scheduling Rules Editor
 *
 * Reusable inline component with stepper inputs for coach scheduling rules.
 * Auto-saves on each change with a 500ms debounce and shows a "Saved" toast.
 *
 * USER STORY:
 * "As a coach, I want to fine-tune my scheduling rules with precise steppers
 * so I have exact control over how athletes book sessions."
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { CoachSchedulingRules } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SchedulingRulesEditor');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepperConfig {
  key: keyof Pick<
    CoachSchedulingRules,
    | 'bufferMinutesDefault'
    | 'minimumAdvanceBookingHours'
    | 'maxAdvanceBookingDays'
    | 'rescheduleDeadlineHours'
    | 'maxConcurrentDefault'
  >;
  label: string;
  helper: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  step: number;
  min: number;
  max: number;
  formatValue: (v: number) => string;
}

interface SchedulingRulesEditorProps {
  coachId: string;
  /** Called after every successful auto-save */
  onSaved?: (rules: CoachSchedulingRules) => void;
}

// ---------------------------------------------------------------------------
// Stepper field definitions
// ---------------------------------------------------------------------------

const STEPPER_FIELDS: StepperConfig[] = [
  {
    key: 'bufferMinutesDefault',
    label: 'Buffer Between Sessions',
    helper: 'Break time between back-to-back bookings',
    icon: 'pause-outline',
    iconBg: Colors.light.tint,
    step: 5,
    min: 0,
    max: 60,
    formatValue: (v) => (v === 0 ? 'None' : `${v} min`),
  },
  {
    key: 'minimumAdvanceBookingHours',
    label: 'Minimum Advance Booking',
    helper: 'How much notice athletes must give when booking',
    icon: 'time-outline',
    iconBg: Colors.light.warning,
    step: 1,
    min: 0,
    max: 72,
    formatValue: (v) => {
      if (v === 0) return 'None';
      if (v >= 24) {
        const d = Math.floor(v / 24);
        const h = v % 24;
        return h === 0 ? `${d}d` : `${d}d ${h}h`;
      }
      return `${v}h`;
    },
  },
  {
    key: 'maxAdvanceBookingDays',
    label: 'Max Advance Booking',
    helper: 'How far ahead athletes can book sessions',
    icon: 'calendar-outline',
    iconBg: Colors.light.success,
    step: 7,
    min: 7,
    max: 90,
    formatValue: (v) => {
      if (v % 7 === 0) return `${v / 7} week${v / 7 > 1 ? 's' : ''}`;
      return `${v} days`;
    },
  },
  {
    key: 'rescheduleDeadlineHours',
    label: 'Reschedule Deadline',
    helper: 'Minimum notice to reschedule a booking',
    icon: 'swap-horizontal-outline',
    iconBg: Colors.light.tint,
    step: 1,
    min: 1,
    max: 48,
    formatValue: (v) => {
      if (v >= 24) {
        const d = Math.floor(v / 24);
        const h = v % 24;
        return h === 0 ? `${d}d` : `${d}d ${h}h`;
      }
      return `${v}h`;
    },
  },
  {
    key: 'maxConcurrentDefault',
    label: 'Max Concurrent Sessions',
    helper: 'Maximum sessions running at the same time',
    icon: 'people-outline',
    iconBg: Colors.light.tint,
    step: 1,
    min: 1,
    max: 5,
    formatValue: (v) => `${v}`,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StepperRowProps {
  config: StepperConfig;
  value: number;
  onChange: (newValue: number) => void;
  palette: (typeof Colors)['light'];
}

function StepperRow({ config, value, onChange, palette }: StepperRowProps) {
  const atMin = value <= config.min;
  const atMax = value >= config.max;

  const handleDecrement = () => {
    if (atMin) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.max(config.min, value - config.step));
  };

  const handleIncrement = () => {
    if (atMax) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.min(config.max, value + config.step));
  };

  return (
    <View style={styles.stepperRow}>
      <View style={styles.stepperInfo}>
        <View style={[styles.stepperIcon, { backgroundColor: withAlpha(config.iconBg, 0.07) }]}>
          <Ionicons name={config.icon} size={18} color={config.iconBg} />
        </View>
        <View style={styles.stepperLabels}>
          <ThemedText type="defaultSemiBold" style={styles.stepperLabel}>
            {config.label}
          </ThemedText>
          <ThemedText style={[styles.stepperHelper, { color: palette.muted }]}>
            {config.helper}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.stepperControls, { borderColor: palette.border }]}>
        <Clickable
          onPress={handleDecrement}
          disabled={atMin}
          style={[styles.stepperButton, { opacity: atMin ? 0.3 : 1 }]}
          accessibilityLabel={`Decrease ${config.label}`}
        >
          <Ionicons name="remove" size={18} color={palette.text} />
        </Clickable>

        <View style={[styles.stepperValue, { borderColor: palette.border }]}>
          <ThemedText type="defaultSemiBold" style={styles.stepperValueText}>
            {config.formatValue(value)}
          </ThemedText>
        </View>

        <Clickable
          onPress={handleIncrement}
          disabled={atMax}
          style={[styles.stepperButton, { opacity: atMax ? 0.3 : 1 }]}
          accessibilityLabel={`Increase ${config.label}`}
        >
          <Ionicons name="add" size={18} color={palette.text} />
        </Clickable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SchedulingRulesEditor({ coachId, onSaved }: SchedulingRulesEditorProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<CoachSchedulingRules | null>(null);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useSharedValue(0);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<Partial<CoachSchedulingRules>>({});

  // ------- Load rules -------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await schedulingRulesService.getCoachRules(coachId);
        if (!cancelled) {
          setRules(data);
        }
      } catch (err) {
        logger.error('Failed to load scheduling rules', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  // ------- Auto-save with debounce -------
  const showSavedToast = useCallback(() => {
    setToastVisible(true);
    toastOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1200 }),
      withTiming(0, { duration: 300 }),
    );
    setTimeout(() => setToastVisible(false), 1800);
  }, [toastOpacity]);

  const scheduleAutoSave = useCallback(
    (updates: Partial<CoachSchedulingRules>) => {
      // Merge with any pending updates
      pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

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
        } catch (err) {
          logger.error('Failed to auto-save scheduling rules', err);
        }
      }, 500);
    },
    [coachId, onSaved, showSavedToast],
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ------- Handlers -------
  const handleStepperChange = (key: StepperConfig['key'], value: number) => {
    if (!rules) return;
    setRules({ ...rules, [key]: value });
    scheduleAutoSave({ [key]: value });
  };

  const handleToggle = (key: 'allowSameDayBookings' | 'allowRescheduling', value: boolean) => {
    if (!rules) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRules({ ...rules, [key]: value });
    scheduleAutoSave({ [key]: value });
  };

  // ------- Toast animation -------
  const toastAnimatedStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
  }));

  // ------- Loading -------
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={palette.tint} />
      </View>
    );
  }

  if (!rules) {
    return (
      <View style={styles.loadingWrap}>
        <ThemedText style={{ color: palette.muted }}>Unable to load rules</ThemedText>
      </View>
    );
  }

  // Filter reschedule deadline stepper when rescheduling is disabled
  const visibleSteppers = STEPPER_FIELDS.filter((f) => {
    if (f.key === 'rescheduleDeadlineHours' && !rules.allowRescheduling) return false;
    return true;
  });

  return (
    <View style={styles.root}>
      {/* Saved toast */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: palette.success },
            toastAnimatedStyle,
          ]}
        >
          <Ionicons name="checkmark-circle" size={16} color={Colors.light.onSuccess} />
          <ThemedText style={styles.toastText}>Saved</ThemedText>
        </Animated.View>
      )}

      {/* Info banner */}
      <View style={[styles.infoBanner, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
        <Ionicons name="information-circle" size={20} color={palette.tint} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          Changes are saved automatically as you adjust each setting.
        </ThemedText>
      </View>

      {/* Stepper fields */}
      <SurfaceCard style={styles.steppersCard}>
        {visibleSteppers.map((config, idx) => (
          <View key={config.key}>
            {idx > 0 && <Divider spacing={Spacing.xs} />}
            <StepperRow
              config={config}
              value={rules[config.key] as number}
              onChange={(v) => handleStepperChange(config.key, v)}
              palette={palette}
            />
          </View>
        ))}
      </SurfaceCard>

      {/* Toggle fields */}
      <SurfaceCard style={styles.togglesCard}>
        {/* Allow Same-Day Bookings */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View style={[styles.toggleIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="today-outline" size={16} color={palette.success} />
            </View>
            <View style={styles.toggleLabels}>
              <ThemedText type="defaultSemiBold" style={styles.toggleLabel}>
                Same-Day Bookings
              </ThemedText>
              <ThemedText style={[styles.toggleHelper, { color: palette.muted }]}>
                Allow athletes to book sessions for today
              </ThemedText>
            </View>
          </View>
          <Switch
            value={rules.allowSameDayBookings}
            onValueChange={(v) => handleToggle('allowSameDayBookings', v)}
            trackColor={{ false: palette.border, true: palette.success }}
            thumbColor={Colors.light.surface}
          />
        </View>

        <Divider spacing={Spacing.xs} />

        {/* Allow Rescheduling */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View style={[styles.toggleIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="swap-horizontal-outline" size={16} color={palette.tint} />
            </View>
            <View style={styles.toggleLabels}>
              <ThemedText type="defaultSemiBold" style={styles.toggleLabel}>
                Allow Rescheduling
              </ThemedText>
              <ThemedText style={[styles.toggleHelper, { color: palette.muted }]}>
                Let athletes change their booking time
              </ThemedText>
            </View>
          </View>
          <Switch
            value={rules.allowRescheduling}
            onValueChange={(v) => handleToggle('allowRescheduling', v)}
            trackColor={{ false: palette.border, true: palette.tint }}
            thumbColor={Colors.light.surface}
          />
        </View>
      </SurfaceCard>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    gap: Spacing.md,
  },
  loadingWrap: {
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Toast
  toast: {
    position: 'absolute',
    top: -44,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    zIndex: 10,
  },
  toastText: { ...Typography.smallSemiBold, color: Colors.light.onSuccess },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  infoText: { ...Typography.small, flex: 1,
    lineHeight: 18 },

  // Steppers card
  steppersCard: {
    padding: Spacing.sm,
  },

  // Individual stepper row
  stepperRow: {
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  stepperInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepperIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLabels: {
    flex: 1,
  },
  stepperLabel: { ...Typography.bodySmall },
  stepperHelper: { ...Typography.caption, lineHeight: 16,
    marginTop: Spacing.micro },

  // Stepper control group
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  stepperButton: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 64,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: Spacing.xs,
  },
  stepperValueText: { ...Typography.bodySmall, textAlign: 'center' },

  // Toggles card
  togglesCard: {
    padding: Spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  toggleIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabels: {
    flex: 1,
  },
  toggleLabel: { ...Typography.bodySmall },
  toggleHelper: { ...Typography.caption, lineHeight: 16,
    marginTop: 1 },
});
