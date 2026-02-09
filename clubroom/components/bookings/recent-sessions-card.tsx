/**
 * RecentSessionsCard — Shows the 5 most recent sessions in a card.
 *
 * Each session shows focus area, coach name, duration, star rating,
 * and optional coach feedback.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionDisplayItem } from '@/hooks/use-statistics';

interface RecentSessionsCardProps {
  sessions: SessionDisplayItem[];
}

export const RecentSessionsCard = memo(function RecentSessionsCard({
  sessions,
}: RecentSessionsCardProps) {
  const { colors: palette } = useTheme();

  return (
    <Column gap="sm">
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Recent Sessions
      </ThemedText>
      <SurfaceCard style={styles.card}>
        {sessions.map((session, index) => (
          <View key={session.id}>
            <View style={styles.item}>
              <Column gap="sm" style={styles.flex}>
                <Row gap="sm" align="flex-start">
                  <View style={[styles.dot, { backgroundColor: palette.tint }]} />
                  <Column style={styles.flex}>
                    <ThemedText style={styles.title}>{session.focus ?? 'Training'}</ThemedText>
                    <ThemedText style={styles.subtext}>
                      {session.coachName} · {session.durationMinutes ?? 60}m
                    </ThemedText>
                  </Column>
                  <Row gap="micro" align="center">
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < (session.rating || 0) ? 'star' : 'star-outline'}
                        size={14}
                        color={palette.warning}
                      />
                    ))}
                  </Row>
                </Row>
                {session.coachFeedback && (
                  <View style={[styles.feedbackBox, { backgroundColor: palette.surface }]}>
                    <ThemedText style={styles.feedbackText}>{session.coachFeedback}</ThemedText>
                  </View>
                )}
              </Column>
            </View>
            {index < sessions.length - 1 && (
              <View style={[styles.divider, { backgroundColor: palette.border }]} />
            )}
          </View>
        ))}
      </SurfaceCard>
    </Column>
  );
});

const styles = StyleSheet.create({
  sectionTitle: {
    paddingLeft: Spacing.xs,
  },
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  item: {
    paddingVertical: Spacing.xs,
  },
  flex: {
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
    marginTop: Spacing.xxs,
  },
  title: {
    ...Typography.bodySemiBold,
  },
  subtext: {
    ...Typography.small,
    opacity: 0.6,
    marginTop: Spacing.micro,
  },
  feedbackBox: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginLeft: Spacing.lg,
  },
  feedbackText: {
    ...Typography.small,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
});
