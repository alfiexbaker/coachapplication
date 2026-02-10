/**
 * Extracted sub-components for SlotPicker.
 *
 * Helpers: getWeekRange, formatSlotTime, formatDayHeader.
 * Constants: MAX_SELECTIONS, DAY_LABELS.
 * WeekNavigator — prev/next week arrows + label.
 * SelectionCounter — selected count banner.
 * SlotPickerLoading — loading state.
 * SlotChip — individual slot pill with status colouring.
 * DayRow — day header + slot chips for one date.
 */

import React, { memo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { toDateStr } from '@/utils/format';
import type { ThemeColors } from '@/hooks/useTheme';
import type { AvailabilitySlot } from '@/constants/types';
import { Row } from '@/components/primitives';

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_SELECTIONS = 3;
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getWeekRange(offset: number): { start: string; end: string; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startStr = toDateStr(monday);
  const endStr = toDateStr(sunday);

  const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric' });
  const label = `${monthFmt.format(monday)} – ${monthFmt.format(sunday)}`;

  return { start: startStr, end: endStr, label };
}

export function formatSlotTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${m.toString().padStart(2, '0')}${suffix}`;
}

export function formatDayHeader(dateStr: string): { day: string; date: string; isPast: boolean } {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    day: DAY_LABELS[d.getDay()],
    date: String(d.getDate()),
    isPast: d < today,
  };
}

// ─── WeekNavigator ───────────────────────────────────────────────────────────

interface WeekNavigatorProps {
  weekLabel: string;
  weekOffset: number;
  onPrev: () => void;
  onNext: () => void;
  palette: ThemeColors;
}

export const WeekNavigator = memo(function WeekNavigator({
  weekLabel,
  weekOffset,
  onPrev,
  onNext,
  palette,
}: WeekNavigatorProps) {
  return (
    <Row style={styles.weekNav}>
      <Clickable
        accessibilityLabel="Go back"
        onPress={onPrev}
        disabled={weekOffset === 0}
        style={[styles.navBtn, { opacity: weekOffset === 0 ? 0.3 : 1 }]}
      >
        <Ionicons name="chevron-back" size={20} color={palette.text} />
      </Clickable>
      <ThemedText type="defaultSemiBold">{weekLabel}</ThemedText>
      <Clickable
        accessibilityLabel="Next"
        onPress={onNext}
        disabled={weekOffset >= 4}
        style={[styles.navBtn, { opacity: weekOffset >= 4 ? 0.3 : 1 }]}
      >
        <Ionicons name="chevron-forward" size={20} color={palette.text} />
      </Clickable>
    </Row>
  );
});

// ─── SelectionCounter ────────────────────────────────────────────────────────

interface SelectionCounterProps {
  count: number;
  palette: ThemeColors;
}

export const SelectionCounter = memo(function SelectionCounter({
  count,
  palette,
}: SelectionCounterProps) {
  return (
    <Row style={[styles.counterRow, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
      <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
      <ThemedText style={[styles.counterText, { color: palette.tint }]}>
        {count} of {MAX_SELECTIONS} slots selected
      </ThemedText>
    </Row>
  );
});

// ─── SlotPickerLoading ───────────────────────────────────────────────────────

export function SlotPickerLoading({ palette }: { palette: ThemeColors }) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color={palette.tint} />
      <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
        Loading availability...
      </ThemedText>
    </View>
  );
}

// ─── SlotChip ────────────────────────────────────────────────────────────────

interface SlotChipProps {
  slot: AvailabilitySlot;
  isSelected: boolean;
  isPast: boolean;
  onToggle: () => void;
  palette: ThemeColors;
}

export const SlotChip = memo(function SlotChip({
  slot,
  isSelected,
  isPast,
  onToggle,
  palette,
}: SlotChipProps) {
  const isOpen = slot.isAvailable && !isPast;

  let bgColor: string = palette.surface;
  let borderColor: string = palette.border;
  let textColor: string = palette.muted;

  if (isSelected) {
    bgColor = withAlpha(palette.tint, 0.12);
    borderColor = palette.tint;
    textColor = palette.tint;
  } else if (isOpen) {
    bgColor = withAlpha(palette.success, 0.06);
    borderColor = withAlpha(palette.success, 0.3);
    textColor = palette.text;
  } else {
    bgColor = withAlpha(palette.muted, 0.06);
    borderColor = withAlpha(palette.muted, 0.15);
    textColor = palette.muted;
  }

  return (
    <Clickable
      onPress={onToggle}
      disabled={!isOpen}
      style={[
        styles.slotChip,
        {
          backgroundColor: bgColor,
          borderColor,
          opacity: isPast ? 0.4 : 1,
        },
      ]}
    >
      <View style={styles.slotContent}>
        <ThemedText style={[styles.slotTime, { color: textColor }]}>
          {formatSlotTime(slot.startTime)} – {formatSlotTime(slot.endTime)}
        </ThemedText>
        {slot.location && (
          <Row style={styles.slotLocationRow}>
            <Ionicons name="location-outline" size={12} color={palette.tint} />
            <ThemedText style={[styles.slotLocation, { color: palette.tint }]} numberOfLines={1}>
              {slot.location}
            </ThemedText>
          </Row>
        )}
      </View>
      {isSelected && (
        <Ionicons name="checkmark-circle" size={18} color={palette.tint} />
      )}
      {!isOpen && !isPast && (
        <ThemedText style={[styles.slotBadge, { color: palette.muted }]}>
          {slot.bookedCount > 0 ? 'Booked' : 'Held'}
        </ThemedText>
      )}
    </Clickable>
  );
});

// ─── DayRow ──────────────────────────────────────────────────────────────────

interface DayRowProps {
  dateStr: string;
  slots: AvailabilitySlot[];
  selectedKeys: Set<string>;
  slotKey: (slot: { date: string; startTime: string }) => string;
  onToggleSlot: (slot: AvailabilitySlot) => void;
  palette: ThemeColors;
}

export const DayRow = memo(function DayRow({
  dateStr,
  slots,
  selectedKeys,
  slotKey,
  onToggleSlot,
  palette,
}: DayRowProps) {
  const { day, date, isPast } = formatDayHeader(dateStr);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.dayColumn, { borderBottomColor: palette.border }]}
    >
      <View style={[styles.dayHeader, isPast && { opacity: 0.4 }]}>
        <ThemedText style={[styles.dayLabel, { color: palette.muted }]}>{day}</ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.dayDate}>{date}</ThemedText>
      </View>

      <Row style={styles.slotsRow}>
        {slots.length === 0 ? (
          <ThemedText style={[styles.noSlots, { color: palette.muted }]}>—</ThemedText>
        ) : (
          slots.map((slot) => (
            <SlotChip
              key={slotKey(slot)}
              slot={slot}
              isSelected={selectedKeys.has(slotKey(slot))}
              isPast={isPast}
              onToggle={() => onToggleSlot(slot)}
              palette={palette}
            />
          ))
        )}
      </Row>
    </Animated.View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  weekNav: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  navBtn: {
    padding: Spacing.xs,
  },
  counterRow: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  counterText: {
    ...Typography.smallSemiBold,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.small,
  },
  dayColumn: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  dayHeader: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.micro,
  },
  dayLabel: {
    ...Typography.micro,
    textTransform: 'uppercase',
  },
  dayDate: {
    fontSize: 18,
  },
  slotsRow: {
    flex: 1,
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  noSlots: {
    ...Typography.small,
    paddingVertical: Spacing.xs,
  },
  slotChip: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  slotContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  slotLocationRow: {
    alignItems: 'center',
    gap: Spacing.micro,
  },
  slotTime: {
    ...Typography.smallSemiBold,
  },
  slotLocation: {
    ...Typography.micro,
  },
  slotBadge: {
    ...Typography.micro,
  },
});
