import { useCallback, useState } from 'react';
import { View, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { FamilyMemberCard } from '@/components/family/FamilyMemberCard';
import { UpcomingSessionsList } from '@/components/family/UpcomingSessionsList';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  familyService,
  FamilyMember,
  FamilyCalendarEvent,
  FamilyOverview,
} from '@/services/family-service';

/**
 * Family Dashboard - Main overview screen for parents
 * Shows all children, upcoming sessions, and quick access to calendar and spending
 */
export default function FamilyDashboardScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<FamilyCalendarEvent[]>([]);
  const [overview, setOverview] = useState<FamilyOverview | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const [membersData, sessionsData, overviewData] = await Promise.all([
        familyService.getFamilyMembers(currentUser.id),
        familyService.getUpcomingForFamily(currentUser.id, 5),
        familyService.getFamilyOverview(currentUser.id),
      ]);

      setMembers(membersData);
      setUpcomingSessions(sessionsData);
      setOverview(overviewData);
    } catch (error) {
      console.error('Failed to load family data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMemberPress = (member: FamilyMember) => {
    router.push({
      pathname: '/development/child-progress/[childId]',
      params: { childId: member.id },
    });
  };

  const handleSessionPress = (session: FamilyCalendarEvent) => {
    router.push({
      pathname: '/(tabs)/bookings/[id]',
      params: { id: session.id },
    });
  };

  const navigateToCalendar = () => {
    router.push('/family/calendar');
  };

  const navigateToSpending = () => {
    router.push('/family/spending');
  };

  if (loading) {
    return (
      <PageContainer
        header={<PageHeader title="Family Dashboard" subtitle="Manage your children's sessions" />}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading family data...
          </ThemedText>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={
        <PageHeader
          title="Family Dashboard"
          subtitle="Manage your children's sessions"
        />
      }
      gap={Spacing.md}
    >
      {/* Overview Stats */}
      {overview && (
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <View style={styles.statsRow}>
            <SurfaceCard style={styles.statCard}>
              <ThemedText style={styles.statValue}>{overview.totalChildren}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Children
              </ThemedText>
            </SurfaceCard>
            <SurfaceCard style={styles.statCard}>
              <ThemedText style={styles.statValue}>{overview.upcomingSessions}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Upcoming
              </ThemedText>
            </SurfaceCard>
            <SurfaceCard style={styles.statCard}>
              <ThemedText style={styles.statValue}>
                {'\u00A3'}{overview.spendingThisMonth.toFixed(0)}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                This Month
              </ThemedText>
            </SurfaceCard>
          </View>
        </Animated.View>
      )}

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <View style={styles.quickActions}>
          <Clickable
            onPress={navigateToCalendar}
            style={[styles.quickActionCard, { backgroundColor: `${palette.tint}10` }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: palette.tint }]}>
              <Ionicons name="calendar" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.quickActionText}>
              <ThemedText type="defaultSemiBold">Family Calendar</ThemedText>
              <ThemedText style={[styles.quickActionSubtext, { color: palette.muted }]}>
                All sessions in one view
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Clickable>

          <Clickable
            onPress={navigateToSpending}
            style={[styles.quickActionCard, { backgroundColor: `${palette.success}10` }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: palette.success }]}>
              <Ionicons name="wallet" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.quickActionText}>
              <ThemedText type="defaultSemiBold">Spending Overview</ThemedText>
              <ThemedText style={[styles.quickActionSubtext, { color: palette.muted }]}>
                Track costs by child
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Clickable>
        </View>
      </Animated.View>

      {/* Children Section */}
      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Your Children
            </ThemedText>
            <ThemedText style={[styles.sectionCount, { color: palette.muted }]}>
              {members.length} {members.length === 1 ? 'child' : 'children'}
            </ThemedText>
          </View>

          {members.length > 0 ? (
            <View style={styles.membersList}>
              {members.map((member, index) => (
                <Animated.View
                  key={member.id}
                  entering={FadeInDown.delay(200 + index * 50).springify()}
                >
                  <FamilyMemberCard
                    member={member}
                    onPress={handleMemberPress}
                    showStats={true}
                  />
                </Animated.View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="people-outline"
              title="No Children Added"
              message="Add children to your account to track their development"
            />
          )}
        </View>
      </Animated.View>

      {/* Upcoming Sessions */}
      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <View style={styles.section}>
          <UpcomingSessionsList
            sessions={upcomingSessions}
            onSessionPress={handleSessionPress}
            onViewAllPress={navigateToCalendar}
            limit={3}
            showHeader={true}
          />
        </View>
      </Animated.View>

      {/* Next Session Highlight */}
      {overview?.nextSession && (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Clickable onPress={() => handleSessionPress(overview.nextSession!)}>
            <SurfaceCard
              style={[
                styles.nextSessionCard,
                { borderColor: overview.nextSession.colorCode, borderWidth: 2 },
              ]}
            >
              <View style={styles.nextSessionHeader}>
                <View
                  style={[
                    styles.nextSessionBadge,
                    { backgroundColor: `${overview.nextSession.colorCode}15` },
                  ]}
                >
                  <Ionicons
                    name="time"
                    size={16}
                    color={overview.nextSession.colorCode}
                  />
                  <ThemedText
                    style={[
                      styles.nextSessionBadgeText,
                      { color: overview.nextSession.colorCode },
                    ]}
                  >
                    Next Up
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="defaultSemiBold" style={styles.nextSessionTitle}>
                {overview.nextSession.title}
              </ThemedText>
              <View style={styles.nextSessionMeta}>
                <View style={styles.nextSessionMetaItem}>
                  <Ionicons name="person" size={14} color={palette.muted} />
                  <ThemedText style={[styles.nextSessionMetaText, { color: palette.muted }]}>
                    {overview.nextSession.childName}
                  </ThemedText>
                </View>
                <View style={styles.nextSessionMetaItem}>
                  <Ionicons name="calendar" size={14} color={palette.muted} />
                  <ThemedText style={[styles.nextSessionMetaText, { color: palette.muted }]}>
                    {new Date(overview.nextSession.start).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </ThemedText>
                </View>
                <View style={styles.nextSessionMetaItem}>
                  <Ionicons name="time" size={14} color={palette.muted} />
                  <ThemedText style={[styles.nextSessionMetaText, { color: palette.muted }]}>
                    {new Date(overview.nextSession.start).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </ThemedText>
                </View>
              </View>
            </SurfaceCard>
          </Clickable>
        </Animated.View>
      )}

      {/* Book Session CTA */}
      <Animated.View entering={FadeInDown.delay(350).springify()}>
        <Clickable
          onPress={() => router.push('/(tabs)/more')}
          style={[styles.ctaButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <ThemedText style={styles.ctaButtonText}>Book New Session</ThemedText>
        </Clickable>
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickActions: {
    gap: Spacing.sm,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    gap: Spacing.md,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    flex: 1,
    gap: 2,
  },
  quickActionSubtext: {
    fontSize: 13,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
  },
  sectionCount: {
    fontSize: 13,
  },
  membersList: {
    gap: Spacing.sm,
  },
  nextSessionCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  nextSessionHeader: {
    flexDirection: 'row',
  },
  nextSessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  nextSessionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nextSessionTitle: {
    fontSize: 16,
  },
  nextSessionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  nextSessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextSessionMetaText: {
    fontSize: 13,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
