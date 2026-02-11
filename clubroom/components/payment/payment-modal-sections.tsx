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
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { styles } from './payment-modal-styles';

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
        <Row align="center" gap="md">
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
        </Row>

        <Divider />

        <View style={styles.detailsList}>
          <Row align="center" gap="sm">
            <Ionicons name="calendar-outline" size={18} color={palette.muted} />
            <ThemedText style={styles.detailText}>{formattedDate}</ThemedText>
          </Row>
          <Row align="center" gap="sm">
            <Ionicons name="time-outline" size={18} color={palette.muted} />
            <ThemedText style={styles.detailText}>
              {startTime} - {endTime}
            </ThemedText>
          </Row>
          {location && (
            <Row align="center" gap="sm">
              <Ionicons name="location-outline" size={18} color={palette.muted} />
              <ThemedText style={styles.detailText}>{location}</ThemedText>
            </Row>
          )}
          <Row align="center" gap="sm">
            <Ionicons name="people-outline" size={18} color={palette.muted} />
            <ThemedText style={styles.detailText}>
              {athleteNames.join(', ')}
            </ThemedText>
          </Row>
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
        <Row justify="space-between" align="center">
          <ThemedText style={{ color: palette.text }}>Session fee</ThemedText>
          <ThemedText style={{ color: palette.text }}>£{price.toFixed(2)}</ThemedText>
        </Row>
        <Row justify="space-between" align="center">
          <Row align="center" gap="xxs">
            <ThemedText style={{ color: palette.muted }}>Service fee</ThemedText>
            <Ionicons name="information-circle-outline" size={14} color={palette.muted} />
          </Row>
          <ThemedText style={{ color: palette.muted }}>£{serviceFee.toFixed(2)}</ThemedText>
        </Row>
        <Divider spacing={Spacing.xs} />
        <Row justify="space-between" align="center">
          <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>Total</ThemedText>
          <ThemedText type="defaultSemiBold" style={{ ...Typography.heading, color: palette.tint }}>
            £{total.toFixed(2)}
          </ThemedText>
        </Row>
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
        <Row align="center" gap="md">
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
        </Row>
      </SurfaceCard>
    </View>
  );
});

// ─── SecurityNote ────────────────────────────────────────────────────────────

export function SecurityNote({ palette }: { palette: ThemeColors }) {
  return (
    <Row align="center" gap="sm" style={[styles.securityNote, { backgroundColor: withAlpha(palette.success, 0.03) }]}>
      <Ionicons name="shield-checkmark" size={18} color={palette.success} />
      <ThemedText style={[styles.securityText, { color: palette.success }]}>
        Your payment is secured with 256-bit encryption
      </ThemedText>
    </Row>
  );
}
