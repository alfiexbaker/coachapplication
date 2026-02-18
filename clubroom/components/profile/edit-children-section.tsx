/**
 * EditChildrenSection — Children summary card with navigation actions.
 * Shows child count + links to add/manage children screens.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import type { ThemeColors } from '@/hooks/useTheme';

interface EditChildrenSectionProps {
  colors: ThemeColors;
  childCount: number;
  onAddChild: () => void;
}

export const EditChildrenSection = memo(function EditChildrenSection({
  colors,
  childCount,
  onAddChild,
}: EditChildrenSectionProps) {
  const handleManage = useCallback(() => {
    router.push(Routes.CHILDREN);
  }, []);

  return (
    <SurfaceCard style={styles.section}>
      <Row justify="between" align="center">
        <ThemedText type="subtitle">Children</ThemedText>
        <ThemedText style={[styles.count, { color: colors.muted }]}>
          {childCount} {childCount === 1 ? 'child' : 'children'}
        </ThemedText>
      </Row>

      <Column gap="xs">
        <Clickable
          onPress={onAddChild}
          accessibilityLabel="Add child"
          accessibilityRole="button"
          style={[styles.actionRow, { backgroundColor: withAlpha(colors.tint, 0.06), borderColor: withAlpha(colors.tint, 0.15) }]}
        >
          <Row align="center" gap="sm" flex>
            <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
            <ThemedText style={[styles.actionText, { color: colors.tint }]}>Add Child</ThemedText>
          </Row>
          <Ionicons name="chevron-forward" size={16} color={colors.tint} />
        </Clickable>

        <Clickable
          onPress={handleManage}
          accessibilityLabel="Manage children"
          accessibilityRole="button"
          style={[styles.actionRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Row align="center" gap="sm" flex>
            <Ionicons name="people-outline" size={20} color={colors.muted} />
            <ThemedText style={[styles.actionText, { color: colors.text }]}>Manage Children</ThemedText>
          </Row>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Clickable>
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  count: { ...Typography.caption },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
  actionText: { ...Typography.bodySmallSemiBold },
});
