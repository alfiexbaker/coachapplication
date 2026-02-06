import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { BadgeCard } from './badge-card';
import { Colors, Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AllBadgeWithProgress } from '@/services/badge-service';

interface BadgeGridProps {
  badges: AllBadgeWithProgress[];
  title?: string;
  subtitle?: string;
  onBadgePress?: (badge: AllBadgeWithProgress) => void;
  showCounts?: boolean;
  columns?: 2 | 3;
  compact?: boolean;
}

const SECTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
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

const SECTION_LABELS: Record<string, string> = {
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

export function BadgeGrid({
  badges,
  title,
  subtitle,
  onBadgePress,
  showCounts = true,
  columns = 2,
  compact = false,
}: BadgeGridProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { width } = useWindowDimensions();

  // Calculate card width based on columns
  const containerPadding = Spacing.sm * 2;
  const gapWidth = Spacing.sm * (columns - 1);
  const cardWidth = (width - containerPadding - gapWidth - Spacing.lg * 2) / columns;

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const totalCount = badges.length;

  if (badges.length === 0) {
    return null;
  }

  return (
    <SurfaceCard style={styles.container}>
      {(title || showCounts) && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {title && (
              <ThemedText type="defaultSemiBold" style={styles.title}>
                {title}
              </ThemedText>
            )}
            {subtitle && (
              <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
                {subtitle}
              </ThemedText>
            )}
          </View>
          {showCounts && (
            <View style={[styles.countPill, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
              <ThemedText style={[styles.countText, { color: palette.tint }]}>
                {unlockedCount}/{totalCount}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      <View style={[styles.grid, { gap: Spacing.sm }]}>
        {badges.map((badge) => (
          <View key={badge.id} style={{ width: cardWidth }}>
            <BadgeCard
              badge={badge}
              onPress={onBadgePress ? () => onBadgePress(badge) : undefined}
              compact={compact}
            />
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
}

interface BadgeSectionGridProps {
  sectionKey: string;
  badges: AllBadgeWithProgress[];
  onBadgePress?: (badge: AllBadgeWithProgress) => void;
  columns?: 2 | 3;
}

export function BadgeSectionGrid({
  sectionKey,
  badges,
  onBadgePress,
  columns = 2,
}: BadgeSectionGridProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { width } = useWindowDimensions();

  // Calculate card width based on columns
  const containerPadding = Spacing.sm * 2;
  const gapWidth = Spacing.sm * (columns - 1);
  const cardWidth = (width - containerPadding - gapWidth - Spacing.lg * 2) / columns;

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const totalCount = badges.length;
  const sectionIcon = SECTION_ICONS[sectionKey] ?? 'ribbon';
  const sectionLabel = SECTION_LABELS[sectionKey] ?? sectionKey;

  if (badges.length === 0) {
    return null;
  }

  // Calculate progress percentage for section
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <SurfaceCard style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
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
        </View>
        <View style={styles.sectionProgress}>
          <ThemedText style={[styles.progressPercent, { color: palette.tint }]}>
            {progressPercent}%
          </ThemedText>
        </View>
      </View>

      {/* Progress bar for section */}
      <View style={[styles.sectionProgressBar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <View
          style={[
            styles.sectionProgressFill,
            {
              backgroundColor: palette.tint,
              width: `${progressPercent}%`,
            },
          ]}
        />
      </View>

      <View style={[styles.grid, { gap: Spacing.sm }]}>
        {badges.map((badge) => (
          <View key={badge.id} style={{ width: cardWidth }}>
            <BadgeCard
              badge={badge}
              onPress={onBadgePress ? () => onBadgePress(badge) : undefined}
            />
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
}

interface BadgeStatsProps {
  totalBadges: number;
  unlockedBadges: number;
  totalPoints: number;
}

export function BadgeStats({ totalBadges, unlockedBadges, totalPoints }: BadgeStatsProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const progressPercent =
    totalBadges > 0 ? Math.round((unlockedBadges / totalBadges) * 100) : 0;

  return (
    <SurfaceCard style={styles.statsContainer}>
      <View style={styles.statsRow}>
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
      </View>

      <View style={styles.overallProgress}>
        <View style={styles.progressHeader}>
          <ThemedText style={[styles.progressTitle, { color: palette.text }]}>
            Overall Progress
          </ThemedText>
          <ThemedText style={[styles.progressValue, { color: palette.tint }]}>
            {progressPercent}%
          </ThemedText>
        </View>
        <View style={[styles.progressBarLarge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <View
            style={[
              styles.progressFillLarge,
              {
                backgroundColor: palette.tint,
                width: `${progressPercent}%`,
              },
            ]}
          />
        </View>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    gap: Spacing.micro,
  },
  title: { ...Typography.subheading },
  subtitle: { ...Typography.caption },
  countPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  countText: { ...Typography.caption },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sectionContainer: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleGroup: {
    flex: 1,
    gap: Spacing.micro,
  },
  sectionTitle: { ...Typography.body },
  sectionSubtitle: { ...Typography.caption },
  sectionProgress: {
    alignItems: 'flex-end',
  },
  progressPercent: { ...Typography.bodySmallSemiBold },
  sectionProgressBar: {
    height: 4,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  sectionProgressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  statsContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
    flex: 1,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { ...Typography.display },
  statLabel: { ...Typography.caption, textTransform: 'uppercase',
    letterSpacing: 0.5 },
  statDivider: {
    width: 1,
    height: 50,
  },
  overallProgress: {
    gap: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: { ...Typography.bodySmallSemiBold },
  progressValue: { ...Typography.bodySmallSemiBold },
  progressBarLarge: {
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFillLarge: {
    height: '100%',
    borderRadius: Radii.xs,
  },
});
