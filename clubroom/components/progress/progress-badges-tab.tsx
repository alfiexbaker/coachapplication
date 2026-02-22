import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/primitives/chip';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { BadgeAward } from '@/constants/types';
import type { AllBadgeWithProgress } from '@/services/badge-service';
import { BadgeWall } from './badge-wall';

interface ProgressBadgesTabProps {
  badges: BadgeAward[];
  allBadges?: AllBadgeWithProgress[];
  colors: ThemeColors;
}

export const ProgressBadgesTab = memo(function ProgressBadgesTab({
  badges,
  allBadges,
  colors,
}: ProgressBadgesTabProps) {
  const derivedBadges: AllBadgeWithProgress[] = badges.map((badge) => ({
    id: badge.badgeId || badge.id,
    label: badge.badgeLabel,
    description: badge.reason,
    category: badge.badgeCategory,
    tier: badge.badgeTier,
    pointValue: badge.badgePointValue ?? 0,
    tone: badge.badgeTone,
    badgeType: 'event',
    isUnlocked: true,
    earnedAt: badge.awardedAt,
    awardedBy: badge.awardedBy,
    progress: 100,
    progressLabel: 'Unlocked',
  }));
  const badgesForWall = allBadges && allBadges.length > 0 ? allBadges : derivedBadges;

  return (
    <View style={styles.section}>
      <Row align="center" justify="space-between">
        <ThemedText type="heading" style={Typography.heading}>
          My Badges
        </ThemedText>
        <Chip dense>{badgesForWall.filter((badge) => badge.isUnlocked).length} earned</Chip>
      </Row>
      <BadgeWall badges={badgesForWall} />
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
});
