import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { api } from '@/constants/config';

export function isDemoMode(): boolean {
  return api.useMock;
}

export function DemoBanner({ message }: { message: string }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: withAlpha(colors.warning, 0.08),
          borderLeftColor: colors.warning,
        },
      ]}
    >
      <Row align="center" gap="xs">
        <Ionicons name="flask-outline" size={16} color={colors.warning} />
        <ThemedText style={[styles.message, { color: colors.warning }]}>{message}</ThemedText>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderLeftWidth: 3,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  message: {
    ...Typography.caption,
    flex: 1,
  },
});
