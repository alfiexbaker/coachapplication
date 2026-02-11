/**
 * Counter Offer Screen
 *
 * Propose a new time for an existing booking.
 * All state/logic in useCounterOffer hook.
 */

import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { TimeProposalForm } from '@/components/negotiate/TimeProposalForm';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCounterOffer } from '@/hooks/use-counter-offer';

export default function CounterOfferScreen() {
  const { colors: palette } = useTheme();
  const c = useCounterOffer();

  if (c.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Propose New Time',
            headerLeft: () => (
              <Clickable accessibilityLabel="Close" onPress={c.goBack}>
                <Ionicons name="close" size={24} color={palette.text} />
              </Clickable>
            ),
          }}
        />
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (c.error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Error',
            headerLeft: () => (
              <Clickable accessibilityLabel="Close" onPress={c.goBack}>
                <Ionicons name="close" size={24} color={palette.text} />
              </Clickable>
            ),
          }}
        />
        <ErrorState
          title="Unable to load booking"
          message={c.error || 'Booking not found'}
          onRetry={c.loadBooking}
        />
      </SafeAreaView>
    );
  }

  if (!c.booking) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Booking Unavailable',
            headerLeft: () => (
              <Clickable accessibilityLabel="Close" onPress={c.goBack}>
                <Ionicons name="close" size={24} color={palette.text} />
              </Clickable>
            ),
          }}
        />
        <EmptyState
          icon="calendar-outline"
          title="Booking not found"
          message="This booking no longer exists or is unavailable."
          actionLabel="Go back"
          onPressAction={c.goBack}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Propose New Time',
          headerLeft: () => (
            <Clickable
              accessibilityLabel="Close"
              onPress={c.handleCancel}
              style={styles.headerButton}
            >
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          ),
        }}
      />
      <View
        style={[
          styles.bookingContext,
          { backgroundColor: palette.surface, borderBottomColor: palette.border },
        ]}
      >
        <View style={styles.bookingInfo}>
          <ThemedText type="defaultSemiBold">
            {c.booking.service} with {c.booking.coachName}
          </ThemedText>
          <ThemedText style={{ color: palette.muted }}>For {c.booking.athleteName}</ThemedText>
        </View>
      </View>
      <TimeProposalForm
        originalTime={c.getOriginalTime()}
        onSubmit={c.handleSubmit}
        onCancel={c.handleCancel}
        isLoading={c.isSubmitting}
        submitLabel="Send Proposal"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerButton: { padding: Spacing.xs },
  bookingContext: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  bookingInfo: { gap: Spacing.micro },
});
