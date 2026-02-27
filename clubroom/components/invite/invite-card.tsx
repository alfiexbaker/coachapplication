import React, { memo, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { RsvpButtonGroup } from '@/components/invite/rsvp-button-group';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatInUserTimezone } from '@/utils/timezone';
import type { SessionInvite } from '@/constants/types';
import { formatExpiresIn } from '@/hooks/use-invites';
import { Row } from '@/components/primitives';
import {
  getSessionInviteAthleteNames,
  getSessionInviteCoachName,
} from '@/utils/session-invite-display';

interface InviteCardProps {
  invite: SessionInvite;
  respondingTo: string | null;
  onAccept: (invite: SessionInvite) => void;
  onDecline: (invite: SessionInvite) => void;
  onRsvp: (inviteId: string, status: 'going' | 'maybe' | 'cant_go') => void;
}

function getStatusBadge(
  status: string,
  palette: { success: string; error: string; warning: string; muted: string; tint: string },
) {
  switch (status) {
    case 'ACCEPTED':
      return { text: 'Accepted', color: palette.success };
    case 'DECLINED':
      return { text: 'Declined', color: palette.error };
    case 'COUNTERED':
      return { text: 'Counter Sent', color: palette.warning };
    case 'EXPIRED':
      return { text: 'Expired', color: palette.muted };
    case 'MAYBE':
      return { text: 'Maybe', color: palette.warning };
    default:
      return { text: 'Pending', color: palette.tint };
  }
}

