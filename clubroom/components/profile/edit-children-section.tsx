/**
 * EditChildrenSection — Children list for parent profile editing.
 */

import React, { memo } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface EditChildrenSectionProps {
  colors: ThemeColors;
  childProfiles: { name: string; age: number }[];
  onAddChild: () => void;
  onUpdateChild: (index: number, field: 'name' | 'age', value: string | number) => void;
  onRemoveChild: (index: number) => void;
}

export const EditChildrenSection = memo(function EditChildrenSection({
  colors,
  childProfiles,
  onAddChild,
  onUpdateChild,
  onRemoveChild,
}: EditChildrenSectionProps) {
  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground },
  ];

  return (
    <SurfaceCard style={styles.section}>
      <Row justify="between" align="center">
        <ThemedText type="subtitle">Children</ThemedText>
        <Clickable
          onPress={onAddChild}
          style={styles.inlineAction}
          accessibilityLabel="Add child"
          accessibilityRole="button"
        >
          <Row align="center" gap="xs">
            <Ionicons name="add-circle" size={22} color={colors.tint} />
            <ThemedText style={[styles.inlineActionText, { color: colors.tint }]}>Add</ThemedText>
          </Row>
        </Clickable>
      </Row>

      {childProfiles.map((child, index) => (
        <Row
          key={`child-${index}`}
          align="center"
          gap="sm"
          style={[styles.childRow, { borderColor: colors.border }]}
        >
          <Row gap="sm" flex>
            <TextInput
              value={child.name}
              onChangeText={(text) => onUpdateChild(index, 'name', text)}
              placeholder="Name"
              placeholderTextColor={colors.muted}
              style={[...inputStyle, styles.childNameInput]}
              accessibilityLabel={`Child ${index + 1} name`}
            />
            <TextInput
              value={child.age.toString()}
              onChangeText={(text) => onUpdateChild(index, 'age', parseInt(text) || 0)}
              placeholder="Age"
              keyboardType="number-pad"
              placeholderTextColor={colors.muted}
              style={[...inputStyle, styles.childAgeInput]}
              accessibilityLabel={`Child ${index + 1} age`}
            />
          </Row>
          <Clickable
            onPress={() => onRemoveChild(index)}
            accessibilityLabel={`Remove child ${index + 1}`}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={24} color={colors.destructive} />
          </Clickable>
        </Row>
      ))}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  inlineAction: {},
  inlineActionText: { fontWeight: '700' },
  childRow: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  childNameInput: { flex: 2 },
  childAgeInput: { flex: 1 },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
});
