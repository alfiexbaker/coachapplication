/**
 * Cancel flow sub-components: SessionInfoCard, RefundBanner, ReasonCard.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radii, Typography, Shadows, withAlpha } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { formatSessionDate, type ReasonOption } from '@/hooks/use-cancel-flow';
import type { Booking } from '@/constants/app-types';
import type { RefundCalculation } from '@/constants/types';
import { Row } from '@/components/primitives';
import { getBookingAthleteName } from '@/utils/booking-display';

interface SessionInfoCardProps {
  booking: Booking;
  colors: Record<string, string>;
  scheme: 'light' | 'dark';
}

function SessionInfoCardInner({ booking, colors, scheme }: SessionInfoCardProps) {
  const sessionDate = booking.scheduledAt || booking.start || '';
  return (
    <View style={[styles.sessionCard, Shadows[scheme].card, { backgroundColor: colors.surface }]}>
      <Row style={styles.sessionCardRow}>
        <Ionicons name="football-outline" size={18} color={colors.tint} />
        <View style={styles.sessionCardInfo}>
          <ThemedText style={[styles.sessionCardTitle, { color: colors.text }]} numberOfLines={1}>
            {booking.service || 'Coaching Session'}
          </ThemedText>
          <ThemedText style={[styles.sessionCardMeta, { color: colors.muted }]}>
            {sessionDate ? formatSessionDate(sessionDate) : 'Date not set'}
          </ThemedText>
          {booking.location || booking.locationLabel ? (
            <ThemedText style={[styles.sessionCardMeta, { color: colors.muted }]} numberOfLines={1}>
              {booking.locationLabel || booking.location}
            </ThemedText>
          ) : null}
        </View>
      </Row>
      <Row style={[styles.sessionCardDetails, { borderTopColor: colors.border }]}>
        <Row style={styles.sessionDetailItem}>
          <Ionicons name="person-outline" size={14} color={colors.muted} />
          <ThemedText style={[styles.sessionDetailText, { color: colors.muted }]} numberOfLines={1}>
            {booking.coachName || 'Coach'}
          </ThemedText>
        </Row>
        <Row style={styles.sessionDetailItem}>
          <Ionicons name="people-outline" size={14} color={colors.muted} />
          <ThemedText style={[styles.sessionDetailText, { color: colors.muted }]} numberOfLines={1}>
            {getBookingAthleteName(booking)}
          </ThemedText>
        </Row>
        {booking.duration ? (
          <Row style={styles.sessionDetailItem}>
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <ThemedText style={[styles.sessionDetailText, { color: colors.muted }]}>
              {booking.duration} mins
            </ThemedText>
          </Row>
        ) : null}
      </Row>
    </View>
  );
}

export const SessionInfoCard = memo(SessionInfoCardInner);

interface RefundBannerProps {
  calculation: RefundCalculation;
  colors: Record<string, string>;
}

function RefundBannerInner({ calculation, colors }: RefundBannerProps) {
  const isFullRefund = calculation.refundPercentage === 100;
  const isNoRefund = calculation.refundPercentage === 0;
  const bannerColor = isFullRefund ? colors.success : isNoRefund ? colors.error : colors.warning;

  return (
    <View style={[styles.refundBanner, { backgroundColor: withAlpha(bannerColor, 0.07) }]}>
      <Row style={styles.refundBannerHeader}>
        <Ionicons
          name={
            isFullRefund ? 'checkmark-circle' : isNoRefund ? 'close-circle' : 'information-circle'
          }
          size={20}
          color={bannerColor}
        />
        <ThemedText style={[styles.refundBannerTitle, { color: bannerColor }]}>
          {isFullRefund
            ? 'Full refund'
            : isNoRefund
              ? 'No refund'
              : `${calculation.refundPercentage}% refund`}
        </ThemedText>
      </Row>
      <ThemedText style={[styles.refundExplanation, { color: colors.muted }]}>
        {calculation.explanation}
      </ThemedText>
      {calculation.netRefundAmount > 0 && (
        <Row style={[styles.refundAmountRow, { borderTopColor: colors.border }]}>
          <ThemedText style={[styles.refundAmountLabel, { color: colors.text }]}>
            You will receive
          </ThemedText>
          <ThemedText style={[styles.refundAmount, { color: bannerColor }]}>
            {'\u00A3'}
            {calculation.netRefundAmount.toFixed(2)}
          </ThemedText>
        </Row>
      )}
    </View>
  );
}

export const RefundBanner = memo(RefundBannerInner);

interface ReasonCardProps {
  option: ReasonOption;
  selected: boolean;
  onPress: () => void;
  colors: Record<string, string>;
}

function ReasonCardInner({ option, selected, onPress, colors }: ReasonCardProps) {
  return (
    <Clickable
      style={[
        styles.reasonCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        selected
          ? { borderColor: colors.tint, backgroundColor: withAlpha(colors.tint, 0.03) }
          : undefined,
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Ionicons name={option.icon} size={18} color={selected ? colors.tint : colors.muted} />
      <ThemedText
        style={[
          styles.reasonLabel,
          { color: colors.text },
          selected ? { ...Typography.bodySemiBold, color: colors.tint } : undefined,
        ]}
        numberOfLines={1}
      >
        {option.label}
      </ThemedText>
      {selected && <Ionicons name="checkmark" size={16} color={colors.tint} />}
    </Clickable>
  );
}

export const ReasonCard = memo(ReasonCardInner);

const styles = StyleSheet.create({
  sessionCard: { borderRadius: Radii.card, padding: Spacing.sm, marginBottom: Spacing.sm },
  sessionCardRow: { alignItems: 'flex-start', gap: Spacing.xs, marginBottom: Spacing.xs },
  sessionCardInfo: { flex: 1 },
  sessionCardTitle: { ...Typography.bodySemiBold },
  sessionCardMeta: { ...Typography.small, marginTop: Spacing.micro },
  sessionCardDetails: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sessionDetailItem: { alignItems: 'center', gap: Spacing.xs / 2 },
  sessionDetailText: { ...Typography.caption },
  refundBanner: { borderRadius: Radii.card, padding: Spacing.sm, marginBottom: Spacing.md },
  refundBannerHeader: { alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  refundBannerTitle: { ...Typography.bodySemiBold },
  refundExplanation: { ...Typography.small, marginBottom: Spacing.xs },
  refundAmountRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  refundAmountLabel: { ...Typography.body },
  refundAmount: { ...Typography.heading },
  reasonCard: {
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
  },
  reasonLabel: { flex: 1, ...Typography.body },
});
