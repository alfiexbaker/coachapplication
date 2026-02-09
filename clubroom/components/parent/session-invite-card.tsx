import { memo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { CoverImageHero } from '@/components/invite/cover-image-hero';
import { AvatarStack } from '@/components/invite/avatar-stack';
import { RsvpButtonGroup } from '@/components/invite/rsvp-button-group';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SessionInvite, TimeSlot } from '@/constants/types';
import { DeclineReasonSheet, type DeclineReasonResult } from './decline-reason-sheet';
import { MultiWeekInviteCard } from './multi-week-invite-card';

interface SessionInviteCardProps {
  invite: SessionInvite;
  onPress: () => void;
  onAccept?: (selectedSlot?: TimeSlot) => void;
  onDecline?: (reason?: DeclineReasonResult) => void;
  onCounterPropose?: () => void;
  compact?: boolean;
  showSlotSelector?: boolean;
  /** Error state: slot was taken */
  slotTakenError?: string | null;
  /** Loading state during accept */
  acceptLoading?: boolean;
  /** Facebook-style RSVP handler */
  onRsvp?: (status: 'going' | 'maybe' | 'cant_go') => void;
}

function getStatusColors(palette: ThemeColors) {
  return {
    PENDING: { bg: withAlpha(palette.warning, 0.12), text: palette.warning, icon: 'hourglass-outline' },
    ACCEPTED: { bg: withAlpha(palette.success, 0.12), text: palette.success, icon: 'checkmark-circle-outline' },
    DECLINED: { bg: withAlpha(palette.error, 0.12), text: palette.error, icon: 'close-circle-outline' },
    EXPIRED: { bg: palette.background, text: palette.muted, icon: 'time-outline' },
    COUNTERED: { bg: withAlpha(palette.info, 0.12), text: palette.info, icon: 'swap-horizontal-outline' },
  } as Record<string, { bg: string; text: string; icon: string }>;
}

