/**
 * Family Dashboard Screen
 *
 * Main overview for parents: children, upcoming sessions,
 * quick access to calendar and spending.
 */

import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { FamilyMemberCard } from '@/components/family/FamilyMemberCard';
import { UpcomingSessionsList } from '@/components/family/UpcomingSessionsList';
import { FamilyQuickActions } from '@/components/family/family-quick-actions';
import { NextSessionCard } from '@/components/family/next-session-card';
import { RecognitionSummaryCard } from '@/components/family/recognition-summary-card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useFamilyDashboard } from '@/hooks/use-family-dashboard';

export default function FamilyDashboardScreen() {
  const { colors: palette } = useTheme();
  const {
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    members,
    upcomingSessions,
    overview,
    handleMemberPress,
    handleSessionPress,
    navigateToCalendar,
    navigateToSpending,
    childRecognitions,
    navigateToRecognitions,
  } = useFamilyDashboard();
  const handleBookSession = () => router.push(Routes.BOOK_COACH);

  if (status === 'loading') {
    return (
      <PageContainer
        header={<PageHeader title="Family Dashboard" subtitle="Manage your children's sessions" />}
      >
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer
        header={<PageHeader title="Family Dashboard" subtitle="Manage your children's sessions" />}
      >
        <ErrorState
          message={error?.message || 'Failed to load family dashboard.'}
          onRetry={retry}
        />
      </PageContainer>
    );
  }

  if (status === 'empty') {
    return (
      <PageContainer
        header={<PageHeader title="Family Dashboard" subtitle="Manage your children's sessions" />}
      >
        <EmptyState
          icon="people-outline"
          title="No family data yet"
          message="Add children to your account to track sessions, spending, and development."
          actionLabel="Find Coaches"
          onPressAction={handleBookSession}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={<PageHeader title="Family Dashboard" subtitle="Manage your children's sessions" />}
      gap={Spacing.md}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Overview Stats */}
      {overview && (
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <Row gap="sm">
            <SurfaceCard style={styles.statCard}>
              <ThemedText style={Typography.display}>{overview.totalChildren}</ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                Children
              </ThemedText>
            </SurfaceCard>
            <SurfaceCard style={styles.statCard}>
              <ThemedText style={Typography.display}>{overview.upcomingSessions}</ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                Upcoming
              </ThemedText>
            </SurfaceCard>
            <SurfaceCard style={styles.statCard}>
              <ThemedText style={Typography.display}>
                {'\u00A3'}
                {overview.spendingThisMonth.toFixed(0)}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                This Month
              </ThemedText>
            </SurfaceCard>
          </Row>
        </Animated.View>
      )}

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <FamilyQuickActions
          onCalendarPress={navigateToCalendar}
          onSpendingPress={navigateToSpending}
        />
      </Animated.View>

      {/* Recognition Summary */}
      {childRecognitions.length > 0 && (
        <Animated.View entering={FadeInDown.delay(125).springify()}>
          <RecognitionSummaryCard awards={childRecognitions} onPress={navigateToRecognitions} />
        </Animated.View>
      )}

      {/* Children Section */}
      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <View style={styles.section}>
          <Row justify="between" align="center">
            <ThemedText type="defaultSemiBold" style={Typography.bodySmall}>
              Your Children
            </ThemedText>
            <ThemedText style={[Typography.small, { color: palette.muted }]}>
              {members.length} {members.length === 1 ? 'child' : 'children'}
            </ThemedText>
          </Row>
          {members.length > 0 ? (
            <View style={styles.membersList}>
              {members.map((member, index) => (
                <Animated.View
                  key={member.id}
                  entering={FadeInDown.delay(200 + index * 50).springify()}
                >
                  <FamilyMemberCard member={member} onPress={handleMemberPress} showStats={true} />
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
          <NextSessionCard session={overview.nextSession} onPress={handleSessionPress} />
        </Animated.View>
      )}

      {/* Book Session CTA */}
      <Animated.View entering={FadeInDown.delay(350).springify()}>
        <Clickable
          onPress={handleBookSession}
          style={[styles.ctaButton, { backgroundColor: palette.tint }]}
        >
          <Row align="center" justify="center" gap="xs">
            <Ionicons name="add-circle" size={20} color={palette.onPrimary} />
            <ThemedText style={[Typography.subheading, { color: palette.onPrimary }]}>
              Book New Session
            </ThemedText>
          </Row>
        </Clickable>
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  statCard: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.xxs },
  section: { gap: Spacing.sm },
  membersList: { gap: Spacing.sm },
  ctaButton: { paddingVertical: Spacing.md, borderRadius: Spacing.sm },
});
