import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SummaryRow } from '@/components/ui/booking/booking-wizard';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

type PaymentMethodCardProps = {
  colors: ThemeColors;
  paymentMethod: string;
  onChange: () => void;
};

export const PaymentMethodCard = React.memo(function PaymentMethodCard({
  colors,
  paymentMethod,
  onChange,
}: PaymentMethodCardProps) {
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <ThemedText type="defaultSemiBold">Payment method</ThemedText>
      <ThemedText style={{ color: colors.muted }}>{paymentMethod}</ThemedText>
      <Clickable onPress={onChange} accessibilityLabel="Change payment method">
        <ThemedText style={{ color: colors.tint, fontWeight: '700' }}>Change</ThemedText>
      </Clickable>
    </View>
  );
});

type PromoCardProps = {
  colors: ThemeColors;
  promoCode: string;
  promoApplied: boolean;
  promoError: string | null;
  onPromoCodeChange: (value: string) => void;
  onApplyPromo: () => void;
  onRemovePromo: () => void;
};

export const PromoCodeCard = React.memo(function PromoCodeCard({
  colors,
  promoCode,
  promoApplied,
  promoError,
  onPromoCodeChange,
  onApplyPromo,
  onRemovePromo,
}: PromoCardProps) {
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <ThemedText type="defaultSemiBold">Promo code</ThemedText>
      {promoApplied ? (
        <Row style={styles.promoApplied}>
          <Row style={[styles.promoTag, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <ThemedText style={[styles.promoTagText, { color: colors.success }]}>
              {promoCode.toUpperCase()} applied
            </ThemedText>
          </Row>
          <Clickable onPress={onRemovePromo} accessibilityLabel="Remove promo code">
            <ThemedText style={{ color: colors.error, fontWeight: '600' }}>Remove</ThemedText>
          </Clickable>
        </Row>
      ) : (
        <>
          <Row style={styles.promoInputRow}>
            <TextInput
              value={promoCode}
              onChangeText={onPromoCodeChange}
              placeholder="Enter code"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              style={[
                styles.promoInput,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
              accessibilityLabel="Promo code"
            />
            <Clickable
              onPress={onApplyPromo}
              disabled={!promoCode.trim()}
              style={[
                styles.promoApplyButton,
                { backgroundColor: promoCode.trim() ? colors.tint : colors.border },
              ]}
              accessibilityLabel="Apply promo code"
            >
              <ThemedText style={{ color: colors.onPrimary, fontWeight: '600' }}>Apply</ThemedText>
            </Clickable>
          </Row>
          {promoError ? (
            <ThemedText style={{ color: colors.error, ...Typography.small }}>
              {promoError}
            </ThemedText>
          ) : null}
          <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
            Try: FIRST10, WELCOME20, VIP50
          </ThemedText>
        </>
      )}
    </View>
  );
});

type TotalsCardProps = {
  colors: ThemeColors;
  sessionPrice: number;
  platformFee: number;
  promoDiscount: number;
  total: number;
};

export const BookingTotalsCard = React.memo(function BookingTotalsCard({
  colors,
  sessionPrice,
  platformFee,
  promoDiscount,
  total,
}: TotalsCardProps) {
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <SummaryRow label="Session" value={`£${sessionPrice.toFixed(2)}`} />
      <SummaryRow label="Platform fee (15%)" value={`£${platformFee.toFixed(2)}`} />
      {promoDiscount > 0 ? (
        <SummaryRow label="Promo discount" value={`-£${promoDiscount.toFixed(2)}`} />
      ) : null}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <SummaryRow label="Total" value={`£${total.toFixed(2)}`} />
    </View>
  );
});

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
  promoInputRow: {
    gap: Spacing.sm,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.bodySmall,
  },
  promoApplyButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    justifyContent: 'center',
  },
  promoApplied: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoTag: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  promoTagText: {
    ...Typography.smallSemiBold,
  },
});
