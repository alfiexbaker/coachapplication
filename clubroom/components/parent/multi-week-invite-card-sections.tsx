/**
 * Extracted sub-components for MultiWeekInviteCard.
 *
 * formatWeekDate, formatTime — date/time helpers.
 * WeekToggleRow — single toggleable week row.
 * WeekSeparator — FlatList separator.
 * InviteHeader — coach avatar + session info.
 * SelectionControls — count + select all / clear.
 * TotalRow — cost summary.
 */

import React, { memo, useCallback } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { WeekAcceptance } from '@/constants/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatWeekDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${m.toString().padStart(2, '0')}${suffix}`;
}

// ─── WeekSeparator ───────────────────────────────────────────────────────────

export const WeekSeparator = () => <View style={{ height: Spacing.xs }} />;

// ─── WeekToggleRow ───────────────────────────────────────────────────────────

interface WeekToggleRowProps {
  week: WeekAcceptance;
  onToggle: (weekDate: string) => void;
  palette: ThemeColors;
}

export const WeekToggleRow = memo(function WeekToggleRow({
  week,
  onToggle,
  palette,
}: WeekToggleRowProps) {
  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle(week.weekDate);
  }, [week.weekDate, onToggle]);

  return (
    <Clickable
      onPress={handlePress}
      style={[
        styles.weekRow,
        {
          backgroundColor: week.accepted ? withAlpha(palette.success, 0.04) : withAlpha(palette.muted, 0.04),
          borderColor: week.accepted ? withAlpha(palette.success, 0.2) : palette.border,
        },
      ]}
    >
      <View style={styles.weekRowLeft}>
        <ThemedText style={[Typography.smallSemiBold, { color: palette.text }]}>
          {formatWeekDate(week.weekDate)}
        </ThemedText>
        <View style={styles.weekDetailRow}>
          <Ionicons name="time-outline" size={12} color={palette.muted} />
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            {formatTime(week.startTime)} - {formatTime(week.endTime)}
          </ThemedText>
        </View>
        {week.location ? (
          <View style={styles.weekDetailRow}>
            <Ionicons name="location-outline" size={12} color={palette.tint} />
            <ThemedText style={[Typography.small, { color: palette.tint }]} numberOfLines={1}>
              {week.location}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <Ionicons
        name={week.accepted ? 'checkmark-circle' : 'close-circle-outline'}
        size={24}
        color={week.accepted ? palette.success : palette.muted}
      />
    </Clickable>
  );
});

// ─── InviteHeader ────────────────────────────────────────────────────────────

interface InviteHeaderProps {
  coachName: string;
  sessionType: string;
  focus: string;
  totalWeeks: number;
  palette: ThemeColors;
}

export const InviteHeader = memo(function InviteHeader({
  coachName,
  sessionType,
  focus,
  totalWeeks,
  palette,
}: InviteHeaderProps) {
  const coachFirstName = coachName.split(' ')[0];
  const initials = coachName.split(' ').map((n) => n[0]).join('');

  return (
    <View style={styles.header}>
      <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
        <ThemedText style={[Typography.heading, { color: palette.tint }]}>
          {initials}
        </ThemedText>
      </View>
      <View style={styles.headerContent}>
        <ThemedText type="defaultSemiBold">
          Coach {coachFirstName} - {totalWeeks} Weeks
        </ThemedText>
        <ThemedText style={[Typography.small, { color: palette.muted }]}>
          {sessionType} - {focus}
        </ThemedText>
      </View>
    </View>
  );
});

// ─── SelectionControls ───────────────────────────────────────────────────────

interface SelectionControlsProps {
  acceptedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  palette: ThemeColors;
}

export const SelectionControls = memo(function SelectionControls({
  acceptedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  palette,
}: SelectionControlsProps) {
  return (
    <View style={styles.selectionControls}>
      <ThemedText style={[Typography.smallSemiBold, { color: palette.muted }]}>
        {acceptedCount} of {totalCount} weeks selected
      </ThemedText>
      <View style={styles.selectionButtons}>
        <Clickable onPress={onSelectAll} style={styles.selectAllButton}>
          <ThemedText style={[Typography.small, { color: palette.tint }]}>
            Select All
          </ThemedText>
        </Clickable>
        <Clickable onPress={onDeselectAll} style={styles.selectAllButton}>
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            Clear
          </ThemedText>
        </Clickable>
      </View>
    </View>
  );
});

// ─── TotalRow ────────────────────────────────────────────────────────────────

interface TotalRowProps {
  acceptedCount: number;
  totalCost: number;
  palette: ThemeColors;
}

export const TotalRow = memo(function TotalRow({
  acceptedCount,
  totalCost,
  palette,
}: TotalRowProps) {
  return (
    <View style={styles.totalRow}>
      <ThemedText style={[Typography.smallSemiBold, { color: palette.muted }]}>
        Total ({acceptedCount} week{acceptedCount !== 1 ? 's' : ''})
      </ThemedText>
      <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
        {'\u00A3'}{totalCost}
      </ThemedText>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  selectionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  selectAllButton: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
  weekRowLeft: {
    flex: 1,
    gap: Spacing.micro,
  },
  weekDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
