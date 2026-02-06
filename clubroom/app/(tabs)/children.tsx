import { useCallback, useState } from 'react';
import { View, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getSessionsForAthlete } from '@/constants/mock-data';
import { badgeService } from '@/services/badge-service';
import { childService, type ChildProfile } from '@/services/child-service';
import type { BadgeAward } from '@/constants/types';

type HubSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  stat?: string | number;
  color?: string;
  unseenCount?: number;
};

type ChildStats = {
  sessions: number;
  badges: number;
  avgRating: number;
  unseenBadges: number;
};

export default function ChildrenHubScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [childStats, setChildStats] = useState<Record<string, ChildStats>>({});
  const [recentBadges, setRecentBadges] = useState<BadgeAward[]>([]);
  const [, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);

    const childrenData = await childService.getChildren(currentUser.id);
    setChildren(childrenData);

    // Load stats for each child
    const stats: Record<string, ChildStats> = {};
    const allRecentBadges: BadgeAward[] = [];

    for (const child of childrenData) {
      const sessions = getSessionsForAthlete(child.id);
      const awards = await badgeService.listAwardsForAthlete(child.id);
      const unseenCount = await badgeService.getUnseenBadgeCount(child.id);
      const avgRating = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length
        : 0;

      // Get visible badges
      const visibleAwards = awards.filter(a => a.visibility !== 'coach_only');

      stats[child.id] = {
        sessions: sessions.length,
        badges: visibleAwards.length,
        avgRating,
        unseenBadges: unseenCount,
      };

      // Collect recent badges (last 7 days) for all children
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentAwards = visibleAwards.filter(
        a => new Date(a.awardedAt).getTime() > weekAgo
      );
      allRecentBadges.push(...recentAwards);
    }

    // Sort by date and take top 5
    allRecentBadges.sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());
    setRecentBadges(allRecentBadges.slice(0, 5));

    setChildStats(stats);
    setLoading(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Handle marking badge as seen when viewing
  const handleViewBadge = async (badge: BadgeAward) => {
    if (!badge.seenByParent) {
      await badgeService.markSeenByParent(badge.id);
      loadData(); // Refresh to update counts
    }
    // Navigate to child's badge detail
    router.push(Routes.childBadges(badge.athleteId));
  };

  // Calculate aggregate stats
  const totalSessions = Object.values(childStats).reduce((sum, s) => sum + s.sessions, 0);
  const totalBadges = Object.values(childStats).reduce((sum, s) => sum + s.badges, 0);
  const totalUnseenBadges = Object.values(childStats).reduce((sum, s) => sum + s.unseenBadges, 0);

  // Navigate to first child's progress, or show list if multiple
  const progressRoute = children.length === 1
    ? `/development/child-progress/${children[0].id}`
    : '/(tabs)/children';

  const hubSections: HubSection[] = [
    {
      id: 'progress',
      title: 'Progress',
      subtitle: 'View skill ratings and feedback',
      icon: 'trending-up-outline',
      route: progressRoute,
      stat: `${totalSessions} sessions`,
      color: palette.tint,
    },
    {
      id: 'badges',
      title: 'Badges',
      subtitle: 'Achievements and milestones',
      icon: 'ribbon-outline',
      route: '/badges',
      stat: `${totalBadges} earned`,
      color: Colors.light.warning,
      unseenCount: totalUnseenBadges,
    },
    {
      id: 'goals',
      title: 'Goals',
      subtitle: 'Current objectives and targets',
      icon: 'flag-outline',
      route: '/bookings/objectives',
      stat: 'Active',
      color: palette.success,
    },
  ];

  // Quick stats for the header area
  const quickStats = [
    { label: 'Children', value: children.length },
    { label: 'Sessions', value: totalSessions },
    { label: 'New Badges', value: totalUnseenBadges, highlight: totalUnseenBadges > 0 },
  ];

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  if (!currentUser) return null;

  return (
    <PageContainer
      header={
        <ScreenHeader
          title="My Children"
          subtitle="Manage your family"
          action={{
            icon: 'add',
            onPress: () => router.push(Routes.MODAL_ADD_CHILD),
          }}
        />
      }
      gap={Spacing.md}
    >
      {/* Quick Stats Row */}
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <View style={styles.statsRow}>
          {quickStats.map((stat) => (
            <SurfaceCard
              key={stat.label}
              style={[
                styles.statCard,
                { borderColor: stat.highlight ? palette.warning : palette.border },
                stat.highlight && { backgroundColor: withAlpha(palette.warning, 0.06) },
              ]}
            >
              <ThemedText type="heading" style={[styles.statValue, stat.highlight && { color: palette.warning }]}>
                {stat.value}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: stat.highlight ? palette.warning : palette.muted }]}>
                {stat.label}
              </ThemedText>
            </SurfaceCard>
          ))}
        </View>
      </Animated.View>

      {/* Recent Badges Section */}
      {recentBadges.length > 0 && (
        <Animated.View entering={FadeInDown.delay(75).springify()}>
          <SurfaceCard style={styles.recentBadgesCard}>
            <View style={styles.recentBadgesHeader}>
              <View style={styles.recentBadgesTitleRow}>
                <Ionicons name="ribbon" size={18} color={palette.warning} />
                <ThemedText type="defaultSemiBold">Recent Badges</ThemedText>
              </View>
              <ThemedText style={[styles.recentBadgesHint, { color: palette.muted }]}>
                Tap to view details
              </ThemedText>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
              {recentBadges.map((badge) => (
                <Clickable key={badge.id} onPress={() => handleViewBadge(badge)}>
                  <View style={[
                    styles.badgeCard,
                    { borderColor: badge.seenByParent ? palette.border : palette.warning },
                    !badge.seenByParent && { backgroundColor: withAlpha(palette.warning, 0.03) },
                  ]}>
                    {!badge.seenByParent && (
                      <View style={styles.newBadgeIndicator}>
                        <ThemedText style={styles.newBadgeText}>NEW</ThemedText>
                      </View>
                    )}
                    <View style={[styles.badgeIconCircle, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                      <Ionicons name="ribbon" size={20} color={palette.warning} />
                    </View>
                    <ThemedText type="defaultSemiBold" style={styles.badgeLabel} numberOfLines={1}>
                      {badge.badgeLabel}
                    </ThemedText>
                    <ThemedText style={[styles.badgeAthlete, { color: palette.muted }]} numberOfLines={1}>
                      {badge.athleteName}
                    </ThemedText>
                    <View style={styles.badgeCoachRow}>
                      <Ionicons name="person" size={10} color={palette.icon} />
                      <ThemedText style={[styles.badgeCoach, { color: palette.muted }]} numberOfLines={1}>
                        Coach {badge.coachName?.split(' ')[0]}
                      </ThemedText>
                    </View>
                  </View>
                </Clickable>
              ))}
            </ScrollView>
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Children Cards */}
      {children.length > 0 ? (
        <View style={styles.childrenContainer}>
          <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
            My Children
          </ThemedText>
          <View style={styles.childrenGrid}>
            {children.map((child, index) => {
              const stats = childStats[child.id] || { sessions: 0, badges: 0, avgRating: 0, unseenBadges: 0 };
              const fullName = `${child.firstName} ${child.lastName}`;
              const age = child.dateOfBirth ? childService.getAge(child.dateOfBirth) : null;
              return (
                <Animated.View
                  key={child.id}
                  entering={FadeInDown.delay(100 + index * 50).springify()}
                >
                  <SurfaceCard style={styles.childCard}>
                    <View style={styles.childHeader}>
                      <View style={[styles.childAvatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                        <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                          {getInitials(fullName)}
                        </ThemedText>
                        {child.hasSpecialNeeds && (
                          <View style={[styles.specialNeedsBadge, { backgroundColor: palette.warning }]}>
                            <Ionicons name="heart" size={10} color={palette.onPrimary} />
                          </View>
                        )}
                      </View>
                      <View style={styles.childInfo}>
                        <View style={styles.childNameRow}>
                          <ThemedText type="defaultSemiBold" style={styles.childName}>
                            {child.nickname || child.firstName}
                          </ThemedText>
                          {age !== null && (
                            <ThemedText style={[styles.agePill, { color: palette.muted }]}>
                              {age} yrs
                            </ThemedText>
                          )}
                        </View>
                        <ThemedText style={[styles.childMeta, { color: palette.muted }]}>
                          {fullName}
                        </ThemedText>
                      </View>
                      <Clickable
                        onPress={() => router.push(Routes.developmentChildProgress(child.id))}
                      >
                        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                      </Clickable>
                    </View>

                    {/* Special Needs & Notes Summary */}
                    {(child.hasSpecialNeeds || child.allergies.length > 0 || child.communicationNotes) && (
                      <View style={[styles.notesSection, { borderTopColor: palette.border }]}>
                        {child.hasSpecialNeeds && child.disabilities.length > 0 && (
                          <View style={[styles.noteRow, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
                            <Ionicons name="alert-circle" size={14} color={palette.warning} />
                            <ThemedText style={styles.noteText} numberOfLines={1}>
                              {child.disabilities.map(d => d.type).join(', ')}
                            </ThemedText>
                          </View>
                        )}
                        {child.allergies.length > 0 && (
                          <View style={[styles.noteRow, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
                            <Ionicons name="medical" size={14} color={palette.error} />
                            <ThemedText style={styles.noteText} numberOfLines={1}>
                              Allergies: {child.allergies.join(', ')}
                            </ThemedText>
                          </View>
                        )}
                        {child.communicationNotes && (
                          <View style={[styles.noteRow, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                            <Ionicons name="chatbubble" size={14} color={palette.tint} />
                            <ThemedText style={styles.noteText} numberOfLines={2}>
                              {child.communicationNotes}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={[styles.childStats, { borderTopColor: palette.border }]}>
                      <View style={styles.childStat}>
                        <Ionicons name="calendar" size={14} color={palette.tint} />
                        <ThemedText style={[styles.childStatText, { color: palette.muted }]}>
                          {stats.sessions} sessions
                        </ThemedText>
                      </View>
                      <Clickable
                        onPress={() => router.push(Routes.childBadges(child.id))}
                      >
                        <View style={[
                          styles.childStat,
                          stats.unseenBadges > 0 && styles.childStatHighlight,
                          stats.unseenBadges > 0 && { backgroundColor: withAlpha(palette.warning, 0.09) },
                        ]}>
                          <Ionicons name="ribbon" size={14} color={palette.warning} />
                          <ThemedText style={[styles.childStatText, { color: stats.unseenBadges > 0 ? palette.warning : palette.muted }]}>
                            {stats.badges} badges
                          </ThemedText>
                        </View>
                      </Clickable>
                      {stats.avgRating > 0 && (
                        <View style={styles.childStat}>
                          <Ionicons name="star" size={14} color={palette.warning} />
                          <ThemedText style={[styles.childStatText, { color: palette.muted }]}>
                            {stats.avgRating.toFixed(1)} avg
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </SurfaceCard>
                </Animated.View>
              );
            })}
          </View>
        </View>
      ) : (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <EmptyState
            icon="people-outline"
            title="No Children Added"
            message="Add children to your account to track their development and progress"
            actionLabel="Add Child"
            onPressAction={() => router.push(Routes.MODAL_ADD_CHILD)}
          />
        </Animated.View>
      )}

      {/* Hub Sections */}
      <View style={styles.sectionsContainer}>
        <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
          Quick Access
        </ThemedText>
        {hubSections.map((section, index) => (
          <Animated.View
            key={section.id}
            entering={FadeInDown.delay(200 + index * 50).springify()}
          >
            <Clickable onPress={() => router.push(section.route as Href)}>
              <SurfaceCard style={[
                styles.sectionCard,
                section.unseenCount && section.unseenCount > 0 && { borderColor: section.color, borderWidth: 1 },
              ].filter(Boolean) as ViewStyle[]}>
                <View style={styles.sectionRow}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: withAlpha(section.color || palette.tint, 0.09) },
                    ]}
                  >
                    <Ionicons
                      name={section.icon}
                      size={24}
                      color={section.color || palette.tint}
                    />
                    {section.unseenCount && section.unseenCount > 0 && (
                      <View style={[styles.iconBadge, { backgroundColor: section.color }]}>
                        <ThemedText style={styles.iconBadgeText}>
                          {section.unseenCount > 9 ? '9+' : section.unseenCount}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <View style={styles.sectionContent}>
                    <View style={styles.sectionTitleRow}>
                      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                        {section.title}
                      </ThemedText>
                      {section.unseenCount && section.unseenCount > 0 ? (
                        <View style={[styles.newChip, { backgroundColor: section.color }]}>
                          <ThemedText style={styles.newChipText}>
                            {section.unseenCount} new
                          </ThemedText>
                        </View>
                      ) : section.stat ? (
                        <Chip dense>{section.stat}</Chip>
                      ) : null}
                    </View>
                    <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                      {section.subtitle}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                </View>
              </SurfaceCard>
            </Clickable>
          </Animated.View>
        ))}
      </View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <View style={styles.quickActions}>
          <Clickable
            style={[styles.actionButton, { backgroundColor: palette.tint }]}
            onPress={() => router.push(Routes.MORE)}
          >
            <Ionicons name="search-outline" size={20} color={palette.onPrimary} />
            <ThemedText style={styles.actionButtonText}>Find Coaches</ThemedText>
          </Clickable>
          <Clickable
            style={[styles.actionButtonSecondary, { borderColor: palette.border }]}
            onPress={() => router.push(Routes.BOOKINGS)}
          >
            <Ionicons name="calendar-outline" size={20} color={palette.tint} />
            <ThemedText style={[styles.actionButtonTextSecondary, { color: palette.tint }]}>
              View Bookings
            </ThemedText>
          </Clickable>
        </View>
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  statValue: {
    ...Typography.display,
  },
  statLabel: {
    ...Typography.caption,
  },
  sectionLabel: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
  },
  childrenContainer: {
    gap: Spacing.xs,
  },
  childrenGrid: {
    gap: Spacing.sm,
  },
  childCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.heading,
  },
  childInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  childName: {
    ...Typography.subheading,
  },
  childMeta: {
    ...Typography.small,
  },
  childStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  childStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  childStatText: {
    ...Typography.caption,
  },
  sectionsContainer: {
    gap: Spacing.xs,
  },
  sectionCard: {
    padding: Spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...Typography.subheading,
  },
  sectionSubtitle: {
    ...Typography.small,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  actionButtonText: {
    color: Colors.light.onPrimary,
    ...Typography.bodySemiBold,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
  actionButtonTextSecondary: {
    ...Typography.bodySemiBold,
  },
  // Recent badges section
  recentBadgesCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  recentBadgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentBadgesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  recentBadgesHint: {
    ...Typography.caption,
  },
  badgeScroll: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  badgeCard: {
    width: 120,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    position: 'relative',
  },
  newBadgeIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.light.warning,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  newBadgeText: {
    color: Colors.light.onPrimary,
    ...Typography.micro,
    fontSize: 9,
  },
  badgeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    ...Typography.caption,
    textAlign: 'center',
  },
  badgeAthlete: {
    ...Typography.caption,
    textAlign: 'center',
  },
  badgeCoachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
  },
  badgeCoach: {
    ...Typography.micro,
  },
  // Child card enhancements
  childNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  newPill: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  newPillText: {
    color: Colors.light.onPrimary,
    ...Typography.micro,
  },
  unseenBadgeIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.light.warning,
    minWidth: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  unseenBadgeCount: {
    color: Colors.light.onPrimary,
    ...Typography.micro,
  },
  childStatHighlight: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  // Hub section badges
  iconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  iconBadgeText: {
    color: Colors.light.onPrimary,
    ...Typography.micro,
  },
  newChip: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.rounded,
  },
  newChipText: {
    color: Colors.light.onPrimary,
    ...Typography.caption,
  },
  // Special needs & notes
  specialNeedsBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agePill: {
    ...Typography.caption,
  },
  notesSection: {
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: Radii.sm,
  },
  noteText: {
    flex: 1,
    ...Typography.caption,
  },
});
