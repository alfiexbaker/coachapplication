import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Typography, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ConsentType } from '@/constants/types';
import { consentService } from '@/services/consent-service';

interface ConsentBadgeProps {
  type: ConsentType;
  granted: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { ...Typography.micro, icon: 14, padding: Spacing.xxs, gap: Spacing.micro },
  md: { ...Typography.caption, icon: 18, padding: Spacing.xxs, gap: Spacing.xxs },
  lg: { ...Typography.bodySmall, icon: 22, padding: 8, gap: Spacing.xxs },
} as const;

export function ConsentBadge({ type, granted, showLabel = false, size = 'md' }: ConsentBadgeProps) {
  const { colors: palette } = useTheme();
  const config = SIZE_CONFIG[size];

  const iconName = consentService.getConsentIcon(type);
  const label = consentService.getConsentLabel(type);

  const backgroundColor = granted
    ? withAlpha(palette.success, 0.09)
    : withAlpha(palette.error, 0.09);
  const iconColor = granted ? palette.success : palette.error;
  const statusIcon = granted ? 'checkmark-circle' : 'close-circle';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          padding: config.padding,
          gap: config.gap,
        },
      ]}
    >
      <View style={styles.iconWrapper}>
        <Ionicons
          name={iconName as keyof typeof Ionicons.glyphMap}
          size={config.icon}
          color={iconColor}
        />
        <View style={[styles.statusIndicator, { backgroundColor: palette.surface }]}>
          <Ionicons name={statusIcon} size={config.icon * 0.6} color={iconColor} />
        </View>
      </View>
      {showLabel && (
        <ThemedText style={[styles.label, { color: iconColor, fontSize: config.fontSize }]}>
          {label}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: Radii.sm,
  },
  iconWrapper: {
    position: 'relative',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    borderRadius: Radii.md,
  },
  label: {
    fontWeight: '500',
  },
});
