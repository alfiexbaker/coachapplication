/**
 * Confirm Booking Screen
 *
 * Booking summary + payment form + confirm CTA.
 * All state/logic in useConfirmBooking hook. Summary + payment form extracted.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { ConfirmBookingSummary } from '@/components/booking/confirm-booking-summary';
import { ConfirmBookingPayment } from '@/components/booking/confirm-booking-payment';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useConfirmBooking, formatGBP } from '@/hooks/use-confirm-booking';

export default function ConfirmBookingScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const b = useConfirmBooking();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Confirm Booking"
        showBack
        backIcon="arrow-back"
        onBackPress={() => router.back()}
        centerTitle
        containerStyle={styles.header}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ConfirmBookingSummary
          coachName={b.coachName}
          athletesInfo={b.athletesInfo}
          slotTitle={b.slotTitle}
          slotFocus={b.slotFocus}
          formattedDate={b.formattedDate}
          formattedTime={b.formattedTime}
          slotDuration={b.slotDuration}
          objectives={b.objectives}
          isGroupSession={b.isGroupSession}
          groupParticipantCount={b.groupParticipants.length}
          price={b.price}
          totalPrice={b.totalPrice}
        />

        <ConfirmBookingPayment
          cardNumber={b.cardNumber}
          expiryDate={b.expiryDate}
          cvv={b.cvv}
          isProcessing={b.isProcessing}
          onCardChange={b.handleCardNumberChange}
          onExpiryChange={b.handleExpiryChange}
          onCvvChange={b.handleCvvChange}
        />
      </ScrollView>

      {/* Confirm Footer */}
      <View
        style={[
          styles.footer,
          { backgroundColor: palette.background, borderTopColor: palette.border },
        ]}
      >
        <Clickable
          onPress={b.handleConfirmBooking}
          disabled={b.isProcessing}
          style={({ pressed }) => [
            styles.confirmButton,
            {
              backgroundColor: b.isProcessing ? palette.border : palette.tint,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {b.isProcessing ? (
            <Row style={styles.processingRow}>
              <ActivityIndicator color={palette.onPrimary} />
              <ThemedText style={[styles.confirmText, { color: palette.onPrimary }]}>
                Processing...
              </ThemedText>
            </Row>
          ) : (
            <ThemedText style={[styles.confirmText, { color: palette.onPrimary }]}>
              Confirm & Pay {formatGBP(b.totalPrice)}
            </ThemedText>
          )}
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: Spacing['2xl'] },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  footer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1 },
  confirmButton: { paddingVertical: Spacing.md + 4, borderRadius: Radii.md, alignItems: 'center' },
  confirmText: { ...Typography.subheading },
  processingRow: { alignItems: 'center', gap: Spacing.sm },
});
