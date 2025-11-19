import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function SectionHeader({ title, subtitle, eyebrow }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      {eyebrow ? <ThemedText type="eyebrow">{eyebrow}</ThemedText> : null}
      <ThemedText type="title">{title}</ThemedText>
      {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  subtitle: {
    opacity: 0.6,
    fontSize: 13,
  },
});
