import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PastSession, PastSessionDelta } from '@/types/progress-types';
import { CoachBadge } from './coach-badge';
import { MediaStrip } from './media-strip';

interface SessionTimelineCardProps {
  session: PastSession;
  deltaFromPrevious?: PastSessionDelta | null;
  onOpenMediaGallery?: () => void;
}

function formatSessionDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Recent session';
  }
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function buildDeltaSummary(delta: PastSessionDelta | null | undefined): string | null {
  if (!delta) {
    return null;
  }
  const improvements: string[] = [];
  const allValues = [
    { key: 'performance', value: delta.performance },
    { key: 'technical', value: delta.technical },
    { key: 'physical', value: delta.physical },
    { key: 'psychological', value: delta.psychological },
    { key: 'social', value: delta.social },
  ];
  for (const item of allValues) {
    if (typeof item.value === 'number' && item.value > 0) {
      improvements.push(item.key);
    }
  }
  if (improvements.length === 0) {
    return null;
  }
  return `${improvements.length} area${improvements.length > 1 ? 's' : ''} improved`;
}

export const SessionTimelineCard = memo(function SessionTimelineCard({
  session,
  deltaFromPrevious,
  onOpenMediaGallery,
}: SessionTimelineCardProps) {
  const { colors } = useTheme();
  const hasMedia = session.photos.length > 0 || Boolean(session.video);
  const deltaSummary = buildDeltaSummary(deltaFromPrevious);

  return (
    <View style={styles.card}>
      <Column gap="xs">
        <ThemedText style={styles.headerTitle}>
          {formatSessionDate(session.date)} · {session.coachName}
        </ThemedText>

        {deltaSummary ? (
          <Row align="center" gap="xxs">
            <Ionicons name="trending-up" size={12} color={colors.success} />
            <ThemedText style={[styles.deltaText, { color: colors.success }]}>
              {deltaSummary}
            </ThemedText>
          </Row>
        ) : null}

        {session.coachQualification ? (
          <CoachBadge
            coach={{
              qualificationLevel: session.coachQualification,
            }}
          />
        ) : null}

        {hasMedia ? (
          <MediaStrip
            photos={session.photos}
            video={session.video}
            onPressOverflow={onOpenMediaGallery}
          />
        ) : null}

        {/* Session performance — single star rating, not a data dump */}
        {session.performance > 0 ? (
          <Row align="center" gap="xxs">
            <Ionicons name="star" size={13} color={colors.warning} />
            <ThemedText style={[styles.performanceText, { color: colors.text }]}>
              {session.performance}/5 session
            </ThemedText>
          </Row>
        ) : null}

        {session.summary ? (
          <ThemedText style={[styles.summary, { color: colors.muted }]} numberOfLines={2}>
            {session.summary}
          </ThemedText>
        ) : null}

        {session.badgeAwarded ? (
          <Row
            align="center"
            gap="xxs"
            style={[
              styles.badgeChip,
              {
                borderColor: withAlpha(colors.tint, 0.28),
                backgroundColor: withAlpha(colors.tint, 0.1),
              },
            ]}
          >
            <Ionicons name="ribbon-outline" size={12} color={colors.tint} />
            <ThemedText style={[styles.badgeText, { color: colors.tint }]}>
              {session.badgeAwarded.label}
            </ThemedText>
          </Row>
        ) : null}
      </Column>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
  },
  headerTitle: {
    ...Typography.bodySmallSemiBold,
  },
  summary: {
    ...Typography.caption,
  },
  deltaText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  performanceText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  badgeChip: {
    minHeight: 24,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...Typography.caption,
  },
});
