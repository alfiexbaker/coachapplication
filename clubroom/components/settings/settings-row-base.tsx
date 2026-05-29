import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface SettingsRowProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function SettingsRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onPress,
  showChevron = true,
  rightElement,
  destructive = false,
  disabled = false,
  accessibilityLabel,
}: SettingsRowProps) {
  const { colors: palette } = useTheme();

  const textColor = destructive ? palette.error : palette.text;
  const iconBgColor = destructive
    ? withAlpha(palette.error, 0.09)
    : withAlpha(iconColor || palette.accent, 0.09);
  const iconTintColor = destructive ? palette.error : iconColor || palette.accent;

  return (
    <Clickable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : disabled ? 0.5 : 1 }]}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={iconTintColor} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText type="defaultSemiBold" style={[styles.settingTitle, { color: textColor }]}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={[styles.settingSubtitle, { color: palette.muted }]}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {value && (
        <ThemedText style={[styles.valueText, { color: palette.muted }]}>{value}</ThemedText>
      )}
      {rightElement}
      {!rightElement && showChevron && onPress && (
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      )}
    </Clickable>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
    minHeight: 56,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  settingTitle: { ...Typography.subheading },
  settingSubtitle: { ...Typography.small, lineHeight: Typography.caption.lineHeight },
  valueText: { ...Typography.body, marginRight: Spacing.xs },
});
