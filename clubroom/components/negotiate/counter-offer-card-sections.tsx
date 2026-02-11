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
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { CounterOfferStatus } from '@/constants/types';
import { styles } from './counter-offer-card-styles';
import {
  formatDate,
  formatTime,
  getTimeRemaining,
  getStatusConfig,
} from './counter-offer-card-helpers';

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

export { styles };
export { getStatusConfig } from './counter-offer-card-helpers';
