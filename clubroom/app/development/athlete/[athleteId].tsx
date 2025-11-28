import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { StatCard } from '@/components/primitives/stat-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserById, getSessionsForCoach, formatDate } from '@/constants/mock-data';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type { Session } from '@/constants/types';

const logger = createLogger('AthleteDetailScreen');

export default function AthleteDetailScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const athlete = getUserById(athleteId!);

  // Load sessions from both mock data and AsyncStorage
  useEffect(() => {
    const loadSessions = async () => {
      if (!currentUser) return;

      try {
        // Get mock data sessions
        const mockSessions = getSessionsForCoach(currentUser.id).filter(
          s => s.athleteId === athleteId
        );

        // Get AsyncStorage sessions
        const storedSessions = await AsyncStorage.getItem('coach_sessions');
        const asyncSessions = storedSessions ? JSON.parse(storedSessions) : [];
        const athleteAsyncSessions = asyncSessions.filter(
          (s: any) => s.athleteId === athleteId && s.coachId === currentUser.id
        );

        // Combine both sources
        const allSessions = [...mockSessions, ...athleteAsyncSessions];
        setSessions(allSessions);
        logger.debug('Sessions loaded', {
          mockCount: mockSessions.length,
          asyncCount: athleteAsyncSessions.length,
          total: allSessions.length,
        });
      } catch (error) {
        logger.error('Failed to load sessions', error);
        // Fallback to mock data only
        const mockSessions = getSessionsForCoach(currentUser.id).filter(
          s => s.athleteId === athleteId
        );
        setSessions(mockSessions);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [athleteId, currentUser]);

  if (!athlete || !currentUser) {
    return null;
  }

  if (loading) {
    return (
      <PageContainer>
        <ThemedText>Loading...</ThemedText>
      </PageContainer>
    );
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
    if (count >= 20) return { name: 'Gold', icon: 'G', color: '#FFD700' };
    if (count >= 10) return { name: 'Silver', icon: 'S', color: '#C0C0C0' };
    return { name: 'Bronze', icon: 'B', color: '#CD7F32' };
  };

  const trend = getProgressTrend();
  const level = getLevel();

  const trendIcon = trend === 'improving' ? 'UP' : trend === 'declining' ? 'DOWN' : 'EVEN';
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
    level: level.name,
  });

  return (
    <PageContainer
      gap={Spacing.lg}
      header={
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={palette.foreground} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Athlete Progress
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>
      }
    >

      {/* Hero Card - Athlete Overview */}
      <SurfaceCard style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
            <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
              {athlete.avatar || athlete.name.charAt(0)}
            </ThemedText>
          </View>
          <View style={styles.heroInfo}>
            <ThemedText type="heading" style={styles.athleteName}>
              {athlete.name}
            </ThemedText>
            <View style={styles.badges}>
              <View style={[styles.trendBadge, { backgroundColor: trendColor + '15' }]}>
                <ThemedText style={[styles.badgeText, { color: trendColor }]}>
                  {trendIcon} {trendText}
                </ThemedText>
              </View>
              <View style={[styles.levelBadge, { backgroundColor: level.color + '15' }]}>
                <ThemedText style={[styles.badgeText, { color: level.color }]}>
                  {level.icon} {level.name}
                </ThemedText>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: palette.tint }]}
            onPress={async () => {
              logger.press('LogSession');

              try {
                // Create new session
                const sessionId = `session-${Date.now()}`;
                const sessionRecord = {
                  id: sessionId,
                  athleteId,
                  athleteName: athlete.name,
                  coachId: currentUser.id,
                  bookingId: `manual-${Date.now()}`,
                  completedAt: new Date().toISOString(),
                  performanceRating: 3,
                  skillsWorkedOn: [],
                  notes: '',
                  videoUrls: [],
                  imageUrls: [],
                  attendance: 'ATTENDED',
                };

                // Save to AsyncStorage
                const existingSessions = await AsyncStorage.getItem('coach_sessions');
                const sessions = existingSessions ? JSON.parse(existingSessions) : [];
                sessions.push(sessionRecord);
                await AsyncStorage.setItem('coach_sessions', JSON.stringify(sessions));

                logger.info('Session created', { sessionId, athleteId });

                // Navigate to session detail
                router.push(`/development/session/${sessionId}` as any);
              } catch (error) {
                logger.error('Failed to create session', error);
              }
            }}
          >
            <ThemedText style={styles.ctaText}>Log Session</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Stats Divider */}
        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            value={sessions.length}
            label="Total Sessions"
            variant="compact"
          />
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <StatCard
            value={(sessions.reduce((sum, s) => sum + s.performanceRating, 0) / sessions.length).toFixed(1)}
            label="Avg Rating"
            variant="compact"
            icon={<Ionicons name="star" size={16} color={palette.tint} />}
          />
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <StatCard
            value={sessions.length > 0 ? formatDate(sortedSessions[0].completedAt).split(' ')[0] : '-'}
            label="Last Session"
            variant="compact"
          />
        </View>
      </SurfaceCard>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <ThemedText type="heading" style={styles.sectionTitle}>
          Session History
        </ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
          {sortedSessions.length} sessions completed
        </ThemedText>
      </View>

      {/* Session Cards */}
      <View style={styles.sessionList}>
        {sortedSessions.map((session) => {
          const needsNotes = !session.notes || session.notes.trim() === '';

          return (
            <Clickable
              key={session.id}
              onPress={() => {
                logger.press('SessionCard', { sessionId: session.id });
                router.push({
                  pathname: '/development/session/[sessionId]',
                  params: { sessionId: session.id },
                });
              }}
            >
              <SurfaceCard style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionHeaderLeft}>
                    <ThemedText type="defaultSemiBold" style={styles.sessionDate}>
                      {formatDate(session.completedAt)}
                    </ThemedText>
                    {needsNotes && (
                      <View style={[styles.needsNotesBadge, { backgroundColor: palette.error }]}>
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
                      <View
                        key={index}
                        style={[styles.skillChip, { backgroundColor: palette.tint + '15' }]}
                      >
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
                      {session.videoUrls.length}{' '}
                      {session.videoUrls.length === 1 ? 'video' : 'videos'}
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
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.3,
  },

  // Hero Card
  heroCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '500',
  },
  heroInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  athleteName: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  trendBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
  },
  levelBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0,
  },
  ctaButton: {
    paddingVertical: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
    height: Components.buttonCompact.height,
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: -0.1,
  },

  // Stats in hero card
  divider: {
    height: 1,
    opacity: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statDivider: {
    width: 1,
    height: 40,
    opacity: 0.5,
  },

  // Section header
  sectionHeader: {
    gap: Spacing.xs / 2,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Session list
  sessionList: {
    gap: Spacing.sm,
  },
  sessionCard: {
    padding: Spacing.sm,
    gap: Spacing.xs,
    position: 'relative',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs / 2,
  },
  sessionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  needsNotesBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  needsNotesText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  rating: {
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs / 2,
  },
  skillChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
  },
  skillText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0,
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
    right: Spacing.sm,
    top: Spacing.sm,
  },
});
