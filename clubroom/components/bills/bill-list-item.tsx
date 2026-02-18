/**
 * BillListItem — Memo'd FlatList row: title, category chip, amount, status badge.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Bill, BillCategory, BillStatus } from '@/constants/types';

const CATEGORY_LABELS: Record<BillCategory, string> = {
  FACILITY_RENTAL: 'Facility',
  EQUIPMENT: 'Equipment',
  INSURANCE: 'Insurance',
  TRANSPORT: 'Transport',
  MARKETING: 'Marketing',
  CERTIFICATION: 'Certification',
  SOFTWARE: 'Software',
  OTHER: 'Other',
};

const CATEGORY_ICONS: Record<BillCategory, keyof typeof Ionicons.glyphMap> = {
  FACILITY_RENTAL: 'business-outline',
  EQUIPMENT: 'football-outline',
  INSURANCE: 'shield-checkmark-outline',
  TRANSPORT: 'car-outline',
  MARKETING: 'megaphone-outline',
  CERTIFICATION: 'ribbon-outline',
  SOFTWARE: 'code-slash-outline',
  OTHER: 'receipt-outline',
};

interface BillListItemProps {
  bill: Bill;
  onPress?: (bill: Bill) => void;
}

function BillListItemInner({ bill, onPress }: BillListItemProps) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    onPress?.(bill);
  }, [bill, onPress]);

  const statusColor =
    bill.status === 'PAID'
      ? colors.success
      : bill.status === 'OVERDUE'
        ? colors.error
        : colors.warning;

  const statusLabel: Record<BillStatus, string> = {
    PAID: 'Paid',
    PENDING: 'Pending',
    OVERDUE: 'Overdue',
  };

  const formattedAmount = `£${bill.amount.toFixed(2)}`;
  const dueDateLabel = bill.dueDate
    ? new Date(bill.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null;

  return (
    <Clickable onPress={handlePress} accessibilityLabel={`${bill.title}, ${formattedAmount}`}>
      <Row align="center" gap="sm" style={styles.container}>
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(colors.tint, 0.06) }]}>
          <Ionicons name={CATEGORY_ICONS[bill.category]} size={20} color={colors.tint} />
        </View>

        <View style={styles.info}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {bill.title}
          </ThemedText>
          <Row align="center" gap="xs">
            <View style={[styles.categoryChip, { backgroundColor: withAlpha(colors.border, 0.5) }]}>
              <ThemedText style={[styles.categoryText, { color: colors.muted }]}>
                {CATEGORY_LABELS[bill.category]}
              </ThemedText>
            </View>
            {dueDateLabel && (
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Due {dueDateLabel}
              </ThemedText>
            )}
          </Row>
        </View>

        <View style={styles.right}>
          <ThemedText type="defaultSemiBold">{formattedAmount}</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {statusLabel[bill.status]}
            </ThemedText>
          </View>
        </View>
      </Row>
    </Clickable>
  );
}

export const BillListItem = memo(BillListItemInner);

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  iconContainer: {
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
  categoryChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  categoryText: {
    ...Typography.micro,
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusText: {
    ...Typography.micro,
    fontWeight: '700',
  },
});
