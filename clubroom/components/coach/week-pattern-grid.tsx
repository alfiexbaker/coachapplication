/**
 * WeekPatternGrid — Unified weekly availability display.
 * Setup mode delegates to WeekPatternSetupMode; normal mode renders
 * day rows with week navigation, summary stats, and override merging.
 */
import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { AvailabilityOverride } from '@/constants/types';
import { toDateStr } from '@/utils/format';
import { useTheme } from '@/hooks/useTheme';

import {
  DAYS_ORDERED,
  timeToMinutes,
  formatTimeRange,
  type WeekPatternGridProps,
} from './week-pattern-types';
import { WeekPatternSetupMode } from './week-pattern-setup-mode';
import { WeekPatternSlotRow, WeekPatternAddBlockRow } from './week-pattern-slot-row';
import { Row } from '@/components/primitives';

export { type WeekPatternGridProps } from './week-pattern-types';

export function WeekPatternGrid(props: WeekPatternGridProps) {
  const {
    templates,
    overrides,
    blockedDates,
    coachId,
    isSetupMode,
    onDayPress,
    onSetupComplete,
    onTimeOffPress,
  } = props;
  const { colors: palette } = useTheme();
  const todayDow = new Date().getDay();
  const [weekOffset, setWeekOffset] = useState(0);

  // Compute Monday of viewed week
  const viewedWeekStart = useMemo(() => {
    const today = new Date();
    const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() + mondayOffset + weekOffset * 7);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [weekOffset]);

  const getDateForDay = useCallback(
    (dayIndex: number): string => {
      const offset = dayIndex === 0 ? 6 : dayIndex - 1;
      const d = new Date(viewedWeekStart);
      d.setDate(viewedWeekStart.getDate() + offset);
      return toDateStr(d);
    },
    [viewedWeekStart],
  );

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'This Week';
    const end = new Date(viewedWeekStart);
    end.setDate(viewedWeekStart.getDate() + 6);
    const sM = viewedWeekStart.toLocaleDateString('en-GB', { month: 'short' });
    const eM = end.toLocaleDateString('en-GB', { month: 'short' });
    return sM === eM
      ? `${viewedWeekStart.getDate()} - ${end.getDate()} ${sM}`
      : `${viewedWeekStart.getDate()} ${sM} - ${end.getDate()} ${eM}`;
  }, [weekOffset, viewedWeekStart]);

  // Summary stats
  const stats = useMemo(() => {
    let mins = 0;
    const days = new Set<number>();
    const venues = new Set<string>();
    for (const d of DAYS_ORDERED) {
      const dateStr = getDateForDay(d.index);
      if (blockedDates.has(dateStr) || overrides.some((o) => o.date === dateStr && o.isBlocked))
        continue;
      const ovr = overrides.find(
        (o) => o.date === dateStr && !o.isBlocked && (o.customSlots?.length ?? 0) > 0,
      );
      const slots =
        ovr?.customSlots ??
        (weekOffset === 0
          ? templates.filter((t) => t.dayOfWeek === d.index)
          : templates.filter((t) => t.dayOfWeek === d.index));
      for (const s of slots) {
        mins += timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
        days.add(d.index);
        if (s.location) venues.add(s.location);
      }
    }
    return { hrs: Math.round((mins / 60) * 10) / 10, days: days.size, venues: venues.size };
  }, [templates, overrides, blockedDates, weekOffset, getDateForDay]);

  // Helpers
  const getTemplatesForDay = useCallback(
    (dow: number) => templates.filter((t) => t.dayOfWeek === dow),
    [templates],
  );

  const getOverrideForDate = useCallback(
    (dateStr: string) => {
      const isBlocked =
        blockedDates.has(dateStr) || overrides.some((o) => o.date === dateStr && o.isBlocked);
      const ovr =
        overrides.find(
          (o) => o.date === dateStr && !o.isBlocked && (o.customSlots?.length ?? 0) > 0,
        ) ?? null;
      return { hasOverride: ovr !== null, isBlocked, override: ovr };
    },
    [overrides, blockedDates],
  );

  const haptic = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const makeBlockedOverride = (dateStr: string): AvailabilityOverride =>
    overrides.find((o) => o.date === dateStr && o.isBlocked) ?? {
      id: `legacy_${dateStr}`,
      coachId,
      date: dateStr,
      isBlocked: true,
      reason: 'Time Off',
    };

  // Delegate setup mode entirely
  if (isSetupMode) {
    return <WeekPatternSetupMode coachId={coachId} onSetupComplete={onSetupComplete!} />;
  }

  // Render a day's rows for a given date
  const renderDayRows = (d: (typeof DAYS_ORDERED)[number], idx: number) => {
    const isLast = idx === DAYS_ORDERED.length - 1;
    const dateStr = getDateForDay(d.index);
    const isToday = weekOffset === 0 && todayDow === d.index;
    const dayTemplates = getTemplatesForDay(d.index);
    const { hasOverride, isBlocked, override } = getOverrideForDate(dateStr);

    if (isBlocked) {
      const eff = makeBlockedOverride(dateStr);
      return (
        <View key={d.index}>
          <WeekPatternSlotRow
            dayLabel={d.short}
            showDayLabel
            timeDisplay={eff.reason || 'Time Off'}
            locationDisplay={null}
            hasOverride={false}
            isBlocked
            blockReason={eff.reason}
            isToday={isToday}
            hasTemplates={false}
            showSeparator={!isLast}
            onPress={() => onTimeOffPress?.(dateStr, eff)}
          />
        </View>
      );
    }

    // Override slots for non-current weeks
    if (hasOverride && override?.customSlots) {
      const slots = [...override.customSlots].sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );
      return (
        <View key={d.index}>
          {slots.map((slot, si) => (
            <WeekPatternSlotRow
              key={`${d.index}-o-${si}`}
              dayLabel={d.short}
              showDayLabel={si === 0}
              timeDisplay={formatTimeRange(slot.startTime, slot.endTime)}
              locationDisplay={slot.location ?? null}
              hasOverride
              isBlocked={false}
              isToday={false}
              hasTemplates
              showSeparator={false}
              onPress={() => onDayPress(d.index, undefined, dateStr)}
            />
          ))}
          <WeekPatternAddBlockRow
            dayIndex={d.index}
            showSeparator={!isLast}
            onPress={() => onDayPress(d.index, undefined, dateStr)}
          />
        </View>
      );
    }

    // Templates
    const sorted = [...dayTemplates].sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (sorted.length === 0) {
      return (
        <View key={d.index}>
          <WeekPatternSlotRow
            dayLabel={d.short}
            showDayLabel
            timeDisplay="--"
            locationDisplay={null}
            hasOverride={weekOffset === 0 && hasOverride}
            isBlocked={false}
            isToday={isToday}
            hasTemplates={false}
            showSeparator={!isLast}
            onPress={() => onDayPress(d.index, undefined, dateStr)}
          />
        </View>
      );
    }

    return (
      <View key={d.index}>
        {sorted.map((tmpl, ti) => (
          <WeekPatternSlotRow
            key={tmpl.id}
            dayLabel={d.short}
            showDayLabel={ti === 0}
            timeDisplay={formatTimeRange(tmpl.startTime, tmpl.endTime)}
            locationDisplay={tmpl.location ?? null}
            hasOverride={ti === 0 && (weekOffset === 0 ? hasOverride : false)}
            isBlocked={false}
            isToday={isToday}
            hasTemplates
            showSeparator={false}
            onPress={() => onDayPress(d.index, tmpl.id, dateStr)}
          />
        ))}
        <WeekPatternAddBlockRow
          dayIndex={d.index}
          showSeparator={!isLast}
          onPress={() => onDayPress(d.index, undefined, dateStr)}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Week Navigator */}
      <Row style={[styles.weekNavRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Clickable
          onPress={() => {
            haptic();
            setWeekOffset((p) => p - 1);
          }}
          style={styles.weekNavArrow}
        >
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Clickable>
        <Clickable
          onPress={() => {
            if (weekOffset !== 0) {
              haptic();
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
            haptic();
            setWeekOffset((p) => p + 1);
          }}
          style={styles.weekNavArrow}
        >
          <Ionicons name="chevron-forward" size={20} color={palette.text} />
        </Clickable>
      </Row>

      {/* Summary */}
      <View style={[styles.summaryRow, { backgroundColor: withAlpha(palette.tint, 0.05) }]}>
        <Row style={styles.summaryPills}>
          <Row style={[styles.summaryPill, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
            <Ionicons name="calendar-outline" size={14} color={palette.tint} />
            <ThemedText style={[styles.summaryText, { color: palette.text }]}>
              {stats.days} day{stats.days !== 1 ? 's' : ''}
            </ThemedText>
          </Row>
          <Row style={[styles.summaryPill, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
            <Ionicons name="time-outline" size={14} color={palette.tint} />
            <ThemedText style={[styles.summaryText, { color: palette.text }]}>
              {stats.hrs} hrs/week
            </ThemedText>
          </Row>
          <Row style={[styles.summaryPill, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
            <Ionicons name="location-outline" size={14} color={palette.tint} />
            <ThemedText style={[styles.summaryText, { color: palette.text }]}>
              {stats.venues} venue{stats.venues !== 1 ? 's' : ''}
            </ThemedText>
          </Row>
        </Row>
      </View>

      {/* Day Rows */}
      <SurfaceCard style={styles.gridCard}>
        {DAYS_ORDERED.map((d, i) => renderDayRows(d, i))}
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  weekNavRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xs,
  },
  weekNavArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.xl,
  },
  weekNavLabelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  weekNavLabel: { ...Typography.bodySemiBold, textAlign: 'center' },
  summaryRow: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  summaryPills: {
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  summaryPill: {
    alignItems: 'center',
    gap: Spacing.xxs,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  summaryText: { ...Typography.caption, textAlign: 'center' },
  gridCard: { padding: 0, overflow: 'hidden' },
});
