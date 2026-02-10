import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface BookingParentViewProps {
  onMessageCoach: () => void;
  onReportProblem: () => void;
}

function BookingParentViewInner({
  onMessageCoach,
  onReportProblem,
}: BookingParentViewProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.actions}>
      <Clickable
        onPress={onMessageCoach}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: palette.tint },
          pressed && { opacity: 0.8 },
        ].filter(Boolean) as ViewStyle[]}
      >
        <Ionicons name="chatbubble" size={20} color={palette.onPrimary} />
        <ThemedText
          style={[styles.primaryButtonText, { color: palette.onPrimary }]}
        >
          Message Coach
        </ThemedText>
      </Clickable>

      <Clickable
        onPress={onReportProblem}
        style={({ pressed }) => [
          styles.secondaryButton,
          { borderColor: palette.border },
          pressed && { backgroundColor: palette.border, opacity: 0.7 },
        ].filter(Boolean) as ViewStyle[]}
      >
        <Ionicons name="warning-outline" size={20} color={palette.foreground} />
        <ThemedText style={styles.secondaryButtonText}>Report Problem</ThemedText>
      </Clickable>
    </View>
  );
}

export const BookingParentView = React.memo(BookingParentViewInner);

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  primaryButtonText: {
    ...Typography.subheading,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  secondaryButtonText: {
    ...Typography.subheading,
  },
});
