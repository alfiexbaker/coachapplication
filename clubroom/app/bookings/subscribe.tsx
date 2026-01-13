import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SubscribeForm } from '@/components/recurring';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Typography, Radii } from '@/constants/theme';
import { CreateRecurringBookingParams } from '@/constants/types';
import { recurringBookingService } from '@/services/recurring-booking-service';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { MOCK_USERS, MOCK_COACH_PROFILES, getChildrenForParent } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import { hasChildren } from '@/utils/user-helpers';

const logger = createLogger('SubscribeScreen');

/**
 * Coach option for selection
 */
interface CoachOption {
  id: string;
  name: string;
  photoUrl?: string;
  sessionTypes: string[];
  pricePerSession: number;
  location: string;
  rating: number;
  totalSessions: number;
}

/**
 * Convert hex color to rgba with alpha
 */
function withAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '');
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * SubscribeScreen allows users to create a new recurring booking subscription.
 * It handles coach selection and form submission.
 */
export default function SubscribeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const params = useLocalSearchParams<{ coachId?: string }>();

  const [selectedCoach, setSelectedCoach] = useState<CoachOption | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Get available coaches
  const coaches = useMemo<CoachOption[]>(() => {
    const coachUsers = MOCK_USERS.filter((u) => u.role === 'COACH');
    return coachUsers.map((coach) => {
      const profile = MOCK_COACH_PROFILES.find((p) => p.userId === coach.id);
      return {
        id: coach.id,
        name: coach.name,
        photoUrl: `https://i.pravatar.cc/100?u=${coach.id}`,
        sessionTypes: profile?.specialties ?? ['1-on-1 Training'],
        pricePerSession: profile?.sessionRate ?? 50,
        location: profile?.availability?.[0]?.location ?? 'TBD',
        rating: profile?.rating ?? 4.5,
        totalSessions: profile?.totalSessions ?? 0,
      };
    });
  }, []);

  // Get athletes (children) for parent users
  const athletes = useMemo(() => {
    if (!currentUser?.id || currentUser.role === 'COACH') return undefined;

    if (hasChildren(currentUser)) {
      const children = getChildrenForParent(currentUser.id);
      return children.map((child) => ({
        id: child.id,
        name: child.name,
      }));
    }

    // For USER role, they can book for themselves
    return [{ id: currentUser.id, name: currentUser.fullName || 'Me' }];
  }, [currentUser]);

  // Pre-select coach if provided in params
  useEffect(() => {
    if (params.coachId) {
      const coach = coaches.find((c) => c.id === params.coachId);
      if (coach) {
        setSelectedCoach(coach);
      }
    }
  }, [params.coachId, coaches]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (formParams: CreateRecurringBookingParams) => {
    setSubmitting(true);

    try {
      const result = await recurringBookingService.createRecurring(formParams);

      if (result.success) {
        Alert.alert(
          'Subscription Created',
          'Your recurring booking has been set up successfully!',
          [
            {
              text: 'View Subscriptions',
              onPress: () => router.replace('/bookings/recurring'),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create subscription.');
      }
    } catch (error) {
      logger.error('Failed to create subscription', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle form cancellation
   */
  const handleCancel = () => {
    router.back();
  };

  // Show coach selection if no coach is selected
  if (!selectedCoach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Select a Coach',
            headerShown: true,
          }}
        />

        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Choose Your Coach</ThemedText>
          <ThemedText style={[styles.headerSubtext, { color: palette.muted }]}>
            Select a coach to set up recurring sessions with
          </ThemedText>
        </ThemedView>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.coachList}
          showsVerticalScrollIndicator={false}
        >
          {coaches.map((coach) => (
            <SurfaceCard
              key={coach.id}
              style={styles.coachCard}
              onPress={() => setSelectedCoach(coach)}
            >
              <View style={styles.coachRow}>
                <Image
                  source={{ uri: coach.photoUrl }}
                  style={styles.coachAvatar}
                  contentFit="cover"
                />
                <View style={styles.coachInfo}>
                  <ThemedText type="defaultSemiBold">{coach.name}</ThemedText>
                  <View style={styles.coachMeta}>
                    <Ionicons name="star" size={14} color={palette.warning} />
                    <ThemedText style={[styles.coachMetaText, { color: palette.muted }]}>
                      {coach.rating.toFixed(1)} ({coach.totalSessions} sessions)
                    </ThemedText>
                  </View>
                  <View style={styles.coachMeta}>
                    <Ionicons name="location-outline" size={14} color={palette.muted} />
                    <ThemedText style={[styles.coachMetaText, { color: palette.muted }]}>
                      {coach.location}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.coachPrice}>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
                    ${coach.pricePerSession}
                  </ThemedText>
                  <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>
                    /session
                  </ThemedText>
                </View>
              </View>

              {/* Specialties */}
              <View style={styles.specialtiesRow}>
                {coach.sessionTypes.slice(0, 3).map((specialty, index) => (
                  <View
                    key={index}
                    style={[styles.specialtyBadge, { backgroundColor: withAlpha(palette.tint, 0.1) }]}
                  >
                    <ThemedText style={[styles.specialtyText, { color: palette.tint }]}>
                      {specialty}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show subscription form once coach is selected
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'New Subscription',
          headerShown: true,
          headerLeft: () => (
            <Pressable onPress={() => setSelectedCoach(null)} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={palette.foreground} />
            </Pressable>
          ),
        }}
      />

      <SubscribeForm
        coach={{
          id: selectedCoach.id,
          name: selectedCoach.name,
          photoUrl: selectedCoach.photoUrl,
          sessionTypes: selectedCoach.sessionTypes,
          pricePerSession: selectedCoach.pricePerSession,
          location: selectedCoach.location,
        }}
        userId={currentUser?.id || 'user1'}
        userName={currentUser?.fullName || 'Guest User'}
        athletes={athletes}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitting={submitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerSubtext: {
    ...Typography.small,
    marginTop: 4,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  coachList: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  coachCard: {
    gap: Spacing.sm,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  coachAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  coachInfo: {
    flex: 1,
    gap: 2,
  },
  coachMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coachMetaText: {
    ...Typography.small,
  },
  coachPrice: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    ...Typography.caption,
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  specialtyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  specialtyText: {
    ...Typography.caption,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.body,
  },
});
