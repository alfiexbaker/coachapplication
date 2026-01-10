import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { rosterService } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';

type HubSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  stat?: string | number;
  color?: string;
};

export default function AthletesHubScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const data = await rosterService.getRoster(currentUser.id);
      setRoster(data);
    } catch (error) {
      console.error('Failed to load roster:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Calculate stats
  const activeAthletes = roster.filter(r => r.status === 'ACTIVE').length;
  const totalSessions = roster.reduce((sum, r) => sum + r.totalSessions, 0);
  const avgRating = roster.length > 0
    ? (roster.reduce((sum, r) => sum + r.averageRating, 0) / roster.length).toFixed(1)
    : '0.0';

  const hubSections: HubSection[] = [
    {
      id: 'roster',
      title: 'Roster',
      subtitle: 'View and manage your athletes',
      icon: 'people-outline',
      route: '/(tabs)/roster',
      stat: `${activeAthletes} active`,
      color: palette.tint,
    },
    {
      id: 'development',
      title: 'Development',
      subtitle: 'Track progress and goals',
      icon: 'trending-up-outline',
      route: '/development/athlete-session/overview',
      stat: `${totalSessions} sessions`,
      color: palette.success,
    },
    {
      id: 'analytics',
      title: 'Analytics',
      subtitle: 'Performance insights',
      icon: 'stats-chart-outline',
      route: '/(tabs)/more',
      stat: `${avgRating} avg`,
      color: palette.accent,
    },
  ];

  // Quick stats for the header area
  const quickStats = [
    { label: 'Active', value: activeAthletes },
    { label: 'Sessions', value: totalSessions },
    { label: 'Avg Rating', value: avgRating },
  ];

  // Get recent athletes for preview
  const recentAthletes = roster
    .filter(r => r.status === 'ACTIVE')
    .sort((a, b) => {
      if (!a.lastSessionDate) return 1;
      if (!b.lastSessionDate) return -1;
      return new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime();
    })
    .slice(0, 4);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <PageContainer
      header={<PageHeader title="Athletes" subtitle="Manage your roster and track development" />}
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

      {/* Hub Sections */}
      <View style={styles.sectionsContainer}>
        {hubSections.map((section, index) => (
          <Animated.View
            key={section.id}
            entering={FadeInDown.delay(100 + index * 50).springify()}
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

      {/* Recent Athletes Preview */}
      {recentAthletes.length > 0 && (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <SurfaceCard style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <ThemedText type="defaultSemiBold">Recent Athletes</ThemedText>
              <Clickable onPress={() => router.push('/(tabs)/roster')}>
                <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                  View All
                </ThemedText>
              </Clickable>
            </View>
            <View style={styles.athleteGrid}>
              {recentAthletes.map((athlete) => (
                <Clickable
                  key={athlete.id}
                  onPress={() =>
                    router.push({
                      pathname: '/roster/[athleteId]',
                      params: { athleteId: athlete.athleteId },
                    })
                  }
                >
                  <View style={styles.athleteCard}>
                    <View style={[styles.athleteAvatar, { backgroundColor: `${palette.tint}10` }]}>
                      {athlete.athletePhotoUrl ? (
                        <Image
                          source={{ uri: athlete.athletePhotoUrl }}
                          style={styles.athletePhoto}
                        />
                      ) : (
                        <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                          {getInitials(athlete.athleteName)}
                        </ThemedText>
                      )}
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: rosterService.getStatusColor(athlete.status) },
                        ]}
                      />
                    </View>
                    <ThemedText
                      style={styles.athleteName}
                      numberOfLines={1}
                    >
                      {athlete.athleteName.split(' ')[0]}
                    </ThemedText>
                    <ThemedText style={[styles.athleteMeta, { color: palette.muted }]}>
                      {athlete.totalSessions} sessions
                    </ThemedText>
                  </View>
                </Clickable>
              ))}
            </View>
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(350).springify()}>
        <View style={styles.quickActions}>
          <Clickable
            style={[styles.actionButton, { backgroundColor: palette.tint }]}
            onPress={() => router.push('/(tabs)/roster')}
          >
            <Ionicons name="people-outline" size={20} color="#FFFFFF" />
            <ThemedText style={styles.actionButtonText}>View Roster</ThemedText>
          </Clickable>
          <Clickable
            style={[styles.actionButtonSecondary, { borderColor: palette.border }]}
            onPress={() => router.push('/(tabs)/more')}
          >
            <Ionicons name="stats-chart-outline" size={20} color={palette.tint} />
            <ThemedText style={[styles.actionButtonTextSecondary, { color: palette.tint }]}>
              View Analytics
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
  sectionsContainer: {
    gap: Spacing.sm,
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
  previewCard: {
    gap: Spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  athleteGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  athleteCard: {
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
  },
  athleteAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  athletePhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  athleteName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  athleteMeta: {
    fontSize: 11,
    textAlign: 'center',
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
