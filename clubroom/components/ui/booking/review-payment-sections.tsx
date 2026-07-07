import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SummaryRow } from '@/components/ui/booking/booking-wizard';
import { Radii, Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

type PaymentMethodCardProps = {
  colors: ThemeColors;
  paymentMethod: string;
  onChange?: () => void;
};

export const PaymentMethodCard = function PaymentMethodCard({
  colors,
  paymentMethod,
  onChange,
}: PaymentMethodCardProps) {
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <ThemedText type="defaultSemiBold">Payment arrangement</ThemedText>
      <ThemedText style={{ color: colors.muted }}>{paymentMethod}</ThemedText>
      {onChange ? (
        <Clickable onPress={onChange} accessibilityLabel="Change payment arrangement">
          <ThemedText style={{ color: colors.tint, fontWeight: '700' }}>Change</ThemedText>
        </Clickable>
      ) : null}
    </View>
  );
};

type TotalsCardProps = {
  colors: ThemeColors;
  sessionPrice: number;
  total: number;
};

const renderBookingTotalsCard = function renderBookingTotalsCard({
  colors,
  sessionPrice,
  total,
}: TotalsCardProps) {
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <SummaryRow label="Session" value={`£${sessionPrice.toFixed(2)}`} />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <SummaryRow label="Total" value={`£${total.toFixed(2)}`} />
    </View>
  );
};
export const BookingTotalsCard = renderBookingTotalsCard;

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
});
