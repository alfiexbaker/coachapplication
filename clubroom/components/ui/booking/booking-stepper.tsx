import { View, StyleSheet } from 'react-native';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export function BookingStepper({
  step,
  totalSteps,
  isParent,
}: {
  step: number;
  totalSteps: number;
  isParent: boolean;
}) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.wrapper}>
      <Row gap="sm">
        {(isParent ? [0, 1, 2, 3] : [1, 2, 3]).map((num) => (
          <View
            key={num}
            style={[
              styles.dot,
              {
                backgroundColor: num <= step ? palette.tint : palette.border,
              },
            ]}
          />
        ))}
      </Row>
      <ThemedText style={[styles.caption, { color: palette.muted }]}>Step {isParent ? step + 1 : step} of {totalSteps}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  // track replaced by Row primitive
  dot: {
    flex: 1,
    height: 4,
    borderRadius: Radii.xs,
  },
  caption: { ...Typography.caption, textAlign: 'center' },
});
