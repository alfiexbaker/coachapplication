import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  getSessionsForCoach,
  getUserById,
  MOCK_SESSIONS,
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

  logger.debug('Coach development screen rendered', {
    athleteCount: athletesWithSessions.length,
    coachId: currentUser.id
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Development
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Track your athletes' progress
          </ThemedText>
        </View>

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
                s => s.athleteId === athlete.id
              );

              return (
                <Clickable
                  key={athlete.id}
                  onPress={() => {
                    logger.press('AthleteCard', {
                      athleteId: athlete.id,
                      athleteName: athlete.name,
                      sessionCount
                    });

                    // Show athlete details with their recent sessions
                    const recentSessions = athleteSessions
                      .slice(0, 3)
                      .map(s => `• ${s.skillsWorkedOn.join(', ')} (${s.performanceRating}/5 ⭐)`)
                      .join('\n');

                    Alert.alert(
                      `${athlete.name}`,
                      `📊 Total Sessions: ${sessionCount}\n⭐ Average Rating: ${averageRating.toFixed(1)}/5\n📅 Last Session: ${formatDate(lastSession)}\n\n🎯 Recent Focus Areas:\n${recentSessions || 'No sessions yet'}`,
                      [
                        {
                          text: 'View All Sessions',
                          onPress: () => {
                            logger.info('Navigate to athlete sessions', { athleteId: athlete.id });
                            // Navigate to bookings filtered by this athlete
                            router.push('/(tabs)/bookings');
                          }
                        },
                        {
                          text: 'Close',
                          style: 'cancel'
                        }
                      ]
                    );
                  }}
                  style={({ pressed }) => [
                    styles.athleteCard,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <SurfaceCard style={styles.cardContent}>
                  <View style={styles.athleteInfo}>
                    <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
                      <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                        {athlete.avatar || athlete.name.charAt(0)}
                      </ThemedText>
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

                  <View style={styles.stats}>
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
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  athleteList: {
    gap: Spacing.md,
  },
  athleteCard: {
    borderRadius: Radii.lg,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  athleteInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  athleteDetails: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  athleteName: {
    fontSize: 16,
  },
  athleteMetadata: {
    fontSize: 13,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.xl,
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing['2xl'] + Spacing.lg,
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
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 260,
  },
});
