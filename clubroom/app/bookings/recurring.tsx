import { useCallback } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RecurringList } from '@/components/recurring';
import { Clickable } from '@/components/primitives/clickable';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { RecurringBooking } from '@/constants/types';
import { recurringBookingService } from '@/services/recurring-booking-service';
import { useScreen } from '@/hooks/use-screen';
import { ServiceEvents } from '@/services/event-bus';
import { err, ok, serviceError } from '@/types/result';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('RecurringBookingsScreen');
export default function RecurringBookingsScreen() {
  const { currentUser } = useAuth();
  const loadBookings = useCallback(async () => {
    if (!currentUser?.id) {
      return ok([]);
    }

    try {
      const bookingsResult =
        currentUser.role === 'COACH'
          ? await recurringBookingService.getCoachRecurringBookings(currentUser.id)
          : await recurringBookingService.getUserRecurringBookings(currentUser.id);

      if (!bookingsResult.success) {
        return err(bookingsResult.error);
      }
      let userBookings = bookingsResult.data;

      if (userBookings.length === 0) {
        const allBookingsResult = await recurringBookingService.list();
        if (allBookingsResult.success && allBookingsResult.data.length === 0) {
          const seedResult = await recurringBookingService.seedDemoData();
          if (seedResult.success) {
            const seededBookingsResult =
              currentUser.role === 'COACH'
                ? await recurringBookingService.getCoachRecurringBookings(currentUser.id)
                : await recurringBookingService.getUserRecurringBookings(currentUser.id);
            if (seededBookingsResult.success) {
              userBookings = seededBookingsResult.data;
            }
          } else {
            logger.warn('Failed to seed recurring demo data', seedResult.error);
          }
        }
      }

      logger.debug('Loaded recurring bookings', { count: userBookings.length });
      return ok(userBookings);
    } catch (error) {
      logger.error('Failed to load recurring bookings', error);
      return err(
        serviceError('UNKNOWN', 'Failed to load recurring bookings. Please try again.', error),
      );
    }
  }, [currentUser?.id, currentUser?.role]);

  const {
    data: recurringData,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors: palette,
  } = useScreen<RecurringBooking[]>({
    load: loadBookings,
    deps: [currentUser?.id, currentUser?.role],
    events: [
      ServiceEvents.RECURRING_CREATED,
      ServiceEvents.RECURRING_CANCELLED,
      ServiceEvents.BOOKING_CREATED,
    ],
    isEmpty: (data) => data.length === 0,
    refetchOnFocus: true,
  });
  const bookings = recurringData ?? [];

  const handlePause = useCallback(
    async (id: string, reason?: string) => {
      const result = await recurringBookingService.pauseRecurring(id, reason);

      if (result.success) {
        Alert.alert(
          'Subscription Paused',
          'Your recurring booking has been paused. You can resume it anytime.',
        );
        onRefresh();
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to pause subscription.');
      }
    },
    [onRefresh],
  );

  const handleResume = useCallback(
    async (id: string) => {
      const result = await recurringBookingService.resumeRecurring(id);

      if (result.success) {
        Alert.alert('Subscription Resumed', 'Your recurring booking has been resumed.');
        onRefresh();
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to resume subscription.');
      }
    },
    [onRefresh],
  );

  const handleCancel = useCallback(
    async (id: string, reason?: string) => {
      const result = await recurringBookingService.cancelRecurring(id, reason);

      if (result.success) {
        Alert.alert('Subscription Cancelled', 'Your recurring booking has been cancelled.');
        onRefresh();
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to cancel subscription.');
      }
    },
    [onRefresh],
  );

  const handleCardPress = useCallback(
    (recurring: RecurringBooking) => {
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
              const result = await recurringBookingService.generateUpcomingBookings(
                recurring.id,
                4,
              );
              if (result.success && result.data) {
                Alert.alert(
                  'Bookings Generated',
                  `${result.data.length} upcoming sessions have been added to your bookings.`,
                );
                onRefresh();
              } else {
                Alert.alert('Error', result.error?.message || 'Failed to generate bookings.');
              }
            },
          },
        ],
      );
    },
    [onRefresh],
  );

  const handleCreatePress = useCallback(() => {
    router.push(Routes.BOOKINGS_SUBSCRIBE);
  }, []);

  const baseScreenOptions = { title: 'Recurring Bookings', headerShown: true } as const;
  const createScreenOptions = {
    ...baseScreenOptions,
    headerRight: () => (
      <Clickable
        accessibilityLabel="Create recurring booking"
        onPress={handleCreatePress}
        style={styles.headerButton}
      >
        <Ionicons name="add-circle" size={28} color={palette.tint} />
      </Clickable>
    ),
  } as const;

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <Stack.Screen options={baseScreenOptions} />
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <Stack.Screen options={baseScreenOptions} />
        <ErrorState
          message={error?.message ?? 'Failed to load recurring bookings.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <Stack.Screen options={createScreenOptions} />
        <EmptyState
          icon="repeat-outline"
          title={
            currentUser?.role === 'COACH' ? 'No recurring subscriptions' : 'No recurring bookings'
          }
          message={
            currentUser?.role === 'COACH'
              ? 'No athletes have subscribed to recurring sessions with you yet.'
              : 'Subscribe to a weekly or monthly session slot with your favorite coach.'
          }
          actionLabel={currentUser?.role === 'COACH' ? undefined : 'Create subscription'}
          onPressAction={currentUser?.role === 'COACH' ? undefined : handleCreatePress}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <Stack.Screen options={createScreenOptions} />
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

      <RecurringList
        bookings={bookings}
        loading={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onPause={currentUser?.role !== 'COACH' ? handlePause : undefined}
        onResume={currentUser?.role !== 'COACH' ? handleResume : undefined}
        onCancel={currentUser?.role !== 'COACH' ? handleCancel : undefined}
        onCardPress={handleCardPress}
        onCreatePress={currentUser?.role !== 'COACH' ? handleCreatePress : undefined}
        emptyTitle={
          currentUser?.role === 'COACH' ? 'No Recurring Subscriptions' : 'No Recurring Bookings'
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
});
