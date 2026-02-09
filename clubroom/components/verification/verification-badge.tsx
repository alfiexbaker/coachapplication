import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { VerificationStatus } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

type VerificationLevel = VerificationStatus['overallLevel'];

type VerificationBadgeProps = {
  level: VerificationLevel;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
};

const LEVEL_CONFIG: Record<
  VerificationLevel,
  {
    label: string;
    shortLabel: string;
    icon: string;
    colorKey: 'success' | 'warning' | 'muted' | 'tint';
  }
> = {
  PREMIUM: {
    label: 'Premium Verified',
    shortLabel: 'Premium',
    icon: 'shield-checkmark',
    colorKey: 'success',
  },
  VERIFIED: {
    label: 'Verified Coach',
    shortLabel: 'Verified',
    icon: 'checkmark-shield',
    colorKey: 'success',
  },
  BASIC: {
    label: 'Basic Verified',
    shortLabel: 'Basic',
    icon: 'checkmark-circle',
    colorKey: 'warning',
  },
  NONE: {
    label: 'Not Verified',
    shortLabel: 'Unverified',
    icon: 'shield-outline',
    colorKey: 'muted',
  },
};

const SIZE_CONFIG = {
  small: {
    ...Typography.caption,
    iconSize: 14,
    paddingH: Spacing.xs,
    paddingV: 3,
    gap: Spacing.micro,
  },
  medium: { ...Typography.caption, iconSize: 16,
    paddingH: Spacing.sm,
    paddingV: Spacing.xs / 2,
    gap: Spacing.xs / 2 },
  large: { ...Typography.bodySmall, iconSize: 20,
    paddingH: Spacing.sm,
    paddingV: Spacing.xs,
    gap: Spacing.xs },
};

export function VerificationBadge({
  level,
  size = 'medium',
  showLabel = true,
}: VerificationBadgeProps) {
  const { colors: palette } = useTheme();
  const config = LEVEL_CONFIG[level];
  const sizeConfig = SIZE_CONFIG[size];
  const color = palette[config.colorKey];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: withAlpha(color, 0.09),
          paddingHorizontal: sizeConfig.paddingH,
          paddingVertical: sizeConfig.paddingV,
          gap: sizeConfig.gap,
        },
      ]}
    >
      <Ionicons name={config.icon as keyof typeof Ionicons.glyphMap} size={sizeConfig.iconSize} color={color} />
      {showLabel && (
        <ThemedText
          style={[
            styles.label,
            {
              color,
              fontSize: sizeConfig.fontSize,
            },
          ]}
        >
          {size === 'small' ? config.shortLabel : config.label}
        </ThemedText>
      )}
    </View>
  );
}

/**
 * Compact verification icon for use in lists and cards
 */
export function VerificationIcon({
  level,
  size = 18,
}: {
  level: VerificationLevel;
  size?: number;
}) {
  const { colors: palette } = useTheme();
  const config = LEVEL_CONFIG[level];
  const color = palette[config.colorKey];

  if (level === 'NONE') {
    return null;
  }

  return <Ionicons name={config.icon as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
}

/**
 * Full verification status display with all items
 */
export function VerificationStatusDisplay({
  status,
}: {
  status: VerificationStatus;
}) {
  const { colors: palette } = useTheme();

  const items = [
    { label: 'Email', verified: status.email.status === 'VERIFIED' },
    { label: 'Phone', verified: status.phone.status === 'VERIFIED' },
    { label: 'ID', verified: status.identity.status === 'VERIFIED' },
    { label: 'Background', verified: status.backgroundCheck.status === 'VERIFIED' },
    { label: 'Credentials', verified: status.credentials.some(c => c.status === 'VERIFIED') },
    { label: 'Insurance', verified: status.insurance.status === 'VERIFIED' },
  ];

  return (
    <View style={styles.statusDisplay}>
      <View style={styles.badgeRow}>
        <VerificationBadge level={status.overallLevel} size="large" />
      </View>
      <View style={styles.itemsGrid}>
        {items.map((item) => (
          <View key={item.label} style={styles.statusItem}>
            <Ionicons
              name={item.verified ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={item.verified ? palette.success : palette.muted}
            />
            <ThemedText
              style={[
                styles.statusItemLabel,
                { color: item.verified ? palette.text : palette.muted },
              ]}
            >
              {item.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.pill,
  },
  label: {
    fontWeight: '600',
  },
  statusDisplay: {
    gap: Spacing.sm,
  },
  badgeRow: {
    alignItems: 'flex-start',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    minWidth: 90,
  },
  statusItemLabel: { ...Typography.small },
});