function SessionInviteCardComponent({
  invite,
  onPress,
  onAccept,
  onDecline,
  onCounterPropose,
  compact = false,
  showSlotSelector = false,
  slotTakenError = null,
  acceptLoading = false,
  onRsvp,
}: SessionInviteCardProps) {
  const { colors: palette } = useTheme();
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [showDeclineSheet, setShowDeclineSheet] = useState(false);

  const statusColors = getStatusColors(palette);
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

  // Delegate to MultiWeekInviteCard for recurring invites with weekSlots
  if (invite.isRecurring && invite.weekSlots && invite.weekSlots.length > 0 && canRespond) {
    return <MultiWeekInviteCard invite={invite} onResponded={() => onAccept?.()} />;
  }

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
      <SurfaceCard style={styles.compactCard} onPress={onPress} accessibilityLabel={`Session invite from ${invite.coachName}`}>
        <View style={styles.compactContent}>
          <View style={[styles.compactAvatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
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
            <Ionicons name={statusConfig.icon as keyof typeof Ionicons.glyphMap} size={12} color={statusConfig.text} />
          </View>
        </View>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress} accessibilityLabel={`Session invite from ${invite.coachName}`}>
      {/* Cover Image Hero (when available) */}
      {invite.coverImageUrl && (
        <CoverImageHero imageUrl={invite.coverImageUrl} sessionType={invite.sessionType} height={140} />
      )}

      {/* Invitation Message Banner */}
      <View style={[styles.invitationBanner, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
        <Ionicons name="mail-outline" size={16} color={palette.tint} />
        <ThemedText style={[styles.invitationBannerText, { color: palette.text }]}>
          {invitationMessage}
        </ThemedText>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
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

      {/* Session Type Chip + Duration + Price */}
      <View style={styles.sessionMeta}>
        <View style={[styles.sessionChip, { backgroundColor: withAlpha(palette.tint, 0.08), borderColor: withAlpha(palette.tint, 0.2) }]}>
          <ThemedText style={[styles.sessionChipText, { color: palette.tint }]}>
            {invite.sessionType}
          </ThemedText>
        </View>
        {invite.duration && (
          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
            {invite.duration} min
          </ThemedText>
        )}
        {invite.priceUsd != null && invite.priceUsd > 0 && (
          <ThemedText style={[styles.metaText, { color: palette.text }]}>
            {'\u00A3'}{invite.priceUsd}/session
          </ThemedText>
        )}
      </View>

      {/* Athletes */}
      <View style={styles.athleteRow}>
        <Ionicons name="person-outline" size={16} color={palette.muted} />
        <ThemedText style={[styles.athletes, { color: palette.text }]}>
          For: {invite.athleteNames.join(', ')}
        </ThemedText>
      </View>

      {/* Avatar Stack (RSVP social proof) */}
      {invite.rsvpCounts && invite.rsvpCounts.going > 0 && (
        <AvatarStack
          attendees={(invite.rsvpResponses ?? [])
            .filter((r) => r.status === 'going')
            .map((r) => ({ id: r.userId, name: r.userName, photoUrl: r.userPhotoUrl }))}
          goingCount={invite.rsvpCounts.going}
          maxVisible={4}
        />
      )}

      {/* Divider */}
      <Divider />

      {/* Time Slots — always show all as selectable when pending */}
      {canRespond && invite.proposedSlots.length > 1 ? (
        <View style={styles.slotSelector}>
          <ThemedText style={[styles.slotSelectorLabel, { color: palette.muted }]}>
            Pick a time:
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
                    backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.surface,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <View style={styles.slotOptionContent}>
                  <ThemedText type="defaultSemiBold">
                    {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </ThemedText>
                  <ThemedText style={{ color: palette.muted }}>
                    {slot.startTime} – {slot.endTime}
                    {slot.location && `  ·  ${slot.location}`}
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
                  {isSelected && <Ionicons name="checkmark" size={12} color={palette.onPrimary} />}
                </View>
              </Clickable>
            );
          })}
        </View>
      ) : (
        <View style={styles.details}>
          {invite.proposedSlots.map((slot, index) => (
            <View key={index} style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={palette.muted} />
              <ThemedText style={styles.detailText}>
                {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short',
                })}{' '}
                {slot.startTime} – {slot.endTime}
                {slot.location && `  ·  ${slot.location}`}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Slot Taken Error (Job 5.2) */}
      {slotTakenError && (
        <View style={[styles.slotTakenBanner, { backgroundColor: withAlpha(palette.error, 0.08) }]}>
          <Ionicons name="warning-outline" size={16} color={palette.error} />
          <ThemedText style={[styles.slotTakenText, { color: palette.error }]}>
            {slotTakenError}
          </ThemedText>
        </View>
      )}

      {/* Notes */}
      {invite.notes && (
        <ThemedText style={[styles.notes, { color: palette.muted }]} numberOfLines={2}>
          &quot;{invite.notes}&quot;
        </ThemedText>
      )}

      {/* RSVP Buttons (Facebook-style Going/Maybe/Can't Go) */}
      {(canRespond || status === 'MAYBE') && onRsvp && (
        <RsvpButtonGroup
          currentStatus={status === 'MAYBE' ? 'maybe' : null}
          onRespond={onRsvp}
          compact
        />
      )}

      {/* Actions (traditional Accept/Decline — shown when no onRsvp) */}
      {canRespond && onAccept && onDecline && !onRsvp && (
        <View style={styles.actionsRow}>
          <Clickable
            onPress={() => setShowDeclineSheet(true)}
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
            disabled={(invite.proposedSlots.length > 1 && selectedSlotIndex === null) || acceptLoading}
            style={[
              styles.actionButton,
              styles.acceptButton,
              {
                backgroundColor: palette.tint,
                opacity: (invite.proposedSlots.length > 1 && selectedSlotIndex === null) || acceptLoading ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name={acceptLoading ? 'hourglass-outline' : 'checkmark-outline'} size={18} color={palette.onPrimary} />
            <ThemedText style={[styles.actionText, { color: palette.onPrimary }]}>
              {acceptLoading ? 'Checking...' : 'Accept'}
            </ThemedText>
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

      {/* Decline Reason Sheet */}
      <DeclineReasonSheet
        visible={showDeclineSheet}
        onClose={() => setShowDeclineSheet(false)}
        onSubmit={(result) => {
          setShowDeclineSheet(false);
          onDecline?.(result);
        }}
        athleteName={invite.athleteNames[0]}
      />
    </SurfaceCard>
  );
}

export const SessionInviteCard = memo(SessionInviteCardComponent);

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
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactAvatarText: { ...Typography.bodySmallSemiBold },
  compactInfo: {
    flex: 1,
  },
  compactMeta: { ...Typography.caption },
  invitationText: { ...Typography.bodySmall },
  invitationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginBottom: Spacing.xs,
  },
  invitationBannerText: { ...Typography.bodySmallSemiBold, flex: 1 },
  clubName: { ...Typography.smallSemiBold },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.heading },
  headerContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  coachName: { ...Typography.subheading },
  sessionType: { ...Typography.small },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  statusText: { ...Typography.caption, textTransform: 'uppercase' },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  athletes: { ...Typography.small },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  sessionChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  sessionChipText: {
    ...Typography.smallSemiBold,
  },
  metaText: {
    ...Typography.small,
  },
  slotTakenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  slotTakenText: {
    ...Typography.smallSemiBold,
    flex: 1,
  },
  details: {
    gap: Spacing.xxs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: { ...Typography.small },
  notes: { ...Typography.small, fontStyle: 'italic' },
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
  actionText: { ...Typography.bodySmallSemiBold },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  expiryText: { ...Typography.caption },
  // Slot selector styles
  slotSelector: {
    gap: Spacing.sm,
  },
  slotSelectorLabel: { ...Typography.smallSemiBold },
  slotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  slotOptionContent: {
    gap: Spacing.micro,
  },
  slotRadio: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
