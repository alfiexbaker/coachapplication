/**
 * Counter Offer Screen
 *
 * Propose a new time for an existing booking.
 * All state/logic in useCounterOffer hook.
 */

import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { TimeProposalForm } from '@/components/negotiate/TimeProposalForm';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCounterOffer } from '@/hooks/use-counter-offer';

export default function CounterOfferScreen() {
  const { colors: palette } = useTheme();
  const c = useCounterOffer();

  if (c.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Propose New Time',
          headerLeft: () => <Clickable accessibilityLabel="Close" onPress={c.goBack}><Ionicons name="close" size={24} color={palette.text} /></Clickable> }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>Loading booking...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (c.error || !c.booking) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Error',
          headerLeft: () => <Clickable accessibilityLabel="Close" onPress={c.goBack}><Ionicons name="close" size={24} color={palette.text} /></Clickable> }} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.error} />
          <ThemedText type="defaultSemiBold" style={styles.errorTitle}>Unable to Load Booking</ThemedText>
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>{c.error || 'Booking not found'}</ThemedText>
          <Clickable onPress={c.loadBooking} style={[styles.retryButton, { backgroundColor: palette.tint }]}>
            <ThemedText style={[styles.retryText, { color: palette.onPrimary }]}>Try Again</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Propose New Time',
        headerLeft: () => <Clickable accessibilityLabel="Close" onPress={c.handleCancel} style={styles.headerButton}><Ionicons name="close" size={24} color={palette.text} /></Clickable> }} />
      <View style={[styles.bookingContext, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <View style={styles.bookingInfo}>
          <ThemedText type="defaultSemiBold">{c.booking.service} with {c.booking.coachName}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>For {c.booking.athleteName}</ThemedText>
        </View>
      </View>
      <TimeProposalForm originalTime={c.getOriginalTime()} onSubmit={c.handleSubmit}
        onCancel={c.handleCancel} isLoading={c.isSubmitting} submitLabel="Send Proposal" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.lg },
  loadingText: { marginTop: Spacing.sm },
  errorTitle: { marginTop: Spacing.sm },
  errorText: { textAlign: 'center' },
  retryButton: { marginTop: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radii.sm },
  retryText: { fontWeight: '600' },
  headerButton: { padding: Spacing.xs },
  bookingContext: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  bookingInfo: { gap: Spacing.micro },
});
