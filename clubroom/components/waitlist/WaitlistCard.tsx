import { View, StyleSheet, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { WaitlistPosition } from './WaitlistPosition';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { waitlistService } from '@/services/waitlist-service';
import type { WaitlistEntry } from '@/constants/types';

interface WaitlistCardProps {
  /** The waitlist entry to display */
  entry: WaitlistEntry;
  /** Callback when leaving the waitlist */
  onLeave: () => void;
  /** Callback when toggling auto-book */
  onToggleAutoBook: () => void;
}

export function WaitlistCard({ entry, onLeave, onToggleAutoBook }: WaitlistCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const handleLeave = () => {
    Alert.alert(
      'Leave Waitlist',
      `Are you sure you want to leave the waitlist for ${entry.sessionTitle || 'this session'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onLeave },
      ]
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
        isNotified && { borderColor: palette.success, borderWidth: 2 },
      ]}
    >
      {isNotified && (
        <View style={[styles.notificationBanner, { backgroundColor: `${palette.success}15` }]}>
          <Ionicons name="checkmark-circle" size={16} color={palette.success} />
          <ThemedText style={[styles.notificationText, { color: palette.success }]}>
            A spot is available! Book now before it expires.
          </ThemedText>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.sessionInfo}>
          <ThemedText type="defaultSemiBold" style={styles.sessionTitle} numberOfLines={2}>
            {entry.sessionTitle || 'Session'}
          </ThemedText>
          {entry.coachName && (
            <View style={styles.coachRow}>
              <Ionicons name="person-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.coachName, { color: palette.muted }]}>
                {entry.coachName}
              </ThemedText>
            </View>
          )}
        </View>

        <WaitlistPosition position={entry.position} size="medium" />
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.detailText, { color: palette.muted }]}>
            {formatSessionDate(entry.sessionScheduledAt)}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.detailText, { color: palette.muted }]}>
            Joined {timeAgo}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: palette.border }]} />

      <View style={styles.footer}>
        <Clickable onPress={onToggleAutoBook} style={styles.autoBookRow}>
          <View style={styles.autoBookInfo}>
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
          </View>
          <Switch
            value={entry.autoBook}
            onValueChange={onToggleAutoBook}
            trackColor={{ false: palette.border, true: `${palette.success}50` }}
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
        <View style={[styles.expiryBanner, { backgroundColor: `${palette.warning}10` }]}>
          <Ionicons name="alarm-outline" size={14} color={palette.warning} />
          <ThemedText style={[styles.expiryText, { color: palette.warning }]}>
            Expires {new Date(entry.expiresAt).toLocaleString('en-GB', {
              weekday: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </ThemedText>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  notificationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.md,
    paddingBottom: 0,
  },
  sessionInfo: {
    flex: 1,
    marginRight: Spacing.md,
    gap: 4,
  },
  sessionTitle: {
    fontSize: 16,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coachName: {
    fontSize: 12,
  },
  details: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
  footer: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  autoBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoBookInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
  },
  autoBookText: {
    flex: 1,
    gap: 2,
  },
  autoBookDescription: {
    fontSize: 11,
    lineHeight: 14,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    marginTop: 0,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
