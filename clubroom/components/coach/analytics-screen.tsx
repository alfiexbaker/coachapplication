import { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import {
  getSessionsForCoach,
  getCoachProfile,
  formatGBP,
} from '@/constants/mock-data';

import {
  AnalyticsStatCard,
  TopSkillsSection,
  ScheduleInsightsSection,
  styles,
} from './analytics-screen-sections';

export function CoachAnalyticsScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const analytics = useMemo(() => {
    if (!currentUser) return null;

    const sessions = getSessionsForCoach(currentUser.id);
    const profile = getCoachProfile(currentUser.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthSessions = sessions.filter(
      (s) => new Date(s.completedAt) >= startOfMonth
    );

    const activeClients = new Set(thisMonthSessions.map((s) => s.athleteId)).size;

    const avgRating = thisMonthSessions.length > 0
      ? thisMonthSessions.reduce((sum, s) => sum + s.performanceRating, 0) / thisMonthSessions.length
      : 0;

    const skillCounts = new Map<string, number>();
    thisMonthSessions.forEach((session) => {
      session.skillsWorkedOn.forEach((skill) => {
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
      });
    });

    const topSkills = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const dayCounts = new Map<string, number>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    thisMonthSessions.forEach((session) => {
      const day = dayNames[new Date(session.completedAt).getDay()];
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });

    const busiestDay = Array.from(dayCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

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

        <View style={styles.statsGrid}>
          <AnalyticsStatCard
            icon="calendar"
            iconColor={palette.tint}
            value={analytics.sessionsCount}
            label="Sessions"
            changeIcon={analytics.sessionsCount > 0 ? 'trending-up' : undefined}
            changeColor={analytics.sessionsCount > 0 ? palette.success : undefined}
            changeText="This month"
            palette={palette}
          />
          <AnalyticsStatCard
            icon="people"
            iconColor={palette.tint}
            value={analytics.activeClients}
            label="Active Clients"
            changeIcon={analytics.activeClients > 0 ? 'person-add' : undefined}
            changeColor={analytics.activeClients > 0 ? palette.success : undefined}
            changeText="Unique athletes"
            palette={palette}
          />
          <AnalyticsStatCard
            icon="star"
            iconColor={palette.tint}
            value={analytics.avgRating.toFixed(1)}
            label="Avg Performance"
            changeText="Athlete ratings"
            palette={palette}
          />
          <AnalyticsStatCard
            icon="cash"
            iconColor={palette.success}
            value={formatGBP(analytics.revenue)}
            label="Revenue"
            changeText={`@ ${formatGBP(analytics.sessionRate)}/session`}
            palette={palette}
          />
        </View>

        <TopSkillsSection topSkills={analytics.topSkills} palette={palette} />
        <ScheduleInsightsSection busiestDay={analytics.busiestDay} palette={palette} />
      </ScrollView>
    </SafeAreaView>
  );
}
