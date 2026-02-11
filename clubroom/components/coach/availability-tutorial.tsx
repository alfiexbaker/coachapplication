import { useState, useEffect, useCallback } from 'react';
import { View, Modal } from 'react-native';
import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { useTheme } from '@/hooks/useTheme';
import { withAlpha } from '@/constants/theme';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';

import {
  TUTORIAL_STEPS,
  TutorialStepContent,
  TutorialProgressDots,
  TutorialNavButtons,
  styles,
} from './availability-tutorial-sections';

const logger = createLogger('AvailabilityTutorial');

interface AvailabilityTutorialProps {
  visible: boolean;
  onComplete: () => void;
}

export function AvailabilityTutorial({ visible, onComplete }: AvailabilityTutorialProps) {
  const { colors: palette } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);

  const step = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      fadeAnim.value = 1;
      slideAnim.value = 0;
    }
  }, [visible, fadeAnim, slideAnim]);

  const animateTransition = useCallback(
    (direction: 'next' | 'back', callback: () => void) => {
      const targetSlide = direction === 'next' ? -30 : 30;
      const resetSlide = direction === 'next' ? 30 : -30;

      // Phase 1: fade out + slide out
      fadeAnim.value = withTiming(0, { duration: 150 });
      slideAnim.value = withTiming(targetSlide, { duration: 150 }, (finished) => {
        if (finished) {
          runOnJS(callback)();
          // Phase 2: reset slide to opposite side, then fade in + slide in
          slideAnim.value = resetSlide;
          slideAnim.value = withTiming(0, { duration: 200 });
          fadeAnim.value = withTiming(1, { duration: 200 });
        }
      });
    },
    [fadeAnim, slideAnim]
  );

  const handleComplete = useCallback(async () => {
    try {
      await apiClient.set(STORAGE_KEYS.AVAILABILITY_TUTORIAL_COMPLETED, true);
    } catch (error) {
      logger.error('Failed to save tutorial completion', error);
    }
    onComplete();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleComplete();
      return;
    }
    animateTransition('next', () => {
      setCurrentStep((prev) => prev + 1);
    });
  }, [isLastStep, handleComplete, animateTransition]);

  const handleBack = useCallback(() => {
    if (isFirstStep) return;
    animateTransition('back', () => {
      setCurrentStep((prev) => prev - 1);
    });
  }, [isFirstStep, animateTransition]);

  const accentColor = palette[step.accentColor];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleComplete}>
      <View style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.6) }]}>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <View style={styles.skipRow}>
            <Clickable onPress={handleComplete}>
              <ThemedText style={[styles.skipText, { color: palette.muted }]}>Skip</ThemedText>
            </Clickable>
          </View>

          <TutorialStepContent
            step={step}
            accentColor={accentColor}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            palette={palette}
          />

          <TutorialProgressDots
            currentStep={currentStep}
            totalSteps={TUTORIAL_STEPS.length}
            palette={palette}
          />

          <TutorialNavButtons
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            onBack={handleBack}
            onNext={handleNext}
            palette={palette}
          />
        </View>
      </View>
    </Modal>
  );
}

/**
 * Hook to check whether the availability tutorial should be shown.
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
