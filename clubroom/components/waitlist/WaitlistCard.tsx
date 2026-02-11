import { View, StyleSheet, Switch, Alert } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { WaitlistPosition } from './WaitlistPosition';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import { waitlistService } from '@/services/waitlist-service';
import type { WaitlistEntry } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import {
  getWaitlistCoachName,
  getWaitlistScheduledAt,
  getWaitlistSessionTitle,
} from '@/utils/waitlist-display';

interface WaitlistCardProps {
  /** The waitlist entry to display */
  entry: WaitlistEntry;
  /** Callback when leaving the waitlist */
  onLeave: () => void;
  /** Callback when toggling auto-book */
  onToggleAutoBook: () => void;
}

export function WaitlistCard({ entry, onLeave, onToggleAutoBook }: WaitlistCardProps) {
  const { colors: palette } = useTheme();
  const sessionTitle = getWaitlistSessionTitle(entry);
  const coachName = getWaitlistCoachName(entry);
  const sessionScheduledAt = getWaitlistScheduledAt(entry);

  const handleLeave = () => {
    Alert.alert(
      'Leave Waitlist',
      `Are you sure you want to leave the waitlist for ${sessionTitle || 'this session'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onLeave },
      ],
    );
  };

  const formatSessionDate = (dateString?: string) => {
    if (!dateString) return 'Date TBC';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isNotified = entry.status === 'NOTIFIED';
  const timeAgo = waitlistService.formatTimeAgo(entry.joinedAt);

  return (
    <SurfaceCard
      style={[
        styles.card,
        isNotified ? { borderColor: palette.success, borderWidth: 2 } : undefined,
      ]}
    >
      {isNotified && (
        <Row
          align="center"
          gap="xs"
          style={[styles.notificationBanner, { backgroundColor: withAlpha(palette.success, 0.09) }]}
        >
          <Ionicons name="checkmark-circle" size={16} color={palette.success} />
          <ThemedText style={[styles.notificationText, { color: palette.success }]}>
            A spot is available! Book now before it expires.
          </ThemedText>
        </Row>
      )}

      <Row justify="space-between" align="flex-start" style={styles.header}>
        <View style={styles.sessionInfo}>
          <ThemedText type="defaultSemiBold" style={styles.sessionTitle} numberOfLines={2}>
            {sessionTitle || 'Session'}
          </ThemedText>
          {coachName && (
            <Row align="center" gap="xxs">
              <Ionicons name="person-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.coachName, { color: palette.muted }]}>
                {coachName}
              </ThemedText>
            </Row>
          )}
        </View>

        <WaitlistPosition position={entry.position} size="medium" />
      </Row>

      <View style={styles.details}>
        <Row align="center" gap="xxs">
          <Ionicons name="calendar-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.detailText, { color: palette.muted }]}>
            {formatSessionDate(sessionScheduledAt)}
          </ThemedText>
        </Row>

        <Row align="center" gap="xxs">
          <Ionicons name="time-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.detailText, { color: palette.muted }]}>
            Joined {timeAgo}
          </ThemedText>
        </Row>
      </View>

      <Divider style={{ marginHorizontal: Components.card.padding }} />

      <View style={styles.footer}>
        <Clickable onPress={onToggleAutoBook} style={styles.autoBookRow}>
          <Row align="flex-start" gap="sm" flex style={styles.autoBookInfo}>
            <Ionicons
              name={entry.autoBook ? 'flash' : 'flash-outline'}
              size={16}
              color={entry.autoBook ? palette.success : palette.muted}
            />
            <View style={styles.autoBookText}>
              <ThemedText
                type="defaultSemiBold"
                style={{ color: entry.autoBook ? palette.success : palette.foreground }}
              >
                Auto-book
              </ThemedText>
              <ThemedText style={[styles.autoBookDescription, { color: palette.muted }]}>
                {entry.autoBook
                  ? 'Will book automatically when available'
                  : 'Manual booking required'}
              </ThemedText>
            </View>
          </Row>
          <Switch
            value={entry.autoBook}
            onValueChange={onToggleAutoBook}
            trackColor={{ false: palette.border, true: withAlpha(palette.success, 0.31) }}
            thumbColor={entry.autoBook ? palette.success : palette.muted}
            ios_backgroundColor={palette.border}
          />
        </Clickable>

        <Clickable
          onPress={handleLeave}
          style={[styles.leaveButton, { borderColor: palette.border }]}
        >
          <Ionicons name="close-circle-outline" size={16} color={palette.error} />
          <ThemedText style={[styles.leaveButtonText, { color: palette.error }]}>
            Leave Waitlist
          </ThemedText>
        </Clickable>
      </View>

      {entry.expiresAt && isNotified && (
        <Row
          align="center"
          gap="xs"
          style={[styles.expiryBanner, { backgroundColor: withAlpha(palette.warning, 0.06) }]}
        >
          <Ionicons name="alarm-outline" size={14} color={palette.warning} />
          <ThemedText style={[styles.expiryText, { color: palette.warning }]}>
            Expires{' '}
            {new Date(entry.expiresAt).toLocaleString('en-GB', {
              weekday: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  notificationBanner: {
    padding: Spacing.sm,
  },
  notificationText: { ...Typography.smallSemiBold, flex: 1 },
  header: {
    padding: Components.card.padding,
    paddingBottom: 0,
  },
  sessionInfo: {
    flex: 1,
    marginRight: Components.card.padding,
    gap: Spacing.xxs,
  },
  sessionTitle: { ...Typography.subheading },
  coachRow: {
    /* layout moved to Row */
  },
  coachName: { ...Typography.caption },
  details: {
    padding: Components.card.padding,
    paddingTop: Spacing.sm,
    gap: Spacing.xxs,
  },
  detailRow: {
    /* layout moved to Row */
  },
  detailText: { ...Typography.small },
  footer: {
    padding: Components.card.padding,
    gap: Spacing.sm,
  },
  autoBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoBookInfo: {
    /* layout moved to Row */
  },
  autoBookText: {
    flex: 1,
    gap: Spacing.micro,
  },
  autoBookDescription: { ...Typography.caption, lineHeight: 14 },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  leaveButtonText: { ...Typography.bodySmallSemiBold },
  expiryBanner: {
    padding: Spacing.sm,
    marginTop: 0,
  },
  expiryText: { ...Typography.caption },
});
