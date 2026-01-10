import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getChildrenForParent, getSessionsForAthlete } from '@/constants/mock-data';
import { badgeService } from '@/services/badge-service';
import type { User, BadgeAward } from '@/constants/types';

type HubSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  stat?: string | number;
  color?: string;
};

export default function ChildrenHubScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [children, setChildren] = useState<User[]>([]);
  const [childStats, setChildStats] = useState<Record<string, { sessions: number; badges: number; avgRating: number }>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);

    const childrenData = getChildrenForParent(currentUser.id);
    setChildren(childrenData);

    // Load stats for each child
    const stats: Record<string, { sessions: number; badges: number; avgRating: number }> = {};
    for (const child of childrenData) {
      const sessions = getSessionsForAthlete(child.id);
      const awards = await badgeService.listAwardsForAthlete(child.id);
      const avgRating = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length
        : 0;

      stats[child.id] = {
        sessions: sessions.length,
        badges: awards.filter(a => a.visibility !== 'coach_only').length,
        avgRating,
      };
    }
    setChildStats(stats);
    setLoading(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Calculate aggregate stats
  const totalSessions = Object.values(childStats).reduce((sum, s) => sum + s.sessions, 0);
  const totalBadges = Object.values(childStats).reduce((sum, s) => sum + s.badges, 0);

  const hubSections: HubSection[] = [
    {
      id: 'progress',
      title: 'Progress',
      subtitle: 'Track skills and development',
      icon: 'trending-up-outline',
      route: '/(tabs)/more',
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
      color: '#F59E0B',
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
    { label: 'Badges', value: totalBadges },
  ];

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  if (!currentUser) return null;

  return (
    <PageContainer
      header={<PageHeader title="Children" subtitle="Track your children's progress and goals" />}
      gap={Spacing.md}
    >
      {/* Quick Stats Row */}
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <View style={styles.statsRow}>
          {quickStats.map((stat) => (
            <SurfaceCard
              key={stat.label}
              style={[styles.statCard, { borderColor: palette.border }]}
            >
              <ThemedText type="heading" style={styles.statValue}>
                {stat.value}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                {stat.label}
              </ThemedText>
            </SurfaceCard>
          ))}
        </View>
      </Animated.View>

      {/* Children Cards */}
      {children.length > 0 ? (
        <View style={styles.childrenContainer}>
          <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
            Select Child
          </ThemedText>
          <View style={styles.childrenGrid}>
            {children.map((child, index) => {
              const stats = childStats[child.id] || { sessions: 0, badges: 0, avgRating: 0 };
              return (
                <Animated.View
                  key={child.id}
                  entering={FadeInDown.delay(100 + index * 50).springify()}
                >
                  <Clickable
                    onPress={() => router.push({
                      pathname: '/development/athlete/[athleteId]',
                      params: { athleteId: child.id },
                    })}
                  >
                    <SurfaceCard style={styles.childCard}>
                      <View style={styles.childHeader}>
                        <View style={[styles.childAvatar, { backgroundColor: `${palette.tint}10` }]}>
                          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                            {getInitials(child.name || child.username)}
                          </ThemedText>
                        </View>
                        <View style={styles.childInfo}>
                          <ThemedText type="defaultSemiBold" style={styles.childName}>
                            {child.name || child.username}
                          </ThemedText>
                          <ThemedText style={[styles.childMeta, { color: palette.muted }]}>
                            {stats.sessions} sessions
                          </ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                      </View>

                      <View style={[styles.childStats, { borderTopColor: palette.border }]}>
                        <View style={styles.childStat}>
                          <Ionicons name="calendar" size={14} color={palette.tint} />
                          <ThemedText style={[styles.childStatText, { color: palette.muted }]}>
                            {stats.sessions} sessions
                          </ThemedText>
                        </View>
                        <View style={styles.childStat}>
                          <Ionicons name="ribbon" size={14} color="#F59E0B" />
                          <ThemedText style={[styles.childStatText, { color: palette.muted }]}>
                            {stats.badges} badges
                          </ThemedText>
                        </View>
                        {stats.avgRating > 0 && (
                          <View style={styles.childStat}>
                            <Ionicons name="star" size={14} color="#F59E0B" />
                            <ThemedText style={[styles.childStatText, { color: palette.muted }]}>
                              {stats.avgRating.toFixed(1)} avg
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </SurfaceCard>
                  </Clickable>
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
            <Clickable onPress={() => router.push(section.route as any)}>
              <SurfaceCard style={styles.sectionCard}>
                <View style={styles.sectionRow}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: `${section.color || palette.tint}15` },
                    ]}
                  >
                    <Ionicons
                      name={section.icon}
                      size={24}
                      color={section.color || palette.tint}
                    />
                  </View>
                  <View style={styles.sectionContent}>
                    <View style={styles.sectionTitleRow}>
                      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                        {section.title}
                      </ThemedText>
                      {section.stat && (
                        <Chip dense>{section.stat}</Chip>
                      )}
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
            onPress={() => router.push('/(tabs)/more')}
          >
            <Ionicons name="search-outline" size={20} color="#FFFFFF" />
            <ThemedText style={styles.actionButtonText}>Find Coaches</ThemedText>
          </Clickable>
          <Clickable
            style={[styles.actionButtonSecondary, { borderColor: palette.border }]}
            onPress={() => router.push('/(tabs)/bookings')}
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
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
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
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  childInfo: {
    flex: 1,
    gap: 2,
  },
  childName: {
    fontSize: 16,
  },
  childMeta: {
    fontSize: 13,
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
    gap: 4,
  },
  childStatText: {
    fontSize: 12,
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
    gap: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
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
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
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
    fontWeight: '700',
    fontSize: 15,
  },
});
