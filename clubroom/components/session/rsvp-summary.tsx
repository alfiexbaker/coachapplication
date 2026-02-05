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
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, Typography, Components, Shadows } from '@/constants/theme';
import { CardStyles, LayoutStyles, ButtonStyles } from '@/constants/styles';
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
    <View style={[styles.countBadge, { backgroundColor: `${color}12` }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.countNumber, { color }]}>{count}</Text>
      <Text style={[styles.countLabel, { color }]}>{label}</Text>
    </View>
  );
}

interface ExpandableListProps {
  title: string;
  names: string[];
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function ExpandableList({ title, names, color, icon }: ExpandableListProps) {
  const [expanded, setExpanded] = useState(false);

  if (names.length === 0) return null;

  return (
    <View style={styles.expandableContainer}>
      <Pressable
        style={styles.expandableHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.expandableLeft}>
          <Ionicons name={icon} size={18} color={color} />
          <Text style={styles.expandableTitle}>
            {title} ({names.length})
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.light.muted}
        />
      </Pressable>

      {expanded && (
        <View style={styles.namesList}>
          {names.map((name, index) => (
            <View key={index} style={styles.nameRow}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={styles.nameText}>{name}</Text>
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
    } catch (error) {
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
    } catch (error) {
      Alert.alert('Error', 'Failed to send reminders. Please try again.');
    } finally {
      setSendingReminder(false);
    }
  };

  if (loading) {
    return (
      <View style={[CardStyles.base, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={Colors.light.tint} />
      </View>
    );
  }

  if (total === 0) {
    return (
      <View style={[CardStyles.base, styles.emptyContainer]}>
        <Ionicons name="people-outline" size={32} color={Colors.light.muted} />
        <Text style={styles.emptyText}>No RSVPs yet</Text>
      </View>
    );
  }

  return (
    <View style={[CardStyles.base, styles.container]}>
      {/* Header */}
      <Text style={styles.sectionTitle}>Attendance</Text>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {confirmed}/{total} confirmed
        </Text>
      </View>

      {/* Count badges */}
      <View style={styles.badgeRow}>
        <CountBadge
          count={counts.going}
          label="Going"
          color={Colors.light.success}
          icon="checkmark-circle"
        />
        <CountBadge
          count={counts.notGoing}
          label="Can't"
          color={Colors.light.error}
          icon="close-circle"
        />
        <CountBadge
          count={counts.maybe}
          label="Maybe"
          color={Colors.light.warning}
          icon="help-circle"
        />
      </View>

      {/* Expandable lists */}
      <View style={styles.listsContainer}>
        <ExpandableList
          title="Going"
          names={goingNames}
          color={Colors.light.success}
          icon="checkmark-circle-outline"
        />
        <ExpandableList
          title="Can't Make It"
          names={cantNames}
          color={Colors.light.error}
          icon="close-circle-outline"
        />
        <ExpandableList
          title="Maybe"
          names={maybeNames}
          color={Colors.light.warning}
          icon="help-circle-outline"
        />
        <ExpandableList
          title="Awaiting Response"
          names={pendingNames}
          color={Colors.light.muted}
          icon="time-outline"
        />
      </View>

      {/* Send Reminder button */}
      {counts.pending > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.reminderButton,
            pressed && styles.reminderButtonPressed,
          ]}
          onPress={handleSendReminder}
          disabled={sendingReminder}
        >
          {sendingReminder ? (
            <ActivityIndicator size="small" color={Colors.light.tint} />
          ) : (
            <>
              <Ionicons name="notifications-outline" size={18} color={Colors.light.tint} />
              <Text style={styles.reminderButtonText}>
                Send Reminder ({counts.pending} pending)
              </Text>
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
    color: Colors.light.muted,
  },
  sectionTitle: {
    ...Typography.heading,
    color: Colors.light.text,
  },

  // Progress
  progressContainer: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.light.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.success,
    borderRadius: 3,
  },
  progressText: {
    ...Typography.caption,
    color: Colors.light.muted,
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
    gap: 6,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.sm,
  },
  countNumber: {
    ...Typography.bodySemiBold,
  },
  countLabel: {
    ...Typography.small,
    fontWeight: '500',
  },

  // Expandable lists
  listsContainer: {
    gap: 4,
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
    color: Colors.light.text,
  },
  namesList: {
    paddingLeft: Spacing.lg,
    paddingBottom: Spacing.xs,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nameText: {
    ...Typography.body,
    color: Colors.light.text,
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
    borderColor: Colors.light.tint,
    backgroundColor: 'transparent',
    marginTop: Spacing.xs,
  },
  reminderButtonPressed: {
    opacity: 0.8,
  },
  reminderButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.tint,
  },
});

export default RSVPSummary;
