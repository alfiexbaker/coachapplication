import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import type { ThemeColors } from '@/hooks/useTheme';

type DrillDetailHeaderProps = {
  colors: ThemeColors;
  isCompleted: boolean;
  onBack: () => void;
};

export const DrillDetailHeader = React.memo(function DrillDetailHeader({
  colors,
  isCompleted,
  onBack,
}: DrillDetailHeaderProps) {
  return (
    <Row align="center" justify="space-between" style={styles.header}>
      <Clickable onPress={onBack} hitSlop={8} accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>
      <Row align="center" gap="sm">
        {isCompleted ? (
          <Row
            align="center"
            gap="xxs"
            style={[styles.completedBadge, { backgroundColor: withAlpha(colors.success, 0.09) }]}
          >
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <ThemedText style={[styles.completedBadgeText, { color: colors.success }]}>
              Completed
            </ThemedText>
          </Row>
        ) : null}
      </Row>
    </Row>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  completedBadge: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  completedBadgeText: {
    ...Typography.smallSemiBold,
    fontSize: scaleFont(Typography.smallSemiBold.fontSize),
  },
});
