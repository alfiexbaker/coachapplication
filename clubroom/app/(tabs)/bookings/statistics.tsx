/**
 * StatisticsScreen — Athlete stats dashboard.
 *
 * Thin composition layer. All state in useStatistics hook.
 * Sub-components: StatsGrid, RecentSessionsCard, SkillsProgressCard,
 * StatsQuickLinks, ChildSelector.
 */

import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Column } from '@/components/primitives/column';
import { ChildSelector } from '@/components/bookings/child-selector';
import { StatsGrid } from '@/components/bookings/stats-grid';
import { RecentSessionsCard } from '@/components/bookings/recent-sessions-card';
import { SkillsProgressCard } from '@/components/bookings/skills-progress-card';
import { StatsQuickLinks } from '@/components/bookings/stats-quick-links';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useStatistics } from '@/hooks/use-statistics';

export default function StatisticsScreen() {
  const { colors: palette } = useTheme();
  const {
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Column gap="lg">
          {isParent && children.length > 0 && (
            <ChildSelector
              children={children}
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
