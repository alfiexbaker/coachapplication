import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { NegotiationHistory } from '@/constants/types';
import { type TimelineEvent, formatTimeSlot } from './negotiation-timeline-helpers';
import { TimelineEventItem } from './negotiation-timeline-event';

// ─── Types ──────────────────────────────────────────────────────────────────

interface NegotiationTimelineProps {
  negotiation: NegotiationHistory;
  currentUserId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function NegotiationTimeline({ negotiation, currentUserId }: NegotiationTimelineProps) {
  const { colors: palette } = useTheme();

  // Build timeline events
  const events: TimelineEvent[] = [];

  events.push({
    id: 'original',
    type: 'original',
    timestamp: negotiation.createdAt,
    proposerName: 'Original booking',
    proposerRole: 'PARENT',
    isCurrentUser: false,
    time: negotiation.originalTime,
  });

  negotiation.offers.forEach((offer) => {
    let type: TimelineEvent['type'] = 'offer';
    if (offer.status === 'ACCEPTED') type = 'accepted';
    if (offer.status === 'REJECTED') type = 'rejected';
    if (offer.status === 'EXPIRED') type = 'expired';

    events.push({
      id: offer.id,
      type,
      timestamp: offer.createdAt,
      proposerName: offer.proposerName,
      proposerRole: offer.proposedBy,
      isCurrentUser: offer.proposerId === currentUserId,
      time: offer.proposedTime,
      message: offer.message,
      rejectionReason: offer.rejectionReason,
      status: offer.status,
    });
  });

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const isResolved = negotiation.status === 'RESOLVED';
  const isCancelled = negotiation.status === 'CANCELLED';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold">Negotiation History</ThemedText>
        {isResolved && (
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
            <Ionicons name="checkmark-circle" size={14} color={palette.success} />
            <ThemedText style={[styles.statusText, { color: palette.success }]}>Resolved</ThemedText>
          </View>
        )}
        {isCancelled && (
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
            <Ionicons name="close-circle" size={14} color={palette.error} />
            <ThemedText style={[styles.statusText, { color: palette.error }]}>Cancelled</ThemedText>
          </View>
        )}
        {!isResolved && !isCancelled && (
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
            <Ionicons name="time" size={14} color={palette.warning} />
            <ThemedText style={[styles.statusText, { color: palette.warning }]}>In Progress</ThemedText>
          </View>
        )}
      </View>

      {/* Participants */}
      <View style={[styles.participantsRow, { backgroundColor: palette.background }]}>
        <View style={styles.participant}>
          <Ionicons name="person" size={14} color={palette.muted} />
          <ThemedText style={[styles.participantText, { color: palette.muted }]}>{negotiation.parentName}</ThemedText>
        </View>
        <View style={styles.participantDivider}>
          <Ionicons name="swap-horizontal" size={14} color={palette.border} />
        </View>
        <View style={styles.participant}>
          <Ionicons name="school" size={14} color={palette.muted} />
          <ThemedText style={[styles.participantText, { color: palette.muted }]}>{negotiation.coachName}</ThemedText>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {events.map((event, index) => (
          <TimelineEventItem key={event.id} event={event} isLast={index === events.length - 1} />
        ))}
      </View>

      {/* Final time (if resolved) */}
      {isResolved && negotiation.finalTime && (
        <View style={[styles.finalTimeCard, { backgroundColor: withAlpha(palette.success, 0.06), borderColor: withAlpha(palette.success, 0.19) }]}>
          <Ionicons name="checkmark-circle" size={20} color={palette.success} />
          <View style={styles.finalTimeContent}>
            <ThemedText style={[styles.finalTimeLabel, { color: palette.success }]}>Final agreed time</ThemedText>
            <ThemedText type="defaultSemiBold">{formatTimeSlot(negotiation.finalTime)}</ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  statusText: { ...Typography.sm, fontWeight: '600' },
  participantsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.sm, borderRadius: Radii.md, gap: Spacing.sm },
  participant: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  participantText: { ...Typography.sm },
  participantDivider: { paddingHorizontal: Spacing.xs },
  timeline: { marginTop: Spacing.sm },
  finalTimeCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1, marginTop: Spacing.sm },
  finalTimeContent: { flex: 1 },
  finalTimeLabel: { ...Typography.sm, fontWeight: '600' },
});
