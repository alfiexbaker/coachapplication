import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  formatDateTime,
  type RescheduleProposal,
  type RescheduleDecision,
  type RescheduleRequestProps,
} from './reschedule-helpers';
import { RescheduleActions } from './reschedule-actions';

// ─── Re-export types ────────────────────────────────────────────────────────

export type { RescheduleProposal, RescheduleDecision, RescheduleRequestProps };

// ─── TimeSlot Sub-component ─────────────────────────────────────────────────

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
        <ThemedText style={[styles.timeSlotLabel, { color: palette.muted }]}>{label}</ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.timeSlotValue}>
          {formatDateTime(dateTime)}
        </ThemedText>
      </View>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

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
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>Reschedule Request</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]}>
            {proposal.coachName} wants to move your session
          </ThemedText>
        </View>
      </View>

      {/* Session info */}
      <View style={[styles.sessionInfo, { backgroundColor: withAlpha(palette.tint, 0.02) }]}>
        <ThemedText type="defaultSemiBold" style={styles.sessionTitle}>{proposal.sessionTitle}</ThemedText>
        {proposal.venue && (
          <View style={styles.venueRow}>
            <Ionicons name="location-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.venueText, { color: palette.muted }]}>{proposal.venue}</ThemedText>
          </View>
        )}
        <ThemedText style={[styles.durationText, { color: palette.muted }]}>
          {proposal.durationMinutes} minutes
        </ThemedText>
      </View>

      {/* Time comparison */}
      <View style={styles.timeComparison}>
        <TimeSlot label="Original" dateTime={proposal.originalDateTime} color={palette.error} icon="close-circle-outline" palette={palette} />
        <View style={styles.arrowWrap}>
          <View style={[styles.arrowLine, { backgroundColor: palette.border }]} />
          <View style={[styles.arrowCircle, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="arrow-down" size={16} color={palette.muted} />
          </View>
          <View style={[styles.arrowLine, { backgroundColor: palette.border }]} />
        </View>
        <TimeSlot label="Proposed" dateTime={proposal.proposedDateTime} color={palette.success} icon="checkmark-circle-outline" palette={palette} />
      </View>

      {/* Coach's reason */}
      <View style={[styles.reasonBox, { backgroundColor: withAlpha(palette.warning, 0.03), borderColor: withAlpha(palette.warning, 0.12) }]}>
        <Ionicons name="chatbubble-outline" size={16} color={palette.warning} />
        <ThemedText style={[styles.reasonText, { color: palette.text }]}>
          &ldquo;{proposal.reason}&rdquo;
        </ThemedText>
      </View>

      {/* Actions */}
      <RescheduleActions
        processing={processing}
        showDeclineReason={showDeclineReason}
        declineReason={declineReason}
        onDeclineReasonChange={setDeclineReason}
        onAccept={handleAccept}
        onSuggestDifferent={handleSuggestDifferent}
        onDecline={handleDecline}
      />

      {/* Disclaimer */}
      <ThemedText style={[styles.disclaimer, { color: palette.muted }]}>
        This session will not be moved until you confirm. Your original booking is safe.
      </ThemedText>
    </SurfaceCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerIcon: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { ...Typography.subheading },
  headerSubtitle: { ...Typography.small, marginTop: Spacing.micro },
  sessionInfo: { padding: Spacing.sm, borderRadius: Radii.sm, gap: Spacing.xs / 2 },
  sessionTitle: { ...Typography.body },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs / 2 },
  venueText: { ...Typography.small },
  durationText: { ...Typography.caption },
  timeComparison: { gap: 0 },
  timeSlot: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderWidth: 1, borderRadius: Radii.sm },
  timeSlotIcon: { width: 32, height: 32, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  timeSlotText: { flex: 1 },
  timeSlotLabel: { ...Typography.micro },
  timeSlotValue: { ...Typography.body, marginTop: Spacing.micro },
  arrowWrap: { alignItems: 'center', paddingVertical: Spacing.micro },
  arrowLine: { width: 1, height: 8 },
  arrowCircle: { width: 24, height: 24, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  reasonBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radii.sm, borderWidth: 1 },
  reasonText: { ...Typography.bodySmall, flex: 1, fontStyle: 'italic', lineHeight: 20 },
  disclaimer: { ...Typography.caption, textAlign: 'center', lineHeight: 16 },
});
