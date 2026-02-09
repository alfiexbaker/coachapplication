/**
 * EditChildrenSection — Children list for parent profile editing.
 */

import React, { memo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface EditChildrenSectionProps {
  colors: ThemeColors;
  children: Array<{ name: string; age: number }>;
  onAddChild: () => void;
  onUpdateChild: (index: number, field: 'name' | 'age', value: string | number) => void;
  onRemoveChild: (index: number) => void;
}

export const EditChildrenSection = memo(function EditChildrenSection({
  colors, children, onAddChild, onUpdateChild, onRemoveChild,
}: EditChildrenSectionProps) {
  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }];

  return (
    <SurfaceCard style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">Children</ThemedText>
        <Pressable
          onPress={onAddChild}
          style={styles.inlineAction}
          accessibilityLabel="Add child"
          accessibilityRole="button"
        >
          <Ionicons name="add-circle" size={22} color={colors.tint} />
          <ThemedText style={[styles.inlineActionText, { color: colors.tint }]}>Add</ThemedText>
        </Pressable>
      </View>

      {children.map((child, index) => (
        <View key={`child-${index}`} style={[styles.childRow, { borderColor: colors.border }]}>
          <View style={styles.childFields}>
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
          </View>
          <Pressable
            onPress={() => onRemoveChild(index)}
            accessibilityLabel={`Remove child ${index + 1}`}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={24} color={colors.destructive} />
          </Pressable>
        </View>
      ))}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  inlineActionText: { fontWeight: '700' },
  childRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingBottom: Spacing.sm, borderBottomWidth: 1,
  },
  childFields: { flex: 1, flexDirection: 'row', gap: Spacing.sm },
  childNameInput: { flex: 2 },
  childAgeInput: { flex: 1 },
  input: {
    borderWidth: 1, borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
});
