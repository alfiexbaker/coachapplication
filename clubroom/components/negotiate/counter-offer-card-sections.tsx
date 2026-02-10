/**
 * Extracted sub-components for CounterOfferCard.
 *
 * formatDate / formatTime / getTimeRemaining / getStatusConfig — helpers.
 * OfferHeader — proposer info + status badge.
 * TimeChangeDisplay — original → proposed time comparison.
 * OfferMessage — quoted message bubble.
 * RejectionReason — error-style rejection display.
 * ExpiryTimer — countdown for pending offers.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { CounterOfferStatus } from '@/constants/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short' });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes}${suffix}`;
}

export function getTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h left`;
  }
  if (diffHours > 0) {
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m left`;
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return `${diffMinutes}m left`;
}

export function getStatusConfig(
  status: CounterOfferStatus,
  palette: ThemeColors,
): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
} {
  switch (status) {
    case 'PENDING':
      return { icon: 'time-outline', color: palette.warning, label: 'Pending' };
    case 'ACCEPTED':
      return { icon: 'checkmark-circle-outline', color: palette.success, label: 'Accepted' };
    case 'REJECTED':
      return { icon: 'close-circle-outline', color: palette.error, label: 'Declined' };
    case 'EXPIRED':
      return { icon: 'hourglass-outline', color: palette.muted, label: 'Expired' };
    default:
      return { icon: 'help-circle-outline', color: palette.muted, label: 'Unknown' };
  }
}

// ─── OfferHeader ──────────────────────────────────────────────────────────────

interface OfferHeaderProps {
  proposerName: string;
  proposedBy: 'PARENT' | 'COACH';
  status: CounterOfferStatus;
  palette: ThemeColors;
}

export const OfferHeader = memo(function OfferHeader({
  proposerName,
  proposedBy,
  status,
  palette }: OfferHeaderProps) {
  const statusConfig = getStatusConfig(status, palette);

  return (
    <Row justify="between" align="center">
      <Row align="center" gap="sm">
        <View
          style={[
            styles.avatarPlaceholder,
            { backgroundColor: withAlpha(palette.tint, 0.09) },
          ]}
        >
          <Ionicons
            name={proposedBy === 'PARENT' ? 'person' : 'school'}
            size={18}
            color={palette.tint}
          />
        </View>
        <View>
          <ThemedText type="defaultSemiBold">{proposerName}</ThemedText>
          <ThemedText style={[styles.roleLabel, { color: palette.muted }]}>
            {proposedBy === 'PARENT' ? 'Parent' : 'Coach'}
          </ThemedText>
        </View>
      </Row>

      <Row
        align="center"
        gap="xxs"
        style={[
          styles.statusBadge,
          { backgroundColor: withAlpha(statusConfig.color, 0.09) },
        ]}
      >
        <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
        <ThemedText style={[styles.statusText, { color: statusConfig.color }]}>
          {statusConfig.label}
        </ThemedText>
      </Row>
    </Row>
  );
});

// ─── TimeChangeDisplay ────────────────────────────────────────────────────────

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface TimeChangeDisplayProps {
  originalTime: TimeSlot;
  proposedTime: TimeSlot;
  palette: ThemeColors;
}

export const TimeChangeDisplay = memo(function TimeChangeDisplay({
  originalTime,
  proposedTime,
  palette }: TimeChangeDisplayProps) {
  return (
    <Row align="center" gap="sm">
      <View style={styles.timeBlock}>
        <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>
          Original
        </ThemedText>
        <Row align="center" gap="xxs">
          <Ionicons name="calendar-outline" size={16} color={palette.muted} />
          <ThemedText style={styles.timeValue}>
            {formatDate(originalTime.date)}
          </ThemedText>
        </Row>
        <Row align="center" gap="xxs">
          <Ionicons name="time-outline" size={16} color={palette.muted} />
          <ThemedText style={styles.timeValue}>
            {formatTime(originalTime.startTime)} - {formatTime(originalTime.endTime)}
          </ThemedText>
        </Row>
      </View>

      <View style={styles.arrowContainer}>
        <Ionicons name="arrow-forward" size={20} color={palette.tint} />
      </View>

      <View
        style={[
          styles.timeBlock,
          styles.proposedTimeBlock,
          { backgroundColor: withAlpha(palette.tint, 0.03) },
        ]}
      >
        <ThemedText style={[styles.timeLabel, { color: palette.tint }]}>
          Proposed
        </ThemedText>
        <Row align="center" gap="xxs">
          <Ionicons name="calendar" size={16} color={palette.tint} />
          <ThemedText style={[styles.timeValue, { color: palette.tint }]}>
            {formatDate(proposedTime.date)}
          </ThemedText>
        </Row>
        <Row align="center" gap="xxs">
          <Ionicons name="time" size={16} color={palette.tint} />
          <ThemedText style={[styles.timeValue, { color: palette.tint }]}>
            {formatTime(proposedTime.startTime)} - {formatTime(proposedTime.endTime)}
          </ThemedText>
        </Row>
      </View>
    </Row>
  );
});

// ─── OfferMessage ─────────────────────────────────────────────────────────────

interface OfferMessageProps {
  message: string;
  palette: ThemeColors;
}

export const OfferMessage = memo(function OfferMessage({
  message,
  palette }: OfferMessageProps) {
  return (
    <Row align="start" gap="xs" style={[styles.messageContainer, { backgroundColor: palette.background }]}>
      <Ionicons name="chatbubble-outline" size={14} color={palette.muted} />
      <ThemedText style={[styles.messageText, { color: palette.text }]}>
        &quot;{message}&quot;
      </ThemedText>
    </Row>
  );
});

// ─── RejectionReason ──────────────────────────────────────────────────────────

interface RejectionReasonProps {
  reason: string;
  palette: ThemeColors;
}

export const RejectionReason = memo(function RejectionReason({
  reason,
  palette }: RejectionReasonProps) {
  return (
    <Row align="start" gap="xs" style={[styles.rejectionContainer, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
      <Ionicons name="information-circle-outline" size={14} color={palette.error} />
      <ThemedText style={[styles.rejectionText, { color: palette.error }]}>
        {reason}
      </ThemedText>
    </Row>
  );
});

// ─── ExpiryTimer ──────────────────────────────────────────────────────────────

interface ExpiryTimerProps {
  expiresAt: string;
  palette: ThemeColors;
}

export const ExpiryTimer = memo(function ExpiryTimer({
  expiresAt,
  palette }: ExpiryTimerProps) {
  return (
    <Row align="center" gap="xxs">
      <Ionicons name="hourglass-outline" size={14} color={palette.warning} />
      <ThemedText style={[styles.expiryText, { color: palette.warning }]}>
        {getTimeRemaining(expiresAt)}
      </ThemedText>
    </Row>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    gap: Spacing.sm },
  header: {},
  proposerInfo: {},
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center' },
  roleLabel: {
    ...Typography.small },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill },
  statusText: {
    ...Typography.small,
    fontWeight: '600' },
  timeChangeContainer: {},
  timeBlock: {
    flex: 1,
    gap: Spacing.xxs },
  proposedTimeBlock: {
    padding: Spacing.sm,
    borderRadius: Radii.md },
  timeLabel: {
    ...Typography.small,
    fontWeight: '600',
    marginBottom: Spacing.micro },
  timeRow: {},
  timeValue: {
    ...Typography.small },
  arrowContainer: {
    paddingHorizontal: Spacing.xs },
  messageContainer: {
    padding: Spacing.sm,
    borderRadius: Radii.md },
  messageText: {
    ...Typography.small,
    flex: 1,
    fontStyle: 'italic' },
  rejectionContainer: {
    padding: Spacing.sm,
    borderRadius: Radii.md },
  rejectionText: {
    ...Typography.small,
    flex: 1 },
  expiryRow: {},
  expiryText: {
    ...Typography.small,
    fontWeight: '500' } });
