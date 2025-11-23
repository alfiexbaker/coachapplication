import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { StatCard } from '@/components/primitives/stat-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  getSessionsForCoach,
  getUserById,
  formatDate,
} from '@/constants/mock-data';
import type { Session, User } from '@/constants/app-types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CoachDevelopmentScreen');

interface AthleteWithSessions {
  athlete: User;
  sessionCount: number;
  lastSession: string;
  averageRating: number;
}

export function CoachDevelopmentScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // Get all sessions for this coach and group by athlete
  const athletesWithSessions = useMemo(() => {
    if (!currentUser) return [];

    const sessions = getSessionsForCoach(currentUser.id);
    const athleteMap = new Map<string, Session[]>();

    // Group sessions by athlete
    sessions.forEach((session) => {
      const existing = athleteMap.get(session.athleteId) || [];
      athleteMap.set(session.athleteId, [...existing, session]);
    });

    // Transform into display format
    const athletes: AthleteWithSessions[] = [];
    athleteMap.forEach((athleteSessions, athleteId) => {
      const athlete = getUserById(athleteId);
      if (!athlete) return;

      const sortedSessions = [...athleteSessions].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );

      const avgRating =
        athleteSessions.reduce((sum, s) => sum + s.performanceRating, 0) / athleteSessions.length;

      athletes.push({
        athlete,
        sessionCount: athleteSessions.length,
        lastSession: sortedSessions[0].completedAt,
        averageRating: avgRating,
      });
    });

    // Sort by last session date (most recent first)
    return athletes.sort(
      (a, b) => new Date(b.lastSession).getTime() - new Date(a.lastSession).getTime()
    );
  }, [currentUser]);

  if (!currentUser) {
    logger.warn('No current user found');
    return null;
  }

  // Calculate key stats
  const allSessions = getSessionsForCoach(currentUser.id);
  const activeAthletes = athletesWithSessions.length;
  const totalSessions = allSessions.length;
  const avgRating = allSessions.length > 0
    ? (allSessions.reduce((sum, s) => sum + s.performanceRating, 0) / allSessions.length).toFixed(1)
    : '0';

  logger.debug('Coach development screen rendered', {
    athleteCount: athletesWithSessions.length,
    coachId: currentUser.id,
  });

  return (
    <PageContainer
      gap={Spacing.md}
      header={
        <PageHeader
          title="Development"
          subtitle="Track your athletes' progress"
        />
      }
    >
      {/* Key Stats Strip */}
      <SurfaceCard style={styles.statsCard}>
        <View style={styles.statsRow}>
          <StatCard
            value={activeAthletes}
            label="Active Athletes"
            variant="compact"
          />
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <StatCard
            value={totalSessions}
            label="Sessions This Week"
            variant="compact"
            trend="+4"
          />
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <StatCard
            value={avgRating}
            label="Avg Rating"
            variant="compact"
            icon={<Ionicons name="star" size={16} color={palette.tint} />}
          />
        </View>
      </SurfaceCard>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <ThemedText type="heading" style={styles.sectionTitle}>
          Athletes
        </ThemedText>
      </View>

      {/* Athletes List or Empty State */}
      {athletesWithSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
            <Ionicons name="people-outline" size={32} color={palette.icon} />
          </View>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            No sessions yet
          </ThemedText>
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            Complete your first session to start tracking athlete development
          </ThemedText>
        </View>
      ) : (
        <View style={styles.athleteList}>
          {athletesWithSessions.map(({ athlete, sessionCount, lastSession, averageRating }) => {
            // Get all sessions for this athlete
            const athleteSessions = getSessionsForCoach(currentUser.id).filter(
              (s) => s.athleteId === athlete.id
            );

            // Check if any sessions need notes
            const needsNotes = athleteSessions.some((s) => !s.notes || s.notes.trim() === '');

            return (
              <Clickable
                key={athlete.id}
                onPress={() => {
                  logger.press('AthleteCard', {
                    athleteId: athlete.id,
                    athleteName: athlete.name,
                    sessionCount,
                  });
                  router.push(`/development/athlete/${athlete.id}`);
                }}
              >
                <SurfaceCard style={styles.cardContent}>
                  <View style={styles.athleteInfo}>
                    <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
                      <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                        {athlete.avatar || athlete.name.charAt(0)}
                      </ThemedText>
                      {needsNotes && (
                        <View style={[styles.badge, { backgroundColor: palette.error }]} />
                      )}
                    </View>
                    <View style={styles.athleteDetails}>
                      <ThemedText type="defaultSemiBold" style={styles.athleteName}>
                        {athlete.name}
                      </ThemedText>
                      <ThemedText style={[styles.athleteMetadata, { color: palette.muted }]}>
                        Last session: {formatDate(lastSession)}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.statsGroup}>
                    <View style={styles.stat}>
                      <ThemedText type="defaultSemiBold" style={styles.statValue}>
                        {sessionCount}
                      </ThemedText>
                      <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                        Sessions
                      </ThemedText>
                    </View>
                    <View style={styles.stat}>
                      <View style={styles.ratingRow}>
                        <ThemedText type="defaultSemiBold" style={styles.statValue}>
                          {averageRating.toFixed(1)}
                        </ThemedText>
                        <Ionicons name="star" size={16} color={palette.tint} />
                      </View>
                      <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                        Avg Rating
                      </ThemedText>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={palette.icon} />
                </SurfaceCard>
              </Clickable>
            );
          })}
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  // Stats card at top
  statsCard: {
    padding: Spacing.md,
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
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs / 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  // Athlete list
  athleteList: {
    gap: Spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  athleteInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1F2025',
  },
  athleteDetails: {
    flex: 1,
    gap: 2,
  },
  athleteName: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  athleteMetadata: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },

  // Stats in athlete cards
  statsGroup: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 260,
  },
});
