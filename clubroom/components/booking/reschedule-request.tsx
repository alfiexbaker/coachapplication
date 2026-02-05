/**
 * Reschedule Request Card
 *
 * Displayed to a parent when a coach proposes a reschedule.
 * The parent must explicitly Accept, Suggest Different, or Decline.
 * Nothing is auto-accepted.
 *
 * USER STORY:
 * "As a parent, I want to see a clear comparison of original vs proposed
 * times so I can make an informed decision about the reschedule."
 */

import { useState } from 'react';
import { View, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RescheduleProposal {
  /** Unique proposal ID */
  id: string;
  /** Booking ID this proposal relates to */
  bookingId: string;
  /** Coach who proposed the reschedule */
  coachName: string;
  coachId: string;
  /** Session title / sport */
  sessionTitle: string;
  /** Original scheduled date-time */
  originalDateTime: Date;
  /** Proposed new date-time */
  proposedDateTime: Date;
  /** Coach's reason for the reschedule */
  reason: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Venue name if applicable */
  venue?: string;
}

export type RescheduleDecision = 'accepted' | 'counter' | 'declined';

export interface RescheduleRequestProps {
  proposal: RescheduleProposal;
  /** Called when parent accepts the proposed time */
  onAccept: (proposalId: string) => void | Promise<void>;
  /** Called when parent wants to suggest a different time */
  onSuggestDifferent: (proposalId: string) => void;
  /** Called when parent declines entirely (cancel the booking) */
  onDecline: (proposalId: string, reason?: string) => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDay(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  const mins = m === 0 ? '' : `:${m.toString().padStart(2, '0')}`;
  return `${hour}${mins}${ampm}`;
}

function formatDateTime(date: Date): string {
  return `${formatDay(date)} \u00B7 ${formatTime(date)}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TimeComparisonProps {
  label: string;
  dateTime: Date;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  palette: (typeof Colors)['light'];
}

function TimeSlot({ label, dateTime, color, icon, palette }: TimeComparisonProps) {
  return (
    <View style={[styles.timeSlot, { borderColor: palette.border }]}>
      <View style={[styles.timeSlotIcon, { backgroundColor: `${color}12` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.timeSlotText}>
        <ThemedText style={[styles.timeSlotLabel, { color: palette.muted }]}>
          {label}
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.timeSlotValue}>
          {formatDateTime(dateTime)}
        </ThemedText>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RescheduleRequest({
  proposal,
  onAccept,
  onSuggestDifferent,
  onDecline,
}: RescheduleRequestProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [processing, setProcessing] = useState<RescheduleDecision | null>(null);
  const [showDeclineReason, setShowDeclineReason] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const handleAccept = async () => {
    setProcessing('accepted');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await onAccept(proposal.id);
    } finally {
      setProcessing(null);
    }
  };

  const handleSuggestDifferent = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSuggestDifferent(proposal.id);
  };

  const handleDecline = async () => {
    if (!showDeclineReason) {
      setShowDeclineReason(true);
      return;
    }
    setProcessing('declined');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await onDecline(proposal.id, declineReason || undefined);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <SurfaceCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: `${palette.warning}15` }]}>
          <Ionicons name="swap-horizontal" size={20} color={palette.warning} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            Reschedule Request
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]}>
            {proposal.coachName} wants to move your session
          </ThemedText>
        </View>
      </View>

      {/* Session info */}
      <View style={[styles.sessionInfo, { backgroundColor: `${palette.tint}06` }]}>
        <ThemedText type="defaultSemiBold" style={styles.sessionTitle}>
          {proposal.sessionTitle}
        </ThemedText>
        {proposal.venue && (
          <View style={styles.venueRow}>
            <Ionicons name="location-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.venueText, { color: palette.muted }]}>
              {proposal.venue}
            </ThemedText>
          </View>
        )}
        <ThemedText style={[styles.durationText, { color: palette.muted }]}>
          {proposal.durationMinutes} minutes
        </ThemedText>
      </View>

      {/* Time comparison */}
      <View style={styles.timeComparison}>
        <TimeSlot
          label="Original"
          dateTime={proposal.originalDateTime}
          color={palette.error}
          icon="close-circle-outline"
          palette={palette}
        />

        <View style={styles.arrowWrap}>
          <View style={[styles.arrowLine, { backgroundColor: palette.border }]} />
          <View style={[styles.arrowCircle, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="arrow-down" size={16} color={palette.muted} />
          </View>
          <View style={[styles.arrowLine, { backgroundColor: palette.border }]} />
        </View>

        <TimeSlot
          label="Proposed"
          dateTime={proposal.proposedDateTime}
          color={palette.success}
          icon="checkmark-circle-outline"
          palette={palette}
        />
      </View>

      {/* Coach's reason */}
      <View style={[styles.reasonBox, { backgroundColor: `${palette.warning}08`, borderColor: `${palette.warning}20` }]}>
        <Ionicons name="chatbubble-outline" size={16} color={palette.warning} />
        <ThemedText style={[styles.reasonText, { color: palette.text }]}>
          &ldquo;{proposal.reason}&rdquo;
        </ThemedText>
      </View>

      {/* Decline reason input (conditional) */}
      {showDeclineReason && (
        <View style={styles.declineReasonWrap}>
          <ThemedText style={[styles.declineReasonLabel, { color: palette.muted }]}>
            Reason for declining (optional)
          </ThemedText>
          <TextInput
            placeholder="Let the coach know why..."
            placeholderTextColor={palette.muted}
            value={declineReason}
            onChangeText={setDeclineReason}
            multiline
            numberOfLines={3}
            style={[
              styles.declineReasonInput,
              { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface },
            ]}
          />
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Accept */}
        <Clickable
          onPress={handleAccept}
          disabled={processing !== null}
          style={[styles.actionButton, styles.acceptButton, { backgroundColor: palette.success }]}
        >
          {processing === 'accepted' ? (
            <ActivityIndicator size="small" color={palette.surface} />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color={palette.surface} />
              <ThemedText style={styles.actionButtonText}>Accept</ThemedText>
            </>
          )}
        </Clickable>

        {/* Suggest Different */}
        <Clickable
          onPress={handleSuggestDifferent}
          disabled={processing !== null}
          style={[
            styles.actionButton,
            styles.suggestButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Ionicons name="calendar-outline" size={18} color={palette.text} />
          <ThemedText style={[styles.actionButtonTextDark, { color: palette.text }]}>
            Suggest Different
          </ThemedText>
        </Clickable>

        {/* Decline / Cancel booking */}
        <Clickable
          onPress={handleDecline}
          disabled={processing !== null}
          style={[
            styles.actionButton,
            styles.declineButton,
            {
              backgroundColor: showDeclineReason ? palette.error : palette.surface,
              borderColor: showDeclineReason ? palette.error : palette.border,
            },
          ]}
        >
          {processing === 'declined' ? (
            <ActivityIndicator size="small" color={palette.surface} />
          ) : (
            <>
              <Ionicons
                name="close"
                size={18}
                color={showDeclineReason ? palette.surface : palette.error}
              />
              <ThemedText
                style={[
                  showDeclineReason ? styles.actionButtonText : styles.actionButtonTextDark,
                  { color: showDeclineReason ? palette.surface : palette.error },
                ]}
              >
                {showDeclineReason ? 'Confirm Decline' : 'Decline'}
              </ThemedText>
            </>
          )}
        </Clickable>
      </View>

      {/* Disclaimer */}
      <ThemedText style={[styles.disclaimer, { color: palette.muted }]}>
        This session will not be moved until you confirm. Your original booking is safe.
      </ThemedText>
    </SurfaceCard>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  // Session info
  sessionInfo: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    gap: Spacing.xs / 2,
  },
  sessionTitle: {
    fontSize: 15,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  venueText: {
    fontSize: 13,
  },
  durationText: {
    fontSize: 12,
  },

  // Time comparison
  timeComparison: {
    gap: 0,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.sm,
  },
  timeSlotIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotText: {
    flex: 1,
  },
  timeSlotLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  timeSlotValue: {
    fontSize: 15,
    marginTop: 2,
  },

  // Arrow between slots
  arrowWrap: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  arrowLine: {
    width: 1,
    height: 8,
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Reason
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Decline reason
  declineReasonWrap: {
    gap: Spacing.xs,
  },
  declineReasonLabel: {
    fontSize: 12,
  },
  declineReasonInput: {
    minHeight: 72,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    padding: Spacing.sm,
    textAlignVertical: 'top',
    fontSize: 14,
  },

  // Actions
  actions: {
    gap: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 44,
    borderRadius: Radii.card,
  },
  acceptButton: {
    // bg set inline
  },
  suggestButton: {
    borderWidth: 1.5,
  },
  declineButton: {
    borderWidth: 1.5,
  },
  actionButtonText: {
    color: Colors.light.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  actionButtonTextDark: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Disclaimer
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
