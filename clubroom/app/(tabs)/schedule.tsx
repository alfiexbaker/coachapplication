import { useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilityTemplate, SessionOffering } from '@/constants/types';
import { WeeklyScheduleView } from '@/components/coach/weekly-schedule-view';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ScheduleHub');

type HubSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  stat?: string | number;
  color?: string;
};

export default function ScheduleHubScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [sessionOfferings, setSessionOfferings] = useState<SessionOffering[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Load availability templates
    try {
      const data = await availabilityService.getTemplates(currentUser.id);
      setTemplates(data);

      // Calculate weekly hours
      const hours = data.reduce((total, t) => {
        const [startH, startM] = t.startTime.split(':').map(Number);
        const [endH, endM] = t.endTime.split(':').map(Number);
        return total + (endH * 60 + endM - startH * 60 - startM) / 60;
      }, 0);
      setWeeklyHours(hours);
      logger.debug('Loaded templates', { count: data.length, weeklyHours: hours });
    } catch (err) {
      logger.error('Failed to load templates', err);
      setError('Failed to load availability');
    }

    // Load session offerings
    try {
      const stored = await AsyncStorage.getItem('session_offerings');
      if (stored) {
        const offerings: SessionOffering[] = JSON.parse(stored);
        const myOfferings = offerings.filter(o => o.coachId === currentUser.id);
        setSessionOfferings(myOfferings);

        // Count upcoming sessions
        const now = new Date();
        const upcoming = myOfferings.filter(o =>
          new Date(o.scheduledAt) >= now || o.isRecurring
        );
        setUpcomingCount(upcoming.length);
        logger.debug('Loaded session offerings', { total: myOfferings.length, upcoming: upcoming.length });
      } else {
        setSessionOfferings([]);
        setUpcomingCount(0);
      }
    } catch (err) {
      logger.error('Failed to load offerings', err);
    }

    // Load bookings for weekly view
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const coachBookings = await availabilityService.getCoachBookings(
        currentUser.id,
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
      );
      setBookings(coachBookings);
      logger.debug('Loaded bookings', { count: coachBookings.length });
    } catch (err) {
      logger.error('Failed to load bookings', err);
    }

    setLoading(false);
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Navigation handlers with logging
  const handleNavigate = useCallback((route: string, label: string) => {
    logger.press(label, { route });
    router.push(route as any);
  }, []);

  const hubSections: HubSection[] = [
    {
      id: 'availability',
      title: 'Availability',
      subtitle: 'Set your weekly coaching hours',
      icon: 'time-outline',
      route: '/(tabs)/availability',
      stat: `${templates.length} slots`,
      color: palette.success,
    },
    {
      id: 'rules',
      title: 'Scheduling Rules',
      subtitle: 'Booking notice, buffer time & more',
      icon: 'settings-outline',
      route: '/availability/scheduling-rules',
      color: palette.warning,
    },
    {
      id: 'bookings',
      title: 'Bookings',
      subtitle: 'Upcoming and past sessions',
      icon: 'calendar-number-outline',
      route: '/(tabs)/bookings',
      stat: `${upcomingCount} upcoming`,
      color: palette.accent,
    },
  ];

  // Quick stats for the header area
  const quickStats = [
    { label: 'Weekly Hours', value: `${weeklyHours.toFixed(0)}h` },
    { label: 'Time Slots', value: templates.length },
    { label: 'Upcoming', value: upcomingCount },
  ];

  // Get next session for preview
  const nextSession = sessionOfferings
    .filter(o => new Date(o.scheduledAt) >= new Date())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  // Loading state
  if (loading) {
    return (
      <PageContainer
        header={<PageHeader title="Schedule" subtitle="Manage your calendar and bookings" />}
        gap={Spacing.md}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading your schedule...
          </ThemedText>
        </View>
      </PageContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <PageContainer
        header={<PageHeader title="Schedule" subtitle="Manage your calendar and bookings" />}
        gap={Spacing.md}
      >
        <SurfaceCard style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.error} />
          <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
            Something went wrong
          </ThemedText>
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>
            {error}
          </ThemedText>
          <Clickable
            style={[styles.retryButton, { backgroundColor: palette.tint }]}
            onPress={loadData}
          >
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </Clickable>
        </SurfaceCard>
      </PageContainer>
    );
  }

  // Check if user has any data set up
  const hasNoData = templates.length === 0 && sessionOfferings.length === 0;

  return (
    <PageContainer
      header={<PageHeader title="Schedule" subtitle="Manage your calendar and bookings" />}
      gap={Spacing.md}
    >
      {/* Quick Stats Row */}
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <View style={styles.statsRow}>
          {quickStats.map((stat) => (
            <SurfaceCard
              key={stat.label}
              style={[styles.statCard, { borderColor: palette.border }]}
            >
              <ThemedText type="heading" style={styles.statValue}>
                {stat.value}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                {stat.label}
              </ThemedText>
            </SurfaceCard>
          ))}
        </View>
      </Animated.View>

      {/* Empty State for new coaches */}
      {hasNoData && (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.emptyStateCard}>
            <View style={[styles.emptyIconContainer, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="calendar-outline" size={40} color={palette.tint} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Set Up Your Schedule
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: palette.muted }]}>
              Start by adding your availability and creating your first session offering.
            </ThemedText>
            <View style={styles.emptyActions}>
              <Clickable
                style={[styles.emptyActionButton, { backgroundColor: palette.tint }]}
                onPress={() => handleNavigate('/availability', 'EmptyState-SetAvailability')}
              >
                <Ionicons name="time-outline" size={18} color="#FFFFFF" />
                <ThemedText style={styles.emptyActionText}>Set Availability</ThemedText>
              </Clickable>
              <Clickable
                style={[styles.emptyActionButtonOutline, { borderColor: palette.tint }]}
                onPress={() => handleNavigate('/sessions/create', 'EmptyState-CreateSession')}
              >
                <Ionicons name="add-circle-outline" size={18} color={palette.tint} />
                <ThemedText style={[styles.emptyActionText, { color: palette.tint }]}>
                  Create Session
                </ThemedText>
              </Clickable>
            </View>
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Hub Sections */}
      <View style={styles.sectionsContainer}>
        {hubSections.map((section, index) => (
          <Animated.View
            key={section.id}
            entering={FadeInDown.delay(100 + index * 50).springify()}
          >
            <Clickable onPress={() => handleNavigate(section.route, `HubSection-${section.id}`)}>
              <SurfaceCard style={styles.sectionCard}>
                <View style={styles.sectionRow}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: `${section.color || palette.tint}15` },
                    ]}
                  >
                    <Ionicons
                      name={section.icon}
                      size={24}
                      color={section.color || palette.tint}
                    />
                  </View>
                  <View style={styles.sectionContent}>
                    <View style={styles.sectionTitleRow}>
                      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                        {section.title}
                      </ThemedText>
                      {section.stat && (
                        <Chip dense>{section.stat}</Chip>
                      )}
                    </View>
                    <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                      {section.subtitle}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                </View>
              </SurfaceCard>
            </Clickable>
          </Animated.View>
        ))}
      </View>

      {/* Weekly Schedule View */}
      {!hasNoData && (
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <WeeklyScheduleView
            bookings={bookings}
            offerings={sessionOfferings}
          />
        </Animated.View>
      )}

      {/* Next Session Preview */}
      {nextSession ? (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <SurfaceCard
            style={styles.previewCard}
            onPress={() => handleNavigate('/bookings', 'NextSession-ViewBookings')}
          >
            <View style={styles.previewHeader}>
              <ThemedText type="defaultSemiBold">Next Session</ThemedText>
              <Chip dense active>
                {new Date(nextSession.scheduledAt).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Chip>
            </View>
            <View style={styles.previewContent}>
              <View style={styles.previewDetails}>
                <ThemedText type="subtitle">{nextSession.title}</ThemedText>
                <View style={styles.previewMeta}>
                  <Ionicons name="time-outline" size={14} color={palette.muted} />
                  <ThemedText style={{ color: palette.muted }}>
                    {new Date(nextSession.scheduledAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </ThemedText>
                  <Ionicons name="location-outline" size={14} color={palette.muted} />
                  <ThemedText style={{ color: palette.muted }}>
                    {nextSession.location}
                  </ThemedText>
                </View>
                <View style={styles.previewMeta}>
                  <Ionicons name="people-outline" size={14} color={palette.muted} />
                  <ThemedText style={{ color: palette.muted }}>
                    {nextSession.registrations.length}/{nextSession.maxParticipants} registered
                  </ThemedText>
                </View>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>
      ) : !hasNoData && (
        // Empty state for no upcoming sessions (but user has data)
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <SurfaceCard style={styles.noSessionCard}>
            <View style={styles.noSessionContent}>
              <Ionicons name="calendar-clear-outline" size={32} color={palette.muted} />
              <View style={styles.noSessionText}>
                <ThemedText type="defaultSemiBold">No Upcoming Sessions</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                  Create a new session to get started
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(350).springify()}>
        <View style={styles.quickActions}>
          <Clickable
            style={[styles.actionButton, { backgroundColor: palette.tint }]}
            onPress={() => handleNavigate('/sessions/create', 'QuickAction-CreateSession')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <ThemedText style={styles.actionButtonText}>Create Session</ThemedText>
          </Clickable>
          <Clickable
            style={[styles.actionButtonSecondary, { borderColor: palette.border }]}
            onPress={() => handleNavigate('/availability', 'QuickAction-EditAvailability')}
          >
            <Ionicons name="time-outline" size={20} color={palette.tint} />
            <ThemedText style={[styles.actionButtonTextSecondary, { color: palette.tint }]}>
              Edit Availability
            </ThemedText>
          </Clickable>
        </View>
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  // Loading state styles
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  // Error state styles
  errorCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Empty state styles
  emptyStateCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  emptyActionButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // No session card
  noSessionCard: {
    padding: Spacing.lg,
  },
  noSessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  noSessionText: {
    flex: 1,
    gap: 2,
  },
  // Main content styles
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionsContainer: {
    gap: Spacing.sm,
  },
  sectionCard: {
    padding: Spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContent: {
    flex: 1,
    gap: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  previewCard: {
    gap: Spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  previewDetails: {
    flex: 1,
    gap: 6,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    fontWeight: '700',
    fontSize: 15,
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
    fontWeight: '700',
    fontSize: 15,
  },
});
