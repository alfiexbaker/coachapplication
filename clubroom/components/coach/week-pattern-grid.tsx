/**
 * WeekPatternGrid Component
 *
 * Unified weekly availability display that replaces the old day-pill selector
 * and slot card list. Supports normal mode (7 tappable day rows) and setup
 * mode (wizard for first-time availability configuration).
 *
 * Features:
 * - Multiple slots per day with sub-rows
 * - Week navigator for browsing future weeks
 * - Merged view showing templates + overrides for non-current weeks
 */

import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Switch, ScrollView, Platform, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { Colors, Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AvailabilityTemplate, AvailabilityOverride } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';

const logger = createLogger('WeekPatternGrid');

// Monday-first ordering for display
const DAYS_ORDERED = [
  { index: 1, short: 'MON', full: 'Monday' },
  { index: 2, short: 'TUE', full: 'Tuesday' },
  { index: 3, short: 'WED', full: 'Wednesday' },
  { index: 4, short: 'THU', full: 'Thursday' },
  { index: 5, short: 'FRI', full: 'Friday' },
  { index: 6, short: 'SAT', full: 'Saturday' },
  { index: 0, short: 'SUN', full: 'Sunday' },
];

interface SetupDayConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
  location: string;
}

interface WeekPatternGridProps {
  templates: AvailabilityTemplate[];
  overrides: AvailabilityOverride[];
  blockedDates: Set<string>;
  coachId: string;
  isSetupMode: boolean;
  onDayPress: (dayOfWeek: number, templateId?: string, dateStr?: string) => void;
  onSetupComplete?: (templates: AvailabilityTemplate[]) => void;
  onTimeOffPress?: (dateStr: string, existingOverride?: AvailabilityOverride) => void;
}

