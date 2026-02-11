/**
 * Blocked dates editor sub-components: BookingWarningBanner, SelectionArea,
 * QuickActions, BlockedDatesList, BlockedDatesEmpty.
 */
import { memo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, Shadows, Components, withAlpha } from '@/constants/theme';
import { formatDate, formatDateRange, type BlockedDateRange } from '@/hooks/use-blocked-dates';
import { toDateStr } from '@/utils/format';
import { Row } from '@/components/primitives';

// ── Booking Warning Banner ───────────────────────────────────

interface BookingWarningBannerProps {
  count: number;
  dates: string[];
  colors: Record<string, string>;
}

function BookingWarningBannerInner({ count, dates, colors }: BookingWarningBannerProps) {
  if (count === 0) return null;
  return (
    <Row
      style={[
        styles.bookingWarning,
        {
          backgroundColor: withAlpha(colors.warning, 0.08),
          borderColor: withAlpha(colors.warning, 0.19),
        },
      ]}
    >
      <Ionicons name="warning-outline" size={18} color={colors.warning} />
      <View style={styles.bookingWarningContent}>
        <Text style={[styles.bookingWarningTitle, { color: colors.warning }]}>
          {count} booking{count > 1 ? 's' : ''} in this range
        </Text>
        <Text style={[styles.bookingWarningText, { color: colors.muted }]}>
          You have existing bookings on {dates.slice(0, 3).map(formatDate).join(', ')}
          {dates.length > 3 ? ` and ${dates.length - 3} more` : ''}. Blocking these dates will not
          automatically cancel them.
        </Text>
      </View>
    </Row>
  );
}

export const BookingWarningBanner = memo(BookingWarningBannerInner);

// ── Selection Area ───────────────────────────────────────────

interface SelectionAreaProps {
  selectionLabel: string;
  reason: string;
  onReasonChange: (text: string) => void;
  onBlock: () => void;
  colors: Record<string, string>;
  scheme: 'light' | 'dark';
}

function SelectionAreaInner({
  selectionLabel,
  reason,
  onReasonChange,
  onBlock,
  colors,
  scheme,
}: SelectionAreaProps) {
  return (
    <View
      style={[styles.selectionArea, { backgroundColor: colors.surface }, Shadows[scheme].subtle]}
    >
      <Row style={styles.selectionInfo}>
        <Ionicons name="calendar" size={16} color={colors.tint} />
        <Text style={[styles.selectionLabel, { color: colors.text }]}>{selectionLabel}</Text>
      </Row>
      <TextInput
        style={[styles.reasonInput, { borderColor: colors.border, color: colors.text }]}
        value={reason}
        onChangeText={onReasonChange}
        placeholder="Reason (optional)"
        placeholderTextColor={colors.border}
      />
      <Clickable style={[styles.blockButton, { backgroundColor: colors.error }]} onPress={onBlock}>
        <Ionicons name="close-circle" size={18} color={colors.surface} />
        <Text style={[styles.blockButtonText, { color: colors.surface }]}>Block these dates</Text>
      </Clickable>
    </View>
  );
}

export const SelectionArea = memo(SelectionAreaInner);

// ── Quick Actions ────────────────────────────────────────────

interface QuickActionsProps {
  onBlockThisWeek: () => void;
  colors: Record<string, string>;
  scheme: 'light' | 'dark';
}

function QuickActionsInner({ onBlockThisWeek, colors, scheme }: QuickActionsProps) {
  return (
    <View style={styles.quickActions}>
      <Clickable
        style={[styles.quickAction, { backgroundColor: colors.surface }, Shadows[scheme].subtle]}
        onPress={onBlockThisWeek}
      >
        <Ionicons name="today-outline" size={18} color={colors.tint} />
        <Text style={[styles.quickActionText, { color: colors.tint }]}>Block this week</Text>
      </Clickable>
    </View>
  );
}

export const QuickActions = memo(QuickActionsInner);

// ── Blocked Dates List ───────────────────────────────────────

interface BlockedDatesListProps {
  blockedDates: BlockedDateRange[];
  onRemove: (id: string) => void;
  colors: Record<string, string>;
  scheme: 'light' | 'dark';
}

function BlockedDatesListInner({ blockedDates, onRemove, colors, scheme }: BlockedDatesListProps) {
  if (blockedDates.length === 0) return null;
  const today = toDateStr(new Date());
  return (
    <>
      <Text style={[styles.listTitle, { color: colors.text }]}>Blocked dates</Text>
      <View style={[styles.listCard, { backgroundColor: colors.surface }, Shadows[scheme].card]}>
        {blockedDates.map((block, idx) => {
          const isLast = idx === blockedDates.length - 1;
          const isPast = block.endDate < today;
          return (
            <Row
              key={block.id}
              style={[
                styles.listItem,
                !isLast ? [styles.listItemBorder, { borderBottomColor: colors.border }] : undefined,
              ]}
            >
              <View style={styles.listItemInfo}>
                <Text
                  style={[
                    styles.listItemDate,
                    { color: colors.text },
                    isPast && { color: colors.muted },
                  ]}
                >
                  {formatDateRange(block.startDate, block.endDate)}
                </Text>
                {block.reason ? (
                  <Text style={[styles.listItemReason, { color: colors.muted }]}>
                    {block.reason}
                  </Text>
                ) : null}
              </View>
              <Clickable
                accessibilityLabel="Remove blocked date"
                onPress={() => onRemove(block.id)}
                hitSlop={12}
                style={styles.removeBtn}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Clickable>
            </Row>
          );
        })}
      </View>
    </>
  );
}

export const BlockedDatesList = memo(BlockedDatesListInner);

// ── Empty State ──────────────────────────────────────────────

interface BlockedDatesEmptyProps {
  colors: Record<string, string>;
}

function BlockedDatesEmptyInner({ colors }: BlockedDatesEmptyProps) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={40} color={colors.border} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No blocked dates</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        Tap dates on the calendar to block off periods when you are unavailable.
      </Text>
    </View>
  );
}

export const BlockedDatesEmpty = memo(BlockedDatesEmptyInner);

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  bookingWarning: {
    gap: Spacing.xs,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
  },
  bookingWarningContent: { flex: 1, gap: Spacing.xxs },
  bookingWarningTitle: { ...Typography.bodySemiBold },
  bookingWarningText: { ...Typography.small },
  selectionArea: { borderRadius: Radii.card, padding: Spacing.sm, marginTop: Spacing.sm },
  selectionInfo: { alignItems: 'center', gap: Spacing.xxs, marginBottom: Spacing.xs },
  selectionLabel: { ...Typography.bodySemiBold },
  reasonInput: {
    height: 40,
    borderRadius: Radii.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  blockButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
  },
  blockButtonText: { ...Typography.bodySemiBold },
  quickActions: { marginTop: Spacing.sm, marginBottom: Spacing.md },
  quickAction: {
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 14,
  },
  quickActionText: { ...Typography.bodySemiBold },
  listTitle: { ...Typography.heading, marginBottom: Spacing.xs, paddingHorizontal: Spacing.xs },
  listCard: { borderRadius: Radii.card, overflow: 'hidden' },
  listItem: { alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 14 },
  listItemBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  listItemInfo: { flex: 1 },
  listItemDate: { ...Typography.body },
  listItemReason: { ...Typography.small, marginTop: Spacing.micro },
  removeBtn: { padding: Spacing.xxs },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg * 2,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: { ...Typography.heading, marginTop: Spacing.sm, marginBottom: Spacing.xxs },
  emptySubtitle: { ...Typography.body, textAlign: 'center' },
});
