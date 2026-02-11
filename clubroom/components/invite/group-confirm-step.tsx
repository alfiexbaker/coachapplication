/**
 * GroupConfirmStep — Final confirmation step for the group invite wizard.
 *
 * Shows a send icon, summary of invites/athletes, and a disclaimer
 * about response time and cancellation.
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Center } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Athlete } from '@/components/coach/invite-athlete-modal';

export interface GroupConfirmStepProps {
  selectedAthletes: Athlete[];
  colors: ThemeColors;
}

export const GroupConfirmStep = memo(function GroupConfirmStep({
  selectedAthletes,
  colors,
}: GroupConfirmStepProps) {
  const uniqueParentCount = useMemo(
    () => new Set(selectedAthletes.map((a) => a.parentId)).size,
    [selectedAthletes],
  );

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Center style={styles.content}>
        <Center style={[styles.icon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
          <Ionicons name="paper-plane" size={48} color={colors.tint} />
        </Center>
        <ThemedText type="subtitle" style={styles.title}>
          Ready to Send?
        </ThemedText>
        <ThemedText style={[styles.text, { color: colors.muted }]}>
          You are about to send {uniqueParentCount} invite
          {uniqueParentCount !== 1 ? 's' : ''} for {selectedAthletes.length} athlete
          {selectedAthletes.length !== 1 ? 's' : ''}.
        </ThemedText>
        <ThemedText style={[styles.disclaimer, { color: colors.muted }]}>
          Parents will receive a notification and have 7 days to respond. You can cancel the invites
          anytime before they respond.
        </ThemedText>
      </Center>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingVertical: Spacing['2xl'],
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: Radii['2xl'],
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  text: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  disclaimer: {
    ...Typography.small,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
