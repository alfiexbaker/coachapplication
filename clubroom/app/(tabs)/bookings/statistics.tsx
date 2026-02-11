/**
 * StatisticsScreen — Athlete stats dashboard.
 *
 * Thin composition layer. All state in useStatistics hook.
 * Sub-components: StatsGrid, RecentSessionsCard, SkillsProgressCard,
 * StatsQuickLinks, ChildSelector.
 */

import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Column } from '@/components/primitives/column';
import { ChildSelector } from '@/components/bookings/child-selector';
import { StatsGrid } from '@/components/bookings/stats-grid';
import { RecentSessionsCard } from '@/components/bookings/recent-sessions-card';
import { SkillsProgressCard } from '@/components/bookings/skills-progress-card';
import { StatsQuickLinks } from '@/components/bookings/stats-quick-links';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useStatistics } from '@/hooks/use-statistics';

export default function StatisticsScreen() {
  const { colors: palette } = useTheme();
  const {
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    children,
    selectedChildId,
    setSelectedChildId,
    isParent,
    stats,
    recentSessions,
    topSkills,
    navigateToProgress,
    navigateToBadges,
    navigateToBookings,
    navigateToMessages,
  } = useStatistics();

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['bottom']}
      >
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['bottom']}
      >
        <ErrorState
          message={error?.message ?? 'Failed to load progress statistics.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  // Empty state — no sessions completed yet
  if (status === 'empty' || (recentSessions.length === 0 && topSkills.length === 0)) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['bottom']}
      >
        {isParent && children.length > 0 && (
          <ChildSelector
            childOptions={children}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
          />
        )}
        <EmptyState
          icon="stats-chart-outline"
          title="No stats yet"
          message="Complete your first session to start tracking progress and stats."
          actionLabel="Book a Session"
          onPressAction={navigateToBookings}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['bottom']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        <Column gap="lg">
          {isParent && children.length > 0 && (
            <ChildSelector
              childOptions={children}
              selectedChildId={selectedChildId}
              onSelectChild={setSelectedChildId}
            />
          )}

          <StatsGrid stats={stats} />

          <RecentSessionsCard sessions={recentSessions} />

          <SkillsProgressCard skills={topSkills} />

          <StatsQuickLinks
            onProgress={navigateToProgress}
            onBadges={navigateToBadges}
            onBookings={navigateToBookings}
            onMessages={navigateToMessages}
          />
        </Column>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
});
