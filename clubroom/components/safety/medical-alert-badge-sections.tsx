/**
 * Extracted sub-components for MedicalAlertBadge.
 *
 * getAlertConfig — shared config helper for alert type -> icon/color mapping.
 * MedicalAlertRow — full-width alert item for lists.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getAlertConfig, type AlertType } from './medical-alert-badge-helpers';

export { AlertSeverityDot } from './alert-severity-dot';
export type { AlertSeverityDotProps } from './alert-severity-dot';
export { AlertCountBadge } from './alert-count-badge';
export type { AlertCountBadgeProps } from './alert-count-badge';

// ============================================================================
// MEDICAL ALERT ROW
// ============================================================================

/**
 * MedicalAlertRow - Full-width alert item for lists
 */
export function MedicalAlertRow({
  type,
  label,
  description,
  onPress,
}: {
  type: AlertType;
  label: string;
  description?: string;
  onPress?: () => void;
}) {
  const { colors: palette } = useTheme();
  const config = getAlertConfig(type, palette);

  const content = (
    <Row align="center" gap="sm" style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={16} color={config.color} />
      </View>
      <View style={styles.rowContent}>
        <ThemedText style={[styles.rowTypeLabel, { color: config.color }]}>
          {config.typeLabel}
        </ThemedText>
        <ThemedText type="defaultSemiBold">{label}</ThemedText>
        {description && (
          <ThemedText style={[styles.rowDescription, { color: palette.muted }]}>
            {description}
          </ThemedText>
        )}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={palette.muted} />}
    </Row>
  );

  if (onPress) {
    return <Clickable onPress={onPress}>{content}</Clickable>;
  }

  return content;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.sm,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowTypeLabel: { ...Typography.micro, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowDescription: { ...Typography.caption, marginTop: Spacing.micro },
});
