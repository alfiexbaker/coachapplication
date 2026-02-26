/**
 * InviteActionBar — Sticky bottom action bar for invite responses.
 *
 * Shows Accept/Decline/Counter buttons for recipients,
 * or RSVP buttons for non-recipient observers.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives';
import { RsvpButtonGroup } from '@/components/invite/rsvp-button-group';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface InviteActionBarProps {
  canRespond: boolean;
  isOwner: boolean;
  status: string;
  showCounterPropose: boolean;
  responding: boolean;
  selectedSlot: number | null;
  currentRsvpStatus: 'going' | 'maybe' | 'cant_go' | null;
  colors: ThemeColors;
  onAccept: () => void;
  onDecline: () => void;
  onShowCounter: () => void;
  onRsvp: (status: 'going' | 'maybe' | 'cant_go') => void;
}

export const InviteActionBar = memo(function InviteActionBar({
  canRespond,
  isOwner,
  status,
  showCounterPropose,
  responding,
  selectedSlot,
  currentRsvpStatus,
  colors,
  onAccept,
  onDecline,
  onShowCounter,
  onRsvp,
}: InviteActionBarProps) {
  // Recipient action buttons (Accept/Decline/Counter)
  if (canRespond && !showCounterPropose) {
    const needsSlotSelection = selectedSlot === null;
    return (
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {needsSlotSelection && !responding && (
          <ThemedText style={[styles.helperText, { color: colors.muted }]}>
            Select a proposed time slot above to enable Accept.
          </ThemedText>
        )}
        <Row gap="md">
          <Clickable
            onPress={onDecline}
            disabled={responding}
            accessibilityLabel="Decline invite"
            style={[styles.declineButton, { borderColor: colors.border }]}
          >
            <ThemedText style={{ ...Typography.bodySemiBold }}>Decline</ThemedText>
          </Clickable>
          <Clickable
            onPress={onShowCounter}
            accessibilityLabel="Counter propose alternative times"
            style={[styles.counterButton, { borderColor: colors.tint }]}
          >
            <ThemedText style={{ color: colors.tint, ...Typography.bodySemiBold }}>
              Counter
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={onAccept}
            disabled={responding || needsSlotSelection}
            accessibilityLabel="Accept invite"
            style={[
              styles.acceptButton,
              {
                backgroundColor: colors.tint,
                opacity: responding || needsSlotSelection ? 0.5 : 1,
              },
            ]}
          >
            <ThemedText style={{ color: colors.onPrimary, ...Typography.bodySemiBold }}>
              {responding ? 'Accepting...' : 'Accept'}
            </ThemedText>
          </Clickable>
        </Row>
      </View>
    );
  }

  // RSVP for non-recipients (social RSVP for open/squad invites)
  if (!canRespond && status === 'PENDING' && !isOwner) {
    return (
      <Row style={[styles.footer, { borderTopColor: colors.border }]}>
        <RsvpButtonGroup currentStatus={currentRsvpStatus} onRespond={onRsvp} compact={false} />
      </Row>
    );
  }

  return null;
});

const styles = StyleSheet.create({
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  helperText: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  declineButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minHeight: 44,
  },
  counterButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minHeight: 44,
  },
  acceptButton: {
    flex: 2,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
    minHeight: 44,
  },
});
