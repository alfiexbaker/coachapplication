import { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserById, formatDate } from '@/constants/mock-data';
import { badgeService } from '@/services/badge-service';
import { TierNames, CategoryInfo, ProgressionLevel } from '@/constants/progression';
import type { BadgeAward, BadgeCategory } from '@/constants/types';

export default function ChildBadgesScreen() {
  const { childId, highlightBadge } = useLocalSearchParams<{ childId: string; highlightBadge?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [progressionData, setProgressionData] = useState<{
    totalPoints: number;
    currentLevel: ProgressionLevel;
    nextLevel: ProgressionLevel | null;
    progressPercent: number;
    pointsToNext: number;
    totalBadges: number;
    categoryBreakdown: {
      category: BadgeCategory;
      label: string;
      badgeCount: number;
    }[];
  } | null>(null);
  const [, setLoading] = useState(true);

  const child = getUserById(childId!);

  const loadData = useCallback(async () => {
    if (!childId) return;
    setLoading(true);

    const [awardsData, progression] = await Promise.all([
      badgeService.listAwardsForAthlete(childId),
      badgeService.getProgressionSummary(childId),
    ]);

    // Filter to only show visible badges (not coach_only)
    const visibleAwards = awardsData.filter(a => a.visibility !== 'coach_only');
    setAwards(visibleAwards);
    setProgressionData(progression);

    // Mark all as seen by parent
    await badgeService.markAllSeenByParent(childId);

    setLoading(false);
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getTierColor = (tier?: 1 | 2 | 3) => {
    switch (tier) {
      case 3: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 1: return '#CD7F32'; // Bronze
      default: return '#F59E0B';
    }
  };

  const getCategoryIcon = (category?: BadgeCategory): keyof typeof Ionicons.glyphMap => {
    if (!category) return 'ribbon';
    const icons: Record<BadgeCategory, keyof typeof Ionicons.glyphMap> = {
      leadership: 'people',
      consistency: 'refresh',
      technique: 'football',
      mindset: 'bulb',
      teamwork: 'hand-left',
      resilience: 'fitness',
    };
    return icons[category];
  };

  // Check if badge is recent (within 7 days)
  const isRecent = (awardedAt: string) => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return new Date(awardedAt).getTime() > weekAgo;
  };

  if (!child) {
    return (
      <PageContainer>
        <ThemedText>Child not found</ThemedText>
      </PageContainer>
    );
  }

  return (
    <PageContainer gap={Spacing.md}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText type="title" style={styles.headerTitle}>
            {child.name}&apos;s Badges
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]}>
            {awards.length} badge{awards.length !== 1 ? 's' : ''} earned
          </ThemedText>
        </View>
      </View>

      {/* Level Progress Card */}
      {progressionData && (
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <SurfaceCard style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <View style={[styles.levelBadge, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="trophy" size={24} color={palette.tint} />
              </View>
              <View style={styles.levelInfo}>
                <ThemedText type="heading" style={styles.levelName}>
                  Level {progressionData.currentLevel.level}: {progressionData.currentLevel.name}
                </ThemedText>
                <ThemedText style={[styles.levelPoints, { color: palette.muted }]}>
                  {progressionData.totalPoints} points earned
                </ThemedText>
              </View>
            </View>

            {progressionData.nextLevel && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
                    Progress to {progressionData.nextLevel.name}
                  </ThemedText>
                  <ThemedText style={[styles.progressValue, { color: palette.tint }]}>
                    {progressionData.pointsToNext} pts to go
                  </ThemedText>
                </View>
                <View style={[styles.progressBar, { backgroundColor: `${palette.tint}15` }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: palette.tint,
                        width: `${progressionData.progressPercent}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Badge List */}
      {awards.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="ribbon-outline" size={48} color={palette.icon} />
              <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
                No badges yet
              </ThemedText>
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                Badges will appear here when coaches award them for achievements during training sessions.
              </ThemedText>
            </View>
          </SurfaceCard>
        </Animated.View>
      ) : (
        <View style={styles.badgeList}>
          {awards.map((award, index) => (
            <Animated.View
              key={award.id}
              entering={FadeInDown.delay(100 + index * 30).springify()}
            >
              <SurfaceCard
                style={[
                  styles.badgeCard,
                  highlightBadge === award.id ? { borderColor: '#F59E0B', borderWidth: 2 } : undefined,
                  isRecent(award.awardedAt) && !award.seenByParent ? { backgroundColor: '#F59E0B08' } : undefined,
                ]}
              >
                {/* Badge Header */}
                <View style={styles.badgeHeader}>
                  <View style={[styles.badgeIcon, { backgroundColor: `${getTierColor(award.badgeTier)}20` }]}>
                    <Ionicons name="ribbon" size={24} color={getTierColor(award.badgeTier)} />
                  </View>
                  <View style={styles.badgeInfo}>
                    <View style={styles.badgeTitleRow}>
                      <ThemedText type="defaultSemiBold" style={styles.badgeLabel}>
                        {award.badgeLabel}
                      </ThemedText>
                      {isRecent(award.awardedAt) && (
                        <View style={[styles.recentPill, { backgroundColor: '#F59E0B' }]}>
                          <ThemedText style={styles.recentPillText}>Recent</ThemedText>
                        </View>
                      )}
                    </View>
                    <View style={styles.badgeMeta}>
                      {award.badgeTier && (
                        <View style={[styles.tierPill, { backgroundColor: `${getTierColor(award.badgeTier)}20` }]}>
                          <ThemedText style={[styles.tierText, { color: getTierColor(award.badgeTier) }]}>
                            {TierNames[award.badgeTier]}
                          </ThemedText>
                        </View>
                      )}
                      {award.badgeCategory && (
                        <View style={[styles.categoryPill, { backgroundColor: `${palette.tint}12` }]}>
                          <Ionicons name={getCategoryIcon(award.badgeCategory)} size={12} color={palette.tint} />
                          <ThemedText style={[styles.categoryText, { color: palette.tint }]}>
                            {CategoryInfo[award.badgeCategory].label}
                          </ThemedText>
                        </View>
                      )}
                      <ThemedText style={[styles.pointsText, { color: palette.tint }]}>
                        +{award.badgePointValue ?? 0} pts
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Reason */}
                <View style={styles.reasonSection}>
                  <ThemedText type="defaultSemiBold" style={styles.reasonLabel}>
                    Reason
                  </ThemedText>
                  <ThemedText style={styles.reasonText}>
                    {award.reason}
                  </ThemedText>
                </View>

                {/* Coach Note */}
                {award.note && (
                  <View style={[styles.noteSection, { backgroundColor: `${palette.tint}08`, borderColor: `${palette.tint}20` }]}>
                    <View style={styles.noteLabelRow}>
                      <Ionicons name="chatbubble" size={14} color={palette.tint} />
                      <ThemedText type="defaultSemiBold" style={[styles.noteLabel, { color: palette.tint }]}>
                        Coach&apos;s Note
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.noteText}>
                      &quot;{award.note}&quot;
                    </ThemedText>
                  </View>
                )}

                {/* Footer */}
                <View style={[styles.badgeFooter, { borderTopColor: palette.border }]}>
                  <View style={styles.coachInfo}>
                    <Ionicons name="person" size={14} color={palette.icon} />
                    <ThemedText style={[styles.coachText, { color: palette.muted }]}>
                      Awarded by Coach {award.coachName}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.dateText, { color: palette.muted }]}>
                    {formatDate(award.awardedAt)}
                  </ThemedText>
                </View>

                {/* Share Button */}
                {!award.shared && (
                  <Clickable
                    onPress={async () => {
                      await badgeService.markShared(award.id);
                      loadData();
                    }}
                    style={[styles.shareButton, { backgroundColor: palette.tint }]}
                  >
                    <Ionicons name="share-social" size={16} color="#FFFFFF" />
                    <ThemedText style={styles.shareButtonText}>Share to Feed</ThemedText>
                  </Clickable>
                )}
                {award.shared && (
                  <View style={[styles.sharedIndicator, { backgroundColor: `${palette.success}15` }]}>
                    <Ionicons name="checkmark-circle" size={14} color={palette.success} />
                    <ThemedText style={[styles.sharedText, { color: palette.success }]}>
                      Shared to feed
                    </ThemedText>
                  </View>
                )}
              </SurfaceCard>
            </Animated.View>
          ))}
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerContent: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  levelCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelInfo: {
    flex: 1,
    gap: 4,
  },
  levelName: {
    fontSize: 18,
  },
  levelPoints: {
    fontSize: 14,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyCard: {
    padding: Spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
  },
  badgeList: {
    gap: Spacing.sm,
  },
  badgeCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  badgeLabel: {
    fontSize: 16,
  },
  recentPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recentPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  tierPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reasonSection: {
    gap: 4,
  },
  reasonLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: 15,
    lineHeight: 22,
  },
  noteSection: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  noteLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  noteLabel: {
    fontSize: 12,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  badgeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  coachText: {
    fontSize: 13,
  },
  dateText: {
    fontSize: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sharedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  sharedText: {
    fontWeight: '600',
    fontSize: 13,
  },
});
