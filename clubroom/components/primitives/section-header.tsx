import { StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function SectionHeader({ title, subtitle, eyebrow }: SectionHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.container}>
      {eyebrow ? <ThemedText type="eyebrow" style={[styles.eyebrow, { color: palette.muted }]}>{eyebrow}</ThemedText> : null}
      <ThemedText type="title" style={styles.title}>{title}</ThemedText>
      {subtitle ? <ThemedText style={[styles.subtitle, { color: palette.muted }]}>{subtitle}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
});
