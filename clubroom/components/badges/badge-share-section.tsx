/**
 * BadgeShareSection — Shareable badge awards with send-to-supporters action.
 *
 * Shows up to 3 unsent badges with tier pills and a "Share" button
 * that calls badgeService.markShared().
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Components, Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { TierNames } from '@/constants/progression';
import type { BadgeAward } from '@/constants/types';

// Decorative: badge tier colors (gold/silver/bronze medals)
const BADGE_TIER_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

function getTierColor(tier: 1 | 2 | 3 | undefined, fallback: string): string {
  switch (tier) {
    case 3: return BADGE_TIER_COLORS.gold;
    case 2: return BADGE_TIER_COLORS.silver;
    case 1: return BADGE_TIER_COLORS.bronze;
    default: return fallback;
  }
}

interface BadgeShareSectionProps {
  shareable: BadgeAward[];
  sharingId: string | null;
  onShare: (awardId: string) => void;
}

const ShareableAwardRow = memo(function ShareableAwardRow({
  award,
  isSharing,
  onShare,
}: {
  award: BadgeAward;
  isSharing: boolean;
  onShare: (id: string) => void;
}) {
  const { colors: palette } = useTheme();
  const tierColor = getTierColor(award.badgeTier, palette.tint);

  const handlePress = useCallback(() => {
    onShare(award.id);
  }, [award.id, onShare]);

  return (
    <SurfaceCard style={styles.shareRow}>
      <Row gap="sm" align="center" flex>
        <View style={[styles.badgeIcon, { backgroundColor: withAlpha(tierColor, 0.12) }]}>
          <Ionicons name="ribbon" size={16} color={tierColor} />
        </View>
        <Column gap="micro" flex>
          <Row gap="xs" align="center" wrap>
            <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
            {award.badgeTier && (
              <View style={[styles.tierPill, { backgroundColor: withAlpha(tierColor, 0.12) }]}>
                <ThemedText style={[styles.tierText, { color: tierColor }]}>
                  {TierNames[award.badgeTier]}
                </ThemedText>
              </View>
            )}
          </Row>
          <ThemedText style={[styles.pointsHint, { color: palette.muted }]} numberOfLines={1}>
            +{award.badgePointValue ?? 0} pts
          </ThemedText>
        </Column>
      </Row>
      <Clickable
        disabled={isSharing}
        onPress={handlePress}
        style={[styles.pillButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
        accessibilityLabel={`Share ${award.badgeLabel} badge`}
        accessibilityRole="button"
      >
        <ThemedText style={[styles.pillButtonText, { color: palette.tint }]}>
          {isSharing ? 'Sending...' : 'Share'}
        </ThemedText>
      </Clickable>
    </SurfaceCard>
  );
});

export const BadgeShareSection = memo(function BadgeShareSection({
  shareable,
  sharingId,
  onShare,
}: BadgeShareSectionProps) {
  const { colors: palette } = useTheme();

  if (shareable.length === 0) return null;

  return (
    <SurfaceCard style={styles.sectionCard}>
      <Row justify="between" align="center">
        <ThemedText type="defaultSemiBold">Share updates</ThemedText>
        <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
          Send badges to supporters
        </ThemedText>
      </Row>

      <Column gap="xs">
        {shareable.slice(0, 3).map((award) => (
          <ShareableAwardRow
            key={award.id}
            award={award}
            isSharing={sharingId === award.id}
            onShare={onShare}
          />
        ))}
      </Column>
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
  shareRow: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  badgeIcon: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierPill: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  tierText: {
    ...Typography.micro,
  },
  pointsHint: {
    ...Typography.caption,
  },
  pillButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  pillButtonText: {
    ...Typography.smallSemiBold,
  },
});
