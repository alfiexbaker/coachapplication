/**
 * SquadMembersStep — Member selection step for squad bulk invite wizard.
 *
 * Wraps SquadMemberSelect in a step layout with title/description.
 */

import React, { memo } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Column } from '@/components/primitives';
import { SquadMemberSelect } from '@/components/squad/SquadMemberSelect';
import { ThemedText } from '@/components/themed-text';
import { Typography, Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@/hooks/useTheme';

export interface SquadMembersStepProps {
  squadId: string;
  sessionId?: string;
  selectedMemberIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onParentCountChange: (count: number) => void;
  colors: ThemeColors;
}

export const SquadMembersStep = memo(function SquadMembersStep({
  squadId,
  sessionId,
  selectedMemberIds,
  onSelectionChange,
  onParentCountChange,
}: SquadMembersStepProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Select Members
        </ThemedText>
        <ThemedText style={styles.stepDescription}>Choose which squad members to invite</ThemedText>

        <SquadMemberSelect
          squadId={squadId}
          sessionId={sessionId}
          selectedMemberIds={selectedMemberIds}
          onSelectionChange={onSelectionChange}
          onParentCountChange={onParentCountChange}
          showSelectAll
          showNotificationCount
          maxHeight={350}
        />
      </Column>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  stepTitle: {
    ...Typography.title,
  },
  stepDescription: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
});
