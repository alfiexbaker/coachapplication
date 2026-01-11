/**
 * Today's Sessions Dashboard
 *
 * Shows coaches a quick view of what's happening today:
 * - All sessions scheduled for today (1:1, group, matches, events)
 * - Session state indicators (upcoming, in progress, awaiting check-in, completed)
 * - Quick check-in actions for group sessions
 * - Empty state with next upcoming session info
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  RefreshControl,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { matchService } from '@/services/match-service';
import { eventService } from '@/services/event-service';
import { createLogger } from '@/utils/logger';

import type {
  SessionOffering,
  BookingSummary,
  Match,
  ClubEvent,
  GroupSession,
} from '@/constants/types';

const logger = createLogger('TodayDashboard');

// ============================================================================
// TYPES
// ============================================================================

export type SessionState = 'upcoming' | 'in_progress' | 'awaiting_checkin' | 'completed';

export type SessionType = '1on1' | 'group' | 'match' | 'event';

export interface TodaySession {
  id: string;
  type: SessionType;
  title: string;
  subtitle?: string;
  startTime: string;
  endTime?: string;
  location: string;
  state: SessionState;
  // Attendance tracking
  attendance?: {
    total: number;
    checkedIn: number;
  };
  // For check-in
  participants?: Array<{
    id: string;
    name: string;
    checkedIn: boolean;
  }>;
  // Original data reference
  originalData: SessionOffering | BookingSummary | Match | ClubEvent | GroupSession;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getFormattedDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
}

function formatTimeRange(startTime: string, endTime?: string): string {
  const formatTime = (time: string) => {
    const { hours, minutes } = parseTime(time);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (endTime) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }
  return formatTime(startTime);
}

function getSessionState(startTime: string, endTime?: string, hasAttendance?: boolean): SessionState {
  const now = new Date();
  const today = getTodayDateString();

  const startDate = new Date(`${today}T${startTime}:00`);
  const endDate = endTime ? new Date(`${today}T${endTime}:00`) : new Date(startDate.getTime() + 60 * 60 * 1000);

  if (now < startDate) {
    return 'upcoming';
  }

  if (now >= startDate && now <= endDate) {
    return 'in_progress';
  }

  // Past end time
  if (hasAttendance) {
    return 'completed';
  }
  return 'awaiting_checkin';
}

function getTypeLabel(type: SessionType): string {
  switch (type) {
    case '1on1':
      return '1:1';
    case 'group':
      return 'Group Training';
    case 'match':
      return 'Match';
    case 'event':
      return 'Event';
    default:
      return type;
  }
}

function getStateConfig(state: SessionState, palette: typeof Colors.light) {
  switch (state) {
    case 'upcoming':
      return {
        color: palette.muted,
        label: 'Upcoming',
        icon: 'time-outline' as const,
        pulse: false,
      };
    case 'in_progress':
      return {
        color: palette.success,
        label: 'In Progress',
        icon: 'play-circle' as const,
        pulse: true,
      };
    case 'awaiting_checkin':
      return {
        color: palette.warning,
        label: 'Awaiting Check-in',
        icon: 'alert-circle' as const,
        pulse: false,
      };
    case 'completed':
      return {
        color: palette.tint,
        label: 'Completed',
        icon: 'checkmark-circle' as const,
        pulse: false,
      };
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface TodayDashboardProps {
  embedded?: boolean; // When true, renders without SafeAreaView/header for embedding
}

export default function TodayDashboardScreen({ embedded = false }: TodayDashboardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [sessions, setSessions] = useState<TodaySession[]>([]);
  const [nextSession, setNextSession] = useState<TodaySession | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check-in modal state
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TodaySession | null>(null);
  const [checkInState, setCheckInState] = useState<Record<string, boolean>>({});

  const todayString = getTodayDateString();
  const formattedDate = getFormattedDate();

  // Load sessions on mount and focus
  const loadSessions = useCallback(async () => {
    if (!currentUser) return;

    try {
      logger.debug('Loading today sessions for coach', { coachId: currentUser.id });

      const todaySessions: TodaySession[] = [];
      let upcomingSession: TodaySession | null = null;

      // 1. Load 1:1 session bookings from AsyncStorage
      const storedBookings = await AsyncStorage.getItem('session_bookings');
      if (storedBookings) {
        const bookings: any[] = JSON.parse(storedBookings);
        const todayBookings = bookings.filter((b) => {
          const bookingDate = b.scheduledAt?.split('T')[0];
          return bookingDate === todayString && b.coachId === currentUser.id;
        });

        for (const booking of todayBookings) {
          const bookingTime = new Date(booking.scheduledAt);
          const startTime = bookingTime.toTimeString().slice(0, 5);
          const endTime = new Date(bookingTime.getTime() + 60 * 60 * 1000)
            .toTimeString()
            .slice(0, 5);

          todaySessions.push({
            id: booking.id,
            type: '1on1',
            title: `Session with ${booking.athleteName}`,
            subtitle: booking.service || 'Coaching Session',
            startTime,
            endTime,
            location: booking.location || 'TBD',
            state: getSessionState(startTime, endTime, booking.status === 'COMPLETED'),
            originalData: booking,
          });
        }

        // Find next upcoming 1:1 session
        const futureBookings = bookings.filter((b) => {
          const bookingDate = b.scheduledAt?.split('T')[0];
          return bookingDate > todayString && b.coachId === currentUser.id;
        });
        if (futureBookings.length > 0) {
          futureBookings.sort(
            (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
          );
          const next = futureBookings[0];
          const nextTime = new Date(next.scheduledAt);
          upcomingSession = {
            id: next.id,
            type: '1on1',
            title: `Session with ${next.athleteName}`,
            startTime: nextTime.toTimeString().slice(0, 5),
            location: next.location || 'TBD',
            state: 'upcoming',
            originalData: next,
          };
        }
      }

      // 2. Load session offerings (group sessions)
      const storedOfferings = await AsyncStorage.getItem('session_offerings');
      if (storedOfferings) {
        const offerings: SessionOffering[] = JSON.parse(storedOfferings);
        const todayOfferings = offerings.filter((o) => {
          const offeringDate = o.scheduledAt?.split('T')[0];
          return offeringDate === todayString && o.coachId === currentUser.id;
        });

        for (const offering of todayOfferings) {
          const offeringTime = new Date(offering.scheduledAt);
          const startTime = offeringTime.toTimeString().slice(0, 5);
          const endTime = new Date(offeringTime.getTime() + 90 * 60 * 1000)
            .toTimeString()
            .slice(0, 5);

          const participants =
            offering.registrations?.map((r) => ({
              id: r.userId,
              name: r.userName,
              checkedIn: r.status === 'completed',
            })) || [];

          todaySessions.push({
            id: offering.id,
            type: offering.sessionType === 'group' ? 'group' : '1on1',
            title: offering.title,
            subtitle: offering.description,
            startTime,
            endTime,
            location: offering.location,
            state: getSessionState(
              startTime,
              endTime,
              participants.some((p) => p.checkedIn)
            ),
            attendance: {
              total: offering.maxParticipants,
              checkedIn: participants.filter((p) => p.checkedIn).length,
            },
            participants,
            originalData: offering,
          });
        }
      }

      // 3. Load matches for today
      try {
        // Get club ID from user's club membership
        const storedClubMembership = await AsyncStorage.getItem('club_membership');
        if (storedClubMembership) {
          const membership = JSON.parse(storedClubMembership);
          const matches = await matchService.getClubMatches(membership.clubId);
          const todayMatches = matches.filter((m) => m.date === todayString);

          for (const match of todayMatches) {
            const availablePlayers = match.selectedPlayers.filter(
              (p) => p.status === 'AVAILABLE' || p.status === 'SELECTED'
            );
            const checkedInPlayers = match.selectedPlayers.filter(
              (p) => p.status === 'SELECTED'
            );

            todaySessions.push({
              id: match.id,
              type: 'match',
              title: match.title,
              subtitle: `vs ${match.opponent}`,
              startTime: match.kickoffTime,
              endTime: undefined, // Matches don't have fixed end time
              location: match.venue,
              state: getSessionState(
                match.kickoffTime,
                undefined,
                match.status === 'COMPLETED'
              ),
              attendance: {
                total: match.maxPlayers,
                checkedIn: checkedInPlayers.length,
              },
              participants: match.selectedPlayers.map((p) => ({
                id: p.athleteId,
                name: p.athleteName,
                checkedIn: p.status === 'SELECTED',
              })),
              originalData: match,
            });
          }
        }
      } catch (error) {
        logger.error('Failed to load matches', error);
      }

      // 4. Load club events for today
      try {
        const storedClubMembership = await AsyncStorage.getItem('club_membership');
        if (storedClubMembership) {
          const membership = JSON.parse(storedClubMembership);
          const events = await eventService.getUpcomingEvents(membership.clubId);
          const todayEvents = events.filter((e) => e.date === todayString);

          for (const event of todayEvents) {
            const goingAttendees = event.attendees.filter((a) => a.status === 'GOING');

            todaySessions.push({
              id: event.id,
              type: 'event',
              title: event.title,
              subtitle: eventService.formatEventType(event.eventType),
              startTime: event.startTime,
              endTime: event.endTime,
              location: event.venue,
              state: getSessionState(
                event.startTime,
                event.endTime,
                event.status === 'COMPLETED'
              ),
              attendance: {
                total: event.maxAttendees || 0,
                checkedIn: goingAttendees.length,
              },
              originalData: event,
            });
          }
        }
      } catch (error) {
        logger.error('Failed to load events', error);
      }

      // Sort sessions by start time
      todaySessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

      setSessions(todaySessions);
      setNextSession(upcomingSession);
      logger.debug('Loaded today sessions', { count: todaySessions.length });
    } catch (error) {
      logger.error('Failed to load sessions', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, todayString]);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  // Auto-refresh every minute to update session states
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions((prev) =>
        prev.map((s) => ({
          ...s,
          state: getSessionState(s.startTime, s.endTime, s.state === 'completed'),
        }))
      );
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const handleCheckIn = (session: TodaySession) => {
    setSelectedSession(session);
    // Initialize check-in state from participants
    const initialState: Record<string, boolean> = {};
    session.participants?.forEach((p) => {
      initialState[p.id] = p.checkedIn;
    });
    setCheckInState(initialState);
    setCheckInModalVisible(true);
  };

  const handleToggleCheckIn = (participantId: string) => {
    setCheckInState((prev) => ({
      ...prev,
      [participantId]: !prev[participantId],
    }));
  };

  const handleMarkAllPresent = () => {
    const allPresent: Record<string, boolean> = {};
    selectedSession?.participants?.forEach((p) => {
      allPresent[p.id] = true;
    });
    setCheckInState(allPresent);
  };

  const handleSaveCheckIn = async () => {
    if (!selectedSession) return;

    try {
      // Update the session offerings in AsyncStorage
      const storedOfferings = await AsyncStorage.getItem('session_offerings');
      if (storedOfferings) {
        const offerings: SessionOffering[] = JSON.parse(storedOfferings);
        const index = offerings.findIndex((o) => o.id === selectedSession.id);

        if (index !== -1) {
          // Update registration statuses
          offerings[index].registrations = offerings[index].registrations.map((r) => ({
            ...r,
            status: checkInState[r.userId] ? 'completed' : r.status,
          }));
          await AsyncStorage.setItem('session_offerings', JSON.stringify(offerings));
        }
      }

      // Update local state
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === selectedSession.id) {
            const checkedInCount = Object.values(checkInState).filter(Boolean).length;
            return {
              ...s,
              state: checkedInCount > 0 ? 'completed' : s.state,
              participants: s.participants?.map((p) => ({
                ...p,
                checkedIn: checkInState[p.id] || false,
              })),
              attendance: {
                total: s.attendance?.total || 0,
                checkedIn: checkedInCount,
              },
            };
          }
          return s;
        })
      );

      setCheckInModalVisible(false);
      setSelectedSession(null);
      logger.debug('Check-in saved', { sessionId: selectedSession.id });
    } catch (error) {
      logger.error('Failed to save check-in', error);
    }
  };

  const handleStartFeedback = (session: TodaySession) => {
    router.push(`/bookings/session-feedback?sessionId=${session.id}`);
  };

  const handleViewDetails = (session: TodaySession) => {
    if (session.type === 'match') {
      // Navigate to match details
      router.push(`/club/matches/${session.id}` as any);
    } else if (session.type === 'event') {
      // Navigate to event details
      router.push(`/club/events/${session.id}` as any);
    } else {
      // Navigate to session details
      router.push(`/bookings/${session.id}`);
    }
  };

  const handleCreateSession = () => {
    router.push('/bookings');
  };

  // Count sessions by state
  const sessionCounts = useMemo(() => {
    return {
      total: sessions.length,
      inProgress: sessions.filter((s) => s.state === 'in_progress').length,
      awaitingCheckIn: sessions.filter((s) => s.state === 'awaiting_checkin').length,
      completed: sessions.filter((s) => s.state === 'completed').length,
    };
  }, [sessions]);

  // Render the main content
  const content = (
    <>
      {/* Header - only show when not embedded */}
      {!embedded && (
        <ThemedView style={styles.header}>
          <View>
            <ThemedText type="title">Today's Sessions</ThemedText>
            <ThemedText style={[styles.dateText, { color: palette.muted }]}>
              {formattedDate}
            </ThemedText>
          </View>
          {sessions.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: palette.tint }]}>
              <ThemedText style={styles.countText} lightColor="#FFFFFF" darkColor="#000000">
                {sessions.length}
              </ThemedText>
            </View>
          )}
        </ThemedView>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        {/* Quick Stats */}
        {sessions.length > 0 && (
          <View style={styles.statsRow}>
            <View style={[styles.statItem, { backgroundColor: palette.success + '15' }]}>
              <ThemedText style={[styles.statValue, { color: palette.success }]}>
                {sessionCounts.inProgress}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                In Progress
              </ThemedText>
            </View>
            <View style={[styles.statItem, { backgroundColor: palette.warning + '15' }]}>
              <ThemedText style={[styles.statValue, { color: palette.warning }]}>
                {sessionCounts.awaitingCheckIn}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Awaiting
              </ThemedText>
            </View>
            <View style={[styles.statItem, { backgroundColor: palette.tint + '15' }]}>
              <ThemedText style={[styles.statValue, { color: palette.tint }]}>
                {sessionCounts.completed}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Completed
              </ThemedText>
            </View>
          </View>
        )}

        {/* Sessions List */}
        {sessions.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="calendar-outline"
              title="No sessions today"
              message={
                nextSession
                  ? `Next session: ${nextSession.title} at ${formatTimeRange(nextSession.startTime)}`
                  : 'You have no upcoming sessions scheduled.'
              }
              actionLabel="Create Session"
              onPressAction={handleCreateSession}
            />
          </View>
        ) : (
          sessions.map((session) => (
            <TodaySessionCard
              key={session.id}
              session={session}
              onCheckIn={() => handleCheckIn(session)}
              onStartFeedback={() => handleStartFeedback(session)}
              onViewDetails={() => handleViewDetails(session)}
            />
          ))
        )}
      </ScrollView>

      {/* Check-In Modal */}
      <Modal
        visible={checkInModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCheckInModalVisible(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">Check In</ThemedText>
            <Clickable onPress={() => setCheckInModalVisible(false)}>
              <Ionicons name="close" size={24} color={palette.foreground} />
            </Clickable>
          </View>

          {selectedSession && (
            <>
              <ThemedText style={styles.modalSessionTitle}>{selectedSession.title}</ThemedText>
              <ThemedText style={[styles.modalSessionTime, { color: palette.muted }]}>
                {formatTimeRange(selectedSession.startTime, selectedSession.endTime)}
              </ThemedText>

              <Clickable
                onPress={handleMarkAllPresent}
                style={[styles.markAllButton, { backgroundColor: palette.tint + '15' }]}>
                <Ionicons name="checkmark-done" size={20} color={palette.tint} />
                <ThemedText style={[styles.markAllText, { color: palette.tint }]}>
                  Mark All Present
                </ThemedText>
              </Clickable>

              <FlatList
                data={selectedSession.participants}
                keyExtractor={(item) => item.id}
                style={styles.participantsList}
                renderItem={({ item }) => (
                  <Clickable
                    onPress={() => handleToggleCheckIn(item.id)}
                    style={styles.participantRow}>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: checkInState[item.id] ? palette.success : palette.border,
                          backgroundColor: checkInState[item.id] ? palette.success : 'transparent',
                        },
                      ]}>
                      {checkInState[item.id] && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <ThemedText style={styles.participantName}>{item.name}</ThemedText>
                  </Clickable>
                )}
                ListEmptyComponent={
                  <ThemedText style={[styles.emptyParticipants, { color: palette.muted }]}>
                    No participants registered
                  </ThemedText>
                }
              />

              <Clickable
                onPress={handleSaveCheckIn}
                style={[styles.saveButton, { backgroundColor: palette.tint }]}>
                <ThemedText style={styles.saveButtonText} lightColor="#FFFFFF" darkColor="#000000">
                  Save Check-In
                </ThemedText>
              </Clickable>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );

  // When embedded, return content directly without SafeAreaView wrapper
  if (embedded) {
    return (
      <View style={[styles.embeddedContainer, { backgroundColor: palette.background }]}>
        {content}
      </View>
    );
  }

  // When standalone, wrap in SafeAreaView
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {content}
    </SafeAreaView>
  );
}

