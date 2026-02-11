/**
 * Extracted sub-components for BadgeGrid.
 *
 * SECTION_ICONS / SECTION_LABELS — config maps for badge categories.
 * BadgeSectionGridInner — section grid with progress bar (accepts palette).
 * BadgeStatsInner — stats overview card (accepts palette).
 */

import React, { memo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { BadgeCard } from './badge-card';
import { Spacing, withAlpha } from '@/constants/theme';
import type { AllBadgeWithProgress } from '@/services/badge-service';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { styles } from './badge-grid-styles';

// ─── Constants ───────────────────────────────────────────────────────────────

export const SECTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  milestones: 'trophy',
  streaks: 'flame',
  events: 'star',
  leadership: 'people',
  consistency: 'refresh',
  technique: 'football',
  mindset: 'bulb',
  teamwork: 'hand-left',
  resilience: 'fitness',
  skill: 'ribbon',
};

export const SECTION_LABELS: Record<string, string> = {
  milestones: 'Session Milestones',
  streaks: 'Consistency Streaks',
  events: 'Special Events',
  leadership: 'Leadership',
  consistency: 'Consistency',
  technique: 'Technique',
  mindset: 'Mindset',
  teamwork: 'Teamwork',
  resilience: 'Resilience',
};

// ─── BadgeSectionGridInner ───────────────────────────────────────────────────

interface BadgeSectionGridInnerProps {
  sectionKey: string;
  badges: AllBadgeWithProgress[];
  onBadgePress?: (badge: AllBadgeWithProgress) => void;
  columns?: 2 | 3;
  palette: ThemeColors;
}

export const BadgeSectionGridInner = memo(function BadgeSectionGridInner({
  sectionKey,
  badges,
  onBadgePress,
  columns = 2,
  palette,
}: BadgeSectionGridInnerProps) {
  const { width } = useWindowDimensions();

  const containerPadding = Spacing.sm * 2;
  const gapWidth = Spacing.sm * (columns - 1);
  const cardWidth = (width - containerPadding - gapWidth - Spacing.lg * 2) / columns;

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const totalCount = badges.length;
  const sectionIcon = SECTION_ICONS[sectionKey] ?? 'ribbon';
  const sectionLabel = SECTION_LABELS[sectionKey] ?? sectionKey;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (badges.length === 0) return null;

  return (
    <SurfaceCard style={styles.sectionContainer}>
      <Row style={styles.sectionHeader}>
        <Row style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
            <Ionicons name={sectionIcon} size={18} color={palette.tint} />
          </View>
          <View style={styles.sectionTitleGroup}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {sectionLabel}
            </ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
              {unlockedCount} of {totalCount} earned
            </ThemedText>
          </View>
        </Row>
        <View style={styles.sectionProgress}>
          <ThemedText style={[styles.progressPercent, { color: palette.tint }]}>
            {progressPercent}%
          </ThemedText>
        </View>
      </Row>

      <View style={[styles.sectionProgressBar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <View
          style={[
            styles.sectionProgressFill,
            { backgroundColor: palette.tint, width: `${progressPercent}%` },
          ]}
        />
      </View>

      <Row style={[styles.grid, { gap: Spacing.sm }]}>
        {badges.map((badge) => (
          <View key={badge.id} style={{ width: cardWidth }}>
            <BadgeCard
              badge={badge}
              onPress={onBadgePress ? () => onBadgePress(badge) : undefined}
            />
          </View>
        ))}
      </Row>
    </SurfaceCard>
  );
});

// ─── BadgeStatsInner ─────────────────────────────────────────────────────────

interface BadgeStatsInnerProps {
  totalBadges: number;
  unlockedBadges: number;
  totalPoints: number;
  palette: ThemeColors;
}

export const BadgeStatsInner = memo(function BadgeStatsInner({
  totalBadges,
  unlockedBadges,
  totalPoints,
  palette,
}: BadgeStatsInnerProps) {
  const progressPercent = totalBadges > 0 ? Math.round((unlockedBadges / totalBadges) * 100) : 0;

  return (
    <SurfaceCard style={styles.statsContainer}>
      <Row style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
            <Ionicons name="checkmark-circle" size={20} color={palette.success} />
          </View>
          <ThemedText type="heading" style={styles.statValue}>
            {unlockedBadges}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Earned</ThemedText>
        </View>

        <View style={[styles.statDivider, { backgroundColor: palette.border }]} />

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
            <Ionicons name="lock-closed" size={20} color={palette.muted} />
          </View>
          <ThemedText type="heading" style={styles.statValue}>
            {totalBadges - unlockedBadges}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Locked</ThemedText>
        </View>

        <View style={[styles.statDivider, { backgroundColor: palette.border }]} />

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <Ionicons name="star" size={20} color={palette.tint} />
          </View>
          <ThemedText type="heading" style={styles.statValue}>
            {totalPoints}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Points</ThemedText>
        </View>
      </Row>

      <View style={styles.overallProgress}>
        <Row style={styles.progressHeader}>
          <ThemedText style={[styles.progressTitle, { color: palette.text }]}>
            Overall Progress
          </ThemedText>
          <ThemedText style={[styles.progressValue, { color: palette.tint }]}>
            {progressPercent}%
          </ThemedText>
        </Row>
        <View style={[styles.progressBarLarge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <View
            style={[
              styles.progressFillLarge,
              { backgroundColor: palette.tint, width: `${progressPercent}%` },
            ]}
          />
        </View>
      </View>
    </SurfaceCard>
  );
});
