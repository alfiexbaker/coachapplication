import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Routes } from '@/navigation/routes';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import type { ClubEvent } from '@/constants/types';
import { Row } from '@/components/primitives';

interface Props {
  event: ClubEvent;
  attendeeCounts: { going: number; maybe: number; notGoing: number; totalGuests: number };
  showAttendees: boolean;
  isCoach: boolean;
  onToggleAttendees: () => void;
}

export const EventAttendanceSection = memo(function EventAttendanceSection({
  event,
  attendeeCounts,
  showAttendees,
  isCoach,
  onToggleAttendees,
}: Props) {
  const { colors: palette } = useTheme();
  const { going, maybe, notGoing } = attendeeCounts;

  return (
    <View style={styles.section}>
      <Clickable onPress={onToggleAttendees} style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Attendance ({going} confirmed)
        </ThemedText>
        <Ionicons
          name={showAttendees ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={palette.icon}
        />
      </Clickable>

      <Row style={styles.stats}>
        <View style={[styles.statBox, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <ThemedText style={[styles.statNumber, { color: palette.success }]}>{going}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.success }]}>Going</ThemedText>
        </View>
        <View style={[styles.statBox, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
          <ThemedText style={[styles.statNumber, { color: palette.warning }]}>{maybe}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.warning }]}>Maybe</ThemedText>
        </View>
        <View style={[styles.statBox, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
          <ThemedText style={[styles.statNumber, { color: palette.error }]}>{notGoing}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.error }]}>
            Can&apos;t Go
          </ThemedText>
        </View>
      </Row>

      {showAttendees && event.attendees.length > 0 && (
        <View style={styles.attendeeList}>
          {event.attendees
            .filter((a) => a.status === 'GOING')
            .map((attendee) => (
              <Row key={attendee.userId} style={styles.attendeeRow}>
                <View style={[styles.avatar, { backgroundColor: palette.border }]}>
                  <ThemedText style={styles.avatarInitial}>{attendee.userId.charAt(0)}</ThemedText>
                </View>
                <View style={styles.attendeeInfo}>
                  <ThemedText>{attendee.userId}</ThemedText>
                </View>
                <View style={[styles.statusDot, { backgroundColor: palette.success }]} />
              </Row>
            ))}
        </View>
      )}

      {isCoach && event.attendees.length > 0 && (
        <Clickable
          onPress={() => router.push(Routes.eventAttendees(event.id))}
          style={[styles.viewAllButton, { borderColor: palette.tint }]}
        >
          <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
            View All Attendees
          </ThemedText>
          <Ionicons name="arrow-forward" size={16} color={palette.tint} />
        </Clickable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize) },
  header: { alignItems: 'center', justifyContent: 'space-between' },
  stats: { gap: Spacing.sm },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radii.md },
  statNumber: { ...Typography.title, fontSize: scaleFont(Typography.title.fontSize) },
  statLabel: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  attendeeList: { marginTop: Spacing.sm, gap: Spacing.xs },
  attendeeRow: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...Typography.bodySmallSemiBold,
    fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  attendeeInfo: { flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: Radii.xs },
  viewAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  viewAllText: {
    ...Typography.bodySmallSemiBold,
    fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
});
