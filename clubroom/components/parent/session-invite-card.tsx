import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionInvite, TimeSlot } from '@/constants/types';

interface SessionInviteCardProps {
  invite: SessionInvite;
  onPress: () => void;
  onAccept?: (selectedSlot?: TimeSlot) => void;
  onDecline?: () => void;
  onCounterPropose?: () => void;
  compact?: boolean;
  showSlotSelector?: boolean;
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
  onCounterPropose,
  compact = false,
  showSlotSelector = false,
}: SessionInviteCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

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

  // Build invitation message: "Coach X has invited [Athlete] to [Club/Session]"
  const coachFirstName = invite.coachName.split(' ')[0];
  const athleteDisplay = invite.athleteNames.length === 1
    ? invite.athleteNames[0]
    : `${invite.athleteNames.length} athletes`;
  const invitationMessage = invite.clubName
    ? `Coach ${coachFirstName} has invited ${athleteDisplay} to ${invite.clubName}`
    : `Coach ${coachFirstName} has invited ${athleteDisplay} to a ${invite.sessionType.toLowerCase()}`;

  // Calculate expiry countdown
  const getExpiryCountdown = () => {
    const now = new Date();
    const expiry = new Date(invite.expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expired';
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (diffDays > 1) return `${diffDays} days left`;
    if (diffDays === 1) return `${diffDays} day ${diffHours}h left`;
    if (diffHours > 0) return `${diffHours} hours left`;
    return 'Expires soon';
  };

  const handleAccept = () => {
    if (onAccept) {
      const slot = selectedSlotIndex !== null ? invite.proposedSlots[selectedSlotIndex] : undefined;
      onAccept(slot);
    }
  };

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
            <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.invitationText}>
              {invitationMessage}
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
      {/* Invitation Message Banner */}
      <View style={[styles.invitationBanner, { backgroundColor: `${palette.tint}08` }]}>
        <Ionicons name="mail-outline" size={16} color={palette.tint} />
        <ThemedText style={[styles.invitationBannerText, { color: palette.text }]}>
          {invitationMessage}
        </ThemedText>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: `${palette.tint}10` }]}>
          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
            {initials}
          </ThemedText>
        </View>

        <View style={styles.headerContent}>
          <ThemedText type="defaultSemiBold" style={styles.coachName}>
            Coach {invite.coachName}
          </ThemedText>
          {invite.clubName && (
            <ThemedText style={[styles.clubName, { color: palette.tint }]}>
              {invite.clubName}
            </ThemedText>
          )}
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

      {/* Time Slots - with optional selector */}
      {showSlotSelector && invite.proposedSlots.length > 1 ? (
        <View style={styles.slotSelector}>
          <ThemedText style={[styles.slotSelectorLabel, { color: palette.muted }]}>
            Select a time slot:
          </ThemedText>
          {invite.proposedSlots.map((slot, index) => {
            const isSelected = selectedSlotIndex === index;
            return (
              <Clickable
                key={index}
                onPress={() => setSelectedSlotIndex(index)}
                style={[
                  styles.slotOption,
                  {
                    backgroundColor: isSelected ? `${palette.tint}10` : palette.surface,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <View style={styles.slotOptionContent}>
                  <ThemedText type="defaultSemiBold">
                    {new Date(slot.date).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </ThemedText>
                  <ThemedText style={{ color: palette.muted }}>
                    {slot.startTime} - {slot.endTime}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.slotRadio,
                    {
                      backgroundColor: isSelected ? palette.tint : 'transparent',
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
              </Clickable>
            );
          })}
        </View>
      ) : (
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
      )}

      {/* Notes */}
      {invite.notes && (
        <ThemedText style={[styles.notes, { color: palette.muted }]} numberOfLines={2}>
          &quot;{invite.notes}&quot;
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

          {onCounterPropose && (
            <Clickable
              onPress={onCounterPropose}
              style={[styles.actionButton, styles.counterButton, { borderColor: palette.tint }]}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color={palette.tint} />
              <ThemedText style={[styles.actionText, { color: palette.tint }]}>Counter</ThemedText>
            </Clickable>
          )}

          <Clickable
            onPress={handleAccept}
            disabled={showSlotSelector && invite.proposedSlots.length > 1 && selectedSlotIndex === null}
            style={[
              styles.actionButton,
              styles.acceptButton,
              {
                backgroundColor: palette.tint,
                opacity: showSlotSelector && invite.proposedSlots.length > 1 && selectedSlotIndex === null ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name="checkmark-outline" size={18} color="#fff" />
            <ThemedText style={[styles.actionText, { color: '#fff' }]}>Accept</ThemedText>
          </Clickable>
        </View>
      )}

      {/* Expiry Warning with countdown */}
      {canRespond && (
        <View style={styles.expiryRow}>
          <Ionicons name="time-outline" size={14} color={palette.warning} />
          <ThemedText style={[styles.expiryText, { color: palette.warning }]}>
            {getExpiryCountdown()}
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
  invitationText: {
    fontSize: 14,
    lineHeight: 18,
  },
  invitationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginBottom: Spacing.xs,
  },
  invitationBannerText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  clubName: {
    fontSize: 13,
    fontWeight: '600',
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
  counterButton: {
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
  // Slot selector styles
  slotSelector: {
    gap: Spacing.sm,
  },
  slotSelectorLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  slotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  slotOptionContent: {
    gap: 2,
  },
  slotRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
