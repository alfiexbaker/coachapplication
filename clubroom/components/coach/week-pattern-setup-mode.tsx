/**
 * WeekPatternSetupMode — First-time availability configuration wizard.
 */
import { memo, useState, useCallback } from 'react';
import { View, StyleSheet, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';
import type { AvailabilityTemplate } from '@/constants/types';
import { DAYS_ORDERED, PRESETS, type SetupDayConfig } from './week-pattern-types';

const logger = createLogger('WeekPatternSetup');

interface WeekPatternSetupModeProps {
  coachId: string;
  onSetupComplete: (templates: AvailabilityTemplate[]) => void;
}

function WeekPatternSetupModeInner({ coachId, onSetupComplete }: WeekPatternSetupModeProps) {
  const { colors: palette } = useTheme();

  const [setupDays, setSetupDays] = useState<Record<number, SetupDayConfig>>(() => {
    const init: Record<number, SetupDayConfig> = {};
    for (const d of DAYS_ORDERED) {
      init[d.index] = { enabled: false, startTime: '09:00', endTime: '17:00', location: '' };
    }
    return init;
  });
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handlePreset = useCallback((presetId: string) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActivePreset(presetId);
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset || preset.id === 'custom') return;
    setSetupDays((prev) => {
      const next = { ...prev };
      for (const d of DAYS_ORDERED) {
        next[d.index] = { ...next[d.index], enabled: preset.days.includes(d.index), startTime: preset.start, endTime: preset.end };
      }
      return next;
    });
  }, []);

  const handleToggleDay = useCallback((dayIndex: number) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivePreset('custom');
    setSetupDays((prev) => ({ ...prev, [dayIndex]: { ...prev[dayIndex], enabled: !prev[dayIndex].enabled } }));
  }, []);

  const handleTimeChange = useCallback((dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setSetupDays((prev) => ({ ...prev, [dayIndex]: { ...prev[dayIndex], [field]: value } }));
  }, []);

  const handleComplete = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newTemplates: AvailabilityTemplate[] = [];
    for (const d of DAYS_ORDERED) {
      const config = setupDays[d.index];
      if (!config.enabled) continue;
      newTemplates.push({
        id: `tmpl_setup_${Date.now()}_${d.index}`,
        coachId,
        dayOfWeek: d.index as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        startTime: config.startTime,
        endTime: config.endTime,
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
        location: config.location || undefined,
      });
    }
    logger.info('Setup complete', { days: newTemplates.length });
    onSetupComplete(newTemplates);
  }, [setupDays, coachId, onSetupComplete]);

  const enabledCount = Object.values(setupDays).filter((d) => d.enabled).length;

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={28} color={palette.tint} />
        <ThemedText style={[styles.title, { color: palette.text }]}>Set Your Weekly Hours</ThemedText>
        <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
          Choose when athletes can book sessions with you
        </ThemedText>
      </View>

      <View style={styles.presetsRow}>
        {PRESETS.map((preset) => {
          const isActive = activePreset === preset.id;
          return (
            <Clickable
              key={preset.id}
              onPress={() => handlePreset(preset.id)}
              style={[styles.presetChip, { backgroundColor: isActive ? palette.tint : palette.surface, borderColor: isActive ? palette.tint : palette.border }]}
            >
              <ThemedText style={[styles.presetText, { color: isActive ? palette.onPrimary : palette.text }]}>{preset.label}</ThemedText>
            </Clickable>
          );
        })}
      </View>

      <View style={styles.daysList}>
        {DAYS_ORDERED.map((d) => {
          const config = setupDays[d.index];
          return (
            <View key={d.index} style={[styles.dayRow, { borderBottomColor: palette.border }]}>
              <View style={styles.dayHeader}>
                <ThemedText style={[styles.dayLabel, { color: config.enabled ? palette.text : palette.muted }]}>{d.full}</ThemedText>
                <Switch
                  value={config.enabled}
                  onValueChange={() => handleToggleDay(d.index)}
                  trackColor={{ false: palette.border, true: withAlpha(palette.tint, 0.3) }}
                  thumbColor={config.enabled ? palette.tint : palette.muted}
                />
              </View>
              {config.enabled && (
                <View style={styles.dayTimes}>
                  <DateTimeField mode="time" label="Start" value={config.startTime} onChange={(v) => handleTimeChange(d.index, 'startTime', v)} minuteInterval={15} style={{ flex: 1 }} />
                  <View style={styles.timeArrow}><Ionicons name="arrow-forward" size={16} color={palette.muted} /></View>
                  <DateTimeField mode="time" label="End" value={config.endTime} onChange={(v) => handleTimeChange(d.index, 'endTime', v)} minuteInterval={15} style={{ flex: 1 }} />
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Clickable
        onPress={handleComplete}
        disabled={enabledCount === 0}
        style={[styles.getStartedBtn, { backgroundColor: enabledCount > 0 ? palette.tint : palette.border, opacity: enabledCount > 0 ? 1 : 0.5 }]}
      >
        <ThemedText style={[styles.getStartedText, { color: palette.onPrimary }]}>
          {enabledCount > 0 ? `Get Started with ${enabledCount} Day${enabledCount !== 1 ? 's' : ''}` : 'Select at Least One Day'}
        </ThemedText>
      </Clickable>
    </SurfaceCard>
  );
}

export const WeekPatternSetupMode = memo(WeekPatternSetupModeInner);

const styles = StyleSheet.create({
  card: { padding: Spacing.lg, gap: Spacing.lg },
  header: { alignItems: 'center', gap: Spacing.xs },
  title: { ...Typography.title, textAlign: 'center' },
  subtitle: { ...Typography.bodySmall, textAlign: 'center' },
  presetsRow: { flexDirection: 'row', gap: Spacing.xs, justifyContent: 'center' },
  presetChip: { paddingHorizontal: Spacing.sm, minHeight: 44, borderRadius: Radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  presetText: { ...Typography.smallSemiBold },
  daysList: { gap: 0 },
  dayRow: { paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  dayLabel: { ...Typography.bodySemiBold },
  dayTimes: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, marginTop: Spacing.sm },
  timeArrow: { paddingBottom: Spacing.sm },
  getStartedBtn: { minHeight: 52, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  getStartedText: { ...Typography.bodySemiBold },
});
