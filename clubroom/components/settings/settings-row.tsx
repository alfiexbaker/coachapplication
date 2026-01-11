import React from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface SettingsRowProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * SettingsRow - A reusable row component for settings screens.
 * Supports icons, titles, subtitles, chevrons, and custom right elements.
 */
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
}: SettingsRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const textColor = destructive ? palette.error : palette.text;
  const iconBgColor = destructive ? `${palette.error}15` : `${iconColor || palette.accent}15`;
  const iconTintColor = destructive ? palette.error : (iconColor || palette.accent);

  return (
    <Clickable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.settingRow,
        { opacity: pressed ? 0.7 : disabled ? 0.5 : 1 },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon as any} size={22} color={iconTintColor} />
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
        <ThemedText style={[styles.valueText, { color: palette.muted }]}>
          {value}
        </ThemedText>
      )}
      {rightElement}
      {!rightElement && showChevron && onPress && (
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      )}
    </Clickable>
  );
}

export interface SettingsToggleRowProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * SettingsToggleRow - A settings row with an inline toggle switch.
 */
export function SettingsToggleRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
}: SettingsToggleRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SettingsRow
      icon={icon}
      iconColor={iconColor}
      title={title}
      subtitle={subtitle}
      showChevron={false}
      disabled={disabled}
      rightElement={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: palette.border, true: palette.accent }}
          thumbColor="#FFFFFF"
          disabled={disabled}
        />
      }
    />
  );
}

export interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

/**
 * SettingsSection - A wrapper for grouping related settings rows with an optional header.
 */
export function SettingsSection({ title, children }: SettingsSectionProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.section}>
      {title && (
        <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
          {title}
        </ThemedText>
      )}
      <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        {children}
      </View>
    </View>
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
    gap: 2,
  },
  settingTitle: {
    fontSize: 16,
  },
  settingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  valueText: {
    fontSize: 15,
    marginRight: Spacing.xs,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionCard: {
    borderRadius: Radii.lg,
    borderWidth: 0.75,
    overflow: 'hidden',
  },
});
