import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { DemoWalkthrough } from '@/utils/demo-walkthrough';

interface DemoWalkthroughCardProps {
  walkthrough: DemoWalkthrough;
  onPressStep: (step: DemoWalkthrough['steps'][number]) => void;
}

export function DemoWalkthroughCard({ walkthrough, onPressStep }: DemoWalkthroughCardProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={[styles.card, { borderColor: colors.border }]} tactile={false}>
      <Row align="center" gap="sm">
        <View style={[styles.badge, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <Ionicons name="trail-sign-outline" size={18} color={colors.tint} />
        </View>
        <View style={styles.copy}>
          <ThemedText style={styles.title}>{walkthrough.title}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
            {walkthrough.subtitle}
          </ThemedText>
        </View>
      </Row>

      <View style={styles.steps}>
        {walkthrough.steps.map((step, index) => (
          <Clickable
            key={step.id}
            onPress={() => onPressStep(step)}
            style={[
              styles.stepRow,
              {
                borderColor: colors.border,
                backgroundColor: withAlpha(colors.surface, 0.92),
              },
            ]}
          >
            <View style={[styles.stepIndex, { backgroundColor: withAlpha(colors.accent, 0.12) }]}>
              <ThemedText style={[styles.stepIndexText, { color: colors.accent }]}>
                {index + 1}
              </ThemedText>
            </View>
            <View style={styles.stepCopy}>
              <ThemedText style={styles.stepTitle}>{step.title}</ThemedText>
              <ThemedText style={[styles.stepDescription, { color: colors.muted }]}>
                {step.description}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Clickable>
        ))}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    gap: Spacing.sm,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: Spacing.micro,
  },
  title: {
    ...Typography.bodySemiBold,
  },
  subtitle: {
    ...Typography.caption,
    lineHeight: 16,
  },
  steps: {
    gap: Spacing.xs,
  },
  stepRow: {
    minHeight: 64,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    ...Typography.smallSemiBold,
  },
  stepCopy: {
    flex: 1,
    gap: Spacing.micro,
  },
  stepTitle: {
    ...Typography.smallSemiBold,
  },
  stepDescription: {
    ...Typography.caption,
    lineHeight: 16,
  },
});
