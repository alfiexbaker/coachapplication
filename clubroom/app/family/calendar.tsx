import { useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { createLogger } from '@/utils/logger';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { FamilyCalendar } from '@/components/family/FamilyCalendar';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  familyService,
  FamilyMember,
  FamilyCalendarEvent,
  FamilyDateRange,
} from '@/services/family-service';
import { eventService } from '@/services/event-service';

const logger = createLogger('FamilyCalendarScreen');

/**
 * Family Calendar Screen - Shows all children's sessions in one calendar view
 * Supports filtering by child and date range
 */
export default function FamilyCalendarScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<FamilyCalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dateRange, _setDateRange] = useState<FamilyDateRange>(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return {
      startDate: startOfMonth.toISOString(),
      endDate: endOfMonth.toISOString(),
    };
  });

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const [membersData, bookingsData, clubEventsData] = await Promise.all([
        familyService.getFamilyMembers(currentUser.id),
        familyService.getFamilyCalendar(currentUser.id, dateRange),
        eventService.getEventsForCalendar(
          currentUser.id,
          dateRange.startDate,
          dateRange.endDate
        ),
      ]);

      // Convert club events to calendar format and combine with bookings
      const clubEventsAsCalendar: FamilyCalendarEvent[] = clubEventsData.map((event) => ({
        id: event.id,
        title: event.title,
        start: `${event.date}T${event.startTime}`,
        end: `${event.date}T${event.endTime}`,
        status: 'CONFIRMED' as const,
        childId: '', // Club events don't belong to a specific child
        childName: 'Club Event',
        colorCode: '#6366F1', // Default color for club events
        coachId: '',
        coachName: event.location,
        location: event.location,
        price: 0,
        type: 'EVENT' as const,
        eventType: event.eventType,
      }));

      setMembers(membersData);
      // Combine bookings and club events, sort by date
      const allEvents = [...bookingsData, ...clubEventsAsCalendar].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
      setEvents(allEvents);
    } catch (error) {
      logger.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, dateRange]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleEventPress = (event: FamilyCalendarEvent) => {
    // Check if it's a club event or a booking
    if ((event as any).type === 'EVENT') {
      router.push({
        pathname: '/events/[id]',
        params: { id: event.id },
      });
    } else {
      router.push({
        pathname: '/(tabs)/bookings/[id]',
        params: { id: event.id },
      });
    }
  };

  const handleChildFilterChange = (childId: string | null) => {
    setSelectedChildId(childId);
  };

  // Calculate stats for the current month
  const monthStats = {
    totalSessions: events.filter(
      (e) =>
        (e.status === 'CONFIRMED' || e.status === 'PENDING') &&
        (!selectedChildId || e.childId === selectedChildId)
    ).length,
    completedSessions: events.filter(
      (e) =>
        e.status === 'COMPLETED' &&
        (!selectedChildId || e.childId === selectedChildId)
    ).length,
  };

  if (loading) {
    return (
      <PageContainer
        header={
          <PageHeader
            title="Family Calendar"
            subtitle="All sessions in one view"
            showBack
          />
        }
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading calendar...
          </ThemedText>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={
        <PageHeader
          title="Family Calendar"
          subtitle="All sessions in one view"
          showBack
        />
      }
      gap={Spacing.md}
    >
      {/* Month Stats */}
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <View style={styles.statsRow}>
          <SurfaceCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="calendar" size={20} color={palette.tint} />
            </View>
            <View style={styles.statText}>
              <ThemedText style={styles.statValue}>{monthStats.totalSessions}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Upcoming
              </ThemedText>
            </View>
          </SurfaceCard>
          <SurfaceCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${palette.success}15` }]}>
              <Ionicons name="checkmark-circle" size={20} color={palette.success} />
            </View>
            <View style={styles.statText}>
              <ThemedText style={styles.statValue}>{monthStats.completedSessions}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Completed
              </ThemedText>
            </View>
          </SurfaceCard>
        </View>
      </Animated.View>

      {/* Legend */}
      {members.length > 1 && (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.legendCard}>
            <ThemedText style={[styles.legendTitle, { color: palette.muted }]}>
              Color Legend
            </ThemedText>
            <View style={styles.legendItems}>
              {members.map((member) => (
                <View key={member.id} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: member.colorCode }]}
                  />
                  <ThemedText style={styles.legendName}>
                    {member.name.split(' ')[0]}
                  </ThemedText>
                </View>
              ))}
            </View>
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Calendar */}
      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <FamilyCalendar
          events={events}
          members={members}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onEventPress={handleEventPress}
          selectedChildId={selectedChildId}
          onChildFilterChange={handleChildFilterChange}
        />
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <View style={styles.quickActions}>
          <Clickable
            onPress={() => router.push('/(tabs)/more')}
            style={[styles.actionButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <ThemedText style={styles.actionButtonText}>Book Session</ThemedText>
          </Clickable>
          <Clickable
            onPress={() => router.push('/family/spending')}
            style={[styles.actionButtonSecondary, { borderColor: palette.border }]}
          >
            <Ionicons name="wallet-outline" size={20} color={palette.tint} />
            <ThemedText style={[styles.actionButtonTextSecondary, { color: palette.tint }]}>
              View Spending
            </ThemedText>
          </Clickable>
        </View>
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
  legendCard: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    fontSize: 13,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
  actionButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '700',
  },
});
