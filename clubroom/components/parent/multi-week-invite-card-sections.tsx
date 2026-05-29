/**
 * Extracted sub-components for MultiWeekInviteCard.
 *
 * WeekToggleRow — single toggleable week row.
 * WeekSeparator — FlatList separator.
 * InviteHeader — coach avatar + session info.
 * SelectionControls — count + select all / clear.
 * TotalRow — cost summary.
 */

import React from 'react';
import { Platform, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { WeekAcceptance } from '@/constants/types';
import { formatTime, formatWeekDate } from './multi-week-invite-card-helpers';
import { styles } from './multi-week-invite-card-styles';

// ─── WeekSeparator ───────────────────────────────────────────────────────────

export const WeekSeparator = () => <View style={{ height: Spacing.xs }} />;

// ─── WeekToggleRow ───────────────────────────────────────────────────────────

interface WeekToggleRowProps {
  week: WeekAcceptance;
  onToggle: (weekDate: string) => void;
  palette: ThemeColors;
}

export const WeekToggleRow = function WeekToggleRow({
  week,
  onToggle,
  palette,
}: WeekToggleRowProps) {
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle(week.weekDate);
  };

  return (
    <Clickable onPress={handlePress}>
      <Row
        align="center"
        justify="space-between"
        style={[
          styles.weekRow,
          {
            backgroundColor: week.accepted
              ? withAlpha(palette.success, 0.04)
              : withAlpha(palette.muted, 0.04),
            borderColor: week.accepted ? withAlpha(palette.success, 0.2) : palette.border,
          },
        ]}
      >
        <View style={styles.weekRowLeft}>
          <ThemedText style={[Typography.smallSemiBold, { color: palette.text }]}>
            {formatWeekDate(week.weekDate)}
          </ThemedText>
          <Row align="center" gap="xxs">
            <Ionicons name="time-outline" size={12} color={palette.muted} />
            <ThemedText style={[Typography.small, { color: palette.muted }]}>
              {formatTime(week.startTime)} - {formatTime(week.endTime)}
            </ThemedText>
          </Row>
          {week.location ? (
            <Row align="center" gap="xxs">
              <Ionicons name="location-outline" size={12} color={palette.tint} />
              <ThemedText style={[Typography.small, { color: palette.tint }]} numberOfLines={1}>
                {week.location}
              </ThemedText>
            </Row>
          ) : null}
        </View>
        <Ionicons
          name={week.accepted ? 'checkmark-circle' : 'close-circle-outline'}
          size={24}
          color={week.accepted ? palette.success : palette.muted}
        />
      </Row>
    </Clickable>
  );
};

// ─── InviteHeader ────────────────────────────────────────────────────────────

interface InviteHeaderProps {
  coachName: string;
  clubName?: string;
  sessionType: string;
  focus: string;
  totalWeeks: number;
  palette: ThemeColors;
}

export const InviteHeader = function InviteHeader({
  coachName,
  clubName,
  sessionType,
  focus,
  totalWeeks,
  palette,
}: InviteHeaderProps) {
  const coachFirstName = coachName.split(' ')[0];
  const initials = coachName
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <Row align="center" gap="md">
      <Row
        align="center"
        justify="center"
        style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
      >
        <ThemedText style={[Typography.heading, { color: palette.tint }]}>{initials}</ThemedText>
      </Row>
      <View style={styles.headerContent}>
        <ThemedText type="defaultSemiBold">
          Recurring program with Coach {coachFirstName}
        </ThemedText>
        <ThemedText style={[Typography.small, { color: palette.muted }]}>
          {clubName ? `${clubName} · ` : ''}{sessionType} · {focus} · {totalWeeks} week{totalWeeks !== 1 ? 's' : ''}
        </ThemedText>
      </View>
    </Row>
  );
};

// ─── SelectionControls ───────────────────────────────────────────────────────

interface SelectionControlsProps {
  acceptedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  palette: ThemeColors;
}

export const SelectionControls = function SelectionControls({
  acceptedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  palette,
}: SelectionControlsProps) {
  return (
    <Row align="center" justify="space-between">
      <ThemedText style={[Typography.smallSemiBold, { color: palette.muted }]}>
        {acceptedCount} of {totalCount} weeks selected
      </ThemedText>
      <Row gap="sm">
        <Clickable onPress={onSelectAll} style={styles.selectAllButton}>
          <ThemedText style={[Typography.small, { color: palette.tint }]}>Select All</ThemedText>
        </Clickable>
        <Clickable onPress={onDeselectAll} style={styles.selectAllButton}>
          <ThemedText style={[Typography.small, { color: palette.muted }]}>Clear</ThemedText>
        </Clickable>
      </Row>
    </Row>
  );
};

// ─── TotalRow ────────────────────────────────────────────────────────────────

interface TotalRowProps {
  acceptedCount: number;
  totalCost: number;
  palette: ThemeColors;
}

export const TotalRow = function TotalRow({
  acceptedCount,
  totalCost,
  palette,
}: TotalRowProps) {
  return (
    <Row align="center" justify="space-between">
      <ThemedText style={[Typography.smallSemiBold, { color: palette.muted }]}>
        Total ({acceptedCount} week{acceptedCount !== 1 ? 's' : ''})
      </ThemedText>
      <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
        {'\u00A3'}
        {totalCost}
      </ThemedText>
    </Row>
  );
};
