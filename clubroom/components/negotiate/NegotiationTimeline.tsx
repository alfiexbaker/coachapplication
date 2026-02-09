import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';
import type {
  CounterOfferStatus,
  NegotiationHistory,
  TimeSlot,
} from '@/constants/types';

interface NegotiationTimelineProps {
  negotiation: NegotiationHistory;
  currentUserId: string;
}

interface TimelineEvent {
  id: string;
  type: 'original' | 'offer' | 'accepted' | 'rejected' | 'expired';
  timestamp: string;
  proposerName: string;
  proposerRole: 'PARENT' | 'COACH';
  isCurrentUser: boolean;
  time: TimeSlot;
  message?: string;
  rejectionReason?: string;
  status?: CounterOfferStatus;
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTimeSlot(slot: TimeSlot): string {
  const date = new Date(slot.date);
  const dateStr = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${dateStr} at ${slot.startTime}`;
}

function getStatusIcon(
  type: TimelineEvent['type'],
  palette: ThemeColors
): { name: keyof typeof Ionicons.glyphMap; color: string } {
  switch (type) {
    case 'original':
      return { name: 'flag-outline', color: palette.muted };
    case 'offer':
      return { name: 'swap-horizontal', color: palette.warning };
    case 'accepted':
      return { name: 'checkmark-circle', color: palette.success };
    case 'rejected':
      return { name: 'close-circle', color: palette.error };
    case 'expired':
      return { name: 'hourglass-outline', color: palette.muted };
    default:
      return { name: 'ellipse-outline', color: palette.muted };
  }
}

export function NegotiationTimeline({
  negotiation,
  currentUserId,
}: NegotiationTimelineProps) {
  const { colors: palette } = useTheme();

  // Build timeline events
  const events: TimelineEvent[] = [];

  // Add original booking as first event
  events.push({
    id: 'original',
    type: 'original',
    timestamp: negotiation.createdAt,
    proposerName: 'Original booking',
    proposerRole: 'PARENT',
    isCurrentUser: false,
    time: negotiation.originalTime,
  });

  // Add each offer as an event
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

  // Sort by timestamp
  events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

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
            <ThemedText style={[styles.statusText, { color: palette.success }]}>
              Resolved
            </ThemedText>
          </View>
        )}
        {isCancelled && (
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
            <Ionicons name="close-circle" size={14} color={palette.error} />
            <ThemedText style={[styles.statusText, { color: palette.error }]}>
              Cancelled
            </ThemedText>
          </View>
        )}
        {!isResolved && !isCancelled && (
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
            <Ionicons name="time" size={14} color={palette.warning} />
            <ThemedText style={[styles.statusText, { color: palette.warning }]}>
              In Progress
            </ThemedText>
          </View>
        )}
      </View>

      {/* Participants */}
      <View style={[styles.participantsRow, { backgroundColor: palette.background }]}>
        <View style={styles.participant}>
          <Ionicons name="person" size={14} color={palette.muted} />
          <ThemedText style={[styles.participantText, { color: palette.muted }]}>
            {negotiation.parentName}
          </ThemedText>
        </View>
        <View style={styles.participantDivider}>
          <Ionicons name="swap-horizontal" size={14} color={palette.border} />
        </View>
        <View style={styles.participant}>
          <Ionicons name="school" size={14} color={palette.muted} />
          <ThemedText style={[styles.participantText, { color: palette.muted }]}>
            {negotiation.coachName}
          </ThemedText>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {events.map((event, index) => {
          const iconConfig = getStatusIcon(event.type, palette);
          const isLast = index === events.length - 1;

          return (
            <View key={event.id} style={styles.timelineItem}>
              {/* Timeline line */}
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor: iconConfig.color,
                      borderColor: withAlpha(iconConfig.color, 0.19),
                    },
                  ]}
                >
                  <Ionicons name={iconConfig.name} size={12} color={palette.onPrimary} />
                </View>
                {!isLast && (
                  <View style={[styles.timelineLine, { backgroundColor: palette.border }]} />
                )}
              </View>

              {/* Event content */}
              <View style={styles.timelineContent}>
                <View style={styles.eventHeader}>
                  <ThemedText type="defaultSemiBold" style={styles.eventTitle}>
                    {event.type === 'original'
                      ? 'Original Time'
                      : event.isCurrentUser
                      ? 'You proposed'
                      : `${event.proposerName} proposed`}
                  </ThemedText>
                  <ThemedText style={[styles.eventTime, { color: palette.muted }]}>
                    {formatDateTime(event.timestamp)}
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.timeCard,
                    {
                      backgroundColor:
                        event.type === 'accepted'
                          ? withAlpha(palette.success, 0.03)
                          : event.type === 'rejected'
                          ? withAlpha(palette.error, 0.03)
                          : palette.background,
                      borderColor:
                        event.type === 'accepted'
                          ? withAlpha(palette.success, 0.12)
                          : event.type === 'rejected'
                          ? withAlpha(palette.error, 0.12)
                          : palette.border,
                    },
                  ]}
                >
                  <View style={styles.timeRow}>
                    <Ionicons
                      name="calendar"
                      size={14}
                      color={
                        event.type === 'accepted'
                          ? palette.success
                          : event.type === 'rejected'
                          ? palette.error
                          : palette.tint
                      }
                    />
                    <ThemedText>{formatTimeSlot(event.time)}</ThemedText>
                  </View>
                  {event.time.location && (
                    <View style={styles.timeRow}>
                      <Ionicons name="location-outline" size={14} color={palette.muted} />
                      <ThemedText style={{ color: palette.muted }}>
                        {event.time.location}
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* Message */}
                {event.message && (
                  <View style={[styles.messageBox, { backgroundColor: palette.background }]}>
                    <Ionicons name="chatbubble-outline" size={12} color={palette.muted} />
                    <ThemedText style={[styles.messageText, { color: palette.muted }]}>
                      &quot;{event.message}&quot;
                    </ThemedText>
                  </View>
                )}

                {/* Rejection reason */}
                {event.rejectionReason && (
                  <View style={[styles.rejectionBox, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
                    <Ionicons name="information-circle-outline" size={12} color={palette.error} />
                    <ThemedText style={[styles.rejectionText, { color: palette.error }]}>
                      {event.rejectionReason}
                    </ThemedText>
                  </View>
                )}

                {/* Status label */}
                {event.status && event.type !== 'original' && (
                  <View style={styles.statusRow}>
                    {event.status === 'PENDING' && (
                      <ThemedText style={[styles.statusLabel, { color: palette.warning }]}>
                        Awaiting response
                      </ThemedText>
                    )}
                    {event.status === 'ACCEPTED' && (
                      <ThemedText style={[styles.statusLabel, { color: palette.success }]}>
                        Accepted - Booking updated
                      </ThemedText>
                    )}
                    {event.status === 'REJECTED' && (
                      <ThemedText style={[styles.statusLabel, { color: palette.error }]}>
                        Declined
                      </ThemedText>
                    )}
                    {event.status === 'EXPIRED' && (
                      <ThemedText style={[styles.statusLabel, { color: palette.muted }]}>
                        Expired
                      </ThemedText>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Final time (if resolved) */}
      {isResolved && negotiation.finalTime && (
        <View
          style={[
            styles.finalTimeCard,
            { backgroundColor: withAlpha(palette.success, 0.06), borderColor: withAlpha(palette.success, 0.19) },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color={palette.success} />
          <View style={styles.finalTimeContent}>
            <ThemedText style={[styles.finalTimeLabel, { color: palette.success }]}>
              Final agreed time
            </ThemedText>
            <ThemedText type="defaultSemiBold">{formatTimeSlot(negotiation.finalTime)}</ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusText: {
    ...Typography.sm,
    fontWeight: '600',
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  participantText: {
    ...Typography.sm,
  },
  participantDivider: {
    paddingHorizontal: Spacing.xs,
  },
  timeline: {
    marginTop: Spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginVertical: Spacing.xxs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    ...Typography.sm,
  },
  eventTime: {
    ...Typography.xs,
  },
  timeCard: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
    gap: Spacing.xxs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xxs,
    padding: Spacing.xs,
    borderRadius: Radii.sm,
  },
  messageText: {
    ...Typography.sm,
    flex: 1,
    fontStyle: 'italic',
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xxs,
    padding: Spacing.xs,
    borderRadius: Radii.sm,
  },
  rejectionText: {
    ...Typography.sm,
    flex: 1,
  },
  statusRow: {
    marginTop: Spacing.micro,
  },
  statusLabel: {
    ...Typography.sm,
    fontWeight: '500',
  },
  finalTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  finalTimeContent: {
    flex: 1,
  },
  finalTimeLabel: {
    ...Typography.sm,
    fontWeight: '600',
  },
});
