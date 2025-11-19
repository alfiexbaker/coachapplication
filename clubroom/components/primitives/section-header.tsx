import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function SectionHeader({ title, subtitle, eyebrow = 'Sprint' }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <ThemedText type="eyebrow">{eyebrow}</ThemedText>
      <ThemedText type="title">{title}</ThemedText>
      {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  subtitle: {
    opacity: 0.9,
  },
});
