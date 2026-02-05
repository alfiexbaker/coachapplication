import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Components } from '@/constants/theme';
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
      router.push({
        pathname: '/development/athlete-session/[sessionId]',
        params: { sessionId: award.sessionId },
      });
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
              <View style={[styles.toneBadge, { backgroundColor: `${palette.tint}12` }]}>
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
                    backgroundColor: cat.badgeCount > 0 ? `${palette.tint}08` : palette.surface,
                    borderColor: cat.badgeCount > 0 ? palette.tint : palette.border,
                  },
                ]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${palette.tint}15` }]}>
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
                    <View style={[styles.miniProgressBar, { backgroundColor: `${palette.tint}15` }]}>
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
                  <View style={[styles.milestoneBadge, { backgroundColor: `${palette.success}15` }]}>
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
          onPress={() => router.push('/badges')}
          style={[styles.primaryButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="grid-outline" size={18} color="#FFFFFF" />
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
            onPress={() => router.push('/(tabs)/bookings')}
            style={[styles.primaryButton, { backgroundColor: palette.tint }]}
          >
            <ThemedText style={styles.primaryButtonText}>View bookings</ThemedText>
          </Clickable>
          <Clickable
            onPress={() => router.push('/book-coach')}
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
                  <View style={[styles.badgeIcon, { backgroundColor: `${getTierColor(award.badgeTier)}20` }]}>
                    <Ionicons name="ribbon" size={16} color={getTierColor(award.badgeTier)} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.badgeTitleRow}>
                      <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                      {award.badgeTier && (
                        <View style={[styles.tierPill, { backgroundColor: `${getTierColor(award.badgeTier)}20` }]}>
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
                    award.sessionId ? { borderColor: `${palette.tint}30` } : undefined,
                  ]}
                >
                  <View style={styles.timelineHeader}>
                    <View style={styles.timelineTitleRow}>
                      <View style={[styles.badgeIconSmall, { backgroundColor: `${getTierColor(award.badgeTier)}20` }]}>
                        <Ionicons name="ribbon" size={14} color={getTierColor(award.badgeTier)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.badgeTitleRow}>
                          <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                          {award.badgeTier && (
                            <View style={[styles.tierPillSmall, { backgroundColor: `${getTierColor(award.badgeTier)}20` }]}>
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
                    <View style={[styles.metaPill, { backgroundColor: `${palette.tint}12` }]}>
                      <Ionicons name="person" size={12} color={palette.tint} />
                      <ThemedText style={[styles.metaText, { color: palette.tint }]}>
                        {award.coachName}
                      </ThemedText>
                    </View>
                    {award.sessionId ? (
                      <View style={[styles.metaPill, { backgroundColor: `${palette.success}12` }]}>
                        <Ionicons name="link" size={12} color={palette.success} />
                        <ThemedText style={[styles.metaText, { color: palette.success }]}>
                          View session
                        </ThemedText>
                        <Ionicons name="chevron-forward" size={12} color={palette.success} />
                      </View>
                    ) : null}
                    {award.shared ? (
                      <View style={[styles.metaPill, { backgroundColor: `${palette.icon}10` }]}>
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
    borderRadius: 28,
    backgroundColor: '#0F172A12',
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  statItem: {
    flex: 1,
    gap: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 11,
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
    borderRadius: 14,
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 14,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  milestoneProgress: {
    gap: 4,
  },
  milestoneText: {
    fontSize: 10,
  },
  miniProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  milestoneBadgeText: {
    fontSize: 10,
    fontWeight: '600',
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
    borderRadius: 22,
    backgroundColor: '#0F172A12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressHint: {
    fontSize: 13,
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
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    paddingVertical: 12,
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
    fontSize: 12,
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
    borderRadius: 14,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tierPillSmall: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tierTextSmall: {
    fontSize: 9,
    fontWeight: '700',
  },
  categoryTag: {
    fontSize: 11,
  },
  pillButton: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  pillButtonText: {
    fontWeight: '700',
    fontSize: 13,
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
    gap: 2,
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: '700',
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
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
