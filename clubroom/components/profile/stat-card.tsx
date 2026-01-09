import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type StatCardProps = {
  label: string;
  value: string;
  subtitle?: string;
};

export function StatCard({ label, value, subtitle }: StatCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.copy}>
        <ThemedText style={[styles.label, { color: palette.muted }]}>{label}</ThemedText>
        <ThemedText type="title" style={styles.value}>
          {value}
        </ThemedText>
        {subtitle ? (
          <ThemedText style={[styles.subtitle, { color: palette.secondary }]}>{subtitle}</ThemedText>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    borderRadius: Radii.card,
  },
  copy: {
    gap: Spacing.xs / 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
  },
});

