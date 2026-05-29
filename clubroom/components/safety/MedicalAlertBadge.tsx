import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import { getAlertConfig, type AlertType } from './medical-alert-badge-helpers';

// Re-export extracted components for backward compat
export { MedicalAlertRow, AlertSeverityDot, AlertCountBadge } from './medical-alert-badge-sections';
export type { AlertType } from './medical-alert-badge-helpers';

interface MedicalAlertBadgeProps {
  type: AlertType;
  label: string;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

/**
 * MedicalAlertBadge - Visual badge for medical conditions/allergies
 * Color-coded by type for quick visual identification
 */
export function MedicalAlertBadge({
  type,
  label,
  onPress,
  size = 'medium',
}: MedicalAlertBadgeProps) {
  const { colors: palette } = useTheme();
  const config = getAlertConfig(type, palette);

  const sizeStyles = {
    small: {
      ...Typography.micro,
      paddingHorizontal: Spacing.xxs,
      paddingVertical: Spacing.micro,
      iconSize: 10,
    },
    medium: {
      ...Typography.caption,
      paddingHorizontal: Spacing.xs,
      paddingVertical: Spacing.xxs,
      iconSize: 12,
    },
    large: {
      ...Typography.bodySmall,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xxs,
      iconSize: 14,
    },
  };

  const sizeConfig = sizeStyles[size];

  const content = (
    <Row
      align="center"
      gap="xxs"
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
        },
      ]}
    >
      <Ionicons name={config.icon} size={sizeConfig.iconSize} color={config.color} />
      <ThemedText
        style={[styles.label, { color: config.color, fontSize: sizeConfig.fontSize }]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </Row>
  );

  if (onPress) {
    return <Clickable onPress={onPress}>{content}</Clickable>;
  }

  return content;
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radii.md,
  },
  label: {
    fontWeight: '600',
  },
});
