/**
 * RecurringCard — Content sections: header, schedule, stats, actions.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { RecurringBooking } from '@/constants/types';
import { getDayName, getFrequencyLabel, getStatusLabel } from '@/services/recurring-booking-service';
import { useTheme } from '@/hooks/useTheme';
import { getStatusColor, getStatusIcon, formatRecurringTime } from './recurring-card-helpers';

export const HeaderRow = memo(function HeaderRow({ recurring }: { recurring: RecurringBooking }) {
  const { colors: palette } = useTheme();
  const statusColor = getStatusColor(recurring.status, palette);
  const statusIcon = getStatusIcon(recurring.status);
  return (
    <View style={styles.headerRow}>
      {recurring.coachPhotoUrl ? (
        <Image source={{ uri: recurring.coachPhotoUrl }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: palette.border }]}>
          <Ionicons name="person" size={20} color={palette.muted} />
        </View>
      )}
      <View style={styles.headerInfo}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>{recurring.coachName}</ThemedText>
        <ThemedText style={[styles.sessionType, { color: palette.muted }]}>{recurring.sessionType}</ThemedText>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
        <Ionicons name={statusIcon as keyof typeof Ionicons.glyphMap} size={14} color={statusColor} />
        <ThemedText style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(recurring.status)}</ThemedText>
      </View>
    </View>
  );
});

export const ScheduleRow = memo(function ScheduleRow({ recurring }: { recurring: RecurringBooking }) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.scheduleRow}>
      <View style={styles.scheduleItem}>
        <Ionicons name="calendar-outline" size={16} color={palette.icon} />
        <ThemedText style={styles.scheduleText}>{getDayName(recurring.dayOfWeek)}s</ThemedText>
      </View>
      <View style={styles.scheduleItem}>
        <Ionicons name="time-outline" size={16} color={palette.icon} />
        <ThemedText style={styles.scheduleText}>{formatRecurringTime(recurring.time)}</ThemedText>
      </View>
      <View style={styles.scheduleItem}>
        <Ionicons name="repeat-outline" size={16} color={palette.icon} />
        <ThemedText style={styles.scheduleText}>{getFrequencyLabel(recurring.frequency)}</ThemedText>
      </View>
    </View>
  );
});

export const StatsRow = memo(function StatsRow({ recurring, startDateLabel }: { recurring: RecurringBooking; startDateLabel: string }) {
  const { colors: palette } = useTheme();
  return (
    <>
      <Divider />
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: palette.foreground }]}>{recurring.sessionsCompleted}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Completed</ThemedText>
        </View>
        {recurring.sessionsRemaining !== undefined && (
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: palette.foreground }]}>{recurring.sessionsRemaining}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Remaining</ThemedText>
          </View>
        )}
        {recurring.pricePerSession && (
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: palette.foreground }]}>${recurring.pricePerSession}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Per session</ThemedText>
          </View>
        )}
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: palette.foreground }]}>{startDateLabel}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Started</ThemedText>
        </View>
      </View>
    </>
  );
});

interface ActionsRowProps {
  status: string;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

export const ActionsRow = memo(function ActionsRow({ status, onPause, onResume, onCancel }: ActionsRowProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.actionsRow}>
      {status === 'ACTIVE' && onPause && (
        <Clickable onPress={onPause} style={[styles.actionButton, { backgroundColor: withAlpha(palette.warning, 0.1) }]}>
          <Ionicons name="pause" size={16} color={palette.warning} />
          <ThemedText style={[styles.actionButtonText, { color: palette.warning }]}>Pause</ThemedText>
        </Clickable>
      )}
      {status === 'PAUSED' && onResume && (
        <Clickable onPress={onResume} style={[styles.actionButton, { backgroundColor: withAlpha(palette.success, 0.1) }]}>
          <Ionicons name="play" size={16} color={palette.success} />
          <ThemedText style={[styles.actionButtonText, { color: palette.success }]}>Resume</ThemedText>
        </Clickable>
      )}
      {status !== 'CANCELLED' && status !== 'EXPIRED' && onCancel && (
        <Clickable onPress={onCancel} style={[styles.actionButton, { backgroundColor: withAlpha(palette.error, 0.1) }]}>
          <Ionicons name="close" size={16} color={palette.error} />
          <ThemedText style={[styles.actionButtonText, { color: palette.error }]}>Cancel</ThemedText>
        </Clickable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: Radii.xl },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  sessionType: { ...Typography.small },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  statusText: { ...Typography.caption, fontWeight: '600' },
  scheduleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  scheduleText: { ...Typography.small },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.xs },
  statItem: { alignItems: 'center' },
  statValue: { ...Typography.bodySemiBold },
  statLabel: { ...Typography.caption },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.xs },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radii.sm },
  actionButtonText: { ...Typography.smallSemiBold },
});
