import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { SectionHeader } from '@/components/primitives/section-header';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { BadgeSectionGrid, BadgeStats } from '@/components/badges/badge-grid';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { badgeService, AllBadgeWithProgress, BadgeType } from '@/services/badge-service';
import { TierNames, CategoryInfo } from '@/constants/progression';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BadgesScreen');

type FilterTab = 'all' | 'unlocked' | 'locked' | 'in-progress';

const FILTER_TABS: { key: FilterTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'unlocked', label: 'Earned', icon: 'checkmark-circle-outline' },
  { key: 'locked', label: 'Locked', icon: 'lock-closed-outline' },
  { key: 'in-progress', label: 'In Progress', icon: 'time-outline' },
];

const SECTION_ORDER = [
  'milestones',
  'streaks',
  'events',
  'leadership',
  'consistency',
  'technique',
  'mindset',
  'teamwork',
  'resilience',
];

export default function AllBadgesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [allBadges, setAllBadges] = useState<AllBadgeWithProgress[]>([]);
  const [badgesByCategory, setBadgesByCategory] = useState<Map<string, AllBadgeWithProgress[]>>(
    new Map()
  );
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    setIsLoading(true);
    Promise.all([
      badgeService.getAllBadgesWithProgress(currentUser.id),
      badgeService.getBadgesByCategory(currentUser.id),
    ])
      .then(([badges, grouped]) => {
        setAllBadges(badges);
        setBadgesByCategory(grouped);
        logger.info('badges_loaded', {
          totalBadges: badges.length,
          unlockedCount: badges.filter((b) => b.isUnlocked).length,
        });
      })
      .finally(() => setIsLoading(false));
  }, [currentUser]);

  // Filter badges based on active filter
  const filteredBadges = useMemo(() => {
    switch (activeFilter) {
      case 'unlocked':
        return allBadges.filter((b) => b.isUnlocked);
      case 'locked':
        return allBadges.filter((b) => !b.isUnlocked && b.progress === 0);
      case 'in-progress':
        return allBadges.filter((b) => !b.isUnlocked && b.progress > 0);
      default:
        return allBadges;
    }
  }, [allBadges, activeFilter]);

  // Group filtered badges by section
  const filteredBySection = useMemo(() => {
    const grouped = new Map<string, AllBadgeWithProgress[]>();

    // For 'all' filter, use the pre-grouped data
    if (activeFilter === 'all') {
      return badgesByCategory;
    }

    // Otherwise, re-group the filtered badges
    filteredBadges.forEach((badge) => {
      let section: string;
      if (badge.badgeType === 'milestone') {
        section = 'milestones';
      } else if (badge.badgeType === 'streak') {
        section = 'streaks';
      } else if (badge.badgeType === 'event') {
        section = 'events';
      } else {
        section = badge.category || 'other';
      }

      if (!grouped.has(section)) {
        grouped.set(section, []);
      }
      grouped.get(section)!.push(badge);
    });

    return grouped;
  }, [filteredBadges, badgesByCategory, activeFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = allBadges.length;
    const unlocked = allBadges.filter((b) => b.isUnlocked).length;
    const points = allBadges
      .filter((b) => b.isUnlocked)
      .reduce((sum, b) => sum + b.pointValue, 0);
    return { total, unlocked, points };
  }, [allBadges]);

  const handleBadgePress = (badge: AllBadgeWithProgress) => {
    logger.press('BadgeCard', { badgeId: badge.id, isUnlocked: badge.isUnlocked });

    if (badge.isUnlocked) {
      Alert.alert(
        badge.label,
        `${badge.description || 'Achievement unlocked!'}\n\nEarned: ${badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : 'Recently'}${badge.awardedBy ? `\nAwarded by: ${badge.awardedBy}` : ''}\nPoints: +${badge.pointValue}`,
        [{ text: 'Close', style: 'cancel' }]
      );
    } else {
      Alert.alert(
        `${badge.label} (Locked)`,
        `${badge.description || 'Keep working to unlock this badge!'}\n\nProgress: ${badge.progressLabel}\nPoints when unlocked: +${badge.pointValue}`,
        [{ text: 'Got it', style: 'cancel' }]
      );
    }
  };

  if (!currentUser) return null;

  return (
    <PageContainer
      header={
        <PageHeader
          title="Achievements"
          subtitle="Track your badges and progress"
          showBack
          onBack={() => router.back()}
        />
      }
      gap={Spacing.md}
    >
      {/* Stats Summary */}
      <BadgeStats
        totalBadges={stats.total}
        unlockedBadges={stats.unlocked}
        totalPoints={stats.points}
      />

      {/* Filter Tabs */}
      <SurfaceCard style={styles.filterCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = tab.key === activeFilter;
            const count =
              tab.key === 'all'
                ? allBadges.length
                : tab.key === 'unlocked'
                  ? allBadges.filter((b) => b.isUnlocked).length
                  : tab.key === 'locked'
                    ? allBadges.filter((b) => !b.isUnlocked && b.progress === 0).length
                    : allBadges.filter((b) => !b.isUnlocked && b.progress > 0).length;

            return (
              <Clickable
                key={tab.key}
                onPress={() => {
                  setActiveFilter(tab.key);
                  logger.press('FilterTab', { filter: tab.key });
                }}
                style={[
                  styles.filterTab,
                  isActive && {
                    backgroundColor: `${palette.tint}12`,
                    borderColor: palette.tint,
                  },
                  !isActive && { borderColor: palette.border },
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={isActive ? palette.tint : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.filterLabel,
                    { color: isActive ? palette.tint : palette.muted },
                  ]}
                >
                  {tab.label}
                </ThemedText>
                <View
                  style={[
                    styles.filterCount,
                    { backgroundColor: isActive ? `${palette.tint}20` : `${palette.muted}15` },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.filterCountText,
                      { color: isActive ? palette.tint : palette.muted },
                    ]}
                  >
                    {count}
                  </ThemedText>
                </View>
              </Clickable>
            );
          })}
        </ScrollView>
      </SurfaceCard>

      {/* Badge Sections */}
      {isLoading ? (
        <SurfaceCard style={styles.loadingCard}>
          <ThemedText style={{ color: palette.muted }}>Loading badges...</ThemedText>
        </SurfaceCard>
      ) : filteredBadges.length === 0 ? (
        <SurfaceCard style={styles.emptyCard}>
          <Ionicons name="ribbon-outline" size={40} color={palette.muted} />
          <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
            {activeFilter === 'unlocked'
              ? 'No badges earned yet'
              : activeFilter === 'in-progress'
                ? 'No badges in progress'
                : 'No badges found'}
          </ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: palette.muted }]}>
            {activeFilter === 'unlocked'
              ? 'Complete sessions and hit milestones to earn badges'
              : activeFilter === 'in-progress'
                ? 'Start working toward your first milestone'
                : 'Try a different filter'}
          </ThemedText>
        </SurfaceCard>
      ) : (
        SECTION_ORDER.filter((section) => filteredBySection.has(section)).map((section) => (
          <BadgeSectionGrid
            key={section}
            sectionKey={section}
            badges={filteredBySection.get(section) || []}
            onBadgePress={handleBadgePress}
          />
        ))
      )}

      {/* Legend */}
      <SurfaceCard style={styles.legendCard}>
        <ThemedText type="defaultSemiBold" style={styles.legendTitle}>
          Badge Tiers
        </ThemedText>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#CD7F32' }]} />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>
              Bronze (10 pts)
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#C0C0C0' }]} />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>
              Silver (25 pts)
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>
              Gold (50 pts)
            </ThemedText>
          </View>
        </View>
      </SurfaceCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  filterCard: {
    padding: Spacing.xs,
  },
  filterScroll: {
    gap: Spacing.xs,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadingCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
  },
  legendCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  legendTitle: {
    fontSize: 13,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
  },
});
