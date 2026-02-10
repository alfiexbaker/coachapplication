/**
 * Club Dashboard Screen
 *
 * Overview of club stats, recent match results,
 * and quick actions for calendar, posts, matches, and events.
 */

import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { StatCard, ResultRow, QuickAction } from '@/components/club/club-dashboard-widgets';
import { Spacing, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useClubDashboard } from '@/hooks/use-club-dashboard';

export default function DashboardScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { clubId, stats, results, loading, navigateTo } = useClubDashboard();

  if (loading || !stats) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer header={<PageHeader title="Dashboard" showBack subtitle={`${stats.memberCount} members`} />}>
      {/* Stats Row */}
      <Row style={styles.statsRow}>
        <StatCard label="Sessions" value={stats.sessionsThisWeek} icon="fitness-outline" palette={palette} />
        <StatCard label="Matches" value={stats.matchesThisWeek} icon="football-outline" palette={palette} />
        <StatCard label="Events" value={stats.upcomingEvents} icon="calendar-outline" palette={palette} />
      </Row>

      {/* Recent Results */}
      <SurfaceCard style={styles.resultsCard} tactile={false}>
        <ThemedText style={{ ...Typography.subheading, color: palette.foreground }}>Recent Results</ThemedText>
        {results.length > 0 ? (
          results.map((result) => <ResultRow key={result.id} result={result} palette={palette} />)
        ) : (
          <ThemedText style={{ ...Typography.body, color: palette.muted, textAlign: 'center', paddingVertical: Spacing.md }}>
            No recent results
          </ThemedText>
        )}
      </SurfaceCard>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <ThemedText style={{ ...Typography.subheading, color: palette.foreground }}>Quick Actions</ThemedText>
        <Row style={styles.quickActionsGrid}>
          <QuickAction icon="calendar-outline" label="Calendar" onPress={() => navigateTo(`/club/${clubId}/calendar`)} palette={palette} />
          <QuickAction icon="create-outline" label="Post" onPress={() => navigateTo(`/(modal)/create-club-post?clubId=${clubId}`)} palette={palette} />
        </Row>
        <Row style={styles.quickActionsGrid}>
          <QuickAction icon="football-outline" label="Match" onPress={() => navigateTo('/matches/create')} palette={palette} />
          <QuickAction icon="megaphone-outline" label="Event" onPress={() => navigateTo('/events/create')} palette={palette} />
        </Row>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl },
  statsRow: { gap: Spacing.xs },
  resultsCard: { gap: Spacing.sm },
  quickActionsSection: { gap: Spacing.sm },
  quickActionsGrid: { gap: Spacing.xs },
});
