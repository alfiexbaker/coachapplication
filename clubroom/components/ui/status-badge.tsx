import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export function StatusBadge({ status }: { status: BookingStatus }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const tone = {
    Pending: { bg: `${palette.warning}22`, color: palette.warning },
    Confirmed: { bg: `${palette.success}22`, color: palette.success },
    Completed: { bg: `${palette.secondary}22`, color: palette.secondary },
    Cancelled: { bg: `${palette.error}22`, color: palette.error },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.color }]}>
      <ThemedText style={[styles.label, { color: tone.color }]}>{status}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
