import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PastSession, PastSessionDelta } from '@/types/progress-types';
import { CornerDotsCompact } from './corner-dots-compact';
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

function formatDelta(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }
  return `${value}`;
}

export const SessionTimelineCard = memo(function SessionTimelineCard({
  session,
  deltaFromPrevious,
  onOpenMediaGallery,
}: SessionTimelineCardProps) {
  const { colors } = useTheme();
  const hasMedia = session.photos.length > 0 || Boolean(session.video);
  const deltaItems = [
    typeof deltaFromPrevious?.performance === 'number'
      ? `Perf ${formatDelta(deltaFromPrevious.performance)}`
      : null,
    typeof deltaFromPrevious?.technical === 'number'
      ? `Tech ${formatDelta(deltaFromPrevious.technical)}`
      : null,
    typeof deltaFromPrevious?.physical === 'number'
      ? `Phys ${formatDelta(deltaFromPrevious.physical)}`
      : null,
    typeof deltaFromPrevious?.psychological === 'number'
      ? `Psych ${formatDelta(deltaFromPrevious.psychological)}`
      : null,
    typeof deltaFromPrevious?.social === 'number'
      ? `Soc ${formatDelta(deltaFromPrevious.social)}`
      : null,
  ].filter((item): item is string => Boolean(item));
  const visibleDeltaText = deltaItems.slice(0, 3).join(' · ');

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="sm">
        <Row align="center" justify="between">
          <ThemedText style={styles.headerTitle}>
            {formatSessionDate(session.date)} · {session.coachName}
          </ThemedText>
        </Row>

        {visibleDeltaText ? (
          <Row align="center" gap="xxs">
            <Ionicons name="analytics-outline" size={13} color={colors.info} />
            <ThemedText style={[styles.deltaText, { color: colors.muted }]}>
              vs previous: {visibleDeltaText}
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

        <CornerDotsCompact corners={session.corners} effort={session.effort} />

        {session.summary ? (
          <ThemedText style={styles.summary}>
            &ldquo;{session.summary}&rdquo;
          </ThemedText>
        ) : null}

        <Row align="center" justify="between">
          {session.performance > 0 ? (
            <Row align="center" gap="xxs">
              <Ionicons name="star" size={14} color={colors.warning} />
              <ThemedText style={styles.ratingText}>Performance {session.performance}/5</ThemedText>
            </Row>
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
        </Row>
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  headerTitle: {
    ...Typography.bodySmallSemiBold,
  },
  summary: {
    ...Typography.bodySmall,
  },
  deltaText: {
    ...Typography.caption,
  },
  ratingText: {
    ...Typography.bodySmall,
  },
  badgeChip: {
    minHeight: 28,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
  },
  badgeText: {
    ...Typography.caption,
  },
});