const PRESETS = [
  { id: 'weekdays', label: 'Weekdays 9-5', days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' },
  { id: 'mwf', label: 'Mon/Wed/Fri', days: [1, 3, 5], start: '09:00', end: '17:00' },
  { id: 'custom', label: 'Custom', days: [] as number[], start: '09:00', end: '17:00' },
];

/** Parses HH:MM to total minutes */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function WeekPatternGrid({
  templates,
  overrides,
  blockedDates,
  coachId,
  isSetupMode,
  onDayPress,
  onSetupComplete,
  onTimeOffPress,
}: WeekPatternGridProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const todayDow = new Date().getDay();

  // Week navigator state
  const [weekOffset, setWeekOffset] = useState(0);

  // Compute the Monday of the viewed week
  const viewedWeekStart = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const start = new Date(today);
    start.setDate(today.getDate() + mondayOffset + weekOffset * 7);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [weekOffset]);

  /** Returns YYYY-MM-DD for a given JS-day-index (0=Sun..6=Sat) in the viewed week */
  const getDateForDay = useCallback(
    (dayIndex: number): string => {
      // DAYS_ORDERED maps Mon=1..Sun=0. We need offset from Monday.
      // Monday=1 -> offset 0, Tue=2 -> 1, ... Sat=6 -> 5, Sun=0 -> 6
      const offsetFromMonday = dayIndex === 0 ? 6 : dayIndex - 1;
      const d = new Date(viewedWeekStart);
      d.setDate(viewedWeekStart.getDate() + offsetFromMonday);
      return toDateStr(d);
    },
    [viewedWeekStart]
  );

  // Week navigator label
  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'This Week';
    const endDate = new Date(viewedWeekStart);
    endDate.setDate(viewedWeekStart.getDate() + 6);
    const startDay = viewedWeekStart.getDate();
    const endDay = endDate.getDate();
    const startMonth = viewedWeekStart.toLocaleDateString('en-GB', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-GB', { month: 'short' });
    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  }, [weekOffset, viewedWeekStart]);

  // Setup mode state
  const [setupDays, setSetupDays] = useState<Record<number, SetupDayConfig>>(() => {
    const init: Record<number, SetupDayConfig> = {};
    for (const d of DAYS_ORDERED) {
      init[d.index] = { enabled: false, startTime: '09:00', endTime: '17:00', location: '' };
    }
    return init;
  });
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Summary stats — accounts for overrides when browsing non-current week
  const summaryStats = useMemo(() => {
    if (weekOffset === 0) {
      // Current week: just use templates
      let totalMinutes = 0;
      const daysWithSlots = new Set<number>();
      const venues = new Set<string>();
      templates.forEach((t) => {
        totalMinutes += timeToMinutes(t.endTime) - timeToMinutes(t.startTime);
        daysWithSlots.add(t.dayOfWeek);
        if (t.location) venues.add(t.location);
      });
      return {
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        daysCount: daysWithSlots.size,
        venueCount: venues.size,
      };
    }

    // Non-current week: merge templates + overrides + blocks
    let totalMinutes = 0;
    const daysWithSlots = new Set<number>();
    const venues = new Set<string>();

    for (const d of DAYS_ORDERED) {
      const dateStr = getDateForDay(d.index);
      const blockedByOverride = overrides.some(o => o.date === dateStr && o.isBlocked);
      if (blockedDates.has(dateStr) || blockedByOverride) continue;

      const override = overrides.find(
        (o) => o.date === dateStr && !o.isBlocked && (o.customSlots?.length ?? 0) > 0
      );

      if (override?.customSlots) {
        for (const slot of override.customSlots) {
          totalMinutes += timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
          daysWithSlots.add(d.index);
          if (slot.location) venues.add(slot.location);
        }
      } else {
        const dayTemplates = templates.filter((t) => t.dayOfWeek === d.index);
        for (const t of dayTemplates) {
          totalMinutes += timeToMinutes(t.endTime) - timeToMinutes(t.startTime);
          daysWithSlots.add(t.dayOfWeek);
          if (t.location) venues.add(t.location);
        }
      }
    }
    return {
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      daysCount: daysWithSlots.size,
      venueCount: venues.size,
    };
  }, [templates, weekOffset, overrides, blockedDates, getDateForDay]);

  // Get template(s) for a day
  const getTemplatesForDay = useCallback(
    (dayOfWeek: number) => templates.filter((t) => t.dayOfWeek === dayOfWeek),
    [templates]
  );

  // Get overrides for a specific date
  const getOverrideForDate = useCallback(
    (dateStr: string): { hasOverride: boolean; isBlocked: boolean; override: AvailabilityOverride | null } => {
      const blockedBySet = blockedDates.has(dateStr);
      const blockedByOverride = overrides.some((o) => o.date === dateStr && o.isBlocked);
      const found = overrides.find(
        (o) => o.date === dateStr && !o.isBlocked && (o.customSlots?.length ?? 0) > 0
      ) ?? null;
      return { hasOverride: found !== null, isBlocked: blockedBySet || blockedByOverride, override: found };
    },
    [overrides, blockedDates]
  );

  // Get overrides for today's week instance of a given day (current week only)
  const getOverrideIndicator = useCallback(
    (dayOfWeek: number): { hasOverride: boolean; isBlocked: boolean } => {
      const dateStr = getDateForDay(dayOfWeek);
      const hasOverride = overrides.some(
        (o) => o.date === dateStr && !o.isBlocked && (o.customSlots?.length ?? 0) > 0
      );
      const blockedBySet = blockedDates.has(dateStr);
      const blockedByOverride = overrides.some((o) => o.date === dateStr && o.isBlocked);
      return { hasOverride, isBlocked: blockedBySet || blockedByOverride };
    },
    [overrides, blockedDates, getDateForDay]
  );

  const formatTimeRange = (start: string, end: string) => {
    const fmt = (t: string) => {
      const [h] = t.split(':').map(Number);
      if (h === 12) return '12:00';
      if (h === 0) return '00:00';
      return t;
    };
    return `${fmt(start)} - ${fmt(end)}`;
  };

  // Setup mode handlers
  const handlePreset = (presetId: string) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActivePreset(presetId);

    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset || preset.id === 'custom') return;

    setSetupDays((prev) => {
      const next = { ...prev };
      for (const d of DAYS_ORDERED) {
        next[d.index] = {
          ...next[d.index],
          enabled: preset.days.includes(d.index),
          startTime: preset.start,
          endTime: preset.end,
        };
      }
      return next;
    });
  };

  const handleToggleDay = (dayIndex: number) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivePreset('custom');
    setSetupDays((prev) => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], enabled: !prev[dayIndex].enabled },
    }));
  };

  const handleSetupTimeChange = (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setSetupDays((prev) => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value },
    }));
  };

  const handleSetupComplete = () => {
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
    onSetupComplete?.(newTemplates);
  };

  const enabledCount = Object.values(setupDays).filter((d) => d.enabled).length;

  // ==================== SETUP MODE ====================
  if (isSetupMode) {
    return (
      <SurfaceCard style={styles.setupCard}>
        <View style={styles.setupHeader}>
          <Ionicons name="calendar-outline" size={28} color={palette.tint} />
          <ThemedText style={[styles.setupTitle, { color: palette.text }]}>
            Set Your Weekly Hours
          </ThemedText>
          <ThemedText style={[styles.setupSubtitle, { color: palette.muted }]}>
            Choose when athletes can book sessions with you
          </ThemedText>
        </View>

        {/* Presets */}
        <View style={styles.presetsRow}>
          {PRESETS.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <Clickable
                key={preset.id}
                onPress={() => handlePreset(preset.id)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isActive ? palette.tint : palette.surface,
                    borderColor: isActive ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.presetText,
                    { color: isActive ? palette.onPrimary : palette.text },
                  ]}
                >
                  {preset.label}
                </ThemedText>
              </Clickable>
            );
          })}
        </View>

        {/* Day toggles */}
        <View style={styles.setupDaysList}>
          {DAYS_ORDERED.map((d) => {
            const config = setupDays[d.index];
            return (
              <View key={d.index} style={[styles.setupDayRow, { borderBottomColor: palette.border }]}>
                <View style={styles.setupDayHeader}>
                  <ThemedText
                    style={[
                      styles.setupDayLabel,
                      { color: config.enabled ? palette.text : palette.muted },
                    ]}
                  >
                    {d.full}
                  </ThemedText>
                  <Switch
                    value={config.enabled}
                    onValueChange={() => handleToggleDay(d.index)}
                    trackColor={{ false: palette.border, true: withAlpha(palette.tint, 0.3) }}
                    thumbColor={config.enabled ? palette.tint : palette.muted}
                  />
                </View>
                {config.enabled && (
                  <View style={styles.setupDayTimes}>
                    <DateTimeField
                      mode="time"
                      label="Start"
                      value={config.startTime}
                      onChange={(v) => handleSetupTimeChange(d.index, 'startTime', v)}
                      minuteInterval={15}
                      style={{ flex: 1 }}
                    />
                    <View style={styles.timeArrow}>
                      <Ionicons name="arrow-forward" size={16} color={palette.muted} />
                    </View>
                    <DateTimeField
                      mode="time"
                      label="End"
                      value={config.endTime}
                      onChange={(v) => handleSetupTimeChange(d.index, 'endTime', v)}
                      minuteInterval={15}
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Get Started */}
        <Clickable
          onPress={handleSetupComplete}
          disabled={enabledCount === 0}
          style={[
            styles.getStartedBtn,
            {
              backgroundColor: enabledCount > 0 ? palette.tint : palette.border,
              opacity: enabledCount > 0 ? 1 : 0.5,
            },
          ]}
        >
          <ThemedText style={[styles.getStartedBtnText, { color: palette.onPrimary }]}>
            {enabledCount > 0
              ? `Get Started with ${enabledCount} Day${enabledCount !== 1 ? 's' : ''}`
              : 'Select at Least One Day'}
          </ThemedText>
        </Clickable>
      </SurfaceCard>
    );
  }

  // ==================== NORMAL MODE ====================

  /** Renders a single day row (template or override slot) */
  const renderSlotRow = ({
    dayLabel,
    showDayLabel,
    timeDisplay,
    locationDisplay,
    hasOverride,
    isBlocked,
    blockReason,
    isToday,
    hasTemplates,
    showSeparator,
    onPress,
  }: {
    dayLabel: string;
    showDayLabel: boolean;
    timeDisplay: string;
    locationDisplay: string | null;
    hasOverride: boolean;
    isBlocked: boolean;
    blockReason?: string;
    isToday: boolean;
    hasTemplates: boolean;
    showSeparator: boolean;
    onPress: () => void;
  }) => {
    const rowStyle: ViewStyle = {
      ...styles.dayRow,
      ...(showSeparator ? { borderBottomWidth: 1, borderBottomColor: palette.border } : {}),
      ...(isToday ? { backgroundColor: withAlpha(palette.tint, 0.03) } : {}),
      ...(isBlocked ? { backgroundColor: withAlpha(palette.error, 0.03) } : {}),
    };

    return (
      <Clickable
        onPress={() => {
          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={rowStyle}
      >
        {/* Day abbreviation */}
        <View style={styles.dayLabelCol}>
          {showDayLabel && (
            <ThemedText
              style={[
                styles.dayLabel,
                { color: isBlocked ? palette.muted : hasTemplates ? palette.text : palette.muted },
                isToday && !isBlocked ? { fontWeight: '700' as const, color: palette.tint } : undefined,
              ]}
            >
              {dayLabel}
            </ThemedText>
          )}
        </View>

        {/* Time range or Time Off label */}
        <View style={styles.dayTimeCol}>
          {isBlocked ? (
            <View style={styles.timeOffRow}>
              <Ionicons name="airplane-outline" size={14} color={palette.error} />
              <ThemedText style={[styles.dayTime, { color: palette.error, fontWeight: '600' }]}>
                {blockReason || 'Time Off'}
              </ThemedText>
            </View>
          ) : (
            <ThemedText
              style={[
                styles.dayTime,
                { color: hasTemplates ? palette.text : palette.muted },
              ]}
            >
              {timeDisplay}
            </ThemedText>
          )}
        </View>

        {/* Location pill (hidden when blocked) */}
        <View style={styles.dayLocationCol}>
          {!isBlocked && locationDisplay ? (
            <View style={[styles.locationPill, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
              <Ionicons name="location-outline" size={10} color={palette.tint} />
              <ThemedText style={[styles.locationPillText, { color: palette.tint }]} numberOfLines={1}>
                {locationDisplay}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Indicators */}
        <View style={styles.dayIndicators}>
          {hasOverride && !isBlocked && (
            <View style={[styles.indicatorDot, { backgroundColor: palette.warning }]} />
          )}
          <Ionicons name="chevron-forward" size={16} color={palette.muted} />
        </View>
      </Clickable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Week Navigator */}
      <View style={styles.weekNavRow}>
        <Clickable
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setWeekOffset((prev) => prev - 1);
          }}
          style={styles.weekNavArrow}
        >
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Clickable>

        <Clickable
          onPress={() => {
            if (weekOffset !== 0) {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWeekOffset(0);
            }
          }}
          style={styles.weekNavLabelBtn}
        >
          <ThemedText style={[styles.weekNavLabel, { color: palette.text }]}>
            {weekLabel}
          </ThemedText>
        </Clickable>

        <Clickable
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setWeekOffset((prev) => prev + 1);
          }}
          style={styles.weekNavArrow}
        >
          <Ionicons name="chevron-forward" size={20} color={palette.text} />
        </Clickable>
      </View>

      {/* Summary Row */}
      <View style={[styles.summaryRow, { backgroundColor: withAlpha(palette.tint, 0.05) }]}>
        <ThemedText style={[styles.summaryText, { color: palette.text }]}>
          {summaryStats.daysCount} day{summaryStats.daysCount !== 1 ? 's' : ''} {'\u00B7'}{' '}
          {summaryStats.totalHours} hrs/week
          {summaryStats.venueCount > 0
            ? ` \u00B7 ${summaryStats.venueCount} venue${summaryStats.venueCount !== 1 ? 's' : ''}`
            : ''}
        </ThemedText>
      </View>

      {/* Day Rows */}
      <SurfaceCard style={styles.gridCard}>
        {DAYS_ORDERED.map((d, i) => {
          const dayTemplates = getTemplatesForDay(d.index);
          const isToday = weekOffset === 0 && todayDow === d.index;
          const dateStr = getDateForDay(d.index);
          const isLastDay = i === DAYS_ORDERED.length - 1;

          // For non-current weeks, use merged view
          if (weekOffset !== 0) {
            const { hasOverride, isBlocked, override } = getOverrideForDate(dateStr);

            // Blocked day — show "Time Off" row
            if (isBlocked) {
              const blockingOverride = overrides.find(o => o.date === dateStr && o.isBlocked);
              // Synthesise a minimal override for legacy blocked dates so TimeOffSheet can remove them
              const effectiveOverride: AvailabilityOverride = blockingOverride ?? {
                id: `legacy_${dateStr}`,
                coachId,
                date: dateStr,
                isBlocked: true,
                reason: 'Time Off',
              };
              return (
                <View key={d.index}>
                  {renderSlotRow({
                    dayLabel: d.short,
                    showDayLabel: true,
                    timeDisplay: effectiveOverride.reason || 'Time Off',
                    locationDisplay: null,
                    hasOverride: false,
                    isBlocked: true,
                    blockReason: effectiveOverride.reason,
                    isToday: false,
                    hasTemplates: false,
                    showSeparator: !isLastDay,
                    onPress: () => onTimeOffPress?.(dateStr, effectiveOverride),
                  })}
                </View>
              );
            }

            if (hasOverride && override?.customSlots) {
              // Override slots — sub-rows + add block
              const slots = [...override.customSlots].sort((a, b) =>
                a.startTime.localeCompare(b.startTime)
              );

              return (
                <View key={d.index}>
                  {slots.map((slot, slotIdx) => (
                    <View key={`${d.index}-override-${slotIdx}`}>
                      {renderSlotRow({
                        dayLabel: d.short,
                        showDayLabel: slotIdx === 0,
                        timeDisplay: formatTimeRange(slot.startTime, slot.endTime),
                        locationDisplay: slot.location ?? null,
                        hasOverride: true,
                        isBlocked: false,
                        isToday: false,
                        hasTemplates: true,
                        showSeparator: false,
                        onPress: () => onDayPress(d.index, undefined, dateStr),
                      })}
                    </View>
                  ))}
                  {/* + Add time block — always visible */}
                  {renderAddBlockRow(d.index, !isLastDay, () => onDayPress(d.index, undefined, dateStr))}
                </View>
              );
            }

            // Fall back to templates for this day
            const sorted = [...dayTemplates].sort((a, b) => a.startTime.localeCompare(b.startTime));

            if (sorted.length === 0) {
              // No templates — single "--" row
              return (
                <View key={d.index}>
                  {renderSlotRow({
                    dayLabel: d.short,
                    showDayLabel: true,
                    timeDisplay: '--',
                    locationDisplay: null,
                    hasOverride: false,
                    isBlocked: false,
                    isToday: false,
                    hasTemplates: false,
                    showSeparator: !isLastDay,
                    onPress: () => onDayPress(d.index, undefined, dateStr),
                  })}
                </View>
              );
            }

            // 1+ templates — sub-rows + always show "+ Add time block"
            return (
              <View key={d.index}>
                {sorted.map((tmpl, tmplIdx) => (
                  <View key={tmpl.id}>
                    {renderSlotRow({
                      dayLabel: d.short,
                      showDayLabel: tmplIdx === 0,
                      timeDisplay: formatTimeRange(tmpl.startTime, tmpl.endTime),
                      locationDisplay: tmpl.location ?? null,
                      hasOverride: false,
                      isBlocked: false,
                      isToday: false,
                      hasTemplates: true,
                      showSeparator: false,
                      onPress: () => onDayPress(d.index, tmpl.id, dateStr),
                    })}
                  </View>
                ))}
                {/* + Add time block — always visible */}
                {renderAddBlockRow(d.index, !isLastDay, () => onDayPress(d.index, undefined, dateStr))}
              </View>
            );
          }

          // ========= CURRENT WEEK (weekOffset === 0) =========
          const { hasOverride, isBlocked: isCurrentBlocked } = getOverrideIndicator(d.index);
          const currentDateStr = getDateForDay(d.index);

          // Blocked day — show "Time Off" row
          if (isCurrentBlocked) {
            const blockingOverride = overrides.find(o => o.date === currentDateStr && o.isBlocked);
            // Synthesise a minimal override for legacy blocked dates so TimeOffSheet can remove them
            const effectiveOverride: AvailabilityOverride = blockingOverride ?? {
              id: `legacy_${currentDateStr}`,
              coachId,
              date: currentDateStr,
              isBlocked: true,
              reason: 'Time Off',
            };
            return (
              <View key={d.index}>
                {renderSlotRow({
                  dayLabel: d.short,
                  showDayLabel: true,
                  timeDisplay: effectiveOverride.reason || 'Time Off',
                  locationDisplay: null,
                  hasOverride: false,
                  isBlocked: true,
                  blockReason: effectiveOverride.reason,
                  isToday,
                  hasTemplates: false,
                  showSeparator: !isLastDay,
                  onPress: () => onTimeOffPress?.(currentDateStr, effectiveOverride),
                })}
              </View>
            );
          }

          if (dayTemplates.length === 0) {
            // No templates — single "--" row, tapping creates first block
            return (
              <View key={d.index}>
                {renderSlotRow({
                  dayLabel: d.short,
                  showDayLabel: true,
                  timeDisplay: '--',
                  locationDisplay: null,
                  hasOverride,
                  isBlocked: false,
                  isToday,
                  hasTemplates: false,
                  showSeparator: !isLastDay,
                  onPress: () => onDayPress(d.index, undefined, currentDateStr),
                })}
              </View>
            );
          }

          // 1+ templates — render each as a sub-row + always show "+ Add time block"
          const sorted = [...dayTemplates].sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <View key={d.index}>
              {sorted.map((tmpl, tmplIdx) => (
                <View key={tmpl.id}>
                  {renderSlotRow({
                    dayLabel: d.short,
                    showDayLabel: tmplIdx === 0,
                    timeDisplay: formatTimeRange(tmpl.startTime, tmpl.endTime),
                    locationDisplay: tmpl.location ?? null,
                    hasOverride: tmplIdx === 0 && hasOverride,
                    isBlocked: false,
                    isToday,
                    hasTemplates: true,
                    showSeparator: false,
                    onPress: () => onDayPress(d.index, tmpl.id, currentDateStr),
                  })}
                </View>
              ))}
              {/* + Add time block — always visible for days with templates */}
              {renderAddBlockRow(d.index, !isLastDay, () => onDayPress(d.index, undefined, currentDateStr))}
            </View>
          );
        })}
      </SurfaceCard>
    </View>
  );

  /** Renders the "+ Add time block" sub-row */
  function renderAddBlockRow(dayIndex: number, showSeparator: boolean, onPress: () => void) {
    const rowStyle: ViewStyle = {
      ...styles.addBlockRow,
      ...(showSeparator ? { borderBottomWidth: 1, borderBottomColor: palette.border } : {}),
    };

    return (
      <Clickable
        key={`add-block-${dayIndex}`}
        onPress={() => {
          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={rowStyle}
      >
        <View style={styles.dayLabelCol} />
        <View style={styles.addBlockContent}>
          <Ionicons name="add" size={14} color={palette.muted} />
          <ThemedText style={[styles.addBlockText, { color: palette.muted }]}>
            Add time block
          </ThemedText>
        </View>
      </Clickable>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  // Week Navigator
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekNavArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.xl,
  },
  weekNavLabelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  weekNavLabel: {
    ...Typography.bodySemiBold,
    textAlign: 'center',
  },
  // Summary
  summaryRow: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  summaryText: {
    ...Typography.smallSemiBold,
    textAlign: 'center',
  },
  // Grid
  gridCard: {
    padding: 0,
    overflow: 'hidden',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dayLabelCol: {
    width: 44,
  },
  dayLabel: {
    ...Typography.smallSemiBold,
  },
  dayTimeCol: {
    flex: 1,
    paddingHorizontal: Spacing.xs,
  },
  dayTime: {
    ...Typography.bodySmall,
  },
  timeOffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  dayLocationCol: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: Spacing.xs,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    maxWidth: 120,
  },
  locationPillText: {
    ...Typography.micro,
    textTransform: 'none',
    letterSpacing: 0,
  },
  dayIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    width: 36,
    justifyContent: 'flex-end',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Add time block row
  addBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  addBlockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  addBlockText: {
    ...Typography.small,
  },
  // Setup mode
  setupCard: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  setupHeader: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  setupTitle: {
    ...Typography.title,
    textAlign: 'center',
  },
  setupSubtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  presetChip: {
    paddingHorizontal: Spacing.sm,
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    ...Typography.smallSemiBold,
  },
  setupDaysList: {
    gap: 0,
  },
  setupDayRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  setupDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  setupDayLabel: {
    ...Typography.bodySemiBold,
  },
  setupDayTimes: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  timeArrow: {
    paddingBottom: Spacing.sm,
  },
  getStartedBtn: {
    minHeight: 52,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedBtnText: {
    ...Typography.bodySemiBold,
  },
});
