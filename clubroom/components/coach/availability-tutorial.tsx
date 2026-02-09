import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Animated as RNAnimated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AvailabilityTutorial');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TutorialStep {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accentColor: 'tint' | 'success' | 'warning' | 'info';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: 'calendar-outline',
    title: 'Welcome to Availability',
    description:
      "Let's set up when parents can book sessions with you. It only takes a minute to get started.",
    accentColor: 'tint',
  },
  {
    icon: 'grid-outline',
    title: 'Tap to Set Availability',
    description:
      'Use the weekly grid to mark yourself as available. Tap any time slot to toggle it on or off.',
    accentColor: 'success',
  },
  {
    icon: 'flash-outline',
    title: 'Quick Setup Templates',
    description:
      'Short on time? Use a quick-start template like "Weekday Mornings" or "Weekend Sessions" to set up in one tap.',
    accentColor: 'warning',
  },
  {
    icon: 'checkmark-circle-outline',
    title: "You're All Set!",
    description:
      'Parents can now see your availability and book sessions. You can always adjust your schedule later.',
    accentColor: 'info',
  },
];

interface AvailabilityTutorialProps {
  visible: boolean;
  onComplete: () => void;
}

export function AvailabilityTutorial({ visible, onComplete }: AvailabilityTutorialProps) {
  const { colors: palette } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;
  const slideAnim = useRef(new RNAnimated.Value(0)).current;

  const step = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
    }
  }, [visible, fadeAnim, slideAnim]);

  const animateTransition = (direction: 'next' | 'back', callback: () => void) => {
    const targetSlide = direction === 'next' ? -30 : 30;
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      RNAnimated.timing(slideAnim, {
        toValue: targetSlide,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction === 'next' ? 30 : -30);
      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        RNAnimated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
      return;
    }
    animateTransition('next', () => {
      setCurrentStep((prev) => prev + 1);
    });
  };

  const handleBack = () => {
    if (isFirstStep) return;
    animateTransition('back', () => {
      setCurrentStep((prev) => prev - 1);
    });
  };

  const handleComplete = async () => {
    try {
      await apiClient.set(STORAGE_KEYS.AVAILABILITY_TUTORIAL_COMPLETED, true);
    } catch (error) {
      logger.error('Failed to save tutorial completion', error);
    }
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const accentColor = palette[step.accentColor];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          {/* Skip button */}
          <View style={styles.skipRow}>
            <Clickable onPress={handleSkip}>
              <ThemedText style={[styles.skipText, { color: palette.muted }]}>Skip</ThemedText>
            </Clickable>
          </View>

          {/* Step content */}
          <RNAnimated.View
            style={[
              styles.stepContent,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: withAlpha(accentColor, 0.09) }]}>
              <Ionicons name={step.icon} size={40} color={accentColor} />
            </View>

            <ThemedText type="subtitle" style={styles.stepTitle}>
              {step.title}
            </ThemedText>

            <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
              {step.description}
            </ThemedText>
          </RNAnimated.View>

          {/* Progress dots */}
          <View style={styles.progressDots}>
            {TUTORIAL_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === currentStep ? palette.tint : palette.border,
                    width: index === currentStep ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {/* Navigation buttons */}
          <View style={styles.buttonRow}>
            {!isFirstStep ? (
              <Clickable
                onPress={handleBack}
                style={[styles.backButton, { borderColor: palette.border }]}
              >
                <Ionicons name="arrow-back" size={18} color={palette.text} />
                <ThemedText style={[styles.backButtonText, { color: palette.text }]}>
                  Back
                </ThemedText>
              </Clickable>
            ) : (
              <View style={styles.buttonPlaceholder} />
            )}

            <Clickable
              onPress={handleNext}
              style={[styles.nextButton, { backgroundColor: palette.tint }]}
            >
              <ThemedText style={[styles.nextButtonText, { color: palette.onPrimary }]}>
                {isLastStep ? 'Get Started' : 'Next'}
              </ThemedText>
              {!isLastStep && (
                <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />
              )}
              {isLastStep && (
                <Ionicons name="checkmark" size={18} color={palette.onPrimary} />
              )}
            </Clickable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Hook to check whether the availability tutorial should be shown.
 * Returns `{ showTutorial, completeTutorial, loading }`.
 */
export function useAvailabilityTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const completed = await apiClient.get<boolean>(
          STORAGE_KEYS.AVAILABILITY_TUTORIAL_COMPLETED,
          false,
        );
        if (mounted && !completed) {
          setShowTutorial(true);
        }
      } catch (error) {
        logger.error('Failed to check tutorial status', error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const completeTutorial = () => {
    setShowTutorial(false);
  };

  return { showTutorial, completeTutorial, loading };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  skipRow: {
    alignItems: 'flex-end',
  },
  skipText: {
    ...Typography.bodySmallSemiBold,
  },
  stepContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  stepTitle: {
    textAlign: 'center',
  },
  stepDescription: {
    ...Typography.bodySmall,
    textAlign: 'center',
    maxWidth: 300,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: Radii.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  backButtonText: {
    ...Typography.bodySmallSemiBold,
  },
  buttonPlaceholder: {
    width: 90,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    flex: 1,
    justifyContent: 'center',
    maxWidth: SCREEN_WIDTH * 0.45,
  },
  nextButtonText: {
    ...Typography.bodySmallSemiBold,
  },
});
