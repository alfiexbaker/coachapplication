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
import type { ReactNode } from 'react';

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
  const renderStateScreen = ({
    title,
    content,
  }: {
    title: string;
    content: ReactNode;
  }) => (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: title,
          headerLeft: () => (
            <Clickable accessibilityLabel="Close" onPress={c.goBack}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          ),
        }}
      />
      {content}
    </SafeAreaView>
  );
  const renderMainScreen = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
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
      {content}
    </SafeAreaView>
  );

  if (c.isLoading) {
    return renderStateScreen({
      title: 'Propose New Time',
      content: <LoadingState variant="detail" />,
    });
  }

  if (c.error) {
    return renderStateScreen({
      title: 'Error',
      content: (
        <ErrorState
          title="Unable to load booking"
          message={c.error || 'Booking not found'}
          onRetry={c.loadBooking}
        />
      ),
    });
  }

  if (!c.booking) {
    return renderStateScreen({
      title: 'Booking Unavailable',
      content: (
        <EmptyState
          icon="calendar-outline"
          title="Booking not found"
          message="This booking no longer exists or is unavailable."
          actionLabel="Go back"
          onPressAction={c.goBack}
        />
      ),
    });
  }

  return renderMainScreen(
    <>
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
    </>,
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
