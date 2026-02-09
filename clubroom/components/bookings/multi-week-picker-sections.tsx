import { memo, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { useTheme } from '@/hooks/useTheme';
import type { WeekRow } from './multi-week-picker';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── Helpers ────────────────────────────────────────────────────

export function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${m.toString().padStart(2, '0')}${suffix}`;
}

export const WeekSeparator = () => <View style={{ height: Spacing.xs }} />;

// ─── WeekRowItem ────────────────────────────────────────────────

export interface WeekRowItemProps {
  week: WeekRow;
  isSelected: boolean;
  onToggle: (weekDate: string) => void;
  currency: string;
  palette: ThemeColors;
}

export const WeekRowItem = memo(function WeekRowItem({
  week,
  isSelected,
  onToggle,
  currency,
  palette,
}: WeekRowItemProps) {
  const handlePress = useCallback(() => {
    if (!week.available) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle(week.weekDate);
  }, [week.weekDate, week.available, onToggle]);

  const bgColor = !week.available
    ? withAlpha(palette.muted, 0.04)
    : isSelected
    ? withAlpha(palette.tint, 0.06)
    : palette.surface;

  const borderColor = !week.available
    ? withAlpha(palette.muted, 0.12)
    : isSelected
    ? palette.tint
    : palette.border;

  return (
    <Chip
      onPress={handlePress}
      disabled={!week.available}
      active={isSelected}
      style={[
        styles.weekRow,
        {
          backgroundColor: bgColor,
          borderColor,
          borderRadius: Radii.card,
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.sm,
          marginRight: 0,
          marginBottom: 0,
        },
      ]}
    >
      <View style={styles.weekRowInner}>
        {/* Left: Date info */}
        <View style={styles.dateColumn}>
          <ThemedText
            style={[
              Typography.smallSemiBold,
              { color: week.available ? palette.text : palette.muted },
            ]}
          >
            {week.dayName}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: palette.muted }]}>
            {week.dateLabel}
          </ThemedText>
        </View>

        {/* Middle: Time + Location */}
        <View style={styles.detailColumn}>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color={palette.muted} />
            <ThemedText
              style={[
                Typography.small,
                { color: week.available ? palette.text : palette.muted },
              ]}
            >
              {formatTimeDisplay(week.startTime)} - {formatTimeDisplay(week.endTime)}
            </ThemedText>
          </View>
          {week.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={palette.tint} />
              <ThemedText
                style={[Typography.small, { color: palette.tint }]}
                numberOfLines={1}
              >
                {week.location}
              </ThemedText>
            </View>
          ) : null}
          {!week.available && week.unavailableReason ? (
            <ThemedText style={[Typography.small, { color: palette.error }]}>
              {week.unavailableReason}
            </ThemedText>
          ) : null}
        </View>

        {/* Right: Price + Toggle */}
        <View style={styles.priceColumn}>
          <ThemedText
            style={[
              Typography.smallSemiBold,
              { color: week.available ? palette.text : palette.muted },
            ]}
          >
            {currency}{week.price}
          </ThemedText>
          {week.available && (
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isSelected ? palette.tint : palette.border}
            />
          )}
        </View>
      </View>
    </Chip>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  weekRow: {
    width: '100%',
  },
  weekRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  dateColumn: {
    width: 56,
    alignItems: 'center',
  },
  detailColumn: {
    flex: 1,
    gap: Spacing.micro,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  priceColumn: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
});
