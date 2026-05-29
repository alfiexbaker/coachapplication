import { View, StyleSheet, Platform, type ViewStyle, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { uiFeedback } from '@/services/ui-feedback';

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
  const { width } = useWindowDimensions();
  const isCompact = width < 430;
  const {
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
  } = props;

  const handlePress = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  const handleOverrideInfo = () => {
    uiFeedback.showToast('This yellow dot means the normal weekly slot was overridden for a specific date.');
  };

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
              isToday && !isBlocked
                ? { fontWeight: '700' as const, color: palette.tint }
                : undefined,
            ]}
          >
            {dayLabel}
          </ThemedText>
        )}
      </View>

      <View style={styles.dayTimeCol}>
        {hasOverride && !isBlocked && showDayLabel ? (
          <Clickable onPress={handleOverrideInfo} style={styles.overrideHint}>
            <Row align="center" gap="xxs">
              <View style={[styles.indicatorDot, { backgroundColor: palette.warning }]} />
              <ThemedText style={[styles.overrideHintText, { color: palette.warning }]}>
                What&apos;s this?
              </ThemedText>
            </Row>
          </Clickable>
        ) : null}
        {isBlocked ? (
          <Row style={styles.timeOffRow}>
            <Ionicons name="airplane-outline" size={14} color={palette.error} />
            <ThemedText style={[styles.dayTime, { color: palette.error, fontWeight: '600' }]}>
              {blockReason || 'Time Off'}
            </ThemedText>
          </Row>
        ) : (
          <ThemedText
            style={[styles.dayTime, { color: hasTemplates ? palette.text : palette.muted }]}
          >
            {timeDisplay}
          </ThemedText>
        )}

        {!isBlocked && locationDisplay && isCompact ? (
          <Row style={[styles.locationPill, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
            <Ionicons name="location-outline" size={12} color={palette.tint} />
            <ThemedText style={[styles.locationPillText, { color: palette.tint }]} numberOfLines={1}>
              {locationDisplay}
            </ThemedText>
          </Row>
        ) : null}
      </View>

      {!isCompact ? (
        <View style={styles.dayLocationCol}>
          {!isBlocked && locationDisplay ? (
            <Row style={[styles.locationPill, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
              <Ionicons name="location-outline" size={12} color={palette.tint} />
              <ThemedText
                style={[styles.locationPillText, { color: palette.tint }]}
                numberOfLines={1}
              >
                {locationDisplay}
              </ThemedText>
            </Row>
          ) : null}
        </View>
      ) : null}

      <Row style={styles.dayIndicators}>
        {hasOverride && !isBlocked && (
          <Clickable onPress={handleOverrideInfo} accessibilityLabel="Override indicator details">
            <View style={[styles.indicatorDot, { backgroundColor: palette.warning }]} />
          </Clickable>
        )}
        <Ionicons name="create-outline" size={16} color={palette.muted} />
      </Row>
    </Clickable>
  );
}

export const WeekPatternSlotRow = SlotRowInner;

// ---- Add Block Row ----

interface AddBlockRowProps {
  dayIndex: number;
  showSeparator: boolean;
  onPress: () => void;
}

function AddBlockRowInner({ dayIndex, showSeparator, onPress }: AddBlockRowProps) {
  const { colors: palette } = useTheme();

  const handlePress = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const rowStyle: ViewStyle = {
    ...styles.addBlockRow,
    ...(showSeparator ? { borderBottomWidth: 1, borderBottomColor: palette.border } : {}),
  };

  return (
    <Clickable key={`add-block-${dayIndex}`} onPress={handlePress} style={rowStyle}>
      <View style={styles.dayLabelCol} />
      <Row style={[styles.addBlockPill, { borderColor: withAlpha(palette.muted, 0.25) }]}>
        <Ionicons name="add-circle-outline" size={14} color={palette.muted} />
        <ThemedText style={[styles.addBlockText, { color: palette.muted }]}>Add time block</ThemedText>
      </Row>
    </Clickable>
  );
}

export const WeekPatternAddBlockRow = AddBlockRowInner;

const styles = StyleSheet.create({
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dayLabelCol: { width: 52 },
  dayLabel: { ...Typography.bodySmallSemiBold },
  dayTimeCol: { flex: 1, paddingHorizontal: Spacing.xs, gap: Spacing.xxs },
  overrideHint: { alignSelf: 'flex-start' },
  overrideHintText: { ...Typography.caption },
  dayTime: { ...Typography.bodySmall },
  timeOffRow: { alignItems: 'center', gap: Spacing.xxs },
  dayLocationCol: { flex: 1, alignItems: 'flex-end', paddingRight: Spacing.xs },
  locationPill: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    maxWidth: 160,
  },
  locationPillText: { ...Typography.caption, letterSpacing: 0 },
  dayIndicators: { alignItems: 'center', gap: Spacing.xxs, width: 36, justifyContent: 'flex-end' },
  indicatorDot: { width: 6, height: 6, borderRadius: Radii.xs },
  addBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  addBlockPill: {
    alignItems: 'center',
    gap: Spacing.xxs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  addBlockText: { ...Typography.small, fontWeight: '500' },
});
