import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type AlertType = 'allergy' | 'condition' | 'medication' | 'restriction';

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

  const getConfig = () => {
    switch (type) {
      case 'allergy':
        return {
          icon: 'alert-circle' as const,
          color: palette.error,
          bgColor: withAlpha(palette.error, 0.07),
        };
      case 'condition':
        return {
          icon: 'fitness' as const,
          color: palette.warning,
          bgColor: withAlpha(palette.warning, 0.07),
        };
      case 'medication':
        return {
          icon: 'medkit' as const,
          color: palette.tint,
          bgColor: withAlpha(palette.tint, 0.07),
        };
      case 'restriction':
        return {
          icon: 'ban' as const,
          color: palette.muted,
          bgColor: withAlpha(palette.muted, 0.09),
        };
    }
  };

  const config = getConfig();

  const sizeStyles = {
    small: {
      ...Typography.micro,
      paddingHorizontal: Spacing.xxs,
      paddingVertical: Spacing.micro,
      iconSize: 10,
    },
    medium: { ...Typography.caption, paddingHorizontal: Spacing.xs,
      paddingVertical: Spacing.xxs,
      iconSize: 12 },
    large: { ...Typography.bodySmall, paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xxs,
      iconSize: 14 },
  };

  const sizeConfig = sizeStyles[size];

  const content = (
    <View
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
        style={[
          styles.label,
          { color: config.color, fontSize: sizeConfig.fontSize },
        ]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </View>
  );

  if (onPress) {
    return <Clickable onPress={onPress}>{content}</Clickable>;
  }

  return content;
}

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

  const getConfig = () => {
    switch (type) {
      case 'allergy':
        return {
          icon: 'alert-circle' as const,
          color: palette.error,
          typeLabel: 'Allergy',
        };
      case 'condition':
        return {
          icon: 'fitness' as const,
          color: palette.warning,
          typeLabel: 'Condition',
        };
      case 'medication':
        return {
          icon: 'medkit' as const,
          color: palette.tint,
          typeLabel: 'Medication',
        };
      case 'restriction':
        return {
          icon: 'ban' as const,
          color: palette.muted,
          typeLabel: 'Restriction',
        };
    }
  };

  const config = getConfig();

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
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getColor(),
        },
      ]}
    />
  );
}

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

const styles = StyleSheet.create({
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
    paddingHorizontal: 5,
  },
  countText: { ...Typography.caption },
});
