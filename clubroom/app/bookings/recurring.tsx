import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RecurringList } from '@/components/recurring';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Typography } from '@/constants/theme';
import { RecurringBooking } from '@/constants/types';
import { recurringBookingService } from '@/services/recurring-booking-service';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('RecurringBookingsScreen');

/**
 * RecurringBookingsScreen displays the user's recurring booking subscriptions
 * with the ability to pause, resume, or cancel them.
 */
export default function RecurringBookingsScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { currentUser } = useAuth();

  const [bookings, setBookings] = useState<RecurringBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Load recurring bookings for the current user
   */
  const loadBookings = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      let userBookings: RecurringBooking[];

      if (currentUser.role === 'COACH') {
        userBookings = await recurringBookingService.getCoachRecurringBookings(currentUser.id);
      } else {
        userBookings = await recurringBookingService.getUserRecurringBookings(currentUser.id);
      }

      setBookings(userBookings);
      logger.debug('Loaded recurring bookings', { count: userBookings.length });
    } catch (error) {
      logger.error('Failed to load recurring bookings', error);
      Alert.alert('Error', 'Failed to load recurring bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUser?.role]);

  // Load bookings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  // Seed demo data on first load if no bookings exist
  useEffect(() => {
    const seedIfEmpty = async () => {
      const allBookings = await recurringBookingService.list();
      if (allBookings.length === 0) {
        await recurringBookingService.seedDemoData();
        loadBookings();
      }
    };
    seedIfEmpty();
  }, [loadBookings]);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  }, [loadBookings]);

  /**
   * Handle pausing a subscription
   */
  const handlePause = useCallback(async (id: string, reason?: string) => {
    const result = await recurringBookingService.pauseRecurring(id, reason);

    if (result.success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? (result.data as RecurringBooking) : b))
      );
      Alert.alert('Subscription Paused', 'Your recurring booking has been paused. You can resume it anytime.');
    } else {
      Alert.alert('Error', result.error || 'Failed to pause subscription.');
    }
  }, []);

  /**
   * Handle resuming a subscription
   */
  const handleResume = useCallback(async (id: string) => {
    const result = await recurringBookingService.resumeRecurring(id);

    if (result.success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? (result.data as RecurringBooking) : b))
      );
      Alert.alert('Subscription Resumed', 'Your recurring booking has been resumed.');
    } else {
      Alert.alert('Error', result.error || 'Failed to resume subscription.');
    }
  }, []);

  /**
   * Handle cancelling a subscription
   */
  const handleCancel = useCallback(async (id: string, reason?: string) => {
    const result = await recurringBookingService.cancelRecurring(id, reason);

    if (result.success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? (result.data as RecurringBooking) : b))
      );
      Alert.alert('Subscription Cancelled', 'Your recurring booking has been cancelled.');
    } else {
      Alert.alert('Error', result.error || 'Failed to cancel subscription.');
    }
  }, []);

  /**
   * Handle card press - navigate to detail or generate bookings
   */
  const handleCardPress = useCallback((recurring: RecurringBooking) => {
    if (recurring.status !== 'ACTIVE') {
      return;
    }

    Alert.alert(
      'Generate Bookings',
      'Would you like to generate the next 4 upcoming session bookings from this subscription?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            const result = await recurringBookingService.generateUpcomingBookings(recurring.id, 4);
            if (result.success && result.data) {
              Alert.alert(
                'Bookings Generated',
                `${result.data.length} upcoming sessions have been added to your bookings.`
              );
            } else {
              Alert.alert('Error', result.error || 'Failed to generate bookings.');
            }
          },
        },
      ]
    );
  }, []);

  /**
   * Navigate to create subscription screen
   */
  const handleCreatePress = useCallback(() => {
    router.push(Routes.BOOKINGS_SUBSCRIBE);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Recurring Bookings',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading subscriptions...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Recurring Bookings',
          headerShown: true,
          headerRight: () => (
            <Clickable accessibilityLabel="Create recurring booking" onPress={handleCreatePress} style={styles.headerButton}>
              <Ionicons name="add-circle" size={28} color={palette.tint} />
            </Clickable>
          ),
        }}
      />

      {/* Header Info */}
      <ThemedView style={styles.header}>
        <ThemedText type="subtitle">
          {currentUser?.role === 'COACH' ? 'Subscriptions from Athletes' : 'My Subscriptions'}
        </ThemedText>
        <ThemedText style={[styles.headerSubtext, { color: palette.muted }]}>
          {currentUser?.role === 'COACH'
            ? 'Manage recurring sessions from your athletes'
            : 'Auto-book your favorite time slots weekly or monthly'}
        </ThemedText>
      </ThemedView>

      {/* Recurring Bookings List */}
      <RecurringList
        bookings={bookings}
        loading={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onPause={currentUser?.role !== 'COACH' ? handlePause : undefined}
        onResume={currentUser?.role !== 'COACH' ? handleResume : undefined}
        onCancel={currentUser?.role !== 'COACH' ? handleCancel : undefined}
        onCardPress={handleCardPress}
        onCreatePress={currentUser?.role !== 'COACH' ? handleCreatePress : undefined}
        emptyTitle={
          currentUser?.role === 'COACH'
            ? 'No Recurring Subscriptions'
            : 'No Recurring Bookings'
        }
        emptyMessage={
          currentUser?.role === 'COACH'
            ? 'No athletes have subscribed to recurring sessions with you yet.'
            : 'Subscribe to a weekly or monthly session slot with your favorite coach.'
        }
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
    marginTop: Spacing.xxs,
  },
  headerButton: {
    padding: Spacing.xs,
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
