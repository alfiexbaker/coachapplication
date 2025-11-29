import { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
import { BadgeAwardModal, BADGE_REASONS } from '@/components/badges/badge-award-modal';

const logger = createLogger('CoachDevelopmentScreen');

interface AthleteWithSessions {
  athlete: User;
  sessionCount: number;
  lastSession: string;
  averageRating: number;
}

interface AthleteRosterEntry extends AthleteWithSessions {
  needsNotes: boolean;
  daysSinceLast: number;
}

export function CoachDevelopmentScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedAthleteName, setSelectedAthleteName] = useState('');

  // Load sessions from both mock data and AsyncStorage
  useEffect(() => {
    const loadSessions = async () => {
      if (!currentUser) return;

      try {
        // Get mock data sessions
        const mockSessions = getSessionsForCoach(currentUser.id);

        // Get AsyncStorage sessions (both from bookings and manual add)
        const storedSessions = await AsyncStorage.getItem('coach_sessions');
        const asyncSessions = storedSessions ? JSON.parse(storedSessions) : [];
        const coachAsyncSessions = asyncSessions.filter(
          (s: any) => s.coachId === currentUser.id
        );

        // Combine both sources
        const combined = [...mockSessions, ...coachAsyncSessions];
        setAllSessions(combined);
        logger.debug('Sessions loaded', {
          mockCount: mockSessions.length,
          asyncCount: coachAsyncSessions.length,
          total: combined.length,
        });
      } catch (error) {
        logger.error('Failed to load sessions', error);
        // Fallback to mock data only
        const mockSessions = getSessionsForCoach(currentUser.id);
        setAllSessions(mockSessions);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [currentUser]);

  // Get all sessions for this coach and group by athlete
  const athletesWithSessions = useMemo(() => {
    if (!currentUser || allSessions.length === 0) return [];

    const sessions = allSessions;
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
  }, [currentUser, allSessions]);

  const rosterEntries: AthleteRosterEntry[] = useMemo(() => {
    const now = Date.now();
    return athletesWithSessions.map((entry) => {
      const athleteSessions = allSessions.filter((s) => s.athleteId === entry.athlete.id);
      const needsNotes = athleteSessions.some((s) => !s.notes || s.notes.trim() === '');
      const lastSessionDate = new Date(entry.lastSession);
      const daysSinceLast = Math.max(
        0,
        Math.round((now - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        ...entry,
        needsNotes,
        daysSinceLast,
      };
    });
  }, [allSessions, athletesWithSessions]);

  const attentionAthletes = rosterEntries.filter(
    (entry) => entry.needsNotes || entry.averageRating < 4 || entry.daysSinceLast >= 10
  );

  const recentSessions = [...allSessions]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 5);

  const selectedSessionLabel = selectedSession
    ? `${selectedSession.nextFocusAreas?.[0] ?? 'Coaching session'} · ${formatDate(selectedSession.completedAt)}`
    : undefined;

  const selectedReasonPreset = selectedSession?.nextFocusAreas?.find((focus) => BADGE_REASONS.includes(focus));

  if (!currentUser) {
    logger.warn('No current user found');
    return null;
  }

  if (loading) {
    return (
      <PageContainer>
        <ThemedText>Loading...</ThemedText>
      </PageContainer>
    );
  }

  // Calculate key stats
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
    <>
      <PageContainer
        gap={Spacing.md}
        header={
          <PageHeader
            title="Development"
            subtitle="Track your athletes' progress"
          />
        }
      >
      <SurfaceCard style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText type="heading" style={styles.sectionTitle}>
            Development navigation
          </ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
            Jump to badges and recognition
          </ThemedText>
        </View>

        <View style={styles.navGrid}>
          <Clickable
            onPress={() => {
              logger.press('BadgesNav');
              router.push('/development/badges');
            }}
            style={[styles.navCard, { borderColor: palette.border }]}
          >
            <View style={[styles.navIcon, { backgroundColor: `${palette.tint}12` }]}>
              <Ionicons name="ribbon" size={18} color={palette.tint} />
            </View>
            <View style={styles.navCopy}>
              <ThemedText type="defaultSemiBold">Badges</ThemedText>
              <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>Award and share recognition</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.icon} />
          </Clickable>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText type="heading" style={styles.sectionTitle}>
            Overview
          </ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
            Coach view · Development spine
          </ThemedText>
        </View>
        <View style={styles.statsGrid}>
          <StatCard value={activeAthletes} label="Active Athletes" variant="compact" />
          <StatCard value={totalSessions} label="Sessions This Week" variant="compact" trend="+4" />
          <StatCard
            value={avgRating}
            label="Avg Rating"
            variant="compact"
            icon={<Ionicons name="star" size={16} color={palette.tint} />}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText type="heading" style={styles.sectionTitle}>
            Recent sessions
          </ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>Badge-ready clips</ThemedText>
        </View>

        <View style={{ gap: Spacing.xs }}>
          {recentSessions.map((session) => {
            const athlete = getUserById(session.athleteId);
            return (
              <View
                key={session.id}
                style={[styles.recentRow, { borderColor: palette.border }]}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
                    <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                      {athlete?.avatar || athlete?.name?.charAt(0) || '?'}
                    </ThemedText>
                  </View>
                  <View style={styles.rowContent}>
                    <ThemedText type="defaultSemiBold" style={styles.athleteName}>
                      {athlete?.name || 'Athlete'}
                    </ThemedText>
                    <ThemedText style={[styles.athleteMetadata, { color: palette.muted }]}>
                      {formatDate(session.completedAt)} · Rated {session.performanceRating}
                    </ThemedText>
                  </View>
                </View>

                <Clickable
                  onPress={() => {
                    setSelectedSession(session);
                    setSelectedAthleteName(athlete?.name || 'Athlete');
                    logger.info('badge_award_start', {
                      sessionId: session.id,
                      athleteId: session.athleteId,
                    });
                  }}
                >
                  <View style={[styles.actionPill, { borderColor: palette.tint }]}> 
                    <Ionicons name="ribbon-outline" size={14} color={palette.tint} />
                    <ThemedText style={[styles.pillLabel, { color: palette.tint }]}>Award badge</ThemedText>
                  </View>
                </Clickable>
              </View>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText type="heading" style={styles.sectionTitle}>
            Needs attention
          </ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
            Prioritised by recency and missing notes
          </ThemedText>
        </View>

        {attentionAthletes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
              <Ionicons name="checkmark-circle" size={28} color={palette.tint} />
            </View>
            <ThemedText type="defaultSemiBold">All caught up</ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>No athletes need follow-up right now.</ThemedText>
          </View>
        ) : (
          <View style={styles.attentionList}>
            {attentionAthletes.map((entry) => (
              <Clickable
                key={entry.athlete.id}
                onPress={() => {
                  logger.press('AttentionAthlete', {
                    athleteId: entry.athlete.id,
                    athleteName: entry.athlete.name,
                    needsNotes: entry.needsNotes,
                  });
                  router.push(`/development/athlete/${entry.athlete.id}`);
                }}
                style={[styles.rowCard, styles.attentionCard, { borderColor: palette.border }]}
              >
                <View style={styles.rowTop}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
                      <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                        {entry.athlete.avatar || entry.athlete.name.charAt(0)}
                      </ThemedText>
                      {entry.needsNotes && (
                        <View style={[styles.badge, { backgroundColor: palette.error }]} />
                      )}
                    </View>
                    <View style={styles.rowContent}>
                      <ThemedText type="defaultSemiBold" style={styles.athleteName}>
                        {entry.athlete.name}
                      </ThemedText>
                      <ThemedText style={[styles.subtleMeta, { color: palette.muted }]}>
                        {entry.sessionCount} sessions total
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    {entry.needsNotes ? (
                      <View style={[styles.pill, { backgroundColor: `${palette.error}12` }]}>
                        <Ionicons name="document-text" size={13} color={palette.error} />
                        <ThemedText style={[styles.pillLabel, { color: palette.error }]}>Add notes</ThemedText>
                      </View>
                    ) : null}
                    {entry.averageRating < 4 ? (
                      <View style={[styles.pill, { backgroundColor: `${palette.tint}12` }]}>
                        <Ionicons name="trending-up" size={13} color={palette.tint} />
                        <ThemedText style={[styles.pillLabel, { color: palette.tint }]}>Boost rating</ThemedText>
                      </View>
                    ) : null}
                    {entry.daysSinceLast >= 10 ? (
                      <View style={[styles.pill, { backgroundColor: `${palette.icon}0f` }]}>
                        <Ionicons name="time" size={13} color={palette.icon} />
                        <ThemedText style={[styles.pillLabel, { color: palette.icon }]}>Reach out</ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>

                <ThemedText style={[styles.athleteMetadata, styles.subtleMeta, { color: palette.muted }]}>
                  Last session {formatDate(entry.lastSession)}
                </ThemedText>
              </Clickable>
            ))}
          </View>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText type="heading" style={styles.sectionTitle}>
            Athlete roster
          </ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
            Tap an athlete to view their development timeline
          </ThemedText>
        </View>

        {rosterEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
              <Ionicons name="people-outline" size={32} color={palette.icon} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No sessions yet
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>Complete your first session to start tracking athlete development</ThemedText>
          </View>
        ) : (
          <View style={styles.athleteList}>
            {rosterEntries.map((entry) => (
              <Clickable
                key={entry.athlete.id}
                onPress={() => {
                  logger.press('AthleteCard', {
                    athleteId: entry.athlete.id,
                    athleteName: entry.athlete.name,
                    sessionCount: entry.sessionCount,
                  });
                  router.push(`/development/athlete/${entry.athlete.id}`);
                }}
                style={[styles.rowCard, styles.rowInline, { borderColor: palette.border }]}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
                    <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                      {entry.athlete.avatar || entry.athlete.name.charAt(0)}
                    </ThemedText>
                    {entry.needsNotes && (
                      <View style={[styles.badge, { backgroundColor: palette.error }]} />
                    )}
                  </View>
                  <View style={styles.rowContent}>
                    <ThemedText type="defaultSemiBold" style={styles.athleteName}>
                      {entry.athlete.name}
                    </ThemedText>
                    <ThemedText style={[styles.athleteMetadata, { color: palette.muted }]}>
                      Last session: {formatDate(entry.lastSession)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.statsGroup}>
                  <View style={styles.stat}>
                    <ThemedText type="defaultSemiBold" style={styles.statValue}>
                      {entry.sessionCount}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Sessions</ThemedText>
                  </View>
                  <View style={styles.stat}>
                    <View style={styles.ratingRow}>
                      <ThemedText type="defaultSemiBold" style={styles.statValue}>
                        {entry.averageRating.toFixed(1)}
                      </ThemedText>
                      <Ionicons name="star" size={16} color={palette.tint} />
                    </View>
                    <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Avg Rating</ThemedText>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color={palette.icon} />
              </Clickable>
            ))}
          </View>
        )}
      </SurfaceCard>
      </PageContainer>

      <BadgeAwardModal
        visible={!!selectedSession}
        athleteId={selectedSession?.athleteId || ''}
        athleteName={selectedAthleteName}
        coachId={currentUser.id}
        coachName={currentUser.name}
        sessionId={selectedSession?.id}
        sessionLabel={selectedSessionLabel}
        initialReason={selectedReasonPreset}
        onClose={() => setSelectedSession(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  navGrid: {
    gap: Spacing.xs,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCopy: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  recentRow: {
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  attentionList: {
    gap: Spacing.xs,
  },
  rowCard: {
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  attentionCard: {
    alignItems: 'stretch',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.rounded,
    borderWidth: 1,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  subtleMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  athleteList: {
    gap: Spacing.xs,
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
    alignItems: 'center',
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
