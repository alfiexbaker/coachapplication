/**
 * WeekPatternSlotRow — Single slot row in the weekly availability grid.
 * Also includes the "Add time block" sub-row.
 */
import { memo, useCallback } from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface SlotRowData {
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
}

interface WeekPatternSlotRowProps extends SlotRowData {
  onPress: () => void;
}

function SlotRowInner(props: WeekPatternSlotRowProps) {
  const { colors: palette } = useTheme();
  const { dayLabel, showDayLabel, timeDisplay, locationDisplay, hasOverride, isBlocked, blockReason, isToday, hasTemplates, showSeparator, onPress } = props;

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const rowStyle: ViewStyle = {
    ...styles.dayRow,
    ...(showSeparator ? { borderBottomWidth: 1, borderBottomColor: palette.border } : {}),
    ...(isToday ? { backgroundColor: withAlpha(palette.tint, 0.03) } : {}),
    ...(isBlocked ? { backgroundColor: withAlpha(palette.error, 0.03) } : {}),
  };

  return (
    <Clickable onPress={handlePress} style={rowStyle}>
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

      <View style={styles.dayTimeCol}>
        {isBlocked ? (
          <View style={styles.timeOffRow}>
            <Ionicons name="airplane-outline" size={14} color={palette.error} />
            <ThemedText style={[styles.dayTime, { color: palette.error, fontWeight: '600' }]}>
              {blockReason || 'Time Off'}
            </ThemedText>
          </View>
        ) : (
          <ThemedText style={[styles.dayTime, { color: hasTemplates ? palette.text : palette.muted }]}>
            {timeDisplay}
          </ThemedText>
        )}
      </View>

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

      <View style={styles.dayIndicators}>
        {hasOverride && !isBlocked && (
          <View style={[styles.indicatorDot, { backgroundColor: palette.warning }]} />
        )}
        <Ionicons name="chevron-forward" size={16} color={palette.muted} />
      </View>
    </Clickable>
  );
}

export const WeekPatternSlotRow = memo(SlotRowInner);

// ---- Add Block Row ----

interface AddBlockRowProps {
  dayIndex: number;
  showSeparator: boolean;
  onPress: () => void;
}

function AddBlockRowInner({ dayIndex, showSeparator, onPress }: AddBlockRowProps) {
  const { colors: palette } = useTheme();

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const rowStyle: ViewStyle = {
    ...styles.addBlockRow,
    ...(showSeparator ? { borderBottomWidth: 1, borderBottomColor: palette.border } : {}),
  };

  return (
    <Clickable key={`add-block-${dayIndex}`} onPress={handlePress} style={rowStyle}>
      <View style={styles.dayLabelCol} />
      <View style={styles.addBlockContent}>
        <Ionicons name="add" size={14} color={palette.muted} />
        <ThemedText style={[styles.addBlockText, { color: palette.muted }]}>Add time block</ThemedText>
      </View>
    </Clickable>
  );
}

export const WeekPatternAddBlockRow = memo(AddBlockRowInner);

const styles = StyleSheet.create({
  dayRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  dayLabelCol: { width: 44 },
  dayLabel: { ...Typography.smallSemiBold },
  dayTimeCol: { flex: 1, paddingHorizontal: Spacing.xs },
  dayTime: { ...Typography.bodySmall },
  timeOffRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  dayLocationCol: { flex: 1, alignItems: 'flex-end', paddingRight: Spacing.xs },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.micro,
    paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.pill, maxWidth: 120,
  },
  locationPillText: { ...Typography.micro, textTransform: 'none', letterSpacing: 0 },
  dayIndicators: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, width: 36, justifyContent: 'flex-end' },
  indicatorDot: { width: 6, height: 6, borderRadius: 3 },
  addBlockRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  addBlockContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  addBlockText: { ...Typography.small },
});
