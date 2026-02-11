import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type AchievementBadgeProps = {
  icon?: string;
  label: string;
  description?: string;
};

export function AchievementBadge({ icon = 'trophy', label, description }: AchievementBadgeProps) {
  const { colors: palette } = useTheme();

  return (
    <Row
      align="center"
      gap="sm"
      style={[styles.container, { borderColor: palette.border, backgroundColor: palette.surface }]}
    >
      <View style={[styles.iconContainer, { backgroundColor: withAlpha(palette.premium, 0.09) }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={palette.premium} />
      </View>
      <View style={styles.copy}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          {label}
        </ThemedText>
        {description ? (
          <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
            {description}
          </ThemedText>
        ) : null}
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: Spacing.micro,
  },
  label: { ...Typography.bodySmall },
  description: { ...Typography.caption, lineHeight: 18 },
});
