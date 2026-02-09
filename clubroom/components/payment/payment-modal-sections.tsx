/**
 * Extracted sub-components for PaymentModal.
 *
 * PaymentProcessingView — spinner while processing payment.
 * PaymentSuccessView — checkmark after successful payment.
 * SessionSummaryCard — session details section.
 * PaymentBreakdownCard — price breakdown section.
 * PaymentMethodCard — card info + change button.
 * SecurityNote — encryption assurance banner.
 */

import React, { memo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── PaymentProcessingView ───────────────────────────────────────────────────

export function PaymentProcessingView({ palette }: { palette: ThemeColors }) {
  return (
    <View style={styles.processingContainer}>
      <View style={[styles.stateIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <ActivityIndicator size="large" color={palette.tint} />
      </View>
      <ThemedText type="subtitle" style={styles.stateTitle}>
        Processing Payment
      </ThemedText>
      <ThemedText style={[styles.stateText, { color: palette.muted }]}>
        Please wait while we process your payment...
      </ThemedText>
    </View>
  );
}

// ─── PaymentSuccessView ──────────────────────────────────────────────────────

export function PaymentSuccessView({ palette }: { palette: ThemeColors }) {
  return (
    <View style={styles.processingContainer}>
      <View style={[styles.stateIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
        <Ionicons name="checkmark-circle" size={64} color={palette.success} />
      </View>
      <ThemedText type="subtitle" style={styles.stateTitle}>
        Payment Successful!
      </ThemedText>
      <ThemedText style={[styles.stateText, { color: palette.muted }]}>
        Your session has been booked
      </ThemedText>
    </View>
  );
}

// ─── SessionSummaryCard ──────────────────────────────────────────────────────

interface SessionSummaryCardProps {
  coachName: string;
  sessionType: string;
  focus: string;
  formattedDate: string;
  startTime: string;
  endTime: string;
  location?: string;
  athleteNames: string[];
  palette: ThemeColors;
}

export const SessionSummaryCard = memo(function SessionSummaryCard({
  coachName,
  sessionType,
  focus,
  formattedDate,
  startTime,
  endTime,
  location,
  athleteNames,
  palette,
}: SessionSummaryCardProps) {
  const initials = coachName.split(' ').map((n) => n[0]).join('');

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Session Details</ThemedText>
      <SurfaceCard style={styles.sessionCard}>
        <View style={styles.sessionRow}>
          <View style={[styles.coachAvatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.coachInitials, { color: palette.tint }]}>
              {initials}
            </ThemedText>
          </View>
          <View style={styles.sessionInfo}>
            <ThemedText type="defaultSemiBold">{coachName}</ThemedText>
            <ThemedText style={{ ...Typography.small, color: palette.muted }}>
              {sessionType} - {focus}
            </ThemedText>
          </View>
        </View>

        <Divider />

        <View style={styles.detailsList}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={palette.muted} />
            <ThemedText style={styles.detailText}>{formattedDate}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color={palette.muted} />
            <ThemedText style={styles.detailText}>
              {startTime} - {endTime}
            </ThemedText>
          </View>
          {location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color={palette.muted} />
              <ThemedText style={styles.detailText}>{location}</ThemedText>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={18} color={palette.muted} />
            <ThemedText style={styles.detailText}>
              {athleteNames.join(', ')}
            </ThemedText>
          </View>
        </View>
      </SurfaceCard>
    </View>
  );
});

// ─── PaymentBreakdownCard ────────────────────────────────────────────────────

interface PaymentBreakdownCardProps {
  price: number;
  serviceFee: number;
  total: number;
  palette: ThemeColors;
}

export const PaymentBreakdownCard = memo(function PaymentBreakdownCard({
  price,
  serviceFee,
  total,
  palette,
}: PaymentBreakdownCardProps) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Payment Summary</ThemedText>
      <SurfaceCard style={styles.paymentCard}>
        <View style={styles.priceRow}>
          <ThemedText style={{ color: palette.text }}>Session fee</ThemedText>
          <ThemedText style={{ color: palette.text }}>£{price.toFixed(2)}</ThemedText>
        </View>
        <View style={styles.priceRow}>
          <View style={styles.feeLabel}>
            <ThemedText style={{ color: palette.muted }}>Service fee</ThemedText>
            <Ionicons name="information-circle-outline" size={14} color={palette.muted} />
          </View>
          <ThemedText style={{ color: palette.muted }}>£{serviceFee.toFixed(2)}</ThemedText>
        </View>
        <Divider spacing={Spacing.xs} />
        <View style={styles.priceRow}>
          <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>Total</ThemedText>
          <ThemedText type="defaultSemiBold" style={{ ...Typography.heading, color: palette.tint }}>
            £{total.toFixed(2)}
          </ThemedText>
        </View>
      </SurfaceCard>
    </View>
  );
});

// ─── PaymentMethodCard ───────────────────────────────────────────────────────

export const PaymentMethodCard = memo(function PaymentMethodCard({
  palette,
}: {
  palette: ThemeColors;
}) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
      <SurfaceCard style={styles.methodCard}>
        <View style={[styles.cardIcon, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="card" size={24} color={palette.tint} />
        </View>
        <View style={styles.cardInfo}>
          <ThemedText type="defaultSemiBold">•••• •••• •••• 4242</ThemedText>
          <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Expires 12/26</ThemedText>
        </View>
        <Clickable style={[styles.changeButton, { borderColor: palette.border }]}>
          <ThemedText style={{ color: palette.tint, ...Typography.smallSemiBold }}>
            Change
          </ThemedText>
        </Clickable>
      </SurfaceCard>
    </View>
  );
});

// ─── SecurityNote ────────────────────────────────────────────────────────────

export function SecurityNote({ palette }: { palette: ThemeColors }) {
  return (
    <View style={[styles.securityNote, { backgroundColor: withAlpha(palette.success, 0.03) }]}>
      <Ionicons name="shield-checkmark" size={18} color={palette.success} />
      <ThemedText style={[styles.securityText, { color: palette.success }]}>
        Your payment is secured with 256-bit encryption
      </ThemedText>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  stateIcon: {
    width: 100,
    height: 100,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  stateTitle: { textAlign: 'center' },
  stateText: { ...Typography.bodySmall, textAlign: 'center' },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading },
  sessionCard: {
    padding: Components.card.padding,
    gap: Spacing.md,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInitials: { ...Typography.heading },
  sessionInfo: { flex: 1, gap: Spacing.micro },
  detailsList: { gap: Spacing.sm },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: { ...Typography.bodySmall, flex: 1 },
  paymentCard: {
    padding: Components.card.padding,
    gap: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Components.card.padding,
    gap: Spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: Spacing.micro },
  changeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  securityText: { ...Typography.smallSemiBold, flex: 1 },
});
