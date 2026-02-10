import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export function BookingWizardHeader({ title, subtitle, step }: { title: string; subtitle: string; step: number }) {
  const { colors: palette } = useTheme();
  return (
    <View style={{ gap: Spacing.sm }}>
      <ThemedText type="title" style={{ ...Typography.display }}>
        {title}
      </ThemedText>
      <ThemedText style={{ color: palette.muted }}>{subtitle}</ThemedText>
      <Row gap="xs" style={styles.progressTrack}>
        {[1, 2, 3, 4, 5].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              { backgroundColor: s <= step ? palette.tint : palette.border, opacity: s === step ? 1 : 0.45 },
            ]}
          />
        ))}
      </Row>
    </View>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  const { colors: palette } = useTheme();
  return (
    <Row justify="between" style={styles.summaryRow}>
      <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
    </Row>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    marginTop: Spacing.sm,
  },
  progressDot: {
    height: 8,
    flex: 1,
    borderRadius: Radii.pill,
  },
  summaryRow: {
    paddingVertical: Spacing.sm,
  },
  summaryLabel: { ...Typography.bodySmallSemiBold },
});
