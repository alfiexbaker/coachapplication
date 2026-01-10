import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionInvite } from '@/constants/types';

interface SessionInviteCardProps {
  invite: SessionInvite;
  onPress: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  compact?: boolean;
}

const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#92400E', icon: 'hourglass-outline' },
  ACCEPTED: { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle-outline' },
  DECLINED: { bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle-outline' },
  EXPIRED: { bg: '#F3F4F6', text: '#6B7280', icon: 'time-outline' },
  COUNTERED: { bg: '#DBEAFE', text: '#1E40AF', icon: 'swap-horizontal-outline' },
};

export function SessionInviteCard({
  invite,
  onPress,
  onAccept,
  onDecline,
  compact = false,
}: SessionInviteCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isExpired = new Date(invite.expiresAt) < new Date();
  const status = isExpired && invite.status === 'PENDING' ? 'EXPIRED' : invite.status;
  const statusConfig = statusColors[status] || statusColors.PENDING;

  const firstSlot = invite.proposedSlots[0];
  const slotDate = firstSlot
    ? new Date(firstSlot.date).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';

  const initials = invite.coachName
    .split(' ')
    .map((n) => n[0])
    .join('');

  const canRespond = status === 'PENDING';

  if (compact) {
    return (
      <SurfaceCard style={styles.compactCard} onPress={onPress}>
        <View style={styles.compactContent}>
          <View style={[styles.compactAvatar, { backgroundColor: `${palette.tint}10` }]}>
            <ThemedText style={[styles.compactAvatarText, { color: palette.tint }]}>
              {initials}
            </ThemedText>
          </View>

          <View style={styles.compactInfo}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {invite.coachName}
            </ThemedText>
            <ThemedText style={[styles.compactMeta, { color: palette.muted }]} numberOfLines={1}>
              {invite.sessionType} - {slotDate}
            </ThemedText>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.text} />
          </View>
        </View>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: `${palette.tint}10` }]}>
          {invite.coachPhotoUrl ? (
            <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
              {initials}
            </ThemedText>
          ) : (
            <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
              {initials}
            </ThemedText>
          )}
        </View>

        <View style={styles.headerContent}>
          <ThemedText type="defaultSemiBold" style={styles.coachName}>
            {invite.coachName}
          </ThemedText>
          <ThemedText style={[styles.sessionType, { color: palette.muted }]}>
            {invite.sessionType} - {invite.focus}
          </ThemedText>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
            {status}
          </ThemedText>
        </View>
      </View>

      {/* Athletes */}
      <View style={styles.athleteRow}>
        <Ionicons name="person-outline" size={16} color={palette.muted} />
        <ThemedText style={[styles.athletes, { color: palette.text }]}>
          For: {invite.athleteNames.join(', ')}
        </ThemedText>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: palette.border }]} />

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={palette.muted} />
          <ThemedText style={styles.detailText}>
            {slotDate} at {firstSlot?.startTime}
            {invite.proposedSlots.length > 1 && (
              <ThemedText style={{ color: palette.muted }}>
                {' '}(+{invite.proposedSlots.length - 1} options)
              </ThemedText>
            )}
          </ThemedText>
        </View>

        {firstSlot?.location && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={palette.muted} />
            <ThemedText style={styles.detailText}>{firstSlot.location}</ThemedText>
          </View>
        )}

        {invite.priceUsd && (
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={16} color={palette.muted} />
            <ThemedText style={styles.detailText}>${invite.priceUsd}</ThemedText>
          </View>
        )}
      </View>

      {/* Notes */}
      {invite.notes && (
        <ThemedText style={[styles.notes, { color: palette.muted }]} numberOfLines={2}>
          "{invite.notes}"
        </ThemedText>
      )}

      {/* Actions */}
      {canRespond && onAccept && onDecline && (
        <View style={styles.actionsRow}>
          <Clickable
            onPress={onDecline}
            style={[styles.actionButton, styles.declineButton, { borderColor: palette.border }]}
          >
            <Ionicons name="close-outline" size={18} color={palette.text} />
            <ThemedText style={styles.actionText}>Decline</ThemedText>
          </Clickable>

          <Clickable
            onPress={onAccept}
            style={[styles.actionButton, styles.acceptButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="checkmark-outline" size={18} color="#fff" />
            <ThemedText style={[styles.actionText, { color: '#fff' }]}>View & Accept</ThemedText>
          </Clickable>
        </View>
      )}

      {/* Expiry Warning */}
      {canRespond && (
        <View style={styles.expiryRow}>
          <Ionicons name="time-outline" size={14} color={palette.warning} />
          <ThemedText style={[styles.expiryText, { color: palette.warning }]}>
            Expires {new Date(invite.expiresAt).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  compactCard: {
    padding: Spacing.md,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  compactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  compactInfo: {
    flex: 1,
  },
  compactMeta: {
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerContent: {
    flex: 1,
    gap: 2,
  },
  coachName: {
    fontSize: 16,
  },
  sessionType: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  athletes: {
    fontSize: 13,
  },
  divider: {
    height: 1,
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: 13,
  },
  notes: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  declineButton: {
    borderWidth: 1,
  },
  acceptButton: {},
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  expiryText: {
    fontSize: 12,
  },
});
