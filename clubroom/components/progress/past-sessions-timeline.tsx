import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PastSession, PastSessionDelta } from '@/types/progress-types';
import { SessionTimelineCard } from './session-timeline-card';

interface PastSessionsTimelineProps {
  sessions: PastSession[];
  onViewOlder?: () => void;
  onOpenMediaGallery?: () => void;
}

function performanceToColor(performance: number, colors: { error: string; warning: string; rating: string; success: string; info: string }): string {
  if (performance <= 1) return colors.error;
  if (performance <= 2) return colors.warning;
  if (performance <= 3) return colors.rating;
  return colors.success;
}

export const PastSessionsTimeline = memo(function PastSessionsTimeline({
  sessions,
  onViewOlder,
  onOpenMediaGallery,
}: PastSessionsTimelineProps) {
  const { colors } = useTheme();
  const visibleSessions = useMemo(() => sessions.slice(0, 6), [sessions]);
  const deltaBySessionId = useMemo(() => {
    const deltas: Record<string, PastSessionDelta | null> = {};

    visibleSessions.forEach((current, index) => {
      const previous = visibleSessions[index + 1];
      if (!previous) {
        deltas[current.sessionId] = null;
        return;
      }

      const delta: PastSessionDelta = {};
      if (current.performance > 0 && previous.performance > 0) {
        delta.performance = current.performance - previous.performance;
      }
      if (current.effort > 0 && previous.effort > 0) {
        delta.effort = current.effort - previous.effort;
      }
      if (current.corners && previous.corners) {
        delta.technical = current.corners.technical - previous.corners.technical;
        delta.physical = current.corners.physical - previous.corners.physical;
        delta.psychological = current.corners.psychological - previous.corners.psychological;
        delta.social = current.corners.social - previous.corners.social;
      }

      deltas[current.sessionId] = Object.values(delta).some(
        (value) => typeof value === 'number' && value !== 0,
      )
        ? delta
        : null;
    });

    return deltas;
  }, [visibleSessions]);

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="sm">
        <ThemedText style={styles.title}>Past Sessions</ThemedText>

        {visibleSessions.length === 0 ? (
          <Column gap="xxs">
            <ThemedText style={[styles.emptyTitle, { color: colors.muted }]}>
              No sessions yet
            </ThemedText>
            <ThemedText style={[styles.emptyBody, { color: colors.muted }]}>
              After your first session, you&apos;ll see feedback, media, and quick ratings here.
            </ThemedText>
          </Column>
        ) : (
          <View style={styles.timelineContainer}>
            {/* Continuous vertical line */}
            <View
              style={[
                styles.timelineLine,
                { backgroundColor: withAlpha(colors.border, 0.5) },
              ]}
            />

            <Column gap="xxs" style={styles.timelineCards}>
              {visibleSessions.map((session, index) => {
                const dotColor = performanceToColor(session.performance, colors);

                return (
                  <Animated.View
                    key={session.sessionId}
                    entering={FadeInRight.delay(index * 100)
                      .duration(280)
                      .springify()
                      .damping(16)}
                  >
                    <Row align="start">
                      {/* Timeline dot */}
                      <View style={styles.dotColumn}>
                        <View
                          style={[
                            styles.timelineDot,
                            {
                              backgroundColor: dotColor,
                              borderColor: withAlpha(dotColor, 0.3),
                            },
                          ]}
                        />
                      </View>

                      {/* Session card */}
                      <View style={styles.sessionCardWrap}>
                        <SessionTimelineCard
                          session={session}
                          deltaFromPrevious={deltaBySessionId[session.sessionId] ?? null}
                          onOpenMediaGallery={onOpenMediaGallery}
                        />
                        {index < visibleSessions.length - 1 ? (
                          <View
                            style={[
                              styles.sessionDivider,
                              { backgroundColor: withAlpha(colors.border, 0.35) },
                            ]}
                          />
                        ) : null}
                      </View>
                    </Row>
                  </Animated.View>
                );
              })}
            </Column>
          </View>
        )}

        {onViewOlder && sessions.length > 0 ? (
          <Clickable
            style={styles.viewOlderButton}
            onPress={onViewOlder}
            accessibilityLabel="View older sessions"
            accessibilityRole="button"
          >
            <Row align="center" gap="xxs">
              <ThemedText style={[styles.viewOlderText, { color: colors.tint }]}>
                View older sessions
              </ThemedText>
              <Ionicons name="arrow-forward" size={14} color={colors.tint} />
            </Row>
          </Clickable>
        ) : null}
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  emptyTitle: {
    ...Typography.bodySmallSemiBold,
  },
  emptyBody: {
    ...Typography.bodySmall,
  },
  timelineContainer: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 7,
    top: 10,
    bottom: 10,
    width: 2,
    borderRadius: Radii.xs,
  },
  timelineCards: {
    paddingLeft: 0,
  },
  dotColumn: {
    width: 16,
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: Radii.pill,
    borderWidth: 2,
  },
  sessionCardWrap: {
    flex: 1,
    marginLeft: Spacing.xs,
  },
  sessionDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.sm,
  },
  viewOlderButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  viewOlderText: {
    ...Typography.bodySmallSemiBold,
  },
});
