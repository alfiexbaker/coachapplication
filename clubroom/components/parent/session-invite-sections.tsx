/**
 * SessionInviteCard — Sub-components for full card variant.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { CoverImageHero } from '@/components/invite/cover-image-hero';
import { AvatarStack } from '@/components/invite/avatar-stack';
import { RsvpButtonGroup } from '@/components/invite/rsvp-button-group';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { TimeSlot } from '@/constants/types';
import { getExpiryCountdown } from './session-invite-helpers';

/* ─── Invitation Banner ─── */
interface InvitationBannerProps {
  message: string;
}
export const InvitationBanner = memo(function InvitationBanner({ message }: InvitationBannerProps) {
  const { colors: palette } = useTheme();
  return (
    <Row
      align="center"
      gap="sm"
      style={[styles.invitationBanner, { backgroundColor: withAlpha(palette.tint, 0.03) }]}
    >
      <Ionicons name="mail-outline" size={16} color={palette.tint} />
      <ThemedText style={[styles.invitationBannerText, { color: palette.text }]}>
        {message}
      </ThemedText>
    </Row>
  );
});

/* ─── Session Meta Row ─── */
interface SessionMetaProps {
  sessionType: string;
  duration?: number;
  price?: number;
}
export const SessionMetaRow = memo(function SessionMetaRow({
  sessionType,
  duration,
  price,
}: SessionMetaProps) {
  const { colors: palette } = useTheme();
  return (
    <Row align="center" gap="sm" wrap>
      <View
        style={[
          styles.sessionChip,
          {
            backgroundColor: withAlpha(palette.tint, 0.08),
            borderColor: withAlpha(palette.tint, 0.2),
          },
        ]}
      >
        <ThemedText style={[styles.sessionChipText, { color: palette.tint }]}>
          {sessionType}
        </ThemedText>
      </View>
      {duration != null && (
        <ThemedText style={[styles.metaText, { color: palette.muted }]}>{duration} min</ThemedText>
      )}
      {price != null && price > 0 && (
        <ThemedText style={[styles.metaText, { color: palette.text }]}>
          {'\u00A3'}
          {price}/session
        </ThemedText>
      )}
    </Row>
  );
});

/* ─── Slot Selector (multiple slots) ─── */
interface SlotSelectorProps {
  slots: TimeSlot[];
  selectedIndex: number | null;
  onSelect: (i: number) => void;
}
export const SlotSelector = memo(function SlotSelector({
  slots,
  selectedIndex,
  onSelect,
}: SlotSelectorProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.slotSelector}>
      <ThemedText style={[styles.slotSelectorLabel, { color: palette.muted }]}>
        Pick a time:
      </ThemedText>
      {slots.map((slot, index) => {
        const isSelected = selectedIndex === index;
        return (
          <Clickable key={index} onPress={() => onSelect(index)}>
            <Row
              align="center"
              justify="space-between"
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
                  {slot.startTime} {'\u2013'} {slot.endTime}
                  {slot.location && `  \u00B7  ${slot.location}`}
                </ThemedText>
              </View>
              <Row
                align="center"
                justify="center"
                style={[
                  styles.slotRadio,
                  {
                    backgroundColor: isSelected ? palette.tint : 'transparent',
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={12} color={palette.onPrimary} />}
              </Row>
            </Row>
          </Clickable>
        );
      })}
    </View>
  );
});

/* ─── Slot Display (single/read-only) ─── */
interface SlotDisplayProps {
  slots: TimeSlot[];
}
export const SlotDisplay = memo(function SlotDisplay({ slots }: SlotDisplayProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.details}>
      {slots.map((slot, index) => (
        <Row key={index} align="center" gap="xs">
          <Ionicons name="calendar-outline" size={16} color={palette.muted} />
          <ThemedText style={styles.detailText}>
            {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}{' '}
            {slot.startTime} {'\u2013'} {slot.endTime}
            {slot.location && `  \u00B7  ${slot.location}`}
          </ThemedText>
        </Row>
      ))}
    </View>
  );
});