// ============================================================================
// SESSION CARD COMPONENT
// ============================================================================

interface TodaySessionCardProps {
  session: TodaySession;
  onCheckIn: () => void;
  onStartFeedback: () => void;
  onViewDetails: () => void;
}

function TodaySessionCard({
  session,
  onCheckIn,
  onStartFeedback,
  onViewDetails,
}: TodaySessionCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const stateConfig = getStateConfig(session.state, palette);

  const showCheckIn =
    session.type !== '1on1' &&
    (session.state === 'in_progress' || session.state === 'awaiting_checkin');

  const showFeedback =
    session.state === 'awaiting_checkin' || session.state === 'completed';

  return (
    <SurfaceCard
      style={styles.sessionCard}
      outlineGradient={
        session.state === 'in_progress'
          ? [palette.success, palette.success + '40']
          : undefined
      }
      onPress={onViewDetails}>
      {/* Time and State Row */}
      <View style={styles.cardTopRow}>
        <ThemedText type="defaultSemiBold" style={styles.timeText}>
          {formatTimeRange(session.startTime, session.endTime)}
        </ThemedText>
        <View
          style={[
            styles.stateBadge,
            { backgroundColor: stateConfig.color + '15' },
          ]}>
          <Ionicons name={stateConfig.icon} size={14} color={stateConfig.color} />
          <ThemedText style={[styles.stateText, { color: stateConfig.color }]}>
            {stateConfig.label}
          </ThemedText>
        </View>
      </View>

      {/* Type Badge */}
      <View
        style={[
          styles.typeBadge,
          {
            backgroundColor:
              session.type === 'match'
                ? palette.warning + '20'
                : session.type === 'event'
                  ? '#8B5CF6' + '20'
                  : palette.tint + '15',
          },
        ]}>
        <ThemedText
          style={[
            styles.typeText,
            {
              color:
                session.type === 'match'
                  ? palette.warning
                  : session.type === 'event'
                    ? '#8B5CF6'
                    : palette.tint,
            },
          ]}>
          {getTypeLabel(session.type)}
        </ThemedText>
      </View>

      {/* Title and Subtitle */}
      <ThemedText type="defaultSemiBold" style={styles.sessionTitle}>
        {session.title}
      </ThemedText>
      {session.subtitle && (
        <ThemedText style={[styles.sessionSubtitle, { color: palette.muted }]}>
          {session.subtitle}
        </ThemedText>
      )}

      {/* Location */}
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={16} color={palette.icon} />
        <ThemedText style={[styles.locationText, { color: palette.muted }]}>
          {session.location}
        </ThemedText>
      </View>

      {/* Attendance */}
      {session.attendance && session.attendance.total > 0 && (
        <View style={styles.attendanceRow}>
          <Ionicons name="people-outline" size={16} color={palette.icon} />
          <ThemedText style={[styles.attendanceText, { color: palette.muted }]}>
            {session.attendance.checkedIn > 0
              ? `${session.attendance.checkedIn}/${session.attendance.total} checked in`
              : `${session.attendance.total} registered`}
          </ThemedText>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        {showCheckIn && (
          <Clickable
            onPress={onCheckIn}
            style={[styles.actionButton, { backgroundColor: palette.success + '15' }]}>
            <Ionicons name="checkbox-outline" size={18} color={palette.success} />
            <ThemedText style={[styles.actionText, { color: palette.success }]}>
              Check In
            </ThemedText>
          </Clickable>
        )}
        {showFeedback && (
          <Clickable
            onPress={onStartFeedback}
            style={[styles.actionButton, { backgroundColor: palette.tint + '15' }]}>
            <Ionicons name="create-outline" size={18} color={palette.tint} />
            <ThemedText style={[styles.actionText, { color: palette.tint }]}>
              Feedback
            </ThemedText>
          </Clickable>
        )}
        <Clickable
          onPress={onViewDetails}
          style={[styles.actionButton, { backgroundColor: palette.border }]}>
          <Ionicons name="eye-outline" size={18} color={palette.foreground} />
          <ThemedText style={styles.actionText}>Details</ThemedText>
        </Clickable>
      </View>
    </SurfaceCard>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  embeddedContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  dateText: {
    fontSize: 14,
    marginTop: 2,
  },
  countBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontWeight: '700',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    paddingTop: Spacing.xl,
  },
  sessionCard: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 15,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  stateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionTitle: {
    fontSize: 17,
  },
  sessionSubtitle: {
    fontSize: 14,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendanceText: {
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radii.md,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalSessionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalSessionTime: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  markAllText: {
    fontWeight: '600',
  },
  participantsList: {
    flex: 1,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantName: {
    fontSize: 16,
  },
  emptyParticipants: {
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  saveButton: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
});
