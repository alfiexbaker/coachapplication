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
import { Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

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
  palette: ReturnType<typeof useTheme>['colors'];
}

function TimeSlot({ label, dateTime, color, icon, palette }: TimeComparisonProps) {
  return (
    <View style={[styles.timeSlot, { borderColor: palette.border }]}>
      <View style={[styles.timeSlotIcon, { backgroundColor: withAlpha(color, 0.07) }]}>
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
  const { colors: palette } = useTheme();

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
        <View style={[styles.headerIcon, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
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
      <View style={[styles.sessionInfo, { backgroundColor: withAlpha(palette.tint, 0.02) }]}>
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
      <View style={[styles.reasonBox, { backgroundColor: withAlpha(palette.warning, 0.03), borderColor: withAlpha(palette.warning, 0.12) }]}>
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
              <ThemedText style={[styles.actionButtonText, { color: palette.surface }]}>Accept</ThemedText>
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
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: { ...Typography.subheading },
  headerSubtitle: { ...Typography.small, marginTop: Spacing.micro },

  // Session info
  sessionInfo: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    gap: Spacing.xs / 2,
  },
  sessionTitle: { ...Typography.body },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  venueText: { ...Typography.small },
  durationText: { ...Typography.caption },

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
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotText: {
    flex: 1,
  },
  timeSlotLabel: { ...Typography.micro },
  timeSlotValue: { ...Typography.body, marginTop: Spacing.micro },

  // Arrow between slots
  arrowWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.micro,
  },
  arrowLine: {
    width: 1,
    height: 8,
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
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
  reasonText: { ...Typography.bodySmall, flex: 1,
    fontStyle: 'italic',
    lineHeight: 20 },

  // Decline reason
  declineReasonWrap: {
    gap: Spacing.xs,
  },
  declineReasonLabel: { ...Typography.caption },
  declineReasonInput: { ...Typography.bodySmall, minHeight: 72,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    padding: Spacing.sm,
    textAlignVertical: 'top' },

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
  actionButtonText: { ...Typography.bodySemiBold },
  actionButtonTextDark: { ...Typography.bodySemiBold },

  // Disclaimer
  disclaimer: { ...Typography.caption, textAlign: 'center',
    lineHeight: 16 },
});
