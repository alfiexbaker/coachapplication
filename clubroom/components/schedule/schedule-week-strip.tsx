/**
 * ScheduleWeekStrip — Horizontal scrollable week day pills with session/availability dots.
 */

import React, { memo, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { DayData } from './schedule-types';

interface Props {
  weekData: DayData[];
  selectedDayIndex: number | null;
  onDayPress: (index: number) => void;
}

const DayPill = memo(function DayPill({
  day,
  index,
  isSelected,
  onPress,
}: {
  day: DayData;
  index: number;
  isSelected: boolean;
  onPress: (index: number) => void;
}) {
  const { colors } = useTheme();
  const hasSession = day.sessions.length > 0;
  const hasAvailability = day.availabilitySlots > 0;

  const handlePress = useCallback(() => {
    onPress(index);
  }, [onPress, index]);

  return (
    <Clickable
      onPress={handlePress}
      accessibilityLabel={`${day.dayName}, ${day.dayNum} day${day.sessions.length !== 1 ? 's' : ''}`}
      style={[
        styles.pill,
        {
          backgroundColor: isSelected
            ? colors.tint
            : day.isToday
              ? withAlpha(colors.tint, 0.09)
              : colors.surface,
          borderColor: day.isToday && !isSelected ? colors.tint : 'transparent',
          borderWidth: day.isToday && !isSelected ? 1.5 : 0,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.pillLabel,
          { color: isSelected ? colors.surface : day.isPast ? colors.muted : colors.text },
        ]}
      >
        {day.dayShort}
      </ThemedText>
      <ThemedText
        style={[
          styles.pillNum,
          { color: isSelected ? colors.surface : day.isPast ? colors.muted : colors.text },
        ]}
      >
        {day.dayNum}
      </ThemedText>
      {hasSession && !isSelected && (
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
      )}
      {!hasSession && hasAvailability && !isSelected && (
        <View style={[styles.dot, { backgroundColor: colors.border }]} />
      )}
      {day.hasOverride && !isSelected && (
        <View style={[styles.overrideDot, { borderColor: colors.warning }]} />
      )}
    </Clickable>
  );
});

export const ScheduleWeekStrip = memo(function ScheduleWeekStrip({
  weekData,
  selectedDayIndex,
  onDayPress,
}: Props) {
  return (
    <Animated.View entering={FadeInDown.delay(200).springify()}>
      <Column gap="sm">
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          This Week
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
          <Row gap="xs" style={styles.days}>
            {weekData.map((day, index) => (
              <DayPill
                key={day.dateStr}
                day={day}
                index={index}
                isSelected={selectedDayIndex === index}
                onPress={onDayPress}
              />
            ))}
          </Row>
        </ScrollView>
      </Column>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sectionTitle: {
    ...Typography.subheading,
  },
  strip: {
    marginHorizontal: -Spacing.lg,
  },
  days: {
    paddingHorizontal: Spacing.lg,
  },
  pill: {
    width: 52,
    height: 72,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.micro,
  },
  pillLabel: {
    ...Typography.caption,
  },
  pillNum: {
    ...Typography.title,
  },
  dot: {
    position: 'absolute',
    bottom: Spacing.xs,
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
  overrideDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
    borderWidth: 1.5,
  },
});
