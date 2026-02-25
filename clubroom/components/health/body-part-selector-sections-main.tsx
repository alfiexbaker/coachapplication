import React, { memo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { withAlpha } from '@/constants/theme';
import type { BodyPart, BodyPartCategory } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { injuryService } from '@/services/injury-service';
import { Row } from '@/components/primitives';

import { getPartStyle } from './body-part-selector-helpers';
import { styles } from './body-part-selector-styles';

interface BodyDiagramProps {
  selectedPart: BodyPart | null;
  palette: ThemeColors;
}

export const BodyDiagram = memo(function BodyDiagram({ selectedPart, palette }: BodyDiagramProps) {
  return (
    <View style={[styles.bodyDiagram, { backgroundColor: palette.surface }]}>
      <View style={styles.bodyFigure}>
        <View style={[styles.head, getPartStyle('HEAD', selectedPart, palette)]} />
        <Row style={styles.torsoContainer}>
          <View
            style={[
              styles.shoulder,
              styles.leftShoulder,
              getPartStyle('LEFT_SHOULDER', selectedPart, palette),
            ]}
          />
          <View style={[styles.torso, getPartStyle('CHEST', selectedPart, palette)]} />
          <View
            style={[
              styles.shoulder,
              styles.rightShoulder,
              getPartStyle('RIGHT_SHOULDER', selectedPart, palette),
            ]}
          />
        </Row>
        <Row style={styles.armsContainer}>
          <View style={[styles.arm, getPartStyle('LEFT_ARM', selectedPart, palette)]} />
          <View style={[styles.core, getPartStyle('ABDOMEN', selectedPart, palette)]} />
          <View style={[styles.arm, getPartStyle('RIGHT_ARM', selectedPart, palette)]} />
        </Row>
        <Row style={styles.legsContainer}>
          <View style={[styles.thigh, getPartStyle('LEFT_THIGH', selectedPart, palette)]} />
          <View style={[styles.thigh, getPartStyle('RIGHT_THIGH', selectedPart, palette)]} />
        </Row>
        <Row style={styles.lowerLegsContainer}>
          <View style={[styles.calf, getPartStyle('LEFT_CALF', selectedPart, palette)]} />
          <View style={[styles.calf, getPartStyle('RIGHT_CALF', selectedPart, palette)]} />
        </Row>
        <Row style={styles.feetContainer}>
          <View style={[styles.foot, getPartStyle('LEFT_FOOT', selectedPart, palette)]} />
          <View style={[styles.foot, getPartStyle('RIGHT_FOOT', selectedPart, palette)]} />
        </Row>
      </View>
      {selectedPart && (
        <View style={[styles.selectedLabel, { backgroundColor: palette.tint }]}>
          <ThemedText style={[styles.selectedLabelText, { color: palette.onPrimary }]}>
            {injuryService.getBodyPartLabel(selectedPart)}
          </ThemedText>
        </View>
      )}
    </View>
  );
});

interface CategoryAccordionItemProps {
  category: { id: BodyPartCategory; label: string; icon: string };
  isExpanded: boolean;
  selectedPart: BodyPart | null;
  onCategoryPress: (id: BodyPartCategory) => void;
  onPartSelect: (part: BodyPart) => void;
  searchTerm?: string;
  palette: ThemeColors;
}

export const CategoryAccordionItem = memo(function CategoryAccordionItem({
  category,
  isExpanded,
  selectedPart,
  onCategoryPress,
  onPartSelect,
  searchTerm = '',
  palette,
}: CategoryAccordionItemProps) {
  const parts = injuryService
    .getBodyPartsByCategory(category.id)
    .filter((part) =>
      searchTerm
        ? injuryService.getBodyPartLabel(part).toLowerCase().includes(searchTerm.toLowerCase())
        : true,
    );
  const hasSelectedPart = selectedPart !== null && parts.includes(selectedPart);

  if (parts.length === 0) return null;

  return (
    <View style={styles.categoryItem}>
      <Clickable onPress={() => onCategoryPress(category.id)}>
        <View
          style={[
            styles.categoryHeader,
            {
              backgroundColor: hasSelectedPart ? withAlpha(palette.tint, 0.06) : palette.surface,
              borderColor: hasSelectedPart ? palette.tint : palette.border,
            },
          ]}
        >
          <Row style={styles.categoryLeft}>
            <Ionicons
              name={category.icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={hasSelectedPart ? palette.tint : palette.text}
            />
            <ThemedText
              style={[styles.categoryLabel, hasSelectedPart ? { color: palette.tint } : undefined]}
            >
              {category.label}
            </ThemedText>
          </Row>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={palette.muted}
          />
        </View>
      </Clickable>

      {isExpanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[styles.partsGrid, { backgroundColor: palette.surface }]}
        >
          {parts.map((part) => {
            const isSelected = selectedPart === part;
            return (
              <Clickable key={part} onPress={() => onPartSelect(part)}>
                <View
                  style={[
                    styles.partItem,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.background,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.partLabel,
                      { color: isSelected ? palette.onPrimary : palette.text },
                    ]}
                    numberOfLines={1}
                  >
                    {injuryService.getBodyPartLabel(part)}
                  </ThemedText>
                  {isSelected && <Ionicons name="checkmark" size={16} color={palette.onPrimary} />}
                </View>
              </Clickable>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
});
