/**
 * FilterSection - Labeled section container for filter groups.
 *
 * Provides consistent spacing and typography for filter sections
 * in modals and panels.
 */

import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Divider } from '@/components/ui/primitives/Divider';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface FilterSectionProps {
  /** Section title */
  title: string;
  /** Optional description/helper text */
  description?: string;
  /** Content */
  children: React.ReactNode;
  /** Show bottom divider (default: false) */
  divider?: boolean;
}

export function FilterSection({
  title,
  description,
  children,
  divider = false,
}: FilterSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.title, { color: palette.text }]}>{title}</ThemedText>

      {description && (
        <ThemedText style={[styles.description, { color: palette.muted }]}>
          {description}
        </ThemedText>
      )}

      <View style={styles.content}>{children}</View>

      {divider && <Divider style={{ marginTop: Spacing.lg }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.heading,
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.small,
    marginBottom: Spacing.sm,
  },
  content: {
    // Children handle their own layout
  },
});
