import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { sessionHistory, athleteSkillLevels } from '@/constants/mock-data';

export default function StatisticsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Calculate stats
  const totalSessions = sessionHistory.length;
  const totalHours = sessionHistory.reduce((sum, session) => sum + session.durationMinutes, 0) / 60;
  const uniqueCoaches = new Set(sessionHistory.map((s) => s.coachName)).size;

  const stats = [
    {
      id: 'sessions',
      icon: 'calendar' as const,
      label: 'Total Sessions',
      value: totalSessions.toString(),
      color: '#10B981',
    },
    {
      id: 'hours',
      icon: 'time' as const,
      label: 'Training Hours',
      value: Math.round(totalHours).toString(),
      color: '#3B82F6',
    },
    {
      id: 'coaches',
      icon: 'people' as const,
      label: 'Coaches',
      value: uniqueCoaches.toString(),
      color: '#8B5CF6',
    },
    {
      id: 'streak',
      icon: 'flame' as const,
      label: 'Week Streak',
      value: '3',
      color: '#F59E0B',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <SurfaceCard key={stat.id} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.icon} size={24} color={stat.color} />
              </View>
              <ThemedText type="title" style={styles.statValue}>
                {stat.value}
              </ThemedText>
              <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
            </SurfaceCard>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Sessions
          </ThemedText>
          <SurfaceCard style={styles.activityCard}>
            {sessionHistory.slice(0, 5).map((session, index) => (
              <View key={session.id}>
                <View style={styles.activityItem}>
                  <View style={styles.activityContent}>
                    <View style={styles.sessionRow}>
                      <View style={[styles.activityDot, { backgroundColor: palette.tint }]} />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.activityTitle}>{session.focus}</ThemedText>
                        <ThemedText style={styles.activitySubtext}>
                          {session.coachName} · {session.durationMinutes}m
                        </ThemedText>
                      </View>
                      <View style={styles.ratingRow}>
                        {[...Array(5)].map((_, i) => (
                          <Ionicons
                            key={i}
                            name={i < (session.rating || 0) ? 'star' : 'star-outline'}
                            size={14}
                            color="#F59E0B"
                          />
                        ))}
                      </View>
                    </View>
                    {session.coachFeedback && (
                      <View style={[styles.feedbackBox, { backgroundColor: palette.surface }]}>
                        <ThemedText style={styles.feedbackText}>{session.coachFeedback}</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
                {index < 4 && <View style={[styles.divider, { backgroundColor: palette.border }]} />}
              </View>
            ))}
          </SurfaceCard>
        </View>

        {/* Skills Progress */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Skills
          </ThemedText>
          <SurfaceCard style={styles.skillsCard}>
            {athleteSkillLevels
              .sort((a, b) => b.level - a.level)
              .slice(0, 6)
              .map((item, index) => (
                <View key={item.skill} style={styles.skillItem}>
                  <View style={styles.skillHeader}>
                    <ThemedText style={styles.skillName}>{item.skill}</ThemedText>
                    <ThemedText style={styles.skillLevel}>{item.level}</ThemedText>
                  </View>
                  <View style={[styles.skillBar, { backgroundColor: palette.border }]}>
                    <View
                      style={[
                        styles.skillFill,
                        { backgroundColor: palette.tint, width: `${item.level}%` },
                      ]}
                    />
                  </View>
                  {index < 5 && <View style={[styles.divider, { backgroundColor: palette.border }]} />}
                </View>
              ))}
          </SurfaceCard>
        </View>

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
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    paddingLeft: Spacing.xs,
  },
  activityCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  activityItem: {
    paddingVertical: Spacing.xs,
  },
  activityContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  activitySubtext: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  feedbackBox: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginLeft: Spacing.lg,
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  skillsCard: {
    padding: Spacing.lg,
  },
  skillItem: {
    gap: Spacing.xs,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillName: {
    fontSize: 15,
    fontWeight: '600',
  },
  skillLevel: {
    fontSize: 14,
    fontWeight: '700',
  },
  skillBar: {
    height: 8,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  skillFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  chartPlaceholder: {
    padding: Spacing.xl * 2,
    alignItems: 'center',
    gap: Spacing.md,
  },
  placeholderText: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
  },
});
