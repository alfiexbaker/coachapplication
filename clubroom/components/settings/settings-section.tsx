import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface SettingsSectionProps {
  title?: string;
  children: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.section}>
      {title && (
        <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>{title}</ThemedText>
      )}
      <View
        style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.smallSemiBold,
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
