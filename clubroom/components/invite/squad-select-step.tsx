/**
 * SquadSelectStep — First step of squad bulk invite wizard.
 *
 * Shows an inline squad selector and a preview card of the selected squad.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row, Column } from '@/components/primitives';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { InlineSquadSelector } from '@/components/squad/squad-picker';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ClubSquad } from '@/constants/types';

export interface SquadSelectStepProps {
  clubId: string;
  selectedSquadIds: string[];
  onSelectionChange: (ids: string[]) => void;
  selectedSquad: ClubSquad | null;
  colors: ThemeColors;
}

export const SquadSelectStep = memo(function SquadSelectStep({
  clubId,
  selectedSquadIds,
  onSelectionChange,
  selectedSquad,
  colors,
}: SquadSelectStepProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Select Squad
        </ThemedText>
        <ThemedText style={[styles.stepDescription, { color: colors.muted }]}>
          Choose a squad to invite to your training session
        </ThemedText>

        <InlineSquadSelector
          clubId={clubId}
          selectedSquadIds={selectedSquadIds}
          onSelectionChange={onSelectionChange}
          multiSelect={false}
          label=""
        />

        {selectedSquad && (
          <SurfaceCard style={styles.squadPreview}>
            <Row align="center" gap="md">
              <View style={[styles.squadIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                <Ionicons name="people" size={24} color={colors.tint} />
              </View>
              <Column gap="micro" style={styles.flex1}>
                <ThemedText type="defaultSemiBold">{selectedSquad.name}</ThemedText>
                <ThemedText style={[styles.squadMeta, { color: colors.muted }]}>
                  {selectedSquad.memberCount} athletes {'\u2022'} {selectedSquad.level}
                </ThemedText>
              </Column>
            </Row>
          </SurfaceCard>
        )}
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
  squadPreview: {
    marginTop: Spacing.sm,
  },
  squadIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
  },
  squadMeta: {
    ...Typography.caption,
  },
});
