import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function BookingWizardHeader({ title, subtitle, step }: { title: string; subtitle: string; step: number }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={{ gap: Spacing.sm }}>
      <ThemedText type="title" style={{ ...Typography.display }}>
        {title}
      </ThemedText>
      <ThemedText style={{ color: palette.muted }}>{subtitle}</ThemedText>
      <View style={styles.progressTrack}>
        {[1, 2, 3, 4, 5].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              { backgroundColor: s <= step ? palette.tint : palette.border, opacity: s === step ? 1 : 0.45 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={styles.summaryRow}>
      <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  progressDot: {
    height: 8,
    flex: 1,
    borderRadius: Radii.pill,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  summaryLabel: { ...Typography.bodySmallSemiBold },
});
