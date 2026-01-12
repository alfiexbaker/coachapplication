import { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { AttendeeList } from '@/components/event/AttendeeList';
import { CheckInButton } from '@/components/event/CheckInButton';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type {
  ClubEvent,
  EventRSVP,
  EventAttendance,
  EventAttendanceStats,
  CheckInInput,
} from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';

export default function EventAttendeesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [rsvps, setRSVPs] = useState<EventRSVP[]>([]);
  const [attendance, setAttendance] = useState<EventAttendance[]>([]);
  const [stats, setStats] = useState<EventAttendanceStats | null>(null);
  const [currentAttendance, setCurrentAttendance] = useState<EventAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!id || !currentUser) return;
    try {
      const [eventData, rsvpsData, attendanceData, statsData, userAttendance] = await Promise.all([
        eventService.getEvent(id),
        eventService.getEventRSVPs(id),
        eventService.getAttendeeList(id),
        eventService.getAttendanceStats(id),
        eventService.getUserAttendance(id, currentUser.id),
      ]);

      setEvent(eventData);
      setRSVPs(rsvpsData);
      setAttendance(attendanceData);
      setStats(statsData);
      setCurrentAttendance(userAttendance);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, currentUser]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCheckIn = async (input: CheckInInput) => {
    await eventService.checkIn(input);
    await loadData();
  };

  const handleUndoCheckIn = async () => {
    if (!id || !currentUser) return;
    await eventService.removeCheckIn(id, currentUser.id);
    await loadData();
  };

  const handleAttendeePress = (userId: string) => {
    // Could navigate to user profile or show details modal
    console.log('Attendee pressed:', userId);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>
            Event not found
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const isEventToday = eventService.isEventToday(event);
  const checkInAvailable = eventService.isCheckInAvailable(event);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerContent}>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle} numberOfLines={1}>
            Attendees
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]} numberOfLines={1}>
            {event.title}
          </ThemedText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Check-in section (only on event day) */}
      {(isEventToday || checkInAvailable || currentAttendance) && currentUser && (
        <View style={styles.checkInSection}>
          <SurfaceCard style={styles.checkInCard}>
            {isEventToday && (
              <View style={styles.todayBadge}>
                <Ionicons name="today" size={14} color={palette.success} />
                <ThemedText style={[styles.todayText, { color: palette.success }]}>
                  Event is today
                </ThemedText>
              </View>
            )}
            <CheckInButton
              event={event}
              userId={currentUser.id}
              userName={currentUser.name || 'Unknown'}
              userRole={isCoach ? 'COACH' : 'PARENT'}
              userPhotoUrl={currentUser.avatar}
              currentAttendance={currentAttendance}
              onCheckIn={handleCheckIn}
              onUndoCheckIn={handleUndoCheckIn}
            />
          </SurfaceCard>
        </View>
      )}

      {/* Attendee list */}
      <View style={styles.listContainer}>
        <AttendeeList
          rsvps={rsvps}
          attendance={attendance}
          stats={stats || undefined}
          onAttendeePress={handleAttendeePress}
          showFilters={true}
          showStats={true}
          loading={refreshing}
          emptyMessage="No RSVPs yet. Be the first to respond!"
        />
      </View>

      {/* Coach quick actions */}
      {isCoach && (
        <View style={[styles.coachActions, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
          <Clickable
            style={[styles.coachActionButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={() => {
              // Export attendee list
              console.log('Export attendees');
            }}
          >
            <Ionicons name="download-outline" size={20} color={palette.text} />
            <ThemedText style={styles.coachActionText}>Export List</ThemedText>
          </Clickable>

          <Clickable
            style={[styles.coachActionButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={() => {
              // Send reminder to non-responders
              console.log('Send reminder');
            }}
          >
            <Ionicons name="notifications-outline" size={20} color={palette.text} />
            <ThemedText style={styles.coachActionText}>Send Reminder</ThemedText>
          </Clickable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: scaleFont(16),
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(17),
  },
  headerSubtitle: {
    fontSize: scaleFont(12),
  },
  headerSpacer: {
    width: 40,
  },
  checkInSection: {
    padding: Spacing.md,
  },
  checkInCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  todayText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  coachActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  coachActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  coachActionText: {
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
});
