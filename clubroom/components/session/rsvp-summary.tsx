/**
 * RSVPSummary - Coach RSVP Overview
 *
 * Displays aggregated RSVP counts for a session with expandable name lists
 * per status. Includes a "Send Reminder" button for pending respondents
 * and a progress indicator showing confirmation rate.
 *
 * Usage:
 *   <RSVPSummary sessionId="sess_1" />
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';
import { rsvpService } from '@/services/rsvp-service';
import type { SessionRsvp } from '@/constants/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RSVPSummaryProps {
  sessionId: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CountBadgeProps {
  count: number;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function CountBadge({ count, label, color, icon }: CountBadgeProps) {
  return (
    <View style={[styles.countBadge, { backgroundColor: withAlpha(color, 0.07) }]}>
      <Ionicons name={icon} size={18} color={color} />
      <ThemedText style={[styles.countNumber, { color }]}>{count}</ThemedText>
      <ThemedText style={[styles.countLabel, { color }]}>{label}</ThemedText>
    </View>
  );
}

interface ExpandableListProps {
  title: string;
  names: string[];
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  mutedColor: string;
}

function ExpandableList({ title, names, color, icon, mutedColor }: ExpandableListProps) {
  const [expanded, setExpanded] = useState(false);

  if (names.length === 0) return null;

  return (
    <View style={styles.expandableContainer}>
      <Pressable
        style={styles.expandableHeader}
        onPress={() => setExpanded(!expanded)}
        accessibilityLabel={`${title} (${names.length})`}
      >
        <View style={styles.expandableLeft}>
          <Ionicons name={icon} size={18} color={color} />
          <ThemedText style={styles.expandableTitle}>
            {title} ({names.length})
          </ThemedText>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={mutedColor}
        />
      </Pressable>

      {expanded && (
        <View style={styles.namesList}>
          {names.map((name, index) => (
            <View key={index} style={styles.nameRow}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <ThemedText style={styles.nameText}>{name}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function RSVPSummary({ sessionId }: RSVPSummaryProps) {
  const { colors: palette } = useTheme();
  const [rsvps, setRsvps] = useState<SessionRsvp[]>([]);
  const [counts, setCounts] = useState({ going: 0, notGoing: 0, maybe: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sessionRsvps, sessionCounts] = await Promise.all([
        rsvpService.getForSession(sessionId),
        rsvpService.getSessionCounts(sessionId),
      ]);
      setRsvps(sessionRsvps);
      setCounts(sessionCounts);
    } catch {
      // Fail silently, show empty state
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const total = counts.going + counts.notGoing + counts.maybe + counts.pending;
  const confirmed = counts.going + counts.notGoing + counts.maybe;
  const progressPercent = total > 0 ? (confirmed / total) * 100 : 0;

  const goingNames = rsvps
    .filter((r) => r.status === 'going')
    .map((r) => r.childName || `User ${r.userId.slice(-4)}`);

  const cantNames = rsvps
    .filter((r) => r.status === 'not_going')
    .map((r) => r.childName || `User ${r.userId.slice(-4)}`);

  const maybeNames = rsvps
    .filter((r) => r.status === 'maybe')
    .map((r) => r.childName || `User ${r.userId.slice(-4)}`);

  const pendingNames = rsvps
    .filter((r) => r.status === 'pending')
    .map((r) => r.childName || `User ${r.userId.slice(-4)}`);

  const handleSendReminder = async () => {
    if (counts.pending === 0) {
      Alert.alert('All Responded', 'Everyone has already responded to this session.');
      return;
    }

    setSendingReminder(true);
    try {
      await rsvpService.sendReminder(sessionId);
      Alert.alert(
        'Reminders Sent',
        `Reminder sent to ${counts.pending} parent${counts.pending !== 1 ? 's' : ''}.`,
      );
    } catch {
      Alert.alert('Error', 'Failed to send reminders. Please try again.');
    } finally {
      setSendingReminder(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.cardBase, styles.loadingContainer, { backgroundColor: palette.surface }]}>
        <ActivityIndicator size="small" color={palette.tint} />
      </View>
    );
  }

  if (total === 0) {
    return (
      <View style={[styles.cardBase, styles.emptyContainer, { backgroundColor: palette.surface }]}>
        <Ionicons name="people-outline" size={32} color={palette.muted} />
        <ThemedText style={styles.emptyText}>No RSVPs yet</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.cardBase, styles.container, { backgroundColor: palette.surface }]}>
      {/* Header */}
      <ThemedText style={styles.sectionTitle}>Attendance</ThemedText>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%`, backgroundColor: palette.success },
            ]}
          />
        </View>
        <ThemedText style={[styles.progressText, { color: palette.muted }]}>
          {confirmed}/{total} confirmed
        </ThemedText>
      </View>

      {/* Count badges */}
      <View style={styles.badgeRow}>
        <CountBadge
          count={counts.going}
          label="Going"
          color={palette.success}
          icon="checkmark-circle"
        />
        <CountBadge
          count={counts.notGoing}
          label="Can't"
          color={palette.error}
          icon="close-circle"
        />
        <CountBadge
          count={counts.maybe}
          label="Maybe"
          color={palette.warning}
          icon="help-circle"
        />
      </View>

      {/* Expandable lists */}
      <View style={styles.listsContainer}>
        <ExpandableList
          title="Going"
          names={goingNames}
          color={palette.success}
          icon="checkmark-circle-outline"
          mutedColor={palette.muted}
        />
        <ExpandableList
          title="Can't Make It"
          names={cantNames}
          color={palette.error}
          icon="close-circle-outline"
          mutedColor={palette.muted}
        />
        <ExpandableList
          title="Maybe"
          names={maybeNames}
          color={palette.warning}
          icon="help-circle-outline"
          mutedColor={palette.muted}
        />
        <ExpandableList
          title="Awaiting Response"
          names={pendingNames}
          color={palette.muted}
          icon="time-outline"
          mutedColor={palette.muted}
        />
      </View>

      {/* Send Reminder button */}
      {counts.pending > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.reminderButton,
            { borderColor: palette.tint },
            pressed && styles.reminderButtonPressed,
          ]}
          onPress={handleSendReminder}
          disabled={sendingReminder}
          accessibilityLabel={`Send reminder to ${counts.pending} pending`}
        >
          {sendingReminder ? (
            <ActivityIndicator size="small" color={palette.tint} />
          ) : (
            <>
              <Ionicons name="notifications-outline" size={18} color={palette.tint} />
              <ThemedText style={[styles.reminderButtonText, { color: palette.tint }]}>
                Send Reminder ({counts.pending} pending)
              </ThemedText>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: Radii.card,
    padding: Spacing.sm,
  },
  container: {
    gap: Spacing.sm,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 100,
  },
  emptyText: {
    ...Typography.small,
  },
  sectionTitle: {
    ...Typography.subheading,
  },

  // Progress
  progressContainer: {
    gap: Spacing.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.sm,
  },
  progressText: {
    ...Typography.caption,
  },

  // Count badges
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  countBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.sm,
  },
  countNumber: {
    ...Typography.bodySemiBold,
  },
  countLabel: {
    ...Typography.smallSemiBold,
  },

  // Expandable lists
  listsContainer: {
    gap: Spacing.xs,
  },
  expandableContainer: {
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  expandableLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  expandableTitle: {
    ...Typography.bodySemiBold,
  },
  namesList: {
    paddingLeft: Spacing.lg,
    paddingBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  nameText: {
    ...Typography.body,
  },

  // Reminder button
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    marginTop: Spacing.xs,
  },
  reminderButtonPressed: {
    opacity: 0.8,
  },
  reminderButtonText: { ...Typography.bodySemiBold },
});

export default RSVPSummary;
