/**
 * FormSection component.
 * Groups related form inputs with shared label/description.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Divider } from '@/components/ui/primitives/Divider';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface FormSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Child form inputs */
  children: React.ReactNode;
  /** Show divider below section */
  divider?: boolean;
  /** Custom container style */
  style?: ViewStyle;
}

export function FormSection({
  title,
  description,
  children,
  divider = false,
  style,
}: FormSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {title && (
        <ThemedText style={[styles.title, { color: palette.text }]}>
          {title}
        </ThemedText>
      )}
      {description && (
        <ThemedText style={[styles.description, { color: palette.muted }]}>
          {description}
        </ThemedText>
      )}
      <View style={styles.content}>{children}</View>
      {divider && <Divider style={{ marginTop: Spacing.md }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.heading,
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.small,
    marginBottom: Spacing.sm,
  },
  content: {
    gap: Spacing.xs,
  },
});

export default FormSection;
