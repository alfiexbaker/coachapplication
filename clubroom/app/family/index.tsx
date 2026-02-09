/**
 * Family Dashboard Screen
 *
 * Main overview for parents: children, upcoming sessions,
 * quick access to calendar and spending.
 */

import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { FamilyMemberCard } from '@/components/family/FamilyMemberCard';
import { UpcomingSessionsList } from '@/components/family/UpcomingSessionsList';
import { FamilyQuickActions } from '@/components/family/family-quick-actions';
import { NextSessionCard } from '@/components/family/next-session-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useFamilyDashboard } from '@/hooks/use-family-dashboard';

export default function FamilyDashboardScreen() {
  const { colors: palette } = useTheme();
  const {
    loading, members, upcomingSessions, overview,
    handleMemberPress, handleSessionPress,
    navigateToCalendar, navigateToSpending,
  } = useFamilyDashboard();

  if (loading) {
    return (
      <PageContainer header={<PageHeader title="Family Dashboard" subtitle="Manage your children's sessions" />}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[Typography.bodySmall, { color: palette.muted }]}>Loading family data...</ThemedText>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={<PageHeader title="Family Dashboard" subtitle="Manage your children's sessions" />}
      gap={Spacing.md}
    >
      {/* Overview Stats */}
      {overview && (
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <View style={styles.statsRow}>
            <SurfaceCard style={styles.statCard}>
              <ThemedText style={Typography.display}>{overview.totalChildren}</ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>Children</ThemedText>
            </SurfaceCard>
            <SurfaceCard style={styles.statCard}>
              <ThemedText style={Typography.display}>{overview.upcomingSessions}</ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>Upcoming</ThemedText>
            </SurfaceCard>
            <SurfaceCard style={styles.statCard}>
              <ThemedText style={Typography.display}>{'\u00A3'}{overview.spendingThisMonth.toFixed(0)}</ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>This Month</ThemedText>
            </SurfaceCard>
          </View>
        </Animated.View>
      )}

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <FamilyQuickActions onCalendarPress={navigateToCalendar} onSpendingPress={navigateToSpending} />
      </Animated.View>

      {/* Children Section */}
      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold" style={Typography.bodySmall}>Your Children</ThemedText>
            <ThemedText style={[Typography.small, { color: palette.muted }]}>{members.length} {members.length === 1 ? 'child' : 'children'}</ThemedText>
          </View>
          {members.length > 0 ? (
            <View style={styles.membersList}>
              {members.map((member, index) => (
                <Animated.View key={member.id} entering={FadeInDown.delay(200 + index * 50).springify()}>
                  <FamilyMemberCard member={member} onPress={handleMemberPress} showStats={true} />
                </Animated.View>
              ))}
            </View>
          ) : (
            <EmptyState icon="people-outline" title="No Children Added" message="Add children to your account to track their development" />
          )}
        </View>
      </Animated.View>

      {/* Upcoming Sessions */}
      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <View style={styles.section}>
          <UpcomingSessionsList sessions={upcomingSessions} onSessionPress={handleSessionPress} onViewAllPress={navigateToCalendar} limit={3} showHeader={true} />
        </View>
      </Animated.View>

      {/* Next Session Highlight */}
      {overview?.nextSession && (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <NextSessionCard session={overview.nextSession} onPress={handleSessionPress} />
        </Animated.View>
      )}

      {/* Book Session CTA */}
      <Animated.View entering={FadeInDown.delay(350).springify()}>
        <Clickable onPress={() => router.push(Routes.MORE)} style={[styles.ctaButton, { backgroundColor: palette.tint }]}>
          <Ionicons name="add-circle" size={20} color={palette.onPrimary} />
          <ThemedText style={[Typography.subheading, { color: palette.onPrimary }]}>Book New Session</ThemedText>
        </Clickable>
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.xxs },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  membersList: { gap: Spacing.sm },
  ctaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Spacing.sm },
});
