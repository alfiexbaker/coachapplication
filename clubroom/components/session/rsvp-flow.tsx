/**
 * RSVPFlow - Parent RSVP Interface
 *
 * Presents session details and three large response buttons for parents
 * to confirm their child's attendance at a group session.
 *
 * Usage:
 *   <RSVPFlow
 *     sessionId="sess_1"
 *     sessionTitle="U12 Squad Training"
 *     sessionDate="2026-02-10T16:00:00Z"
 *     location="Hackney Marshes, Pitch 3"
 *     childName="Tom Baker"
 *     rsvpId="rsvp_1"
 *     onRespond={(status) => handleResponse(status)}
 *   />
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createCardStyles } from '@/constants/styles';
import { ThemedText } from '@/components/themed-text';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RSVPFlowProps {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  location: string;
  childName: string;
  rsvpId: string;
  onRespond: (status: 'going' | 'not_going' | 'maybe') => void;
  /** Optional deadline for responding */
  responseDeadline?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatSessionTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTimeUntilDeadline(deadline: string): string {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h left to respond`;
  if (hours > 0) return `${hours}h left to respond`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m left to respond`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RSVPFlow({
  sessionId,
  sessionTitle,
  sessionDate,
  location,
  childName,
  rsvpId,
  onRespond,
  responseDeadline,
}: RSVPFlowProps) {
  const { colors } = useTheme();
  const CardStyles = createCardStyles(colors);

  const [selectedStatus, setSelectedStatus] = useState<'going' | 'not_going' | 'maybe' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deadlineLabel = useMemo(() => {
    if (!responseDeadline) return null;
    return getTimeUntilDeadline(responseDeadline);
  }, [responseDeadline]);

  const handlePress = async (status: 'going' | 'not_going' | 'maybe') => {
    if (isSubmitting) return;
    setSelectedStatus(status);
    setIsSubmitting(true);
    try {
      await onRespond(status);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Session Info Card */}
      <View style={[CardStyles.base, styles.infoCard]}>
        <ThemedText style={[styles.childLabel, { color: colors.muted }]}>
          RSVP for {childName}
        </ThemedText>
        <ThemedText style={[styles.sessionTitle, { color: colors.text }]}>{sessionTitle}</ThemedText>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color={colors.muted} />
          <ThemedText style={[styles.detailText, { color: colors.muted }]}>{formatSessionDate(sessionDate)}</ThemedText>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color={colors.muted} />
          <ThemedText style={[styles.detailText, { color: colors.muted }]}>{formatSessionTime(sessionDate)}</ThemedText>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={18} color={colors.muted} />
          <ThemedText style={[styles.detailText, { color: colors.muted }]}>{location}</ThemedText>
        </View>

        {deadlineLabel && (
          <View style={[styles.deadlineBanner, { backgroundColor: withAlpha(colors.warning, 0.09) }]}>
            <Ionicons name="hourglass-outline" size={14} color={colors.warning} />
            <ThemedText style={[styles.deadlineText, { color: colors.warning }]}>{deadlineLabel}</ThemedText>
          </View>
        )}
      </View>

      {/* Response Buttons */}
      <View style={styles.responseSection}>
        <ThemedText style={[styles.responseLabel, { color: colors.text }]}>Will {childName} attend?</ThemedText>

        <Pressable
          style={({ pressed }) => [
            styles.responseButton,
            { borderColor: colors.success, backgroundColor: withAlpha(colors.success, 0.06) },
            selectedStatus === 'going' ? { backgroundColor: colors.success, borderColor: colors.success } : undefined,
            pressed ? styles.buttonPressed : undefined,
          ]}
          onPress={() => handlePress('going')}
          disabled={isSubmitting}
        >
          <Ionicons
            name={selectedStatus === 'going' ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={28}
            color={selectedStatus === 'going' ? colors.surface : colors.success}
          />
          <ThemedText
            style={[
              styles.responseButtonText,
              { color: colors.success },
              selectedStatus === 'going' ? { color: colors.surface } : undefined,
            ]}
          >
            Going
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.responseButton,
            { borderColor: colors.error, backgroundColor: withAlpha(colors.error, 0.06) },
            selectedStatus === 'not_going' ? { backgroundColor: colors.error, borderColor: colors.error } : undefined,
            pressed ? styles.buttonPressed : undefined,
          ]}
          onPress={() => handlePress('not_going')}
          disabled={isSubmitting}
        >
          <Ionicons
            name={selectedStatus === 'not_going' ? 'close-circle' : 'close-circle-outline'}
            size={28}
            color={selectedStatus === 'not_going' ? colors.surface : colors.error}
          />
          <ThemedText
            style={[
              styles.responseButtonText,
              { color: colors.error },
              selectedStatus === 'not_going' ? { color: colors.surface } : undefined,
            ]}
          >
            Can&apos;t Make It
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.responseButton,
            { borderColor: colors.warning, backgroundColor: withAlpha(colors.warning, 0.06) },
            selectedStatus === 'maybe' ? { backgroundColor: colors.warning, borderColor: colors.warning } : undefined,
            pressed ? styles.buttonPressed : undefined,
          ]}
          onPress={() => handlePress('maybe')}
          disabled={isSubmitting}
        >
          <Ionicons
            name={selectedStatus === 'maybe' ? 'help-circle' : 'help-circle-outline'}
            size={28}
            color={selectedStatus === 'maybe' ? colors.surface : colors.warning}
          />
          <ThemedText
            style={[
              styles.responseButtonText,
              { color: colors.warning },
              selectedStatus === 'maybe' ? { color: colors.surface } : undefined,
            ]}
          >
            Maybe
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  infoCard: {
    gap: Spacing.sm,
  },
  childLabel: {
    ...Typography.micro,
    letterSpacing: 0.6,
  },
  sessionTitle: {
    ...Typography.title,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...Typography.body,
  },
  deadlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
  },
  deadlineText: {
    ...Typography.smallSemiBold,
  },
  responseSection: {
    gap: Spacing.sm,
  },
  responseLabel: {
    ...Typography.heading,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  responseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 64,
    borderRadius: Radii.card,
    borderWidth: 2,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  responseButtonText: {
    ...Typography.heading,
    letterSpacing: -0.2,
  },
});

export default RSVPFlow;
