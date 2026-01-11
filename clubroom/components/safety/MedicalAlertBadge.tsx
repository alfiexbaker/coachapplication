import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const getConfig = () => {
    switch (type) {
      case 'allergy':
        return {
          icon: 'alert-circle' as const,
          color: palette.error,
          bgColor: `${palette.error}12`,
        };
      case 'condition':
        return {
          icon: 'fitness' as const,
          color: palette.warning,
          bgColor: `${palette.warning}12`,
        };
      case 'medication':
        return {
          icon: 'medkit' as const,
          color: palette.tint,
          bgColor: `${palette.tint}12`,
        };
      case 'restriction':
        return {
          icon: 'ban' as const,
          color: palette.muted,
          bgColor: `${palette.muted}15`,
        };
    }
  };

  const config = getConfig();

  const sizeStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      iconSize: 10,
      fontSize: 10,
    },
    medium: {
      paddingHorizontal: Spacing.xs,
      paddingVertical: 4,
      iconSize: 12,
      fontSize: 12,
    },
    large: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      iconSize: 14,
      fontSize: 14,
    },
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
      <View style={[styles.rowIcon, { backgroundColor: `${config.color}12` }]}>
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
    <View style={[styles.countBadge, { backgroundColor: `${color}15` }]}>
      <ThemedText style={[styles.countText, { color }]}>{count}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowTypeLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  dot: {},
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
