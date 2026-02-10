/**
 * Extracted sub-components for MedicalAlertBadge.
 *
 * getAlertConfig — shared config helper for alert type -> icon/color mapping.
 * MedicalAlertRow — full-width alert item for lists.
 * AlertSeverityDot — severity indicator dot.
 * AlertCountBadge — count badge for showing number of alerts.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ============================================================================
// SHARED CONFIG
// ============================================================================

type AlertType = 'allergy' | 'condition' | 'medication' | 'restriction';

export type { AlertType };

export function getAlertConfig(type: AlertType, palette: { error: string; warning: string; tint: string; muted: string }) {
  switch (type) {
    case 'allergy':
      return { icon: 'alert-circle' as const, color: palette.error, typeLabel: 'Allergy', bgColor: withAlpha(palette.error, 0.07) };
    case 'condition':
      return { icon: 'fitness' as const, color: palette.warning, typeLabel: 'Condition', bgColor: withAlpha(palette.warning, 0.07) };
    case 'medication':
      return { icon: 'medkit' as const, color: palette.tint, typeLabel: 'Medication', bgColor: withAlpha(palette.tint, 0.07) };
    case 'restriction':
      return { icon: 'ban' as const, color: palette.muted, typeLabel: 'Restriction', bgColor: withAlpha(palette.muted, 0.09) };
  }
}

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
  onPress }: {
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
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color={palette.muted} />
      )}
    </Row>
  );

  if (onPress) {
    return <Clickable onPress={onPress}>{content}</Clickable>;
  }

  return content;
}

// ============================================================================
// ALERT SEVERITY DOT
// ============================================================================

/**
 * Alert severity indicator dot
 */
export function AlertSeverityDot({
  level,
  size = 8 }: {
  level: 'none' | 'low' | 'medium' | 'high';
  size?: number;
}) {
  const { colors: palette } = useTheme();

  const getColor = () => {
    switch (level) {
      case 'high':
        return palette.error;
      case 'medium':
        return palette.warning;
      case 'low':
        return palette.muted;
      case 'none':
      default:
        return palette.success;
    }
  };

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getColor() },
      ]}
    />
  );
}

// ============================================================================
// ALERT COUNT BADGE
// ============================================================================

/**
 * Count badge for showing number of alerts
 */
export function AlertCountBadge({
  count,
  type = 'allergy' }: {
  count: number;
  type?: 'allergy' | 'condition' | 'medication' | 'total';
}) {
  const { colors: palette } = useTheme();

  if (count === 0) {
    return null;
  }

  const getColor = () => {
    switch (type) {
      case 'allergy':
        return palette.error;
      case 'condition':
        return palette.warning;
      case 'medication':
        return palette.tint;
      case 'total':
      default:
        return count >= 3 ? palette.error : count >= 1 ? palette.warning : palette.muted;
    }
  };

  const color = getColor();

  return (
    <View style={[styles.countBadge, { backgroundColor: withAlpha(color, 0.09) }]}>
      <ThemedText style={[styles.countText, { color }]}>{count}</ThemedText>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.sm },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center' },
  rowContent: {
    flex: 1 },
  rowTypeLabel: { ...Typography.micro, textTransform: 'uppercase',
    letterSpacing: 0.5 },
  rowDescription: { ...Typography.caption, marginTop: Spacing.micro },
  dot: {},
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5 },
  countText: { ...Typography.caption } });
