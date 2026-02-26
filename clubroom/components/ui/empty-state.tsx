import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing, Typography, withAlpha } from '@/constants/theme';
import { Clickable } from '@/components/primitives/clickable';
import { useTheme } from '@/hooks/useTheme';

type EmptyStateProps = {
  icon?: string;
  context?:
    | 'bookings'
    | 'sessions'
    | 'events'
    | 'messages'
    | 'goals'
    | 'badges'
    | 'roster'
    | 'invoices'
    | 'search'
    | 'network'
    | 'error';
  title: string;
  message: string;
  actionLabel?: string;
  onPressAction?: () => void;
};

const DEFAULT_ICON_BY_CONTEXT: Record<NonNullable<EmptyStateProps['context']>, keyof typeof Ionicons.glyphMap> = {
  bookings: 'calendar-clear-outline',
  sessions: 'football-outline',
  events: 'calendar-outline',
  messages: 'chatbubble-ellipses-outline',
  goals: 'flag-outline',
  badges: 'ribbon-outline',
  roster: 'people-outline',
  invoices: 'receipt-outline',
  search: 'search-outline',
  network: 'cloud-offline-outline',
  error: 'alert-circle-outline',
};

export function EmptyState({
  icon,
  context,
  title,
  message,
  actionLabel,
  onPressAction,
}: EmptyStateProps) {
  const { colors: palette, scheme } = useTheme();
  const resolvedIcon =
    (icon as keyof typeof Ionicons.glyphMap | undefined) ??
    (context ? DEFAULT_ICON_BY_CONTEXT[context] : undefined) ??
    'information-circle-outline';

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: withAlpha(palette.border, 0.19) }]}>
        <Ionicons name={resolvedIcon} size={24} color={palette.icon} />
      </View>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.message, { color: palette.muted }]}>{message}</ThemedText>
      {actionLabel && onPressAction ? (
        <Clickable
          onPress={onPressAction}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: pressed ? palette.tintPressed : palette.tint,
              ...Shadows[scheme].card,
              shadowColor: palette.tint,
            },
          ]}
        >
          <ThemedText
            style={styles.actionLabel}
            lightColor={palette.onPrimary}
            darkColor={palette.onPrimary}
          >
            {actionLabel}
          </ThemedText>
        </Clickable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.card,
  },
  iconContainer: {
    padding: Spacing.sm,
    borderRadius: Radii.pill,
  },
  title: { ...Typography.heading, textAlign: 'center' },
  message: { ...Typography.bodySmall, textAlign: 'center', lineHeight: 20 },
  action: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
  },
  actionLabel: {
    ...Typography.bodySemiBold,
    letterSpacing: 0.2,
  },
});