/* ─── Invite Actions ─── */
interface InviteActionsProps {
  onAccept: () => void;
  onDecline: () => void;
  acceptDisabled: boolean;
  acceptLoading: boolean;
}
export const InviteActions = memo(function InviteActions({
  onAccept,
  onDecline,
  acceptDisabled,
  acceptLoading,
}: InviteActionsProps) {
  const { colors: palette } = useTheme();
  return (
    <Row gap="sm" style={styles.actionsRow}>
      <Clickable
        style={[styles.actionButton, styles.declineButton, { borderColor: palette.border }]}
        onPress={onDecline}
      >
        <Row align="center" justify="center" gap="xs" flex>
          <Ionicons name="close-outline" size={18} color={palette.text} />
          <ThemedText style={styles.actionText}>Decline</ThemedText>
        </Row>
      </Clickable>
      <Clickable
        disabled={acceptDisabled || acceptLoading}
        style={[
          styles.actionButton,
          styles.acceptButton,
          { backgroundColor: palette.tint, opacity: acceptDisabled || acceptLoading ? 0.5 : 1 },
        ]}
        onPress={onAccept}
      >
        <Row align="center" justify="center" gap="xs" flex>
          <Ionicons
            name={acceptLoading ? 'hourglass-outline' : 'checkmark-outline'}
            size={18}
            color={palette.onPrimary}
          />
          <ThemedText style={[styles.actionText, { color: palette.onPrimary }]}>
            {acceptLoading ? 'Checking...' : 'Accept'}
          </ThemedText>
        </Row>
      </Clickable>
    </Row>
  );
});

/* ─── Expiry Warning ─── */
interface ExpiryWarningProps {
  expiresAt: string;
}
export const ExpiryWarning = memo(function ExpiryWarning({ expiresAt }: ExpiryWarningProps) {
  const { colors: palette } = useTheme();
  return (
    <Row align="center" justify="center" gap="xs" style={styles.expiryRow}>
      <Ionicons name="time-outline" size={14} color={palette.warning} />
      <ThemedText style={[styles.expiryText, { color: palette.warning }]}>
        {getExpiryCountdown(expiresAt)}
      </ThemedText>
    </Row>
  );
});

/* ─── Slot Taken Error ─── */
interface SlotTakenBannerProps {
  message: string;
}
export const SlotTakenBanner = memo(function SlotTakenBanner({ message }: SlotTakenBannerProps) {
  const { colors: palette } = useTheme();
  return (
    <Row
      align="center"
      gap="xs"
      style={[styles.slotTakenBanner, { backgroundColor: withAlpha(palette.error, 0.08) }]}
    >
      <Ionicons name="warning-outline" size={16} color={palette.error} />
      <ThemedText style={[styles.slotTakenText, { color: palette.error }]}>{message}</ThemedText>
    </Row>
  );
});

/* Re-export for convenience */
export { CoverImageHero, AvatarStack, RsvpButtonGroup };

const styles = StyleSheet.create({
  invitationBanner: { padding: Spacing.sm, borderRadius: Radii.sm, marginBottom: Spacing.xs },
  invitationBannerText: { ...Typography.bodySmallSemiBold, flex: 1 },
  sessionMeta: {},
  sessionChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  sessionChipText: { ...Typography.smallSemiBold },
  metaText: { ...Typography.small },
  slotSelector: { gap: Spacing.sm },
  slotSelectorLabel: { ...Typography.smallSemiBold },
  slotOption: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
  slotOptionContent: { gap: Spacing.micro },
  slotRadio: { width: 20, height: 20, borderRadius: Radii.md, borderWidth: 2 },
  details: { gap: Spacing.xxs },
  detailText: { ...Typography.small },
  actionsRow: { marginTop: Spacing.xs },
  actionButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  declineButton: { borderWidth: 1 },
  acceptButton: {},
  actionText: { ...Typography.bodySmallSemiBold },
  expiryRow: { marginTop: Spacing.xs },
  expiryText: { ...Typography.caption },
  slotTakenBanner: { padding: Spacing.sm, borderRadius: Radii.sm },
  slotTakenText: { ...Typography.smallSemiBold, flex: 1 },
});
