import { useMemo, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { apiClient } from '@/services/api-client';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Components , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  getSessionsForCoach,
  getUserById,
  formatDate,
} from '@/constants/mock-data';
import type { Session, User, Booking } from '@/constants/app-types';
import { bookingService } from '@/services/booking-service';
import { createLogger } from '@/utils/logger';

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
  const [awaitingCompletion, setAwaitingCompletion] = useState<Booking[]>([]);

  const loadAwaitingCompletion = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const bookings = await bookingService.getAwaitingCompletion(currentUser.id);
      setAwaitingCompletion(bookings);
    } catch (error) {
      logger.error('Failed to load awaiting completion', error);
    }
  }, [currentUser?.id]);

  // Load sessions needing completion on focus
  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id) {
        loadAwaitingCompletion();
      }
    }, [currentUser?.id, loadAwaitingCompletion])
  );

  // Load sessions from both mock data and AsyncStorage
  useEffect(() => {
    const loadSessions = async () => {
      if (!currentUser) return;

      try {
        // Get mock data sessions
        const mockSessions = getSessionsForCoach(currentUser.id);

        // Get stored sessions (both from bookings and manual add)
        const asyncSessions = await apiClient.get<Session[]>('coach_sessions', []);
        const coachAsyncSessions = asyncSessions.filter(
          (s) => s.coachId === currentUser.id
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

  logger.debug('Coach development screen rendered', {
    athleteCount: athletesWithSessions.length,
    coachId: currentUser.id,
  });

  const quickActions = [
    { icon: 'calendar-number' as const, label: 'Bookings', route: '/(tabs)/bookings', color: '#DC2626' },
    { icon: 'chatbubbles' as const, label: 'Messages', route: '/(tabs)/messages', color: '#2563EB' },
    { icon: 'calendar' as const, label: 'Schedule', route: '/(tabs)/schedule', color: '#059669' },
    { icon: 'people' as const, label: 'Athletes', route: '/(tabs)/athletes', color: palette.tint },
    { icon: 'paper-plane' as const, label: 'Send Invite', route: '/session-invites/create', color: '#7C3AED' },
  ];

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
        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          {quickActions.map((action) => (
            <Clickable
              key={action.route}
              onPress={() => router.push(action.route as Href)}
              style={styles.quickActionItem}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: withAlpha(action.color, 0.09) }]}>
                <Ionicons name={action.icon} size={20} color={action.color} />
              </View>
              <ThemedText style={[styles.quickActionLabel, { color: palette.text }]}>
                {action.label}
              </ThemedText>
            </Clickable>
          ))}
        </View>

        {/* Sessions to Complete Card */}
        {awaitingCompletion.length > 0 && (
          <SurfaceCard style={[styles.sectionCard, styles.completionCard]}>
            <View style={styles.completionHeader}>
              <View style={[styles.completionIconCircle, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                <Ionicons name="clipboard-outline" size={20} color={palette.warning} />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                {awaitingCompletion.length} session{awaitingCompletion.length !== 1 ? 's' : ''} need completing
              </ThemedText>
            </View>

            {awaitingCompletion.slice(0, 3).map((booking) => {
              const sessionDate = new Date(booking.scheduledAt);
              const isToday = sessionDate.toDateString() === new Date().toDateString();
              const timeStr = sessionDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
              const dateStr = isToday ? `Today ${timeStr}` : sessionDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ` ${timeStr}`;

              return (
                <Pressable
                  key={booking.id}
                  style={({ pressed }) => [
                    styles.completionRow,
                    { borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => router.push(Routes.sessionComplete(booking.id))}
                >
                  <View style={styles.completionRowContent}>
                    <ThemedText type="defaultSemiBold" style={styles.completionRowTitle} numberOfLines={1}>
                      {booking.service || 'Session'} {booking.athleteName ? `with ${booking.athleteName}` : ''}
                    </ThemedText>
                    <ThemedText style={[styles.completionRowMeta, { color: palette.muted }]}>
                      {dateStr}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                </Pressable>
              );
            })}

            <ThemedText style={[styles.completionHint, { color: palette.muted }]}>
              Tap to mark attendance & add notes
            </ThemedText>
          </SurfaceCard>
        )}

        <SurfaceCard style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
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
                    router.push(Routes.developmentAthlete(entry.athlete.id));
                  }}
                  style={[styles.rowCard, styles.attentionCard, { borderColor: palette.border }]}
                >
                  <View style={styles.rowTop}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                        <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                          {entry.athlete.avatar || entry.athlete.name.charAt(0)}
                        </ThemedText>
                        {entry.needsNotes && (
                          <View style={[styles.badge, { backgroundColor: palette.error }]} />
                        )}
                      </View>
                      <View style={styles.rowContent}>
                        <ThemedText type="defaultSemiBold" style={styles.athleteName} numberOfLines={1}>
                          {entry.athlete.name}
                        </ThemedText>
                        <ThemedText style={[styles.subtleMeta, { color: palette.muted }]}>
                          {entry.sessionCount} sessions · Last {formatDate(entry.lastSession)}
                        </ThemedText>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                  </View>

                  <View style={styles.actionRow}>
                    {entry.needsNotes && (
                      <View style={[styles.pill, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
                        <Ionicons name="document-text" size={12} color={palette.error} />
                        <ThemedText style={[styles.pillLabel, { color: palette.error }]}>Add notes</ThemedText>
                      </View>
                    )}
                    {entry.averageRating < 4 && (
                      <View style={[styles.pill, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                        <Ionicons name="trending-up" size={12} color={palette.tint} />
                        <ThemedText style={[styles.pillLabel, { color: palette.tint }]}>Boost rating</ThemedText>
                      </View>
                    )}
                    {entry.daysSinceLast >= 10 && (
                      <View style={[styles.pill, { backgroundColor: withAlpha(palette.icon, 0.06) }]}>
                        <Ionicons name="time" size={12} color={palette.icon} />
                        <ThemedText style={[styles.pillLabel, { color: palette.icon }]}>Reach out</ThemedText>
                      </View>
                    )}
                  </View>
                </Clickable>
              ))}
            </View>
          )}
        </SurfaceCard>

        <SurfaceCard style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Recent sessions
            </ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              Open feedback to share notes or badges
            </ThemedText>
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
                    <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
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
                      logger.press('SessionFeedbackOpen', {
                        sessionId: session.id,
                        athleteId: session.athleteId,
                        source: 'RecentSessions',
                      });
                      router.push(Routes.developmentSession(session.id));
                    }}
                  >
                    <View style={[styles.actionPill, { borderColor: palette.tint }]}>
                      <Ionicons name="create-outline" size={14} color={palette.tint} />
                      <ThemedText style={[styles.pillLabel, { color: palette.tint }]}>Open feedback</ThemedText>
                    </View>
                  </Clickable>
                </View>
              );
            })}
          </View>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}

