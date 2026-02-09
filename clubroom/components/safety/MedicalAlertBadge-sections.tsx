/**
 * Extracted sub-components for MedicalAlertBadge.
 *
 * AlertType — shared type alias.
 * getAlertConfig — color/icon configuration by alert type.
 * BADGE_SIZE_CONFIG — size configuration map.
 * MedicalAlertRow — full-width alert list item.
 * AlertSeverityDot — colored severity indicator dot.
 * AlertCountBadge — count badge for alert totals.
 */

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertType = 'allergy' | 'condition' | 'medication' | 'restriction';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface AlertConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  typeLabel: string;
}

export function getAlertConfig(type: AlertType, palette: { error: string; warning: string; tint: string; muted: string }): AlertConfig {
  switch (type) {
    case 'allergy':
      return {
        icon: 'alert-circle',
        color: palette.error,
        bgColor: withAlpha(palette.error, 0.07),
        typeLabel: 'Allergy',
      };
    case 'condition':
      return {
        icon: 'fitness',
        color: palette.warning,
        bgColor: withAlpha(palette.warning, 0.07),
        typeLabel: 'Condition',
      };
    case 'medication':
      return {
        icon: 'medkit',
        color: palette.tint,
        bgColor: withAlpha(palette.tint, 0.07),
        typeLabel: 'Medication',
      };
    case 'restriction':
      return {
        icon: 'ban',
        color: palette.muted,
        bgColor: withAlpha(palette.muted, 0.09),
        typeLabel: 'Restriction',
      };
  }
}

export const BADGE_SIZE_CONFIG = {
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
} as const;

// ─── MedicalAlertRow ──────────────────────────────────────────────────────────

/**
 * Full-width alert item for lists
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
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: withAlpha(config.color, 0.07) }]}>
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
    </View>
  );

  if (onPress) {
    return <Clickable onPress={onPress}>{content}</Clickable>;
  }

  return content;
}

// ─── AlertSeverityDot ─────────────────────────────────────────────────────────

/**
 * Alert severity indicator dot
 */
export function AlertSeverityDot({
  level,
  size = 8,
}: {
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
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: getColor(),
      }}
    />
  );
}

// ─── AlertCountBadge ──────────────────────────────────────────────────────────

/**
 * Count badge for showing number of alerts
 */
export function AlertCountBadge({
  count,
  type = 'allergy',
}: {
  count: number;
  type?: 'allergy' | 'condition' | 'medication' | 'total';
}) {
  const { colors: palette } = useTheme();

  if (count === 0) return null;

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

// ─── Styles ───────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    borderRadius: Radii.md,
  },
  label: {
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  rowTypeLabel: {
    ...Typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowDescription: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  countText: { ...Typography.caption },
});
