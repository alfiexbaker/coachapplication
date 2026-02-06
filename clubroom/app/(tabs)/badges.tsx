import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Components, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { badgeService } from '@/services/badge-service';
import type { BadgeAward, BadgeCategory } from '@/constants/types';
import { formatDate } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import { TierNames, CategoryInfo, ProgressionLevel } from '@/constants/progression';

const logger = createLogger('UserBadgesScreen');

type CategoryBreakdownItem = {
  category: BadgeCategory;
  label: string;
  icon: string;
  badgeCount: number;
  currentMilestone: string;
  nextMilestone: string | null;
  badgesToNext: number;
  progressPercent: number;
  totalPoints: number;
};

export default function UserBadgesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [isSharing, setIsSharing] = useState<string | null>(null);
  const [progressionData, setProgressionData] = useState<{
    totalPoints: number;
    currentLevel: ProgressionLevel;
    nextLevel: ProgressionLevel | null;
    progressPercent: number;
    pointsToNext: number;
    totalBadges: number;
    categoryBreakdown: CategoryBreakdownItem[];
    topCategories: { category: BadgeCategory; label: string; badgeCount: number; totalPoints: number }[];
  } | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Load awards and progression data in parallel
    Promise.all([
      badgeService.listAwardsForAthlete(currentUser.id),
      badgeService.getProgressionSummary(currentUser.id),
    ]).then(([awardsData, progression]) => {
      setAwards(awardsData);
      setProgressionData(progression);
    });
  }, [currentUser]);

  const supporterFacingAwards = useMemo(
    () => awards.filter((award) => award.visibility !== 'coach_only'),
    [awards]
  );

  const lastAward = awards[0];
  const sharedCount = supporterFacingAwards.filter((award) => award.shared).length;
  const shareable = supporterFacingAwards.filter((award) => !award.shared);

  // Filter categories with activity (available for future use)
  useMemo(
    () => progressionData?.categoryBreakdown.filter((cat) => cat.badgeCount > 0) ?? [],
    [progressionData]
  );

  const handleShare = async (awardId: string) => {
    setIsSharing(awardId);
    try {
      const updated = await badgeService.markShared(awardId);
      if (updated) {
        setAwards((prev) => prev.map((award) => (award.id === awardId ? updated : award)));
        logger.info('badge_shared_by_athlete', { awardId });
      }
    } finally {
      setIsSharing(null);
    }
  };

  const handleBadgeTap = (award: BadgeAward) => {
    if (award.sessionId) {
      logger.press('BadgeToSession', { awardId: award.id, sessionId: award.sessionId });
      router.push(Routes.developmentSession(award.sessionId));
    }
  };

  const getTierColor = (tier?: 1 | 2 | 3) => {
    switch (tier) {
      case 3: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 1: return '#CD7F32'; // Bronze
      default: return palette.tint;
    }
  };

  const getCategoryIcon = (category: BadgeCategory): keyof typeof Ionicons.glyphMap => {
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

  if (!currentUser) return null;

  return (
    <PageContainer
      header={
        <ScreenHeader
          title="Badges"
          subtitle="Achievements and rewards"
        />
      }
      gap={Spacing.md}
    >
      {/* Level and Progress Card */}
      {progressionData && (
        <SurfaceCard style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Ionicons name="trophy" size={24} color={palette.tint} />
            </View>
            <View style={styles.levelInfo}>
              <ThemedText type="subtitle" style={styles.levelName}>
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
              <View style={[styles.progressBar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
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

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>
                {progressionData.totalBadges}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Total badges</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>
                {sharedCount}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Shared</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.toneBadge, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
                <Ionicons name="sparkles" size={14} color={palette.tint} />
              </View>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Last badge</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.statValue} numberOfLines={1}>
                {lastAward ? formatDate(lastAward.awardedAt) : 'Not yet'}
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>
      )}

      {/* Category Breakdown */}
      {progressionData && progressionData.categoryBreakdown.length > 0 && (
        <SurfaceCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Category Progress</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              Earn badges to unlock milestones
            </ThemedText>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {progressionData.categoryBreakdown.map((cat) => (
              <View
                key={cat.category}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: cat.badgeCount > 0 ? withAlpha(palette.tint, 0.03) : palette.surface,
                    borderColor: cat.badgeCount > 0 ? palette.tint : palette.border,
                  },
                ]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                  <Ionicons
                    name={getCategoryIcon(cat.category)}
                    size={18}
                    color={cat.badgeCount > 0 ? palette.tint : palette.muted}
                  />
                </View>
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.categoryLabel, { color: cat.badgeCount > 0 ? palette.foreground : palette.muted }]}
                >
                  {cat.label}
                </ThemedText>
                <ThemedText style={[styles.categoryCount, { color: palette.tint }]}>
                  {cat.badgeCount} badge{cat.badgeCount !== 1 ? 's' : ''}
                </ThemedText>

                {cat.nextMilestone && (
                  <View style={styles.milestoneProgress}>
                    <ThemedText style={[styles.milestoneText, { color: palette.muted }]}>
                      {cat.badgeCount}/{cat.badgeCount + cat.badgesToNext} to {cat.nextMilestone}
                    </ThemedText>
                    <View style={[styles.miniProgressBar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                      <View
                        style={[
                          styles.miniProgressFill,
                          {
                            backgroundColor: palette.tint,
                            width: `${cat.progressPercent}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {cat.currentMilestone !== 'None' && (
                  <View style={[styles.milestoneBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                    <Ionicons name="checkmark-circle" size={12} color={palette.success} />
                    <ThemedText style={[styles.milestoneBadgeText, { color: palette.success }]}>
                      {cat.currentMilestone}
                    </ThemedText>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </SurfaceCard>
      )}

      {/* View All Achievements CTA */}
      <SurfaceCard style={styles.progressCard}>
        <View style={styles.progressCardHeader}>
          <View style={styles.allBadgesIcon}>
            <Ionicons name="trophy" size={24} color={palette.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">View All Achievements</ThemedText>
            <ThemedText style={[styles.progressHint, { color: palette.muted }]}>
              See all badges, milestones, and progress
            </ThemedText>
          </View>
        </View>
        <Clickable
          onPress={() => router.push(Routes.BADGES_INDEX)}
          style={[styles.primaryButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="grid-outline" size={18} color={Colors.light.onPrimary} />
          <ThemedText style={styles.primaryButtonText}>Browse All Badges</ThemedText>
        </Clickable>
      </SurfaceCard>

      {/* Ready for Progression CTA */}
      <SurfaceCard style={styles.progressCard}>
        <View style={styles.progressCardHeader}>
          <ThemedText type="defaultSemiBold">Ready for the next level?</ThemedText>
          <ThemedText style={[styles.progressHint, { color: palette.muted }]}>
            Book a session to keep building momentum
          </ThemedText>
        </View>
        <View style={styles.progressActions}>
          <Clickable
            onPress={() => router.push(Routes.BOOKINGS)}
            style={[styles.primaryButton, { backgroundColor: palette.tint }]}
          >
            <ThemedText style={styles.primaryButtonText}>View bookings</ThemedText>
          </Clickable>
          <Clickable
            onPress={() => router.push(Routes.BOOK_COACH)}
            style={[styles.secondaryButton, { borderColor: palette.border }]}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: palette.foreground }]}>Find a coach</ThemedText>
          </Clickable>
        </View>
      </SurfaceCard>

      {/* Share Updates */}
      {supporterFacingAwards.length > 0 && shareable.length > 0 && (
        <SurfaceCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Share updates</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>Send badges to supporters</ThemedText>
          </View>

          <View style={{ gap: Spacing.xs }}>
            {shareable.slice(0, 3).map((award) => (
              <SurfaceCard key={award.id} style={styles.shareRow}>
                <View style={styles.shareLeft}>
                  <View style={[styles.badgeIcon, { backgroundColor: withAlpha(getTierColor(award.badgeTier), 0.12) }]}>
                    <Ionicons name="ribbon" size={16} color={getTierColor(award.badgeTier)} />
                  </View>
                  <View style={{ flex: 1, gap: Spacing.micro }}>
                    <View style={styles.badgeTitleRow}>
                      <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                      {award.badgeTier && (
                        <View style={[styles.tierPill, { backgroundColor: withAlpha(getTierColor(award.badgeTier), 0.12) }]}>
                          <ThemedText style={[styles.tierText, { color: getTierColor(award.badgeTier) }]}>
                            {TierNames[award.badgeTier]}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText style={[styles.sectionHint, { color: palette.muted }]} numberOfLines={1}>
                      +{award.badgePointValue ?? 0} pts
                    </ThemedText>
                  </View>
                </View>
                <Clickable
                  disabled={isSharing === award.id}
                  onPress={() => handleShare(award.id)}
                  style={[styles.pillButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                  <ThemedText style={[styles.pillButtonText, { color: palette.tint }]}>
                    {isSharing === award.id ? 'Sending...' : 'Share'}
                  </ThemedText>
                </Clickable>
              </SurfaceCard>
            ))}
          </View>
        </SurfaceCard>
      )}

      {/* Badge Timeline */}
      <SurfaceCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold">Badge timeline</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
            Tap to view linked sessions
          </ThemedText>
        </View>

        {awards.length === 0 ? (
          <View style={styles.emptyTimeline}>
            <Ionicons name="ribbon-outline" size={24} color={palette.icon} />
            <ThemedText type="defaultSemiBold">No badges yet</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              They will show here once coaches award them
            </ThemedText>
          </View>
        ) : (
          <View style={{ gap: Spacing.xs }}>
            {awards.map((award) => (
              <Clickable
                key={award.id}
                onPress={() => handleBadgeTap(award)}
                disabled={!award.sessionId}
              >
                <SurfaceCard
                  style={[
                    styles.timelineItem,
                    award.sessionId ? { borderColor: withAlpha(palette.tint, 0.19) } : undefined,
                  ]}
                >
                  <View style={styles.timelineHeader}>
                    <View style={styles.timelineTitleRow}>
                      <View style={[styles.badgeIconSmall, { backgroundColor: withAlpha(getTierColor(award.badgeTier), 0.12) }]}>
                        <Ionicons name="ribbon" size={14} color={getTierColor(award.badgeTier)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.badgeTitleRow}>
                          <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                          {award.badgeTier && (
                            <View style={[styles.tierPillSmall, { backgroundColor: withAlpha(getTierColor(award.badgeTier), 0.12) }]}>
                              <ThemedText style={[styles.tierTextSmall, { color: getTierColor(award.badgeTier) }]}>
                                {TierNames[award.badgeTier]}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        {award.badgeCategory && (
                          <ThemedText style={[styles.categoryTag, { color: palette.muted }]}>
                            {CategoryInfo[award.badgeCategory].label}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                    <View style={styles.timelineRight}>
                      <ThemedText style={[styles.pointsValue, { color: palette.tint }]}>
                        +{award.badgePointValue ?? 0}
                      </ThemedText>
                      <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                        {formatDate(award.awardedAt)}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText style={{ color: palette.foreground }}>{award.reason}</ThemedText>
                  {award.note ? (
                    <ThemedText style={[styles.sectionHint, { color: palette.muted }]} numberOfLines={2}>
                      {award.note}
                    </ThemedText>
                  ) : null}

                  <View style={styles.timelineMetaRow}>
                    <View style={[styles.metaPill, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
                      <Ionicons name="person" size={12} color={palette.tint} />
                      <ThemedText style={[styles.metaText, { color: palette.tint }]}>
                        {award.coachName}
                      </ThemedText>
                    </View>
                    {award.sessionId ? (
                      <View style={[styles.metaPill, { backgroundColor: withAlpha(palette.success, 0.07) }]}>
                        <Ionicons name="link" size={12} color={palette.success} />
                        <ThemedText style={[styles.metaText, { color: palette.success }]}>
                          View session
                        </ThemedText>
                        <Ionicons name="chevron-forward" size={12} color={palette.success} />
                      </View>
                    ) : null}
                    {award.shared ? (
                      <View style={[styles.metaPill, { backgroundColor: withAlpha(palette.icon, 0.06) }]}>
                        <Ionicons name="send" size={12} color={palette.icon} />
                        <ThemedText style={[styles.metaText, { color: palette.icon }]}>Shared</ThemedText>
                      </View>
                    ) : null}
                  </View>
                </SurfaceCard>
              </Clickable>
            ))}
          </View>
        )}
      </SurfaceCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  // Level Card
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
    borderRadius: Radii['2xl'],
    backgroundColor: '#0F172A12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  levelName: {
    ...Typography.heading,
  },
  levelPoints: {
    ...Typography.bodySmall,
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
    ...Typography.small,
  },
  progressValue: {
    ...Typography.smallSemiBold,
  },
  progressBar: {
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  statItem: {
    flex: 1,
    gap: Spacing.xxs,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.heading,
  },
  statLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#00000010',
  },
  toneBadge: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category Breakdown
  categoryScroll: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryCard: {
    width: 140,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    ...Typography.bodySmall,
  },
  categoryCount: {
    ...Typography.caption,
  },
  milestoneProgress: {
    gap: Spacing.xxs,
  },
  milestoneText: {
    ...Typography.micro,
  },
  miniProgressBar: {
    height: 4,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  milestoneBadgeText: {
    ...Typography.micro,
  },

  // Progress Card
  progressCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  allBadgesIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    backgroundColor: '#0F172A12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressHint: {
    ...Typography.small,
  },
  progressActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs + Spacing.xxs,
  },
  primaryButtonText: {
    color: Colors.light.onPrimary,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    paddingVertical: Spacing.xs + Spacing.xxs,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: '700',
  },

  // Section Card
  sectionCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHint: {
    ...Typography.caption,
  },

  // Share Row
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  shareLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  badgeIcon: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconSmall: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  tierPill: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  tierText: {
    ...Typography.micro,
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
  pillButton: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  pillButtonText: {
    ...Typography.smallSemiBold,
  },

  // Timeline
  emptyTimeline: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  timelineItem: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  timelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
  },
  timelineRight: {
    alignItems: 'flex-end',
    gap: Spacing.micro,
  },
  pointsValue: {
    ...Typography.bodySmallSemiBold,
  },
  timelineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  metaText: {
    ...Typography.caption,
  },
});
