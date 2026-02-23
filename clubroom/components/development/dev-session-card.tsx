import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { formatShortDateWithYear } from '@/utils/format';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Session, BadgeAward } from '@/constants/types';

export interface DevSessionCardProps {
  session: Session;
  awards: BadgeAward[];
  colors: ThemeColors;
  onSelectForBadge?: (session: Session) => void;
}

export const DevSessionCard = memo(function DevSessionCard({
  session,
  awards,
  colors,
}: DevSessionCardProps) {
  const needsNotes = !session.notes || session.notes.trim() === '';
  const sessionAwards = awards.filter((a) => a.sessionId === session.id);

  const handlePress = useCallback(() => {
    router.push(Routes.developmentSession(session.id));
  }, [session.id]);

  return (
    <SurfaceCard style={styles.card}>
      <Row justify="space-between" align="center" style={{ marginBottom: Spacing.xs }}>
        <Row gap="sm" align="center" style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">
            {formatShortDateWithYear(session.completedAt)}
          </ThemedText>
          {needsNotes && (
            <View style={[styles.needsNotesBadge, { backgroundColor: colors.error }]}>
              <ThemedText style={[Typography.micro, { color: colors.onPrimary }]}>
                Needs Notes
              </ThemedText>
            </View>
          )}
        </Row>
        <Row gap="sm" align="center">
          <Row gap="xs" align="center">
            <ThemedText style={styles.rating}>{session.performanceRating}</ThemedText>
            <Ionicons name="star" size={16} color={colors.tint} />
          </Row>
        </Row>
      </Row>

      {sessionAwards.length > 0 && (
        <Row style={styles.awardRow}>
          {sessionAwards.map((award) => (
            <Row key={award.id} style={[styles.awardChip, { borderColor: colors.border }]}>
              <ThemedText style={{ fontWeight: '700' }}>{award.badgeLabel}</ThemedText>
              <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
                {formatShortDateWithYear(award.awardedAt)}
              </ThemedText>
            </Row>
          ))}
        </Row>
      )}

      {session.skillsWorkedOn.length > 0 && (
        <Row style={styles.skillsRow}>
          {session.skillsWorkedOn.map((skill, index) => (
            <View
              key={index}
              style={[styles.skillChip, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
            >
              <ThemedText style={[styles.skillText, { color: colors.tint }]}>{skill}</ThemedText>
            </View>
          ))}
        </Row>
      )}

      {session.notes && session.notes.trim() !== '' && (
        <ThemedText style={[Typography.small, { color: colors.muted }]} numberOfLines={2}>
          {session.notes}
        </ThemedText>
      )}

      {session.videoUrls && session.videoUrls.length > 0 && (
        <Row gap="xs" align="center">
          <Ionicons name="videocam" size={14} color={colors.tint} />
          <ThemedText style={[Typography.caption, { color: colors.tint }]}>
            {session.videoUrls.length} {session.videoUrls.length === 1 ? 'video' : 'videos'}
          </ThemedText>
        </Row>
      )}

      <Clickable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Open session feedback from ${formatShortDateWithYear(session.completedAt)}`}
        style={[styles.openFeedbackButton, { borderColor: colors.border }]}
      >
        <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>Open feedback</ThemedText>
        <Ionicons name="chevron-forward" size={18} color={colors.tint} />
      </Clickable>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.xs,
    position: 'relative',
  },
  needsNotesBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.sm,
  },
  rating: {
    ...Typography.body,
    fontVariant: ['tabular-nums'],
  },
  awardRow: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  awardChip: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  skillsRow: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.sm,
  },
  skillText: {
    ...Typography.micro,
    textTransform: 'none',
  },
  openFeedbackButton: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radii.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
