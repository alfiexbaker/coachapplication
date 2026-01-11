import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { safeJsonParse } from '@/utils/safe-json';
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

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

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
    } catch (error) {
      console.error('Failed to load templates:', error);
    }

    // Load session offerings
    try {
      const stored = await AsyncStorage.getItem('session_offerings');
      if (stored) {
        const offerings = safeJsonParse<SessionOffering[]>(stored, []);
        const myOfferings = offerings.filter(o => o.coachId === currentUser.id);
        setSessionOfferings(myOfferings);

        // Count upcoming sessions
        const now = new Date();
        const upcoming = myOfferings.filter(o =>
          new Date(o.scheduledAt) >= now || o.isRecurring
        );
        setUpcomingCount(upcoming.length);
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const hubSections: HubSection[] = [
    {
      id: 'calendar',
      title: 'Calendar',
      subtitle: 'View and manage your schedule',
      icon: 'calendar-outline',
      route: '/(tabs)/availability',
      stat: `${weeklyHours.toFixed(0)}h/week`,
      color: palette.tint,
    },
    {
      id: 'availability',
      title: 'Availability',
      subtitle: 'Set recurring time slots',
      icon: 'time-outline',
      route: '/(tabs)/availability',
      stat: `${templates.length} slots`,
      color: palette.success,
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

  return (
    <PageContainer
      header={<PageHeader title="Schedule" subtitle="Manage your calendar and bookings" />}
      gap={Spacing.md}
    >
      {/* Quick Stats Row */}
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <View style={styles.statsRow}>
          {quickStats.map((stat, index) => (
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

      {/* Hub Sections */}
      <View style={styles.sectionsContainer}>
        {hubSections.map((section, index) => (
          <Animated.View
            key={section.id}
            entering={FadeInDown.delay(100 + index * 50).springify()}
          >
            <Clickable onPress={() => router.push(section.route as any)}>
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

      {/* Next Session Preview */}
      {nextSession && (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <SurfaceCard
            style={styles.previewCard}
            onPress={() => router.push('/(tabs)/bookings')}
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
      )}

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(350).springify()}>
        <View style={styles.quickActions}>
          <Clickable
            style={[styles.actionButton, { backgroundColor: palette.tint }]}
            onPress={() => router.push('/(tabs)/bookings')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <ThemedText style={styles.actionButtonText}>Create Session</ThemedText>
          </Clickable>
          <Clickable
            style={[styles.actionButtonSecondary, { borderColor: palette.border }]}
            onPress={() => router.push('/(tabs)/availability')}
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
