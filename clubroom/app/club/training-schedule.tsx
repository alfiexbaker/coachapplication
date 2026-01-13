import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { groupSessionService } from '@/services/group-session-service';
import { getClubMembershipForUser, getClubById, getClubSquads } from '@/constants/mock-data';
import { hasChildren } from '@/utils/user-helpers';
import type { GroupSession, ClubSquad } from '@/constants/types';

type ViewMode = 'list' | 'calendar';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function TrainingCard({
  session,
  index,
  userHasChildrenView,
}: {
  session: GroupSession;
  index: number;
  userHasChildrenView: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const nextDate = groupSessionService.getNextTrainingDate(session);
  const dayName = session.recurringPattern
    ? groupSessionService.formatDayOfWeek(session.recurringPattern.dayOfWeek)
    : '';

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard
        style={styles.trainingCard}
        onPress={() => router.push({
          pathname: '/group-sessions/[id]',
          params: { id: session.id },
        })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
              {session.title}
            </ThemedText>
            {session.squadName && (
              <View style={[styles.squadBadge, { backgroundColor: `${palette.tint}15` }]}>
                <ThemedText style={{ color: palette.tint, fontSize: 11, fontWeight: '600' }}>
                  {session.squadName}
                </ThemedText>
              </View>
            )}
          </View>
          {session.pricePerParticipant === 0 ? (
            <View style={[styles.freeBadge, { backgroundColor: `${palette.success}15` }]}>
              <ThemedText style={{ color: palette.success, fontSize: 12, fontWeight: '700' }}>
                FREE
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
              {groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
            </ThemedText>
          )}
        </View>

        <View style={styles.cardDetails}>
          {/* Recurring pattern */}
          {session.isRecurring && session.recurringPattern && (
            <View style={styles.detailRow}>
              <View style={[styles.iconCircle, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="repeat" size={14} color={palette.tint} />
              </View>
              <ThemedText style={{ color: palette.text }}>
                Every {dayName} at {session.recurringPattern.startTime}
              </ThemedText>
            </View>
          )}

          {/* Next session */}
          {nextDate && (
            <View style={styles.detailRow}>
              <View style={[styles.iconCircle, { backgroundColor: `${palette.warning}15` }]}>
                <Ionicons name="calendar" size={14} color={palette.warning} />
              </View>
              <ThemedText style={{ color: palette.text }}>
                Next: {new Date(nextDate.date).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })} - {nextDate.startTime} to {nextDate.endTime}
              </ThemedText>
            </View>
          )}

          {/* Location */}
          <View style={styles.detailRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${palette.muted}15` }]}>
              <Ionicons name="location" size={14} color={palette.muted} />
            </View>
            <ThemedText style={{ color: palette.muted }} numberOfLines={1}>
              {session.location}
            </ThemedText>
          </View>

          {/* Participants */}
          <View style={styles.detailRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${palette.muted}15` }]}>
              <Ionicons name="people" size={14} color={palette.muted} />
            </View>
            <ThemedText style={{ color: palette.muted }}>
              {session.currentParticipants}/{session.maxParticipants} participants
            </ThemedText>
            {session.waitlistCount > 0 && (
              <ThemedText style={{ color: palette.warning, fontSize: 12 }}>
                (+{session.waitlistCount} waitlist)
              </ThemedText>
            )}
          </View>
        </View>

        {/* Coach info */}
        <View style={[styles.coachSection, { borderTopColor: palette.border }]}>
          {session.coachPhotoUrl ? (
            <Image source={{ uri: session.coachPhotoUrl }} style={styles.coachPhoto} />
          ) : (
            <View style={[styles.coachPhotoPlaceholder, { backgroundColor: palette.border }]}>
              <Ionicons name="person" size={14} color={palette.muted} />
            </View>
          )}
          <ThemedText style={{ color: palette.muted, flex: 1, fontSize: 13 }}>
            Coach {session.coachName}
          </ThemedText>
          {userHasChildrenView && (
            <TouchableOpacity
              style={[styles.rsvpButton, { backgroundColor: palette.tint }]}
            >
              <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                RSVP
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

function WeeklyCalendarView({
  sessions,
  userHasChildrenView,
}: {
  sessions: GroupSession[];
  userHasChildrenView: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Group sessions by day of week
  const sessionsByDay = DAYS.map((_, dayIndex) =>
    sessions.filter((s) => s.recurringPattern?.dayOfWeek === dayIndex)
  );

  return (
    <View style={styles.calendarContainer}>
      {DAYS.map((day, dayIndex) => {
        const daySessions = sessionsByDay[dayIndex];
        return (
          <View key={day} style={[styles.calendarDay, { borderColor: palette.border }]}>
            <View style={[styles.dayHeader, { backgroundColor: palette.surface }]}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 13 }}>
                {day}
              </ThemedText>
            </View>
            <View style={styles.dayContent}>
              {daySessions.length > 0 ? (
                daySessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={[styles.calendarSession, { backgroundColor: `${palette.tint}10` }]}
                    onPress={() => router.push({
                      pathname: '/group-sessions/[id]',
                      params: { id: session.id },
                    })}
                  >
                    <ThemedText
                      style={{ color: palette.tint, fontSize: 11, fontWeight: '600' }}
                      numberOfLines={1}
                    >
                      {session.title}
                    </ThemedText>
                    <ThemedText style={{ color: palette.muted, fontSize: 10 }}>
                      {session.recurringPattern?.startTime}
                    </ThemedText>
                  </TouchableOpacity>
                ))
              ) : (
                <ThemedText style={{ color: palette.muted, fontSize: 10, textAlign: 'center' }}>
                  -
                </ThemedText>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function TrainingScheduleScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [trainingSessions, setTrainingSessions] = useState<GroupSession[]>([]);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');

  const userHasChildren = hasChildren(currentUser);
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const membership = getClubMembershipForUser(currentUser.id);
      if (membership) {
        const club = getClubById(membership.clubId);
        setClubName(club?.name || 'Club');
        setSquads(getClubSquads(membership.clubId));
        const sessions = await groupSessionService.getClubTrainingSessions(membership.clubId);
        setTrainingSessions(sessions);
      }
    } catch (error) {
      console.error('Failed to load training sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = selectedSquadId
    ? trainingSessions.filter((s) => s.squadId === selectedSquadId)
    : trainingSessions;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Training Schedule</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {clubName}
          </ThemedText>
        </View>
        {isCoach && (
          <Clickable
            onPress={() => router.push('/group-sessions/create')}
            style={[styles.addButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Clickable>
        )}
      </View>

      {/* View mode toggle */}
      <View style={[styles.viewToggle, { backgroundColor: palette.surface }]}>
        <TouchableOpacity
          style={[
            styles.toggleOption,
            viewMode === 'list' && { backgroundColor: palette.tint },
          ]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons
            name="list"
            size={18}
            color={viewMode === 'list' ? '#fff' : palette.muted}
          />
          <ThemedText
            style={{ color: viewMode === 'list' ? '#fff' : palette.muted, fontSize: 13 }}
          >
            List
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleOption,
            viewMode === 'calendar' && { backgroundColor: palette.tint },
          ]}
          onPress={() => setViewMode('calendar')}
        >
          <Ionicons
            name="calendar"
            size={18}
            color={viewMode === 'calendar' ? '#fff' : palette.muted}
          />
          <ThemedText
            style={{ color: viewMode === 'calendar' ? '#fff' : palette.muted, fontSize: 13 }}
          >
            Week
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Squad filter */}
      {squads.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: !selectedSquadId ? palette.tint : palette.surface,
                borderColor: !selectedSquadId ? palette.tint : palette.border,
              },
            ]}
            onPress={() => setSelectedSquadId(null)}
          >
            <ThemedText
              style={{ color: !selectedSquadId ? '#fff' : palette.text, fontSize: 13 }}
            >
              All Squads
            </ThemedText>
          </TouchableOpacity>
          {squads.map((squad) => (
            <TouchableOpacity
              key={squad.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedSquadId === squad.id ? palette.tint : palette.surface,
                  borderColor: selectedSquadId === squad.id ? palette.tint : palette.border,
                },
              ]}
              onPress={() => setSelectedSquadId(squad.id)}
            >
              <ThemedText
                style={{ color: selectedSquadId === squad.id ? '#fff' : palette.text, fontSize: 13 }}
              >
                {squad.name}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
          </View>
        ) : filteredSessions.length === 0 ? (
          <EmptyState
            icon="football-outline"
            title="No training sessions"
            message={
              selectedSquadId
                ? 'No training sessions for this squad yet'
                : 'No training sessions scheduled'
            }
          />
        ) : viewMode === 'list' ? (
          <View style={styles.list}>
            {filteredSessions.map((session, index) => (
              <TrainingCard
                key={session.id}
                session={session}
                index={index}
                userHasChildrenView={userHasChildren}
              />
            ))}
          </View>
        ) : (
          <WeeklyCalendarView sessions={filteredSessions} userHasChildrenView={userHasChildren} />
        )}

        {/* Parent-specific: Attendance summary */}
        {userHasChildren && filteredSessions.length > 0 && (
          <SurfaceCard style={styles.attendanceCard}>
            <View style={styles.attendanceHeader}>
              <Ionicons name="checkmark-circle" size={20} color={palette.success} />
              <ThemedText type="defaultSemiBold">Attendance Record</ThemedText>
            </View>
            <View style={styles.attendanceStats}>
              <View style={styles.attendanceStat}>
                <ThemedText type="heading" style={{ color: palette.success }}>
                  12
                </ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                  Attended
                </ThemedText>
              </View>
              <View style={[styles.attendanceDivider, { backgroundColor: palette.border }]} />
              <View style={styles.attendanceStat}>
                <ThemedText type="heading" style={{ color: palette.warning }}>
                  2
                </ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                  Missed
                </ThemedText>
              </View>
              <View style={[styles.attendanceDivider, { backgroundColor: palette.border }]} />
              <View style={styles.attendanceStat}>
                <ThemedText type="heading" style={{ color: palette.tint }}>
                  86%
                </ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                  Rate
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
  },
  filterScroll: {
    marginTop: Spacing.md,
    flexGrow: 0,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  list: {
    gap: Spacing.md,
  },
  trainingCard: {
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleSection: {
    flex: 1,
    gap: Spacing.xs,
    marginRight: Spacing.md,
  },
  squadBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  freeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  cardDetails: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  coachPhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  coachPhotoPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  calendarContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  calendarDay: {
    flex: 1,
    borderRadius: Radii.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dayHeader: {
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  dayContent: {
    padding: 4,
    gap: 4,
    minHeight: 80,
  },
  calendarSession: {
    padding: 4,
    borderRadius: 4,
    gap: 2,
  },
  attendanceCard: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  attendanceStat: {
    alignItems: 'center',
    gap: 4,
  },
  attendanceDivider: {
    width: 1,
    height: 40,
  },
});
