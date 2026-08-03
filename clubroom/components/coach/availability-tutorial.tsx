import { useEffect, useState } from 'react';
import { View, Modal } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { useTheme } from '@/hooks/useTheme';
import { withAlpha } from '@/constants/theme';
import { seenService } from '@/services/seen-service';
import { createLogger } from '@/utils/logger';

import {
  TutorialStepContent,
  TutorialProgressDots,
  TutorialNavButtons,
} from './availability-tutorial-sections';
import { TUTORIAL_STEPS } from './availability-tutorial-helpers';
import { styles } from './availability-tutorial-styles';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('AvailabilityTutorial');
const AVAILABILITY_TUTORIAL_ENTITY = 'availability_tutorial';
const AVAILABILITY_TUTORIAL_ID = 'coach_availability';
const DEVICE_SEEN_USER = 'device';

interface AvailabilityTutorialProps {
  visible: boolean;
  onComplete: () => void;
}

export function AvailabilityTutorial({ visible, onComplete }: AvailabilityTutorialProps) {
  const handleComplete = async () => {
    const result = await seenService.markSeen(
      AVAILABILITY_TUTORIAL_ENTITY,
      AVAILABILITY_TUTORIAL_ID,
      DEVICE_SEEN_USER,
    );
    if (!result.success) {
      logger.error('Failed to save tutorial completion', result.error);
    }
    onComplete();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleComplete}>
      {visible ? <AvailabilityTutorialContent onComplete={handleComplete} /> : null}
    </Modal>
  );
}

function AvailabilityTutorialContent({ onComplete }: { onComplete: () => void | Promise<void> }) {
  const { colors: palette } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);

  const step = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const animateTransition = (direction: 'next' | 'back', callback: () => void) => {
    const targetSlide = direction === 'next' ? -30 : 30;
    const resetSlide = direction === 'next' ? 30 : -30;

    // Phase 1: fade out + slide out
    fadeAnim.set(withTiming(0, { duration: 150 }));
    slideAnim.set(
      withTiming(targetSlide, { duration: 150 }, (finished) => {
        if (finished) {
          scheduleOnRN(callback);
          // Phase 2: reset slide to opposite side, then fade in + slide in
          slideAnim.set(resetSlide);
          slideAnim.set(withTiming(0, { duration: 200 }));
          fadeAnim.set(withTiming(1, { duration: 200 }));
        }
      }),
    );
  };

  const handleNext = () => {
    if (isLastStep) {
      void onComplete();
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

  const accentColor = palette[step.accentColor];

  return (
    <View style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.6) }]}>
      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        <View style={styles.skipRow}>
          <Clickable onPress={onComplete}>
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
      await runAsyncTryCatchFinally(
        async () => {
          const result = await seenService.getSeenStatus(
            AVAILABILITY_TUTORIAL_ENTITY,
            AVAILABILITY_TUTORIAL_ID,
          );
          if (mounted && (!result.success || !result.data)) {
            setShowTutorial(true);
          }
          if (!result.success) {
            logger.error('Failed to check tutorial status', result.error);
          }
        },
        async (error) => {
          logger.error('Failed to check tutorial status', error);
        },
        () => {
          if (mounted) setLoading(false);
        },
      );
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
