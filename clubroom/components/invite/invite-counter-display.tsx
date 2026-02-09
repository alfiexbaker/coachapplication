/**
 * InviteCounterDisplay — Shows counter-proposal from parent (coach view).
 *
 * Displays the proposed alternative time slots from the parent.
 * Coach can tap any slot to accept it.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row, Column } from '@/components/primitives';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { TimeSlot } from '@/constants/types';

interface InviteCounterDisplayProps {
  counterProposal: TimeSlot[];
  counterNote?: string;
  colors: ThemeColors;
  onAcceptCounter: (slot: TimeSlot) => void;
  delay?: number;
}

export const InviteCounterDisplay = memo(function InviteCounterDisplay({
  counterProposal,
  counterNote,
  colors,
  onAcceptCounter,
  delay = 250,
}: InviteCounterDisplayProps) {
  const handleSlotPress = useCallback(
    (slot: TimeSlot) => {
      Alert.alert(
        'Accept This Time?',
        `Confirm session for ${new Date(slot.date).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })} at ${slot.startTime}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Accept', onPress: () => onAcceptCounter(slot) },
        ],
      );
    },
    [onAcceptCounter],
  );

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold">Counter Proposal from Parent</ThemedText>

        {counterNote && (
          <ThemedText style={[styles.counterNote, { color: colors.muted }]}>
            &quot;{counterNote}&quot;
          </ThemedText>
        )}

        {counterProposal.map((slot) => (
          <Clickable
            key={`counter-${slot.date}-${slot.startTime}`}
            onPress={() => handleSlotPress(slot)}
            accessibilityLabel={`Accept counter proposal: ${slot.date} at ${slot.startTime}`}
            style={[styles.slotSelectable, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Column gap="xxs" style={styles.slotDetails}>
              <ThemedText type="defaultSemiBold">
                {new Date(slot.date).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </ThemedText>
              <ThemedText style={{ color: colors.muted }}>
                {slot.startTime} - {slot.endTime}
              </ThemedText>
            </Column>
            <Row style={[styles.acceptButton, { backgroundColor: colors.tint }]}>
              <ThemedText style={{ color: colors.onPrimary, ...Typography.caption }}>Accept</ThemedText>
            </Row>
          </Clickable>
        ))}
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  counterNote: {
    ...Typography.small,
    fontStyle: 'italic',
  },
  slotSelectable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  slotDetails: {
    flex: 1,
  },
  acceptButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
});
