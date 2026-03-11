/**
 * ScheduleDayDetail — Selected day card showing sessions or empty state.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Center } from '@/components/primitives/center';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ScheduleSessionItem } from './schedule-session-item';
import type { DayData, SessionData, ScheduleBusinessFilter } from './schedule-types';

interface Props {
  day: DayData;
  businessFilter?: ScheduleBusinessFilter;
  onSessionPress: (session: SessionData) => void;
  onAdjustDay: (dateStr: string) => void;
  onCreateSession?: (dateStr: string) => void;
}

export const ScheduleDayDetail = memo(function ScheduleDayDetail({
  day,
  businessFilter = 'all',
  onSessionPress,
  onAdjustDay,
}: Props) {
  const { colors } = useTheme();

  const handleAdjust = useCallback(() => {
    onAdjustDay(day.dateStr);
  }, [onAdjustDay, day.dateStr]);

  return (
    <Animated.View entering={FadeInDown.delay(300).springify()}>
      <SurfaceCard style={styles.card}>
        <Row justify="between" align="flex-start" style={styles.header}>
          <Column>
            <ThemedText type="subtitle">
              {day.dayName}
              {day.isToday && <ThemedText style={{ color: colors.tint }}> (Today)</ThemedText>}
            </ThemedText>
            <ThemedText style={[styles.sub, { color: colors.muted }]}>
              {day.sessions.length} session{day.sessions.length !== 1 ? 's' : ''} ·{' '}
              {day.availabilitySlots} slot{day.availabilitySlots !== 1 ? 's' : ''} available
            </ThemedText>
            {day.isBlocked && (
              <Row
                align="center"
                gap="xxs"
                style={[styles.statusBadge, { backgroundColor: withAlpha(colors.error, 0.09) }]}
              >
                <Ionicons name="airplane-outline" size={12} color={colors.error} />
                <ThemedText style={[styles.statusBadgeText, { color: colors.error }]}>
                  Time Off
                </ThemedText>
              </Row>
            )}
            {day.hasOverride && !day.isBlocked && (
              <Row
                align="center"
                gap="xxs"
                style={[styles.statusBadge, { backgroundColor: withAlpha(colors.warning, 0.09) }]}
              >
                <Ionicons name="swap-horizontal-outline" size={12} color={colors.warning} />
                <ThemedText style={[styles.statusBadgeText, { color: colors.warning }]}>
                  Adjusted
                </ThemedText>
              </Row>
            )}
          </Column>
          {!day.isPast && (
            <Clickable
              onPress={handleAdjust}
              accessibilityLabel="Edit day availability"
              style={[styles.editBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="create-outline" size={18} color={colors.muted} />
            </Clickable>
          )}
        </Row>

        {day.sessions.length === 0 ? (
          <Center padding="xl" style={[styles.empty, { backgroundColor: colors.background }]}>
            <Ionicons name="calendar-outline" size={32} color={colors.muted} />
            <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
              {day.availabilitySlots > 0
                ? businessFilter === 'org'
                  ? 'Available, but no org work is scheduled here'
                  : businessFilter === 'independent'
                    ? 'Available, but no independent work is scheduled here'
                    : 'Available but no bookings yet'
                : 'No availability set for this day'}
            </ThemedText>
            {null}
          </Center>
        ) : (
          <Column gap="sm">
            {day.sessions.map((session, index) => (
              <ScheduleSessionItem key={`${session.id}_${index}`} session={session} onPress={onSessionPress} />
            ))}
          </Column>
        )}
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  sub: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    ...Typography.micro,
  },
  editBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
  },
});