const styles = StyleSheet.create({
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  quickActionItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
    flex: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { ...Typography.caption },
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
  sectionTitle: { ...Typography.heading, letterSpacing: -0.2 },
  sectionHint: { ...Typography.caption },
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
  attentionCard: {
    alignItems: 'stretch',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xxs,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  pillLabel: { ...Typography.caption, letterSpacing: -0.1 },
  subtleMeta: { ...Typography.caption, lineHeight: 18 },
  avatar: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  avatarText: { ...Typography.heading },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: Radii.sm,
    borderWidth: 2,
    borderColor: '#1F2025',
  },
  athleteDetails: {
    flex: 1,
    gap: Spacing.micro,
  },
  athleteName: { ...Typography.bodySemiBold, letterSpacing: -0.1 },
  athleteMetadata: { ...Typography.small, lineHeight: 18,
    fontWeight: '400' },


  // Sessions to complete card
  completionCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.warning,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  completionRowContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  completionRowTitle: { ...Typography.bodySmall, letterSpacing: -0.1 },
  completionRowMeta: { ...Typography.caption },
  completionHint: { ...Typography.caption, textAlign: 'center' },

  // Empty state
  emptyState: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: Components.listItem.large,
    height: Components.listItem.large,
    borderRadius: Components.listItem.large / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: { ...Typography.heading, letterSpacing: -0.2 },
  emptyText: { ...Typography.bodySmall, lineHeight: 20,
    textAlign: 'center',
    maxWidth: 260 },
});
