import { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  getSessionsForCoach,
  getCoachProfile,
  formatGBP,
} from '@/constants/mock-data';

export function CoachAnalyticsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const analytics = useMemo(() => {
    if (!currentUser) return null;

    const sessions = getSessionsForCoach(currentUser.id);
    const profile = getCoachProfile(currentUser.id);

    // Calculate this month's sessions
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthSessions = sessions.filter(
      (s) => new Date(s.completedAt) >= startOfMonth
    );

    // Calculate active clients (unique athletes this month)
    const activeClients = new Set(thisMonthSessions.map((s) => s.athleteId)).size;

    // Calculate average rating this month
    const avgRating = thisMonthSessions.length > 0
      ? thisMonthSessions.reduce((sum, s) => sum + s.performanceRating, 0) / thisMonthSessions.length
      : 0;

    // Calculate top skills taught
    const skillCounts = new Map<string, number>();
    thisMonthSessions.forEach((session) => {
      session.skillsWorkedOn.forEach((skill) => {
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
      });
    });

    const topSkills = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Calculate busiest day
    const dayCounts = new Map<string, number>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    thisMonthSessions.forEach((session) => {
      const day = dayNames[new Date(session.completedAt).getDay()];
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });

    const busiestDay = Array.from(dayCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    // Calculate revenue
    const revenue = profile ? thisMonthSessions.length * profile.sessionRate : 0;

    return {
      sessionsCount: thisMonthSessions.length,
      activeClients,
      avgRating,
      topSkills,
      busiestDay: busiestDay ? `${busiestDay[0]} (${busiestDay[1]})` : 'N/A',
      revenue,
      sessionRate: profile?.sessionRate || 0,
    };
  }, [currentUser]);

  if (!currentUser || !analytics) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Analytics
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Your coaching performance this month
          </ThemedText>
        </View>

        {/* Overview Cards */}
        <View style={styles.statsGrid}>
          <SurfaceCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
              <Ionicons name="calendar" size={24} color={palette.tint} />
            </View>
            <ThemedText type="title" style={styles.statNumber}>
              {analytics.sessionsCount}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Sessions
            </ThemedText>
            {analytics.sessionsCount > 0 && (
              <View style={styles.change}>
                <Ionicons name="trending-up" size={14} color={palette.success} />
                <ThemedText style={styles.changeText}>
                  This month
                </ThemedText>
              </View>
            )}
          </SurfaceCard>

          <SurfaceCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
              <Ionicons name="people" size={24} color={palette.tint} />
            </View>
            <ThemedText type="title" style={styles.statNumber}>
              {analytics.activeClients}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Active Clients
            </ThemedText>
            {analytics.activeClients > 0 && (
              <View style={styles.change}>
                <Ionicons name="person-add" size={14} color={palette.success} />
                <ThemedText style={styles.changeText}>
                  Unique athletes
                </ThemedText>
              </View>
            )}
          </SurfaceCard>

          <SurfaceCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
              <Ionicons name="star" size={24} color={palette.tint} />
            </View>
            <ThemedText type="title" style={styles.statNumber}>
              {analytics.avgRating.toFixed(1)}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Avg Performance
            </ThemedText>
            <View style={styles.change}>
              <ThemedText style={styles.changeText}>
                Athlete ratings
              </ThemedText>
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.success, 0.12) }]}>
              <Ionicons name="cash" size={24} color={palette.success} />
            </View>
            <ThemedText type="title" style={styles.statNumber}>
              {formatGBP(analytics.revenue)}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Revenue
            </ThemedText>
            <View style={styles.change}>
              <ThemedText style={styles.changeText}>
                @ {formatGBP(analytics.sessionRate)}/session
              </ThemedText>
            </View>
          </SurfaceCard>
        </View>

        {/* Top Skills */}
        {analytics.topSkills.length > 0 && (
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="football" size={20} color={palette.tint} />
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Top Skills Taught
              </ThemedText>
            </View>
            <View style={styles.skillsList}>
              {analytics.topSkills.map(([skill, count], index) => (
                <View key={skill} style={styles.skillRow}>
                  <View style={styles.skillInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.skillRank}>
                      {index + 1}.
                    </ThemedText>
                    <ThemedText style={styles.skillName}>{skill}</ThemedText>
                  </View>
                  <View style={styles.skillCount}>
                    <ThemedText type="defaultSemiBold" style={[styles.skillCountText, { color: palette.tint }]}>
                      {count}
                    </ThemedText>
                    <ThemedText style={[styles.skillCountLabel, { color: palette.muted }]}>
                      sessions
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </SurfaceCard>
        )}

        {/* Busiest Day */}
        {analytics.busiestDay !== 'N/A' && (
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={20} color={palette.tint} />
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Schedule Insights
              </ThemedText>
            </View>
            <View style={styles.insightRow}>
              <ThemedText style={{ color: palette.muted }}>Busiest Day</ThemedText>
              <ThemedText type="defaultSemiBold">{analytics.busiestDay}</ThemedText>
            </View>
          </SurfaceCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  title: { ...Typography.display, letterSpacing: -0.8 },
  subtitle: { ...Typography.body, lineHeight: 22,
    fontWeight: '500' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statNumber: { ...Typography.display },
  statLabel: { ...Typography.smallSemiBold, textTransform: 'uppercase',
    letterSpacing: 0.5 },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    marginTop: Spacing.xs / 2,
  },
  changeText: { ...Typography.caption, color: Colors.light.muted },
  section: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: { ...Typography.subheading },
  skillsList: {
    gap: Spacing.md,
  },
  skillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  skillRank: { ...Typography.bodySmall, width: 24 },
  skillName: { ...Typography.body },
  skillCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs / 2,
  },
  skillCountText: { ...Typography.heading },
  skillCountLabel: { ...Typography.caption },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
});
