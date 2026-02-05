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
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { CardStyles } from '@/constants/styles';
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
        <ThemedText style={styles.childLabel}>
          RSVP for {childName}
        </ThemedText>
        <ThemedText style={styles.sessionTitle}>{sessionTitle}</ThemedText>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color={Colors.light.muted} />
          <ThemedText style={styles.detailText}>{formatSessionDate(sessionDate)}</ThemedText>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color={Colors.light.muted} />
          <ThemedText style={styles.detailText}>{formatSessionTime(sessionDate)}</ThemedText>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={18} color={Colors.light.muted} />
          <ThemedText style={styles.detailText}>{location}</ThemedText>
        </View>

        {deadlineLabel && (
          <View style={styles.deadlineBanner}>
            <Ionicons name="hourglass-outline" size={14} color={Colors.light.warning} />
            <ThemedText style={styles.deadlineText}>{deadlineLabel}</ThemedText>
          </View>
        )}
      </View>

      {/* Response Buttons */}
      <View style={styles.responseSection}>
        <ThemedText style={styles.responseLabel}>Will {childName} attend?</ThemedText>

        <Pressable
          style={({ pressed }) => [
            styles.responseButton,
            styles.goingButton,
            selectedStatus === 'going' ? styles.goingButtonActive : undefined,
            pressed ? styles.buttonPressed : undefined,
          ]}
          onPress={() => handlePress('going')}
          disabled={isSubmitting}
        >
          <Ionicons
            name={selectedStatus === 'going' ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={28}
            color={selectedStatus === 'going' ? Colors.light.surface : Colors.light.success}
          />
          <ThemedText
            style={[
              styles.responseButtonText,
              styles.goingText,
              selectedStatus === 'going' ? styles.activeButtonText : undefined,
            ]}
          >
            Going
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.responseButton,
            styles.cantButton,
            selectedStatus === 'not_going' ? styles.cantButtonActive : undefined,
            pressed ? styles.buttonPressed : undefined,
          ]}
          onPress={() => handlePress('not_going')}
          disabled={isSubmitting}
        >
          <Ionicons
            name={selectedStatus === 'not_going' ? 'close-circle' : 'close-circle-outline'}
            size={28}
            color={selectedStatus === 'not_going' ? Colors.light.surface : Colors.light.error}
          />
          <ThemedText
            style={[
              styles.responseButtonText,
              styles.cantText,
              selectedStatus === 'not_going' ? styles.activeButtonText : undefined,
            ]}
          >
            Can&apos;t Make It
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.responseButton,
            styles.maybeButton,
            selectedStatus === 'maybe' ? styles.maybeButtonActive : undefined,
            pressed ? styles.buttonPressed : undefined,
          ]}
          onPress={() => handlePress('maybe')}
          disabled={isSubmitting}
        >
          <Ionicons
            name={selectedStatus === 'maybe' ? 'help-circle' : 'help-circle-outline'}
            size={28}
            color={selectedStatus === 'maybe' ? Colors.light.surface : Colors.light.warning}
          />
          <ThemedText
            style={[
              styles.responseButtonText,
              styles.maybeText,
              selectedStatus === 'maybe' ? styles.activeButtonText : undefined,
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
    color: Colors.light.muted,
    letterSpacing: 0.6,
  },
  sessionTitle: {
    ...Typography.title,
    color: Colors.light.text,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...Typography.body,
    color: Colors.light.muted,
  },
  deadlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: `${Colors.light.warning}15`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
  },
  deadlineText: {
    ...Typography.small,
    color: Colors.light.warning,
    fontWeight: '600',
  },
  responseSection: {
    gap: Spacing.sm,
  },
  responseLabel: {
    ...Typography.heading,
    color: Colors.light.text,
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
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  activeButtonText: {
    color: Colors.light.surface,
  },

  // Going
  goingButton: {
    borderColor: Colors.light.success,
    backgroundColor: `${Colors.light.success}10`,
  },
  goingButtonActive: {
    backgroundColor: Colors.light.success,
    borderColor: Colors.light.success,
  },
  goingText: {
    color: Colors.light.success,
  },

  // Can't
  cantButton: {
    borderColor: Colors.light.error,
    backgroundColor: `${Colors.light.error}10`,
  },
  cantButtonActive: {
    backgroundColor: Colors.light.error,
    borderColor: Colors.light.error,
  },
  cantText: {
    color: Colors.light.error,
  },

  // Maybe
  maybeButton: {
    borderColor: Colors.light.warning,
    backgroundColor: `${Colors.light.warning}10`,
  },
  maybeButtonActive: {
    backgroundColor: Colors.light.warning,
    borderColor: Colors.light.warning,
  },
  maybeText: {
    color: Colors.light.warning,
  },
});

export default RSVPFlow;
