/**
 * ChannelToggle Component
 *
 * A toggle control for notification channels (Push, Email, SMS).
 * Displays all channels with their enable/disable state and allows toggling each one.
 *
 * Features:
 * - Visual toggle for each channel
 * - Icons and descriptions for each channel type
 * - Loading states
 * - Disabled state support
 */

import React from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { NotificationChannel } from '@/constants/types';

export interface ChannelConfig {
  push: boolean;
  email: boolean;
  sms: boolean;
}

export interface ChannelToggleProps {
  /** Current channel configuration */
  value: ChannelConfig;
  /** Callback when a channel is toggled */
  onChange: (channel: NotificationChannel, enabled: boolean) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
}

interface ChannelInfo {
  key: NotificationChannel;
  configKey: keyof ChannelConfig;
  icon: string;
  title: string;
  subtitle: string;
}

const CHANNELS: ChannelInfo[] = [
  {
    key: 'PUSH',
    configKey: 'push',
    icon: 'notifications',
    title: 'Push Notifications',
    subtitle: 'Instant alerts on your device',
  },
  {
    key: 'EMAIL',
    configKey: 'email',
    icon: 'mail',
    title: 'Email',
    subtitle: 'Notifications sent to your email',
  },
  {
    key: 'SMS',
    configKey: 'sms',
    icon: 'chatbox',
    title: 'SMS',
    subtitle: 'Text messages to your phone',
  },
];

export function ChannelToggle({
  value,
  onChange,
  disabled = false,
  loading = false,
}: ChannelToggleProps) {
  const { colors: palette } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: palette.card, borderColor: palette.border }]}
    >
      {CHANNELS.map((channel, index) => {
        const isEnabled = value[channel.configKey];
        const isLast = index === CHANNELS.length - 1;

        return (
          <Row
            key={channel.key}
            align="center"
            gap="sm"
            style={[
              styles.row,
              !isLast && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isEnabled
                    ? withAlpha(palette.accent, 0.09)
                    : withAlpha(palette.muted, 0.09),
                },
              ]}
            >
              <Ionicons
                name={channel.icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={isEnabled ? palette.accent : palette.muted}
              />
            </View>
            <View style={styles.content}>
              <ThemedText
                type="defaultSemiBold"
                style={[
                  styles.title,
                  { color: disabled || loading ? palette.muted : palette.text },
                ]}
              >
                {channel.title}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
                {channel.subtitle}
              </ThemedText>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={(newValue) => onChange(channel.key, newValue)}
              trackColor={{ false: palette.border, true: palette.accent }}
              thumbColor={palette.surface}
              disabled={disabled || loading}
              style={loading ? styles.loadingSwitch : undefined}
            />
          </Row>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    borderWidth: 0.75,
    overflow: 'hidden',
  },
  row: {
    padding: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: Spacing.micro,
  },
  title: { ...Typography.subheading },
  subtitle: { ...Typography.small, lineHeight: 18 },
  loadingSwitch: {
    opacity: 0.5,
  },
});

export default ChannelToggle;
