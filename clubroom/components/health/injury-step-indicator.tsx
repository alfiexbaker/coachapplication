import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';

type FormStep = 'body_part' | 'severity' | 'details';

const STEPS: FormStep[] = ['body_part', 'severity', 'details'];

interface InjuryStepIndicatorProps {
  currentStep: FormStep;
}

export function InjuryStepIndicator({ currentStep }: InjuryStepIndicatorProps) {
  const { colors: palette } = useTheme();

  return (
    <Row style={styles.container}>
      {STEPS.map((s, index) => {
        const isActive = s === currentStep;
        const isCompleted =
          (s === 'body_part' && (currentStep === 'severity' || currentStep === 'details')) ||
          (s === 'severity' && currentStep === 'details');

        return (
          <Row key={s} style={styles.stepContainer}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: isActive
                    ? palette.tint
                    : isCompleted
                      ? palette.success
                      : palette.border,
                },
              ]}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
              ) : (
                <ThemedText
                  style={[
                    styles.number,
                    { color: isActive ? palette.onPrimary : palette.muted },
                  ]}
                >
                  {index + 1}
                </ThemedText>
              )}
            </View>
            {index < 2 && (
              <View
                style={[
                  styles.line,
                  { backgroundColor: isCompleted ? palette.success : palette.border },
                ]}
              />
            )}
          </Row>
        );
      })}
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  stepContainer: {
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  line: {
    width: 40,
    height: 2,
    marginHorizontal: Spacing.xxs,
  },
});
