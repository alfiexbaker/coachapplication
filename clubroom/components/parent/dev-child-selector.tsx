/**
 * DevChildSelector — Horizontal child tab picker for development screen.
 */
import { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Row } from '@/components/primitives/row';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Child {
  id: string;
  name: string;
}

interface DevChildSelectorProps {
  children: Child[];
  selectedChildId: string | undefined;
  onSelectChild: (childId: string) => void;
}

function DevChildSelectorInner({ children, selectedChildId, onSelectChild }: DevChildSelectorProps) {
  const { colors: palette } = useTheme();

  if (children.length <= 1) return null;

  return (
    <View style={[styles.container, { backgroundColor: palette.surface }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {children.map((child) => {
          const isSelected = child.id === selectedChildId;
          return (
            <Clickable
              key={child.id}
              onPress={() => onSelectChild(child.id)}
              style={[
                styles.tab,
                isSelected ? [styles.tabActive, { backgroundColor: palette.tint }] : undefined,
              ]}
              accessibilityRole="tab"
              accessibilityLabel={`Select ${child.name}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Row align="center" gap="sm">
                <Row align="center" justify="center" style={[
                  styles.avatar,
                  { backgroundColor: isSelected ? withAlpha(palette.onPrimary, 0.2) : palette.border }
                ]}>
                  <ThemedText style={[
                    styles.avatarText,
                    { color: isSelected ? palette.onPrimary : palette.tint }
                  ]}>
                    {child.name.charAt(0)}
                  </ThemedText>
                </Row>
                <ThemedText style={[
                  styles.name,
                  { color: isSelected ? palette.onPrimary : palette.text },
                  isSelected && styles.nameActive,
                ]}>
                  {child.name}
                </ThemedText>
              </Row>
            </Clickable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const DevChildSelector = memo(DevChildSelectorInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.md,
    padding: Spacing.xxs,
  },
  content: {
    gap: Spacing.xs,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.sm,
  },
  tabActive: {},
  avatar: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
  },
  avatarText: { ...Typography.caption },
  name: { ...Typography.bodySmallSemiBold },
  nameActive: { ...Typography.bodySemiBold },
});
