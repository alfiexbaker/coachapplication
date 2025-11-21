import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSessionsForAthlete, getUserById, formatDate } from '@/constants/mock-data';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ChildProgressScreen');

export default function ChildProgressScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const params = useLocalSearchParams();
  const childId = params.childId as string;

  if (!currentUser || !childId) {
    return null;
  }

  const athlete = getUserById(childId);
  if (!athlete) {
    return null;
  }

  const sessions = getSessionsForAthlete(childId);

  // Calculate progress trend based on last 3 sessions vs previous 3
  const getProgressTrend = () => {
    if (sessions.length < 2) return 'steady';

    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    const recentAvg = sortedSessions.slice(0, 3).reduce((sum, s) => sum + s.performanceRating, 0) / Math.min(3, sortedSessions.length);
    const previousAvg = sortedSessions.slice(3, 6).reduce((sum, s) => sum + s.performanceRating, 0) / Math.min(3, sortedSessions.slice(3, 6).length);

    if (sortedSessions.length < 4) return 'steady';
    if (recentAvg > previousAvg + 0.3) return 'improving';
    if (recentAvg < previousAvg - 0.3) return 'declining';
    return 'steady';
  };

  // Calculate level badge based on total sessions
  const getLevel = () => {
    const count = sessions.length;
    if (count >= 20) return { name: 'Gold', icon: '🏆', color: '#FFD700' };
    if (count >= 10) return { name: 'Silver', icon: '⭐', color: '#C0C0C0' };
    return { name: 'Bronze', icon: '🥉', color: '#CD7F32' };
  };

  const trend = getProgressTrend();
  const level = getLevel();

  const trendIcon = trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '📊';
  const trendText = trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Needs Focus' : 'Steady';
  const trendColor = trend === 'improving' ? Colors.light.success : trend === 'declining' ? Colors.light.error : palette.muted;

  // Sort sessions by date (newest first)
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  logger.debug('Child progress rendered', {
    childId,
    sessionCount: sessions.length,
    trend,
    level: level.name
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with back button */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="title" style={styles.title}>
            {athlete.name}'s Progress
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
          Track football development
        </ThemedText>

        {/* Progress Card */}
        <SurfaceCard style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
              <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                {athlete.avatar || athlete.name.charAt(0)}
              </ThemedText>
            </View>
            <View style={styles.progressInfo}>
              <ThemedText type="subtitle" style={styles.name}>
                {athlete.name}
              </ThemedText>
              <View style={styles.badges}>
                <View style={[styles.trendBadge, { backgroundColor: trendColor + '20' }]}>
                  <ThemedText style={[styles.trendText, { color: trendColor }]}>
                    {trendIcon} {trendText}
                  </ThemedText>
                </View>
                <View style={[styles.levelBadge, { backgroundColor: level.color + '20' }]}>
                  <ThemedText style={[styles.levelText, { color: level.color }]}>
                    {level.icon} {level.name}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>
                {sessions.length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Total Sessions
              </ThemedText>
            </View>
            <View style={styles.stat}>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>
                {sessions.length > 0 ? (sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length).toFixed(1) : '0'}⭐
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Avg Rating
              </ThemedText>
            </View>
            <View style={styles.stat}>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>
                {sessions.length > 0 ? formatDate(sortedSessions[0].completedAt).split(' ')[0] : '-'}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Last Session
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>

        {/* Sessions List */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Session History
          </ThemedText>

          {sessions.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: palette.surface }]}>
              <Ionicons name="calendar-outline" size={32} color={palette.icon} />
              <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
                No sessions yet
              </ThemedText>
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                Sessions will appear here once completed
              </ThemedText>
            </View>
          ) : (
            <View style={styles.sessionsList}>
              {sortedSessions.map((session) => (
                <Clickable
                  key={session.id}
                  onPress={() => {
                    logger.press('SessionCard', { sessionId: session.id });
                    router.push(`/bookings/${session.bookingId}`);
                  }}>
                  <SurfaceCard style={styles.sessionCard}>
                    <View style={styles.sessionHeader}>
                      <View style={styles.sessionInfo}>
                        <ThemedText type="defaultSemiBold">
                          Session with {session.coachName}
                        </ThemedText>
                        <ThemedText style={[styles.sessionDate, { color: palette.muted }]}>
                          {formatDate(session.completedAt)}
                        </ThemedText>
                      </View>
                      <View style={styles.rating}>
                        <ThemedText type="defaultSemiBold" style={styles.ratingValue}>
                          {session.performanceRating}
                        </ThemedText>
                        <ThemedText style={styles.ratingStar}>⭐</ThemedText>
                      </View>
                    </View>

                    {session.skillsWorkedOn && session.skillsWorkedOn.length > 0 && (
                      <View style={styles.skills}>
                        {session.skillsWorkedOn.slice(0, 3).map((skill, index) => (
                          <View
                            key={index}
                            style={[styles.skillPill, { backgroundColor: palette.tint + '15' }]}>
                            <ThemedText style={[styles.skillText, { color: palette.tint }]}>
                              {skill}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    )}

                    {session.notes && (
                      <ThemedText style={[styles.sessionNotes, { color: palette.muted }]} numberOfLines={2}>
                        {session.notes}
                      </ThemedText>
                    )}
                  </SurfaceCard>
                </Clickable>
              ))}
            </View>
          )}
        </View>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
  },
  subtitle: {
    marginTop: -Spacing.sm,
  },
  progressCard: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  progressInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  name: {
    fontSize: 20,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  trendBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  levelBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  stat: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 24,
  },
  statLabel: {
    fontSize: 12,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
  },
  emptyCard: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.lg,
  },
  emptyTitle: {
    marginTop: Spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
  },
  sessionsList: {
    gap: Spacing.md,
  },
  sessionCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionDate: {
    fontSize: 13,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 18,
  },
  ratingStar: {
    fontSize: 16,
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionNotes: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
