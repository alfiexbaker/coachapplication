import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CounterOffer, CounterOfferStatus } from '@/constants/types';
import { AcceptRejectButtons } from './AcceptRejectButtons';

interface CounterOfferCardProps {
  offer: CounterOffer;
  isActionable: boolean;
  onAccept?: (offerId: string) => void;
  onReject?: (offerId: string) => void;
  onCounterPropose?: (offerId: string) => void;
  isLoading?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes}${suffix}`;
}

function getTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h left`;
  }
  if (diffHours > 0) {
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m left`;
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return `${diffMinutes}m left`;
}

function getStatusConfig(
  status: CounterOfferStatus,
  palette: (typeof Colors)['light']
): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
} {
  switch (status) {
    case 'PENDING':
      return {
        icon: 'time-outline',
        color: palette.warning,
        label: 'Pending',
      };
    case 'ACCEPTED':
      return {
        icon: 'checkmark-circle-outline',
        color: palette.success,
        label: 'Accepted',
      };
    case 'REJECTED':
      return {
        icon: 'close-circle-outline',
        color: palette.error,
        label: 'Declined',
      };
    case 'EXPIRED':
      return {
        icon: 'hourglass-outline',
        color: palette.muted,
        label: 'Expired',
      };
    default:
      return {
        icon: 'help-circle-outline',
        color: palette.muted,
        label: 'Unknown',
      };
  }
}

export function CounterOfferCard({
  offer,
  isActionable,
  onAccept,
  onReject,
  onCounterPropose,
  isLoading = false,
}: CounterOfferCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const statusConfig = getStatusConfig(offer.status, palette);

  const isPending = offer.status === 'PENDING';

  return (
    <SurfaceCard
      style={styles.card}
      outlineGradient={
        isPending
          ? [palette.warning, withAlpha(palette.warning, 0.25)]
          : [palette.border, palette.border]
      }
    >
      {/* Header with proposer and status */}
      <View style={styles.header}>
        <View style={styles.proposerInfo}>
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: withAlpha(palette.tint, 0.09) },
            ]}
          >
            <Ionicons
              name={offer.proposedBy === 'PARENT' ? 'person' : 'school'}
              size={18}
              color={palette.tint}
            />
          </View>
          <View>
            <ThemedText type="defaultSemiBold">{offer.proposerName}</ThemedText>
            <ThemedText style={[styles.roleLabel, { color: palette.muted }]}>
              {offer.proposedBy === 'PARENT' ? 'Parent' : 'Coach'}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: withAlpha(statusConfig.color, 0.09) },
          ]}
        >
          <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
          <ThemedText style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </ThemedText>
        </View>
      </View>

      {/* Time change display */}
      <View style={styles.timeChangeContainer}>
        {/* Original time */}
        <View style={styles.timeBlock}>
          <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>
            Original
          </ThemedText>
          <View style={styles.timeRow}>
            <Ionicons name="calendar-outline" size={16} color={palette.muted} />
            <ThemedText style={styles.timeValue}>
              {formatDate(offer.originalTime.date)}
            </ThemedText>
          </View>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color={palette.muted} />
            <ThemedText style={styles.timeValue}>
              {formatTime(offer.originalTime.startTime)} -{' '}
              {formatTime(offer.originalTime.endTime)}
            </ThemedText>
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <Ionicons name="arrow-forward" size={20} color={palette.tint} />
        </View>

        {/* Proposed time */}
        <View
          style={[
            styles.timeBlock,
            styles.proposedTimeBlock,
            { backgroundColor: withAlpha(palette.tint, 0.03) },
          ]}
        >
          <ThemedText style={[styles.timeLabel, { color: palette.tint }]}>
            Proposed
          </ThemedText>
          <View style={styles.timeRow}>
            <Ionicons name="calendar" size={16} color={palette.tint} />
            <ThemedText style={[styles.timeValue, { color: palette.tint }]}>
              {formatDate(offer.proposedTime.date)}
            </ThemedText>
          </View>
          <View style={styles.timeRow}>
            <Ionicons name="time" size={16} color={palette.tint} />
            <ThemedText style={[styles.timeValue, { color: palette.tint }]}>
              {formatTime(offer.proposedTime.startTime)} -{' '}
              {formatTime(offer.proposedTime.endTime)}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Message if provided */}
      {offer.message && (
        <View style={[styles.messageContainer, { backgroundColor: palette.background }]}>
          <Ionicons name="chatbubble-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.messageText, { color: palette.text }]}>
            &quot;{offer.message}&quot;
          </ThemedText>
        </View>
      )}

      {/* Rejection reason if rejected */}
      {offer.status === 'REJECTED' && offer.rejectionReason && (
        <View style={[styles.rejectionContainer, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
          <Ionicons name="information-circle-outline" size={14} color={palette.error} />
          <ThemedText style={[styles.rejectionText, { color: palette.error }]}>
            {offer.rejectionReason}
          </ThemedText>
        </View>
      )}

      {/* Expiry timer for pending offers */}
      {isPending && (
        <View style={styles.expiryRow}>
          <Ionicons name="hourglass-outline" size={14} color={palette.warning} />
          <ThemedText style={[styles.expiryText, { color: palette.warning }]}>
            {getTimeRemaining(offer.expiresAt)}
          </ThemedText>
        </View>
      )}

      {/* Action buttons for actionable offers */}
      {isActionable && isPending && (
        <AcceptRejectButtons
          onAccept={() => onAccept?.(offer.id)}
          onReject={() => onReject?.(offer.id)}
          onCounterPropose={onCounterPropose ? () => onCounterPropose(offer.id) : undefined}
          isLoading={isLoading}
        />
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proposerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleLabel: {
    ...Typography.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusText: {
    ...Typography.sm,
    fontWeight: '600',
  },
  timeChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeBlock: {
    flex: 1,
    gap: Spacing.xxs,
  },
  proposedTimeBlock: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  timeLabel: {
    ...Typography.sm,
    fontWeight: '600',
    marginBottom: Spacing.micro,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  timeValue: {
    ...Typography.sm,
  },
  arrowContainer: {
    paddingHorizontal: Spacing.xs,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  messageText: {
    ...Typography.sm,
    flex: 1,
    fontStyle: 'italic',
  },
  rejectionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  rejectionText: {
    ...Typography.sm,
    flex: 1,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  expiryText: {
    ...Typography.sm,
    fontWeight: '500',
  },
});
