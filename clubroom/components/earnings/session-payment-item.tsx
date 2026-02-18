/**
 * SessionPaymentItem — Memo'd list item for session payment reconciliation.
 *
 * Shows athlete name, session date/time, amount, and paid/unpaid status.
 * Unpaid items get an inline MarkPaidButton.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { MarkPaidButton } from '@/components/invoices/mark-paid-button';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionPaymentItem as SessionPaymentItemType } from '@/hooks/use-session-payments';

interface SessionPaymentItemProps {
  item: SessionPaymentItemType;
}

function SessionPaymentItemInner({ item }: SessionPaymentItemProps) {
  const { colors } = useTheme();
  const { booking, invoice, athleteName } = item;

  const isPaid = invoice.status === 'PAID';
  const sessionDate = new Date(booking.scheduledAt);
  const dateLabel = sessionDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeLabel = sessionDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const amount = `\u00A3${invoice.total.toFixed(2)}`;

  return (
    <Row align="center" gap="sm" style={styles.container}>
      <View
        style={[
          styles.icon,
          {
            backgroundColor: withAlpha(
              isPaid ? colors.success : colors.warning,
              0.09,
            ),
          },
        ]}
      >
        <Ionicons
          name={isPaid ? 'checkmark-circle' : 'time-outline'}
          size={20}
          color={isPaid ? colors.success : colors.warning}
        />
      </View>

      <View style={styles.info}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {athleteName}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>
          {dateLabel} at {timeLabel}
        </ThemedText>
      </View>

      <View style={styles.right}>
        <ThemedText type="defaultSemiBold">{amount}</ThemedText>
        {isPaid ? (
          <View style={[styles.badge, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
            <ThemedText style={[styles.badgeText, { color: colors.success }]}>Paid</ThemedText>
          </View>
        ) : (
          <MarkPaidButton invoiceId={invoice.id} variant="compact" />
        )}
      </View>
    </Row>
  );
}

export const SessionPaymentItem = memo(SessionPaymentItemInner);

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: Spacing.xxs,
  },
  right: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  badgeText: {
    ...Typography.micro,
    fontWeight: '700',
  },
});
