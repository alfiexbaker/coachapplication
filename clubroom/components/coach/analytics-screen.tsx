import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { coachAnalyticsService } from '@/services/analytics-service';
import { formatGBP } from '@/utils/format';

import {
  AnalyticsStatCard,
  TopSkillsSection,
  ScheduleInsightsSection,
} from './analytics-screen-sections';
import { styles } from './analytics-screen-styles';

type AnalyticsViewModel = {
  sessionsCount: number;
  activeClients: number;
  avgRating: number;
  topSkills: [string, number][];
  busiestDay: string;
  revenue: number;
  sessionRate: number;
};

export function CoachAnalyticsScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsViewModel | null>(null);

  useEffect(() => {
    let active = true;

    const loadAnalytics = async () => {
      if (!currentUser?.id) {
        if (active) {
          setAnalytics(null);
        }
        return;
      }

      const result = await coachAnalyticsService.getCoachAnalytics(currentUser.id, 'MONTH');
      if (!active) {
        return;
      }

      if (!result.success || !result.data) {
        setAnalytics({
          sessionsCount: 0,
          activeClients: 0,
          avgRating: 0,
          topSkills: [],
          busiestDay: 'N/A',
          revenue: 0,
          sessionRate: 0,
        });
        return;
      }

      const data = result.data;
      setAnalytics({
        sessionsCount: data.sessions.totalSessions,
        activeClients: data.retention.totalActiveClients,
        avgRating: data.avgRating,
        topSkills: data.topSkills
          .slice(0, 5)
          .map((skill) => [skill.skill, skill.sessionCount] as [string, number]),
        busiestDay:
          data.busiestDay.sessionCount > 0
            ? `${data.busiestDay.dayName} (${data.busiestDay.sessionCount})`
            : 'N/A',
        revenue: data.totalRevenue,
        sessionRate: data.avgRevenuePerSession,
      });
    };

    void loadAnalytics();

    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  if (!currentUser || !analytics) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
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
    </View>
  );
}
