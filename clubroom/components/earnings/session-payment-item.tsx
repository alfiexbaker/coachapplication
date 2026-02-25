/**
 * SessionPaymentItem — Memo'd list item for session payment reconciliation.
 *
 * Shows athlete name, session type, date/time, amount, and status.
 * Expandable: tap to reveal tab-specific actions with confirmation alerts.
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionPaymentItem as SessionPaymentItemType } from '@/hooks/use-session-payments';

export type PaymentTab = 'owed' | 'paid' | 'written_off';

interface SessionPaymentItemProps {
  item: SessionPaymentItemType;
  tab: PaymentTab;
  onMarkPaid?: (invoiceId: string) => void;
  onMarkUnpaid?: (invoiceId: string) => void;
  onWriteOff?: (invoiceId: string) => void;
  onRestore?: (invoiceId: string) => void;
  onSendReminder?: (item: SessionPaymentItemType) => void;
}

function SessionPaymentItemInner({
  item,
  tab,
  onMarkPaid,
  onMarkUnpaid,
  onWriteOff,
  onRestore,
  onSendReminder,
}: SessionPaymentItemProps) {
  const { colors } = useTheme();
  const { booking, invoice, athleteName } = item;
  const [expanded, setExpanded] = useState(false);

  const amount = `\u00A3${invoice.total.toFixed(2)}`;

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleMarkPaid = useCallback(() => {
    Alert.alert(
      'Confirm payment',
      `Mark ${amount} from ${athleteName} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: () => {
            onMarkPaid?.(invoice.id);
            setExpanded(false);
          },
        },
      ],
    );
  }, [onMarkPaid, invoice.id, amount, athleteName]);

  const handleMarkUnpaid = useCallback(() => {
    Alert.alert(
      'Undo payment?',
      `Move ${amount} from ${athleteName} back to owed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Unpaid',
          style: 'destructive',
          onPress: () => {
            onMarkUnpaid?.(invoice.id);
            setExpanded(false);
          },
        },
      ],
    );
  }, [onMarkUnpaid, invoice.id, amount, athleteName]);

  const handleWriteOff = useCallback(() => {
    Alert.alert(
      'Write off payment?',
      `Stop chasing ${amount} from ${athleteName}? You can restore this later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Write Off',
          style: 'destructive',
          onPress: () => {
            onWriteOff?.(invoice.id);
            setExpanded(false);
          },
        },
      ],
    );
  }, [onWriteOff, invoice.id, amount, athleteName]);

  const handleRestore = useCallback(() => {
    onRestore?.(invoice.id);
    setExpanded(false);
  }, [onRestore, invoice.id]);

  const handleRemind = useCallback(() => {
    onSendReminder?.(item);
    setExpanded(false);
  }, [onSendReminder, item]);

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

  const isOverdue = item.isOverdue ?? false;

  const iconName = tab === 'paid'
    ? 'checkmark-circle'
    : tab === 'written_off'
      ? 'close-circle-outline'
      : isOverdue
        ? 'alert-circle'
        : 'time-outline';
  const iconColor = tab === 'paid'
    ? colors.success
    : tab === 'written_off'
      ? colors.muted
      : isOverdue
        ? colors.error
        : colors.warning;

  const daysOverdue = useMemo(() => {
    if (!isOverdue) return 0;
    const due = invoice.dueDate
      ? new Date(invoice.dueDate).getTime()
      : new Date(booking.scheduledAt).getTime() + 14 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.floor((Date.now() - due) / (1000 * 60 * 60 * 24)));
  }, [isOverdue, invoice.dueDate, booking.scheduledAt]);

  return (
    <Column>
      <Clickable
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={`${athleteName}, ${amount}, ${tab}`}
      >
        <Row align="center" gap="sm" style={styles.container}>
          <View
            style={[
              styles.icon,
              { backgroundColor: withAlpha(iconColor, 0.09) },
            ]}
          >
            <Ionicons name={iconName} size={20} color={iconColor} />
          </View>

          <View style={styles.info}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {athleteName}
            </ThemedText>
            {booking.service ? (
              <ThemedText style={[Typography.caption, { color: colors.foreground }]} numberOfLines={1}>
                {booking.service}
              </ThemedText>
            ) : null}
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>
              {dateLabel} at {timeLabel}
            </ThemedText>
            {isOverdue && daysOverdue > 0 && (
              <View style={[styles.overdueBadge, { backgroundColor: withAlpha(colors.error, 0.08) }]}>
                <ThemedText style={[Typography.micro, { color: colors.error, fontWeight: '700' }]}>
                  {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.right}>
            <ThemedText type="defaultSemiBold">{amount}</ThemedText>
            {tab === 'paid' && (
              <View style={[styles.badge, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
                <ThemedText style={[styles.badgeText, { color: colors.success }]}>Paid</ThemedText>
              </View>
            )}
            {tab === 'written_off' && (
              <View style={[styles.badge, { backgroundColor: withAlpha(colors.muted, 0.09) }]}>
                <ThemedText style={[styles.badgeText, { color: colors.muted }]}>Written Off</ThemedText>
              </View>
            )}
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.muted}
            />
          </View>
        </Row>
      </Clickable>

      {expanded && tab === 'owed' && (
        <Row gap="xs" style={styles.actions}>
          <Button
            onPress={handleMarkPaid}
            variant="primary"
            style={styles.actionButton}
            accessibilityLabel="Mark as paid"
          >
            Mark Paid
          </Button>
          <Button
            onPress={handleWriteOff}
            variant="outline"
            style={styles.actionButton}
            accessibilityLabel="Write off this payment"
          >
            Write Off
          </Button>
          <Button
            onPress={handleRemind}
            variant="outline"
            style={styles.actionButton}
            accessibilityLabel="Send payment reminder"
          >
            Remind
          </Button>
        </Row>
      )}

      {expanded && tab === 'paid' && (
        <Row gap="xs" style={styles.actions}>
          <Button
            onPress={handleMarkUnpaid}
            variant="outline"
            style={styles.actionButton}
            accessibilityLabel="Mark as unpaid"
          >
            Mark Unpaid
          </Button>
        </Row>
      )}

      {expanded && tab === 'written_off' && (
        <Row gap="xs" style={styles.actions}>
          <Button
            onPress={handleRestore}
            variant="outline"
            style={styles.actionButton}
            accessibilityLabel="Restore to owed"
          >
            Restore
          </Button>
        </Row>
      )}
    </Column>
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
  overdueBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start' as const,
  },
  actions: {
    paddingLeft: 40 + Spacing.sm, // icon width (40) + gap
    paddingBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  actionButton: {
    minHeight: Components.button.height,
    paddingHorizontal: Spacing.sm,
  },
});
