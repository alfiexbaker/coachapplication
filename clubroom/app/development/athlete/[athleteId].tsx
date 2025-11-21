import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserById, getSessionsForCoach, formatDate } from '@/constants/mock-data';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AthleteDetailScreen');

export default function AthleteDetailScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const athlete = getUserById(athleteId!);
  const sessions = getSessionsForCoach(currentUser!.id).filter(
    s => s.athleteId === athleteId
  );

  if (!athlete || !currentUser) {
    return null;
  }

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

  logger.debug('Athlete detail rendered', {
    athleteId,
    sessionCount: sessions.length,
    trend,
    level: level.name
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.foreground} />
          </Clickable>
          <ThemedText type="title" style={styles.title}>
            Athlete Progress
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Athlete Info Card */}
        <SurfaceCard style={styles.athleteCard}>
          <View style={styles.athleteHeader}>
            <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
              <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                {athlete.avatar || athlete.name.charAt(0)}
              </ThemedText>
            </View>
            <View style={styles.athleteInfo}>
              <ThemedText type="subtitle" style={styles.athleteName}>
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
                {(sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length).toFixed(1)}⭐
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
          <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
            {sortedSessions.length} sessions completed
          </ThemedText>
        </View>

        <View style={styles.sessionList}>
          {sortedSessions.map((session) => {
            const needsNotes = !session.notes || session.notes.trim() === '';

            return (
              <Clickable
                key={session.id}
                onPress={() => {
                  logger.press('SessionCard', { sessionId: session.id });
                  router.push(`/development/session/${session.id}`);
                }}
                style={({ pressed }) => [
                  styles.sessionCard,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <SurfaceCard style={styles.sessionContent}>
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionHeaderLeft}>
                      <ThemedText type="defaultSemiBold" style={styles.sessionDate}>
                        {formatDate(session.completedAt)}
                      </ThemedText>
                      {needsNotes && (
                        <View style={[styles.needsNotesBadge, { backgroundColor: Colors.light.error }]}>
                          <ThemedText style={styles.needsNotesText}>Needs Notes</ThemedText>
                        </View>
                      )}
                    </View>
                    <View style={styles.ratingRow}>
                      <ThemedText style={styles.rating}>{session.performanceRating}</ThemedText>
                      <Ionicons name="star" size={16} color={palette.tint} />
                    </View>
                  </View>

                  {/* Skills worked on */}
                  {session.skillsWorkedOn.length > 0 && (
                    <View style={styles.skillsRow}>
                      {session.skillsWorkedOn.map((skill, index) => (
                        <View key={index} style={[styles.skillChip, { backgroundColor: palette.tint + '10' }]}>
                          <ThemedText style={[styles.skillText, { color: palette.tint }]}>
                            {skill}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Notes preview */}
                  {session.notes && session.notes.trim() !== '' && (
                    <ThemedText
                      style={[styles.notesPreview, { color: palette.muted }]}
                      numberOfLines={2}
                    >
                      {session.notes}
                    </ThemedText>
                  )}

                  {/* Video indicator */}
                  {session.videoUrls && session.videoUrls.length > 0 && (
                    <View style={styles.videoIndicator}>
                      <Ionicons name="videocam" size={14} color={palette.tint} />
                      <ThemedText style={[styles.videoText, { color: palette.tint }]}>
                        {session.videoUrls.length} {session.videoUrls.length === 1 ? 'video' : 'videos'}
                      </ThemedText>
                    </View>
                  )}

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={palette.icon}
                    style={styles.chevron}
                  />
                </SurfaceCard>
              </Clickable>
            );
          })}
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
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  athleteCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  athleteHeader: {
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
    fontSize: 32,
  },
  athleteInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  athleteName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  trendBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  levelBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
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
    borderTopColor: Colors.light.border,
  },
  stat: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  statValue: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  section: {
    gap: Spacing.xs / 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  sessionList: {
    gap: Spacing.md,
  },
  sessionCard: {
    borderRadius: Radii.lg,
  },
  sessionContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
    position: 'relative',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  sessionDate: {
    fontSize: 15,
  },
  needsNotesBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
  },
  needsNotesText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  notesPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  videoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  videoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chevron: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    marginTop: -10,
  },
});
