/**
 * ChildSwitcher — Low-noise horizontal focus picker.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface SwitcherChild {
  id: string;
  name: string;
  initials: string;
  colorCode?: string;
}

interface ChildSwitcherProps {
  options: SwitcherChild[];
  selectedId: string | undefined;
  onSelect: (childId: string) => void;
  activeChildId?: string | null;
}

function ChildSwitcherInner({
  options,
  selectedId,
  onSelect,
  activeChildId,
}: ChildSwitcherProps) {
  const { colors: palette } = useTheme();

  const handleSelect = useCallback(
    (childId: string) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onSelect(childId);
    },
    [onSelect],
  );

  if (options.length <= 1) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: withAlpha(palette.surface, 0.92),
          borderColor: withAlpha(palette.border, 0.9),
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((child) => {
          const isSelected = child.id === selectedId;
          const isActiveChild = child.id === activeChildId;
          const accentColor = child.colorCode || palette.tint;

          return (
            <Clickable
              key={child.id}
              onPress={() => handleSelect(child.id)}
              style={[
                styles.chip,
                {
                  borderColor: isSelected ? withAlpha(accentColor, 0.35) : palette.border,
                  backgroundColor: isSelected
                    ? withAlpha(accentColor, 0.12)
                    : withAlpha(palette.surface, 0.45),
                },
              ]}
              accessibilityRole="tab"
              accessibilityLabel={`View progress for ${child.name}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Row align="center" gap="xs">
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isSelected ? accentColor : withAlpha(accentColor, 0.55),
                    },
                  ]}
                />

                <ThemedText
                  style={[
                    styles.chipName,
                    { color: isSelected ? palette.text : palette.muted },
                    isSelected && styles.chipNameActive,
                  ]}
                  numberOfLines={1}
                >
                  {child.name}
                </ThemedText>

                {isSelected && (
                  <Ionicons name="checkmark" size={12} color={accentColor} />
                )}
                {isActiveChild && !isSelected && (
                  <View
                    style={[
                      styles.activeHint,
                      { borderColor: withAlpha(accentColor, 0.5) },
                    ]}
                  />
                )}
              </Row>
            </Clickable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const ChildSwitcher = memo(ChildSwitcherInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  scrollContent: {
    gap: Spacing.xs,
  },
  chip: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    minHeight: 34,
    borderWidth: 1,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  activeHint: {
    width: 7,
    height: 7,
    borderRadius: Radii.xs,
    borderWidth: 1,
  },
  chipName: {
    ...Typography.caption,
    fontWeight: '600',
  },
  chipNameActive: {
    fontWeight: '700',
  },
});
