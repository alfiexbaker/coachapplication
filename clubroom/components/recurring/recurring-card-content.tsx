/**
 * RecurringCard — Content sections: header, schedule, stats, actions.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Divider } from '@/components/ui/primitives/Divider';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { RecurringBooking } from '@/constants/types';
import {
  getDayName,
  getFrequencyLabel,
  getStatusLabel,
} from '@/services/recurring-booking-service';
import { useTheme } from '@/hooks/useTheme';
import { getStatusColor, getStatusIcon, formatRecurringTime } from './recurring-card-helpers';
import { getRecurringCoachName } from '@/utils/recurring-display';

export const HeaderRow = memo(function HeaderRow({ recurring }: { recurring: RecurringBooking }) {
  const { colors: palette } = useTheme();
  const statusColor = getStatusColor(recurring.status, palette);
  const statusIcon = getStatusIcon(recurring.status);
  const coachName = getRecurringCoachName(recurring);
  return (
    <Row align="center" gap="sm">
      <View style={[styles.avatarPlaceholder, { backgroundColor: palette.border }]}>
        <Ionicons name="person" size={20} color={palette.muted} />
      </View>
      <View style={styles.headerInfo}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {coachName}
        </ThemedText>
        <ThemedText style={[styles.sessionType, { color: palette.muted }]}>
          {recurring.sessionType}
        </ThemedText>
      </View>
      <Row
        align="center"
        gap="xxs"
        style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}
      >
        <Ionicons
          name={statusIcon as keyof typeof Ionicons.glyphMap}
          size={14}
          color={statusColor}
        />
        <ThemedText style={[styles.statusText, { color: statusColor }]}>
          {getStatusLabel(recurring.status)}
        </ThemedText>
      </Row>
    </Row>
  );
});

export const ScheduleRow = memo(function ScheduleRow({
  recurring,
}: {
  recurring: RecurringBooking;
}) {
  const { colors: palette } = useTheme();
  return (
    <Row wrap gap="sm">
      <Row align="center" gap="xxs">
        <Ionicons name="calendar-outline" size={16} color={palette.icon} />
        <ThemedText style={styles.scheduleText}>{getDayName(recurring.dayOfWeek)}s</ThemedText>
      </Row>
      <Row align="center" gap="xxs">
        <Ionicons name="time-outline" size={16} color={palette.icon} />
        <ThemedText style={styles.scheduleText}>{formatRecurringTime(recurring.time)}</ThemedText>
      </Row>
      <Row align="center" gap="xxs">
        <Ionicons name="repeat-outline" size={16} color={palette.icon} />
        <ThemedText style={styles.scheduleText}>
          {getFrequencyLabel(recurring.frequency)}
        </ThemedText>
      </Row>
    </Row>
  );
});

export const StatsRow = memo(function StatsRow({
  recurring,
  startDateLabel,
}: {
  recurring: RecurringBooking;
  startDateLabel: string;
}) {
  const { colors: palette } = useTheme();
  return (
    <>
      <Divider />
      <Row justify="between" style={styles.statsRow}>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: palette.foreground }]}>
            {recurring.sessionsCompleted}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Completed</ThemedText>
        </View>
        {recurring.sessionsRemaining !== undefined && (
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: palette.foreground }]}>
              {recurring.sessionsRemaining}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Remaining</ThemedText>
          </View>
        )}
        {recurring.pricePerSession && (
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: palette.foreground }]}>
              £{recurring.pricePerSession}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Per session
            </ThemedText>
          </View>
        )}
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: palette.foreground }]}>
            {startDateLabel}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Started</ThemedText>
        </View>
      </Row>
    </>
  );
});

interface ActionsRowProps {
  status: string;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

export const ActionsRow = memo(function ActionsRow({
  status,
  onPause,
  onResume,
  onCancel,
}: ActionsRowProps) {
  const { colors: palette } = useTheme();
  return (
    <Row gap="sm" style={styles.actionsRow}>
      {status === 'ACTIVE' && onPause && (
        <Clickable
          onPress={onPause}
          style={[styles.actionButton, { backgroundColor: withAlpha(palette.warning, 0.1) }]}
        >
          <Ionicons name="pause" size={16} color={palette.warning} />
          <ThemedText style={[styles.actionButtonText, { color: palette.warning }]}>
            Pause
          </ThemedText>
        </Clickable>
      )}
      {status === 'PAUSED' && onResume && (
        <Clickable
          onPress={onResume}
          style={[styles.actionButton, { backgroundColor: withAlpha(palette.success, 0.1) }]}
        >
          <Ionicons name="play" size={16} color={palette.success} />
          <ThemedText style={[styles.actionButtonText, { color: palette.success }]}>
            Resume
          </ThemedText>
        </Clickable>
      )}
      {status !== 'CANCELLED' && status !== 'EXPIRED' && onCancel && (
        <Clickable
          onPress={onCancel}
          style={[styles.actionButton, { backgroundColor: withAlpha(palette.error, 0.1) }]}
        >
          <Ionicons name="close" size={16} color={palette.error} />
          <ThemedText style={[styles.actionButtonText, { color: palette.error }]}>
            Cancel
          </ThemedText>
        </Clickable>
      )}
    </Row>
  );
});

const styles = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: Radii.xl },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  sessionType: { ...Typography.small },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusText: { ...Typography.caption, fontWeight: '600' },
  scheduleText: { ...Typography.small },
  statsRow: { paddingTop: Spacing.xs },
  statItem: { alignItems: 'center' },
  statValue: { ...Typography.bodySemiBold },
  statLabel: { ...Typography.caption },
  actionsRow: { paddingTop: Spacing.xs },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  actionButtonText: { ...Typography.smallSemiBold },
});
