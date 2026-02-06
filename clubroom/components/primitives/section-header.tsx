import { StyleSheet, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface SectionHeaderProps {
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
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  eyebrow: { ...Typography.caption, textTransform: 'uppercase',
    letterSpacing: 1.2 },
  title: {
    ...Typography.display,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: { ...Typography.subheading, lineHeight: 24,
    fontWeight: '500' },
});
