/**
 * BadgeTimelineSection — Chronological list of all earned badge awards.
 *
 * Each timeline item shows badge name, tier, category, points, date,
 * coach name, and optional link to the associated session.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { TierNames, CategoryInfo } from '@/constants/progression';
import { createLogger } from '@/utils/logger';
import type { BadgeAward } from '@/constants/types';

const logger = createLogger('BadgeTimeline');

// Decorative: badge tier colors (gold/silver/bronze medals)
const BADGE_TIER_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

function formatDate(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getTierColor(tier: 1 | 2 | 3 | undefined, fallback: string): string {
  switch (tier) {
    case 3: return BADGE_TIER_COLORS.gold;
    case 2: return BADGE_TIER_COLORS.silver;
    case 1: return BADGE_TIER_COLORS.bronze;
    default: return fallback;
  }
}

interface BadgeTimelineSectionProps {
  awards: BadgeAward[];
}

const TimelineItem = memo(function TimelineItem({
  award,
}: {
  award: BadgeAward;
}) {
  const { colors: palette } = useTheme();
  const tierColor = getTierColor(award.badgeTier, palette.tint);

  const handlePress = useCallback(() => {
    if (award.sessionId) {
      logger.press('BadgeToSession', { awardId: award.id, sessionId: award.sessionId });
      router.push(Routes.developmentSession(award.sessionId));
    }
  }, [award.id, award.sessionId]);

  return (
    <Clickable
      onPress={handlePress}
      disabled={!award.sessionId}
      accessibilityLabel={`Badge: ${award.badgeLabel}${award.sessionId ? ', tap to view session' : ''}`}
      accessibilityRole={award.sessionId ? 'button' : undefined}
    >
      <SurfaceCard
        style={[
          styles.timelineItem,
          award.sessionId ? { borderColor: withAlpha(palette.tint, 0.19) } : undefined,
        ]}
      >
        <Row justify="between" align="flex-start">
          <Row gap="sm" align="flex-start" flex>
            <View style={[styles.badgeIconSmall, { backgroundColor: withAlpha(tierColor, 0.12) }]}>
              <Ionicons name="ribbon" size={14} color={tierColor} />
            </View>
            <Column flex>
              <Row gap="xs" align="center" wrap>
                <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                {award.badgeTier && (
                  <View style={[styles.tierPillSmall, { backgroundColor: withAlpha(tierColor, 0.12) }]}>
                    <ThemedText style={[styles.tierTextSmall, { color: tierColor }]}>
                      {TierNames[award.badgeTier]}
                    </ThemedText>
                  </View>
                )}
              </Row>
              {award.badgeCategory && (
                <ThemedText style={[styles.categoryTag, { color: palette.muted }]}>
                  {CategoryInfo[award.badgeCategory].label}
                </ThemedText>
              )}
            </Column>
          </Row>
          <Column align="flex-end" gap="micro">
            <ThemedText style={[styles.pointsValue, { color: palette.tint }]}>
              +{award.badgePointValue ?? 0}
            </ThemedText>
            <ThemedText style={[styles.dateText, { color: palette.muted }]}>
              {formatDate(award.awardedAt)}
            </ThemedText>
          </Column>
        </Row>

        <ThemedText style={{ color: palette.foreground }}>{award.reason}</ThemedText>
        {award.note ? (
          <ThemedText style={[styles.noteText, { color: palette.muted }]} numberOfLines={2}>
            {award.note}
          </ThemedText>
        ) : null}

        <Row gap="xs" align="center" wrap>
          <Row gap="xxs" align="center" style={[styles.metaPill, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
            <Ionicons name="person" size={12} color={palette.tint} />
            <ThemedText style={[styles.metaText, { color: palette.tint }]}>
              {award.coachId || 'Coach'}
            </ThemedText>
          </Row>
          {award.sessionId ? (
            <Row gap="xxs" align="center" style={[styles.metaPill, { backgroundColor: withAlpha(palette.success, 0.07) }]}>
              <Ionicons name="link" size={12} color={palette.success} />
              <ThemedText style={[styles.metaText, { color: palette.success }]}>
                View session
              </ThemedText>
              <Ionicons name="chevron-forward" size={12} color={palette.success} />
            </Row>
          ) : null}
          {award.shared ? (
            <Row gap="xxs" align="center" style={[styles.metaPill, { backgroundColor: withAlpha(palette.icon, 0.06) }]}>
              <Ionicons name="send" size={12} color={palette.icon} />
              <ThemedText style={[styles.metaText, { color: palette.icon }]}>Shared</ThemedText>
            </Row>
          ) : null}
        </Row>
      </SurfaceCard>
    </Clickable>
  );
});

export const BadgeTimelineSection = memo(function BadgeTimelineSection({
  awards,
}: BadgeTimelineSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.sectionCard}>
      <Row justify="between" align="center">
        <ThemedText type="defaultSemiBold">Badge timeline</ThemedText>
        <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
          Tap to view linked sessions
        </ThemedText>
      </Row>

      {awards.length === 0 ? (
        <Column gap="xs" align="center" style={styles.emptyTimeline}>
          <Ionicons name="ribbon-outline" size={24} color={palette.icon} />
          <ThemedText type="defaultSemiBold">No badges yet</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
            They will show here once coaches award them
          </ThemedText>
        </Column>
      ) : (
        <Column gap="xs">
          {awards.map((award) => (
            <TimelineItem key={award.id} award={award} />
          ))}
        </Column>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  sectionCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionHint: {
    ...Typography.caption,
  },
  emptyTimeline: {
    paddingVertical: Spacing.md,
  },
  timelineItem: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  badgeIconSmall: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierPillSmall: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: 1,
    borderRadius: Radii.xs,
  },
  tierTextSmall: {
    ...Typography.micro,
    fontSize: 9,
  },
  categoryTag: {
    ...Typography.caption,
  },
  pointsValue: {
    ...Typography.bodySmallSemiBold,
  },
  dateText: {
    ...Typography.caption,
  },
  noteText: {
    ...Typography.caption,
  },
  metaPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  metaText: {
    ...Typography.caption,
  },
});
