/**
 * BodyPartSelector Component
 *
 * Visual body part selector with anatomical figure.
 * Allows users to select injured body parts from categorized groups.
 */

import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { BodyPart, BodyPartCategory } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';

interface BodyPartSelectorProps {
  selectedPart: BodyPart | null;
  onSelect: (part: BodyPart) => void;
}

const CATEGORIES: { id: BodyPartCategory; label: string; icon: string }[] = [
  { id: 'HEAD', label: 'Head & Neck', icon: 'person-outline' },
  { id: 'UPPER_BODY', label: 'Upper Body', icon: 'body-outline' },
  { id: 'CORE', label: 'Core & Back', icon: 'fitness-outline' },
  { id: 'LOWER_BODY', label: 'Lower Body', icon: 'footsteps-outline' },
];

export function BodyPartSelector({ selectedPart, onSelect }: BodyPartSelectorProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [expandedCategory, setExpandedCategory] = useState<BodyPartCategory | null>(
    selectedPart ? injuryService.getBodyPartCategory(selectedPart) : null
  );

  const handleCategoryPress = (category: BodyPartCategory) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const handlePartSelect = (part: BodyPart) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(part);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      {/* Visual body diagram */}
      <View style={[styles.bodyDiagram, { backgroundColor: palette.surface }]}>
        <View style={styles.bodyFigure}>
          <View style={[styles.head, getPartStyle('HEAD', selectedPart, palette)]} />
          <View style={styles.torsoContainer}>
            <View style={[styles.shoulder, styles.leftShoulder, getPartStyle('LEFT_SHOULDER', selectedPart, palette)]} />
            <View style={[styles.torso, getPartStyle('CHEST', selectedPart, palette)]} />
            <View style={[styles.shoulder, styles.rightShoulder, getPartStyle('RIGHT_SHOULDER', selectedPart, palette)]} />
          </View>
          <View style={styles.armsContainer}>
            <View style={[styles.arm, getPartStyle('LEFT_ARM', selectedPart, palette)]} />
            <View style={[styles.core, getPartStyle('ABDOMEN', selectedPart, palette)]} />
            <View style={[styles.arm, getPartStyle('RIGHT_ARM', selectedPart, palette)]} />
          </View>
          <View style={styles.legsContainer}>
            <View style={[styles.thigh, getPartStyle('LEFT_THIGH', selectedPart, palette)]} />
            <View style={[styles.thigh, getPartStyle('RIGHT_THIGH', selectedPart, palette)]} />
          </View>
          <View style={styles.lowerLegsContainer}>
            <View style={[styles.calf, getPartStyle('LEFT_CALF', selectedPart, palette)]} />
            <View style={[styles.calf, getPartStyle('RIGHT_CALF', selectedPart, palette)]} />
          </View>
          <View style={styles.feetContainer}>
            <View style={[styles.foot, getPartStyle('LEFT_FOOT', selectedPart, palette)]} />
            <View style={[styles.foot, getPartStyle('RIGHT_FOOT', selectedPart, palette)]} />
          </View>
        </View>
        {selectedPart && (
          <View style={[styles.selectedLabel, { backgroundColor: palette.tint }]}>
            <ThemedText style={styles.selectedLabelText}>
              {injuryService.getBodyPartLabel(selectedPart)}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Category accordion */}
      <View style={styles.categoriesContainer}>
        <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
          Select Body Part
        </ThemedText>

        {CATEGORIES.map((category) => {
          const isExpanded = expandedCategory === category.id;
          const parts = injuryService.getBodyPartsByCategory(category.id);
          const hasSelectedPart = selectedPart && parts.includes(selectedPart);

          return (
            <View key={category.id} style={styles.categoryItem}>
              <Clickable onPress={() => handleCategoryPress(category.id)}>
                <View
                  style={[
                    styles.categoryHeader,
                    {
                      backgroundColor: hasSelectedPart ? `${palette.tint}10` : palette.surface,
                      borderColor: hasSelectedPart ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <View style={styles.categoryLeft}>
                    <Ionicons
                      name={category.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={hasSelectedPart ? palette.tint : palette.text}
                    />
                    <ThemedText
                      style={[
                        styles.categoryLabel,
                        hasSelectedPart && { color: palette.tint },
                      ]}
                    >
                      {category.label}
                    </ThemedText>
                  </View>
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
                      <Clickable key={part} onPress={() => handlePartSelect(part)}>
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
                              { color: isSelected ? '#FFFFFF' : palette.text },
                            ]}
                          >
                            {injuryService.getBodyPartLabel(part)}
                          </ThemedText>
                          {isSelected && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                      </Clickable>
                    );
                  })}
                </Animated.View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function getPartStyle(
  part: BodyPart,
  selectedPart: BodyPart | null,
  palette: typeof Colors.light
): { backgroundColor: string; borderColor: string; borderWidth: number } {
  const isSelected = selectedPart === part;
  const isRelated =
    selectedPart &&
    injuryService.getBodyPartCategory(selectedPart) === injuryService.getBodyPartCategory(part);

  if (isSelected) {
    return {
      backgroundColor: palette.tint,
      borderColor: palette.tint,
      borderWidth: 2,
    };
  }

  if (isRelated) {
    return {
      backgroundColor: `${palette.tint}30`,
      borderColor: palette.border,
      borderWidth: 1,
    };
  }

  return {
    backgroundColor: palette.border,
    borderColor: palette.border,
    borderWidth: 1,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bodyDiagram: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radii.lg,
  },
  bodyFigure: {
    alignItems: 'center',
    width: 120,
  },
  head: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  torsoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  shoulder: {
    width: 20,
    height: 16,
    borderRadius: 8,
  },
  leftShoulder: {
    marginRight: -4,
  },
  rightShoulder: {
    marginLeft: -4,
  },
  torso: {
    width: 48,
    height: 16,
    borderRadius: 4,
  },
  armsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  arm: {
    width: 16,
    height: 50,
    borderRadius: 8,
  },
  core: {
    width: 44,
    height: 50,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  legsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  thigh: {
    width: 22,
    height: 45,
    borderRadius: 8,
  },
  lowerLegsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  calf: {
    width: 18,
    height: 40,
    borderRadius: 6,
  },
  feetContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  foot: {
    width: 24,
    height: 12,
    borderRadius: 6,
  },
  selectedLabel: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  selectedLabelText: {
    color: '#FFFFFF',
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  categoryItem: {
    marginBottom: Spacing.xs,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryLabel: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  partsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.sm,
    gap: Spacing.xs,
    marginTop: 2,
    borderBottomLeftRadius: Radii.md,
    borderBottomRightRadius: Radii.md,
  },
  partItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    gap: 4,
  },
  partLabel: {
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
});
