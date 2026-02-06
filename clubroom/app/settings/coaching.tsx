/**
 * Coaching Settings Screen
 *
 * iOS Settings-style hub for coach scheduling rules, cancellation policy,
 * and travel/location preferences. Auto-saves with 500ms debounce.
 *
 * USER STORY:
 * "As a coach, I want to configure my scheduling preferences in one place
 * so parents see accurate booking constraints."
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography, Shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { CoachSchedulingRules } from '@/constants/types';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StepperProps {
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  helperText?: string;
}

function Stepper({ label, value, onValueChange, min, max, step, suffix, helperText }: StepperProps) {
  const canDecrement = value - step >= min;
  const canIncrement = value + step <= max;

  return (
    <View style={styles.rowContainer}>
      <View style={styles.rowLabelArea}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        {helperText ? <ThemedText style={styles.rowHelper}>{helperText}</ThemedText> : null}
      </View>
      <View style={styles.stepperControl}>
        <Pressable
          onPress={() => canDecrement && onValueChange(value - step)}
          style={[styles.stepperButton, !canDecrement ? styles.stepperButtonDisabled : undefined]}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={18} color={canDecrement ? Colors.light.text : Colors.light.border} />
        </Pressable>
        <ThemedText style={styles.stepperValue}>
          {value}{suffix}
        </ThemedText>
        <Pressable
          onPress={() => canIncrement && onValueChange(value + step)}
          style={[styles.stepperButton, !canIncrement ? styles.stepperButtonDisabled : undefined]}
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons name="add" size={18} color={canIncrement ? Colors.light.text : Colors.light.border} />
        </Pressable>
      </View>
    </View>
  );
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  helperText?: string;
}

function ToggleRow({ label, value, onValueChange, helperText }: ToggleRowProps) {
  return (
    <View style={styles.rowContainer}>
      <View style={styles.rowLabelArea}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        {helperText ? <ThemedText style={styles.rowHelper}>{helperText}</ThemedText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.light.border, true: Colors.light.success }}
        thumbColor={Colors.light.surface}
      />
    </View>
  );
}

interface NavigationRowProps {
  label: string;
  value?: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

function NavigationRow({ label, value, onPress, icon }: NavigationRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.rowContainer, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.rowLabelArea}>
        {icon && (
          <View style={styles.navIconContainer}>
            <Ionicons name={icon} size={18} color={Colors.light.muted} />
          </View>
        )}
        <ThemedText style={styles.rowLabel} numberOfLines={1}>{label}</ThemedText>
      </View>
      <View style={styles.navRight}>
        {value ? <ThemedText style={styles.navValue} numberOfLines={1}>{value}</ThemedText> : null}
        <Ionicons name="chevron-forward" size={18} color={Colors.light.muted} />
      </View>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionHeaderText}>{title}</ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CoachingSettingsScreen() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<CoachSchedulingRules | null>(null);

  // Toast state
  const [showSaved, setShowSaved] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Debounce timer ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load rules on mount
  useEffect(() => {
    (async () => {
      try {
        const loaded = await schedulingRulesService.getCoachRules(coachId);
        setRules(loaded);
      } catch {
        // Use defaults on error
        setRules(schedulingRulesService.getDefaultRules(coachId));
      } finally {
        setLoading(false);
      }
    })();
  }, [coachId]);

  // Show "Saved" toast
  const flashSaved = useCallback(() => {
    setShowSaved(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowSaved(false));
  }, [toastOpacity]);

  // Debounced save
  const persistRules = useCallback(
    (updated: CoachSchedulingRules) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await schedulingRulesService.updateCoachRules(coachId, updated);
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

  if (loading || !rules) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Coaching Settings' }} />
        <ActivityIndicator size="large" color={Colors.light.text} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Coaching Settings',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Colors.light.background },
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Scheduling ---- */}
        <SectionHeader title="SCHEDULING" />
        <View style={styles.card}>
          <Stepper
            label="Buffer between sessions"
            value={rules.bufferMinutesDefault}
            onValueChange={(v) => update('bufferMinutesDefault', v)}
            min={0}
            max={60}
            step={5}
            suffix=" min"
            helperText="Time between back-to-back sessions"
          />
          <View style={styles.separator} />
          <Stepper
            label="Minimum notice"
            value={rules.minimumAdvanceBookingHours}
            onValueChange={(v) => update('minimumAdvanceBookingHours', v)}
            min={0}
            max={72}
            step={1}
            suffix="h"
            helperText="How far in advance parents must book"
          />
          <View style={styles.separator} />
          <Stepper
            label="Max advance booking"
            value={rules.maxAdvanceBookingDays}
            onValueChange={(v) => update('maxAdvanceBookingDays', v)}
            min={7}
            max={90}
            step={7}
            suffix=" days"
            helperText="How far ahead parents can book"
          />
          <View style={styles.separator} />
          <ToggleRow
            label="Allow same-day bookings"
            value={rules.allowSameDayBookings}
            onValueChange={(v) => update('allowSameDayBookings', v)}
            helperText="Let parents book sessions today"
          />
          <View style={styles.separator} />
          <ToggleRow
            label="Allow rescheduling"
            value={rules.allowRescheduling}
            onValueChange={(v) => update('allowRescheduling', v)}
            helperText="Let parents move confirmed sessions"
          />
          {rules.allowRescheduling && (
            <>
              <View style={styles.separator} />
              <Stepper
                label="Reschedule deadline"
                value={rules.rescheduleDeadlineHours}
                onValueChange={(v) => update('rescheduleDeadlineHours', v)}
                min={1}
                max={48}
                step={1}
                suffix="h"
                helperText="Minimum hours before session to reschedule"
              />
            </>
          )}
        </View>

        {/* ---- Cancellation Policy ---- */}
        <SectionHeader title="CANCELLATION POLICY" />
        <View style={styles.card}>
          <NavigationRow
            label="Cancellation policy"
            value="Standard"
            onPress={() => router.push(Routes.SETTINGS_CANCELLATION_POLICY)}
            icon="shield-checkmark-outline"
          />
        </View>

        {/* ---- Travel & Location ---- */}
        <SectionHeader title="TRAVEL & LOCATION" />
        <View style={styles.card}>
          <NavigationRow
            label="Travel radius"
            value={`${currentUser?.postcode ?? 'Set postcode'}`}
            onPress={() => router.push(Routes.SETTINGS_TRAVEL_RADIUS)}
            icon="location-outline"
          />
          <View style={styles.separator} />
          <NavigationRow
            label="Blocked dates"
            onPress={() => router.push(Routes.SETTINGS_BLOCKED_DATES)}
            icon="calendar-outline"
          />
          <View style={styles.separator} />
          <NavigationRow
            label="Smart slot suggestions"
            onPress={() => router.push(Routes.SETTINGS_SMART_SLOTS)}
            icon="sparkles-outline"
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Saved toast */}
      {showSaved && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={18} color={Colors.light.success} />
          <ThemedText style={styles.toastText}>Saved</ThemedText>
        </Animated.View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionHeaderText: {
    ...Typography.caption,
    color: Colors.light.muted,
    letterSpacing: 0.8,
  },

  // Card (section container)
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    ...Shadows.light.card,
    overflow: 'hidden',
  },

  // Row shared
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 52,
  },
  rowPressed: {
    backgroundColor: Colors.light.background,
  },
  rowLabelArea: {
    flex: 1,
    flexDirection: 'column',
    marginRight: Spacing.sm,
  },
  rowLabel: {
    ...Typography.body,
    color: Colors.light.text,
  },
  rowHelper: {
    ...Typography.small,
    color: Colors.light.muted,
    marginTop: Spacing.micro,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.light.border,
    marginLeft: Spacing.sm,
  },

  // Stepper
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    ...Typography.bodySemiBold,
    color: Colors.light.text,
    minWidth: 48,
    textAlign: 'center',
  },

  // Navigation row
  navIconContainer: {
    marginBottom: Spacing.micro,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  navValue: {
    ...Typography.small,
    color: Colors.light.muted,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: Spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    ...Shadows.light.card,
  },
  toastText: {
    ...Typography.bodySemiBold,
    color: Colors.light.success,
  },

  bottomSpacer: {
    height: Spacing.lg,
  },
});
