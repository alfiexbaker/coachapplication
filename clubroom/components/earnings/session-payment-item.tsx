/**
 * SessionPaymentItem — Memo'd list item for session payment reconciliation.
 *
 * Shows athlete name, session type, date/time, amount, and status.
 * Expandable: tap to reveal tab-specific actions with confirmation alerts.
 */

import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionPaymentItem as SessionPaymentItemType } from '@/hooks/use-session-payments';
import { uiFeedback } from '@/services/ui-feedback';

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

  const handleToggle = () => {
    setExpanded((prev) => !prev);
  };

  const handleMarkPaid = () => {
    uiFeedback.alert(
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
  };

  const handleMarkUnpaid = () => {
    uiFeedback.alert(
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
  };

  const handleWriteOff = () => {
    uiFeedback.alert(
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
  };

  const handleRestore = () => {
    onRestore?.(invoice.id);
    setExpanded(false);
  };

  const handleRemind = () => {
    onSendReminder?.(item);
    setExpanded(false);
  };

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
  const [nowMs] = useState(() => Date.now());

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

  const daysOverdue = (() => {
    if (!isOverdue) return 0;
    const due = invoice.dueDate
      ? new Date(invoice.dueDate).getTime()
      : new Date(booking.scheduledAt).getTime() + 14 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.floor((nowMs - due) / (1000 * 60 * 60 * 24)));
  })();

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
            <Row
              align="center"
              gap="micro"
              style={[
                styles.contextBadge,
                {
                  backgroundColor:
                    item.businessContext === 'org'
                      ? withAlpha(colors.info, 0.1)
                      : withAlpha(colors.tint, 0.1),
                },
              ]}
            >
              <Ionicons
                name={item.businessContext === 'org' ? 'business-outline' : 'briefcase-outline'}
                size={10}
                color={item.businessContext === 'org' ? colors.info : colors.tint}
              />
              <ThemedText
                style={[
                  styles.badgeText,
                  { color: item.businessContext === 'org' ? colors.info : colors.tint },
                ]}
              >
                {item.moneyLabel}
              </ThemedText>
            </Row>
            <ThemedText style={[Typography.micro, { color: colors.muted }]} numberOfLines={2}>
              {item.moneyDetail}
            </ThemedText>
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
            label="Mark Paid"
          />
          <Button
            onPress={handleWriteOff}
            variant="outline"
            style={styles.actionButton}
            accessibilityLabel="Write off this payment"
            label="Write Off"
          />
          <Button
            onPress={handleRemind}
            variant="outline"
            style={styles.actionButton}
            accessibilityLabel="Send payment reminder"
            label="Remind"
          />
        </Row>
      )}

      {expanded && tab === 'paid' && (
        <Row gap="xs" style={styles.actions}>
          <Button
            onPress={handleMarkUnpaid}
            variant="outline"
            style={styles.actionButton}
            accessibilityLabel="Mark as unpaid"
            label="Mark Unpaid"
          />
        </Row>
      )}

      {expanded && tab === 'written_off' && (
        <Row gap="xs" style={styles.actions}>
          <Button
            onPress={handleRestore}
            variant="outline"
            style={styles.actionButton}
            accessibilityLabel="Restore to owed"
            label="Restore"
          />
        </Row>
      )}
    </Column>
  );
}

export const SessionPaymentItem = SessionPaymentItemInner;

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
  contextBadge: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
});
