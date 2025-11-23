import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Clickable } from '@/components/primitives/clickable';

type EmptyStateProps = {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onPressAction?: () => void;
};

export function EmptyState({ icon = 'information-circle', title, message, actionLabel, onPressAction }: EmptyStateProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${palette.border}30` }]}>
        <Ionicons name={icon as any} size={28} color={palette.icon} />
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
              shadowColor: palette.tint,
            },
          ]}
        >
          <ThemedText style={styles.actionLabel} lightColor="#FFFFFF" darkColor="#000000">
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
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radii.card,
  },
  iconContainer: {
    padding: Spacing.md,
    borderRadius: Radii.pill,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.pill,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  actionLabel: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

