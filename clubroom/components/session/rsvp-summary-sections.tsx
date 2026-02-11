import React, { memo, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SessionRsvp } from '@/constants/types';

// --- Helpers ----------------------------------------------------------------

export function computeRSVPNames(rsvps: SessionRsvp[]) {
  const getName = (r: SessionRsvp) => r.childId || `User ${r.userId.slice(-4)}`;
  return {
    goingNames: rsvps.filter((r) => r.status === 'going').map(getName),
    cantNames: rsvps.filter((r) => r.status === 'not_going').map(getName),
    maybeNames: rsvps.filter((r) => r.status === 'maybe').map(getName),
    pendingNames: rsvps.filter((r) => r.status === 'pending').map(getName) };
}

// --- CountBadge -------------------------------------------------------------

type CountBadgeProps = {
  count: number;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const CountBadge = memo(function CountBadge({ count, label, color, icon }: CountBadgeProps) {
  return (
    <Row align="center" justify="center" gap="xs" style={[styles.countBadge, { backgroundColor: withAlpha(color, 0.07) }]}>
      <Ionicons name={icon} size={18} color={color} />
      <ThemedText style={[styles.countNumber, { color }]}>{count}</ThemedText>
      <ThemedText style={[styles.countLabel, { color }]}>{label}</ThemedText>
    </Row>
  );
});

// --- ExpandableList ---------------------------------------------------------

type ExpandableListProps = {
  title: string;
  names: string[];
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  mutedColor: string;
};

export function ExpandableList({ title, names, color, icon, mutedColor }: ExpandableListProps) {
  const [expanded, setExpanded] = useState(false);

  if (names.length === 0) return null;

  return (
    <View style={styles.expandableContainer}>
      <Clickable
        style={styles.expandableHeader}
        onPress={() => setExpanded(!expanded)}
        accessibilityLabel={`${title} (${names.length})`}
      >
        <Row align="center" justify="between">
          <Row align="center" gap="xs">
            <Ionicons name={icon} size={18} color={color} />
            <ThemedText style={styles.expandableTitle}>{title} ({names.length})</ThemedText>
          </Row>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={mutedColor} />
        </Row>
      </Clickable>

      {expanded && (
        <View style={styles.namesList}>
          {names.map((name, index) => (
            <Row key={index} align="center" gap="xs">
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <ThemedText style={styles.nameText}>{name}</ThemedText>
            </Row>
          ))}
        </View>
      )}
    </View>
  );
}

// --- ProgressIndicator ------------------------------------------------------

type ProgressIndicatorProps = {
  confirmed: number;
  total: number;
  palette: ThemeColors;
};

export const ProgressIndicator = memo(function ProgressIndicator({ confirmed, total, palette }: ProgressIndicatorProps) {
  const progressPercent = total > 0 ? (confirmed / total) * 100 : 0;

  return (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
        <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: palette.success }]} />
      </View>
      <ThemedText style={[styles.progressText, { color: palette.muted }]}>
        {confirmed}/{total} confirmed
      </ThemedText>
    </View>
  );
});

// --- ReminderButton ---------------------------------------------------------

type ReminderButtonProps = {
  pendingCount: number;
  sessionId: string;
  sendReminder: (sessionId: string) => Promise<void>;
  palette: ThemeColors;
};

export const ReminderButton = memo(function ReminderButton({ pendingCount, sessionId, sendReminder, palette }: ReminderButtonProps) {
  const [sending, setSending] = useState(false);

  const handlePress = async () => {
    if (pendingCount === 0) {
      Alert.alert('All Responded', 'Everyone has already responded to this session.');
      return;
    }

    setSending(true);
    try {
      await sendReminder(sessionId);
      Alert.alert('Reminders Sent', `Reminder sent to ${pendingCount} parent${pendingCount !== 1 ? 's' : ''}.`);
    } catch {
      Alert.alert('Error', 'Failed to send reminders. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (pendingCount === 0) return null;

  return (
    <Clickable
      style={[styles.reminderButton, { borderColor: palette.tint }]}
      onPress={handlePress}
      disabled={sending}
      accessibilityLabel={`Send reminder to ${pendingCount} pending`}
    >
      <Row align="center" justify="center" gap="xs">
        {sending ? (
          <ActivityIndicator size="small" color={palette.tint} />
        ) : (
          <>
            <Ionicons name="notifications-outline" size={18} color={palette.tint} />
            <ThemedText style={[styles.reminderButtonText, { color: palette.tint }]}>Send Reminder ({pendingCount} pending)</ThemedText>
          </>
        )}
      </Row>
    </Clickable>
  );
});

// --- Styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  countBadge: { flex: 1, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.xs, borderRadius: Radii.sm },
  countNumber: { ...Typography.bodySemiBold },
  countLabel: { ...Typography.smallSemiBold },
  expandableContainer: { borderRadius: Radii.sm, overflow: 'hidden' },
  expandableHeader: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.xs },
  expandableTitle: { ...Typography.bodySemiBold },
  namesList: { paddingLeft: Spacing.lg, paddingBottom: Spacing.xs, gap: Spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: Radii.xs },
  nameText: { ...Typography.body },
  progressContainer: { gap: Spacing.xs },
  progressBar: { height: 6, borderRadius: Radii.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.sm },
  progressText: { ...Typography.caption },
  reminderButton: { height: Components.button.height, borderRadius: Components.button.borderRadius, borderWidth: 1.5, backgroundColor: 'transparent', marginTop: Spacing.xs },
  reminderButtonText: { ...Typography.bodySemiBold } });
