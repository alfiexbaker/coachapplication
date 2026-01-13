import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ScheduleSession {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  athleteName?: string;
  athleteCount?: number;
  type: 'booking' | 'offering';
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface DaySchedule {
  date: Date;
  dayName: string;
  dayShort: string;
  dateNum: number;
  isToday: boolean;
  sessions: ScheduleSession[];
}

interface WeeklyScheduleViewProps {
  bookings: any[];
  offerings: any[];
  onSessionPress?: (sessionId: string, type: 'booking' | 'offering') => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getEndTime(startDateStr: string, durationMinutes: number = 60): string {
  const date = new Date(startDateStr);
  date.setMinutes(date.getMinutes() + durationMinutes);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function WeeklyScheduleView({ bookings, offerings, onSessionPress }: WeeklyScheduleViewProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    // Default to today
    const today = new Date();
    return today.getDay();
  });

  // Generate this week's days
  const getWeekDays = useCallback((): DaySchedule[] => {
    const today = new Date();
    const currentDay = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - currentDay); // Start from Sunday

    const days: DaySchedule[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayShorts = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Get sessions for this day
      const daySessions: ScheduleSession[] = [];

      // Add bookings
      bookings.forEach((booking: any) => {
        const bookingDate = booking.scheduledAt?.split('T')[0];
        if (bookingDate === dateStr && booking.status !== 'CANCELLED') {
          daySessions.push({
            id: booking.id,
            title: booking.service || 'Session',
            startTime: formatTime(booking.scheduledAt),
            endTime: getEndTime(booking.scheduledAt, booking.duration || 60),
            location: booking.location,
            athleteName: booking.athleteName,
            type: 'booking',
            status: booking.status === 'CONFIRMED' ? 'confirmed' : 'pending',
          });
        }
      });

      // Add offerings
      offerings.forEach((offering: any) => {
        const offeringDate = offering.scheduledAt?.split('T')[0];
        if (offeringDate === dateStr && offering.status !== 'cancelled') {
          daySessions.push({
            id: offering.id,
            title: offering.title,
            startTime: formatTime(offering.scheduledAt),
            endTime: getEndTime(offering.scheduledAt, offering.duration || 60),
            location: offering.location,
            athleteCount: offering.registrations?.filter((r: any) => r.status === 'confirmed').length || 0,
            type: 'offering',
            status: 'confirmed',
          });
        }
      });

      // Sort by start time
      daySessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

      days.push({
        date,
        dayName: dayNames[i],
        dayShort: dayShorts[i],
        dateNum: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
        sessions: daySessions,
      });
    }

    return days;
  }, [bookings, offerings]);

  const weekDays = getWeekDays();
  const selectedDay = weekDays[selectedDayIndex];

  const handleSessionPress = (session: ScheduleSession) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onSessionPress) {
      onSessionPress(session.id, session.type);
    } else {
      router.push(`/booking/${session.id}`);
    }
  };

  return (
    <SurfaceCard style={styles.container}>
      {/* Week Header with Day Selector */}
      <View style={styles.weekHeader}>
        <ThemedText type="defaultSemiBold" style={styles.weekTitle}>
          This Week
        </ThemedText>
        <View style={styles.weekMeta}>
          <ThemedText style={[styles.weekMetaText, { color: palette.muted }]}>
            {weekDays.filter(d => d.sessions.length > 0).length} days with sessions
          </ThemedText>
        </View>
      </View>

      {/* Day Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayPillsScroll}>
        <View style={styles.dayPillsContainer}>
          {weekDays.map((day, index) => {
            const isSelected = selectedDayIndex === index;
            const hasSession = day.sessions.length > 0;

            return (
              <Clickable
                key={day.dayShort}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDayIndex(index);
                }}
                style={[
                  styles.dayPill,
                  {
                    backgroundColor: isSelected
                      ? palette.tint
                      : day.isToday
                      ? `${palette.tint}15`
                      : palette.background,
                    borderColor: isSelected
                      ? palette.tint
                      : day.isToday
                      ? palette.tint
                      : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.dayPillText,
                    { color: isSelected ? '#fff' : day.isToday ? palette.tint : palette.muted },
                  ]}
                >
                  {day.dayShort}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.dayPillDate,
                    { color: isSelected ? '#fff' : palette.text },
                  ]}
                >
                  {day.dateNum}
                </ThemedText>
                {hasSession && !isSelected && (
                  <View style={[styles.dayDot, { backgroundColor: palette.success }]} />
                )}
              </Clickable>
            );
          })}
        </View>
      </ScrollView>

      {/* Selected Day Sessions */}
      <View style={styles.sessionsContainer}>
        <View style={styles.selectedDayHeader}>
          <ThemedText type="defaultSemiBold">
            {selectedDay.dayName}
            {selectedDay.isToday && (
              <ThemedText style={{ color: palette.tint }}> (Today)</ThemedText>
            )}
          </ThemedText>
          <ThemedText style={[styles.sessionCount, { color: palette.muted }]}>
            {selectedDay.sessions.length} session{selectedDay.sessions.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>

        {selectedDay.sessions.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: palette.background }]}>
            <Ionicons name="calendar-outline" size={32} color={palette.muted} />
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              No sessions scheduled
            </ThemedText>
            {selectedDay.isToday && (
              <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
                Time for a break?
              </ThemedText>
            )}
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {selectedDay.sessions.map((session, index) => (
              <Clickable
                key={session.id}
                onPress={() => handleSessionPress(session)}
                style={[
                  styles.sessionCard,
                  {
                    backgroundColor: palette.background,
                    borderColor: palette.border,
                    borderLeftColor:
                      session.status === 'pending'
                        ? palette.warning
                        : session.type === 'offering'
                        ? palette.accent
                        : palette.success,
                  },
                ]}
              >
                <View style={styles.sessionTimeBlock}>
                  <ThemedText type="defaultSemiBold" style={[styles.sessionTime, { color: palette.text }]}>
                    {session.startTime}
                  </ThemedText>
                  <View style={[styles.sessionTimeLine, { backgroundColor: palette.border }]} />
                  <ThemedText style={[styles.sessionEndTime, { color: palette.muted }]}>
                    {session.endTime}
                  </ThemedText>
                </View>

                <View style={styles.sessionDetails}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {session.title}
                  </ThemedText>

                  <View style={styles.sessionMeta}>
                    {session.athleteName && (
                      <View style={styles.metaItem}>
                        <Ionicons name="person-outline" size={12} color={palette.muted} />
                        <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                          {session.athleteName}
                        </ThemedText>
                      </View>
                    )}
                    {session.athleteCount !== undefined && (
                      <View style={styles.metaItem}>
                        <Ionicons name="people-outline" size={12} color={palette.muted} />
                        <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                          {session.athleteCount} registered
                        </ThemedText>
                      </View>
                    )}
                    {session.location && (
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={12} color={palette.muted} />
                        <ThemedText style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                          {session.location}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.sessionStatus}>
                  {session.status === 'pending' && (
                    <View style={[styles.statusBadge, { backgroundColor: `${palette.warning}15` }]}>
                      <ThemedText style={[styles.statusText, { color: palette.warning }]}>
                        Pending
                      </ThemedText>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                </View>
              </Clickable>
            ))}
          </View>
        )}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekTitle: {
    fontSize: 16,
  },
  weekMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  weekMetaText: {
    fontSize: 12,
  },
  dayPillsScroll: {
    marginHorizontal: -Spacing.md,
  },
  dayPillsContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  dayPill: {
    width: 48,
    height: 64,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayPillDate: {
    fontSize: 18,
    fontWeight: '700',
  },
  dayDot: {
    position: 'absolute',
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  sessionsContainer: {
    gap: Spacing.sm,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionCount: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  emptySubtext: {
    fontSize: 12,
  },
  sessionsList: {
    gap: Spacing.sm,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderLeftWidth: 3,
    gap: Spacing.md,
  },
  sessionTimeBlock: {
    alignItems: 'center',
    minWidth: 50,
  },
  sessionTime: {
    fontSize: 14,
  },
  sessionTimeLine: {
    width: 1,
    height: 10,
    marginVertical: 2,
  },
  sessionEndTime: {
    fontSize: 12,
  },
  sessionDetails: {
    flex: 1,
    gap: 4,
  },
  sessionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
