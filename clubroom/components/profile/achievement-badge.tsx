import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AchievementBadgeProps = {
  icon?: string;
  label: string;
  description?: string;
};

export function AchievementBadge({ icon = 'trophy', label, description }: AchievementBadgeProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={[styles.container, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
      <View style={[styles.iconContainer, { backgroundColor: `${palette.premium}18` }]}> 
        <Ionicons name={icon as any} size={18} color={palette.premium} />
      </View>
      <View style={styles.copy}> 
        <ThemedText type="defaultSemiBold" style={styles.label}> 
          {label}
        </ThemedText>
        {description ? (
          <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
            {description}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 14,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
  },
});