export const InviteCard = memo(function InviteCard({
  invite,
  respondingTo,
  onAccept,
  onDecline,
  onRsvp,
}: InviteCardProps) {
  const { colors: palette } = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const isPending = invite.status === 'PENDING';
  const isExpired = new Date(invite.expiresAt) <= new Date();
  const isResponding = respondingTo === invite.id;
  const statusBadge = getStatusBadge(isExpired && isPending ? 'EXPIRED' : invite.status, palette);
  const coachName = getSessionInviteCoachName(invite);
  const athleteNames = getSessionInviteAthleteNames(invite);
  const firstSlot = invite.proposedSlots[0];
  const compactSlotSummary = useMemo(() => {
    if (!firstSlot) return 'No proposed times';
    const dateLabel = formatInUserTimezone(`${firstSlot.date}T${firstSlot.startTime || '00:00'}`, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const extraCount = Math.max(0, invite.proposedSlots.length - 1);
    return `${dateLabel} ${firstSlot.startTime}${extraCount > 0 ? ` (+${extraCount} more)` : ''}`;
  }, [firstSlot, invite.proposedSlots.length]);

  return (
    <SurfaceCard style={styles.card}>
      {/* Header */}
      <Row style={styles.header}>
        <Row style={styles.coachInfo}>
          <View
            style={[
              styles.coachPhoto,
              styles.placeholder,
              { backgroundColor: withAlpha(palette.tint, 0.12) },
            ]}
          >
            <ThemedText style={[styles.initial, { color: palette.tint }]}>
              {coachName.charAt(0)}
            </ThemedText>
          </View>
          <View style={styles.coachDetails}>
            <ThemedText type="defaultSemiBold">{coachName}</ThemedText>
            {invite.clubName && (
              <ThemedText style={[styles.clubName, { color: palette.muted }]}>
                {invite.clubName}
              </ThemedText>
            )}
          </View>
        </Row>
        <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusBadge.color, 0.09) }]}>
          <ThemedText style={[styles.statusText, { color: statusBadge.color }]}>
            {statusBadge.text}
          </ThemedText>
        </View>
      </Row>

      {/* Athletes */}
      <Row style={styles.athleteRow}>
        <Ionicons name="person-outline" size={16} color={palette.icon} />
        <ThemedText style={[styles.athleteNames, { color: palette.muted }]}>
          For: {athleteNames.join(', ')}
        </ThemedText>
      </Row>

      {/* Session Info */}
      <Row style={styles.sessionInfo}>
        <ThemedText type="defaultSemiBold" style={styles.sessionType}>
          {invite.sessionType}
        </ThemedText>
        {invite.focus && (
          <View style={[styles.focusBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.focusText, { color: palette.tint }]}>
              {invite.focus}
            </ThemedText>
          </View>
        )}
      </Row>
      <Row style={styles.compactInfoRow}>
        <Row
          style={[
            styles.compactSlotPill,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Ionicons name="calendar-outline" size={14} color={palette.icon} />
          <ThemedText style={styles.slotText} numberOfLines={1}>
            {compactSlotSummary}
          </ThemedText>
        </Row>
        {(invite.notes || invite.proposedSlots.length > 1) && (
          <Clickable
            onPress={() => setShowDetails((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showDetails ? 'Hide invite details' : 'Show invite details'}
            style={[
              styles.detailsToggle,
              { borderColor: palette.border, backgroundColor: withAlpha(palette.border, 0.12) },
            ]}
          >
            <Row align="center" gap="xxs">
              <ThemedText style={[styles.detailsToggleText, { color: palette.muted }]}>
                {showDetails ? 'Hide' : 'Details'}
              </ThemedText>
              <Ionicons
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={palette.muted}
              />
            </Row>
          </Clickable>
        )}
      </Row>

      {showDetails && (
        <View style={styles.detailsPanel}>
          {invite.notes && (
            <ThemedText style={[styles.notes, { color: palette.muted }]} numberOfLines={3}>
              &quot;{invite.notes}&quot;
            </ThemedText>
          )}

          <View style={styles.slotsSection}>
            <ThemedText style={[styles.slotsLabel, { color: palette.muted }]}>
              Proposed time{invite.proposedSlots.length > 1 ? 's' : ''}:
            </ThemedText>
            <Row style={styles.slotsList}>
              {invite.proposedSlots.slice(0, 3).map((slot, index) => (
                <Row
                  key={index}
                  style={[
                    styles.slotChip,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={14} color={palette.icon} />
                  <ThemedText style={styles.slotText}>
                    {formatInUserTimezone(`${slot.date}T${slot.startTime || '00:00'}`, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    {slot.startTime}
                  </ThemedText>
                </Row>
              ))}
              {invite.proposedSlots.length > 3 && (
                <ThemedText style={[styles.moreSlots, { color: palette.muted }]}>
                  +{invite.proposedSlots.length - 3} more
                </ThemedText>
              )}
            </Row>
          </View>
        </View>
      )}

      {/* Price & Expiry */}
      <Row style={styles.metaRow}>
        {invite.price !== undefined && invite.price > 0 && (
          <ThemedText type="defaultSemiBold" style={[styles.price, { color: palette.tint }]}>
            £{invite.price}
          </ThemedText>
        )}
        {isPending && !isExpired && (
          <ThemedText style={[styles.expires, { color: palette.warning }]}>
            {formatExpiresIn(invite.expiresAt)}
          </ThemedText>
        )}
      </Row>

      {/* RSVP */}
      {(isPending || invite.status === 'MAYBE') && !isExpired && (
        <View style={styles.rsvpSection}>
          <RsvpButtonGroup
            currentStatus={invite.status === 'MAYBE' ? 'maybe' : undefined}
            onRespond={(s) => onRsvp(invite.id, s)}
            disabled={isResponding}
            compact
          />
          {isPending && (
            <Row style={styles.actions}>
              <Clickable
                style={[styles.declineButton, { borderColor: palette.border }]}
                onPress={() => onDecline(invite)}
                disabled={isResponding}
                accessibilityLabel="Decline invite"
                accessibilityRole="button"
                accessibilityState={{ disabled: isResponding }}
              >
                <ThemedText style={[styles.declineText, { color: palette.muted }]}>
                  Decline
                </ThemedText>
              </Clickable>
              <Clickable
                style={[styles.acceptButton, { backgroundColor: palette.tint }]}
                onPress={() => onAccept(invite)}
                disabled={isResponding}
                accessibilityLabel="Accept invite"
                accessibilityRole="button"
                accessibilityState={{ disabled: isResponding }}
              >
                {isResponding ? (
                  <ThemedText style={[styles.acceptText, { color: palette.onPrimary }]}>
                    Booking...
                  </ThemedText>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color={palette.onPrimary} />
                    <ThemedText style={[styles.acceptText, { color: palette.onPrimary }]}>
                      Accept
                    </ThemedText>
                  </>
                )}
              </Clickable>
            </Row>
          )}
        </View>
      )}

      {/* Accepted slot */}
      {invite.status === 'ACCEPTED' && invite.selectedSlot && (
        <Row style={[styles.confirmedSlot, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
          <Ionicons name="checkmark-circle" size={18} color={palette.success} />
          <ThemedText style={[styles.confirmedText, { color: palette.success }]}>
            Booked:{' '}
            {formatInUserTimezone(
              `${invite.selectedSlot.date}T${invite.selectedSlot.startTime || '00:00'}`,
              {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              },
            )}{' '}
            at {invite.selectedSlot.startTime}
          </ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  header: { alignItems: 'flex-start', justifyContent: 'space-between' },
  coachInfo: { alignItems: 'center', gap: Spacing.sm, flex: 1 },
  coachPhoto: { width: 44, height: 44, borderRadius: Radii.xl },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { ...Typography.heading },
  coachDetails: { flex: 1 },
  clubName: { ...Typography.small },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  statusText: { ...Typography.caption },
  athleteRow: { alignItems: 'center', gap: Spacing.xs },
  athleteNames: { ...Typography.small },
  sessionInfo: { alignItems: 'center', gap: Spacing.sm },
  sessionType: { ...Typography.subheading },
  focusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  focusText: { ...Typography.caption },
  notes: { ...Typography.bodySmall, fontStyle: 'italic' },
  compactInfoRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  compactSlotPill: {
    flex: 1,
    minHeight: 34,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  detailsToggle: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsToggleText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  detailsPanel: {
    gap: Spacing.xs,
  },
  slotsSection: { gap: Spacing.xs },
  slotsLabel: { ...Typography.caption },
  slotsList: { flexWrap: 'wrap', gap: Spacing.xs, alignItems: 'center' },
  slotChip: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  slotText: { ...Typography.small },
  moreSlots: { ...Typography.caption },
  metaRow: { alignItems: 'center', justifyContent: 'space-between' },
  price: { ...Typography.heading },
  expires: { ...Typography.smallSemiBold },
  rsvpSection: { gap: Spacing.sm },
  actions: { gap: Spacing.sm, marginTop: Spacing.xs },
  declineButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  declineText: { ...Typography.bodySemiBold },
  acceptButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  acceptText: { ...Typography.bodySemiBold },
  confirmedSlot: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
  },
  confirmedText: { ...Typography.bodySmallSemiBold },
});
