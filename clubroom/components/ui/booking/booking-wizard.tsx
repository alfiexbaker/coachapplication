import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const TOTAL_STEPS = 5;

export function BookingWizardHeader({
  title,
  subtitle,
  step,
}: {
  title: string;
  subtitle: string;
  step: number;
}) {
  const { colors: palette, scheme } = useTheme();
  return (
    <View style={styles.headerWrap}>
      {/* Back + Step indicator row */}
      <Row align="center" justify="between">
        <Clickable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: withAlpha(palette.muted, 0.06) }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color={palette.text} />
        </Clickable>
        <View style={[styles.stepPill, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
          <ThemedText style={[styles.stepText, { color: palette.tint }]}>
            Step {step} of {TOTAL_STEPS}
          </ThemedText>
        </View>
      </Row>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: withAlpha(palette.border, 0.5) }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: palette.tint,
              width: `${(step / TOTAL_STEPS) * 100}%`,
            },
          ]}
        />
      </View>

      {/* Title + Subtitle */}
      <View style={styles.titleWrap}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: palette.muted }]}>{subtitle}</ThemedText>
      </View>
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
  headerWrap: {
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  stepText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 1.5,
  },
  title: {
    ...Typography.title,
  },
  subtitle: {
    ...Typography.body,
  },
  titleWrap: {
    gap: Spacing.xxs,
  },
  summaryRow: {
    paddingVertical: Spacing.sm,
  },
  summaryLabel: { ...Typography.bodySmallSemiBold },
});
