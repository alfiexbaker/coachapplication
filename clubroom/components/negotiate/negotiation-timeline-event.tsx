import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { type TimelineEvent, formatDateTime, formatTimeSlot, getStatusIcon } from './negotiation-timeline-helpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimelineEventItemProps {
  event: TimelineEvent;
  isLast: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const TimelineEventItem = memo(function TimelineEventItem({ event, isLast }: TimelineEventItemProps) {
  const { colors: palette } = useTheme();
  const iconConfig = getStatusIcon(event.type, palette);

  return (
    <View style={styles.timelineItem}>
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
              <ThemedText style={{ color: palette.muted }}>{event.time.location}</ThemedText>
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
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  timelineItem: { flexDirection: 'row', gap: Spacing.sm },
  timelineLeft: { alignItems: 'center', width: 24 },
  timelineDot: { width: 24, height: 24, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  timelineLine: { flex: 1, width: 2, marginVertical: Spacing.xxs },
  timelineContent: { flex: 1, paddingBottom: Spacing.md, gap: Spacing.xs },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle: { ...Typography.sm },
  eventTime: { ...Typography.xs },
  timeCard: { padding: Spacing.sm, borderRadius: Radii.sm, borderWidth: 1, gap: Spacing.xxs },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  messageBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xxs, padding: Spacing.xs, borderRadius: Radii.sm },
  messageText: { ...Typography.sm, flex: 1, fontStyle: 'italic' },
  rejectionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xxs, padding: Spacing.xs, borderRadius: Radii.sm },
  rejectionText: { ...Typography.sm, flex: 1 },
  statusRow: { marginTop: Spacing.micro },
  statusLabel: { ...Typography.sm, fontWeight: '500' },
});
