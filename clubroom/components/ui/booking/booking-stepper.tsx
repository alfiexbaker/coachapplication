import { StyleSheet } from 'react-native';

import { ProgressStepper } from '@/components/ui/primitives';
import { Spacing } from '@/constants/theme';

export function BookingStepper({
  step,
  totalSteps,
  isParent,
}: {
  step: number;
  totalSteps: number;
  isParent: boolean;
}) {
  const normalizedStep = isParent ? step : Math.max(step - 1, 0);

  return (
    <ProgressStepper currentStep={normalizedStep} totalSteps={totalSteps} style={styles.wrapper} />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
});
