import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  clubService,
  type DashboardStats,
  type MatchResult,
} from '@/services/club-service';

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({
  label,
  value,
  icon,
  palette,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  palette: typeof Colors.light;
}) {
  return (
    <SurfaceCard style={styles.statCard} tactile={false}>
      <Ionicons name={icon} size={Components.icon.lg} color={palette.tint} />
      <ThemedText style={{ ...Typography.title, color: palette.foreground }}>
        {value}
      </ThemedText>
      <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
        {label}
      </ThemedText>
    </SurfaceCard>
  );
}

// ============================================================================
// OUTCOME BADGE
// ============================================================================

function OutcomeBadge({
  outcome,
  palette,
}: {
  outcome: 'W' | 'D' | 'L';
  palette: typeof Colors.light;
}) {
  const config = {
    W: { bg: palette.success, label: 'W' },
    D: { bg: palette.warning, label: 'D' },
    L: { bg: palette.error, label: 'L' },
  }[outcome];

  return (
    <View
      style={[
        styles.outcomeBadge,
        { backgroundColor: config.bg },
      ]}
    >
      <ThemedText style={styles.outcomeBadgeText}>{config.label}</ThemedText>
    </View>
  );
}

// ============================================================================
// RESULT ROW
// ============================================================================

function ResultRow({
  result,
  palette,
}: {
  result: MatchResult;
  palette: typeof Colors.light;
}) {
  const formattedDate = new Date(result.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={[styles.resultRow, { borderBottomColor: palette.border }]}>
      <OutcomeBadge outcome={result.outcome} palette={palette} />
      <View style={styles.resultInfo}>
        <ThemedText style={{ ...Typography.bodySemiBold, color: palette.foreground }}>
          vs {result.opponent}
        </ThemedText>
        <ThemedText style={{ ...Typography.small, color: palette.muted }}>
          {result.squad} &middot; {formattedDate}
        </ThemedText>
      </View>
      <ThemedText style={{ ...Typography.heading, color: palette.foreground }}>
        {result.scoreHome} - {result.scoreAway}
      </ThemedText>
    </View>
  );
}

// ============================================================================
// QUICK ACTION
// ============================================================================

function QuickAction({
  icon,
  label,
  onPress,
  palette,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  palette: typeof Colors.light;
}) {
  return (
    <Clickable
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        flex: 1,
        height: 80,
        borderRadius: Radii.card,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs / 2,
      }}
    >
      <Ionicons name={icon} size={Components.icon.lg} color={palette.tint} />
      <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
        {label}
      </ThemedText>
    </Clickable>
  );
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function DashboardScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      try {
        const [dashStats, matchResults] = await Promise.all([
          clubService.getDashboardStats(clubId),
          clubService.getRecentResults(clubId, 3),
        ]);
        setStats(dashStats);
        setResults(matchResults);
      } catch {
        // Error handled by service
      } finally {
        setLoading(false);
      }
    })();
  }, [clubId]);

  const navigateTo = useCallback(
    (path: string) => {
      router.push(path as Href);
    },
    [router]
  );

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
    <PageContainer
      header={
        <PageHeader
          title="Dashboard"
          showBack
          subtitle={`${stats.memberCount} members`}
        />
      }
    >
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          label="Sessions"
          value={stats.sessionsThisWeek}
          icon="fitness-outline"
          palette={palette}
        />
        <StatCard
          label="Matches"
          value={stats.matchesThisWeek}
          icon="football-outline"
          palette={palette}
        />
        <StatCard
          label="Events"
          value={stats.upcomingEvents}
          icon="calendar-outline"
          palette={palette}
        />
      </View>

      {/* Recent Results */}
      <SurfaceCard style={styles.resultsCard} tactile={false}>
        <ThemedText style={{ ...Typography.subheading, color: palette.foreground }}>
          Recent Results
        </ThemedText>
        {results.length > 0 ? (
          results.map((result) => (
            <ResultRow key={result.id} result={result} palette={palette} />
          ))
        ) : (
          <ThemedText style={{ ...Typography.body, color: palette.muted, textAlign: 'center', paddingVertical: Spacing.md }}>
            No recent results
          </ThemedText>
        )}
      </SurfaceCard>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <ThemedText style={{ ...Typography.subheading, color: palette.foreground }}>
          Quick Actions
        </ThemedText>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="calendar-outline"
            label="Calendar"
            onPress={() => navigateTo(`/club/${clubId}/calendar`)}
            palette={palette}
          />
          <QuickAction
            icon="create-outline"
            label="Post"
            onPress={() => navigateTo(`/(modal)/create-club-post?clubId=${clubId}`)}
            palette={palette}
          />
        </View>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="football-outline"
            label="Match"
            onPress={() => navigateTo('/matches/create')}
            palette={palette}
          />
          <QuickAction
            icon="megaphone-outline"
            label="Event"
            onPress={() => navigateTo('/events/create')}
            palette={palette}
          />
        </View>
      </View>
    </PageContainer>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  resultsCard: {
    gap: Spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  resultInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  outcomeBadge: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeBadgeText: {
    color: Colors.light.onPrimary,
    ...Typography.caption,
  },
  quickActionsSection: {
    gap: Spacing.sm,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
});
