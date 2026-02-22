/**
 * DevChildSelector — Horizontal child tab picker for development screen.
 */
import { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Child {
  id: string;
  name: string;
}

interface DevChildSelectorProps {
  childOptions: Child[];
  selectedChildId: string | null;
  onSelectChild: (childId: string | null) => void;
}

function DevChildSelectorInner({
  childOptions,
  selectedChildId,
  onSelectChild,
}: DevChildSelectorProps) {
  const { colors: palette } = useTheme();

  if (childOptions.length <= 1) return null;

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: palette.muted }]}>Focus</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Clickable
          onPress={() => onSelectChild(null)}
          style={[
            styles.tab,
            {
              borderColor: selectedChildId === null ? palette.tint : palette.border,
              backgroundColor:
                selectedChildId === null ? withAlpha(palette.tint, 0.05) : palette.surface,
            },
          ]}
          accessibilityRole="tab"
          accessibilityLabel="View all children"
          accessibilityState={{ selected: selectedChildId === null }}
        >
          <Row align="center" gap="xs">
            {selectedChildId === null && (
              <Ionicons name="checkmark-circle" size={14} color={palette.tint} />
            )}
            <ThemedText
              style={[
                styles.name,
                { color: selectedChildId === null ? palette.tint : palette.text },
                selectedChildId === null && styles.nameActive,
              ]}
            >
              Everyone
            </ThemedText>
          </Row>
        </Clickable>

        {childOptions.map((child) => {
          const isSelected = child.id === selectedChildId;
          return (
            <Clickable
              key={child.id}
              onPress={() => onSelectChild(child.id)}
              style={[
                styles.tab,
                {
                  borderColor: isSelected ? palette.tint : palette.border,
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.05) : palette.surface,
                },
              ]}
              accessibilityRole="tab"
              accessibilityLabel={`Select ${child.name}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Row align="center" gap="xs">
                {isSelected && <Ionicons name="checkmark-circle" size={14} color={palette.tint} />}
                <ThemedText
                  style={[
                    styles.name,
                    { color: isSelected ? palette.tint : palette.text },
                    isSelected && styles.nameActive,
                  ]}
                >
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
    gap: Spacing.xs,
  },
  label: {
    ...Typography.micro,
  },
  content: {
    gap: Spacing.xs,
  },
  tab: {
    minHeight: 36,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...Typography.caption },
  nameActive: { ...Typography.caption, fontWeight: '700' },
});
