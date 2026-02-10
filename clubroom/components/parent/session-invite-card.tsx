/**
 * SessionInviteCard — Composition root.
 * Displays a session invite with compact/full variants, slot picker, actions, RSVP.
 */
import { memo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionInvite, TimeSlot } from '@/constants/types';
import { DeclineReasonSheet, type DeclineReasonResult } from './decline-reason-sheet';
import { MultiWeekInviteCard } from './multi-week-invite-card';
import { getStatusColors } from './session-invite-helpers';
import {
  InvitationBanner, SessionMetaRow, SlotSelector, SlotDisplay,
  InviteActions, ExpiryWarning, SlotTakenBanner, CoverImageHero, AvatarStack, RsvpButtonGroup,
} from './session-invite-sections';

interface SessionInviteCardProps {
  invite: SessionInvite;
  onPress: () => void;
  onAccept?: (selectedSlot?: TimeSlot) => void;
  onDecline?: (reason?: DeclineReasonResult) => void;
  onCounterPropose?: () => void;
  compact?: boolean;
  showSlotSelector?: boolean;
  slotTakenError?: string | null;
  acceptLoading?: boolean;
  onRsvp?: (status: 'going' | 'maybe' | 'cant_go') => void;
}

function SessionInviteCardComponent({
  invite, onPress, onAccept, onDecline, onCounterPropose,
  compact = false, slotTakenError = null, acceptLoading = false, onRsvp,
}: SessionInviteCardProps) {
  const { colors: palette } = useTheme();
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [showDeclineSheet, setShowDeclineSheet] = useState(false);

  const statusColors = getStatusColors(palette);
  const isExpired = new Date(invite.expiresAt) < new Date();
  const status = isExpired && invite.status === 'PENDING' ? 'EXPIRED' : invite.status;
  const statusConfig = statusColors[status] || statusColors.PENDING;
  const canRespond = status === 'PENDING';

  const firstSlot = invite.proposedSlots[0];
  const slotDate = firstSlot ? new Date(firstSlot.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const initials = invite.coachName.split(' ').map((n) => n[0]).join('');

  // Delegate to MultiWeekInviteCard for recurring
  if (invite.isRecurring && invite.weekSlots && invite.weekSlots.length > 0 && canRespond) {
    return <MultiWeekInviteCard invite={invite} onResponded={() => onAccept?.()} />;
  }

  const coachFirstName = invite.coachName.split(' ')[0];
  const athleteDisplay = invite.athleteNames.length === 1 ? invite.athleteNames[0] : `${invite.athleteNames.length} athletes`;
  const invitationMessage = invite.clubName
    ? `Coach ${coachFirstName} has invited ${athleteDisplay} to ${invite.clubName}`
    : `Coach ${coachFirstName} has invited ${athleteDisplay} to a ${invite.sessionType.toLowerCase()}`;

  const handleAccept = () => {
    const slot = selectedSlotIndex !== null ? invite.proposedSlots[selectedSlotIndex] : undefined;
    onAccept?.(slot);
  };

  if (compact) {
    return (
      <SurfaceCard style={styles.compactCard} onPress={onPress} accessibilityLabel={`Session invite from ${invite.coachName}`}>
        <Row align="center" gap="md">
          <Row align="center" justify="center" style={[styles.compactAvatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <ThemedText style={[styles.compactAvatarText, { color: palette.tint }]}>{initials}</ThemedText>
          </Row>
          <View style={styles.compactInfo}>
            <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.invitationText}>{invitationMessage}</ThemedText>
            <ThemedText style={[styles.compactMeta, { color: palette.muted }]} numberOfLines={1}>{invite.sessionType} - {slotDate}</ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon as keyof typeof Ionicons.glyphMap} size={12} color={statusConfig.text} />
          </View>
        </Row>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress} accessibilityLabel={`Session invite from ${invite.coachName}`}>
      {invite.coverImageUrl && <CoverImageHero imageUrl={invite.coverImageUrl} sessionType={invite.sessionType} height={140} />}
      <InvitationBanner message={invitationMessage} />

      {/* Header */}
      <Row align="center" gap="md">
        <Row align="center" justify="center" style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>{initials}</ThemedText>
        </Row>
        <View style={styles.headerContent}>
          <ThemedText type="defaultSemiBold" style={styles.coachName}>Coach {invite.coachName}</ThemedText>
          {invite.clubName && <ThemedText style={[styles.clubName, { color: palette.tint }]}>{invite.clubName}</ThemedText>}
          <ThemedText style={[styles.sessionType, { color: palette.muted }]}>{invite.sessionType} - {invite.focus}</ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>{status}</ThemedText>
        </View>
      </Row>

      <SessionMetaRow sessionType={invite.sessionType} duration={invite.duration} priceUsd={invite.priceUsd} />

      <Row align="center" gap="xs">
        <Ionicons name="person-outline" size={16} color={palette.muted} />
        <ThemedText style={[styles.athletes, { color: palette.text }]}>For: {invite.athleteNames.join(', ')}</ThemedText>
      </Row>

      {invite.rsvpCounts && invite.rsvpCounts.going > 0 && (
        <AvatarStack attendees={(invite.rsvpResponses ?? []).filter((r) => r.status === 'going').map((r) => ({ id: r.userId, name: r.userName, photoUrl: r.userPhotoUrl }))}
          goingCount={invite.rsvpCounts.going} maxVisible={4} />
      )}

      <Divider />

      {canRespond && invite.proposedSlots.length > 1
        ? <SlotSelector slots={invite.proposedSlots} selectedIndex={selectedSlotIndex} onSelect={setSelectedSlotIndex} />
        : <SlotDisplay slots={invite.proposedSlots} />}

      {slotTakenError && <SlotTakenBanner message={slotTakenError} />}
      {invite.notes && <ThemedText style={[styles.notes, { color: palette.muted }]} numberOfLines={2}>&quot;{invite.notes}&quot;</ThemedText>}

      {(canRespond || status === 'MAYBE') && onRsvp && <RsvpButtonGroup currentStatus={status === 'MAYBE' ? 'maybe' : null} onRespond={onRsvp} compact />}

      {canRespond && onAccept && onDecline && !onRsvp && (
        <InviteActions onAccept={handleAccept} onDecline={() => setShowDeclineSheet(true)} onCounterPropose={onCounterPropose}
          acceptDisabled={invite.proposedSlots.length > 1 && selectedSlotIndex === null} acceptLoading={acceptLoading} />
      )}

      {canRespond && <ExpiryWarning expiresAt={invite.expiresAt} />}

      <DeclineReasonSheet visible={showDeclineSheet} onClose={() => setShowDeclineSheet(false)}
        onSubmit={(result) => { setShowDeclineSheet(false); onDecline?.(result); }} athleteName={invite.athleteNames[0]} />
    </SurfaceCard>
  );
}

export const SessionInviteCard = memo(SessionInviteCardComponent);

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm },
  compactCard: { padding: Spacing.md },
  compactAvatar: { width: 36, height: 36, borderRadius: Radii.xl },
  compactAvatarText: { ...Typography.bodySmallSemiBold },
  compactInfo: { flex: 1 },
  compactMeta: { ...Typography.caption },
  invitationText: { ...Typography.bodySmall },
  avatar: { width: 48, height: 48, borderRadius: Radii.xl },
  avatarText: { ...Typography.heading },
  headerContent: { flex: 1, gap: Spacing.micro },
  coachName: { ...Typography.subheading },
  clubName: { ...Typography.smallSemiBold },
  sessionType: { ...Typography.small },
  statusBadge: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  statusText: { ...Typography.caption, textTransform: 'uppercase' },
  athletes: { ...Typography.small },
  notes: { ...Typography.small, fontStyle: 'italic' },
});
