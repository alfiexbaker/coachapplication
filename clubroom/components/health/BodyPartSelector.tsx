/**
 * BodyPartSelector Component
 *
 * Visual body selector that only uses the anatomical body map.
 */

import { useCallback } from 'react';
import { View, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import type { BodyPart } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { BodyDiagram, styles } from './body-part-selector-sections';

interface BodyPartSelectorProps {
  selectedPart: BodyPart | null;
  onSelect: (part: BodyPart) => void;
}

export function BodyPartSelector({ selectedPart, onSelect }: BodyPartSelectorProps) {
  const { colors: palette } = useTheme();

  const handlePartSelect = useCallback(
    (part: BodyPart) => {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSelect(part);
    },
    [onSelect],
  );

  return (
    <View style={styles.container}>
      <BodyDiagram selectedPart={selectedPart} onSelectPart={handlePartSelect} palette={palette} />
    </View>
  );
}
