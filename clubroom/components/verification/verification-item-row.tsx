import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { VerificationItem } from '@/constants/types';

interface VerificationItemRowProps {
  colors: ThemeColors;
  icon: string;
  title: string;
  description: string;
  item: VerificationItem;
  onPress?: () => void;
}

function getStatusIcon(status: string, colors: ThemeColors) {
  switch (status) {
    case 'VERIFIED':
      return { name: 'checkmark-circle', color: colors.success };
    case 'PENDING':
      return { name: 'time', color: colors.warning };
    case 'FAILED':
      return { name: 'close-circle', color: colors.error };
    case 'EXPIRED':
      return { name: 'alert-circle', color: colors.error };
    default:
      return { name: 'ellipse-outline', color: colors.muted };
  }
}

export const VerificationItemRow = memo(function VerificationItemRow({
  colors,
  icon,
  title,
  description,
  item,
  onPress,
}: VerificationItemRowProps) {
  const statusIcon = getStatusIcon(item.status, colors);

  return (
    <Clickable onPress={onPress} disabled={!onPress}>
      <Row gap="sm" align="center" style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(colors.tint, 0.06) }]}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.tint} />
        </View>
        <View style={styles.content}>
          <ThemedText type="defaultSemiBold">{title}</ThemedText>
          <ThemedText style={[styles.description, { color: colors.muted }]}>
            {description}
          </ThemedText>
        </View>
        <Row gap="xs" align="center">
          <Ionicons
            name={statusIcon.name as keyof typeof Ionicons.glyphMap}
            size={22}
            color={statusIcon.color}
          />
          {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
        </Row>
      </Row>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  row: { paddingVertical: Spacing.sm },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, gap: Spacing.micro },
  description: { ...Typography.small },
});
