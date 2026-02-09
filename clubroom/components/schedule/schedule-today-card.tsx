/**
 * ScheduleTodayCard — Hero card showing today's session count and next session countdown.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { DayData, SessionData } from './schedule-types';

interface Props {
  todayData: DayData;
  todaySessions: SessionData[];
  nextSession: SessionData | null;
}

function getTimeUntil(timeStr: string): string {
  const now = new Date();
  const sessionTime = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  sessionTime.setHours(h, m, 0, 0);
  const diff = sessionTime.getTime() - now.getTime();
  if (diff < 0) return 'Now';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

export const ScheduleTodayCard = memo(function ScheduleTodayCard({
  todayData,
  todaySessions,
  nextSession,
}: Props) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <SurfaceCard
        style={[styles.card, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
      >
        <Row justify="between" align="flex-start">
          <Column>
            <ThemedText style={[styles.label, { color: colors.muted }]}>TODAY</ThemedText>
            <ThemedText style={[styles.date, { color: colors.text }]}>
              {todayData.dayName},{' '}
              {todayData.date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
            </ThemedText>
          </Column>
          <Column align="flex-end">
            <ThemedText style={[styles.statValue, { color: colors.text }]}>
              {todaySessions.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.muted }]}>
              session{todaySessions.length !== 1 ? 's' : ''}
            </ThemedText>
          </Column>
        </Row>

        {nextSession ? (
          <Row
            align="center"
            style={[styles.nextBanner, { backgroundColor: colors.background }]}
          >
            <Column flex>
              <ThemedText
                style={[styles.nextTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {nextSession.athleteName || nextSession.title}
              </ThemedText>
              <ThemedText
                style={[styles.nextMeta, { color: colors.muted }]}
                numberOfLines={1}
              >
                {nextSession.time} · {nextSession.location || 'Location TBD'}
              </ThemedText>
            </Column>
            <View style={[styles.countdown, { backgroundColor: colors.tint }]}>
              <ThemedText style={[styles.countdownText, { color: colors.onPrimary }]}>
                {getTimeUntil(nextSession.time)}
              </ThemedText>
            </View>
          </Row>
        ) : (
          <View style={[styles.emptyBanner, { borderTopColor: colors.border }]}>
            <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
              {todaySessions.length === 0
                ? 'No sessions today - enjoy your free time!'
                : 'All done for today!'}
            </ThemedText>
          </View>
        )}
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
  },
  label: {
    ...Typography.micro,
    letterSpacing: 1,
  },
  date: {
    ...Typography.title,
    marginTop: Spacing.micro,
  },
  statValue: {
    ...Typography.display,
  },
  statLabel: {
    ...Typography.caption,
  },
  nextBanner: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  nextTitle: {
    ...Typography.subheading,
  },
  nextMeta: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  countdown: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  countdownText: {
    ...Typography.small,
  },
  emptyBanner: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  emptyText: {
    ...Typography.body,
  },
});
