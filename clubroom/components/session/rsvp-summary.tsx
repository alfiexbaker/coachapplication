/**
 * RSVPSummary - Coach RSVP Overview
 *
 * Displays aggregated RSVP counts for a session with expandable name lists
 * per status. Includes a "Send Reminder" button for pending respondents
 * and a progress indicator showing confirmation rate.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';
import { rsvpService } from '@/services/rsvp-service';
import type { SessionRsvp } from '@/constants/types';
import {
  computeRSVPNames,
  CountBadge,
  ExpandableList,
  ProgressIndicator,
  ReminderButton,
} from './rsvp-summary-sections';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RSVPSummaryProps {
  sessionId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RSVPSummary({ sessionId }: RSVPSummaryProps) {
  const { colors: palette } = useTheme();
  const [rsvps, setRsvps] = useState<SessionRsvp[]>([]);
  const [counts, setCounts] = useState({ going: 0, notGoing: 0, maybe: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

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
  const { goingNames, cantNames, maybeNames, pendingNames } = computeRSVPNames(rsvps);

  if (loading) {
    return (
      <View
        style={[styles.cardBase, styles.loadingContainer, { backgroundColor: palette.surface }]}
      >
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
      <ThemedText style={styles.sectionTitle}>Attendance</ThemedText>

      <ProgressIndicator confirmed={confirmed} total={total} palette={palette} />

      {/* Count badges */}
      <Row gap="xs">
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
        <CountBadge count={counts.maybe} label="Maybe" color={palette.warning} icon="help-circle" />
      </Row>

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

      <ReminderButton
        pendingCount={counts.pending}
        sessionId={sessionId}
        sendReminder={rsvpService.sendReminder}
        palette={palette}
      />
    </View>
  );
}

export default RSVPSummary;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardBase: { borderRadius: Radii.card, padding: Spacing.sm },
  container: { gap: Spacing.sm },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', minHeight: 100 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 100,
  },
  emptyText: { ...Typography.small },
  sectionTitle: { ...Typography.subheading },
  badgeRow: {},
  listsContainer: { gap: Spacing.xs },
});
