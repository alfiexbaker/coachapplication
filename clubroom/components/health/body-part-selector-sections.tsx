/**
 * Extracted sub-components for BodyPartSelector.
 *
 * CATEGORIES — category config array.
 * getPartStyle — body part visual style helper.
 * BodyDiagram — anatomical figure view (accepts palette).
 * CategoryAccordionItem — single expandable category row (accepts palette).
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { BodyPart, BodyPartCategory } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';

// ─── Constants ───────────────────────────────────────────────────────────────

export const CATEGORIES: { id: BodyPartCategory; label: string; icon: string }[] = [
  { id: 'HEAD', label: 'Head & Neck', icon: 'person-outline' },
  { id: 'UPPER_BODY', label: 'Upper Body', icon: 'body-outline' },
  { id: 'CORE', label: 'Core & Back', icon: 'fitness-outline' },
  { id: 'LOWER_BODY', label: 'Lower Body', icon: 'footsteps-outline' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getPartStyle(
  part: BodyPart,
  selectedPart: BodyPart | null,
  palette: ThemeColors
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
      backgroundColor: withAlpha(palette.tint, 0.19),
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

// ─── BodyDiagram ─────────────────────────────────────────────────────────────

interface BodyDiagramProps {
  selectedPart: BodyPart | null;
  palette: ThemeColors;
}

export const BodyDiagram = memo(function BodyDiagram({
  selectedPart,
  palette,
}: BodyDiagramProps) {
  return (
    <View style={[styles.bodyDiagram, { backgroundColor: palette.surface }]}>
      <View style={styles.bodyFigure}>
        <View style={[styles.head, getPartStyle('HEAD', selectedPart, palette)]} />
        <Row style={styles.torsoContainer}>
          <View style={[styles.shoulder, styles.leftShoulder, getPartStyle('LEFT_SHOULDER', selectedPart, palette)]} />
          <View style={[styles.torso, getPartStyle('CHEST', selectedPart, palette)]} />
          <View style={[styles.shoulder, styles.rightShoulder, getPartStyle('RIGHT_SHOULDER', selectedPart, palette)]} />
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

// ─── CategoryAccordionItem ───────────────────────────────────────────────────

interface CategoryAccordionItemProps {
  category: { id: BodyPartCategory; label: string; icon: string };
  isExpanded: boolean;
  selectedPart: BodyPart | null;
  onCategoryPress: (id: BodyPartCategory) => void;
  onPartSelect: (part: BodyPart) => void;
  palette: ThemeColors;
}

export const CategoryAccordionItem = memo(function CategoryAccordionItem({
  category,
  isExpanded,
  selectedPart,
  onCategoryPress,
  onPartSelect,
  palette,
}: CategoryAccordionItemProps) {
  const parts = injuryService.getBodyPartsByCategory(category.id);
  const hasSelectedPart = selectedPart !== null && parts.includes(selectedPart);

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
              style={[
                styles.categoryLabel,
                hasSelectedPart ? { color: palette.tint } : undefined,
              ]}
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
                  >
                    {injuryService.getBodyPartLabel(part)}
                  </ThemedText>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={palette.onPrimary} />
                  )}
                </View>
              </Clickable>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
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
    borderRadius: Radii.xl,
    marginBottom: Spacing.xxs,
  },
  torsoContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  shoulder: {
    width: 20,
    height: 16,
    borderRadius: Radii.sm,
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
    borderRadius: Radii.xs,
  },
  armsContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  arm: {
    width: 16,
    height: 50,
    borderRadius: Radii.sm,
  },
  core: {
    width: 44,
    height: 50,
    borderRadius: Radii.xs,
    marginHorizontal: Spacing.micro,
  },
  legsContainer: {
    justifyContent: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  thigh: {
    width: 22,
    height: 45,
    borderRadius: Radii.sm,
  },
  lowerLegsContainer: {
    justifyContent: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  calf: {
    width: 18,
    height: 40,
    borderRadius: Radii.sm,
  },
  feetContainer: {
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.micro,
  },
  foot: {
    width: 24,
    height: 12,
    borderRadius: Radii.sm,
  },
  selectedLabel: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  selectedLabelText: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  categoryLeft: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryLabel: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  partsGrid: {
    flexWrap: 'wrap',
    padding: Spacing.sm,
    gap: Spacing.xs,
    marginTop: Spacing.micro,
    borderBottomLeftRadius: Radii.md,
    borderBottomRightRadius: Radii.md,
  },
  partItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    gap: Spacing.xxs,
  },
  partLabel: {
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
});
