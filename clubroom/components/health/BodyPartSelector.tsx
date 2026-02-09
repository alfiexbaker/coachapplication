/**
 * BodyPartSelector Component
 *
 * Visual body part selector with anatomical figure.
 * Allows users to select injured body parts from categorized groups.
 */

import { useState, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import type { BodyPart, BodyPartCategory } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { injuryService } from '@/services/injury-service';

import {
  CATEGORIES,
  BodyDiagram,
  CategoryAccordionItem,
  styles,
} from './body-part-selector-sections';

interface BodyPartSelectorProps {
  selectedPart: BodyPart | null;
  onSelect: (part: BodyPart) => void;
}

export function BodyPartSelector({ selectedPart, onSelect }: BodyPartSelectorProps) {
  const { colors: palette } = useTheme();
  const [expandedCategory, setExpandedCategory] = useState<BodyPartCategory | null>(
    selectedPart ? injuryService.getBodyPartCategory(selectedPart) : null
  );

  const handleCategoryPress = useCallback(
    (category: BodyPartCategory) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpandedCategory(expandedCategory === category ? null : category);
    },
    [expandedCategory]
  );

  const handlePartSelect = useCallback(
    (part: BodyPart) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSelect(part);
    },
    [onSelect]
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <BodyDiagram selectedPart={selectedPart} palette={palette} />

      <View style={styles.categoriesContainer}>
        <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
          Select Body Part
        </ThemedText>

        {CATEGORIES.map((category) => (
          <CategoryAccordionItem
            key={category.id}
            category={category}
            isExpanded={expandedCategory === category.id}
            selectedPart={selectedPart}
            onCategoryPress={handleCategoryPress}
            onPartSelect={handlePartSelect}
            palette={palette}
          />
        ))}
      </View>
    </ScrollView>
  );
}
