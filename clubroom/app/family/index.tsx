/**
 * Family Overview Screen
 *
 * Secondary family gateway for parents: shortcuts to the live calendar,
 * child progress, and booked-session records.
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
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useFamilyDashboard } from '@/hooks/use-family-dashboard';

export default function FamilyOverviewScreen() {
  const { colors: palette } = useTheme();
  const {
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    members,
    upcomingSessions,
    handleMemberPress,
    handleSessionPress,
    navigateToCalendar,
    navigateToRecurring,
  } = useFamilyDashboard();
  const handleBookSession = () => router.push(Routes.BOOK_COACH);
  const header = (
    <PageHeader
      title="Family Overview"
      subtitle="Jump into family work without another dashboard layer"
      showBack
    />
  );

  if (status === 'loading') {
    return (
      <PageContainer header={header}>
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer header={header}>
        <ErrorState message={error?.message || 'Failed to load family overview.'} onRetry={retry} />
      </PageContainer>
    );
  }

  if (status === 'empty') {
    return (
      <PageContainer header={header}>
        <EmptyState
          icon="people-outline"
          title="No family data yet"
          message="Add children to your account to track sessions, records, and development."
          actionLabel="Find Coaches"
          onPressAction={handleBookSession}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer header={header} gap={Spacing.md} refreshing={refreshing} onRefresh={onRefresh}>
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <FamilyQuickActions
          onCalendarPress={navigateToCalendar}
          onRecurringPress={navigateToRecurring}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(125).springify()}>
        <View style={styles.section}>
          <UpcomingSessionsList
            sessions={upcomingSessions}
            onSessionPress={handleSessionPress}
            onViewAllPress={navigateToCalendar}
            limit={3}
            showHeader
            title="Next Sessions"
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <View style={styles.section}>
          <Row justify="between" align="center">
            <ThemedText type="defaultSemiBold" style={Typography.bodySmall}>
              Child Progress
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
                  entering={FadeInDown.delay(250 + index * 50).springify()}
                >
                  <FamilyMemberCard member={member} onPress={handleMemberPress} showStats={false} />
                </Animated.View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="people-outline"
              title="No children added"
              message="Add children to your account to follow their development."
            />
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(275).springify()}>
        <SurfaceCard style={styles.trustCard}>
          <Row align="center" gap="sm">
            <Ionicons name="shield-checkmark-outline" size={18} color={palette.info} />
            <ThemedText type="defaultSemiBold">Family trust</ThemedText>
          </Row>
          <ThemedText style={[Typography.bodySmall, { color: palette.muted }]}>
            Open any booking to see who handles support and coach changes. Child details stay
            limited to the assigned coach and supervising club staff only when they need to support
            delivery, safety, or a problem.
          </ThemedText>
        </SurfaceCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(325).springify()}>
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
  section: { gap: Spacing.sm },
  membersList: { gap: Spacing.sm },
  trustCard: { gap: Spacing.sm },
  ctaButton: { paddingVertical: Spacing.md, borderRadius: Spacing.sm },
});
