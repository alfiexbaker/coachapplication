/**
 * ChildSwitcher — Premium horizontal child picker with color-coded avatars.
 *
 * Shows nothing if 0-1 children. For 2+ children, renders a sleek
 * pill-row with initials, name, and active child highlight.
 * Uses the child's colorCode from FamilyMember for visual identity.
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
  children: SwitcherChild[];
  selectedId: string | undefined;
  onSelect: (childId: string) => void;
  activeChildId?: string | null;
}

function ChildSwitcherInner({
  children: childOptions,
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

  if (childOptions.length <= 1) return null;

  return (
    <View style={[styles.container, { backgroundColor: withAlpha(palette.surface, 0.8) }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {childOptions.map((child) => {
          const isSelected = child.id === selectedId;
          const isActiveChild = child.id === activeChildId;
          const accentColor = child.colorCode || palette.tint;

          return (
            <Clickable
              key={child.id}
              onPress={() => handleSelect(child.id)}
              style={[
                styles.chip,
                isSelected
                  ? { backgroundColor: accentColor }
                  : { backgroundColor: withAlpha(palette.muted, 0.06) },
              ]}
              accessibilityRole="tab"
              accessibilityLabel={`View progress for ${child.name}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Row align="center" gap="xs">
                {/* Avatar circle */}
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: isSelected
                        ? withAlpha('#FFFFFF', 0.25)
                        : withAlpha(accentColor, 0.12),
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.avatarText,
                      { color: isSelected ? '#FFFFFF' : accentColor },
                    ]}
                  >
                    {child.initials}
                  </ThemedText>
                </View>

                {/* Name */}
                <ThemedText
                  style={[
                    styles.chipName,
                    { color: isSelected ? '#FFFFFF' : palette.text },
                  ]}
                  numberOfLines={1}
                >
                  {child.name}
                </ThemedText>

                {/* Active star indicator */}
                {isActiveChild && !isSelected && (
                  <Ionicons name="star" size={10} color={palette.warning} />
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
    borderRadius: Radii.lg,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  scrollContent: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xxs,
  },
  chip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.micro,
    fontSize: 11,
    letterSpacing: 0,
    textTransform: 'none',
  },
  chipName: {
    ...Typography.bodySmallSemiBold,
  },
});
